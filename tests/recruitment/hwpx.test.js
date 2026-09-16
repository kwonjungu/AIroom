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
// 본문은 구역 3개(세로 표지 / 가로 표 / 세로 서약서)로 나뉘어 있다.
// 어느 구역인지 따지지 않는 검사는 전부 이어 붙여서 본다.
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
    for (const part of ['mimetype', 'version.xml', 'META-INF/container.xml', 'META-INF/manifest.xml', 'Contents/content.hpf', 'Contents/header.xml',
        'Contents/section0.xml', 'Contents/section1.xml', 'Contents/section2.xml']) {
        assert.ok(zip.file(part), `${part} 가 있어야 한다`);
    }
    assert.equal(await zip.file('mimetype').async('string'), 'application/hwp+zip');
    // 폴더 엔트리가 남아 있으면 한/글이 패키지를 거부한다.
    assert.deepEqual(Object.keys(zip.files).filter(name => zip.files[name].dir), []);
});

test('three sections are declared in content.hpf in spine order and counted in header.xml', async () => {
    const zip = await JSZip.loadAsync(await buildHwpx(finalized()));
    const hpf = await zip.file('Contents/content.hpf').async('string');
    for (let i = 0; i < 3; i++) {
        assert.ok(hpf.includes(`<opf:item id="section${i}" href="Contents/section${i}.xml" media-type="application/xml"/>`), `section${i} manifest 항목`);
    }
    // spine 순서가 곧 문서의 구역 순서다 — header 다음에 0,1,2 가 이 차례로 와야 한다.
    const spine = /<opf:spine>(.*?)<\/opf:spine>/s.exec(hpf)[1];
    assert.deepEqual(spine.match(/idref="([^"]+)"/g), ['idref="header"', 'idref="section0"', 'idref="section1"', 'idref="section2"']);
    assert.ok(!hpf.includes('section3'));
    assert.match(await zip.file('Contents/header.xml').async('string'), /secCnt="3"/);
});

test('only the table section is landscape: NARROWLY flag with portrait paper dims', async () => {
    const zip = await JSZip.loadAsync(await buildHwpx(finalized()));
    const pagePr = async i => {
        const xml = await zip.file(`Contents/section${i}.xml`).async('string');
        const tags = xml.match(/<hp:pagePr [^>]*>/g) || [];
        assert.equal(tags.length, 1, `구역 ${i} 의 pagePr 은 정확히 하나여야 한다`);
        const [, landscape, width, height] = /landscape="([^"]+)" width="(\d+)" height="(\d+)"/.exec(tags[0]);
        return { landscape, width: Number(width), height: Number(height) };
    };
    // 실기 판별(2026-09-17): NARROWLY 플래그가 용지를 회전한다. width/height 는 세로 값
    // 그대로여야 하며, 치수까지 맞바꾸면 두 번 회전이 되어 한/글에서 세로로 열린다.
    assert.deepEqual(await pagePr(1), { landscape: 'NARROWLY', width: 59528, height: 84188 });
    for (const i of [0, 2]) {
        assert.deepEqual(await pagePr(i), { landscape: 'WIDELY', width: 59528, height: 84188 }, `구역 ${i} 는 세로여야 한다`);
    }
});

test('each section carries only its own content and its tables fit that section body width', async () => {
    const zip = await JSZip.loadAsync(await buildHwpx(finalized()));
    const [cover, tables, pledges] = await Promise.all([0, 1, 2].map(i => zip.file(`Contents/section${i}.xml`).async('string')));
    // 구역 0: 표지. 집계표도 서약서도 여기 있으면 안 된다.
    assert.ok(cover.includes('채용 심사 결과') && cover.includes('서류전형일'));
    // 순위 기준·확정 시각은 공문서 표지에서 뺐다 (2026-09-17)
    assert.ok(!cover.includes('순위 기준') && !cover.includes('확정일'), '표지에 내부 산정 정보가 남아 있다');
    assert.ok(!cover.includes('집계표') && !cover.includes('청렴서약서'));
    // 구역 1(가로): 집계표 + 채점표.
    for (const needle of ['1. 서류심사 집계표', '2. 면접·최종 합산 통계표', '서류심사 채점표', '면접심사 채점표', '최종 순위', '채점자 직위']) {
        assert.ok(tables.includes(needle), `가로 구역에 ${needle} 이 있어야 한다`);
    }
    assert.ok(!tables.includes('청렴서약서'));
    // 구역 2: 서약서. 문구는 exports.js 인쇄본과 한 글자도 다르면 안 된다.
    assert.ok(pledges.includes('청렴서약서') && pledges.includes('금품·향응·편의를 수수하거나'));
    assert.ok(pledges.includes('장 귀하') && !pledges.includes('집계표'));
    // 표 폭은 구역의 본문 폭(용지 폭 − 좌우 여백)에 맞춰 다시 계산되어야 한다.
    // hp:sz 는 그림(서명)에도 붙는다 — 표 바로 안쪽의 것만 센다.
    const tableWidths = xml => (xml.match(/<hp:tbl [^>]*><hp:sz width="(\d+)"/g) || []).map(m => Number(/width="(\d+)"/.exec(m)[1]));
    assert.ok(tableWidths(cover).every(w => w === 59528 - 4251 * 2), '세로 구역 표는 51026');
    assert.ok(tableWidths(tables).length > 0 && tableWidths(tables).every(w => w === 84188 - 4251 * 2), '가로 구역 표는 75686');
    // 열 너비 합계도 표 폭과 맞아야 한다(반올림 오차는 마지막 열이 흡수).
    for (const tbl of tables.match(/<hp:tbl [\s\S]*?<\/hp:tbl>/g) || []) {
        const firstRow = /<hp:tr>[\s\S]*?<\/hp:tr>/.exec(tbl)[0];
        const sum = (firstRow.match(/<hp:cellSz width="(\d+)"/g) || []).reduce((a, m) => a + Number(/\d+/.exec(m)[0]), 0);
        assert.equal(sum, 84188 - 4251 * 2);
    }
});

test('section body carries the school, candidates, rubric labels and reviewer names, all escaped', async () => {
    const r = finalized(), s = r.snapshot;
    const zip = await JSZip.loadAsync(await buildHwpx(r));
    for (const one of await sectionsOf(zip)) {
        assert.match(one, /^<\?xml version="1\.0" encoding="UTF-8"/);
        assert.ok(one.includes('<hs:sec ') && one.endsWith('</hs:sec>'));
        // 구역마다 자기 secPr 이 첫 문단 안에 정확히 하나 있어야 한다.
        assert.equal((one.match(/<hp:secPr /g) || []).length, 1);
        assert.match(one, /^[\s\S]*?<hs:sec [^>]*><hp:p [^>]*><hp:run [^>]*><hp:secPr /);
    }
    const section = await allSections(zip);
    // 태그가 짝이 맞는지 — 여는 hp:p 와 닫는 hp:p 수가 같아야 한다.
    assert.equal((section.match(/<hp:p\s/g) || []).length, (section.match(/<\/hp:p>/g) || []).length);
    assert.equal((section.match(/<hp:tbl\s/g) || []).length, (section.match(/<\/hp:tbl>/g) || []).length);
    assert.equal((section.match(/<hp:tc\s/g) || []).length, (section.match(/<\/hp:tc>/g) || []).length);
    for (const needle of ['테스트학교', '협력강사', '두번째', '청렴서약서', '서류심사 채점표', '면접심사 채점표', '학력', '자기소개서', '위원1', '위원2', '교사']) {
        assert.ok(section.includes(needle), `본문에 ${needle} 이 있어야 한다`);
    }
    assert.ok(section.includes('001') && section.includes('002'));
    // XSS/HTML 페이로드는 반드시 escape 된 채로만 나타난다.
    assert.ok(!section.includes('<script>'), 'script 태그가 그대로 들어가면 안 된다');
    assert.ok(section.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(section.includes('=1+1 &amp; &lt;b&gt;홍길동&lt;/b&gt;'));
    assert.ok(section.includes('동점자 전원 면접 &lt;확인&gt;'), '선정 사유가 표 밖 문단으로 들어가야 한다');
    // 집계표는 exports.js 의 statistics 를 그대로 쓴다 — 헤더가 살아 있는지만 본다.
    for (const header of ['접수번호', '지원자', '서류 평균', '최종 순위', '순위 기준 점수']) assert.ok(section.includes(header));
    // 배점표는 채용마다 다르므로 스냅샷의 rubrics 라벨이 모두 있어야 한다.
    for (const item of s.rubrics.interview) assert.ok(section.includes(item.label));
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
