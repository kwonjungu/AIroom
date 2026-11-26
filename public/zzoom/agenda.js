// 쭘 대기 화면 「오늘의 안건」 (AGENDA_OPEN, 2026-11-25). 자리: #zz-wait (app.js 가 #zz-center 안에 만든다)
// 누구나 안건 추가(제목만 또는 자료와 함께), 자료 올리기·바꾸기, 안건을 누르면 그 자료로 이동, 「발표하기」.
// 익명: 사람 이름을 보이지 않는다. 내 것만 「내 안건」. 서버·Firebase 는 ctx.api 로만 부른다.
export const css = 'agenda.css';

export const ACCEPT = '.pdf,.hwp,.hwpx,.pptx,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif,.heic,.heif';
export const MAX_AGENDA = 30;
export const MAX_MINE = 10;
export const MAX_BYTES = 50 * 1024 * 1024;
export const CONFIRM_TEXT = '지금부터 화면이 전송됩니다';
export const BUSY_TEXT = '지금 다른 분이 발표 중이에요.';
export const TODAY = '_today';   // 0번 「오늘의 안건」(api.TODAY 와 같은 값)

// ---------- 순수 함수(단위 시험용) ----------
export const hasFile = a => !!a && (a.kind === 'board' || (a.pages | 0) >= 1);

/** 대기 화면 모양: 'off' | 'full' | 'mini' */
export function waitMode({ meeting, live, open = false, dismissed = false } = {}) {
  if (!meeting || meeting.gone || meeting.status === 'ended' || meeting.status === 'deleting') return 'off';
  if (open) return 'full';
  const auto = meeting.status === 'ready' || !live?.aid;
  return auto && !dismissed ? 'full' : 'mini';
}

/** 올리기 전에 막을 것. 괜찮으면 null */
export function precheckFile(file) {
  if (!file) return '파일을 골라 주세요.';
  const ext = String(file.name || '').toLowerCase().split('.').pop();
  if (ext === 'ppt' || ext === 'pps') return 'PowerPoint 에서 PPTX 나 PDF 로 저장해 올려 주세요.';
  if (!ACCEPT.split(',').includes('.' + ext)) return '올릴 수 없는 파일 형식이에요.';
  if (!file.size) return '빈 파일이에요. 다른 파일을 골라 주세요.';
  if (file.size >= MAX_BYTES) return '50MB 보다 작은 파일만 올릴 수 있어요.';
  return null;
}

/** 안건 줄 아래 작은 글 */
export function metaText(a) {
  if (!a) return '';
  if (a.kind === 'board') return `칠판 ${Math.max(1, a.pages | 0)}쪽`;
  return hasFile(a) ? `${a.pages}쪽` : '자료 없음';
}

/** 내가 0번 「오늘의 안건」을 발표하는 중인지 */
export function presentingToday({ meeting, live, myCid } = {}) {
  return meeting?.status === 'live' && !!myCid && meeting?.presenter?.cid === myCid && !live?.aid;
}

/** 발표 확인 창에 넣을 줄들(다른 분이 발표 중이면 한 줄을 위에 더한다) */
export function confirmLines({ meeting, myCid }) {
  const other = meeting?.status === 'live' && meeting?.presenter?.cid && meeting.presenter.cid !== myCid;
  return other ? [BUSY_TEXT, CONFIRM_TEXT] : [CONFIRM_TEXT];
}

/** 원본 파일 이름 대신 보일 종류 이름(익명, U19) */
export function kindLabel(file) {
  const ext = String(file?.name || '').toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'PDF';
  if (ext === 'hwp' || ext === 'hwpx') return '한/글';
  if (ext === 'pptx') return 'PPTX';
  return '그림';
}

function progressView(p) {
  if (!p) return { text: '준비하고 있어요', ratio: 0 };
  const total = Number(p.total) || 0, done = Number(p.done) || 0;
  const r = Math.max(0, Math.min(1, Number.isFinite(p.ratio) ? p.ratio : total ? done / total : 0));
  const pct = Math.round(r * 100);
  if (p.phase === 'load') return { text: '파일을 열 준비를 하고 있어요', ratio: r };
  if (p.phase === 'render') return { text: total ? `화면에 띄울 수 있게 바꾸는 중이에요 (${done}/${total}쪽)` : '화면에 띄울 수 있게 바꾸는 중이에요', ratio: r };
  if (p.phase === 'upload') return { text: total ? `올리는 중이에요 (${pct}%)` : '올리는 중이에요', ratio: r };
  if (p.phase === 'commit') return { text: '거의 다 됐어요', ratio: 1 };
  return { text: '처리하고 있어요', ratio: r };
}
const isAbort = e => !!e && (e.code === 'ABORTED' || e.name === 'AbortError' || e.code === 'aborted');
function errorText(e) {
  if (!e) return '알 수 없는 문제가 생겼어요.';
  if (e.code === 'webp_unsupported') return '이 브라우저에서는 자료를 올릴 수 없어요. 엣지나 크롬 최신판에서 올려 주세요.';
  if (e.code === 'network') return '연결이 끊겼어요. 인터넷을 확인한 뒤 다시 해 주세요.';
  if (e.code === 'upload_failed') return '자료를 올리지 못했어요. 연결을 확인한 뒤 다시 올려 주세요.';
  return e.message || '하지 못했어요. 잠시 뒤 다시 해 주세요.';
}

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

// ---------- 화면 ----------
export function mount(ctx) {
  const { api, store } = ctx;
  const mid = ctx.mid;
  const root = ctx.el('zz-wait');
  const stage = ctx.el('zz-stage');
  let alive = true;
  const S = { open: false, dismissed: false, mine: new Set(), armed: null, armTimer: 0, job: null, lastStatus: null, lastLiveAid: null, lastForce: null, menu: null, mode: null };
  const offs = [];
  // 이 모듈이 연 창: 떼어질 때(화면 이동, 자격 잃음) 함께 닫는다(감사 U17)
  const modals = new Set();
  const modal = opts => { const m = ctx.modal(opts); modals.add(m); return m; };

  const meeting = () => store.get('meeting') || null;
  const role = () => store.get('role') || null;
  const agenda = () => store.get('agenda') || [];
  const live = () => store.get('live') || meeting()?.live || null;
  const isHost = () => role()?.role === 'host';
  const isMine = a => !!a && (S.mine.has(a.aid) || (!!role()?.cid && a.ownerCid === role().cid));
  const canEdit = a => isHost() || isMine(a);
  const status = () => meeting()?.status;

  // 무대 크기에 맞춰 덮개를 놓는다(무대 #zz-stage 는 2팀 자리라 크기만 읽는다)
  function fit() {
    if (!alive) return;
    root.style.top = stage.offsetTop + 'px';
    root.style.left = stage.offsetLeft + 'px';
    root.style.width = stage.offsetWidth + 'px';
    root.style.height = stage.offsetHeight + 'px';
  }
  let ro = null;
  if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(fit); ro.observe(stage); }
  window.addEventListener('resize', fit);
  offs.push(() => { ro && ro.disconnect(); window.removeEventListener('resize', fit); });

  // 내 안건 목록: 다시 들어와 cid 가 바뀌어도 서버가 같은 사람으로 알려 준다
  let mineTimer = 0, mineCount = -1;
  function refreshMine(force) {
    const n = agenda().length;
    if (!force && n === mineCount) return;
    mineCount = n;
    clearTimeout(mineTimer);
    mineTimer = setTimeout(() => {
      if (!alive || !role()) return;
      Promise.resolve(api.myAgenda ? api.myAgenda(mid) : []).then(list => {
        if (!alive) return;
        S.mine = new Set(list || []);
        render();
      }).catch(() => { /* 못 받으면 cid 로만 판단 */ });
    }, force ? 0 : 400);
  }

  function render() {
    if (!alive) return;
    const m = meeting();
    const l = live();
    // 상태가 바뀌거나 진행 화면이 비면 다시 자동으로 펼친다
    if (m && (m.status !== S.lastStatus || (S.lastLiveAid && !l?.aid))) { S.dismissed = false; }
    // 누가 0번 「오늘의 안건」을 발표하면(forceSeq 증가, aid 없음) 「자료 화면 보기」로 닫아 둔 사람도 다시 펼친다
    const fs = Number(l?.forceSeq) || 0;
    if (S.lastForce !== null && fs > S.lastForce && !l?.aid) { S.dismissed = false; S.open = false; }
    S.lastStatus = m?.status; S.lastLiveAid = l?.aid || null; if (m) S.lastForce = fs;
    const mode = waitMode({ meeting: m, live: l, open: S.open, dismissed: S.dismissed });
    root.hidden = mode === 'off';
    root.className = 'za-wait is-' + mode;
    if (mode !== S.mode) { S.mode = mode; store.emit('ui:wait', mode); }   // 2팀 띠가 「오늘의 안건 보기」 단추를 낼지 정한다
    if (mode === 'off') { root.replaceChildren(); return; }
    fit();
    if (mode === 'mini') {
      const n = agenda().length;
      root.replaceChildren(h('button', { type: 'button', class: 'zz-btn za-mini', onclick: () => { S.open = true; render(); } },
        h('span', { text: '오늘의 안건 펼치기' }), n ? h('span', { class: 'za-mini-n zz-num', text: String(n), 'aria-label': `안건 ${n}개` }) : null));
      return;
    }
    root.replaceChildren(panel());
  }

  function panel() {
    const list = agenda();
    const m = meeting();
    const l = live();
    const liveOn = m?.status === 'live';
    const canClose = S.open || (liveOn && !!l?.aid) || list.some(hasFile);
    const sub = m?.status === 'ready'
      ? ['회의가 시작되기 전이에요. 안건과 자료를 미리 올려 두세요.', '회의가 시작되면 「발표하기」 단추가 생겨요.']
      : presentingToday({ meeting: m, live: l, myCid: role()?.cid })
        ? ['지금 모두가 이 화면을 봐요.', '안건 이름이나 「발표하기」를 누르면 확인한 뒤 모두 그 자료로 넘어가요.']
        : ['안건 이름을 누르면 나만 그 자료를 봐요.', '「발표하기」를 누르면 모두가 내 화면을 봐요.'];
    const head = h('div', { class: 'za-head' },
      h('div', { class: 'za-head-text' },
        h('h2', { class: 'za-title' }, h('span', { text: '오늘의 안건' }), list.length ? h('span', { class: 'za-count zz-num', text: String(list.length) }) : null),
        sub.map(x => h('p', { class: 'za-sub', text: x }))),
      h('div', { class: 'za-head-actions' },
        // 안건이 없을 때는 빈 칸 안 「첫 안건 올리기」가 주 단추라 머리 단추는 테두리로
        h('button', { type: 'button', class: 'zz-btn za-add' + (list.length ? ' primary' : ''), onclick: openAdd, disabled: list.length >= MAX_AGENDA || null, title: list.length >= MAX_AGENDA ? `안건은 ${MAX_AGENDA}개까지예요` : null }, '안건 추가'),
        canClose ? h('button', { type: 'button', class: 'zz-btn za-close', onclick: close }, '자료 화면 보기') : null));
    let body;
    if (!list.length) {
      body = h('div', { class: 'zz-empty za-empty' },
        h('img', { src: ctx.assets('empty-agenda'), alt: '' }),
        h('p', { text: '아직 안건이 없어요. 제목만 먼저 올려도 돼요.' }),
        h('button', { type: 'button', class: 'zz-btn primary za-first', onclick: openAdd }, '첫 안건 올리기'));
    } else {
      body = h('ol', { class: 'za-list' }, rowToday(liveOn, l), list.map((a, i) => row(a, i, liveOn, l)));
    }
    return h('div', { class: 'za-panel zz-card', role: 'region', 'aria-label': '오늘의 안건' }, head, body);
  }

  // 0번 줄: 늘 맨 위. 이 정리 화면을 모두에게 보여 줄 수 있다. 지우기와 고치기는 없다.
  function rowToday(liveOn, l) {
    const mine = presentingToday({ meeting: meeting(), live: l, myCid: role()?.cid });
    const nowLive = liveOn && !!meeting()?.presenter?.cid && !l?.aid;
    const main = h('div', { class: 'za-main za-main-today' },
      h('span', { class: 'za-no zz-num', text: '0' }),
      h('span', { class: 'za-text' },
        h('span', { class: 'za-name', text: '오늘의 안건' }),
        h('span', { class: 'za-meta' },
          h('span', { text: '안건 목록을 모두에게 보여 줘요' }),
          nowLive ? h('span', { class: 'zz-chip live za-chip-live' }, h('span', { class: 'zz-live-dot' }), '발표 중') : null)));
    const btn = liveOn && !mine ? h('button', { type: 'button', class: 'zz-btn primary za-present', onclick: () => askPresent(TODAY), 'aria-label': '0번 오늘의 안건 발표하기' }, '발표하기') : null;
    return h('li', { class: 'za-today' + (nowLive ? ' is-live' : ''), 'data-aid': TODAY }, h('div', { class: 'za-line' }, main, btn));
  }

  function row(a, i, liveOn, l) {
    const mine = isMine(a), edit = canEdit(a), file = hasFile(a);
    const nowLive = liveOn && l?.aid === a.aid;
    const main = h('button', { type: 'button', class: 'za-main', onclick: () => goTo(a), 'aria-label': `${i + 1}번 안건 ${a.title || ''} 보기` },
      h('span', { class: 'za-no zz-num', text: String(i + 1) }),
      h('span', { class: 'za-text' },
        h('span', { class: 'za-name', text: a.title || `안건 ${i + 1}` }),
        h('span', { class: 'za-meta' },
          h('span', { class: 'zz-num', text: metaText(a) }),
          mine ? h('span', { class: 'zz-chip za-chip-mine', text: '내 안건' }) : null,
          nowLive ? h('span', { class: 'zz-chip live za-chip-live' }, h('span', { class: 'zz-live-dot' }), '발표 중') : null)));
    // 줄마다 보이는 단추는 하나(EASY_UX B6): 회의 중 자료가 있으면 「발표하기」, 자료가 없고 내 안건이면 「자료 올리기」.
    // 자료 바꾸기, 이름 바꾸기, 지우기는 「고치기」를 누르면 펼쳐진다.
    const pc = meeting()?.presenter?.cid;
    const presentingThis = nowLive && !!pc && pc === role()?.cid;
    const acts = [];
    // 「안건이름 (발표하기)」: 발표하기는 이름 바로 옆에 둔다(이름 단추는 나만 보기, 발표하기는 따로)
    const present = file && liveOn && !presentingThis ? h('button', { type: 'button', class: 'zz-btn primary za-present', onclick: () => askPresent(a), 'aria-label': `${i + 1}번 안건 발표하기` }, '발표하기') : null;
    if (!file && edit && a.kind !== 'board') acts.push(h('button', { type: 'button', class: 'zz-btn za-upload', onclick: () => pickFile(a) }, '자료 올리기'));
    const open = edit && S.menu === a.aid;
    if (edit) acts.push(h('button', { type: 'button', class: 'zz-btn ghost za-edit', 'aria-expanded': String(open), onclick: () => { S.menu = open ? null : a.aid; render(); } }, open ? '고치기 닫기' : '고치기'));
    let menu = null;
    if (open) {
      const items = [];
      if (file && a.kind !== 'board') items.push(h('button', { type: 'button', class: 'zz-btn za-upload', onclick: () => pickFile(a) }, '자료 바꾸기'));
      items.push(h('button', { type: 'button', class: 'zz-btn za-rename', onclick: () => openRename(a) }, '이름 바꾸기'));
      const del = h('button', { type: 'button', class: 'zz-btn danger za-del', onclick: () => askDelete(a) }, S.armed === a.aid ? '정말 지우기' : '지우기');
      if (nowLive) del.disabled = true;
      items.push(del);
      menu = h('div', { class: 'za-edit-menu', role: 'group', 'aria-label': `${i + 1}번 안건 고치기` }, items,
        nowLive ? h('p', { class: 'za-muted', text: '발표 중인 안건은 지울 수 없어요.' }) : null);
    }
    return h('li', { class: 'za-item' + (nowLive ? ' is-live' : '') + (file ? '' : ' is-nofile'), 'data-aid': a.aid },
      h('div', { class: 'za-line' }, main, present), acts.length ? h('div', { class: 'za-actions' }, acts) : null, menu);
  }

  function close() { S.open = false; S.dismissed = true; render(); }

  // 추가 결정 4: 누르면 그 안건 첫 쪽으로. 진행자가 아니면 내 화면만 자유 보기(2팀 cmd:nav)
  function goTo(a) {
    if (!hasFile(a)) {
      ctx.toast(canEdit(a) ? '아직 자료가 없어요. 「자료 올리기」로 올려 주세요.' : '아직 자료가 없는 안건이에요.', 'info');
      return;
    }
    if (presentingToday({ meeting: meeting(), live: live(), myCid: role()?.cid })) { askPresent(a); return; }   // 0번 발표 중: 모두가 넘어가므로 확인 먼저
    store.emit('cmd:nav', { aid: a.aid, page: 1 });
    close();
  }

  // 추가 결정 5: 발표하기. 확인 창 하나(「지금부터 화면이 전송됩니다」, 예·아니오). 다른 분이 발표 중이면 한 줄을 위에 더한다.
  function askPresent(a) {
    const today = a === TODAY;
    if (status() !== 'live') { ctx.toast('회의가 시작되면 발표할 수 있어요.', 'info'); return; }
    const lines = confirmLines({ meeting: meeting(), myCid: role()?.cid });
    const body = h('div', { class: 'za-confirm' }, lines.map((t, k) => h('p', { class: k === lines.length - 1 ? 'za-confirm-main' : 'za-confirm-busy', text: t })));
    modal({
      title: '발표하기',
      body,
      actions: [
        { label: '예', primary: true, onClick: async () => {
          try {
            if (!today && presentingToday({ meeting: meeting(), live: live(), myCid: role()?.cid })) {
              store.emit('cmd:nav', { aid: a.aid, page: 1 });   // 나는 이미 발표자: 쪽 넘기기처럼 모두 같이 넘어간다
              S.open = false; S.dismissed = true; render();
              ctx.toast('모두가 이 자료로 넘어갔어요.', 'ok');
              return;
            }
            await api.present(mid, today ? (api.TODAY || TODAY) : a.aid);
            if (!alive) return;
            if (today) { S.open = false; S.dismissed = false; render(); ctx.toast('모두가 오늘의 안건을 봐요.', 'ok'); return; }   // 발표자도 0번 화면을 본다
            S.open = false; S.dismissed = true; render();
            ctx.toast('발표를 시작했어요. 모두가 내 화면을 봐요.', 'ok');
          } catch (e) { ctx.toast(errorText(e), e?.status === 429 ? 'warn' : 'error'); }
        } },
        { label: '아니오', focus: true }   // 첫 초점은 「아니오」: 창이 뜨자마자 Enter 를 눌러도 전송되지 않는다(U18)
      ]
    });
  }

  // ---- 안건 추가(제목만, 또는 자료와 함께) ----
  function openAdd() {
    if (status() === 'ended') { ctx.toast('끝난 회의에는 안건을 올릴 수 없어요.', 'warn'); return; }
    if (agenda().length >= MAX_AGENDA) { ctx.toast(`안건은 ${MAX_AGENDA}개까지 올릴 수 있어요.`, 'warn'); return; }
    if (!isHost() && agenda().filter(isMine).length >= MAX_MINE) { ctx.toast(`한 사람이 안건을 ${MAX_MINE}개까지 올릴 수 있어요.`, 'warn'); return; }
    const title = h('input', { type: 'text', class: 'za-input', id: 'za-add-title', maxlength: '100', placeholder: '예: 2학기 학사 일정', autocomplete: 'off' });
    const file = h('input', { type: 'file', class: 'za-file', id: 'za-add-file', accept: ACCEPT });
    const fileName = h('span', { class: 'za-file-name', text: '고른 파일 없음' });   // 익명: 원본 파일 이름은 보이지 않는다(U19)
    const pick = h('button', { type: 'button', class: 'zz-btn za-pick', onclick: () => file.click() }, '컴퓨터에서 파일 고르기');
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      fileName.textContent = f ? `자료 1개를 골랐어요 (${kindLabel(f)})` : '고른 파일 없음';
    });
    const err = h('p', { class: 'za-err', role: 'alert' });
    const body = h('div', { class: 'za-form' },
      h('label', { class: 'za-field', for: 'za-add-title' }, h('span', { text: '안건 제목' }), title),
      h('div', { class: 'za-field' }, h('span', { text: '자료(나중에 올려도 돼요)' }), h('div', { class: 'za-file-row' }, pick, fileName, file)),
      h('p', { class: 'za-muted', text: 'PDF, 한/글, PPTX, 그림을 올릴 수 있어요. 50MB 까지예요.' }),
      err);
    title.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); md.el.querySelector('.zz-modal-actions .primary')?.click(); } });
    const md = modal({
      title: '안건 추가',
      body,
      keep: () => !!(title.value.trim() || (file.files && file.files.length)),   // 입력 중이면 발표가 시작돼도 접어서 지킨다
      actions: [
        { label: '취소' },
        { label: '안건 추가하기', primary: true, onClick: async () => {
          const t = title.value.trim();
          const f = file.files && file.files[0];
          if (!t) { err.textContent = '안건 제목을 넣어 주세요.'; title.focus(); return false; }
          if (f) { const why = precheckFile(f); if (why) { err.textContent = why; return false; } }
          let d;
          try { d = await api.createAgenda(mid, t); }
          catch (e) { err.textContent = errorText(e); return false; }
          if (d?.aid) S.mine.add(d.aid);
          ctx.toast('안건을 추가했어요.', 'ok');
          render();
          if (f && d?.aid) setTimeout(() => startUpload({ aid: d.aid, title: t }, f), 0);
        } }
      ]
    });
  }

  // ---- 자료 올리기·바꾸기: 변환(진행·취소), 미리보기, 올리기(진행·취소) ----
  function pickFile(a) {
    if (S.job) { ctx.toast('지금 올리는 자료가 끝난 뒤에 해 주세요.', 'info'); return; }
    const input = h('input', { type: 'file', accept: ACCEPT, class: 'zz-sr', tabindex: '-1', 'aria-hidden': 'true' });
    input.addEventListener('change', () => { const f = input.files && input.files[0]; input.remove(); if (f) startUpload(a, f); });
    root.append(input);
    input.click();
  }

  async function startUpload(a, file) {
    if (S.job) return;
    const why = precheckFile(file);
    if (why) { ctx.toast(why, 'warn'); return; }
    const job = { aid: a.aid, file, ac: new AbortController(), urls: [], converted: null };
    S.job = job;
    const bar = h('div', { class: 'za-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, h('div', { class: 'za-progress-fill' }));
    const barText = h('p', { class: 'za-progress-text zz-num', 'aria-live': 'polite' });
    const main = h('div', { class: 'za-up-main' });
    const actions = h('div', { class: 'za-up-actions' });
    const body = h('div', { class: 'za-up' }, h('p', { class: 'za-up-file', text: `「${a.title || '안건'}」에 붙일 자료 (${kindLabel(file)})` }), main, actions);
    const setP = p => { const v = progressView(p); bar.firstChild.style.width = Math.round(v.ratio * 100) + '%'; bar.setAttribute('aria-valuenow', String(Math.round(v.ratio * 100))); barText.textContent = v.text; };
    const btn = (label, cls, fn) => h('button', { type: 'button', class: 'zz-btn ' + (cls || ''), onclick: fn }, label);
    const finish = () => { if (S.job !== job) return; try { job.ac.abort(); } catch { /* 끝남 */ } job.urls.forEach(u => URL.revokeObjectURL(u)); S.job = null; };
    const md = modal({ title: '자료 올리기', body, onClose: finish, keep: () => S.job === job });   // 올리는 중이면 접기만
    const cancel = () => { md.close(); ctx.toast('올리기를 취소했어요.', 'info'); };

    setP({ phase: 'load' });
    main.replaceChildren(bar, barText, h('p', { class: 'za-muted', text: '파일을 화면에 띄울 수 있게 바꾸고 있어요. 쪽이 많으면 몇 분 걸릴 수 있어요.' }));
    actions.replaceChildren(btn('취소', 'ghost', cancel));
    try {
      job.converted = await api.convertFile(file, { signal: job.ac.signal, onProgress: p => { if (S.job === job) setP(p); } });
    } catch (e) {
      if (S.job !== job || !alive) return;
      if (isAbort(e)) { md.close(); return; }
      showError(errorText(e), false); return;
    }
    if (S.job !== job || !alive) return;
    showPreview();

    function showPreview() {
      const c = job.converted;
      const thumbs = h('ol', { class: 'za-thumbs' }, (c.thumbs || []).slice(0, 12).map((t, i) => {
        const u = URL.createObjectURL(t); job.urls.push(u);
        return h('li', { class: 'za-thumb' }, h('img', { src: u, alt: `${i + 1}쪽`, loading: 'lazy' }), h('span', { class: 'zz-num', text: String(i + 1) }));
      }));
      const warns = (c.warnings || []).length ? h('ul', { class: 'za-warns' }, c.warnings.map(w => h('li', { text: w }))) : null;
      main.replaceChildren(...[h('p', { class: 'za-muted zz-num', text: `모두 ${c.pages.length}쪽이에요. 미리 보기를 확인한 뒤 올려 주세요.` }), warns, thumbs].filter(Boolean));
      const go = btn('이대로 올리기', 'primary', doUpload);
      actions.replaceChildren(btn('취소', 'ghost', () => md.close()), go);
      setTimeout(() => go.focus(), 0);
    }
    async function doUpload() {
      if (job.ac.signal.aborted) job.ac = new AbortController();
      setP({ phase: 'upload', done: 0, total: job.converted.pages.length * 2 + 1 });
      main.replaceChildren(bar, barText, h('p', { class: 'za-muted', text: '창을 닫지 말고 기다려 주세요.' }));
      actions.replaceChildren(btn('취소', 'ghost', cancel));
      try {
        await api.attachAgendaFile(mid, job.aid, { file: job.file, converted: job.converted, signal: job.ac.signal, onProgress: p => { if (S.job === job) setP(p); } });
        if (S.job !== job || !alive) return;
        md.close();
        ctx.toast('자료를 올렸어요.', 'ok');
      } catch (e) {
        if (S.job !== job || !alive) return;
        if (isAbort(e)) { md.close(); return; }
        showError(errorText(e), true);
      }
    }
    function showError(text, canRetry) {
      main.replaceChildren(h('div', { class: 'za-error', role: 'alert' }, h('p', { text })));
      actions.replaceChildren(...[btn('닫기', 'ghost', () => md.close()), canRetry && job.converted ? btn('다시 올리기', 'primary', () => { job.ac = new AbortController(); showPreview(); }) : null].filter(Boolean));
    }
  }

  // ---- 이름 바꾸기·지우기(올린 사람 또는 주관자) ----
  function openRename(a) {
    const input = h('input', { type: 'text', class: 'za-input', id: 'za-rename', maxlength: '100', value: a.title || '' });
    const err = h('p', { class: 'za-err', role: 'alert' });
    modal({
      title: '이름 바꾸기',
      keep: () => input.value.trim() !== (a.title || ''),
      body: h('div', { class: 'za-form' }, h('label', { class: 'za-field', for: 'za-rename' }, h('span', { text: '안건 제목' }), input), err),
      actions: [{ label: '취소' }, { label: '바꾸기', primary: true, onClick: async () => {
        const v = input.value.trim();
        if (!v) { err.textContent = '안건 제목을 넣어 주세요.'; return false; }
        if (v === a.title) return;
        try { await api.updateAgenda(mid, a.aid, { title: v }); ctx.toast('이름을 바꿨어요.', 'ok'); }
        catch (e) { err.textContent = errorText(e); return false; }
      } }]
    });
  }
  function askDelete(a) {
    if (S.armed !== a.aid) {
      S.armed = a.aid;
      clearTimeout(S.armTimer);
      S.armTimer = setTimeout(() => { S.armed = null; render(); }, 4000);
      render();
      return;
    }
    S.armed = null; clearTimeout(S.armTimer); S.menu = null;
    Promise.resolve(api.deleteAgenda(mid, a.aid)).then(() => { S.mine.delete(a.aid); ctx.toast('안건을 지웠어요.', 'ok'); }, e => ctx.toast(errorText(e), 'error'));
  }

  const onKey = e => {
    if (e.key !== 'Escape' || document.querySelector('.zz-modal')) return;
    if (S.menu) { S.menu = null; render(); return; }
    if (S.open) close();
  };
  document.addEventListener('keydown', onKey);
  offs.push(() => document.removeEventListener('keydown', onKey));
  for (const k of ['meeting', 'live', 'role']) offs.push(store.on(k, () => render()));
  offs.push(store.on('agenda', () => { refreshMine(false); render(); }));
  offs.push(store.on('cmd:agenda-add', () => openAdd()));
  offs.push(store.on('cmd:present', aid => { if (aid === TODAY) { askPresent(TODAY); return; } const a = agenda().find(x => x.aid === aid); if (a) askPresent(a); }));   // 무대 아래 큰 「이 자료 발표하기」(2팀)
  offs.push(store.on('cmd:agenda-open', () => { S.open = true; S.dismissed = false; render(); }));   // 2팀 띠 「오늘의 안건 보기」
  // 「화면은 무조건 발표자가 가져간다」(U16): 손으로 연 패널도 닫는다. 창은 app.js 가 닫거나 접는다
  // 다만 0번 「오늘의 안건」 발표(aid 없음)면 이 정리 화면이 곧 발표 화면이라 접지 않고 펼친다
  offs.push(store.on('cmd:yield', () => {
    const ml = meeting()?.live;
    if (ml && !ml.aid) { S.open = false; S.dismissed = false; render(); return; }
    if (S.open || !root.hidden) { S.open = false; S.dismissed = true; render(); }
  }));
  offs.push(store.on('role', r => { if (r) refreshMine(true); }));
  render();
  refreshMine(true);

  return {
    unmount() {
      alive = false;
      offs.forEach(f => { try { f(); } catch { /* 계속 */ } });
      clearTimeout(mineTimer); clearTimeout(S.armTimer);
      if (S.job) { try { S.job.ac.abort(); } catch { /* 끝남 */ } S.job.urls.forEach(u => URL.revokeObjectURL(u)); S.job = null; }
      for (const m of [...modals]) { try { m.close(); } catch { /* 이미 닫힘 */ } }
      modals.clear();
      root.replaceChildren(); root.hidden = true;
    }
  };
}
