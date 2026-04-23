// 급식 식단표 HWPX/PDF 파싱 + Groq 호출로 날짜별 메뉴 JSON 추출
const JSZip = require('jszip');

// PDF 텍스트 추출 — unpdf 사용 (Vercel/Cloudflare 서버리스 친화적 pdfjs 래퍼).
// 급식 식단표는 월~금 5열 표 구조라 y 단위 row 묶음만으로는 날짜를 분리할 수 없다.
// (같은 y에 5개 날의 밥/국/메인이 나란히 찍힘.) 그래서 아래 단계로 간다:
//   1) 모든 item을 {page, x, y, s}로 수집
//   2) 같은 page에서 y가 ±2 이내인 item들을 한 row로 묶음
//   3) 3~5개의 날짜 토큰(예: "1", "6(생태ㆍ환경의 날)")만으로 구성된 row를 "날짜행"으로 인식,
//      각 날짜 토큰의 x 좌표를 그 주의 컬럼 중심으로 사용
//   4) 이후 row의 item들을 가장 가까운 컬럼 중심에 bin (너무 멀면 preamble/각주로 보고 스킵)
async function extractPdfText(buffer) {
    const { getDocumentProxy } = await import('unpdf');
    const data = new Uint8Array(buffer);
    const pdf = await getDocumentProxy(data);
    const allItems = [];
    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        for (const item of tc.items) {
            const s = (item.str || '').trim();
            if (!s) continue;
            allItems.push({
                page: p,
                x: item.transform[4],
                y: item.transform[5],
                s
            });
        }
    }
    return structureByColumns(allItems);
}

// 컬럼 기반 구조화.
function structureByColumns(allItems) {
    // 같은 row 판정 허용오차(y 기준). "7"이 y=490, 나머지 "6,8,9,10"이 y=489처럼 렌더되는
    // PDF 변형 때문에 필요. 2면 legitimate 이웃 row 병합은 막힘 (실 데이터 간격 4 이상).
    const Y_TOLERANCE = 2;
    // 컬럼 중심에서 이 거리 이상 떨어진 item은 메뉴 데이터로 보지 않음.
    // 컬럼 간격이 약 109 (135.1-25.8), 절반의 조금 더 여유인 60.
    const COLUMN_MAX_DIST = 60;
    // 날짜 item 엄격 매칭: "1" 또는 "15(세계음식체험의 날)" 같은 토큰만.
    // "1.5.6.13" 알러지 코드, "9.새우"(설명 텍스트) 등은 매칭 안 됨.
    const DATE_STRICT_RE = /^(\d{1,2})(?:\([^)]*\))?$/;
    const NUTR_RE = /^\d+\.\d{1,3}\/\d+\.\d{1,3}\/\d+\.\d{1,3}\/\d+\.\d{1,3}$/;

    // page별 내림차순 y 기준으로 정렬 → row 묶음
    const sorted = [...allItems].sort((a, b) =>
        a.page - b.page || b.y - a.y || a.x - b.x
    );
    const rows = [];
    let cur = null;
    for (const it of sorted) {
        if (!cur || cur.page !== it.page || Math.abs(cur.firstY - it.y) > Y_TOLERANCE) {
            cur = { page: it.page, firstY: it.y, items: [] };
            rows.push(cur);
        }
        cur.items.push(it);
    }
    for (const r of rows) r.items.sort((a, b) => a.x - b.x);

    const out = [];
    let columns = null;   // [{day, x}]
    let weekMenus = null; // Map<day, string[]>
    let curPage = null;

    // 한 컬럼 안에서 "치 즈 떡 볶 이"처럼 단일문자 한글이 공백으로 분리돼 찍힌 경우
    // 다시 "치즈떡볶이"로 합침. 2글자 이상 연속된 한글 syllable 런을 감지해서 공백만 제거.
    const collapseSpacedHangul = (s) =>
        s.replace(/(?<=^|[^가-힣])[가-힣](?:\s[가-힣])+(?=[^가-힣]|$)/g,
            m => m.replace(/\s+/g, ''));

    const flushWeek = () => {
        if (columns && weekMenus) {
            for (const col of columns) {
                const arr = weekMenus.get(col.day) || [];
                if (arr.length) {
                    const joined = arr.join(' ').replace(/\s+/g, ' ').trim();
                    const menu = collapseSpacedHangul(joined);
                    if (menu) out.push(`[Day ${col.day}] ${menu}`);
                }
            }
        }
        columns = null;
        weekMenus = null;
    };

    for (const row of rows) {
        // 페이지 경계에서 주 리셋 (2페이지 교육자료 영역이 오염 유발하지 않게)
        if (curPage !== row.page) {
            flushWeek();
            curPage = row.page;
        }

        // row의 item들을 (날짜토큰 / 괄호시작 / 그 외)로 분류
        const dateStarters = [];
        const parenItems = [];
        const otherItems = [];
        for (const it of row.items) {
            const m = it.s.match(DATE_STRICT_RE);
            if (m) {
                const d = parseInt(m[1], 10);
                if (d >= 1 && d <= 31) {
                    dateStarters.push({ day: d, x: it.x });
                    continue;
                }
            }
            if (/^\(/.test(it.s)) parenItems.push(it);
            else otherItems.push(it);
        }

        // 날짜행 판정:
        //   (1) 서로 다른 날짜 값 2개 이상 (같은 "9"가 알러지 코드로 반복되는 경우 걸러냄)
        //   (2) 그 외 item은 모두 날짜 item에서 COLUMN_MAX_DIST 밖에 있어야 함.
        //       (마지막 주의 날짜행이 "30 31 ※ 식단은…" 형태로 푸터와 합쳐진 경우 구제.)
        const uniqueDays = new Set(dateStarters.map(d => d.day));
        let othersAllFar = true;
        for (const it of otherItems) {
            let minDist = Infinity;
            for (const d of dateStarters) {
                const dist = Math.abs(it.x - d.x);
                if (dist < minDist) minDist = dist;
            }
            if (minDist <= COLUMN_MAX_DIST) { othersAllFar = false; break; }
        }
        const isDateRow = uniqueDays.size >= 2
            && uniqueDays.size <= 5
            && othersAllFar;

        if (isDateRow) {
            flushWeek();
            columns = dateStarters
                .map(d => ({ day: d.day, x: d.x }))
                .sort((a, b) => a.x - b.x);
            weekMenus = new Map();
            for (const c of columns) weekMenus.set(c.day, []);
            continue;
        }

        if (!columns || !weekMenus) continue;

        // 메뉴 item bin — 가장 가까운 컬럼 중심에 배치
        for (const it of row.items) {
            if (NUTR_RE.test(it.s)) continue;
            let best = null, bestDist = Infinity;
            for (const c of columns) {
                const d = Math.abs(c.x - it.x);
                if (d < bestDist) { bestDist = d; best = c; }
            }
            if (best && bestDist <= COLUMN_MAX_DIST) {
                weekMenus.get(best.day).push(it.s);
            }
        }
    }
    flushWeek();

    return out.join('\n');
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
    const sys = '너는 학교 급식 식단표 텍스트를 최종 JSON으로 변환하는 도우미다. 코드블록/설명 없이 JSON 객체 하나만 반환한다.';
    const yyyy = String(year);
    const mm = String(month).padStart(2, '0');
    const user = [
        `아래는 ${year}년 ${month}월 급식 식단표에서 추출한 텍스트 데이터다.`,
        '형식은 둘 중 하나:',
        '  A) 날짜별로 이미 분리된 형태 — 각 줄이 "[Day N] 메뉴1 메뉴2 ..."로 시작 (PDF에서 추출)',
        '  B) 원본 문서에서 그대로 뽑은 raw 텍스트 — 날짜와 메뉴가 섞여 있으니 네가 추론 (HWPX에서 추출)',
        '메뉴 이름 뒤에 알러지 번호(예: 1.5.6, 5.6.9.13.18)가 붙어 있을 수 있다.',
        '',
        '[너의 작업]',
        `1) 각 날짜를 "${yyyy}-${mm}-DD" (DD는 두 자리) 형식으로 변환한다.`,
        '2) 각 메뉴에 붙은 알러지 번호(마침표/숫자 조합, 예: 2.5.6.13 / 1.5 / 5)를 "모두 제거"한다.',
        '3) 메뉴 내 괄호(와 그 안 텍스트)와 "kcal", 영양소 수치, 원산지/행사명/이벤트 설명 문구(예: "생일축하의 날", "세계음식체험의 날")는 제거한다.',
        '4) 공백으로 구분되어 있던 각 메뉴를 ", "(쉼표+공백)으로 다시 이어 한 문자열로 만든다. 단, "수제돈까스/소스"처럼 슬래시로 묶인 단일 메뉴는 그대로 둔다.',
        '5) 데이터가 없거나 메뉴가 추출되지 않는 날짜는 JSON에서 제외한다.',
        '6) 주말/공휴일은 메뉴가 없으므로 자동으로 제외된다. ※로 시작하는 안내 문구는 메뉴가 아니니 무시.',
        '',
        '[출력]',
        '{"YYYY-MM-DD": "메뉴1, 메뉴2, ..."} 형태의 JSON 객체 1개만. 다른 텍스트(코드블록/설명) 금지.',
        '',
        '--- 데이터 ---',
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
