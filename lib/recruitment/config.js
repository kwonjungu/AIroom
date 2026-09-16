'use strict';
// 평가는 웹에서 진행한다. Drive 는 운영 계정 연결 확인과 확정 결과 문서 보관 용도로만 쓴다.
module.exports = Object.freeze({
    provider: 'mock',
    operatorEmail: 'kdhdhdbdbr@gmail.com',
    folderId: '1n5Aypzoy0PtdiJizgb5pWyLaHwNKmMPs',
    folderUrl: 'https://drive.google.com/drive/folders/1n5Aypzoy0PtdiJizgb5pWyLaHwNKmMPs',
    // Read-only observation, not a live permission guarantee. Never silently change it.
    // Measured through the connected operator token: the link share is 'anyone: writer',
    // not reader as first recorded. Anyone holding the link can edit or delete evaluation
    // files, so checkConnection() refuses to prepare provisioning until it is restricted.
    folderVerification: { checkedOn: '2026-09-16', owner: 'kdhdhdbdbr@gmail.com', anyoneRole: 'writer' },
    googleAutomationConnected: false
});
