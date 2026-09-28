// 시연용 카피본(/copy) — 자동화 프로그램(채용 관리·교구 대여소·공유 캘린더) 가상 데이터 생성
//
// 실제 API를 그대로 호출해서 만든다(형식이 어긋날 일이 없도록). 로컬 서버를 Redis 없이 띄운 상태에서 실행:
//   PORT=3138 node server.js            (UPSTASH_* 환경변수 없이 — 카피본 데이터는 data-copy/ 에 쌓인다)
//   node scripts/build-copy-apps-seed.js http://localhost:3138
// 결과: defaults-copy/recruitment-samples.json, rental-*.json, calandar-demo.json
// 먼저 카피본을 초기화하므로 data-copy/ 의 기존 카피본 데이터는 사라진다(실데이터 data/ 는 건드리지 않음).
'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BASE = (process.argv[2] || 'http://localhost:3138').replace(/\/$/, '');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'defaults-copy');
const DATA = path.join(ROOT, 'data-copy');

let seed = 20261013;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

async function call(method, url, body, headers = {}) {
    const res = await fetch(BASE + '/api/copy' + url, { method, headers: { 'Content-Type': 'application/json', ...(headers['X-Recruitment-Token'] ? {} : { 'X-Auth-Token': 'copy-demo' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch (e) { json = text; }
    if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${typeof json === 'string' ? json.slice(0, 200) : JSON.stringify(json).slice(0, 300)}`);
    return json;
}

// 손글씨 느낌의 서명 PNG (이름을 기울여 그림)
async function signature(name) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="120"><rect width="100%" height="100%" fill="#fff"/>`
        + `<text x="30" y="80" font-family="Malgun Gothic, 'Nanum Pen Script', sans-serif" font-size="54" font-style="italic" fill="#1b2a6b" transform="rotate(-4 180 60)">${name}</text>`
        + `<path d="M24 96 C 120 84, 220 104, 330 88" stroke="#1b2a6b" stroke-width="3" fill="none"/></svg>`;
    return 'data:image/png;base64,' + (await sharp(Buffer.from(svg)).png().toBuffer()).toString('base64');
}

// ---------- 채용 관리 ----------
async function recruitment(spec) {
    let r = await call('POST', '/recruitments', spec.payload);
    const tokens = {};
    for (const v of r.reviewers) {
        const inv = await call('POST', `/recruitments/${r.id}/invites/${v.id}`, { version: r.version });
        r = inv.recruitment; tokens[v.id] = inv.invitationPath.split('invite=')[1];
    }
    r = await call('POST', `/recruitments/${r.id}/provision`, { version: r.version });
    const asReviewer = id => ({ 'X-Recruitment-Token': tokens[id] });
    const docAvg = {};
    const scoreRows = (stage, candidateIds, absent = []) => candidateIds.map(cid => {
        const off = absent.includes(cid);
        const scores = Object.fromEntries(r.rubrics[stage].map(it => [it.id, off ? 0 : Math.max(1, Math.round(it.max * (0.55 + rnd() * 0.43)))]));
        const bonus = stage === 'document' && r.rules.allowBonus && !off && rnd() < 0.3 ? (rnd() < 0.5 ? 2.5 : 5) : 0;
        return { candidateId: cid, attendance: off ? 'absent' : 'present', scores, bonus, note: off ? '면접 당일 불참(사전 연락 없음)' : bonus ? '관련 자격증 사본 확인' : '' };
    });
    const allIds = r.candidates.map(c => c.id);
    for (const [idx, v] of r.reviewers.entries()) {
        if (spec.stopAfterDocument && idx >= spec.documentSubmitters) break;
        r = await call('POST', `/recruitments/${r.id}/pledge`, { version: r.version, image: await signature(v.name) }, asReviewer(v.id));
        r = await call('POST', `/recruitments/${r.id}/evaluations/document/save`, { version: r.version, rows: scoreRows('document', allIds) }, asReviewer(v.id));
        r = await call('POST', `/recruitments/${r.id}/evaluations/document/submit`, { version: r.version }, asReviewer(v.id));
    }
    if (spec.stopAfterDocument) return r.id;
    r = await call('GET', `/recruitments/${r.id}`);
    const ranked = [...r.documentResults].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    const shortlist = ranked.slice(0, spec.shortlist).map(c => c.candidateId);
    r = await call('POST', `/recruitments/${r.id}/shortlist`, { version: r.version, candidateIds: shortlist, reason: spec.reason });
    const absent = [shortlist[shortlist.length - 1]]; // 마지막 면접대상자는 불참 처리(전 위원 동일)
    for (const v of r.reviewers) {
        r = await call('POST', `/recruitments/${r.id}/evaluations/interview/save`, { version: r.version, rows: scoreRows('interview', shortlist, absent) }, asReviewer(v.id));
        r = await call('POST', `/recruitments/${r.id}/evaluations/interview/submit`, { version: r.version }, asReviewer(v.id));
    }
    r = await call('POST', `/recruitments/${r.id}/finalize`, { version: r.version });
    void docAvg;
    return r.id;
}

// ---------- 교구 대여소 ----------
const SCHOOLS = ['새봄초등학교', '해오름초등학교', '푸른숲초등학교', '바다빛초등학교'];
const PEOPLE = {
    '새봄초등학교': [['김하늘', '교사'], ['이미영', '교감']],
    '해오름초등학교': [['오태윤', '교사'], ['서지안', '교육실무사']],
    '푸른숲초등학교': [['한도윤', '교사'], ['백서아', '늘봄·돌봄']],
    '바다빛초등학교': [['유시우', '교사'], ['남궁민', '행정실']]
};
const actor = (school, i = 0) => ({ school, name: PEOPLE[school][i][0], role: PEOPLE[school][i][1] });
const ITEMS = [
    ['VR 헤드셋(학생용)', '정보', '🥽', 12, '새봄초등학교', '과학실 2층', '충전 케이블 포함. 1회 최대 7일', 7, false],
    ['3D 프린터(소형)', '정보', '🖨️', 1, '새봄초등학교', '컴퓨터실', '필라멘트는 빌리는 학교에서 준비', 14, false],
    ['티볼 세트', '체육', '⚾', 3, '해오름초등학교', '체육창고', '배트 4, 공 10, 티 2', 14, true],
    ['뉴스포츠 플라잉디스크', '체육', '🥏', 30, '해오름초등학교', '체육창고', '', 14, true],
    ['현미경(광학)', '과학', '🔬', 15, '푸른숲초등학교', '과학실', '렌즈 닦는 천 동봉', 10, false],
    ['천체망원경', '과학', '🔭', 2, '푸른숲초등학교', '과학준비실', '야간 관측 행사용', 5, false],
    ['젬베 북', '음악', '🥁', 20, '바다빛초등학교', '음악실', '', 14, true],
    ['무선 마이크 세트', '행사', '🎤', 4, '바다빛초등학교', '방송실', '수신기 1 + 마이크 2', 3, false],
    ['빔프로젝터(휴대용)', '시청각', '📽️', 2, '새봄초등학교', '교무실', '스크린 별도', 7, false],
    ['코딩 로봇(보드형)', '정보', '🤖', 16, '푸른숲초등학교', '컴퓨터실', '태블릿 앱 필요', 14, false]
];
async function rental() {
    for (const s of SCHOOLS) await call('POST', '/rental/schools', { name: s });
    const items = [];
    for (const [name, category, emoji, total, school, place, note, maxDays, autoApprove] of ITEMS) {
        const res = await call('POST', '/rental/items', { name, category, emoji, total, owner: actor(school, 0), place, note, maxDays, autoApprove, ownerContact: '내선 000' });
        items.push(res.items[res.items.length - 1]);
    }
    const item = n => items.find(i => i.name.startsWith(n));
    const loan = async (itemName, school, qty, from, to, memo, i = 0) =>
        (await call('POST', '/rental/loans', { itemId: item(itemName).id, qty, borrower: actor(school, i), contact: '010-0000-0000', wantFrom: from, wantTo: to, method: '방문', memo })).loan;
    const act = (l, action, school, i = 0) => call('POST', `/rental/loans/${l.id}/${action}`, { actor: actor(school, i) });

    // 반납까지 끝난 건
    const a = await loan('VR 헤드셋', '해오름초등학교', 10, '2026-10-05', '2026-10-08', '5학년 진로 체험');
    await act(a, 'approve', '새봄초등학교'); await act(a, 'pickup', '해오름초등학교'); await act(a, 'return-request', '해오름초등학교'); await act(a, 'return-confirm', '새봄초등학교');
    // 대여 중
    const b = await loan('티볼 세트', '새봄초등학교', 2, '2026-10-12', '2026-10-23', '가을 체육대회 연습');
    await act(b, 'pickup', '새봄초등학교');
    const c = await loan('현미경', '바다빛초등학교', 10, '2026-10-13', '2026-10-20', '6학년 과학 세포 관찰', 0);
    await act(c, 'approve', '푸른숲초등학교'); await act(c, 'pickup', '바다빛초등학교');
    // 반납 신청 중
    const d = await loan('젬베 북', '푸른숲초등학교', 12, '2026-10-06', '2026-10-16', '학예회 준비', 1);
    await act(d, 'pickup', '푸른숲초등학교', 1); await act(d, 'return-request', '푸른숲초등학교', 1);
    // 승인 대기 · 대기열
    await loan('천체망원경', '새봄초등학교', 2, '2026-10-23', '2026-10-24', '가족 별보기 행사', 1);
    await loan('천체망원경', '해오름초등학교', 1, '2026-10-24', '2026-10-27', '과학의 달 행사');
    await loan('3D 프린터', '바다빛초등학교', 1, '2026-10-19', '2026-10-30', '동아리 작품 출력');
    // 승인됨(수령 전)
    const e = await loan('무선 마이크', '새봄초등학교', 2, '2026-10-29', '2026-10-30', '학부모 공개수업 방송', 1);
    await act(e, 'approve', '바다빛초등학교');
    // 반려된 건
    const f = await loan('빔프로젝터', '푸른숲초등학교', 2, '2026-10-26', '2026-10-31', '학부모 설명회');
    await call('POST', `/rental/loans/${f.id}/reject`, { actor: actor('새봄초등학교'), reason: '같은 기간 교내 행사로 사용 예정' });
}

// ---------- 공유 캘린더 ----------
async function calendar() {
    const room = { 'X-Room-Code': '1111' };
    const events = [
        ['2026-10-02', '원격연수 신청 마감', '김하늘'], ['2026-10-07', '학년 협의회 15:00', '이서준'],
        ['2026-10-08', '연수: 생성형 AI 수업 설계', '정민재'], ['2026-10-12', '1차 교과 협의', '박지우'],
        ['2026-10-14', '연수: 에듀테크 실습', '최윤서'], ['2026-10-14', '교구 대여 반납일', '강수아'],
        ['2026-10-16', '공개수업 사전 협의', '조현우'], ['2026-10-19', '연수 결과 보고서 제출', '윤채원'],
        ['2026-10-21', '연수: 학생 상담 사례', '한지민'], ['2026-10-23', '가을 체육대회', '문예린'],
        ['2026-10-26', '수업 나눔의 날', '송다은'], ['2026-10-28', '연수: 디지털 시민교육', '임소연'],
        ['2026-10-30', '월말 정리 · 다음 달 일정 공유', '이미영'], ['2026-11-04', '연수: 수업 평가 루브릭', '서가은']
    ];
    for (const [day, title, author] of events) await call('POST', '/calandar', { day, title, author, owner: 'seed-' + author }, room);
}

(async () => {
    await call('POST', '/copy-reset');
    // 교구 대여소 기본 설정(분류·직위 목록)은 실서비스 설정을 그대로 가져오되 제목만 가상 지역명으로
    const settings = JSON.parse(fs.readFileSync(path.join(ROOT, 'defaults', 'rental-settings.json'), 'utf-8'));
    settings.title = '새봄 지역 소규모 학교 교구 대여소';
    settings.notice = '시연용 가상 데이터입니다. 마음껏 신청·승인·반납해 보세요.';
    fs.mkdirSync(DATA, { recursive: true });
    fs.writeFileSync(path.join(DATA, 'rental-settings.json'), JSON.stringify(settings, null, 2));

    const finalized = await recruitment({
        payload: {
            school: '새봄초등학교', title: '2026학년도 2학기 늘봄학교 프로그램 강사 채용', field: '늘봄 프로그램 강사(체육)',
            documentDate: '2026-10-13', interviewDate: '2026-10-16', rankingBasis: 'combined', shortlistLimit: 4, allowBonus: true,
            candidates: ['김나래', '박도현', '이수빈', '최하준', '정예린', '강민호', '조서윤', '윤재원', '장하율', '임지호', '한서준', '오세은'].map((name, i) => ({ code: '2026-' + String(i + 1).padStart(3, '0'), name })),
            reviewers: [['이미영', '교감'], ['정민재', '교무부장'], ['신재혁', '행정실장']].map(([name, position]) => ({ name, position, email: 'reviewer-' + name.charCodeAt(0).toString(16) + name.charCodeAt(1).toString(16) + '@example.com', stages: ['document', 'interview'] }))
        },
        shortlist: 4, reason: '서류 상위 4명 선정(면접대상 최대 4명).'
    });
    const inProgress = await recruitment({
        payload: {
            school: '새봄초등학교', title: '2026학년도 방과후학교 코딩 강사 채용', field: '방과후 강사(코딩)',
            documentDate: '2026-10-27', interviewDate: '2026-10-30', rankingBasis: 'interview', shortlistLimit: 3, allowBonus: false,
            candidates: ['문지우', '배서연', '신우진', '홍채아', '구도윤', '표하린'].map((name, i) => ({ code: '2026-1' + String(i + 1).padStart(2, '0'), name })),
            reviewers: [['조현우', '교과전담'], ['강수아', '정보부장']].map(([name, position]) => ({ name, position, email: 'reviewer-' + name.charCodeAt(0).toString(16) + name.charCodeAt(1).toString(16) + '@example.com', stages: ['document', 'interview'] }))
        },
        stopAfterDocument: true, documentSubmitters: 1
    });
    await rental();
    await calendar();

    // 결과를 defaults-copy/ 로 옮긴다
    const samples = [finalized, inProgress].map(id => {
        const r = JSON.parse(fs.readFileSync(path.join(DATA, 'recruitment', id + '.json'), 'utf-8'));
        // 초대 링크 흔적은 싣지 않는다(시연자가 새로 발급)
        for (const v of r.reviewers) { delete v.inviteHash; delete v.inviteExpiresAt; }
        return r;
    });
    fs.writeFileSync(path.join(OUT, 'recruitment-samples.json'), JSON.stringify(samples, null, 2));
    for (const f of ['rental-items.json', 'rental-loans.json', 'rental-schools.json', 'rental-settings.json', 'rental-audit.json', 'calandar-demo.json']) {
        fs.copyFileSync(path.join(DATA, f), path.join(OUT, f));
    }
    console.log('완료: 채용 2건, 교구', ITEMS.length, '종, 캘린더 일정 14건 →', OUT);
})().catch(e => { console.error(e.message); process.exit(1); });
