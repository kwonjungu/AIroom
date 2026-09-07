/*
 * 함께 만드는 문서 (codocs) — 실시간 공동 편집 시트
 * ------------------------------------------------------------------
 * - 저장소: Firestore (projects/airoom-ebce3, databaseId='kwon')
 *   · codocs_sheets/{sheetId}                     시트 메타(제목·열 정의·구분·권한)
 *   · codocs_sheets/{sheetId}/rows/{rowId}        행 1개 = 문서 1개 (셀 단위 필드 병합 저장)
 *   · codocs_sheets/{sheetId}/presence/{clientId} 누가 어느 셀을 보고 있는지 (하트비트 20초)
 * - Redis(server.js)를 쓰지 않으므로 GitHub Pages 미러에서도 그대로 동작한다.
 *   (firebase-config만 /api 로 받아오며, 미러에서는 SPA의 fetch 래퍼가 vercel로 넘겨준다)
 * - SPA와의 접점은 window.CODOCS_HOST 하나뿐. index.html / public/index.html 양쪽에 동일 선언.
 *
 * ⚠ 이 파일은 두 SPA가 공유하는 "단일 사본"이다. 여기만 고치면 양쪽에 반영된다.
 *   단, GitHub Pages에서는 절대경로 /lib/... 가 레포 루트를 벗어나므로
 *   로더가 host별로 경로를 바꿔 넣는다 (index.html의 codocs 로더 참고).
 */

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
    getFirestore, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc,
    getDocs, writeBatch, serverTimestamp, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const HOST = () => window.CODOCS_HOST || {};
const toast = (m, t) => { const h = HOST(); if (h.toast) h.toast(m, t); else console.log('[codocs]', m); };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ===================== 상태 ===================== */
let db = null;
let ready = false;            // Firestore 연결 완료
let booting = null;           // 부트 Promise (중복 호출 방지)
let sheets = [];              // 시트 메타 목록
let activeSheetId = null;
let rows = [];                // 활성 시트의 행
let scopeFilter = null;        // null이면 첫 렌더에서 본인 소속으로 정한다 ('전체' 탭은 없앴다)
let searchTerm = '';
let members = [];             // 학교 사용자 명부 (codocs_members) — 이름·직위·소속의 기준
let unsubSheets = null, unsubRows = null, unsubPresence = null, unsubMembers = null;
let presence = [];            // [{id,name,scope,cell,at}]
let heartbeatTimer = null;
let edit = null;              // {rowId, colKey, value} — 편집 중인 셀
let opened = false;           // 탭이 한 번이라도 열렸는지
const CLIENT_ID = 'c_' + Math.random().toString(36).slice(2, 10);

/* ===================== 열 타입 ===================== */
const COL_TYPES = [
    { v: 'text', label: '텍스트' },
    { v: 'memo', label: '긴 글' },
    { v: 'number', label: '숫자' },
    { v: 'ip', label: 'IP 주소' },
    { v: 'mac', label: 'MAC 주소' },
    { v: 'select', label: '선택 목록' },
    { v: 'date', label: '날짜' },
    { v: 'staff', label: '교직원 이름' },
    { v: 'position', label: '직위(이름 따라 자동)' },
    { v: 'check', label: '체크' },
    { v: 'seq', label: '순번(자동)' }
];
const typeLabel = t => (COL_TYPES.find(x => x.v === t) || { label: t }).label;

/* ===================== 템플릿 ===================== */
const TEMPLATES = {
    ip: {
        title: 'IP 대장',
        icon: '🌐',
        desc: '본교·수정분교 기기별 고정 IP 관리대장. 본인 소속 행만 편집됩니다.',
        scopes: ['본교', '수정분교'],
        editPolicy: 'scope',
        columns: [
            { key: 'no', label: '순번', type: 'seq', width: 56 },
            { key: 'place', label: '사용 장소', type: 'text', width: 150 },
            { key: 'device', label: '기기 종류', type: 'select', width: 120, options: ['데스크탑PC', '노트북', '태블릿', '프린터/복합기', 'TV/전자칠판', '공유기', 'AP', 'CCTV/NVR', '서버/NAS', '기타'] },
            { key: 'model', label: '자산번호 / 모델', type: 'text', width: 150 },
            { key: 'ip', label: 'IP 주소', type: 'ip', width: 130 },
            { key: 'mask', label: '서브넷 마스크', type: 'text', width: 130, def: '255.255.255.0' },
            { key: 'gw', label: '게이트웨이', type: 'text', width: 130 },
            { key: 'mac', label: 'MAC 주소', type: 'mac', width: 150 },
            { key: 'pos', label: '직위', type: 'position', width: 100 },
            { key: 'user', label: '이름', type: 'staff', width: 90 },
            { key: 'day', label: '확인일', type: 'date', width: 120 },
            { key: 'memo', label: '비고', type: 'memo', width: 180 }
        ]
    },
    asset: {
        title: '물품 대장',
        icon: '📦',
        desc: '',
        scopes: ['본교', '수정분교'],
        editPolicy: 'scope',
        columns: [
            { key: 'no', label: '순번', type: 'seq', width: 56 },
            { key: 'name', label: '품명', type: 'text', width: 160 },
            { key: 'spec', label: '규격', type: 'text', width: 140 },
            { key: 'qty', label: '수량', type: 'number', width: 80 },
            { key: 'place', label: '보관 장소', type: 'text', width: 140 },
            { key: 'pos', label: '직위', type: 'position', width: 100 },
            { key: 'user', label: '관리자', type: 'staff', width: 90 },
            { key: 'day', label: '확인일', type: 'date', width: 120 },
            { key: 'memo', label: '비고', type: 'memo', width: 180 }
        ]
    },
    blank: {
        title: '새 시트',
        icon: '📄',
        desc: '',
        scopes: ['본교', '수정분교'],
        editPolicy: 'scope',
        columns: [
            { key: 'no', label: '순번', type: 'seq', width: 56 },
            { key: 'c1', label: '항목', type: 'text', width: 180 },
            { key: 'c2', label: '내용', type: 'text', width: 220 },
            { key: 'c3', label: '담당', type: 'staff', width: 100 },
            { key: 'c4', label: '비고', type: 'memo', width: 180 }
        ]
    }
};

/* ===================== 본인 식별 / 권한 ===================== */
// 명부(codocs_members)가 있으면 그것이 기준. 아직 세팅 전이면 SPA의 staff.json으로 폴백한다.
function allStaff() {
    if (members.length) return members;
    const h = HOST();
    try { return (h.staff || []).map(s => ({ ...s, scope: guessScope(s.position) })); } catch (e) { return []; }
}
function guessScope(position) { return /수정|분교/.test(position || '') ? '수정분교' : '본교'; }
function memberOf(name) { return allStaff().find(x => x.name === name) || null; }
function memberOrder(name) { const i = allStaff().findIndex(x => x.name === name); return i < 0 ? 9999 : i; }
function myName() { const h = HOST(); return (h.myName || localStorage.getItem('airoom_ws_name') || '').trim() || null; }
function isAdmin() { const h = HOST(); return !!h.isAdmin || document.body.classList.contains('admin-mode'); }

// 소속: 명부에 지정된 값이 1순위, 수동 지정이 2순위, 직위 추론이 3순위
function myScope(sheet) {
    const scopes = (sheet && sheet.scopes) || [];
    const n = myName();
    const me = n ? memberOf(n) : null;
    const manual = localStorage.getItem('airoom_codocs_scope');
    const guess = (me && me.scope) || manual || (me ? guessScope(me.position) : null);
    if (!guess) return null;
    return scopes.length ? (scopes.includes(guess) ? guess : scopes[0]) : guess;
}

function canEdit(sheet, row) {
    if (!sheet || sheet.locked) return isAdmin() && !!myName();
    if (isAdmin()) return true;
    if (!myName()) return false;
    const p = sheet.editPolicy || 'scope';
    if (p === 'all') return true;
    if (p === 'owner') return !row || !row.owner || row.owner === myName();
    return !row || !row.scope || row.scope === myScope(sheet);   // 'scope'
}

/* ===================== 검증 ===================== */
const RE_IP = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const RE_MAC = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;
function cellError(col, val, allRows, rowId) {
    const v = (val || '').trim();
    if (!v) return '';
    if (col.type === 'ip') {
        if (!RE_IP.test(v)) return 'IP 형식이 아닙니다';
        const dup = allRows.some(r => r.id !== rowId && ((r.cells || {})[col.key] || '').trim() === v);
        if (dup) return '이미 등록된 IP입니다';
    }
    if (col.type === 'mac' && !RE_MAC.test(v)) return 'MAC 형식이 아닙니다 (AA:BB:CC:DD:EE:FF)';
    if (col.type === 'number' && isNaN(Number(v))) return '숫자가 아닙니다';
    return '';
}

/* ===================== Firestore 부트 ===================== */
async function boot() {
    if (ready) return true;
    if (booting) return booting;
    booting = (async () => {
        const headers = {};
        const t = HOST().authToken;
        if (t) headers['X-Auth-Token'] = t;
        let cfg = null;
        try { cfg = await fetch('/api/firebase-config', { headers }).then(r => r.json()); } catch (e) { cfg = null; }
        if (!cfg || !cfg.apiKey) throw new Error('Firebase 설정을 가져오지 못했습니다 (FIREBASE_* 환경변수 확인)');
        const app = getApps().some(a => a.name === 'codocs')
            ? getApp('codocs')
            : initializeApp(cfg, 'codocs');
        db = getFirestore(app, 'kwon');   // ⚠ DB 이름이 (default)가 아니라 'kwon'
        ready = true;
        return true;
    })();
    try { return await booting; } finally { booting = null; }
}

/* ===================== 구독 ===================== */
function watchSheets() {
    if (unsubSheets) unsubSheets();
    unsubSheets = onSnapshot(query(collection(db, 'codocs_sheets'), orderBy('order')), snap => {
        sheets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!activeSheetId || !sheets.find(s => s.id === activeSheetId)) {
            activeSheetId = sheets.length ? sheets[0].id : null;
            watchRows();
        }
        render();
    }, err => {
        console.warn('[codocs] sheets', err);
        if (err.code === 'permission-denied') showRulesHelp();
        else showFatal('시트 목록을 불러오지 못했습니다: ' + err.message);
    });
}

/* Firestore 규칙 미게시 = 이 기능의 유일한 수동 준비물.
   "관리자에게 문의"로 끝내면 아무도 못 고치므로, 화면에서 바로 해결하게 안내한다.
   ⚠ 이 프로젝트의 DB는 (default)가 아니라 `kwon` — 콘솔에서 DB를 잘못 고르면 붙여넣어도 그대로다.
   그래서 링크를 databases/kwon/security/rules 로 직접 건다(경로에 security 가 들어간다). */
const RULES_URL = 'https://raw.githubusercontent.com/kwonjungu/AIroom/main/firestore.rules';
const CONSOLE_URL = 'https://console.firebase.google.com/project/airoom-ebce3/firestore/databases/kwon/security/rules';
function showRulesHelp() {
    const page = document.getElementById('page-codocs');
    if (!page) return;
    page.innerHTML = shell(`<div class="cd-setup">
        <div class="cd-setuptitle">🔐 딱 한 번, 보안 규칙을 게시해야 합니다</div>
        <p class="cd-setupdesc">
            데이터베이스가 아직 이 기능의 읽기·쓰기를 허용하지 않고 있습니다(<code>permission-denied</code>).
            아래 3단계를 한 번만 해두면 이후로는 계속 됩니다. <b>관리자(권준구) 계정</b>으로 진행하세요.
        </p>
        <ol class="cd-steps">
            <li><b>규칙 복사</b> — 아래 버튼을 누르면 클립보드에 들어갑니다.
                <div style="margin-top:6px;"><button class="btn btn-primary" data-cd="copyRules">📋 규칙 전체 복사</button>
                <span id="cdRulesStat" class="cd-hint"></span></div></li>
            <li><b>콘솔 열기</b> — <a href="${CONSOLE_URL}" target="_blank" rel="noopener">Firestore 규칙 편집기 열기 ↗</a>
                <div class="cd-hint">링크가 <code>kwon</code> 데이터베이스의 규칙 탭으로 바로 갑니다.
                    이 프로젝트의 DB는 <code>(default)</code>가 아니라 <code>kwon</code>이라, 다른 DB에 붙여넣으면 아무 일도 일어나지 않습니다.</div></li>
            <li><b>붙여넣고 게시</b> — 편집기 내용을 전부 지우고 붙여넣은 뒤 <b>게시</b> 버튼을 누릅니다.
                <div class="cd-hint">게시 후 이 페이지를 새로고침하면 바로 열립니다.</div></li>
        </ol>
        <details class="cd-rulesbox"><summary>규칙 내용 직접 보기</summary><pre id="cdRulesPre">불러오는 중…</pre></details>
    </div>`);
    const pre = page.querySelector('#cdRulesPre');
    let text = null;
    fetch(RULES_URL).then(r => r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)))
        .then(t => { text = t; pre.textContent = t; })
        .catch(e => { pre.textContent = '불러오지 못했습니다 — 레포의 firestore.rules 파일을 직접 여세요. (' + e.message + ')'; });
    page.querySelector('[data-cd=copyRules]').addEventListener('click', () => {
        const stat = page.querySelector('#cdRulesStat');
        if (!text) { stat.textContent = ' 아직 불러오는 중입니다. 잠시 후 다시 눌러주세요.'; return; }
        navigator.clipboard.writeText(text)
            .then(() => { stat.textContent = ' 복사했습니다 — 2단계로 가세요.'; })
            .catch(() => { stat.textContent = ' 복사 실패 — 아래 "규칙 내용 직접 보기"에서 수동 복사하세요.'; });
    });
}

function watchMembers() {
    if (unsubMembers) unsubMembers();
    unsubMembers = onSnapshot(query(collection(db, 'codocs_members'), orderBy('order')), snap => {
        members = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        render();
    }, err => {
        console.warn('[codocs] members', err);
        if (err.code === 'permission-denied') showRulesHelp();
    });
}

function watchRows() {
    if (unsubRows) { unsubRows(); unsubRows = null; }
    if (unsubPresence) { unsubPresence(); unsubPresence = null; }
    rows = []; presence = [];
    if (!activeSheetId) return;
    unsubRows = onSnapshot(query(collection(db, 'codocs_sheets', activeSheetId, 'rows'), orderBy('order')), snap => {
        rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        render();
    }, err => console.warn('[codocs] rows', err));
    unsubPresence = onSnapshot(collection(db, 'codocs_sheets', activeSheetId, 'presence'), snap => {
        const now = Date.now();
        presence = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.id !== CLIENT_ID && p.ms && now - p.ms < 60000);
        renderPresence();
        paintLocks();
    }, err => console.warn('[codocs] presence', err));
}

/* ===================== 접속 표시(presence) ===================== */
async function beat(cell) {
    if (!ready || !activeSheetId || !myName()) return;
    try {
        await setDoc(doc(db, 'codocs_sheets', activeSheetId, 'presence', CLIENT_ID), {
            name: myName(), scope: myScope(currentSheet()) || '', cell: cell || '',
            ms: Date.now(), at: serverTimestamp()
        });
    } catch (e) { /* presence 실패는 무시 */ }
}
function startBeat() {
    stopBeat();
    beat(edit ? edit.rowId + ':' + edit.colKey : '');
    heartbeatTimer = setInterval(() => beat(edit ? edit.rowId + ':' + edit.colKey : ''), 20000);
}
function stopBeat() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
}
async function leave() {
    stopBeat();
    if (ready && activeSheetId) {
        try { await deleteDoc(doc(db, 'codocs_sheets', activeSheetId, 'presence', CLIENT_ID)); } catch (e) { }
    }
}
window.addEventListener('beforeunload', () => { try { leave(); } catch (e) { } });

/* ===================== 진입점 ===================== */
function currentSheet() { return sheets.find(s => s.id === activeSheetId) || null; }

export async function open() {
    const page = document.getElementById('page-codocs');
    if (!page) return;
    opened = true;
    if (!ready) {
        page.innerHTML = shell('<div class="cd-empty">🔌 실시간 서버에 연결하는 중…</div>');
        try { await boot(); } catch (e) { showFatal(e.message); return; }
        watchMembers();
        watchSheets();
    }
    render();
    startBeat();
}
window.codocsOpen = () => { open().catch(e => showFatal(e.message)); };
window.codocsClose = () => { leave(); };

function showFatal(msg) {
    const page = document.getElementById('page-codocs');
    if (page) page.innerHTML = shell(`<div class="cd-empty" style="color:#c92a2a;">⚠️ ${esc(msg)}<div style="margin-top:8px;font-size:12px;color:var(--text-light);">관리자에게 문의하거나 잠시 후 새로고침 해주세요.</div></div>`);
}

/* ===================== 렌더 ===================== */
function shell(inner) {
    return `<div style="text-align:center;margin-bottom:14px;">
        <h2 style="font-size:22px;font-weight:800;margin:0;">📝 함께 만드는 문서</h2>
        <p style="font-size:13px;color:var(--text-light);margin:4px 0 0;">여러 사람이 동시에 편집하는 표입니다. 바꾸는 즉시 모두에게 반영됩니다.</p>
    </div>${inner}`;
}

function render() {
    const page = document.getElementById('page-codocs');
    if (!page || !opened) return;
    if (!ready) return;

    const sheet = currentSheet();
    const name = myName();
    // 원격 스냅샷이 수시로 render를 부르므로 스크롤·검색 포커스를 보존한다
    const wrapOld = page.querySelector('.cd-tablewrap');
    const keepScroll = wrapOld ? { t: wrapOld.scrollTop, l: wrapOld.scrollLeft } : null;
    const searchFocused = document.activeElement && document.activeElement.id === 'cdSearch';
    const searchCaret = searchFocused ? document.activeElement.selectionStart : null;

    let html = '';
    // 본인 식별
    if (!name) {
        html += `<div class="cd-idbar">
            <div style="font-size:14px;font-weight:600;margin-bottom:8px;">먼저 본인 이름을 입력해주세요 (편집 권한 확인용)</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <input type="text" id="cdNameInput" placeholder="예: 이원빈" list="cdStaffList"
                    style="flex:1;min-width:200px;padding:10px;border:2px solid var(--border);border-radius:8px;font-size:14px;">
                <datalist id="cdStaffList">${allStaff().map(s => `<option value="${esc(s.name)}">${esc(s.position || '')}</option>`).join('')}</datalist>
                <button class="btn btn-primary" data-cd="saveName" style="padding:10px 16px;">확인</button>
            </div>
        </div>`;
    } else {
        const sc = myScope(sheet);
        html += `<div class="cd-whoami">
            <span class="cd-chip">👤 ${esc(name)}</span>
            <span class="cd-chip">🏫 ${esc(sc || '-')}</span>
            <button class="btn btn-secondary" data-cd="changeName" style="font-size:12px;padding:5px 10px;">이름·소속 변경</button>
            <span id="cdPresence" class="cd-presence"></span>
        </div>`;
    }

    // 시트 탭
    html += `<div class="cd-sheetbar">
        ${sheets.map(s => `<button class="cd-sheet${s.id === activeSheetId ? ' active' : ''}" data-cd="sheet" data-id="${esc(s.id)}">${esc(s.icon || '📄')} ${esc(s.title)}</button>`).join('')}
        <button class="cd-sheet cd-add admin-only" data-cd="newSheet">➕ 시트 만들기</button>
        <button class="cd-sheet cd-add admin-only" data-cd="importSheet">📥 파일로 만들기</button>
        <button class="cd-sheet cd-add admin-only" data-cd="members">👥 학교 사용자</button>
    </div>`;

    if (!sheet) {
        html += `<div class="cd-empty">아직 만들어진 문서가 없습니다.<br><span style="font-size:12px;color:var(--text-light);">관리 모드를 켜고 <b>시트 만들기</b> 또는 <b>파일로 만들기</b>를 눌러 시작하세요.</span></div>`;
        page.innerHTML = shell(html);
        bind(page);
        return;
    }

    // 툴바
    const scopes = sheet.scopes || [];
    // 시트에 등록되지 않은 구분을 가진 행이 있으면 그 탭도 같이 띄운다 — 안 그러면 영영 안 보인다
    const orphan = [...new Set(rows.map(r => r.scope || '').filter(v => v && !scopes.includes(v)))];
    const scopeTabs = scopes.concat(orphan);
    if (!scopeFilter || !scopeTabs.includes(scopeFilter)) {
        scopeFilter = (scopeTabs.includes(myScope(sheet)) ? myScope(sheet) : scopeTabs[0]) || null;
    }
    html += `<div class="cd-head">
        <div>
            <div class="cd-title">${esc(sheet.icon || '📄')} ${esc(sheet.title)}${sheet.locked ? ' <span class="cd-lock">🔒 잠김</span>' : ''}</div>
            ${sheet.desc ? `<div class="cd-desc">${esc(sheet.desc)}</div>` : ''}
        </div>
        <div class="cd-actions">
            ${(sheet.columns || []).some(c => c.type === 'ip') ? '<button class="btn btn-primary" data-cd="myip">🔍 내 IP 확인</button>' : ''}
            <button class="btn btn-secondary" data-cd="export" data-fmt="xlsx">⬇️ 엑셀</button>
            <button class="btn btn-secondary" data-cd="export" data-fmt="csv">⬇️ CSV</button>
            <button class="btn btn-secondary" data-cd="copyTsv" title="구글 스프레드시트에 그대로 붙여넣을 수 있습니다">📋 시트로 복사</button>
            <button class="btn btn-secondary" data-cd="print">🖨️ 인쇄</button>
            <button class="btn btn-secondary admin-only" data-cd="settings">⚙️ 시트 설정</button>
            <button class="btn btn-secondary admin-only" data-cd="appendFile">📥 파일 추가</button>
            <button class="btn btn-secondary admin-only" data-cd="delSheet" style="color:#c92a2a;">🗑️</button>
        </div>
    </div>`;

    html += `<div class="cd-filter">
        ${scopeTabs.length ? `<div class="cd-scopes">
            ${scopeTabs.map(s => `<button class="cd-scope${scopeFilter === s ? ' active' : ''}" data-cd="scope" data-v="${esc(s)}">${esc(s)} <b>${rows.filter(r => r.scope === s).length}</b></button>`).join('')}
        </div>` : ''}
        <input type="search" id="cdSearch" placeholder="🔍 검색 (IP·장소·이름 등)" value="${esc(searchTerm)}">
        <button class="btn btn-primary" data-cd="addRow">➕ 행 추가</button>
    </div>`;

    html += `<div class="cd-tablewrap"><table class="cd-table"><thead>${headHtml(sheet)}</thead><tbody>${bodyHtml(sheet)}</tbody></table></div>`;
    html += `<div class="cd-foot">셀을 눌러 바로 고칠 수 있습니다. 저장 버튼은 없습니다 — 입력하면 즉시 모두에게 반영됩니다.</div>`;

    page.innerHTML = shell(html);
    bind(page);
    renderPresence();
    paintLocks();
    const wrapNew = page.querySelector('.cd-tablewrap');
    if (wrapNew && keepScroll) { wrapNew.scrollTop = keepScroll.t; wrapNew.scrollLeft = keepScroll.l; }
    if (searchFocused) {
        const s = page.querySelector('#cdSearch');
        if (s) { s.focus(); try { s.setSelectionRange(searchCaret, searchCaret); } catch (e) { } }
    }
    if (edit) reopenEditor();
}

function headHtml(sheet) {
    const cols = sheet.columns || [];
    return `<tr>
        ${cols.map(c => `<th class="cd-th" style="min-width:${c.width || 120}px">${esc(c.label)}${c.type !== 'text' && c.type !== 'seq' ? `<span class="cd-ttype">${esc(typeLabel(c.type))}</span>` : ''}</th>`).join('')}
        <th class="cd-th cd-metacol">최종 수정</th>
        <th class="cd-th cd-rowmenu"></th>
    </tr>`;
}

function visibleRows(sheet) {
    let list = rows;
    if (scopeFilter) list = list.filter(r => r.scope === scopeFilter);
    const q = searchTerm.trim().toLowerCase();
    if (q) list = list.filter(r => Object.values(r.cells || {}).some(v => String(v || '').toLowerCase().includes(q)) || String(r.scope || '').toLowerCase().includes(q));
    return list;
}

function bodyHtml(sheet) {
    const cols = sheet.columns || [];
    const list = visibleRows(sheet);
    if (!list.length) {
        return `<tr><td class="cd-none" colspan="${cols.length + 2}">${rows.length ? '검색 결과가 없습니다.' : '아직 행이 없습니다. ➕ 행 추가를 눌러 시작하세요.'}</td></tr>`;
    }
    let seq = {};
    return list.map(r => {
        const editable = canEdit(sheet, r);
        seq[r.scope || ''] = (seq[r.scope || ''] || 0) + 1;
        const tds = cols.map(c => {
            const raw = (r.cells || {})[c.key];
            const err = cellError(c, raw, rows, r.id);
            const disp = c.type === 'seq' ? seq[r.scope || ''] : cellDisplay(c, raw);
            return `<td class="cd-td${editable && c.type !== 'seq' ? '' : ' cd-ro'}${err ? ' cd-err' : ''}"
                data-row="${esc(r.id)}" data-col="${esc(c.key)}" data-type="${esc(c.type)}"
                ${err ? `title="${esc(err)}"` : ''}>${c.type === 'check' ? (raw ? '✅' : '') : esc(disp)}</td>`;
        }).join('');
        return `<tr data-row="${esc(r.id)}">
            ${tds}
            <td class="cd-td cd-ro cd-metacol">${esc(r.updatedBy || '')}${r.updatedAt && r.updatedAt.seconds ? `<br><span class="cd-ago">${fmtWhen(r.updatedAt.seconds * 1000)}</span>` : ''}</td>
            <td class="cd-td cd-ro cd-rowmenu">${editable ? `<button class="cd-x" data-cd="rowMenu" data-id="${esc(r.id)}" title="행 메뉴">⋯</button>` : '🔒'}</td>
        </tr>`;
    }).join('');
}

function cellDisplay(col, v) {
    if (v == null || v === '') return '';
    if (col.type === 'number') return String(v);
    return String(v);
}
function hashIdx(s) { let h = 0; for (const ch of String(s || '')) h = (h * 31 + ch.charCodeAt(0)) % 6; return h; }
function fmtWhen(ms) {
    const d = new Date(ms), n = Date.now();
    const diff = (n - ms) / 1000;
    if (diff < 60) return '방금';
    if (diff < 3600) return Math.floor(diff / 60) + '분 전';
    if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
    return `${d.getMonth() + 1}.${d.getDate()}`;
}

function renderPresence() {
    const el = document.getElementById('cdPresence');
    if (!el) return;
    if (!presence.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<span class="cd-live">● 접속</span>` + presence.map(p =>
        `<span class="cd-avatar cd-sc-${hashIdx(p.name)}" title="${esc(p.name)}${p.scope ? ' · ' + esc(p.scope) : ''}">${esc((p.name || '?').slice(-2))}</span>`).join('');
}

// 다른 사람이 편집 중인 셀에 테두리 표시
function paintLocks() {
    document.querySelectorAll('#page-codocs .cd-td.cd-busy').forEach(td => {
        td.classList.remove('cd-busy'); td.removeAttribute('data-busy');
    });
    presence.forEach(p => {
        if (!p.cell) return;
        const [rid, ckey] = p.cell.split(':');
        const td = document.querySelector(`#page-codocs .cd-td[data-row="${CSS.escape(rid)}"][data-col="${CSS.escape(ckey)}"]`);
        if (td) { td.classList.add('cd-busy'); td.setAttribute('data-busy', p.name || ''); }
    });
}

/* ===================== 이벤트 바인딩 ===================== */
function bind(page) {
    page.querySelectorAll('[data-cd]').forEach(el => {
        el.addEventListener('click', ev => {
            ev.preventDefault();
            handle(el.dataset.cd, el);
        });
    });
    const s = page.querySelector('#cdSearch');
    if (s) {
        s.addEventListener('input', () => { searchTerm = s.value; const sheet = currentSheet(); const tb = page.querySelector('.cd-table tbody'); if (tb && sheet) { tb.innerHTML = bodyHtml(sheet); bindCells(page); paintLocks(); } });
    }
    const ni = page.querySelector('#cdNameInput');
    if (ni) ni.addEventListener('keydown', e => { if (e.key === 'Enter') handle('saveName'); });
    bindCells(page);
}

function bindCells(page) {
    page.querySelectorAll('.cd-table tbody .cd-td:not(.cd-ro)').forEach(td => {
        td.addEventListener('click', () => openEditor(td));
    });
}

function handle(action, el) {
    const sheet = currentSheet();
    switch (action) {
        case 'saveName': {
            const v = (document.getElementById('cdNameInput') || {}).value || '';
            const n = v.trim();
            const m = allStaff().find(s => s.name === n);
            if (!m) { toast(`"${n}" 은(는) 명부에 없습니다`, 'error'); return; }
            const h = HOST();
            if (h.setIdentity) h.setIdentity(m.id, m.name);
            else { localStorage.setItem('airoom_ws_staffId', m.id); localStorage.setItem('airoom_ws_name', m.name); }
            localStorage.removeItem('airoom_codocs_scope');
            toast(`${m.name} 님으로 설정했습니다`, 'success');
            render(); startBeat();
            return;
        }
        case 'changeName': return openIdentityModal();
        case 'sheet': {
            if (edit) commitEdit();
            leave();
            activeSheetId = el.dataset.id; scopeFilter = null; searchTerm = '';
            watchRows(); render(); startBeat();
            return;
        }
        case 'scope': scopeFilter = el.dataset.v; render(); return;
        case 'newSheet': return openSheetModal(null);
        case 'settings': return openSheetModal(sheet);
        case 'importSheet': return openImportModal('new');
        case 'members': return openMembersModal();
        case 'myip': return openIpModal(null);
        case 'appendFile': return openImportModal('append');
        case 'addRow': return addRow();
        case 'rowMenu': return openRowMenu(el.dataset.id, el);
        case 'export': return exportSheet(el.dataset.fmt);
        case 'copyTsv': return copyTsv();
        case 'print': return printSheet();
        case 'delSheet': return deleteSheet();
    }
}

/* ===================== 셀 편집 ===================== */
function tdOf(rowId, colKey) {
    return document.querySelector(`#page-codocs .cd-td[data-row="${CSS.escape(rowId)}"][data-col="${CSS.escape(colKey)}"]`);
}

function openEditor(tdIn) {
    const sheet = currentSheet(); if (!sheet) return;
    const rowId = tdIn.dataset.row, colKey = tdIn.dataset.col;
    // 이전 셀 커밋은 재렌더를 유발하므로, 커밋 후 td를 다시 찾아야 한다 (참조가 끊김)
    if (edit && (edit.rowId !== rowId || edit.colKey !== colKey)) commitEdit();
    else if (edit) return;
    const td = tdOf(rowId, colKey) || tdIn;
    const col = (sheet.columns || []).find(c => c.key === colKey); if (!col) return;
    const row = rows.find(r => r.id === rowId); if (!row) return;
    if (!canEdit(sheet, row)) { toast('본인 소속 행만 편집할 수 있습니다', 'error'); return; }

    if (col.type === 'check') {
        saveCell(rowId, colKey, !(row.cells || {})[colKey] ? '1' : '');
        return;
    }
    const cur = (row.cells || {})[colKey] || '';
    edit = { rowId, colKey, value: cur };
    td.classList.add('cd-editing');
    td.innerHTML = editorHtml(col, cur);
    const input = td.querySelector('input,select,textarea');
    if (!input) return;
    input.focus();
    if (input.select) try { input.select(); } catch (e) { }
    input.addEventListener('input', () => { edit.value = input.value; });
    input.addEventListener('change', () => { edit.value = input.value; if (col.type === 'select' || col.type === 'date' || col.type === 'staff') commitEdit(); });
    input.addEventListener('blur', () => { setTimeout(() => { if (edit && edit.rowId === rowId && edit.colKey === colKey) commitEdit(); }, 120); });
    input.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); const r = edit; edit = null; render(); return; }
        if (e.key === 'Enter' && col.type !== 'memo') { e.preventDefault(); commitEdit(); moveFocus(rowId, colKey, 1, 0); }
        if (e.key === 'Tab') { e.preventDefault(); commitEdit(); moveFocus(rowId, colKey, 0, e.shiftKey ? -1 : 1); }
    });
    beat(rowId + ':' + colKey);
}

function editorHtml(col, cur) {
    if (col.type === 'select') {
        const opts = col.options || [];
        return `<select class="cd-input"><option value=""></option>${opts.map(o => `<option value="${esc(o)}"${o === cur ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    }
    if (col.type === 'staff') {
        return `<input class="cd-input" list="cdStaffAll" value="${esc(cur)}"><datalist id="cdStaffAll">${allStaff().map(s => `<option value="${esc(s.name)}">`).join('')}</datalist>`;
    }
    if (col.type === 'position') {
        const list = [...new Set(allStaff().map(s => s.position).filter(Boolean))];
        return `<input class="cd-input" list="cdPosAll" value="${esc(cur)}"><datalist id="cdPosAll">${list.map(o => `<option value="${esc(o)}">`).join('')}</datalist>`;
    }
    if (col.type === 'date') return `<input class="cd-input" type="date" value="${esc(cur)}">`;
    if (col.type === 'memo') return `<textarea class="cd-input" rows="2">${esc(cur)}</textarea>`;
    if (col.type === 'number') return `<input class="cd-input" type="number" value="${esc(cur)}">`;
    const ph = col.type === 'ip' ? '예: 192.168.0.10' : col.type === 'mac' ? '예: AA:BB:CC:DD:EE:FF' : '';
    return `<input class="cd-input" type="text" value="${esc(cur)}" placeholder="${ph}">`;
}

// 원격 변경으로 표가 다시 그려져도, 입력 중이던 셀은 입력값 그대로 되살린다
function reopenEditor() {
    if (!edit) return;
    const td = tdOf(edit.rowId, edit.colKey);
    if (!td) { edit = null; return; }
    const keep = edit.value;
    edit = null;
    openEditor(td);
    if (edit) {
        edit.value = keep;
        const i = td.querySelector('input,select,textarea');
        if (i) { i.value = keep; try { i.setSelectionRange(String(keep).length, String(keep).length); } catch (e) { } }
    }
}

function commitEdit() {
    if (!edit) return;
    const { rowId, colKey, value } = edit;
    edit = null;
    const row = rows.find(r => r.id === rowId);
    const old = row ? ((row.cells || {})[colKey] || '') : '';
    if (String(value) !== String(old)) {
        // 낙관적 반영 — 서버 스냅샷이 오기 전에도 화면이 바로 바뀌게
        if (row) { row.cells = row.cells || {}; row.cells[colKey] = value; row.updatedBy = myName() || ''; }
        render();
        saveCell(rowId, colKey, value);
    } else render();
    beat('');
}

function moveFocus(rowId, colKey, dRow, dCol) {
    const sheet = currentSheet(); if (!sheet) return;
    const list = visibleRows(sheet);
    const cols = (sheet.columns || []).filter(c => c.type !== 'seq');
    let ri = list.findIndex(r => r.id === rowId), ci = cols.findIndex(c => c.key === colKey);
    if (ri < 0 || ci < 0) return;
    ri += dRow; ci += dCol;
    if (ci >= cols.length) { ci = 0; ri++; }
    if (ci < 0) { ci = cols.length - 1; ri--; }
    if (ri < 0 || ri >= list.length) return;
    setTimeout(() => {
        const td = document.querySelector(`#page-codocs .cd-td[data-row="${CSS.escape(list[ri].id)}"][data-col="${CSS.escape(cols[ci].key)}"]`);
        if (td && !td.classList.contains('cd-ro')) openEditor(td);
    }, 60);
}

async function saveCell(rowId, colKey, value) {
    try {
        const sheet = currentSheet();
        const patch = {
            ['cells.' + colKey]: value,
            updatedBy: myName() || '',
            updatedAt: serverTimestamp()
        };
        // 이름 칸을 고치면 직위 칸도 명부 값으로 같이 맞춘다
        const staffCol = sheet && staffColOf(sheet), posCol = sheet && positionColOf(sheet);
        if (staffCol && posCol && colKey === staffCol.key) {
            const m = memberOf(String(value || '').trim());
            if (m && m.position) patch['cells.' + posCol.key] = m.position;
        }
        await updateDoc(doc(db, 'codocs_sheets', activeSheetId, 'rows', rowId), patch);
    } catch (e) { toast('저장 실패: ' + e.message, 'error'); render(); }
}

/* ===================== 행 조작 ===================== */
async function addRow() {
    const sheet = currentSheet(); if (!sheet) return;
    if (!myName()) { toast('먼저 본인 이름을 입력해주세요', 'error'); return; }
    const scope = scopeFilter || myScope(sheet) || (sheet.scopes || [])[0] || '';
    if (!canEdit(sheet, { scope })) { toast('이 구분에는 행을 추가할 수 없습니다', 'error'); return; }
    const cells = {};
    (sheet.columns || []).forEach(c => { if (c.def) cells[c.key] = c.def; });
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.order || 0), 0);
    const id = 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    try {
        await setDoc(doc(db, 'codocs_sheets', activeSheetId, 'rows', id), {
            scope, cells, owner: myName() || '', order: maxOrder + 1000,
            updatedBy: myName() || '', updatedAt: serverTimestamp()
        });
    } catch (e) { toast('행 추가 실패: ' + e.message, 'error'); }
}

function openRowMenu(rowId, anchor) {
    const sheet = currentSheet(); if (!sheet) return;
    const row = rows.find(r => r.id === rowId); if (!row) return;
    const scopes = sheet.scopes || [];
    modal('행 편집', `
        <div class="cd-menu">
            ${scopes.length ? `<label class="cd-f"><span>구분</span><select id="cdRowScope">${scopes.map(s => `<option value="${esc(s)}"${s === row.scope ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></label>` : ''}
            <div class="cd-menubtns">
                ${(sheet.columns || []).some(c => c.type === 'ip') ? '<button class="btn btn-secondary" data-act="myip" style="grid-column:1/-1;">📝 기기 정보 수정</button>' : ''}
                <button class="btn btn-secondary" data-act="up">⬆️ 위로</button>
                <button class="btn btn-secondary" data-act="down">⬇️ 아래로</button>
                <button class="btn btn-secondary" data-act="dup">📄 복제</button>
                <button class="btn btn-secondary" data-act="del" style="color:#c92a2a;">🗑️ 행 삭제</button>
            </div>
        </div>`, async (body, close) => {
        const sel = body.querySelector('#cdRowScope');
        if (sel) sel.addEventListener('change', async () => {
            await updateDoc(doc(db, 'codocs_sheets', activeSheetId, 'rows', rowId), { scope: sel.value, updatedBy: myName() || '', updatedAt: serverTimestamp() });
            toast('구분을 옮겼습니다', 'success');
        });
        body.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', async () => {
            const a = b.dataset.act;
            if (a === 'myip') { close(); openIpModal(rowId); return; }
            const idx = rows.findIndex(r => r.id === rowId);
            try {
                if (a === 'del') {
                    if (!confirm('이 행을 삭제할까요? 되돌릴 수 없습니다.')) return;
                    await deleteDoc(doc(db, 'codocs_sheets', activeSheetId, 'rows', rowId));
                } else if (a === 'dup') {
                    const id = 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                    await setDoc(doc(db, 'codocs_sheets', activeSheetId, 'rows', id), {
                        scope: row.scope || '', cells: { ...(row.cells || {}) }, owner: myName() || '',
                        order: (row.order || 0) + 1, updatedBy: myName() || '', updatedAt: serverTimestamp()
                    });
                } else if (a === 'up' && idx > 0) {
                    const other = rows[idx - 1];
                    const b1 = writeBatch(db);
                    b1.update(doc(db, 'codocs_sheets', activeSheetId, 'rows', rowId), { order: other.order || 0 });
                    b1.update(doc(db, 'codocs_sheets', activeSheetId, 'rows', other.id), { order: row.order || 0 });
                    await b1.commit();
                } else if (a === 'down' && idx >= 0 && idx < rows.length - 1) {
                    const other = rows[idx + 1];
                    const b2 = writeBatch(db);
                    b2.update(doc(db, 'codocs_sheets', activeSheetId, 'rows', rowId), { order: other.order || 0 });
                    b2.update(doc(db, 'codocs_sheets', activeSheetId, 'rows', other.id), { order: row.order || 0 });
                    await b2.commit();
                }
            } catch (e) { toast('실패: ' + e.message, 'error'); }
            close();
        }));
    });
}

/* ===================== 본인 소속 변경 ===================== */
function openIdentityModal() {
    const sheet = currentSheet();
    const scopes = (sheet && sheet.scopes) || ['본교', '수정분교'];
    modal('이름 · 소속 설정', `
        <label class="cd-f"><span>이름</span><input id="cdMName" list="cdStaffList2" value="${esc(myName() || '')}"><datalist id="cdStaffList2">${allStaff().map(s => `<option value="${esc(s.name)}">${esc(s.position || '')}</option>`).join('')}</datalist></label>
        <label class="cd-f"><span>소속</span><select id="cdMScope">${scopes.map(s => `<option value="${esc(s)}"${s === myScope(sheet) ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
        <div class="cd-hint">명부(관리 모드 → 👥 학교 사용자)에 소속이 지정돼 있으면 그 값이 우선합니다. 여기서 고른 소속은 명부에 없는 사람에게만 적용되며 이 브라우저에만 저장됩니다.</div>
        <div class="cd-modalfoot"><button class="btn btn-secondary" data-act="clear">이름 지우기</button><button class="btn btn-primary" data-act="ok">저장</button></div>`,
        (body, close) => {
            body.querySelector('[data-act=ok]').addEventListener('click', () => {
                const n = (body.querySelector('#cdMName').value || '').trim();
                const m = allStaff().find(s => s.name === n);
                if (!m) { toast(`"${n}" 은(는) 명부에 없습니다`, 'error'); return; }
                const h = HOST();
                if (h.setIdentity) h.setIdentity(m.id, m.name);
                else { localStorage.setItem('airoom_ws_staffId', m.id); localStorage.setItem('airoom_ws_name', m.name); }
                localStorage.setItem('airoom_codocs_scope', body.querySelector('#cdMScope').value);
                close(); render(); startBeat();
            });
            body.querySelector('[data-act=clear]').addEventListener('click', () => {
                localStorage.removeItem('airoom_ws_staffId'); localStorage.removeItem('airoom_ws_name');
                localStorage.removeItem('airoom_codocs_scope');
                close(); leave(); render();
            });
        });
}

/* ===================== 내 IP 확인 =====================
 * ⚠ 브라우저는 사설 IP(192.168.x.x)를 그냥 알려주지 않는다.
 *   요즘 크롬/엣지는 WebRTC 후보를 mDNS(xxxx.local)로 가려서 LAN 주소가 안 나온다.
 *   그래서 2단으로 간다:
 *     1) WebRTC로 사설 IP를 시도 — 나오면 원클릭. 가려지면 그 칸을 통째로 숨긴다.
 *     2) `ipconfig /all` 결과 붙여넣기 — IP·서브넷·게이트웨이·MAC을 전부 뽑아 자동으로 채운다.
 *   공인 IP는 기기별 대장에 적을 값이 아니라 화면에서 뺐다(2026-09-07, 사용자 지적).
 */
const RE_PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

// WebRTC ICE 후보에서 사설 IPv4를 긁어본다. mDNS로 가려지면 빈 배열.
function localIps(timeoutMs = 1500) {
    return new Promise(resolve => {
        const found = new Set();
        let pc;
        try { pc = new RTCPeerConnection({ iceServers: [] }); }
        catch (e) { return resolve([]); }
        const done = () => { try { pc.close(); } catch (e) { } resolve([...found]); };
        const timer = setTimeout(done, timeoutMs);
        pc.onicecandidate = ev => {
            if (!ev.candidate) { clearTimeout(timer); return done(); }
            const m = String(ev.candidate.candidate || '').match(/(\d{1,3}(?:\.\d{1,3}){3})/);
            if (m && RE_IP.test(m[1]) && RE_PRIVATE.test(m[1])) found.add(m[1]);
        };
        try {
            pc.createDataChannel('x');
            pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => { clearTimeout(timer); done(); });
        } catch (e) { clearTimeout(timer); done(); }
    });
}

/* `ipconfig /all`(한/영), `ifconfig`, `ip addr` 출력에서 IP·서브넷·게이트웨이·MAC을 뽑는다.
   어댑터가 여러 개면 게이트웨이가 있는 것을 우선하고, 169.254.x(자동 구성)와 루프백은 버린다. */
function parseIpconfig(text) {
    const src = String(text || '').replace(/\r\n/g, '\n');
    if (!src.trim()) return null;

    // 빈 줄이 이어지는 지점을 어댑터 경계로 본다. ipconfig는 어댑터마다 빈 줄로 구분된다.
    const blocks = src.split(/\n\s*\n/).filter(b => /\d{1,3}(\.\d{1,3}){3}/.test(b));
    const cands = (blocks.length ? blocks : [src]).map(b => {
        const pick = (...res) => { for (const re of res) { const m = b.match(re); if (m) return m[1].trim(); } return ''; };
        const ip = pick(
            /IPv4[^\n:]*:\s*([\d.]+)/i,                       // ipconfig (한글/영문 공통 라벨)
            /inet\s+(?:addr:)?([\d.]+)/i                       // ifconfig / ip addr
        );
        const mask = pick(
            /(?:서브넷 마스크|Subnet Mask)[^\n:]*:\s*([\d.]+)/i,
            /(?:netmask|Mask:)\s*([\d.]+)/i
        );
        const gw = pick(
            /(?:기본 게이트웨이|Default Gateway)[^\n:]*:\s*([\d.]+)/i,
            /(?:^|\n)\s*default via\s+([\d.]+)/i
        );
        const mac = pick(
            /(?:물리적 주소|Physical Address)[^\n:]*:\s*([0-9A-Fa-f]{2}(?:[-:][0-9A-Fa-f]{2}){5})/i,
            /(?:ether|HWaddr|link\/ether)\s+([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})/i
        );
        return { ip, mask, gw, mac: mac ? mac.toUpperCase().replace(/-/g, ':') : '' };
    }).filter(c => c.ip && RE_IP.test(c.ip) && !/^127\./.test(c.ip) && !/^169\.254\./.test(c.ip));

    if (!cands.length) return null;
    // 게이트웨이가 있는 어댑터 = 실제로 쓰는 랜카드. 없으면 사설 IP, 그것도 없으면 첫 번째.
    return cands.find(c => c.gw) || cands.find(c => RE_PRIVATE.test(c.ip)) || cands[0];
}

/* 감지한 값을 시트 열에 맞춰 채운다. 열 타입(ip/mac)과 key·라벨(서브넷/게이트웨이)로 짝을 찾는다. */
function netFieldMap(sheet) {
    const cols = sheet.columns || [];
    const byKeyOrLabel = (...words) => cols.find(c =>
        words.some(w => (c.key || '').toLowerCase().includes(w) || (c.label || '').replace(/\s/g, '').includes(w)));
    return {
        ip: cols.find(c => c.type === 'ip'),
        mac: cols.find(c => c.type === 'mac'),
        mask: byKeyOrLabel('mask', '서브넷', '마스크'),
        gw: byKeyOrLabel('gw', 'gateway', '게이트웨이')
    };
}

function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* 한 창에서 기기 정보를 전부 받아 행 하나로 저장한다.
   ipconfig 붙여넣기는 네트워크 칸(IP·서브넷·게이트웨이·MAC)을 채워주는 보조 수단일 뿐,
   장소·기기종류 같은 나머지 칸은 사람이 여기서 같이 적는다. 끝에 "행 추가" 한 번으로 끝난다. */
/* 교직원 이름 열과 짝이 되는 직위 열을 찾는다. 명시적 타입이 1순위, 옛 시트 호환으로 라벨도 본다. */
function positionColOf(sheet) {
    const cols = (sheet.columns || []);
    return cols.find(c => c.type === 'position')
        || cols.find(c => /직위|position/i.test(c.label || '') || /^(pos|position)$/i.test(c.key || ''));
}
function staffColOf(sheet) { return (sheet.columns || []).find(c => c.type === 'staff'); }

function openIpModal(rowId) {
    const sheet = currentSheet();
    if (!sheet) return;
    const map = netFieldMap(sheet);
    const netKeys = new Set(['ip', 'mask', 'gw', 'mac'].map(k => map[k] && map[k].key).filter(Boolean));
    const cols = (sheet.columns || []).filter(c => c.type !== 'seq');
    const row = rowId ? rows.find(r => r.id === rowId) : null;
    const scopes = sheet.scopes || [];
    let busy = false, pasteTimer = null;

    // 초기값: 기존 행이면 그 값, 새 행이면 열 기본값 + 본인 이름 + 오늘 날짜
    const values = {};
    cols.forEach(c => {
        let v = row ? ((row.cells || {})[c.key] || '') : (c.def || '');
        if (!row && !v) {
            if (c.type === 'staff') v = myName() || '';
            else if (c.type === 'date') v = todayIso();
        }
        values[c.key] = v;
    });
    let scope = row ? (row.scope || '') : (scopeFilter || myScope(sheet) || scopes[0] || '');

    const field = c => {
        const v = values[c.key] || '';
        const auto = netKeys.has(c.key) ? '<span class="cd-auto">자동</span>' : '';
        let input;
        if (c.type === 'select') {
            input = `<select data-k="${esc(c.key)}"><option value=""></option>${(c.options || []).map(o => `<option value="${esc(o)}"${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
        } else if (c.type === 'staff') {
            input = `<input data-k="${esc(c.key)}" list="cdFormStaff" value="${esc(v)}">`;
        } else if (c.type === 'position') {
            input = `<input data-k="${esc(c.key)}" list="cdFormPos" value="${esc(v)}">`;
        } else if (c.type === 'date') {
            input = `<input data-k="${esc(c.key)}" type="date" value="${esc(v)}">`;
        } else if (c.type === 'memo') {
            input = `<textarea data-k="${esc(c.key)}" rows="2">${esc(v)}</textarea>`;
        } else if (c.type === 'number') {
            input = `<input data-k="${esc(c.key)}" type="number" value="${esc(v)}">`;
        } else if (c.type === 'check') {
            input = `<input data-k="${esc(c.key)}" type="checkbox"${v ? ' checked' : ''} style="width:auto;">`;
        } else {
            const ph = c.type === 'ip' ? '192.168.0.10' : c.type === 'mac' ? 'AA:BB:CC:DD:EE:FF' : '';
            input = `<input data-k="${esc(c.key)}" value="${esc(v)}" placeholder="${ph}">`;
        }
        return `<label class="cd-f"><span>${esc(c.label)}${auto}</span>${input}</label>`;
    };

    modal(rowId ? '📝 기기 정보 수정' : '➕ 내 기기 등록', `
        <div class="cd-ipsec">
            <div class="cd-iplabel">네트워크 정보 자동 입력 <span class="cd-hint" style="font-weight:400;">(선택 — 직접 적어도 됩니다)</span></div>
            <div class="cd-hint" style="margin:2px 0 6px;">
                ① 아래 <b>명령 복사</b> → ② <b>⊞Win+R</b> 누르고 <b>Ctrl+V</b>, Enter (검은 창이 잠깐 떴다 사라집니다)
                → ③ 아래 상자에 <b>Ctrl+V</b>. 결과가 바로 클립보드에 담기므로 창에서 긁을 필요가 없습니다.
            </div>
            <div class="cd-cmdrow">
                <code>cmd /c "ipconfig /all | clip"</code>
                <button class="btn btn-secondary" data-act="copyCmd">명령 복사</button>
            </div>
            <div id="cdLocSec" style="display:none;margin-top:8px;"><div id="cdLocIp"></div></div>
            <textarea id="cdPaste2" rows="3" placeholder="여기에 붙여넣으면 IP·서브넷·게이트웨이·MAC이 아래에 채워집니다" style="margin-top:8px;"></textarea>
            <div id="cdIpStat" class="cd-hint" style="margin-top:4px;"></div>
        </div>
        <div class="cd-ipsec">
            <div class="cd-iplabel">기기 정보</div>
            ${scopes.length ? `<label class="cd-f"><span>구분</span><select id="cdFormScope">${scopes.map(o => `<option value="${esc(o)}"${o === scope ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>` : ''}
            <div class="cd-grid2" id="cdFormFields">${cols.map(field).join('')}</div>
            <datalist id="cdFormStaff">${allStaff().map(m => `<option value="${esc(m.name)}">${esc(m.position || '')}</option>`).join('')}</datalist>
            <datalist id="cdFormPos">${[...new Set(allStaff().map(m => m.position).filter(Boolean))].map(o => `<option value="${esc(o)}">`).join('')}</datalist>
        </div>
        <div class="cd-modalfoot">
            <span class="cd-hint" id="cdFormStat" style="flex:1;"></span>
            <button class="btn btn-primary" data-act="save">${rowId ? '저장' : '➕ 행 추가'}</button>
        </div>`, (root, close) => {
        const stat = root.querySelector('#cdIpStat');
        const fstat = root.querySelector('#cdFormStat');
        const box = root.querySelector('#cdFormFields');

        const grab = el => el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value;
        const staffCol = staffColOf(sheet), posCol = positionColOf(sheet);
        // 이름을 고르면 직위는 명부에서 끌어와 자동으로 채운다
        const syncPosition = () => {
            if (!staffCol || !posCol) return;
            const m = memberOf((values[staffCol.key] || '').trim());
            if (!m || !m.position) return;
            values[posCol.key] = m.position;
            const el = box.querySelector(`[data-k="${CSS.escape(posCol.key)}"]`);
            if (el) el.value = m.position;
        };
        const onField = e => {
            const k = e.target.dataset.k;
            if (!k) return;
            values[k] = grab(e.target);
            if (staffCol && k === staffCol.key) syncPosition();
        };
        box.addEventListener('input', onField);
        box.addEventListener('change', onField);
        syncPosition();
        const scopeSel = root.querySelector('#cdFormScope');
        if (scopeSel) scopeSel.addEventListener('change', () => { scope = scopeSel.value; });

        // 파싱 결과를 폼에 밀어 넣는다. 자동 칸이므로 이미 적힌 값도 최신 값으로 덮는다.
        const applyNet = got => {
            const filled = [];
            ['ip', 'mask', 'gw', 'mac'].forEach(k => {
                if (!map[k] || !got[k]) return;
                values[map[k].key] = got[k];
                const el = box.querySelector(`[data-k="${CSS.escape(map[k].key)}"]`);
                if (el) el.value = got[k];
                filled.push(map[k].label);
            });
            stat.innerHTML = filled.length
                ? `<span style="color:var(--success-dark);">✓ ${esc(filled.join(' · '))} 채웠습니다. 아래 나머지 칸을 마저 적고 행 추가를 누르세요.</span>`
                : '이 시트에는 네트워크 칸이 없습니다.';
        };

        // 브라우저가 내부 주소를 알려주는 환경이면(크롬 WebRtcLocalIpsAllowedUrls 정책 등)
        // 아무것도 누르지 않아도 IP 칸이 채워진다. 못 알아내면 이 칸은 아예 안 뜬다.
        localIps().then(list => {
            if (!list.length) return;
            const el = root.querySelector('#cdLocIp');
            root.querySelector('#cdLocSec').style.display = '';
            const ipCol = map.ip;
            const already = ipCol && (values[ipCol.key] || '').trim();
            if (!already) applyNet({ ip: list[0] });
            el.innerHTML = `<div class="cd-hint" style="margin-bottom:4px;">${already ? '이 컴퓨터에서 찾은 주소 — 누르면 IP 칸에 들어갑니다'
                : list.length > 1 ? '이 컴퓨터에서 찾은 주소를 자동으로 넣었습니다. 랜카드가 여러 개면 눌러서 바꾸세요.'
                    : '이 컴퓨터에서 찾은 주소를 자동으로 넣었습니다.'}</div>` +
                list.map(ip => `<button class="cd-ippick${!already && ip === list[0] ? ' on' : ''}" data-ip="${esc(ip)}">${esc(ip)}</button>`).join('');
            el.querySelectorAll('.cd-ippick').forEach(b => b.addEventListener('click', () => {
                el.querySelectorAll('.cd-ippick').forEach(x => x.classList.remove('on'));
                b.classList.add('on');
                applyNet({ ip: b.dataset.ip });
            }));
        });

        root.querySelector('[data-act=copyCmd]').addEventListener('click', () => {
            navigator.clipboard.writeText('cmd /c "ipconfig /all | clip"')
                .then(() => toast('명령을 복사했습니다 — cmd 창에 붙여넣으세요', 'success'))
                .catch(() => toast('복사 실패 — 직접 입력해주세요', 'error'));
        });

        root.querySelector('#cdPaste2').addEventListener('input', e => {
            const text = e.target.value;
            clearTimeout(pasteTimer);
            if (!text.trim()) { stat.textContent = ''; return; }
            stat.textContent = '읽는 중…';
            pasteTimer = setTimeout(() => {
                const got = parseIpconfig(text);
                if (got && got.ip) applyNet(got);
                else stat.textContent = '주소를 찾지 못했습니다 — ipconfig /all 결과를 통째로 붙여넣어 주세요.';
            }, 350);
        });

        root.querySelector('[data-act=save]').addEventListener('click', async ev => {
            if (busy) return;
            const btn = ev.currentTarget;
            // 형식·중복은 막고, 빈 칸은 나중에 채우도록 허용한다
            for (const c of cols) {
                const err = cellError(c, values[c.key], rows, rowId || '');
                if (err) { fstat.innerHTML = `<span style="color:#c92a2a;">${esc(c.label)}: ${esc(err)}</span>`; return; }
            }
            if (!cols.some(c => (values[c.key] || '').trim())) {
                fstat.innerHTML = '<span style="color:#c92a2a;">입력한 내용이 없습니다.</span>'; return;
            }
            busy = true; btn.disabled = true; btn.textContent = '저장 중…';
            try {
                await saveIpRow(rowId, values, scope, cols);
                close();
            } catch (e) {
                busy = false; btn.disabled = false; btn.textContent = rowId ? '저장' : '➕ 행 추가';
                fstat.innerHTML = `<span style="color:#c92a2a;">${esc(e.message)}</span>`;
            }
        });
    }, 640);
}

async function saveIpRow(rowId, values, scope, cols) {
    const sheet = currentSheet();
    if (!sheet) throw new Error('시트를 찾을 수 없습니다');
    if (!myName()) throw new Error('먼저 본인 이름을 입력해주세요');
    const cells = {};
    cols.forEach(c => { const v = (values[c.key] || '').trim(); if (v) cells[c.key] = v; });

    if (rowId) {
        const row = rows.find(r => r.id === rowId);
        if (!canEdit(sheet, row)) throw new Error('이 행은 편집할 수 없습니다');
        await updateDoc(doc(db, 'codocs_sheets', activeSheetId, 'rows', rowId), {
            cells, scope, updatedBy: myName(), updatedAt: serverTimestamp()
        });
        toast('저장했습니다', 'success');
        return;
    }
    if (!canEdit(sheet, { scope })) throw new Error('이 구분에는 행을 추가할 수 없습니다');
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.order || 0), 0);
    const id = 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await setDoc(doc(db, 'codocs_sheets', activeSheetId, 'rows', id), {
        scope, cells, owner: myName(), order: maxOrder + 1000,
        updatedBy: myName(), updatedAt: serverTimestamp()
    });
    const ipCol = (sheet.columns || []).find(c => c.type === 'ip');
    toast(`${scope}${ipCol && cells[ipCol.key] ? ' · ' + cells[ipCol.key] : ''} 행을 추가했습니다`, 'success');
}

/* ===================== 학교 사용자 설정 (명부) =====================
 * 관리 모드에서 이름·직위·소속을 직접 고친다. 저장하는 순간
 *   ① 이름이 바뀐 사람 → 모든 시트의 교직원 셀·담당자(owner)·최종수정자 이름을 따라 바꾸고
 *   ② 소속이 바뀐 사람 → 그 사람이 담당인 행을 새 소속으로 옮기고
 *   ③ 새로 생긴 소속 → 각 시트의 구분(탭) 목록에 추가하고
 *   ④ 모든 시트의 행을 (소속 순서 → 명부 순번 → 기존 순서)로 재정렬해 order를 다시 매긴다.
 * 즉 "바뀐 순간부터 데이터가 새 세팅값 기준으로 다시 줄을 선다".
 */
function openMembersModal() {
    // 아직 명부가 없으면 SPA의 staff.json + 확인대장 추가 인원으로 초기 세팅
    let draft = members.length
        ? members.map(m => ({ id: m.id, name: m.name || '', position: m.position || '', scope: m.scope || guessScope(m.position) }))
        : (HOST().staff || []).map(s => ({ id: s.id, name: s.name || '', position: s.position || '', scope: guessScope(s.position) }));
    const before = new Map(members.map(m => [m.id, { name: m.name, scope: m.scope || guessScope(m.position) }]));
    const removed = new Set();

    modal('👥 학교 사용자 설정', `
        <div class="cd-hint" style="margin-bottom:8px;">
            여기서 정한 <b>이름 · 직위 · 소속</b>이 모든 시트의 기준이 됩니다.
            저장하면 이름이 바뀐 사람의 기록도 함께 고쳐지고, 행이 새 소속 기준으로 다시 정렬됩니다.
        </div>
        <div class="cd-colhead">구성원 <span><button class="btn btn-secondary" data-act="addM" style="font-size:12px;padding:4px 10px;">＋ 행 추가</button></span></div>
        <div class="cd-mhead2"><span>이름</span><span>직위</span><span>소속</span><span></span></div>
        <div id="cdMembers" class="cd-cols" style="max-height:46vh;overflow:auto;"></div>
        <div class="cd-modalfoot">
            <span class="cd-hint" id="cdMStat" style="flex:1;"></span>
            <button class="btn btn-primary" data-act="saveM">저장하고 다시 정렬</button>
        </div>`, (root, close) => {
        const box = root.querySelector('#cdMembers');
        const stat = root.querySelector('#cdMStat');
        const scopeOptions = () => {
            const set = new Set(['본교', '수정분교']);
            draft.forEach(d => { if (d.scope) set.add(d.scope); });
            sheets.forEach(s => (s.scopes || []).forEach(x => set.add(x)));
            return [...set];
        };
        const draw = () => {
            const opts = scopeOptions();
            box.innerHTML = draft.map((m, i) => `
                <div class="cd-col cd-mrow" data-i="${i}">
                    <input class="cd-mn" value="${esc(m.name)}" placeholder="이름">
                    <input class="cd-mp" value="${esc(m.position)}" placeholder="직위 (예: 3-친절)">
                    <input class="cd-ms" value="${esc(m.scope)}" list="cdScopeOpts" placeholder="소속">
                    <button class="cd-cb cd-cdel" title="삭제">✕</button>
                </div>`).join('') + `<datalist id="cdScopeOpts">${opts.map(o => `<option value="${esc(o)}">`).join('')}</datalist>`;
            box.querySelectorAll('.cd-mrow').forEach(el => {
                const i = +el.dataset.i;
                el.querySelector('.cd-mn').addEventListener('input', e => { draft[i].name = e.target.value; });
                el.querySelector('.cd-mp').addEventListener('input', e => { draft[i].position = e.target.value; });
                el.querySelector('.cd-ms').addEventListener('input', e => { draft[i].scope = e.target.value; });
                el.querySelector('.cd-cdel').addEventListener('click', () => {
                    if (draft[i].id && before.has(draft[i].id)) removed.add(draft[i].id);
                    draft.splice(i, 1); draw();
                });
            });
            stat.textContent = `${draft.length}명`;
        };
        draw();

        root.querySelector('[data-act=addM]').addEventListener('click', () => {
            draft.push({ id: 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: '', position: '', scope: '본교' });
            draw();
            const last = box.querySelector('.cd-mrow:last-of-type .cd-mn');
            if (last) last.focus();
        });

        root.querySelector('[data-act=saveM]').addEventListener('click', async ev => {
            const btn = ev.currentTarget;
            const clean = draft.map(d => ({ ...d, name: (d.name || '').trim(), position: (d.position || '').trim(), scope: (d.scope || '').trim() || '본교' }))
                .filter(d => d.name);
            if (!clean.length) { toast('이름이 있는 행이 하나도 없습니다', 'error'); return; }
            const dupe = clean.map(c => c.name).find((n, i, a) => a.indexOf(n) !== i);
            if (dupe) { toast(`이름이 겹칩니다: ${dupe}`, 'error'); return; }

            // 무엇이 바뀌었는지 먼저 계산 (저장 전에 옛 이름을 알아야 전파할 수 있다)
            const renames = [], moved = [];
            clean.forEach(c => {
                const b = before.get(c.id);
                if (!b) return;
                if (b.name && b.name !== c.name) renames.push({ from: b.name, to: c.name });
                if ((b.scope || '') !== c.scope) moved.push({ name: c.name, to: c.scope });
            });

            btn.disabled = true; btn.textContent = '저장 중…';
            try {
                const b = writeBatch(db);
                clean.forEach((c, i) => b.set(doc(db, 'codocs_members', c.id), {
                    name: c.name, position: c.position, scope: c.scope, order: i * 10,
                    updatedBy: myName() || '', updatedAt: serverTimestamp()
                }));
                removed.forEach(id => { if (!clean.find(c => c.id === id)) b.delete(doc(db, 'codocs_members', id)); });
                await b.commit();
                members = clean.map((c, i) => ({ ...c, order: i * 10 }));   // 스냅샷보다 먼저 반영

                btn.textContent = '기록 반영 중…';
                const n = await resyncAll(renames, moved, clean);

                // 본인 이름이 바뀌었으면 로컬 식별값도 따라간다
                const meRen = renames.find(r => r.from === myName());
                if (meRen) {
                    const h = HOST();
                    const rec = clean.find(c => c.name === meRen.to);
                    if (h.setIdentity && rec) h.setIdentity(rec.id, rec.name);
                    else localStorage.setItem('airoom_ws_name', meRen.to);
                }
                localStorage.removeItem('airoom_codocs_scope');   // 명부가 기준이므로 수동 지정은 해제

                toast(n ? `저장 완료 — 기록 ${n}건을 새 설정에 맞춰 정리했습니다` : '저장했습니다', 'success');
                close(); render();
            } catch (e) {
                toast('저장 실패: ' + e.message, 'error');
                btn.disabled = false; btn.textContent = '저장하고 다시 정렬';
            }
        });
    }, 700);
}

/* 행을 (소속 순서 → 명부 순번 → 기존 order)로 줄 세운다. 각 행의 `_holder`가 담당자 이름.
   명부에 없는 소속·사람은 맨 뒤로 보내되 서로의 상대 순서는 유지한다. */
function sortRowsByRoster(list, scopes, roster) {
    const orderOf = name => { const i = roster.findIndex(r => r.name === name); return i < 0 ? 9999 : i; };
    const scopeOf = sc => { const i = scopes.indexOf(sc || ''); return i < 0 ? 999 : i; };
    return list.map((r, i) => ({ r, i })).sort((x, y) => {
        const sa = scopeOf(x.r.scope), sb = scopeOf(y.r.scope);
        if (sa !== sb) return sa - sb;
        const oa = orderOf(x.r._holder), ob = orderOf(y.r._holder);
        if (oa !== ob) return oa - ob;
        const da = (x.r.order || 0) - (y.r.order || 0);
        return da !== 0 ? da : x.i - y.i;
    }).map(x => x.r);
}

/* 명부 변경을 모든 시트에 반영하고 행을 다시 정렬한다. 바뀐 문서 수를 돌려준다. */
async function resyncAll(renames, moved, roster) {
    const renameMap = new Map(renames.map(r => [r.from, r.to]));
    const moveMap = new Map(moved.map(m => [m.name, m.to]));
    const rosterScopes = [...new Set(roster.map(r => r.scope).filter(Boolean))];
    let touched = 0;

    for (const sheet of sheets) {
        const staffKeys = (sheet.columns || []).filter(c => c.type === 'staff').map(c => c.key);
        // ③ 새로 생긴 소속을 구분(탭)에 추가 — 기존 구분은 지우지 않는다(행이 붕 뜨면 안 되므로)
        const scopes = [...(sheet.scopes || [])];
        rosterScopes.forEach(s => { if (!scopes.includes(s)) scopes.push(s); });
        if (scopes.length !== (sheet.scopes || []).length) {
            await updateDoc(doc(db, 'codocs_sheets', sheet.id), { scopes });
            sheet.scopes = scopes;
            touched++;
        }

        const snap = await getDocs(query(collection(db, 'codocs_sheets', sheet.id, 'rows'), orderBy('order')));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // ①② 이름 치환 + 소속 이동
        list.forEach(r => {
            r._patch = {};
            const cells = r.cells || {};
            staffKeys.forEach(k => {
                const v = cells[k];
                if (v && renameMap.has(v)) { r._patch['cells.' + k] = renameMap.get(v); cells[k] = renameMap.get(v); }
            });
            if (r.owner && renameMap.has(r.owner)) { r._patch.owner = renameMap.get(r.owner); r.owner = renameMap.get(r.owner); }
            if (r.updatedBy && renameMap.has(r.updatedBy)) { r._patch.updatedBy = renameMap.get(r.updatedBy); }
            // 행의 담당자 = 교직원 열의 첫 값, 없으면 owner
            const holder = staffKeys.map(k => cells[k]).find(Boolean) || r.owner || '';
            if (holder && moveMap.has(holder) && r.scope !== moveMap.get(holder)) {
                r._patch.scope = moveMap.get(holder); r.scope = moveMap.get(holder);
            }
            r._holder = holder;
        });

        // ④ 재정렬 — 소속 순서 → 명부 순번 → 기존 순서
        const sorted = sortRowsByRoster(list, scopes, roster);
        sorted.forEach((r, i) => { const want = (i + 1) * 1000; if (r.order !== want) r._patch.order = want; });

        const dirty = sorted.filter(r => Object.keys(r._patch).length);
        for (let i = 0; i < dirty.length; i += 400) {
            const b = writeBatch(db);
            dirty.slice(i, i + 400).forEach(r => b.update(doc(db, 'codocs_sheets', sheet.id, 'rows', r.id), r._patch));
            await b.commit();
        }
        touched += dirty.length;
    }
    return touched;
}

/* ===================== 시트 만들기 / 설정 (시트 형식 개발) ===================== */
function openSheetModal(sheet) {
    const isNew = !sheet;
    let draft = sheet ? JSON.parse(JSON.stringify({
        title: sheet.title, icon: sheet.icon || '📄', desc: sheet.desc || '',
        scopes: sheet.scopes || [], editPolicy: sheet.editPolicy || 'scope',
        locked: !!sheet.locked, columns: sheet.columns || []
    })) : JSON.parse(JSON.stringify(TEMPLATES.ip));

    const body = () => `
        ${isNew ? `<label class="cd-f"><span>서식</span><select id="cdTpl">
            <option value="ip">IP 대장 (본교/분교 · 추천)</option>
            <option value="asset">물품 대장</option>
            <option value="blank">빈 시트</option>
        </select></label>` : ''}
        <div class="cd-grid2">
            <label class="cd-f"><span>제목</span><input id="cdTitle" value="${esc(draft.title)}"></label>
            <label class="cd-f"><span>아이콘</span><input id="cdIcon" value="${esc(draft.icon)}" maxlength="4"></label>
        </div>
        <label class="cd-f"><span>설명</span><input id="cdDesc" value="${esc(draft.desc)}" placeholder="작성 안내 문구"></label>
        <label class="cd-f"><span>구분(탭)</span><input id="cdScopes" value="${esc((draft.scopes || []).join(', '))}" placeholder="본교, 수정분교"></label>
        <div class="cd-grid2">
            <label class="cd-f"><span>편집 권한</span><select id="cdPolicy">
                <option value="scope"${draft.editPolicy === 'scope' ? ' selected' : ''}>본인 소속 구분만</option>
                <option value="owner"${draft.editPolicy === 'owner' ? ' selected' : ''}>본인이 만든 행만</option>
                <option value="all"${draft.editPolicy === 'all' ? ' selected' : ''}>누구나 전체</option>
            </select></label>
            <label class="cd-f"><span>잠금</span><select id="cdLocked">
                <option value=""${!draft.locked ? ' selected' : ''}>편집 가능</option>
                <option value="1"${draft.locked ? ' selected' : ''}>읽기 전용(관리자만)</option>
            </select></label>
        </div>
        <div class="cd-colhead">열 구성 <button class="btn btn-secondary" data-act="addCol" style="font-size:12px;padding:4px 10px;">＋ 열 추가</button></div>
        <div id="cdCols" class="cd-cols"></div>
        <div class="cd-modalfoot">
            ${isNew ? '' : '<span class="cd-hint" style="flex:1;">열을 지워도 기존 데이터는 남습니다(화면에서만 사라짐).</span>'}
            <button class="btn btn-primary" data-act="save">${isNew ? '만들기' : '저장'}</button>
        </div>`;

    modal(isNew ? '새 시트 만들기' : '시트 설정', body(), (root, close) => {
        const colBox = root.querySelector('#cdCols');
        const drawCols = () => {
            colBox.innerHTML = draft.columns.map((c, i) => `
                <div class="cd-col" data-i="${i}">
                    <input class="cd-cl" value="${esc(c.label)}" placeholder="열 이름">
                    <select class="cd-ct">${COL_TYPES.map(t => `<option value="${t.v}"${t.v === c.type ? ' selected' : ''}>${t.label}</option>`).join('')}</select>
                    <input class="cd-co" value="${esc((c.options || []).join(', '))}" placeholder="${c.type === 'select' ? '선택지, 쉼표 구분' : '기본값'}" ${c.type === 'select' ? '' : 'data-def="1"'}>
                    <button class="cd-cb" data-mv="-1" title="위로">▲</button>
                    <button class="cd-cb" data-mv="1" title="아래로">▼</button>
                    <button class="cd-cb cd-cdel" title="삭제">✕</button>
                </div>`).join('');
            colBox.querySelectorAll('.cd-col').forEach(el => {
                const i = +el.dataset.i;
                el.querySelector('.cd-cl').addEventListener('input', e => draft.columns[i].label = e.target.value);
                el.querySelector('.cd-ct').addEventListener('change', e => { draft.columns[i].type = e.target.value; drawCols(); });
                el.querySelector('.cd-co').addEventListener('input', e => {
                    if (draft.columns[i].type === 'select') draft.columns[i].options = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    else draft.columns[i].def = e.target.value;
                });
                el.querySelectorAll('[data-mv]').forEach(b => b.addEventListener('click', () => {
                    const j = i + (+b.dataset.mv);
                    if (j < 0 || j >= draft.columns.length) return;
                    const t = draft.columns[i]; draft.columns[i] = draft.columns[j]; draft.columns[j] = t; drawCols();
                }));
                el.querySelector('.cd-cdel').addEventListener('click', () => { draft.columns.splice(i, 1); drawCols(); });
            });
            // 기본값 채우기 (select가 아닌 열)
            colBox.querySelectorAll('.cd-co[data-def]').forEach((inp, k) => {
                const idx = +inp.closest('.cd-col').dataset.i;
                inp.value = draft.columns[idx].def || '';
            });
        };
        drawCols();

        const tpl = root.querySelector('#cdTpl');
        if (tpl) tpl.addEventListener('change', () => {
            draft = JSON.parse(JSON.stringify(TEMPLATES[tpl.value]));
            root.querySelector('#cdTitle').value = draft.title;
            root.querySelector('#cdIcon').value = draft.icon;
            root.querySelector('#cdDesc').value = draft.desc;
            root.querySelector('#cdScopes').value = (draft.scopes || []).join(', ');
            root.querySelector('#cdPolicy').value = draft.editPolicy;
            drawCols();
        });

        root.querySelector('[data-act=addCol]').addEventListener('click', () => {
            draft.columns.push({ key: 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), label: '새 열', type: 'text', width: 130 });
            drawCols();
        });

        root.querySelector('[data-act=save]').addEventListener('click', async () => {
            const payload = {
                title: (root.querySelector('#cdTitle').value || '').trim() || '새 시트',
                icon: (root.querySelector('#cdIcon').value || '📄').trim(),
                desc: (root.querySelector('#cdDesc').value || '').trim(),
                scopes: (root.querySelector('#cdScopes').value || '').split(',').map(s => s.trim()).filter(Boolean),
                editPolicy: root.querySelector('#cdPolicy').value,
                locked: !!root.querySelector('#cdLocked').value,
                columns: draft.columns.map(c => ({
                    key: c.key || ('k' + Math.random().toString(36).slice(2, 8)),
                    label: c.label || '열', type: c.type || 'text',
                    width: c.width || 130,
                    ...(c.type === 'select' ? { options: c.options || [] } : {}),
                    ...(c.def ? { def: c.def } : {})
                })),
                updatedAt: serverTimestamp(), updatedBy: myName() || ''
            };
            if (!payload.columns.length) { toast('열을 하나 이상 만들어주세요', 'error'); return; }
            try {
                if (isNew) {
                    const id = 's_' + Date.now().toString(36);
                    payload.order = sheets.length ? Math.max(...sheets.map(s => s.order || 0)) + 1 : 0;
                    payload.createdAt = serverTimestamp();
                    await setDoc(doc(db, 'codocs_sheets', id), payload);
                    activeSheetId = id; watchRows();
                    toast('시트를 만들었습니다', 'success');
                } else {
                    await updateDoc(doc(db, 'codocs_sheets', sheet.id), payload);
                    toast('저장했습니다', 'success');
                }
                close();
            } catch (e) { toast('저장 실패: ' + e.message, 'error'); }
        });
    }, 720);
}

async function deleteSheet() {
    const sheet = currentSheet(); if (!sheet) return;
    if (!confirm(`"${sheet.title}" 시트를 행 ${rows.length}개와 함께 완전히 삭제합니다.\n되돌릴 수 없습니다. 계속할까요?`)) return;
    if (prompt('확인을 위해 시트 제목을 그대로 입력하세요') !== sheet.title) { toast('제목이 달라 취소했습니다', 'error'); return; }
    try {
        const snap = await getDocs(collection(db, 'codocs_sheets', sheet.id, 'rows'));
        for (let i = 0; i < snap.docs.length; i += 400) {
            const b = writeBatch(db);
            snap.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
            await b.commit();
        }
        const ps = await getDocs(collection(db, 'codocs_sheets', sheet.id, 'presence'));
        if (ps.docs.length) { const b = writeBatch(db); ps.docs.forEach(d => b.delete(d.ref)); await b.commit(); }
        await deleteDoc(doc(db, 'codocs_sheets', sheet.id));
        activeSheetId = null; watchRows();
        toast('삭제했습니다', 'success');
    } catch (e) { toast('삭제 실패: ' + e.message, 'error'); }
}

/* ===================== 파일 업로드(가져오기) ===================== */
function openImportModal(mode) {
    modal(mode === 'new' ? '파일로 시트 만들기' : '파일에서 행 추가', `
        <div class="cd-drop" id="cdDrop">
            <div style="font-size:34px;">📥</div>
            <div style="font-weight:700;margin-top:6px;">엑셀(.xlsx) · CSV 파일을 끌어다 놓거나 클릭</div>
            <div class="cd-hint" style="margin-top:4px;">첫 줄을 열 제목으로 읽습니다</div>
            <input type="file" id="cdFile" accept=".xlsx,.csv,.tsv,.txt" style="display:none;">
        </div>
        <div class="cd-hint" style="margin:10px 0 4px;">또는 엑셀·구글 시트에서 표를 복사해 아래에 붙여넣으세요</div>
        <textarea id="cdPaste" rows="4" placeholder="여기에 붙여넣기 (Ctrl+V)"></textarea>
        <div id="cdPreview"></div>
        <div class="cd-modalfoot"><button class="btn btn-primary" data-act="go" disabled>가져오기</button></div>`,
        (root, close) => {
            let table = null;   // [[...],[...]]
            const prev = root.querySelector('#cdPreview');
            const goBtn = root.querySelector('[data-act=go]');
            const fileInput = root.querySelector('#cdFile');
            const drop = root.querySelector('#cdDrop');

            const show = () => {
                if (!table || table.length < 2) { prev.innerHTML = ''; goBtn.disabled = true; return; }
                goBtn.disabled = false;
                const header = table[0];
                const sheet = currentSheet();
                const scopes = mode === 'append' && sheet ? (sheet.scopes || []) : ['본교', '수정분교'];
                prev.innerHTML = `
                    <div class="cd-colhead" style="margin-top:12px;">미리보기 — ${table.length - 1}행 × ${header.length}열</div>
                    <div class="cd-tablewrap" style="max-height:220px;"><table class="cd-table"><thead><tr>${header.map(h => `<th class="cd-th">${esc(h)}</th>`).join('')}</tr></thead>
                    <tbody>${table.slice(1, 6).map(r => `<tr>${header.map((_, i) => `<td class="cd-td cd-ro">${esc(r[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
                    <div class="cd-grid2" style="margin-top:10px;">
                        <label class="cd-f"><span>구분 열</span><select id="cdScopeCol"><option value="">— 없음(아래 값으로 일괄) —</option>${header.map((h, i) => `<option value="${i}">${esc(h)}</option>`).join('')}</select></label>
                        <label class="cd-f"><span>일괄 구분</span><select id="cdScopeFix">${scopes.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select></label>
                    </div>
                    ${mode === 'new' ? `<label class="cd-f"><span>시트 제목</span><input id="cdNewTitle" value="가져온 문서"></label>` : ''}`;
            };

            const parseText = txt => {
                const delim = txt.indexOf('\t') >= 0 && txt.indexOf('\t') < (txt.indexOf('\n') < 0 ? 1e9 : txt.indexOf('\n')) ? '\t' : ',';
                table = parseDelimited(txt, delim); show();
            };

            drop.addEventListener('click', () => fileInput.click());
            drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
            drop.addEventListener('dragleave', () => drop.classList.remove('over'));
            drop.addEventListener('drop', async e => {
                e.preventDefault(); drop.classList.remove('over');
                if (e.dataTransfer.files[0]) { table = await readFile(e.dataTransfer.files[0]); show(); }
            });
            fileInput.addEventListener('change', async () => { if (fileInput.files[0]) { table = await readFile(fileInput.files[0]); show(); } });
            root.querySelector('#cdPaste').addEventListener('input', e => { if (e.target.value.trim()) parseText(e.target.value); });

            goBtn.addEventListener('click', async () => {
                if (!table) return;
                goBtn.disabled = true; goBtn.textContent = '가져오는 중…';
                try {
                    const header = table[0];
                    const scopeColSel = root.querySelector('#cdScopeCol');
                    const scopeCol = scopeColSel && scopeColSel.value !== '' ? +scopeColSel.value : -1;
                    const fixScope = (root.querySelector('#cdScopeFix') || {}).value || '';
                    let sheet = currentSheet(), sheetId = activeSheetId, cols;

                    if (mode === 'new') {
                        cols = [{ key: 'no', label: '순번', type: 'seq', width: 56 }].concat(
                            header.map((h, i) => i === scopeCol ? null : ({
                                key: 'k' + i, label: String(h || `열${i + 1}`).trim() || `열${i + 1}`,
                                type: guessType(table, i), width: 130,
                                ...(guessType(table, i) === 'select' ? { options: uniqVals(table, i) } : {})
                            })).filter(Boolean));
                        const scopeSet = scopeCol >= 0
                            ? [...new Set(table.slice(1).map(r => String(r[scopeCol] || '').trim()).filter(Boolean))]
                            : ['본교', '수정분교'];
                        sheetId = 's_' + Date.now().toString(36);
                        await setDoc(doc(db, 'codocs_sheets', sheetId), {
                            title: (root.querySelector('#cdNewTitle').value || '가져온 문서').trim(),
                            icon: '📄', desc: '', scopes: scopeSet, editPolicy: 'scope', locked: false,
                            columns: cols, order: sheets.length, createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(), updatedBy: myName() || ''
                        });
                    } else {
                        if (!sheet) { toast('먼저 시트를 선택하세요', 'error'); return; }
                        cols = sheet.columns || [];
                    }

                    // 열 매핑: 제목이 같으면 그 열, 아니면 순서대로
                    const dataCols = cols.filter(c => c.type !== 'seq');
                    const map = header.map((h, i) => {
                        if (i === scopeCol) return null;
                        const byLabel = dataCols.find(c => c.label.replace(/\s/g, '') === String(h || '').replace(/\s/g, ''));
                        return byLabel ? byLabel.key : null;
                    });
                    let fallback = 0;
                    map.forEach((m, i) => {
                        if (m === null && i !== scopeCol) {
                            while (fallback < dataCols.length && map.includes(dataCols[fallback].key)) fallback++;
                            if (fallback < dataCols.length) map[i] = dataCols[fallback].key;
                        }
                    });

                    // 새 시트는 1000부터, 기존 시트에 덧붙일 때는 마지막 행 뒤로
                    const base = mode === 'new' ? 1000 : rows.reduce((m, r) => Math.max(m, r.order || 0), 0) + 1000;
                    const body = table.slice(1).filter(r => r.some(v => String(v || '').trim()));
                    for (let i = 0; i < body.length; i += 400) {
                        const b = writeBatch(db);
                        body.slice(i, i + 400).forEach((r, k) => {
                            const cells = {};
                            map.forEach((key, ci) => { if (key) cells[key] = String(r[ci] == null ? '' : r[ci]).trim(); });
                            const id = 'r_' + Date.now().toString(36) + '_' + (i + k);
                            b.set(doc(db, 'codocs_sheets', sheetId, 'rows', id), {
                                scope: scopeCol >= 0 ? String(r[scopeCol] || '').trim() : fixScope,
                                cells, owner: myName() || '', order: base + (i + k) * 10,
                                updatedBy: myName() || '', updatedAt: serverTimestamp()
                            });
                        });
                        await b.commit();
                    }
                    if (mode === 'new') { activeSheetId = sheetId; watchRows(); }
                    toast(`${body.length}행을 가져왔습니다`, 'success');
                    close();
                } catch (e) {
                    toast('가져오기 실패: ' + e.message, 'error');
                    goBtn.disabled = false; goBtn.textContent = '가져오기';
                }
            });
        }, 760);
}

function guessType(table, i) {
    const vals = table.slice(1, 40).map(r => String(r[i] || '').trim()).filter(Boolean);
    if (!vals.length) return 'text';
    if (vals.every(v => RE_IP.test(v))) return 'ip';
    if (vals.every(v => RE_MAC.test(v))) return 'mac';
    if (vals.every(v => /^\d{4}-\d{2}-\d{2}$/.test(v))) return 'date';
    if (vals.every(v => /^-?\d+(\.\d+)?$/.test(v))) return 'number';
    const u = [...new Set(vals)];
    // 값이 실제로 반복될 때만 선택 목록으로 본다 (전부 다른 값이면 그냥 텍스트)
    if (u.length <= 8 && vals.length >= 5 && u.length <= vals.length / 2 && u.every(v => v.length <= 12)) return 'select';
    if (vals.some(v => v.length > 30)) return 'memo';
    return 'text';
}
function uniqVals(table, i) {
    return [...new Set(table.slice(1).map(r => String(r[i] || '').trim()).filter(Boolean))].slice(0, 20);
}

async function readFile(file) {
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.xlsx')) return await parseXlsx(file);
    const buf = await file.arrayBuffer();
    let txt = new TextDecoder('utf-8').decode(buf);
    // 한글 엑셀이 뱉는 CP949 CSV 대응 (깨짐 문자가 많으면 euc-kr로 재해석)
    if ((txt.match(/�/g) || []).length > 3) {
        try { txt = new TextDecoder('euc-kr').decode(buf); } catch (e) { }
    }
    txt = txt.replace(/^﻿/, '');
    const delim = name.endsWith('.tsv') || txt.split('\n')[0].includes('\t') ? '\t' : ',';
    return parseDelimited(txt, delim);
}

function parseDelimited(text, delim) {
    const out = []; let row = [], cell = '', q = false;
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (q) {
            if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
            else cell += ch;
        } else if (ch === '"') q = true;
        else if (ch === delim) { row.push(cell); cell = ''; }
        else if (ch === '\n') { row.push(cell); out.push(row); row = []; cell = ''; }
        else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); out.push(row); }
    const width = out.reduce((m, r) => Math.max(m, r.length), 0);
    return out.filter(r => r.some(v => String(v).trim())).map(r => { while (r.length < width) r.push(''); return r; });
}

// jszip(전역)으로 xlsx 첫 시트를 읽는다. SPA가 이미 jszip을 로드해 둔다.
async function parseXlsx(file) {
    if (!window.JSZip) throw new Error('엑셀 파서를 불러오지 못했습니다 (새로고침 후 다시 시도)');
    const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
    const ssFile = zip.file('xl/sharedStrings.xml');
    let shared = [];
    if (ssFile) {
        const xml = await ssFile.async('string');
        shared = [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m =>
            [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => unxml(t[1])).join(''));
    }
    let target = zip.file('xl/worksheets/sheet1.xml');
    if (!target) {
        const cands = zip.file(/xl\/worksheets\/.*\.xml/);
        if (!cands || !cands.length) throw new Error('시트를 찾지 못했습니다');
        target = cands[0];
    }
    const sx = await target.async('string');
    const grid = [];
    for (const rm of sx.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
        const cells = [];
        for (const cm of rm[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
            const attr = cm[1], inner = cm[2];
            const ref = (attr.match(/r="([A-Z]+)\d+"/) || [])[1] || '';
            const ci = colIdx(ref);
            const t = (attr.match(/t="([^"]+)"/) || [])[1] || 'n';
            let v = '';
            if (t === 's') { const n = (inner.match(/<v>(\d+)<\/v>/) || [])[1]; v = shared[+n] || ''; }
            else if (t === 'inlineStr') { v = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => unxml(x[1])).join(''); }
            else { const m = inner.match(/<v>([\s\S]*?)<\/v>/); v = m ? unxml(m[1]) : ''; }
            while (cells.length < ci) cells.push('');
            cells[ci] = v;
        }
        // 자체 닫힘 셀(<c .../>)로 인한 누락 보정은 위 while 로 처리됨
        grid.push(cells);
    }
    const width = grid.reduce((m, r) => Math.max(m, r.length), 0);
    return grid.filter(r => r.some(v => String(v || '').trim())).map(r => { while (r.length < width) r.push(''); return r; });
}
function colIdx(ref) { let n = 0; for (const c of ref) n = n * 26 + (c.charCodeAt(0) - 64); return Math.max(0, n - 1); }
function unxml(s) { return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'); }

/* ===================== 내보내기 ===================== */
function tableData(sheet) {
    const cols = (sheet.columns || []).filter(c => c.type !== 'seq');
    const showScope = (sheet.scopes || []).length > 0;
    const header = (showScope ? ['구분'] : []).concat(cols.map(c => c.label));
    const list = visibleRows(sheet);
    const body = list.map(r => (showScope ? [r.scope || ''] : []).concat(cols.map(c => String((r.cells || {})[c.key] == null ? '' : (r.cells || {})[c.key]))));
    return { header, body };
}

async function exportSheet(fmt) {
    const sheet = currentSheet(); if (!sheet) return;
    const { header, body } = tableData(sheet);
    const stamp = new Date().toISOString().slice(0, 10);
    try {
        if (fmt === 'csv') {
            // 한글 엑셀이 UTF-8로 열도록 BOM을 붙인다
            const csv = [header, ...body].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
            download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${sheet.title}_${stamp}.csv`);
        } else {
            download(await buildXlsx(sheet.title, header, body), `${sheet.title}_${stamp}.xlsx`);
        }
    } catch (e) { toast('내보내기 실패: ' + e.message, 'error'); }
}

function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// 최소 xlsx (inlineStr 사용 — sharedStrings 불필요). Promise<Blob> 반환
function buildXlsx(title, header, body) {
    if (!window.JSZip) throw new Error('엑셀 생성 모듈(JSZip)이 없습니다. CSV로 받아주세요');
    const xe = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const colRef = i => { let s = '', n = i + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
    const rowXml = (cells, ri, style) => `<row r="${ri}">${cells.map((v, ci) =>
        `<c r="${colRef(ci)}${ri}" t="inlineStr"${style ? ' s="1"' : ''}><is><t xml:space="preserve">${xe(v)}</t></is></c>`).join('')}</row>`;
    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${header.map((h, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(40, Math.max(10, String(h).length * 2 + 8))}" customWidth="1"/>`).join('')}</cols><sheetData>${rowXml(header, 1, true)}${body.map((r, i) => rowXml(r, i + 2, false)).join('')}</sheetData></worksheet>`;
    const zip = new window.JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xe(String(title).slice(0, 28).replace(/[\\\/\?\*\[\]:]/g, ''))}" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F0FE"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`);
    zip.file('xl/worksheets/sheet1.xml', sheetXml);
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

function copyTsv() {
    const sheet = currentSheet(); if (!sheet) return;
    const { header, body } = tableData(sheet);
    const tsv = [header, ...body].map(r => r.map(v => String(v).replace(/[\t\n]/g, ' ')).join('\t')).join('\n');
    navigator.clipboard.writeText(tsv)
        .then(() => toast('복사했습니다 — 구글 스프레드시트 A1에 붙여넣으세요', 'success'))
        .catch(() => toast('복사 실패 (브라우저 권한 확인)', 'error'));
}

function printSheet() {
    const sheet = currentSheet(); if (!sheet) return;
    const { header, body } = tableData(sheet);
    const w = window.open('', '_blank');
    if (!w) { toast('팝업이 차단되었습니다', 'error'); return; }
    w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(sheet.title)}</title>
    <style>body{font-family:'맑은 고딕',sans-serif;padding:18px;}h1{font-size:18px;text-align:center;}
    table{border-collapse:collapse;width:100%;font-size:11px;}th,td{border:1px solid #666;padding:4px 6px;}
    th{background:#eee;}@page{size:A4 landscape;margin:12mm;}</style>
    <h1>${esc(sheet.title)}</h1><div style="text-align:right;font-size:11px;margin-bottom:6px;">출력일 ${new Date().toLocaleDateString('ko-KR')}</div>
    <table><thead><tr>${header.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${body.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <script>setTimeout(()=>window.print(),400)<\/script>`);
    w.document.close();
}

/* ===================== 모달 ===================== */
function modal(title, bodyHtml, onReady, width) {
    const old = document.getElementById('cdModal'); if (old) old.remove();
    const ov = document.createElement('div');
    ov.id = 'cdModal'; ov.className = 'cd-overlay';
    ov.innerHTML = `<div class="cd-modal" style="max-width:${width || 560}px;">
        <div class="cd-mhead"><h3>${esc(title)}</h3><button class="cd-mclose">✕</button></div>
        <div class="cd-mbody">${bodyHtml}</div></div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.querySelector('.cd-mclose').addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    if (onReady) onReady(ov.querySelector('.cd-mbody'), close);
    return close;
}

/* ===================== 스타일 ===================== */
const CSS_TEXT = `
#page-codocs .cd-idbar{padding:14px;background:#fff9db;border-radius:10px;margin-bottom:14px;}
#page-codocs .cd-whoami{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;}
#page-codocs .cd-chip{padding:6px 10px;border-radius:8px;background:var(--border);font-size:13px;}
#page-codocs .cd-presence{display:inline-flex;align-items:center;gap:4px;margin-left:auto;}
#page-codocs .cd-live{font-size:11px;color:var(--success-dark);margin-right:2px;}
#page-codocs .cd-avatar{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:700;}
#page-codocs .cd-sc-0{background:#4A90D9}#page-codocs .cd-sc-1{background:#E8590C}#page-codocs .cd-sc-2{background:#2F9E44}
#page-codocs .cd-sc-3{background:#9C36B5}#page-codocs .cd-sc-4{background:#1098AD}#page-codocs .cd-sc-5{background:#C2255C}
#page-codocs .cd-sheetbar{display:flex;gap:6px;flex-wrap:wrap;border-bottom:2px solid var(--border);padding-bottom:8px;margin-bottom:14px;}
#page-codocs .cd-sheet{padding:8px 14px;border:none;background:transparent;border-radius:8px 8px 0 0;font-size:14px;font-weight:600;color:var(--text-light);cursor:pointer;}
#page-codocs .cd-sheet:hover{background:var(--primary-light);}
#page-codocs .cd-sheet.active{background:var(--primary);color:#fff;}
#page-codocs .cd-sheet.cd-add{color:var(--primary);font-weight:700;}
#page-codocs .cd-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:10px;}
#page-codocs .cd-title{font-size:18px;font-weight:800;}
#page-codocs .cd-lock{font-size:12px;color:#c92a2a;}
#page-codocs .cd-desc{font-size:12px;color:var(--text-light);margin-top:2px;}
#page-codocs .cd-actions{display:flex;gap:6px;flex-wrap:wrap;}
#page-codocs .cd-actions .btn{font-size:12px;padding:6px 10px;}
#page-codocs .cd-filter{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;}
#page-codocs .cd-scopes{display:flex;gap:4px;background:var(--border);padding:3px;border-radius:10px;}
#page-codocs .cd-scope{border:none;background:transparent;padding:6px 12px;border-radius:8px;font-size:13px;cursor:pointer;color:var(--text);}
#page-codocs .cd-scope.active{background:var(--card-bg);box-shadow:var(--shadow);font-weight:700;}
#page-codocs .cd-scope b{color:var(--primary);}
#page-codocs #cdSearch{flex:1;min-width:160px;padding:8px 12px;border:2px solid var(--border);border-radius:8px;font-size:13px;}
#page-codocs .cd-tablewrap{overflow:auto;max-height:66vh;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--card-bg);}
#page-codocs .cd-table{border-collapse:separate;border-spacing:0;width:100%;font-size:13px;}
/* CSS_TEXT는 템플릿 리터럴이라 백틱 금지. ⚠ SPA 전역에 thead th 규칙이 color:white를 걸고 있어(index.html 215줄)
   배경만 바꾸면 흰 글자가 밝은 배경에 얹혀 안 보인다 — 실제로 그랬다. 배경·글자색을 같이 못박는다. */
#page-codocs .cd-th{position:sticky;top:0;z-index:2;background:#2D3748;color:#fff;border-bottom:none;border-right:1px solid rgba(255,255,255,.15);padding:9px 10px;text-align:left;font-weight:700;white-space:nowrap;}
#page-codocs .cd-th:last-child{border-right:none;}
#page-codocs .cd-ttype{display:block;font-size:10px;font-weight:400;color:#A0AEC0;}
#page-codocs .cd-td{background:var(--card-bg);color:var(--text);border-bottom:1px solid var(--border);border-right:1px solid var(--border);padding:7px 10px;vertical-align:top;cursor:text;white-space:pre-wrap;word-break:break-word;min-width:60px;}
#page-codocs .cd-td:not(.cd-ro):hover{background:var(--primary-light);}
#page-codocs .cd-ro{background:#FAFBFC;color:var(--text-light);cursor:default;}
#page-codocs .cd-err{background:#FFF0F0;box-shadow:inset 0 0 0 2px #ffa8a8;}
#page-codocs .cd-editing{padding:2px;background:#fff;box-shadow:inset 0 0 0 2px var(--primary);}
#page-codocs .cd-busy{box-shadow:inset 0 0 0 2px #E8590C;position:relative;}
#page-codocs .cd-busy::after{content:attr(data-busy) ' 편집중';position:absolute;top:-9px;left:0;font-size:9px;background:#E8590C;color:#fff;padding:1px 5px;border-radius:5px;white-space:nowrap;z-index:3;}
#page-codocs .cd-input{width:100%;box-sizing:border-box;border:none;outline:none;font-size:13px;font-family:inherit;padding:5px 8px;background:transparent;resize:vertical;}
#page-codocs .cd-metacol{font-size:11px;white-space:nowrap;}
#page-codocs .cd-ago{color:var(--text-light);font-size:10px;}
#page-codocs .cd-rowmenu{width:38px;text-align:center;}
#page-codocs .cd-x{border:none;background:transparent;cursor:pointer;font-size:16px;color:var(--text-light);}
#page-codocs .cd-none{padding:26px;text-align:center;color:var(--text-light);}
#page-codocs .cd-empty{padding:40px;text-align:center;color:var(--text);background:var(--card-bg);border-radius:var(--radius);box-shadow:var(--shadow);}
#page-codocs .cd-foot{font-size:12px;color:var(--text-light);margin-top:8px;}
.cd-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;}
.cd-modal{background:var(--card-bg);border-radius:var(--radius);width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.2);}
.cd-mhead{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border);}
.cd-mhead h3{margin:0;font-size:17px;}
.cd-mclose{border:none;background:transparent;font-size:18px;cursor:pointer;color:var(--text-light);}
.cd-mbody{padding:16px 18px;overflow:auto;}
.cd-f{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;font-size:13px;font-weight:600;}
.cd-f input,.cd-f select,.cd-mbody textarea{padding:8px 10px;border:2px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;font-weight:400;width:100%;box-sizing:border-box;}
.cd-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.cd-hint{font-size:11px;color:var(--text-light);font-weight:400;}
.cd-colhead{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:700;margin:14px 0 6px;}
.cd-cols{display:flex;flex-direction:column;gap:6px;}
.cd-col{display:grid;grid-template-columns:1.1fr .8fr 1.2fr auto auto auto;gap:5px;align-items:center;}
.cd-col input,.cd-col select{padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;width:100%;box-sizing:border-box;}
.cd-cb{border:1px solid var(--border);background:var(--bg);border-radius:6px;cursor:pointer;padding:5px 7px;font-size:11px;}
.cd-cdel{color:#c92a2a;}
.cd-modalfoot{display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:16px;}
.cd-mhead2{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:5px;font-size:11px;color:var(--text-light);padding:0 2px 4px;}
.cd-mhead2 span:last-child{width:29px;}
.cd-mrow{grid-template-columns:1fr 1fr 1fr auto;}
.cd-menu .cd-menubtns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;}
#page-codocs .cd-setup{padding:22px 24px;background:var(--card-bg);border-radius:var(--radius);box-shadow:var(--shadow);}
#page-codocs .cd-setuptitle{font-size:18px;font-weight:800;margin-bottom:8px;}
#page-codocs .cd-setupdesc{font-size:13px;color:var(--text);line-height:1.6;margin:0 0 14px;}
#page-codocs .cd-steps{margin:0;padding-left:20px;font-size:13px;line-height:1.9;}
#page-codocs .cd-steps li{margin-bottom:10px;}
#page-codocs .cd-steps code,#page-codocs .cd-setupdesc code{background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 5px;font-size:12px;}
#page-codocs .cd-steps .cd-hint{display:block;line-height:1.5;margin-top:2px;}
#page-codocs .cd-rulesbox{margin-top:16px;font-size:13px;}
#page-codocs .cd-rulesbox summary{cursor:pointer;color:var(--text-light);}
#page-codocs .cd-rulesbox pre{margin-top:8px;max-height:300px;overflow:auto;background:#2D3748;color:#E2E8F0;padding:12px;border-radius:8px;font-size:11px;line-height:1.5;}
.cd-ipsec{padding:12px 0;border-bottom:1px solid var(--border);}
.cd-ipsec:last-of-type{border-bottom:none;}
.cd-iplabel{font-size:12px;font-weight:700;color:var(--text-light);margin-bottom:4px;}
.cd-ipval{font-size:17px;font-weight:700;font-family:ui-monospace,Consolas,monospace;}
.cd-ippick{font-family:ui-monospace,Consolas,monospace;font-size:15px;font-weight:700;border:2px solid var(--border);background:var(--card-bg);border-radius:8px;padding:6px 12px;margin:0 6px 6px 0;cursor:pointer;}
.cd-ippick:hover{border-color:var(--primary);background:var(--primary-light);}
.cd-ippick.on{border-color:var(--primary);background:var(--primary);color:#fff;}
.cd-auto{display:inline-block;margin-left:5px;padding:0 5px;border-radius:4px;background:var(--primary-light);color:var(--primary-dark);font-size:9px;font-weight:700;vertical-align:middle;}
.cd-cmdrow{display:flex;gap:8px;align-items:center;}
.cd-cmdrow code{flex:1;background:#2D3748;color:#fff;padding:8px 10px;border-radius:6px;font-size:13px;}
.cd-cmdrow .btn{font-size:12px;padding:7px 12px;}
.cd-drop{border:2px dashed var(--border);border-radius:var(--radius-sm);padding:24px;text-align:center;cursor:pointer;}
.cd-drop.over{border-color:var(--primary);background:var(--primary-light);}
@media(max-width:640px){
  #page-codocs .cd-actions .btn{font-size:11px;padding:5px 8px;}
  .cd-grid2{grid-template-columns:1fr;}
  .cd-col{grid-template-columns:1fr 1fr;gap:4px;}
}
`;
(function injectCss() {
    if (document.getElementById('cdStyle')) return;
    const st = document.createElement('style');
    st.id = 'cdStyle'; st.textContent = CSS_TEXT;
    document.head.appendChild(st);
})();

/* 모듈 로드 시점에 이미 탭이 열려 있으면 즉시 시작 */
const pageEl = document.getElementById('page-codocs');
if (pageEl && pageEl.classList.contains('active')) window.codocsOpen();

window.CoDocs = { open, close: leave };

/* 자동 테스트용 내부 함수 노출 (node _check/codocs-test.mjs) */
export const __test = { parseDelimited, parseXlsx, buildXlsx, guessType, cellError, colIdx, sortRowsByRoster, parseIpconfig, netFieldMap };
