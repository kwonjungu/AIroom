// 급식 식단표 HWPX/PDF 파싱 + Groq 호출로 날짜별 메뉴 JSON 추출
const JSZip = require('jszip');

// pdfjs-dist v5는 Node 환경에 DOMMatrix가 필요 → 없을 때만 폴리필
if (typeof globalThis.DOMMatrix === 'undefined') {
    globalThis.DOMMatrix = require('dommatrix');
}

// PDF 텍스트 추출 — pdfjs-dist (legacy build, Node 호환)
// 모든 페이지를 순회하며 텍스트 항목을 줄바꿈으로 연결
async function extractPdfText(buffer) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // Vercel 서버리스에서 fake worker가 dynamic import로 pdf.worker.mjs를 못 찾는 문제 대응
    // → workerSrc를 실제 파일 경로로 고정. vercel.json includeFiles로 함께 번들됨.
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        try {
            pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
        } catch (_) { /* fallback: fake worker try */ }
    }
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: false });
    const pdf = await loadingTask.promise;
    const lines = [];
    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        // y좌표 기준으로 묶어 한 줄씩 (대략적)
        const rowMap = new Map();
        for (const item of tc.items) {
            if (!item.str) continue;
            const y = Math.round(item.transform[5]);
            if (!rowMap.has(y)) rowMap.set(y, []);
            rowMap.get(y).push({ x: item.transform[4], s: item.str });
        }
        const ys = Array.from(rowMap.keys()).sort((a,b) => b - a); // top → bottom
        for (const y of ys) {
            const row = rowMap.get(y).sort((a,b) => a.x - b.x).map(o => o.s).join(' ').trim();
            if (row) lines.push(row);
        }
        page.cleanup();
    }
    return lines.join('\n');
}

// 파일 시그니처/확장자로 PDF vs HWPX 판별 후 텍스트 추출
async function extractMenuText(buffer, filename) {
    const head = buffer.slice(0, 4);
    const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // %PDF
    const isZip = head[0] === 0x50 && head[1] === 0x4B; // PK (HWPX/zip)
    if (isPdf || /\.pdf$/i.test(filename || '')) return extractPdfText(buffer);
    if (isZip || /\.hwpx$/i.test(filename || '')) return extractHwpxText(buffer);
    throw new Error('지원하지 않는 파일 형식입니다 (HWPX 또는 PDF만 가능).');
}

// HWPX의 Contents/*.xml 을 모두 돌면서 <hp:t>...</hp:t> 안의 텍스트만 모아 줄바꿈으로 연결
async function extractHwpxText(buffer) {
    const zip = await JSZip.loadAsync(buffer);
    const xmlNames = Object.keys(zip.files)
        .filter(n => n.startsWith('Contents/') && n.endsWith('.xml'))
        .sort();

    const lines = [];
    for (const name of xmlNames) {
        const xml = await zip.file(name).async('string');
        // 각 문단(<hp:p>) 단위로 텍스트를 모아 한 줄로
        const paragraphs = xml.split(/<hp:p\b/);
        for (const p of paragraphs) {
            const texts = [];
            // 속성 있는 태그도 매칭 (<hp:t xml:space="preserve">...</hp:t>)
            const re = /<hp:t\b[^>]*>([^<]*)<\/hp:t>/g;
            let m;
            while ((m = re.exec(p)) !== null) {
                const t = m[1]
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'");
                if (t) texts.push(t);
            }
            if (texts.length) lines.push(texts.join(' ').trim());
        }
    }
    return lines.filter(l => l.length > 0).join('\n');
}

// Groq 호출 → { "YYYY-MM-DD": "메뉴1, 메뉴2, ..." } 형태로 반환
async function parseMenuWithGroq(text, year, month, callGroqWithFallback) {
    const sys = '너는 학교 급식 식단표를 파싱하는 도우미다. 입력된 텍스트에서 각 날짜의 중식(점심) 메뉴만 추출해서 JSON으로만 응답한다. 설명이나 코드블록 없이 JSON 객체 하나만 반환해라.';
    const user = [
        `다음은 ${year}년 ${month}월 학교 급식 식단표에서 추출한 텍스트다.`,
        '각 날짜별 중식 메뉴를 추출해서 다음 형태의 JSON으로만 답해라.',
        '형식: {"YYYY-MM-DD": "메뉴1, 메뉴2, 메뉴3, ..."}',
        '',
        '[식단표 구조 힌트]',
        '- 학교 급식 식단표는 대개 "주 단위 캘린더" 구조다.',
        '- 한 줄에 여러 날짜(월~금)가 먼저 나오고, 그 아래에 해당 주의 메뉴들이 5개 칼럼(월·화·수·목·금)으로 줄줄이 나열된다.',
        '- 각 주마다 이 패턴이 반복된다. 날짜와 메뉴의 칼럼 순서를 반드시 일치시켜야 한다(첫 번째 날짜 = 해당 주 첫 번째 메뉴 묶음).',
        '- 메뉴 한 칸에는 보통 3~7개 요리가 있으며(밥/국/반찬), 각 요리 뒤에 알레르기 숫자(예: 5.6.9.13.18)가 붙을 수 있다.',
        '',
        '[주의사항]',
        '- 날짜 키는 반드시 YYYY-MM-DD 형식. 연도는 ' + year + ', 월은 ' + String(month).padStart(2, '0') + '로 고정.',
        '- 메뉴는 쉼표로 구분된 단일 문자열. 숫자·점·괄호로만 된 알레르기 번호는 완전히 제거한다.',
        '- 주말/공휴일/방학/"급식없음" 등 급식이 없는 날은 JSON에 포함하지 말 것.',
        '- 영양 정보(Kcal, 단백질, 지방 수치), 원산지, 행사명 설명, 교육자료 문구는 모두 제거한다.',
        '- 메뉴가 불분명하거나 추출 불가한 날짜는 생략(빈 문자열 금지).',
        '- JSON 외 다른 텍스트(마크다운 코드블록, 설명, 주석) 절대 금지.',
        '',
        '--- 식단표 텍스트 ---',
        text.slice(0, 12000)
    ].join('\n');

    // response_format(json_object)은 일부 폴백 모델이 미지원이라 제외.
    // content 파싱 단계에서 { ... } 정규식으로 안전 추출.
    const body = {
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: sys },
            { role: 'user', content: user }
        ],
        temperature: 0.1,
        max_tokens: 4000
    };

    const result = await callGroqWithFallback(body);
    if (!result.ok) {
        throw new Error('Groq 호출 실패: ' + (result.data && result.data.error ? JSON.stringify(result.data.error) : 'unknown'));
    }
    const content = result.data.choices?.[0]?.message?.content || '{}';
    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch (e) {
        // 모델이 마크다운 감싸는 경우 대비
        const m = content.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('응답이 JSON이 아님: ' + content.slice(0, 200));
        parsed = JSON.parse(m[0]);
    }

    // 키 검증: YYYY-MM-DD 형식만 남기고, 해당 연월과 일치하는 것만
    const yyyy = String(year);
    const mm = String(month).padStart(2, '0');
    const out = {};
    for (const k of Object.keys(parsed)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && k.startsWith(`${yyyy}-${mm}-`)) {
            const v = parsed[k];
            if (typeof v === 'string' && v.trim()) {
                out[k] = v.trim();
            }
        }
    }
    return out;
}

module.exports = { extractHwpxText, extractPdfText, extractMenuText, parseMenuWithGroq };
