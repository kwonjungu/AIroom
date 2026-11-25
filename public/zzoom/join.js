// 쭘 입장 화면 (디자인 1, EASY_UX 2026-11-26). 자리: #zz-join(입장 전 덮개), #zz-header-actions(입장 뒤 「회의 담당」 표시와 「메뉴」).
// 이름은 묻지 않는다(ANON). 보이고 숨기기는 app.js 가 한다(resume 실패 때 보임). 여기서는 안쪽만 그리고 api.join 만 부른다.
// 「회의 담당자로 들어가기」(담당자 비밀번호)는 참석자 대부분이 쓸 일이 없어 머리줄 「메뉴」 안에 둔다.
// 회의를 만든 분은 같은 로그인이면 서버가 바로 담당자로 들인다. 목록의 「지금 회의 열기」로 오면 기다리지 않고 바로 들어간다.
export const css = 'list.css';

const PEEK_KEY = 'zz_peek:';        // list.js 가 넘겨 둔 제목·일시
const AUTOJOIN_KEY = 'zz_autojoin';  // list.js 「지금 회의 열기」
const KST = 'Asia/Seoul';
function whenText(ms) {
  if (!Number.isFinite(ms)) return '';
  const p = new Intl.DateTimeFormat('ko-KR', { timeZone: KST, month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
    .formatToParts(new Date(ms)).reduce((o, x) => (o[x.type] = x.value, o), {});
  return `${p.month} ${p.day}일(${p.weekday}) ${p.dayPeriod} ${p.hour}:${p.minute}`.replace(/\s+/g, ' ');
}
function readPeek(mid) {
  try { const v = JSON.parse(sessionStorage.getItem(PEEK_KEY + mid) || 'null'); return v && typeof v === 'object' ? v : null; } catch { return null; }
}

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

function errText(e) {
  if (!e) return '회의에 들어가지 못했어요. 다시 해 주세요.';
  if (e.code === 'network' || e.status === 0) return '연결이 끊겼어요. 인터넷을 확인하고 다시 해 주세요.';
  if (e.code === 'login_required') return '백암이에서 먼저 로그인해 주세요.';
  return e.message || '회의에 들어가지 못했어요. 다시 해 주세요.';
}

// 서버 낱말(주관 코드)을 화면 낱말(담당자 비밀번호)로 바꿔 알려 준다
export function codeErrText(e) {
  if (e && e.status === 403 && e.code === 'wrong_code') {
    const left = e.extra && Number.isFinite(e.extra.left) ? e.extra.left : null;
    return left != null ? `번호가 맞지 않아요. ${left}번 더 해 볼 수 있어요.` : '번호가 맞지 않아요. 다시 확인해 주세요.';
  }
  if (e && e.status === 429) return '너무 여러 번 틀렸어요. 10분쯤 뒤에 다시 해 주세요.';
  if (e && e.status === 423) return '담당자 비밀번호를 여러 번 틀려 잠겼어요. 회의를 만든 분이나 관리자에게 잠금을 풀어 달라고 해 주세요.';
  if (e && e.code === 'no_code') return '이 회의는 담당자 비밀번호가 없어요. 회의를 만든 분에게 알려 주세요.';
  if (e && e.code === 'redis_down') return '지금은 담당자로 들어갈 수 없어요. 잠시 뒤에 다시 해 주세요.';
  return errText(e);
}

export function mount(ctx) {
  const root = ctx.el('zz-join');
  const bar = ctx.el('zz-header-actions');
  const api = ctx.api;
  const mid = ctx.mid;
  let alive = true, busy = false;
  let modal = null, menu = null;
  let peek = readPeek(mid);
  let autoJoin = false;
  try { autoJoin = sessionStorage.getItem(AUTOJOIN_KEY) === mid; if (autoJoin) sessionStorage.removeItem(AUTOJOIN_KEY); } catch { /* 무시 */ }
  const offs = [];

  const joined = () => !!ctx.store.get('role');

  // ---------- 덮개 ----------
  function showGone() {
    root.replaceChildren(h('div', { class: 'zl-join' },
      h('div', { class: 'zl-join-card' },
        h('img', { class: 'zl-join-logo', src: ctx.assets('logo'), alt: '', width: 64, height: 64 }),
        h('h1', { class: 'zl-join-title', text: '열 수 없는 회의예요' }),
        h('p', { class: 'zl-join-sub', text: '지워졌거나 보관 기한(10일)이 지난 회의예요.' }),
        h('a', { class: 'zz-btn primary', href: '#/', text: '회의 목록으로 가기' }))));
  }

  // 입장 전에는 회의 구독이 없으므로 제목·일시는 목록이 넘겨 둔 값, 없으면 목록을 한 번 불러 찾는다(EASY_UX B3)
  let looked = false;
  async function lookUp() {
    if (looked || peek || typeof api.listMeetings !== 'function') return;
    looked = true;
    try {
      const r = await api.listMeetings();
      const m = (r && Array.isArray(r.meetings) ? r.meetings : []).find(x => x && x.id === mid);
      if (!alive || !m) return;
      peek = { title: m.title || '', startsAt: m.startsAt, status: m.status };
      if (!joined() && !ctx.store.get('meeting')?.gone) showForm();
    } catch { /* 제목 없이도 들어갈 수 있다 */ }
  }

  function showForm() {
    // 익명(ANON): 이름을 묻지 않는다. 「회의 들어가기」 한 번으로 들어간다.
    const m = ctx.store.get('meeting');
    const title = (m && !m.gone && m.title) || peek?.title || '';
    const status = (m && m.status) || peek?.status || '';
    const startsAt = Number.isFinite(m?.startsAt) ? m.startsAt : peek?.startsAt;
    const ended = status === 'ended';
    const label = ended ? '기록 보기' : '회의 들어가기';
    const err = h('p', { class: 'zl-form-error', role: 'alert', hidden: true });
    const go = h('button', { type: 'submit', class: 'zz-btn primary zl-go', text: label });
    const form = h('form', { class: 'zl-join-form', novalidate: true },
      h('p', { class: 'zl-anon-note', text: '익명으로 참여해요. 이름은 저장되지 않아요.' }),
      err, go);
    const submit = async () => {
      if (busy) return;
      busy = true; go.disabled = true; go.textContent = '들어가는 중';
      err.hidden = true;
      try {
        await api.join(mid);
        // 이후는 store role 이벤트가 덮개를 닫는다
      } catch (e) {
        if (!alive) return;
        err.textContent = errText(e); err.hidden = false;
      } finally {
        busy = false; go.disabled = false; go.textContent = label;
      }
    };
    form.addEventListener('submit', ev => { ev.preventDefault(); submit(); });

    const when = whenText(startsAt);
    root.replaceChildren(h('div', { class: 'zl-join' },
      h('div', { class: 'zl-join-card' },
        h('img', { class: 'zl-join-hero', src: ctx.assets('hero-join'), alt: '' }),
        h('h1', { class: 'zl-join-title', text: title || '회의 들어가기' }),
        when ? h('p', { class: 'zl-join-sub zz-num', text: ended ? `${when} 회의 (끝난 회의예요)` : `${when} 회의` }) : null,
        form)));
    if (autoJoin) { autoJoin = false; setTimeout(() => { if (alive && !joined()) submit(); }, 0); return; }
    setTimeout(() => { if (alive && !joined()) go.focus(); }, 30);
    lookUp();
  }

  function decide() {
    if (!alive) return;
    if (joined()) { root.replaceChildren(); return; }
    if (ctx.store.get('meeting')?.gone) { showGone(); return; }
    showForm();
  }

  // ---------- 머리줄 ----------
  // 참석자: 「메뉴」 하나. 담당자: 「회의 담당」 표시 + 「메뉴」. 익명 안내는 입장 화면에서 이미 했으므로 칩을 두지 않는다.
  function paintBar() {
    closeMenu();
    const r = ctx.store.get('role');
    if (!r) { bar.replaceChildren(); return; }
    const kids = [];
    if (r.role === 'host') kids.push(h('span', { class: 'zl-host-chip zz-chip', text: '회의 담당' }));
    // 이름은 「메뉴」: 담당자 막대의 「더 보기」와 헷갈리지 않게 한다
    const more = h('button', { type: 'button', class: 'zz-btn zl-more', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': 'zl-more-menu', text: '메뉴' });
    more.addEventListener('click', () => (menu ? closeMenu() : openMenu(more)));
    kids.push(h('div', { class: 'zl-more-wrap' }, more));
    bar.replaceChildren(...kids);
  }

  function openMenu(btn) {
    closeMenu();
    const r = ctx.store.get('role');
    const item = (text, cls, fn) => h('button', { type: 'button', class: `zl-menu-item ${cls}`, role: 'menuitem', text, onclick: () => { closeMenu(); fn(); } });
    const items = [];
    if (r && r.role !== 'host') items.push(item('회의 담당자로 들어가기', 'zl-host-btn', openCode));
    items.push(item('회의 목록으로 나가기', 'zl-menu-leave', () => { location.hash = '#/'; }));
    items.push(item('처음 안내 다시 보기', 'zl-menu-tour', () => ctx.store.emit('cmd:onboard', {})));
    const box = h('div', { class: 'zl-menu', id: 'zl-more-menu', role: 'menu', 'aria-label': '메뉴' }, items);
    btn.parentElement.appendChild(box);
    btn.setAttribute('aria-expanded', 'true');
    const away = e => { if (!box.contains(e.target) && e.target !== btn) closeMenu(); };
    const key = e => {
      if (e.key === 'Escape') { closeMenu(); btn.focus(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const all = [...box.querySelectorAll('.zl-menu-item')];
      const i = all.indexOf(document.activeElement);
      const n = e.key === 'ArrowDown' ? (i + 1) % all.length : (i - 1 + all.length) % all.length;
      all[n].focus();
    };
    setTimeout(() => document.addEventListener('pointerdown', away, true), 0);
    box.addEventListener('keydown', key);
    menu = { box, btn, off() { document.removeEventListener('pointerdown', away, true); } };
    box.querySelector('.zl-menu-item')?.focus();
  }
  function closeMenu() {
    if (!menu) return;
    menu.off(); menu.box.remove();
    menu.btn.setAttribute('aria-expanded', 'false');
    menu = null;
  }

  // ---------- 담당자 비밀번호 ----------
  function openCode() {
    if (modal) return;
    const input = h('input', { id: 'zl-hostcode', class: 'zl-input zl-code zz-num', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'one-time-code', placeholder: '숫자 6자리' });
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 6); err.hidden = true; });
    const err = h('p', { class: 'zl-form-error', role: 'alert', hidden: true });
    const ok = h('button', { type: 'submit', class: 'zz-btn primary', text: '담당자로 들어가기' });
    const cancel = h('button', { type: 'button', class: 'zz-btn ghost', text: '취소' });
    const form = h('form', { class: 'zl-form', novalidate: true },
      h('label', { class: 'zl-label', for: 'zl-hostcode', text: '담당자 비밀번호' }),
      input,
      h('p', { class: 'zl-hint', text: '회의를 만든 분에게 받은 숫자 6자리예요. 회의를 만든 분은 넣지 않아도 이미 담당자예요.' }),
      err,
      h('div', { class: 'zl-form-actions' }, cancel, ok));
    const m = ctx.modal({ title: '회의 담당자로 들어가기', body: form, actions: [], onClose: () => { modal = null; } });
    modal = m;
    const close = () => { try { m.close(); } catch { /* 이미 닫힘 */ } modal = null; };
    cancel.addEventListener('click', close);
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (busy) return;
      const c = input.value.trim();
      if (!/^\d{6}$/.test(c)) { err.textContent = '숫자 6자리를 적어 주세요.'; err.hidden = false; input.focus(); return; }
      busy = true; ok.disabled = true; ok.textContent = '확인하는 중';
      try {
        await api.becomeHost(mid, c);
        ctx.toast('회의 담당자로 들어왔어요.', 'ok');
        close();
      } catch (e) {
        if (!alive) return;
        err.textContent = codeErrText(e); err.hidden = false;
        input.value = ''; input.focus();
      } finally {
        busy = false; ok.disabled = false; ok.textContent = '담당자로 들어가기';
      }
    });
    setTimeout(() => input.focus(), 30);
  }

  offs.push(ctx.store.on('role', () => { decide(); paintBar(); }));
  offs.push(ctx.store.on('meeting', () => { if (!joined()) decide(); }));
  decide();
  paintBar();

  return {
    unmount() {
      alive = false;
      offs.forEach(f => f());
      if (modal) { try { modal.close(); } catch { /* 이미 닫힘 */ } modal = null; }
      closeMenu();
      bar.replaceChildren();
      root.replaceChildren();
    },
  };
}
