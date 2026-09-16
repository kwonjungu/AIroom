'use strict';
const { assert, audit } = require('../domain');
function provision(r) {
    if (r.status !== 'draft') return r;
    assert(r.provider === 'mock', 'Google 시트 연동 모드는 아직 활성화되지 않았습니다.', 503);
    r.link = { kind: 'mock', workspacePath: `/recruitment?id=${r.id}`, folderUrl: null, spreadsheetUrl: null, templateCapacity: r.candidates.length <= 10 ? 10 : 20 };
    r.status = 'document'; audit(r, 'admin', '평가 시작', '웹에서 평가 진행 · Google 시트 파일은 만들지 않음'); return r;
}
module.exports = { provision };
