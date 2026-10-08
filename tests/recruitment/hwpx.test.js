'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');
const d = require('../../lib/recruitment/domain');
const { provision } = require('../../lib/recruitment/providers/mock');
const { buildHwpx } = require('../../lib/recruitment/hwpx');
const { input, submitAll, signatureFor } = require('./domain.test');

// 스냅샷 안에 XSS·수식 페이로드를 심어 두고 문서에서 escape 됐는지 본다.
function finalized() {
    const r = provision(d.createRecruitment(input({
        school: '테스트학교 <script>alert(1)</script>',
        candidates: [{ code: '001', name: '=1+1 & <b>홍길동</b>' }, { code: '002', name: '두번째' }],
        allowBonus: true
    })));
    // 위원마다 다른 바이트를 써야 '남의 서명이 새는지'와 중복 제거를 함께 확인할 수 있다.
    r.reviewers.forEach((v, i) => d.signPledge(r, v.id, signatureFor(i + 30)));
    submitAll(r, 'document');
    d.selectShortlist(r, r.candidates.map(c => c.id), '동점자 전원 면접 <확인>');
    submitAll(r, 'interview');
    return d.finalize(r);
}
// 본문은 A4 세로 한 구역이다. 구역이 늘어도 검사가 깨지지 않게 전부 이어 붙여서 본다.
async function sectionsOf(zip) {
    const names = Object.keys(zip.files).filter(name => /^Contents\/section\d+\.xml$/.test(name)).sort();
    return Promise.all(names.map(name => zip.file(name).async('string')));
}
const allSections = async zip => (await sectionsOf(zip)).join('');
// zip 로컬 헤더를 직접 읽는다 — mimetype 이 "첫 항목"이고 "무압축"인지는 JSZip 으로는 확인되지 않는다.
function firstEntry(buffer) {
    assert.equal(buffer.readUInt32LE(0), 0x04034b50, 'zip 로컬 헤더로 시작해야 한다');
    const method = buffer.readUInt16LE(8), nameLength = buffer.readUInt16LE(26);
    return { method, name: buffer.toString('utf8', 30, 30 + nameLength) };
}

test('builds a hwpx package a 한/글 can open: mimetype first and stored, required parts present', async () => {
    const buffer = await buildHwpx(finalized());
    assert.ok(Buffer.isBuffer(buffer) && buffer.length > 1000);
    assert.deepEqual(firstEntry(buffer), { method: 0, name: 'mimetype' });
    const zip = await JSZip.loadAsync(buffer);
    for (const part of ['mimetype', 'version.xml', 'META-INF/container.xml', 'META-INF/manifest.xml', 'Contents/content.hpf', 'Contents/header.xml', 'Contents/section0.xml']) {
        assert.ok(zip.file(part), `${part} 가 있어야 한다`);
    }
    assert.equal(await zip.file('mimetype').async('string'), 'application/hwp+zip');
    // 폴더 엔트리가 남아 있으면 한/글이 패키지를 거부한다.
    assert.deepEqual(Object.keys(zip.files).filter(name => zip.files[name].dir), []);
});

test('one A4 portrait section, declared in content.hpf and counted in header.xml', async () => {
    const zip = await JSZip.loadAsync(await buildHwpx(finalized()));
    const hpf = await zip.file('Contents/content.hpf').async('string');
    const spine = /<opf:spine>(.*?)<\/opf:spine>/s.exec(hpf)[1];
    assert.deepEqual(spine.match(/idref="([^"]+)"/g), ['idref="header"', 'idref="section0"']);
    assert.ok(!zip.file('Contents/section1.xml'));
    assert.match(await zip.file('Contents/header.xml').async('string'), /secCnt="1"/);
    // 원본 구글 시트 심사표처럼 전부 세로. 한/글이 저장한 세로 문서와 같은 값이어야 한다.
    const xml = await zip.file('Contents/section0.xml').async('string');
    const tags = xml.match(/<hp:pagePr [^>]*>/g) || [];
    assert.equal(tags.length, 1);
    assert.match(tags[0], /landscape="WIDELY" width="59528" height="84188"/);
});

test('pages follow the original sheet order and every table row fills the body width', async () => {
    const r = finalized(), s = r.snapshot;
    const xml = await allSections(await JSZip.loadAsync(await buildHwpx(r)));
    // 순서: 서약서(위원별) → 서류 채점표(위원별) → 서류 집계표 → 면접 채점표(위원별) → 면접 집계.
    const at = needle => { const i = xml.indexOf(needle); assert.ok(i >= 0, `${needle} 이 있어야 한다`); return i; };
    const order = ['청 렴 서 약 서(평가위원용)', '채용 서류심사 채점표', '채용 서류심사 집계표', '채용 면접 심사 채점표', '채용 면접 심사 집계 합산 및 순위'].map(at);
    assert.deepEqual([...order].sort((a, b) => a - b), order);
    assert.equal((xml.match(/청 렴 서 약 서\(평가위원용\)/g) || []).length, s.reviewers.length);
    for (const needle of ['강사별 심사표', '심사관점', '총 계', '평 균', '서류 심사 순위', '서류전형 계', '강사 순위', '평가자', '장 귀하', '「부패 없는 투명한 사회」']) at(needle);
    // 쪽마다 새 쪽에서 시작하되 문서 첫 쪽은 빈 쪽을 만들지 않는다.
    assert.ok(/^[\s\S]*?<hp:p [^>]*pageBreak="0"/.test(xml));
    assert.ok((xml.match(/pageBreak="1"/g) || []).length >= 4);
    // 병합 칸 포함, 줄마다 칸 너비 합이 그 표 폭과 같아야 한다(rowSpan 으로 덮인 칸은 윗줄이 낸다).
    const body = 59528 - Math.round(10 * 283.465) * 2;
    for (const tbl of xml.match(/<hp:tbl [\s\S]*?<\/hp:tbl>/g) || []) {
        const width = Number(/<hp:sz width="(\d+)"/.exec(tbl)[1]);
        assert.equal(width, body, '표 폭은 본문 폭');
        const colCnt = Number(/colCnt="(\d+)"/.exec(tbl)[1]);
        const cells = [...tbl.matchAll(/<hp:cellAddr colAddr="(\d+)" rowAddr="(\d+)"\/><hp:cellSpan colSpan="(\d+)" rowSpan="(\d+)"\/><hp:cellSz width="(\d+)"/g)].map(m => m.slice(1).map(Number));
        const rows = Number(/rowCnt="(\d+)"/.exec(tbl)[1]);
        const grid = Array.from({ length: rows }, () => new Array(colCnt).fill(0));
        for (const [col, row, cs, rs] of cells) for (let y = row; y < row + rs; y++) for (let x = col; x < col + cs; x++) grid[y][x]++;
        assert.ok(grid.every(line => line.every(n => n === 1)), '모든 칸이 정확히 한 셀에 덮여야 한다');
        const firstRow = cells.filter(c => c[1] === 0).reduce((a, c) => a + c[4], 0);
        assert.equal(firstRow, width);
    }
});

test('section body carries the school, candidates, rubric viewpoints and reviewer names, all escaped', async () => {
    const r = finalized(), s = r.snapshot;
    const zip = await JSZip.loadAsync(await buildHwpx(r));
    const section = await allSections(zip);
    assert.match(section, /^<\?xml version="1\.0" encoding="UTF-8"/);
    assert.equal((section.match(/<hp:secPr /g) || []).length, 1);
    assert.match(section, /^[\s\S]*?<hs:sec [^>]*><hp:p [^>]*><hp:run [^>]*><hp:secPr /);
    // 태그가 짝이 맞는지 — 여는 태그와 닫는 태그 수가 같아야 한다.
    assert.equal((section.match(/<hp:p\s/g) || []).length, (section.match(/<\/hp:p>/g) || []).length);
    assert.equal((section.match(/<hp:tbl\s/g) || []).length, (section.match(/<\/hp:tbl>/g) || []).length);
    assert.equal((section.match(/<hp:tc\s/g) || []).length, (section.match(/<\/hp:tc>/g) || []).length);
    for (const needle of ['협력강사', '두번째', '위원1', '위원2', '교사', '2026. 9. 20.', '2026. 9. 21.']) assert.ok(section.includes(needle), `본문에 ${needle} 이 있어야 한다`);
    // 배점표는 채용마다 다르므로 스냅샷의 rubrics 라벨이 '구분' 칸에 모두 있어야 한다.
    for (const stage of ['document', 'interview']) s.rubrics[stage].forEach((item, n) => assert.ok(section.includes(`${n + 1}. ${item.label}`), `${item.label}`));
    // XSS/HTML 페이로드는 반드시 escape 된 채로만 나타난다.
    assert.ok(!section.includes('<script>'), 'script 태그가 그대로 들어가면 안 된다');
    assert.ok(section.includes('테스트학교 &lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(section.includes('=1+1 &amp; &lt;b&gt;홍길동&lt;/b&gt;'));
    assert.ok(section.includes('동점자 전원 면접 &lt;확인&gt;'), '선정 사유가 집계표 아래 문단으로 들어가야 한다');
});

test('preset 심사관점: the picked line carries the score, grouped lines print like the original', async () => {
    const r = provision(d.createRecruitment(input({ rubrics: undefined, preset: 'basic-literacy', allowBonus: true })));
    r.reviewers.forEach((v, i) => d.signPledge(r, v.id, signatureFor(i + 40)));
    for (const v of r.reviewers) {
        // 첫 지원자: 4년제 관련 전공(5점) · 초등 3 + 관련 자격증 5건 → 상한 6 · 경력 2년
        d.saveEvaluation(r, v.id, 'document', r.candidates.map((c, i) => ({ candidateId: c.id, attendance: 'present', note: '', bonus: 0,
            picks: { c1: i === 0 ? 1 : 0, c2: i === 0 ? [1, 0, 0, 5] : [0, 0, 0, 0], c3: [2] }, scores: { c4: 5, c5: 20 } })));
        d.submitEvaluation(r, v.id, 'document');
    }
    d.selectShortlist(r, [r.candidates[0].id], '상위');
    for (const v of r.reviewers) { d.saveEvaluation(r, v.id, 'interview', [{ candidateId: r.candidates[0].id, attendance: 'present', note: '', bonus: 0, scores: { c1: 8, c2: 8, c3: 8, c4: 8, c5: 8 } }]); d.submitEvaluation(r, v.id, 'interview'); }
    d.finalize(r);
    const xml = await allSections(await JSZip.loadAsync(await buildHwpx(r)));
    // 원본 표기: 4년제/2년제를 한 줄로, 가점 줄, 서약서 원문.
    assert.ok(xml.includes('(4년제 5점, 2년제 4점)'));
    assert.ok(xml.includes('국가유공자법 제29조제1항 제1·2·4호(5점)'));
    assert.ok(xml.includes('방과후학교 계약업체 또는 입찰참가업체(개인위탁강사)'));
    // 자격증 3 + 5 = 8 은 배점 6에서 잘리므로, 건당 줄에는 남은 3점만 찍힌다.
    const sheet = xml.slice(xml.indexOf('채용 서류심사 채점표'), xml.indexOf('채용 서류심사 집계표'));
    const cellsOf = label => { const at = sheet.indexOf(label); return sheet.slice(at, at + 4000); };
    assert.match(cellsOf('채용 관련 자격증 건당'), /<hp:t>3<\/hp:t>/);
    assert.ok(!/<hp:t>5<\/hp:t>[\s\S]{0,200}건당/.test(sheet));
});

test('every reviewer signature lands in BinData and is declared in content.hpf', async () => {
    const r = finalized();
    const zip = await JSZip.loadAsync(await buildHwpx(r));
    const section = await allSections(zip);
    const hpf = await zip.file('Contents/content.hpf').async('string');
    const images = Object.keys(zip.files).filter(name => name.startsWith('BinData/'));
    // 같은 서명이 채점표마다 다시 쓰여도 BinData 항목은 위원당 하나여야 한다(내용 해시로 중복 제거).
    assert.equal(images.length, r.snapshot.reviewers.length, '위원 수만큼의 서명 그림이 있어야 한다');
    for (const path of images) {
        const bytes = await zip.file(path).async('nodebuffer');
        assert.ok(bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'PNG 원본 바이트여야 한다');
        const id = path.replace('BinData/', '').replace('.png', '');
        assert.ok(hpf.includes(`href="${path}" media-type="image/png" isEmbeded="1" hashkey="`), `${path} 항목이 content.hpf 에 있어야 한다`);
        assert.ok(section.includes(`binaryItemIDRef="${id}"`), `${id} 를 본문이 참조해야 한다`);
    }
    assert.ok(!section.includes('(서명 또는 인)'), '서명이 있으면 빈칸 문구는 나오지 않는다');
});

test('an unsigned reviewer falls back to the printed signature blank', async () => {
    const r = finalized();
    // 확정 스냅샷에서만 서명을 지운다. 원본 채용(r.reviewers)은 건드리지 않는다.
    for (const v of r.snapshot.reviewers) delete v.pledge;
    const zip = await JSZip.loadAsync(await buildHwpx(r));
    const section = await allSections(zip);
    assert.ok(section.includes('(서명 또는 인)'));
    assert.deepEqual(Object.keys(zip.files).filter(name => name.startsWith('BinData/')), []);
    assert.ok(!(await zip.file('Contents/content.hpf').async('string')).includes('isEmbeded'));
});

test('refuses a recruitment without a finalized snapshot', async () => {
    const draft = provision(d.createRecruitment(input()));
    await assert.rejects(() => buildHwpx(draft), error => {
        assert.equal(error.status, 409);
        assert.match(error.message, /확정/);
        return true;
    });
    await assert.rejects(() => buildHwpx({}), error => error.status === 409);
});
