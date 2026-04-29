// HWP 5.0 (구 한글 바이너리) 텍스트 추출/치환 — rhwp WASM 사용
// rhwp는 ES module이라 동적 import()로 한 번 로드해서 캐싱.
// window.TranslateHwp 로 노출.
//
// 입력: ArrayBuffer (HWP 또는 HWPX — rhwp가 자동 판별)
// 동작: getTextRange로 본문/표 텍스트를 모두 수집 → 번역 → replaceText로 좌표 치환
// 출력: exportHwp() 또는 exportHwpx() 결과 Uint8Array
//
// ⚠ rhwp 권고: HWPX→HWP 변환은 v0.7.x 시점 비활성화. 입력=출력 포맷 유지 정책.
(function (global) {
    'use strict';

    // === rhwp 모듈 캐시 ===
    let rhwpModule = null;
    let initPromise = null;

    // jsdelivr CDN — esm 빌드를 가져오고 wasm은 같은 CDN에서 별도 로드
    const RHWP_VERSION = '0.7.7';
    const RHWP_ESM_URL = 'https://cdn.jsdelivr.net/npm/@rhwp/core@' + RHWP_VERSION + '/+esm';
    const RHWP_WASM_URL = 'https://cdn.jsdelivr.net/npm/@rhwp/core@' + RHWP_VERSION + '/rhwp_bg.wasm';

    async function ensureLoaded() {
        if (rhwpModule) return rhwpModule;
        if (initPromise) return initPromise;

        initPromise = (async function () {
            // 측정 콜백 등록 (init 전에 globalThis에 있어야 함)
            // 추출/치환만이면 stub로 충분하나, 페이지 재배치를 위해 canvas로 측정.
            if (typeof globalThis.measureTextWidth !== 'function') {
                globalThis.measureTextWidth = function (font, text) {
                    try {
                        const c = document.createElement('canvas');
                        const ctx = c.getContext('2d');
                        ctx.font = font;
                        return ctx.measureText(String(text)).width;
                    } catch (_e) {
                        return (String(text).length || 0) * 8;
                    }
                };
            }

            const mod = await import(RHWP_ESM_URL);
            const init = mod.default || mod.init;
            if (typeof init !== 'function') {
                throw new Error('@rhwp/core: init 함수를 찾을 수 없음');
            }
            // init({ module_or_path: URL }) — fetch 후 인스턴스화
            await init({ module_or_path: RHWP_WASM_URL });
            rhwpModule = mod;
            return mod;
        })();

        return initPromise;
    }

    // 입력 buffer가 HWP 5.0 (CFB) 인지 HWPX(ZIP) 인지 판별
    // CFB 시그니처: D0 CF 11 E0 A1 B1 1A E1
    // ZIP 시그니처: 50 4B 03 04
    function detectFormat(arrayBuffer) {
        const u = new Uint8Array(arrayBuffer);
        if (u.length < 8) return 'unknown';
        if (u[0] === 0xD0 && u[1] === 0xCF && u[2] === 0x11 && u[3] === 0xE0
            && u[4] === 0xA1 && u[5] === 0xB1 && u[6] === 0x1A && u[7] === 0xE1) {
            return 'hwp';
        }
        if (u[0] === 0x50 && u[1] === 0x4B && u[2] === 0x03 && u[3] === 0x04) {
            return 'hwpx';
        }
        return 'unknown';
    }

    // ===== 추출 =====
    //
    // 출력: {
    //   doc,                      // HwpDocument 인스턴스 (재사용)
    //   format: 'hwp'|'hwpx',
    //   uniqueTexts: string[]     // dedup된 번역 대상
    // }
    //
    // 추출 방식:
    //  rhwp는 (sec, para, char_offset, count) 좌표 체계를 노출하지만
    //  공개 API 중 "전체 텍스트 한 번에"는 명시적으로 없다.
    //  대신 getTextRange를 충분히 큰 카운트로 호출해 단락별 텍스트를 수집한다.
    //  단락 수는 d.ts 상 sectionCount/paragraphCount를 통해 파악.
    async function extract(arrayBuffer) {
        const mod = await ensureLoaded();
        const HwpDocument = mod.HwpDocument;
        if (!HwpDocument) throw new Error('@rhwp/core: HwpDocument 클래스 누락');

        const format = detectFormat(arrayBuffer);
        if (format === 'unknown') throw new Error('지원하지 않는 파일 형식 (HWP 5.0 또는 HWPX만 가능)');

        const doc = new HwpDocument(new Uint8Array(arrayBuffer));

        // dedup용 — searchText 또는 단락 순회로 수집
        // rhwp가 노출하는 가장 신뢰할 만한 경로는 copySelection(... 전체 범위 ...).
        // 다만 "전체 범위"를 알려면 sectionCount/paragraphCount 필요. 이름이 있으면 사용.
        const uniqueSet = new Set();
        const ordered = [];

        // 1) sectionCount / paragraphCount(idx) 시도
        const secCount = (typeof doc.sectionCount === 'function' ? doc.sectionCount() : 0) || 0;
        if (secCount > 0) {
            for (let s = 0; s < secCount; s++) {
                let paraCount = 0;
                if (typeof doc.paragraphCount === 'function') {
                    try { paraCount = doc.paragraphCount(s) || 0; } catch (_e) { paraCount = 0; }
                }
                for (let p = 0; p < paraCount; p++) {
                    let txt = '';
                    try {
                        // 큰 카운트로 호출하면 단락 끝까지 반환 (rhwp 동작)
                        txt = doc.getTextRange(s, p, 0, 100000) || '';
                    } catch (_e) { txt = ''; }
                    if (txt && txt.trim()) {
                        // 단락 내 줄바꿈 단위로 더 잘게 쪼갠다 (run 단위까진 못 들어가도 줄 단위는 안전)
                        const lines = txt.split(/\n/);
                        for (const ln of lines) {
                            const v = ln.trim();
                            if (!v) continue;
                            if (!uniqueSet.has(v)) {
                                uniqueSet.add(v);
                                ordered.push(v);
                            }
                        }
                    }
                }
            }
        }

        return { doc: doc, format: format, uniqueTexts: ordered };
    }

    // ===== 치환 =====
    //
    // translationMap: Map<원문, 번역문>
    // 단순 전체문서 대상 replaceAll 호출 — 짧고 고유한 문자열에 안전.
    // 동일 원문이 여러 군데 있어도 같은 번역으로 일괄 교체되므로 일관성 보장.
    async function applyReplacements(doc, translationMap) {
        if (!doc || typeof doc.replaceAll !== 'function') {
            throw new Error('rhwp: replaceAll 메서드 누락 (버전 미스매치?)');
        }

        // 긴 문자열부터 먼저 치환 (짧은 게 긴 것의 부분문자열일 때 충돌 방지)
        const pairs = Array.from(translationMap.entries())
            .filter(function (p) { return p[0] && p[1] && p[0] !== p[1]; })
            .sort(function (a, b) { return b[0].length - a[0].length; });

        let replaced = 0;
        for (const [orig, trans] of pairs) {
            try {
                doc.replaceAll(orig, trans, true); // case_sensitive: true (한글에 대소문자 무관)
                replaced++;
            } catch (e) {
                console.warn('[translate-hwp] replaceAll 실패:', orig.slice(0, 30), e && e.message);
            }
        }
        return replaced;
    }

    // ===== 직렬화 =====
    //
    // format에 따라 같은 포맷으로 출력 (HWPX→HWPX 정책)
    function serialize(doc, format) {
        if (!doc) throw new Error('doc 누락');
        if (format === 'hwpx') {
            if (typeof doc.exportHwpx !== 'function') {
                throw new Error('rhwp: exportHwpx 메서드 누락');
            }
            return doc.exportHwpx();
        }
        if (format === 'hwp') {
            if (typeof doc.exportHwp !== 'function') {
                throw new Error('rhwp: exportHwp 메서드 누락');
            }
            return doc.exportHwp();
        }
        throw new Error('지원하지 않는 출력 포맷: ' + format);
    }

    global.TranslateHwp = {
        ensureLoaded: ensureLoaded,
        detectFormat: detectFormat,
        extract: extract,
        applyReplacements: applyReplacements,
        serialize: serialize
    };
})(typeof window !== 'undefined' ? window : globalThis);
