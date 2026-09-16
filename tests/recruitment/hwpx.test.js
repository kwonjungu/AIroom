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

test('section body carries the school, candidates, rubric labels and reviewer names, all escaped', async () => {
    const r = finalized(), s = r.snapshot;
    const zip = await JSZip.loadAsync(await buildHwpx(r));
    const section = await zip.file('Contents/section0.xml').async('string');
    assert.match(section, /^<\?xml version="1\.0" encoding="UTF-8"/);
    assert.ok(section.includes('<hs:sec ') && section.endsWith('</hs:sec>'));
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
    const section = await zip.file('Contents/section0.xml').async('string');
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
    const section = await zip.file('Contents/section0.xml').async('string');
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
