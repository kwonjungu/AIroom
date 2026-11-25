// 쭘 회의 목록 (디자인 1, EASY_UX 2026-11-26). 자리: #zz-list. fetch·Firebase 는 ctx.api 로만.
// 누구나 회의 만들기. 만든 분과 관리자: 수정, 지우기, 담당자 비밀번호, 잠금 풀기. 모두: 회의 들어가기, 상태, 곧 지워질 때만 남은 날.
// 화면 낱말: 「주관 코드」 대신 「담당자 비밀번호」, 「입장하기」 대신 「회의 들어가기」(서버 값 hostCode 등은 그대로).
export const css = 'list.css';

const KST = 'Asia/Seoul';
const TITLE_MAX = 80; // 서버 한도와 같음

// 작은 DOM 도우미: 글자는 항상 textContent 로 넣는다(XSS 방지).
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

export function formatWhen(ms) {
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  const p = new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST, year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  }).formatToParts(d).reduce((o, x) => (o[x.type] = x.value, o), {});
  return `${p.year}년 ${p.month} ${p.day}일(${p.weekday}) ${p.dayPeriod} ${p.hour}:${p.minute}`.replace(/\s+/g, ' ');
}

// datetime-local 값 <-> 밀리초 (기기 시간대 기준, 학교 PC는 한국 시간)
export function toInputValue(ms) {
  const d = new Date(ms), z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
}
export function fromInputValue(v) { const t = new Date(v).getTime(); return Number.isFinite(t) ? t : NaN; }

// 남은 날 안내는 2일 이하일 때만(모든 카드에 붙으면 경고처럼 보인다, EASY_UX B2)
export const LEFT_SHOW_DAYS = 2;
export function daysLeftText(n) {
  if (!Number.isFinite(n) || n > LEFT_SHOW_DAYS) return '';
  if (n <= 0) return '곧 지워져요';
  if (n === 1) return '1일 안에 지워져요';
  return `${n}일 뒤 지워져요`;
}

export const STATUS = {
  ready: { label: '시작 전', cls: 'ready' },
  live: { label: '회의 중', cls: 'live' },
  ended: { label: '끝난 회의', cls: 'ended' },
  deleting: { label: '지우는 중', cls: 'ended' },
};

// 회의 화면 입장 덮개가 제목과 일시를 바로 보이도록 목록에서 넘겨 둔다(EASY_UX B3). 사람 정보는 없다.
export const PEEK_KEY = 'zz_peek:';
function rememberPeek(m) {
  try { sessionStorage.setItem(PEEK_KEY + m.id, JSON.stringify({ title: m.title || '', startsAt: m.startsAt, status: m.status })); } catch { /* 무시 */ }
}
// 「지금 회의 열기」로 가면 입장 덮개가 기다리지 않고 바로 들어간다(만든 분은 서버가 담당자로 들인다)
export const AUTOJOIN_KEY = 'zz_autojoin';

function errText(e) {
  if (!e) return '알 수 없는 오류가 났어요. 다시 해 주세요.';
  if (e.code === 'network' || e.status === 0) return '연결이 끊겼어요. 인터넷을 확인하고 다시 해 주세요.';
  if (e.code === 'login_required') return '백암이에서 먼저 로그인해 주세요.';
  if (e.code === 'bad_code') return '담당자 비밀번호는 숫자 6자리로 적어 주세요.';   // 서버 낱말(주관 코드)을 화면 낱말로
  return e.message || '요청이 잘 되지 않았어요. 다시 해 주세요.';
}

function randomCode() {
  const a = new Uint32Array(1);
  (globalThis.crypto || window.crypto).getRandomValues(a);
  return String(a[0] % 1000000).padStart(6, '0');
}

export function mount(ctx) {
  const root = ctx.el('zz-list');
  const api = ctx.api;
  let alive = true, loadSeq = 0, busy = false;
  let data = null;        // {meetings, isAdmin}
  let loadError = null;   // ZzError
  let loading = true;
  const openModals = new Set();

  const wrap = h('div', { class: 'zl-wrap' });
  root.replaceChildren(wrap);

  // ---------- 불러오기 ----------
  async function load(quiet) {
    const seq = ++loadSeq;
    if (!quiet) { loading = true; render(); }
    try {
      const r = await api.listMeetings();
      if (!alive || seq !== loadSeq) return;
      data = { meetings: Array.isArray(r?.meetings) ? r.meetings : [], isAdmin: !!r?.isAdmin };
      loadError = null;
    } catch (e) {
      if (!alive || seq !== loadSeq) return;
      loadError = e;
    }
    loading = false;
    render();
  }

  // ---------- 그리기 ----------
  function render() {
    if (!alive) return;
    const isAdmin = !!data?.isAdmin;
    const head = h('div', { class: 'zl-head' },
      h('img', { class: 'zl-head-logo', src: ctx.assets('logo'), alt: '', width: 56, height: 56 }),
      h('div', { class: 'zl-head-text' },
        h('h1', { class: 'zl-title', text: '회의 목록' }),
        h('p', { class: 'zl-sub', text: '선생님들이 한 화면을 함께 보며 이야기하는 자리예요.' })),
      h('div', { class: 'zl-head-actions' },
        h('button', { type: 'button', class: `zz-btn ${data && !data.meetings.length ? '' : 'primary '}zl-new`, onclick: () => openForm(null), text: '회의 만들기' })));

    let body;
    if (loading && !data) body = h('div', { class: 'zl-state', role: 'status' }, h('p', { class: 'zl-state-text', text: '회의 목록을 불러오는 중이에요.' }));
    else if (loadError && !data) body = errorBox();
    else if (!data.meetings.length) body = emptyBox(isAdmin);
    else body = listBox(data.meetings, isAdmin);

    wrap.replaceChildren(...[head, loadError && data ? errorBox(true) : null, body].filter(Boolean));
  }

  function errorBox(soft) {
    return h('div', { class: 'zl-error', role: 'alert' },
      h('p', { class: 'zl-error-text', text: errText(loadError) }),
      h('button', { type: 'button', class: 'zz-btn', onclick: () => load(false), text: '다시 불러오기' }));
  }

  function emptyBox(isAdmin) {
    return h('div', { class: 'zl-empty zz-empty' },
      h('img', { class: 'zl-empty-img', src: ctx.assets('empty-list'), alt: '' }),
      h('p', { class: 'zl-empty-title', text: '아직 열린 회의가 없어요' }),
      h('p', { class: 'zl-empty-text', text: '아래 「첫 회의 만들기」를 누르면 회의가 생기고 이곳에 나타나요.' }),
      h('button', { type: 'button', class: 'zz-btn primary zl-new-first', onclick: () => openForm(null), text: '첫 회의 만들기' }));
  }

  function listBox(meetings, isAdmin) {
    // 회의 중을 맨 위로, 끝난 회의는 맨 아래로(나머지는 서버 순서 유지)
    const rank = m => (m.status === 'live' ? 0 : m.status === 'ended' || m.status === 'deleting' ? 2 : 1);
    const sorted = meetings.map((m, i) => [m, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]);
    return h('ul', { class: 'zl-list' }, sorted.map(m => card(m, isAdmin)));
  }

  function card(m, isAdmin) {
    const st = STATUS[m.status] || STATUS.ready;
    const gone = m.status === 'deleting';
    const left = Number.isFinite(m.daysLeft) ? m.daysLeft : null;
    const meta = [
      h('span', { class: 'zl-when zz-num', text: formatWhen(m.startsAt) }),
      h('span', { class: 'zl-count zz-num', text: `안건 ${m.agendaCount || 0}개` }),
      m.allowRecording === false && h('span', { class: 'zl-count', text: '녹음 없는 회의' }),
    ];
    const leftText = left != null ? daysLeftText(left) : '';
    const chips = [
      h('span', { class: `zl-status zz-chip ${st.cls}` }, m.status === 'live' && h('i', { class: 'zz-live-dot', 'aria-hidden': 'true' }), st.label),
      leftText && h('span', { class: 'zl-left zz-chip warn', text: leftText }),
      (isAdmin || m.mine) && m.hostLocked && h('span', { class: 'zl-locked zz-chip warn', text: '담당자 비밀번호를 여러 번 틀려 잠겼어요' }),
    ];
    const actions = [];
    const ended = m.status === 'ended';
    const name = m.title || '제목 없는';
    if (!gone) {
      actions.push(h('a', {
        class: `zz-btn ${ended ? '' : 'primary '}zl-enter`, href: `#/m/${encodeURIComponent(m.id)}`,
        'aria-label': ended ? `${name} 회의 기록 보기` : `${name} 회의 들어가기`, text: ended ? '기록 보기' : '회의 들어가기',
        onclick: () => rememberPeek(m),
      }));
    }
    if (isAdmin || m.mine) {
      if (m.hostLocked) actions.push(h('button', { type: 'button', class: 'zz-btn zl-unlock', onclick: () => unlock(m), text: '잠금 풀어 주기' }));
      if (!gone) actions.push(h('button', { type: 'button', class: 'zz-btn ghost zl-edit', onclick: () => openForm(m), 'aria-label': `${name} 회의 고치기`, text: '고치기' }));
      actions.push(h('button', { type: 'button', class: 'zz-btn ghost danger zl-del', onclick: () => openDelete(m), 'aria-label': `${name} 회의 지우기`, text: '지우기' }));
    }
    return h('li', { class: `zl-card zz-card${m.status === 'live' ? ' is-live' : ''}`, 'data-mid': m.id },
      h('div', { class: 'zl-card-main' },
        h('h2', { class: 'zl-card-title', text: m.title || '(제목 없음)' }),
        h('p', { class: 'zl-meta' }, meta),
        h('p', { class: 'zl-chips' }, chips)),
      h('div', { class: 'zl-card-actions' }, actions));
  }

  // ---------- 모달 공통 ----------
  // 모달 안에 단추를 직접 둔다(실패했을 때 창을 닫지 않기 위해).
  function openModal(title, body, onClose) {
    const m = ctx.modal({ title, body, actions: [], onClose: () => { openModals.delete(m); onClose && onClose(); } });
    openModals.add(m);
    return m;
  }
  function closeModal(m) { try { m && m.close(); } catch { /* 이미 닫힘 */ } openModals.delete(m); }

  // ---------- 만들기·수정 ----------
  function openForm(m) {
    const editing = !!m;
    const title = h('input', { id: 'zl-f-title', class: 'zl-input', type: 'text', maxlength: TITLE_MAX, autocomplete: 'off', value: editing ? m.title : '', placeholder: '예 12월 교직원 회의' });
    const when = h('input', { id: 'zl-f-when', class: 'zl-input', type: 'datetime-local', value: toInputValue(editing ? m.startsAt : defaultStart()) });
    const code = h('input', { id: 'zl-f-code', class: 'zl-input zl-code zz-num', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off', placeholder: editing ? '바꾸지 않으면 비워 두세요' : '숫자 6자리', 'aria-describedby': 'zl-f-code-hint' });
    code.addEventListener('input', () => { code.value = code.value.replace(/\D/g, '').slice(0, 6); });
    const rec = h('input', { id: 'zl-f-rec', type: 'checkbox', class: 'zl-check' });
    rec.checked = editing ? m.allowRecording !== false : true;
    const err = h('p', { class: 'zl-form-error', role: 'alert', hidden: true });
    const saveLabel = editing ? '저장하기' : '회의 만들기';
    const save = h('button', { type: 'submit', class: 'zz-btn primary', text: saveLabel });
    const cancel = h('button', { type: 'button', class: 'zz-btn ghost', text: '취소' });
    const dice = h('button', { type: 'button', class: 'zz-btn zl-dice', text: '번호 자동으로 만들기', onclick: () => { code.value = randomCode(); code.focus(); } });

    const form = h('form', { class: 'zl-form', novalidate: true },
      field('zl-f-title', '회의 제목', title),
      field('zl-f-when', '회의 일시', when),
      field('zl-f-code', editing ? '담당자 비밀번호 바꾸기' : '담당자 비밀번호 (숫자 6자리)', h('div', { class: 'zl-code-row' }, code, dice),
        editing ? '번호를 바꾸면 지금 담당자로 들어와 있는 분은 새 번호를 다시 넣어야 해요.' : '회의를 이끌 분이 들어올 때 넣는 번호예요. 만든 분은 따로 넣지 않아도 돼요.', 'zl-f-code-hint'),
      h('label', { class: 'zl-check-row', for: 'zl-f-rec' }, rec, h('span', { text: '회의 중 녹음을 쓸 수 있게 해요' })),
      err,
      h('div', { class: 'zl-form-actions' }, cancel, save));

    const modal = openModal(editing ? '회의 고치기' : '회의 만들기', form);
    cancel.addEventListener('click', () => closeModal(modal));
    form.addEventListener('input', () => { err.hidden = true; });
    const fail = t => { err.textContent = t; err.hidden = false; };
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (busy) return;
      err.hidden = true;
      const t = title.value.trim();
      const ms = fromInputValue(when.value);
      const c = code.value.trim();
      if (!t) { fail('회의 제목을 적어 주세요.'); title.focus(); return; }
      if (!Number.isFinite(ms)) { fail('회의 일시를 골라 주세요.'); when.focus(); return; }
      if (!editing && !/^\d{6}$/.test(c)) { fail('담당자 비밀번호는 숫자 6자리로 적어 주세요. 「번호 자동으로 만들기」를 눌러도 돼요.'); code.focus(); return; }
      if (editing && c && !/^\d{6}$/.test(c)) { fail('담당자 비밀번호는 숫자 6자리로 적어 주세요.'); code.focus(); return; }
      busy = true; save.disabled = true; save.textContent = '잠시만요';
      try {
        if (editing) {
          const patch = {};
          if (t !== m.title) patch.title = t;
          if (ms !== m.startsAt) patch.startsAt = ms;
          if (rec.checked !== (m.allowRecording !== false)) patch.allowRecording = rec.checked;
          if (c) patch.hostCode = c;
          const r = Object.keys(patch).length ? await api.updateMeeting(m.id, patch) : { codeChanged: false };
          ctx.toast(r.codeChanged ? '저장했어요. 바뀐 담당자 비밀번호를 담당하실 분에게 알려 주세요.' : '저장했어요.', 'ok');
          closeModal(modal);
        } else {
          const r = await api.createMeeting({ title: t, startsAt: ms, hostCode: c, allowRecording: rec.checked });
          closeModal(modal);
          openDone(r && r.meeting, { title: t, startsAt: ms, code: c });
        }
        if (alive) load(true);
      } catch (e) {
        fail(errText(e));
      } finally {
        busy = false; save.disabled = false; save.textContent = saveLabel;
      }
    });
    setTimeout(() => title.focus(), 30);
  }

  function field(id, label, control, hint, hintId) {
    return h('div', { class: 'zl-field' }, h('label', { class: 'zl-label', for: id, text: label }), control, hint && h('p', { class: 'zl-hint', id: hintId || null, text: hint }));
  }

  // ---------- 만든 뒤: 다음 할 일 하나(EASY_UX B2) ----------
  // 번호는 이 창에서 한 번 보여 주기만 하고 어디에도 저장하지 않는다. 만든 분은 같은 로그인이면 서버가 바로 담당자로 들인다.
  function openDone(meeting, { title, startsAt, code }) {
    const id = meeting && meeting.id;
    const go = h('button', { type: 'button', class: 'zz-btn primary zl-done-go', text: '지금 회의 열기' });
    const back = h('button', { type: 'button', class: 'zz-btn ghost zl-done-back', text: '목록으로' });
    const body = h('div', { class: 'zl-form zl-done' },
      h('p', { class: 'zl-confirm' }, '「', h('strong', { text: title }), '」 회의를 만들었어요.'),
      h('p', { class: 'zl-done-code' }, '담당자 비밀번호는 ', h('b', { class: 'zz-num', text: code }), ' 이에요.'),
      h('p', { class: 'zl-hint', text: '다른 분이 담당을 맡으면 이 번호를 알려 주세요. 잊으면 목록의 「고치기」에서 새로 정할 수 있어요.' }),
      h('div', { class: 'zl-form-actions' }, back, id ? go : null));
    const modal = openModal('회의를 만들었어요', body);
    back.addEventListener('click', () => closeModal(modal));
    go.addEventListener('click', () => {
      rememberPeek({ id, title, startsAt, status: (meeting && meeting.status) || 'ready' });
      try { sessionStorage.setItem(AUTOJOIN_KEY, id); } catch { /* 무시: 그러면 「회의 들어가기」를 한 번 누르면 된다 */ }
      closeModal(modal);
      location.hash = `#/m/${encodeURIComponent(id)}`;
    });
    setTimeout(() => (id ? go : back).focus(), 30);
  }

  function defaultStart() {
    const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1);
    return d.getTime();
  }

  // ---------- 삭제 ----------
  function openDelete(m) {
    const err = h('p', { class: 'zl-form-error', role: 'alert', hidden: true });
    const ok = h('button', { type: 'button', class: 'zz-btn danger', text: '회의 지우기' });
    const cancel = h('button', { type: 'button', class: 'zz-btn ghost', text: '취소' });
    const body = h('div', { class: 'zl-form' },
      h('p', { class: 'zl-confirm' }, '「', h('strong', { text: m.title }), '」 회의를 지울까요?'),
      h('p', { class: 'zl-hint', text: '올려 둔 안건과 판서, 채팅, 녹음 기록이 모두 사라지고 되돌릴 수 없어요.' }),
      err,
      h('div', { class: 'zl-form-actions' }, cancel, ok));
    const modal = openModal('회의 지우기', body);
    cancel.addEventListener('click', () => closeModal(modal));
    ok.addEventListener('click', async () => {
      if (busy) return;
      busy = true; ok.disabled = true; ok.textContent = '지우는 중';
      err.hidden = true;
      try {
        const r = await api.deleteMeeting(m.id);
        ctx.toast(r && r.queued ? '지우기 시작했어요. 곧 모두 정리돼요.' : '지웠어요.', 'ok');
        closeModal(modal);
        if (alive) load(true);
      } catch (e) {
        err.textContent = errText(e); err.hidden = false;
      } finally {
        busy = false; ok.disabled = false; ok.textContent = '회의 지우기';
      }
    });
    setTimeout(() => cancel.focus(), 30);
  }

  // ---------- 잠금 풀기 ----------
  async function unlock(m) {
    if (busy) return;
    busy = true;
    try {
      await api.unlockHost(m.id);
      ctx.toast('잠금을 풀었어요. 담당자 비밀번호를 다시 넣을 수 있어요.', 'ok');
      if (alive) load(true);
    } catch (e) {
      ctx.toast(errText(e), 'error');
    } finally { busy = false; }
  }

  // 탭이 다시 보이면 최신으로
  const onVis = () => { if (document.visibilityState === 'visible' && data) load(true); };
  document.addEventListener('visibilitychange', onVis);

  render();
  load(true);

  return {
    unmount() {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
      for (const m of [...openModals]) closeModal(m);
      root.replaceChildren();
    },
  };
}
