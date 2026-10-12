'use strict';
// 샘플 심사표: 원본 시트의 모든 영역 프리셋으로 가상 채용을 끝까지 돌려 출력물이 나오는지 본다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PRESETS } = require('../../lib/recruitment/presets');
const { buildSample } = require('../../lib/recruitment/sample');
const { exportResult } = require('../../lib/recruitment/exports');

test('원본 시트의 영역 11개가 같은 심사 기준으로 들어 있다', () => {
    assert.equal(PRESETS.length, 11);
    assert.equal(new Set(PRESETS.map(p => p.id)).size, 11);
    assert.ok(PRESETS.some(p => p.name === '방과후학교[컴퓨터부] 강사'));
    for (const p of PRESETS) assert.deepEqual(p.rubrics, PRESETS[0].rubrics, `${p.name} 기준이 다르다`);
});
test('모든 영역의 샘플이 확정까지 가고 HTML·한/글로 나온다', async () => {
    for (const p of PRESETS) {
        const r = buildSample(p.id);
        assert.equal(r.status, 'finalized'); assert.equal(r.field, p.name);
        assert.equal(r.snapshot.results.filter(x => x.total !== null).length, 3, '면접대상자 3명');
        const html = (await exportResult(r, 'html')).buffer.toString();
        assert.ok(html.includes(`${p.name} 채용 서류심사 집계표`) && html.includes('일강사'));
        assert.ok(html.includes('(서명 또는 인)'), '샘플은 서명 이미지 없이 빈칸');
    }
    const hwpx = await exportResult(buildSample(PRESETS[0].id), 'hwpx');
    assert.ok(hwpx.buffer.length > 1000);
});
test('없는 심사표는 거부한다', () => { assert.throws(() => buildSample('nope'), /심사표/); });
