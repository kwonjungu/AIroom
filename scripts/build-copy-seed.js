// 시연용 카피본(/copy) 가상 시드 데이터 생성 스크립트
// defaults-posting/ 의 익명 구조를 바탕으로, 2026년 10월의 바쁜 가상 학교("새봄초등학교")를 만든다.
// 결과: defaults-copy/*.json (실존 인물·학교 정보 없음)
//
// 실행: node scripts/build-copy-seed.js
// - 고정 시드 PRNG만 사용 → 몇 번을 돌려도 같은 결과 (재실행 가능)
// - tdist(교사 배포) PDF·서명 이미지는 sharp로 SVG를 렌더링해 만든다 (한글 글꼴: 맑은 고딕/나눔 등 시스템 글꼴)
// - defaults/, defaults-posting/ 원본은 절대 수정하지 않음

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const BASE = path.join(ROOT, 'defaults-posting');
const DST = path.join(ROOT, 'defaults-copy');

const SCHOOL = '새봄초등학교';
const SCHOOL_SHORT = '새봄초';
const BRANCH = '해오름분교';

// ---------- 결정적 PRNG (mulberry32) ----------
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
let rand = mulberry32(20261001);
const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));       // 정수 [a,b]
const pick = arr => arr[Math.floor(rand() * arr.length)];
const chance = p => rand() < p;
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const TOKEN_CHARS = 'abcdefghijkmnpqrstuvwxyz23456789';
const usedTokens = new Set();
function token() {
    let s;
    do { s = ''; for (let i = 0; i < 8; i++) s += TOKEN_CHARS[Math.floor(rand() * TOKEN_CHARS.length)]; } while (usedTokens.has(s));
    usedTokens.add(s);
    return s;
}
const short3 = () => Math.floor(rand() * 36 ** 3).toString(36).padStart(3, '0');
const short4 = () => Math.floor(rand() * 36 ** 4).toString(36).padStart(4, '0');

// ---------- 날짜 도우미 (KST 기준) ----------
function kst(y, m, d, h = 9, mi = 0) { return Date.UTC(y, m - 1, d, h - 9, mi); }  // ms
function kstIso(y, m, d, h, mi) { return new Date(kst(y, m, d, h, mi)).toISOString(); }
function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; }
function ymdMs(s, h = 9, mi = 0) { const { y, m, d } = parseYmd(s); return kst(y, m, d, h, mi); }
function ymdIso(s, h, mi) { return new Date(ymdMs(s, h, mi)).toISOString(); }
function dow(s) { const { y, m, d } = parseYmd(s); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
function addDays(s, n) { const { y, m, d } = parseYmd(s); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); }
function dateRange(a, b) { const out = []; for (let s = a; s <= b; s = addDays(s, 1)) out.push(s); return out; }
function dotDate(s) { const { y, m, d } = parseYmd(s); return `${y}. ${String(m).padStart(2, '0')}. ${String(d).padStart(2, '0')}.`; }
function randWeekday(a, b) { const days = dateRange(a, b).filter(s => dow(s) !== 0 && dow(s) !== 6); return pick(days); }
const WD = ['일', '월', '화', '수', '목', '금', '토'];

function readBase(file) { return JSON.parse(fs.readFileSync(path.join(BASE, file), 'utf-8')); }
function write(file, data) {
    fs.writeFileSync(path.join(DST, file), JSON.stringify(data, null, 2) + '\n', 'utf-8');
    const n = Array.isArray(data) ? data.length : Object.keys(data).length;
    console.log(`  ${file.padEnd(28)} ${String(n).padStart(4)} ${Array.isArray(data) ? 'items' : 'keys'}`);
}

// ======================================================================
// 1. 교직원 명부 (가상 인물)
// ======================================================================
const STAFF = [
    ['s1', '교장', '박정호'], ['s2', '교감', '이미영'],
    ['s3', '1-1', '김하늘'], ['s4', '2-1', '이서준'], ['s5', '3-1', '박지우'],
    ['s6', '4-1', '최윤서'], ['s7', '5-1', '정민재'], ['s8', '6-1', '강수아'],
    ['s9', '교과전담', '조현우'], ['s10', '특수교사', '윤채원'], ['s11', '영양교사', '장은비'],
    ['s12', '보건교사', '한지민'], ['s13', '유치원', '임소연'],
    ['s14', '1-해오름', '송다은'], ['s15', '3,4-해오름', '오태윤'], ['s16', '6-해오름', '홍성민'],
    ['s17', '교과전담', '문예린'], ['s18', '특수교사', '서가은'],
].map(([id, position, name]) => ({ id, no: Number(id.slice(1)), position, name }));
const EXTRA = [
    ['s19', '행정실장', '신재혁'], ['s20', '주무관', '김나연'], ['s21', '주무관', '이준호'],
    ['s22', '주무관', '박성진'], ['s23', '행정실무사', '최유진'], ['s24', '행정실무사', '노하은'],
    ['s25', '사서', '표서연'], ['s26', '유치원방과후', '도은숙'], ['s27', '돌봄전담사', '양미경'],
    ['s28', '조리사', '봉순자'], ['s29', '조리실무사', '명혜진'], ['s30', '조리실무사', '차경희'],
    ['s31', '스포츠강사', '마준석'], ['s32', '늘봄실장', '구민지'], ['s33', '늘봄실무사', '탁세영'],
].map(([id, position, name]) => ({ id, no: Number(id.slice(1)), position, name }));
const ALL = [...STAFF, ...EXTRA];
const BY_ID = Object.fromEntries(ALL.map(s => [s.id, s]));
const N = id => { if (!BY_ID[id]) throw new Error('unknown staff id ' + id); return BY_ID[id].name; };
if (new Set(ALL.map(s => s.name)).size !== ALL.length) throw new Error('중복 이름');

// defaults-posting 의 자리표시 이름 → 가상 인물
const POSTING_NAME_MAP = {
    '김교장': N('s1'), '이교감': N('s2'),
    '김선생': N('s3'), '이선생': N('s4'), '박선생': N('s5'), '최선생': N('s6'), '정선생': N('s7'), '강선생': N('s8'),
    '조선생': N('s9'), '윤선생': N('s10'), '장영양': N('s11'), '한보건': N('s12'), '임유아': N('s13'),
    '송선생': N('s14'), '안선생': N('s15'), '홍선생': N('s16'), '권선생': N('s17'), '류선생': N('s18'),
    '신실장': N('s19'), '표행정': N('s20'), '김주무': N('s20'), '이주무': N('s21'), '박주무': N('s22'),
    '최행정': N('s23'), '노행정': N('s24'), '표사서': N('s25'), '도방과': N('s26'), '양돌봄': N('s27'),
    '봉조리': N('s28'), '명조리': N('s29'), '차조리': N('s30'), '마감독': N('s31'), '도늘봄': N('s32'), '모늘봄': N('s33'),
};
const TEXT_MAP = {
    ...POSTING_NAME_MAP,
    '샘플초등학교': SCHOOL, '샘플초': SCHOOL_SHORT, '샘플놀이학교': '새봄놀이학교', '샘플': '새봄',
    '나눔분교': BRANCH, '씨름장': '강당',
};
const TEXT_RE = new RegExp(Object.keys(TEXT_MAP).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
function remapDeep(v) {
    if (typeof v === 'string') return v.replace(TEXT_RE, m => TEXT_MAP[m]);
    if (Array.isArray(v)) return v.map(remapDeep);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, remapDeep(x)]));
    return v;
}

// ======================================================================
// 2. 이미지 도우미 (SVG 데이터 URL, sharp PNG, 이미지 1장짜리 PDF)
// ======================================================================
const FONT = "'Malgun Gothic','맑은 고딕','NanumBarunGothic','Nanum Gothic','Apple SD Gothic Neo',sans-serif";
const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const svgDataUrl = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

// 학교 소식용 삽화 (800x450 SVG)
function newsImage(emoji, caption, c1, c2, seed) {
    const r = mulberry32(seed);
    let dots = '';
    for (let i = 0; i < 14; i++) {
        dots += `<circle cx="${Math.round(r() * 800)}" cy="${Math.round(r() * 450)}" r="${Math.round(8 + r() * 38)}" fill="#fff" opacity="${(0.08 + r() * 0.14).toFixed(2)}"/>`;
    }
    return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">`
        + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`
        + `<rect width="800" height="450" fill="url(#g)"/>${dots}`
        + `<text x="400" y="235" font-size="150" text-anchor="middle" font-family="'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif">${emoji}</text>`
        + `<rect x="0" y="340" width="800" height="110" fill="#000" opacity="0.28"/>`
        + `<text x="400" y="405" font-size="34" font-weight="700" fill="#fff" text-anchor="middle" font-family="${FONT}">${xmlEsc(caption)}</text>`
        + `<text x="775" y="438" font-size="14" fill="#fff" opacity="0.8" text-anchor="end" font-family="${FONT}">${SCHOOL} · 시연용 가상 이미지</text>`
        + `</svg>`);
}

// 손글씨 느낌 서명 (240x90 PNG 데이터 URL)
async function signaturePng(seed) {
    const r = mulberry32(seed);
    const pts = [];
    let x = 18 + r() * 12;
    const n = 7 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
        x += 12 + r() * 18;
        pts.push([Math.min(x, 222), 45 + (r() - 0.5) * 50]);
    }
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
        const [px, py] = pts[i - 1], [cx, cy] = pts[i];
        const loop = r() < 0.35 ? (r() - 0.5) * 60 : 0;
        d += ` C ${(px + 8).toFixed(1)} ${(py - 30 + loop).toFixed(1)}, ${(cx - 8).toFixed(1)} ${(cy + 30 - loop).toFixed(1)}, ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    }
    const ux = 20 + r() * 20;
    d += ` M ${ux.toFixed(1)} ${(70 + r() * 8).toFixed(1)} Q 120 ${(58 + r() * 20).toFixed(1)} ${(200 + r() * 20).toFixed(1)} ${(64 + r() * 10).toFixed(1)}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="90"><path d="${d}" fill="none" stroke="#1a1a2e" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    return 'data:image/png;base64,' + buf.toString('base64');
}

// 흑백 래스터 1장을 A4 PDF로 감싼다 (외부 라이브러리 없이 직접 작성)
function rasterPdf(gray, w, h) {
    const img = zlib.deflateSync(gray, { level: 9 });
    const PW = 595.28, PH = 841.89;
    const content = Buffer.from(`q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q\n`, 'latin1');
    const objs = [
        Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'latin1'),
        Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', 'latin1'),
        Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`, 'latin1'),
        Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`, 'latin1'), content, Buffer.from('\nendstream', 'latin1')]),
        Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${img.length} >>\nstream\n`, 'latin1'), img, Buffer.from('\nendstream', 'latin1')]),
    ];
    const parts = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
    let off = parts[0].length;
    const xref = [];
    objs.forEach((o, i) => {
        const head = Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), tail = Buffer.from('\nendobj\n', 'latin1');
        xref.push(off);
        parts.push(head, o, tail);
        off += head.length + o.length + tail.length;
    });
    let x = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    xref.forEach(o => { x += String(o).padStart(10, '0') + ' 00000 n \n'; });
    x += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${off}\n%%EOF\n`;
    parts.push(Buffer.from(x, 'latin1'));
    return Buffer.concat(parts);
}

// 가정통신문 서식 한 장을 그리고, 입력칸 위치(퍼센트)를 tdist 필드로 돌려준다
const PDF_W = 893, PDF_H = 1263;
async function buildFormPdf(spec, fieldIdBase) {
    const W = PDF_W, H = PDF_H;
    const px = p => (p * W / 100).toFixed(1), py = p => (p * H / 100).toFixed(1);
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>`;
    const T = (x, y, size, txt, opt = '') => { s += `<text x="${px(x)}" y="${py(y)}" font-size="${size}" font-family="${FONT}" ${/fill=/.test(opt) ? "" : "fill=\"#111\""} ${opt}>${xmlEsc(txt)}</text>`; };
    // 머리
    s += `<rect x="${px(7)}" y="${py(3.2)}" width="${px(86)}" height="${py(4.2)}" fill="none" stroke="#333" stroke-width="1.2"/>`;
    T(9, 5.9, 17, `${SCHOOL} 가정통신문`, 'font-weight="700"');
    T(91, 5.9, 14, spec.docNo, 'text-anchor="end"');
    T(50, 12.5, 30, spec.title, 'text-anchor="middle" font-weight="700"');
    s += `<line x1="${px(20)}" y1="${py(14.2)}" x2="${px(80)}" y2="${py(14.2)}" stroke="#555" stroke-width="1.5"/>`;
    let y = 19;
    spec.paras.forEach(line => { T(9, y, 17, line); y += 2.7; });
    // 표
    y += 2;
    const fields = [];
    let fi = 0;
    const tableTop = y;
    spec.rows.forEach(row => {
        const h = row.h || 5.2;
        s += `<rect x="${px(8)}" y="${py(y)}" width="${px(22)}" height="${py(h)}" fill="#eef1f5" stroke="#333" stroke-width="1.2"/>`;
        s += `<rect x="${px(30)}" y="${py(y)}" width="${px(62)}" height="${py(h)}" fill="#fff" stroke="#333" stroke-width="1.2"/>`;
        T(19, y + Math.min(h, 5.2) / 2 + 0.7, 17, row.label, 'text-anchor="middle" font-weight="700"');
        if (row.hint) T(90, y + h - 1.0, 12, row.hint, 'text-anchor="end" fill="#777"');
        const fh = row.type === 'text' && h > 6 ? h - 2.2 : 3.5;
        const f = {
            id: `tf_${fieldIdBase + fi * 137}_${short3()}`, type: row.type, label: row.label, page: 0,
            x: 31.5, y: +(y + 0.85).toFixed(2), width: row.w || 45, height: +fh.toFixed(2), required: row.required !== false,
        };
        if (row.type === 'text') f.placeholder = row.placeholder || '';
        if (row.type === 'select') f.options = row.options;
        if (row.type === 'checkbox') f.checkLabel = row.checkLabel || '동의합니다';
        fields.push(f); fi++;
        y += h;
    });
    void tableTop;
    y += 3.5;
    (spec.after || []).forEach(line => { T(9, y, 16, line); y += 2.6; });
    // 날짜·서명
    y = Math.max(y + 2, 78);
    T(50, y, 18, '2026년      월      일', 'text-anchor="middle"');
    y += 5.5;
    T(40, y + 3.2, 18, '보호자 성명 :', 'text-anchor="end"');
    s += `<rect x="${px(42)}" y="${py(y)}" width="${px(24)}" height="${py(4.6)}" fill="none" stroke="#999" stroke-dasharray="4 3"/>`;
    T(68, y + 3.2, 16, '(서명)');
    fields.push({ id: `tf_${fieldIdBase + 900}_${short3()}`, type: 'text', label: '보호자 성명', page: 0, x: 42.5, y: +(y + 0.6).toFixed(2), width: 23, height: 3.5, required: true, placeholder: '' });
    s += `<rect x="${px(74)}" y="${py(y - 1.6)}" width="${px(18)}" height="${py(7.6)}" fill="none" stroke="#999" stroke-dasharray="4 3"/>`;
    fields.push({ id: `tf_${fieldIdBase + 950}_${short3()}`, type: 'signature', label: '서명', page: 0, x: 74, y: +(y - 1.6).toFixed(2), width: 18, height: 7.6, required: true });
    T(50, 94, 26, `${SCHOOL}장`, 'text-anchor="middle" font-weight="700" letter-spacing="6"');
    T(50, 97.6, 11, '※ 시연용 가상 문서입니다. 실제 학교·인물과 관계없습니다.', 'text-anchor="middle" fill="#999"');
    s += '</svg>';
    const { data, info } = await sharp(Buffer.from(s)).flatten({ background: '#ffffff' }).grayscale().raw().toBuffer({ resolveWithObject: true });
    const gray = info.channels === 1 ? data : (() => { const g = Buffer.alloc(info.width * info.height); for (let i = 0; i < g.length; i++) g[i] = data[i * info.channels]; return g; })();
    const pdf = rasterPdf(gray, info.width, info.height);
    return { pdfData: 'data:application/pdf;base64,' + pdf.toString('base64'), fields };
}

// ======================================================================
// 가짜 학생·보호자 이름
// ======================================================================
const SUR = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전'];
const KID = ['도윤', '서아', '하준', '지아', '시우', '하윤', '은우', '아린', '유준', '지유', '이안', '서윤', '로운', '채아', '선우', '예린', '준서', '다인', '건우', '소율', '지호', '나은', '우진', '하은', '태오', '수아', '민준', '윤슬', '주원', '가온'];
const ADULT = ['정훈', '미경', '성호', '지영', '현수', '은정', '동현', '수진', '재훈', '혜진', '상민', '보람', '영훈', '유리', '진우', '선영'];
const usedKids = new Set();
function kidName() { let n; do { n = pick(SUR) + pick(KID); } while (usedKids.has(n)); usedKids.add(n); return n; }
function parentOf(kid) { return (chance(0.55) ? kid[0] : pick(SUR)) + pick(ADULT); }
const fakePhone = () => `010-0000-${String(ri(1000, 9999))}`;

// ======================================================================
async function main() {
    fs.mkdirSync(DST, { recursive: true });
    console.log('defaults-copy/ 생성:');

    // ---------------- 명부 ----------------
    write('staff.json', STAFF);
    write('checklist-extra-staff.json', EXTRA);

    // ---------------- 단순 파일 ----------------
    write('categories.json', readBase('categories.json'));
    write('links.json', remapDeep(readBase('links.json')));
    write('settings.json', {});
    write('vibe-progress.json', []);

    // ---------------- 홈 섹션 ----------------
    write('sections.json', remapDeep(readBase('sections.json')));

    // ---------------- 부서 탭 ----------------
    const baseTabs = remapDeep(readBase('tabs.json'));
    const itemFix = {
        g11: { text: '방과후돌봄학교(새봄놀이학교) 총괄(해오름분교 포함)' },
        g12: { text: '늘봄 공유학교 운영, 지역 연계 맞춤형 프로그램 개발' },
        c5: { text: '미래교육(디지털 기반 수업) 지원' },
        g30: { text: '불시 소방점검, 배움터지킴이(학생보호인력), 교직원 비상연락망' },
    };
    baseTabs.forEach(t => {
        (t.sections || []).forEach(sec => {
            sec.items = (sec.items || []).map(it => itemFix[it.id] ? { ...it, ...itemFix[it.id] } : it);
            if (sec.id === 'cs_sj6') {
                sec.title = '급식/통학';
                sec.icon = '🍱';
                sec.items = [
                    { id: 'sj23', text: '급식 운영 및 우유 급식 안내', description: '본교 급식실에서 조리·운반', icon: '🍱', bold: true },
                    { id: 'sj24', text: '알레르기 유발 식품 표시 안내', icon: '⚠️' },
                    { id: 'sj25', text: '통학버스 노선·시간표 (2학기)', description: '등교 08:10 / 하교 14:40·16:20', icon: '🚌' },
                ];
            }
        });
    });
    const tabs = baseTabs.filter(t => t.id !== 'rental');
    const sj = tabs.find(t => t.id === 'tab_sujeong');
    if (sj) sj.title = BRANCH;
    const moreBuiltins = [
        { id: 'news', title: '학교 소식', icon: '📰', type: 'builtin' },
        { id: 'collection', title: '자료 집계', icon: '📦', type: 'builtin' },
        { id: 'pdftools', title: 'PDF 도구', icon: '🛠️', type: 'builtin' },
        { id: 'tdist', title: '교사 배포', icon: '📤', type: 'builtin' },
        { id: 'ailab', title: 'AI 실험실', icon: '🤖', type: 'builtin' },
        { id: 'winter-schedule', title: '방학근무', icon: '🏫', type: 'builtin' },
        { id: 'checklist', title: '확인대장', icon: '✅', type: 'builtin' },
        { id: 'patrol', title: '순찰일지', icon: '🌙', type: 'builtin' },
        { id: 'codocs', title: '함께 만드는 문서', icon: '📝', type: 'builtin' },
    ];
    moreBuiltins.forEach(b => { if (!tabs.find(t => t.id === b.id)) tabs.push(b); });
    // 순서: 일정·홈·부서탭·연수·소식·링크·나머지
    const orderIds = ['schedule', 'home', 'tab_gyomu', 'tab_insung', 'tab_curriculum', 'tab_sujeong', 'training', 'news', 'links', 'collection', 'pdftools', 'tdist', 'ailab', 'winter-schedule', 'checklist', 'patrol', 'codocs'];
    tabs.sort((a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id));
    tabs.forEach((t, i) => { t.order = i; });
    write('tabs.json', tabs);

    // ---------------- 연수 목록 ----------------
    const trainings = remapDeep(readBase('trainings.json'));
    const trainingDates = { t5: '2026-03-10', t8: '2026-10-21', t15: '2026-03-12', t23: '2026-10-14', t26: '2026-10-28', t27: '2026-10-07', t29: '2026-10-19', t6: '2026-10-26', t36: '2026-11-04' };
    trainings.forEach(t => {
        const iso = trainingDates[t.id];
        if (iso) { const { m, d } = parseYmd(iso); t.dateISO = iso; t.date = `${m}.${d}.(${WD[dow(iso)]})`; }
        if (t.method.includes('온라인') || t.method.includes('이수증')) t.link = 'https://www.neti.go.kr';
    });
    write('trainings.json', trainings);

    // ---------------- 연수 이수 기록 (staff 18명 기준) ----------------
    rand = mulberry32(3301);
    const INST = ['가상교육연수원', '새봄원격교육연수원', '한빛원격연수원'];
    const records = {};
    trainings.forEach(t => {
        const rate = t.id === 't1' || t.id === 't11' ? 1 : 0.35 + rand() * 0.6;
        const rec = {};
        STAFF.forEach(s => {
            if (rand() >= rate) return;
            const self = t.method.includes('자체');
            const group = t.method.includes('집합');
            const date = t.dateISO && t.dateISO <= '2026-10-31' ? t.dateISO : randWeekday('2026-03-03', '2026-10-23');
            const r = { completed: true, confirmed: true, date };
            if (self) r.institution = '학교자체연수';
            else if (group) r.institution = '새봄교육지원청';
            else { const inst = pick(INST); r.institution = inst; r.certNo = `제 ${inst}-2026-${ri(10000, 99999)} 호`; }
            if (chance(0.08)) r.confirmed = false;
            rec[s.id] = r;
        });
        if (Object.keys(rec).length) records[t.id] = rec;
    });
    write('training-records.json', records);

    // ---------------- 연수 챙김이 (training-tracker) ----------------
    rand = mulberry32(4402);
    const ttPeople = {};
    const certNo = () => `제 가상교육연수원-원격(상시)-2026-1${String(ri(0, 99999)).padStart(5, '0')} 호`;
    const importAt = kstIso(2026, 9, 21, 16, 40);
    const importBy = N('s8');
    ALL.forEach(s => {
        const isTeacher = s.no <= 18;
        const cells = {};
        const p = { name: s.name, cells };
        const r = rand();
        if (r < 0.7) {
            const c = certNo(), d = dotDate(randWeekday('2026-03-09', '2026-07-17'));
            p.integrated = { certNo: c, date: d, at: importAt };
            for (let k = 1; k <= 17; k++) cells['k' + k] = { mark: 'V', certNo: c, date: d, src: 'import', at: importAt, by: importBy };
        } else if (r < 0.88) {
            for (let k = 1; k <= 17; k++) {
                if (chance(0.55)) cells['k' + k] = { mark: '', certNo: certNo(), date: dotDate(randWeekday('2026-03-09', '2026-10-16')), src: 'import', at: importAt, by: importBy };
            }
        } // 나머지: 전입·신규 등으로 아직 기록 없음
        const indiv = (k, p0) => { if (chance(p0)) cells[k] = { mark: '', certNo: certNo(), date: dotDate(randWeekday('2026-03-09', '2026-10-16')), src: 'import', at: importAt, by: importBy }; };
        indiv('k18', isTeacher ? 0.55 : 0.3);           // 다문화
        indiv('k19', isTeacher ? 0.65 : 0.45);          // 안전
        if (chance(isTeacher ? 0.7 : 0.5)) {            // 4대 폭력예방 (한 이수증으로 4칸)
            const c = certNo(), d = dotDate(randWeekday('2026-03-09', '2026-10-16'));
            ['k20', 'k21', 'k22', 'k23'].forEach(k => { cells[k] = { mark: '', certNo: c, date: d, src: 'import', at: importAt, by: importBy }; });
        }
        if (isTeacher) indiv('k24', 0.45);              // 기초학력
        // 9월 이후 직접 등록(PDF 업로드) 몇 건 — 최근 활동처럼 보이게
        if (chance(0.15)) {
            const k = pick(['k18', 'k19', 'k24']);
            const d = randWeekday('2026-09-28', '2026-10-23');
            cells[k] = { mark: '', certNo: certNo(), date: dotDate(d), src: 'manual', at: ymdIso(d, 15, ri(0, 59)), by: s.name };
        }
        if (Object.keys(cells).length) ttPeople[s.id] = p;
    });
    write('training-tracker.json', { config: null, people: ttPeople });

    // ---------------- 학교 일정 ----------------
    // 공휴일(개천절 대체 10/5, 한글날 10/9)은 서버 공휴일 API가 달력에 표시하므로 일정으로 넣지 않는다.
    const HOLI = new Set(['2026-10-03', '2026-10-05', '2026-10-09']);
    const SCH = [
        // 9월 마지막 주
        ['2026-09-28', '교무', '2학기 학부모 상담주간 신청 안내 발송', 's4', { detail: 'e알리미 발송, 10/9(금)까지 회신', gotoTab: 'tdist' }],
        ['2026-09-29', '교감', '9월 교직원 협의회', 's2', { startTime: '15:00', endTime: '16:00', detail: '시청각실 / 10월 행사 역할 분담' }],
        ['2026-09-30', '체육', '3학년 생존수영 교육 (4회차)', 's5', { startTime: '09:30', endTime: '12:00', detail: '새봄국민체육센터 수영장, 통학버스 이용' }],
        // 10월 1주
        ['2026-10-01', '도서', '독서의 달 「책 읽는 가을」 행사 시작', 's25', { allDay: true, detail: '10/30(금)까지 · 학년별 독서 골든벨, 책갈피 만들기' }],
        ['2026-10-01', '교무', '10월 복무·청렴 서약서 확인', 's4', { detail: '확인대장에서 체크', gotoTab: 'checklist' }],
        ['2026-10-02', '보건', '2학기 학생 건강검사 (4학년)', 's12', { startTime: '09:00', endTime: '12:00', detail: '보건실 / 신체 발달 상황 측정' }],
        ['2026-10-02', '유치원', '유치원 가을 소풍 (새봄생태공원)', 's13', { startTime: '09:30', endTime: '13:00' }],
        // 10월 2주
        ['2026-10-06', '인성', '학교폭력 예방교육 (전 학년)', 's6', { startTime: '09:00', endTime: '10:40', detail: '1~2교시 학급별 / 외부 강사 연계' }],
        ['2026-10-07', '체육', '가을 운동회 예행연습', 's7', { startTime: '13:00', endTime: '14:30', detail: '운동장 / 우천 시 강당' }],
        ['2026-10-07', '돌봄', '돌봄교실 가을 간식 만들기', 's27', { startTime: '14:00', endTime: '15:30' }],
        ['2026-10-08', '안전', '소방 합동 대피훈련', 's3', { startTime: '10:00', endTime: '10:40', detail: '새봄소방서 합동 / 2교시 중 경보' }],
        ['2026-10-08', '분교', '해오름분교 가을 숲 체험', 's16', { allDay: true, detail: '해오름 숲길, 전교생 참여' }],
        // 10월 3주
        ['2026-10-12', '교무', '학부모 공개수업·상담주간 (~10/16)', 's4', { allDay: true }],
        ['2026-10-13', '학운위', '학교운영위원회 제4차 정기회의', 's1', { startTime: '16:00', endTime: '17:30', detail: '교장실 / 2027학년도 예산 편성 기본계획 심의' }],
        ['2026-10-13', '특수', '장애이해교육 (전 학년)', 's10', { startTime: '10:50', endTime: '11:30', detail: '3교시 / 영상 시청 후 학급 토의' }],
        ['2026-10-14', '교무', '학부모 공개수업 (1~3학년)', 's4', { startTime: '10:00', endTime: '11:30' }],
        ['2026-10-14', '기타', '졸업앨범 개인 촬영 (6학년)', 's8', { startTime: '13:00', endTime: '15:00', detail: '도서실' }],
        ['2026-10-15', '교무', '학부모 공개수업 (4~6학년)', 's4', { startTime: '10:00', endTime: '11:30' }],
        ['2026-10-15', '영어', '영어 말하기 한마당 (5~6학년)', 's9', { startTime: '13:30', endTime: '15:00', detail: '영어실' }],
        ['2026-10-16', '체육', '새봄 가을 운동회', 's7', { allDay: true, detail: '운동장 / 학부모 참관 가능, 점심 급식 정상 운영' }],
        // 10월 4주
        ['2026-10-19', '기초학력', '2학기 중간 평가 주간 (~10/23)', 's3', { allDay: true, detail: '학년별 교과 수행평가 결과 누가 기록' }],
        ['2026-10-19', '교감', '학생생활기록부 중간 점검 연수', 's2', { startTime: '15:00', endTime: '16:00', gotoTab: 'training' }],
        ['2026-10-20', '연구', '수업나눔의 날 (5학년 공개수업)', 's8', { startTime: '14:00', endTime: '15:30', detail: '5-1 교실 / 사후 협의회 15:40' }],
        ['2026-10-21', '교무', '현장체험학습 (1~2학년) — 어린이 과학관', 's3', { startTime: '09:00', endTime: '14:30', detail: '버스 2대, 도시락 지참' }],
        ['2026-10-21', '과학', '과학실험 안전교육 연수', 's9', { startTime: '15:00', endTime: '15:40', detail: '과학실', gotoTab: 'training' }],
        ['2026-10-22', '교무', '현장체험학습 (3~6학년) — 역사박물관', 's6', { startTime: '08:50', endTime: '15:30', detail: '버스 3대, 도시락 지참' }],
        ['2026-10-23', '영양', '영양·식생활 교육 주간 「채소 먹는 날」', 's11', { allDay: true }],
        ['2026-10-23', '늘봄', '늘봄학교 학부모 만족도 조사 마감', 's32', { detail: '온라인 설문 회신율 확인' }],
        // 10월 5주
        ['2026-10-26', '보건', '심폐소생술(CPR) 실습 연수', 's12', { startTime: '15:00', endTime: '17:00', detail: '교직원 전원 / 보건실·시청각실', gotoTab: 'training' }],
        ['2026-10-27', '나이스', '사이버보안 진단의 날', 's5', { allDay: true, detail: 'PC 보안 점검, 비밀번호 변경', link: 'https://www.neti.go.kr' }],
        ['2026-10-28', '교무', '2학기 교육과정 평가회 (1차)', 's8', { startTime: '15:00', endTime: '16:30', detail: '학년별 운영 결과 공유 / 설문 결과 검토' }],
        ['2026-10-28', '인성', '양성평등교육 (교직원 자체연수)', 's6', { startTime: '16:30', endTime: '17:00' }],
        ['2026-10-29', '인성', '학생자치회 정기회의', 's7', { startTime: '13:00', endTime: '13:40', detail: '학생회실 / 11월 캠페인 주제 선정' }],
        ['2026-10-30', '도서', '작가와의 만남 (3~4학년)', 's25', { startTime: '10:00', endTime: '11:30', detail: '도서실 / 독서의 달 마무리' }],
        // 11월 첫 주
        ['2026-11-02', '교감', '11월 교직원 협의회', 's2', { startTime: '15:00', endTime: '16:00' }],
        ['2026-11-03', '보건', '교직원 인플루엔자 예방접종 안내', 's12', { detail: '11/13까지 개별 접종 후 확인서 제출' }],
        ['2026-11-04', '인성', '도박예방교육 (5~6학년)', 's6', { startTime: '10:50', endTime: '11:30' }],
        ['2026-11-06', '교무', '2027학년도 교육과정 수요 조사 시작', 's8', { detail: '학생·학부모·교원 설문 (~11/20)' }],
    ];
    const schedules = SCH.map(([date, dept, body, mid, opts], i) => {
        if (dow(date) === 0 || dow(date) === 6) throw new Error('주말 일정: ' + date);
        if (HOLI.has(date)) throw new Error('공휴일 일정: ' + date);
        const item = { id: 'sch_' + (kst(2026, 9, 14, 10, 0) + i * 61237), date, text: `[${dept}]${body}`, manager: N(mid) };
        if (opts.allDay) item.allDay = true;
        if (opts.startTime) item.startTime = opts.startTime;
        if (opts.endTime) item.endTime = opts.endTime;
        if (opts.detail) item.detail = opts.detail;
        if (opts.link) item.link = opts.link;
        if (opts.gotoTab) item.gotoTab = opts.gotoTab;
        return item;
    });
    write('schedules.json', schedules);

    // ---------------- 학교 소식 ----------------
    const NEWS = [
        ['2026-09-28', 16, 10, '2학기 생존수영 교육 순항 중', '3학년 친구들이 새봄국민체육센터에서 생존수영 교육을 받고 있습니다. 누워뜨기와 구명조끼 착용법을 익히며 물에 대한 두려움을 조금씩 이겨내고 있어요. 남은 회차도 안전하게 마무리하겠습니다.', 's5', [['🏊', '3학년 생존수영', '#4facfe', '#00c6fb'], ['🦺', '구명조끼 착용 실습', '#43cea2', '#185a9d']]],
        ['2026-10-02', 14, 30, '독서의 달 「책 읽는 가을」 시작!', '10월 한 달 동안 학년별 독서 골든벨, 책갈피 만들기, 가족 독서 인증 이벤트가 이어집니다. 도서실 신간 코너도 새로 단장했으니 많이 이용해 주세요.', 's25', [['📚', '독서의 달 행사', '#f6d365', '#fda085']]],
        ['2026-10-08', 11, 20, '새봄소방서와 함께한 합동 대피훈련', '2교시 화재 경보에 맞춰 전교생이 4분 만에 운동장으로 대피했습니다. 소방관님께 소화기 사용법과 연기 속 대피 요령도 배웠어요.', 's3', [['🚒', '소방 합동 대피훈련', '#ff6a00', '#ee0979'], ['🧯', '소화기 사용 체험', '#f83600', '#f9d423']]],
        ['2026-10-15', 17, 5, '학부모 공개수업 주간 마무리', '공개수업과 상담에 참여해 주신 학부모님들께 감사드립니다. 설문으로 보내 주신 의견은 11월 교육과정 평가회에서 함께 검토하겠습니다.', 's4', [['👨‍👩‍👧', '학부모 공개수업', '#a18cd1', '#fbc2eb']]],
        ['2026-10-16', 16, 40, '하늘 맑은 날, 새봄 가을 운동회', '청군·백군이 박빙의 승부를 펼친 끝에 올해는 백군이 우승했습니다! 이어달리기와 줄다리기, 학부모 박 터뜨리기까지 모두가 함께 웃은 하루였습니다.', 's7', [['🏃', '가을 운동회 이어달리기', '#11998e', '#38ef7d'], ['🎉', '청백 줄다리기', '#fc466b', '#3f5efb'], ['🏅', '백군 우승!', '#f7971e', '#ffd200']]],
        ['2026-10-22', 18, 0, '3~6학년 역사박물관 현장체험학습', '교과서에서만 보던 유물을 직접 보고, 학년별 미션지를 해결하며 역사를 가깝게 느낀 하루였습니다. 안전하게 다녀올 수 있도록 도와주신 모든 선생님께 감사드립니다.', 's6', [['🏛️', '역사박물관 체험학습', '#654ea3', '#eaafc8']]],
        ['2026-10-26', 17, 30, '교직원 심폐소생술 실습 연수', '교직원 전원이 보건실과 시청각실에서 심폐소생술과 자동심장충격기(AED) 사용법을 실습했습니다. 연수 이수 기록은 연수 관리 탭에서 확인할 수 있습니다.', 's12', [['❤️', 'CPR 실습 연수', '#e53935', '#e35d5b']]],
        ['2026-10-30', 12, 10, '작가와의 만남으로 독서의 달 마무리', '동화 작가님을 모시고 3~4학년이 이야기 만들기 활동을 했습니다. 한 달 동안 전교생이 읽은 책은 모두 1,284권! 함께해 주셔서 고맙습니다.', 's25', [['✍️', '작가와의 만남', '#56ab2f', '#a8e063']]],
    ];
    let seed = 777;
    const news = NEWS.map(([d, h, mi, title, content, aid, imgs], i) => ({
        id: 'news_' + ymdMs(d, h, mi),
        title, content, author: N(aid),
        images: imgs.map(([e, cap, c1, c2]) => newsImage(e, cap, c1, c2, seed++)),
        createdAt: ymdIso(d, h, mi),
        ...(i === 4 ? { updatedAt: ymdIso('2026-10-17', 9, 12) } : {}),
    })).reverse();
    write('news.json', news);

    // ---------------- 확인대장 ----------------
    rand = mulberry32(5503);
    const CL = [
        ['2026-10-01', 8, 40, '10월 복무 및 청렴 서약서 확인', '공문 「2026 하반기 청렴 서약」 첨부 파일을 읽고 본인 칸에 체크해 주세요.', '2026-10-08', '#E3F2FD', '#90CAF9', 0.88],
        ['2026-10-06', 13, 5, '학교폭력 예방교육 교직원 자료 열람 확인', '교무기획부 공유폴더의 연수 자료(20분 분량)를 열람한 뒤 체크합니다.', '2026-10-16', '#FFF0F0', '#FFCDD2', 0.64],
        ['2026-10-12', 9, 15, '가을 운동회 업무 분장 확인', '운동회 당일 역할(경기 진행·안전·음향·급식 지원)을 확인하셨으면 체크해 주세요.', '2026-10-15', '#E8F5E9', '#A5D6A7', 0.79],
        ['2026-10-26', 10, 0, '2학기 개인정보보호 자체점검 체크리스트', 'PC 내 개인정보 파일 정리, 화면보호기 설정, 공유폴더 권한을 점검한 뒤 체크합니다.', '2026-10-30', '#FFF3E0', '#FFB74D', 0.27],
    ];
    const checklistPosts = CL.map(([d, h, mi, title, description, deadline, color, borderColor, rate]) => {
        const created = ymdMs(d, h, mi);
        const endMs = Math.min(ymdMs(deadline, 17, 0), ymdMs('2026-10-30', 17, 0));
        const entries = ALL.map(s => {
            const checked = rand() < rate;
            const checkedAt = checked ? created + Math.floor(rand() * (endMs - created) * 0.8) + 10 * 60 * 1000 : null;
            return { staffId: s.id, name: s.name, position: s.position, checked, checkedAt };
        });
        return { id: 'cl_' + created, title, description, deadline, color, borderColor, createdAt: created, entries };
    });
    write('checklist-posts.json', checklistPosts);

    // ---------------- 전자서명 ----------------
    rand = mulberry32(6604);
    let sigSeed = 9001;
    const fid = (ts, i) => `f_${ts + i * 7}_${short3()}`;
    async function esignDoc({ created, title, manager, deadline, description, fields, status, subs }) {
        const ts = ymdMs(created, 10, 0);
        const fs2 = fields.map((f, i) => ({ id: fid(ts, i), ...f }));
        const submissions = [];
        for (let i = 0; i < subs.count; i++) {
            const kid = kidName(), parent = parentOf(kid);
            const values = {};
            for (const f of fs2) {
                if (f.type === 'label' || f.type === 'file') continue;
                values[f.id] = await subs.value(f, { kid, parent, i });
            }
            const at = ymdMs(subs.from, 8, 0) + Math.floor(rand() * (ymdMs(subs.to, 22, 0) - ymdMs(subs.from, 8, 0)));
            submissions.push({ id: `sub_${at}_${short4()}`, values, submittedAt: new Date(at).toISOString() });
        }
        submissions.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
        return { id: 'esign_' + ts, token: token(), title, manager, deadline, description, fields: fs2, status, submissions, createdAt: ts };
    }
    const esignValue = async (f, ctx) => {
        switch (f.type) {
            case 'text':
                if (/학생/.test(f.label)) return ctx.kid;
                if (/보호자|성명/.test(f.label)) return ctx.parent;
                if (/연락처/.test(f.label)) return fakePhone();
                if (/특이|알레르기|건강/.test(f.label)) return pick(['없음', '없음', '없음', '땅콩 알레르기', '멀미가 있어 앞자리 희망', '천식(흡입기 지참)']);
                return '';
            case 'select': return pick(f.options.split(',').map(x => x.trim()));
            case 'checkbox': return chance(0.95);
            case 'date': return f._date || '2026-10-01';
            case 'signature': return await signaturePng(sigSeed++);
            default: return '';
        }
    };
    const esignDocs = [];
    esignDocs.push(await esignDoc({
        created: '2026-10-05', title: '가을 현장체험학습 참가 동의서', manager: N('s6'), deadline: '2026-10-14', status: 'open',
        description: '10월 21일(1~2학년)·22일(3~6학년) 현장체험학습 참가 동의서입니다. 학생 1명당 1회 제출해 주세요.',
        fields: [
            { type: 'label', label: '안내 텍스트', content: '■ 일시: 2026. 10. 21.(수) 1~2학년 / 10. 22.(목) 3~6학년\n■ 장소: 어린이 과학관(1~2학년), 역사박물관(3~6학년)\n■ 준비물: 도시락, 물, 편한 운동화' },
            { type: 'text', label: '학생 이름', placeholder: '예: 김새봄' },
            { type: 'select', label: '학년', options: '1학년,2학년,3학년,4학년,5학년,6학년' },
            { type: 'text', label: '건강상 특이사항', placeholder: '알레르기, 멀미 등 (없으면 "없음")' },
            { type: 'text', label: '보호자 연락처', placeholder: '010-0000-0000' },
            { type: 'checkbox', label: '동의', checkLabel: '위 현장체험학습에 자녀의 참가를 동의합니다.' },
            { type: 'signature', label: '보호자 서명' },
        ],
        subs: { count: 14, from: '2026-10-05', to: '2026-10-12', value: esignValue },
    }));
    esignDocs.push(await esignDoc({
        created: '2026-10-13', title: '졸업앨범 제작 개인정보 수집·이용 동의서', manager: N('s8'), deadline: '2026-10-23', status: 'open',
        description: '6학년 졸업앨범 제작을 위한 사진·성명 수집 및 이용 동의서입니다.',
        fields: [
            { type: 'label', label: '안내 텍스트', content: '수집 항목: 학생 성명, 사진\n이용 목적: 졸업앨범 제작 및 배부\n보유 기간: 앨범 제작 완료 후 즉시 파기(원본 파일)' },
            { type: 'text', label: '학생 이름', placeholder: '' },
            { type: 'select', label: '반', options: '6-1,6-해오름' },
            { type: 'checkbox', label: '수집·이용 동의', checkLabel: '개인정보 수집·이용에 동의합니다.' },
            { type: 'date', label: '작성일' },
            { type: 'signature', label: '보호자 서명' },
        ],
        subs: { count: 6, from: '2026-10-13', to: '2026-10-20', value: async (f, c) => f.type === 'date' ? '2026-10-' + String(13 + (c.i % 7)).padStart(2, '0') : esignValue(f, c) },
    }));
    esignDocs.push(await esignDoc({
        created: '2026-09-07', title: '2학기 생존수영 교육 참가 확인서', manager: N('s5'), deadline: '2026-09-18', status: 'closed',
        description: '3학년 생존수영 교육(9월~10월, 4회) 참가 확인서입니다.',
        fields: [
            { type: 'text', label: '학생 이름', placeholder: '' },
            { type: 'select', label: '수영 경험', options: '처음,조금 할 수 있음,자유롭게 가능' },
            { type: 'text', label: '보호자 연락처', placeholder: '010-0000-0000' },
            { type: 'checkbox', label: '동의', checkLabel: '안전 수칙을 확인했으며 참가에 동의합니다.' },
            { type: 'signature', label: '보호자 서명' },
        ],
        subs: { count: 11, from: '2026-09-07', to: '2026-09-17', value: esignValue },
    }));
    write('esign-docs.json', esignDocs);

    // ---------------- 교사 배포 (PDF + 입력칸) ----------------
    rand = mulberry32(7705);
    async function tdistDoc({ created, title, manager, password, deadline, description, pdfName, spec, status, subs }) {
        const ts = ymdMs(created, 11, 0);
        const { pdfData, fields } = await buildFormPdf(spec, ts);
        const submissions = [];
        for (let i = 0; i < subs.count; i++) {
            const kid = kidName(), parent = parentOf(kid);
            const values = {};
            for (const f of fields) values[f.id] = await subs.value(f, { kid, parent, i });
            const at = ymdMs(subs.from, 8, 0) + Math.floor(rand() * (ymdMs(subs.to, 22, 0) - ymdMs(subs.from, 8, 0)));
            submissions.push({ id: `sub_${at}_${short4()}`, values, submittedAt: new Date(at).toISOString() });
        }
        submissions.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
        return { id: 'tdist_' + ts, token: token(), title, manager, password, deadline, description, pdfData, pdfPages: [1], pdfName, fields, status, submissions, createdAt: ts };
    }
    const tdValue = async (f, c) => {
        if (f.type === 'signature') return await signaturePng(sigSeed++);
        if (f.type === 'select') return pick(f.options.split(',').map(x => x.trim()));
        if (f.type === 'checkbox') return true;
        if (f.type === 'date') return '2026-10-' + String(ri(12, 16)).padStart(2, '0');
        if (f.label === '학생 이름') return c.kid;
        if (f.label === '보호자 성명') return c.parent;
        if (f.label === '학년/반') return pick(['1-1', '2-1', '3-1', '4-1', '5-1', '6-1']);
        if (f.label === '연락처') return fakePhone();
        if (f.label === '상담 희망 내용') return pick(['교우 관계', '학습 습관과 숙제', '2학기 생활 태도', '진로·특기 적성', '독서 지도 방법', '스마트폰 사용 습관']);
        if (f.label === '가능 시간') return pick(['오전 9~11시', '오후 1~3시', '종일 가능']);
        if (f.label === '건의 사항') return pick(['없음', '프로그램 종류가 더 다양했으면 좋겠습니다.', '만족합니다.', '하교 시간이 조금 늦어졌으면 합니다.']);
        return '';
    };
    const tdistDocs = [];
    tdistDocs.push(await tdistDoc({
        created: '2026-09-28', title: '2학기 학부모 상담 신청서', manager: N('s4'), password: '1234', deadline: '2026-10-09', status: 'open',
        description: '10월 12일~16일 학부모 상담주간 신청서입니다. 희망 날짜와 방법을 적어 제출해 주세요.', pdfName: '2학기_학부모상담_신청서.pdf',
        spec: {
            docNo: '제2026-87호', title: '2학기 학부모 상담 신청서',
            paras: ['학부모님, 안녕하십니까?', '가을이 깊어 가는 요즘, 가정에 건강과 행복이 가득하시기를 바랍니다.', '우리 학교에서는 자녀의 학교생활에 대해 담임교사와 이야기를 나누는', '「2학기 학부모 상담주간」을 아래와 같이 운영합니다.', '희망하시는 날짜와 방법을 적어 10월 9일(금)까지 제출해 주시기 바랍니다.', '', '■ 기간: 2026. 10. 12.(월) ~ 10. 16.(금) 14:30 ~ 17:00'],
            rows: [
                { label: '학생 이름', type: 'text', w: 30 },
                { label: '학년/반', type: 'text', w: 20, placeholder: '예: 3-1' },
                { label: '희망 날짜', type: 'date', w: 25 },
                { label: '상담 방법', type: 'select', w: 25, options: '대면,전화,화상' },
                { label: '상담 희망 내용', type: 'text', h: 9, w: 58 },
            ],
            after: ['※ 상담 시간은 신청 순서에 따라 담임교사가 개별 안내드립니다.'],
        },
        subs: { count: 9, from: '2026-09-28', to: '2026-10-08', value: tdValue },
    }));
    tdistDocs.push(await tdistDoc({
        created: '2026-10-02', title: '가을 운동회 학부모 자원봉사 신청서', manager: N('s7'), password: '1016', deadline: '2026-10-12', status: 'open',
        description: '10월 16일 가을 운동회 진행을 도와주실 학부모 자원봉사자를 모집합니다.', pdfName: '가을운동회_자원봉사_신청서.pdf',
        spec: {
            docNo: '제2026-91호', title: '가을 운동회 학부모 자원봉사 신청',
            paras: ['학부모님, 안녕하십니까?', '10월 16일(금) 「새봄 가을 운동회」의 안전하고 즐거운 진행을 위해', '함께해 주실 학부모 자원봉사자를 모집합니다.', '참여를 원하시는 분은 아래 내용을 작성해 주시기 바랍니다.', '', '■ 활동: 경기 진행 보조, 안전 지도, 물 나눔, 정리 정돈'],
            rows: [
                { label: '학생 이름', type: 'text', w: 30 },
                { label: '학년/반', type: 'text', w: 20 },
                { label: '희망 활동', type: 'select', w: 30, options: '경기 진행 보조,안전 지도,물 나눔,정리 정돈' },
                { label: '가능 시간', type: 'text', w: 30 },
                { label: '연락처', type: 'text', w: 30 },
                { label: '개인정보 동의', type: 'checkbox', w: 45, checkLabel: '연락을 위한 개인정보 수집에 동의' },
            ],
        },
        subs: { count: 5, from: '2026-10-02', to: '2026-10-09', value: tdValue },
    }));
    tdistDocs.push(await tdistDoc({
        created: '2026-07-01', title: '1학기 방과후학교 만족도 조사', manager: N('s32'), password: '0710', deadline: '2026-07-10', status: 'closed',
        description: '1학기 방과후학교·늘봄 프로그램 만족도 조사입니다.', pdfName: '1학기_방과후_만족도조사.pdf',
        spec: {
            docNo: '제2026-55호', title: '1학기 방과후학교 만족도 조사',
            paras: ['학부모님, 안녕하십니까?', '1학기 방과후학교 및 늘봄 프로그램에 관심과 협조를 보내 주셔서 감사합니다.', '더 나은 2학기 프로그램 운영을 위해 만족도 조사를 실시하오니', '솔직한 의견을 적어 주시기 바랍니다.'],
            rows: [
                { label: '학생 이름', type: 'text', w: 30 },
                { label: '학년/반', type: 'text', w: 20 },
                { label: '참여 프로그램', type: 'select', w: 30, options: '로봇 코딩,창의 미술,방송 댄스,바둑,음악 줄넘기' },
                { label: '전반적 만족도', type: 'select', w: 30, options: '매우 만족,만족,보통,불만족' },
                { label: '건의 사항', type: 'text', h: 9, w: 58 },
            ],
        },
        subs: { count: 12, from: '2026-07-01', to: '2026-07-10', value: tdValue },
    }));
    write('tdist-docs.json', tdistDocs);

    // ---------------- 자료 집계 ----------------
    rand = mulberry32(8806);
    const colSub = (sid, fileName, date, memo) => ({ submitter: N(sid), fileName, fileSize: `${ri(38, 920)}.${ri(0, 9)}KB`, downloadUrl: '', memo: memo || '', date });
    const collections = [
        {
            id: 'col_' + ymdMs('2026-10-05', 9, 20), name: '2학기 학부모 공개수업 지도안 제출', manager: N('s4'),
            startDate: '2026-10-05', endDate: '2026-10-13', target: '담임교사', description: '공개수업(10/14~15) 약안 1쪽을 한글(hwpx) 파일로 제출해 주세요. 파일명: 학년반_교과_성명',
            password: '1234', status: 'open', createdAt: ymdMs('2026-10-05', 9, 20),
            submissions: [
                colSub('s3', '1-1_국어_김하늘.hwpx', '2026-10-06'),
                colSub('s5', '3-1_과학_박지우.hwpx', '2026-10-07', '실험 준비물 목록 포함'),
                colSub('s6', '4-1_사회_최윤서.hwpx', '2026-10-07'),
                colSub('s8', '6-1_수학_강수아.hwpx', '2026-10-08'),
                colSub('s14', '1-해오름_통합_송다은.hwpx', '2026-10-08'),
                colSub('s7', '5-1_체육_정민재.hwpx', '2026-10-12', '우천 시 강당 수업안'),
            ],
        },
        {
            id: 'col_' + ymdMs('2026-10-06', 14, 0), name: '학교폭력 예방교육 결과 보고 (학급별)', manager: N('s6'),
            startDate: '2026-10-06', endDate: '2026-10-23', target: '담임교사', description: '10/6 예방교육 후 학급별 활동지 사진 2장 이상과 결과 보고서를 올려 주세요.',
            password: '2580', status: 'open', createdAt: ymdMs('2026-10-06', 14, 0),
            submissions: [
                colSub('s4', '2-1_학폭예방_활동사진.jpg', '2026-10-06'),
                colSub('s4', '2-1_학폭예방_결과보고.hwpx', '2026-10-06'),
                colSub('s3', '1-1_결과보고.hwpx', '2026-10-07'),
                colSub('s15', '해오름3,4_학폭예방_결과.pdf', '2026-10-08'),
                colSub('s16', '해오름6_결과보고.hwpx', '2026-10-13'),
            ],
        },
        {
            id: 'col_' + ymdMs('2026-09-01', 10, 0), name: '1학기 학생 상담 기록 제출', manager: N('s8'),
            startDate: '2026-09-01', endDate: '2026-09-19', target: '전 교원', description: '1학기 상담 기록(나이스 출력본)을 PDF로 제출합니다. 개인정보가 포함되므로 비밀번호 설정 후 제출.',
            password: '0919', status: 'closed', createdAt: ymdMs('2026-09-01', 10, 0),
            submissions: ['s3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's13', 's14', 's15', 's16', 's18'].map((sid, i) =>
                colSub(sid, `1학기_상담기록_${BY_ID[sid].position.replace(/,/g, '')}_${N(sid)}.pdf`, addDays('2026-09-02', Math.min(16, i + ri(0, 3))))),
        },
    ];
    write('collections.json', collections);

    // ---------------- 순찰일지 (지난 여름방학, 기록 완료) ----------------
    rand = mulberry32(9907);
    const plRotation = ['s16', 's3', 's6', 's5', 's8', 's14'];
    const plCfg = {
        startDate: '2026-07-27', endDate: '2026-08-21', weekdays: [2, 5], times: ['8:50', '12:50', '15:00'],
        route: '1층→2층→3층→체육관→급식실 및 강당', focus: '학생 안전, 문단속, 냉·난방기 점검',
        checkItems: [
            '교무실 포함 모든 교실 내부 상태', '모든 교실(강사대기실 포함) 잠금 상태', '유리창 잠금 상태', '운동장 배수로 상태',
            '텃밭 옆 창고 잠김 상태', '온실 주변 한 바퀴 돌고 잠김 상태', '(겨울) 화장실·급식실·교무실 세면대 물 틀어 수돗물 내려 동파 여부 확인',
        ],
        notice: `※ 필요시 ${SCHOOL_SHORT} 행정실로 연락(☎ 000-0000-0000, 시연용)`,
        rotation: plRotation.map(N), skipHolidays: true,
        holidays: [{ date: '2026-08-15', name: '광복절' }, { date: '2026-08-17', name: '광복절 대체공휴일' }],
        setAt: kstIso(2026, 7, 20, 11, 10),
    };
    const ISSUES = ['3층 과학실 창문 1개 열려 있어 잠금 조치', '운동장 배수로 낙엽 쌓임 — 행정실 전달', '2층 복도 에어컨 켜져 있어 끔', '체육관 뒷문 잠금 불량, 주무관님께 수리 요청', '급식실 앞 빗물 고임'];
    const plDays = {};
    let rot = 0;
    dateRange(plCfg.startDate, plCfg.endDate).forEach(iso => {
        if (!plCfg.weekdays.includes(dow(iso))) return;
        if (plCfg.holidays.some(h => h.date === iso)) return;
        const sid = plRotation[rot++ % plRotation.length];
        const rounds = {};
        plCfg.times.forEach((t, r) => {
            const [hh, mm] = t.split(':').map(Number);
            const issue = chance(0.12);
            rounds[r] = { status: issue ? 'issue' : 'ok', memo: issue ? pick(ISSUES) : (chance(0.1) ? '이상 없음' : ''), at: ymdIso(iso, hh, mm + ri(5, 25)) };
        });
        plDays[iso] = { date: iso, name: N(sid), staffId: sid, rounds };
    });
    write('patrol-log.json', { config: plCfg, days: plDays });

    // ---------------- 겨울방학 근무 (2026-27 겨울방학, 일부 입력) ----------------
    rand = mulberry32(1108);
    const wsCfg = {
        startDate: '2027-01-04', endDate: '2027-02-12',
        holidays: [
            { date: '2027-01-01', name: '신정' },
            { date: '2027-02-06', name: '설날 연휴' }, { date: '2027-02-07', name: '설날' },
            { date: '2027-02-08', name: '설날 연휴' }, { date: '2027-02-09', name: '설날 대체공휴일' },
        ],
        setAt: kstIso(2026, 10, 20, 15, 30),
    };
    const wsHol = new Set(wsCfg.holidays.map(h => h.date));
    const wsWorkdays = dateRange(wsCfg.startDate, wsCfg.endDate).filter(d => dow(d) !== 0 && dow(d) !== 6 && !wsHol.has(d));
    const wsEntries = {};
    const wsFillers = [
        ['s2', 1.0, 'admin'], ['s3', 1.0, 'teacher'], ['s4', 0.6, 'teacher'], ['s6', 1.0, 'teacher'],
        ['s8', 0.35, 'teacher'], ['s11', 1.0, 'teacher'], ['s12', 0.5, 'teacher'], ['s16', 0.8, 'teacher'],
    ];
    wsFillers.forEach(([sid, portion, kind]) => {
        const days = {};
        const upto = Math.round(wsWorkdays.length * portion);
        const workSet = new Set(shuffle(wsWorkdays).slice(0, kind === 'admin' ? 18 : ri(3, 6)));
        wsWorkdays.slice(0, upto).forEach((d, i) => {
            let v = '41조연수';
            if (workSet.has(d)) v = '근무';
            if (i >= 3 && i <= 4 && chance(0.5)) v = '연가';
            if (kind === 'teacher' && chance(0.06)) v = '출장연수';
            if (kind === 'teacher' && chance(0.05)) v = '오전근무/오후41조';
            if (kind === 'admin' && chance(0.08)) v = '출장';
            days[d] = v;
        });
        const s = BY_ID[sid];
        wsEntries[sid] = { staffId: sid, name: s.name, school: SCHOOL, position: s.position, days, updatedAt: kstIso(2026, 10, ri(21, 30), ri(9, 17), ri(0, 59)) };
    });
    write('winter-schedule.json', { config: wsCfg, entries: wsEntries });

    console.log('완료.');
}

main().catch(e => { console.error(e); process.exit(1); });
