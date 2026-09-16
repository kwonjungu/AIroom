'use strict';
const { assert, audit } = require('../domain');
function provision(r) {
    if (r.status !== 'draft') return r;
    assert(r.provider === 'mock', 'Google 연결 어댑터가 아직 활성화되지 않았습니다.', 503);
    r.link = { kind: 'mock', workspacePath: `/recruitment?id=${r.id}`, folderUrl: null, spreadsheetUrl: null, templateCapacity: r.candidates.length <= 10 ? 10 : 20 };
    r.status = 'document'; audit(r, 'admin', '모의 평가 공간 생성', '실제 Google 파일은 생성하지 않음'); return r;
}
module.exports = { provision };
