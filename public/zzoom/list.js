// 쭘 회의 목록 (디자인 1). 자리: #zz-list. fetch·Firebase 는 ctx.api 로만.
// 관리자: 만들기·수정·삭제·주관 코드·잠금 풀기. 모두: 입장 링크, 상태, D-n 삭제 표시.
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

export function daysLeftText(n) {
  if (!Number.isFinite(n)) return '';
  if (n <= 0) return '곧 삭제돼요';
  if (n === 1) return '1일 안에 삭제돼요';
  return `${n}일 뒤 삭제돼요`;
}

const STATUS = {
  ready: { label: '준비 중', cls: 'ready' },
  live: { label: '진행 중', cls: 'live' },
  ended: { label: '끝났어요', cls: 'ended' },
  deleting: { label: '삭제하는 중', cls: 'ended' },
};

function errText(e) {
  if (!e) return '알 수 없는 오류가 났어요. 다시 해 주세요.';
  if (e.code === 'network' || e.status === 0) return '연결이 끊겼어요. 인터넷을 확인하고 다시 해 주세요.';
  if (e.code === 'login_required') return '백암이에서 먼저 로그인해 주세요.';
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
        h('h1', { class: 'zl-title', text: '회의' }),
        h('p', { class: 'zl-sub', text: '선생님들이 한 화면을 함께 보며 이야기하는 자리예요.' })),
      h('div', { class: 'zl-head-actions' },
        h('button', { type: 'button', class: 'zz-btn ghost zl-refresh', onclick: () => load(false), disabled: loading, text: '새로 고침' }),
        isAdmin && h('button', { type: 'button', class: 'zz-btn primary zl-new', onclick: () => openForm(null), text: '새 회의 만들기' })));

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
      h('p', { class: 'zl-empty-text', text: isAdmin ? '새 회의를 만들면 이곳에 나타나요.' : '관리자가 회의를 만들면 이곳에 나타나요.' }),
      isAdmin && h('button', { type: 'button', class: 'zz-btn primary', onclick: () => openForm(null), text: '새 회의 만들기' }));
  }

  function listBox(meetings, isAdmin) {
    // 진행 중인 회의를 맨 위로(나머지는 서버 순서 유지)
    const rank = m => (m.status === 'live' ? 0 : 1);
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
      m.allowRecording === false && h('span', { class: 'zl-count', text: '녹음 안 함' }),
    ];
    const chips = [
      h('span', { class: `zl-status zz-chip ${st.cls}` }, m.status === 'live' && h('i', { class: 'zz-live-dot', 'aria-hidden': 'true' }), st.label),
      left != null && h('span', { class: `zl-left zz-chip${left <= 2 ? ' warn' : ''}`, text: daysLeftText(left) }),
      isAdmin && m.hostLocked && h('span', { class: 'zl-locked zz-chip warn', text: '주관 입장이 잠겼어요' }),
    ];
    const actions = [];
    if (!gone) actions.push(h('a', { class: 'zz-btn primary zl-enter', href: `#/m/${encodeURIComponent(m.id)}`, 'aria-label': `${m.title} 입장하기`, text: '입장하기' }));
    if (isAdmin) {
      if (m.hostLocked) actions.push(h('button', { type: 'button', class: 'zz-btn zl-unlock', onclick: () => unlock(m), text: '잠금 풀기' }));
      if (!gone) actions.push(h('button', { type: 'button', class: 'zz-btn ghost zl-edit', onclick: () => openForm(m), 'aria-label': `${m.title} 수정하기`, text: '수정' }));
      actions.push(h('button', { type: 'button', class: 'zz-btn ghost danger zl-del', onclick: () => openDelete(m), 'aria-label': `${m.title} 삭제하기`, text: '삭제' }));
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
    const code = h('input', { id: 'zl-f-code', class: 'zl-input zl-code zz-num', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off', placeholder: editing ? '바꾸지 않으면 비워 두세요' : '숫자 6자리' });
    code.addEventListener('input', () => { code.value = code.value.replace(/\D/g, '').slice(0, 6); });
    const rec = h('input', { id: 'zl-f-rec', type: 'checkbox', class: 'zl-check' });
    rec.checked = editing ? m.allowRecording !== false : true;
    const err = h('p', { class: 'zl-form-error', role: 'alert', hidden: true });
    const save = h('button', { type: 'submit', class: 'zz-btn primary', text: editing ? '저장하기' : '만들기' });
    const cancel = h('button', { type: 'button', class: 'zz-btn ghost', text: '닫기' });
    const dice = h('button', { type: 'button', class: 'zz-btn ghost zl-dice', text: '숫자 정해 주기', onclick: () => { code.value = randomCode(); code.focus(); } });

    const form = h('form', { class: 'zl-form', novalidate: true },
      field('zl-f-title', '회의 제목', title),
      field('zl-f-when', '회의 일시', when),
      field('zl-f-code', editing ? '주관 코드 바꾸기' : '주관 코드', h('div', { class: 'zl-code-row' }, code, dice),
        editing ? '코드를 바꾸면 지금 주관자로 들어와 있는 분은 다시 코드를 넣어야 해요.' : '주관자가 입장할 때 넣는 숫자 6자리예요. 따로 알려 주세요.'),
      h('label', { class: 'zl-check-row', for: 'zl-f-rec' }, rec, h('span', { text: '녹음을 허용해요' })),
      err,
      h('div', { class: 'zl-form-actions' }, cancel, save));

    const modal = openModal(editing ? '회의 수정하기' : '새 회의 만들기', form);
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
      if (!editing && !/^\d{6}$/.test(c)) { fail('주관 코드는 숫자 6자리로 적어 주세요.'); code.focus(); return; }
      if (editing && c && !/^\d{6}$/.test(c)) { fail('주관 코드는 숫자 6자리로 적어 주세요.'); code.focus(); return; }
      busy = true; save.disabled = true; save.textContent = '잠시만요';
      try {
        if (editing) {
          const patch = {};
          if (t !== m.title) patch.title = t;
          if (ms !== m.startsAt) patch.startsAt = ms;
          if (rec.checked !== (m.allowRecording !== false)) patch.allowRecording = rec.checked;
          if (c) patch.hostCode = c;
          const r = Object.keys(patch).length ? await api.updateMeeting(m.id, patch) : { codeChanged: false };
          ctx.toast(r.codeChanged ? '저장했어요. 바뀐 주관 코드를 주관자에게 알려 주세요.' : '저장했어요.', 'ok');
        } else {
          await api.createMeeting({ title: t, startsAt: ms, hostCode: c, allowRecording: rec.checked });
          ctx.toast('회의를 만들었어요.', 'ok');
        }
        closeModal(modal);
        if (alive) load(true);
      } catch (e) {
        fail(errText(e));
      } finally {
        busy = false; save.disabled = false; save.textContent = editing ? '저장하기' : '만들기';
      }
    });
    setTimeout(() => title.focus(), 30);
  }

  function field(id, label, control, hint) {
    return h('div', { class: 'zl-field' }, h('label', { class: 'zl-label', for: id, text: label }), control, hint && h('p', { class: 'zl-hint', text: hint }));
  }

  function defaultStart() {
    const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1);
    return d.getTime();
  }

  // ---------- 삭제 ----------
  function openDelete(m) {
    const err = h('p', { class: 'zl-form-error', role: 'alert', hidden: true });
    const ok = h('button', { type: 'button', class: 'zz-btn danger', text: '삭제하기' });
    const cancel = h('button', { type: 'button', class: 'zz-btn ghost', text: '그만두기' });
    const body = h('div', { class: 'zl-form' },
      h('p', { class: 'zl-confirm' }, '「', h('strong', { text: m.title }), '」 회의를 삭제할까요?'),
      h('p', { class: 'zl-hint', text: '올려 둔 안건과 판서, 채팅, 기록이 모두 사라지고 되돌릴 수 없어요.' }),
      err,
      h('div', { class: 'zl-form-actions' }, cancel, ok));
    const modal = openModal('회의 삭제하기', body);
    cancel.addEventListener('click', () => closeModal(modal));
    ok.addEventListener('click', async () => {
      if (busy) return;
      busy = true; ok.disabled = true; ok.textContent = '삭제하는 중';
      err.hidden = true;
      try {
        const r = await api.deleteMeeting(m.id);
        ctx.toast(r && r.queued ? '삭제를 시작했어요. 곧 모두 정리돼요.' : '삭제했어요.', 'ok');
        closeModal(modal);
        if (alive) load(true);
      } catch (e) {
        err.textContent = errText(e); err.hidden = false;
      } finally {
        busy = false; ok.disabled = false; ok.textContent = '삭제하기';
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
      ctx.toast('주관 입장 잠금을 풀었어요.', 'ok');
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
