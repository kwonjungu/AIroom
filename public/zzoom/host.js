// 쭘 회의 담당자 막대 (디자인 5팀, 쉬운 화면 팀 C). 자리: #zz-hostbar-main
// 막대: 상태 글, 「회의 시작하기」, 「발표 가져오기」, 「더 보기」, 「회의 끝내기」.
// 더 보기: 발표 마치기, 모두 내 쪽으로 데려오기, 판서 잠그기, 안건 순서 바꾸기, 참석자 수 보기, 회의 기록 파일 받기.
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

/** 접속자 목록을 상태별로 정렬(접속 중, 확인 중, 나감 순). 익명(ANON): 이름이 없어 같은 상태는 들어온 순서 그대로 */
export function sortPeople(people, now) {
  const rank = { on: 0, checking: 1, left: 2 };
  return (people || [])
    .map(p => ({ ...p, state: presence(p, now) }))
    .sort((a, b) => rank[a.state] - rank[b.state]);
}

/** 상태별 사람 수 {on, checking, left}. 익명(ANON): 접속자는 수만 보여 준다 */
export function presenceCounts(people, now) {
  const c = { on: 0, checking: 0, left: 0 };
  for (const p of people || []) c[presence(p, now)]++;
  return c;
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
  // 쉬운 화면(EASY_UX B11): 단추는 어느 너비에서나 글자를 함께 보인다. 짧은 글이나 그림만 있는 단추는 쓰지 않는다.
  const btn = (label, opts = {}) => {
    const cls = ['zz-btn', 'zh-btn', opts.cls].filter(Boolean).join(' ');
    const b = h('button', { type: 'button', class: cls, 'aria-label': opts.aria || null },
      opts.icon ? icon(opts.icon) : null, h('span', { class: 'zh-label', text: label }));
    if (opts.onClick) b.addEventListener('click', opts.onClick);
    return b;
  };
  const setLabel = (b, text) => {
    b.querySelector('.zh-label').textContent = text;
    if (b.hasAttribute('aria-label')) b.setAttribute('aria-label', text);
  };

  /** 단추를 누르는 동안 막고, 오류는 토스트로 */
  async function run(button, fn) {
    if (button) button.disabled = true;
    try { return await fn(); } catch (e) { if (alive) ctx.toast(errText(e), 'error'); return undefined; } finally {
      if (button && alive) { button.disabled = false; sync(); }
    }
  }

  // --- 막대: 왼쪽 상태 글, 주 단추 하나(시작 전 「회의 시작하기」), 오른쪽 「더 보기」와 맨 끝 「회의 끝내기」 ---
  const statusText = h('span', { class: 'zh-status-text' });
  const statusPeople = h('span', { class: 'zh-status-people zz-num' });
  const status = h('span', { class: 'zh-status', role: 'status' }, statusText, statusPeople);
  const bStart = btn('회의 시작하기', { cls: 'primary zh-start', onClick: () => run(bStart, () => api.setState(mid, 'start')) });
  const bTake = btn('발표 가져오기', { icon: 'icon-follow', cls: 'zh-take', onClick: askTake });
  const bMore = btn('더 보기', { cls: 'zh-more', onClick: openMore });
  const bEnd = btn('회의 끝내기', { cls: 'danger zh-end', onClick: confirmEnd });
  const spacer = h('span', { class: 'zh-spacer', 'aria-hidden': 'true' });

  // --- 「더 보기」 안에만 있는 것(드문 기능). 막대에는 붙이지 않는다 ---
  const bStopPres = btn('발표 마치기', { onClick: askStopPresent });
  const bForce = btn('모두 내 쪽으로 데려오기', { icon: 'icon-follow', onClick: () => {
    store.emit('cmd:force');
    ctx.toast('모두의 화면을 내 화면에 맞췄어요.', 'ok');
  } });
  const bLock = btn('판서 잠그기 (담당자만 쓰기)', { icon: 'icon-pen', onClick: () => run(bLock, async () => {
    const next = !store.get('meeting')?.penLock;
    await api.setState(mid, 'penLock', next);
    ctx.toast(next ? '판서를 잠갔어요. 이제 회의 담당자만 쓸 수 있어요.' : '판서 잠금을 풀었어요. 누구나 쓸 수 있어요.', 'ok');
  }) });
  const bAgenda = btn('안건 순서 바꾸기', { onClick: openAgenda });
  const bPeople = btn('참석자 수 보기 (0명)', { icon: 'icon-people', onClick: openPeople });
  const bExport = btn('회의 기록 파일 받기 (AI용)', { icon: 'icon-export', onClick: () => run(bExport, async () => {
    setLabel(bExport, '기록 파일 만드는 중');
    try { await api.exportMd(mid); ctx.toast('회의 기록 파일을 받았어요.', 'ok'); } finally { setLabel(bExport, '회의 기록 파일 받기 (AI용)'); }
  }) });
  const moreItems = [bStopPres, bForce, bLock, bAgenda, bPeople, bExport];

  root.replaceChildren(h('div', { class: 'zh-bar' }, status, bStart, bTake, spacer, bMore, bEnd));

  // 휴대폰 너비(600px 미만)에서는 막대에 주 단추와 「더 보기」만 두고, 발표 가져오기와 칠판, 녹음은 더 보기 안 글자 줄로
  const narrowMq = typeof matchMedia === 'function' ? matchMedia('(max-width: 599px)') : null;
  const isNarrow = () => !!(narrowMq && narrowMq.matches);
  function slotButton(id) {
    const b = document.querySelector(`#${id} button`);
    return b && !b.hidden ? b : null;
  }

  let moreModal = null;
  function openMore() {
    if (moreModal) return;
    const list = h('div', { class: 'zh-more-list' });
    const item = (src, label) => {
      const img = src.querySelector('img');
      const b = h('button', { type: 'button', class: 'zz-btn zh-btn zh-more-item', 'aria-pressed': src.getAttribute('aria-pressed') },
        img ? h('img', { class: 'zz-icon', src: img.getAttribute('src'), alt: '' }) : null, h('span', { text: label }));
      b.disabled = src.disabled;
      b.addEventListener('click', () => { if (moreModal) moreModal.close(); src.click(); });
      return b;
    };
    const fill = () => {
      const rows = [];
      if (isNarrow()) {
        if (!bTake.hidden) rows.push(item(bTake, '발표 가져오기'));
        // 다른 자리의 단추(녹음, 칠판)는 그 단추를 대신 눌러 준다
        for (const id of ['zz-hostbar-record', 'zz-hostbar-board']) {
          const src = slotButton(id);
          if (src) rows.push(item(src, src.getAttribute('aria-label') || src.textContent.trim()));
        }
      }
      for (const src of moreItems) if (!src.hidden) rows.push(item(src, src.querySelector('.zh-label').textContent));
      list.replaceChildren(...rows);
    };
    fill();
    moreModal = ctx.modal({
      title: '더 보기', body: list,
      actions: [{ label: '닫기', onClick: () => moreModal && moreModal.close() }],
      onClose: () => { moreModal = null; }
    });
    moreModal.refresh = fill;
  }

  // 발표하기 확인 창과 같은 문구(agenda.js CONFIRM_TEXT, BUSY_TEXT 와 같다. 사용자 지정이라 바꾸지 않는다). 첫 초점은 「아니오」.
  const CONFIRM_TEXT = '지금부터 화면이 전송됩니다';
  const BUSY_TEXT = '지금 다른 분이 발표 중이에요.';
  function askTake() {
    const m = store.get('meeting') || {};
    const myCid = store.get('role')?.cid;
    const busy = m.status === 'live' && m.presenter?.cid && m.presenter.cid !== myCid;
    const lines = busy ? [BUSY_TEXT, CONFIRM_TEXT] : [CONFIRM_TEXT];
    ctx.modal({
      title: '발표하기',
      body: h('div', { class: 'zh-modal-text' }, lines.map(t => h('p', { text: t }))),
      actions: [
        { label: '예', primary: true, onClick: () => run(bTake, async () => {
          await api.takePresenter(mid);
          ctx.toast('이제 내가 발표해요. 모두가 내 화면을 봐요.', 'ok');
        }) },
        { label: '아니오', focus: true }
      ]
    });
  }

  function askStopPresent() {
    if (typeof api.presenterEnd !== 'function') { ctx.toast('잠시 뒤 다시 해 주세요.', 'warn'); return; }
    const mine = !!store.get('role')?.presenter;
    const m = ctx.modal({
      title: '발표를 마칠까요?',
      body: h('div', { class: 'zh-modal-text' },
        h('p', { text: mine ? '내 발표를 마치면 모두 「오늘의 안건」 화면으로 돌아가요.' : '지금 하는 발표를 마치면 모두 「오늘의 안건」 화면으로 돌아가요.' })),
      actions: [
        { label: '취소', focus: true, onClick: () => m.close() },
        { label: '발표 마치기', primary: true, onClick: () => { m.close(); run(bStopPres, async () => {
          await api.presenterEnd(mid);
          ctx.toast('발표를 마쳤어요.', 'ok');
        }); } }
      ]
    });
  }

  function confirmEnd() {
    const m = ctx.modal({
      title: '회의를 끝낼까요?',
      body: h('div', { class: 'zh-modal-text' },
        h('p', { text: '끝내면 다시 열 수 없어요.' }),
        h('p', { text: '열린 투표는 닫히고 녹음도 멈춰요. 채팅과 기록은 남아요.' })),
      actions: [
        { label: '취소', onClick: () => m.close() },
        { label: '회의 끝내기', danger: true, onClick: () => { m.close(); run(bEnd, () => api.setState(mid, 'end')); } }
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
    const live = st === 'live' && !ended;

    let text;
    if (ended) text = '회의가 끝났어요';
    else if (st === 'ready') text = '시작 전이에요';
    else if (presenter) text = '내가 발표 중이에요';
    else if (pres?.cid) text = '다른 분이 발표 중이에요';   // 익명(ANON): 이름 없음
    else text = '회의 중이에요';
    statusText.textContent = text;
    status.className = 'zh-status' + (live ? ' is-live' : '');

    const n = countOnline(store.get('people'), store.get('counts') || m.counts, Date.now());
    statusPeople.textContent = ended ? '' : `${n}명 참여 중`;

    bStart.hidden = st !== 'ready' || ended;
    bEnd.hidden = !live;
    // 「발표 가져오기」는 다른 분이 발표 중일 때만(B9)
    bTake.hidden = !live || presenter || !pres?.cid;
    bStopPres.hidden = !live || !pres?.cid;
    bForce.hidden = !live || !presenter;
    bLock.hidden = ended;
    setLabel(bLock, m.penLock ? '판서 잠금 풀기' : '판서 잠그기 (담당자만 쓰기)');
    bLock.setAttribute('aria-pressed', m.penLock ? 'true' : 'false');
    bLock.classList.toggle('is-on', !!m.penLock);
    setLabel(bPeople, `참석자 수 보기 (${n}명)`);
    if (peopleModal) renderPeople();
    if (agendaModal) renderAgenda();
    if (moreModal && moreModal.refresh) moreModal.refresh();
  }

  // --- 접속자 ---
  const peopleBox = h('div', { class: 'zh-people' });
  function renderPeople() {
    // 익명(ANON): 이름 목록 없이 상태별 수만
    const people = store.get('people') || [];
    if (!people.length) {
      peopleBox.replaceChildren(h('p', { class: 'zh-muted', text: '아직 참석자 정보가 없어요. 잠시 뒤 다시 보여 드려요.' }));
      return;
    }
    const c = presenceCounts(people, Date.now());
    peopleBox.replaceChildren(
      h('p', { class: 'zh-muted' }, `지금 ${c.on + c.checking}명이 함께하고 있어요. 익명이라 이름은 보이지 않아요.`),
      h('ul', { class: 'zh-people-list' }, ['on', 'checking'].map(k => h('li', { class: 'zh-person is-' + k },
        h('span', { class: 'zh-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'zh-person-state', text: PRESENCE_LABEL[k] }),
        h('strong', { class: 'zh-person-count zz-num', text: `${c[k]}명` }))))
    );
  }
  function openPeople() {
    if (peopleModal) return;
    renderPeople();
    peopleModal = ctx.modal({
      title: '참석자 수',
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
        h('p', { text: '아직 안건이 없어요. 「오늘의 안건」의 「안건 추가」로 올려 주세요.' })));
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
        if (isLive) del.title = '발표 중인 안건은 지울 수 없어요';
        return h('li', { class: 'zh-agenda-item' + (isLive ? ' is-live' : '') },
          h('span', { class: 'zh-agenda-no zz-num', text: String(i + 1) }),
          h('div', { class: 'zh-agenda-main' }, title,
            h('span', { class: 'zh-muted zz-num zh-agenda-sub' }, a.kind === 'board' ? `칠판 ${a.pages || 1}쪽` : (a.pages ? `${a.pages}쪽` : '자료 없음'),
              isLive ? h('span', { class: 'zz-chip zh-chip', text: '발표 중인 안건' }) : null)),
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
    const link = h('a', { href: url, download: api.originalFileName ? api.originalFileName(a) : (a.title || '안건') });
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
      title: '안건 순서 바꾸기',
      body: agendaBox,
      // AGENDA_OPEN: 이 창은 순서 바꾸기 위주. 안건 추가는 대기 화면 모듈(agenda.js)이 맡는다.
      actions: [{ label: '안건 추가', onClick: () => { store.emit('cmd:agenda-add'); } }, { label: '닫기', primary: true, onClick: () => agendaModal && agendaModal.close() }],
      onClose: () => { agendaModal = null; clearTimeout(armTimer); },
      // 이름을 고치는 중이면 다른 분이 발표해도 닫지 않고 접는다(접을 때 칸을 벗어나며 저장됨)
      keep: () => { const e = document.activeElement; return !!e && agendaBox.contains(e) && e.tagName === 'INPUT'; }
    });
  }

  for (const k of ['meeting', 'role', 'people', 'counts', 'agenda', 'live']) offs.push(store.on(k, sync));
  const tick = setInterval(sync, 30000); // 참석자 수가 시간에 따라 바뀜
  const onMq = () => { if (moreModal && moreModal.refresh) moreModal.refresh(); };
  if (narrowMq && narrowMq.addEventListener) narrowMq.addEventListener('change', onMq);
  sync();

  return {
    unmount() {
      alive = false;
      offs.forEach(f => f());
      clearInterval(tick); clearInterval(peopleTimer); clearTimeout(armTimer);
      if (narrowMq && narrowMq.removeEventListener) narrowMq.removeEventListener('change', onMq);
      if (peopleModal) peopleModal.close();
      if (agendaModal) agendaModal.close();
      if (moreModal) moreModal.close();
      root.replaceChildren();
    }
  };
}
