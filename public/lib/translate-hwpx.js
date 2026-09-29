// HWPX(한컴 OWPML, ZIP+XML) 텍스트 추출/치환
// jszip 글로벌(이미 index.html에서 CDN 로드)을 사용한다.
// multicultural-board 패턴: <hp:t> 텍스트 노드 단위로 추출·치환 (서식 보존).
// 추출 전에 같은 서식의 조각 run 을 합쳐 문장 단위로 번역되게 한다(mergeHwpxRuns).
// window.TranslateHwpx 로 노출.
(function (global) {
    'use strict';

    if (typeof JSZip === 'undefined') {
        console.warn('[translate-hwpx] JSZip 미로드 — index.html의 jszip CDN script 확인');
    }

    // <hp:t>...</hp:t>  또는  <ns0:t>...</ns0:t> 등 임의 prefix 허용
    // 자식 태그가 들어간 경우는 스킵 (멀티런 등). 텍스트만 직접 들어간 노드만 매치.
    const HP_T_RE = /<([\w]+:)t(\s[^>]*)?>([^<]*)<\/\1t>/g;

    // 모든 Section\d+.xml 검출 정규식 (Contents/Section0.xml 등)
    function isSectionPath(name) {
        return /Contents\/Section\d+\.xml$/i.test(name);
    }
    function isHeaderPath(name) {
        return /Contents\/header\.xml$/i.test(name);
    }

    // === XML 이스케이프 ===
    function escapeXml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
    function unescapeXml(s) {
        return String(s)
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&#(\d+);/g, function (_m, c) { return String.fromCodePoint(parseInt(c, 10)); })
            .replace(/&#x([0-9a-fA-F]+);/g, function (_m, h) { return String.fromCodePoint(parseInt(h, 16)); })
            .replace(/&amp;/g, '&'); // & 마지막 — 먼저 풀면 "&amp;lt;"가 "<"로 이중 디코딩돼 XML이 깨진다
    }

    // ===== run 병합 (multicultural-board lib/xmlI18n.ts mergeHwpxRuns 이식) =====
    //
    // 한글은 맞춤법 검사·부분 서식 때문에 한 문장을 여러 run 으로 쪼개 저장한다
    // ("안녕" + "하세요"). 조각별로 번역하면 문장이 깨지는 게 번역 품질 저하의 최대 원인이었다.
    // "서식(charPrIDRef 등 run 속성)이 같고 사이에 공백뿐인" 인접 단순 run 을 하나로 합친 뒤 추출한다.
    // 문단 경계(</hp:p><hp:p>)는 사이에 태그가 끼므로 절대 합쳐지지 않는다.
    // 자식이 <hp:t> 하나뿐인 run 만 대상 — 탭·그림·필드 등 다른 자식이 있으면 건드리지 않는다.
    const HWPX_SIMPLE_RUN = /<([\w]+:)?run\b([^>]*)>\s*<([\w]+:)?t(?:\s[^>]*)?>([^<]*)<\/\3t>\s*<\/\1run>/g;

    function mergeHwpxRuns(xml) {
        const runs = [];
        HWPX_SIMPLE_RUN.lastIndex = 0;
        let m;
        while ((m = HWPX_SIMPLE_RUN.exec(xml)) !== null) {
            runs.push({
                start: m.index, end: m.index + m[0].length, full: m[0],
                prefix: m[1] || '', attrs: m[2] || '', tPrefix: m[3] || '', text: m[4]
            });
        }
        if (runs.length < 2) return xml;

        const norm = function (a) { return a.replace(/\s+/g, ' ').trim(); };
        const sameStyle = function (a, b) { return a.prefix === b.prefix && norm(a.attrs) === norm(b.attrs); };

        let out = '', cursor = 0, i = 0;
        while (i < runs.length) {
            let j = i;
            while (
                j + 1 < runs.length &&
                /^\s*$/.test(xml.slice(runs[j].end, runs[j + 1].start)) &&
                sameStyle(runs[j + 1], runs[i])
            ) j++;
            out += xml.slice(cursor, runs[i].start);
            if (j > i) {
                const r = runs[i];
                const text = runs.slice(i, j + 1).map(function (x) { return x.text; }).join('');
                out += '<' + r.prefix + 'run' + r.attrs + '><' + r.tPrefix + 't>' + text + '</' + r.tPrefix + 't></' + r.prefix + 'run>';
            } else {
                out += runs[i].full;
            }
            cursor = runs[j].end;
            i = j + 1;
        }
        return out + xml.slice(cursor);
    }

    // ===== 추출 =====
    //
    // 입력: ArrayBuffer (HWPX 파일)
    // 출력: {
    //   zip,                    // 재사용을 위해 JSZip 인스턴스 반환
    //   sections: { [path]: xml }, // 원본 섹션 XML 사본
    //   headerXml: string,
    //   entries: Array<{ section, idx, raw, decoded }>, // 추출된 텍스트 노드
    //   uniqueTexts: string[],  // dedup된 번역 대상
    //   indexByText: Map<string, number>, // dedup → index 매핑
    //   fileNames: string[]
    // }
    async function extract(arrayBuffer) {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const sections = {};
        let headerXml = '';
        const entries = [];

        // 섹션 파일들을 모두 로드
        const fileNames = Object.keys(zip.files).filter(function (n) { return !zip.files[n].dir; });

        for (const name of fileNames) {
            if (isSectionPath(name)) {
                const xml = await zip.files[name].async('string');
                // 조각 run 을 문장 단위로 합친 XML 을 기준으로 추출·치환한다
                sections[name] = mergeHwpxRuns(xml);
            } else if (isHeaderPath(name)) {
                headerXml = await zip.files[name].async('string');
            }
        }

        // 각 섹션에서 <hp:t> 추출
        for (const sectionPath of Object.keys(sections)) {
            const xml = sections[sectionPath];
            HP_T_RE.lastIndex = 0;
            let m, idx = 0;
            while ((m = HP_T_RE.exec(xml)) !== null) {
                const raw = m[3];
                const decoded = unescapeXml(raw);
                entries.push({
                    section: sectionPath,
                    idx: idx,
                    raw: raw,
                    decoded: decoded,
                    matchIdx: m.index
                });
                idx++;
            }
        }

        // dedup
        const indexByText = new Map();
        const uniqueTexts = [];
        for (const e of entries) {
            const t = e.decoded;
            if (!t || !t.trim()) continue;
            if (!indexByText.has(t)) {
                indexByText.set(t, uniqueTexts.length);
                uniqueTexts.push(t);
            }
        }

        return {
            zip: zip,
            sections: sections,
            headerXml: headerXml,
            entries: entries,
            uniqueTexts: uniqueTexts,
            indexByText: indexByText,
            fileNames: fileNames
        };
    }

    // ===== 치환 =====
    //
    // 입력: extract() 결과 + translationMap (원문 → 번역문 Map)
    // 동작: zip 내부 Section XML 들과 header.xml(옵션)을 새 텍스트로 갈아치움.
    //       빈 문자열·매핑 없는 항목은 원본 유지.
    // 출력: zip 인스턴스 (generateAsync 호출은 호출자 책임)
    function applyReplacements(extracted, translationMap, options) {
        const zip = extracted.zip;
        options = options || {};

        for (const sectionPath of Object.keys(extracted.sections)) {
            const xml = extracted.sections[sectionPath];
            HP_T_RE.lastIndex = 0;

            const newXml = xml.replace(HP_T_RE, function (full, prefix, attrs, raw) {
                const decoded = unescapeXml(raw);
                if (!decoded || !decoded.trim()) return full;
                if (!translationMap.has(decoded)) return full;
                const translated = translationMap.get(decoded);
                if (translated == null || translated === decoded) return full;
                const escaped = escapeXml(translated);
                return '<' + prefix + 't' + (attrs || '') + '>' + escaped + '</' + prefix + 't>';
            });

            zip.file(sectionPath, newXml);
        }

        // header.xml은 호출자가 별도로 scaleHeaderXml/unifyFontsHwpx 처리 후 넣어줌
        if (options.headerXml) {
            // header.xml 경로 검색
            const headerPath = extracted.fileNames.find(isHeaderPath);
            if (headerPath) {
                zip.file(headerPath, options.headerXml);
            }
        }

        return zip;
    }

    // ===== 직렬화 =====
    //
    // HWPX zip 압축 규칙 보존:
    //  - mimetype: STORE (비압축)
    //  - version.xml, Preview/PrvImage.png: STORE
    //  - 그 외 XML: DEFLATE
    //  - 디렉토리 엔트리 제거 (jszip이 자동 추가하는 것 포함)
    //
    // ※ 이 규칙은 lib/hwpx.js (server-side)에서 검증된 사항과 동일하다.
    async function serialize(zip) {
        const STORED = new Set(['mimetype', 'version.xml', 'Preview/PrvImage.png']);

        // 디렉토리 엔트리 제거
        const dirNames = [];
        zip.forEach(function (path, file) {
            if (file.dir) dirNames.push(path);
        });
        dirNames.forEach(function (n) { zip.remove(n); });

        // 각 파일별 압축 방식 지정 — generateAsync의 file별 compression
        // jszip 3.x: zip.file(name)으로 가져와 .options.compression 갱신
        const allNames = Object.keys(zip.files);
        for (const n of allNames) {
            const f = zip.files[n];
            if (!f) continue;
            if (STORED.has(n)) {
                // STORE: 비압축 — file 객체 재등록 시 compression 옵션 명시
                const content = await f.async('uint8array');
                zip.file(n, content, { compression: 'STORE', createFolders: false });
            }
        }

        return await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
            mimeType: 'application/hwp+zip'
        });
    }

    global.TranslateHwpx = {
        extract: extract,
        applyReplacements: applyReplacements,
        serialize: serialize,
        escapeXml: escapeXml,
        unescapeXml: unescapeXml,
        mergeHwpxRuns: mergeHwpxRuns,
        isSectionPath: isSectionPath,
        isHeaderPath: isHeaderPath
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = global.TranslateHwpx;
})(typeof window !== 'undefined' ? window : globalThis);
