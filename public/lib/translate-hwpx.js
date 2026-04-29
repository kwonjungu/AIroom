// HWPX(한컴 OWPML, ZIP+XML) 텍스트 추출/치환
// jszip 글로벌(이미 index.html에서 CDN 로드)을 사용한다.
// multicultural-board 패턴: <hp:t> 텍스트 노드 단위로 추출·치환 (서식 보존).
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
            .replace(/&#(\d+);/g, function (_m, c) { return String.fromCharCode(parseInt(c, 10)); })
            .replace(/&amp;/g, '&'); // & 마지막
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
                sections[name] = xml;
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
        isSectionPath: isSectionPath,
        isHeaderPath: isHeaderPath
    };
})(typeof window !== 'undefined' ? window : globalThis);
