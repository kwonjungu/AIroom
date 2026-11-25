// 쭘 입장 화면 (디자인 1). 자리: #zz-join(입장 전 덮개), #zz-header-actions(입장 뒤 내 이름·주관 코드 넣기).
// 보이고 숨기기는 app.js 가 한다(resume 실패 때 보임). 여기서는 안쪽만 그리고 api.join 만 부른다.
export const css = 'list.css';

const NAME_MAX = 20;       // 서버 이름 한도

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
  if (!e) return '입장하지 못했어요. 다시 해 주세요.';
  if (e.code === 'network' || e.status === 0) return '연결이 끊겼어요. 인터넷을 확인하고 다시 해 주세요.';
  if (e.code === 'login_required') return '백암이에서 먼저 로그인해 주세요.';
  return e.message || '입장하지 못했어요. 다시 해 주세요.';
}

function codeErrText(e) {
  if (e && e.status === 403 && e.code === 'wrong_code') {
    const left = e.extra && Number.isFinite(e.extra.left) ? e.extra.left : null;
    return left != null ? `코드가 맞지 않아요. ${left}번 더 해 볼 수 있어요.` : '코드가 맞지 않아요. 다시 확인해 주세요.';
  }
  if (e && e.status === 429) return '너무 여러 번 틀렸어요. 잠시 뒤에 다시 해 주세요.';
  if (e && e.status === 423) return '이 회의는 주관 입장이 잠겨 있어요. 관리자에게 잠금을 풀어 달라고 해 주세요.';
  return errText(e);
}

export function mount(ctx) {
  const root = ctx.el('zz-join');
  const bar = ctx.el('zz-header-actions');
  const api = ctx.api;
  const mid = ctx.mid;
  let alive = true, busy = false, names = [], namesLoaded = false;
  let modal = null;
  const offs = [];

  const joined = () => !!ctx.store.get('role');

  // ---------- 덮개 ----------
  function showGone() {
    root.replaceChildren(h('div', { class: 'zl-join' },
      h('div', { class: 'zl-join-card' },
        h('img', { class: 'zl-join-logo', src: ctx.assets('logo'), alt: '', width: 64, height: 64 }),
        h('h1', { class: 'zl-join-title', text: '열 수 없는 회의예요' }),
        h('p', { class: 'zl-join-sub', text: '삭제됐거나 보관 기한이 지난 회의예요.' }),
        h('a', { class: 'zz-btn primary', href: '#/', text: '회의 목록으로 가기' }))));
  }

  function showForm() {
    const input = h('input', { id: 'zl-name', class: 'zl-input zl-name', type: 'text', maxlength: NAME_MAX, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: '이름을 적거나 아래에서 골라 주세요' });
    input.value = (api.rememberedName() || '').slice(0, NAME_MAX);
    const err = h('p', { class: 'zl-form-error', role: 'alert', hidden: true });
    const go = h('button', { type: 'submit', class: 'zz-btn primary zl-go', text: '입장하기' });
    const list = h('div', { class: 'zl-names', role: 'group', 'aria-label': '교직원 이름' });

    function paintNames() {
      const q = input.value.trim();
      const shown = names.filter(n => !q || n.includes(q)).slice(0, 60);
      list.hidden = !shown.length;
      list.replaceChildren(...shown.map(n => h('button', {
        type: 'button', class: `zl-name-chip zz-chip${n === q ? ' on' : ''}`, 'aria-pressed': n === q ? 'true' : 'false', text: n,
        onclick: () => { input.value = n; paintNames(); input.focus(); },
      })));
    }
    input.addEventListener('input', () => { err.hidden = true; paintNames(); });
    paintNames();
    if (!namesLoaded) {
      namesLoaded = true;
      api.staffNames().then(r => { if (!alive) return; names = Array.isArray(r) ? r.filter(n => typeof n === 'string' && n.trim()) : []; paintNames(); }).catch(() => {});
    } else paintNames();

    const form = h('form', { class: 'zl-join-form', novalidate: true },
      h('label', { class: 'zl-label', for: 'zl-name', text: '이름' }),
      input, list, err, go);
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (busy) return;
      const name = input.value.trim().replace(/\s+/g, ' ');
      if (!name) { err.textContent = '이름을 적거나 골라 주세요.'; err.hidden = false; input.focus(); return; }
      busy = true; go.disabled = true; go.textContent = '들어가는 중';
      err.hidden = true;
      try {
        await api.join(mid, name);
        api.rememberName(name);
        // 이후는 store role 이벤트가 덮개를 닫는다
      } catch (e) {
        if (!alive) return;
        err.textContent = errText(e); err.hidden = false;
      } finally {
        busy = false; go.disabled = false; go.textContent = '입장하기';
      }
    });

    root.replaceChildren(h('div', { class: 'zl-join' },
      h('div', { class: 'zl-join-card' },
        h('img', { class: 'zl-join-hero', src: ctx.assets('hero-join'), alt: '' }),
        h('h1', { class: 'zl-join-title', text: ctx.store.get('meeting')?.title || '회의에 들어가요' }),
        h('p', { class: 'zl-join-sub', text: '이름을 고르면 바로 들어가요.' }),
        form)));
    setTimeout(() => { if (alive && !joined()) { input.focus(); input.select(); } }, 30);
  }

  function decide() {
    if (!alive) return;
    if (joined()) { root.replaceChildren(); return; }
    if (ctx.store.get('meeting')?.gone) { showGone(); return; }
    showForm();
  }

  // ---------- 머리줄 ----------
  function paintBar() {
    const r = ctx.store.get('role');
    if (!r) { bar.replaceChildren(); return; }
    const kids = [h('span', { class: 'zl-me', title: '내 이름' }, h('span', { class: 'zl-me-label', text: '내 이름' }), h('strong', { class: 'zl-me-name', text: r.name }))];
    if (r.role === 'host') kids.push(h('span', { class: 'zl-host-chip zz-chip', text: '주관자' }));
    else kids.push(h('button', { type: 'button', class: 'zz-btn zl-host-btn', onclick: openCode, text: '주관 코드 넣기' }));
    bar.replaceChildren(...kids);
  }

  // ---------- 주관 코드 ----------
  function openCode() {
    if (modal) return;
    const input = h('input', { id: 'zl-hostcode', class: 'zl-input zl-code zz-num', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'one-time-code', placeholder: '숫자 6자리' });
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 6); err.hidden = true; });
    const err = h('p', { class: 'zl-form-error', role: 'alert', hidden: true });
    const ok = h('button', { type: 'submit', class: 'zz-btn primary', text: '주관자로 들어가기' });
    const cancel = h('button', { type: 'button', class: 'zz-btn ghost', text: '닫기' });
    const form = h('form', { class: 'zl-form', novalidate: true },
      h('label', { class: 'zl-label', for: 'zl-hostcode', text: '주관 코드' }),
      input,
      h('p', { class: 'zl-hint', text: '회의를 만든 관리자에게 받은 숫자 6자리예요.' }),
      err,
      h('div', { class: 'zl-form-actions' }, cancel, ok));
    const m = ctx.modal({ title: '주관 코드 넣기', body: form, actions: [], onClose: () => { modal = null; } });
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
        ctx.toast('주관자로 들어왔어요.', 'ok');
        close();
      } catch (e) {
        if (!alive) return;
        err.textContent = codeErrText(e); err.hidden = false;
        input.value = ''; input.focus();
      } finally {
        busy = false; ok.disabled = false; ok.textContent = '주관자로 들어가기';
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
      bar.replaceChildren();
      root.replaceChildren();
    },
  };
}
