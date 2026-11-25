// 쭘 주관자 막대 (디자인 5팀). 자리: #zz-hostbar-main
// 시작·끝내기, 진행 넘겨받기, 모두 내 화면으로, 판서 잠금, 접속자, AI용 기록 받기, 안건 관리.
// 쪽 지우기는 draw.js, 화이트보드 띄우기는 board.js 몫(CONTRACTS 8절).
export const css = 'host.css';

// ---------- 순수 함수(단위 시험용) ----------
export const SEEN_CHECK_MS = 90 * 1000;   // 이보다 오래 소식 없으면 「연결 확인 중」(D-3)
export const SEEN_LEFT_MS = 5 * 60 * 1000; // 이보다 오래면 「나감」

/** 접속 상태: 'on' 접속 중, 'checking' 연결 확인 중, 'left' 나감 */
export function presence(p, now) {
  if (!p || p.left) return 'left';
  const age = now - (Number(p.seenAt) || 0);
  if (age > SEEN_LEFT_MS) return 'left';
  if (age > SEEN_CHECK_MS) return 'checking';
  return 'on';
}
export const PRESENCE_LABEL = { on: '접속 중', checking: '연결 확인 중', left: '나감' };

/** 접속자 목록을 상태별로 정렬(접속 중, 확인 중, 나감 순, 같은 상태는 이름 순) */
export function sortPeople(people, now) {
  const rank = { on: 0, checking: 1, left: 2 };
  return (people || [])
    .map(p => ({ ...p, state: presence(p, now) }))
    .sort((a, b) => rank[a.state] - rank[b.state] || String(a.name).localeCompare(String(b.name), 'ko'));
}

/** 머리 숫자: 주관자는 people 로 직접 센다. 없으면 서버 counts */
export function countOnline(people, counts, now) {
  if (Array.isArray(people) && people.length) return people.filter(p => presence(p, now) !== 'left').length;
  return Number(counts?.people) || 0;
}

/** 안건 순서 바꾸기 결과 index(경계면 null) */
export function moveIndex(list, aid, dir) {
  const i = (list || []).findIndex(a => a.aid === aid);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return null;
  return j;
}

/** 안건 이름(화이트보드는 번호) */
export function agendaLabel(a, i) {
  if (!a) return '';
  if (a.kind === 'board') return a.title || `화이트보드 ${a.boardNo || ''}`.trim();
  return a.title || `안건 ${i + 1}`;
}

// ---------- 화면 ----------
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

function errText(e) {
  return (e && e.message) || '잠시 뒤 다시 해 주세요.';
}

export function mount(ctx) {
  const { api, store } = ctx;
  const mid = ctx.mid;
  const root = ctx.el('zz-hostbar-main');
  const offs = [];
  let alive = true;
  let peopleModal = null;
  let agendaModal = null;
  let peopleTimer = 0;

  const icon = name => h('img', { class: 'zz-icon', src: ctx.assets(name), alt: '' });
  // opts.short: 좁은 화면(1440px 미만)에서 보일 짧은 글. opts.iconOnly: 900px 미만에서 그림만(aria-label 로 이름)
  const btn = (label, opts = {}) => {
    const cls = ['zz-btn', 'zh-btn', opts.cls, opts.short && 'has-short', opts.iconOnly && opts.icon && 'zh-narrow-icon'].filter(Boolean).join(' ');
    const b = h('button', { type: 'button', class: cls, 'aria-label': opts.aria || (opts.short ? label : null) },
      opts.icon ? icon(opts.icon) : null, h('span', { class: 'zh-label', text: label }),
      opts.short ? h('span', { class: 'zh-short', 'aria-hidden': 'true', text: opts.short }) : null);
    if (opts.onClick) b.addEventListener('click', opts.onClick);
    return b;
  };
  const setLabel = (b, text, short) => {
    b.querySelector('.zh-label').textContent = text;
    const s = b.querySelector('.zh-short');
    if (s) { if (short) s.textContent = short; b.setAttribute('aria-label', text); }
  };

  /** 단추를 누르는 동안 막고, 오류는 토스트로 */
  async function run(button, fn) {
    if (button) button.disabled = true;
    try { return await fn(); } catch (e) { if (alive) ctx.toast(errText(e), 'error'); return undefined; } finally {
      if (button && alive) { button.disabled = false; sync(); }
    }
  }

  // --- 막대 요소 ---
  const status = h('span', { class: 'zh-status', role: 'status' });
  const bStart = btn('회의 시작', { cls: 'primary', onClick: () => run(bStart, () => api.setState(mid, 'start')) });
  const bEnd = btn('회의 끝내기', { cls: 'danger', short: '끝내기', onClick: confirmEnd });
  const bTake = btn('진행 넘겨받기', { icon: 'icon-follow', short: '넘겨받기', cls: 'zh-xs-icon', onClick: () => run(bTake, async () => {
    await api.takePresenter(mid);
    ctx.toast('이제 내가 진행해요.', 'ok');
  }) });
  const bForce = btn('모두 내 화면으로', { icon: 'icon-follow', short: '모두 내 화면', iconOnly: true, onClick: () => {
    store.emit('cmd:force');
    ctx.toast('모두의 화면을 내 화면에 맞췄어요.', 'ok');
  } });
  const bLock = btn('판서 잠금', { icon: 'icon-pen', short: '잠금', iconOnly: true, onClick: () => run(bLock, async () => {
    const next = !store.get('meeting')?.penLock;
    await api.setState(mid, 'penLock', next);
    ctx.toast(next ? '판서를 잠갔어요. 주관자만 그릴 수 있어요.' : '판서 잠금을 풀었어요.', 'ok');
  }) });
  const bPeople = btn('접속자', { icon: 'icon-people', short: '0명', onClick: openPeople });
  const bAgenda = btn('안건 관리', { short: '안건', onClick: openAgenda });
  const bExport = btn('AI용 기록 받기', { icon: 'icon-export', short: 'AI 기록', iconOnly: true, onClick: () => run(bExport, async () => {
    setLabel(bExport, '기록 만드는 중');
    try { await api.exportMd(mid); ctx.toast('AI용 기록 파일을 받았어요.', 'ok'); } finally { setLabel(bExport, 'AI용 기록 받기'); }
  }) });

  // 1024px 미만: 자주 쓰는 것(시작·끝내기·넘겨받기)만 막대에 두고 나머지는 「더 보기」 창으로
  const bMore = btn('더 보기', { cls: 'zh-more', onClick: openMore });
  const groupMain = h('div', { class: 'zh-group' }, status, bStart, bEnd, bTake, bForce, bMore);
  const groupTools = h('div', { class: 'zh-group zh-tools' }, bLock, bAgenda, bPeople, bExport);
  root.replaceChildren(h('div', { class: 'zh-bar' }, groupMain, groupTools));

  let moreModal = null;
  function openMore() {
    if (moreModal) return;
    const list = h('div', { class: 'zh-more-list' });
    const fill = () => {
      list.replaceChildren(...[bLock, bAgenda, bPeople, bExport].filter(b => !b.hidden).map(src => {
        const label = src.querySelector('.zh-label').textContent;
        const img = src.querySelector('img');
        const b = h('button', { type: 'button', class: 'zz-btn zh-btn zh-more-item', 'aria-pressed': src.getAttribute('aria-pressed') },
          img ? h('img', { class: 'zz-icon', src: img.getAttribute('src'), alt: '' }) : null, h('span', { text: label }));
        b.disabled = src.disabled;
        b.addEventListener('click', () => { if (moreModal) moreModal.close(); src.click(); });
        return b;
      }));
    };
    fill();
    moreModal = ctx.modal({
      title: '더 보기', body: list,
      actions: [{ label: '닫기', onClick: () => moreModal && moreModal.close() }],
      onClose: () => { moreModal = null; }
    });
    moreModal.refresh = fill;
  }

  function confirmEnd() {
    const m = ctx.modal({
      title: '회의를 끝낼까요?',
      body: h('div', { class: 'zh-modal-text' },
        h('p', { text: '끝내면 다시 열 수 없어요.' }),
        h('p', { text: '열린 투표는 닫히고 녹음도 멈춰요. 기록은 다시 볼 수 있어요.' })),
      actions: [
        { label: '취소', onClick: () => m.close() },
        { label: '회의 끝내기', primary: true, onClick: () => { m.close(); run(bEnd, () => api.setState(mid, 'end')); } }
      ]
    });
  }

  // --- 상태 맞추기 ---
  function sync() {
    if (!alive) return;
    const m = store.get('meeting') || {};
    const role = store.get('role') || {};
    const st = m.status || 'ready';
    const ended = st === 'ended' || m.gone;
    const presenter = !!role.presenter;
    const pres = m.presenter;

    let text;
    if (ended) text = '회의가 끝났어요';
    else if (st === 'ready') text = '시작 전';
    else if (presenter) text = '내가 진행 중';
    else if (pres?.name) text = `${pres.name} 님이 진행 중`;
    else text = '진행 중';
    status.textContent = text;
    status.className = 'zh-status' + (st === 'live' && !ended ? ' is-live' : '');

    bStart.hidden = st !== 'ready' || ended;
    bEnd.hidden = st !== 'live' || ended;
    bTake.hidden = ended || presenter || st === 'ready' && !pres;
    bForce.hidden = ended || !presenter || st !== 'live';
    bLock.hidden = ended;
    setLabel(bLock, m.penLock ? '판서 잠금 풀기' : '판서 잠금', m.penLock ? '잠금 풀기' : '잠금');
    bLock.setAttribute('aria-pressed', m.penLock ? 'true' : 'false');
    bLock.classList.toggle('is-on', !!m.penLock);

    const n = countOnline(store.get('people'), store.get('counts') || m.counts, Date.now());
    setLabel(bPeople, `접속자 ${n}명`, `${n}명`);
    if (peopleModal) renderPeople();
    if (agendaModal) renderAgenda();
    if (moreModal && moreModal.refresh) moreModal.refresh();
  }

  // --- 접속자 ---
  const peopleBox = h('div', { class: 'zh-people' });
  function renderPeople() {
    const list = sortPeople(store.get('people'), Date.now());
    if (!list.length) {
      peopleBox.replaceChildren(h('p', { class: 'zh-muted', text: '아직 접속자 정보가 없어요. 잠시 뒤 다시 보여 드려요.' }));
      return;
    }
    const on = list.filter(p => p.state !== 'left').length;
    peopleBox.replaceChildren(
      h('p', { class: 'zh-muted' }, `지금 ${on}명이 함께하고 있어요.`),
      h('ul', { class: 'zh-people-list' }, list.map(p => h('li', { class: 'zh-person is-' + p.state },
        h('span', { class: 'zh-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'zh-person-name', text: p.name || '이름 없음' }),
        p.role === 'host' ? h('span', { class: 'zz-chip zh-chip', text: '주관자' }) : null,
        h('span', { class: 'zh-person-state', text: PRESENCE_LABEL[p.state] }))))
    );
  }
  function openPeople() {
    if (peopleModal) return;
    renderPeople();
    peopleModal = ctx.modal({
      title: '접속자',
      body: peopleBox,
      actions: [{ label: '닫기', primary: true, onClick: () => peopleModal && peopleModal.close() }],
      onClose: () => { peopleModal = null; clearInterval(peopleTimer); }
    });
    clearInterval(peopleTimer);
    peopleTimer = setInterval(renderPeople, 15000); // 시간이 지나 상태가 바뀌는 것 반영
  }

  // --- 안건 관리 ---
  const agendaBox = h('div', { class: 'zh-agenda' });
  let armedDelete = null; // 한 번 더 눌러야 지운다
  let armTimer = 0;
  function renderAgenda() {
    if (agendaBox.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return; // 이름 고치는 중엔 다시 그리지 않음
    const list = store.get('agenda') || [];
    const m = store.get('meeting') || {};
    const ended = m.status === 'ended' || m.gone;
    const liveAid = store.get('live')?.aid || m.live?.aid;
    if (!list.length) {
      agendaBox.replaceChildren(h('div', { class: 'zz-empty zh-empty' },
        h('img', { src: ctx.assets('empty-agenda'), alt: '' }),
        h('p', { text: '아직 올린 안건이 없어요. 「안건 올리기」로 파일을 올려 주세요.' })));
      return;
    }
    agendaBox.replaceChildren(...[
      ended ? h('p', { class: 'zh-muted', text: '끝난 회의라 안건을 바꿀 수 없어요. 원본은 받을 수 있어요.' }) : null,
      h('ol', { class: 'zh-agenda-list' }, list.map((a, i) => {
        const isLive = a.aid === liveAid;
        const title = h('input', {
          class: 'zh-title-input', type: 'text', value: agendaLabel(a, i), maxlength: '100',
          'aria-label': `안건 ${i + 1} 이름`, disabled: ended || null,
        });
        const save = () => {
          const v = title.value.trim();
          if (!v || v === agendaLabel(a, i)) { title.value = agendaLabel(a, i); return; }
          run(null, async () => { await api.updateAgenda(mid, a.aid, { title: v }); ctx.toast('이름을 바꿨어요.', 'ok'); });
        };
        title.addEventListener('change', save);
        title.addEventListener('keydown', e => { if (e.key === 'Enter') title.blur(); });
        const up = btn('위로', { aria: `안건 ${i + 1} 위로`, cls: 'ghost', onClick: () => move(a.aid, -1, up) });
        const down = btn('아래로', { aria: `안건 ${i + 1} 아래로`, cls: 'ghost', onClick: () => move(a.aid, 1, down) });
        up.disabled = ended || i === 0;
        down.disabled = ended || i === list.length - 1;
        const view = btn('보기', { cls: 'ghost', onClick: () => { store.emit('cmd:nav', { aid: a.aid, page: 1 }); agendaModal && agendaModal.close(); } });
        const orig = a.original ? btn('원본 받기', { cls: 'ghost', onClick: () => run(orig, () => downloadOriginal(a)) }) : null;
        const del = btn(armedDelete === a.aid ? '정말 지우기' : '지우기', { cls: 'danger', onClick: () => askDelete(a, del) });
        del.disabled = ended || isLive;
        if (isLive) del.title = '진행 중인 안건은 지울 수 없어요';
        return h('li', { class: 'zh-agenda-item' + (isLive ? ' is-live' : '') },
          h('span', { class: 'zh-agenda-no zz-num', text: String(i + 1) }),
          h('div', { class: 'zh-agenda-main' }, title,
            h('span', { class: 'zh-muted zz-num' }, a.kind === 'board' ? `화이트보드 ${a.pages || 1}쪽` : `${a.pages || 0}쪽`, isLive ? ' · 지금 보는 안건' : '')),
          h('div', { class: 'zh-agenda-actions' }, up, down, view, orig, del));
      }))
    ].filter(Boolean));
  }
  function move(aid, dir, b) {
    const list = store.get('agenda') || [];
    const j = moveIndex(list, aid, dir);
    if (j == null) return;
    run(b, () => api.updateAgenda(mid, aid, { index: j }));
  }
  function askDelete(a, b) {
    if (armedDelete !== a.aid) {
      armedDelete = a.aid;
      clearTimeout(armTimer);
      armTimer = setTimeout(() => { armedDelete = null; if (agendaModal) renderAgenda(); }, 4000);
      renderAgenda();
      return;
    }
    armedDelete = null;
    clearTimeout(armTimer);
    run(b, async () => { await api.deleteAgenda(mid, a.aid); ctx.toast('안건을 지웠어요.', 'ok'); });
  }
  async function downloadOriginal(a) {
    const blob = await api.originalBlob(a);
    if (!blob) { ctx.toast('원본 파일이 없어요.', 'warn'); return; }
    const url = URL.createObjectURL(blob);
    const link = h('a', { href: url, download: a.original?.name || `${a.title || '안건'}` });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function openAgenda() {
    if (agendaModal) return;
    armedDelete = null;
    renderAgenda();
    agendaModal = ctx.modal({
      title: '안건 관리',
      body: agendaBox,
      actions: [{ label: '닫기', primary: true, onClick: () => agendaModal && agendaModal.close() }],
      onClose: () => { agendaModal = null; clearTimeout(armTimer); }
    });
  }

  for (const k of ['meeting', 'role', 'people', 'counts', 'agenda', 'live']) offs.push(store.on(k, sync));
  const tick = setInterval(sync, 30000); // 접속자 숫자가 시간에 따라 바뀜
  sync();

  return {
    unmount() {
      alive = false;
      offs.forEach(f => f());
      clearInterval(tick); clearInterval(peopleTimer); clearTimeout(armTimer);
      if (peopleModal) peopleModal.close();
      if (agendaModal) agendaModal.close();
      if (moreModal) moreModal.close();
      root.replaceChildren();
    }
  };
}
