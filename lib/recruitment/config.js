'use strict';
module.exports = Object.freeze({
    provider: 'mock',
    operatorEmail: 'kdhdhdbdbr@gmail.com',
    folderId: '1n5Aypzoy0PtdiJizgb5pWyLaHwNKmMPs',
    folderUrl: 'https://drive.google.com/drive/folders/1n5Aypzoy0PtdiJizgb5pWyLaHwNKmMPs',
    templateIds: { 10: '1ebL78hsQTRRo9_SsjW_xYExNSI3v4LRFebxfrvvgKeo', 20: '1HBbngENr8fIYFUJ6mz3PReCQogY96eHUPI8xasc6P04' },
    // Read-only observation, not a live permission guarantee. Never silently change it.
    // Measured through the connected operator token: the link share is 'anyone: writer',
    // not reader as first recorded. Anyone holding the link can edit or delete evaluation
    // files, so checkConnection() refuses to prepare provisioning until it is restricted.
    folderVerification: { checkedOn: '2026-09-16', owner: 'kdhdhdbdbr@gmail.com', anyoneRole: 'writer' },
    // The templates are third-party originals (title says Copyright (c) 2026 KHSDO), not ours.
    // Copying depends on the owner keeping them shared. Replace these IDs with operator-owned
    // copies before enabling the Google adapter. See docs/RECRUITMENT_GOOGLE_SETUP.md 3-1.
    templateVerification: { checkedOn: '2026-09-16', owner: 'khwell@gmail.com', operatorOwned: false },
    googleAutomationConnected: false
});
