// 쭘 화이트보드 (디자인 3팀) — 설계 DESIGN.md 파트 E, 약속 CONTRACTS.md 4·6절.
// 자리: #zz-hostbar-board(주관자 「화이트보드 띄우기」), #zz-board-actions(화이트보드일 때 「+ 새 쪽」).
// 바탕 그리기는 2팀 viewer.js 가 paintBoardBackground 로 #zz-layer-bg 에 한다.

export const BOARD_W = 1600, BOARD_H = 1000;   // 서버 sizes 와 같은 비율
export const BG_LIST = [
  { id: 'white', label: '흰 바탕' },
  { id: 'grid', label: '모눈' },
  { id: 'lines', label: '줄' },
];
// canvas 에는 CSS 변수를 못 쓰므로 zzoom.css 값(--zz-surface, --zz-line)을 그대로 둔다
const PAPER = '#ffffff';
const GRID = '#e0e0e0';
const RULE = '#d6dbe4';
const MARGIN = '#f3b9a6';                       // 줄 공책 왼쪽 여백선(귤색 연하게)

// 화면 px 사각형 {x,y,w,h} 에 바탕을 그린다. DOM·store 를 만지지 않는다.
// ctx 에 dpr 변환이 걸려 있어도, 없어도 된다(선 굵기는 사각형 크기에 비례, 최소 1).
export function paintBoardBackground(ctx2d, rect, bg = 'white') {
  const { x, y, w, h } = rect || {};
  if (!(w > 0 && h > 0)) return;
  const u = w / BOARD_W;                         // 보드 1단위 = 화면 몇 px
  ctx2d.save();
  ctx2d.globalAlpha = 1;
  ctx2d.globalCompositeOperation = 'source-over';
  ctx2d.fillStyle = PAPER;
  ctx2d.fillRect(x, y, w, h);
  ctx2d.beginPath();
  ctx2d.rect(x, y, w, h);
  ctx2d.clip();
  const lw = Math.max(1, 1.5 * u);
  if (bg === 'grid') {
    const step = 50 * u;                         // 32 × 20 칸
    ctx2d.strokeStyle = GRID; ctx2d.lineWidth = lw;
    ctx2d.beginPath();
    for (let i = 1; i < BOARD_W / 50; i++) { const gx = Math.round(x + i * step) + 0.5; ctx2d.moveTo(gx, y); ctx2d.lineTo(gx, y + h); }
    for (let j = 1; j < BOARD_H / 50; j++) { const gy = Math.round(y + j * step) + 0.5; ctx2d.moveTo(x, gy); ctx2d.lineTo(x + w, gy); }
    ctx2d.stroke();
    // 다섯 칸마다 조금 진하게
    ctx2d.globalAlpha = 0.9; ctx2d.lineWidth = Math.max(1, 2.5 * u);
    ctx2d.beginPath();
    for (let i = 5; i < BOARD_W / 50; i += 5) { const gx = Math.round(x + i * step) + 0.5; ctx2d.moveTo(gx, y); ctx2d.lineTo(gx, y + h); }
    for (let j = 5; j < BOARD_H / 50; j += 5) { const gy = Math.round(y + j * step) + 0.5; ctx2d.moveTo(x, gy); ctx2d.lineTo(x + w, gy); }
    ctx2d.stroke();
  } else if (bg === 'lines') {
    const step = 62.5 * u;                       // 16줄
    ctx2d.strokeStyle = RULE; ctx2d.lineWidth = lw;
    ctx2d.beginPath();
    for (let j = 2; j < BOARD_H / 62.5; j++) { const gy = Math.round(y + j * step) + 0.5; ctx2d.moveTo(x, gy); ctx2d.lineTo(x + w, gy); }
    ctx2d.stroke();
    ctx2d.strokeStyle = MARGIN; ctx2d.lineWidth = Math.max(1, 2 * u);
    ctx2d.beginPath();
    const mx = Math.round(x + 120 * u) + 0.5;
    ctx2d.moveTo(mx, y); ctx2d.lineTo(mx, y + h);
    ctx2d.stroke();
  }
  ctx2d.restore();
}

export function mount(ctx) {
  const { api, store, t } = ctx;
  const mid = ctx.mid;
  const hostSlot = ctx.el('zz-hostbar-board');
  const pageSlot = ctx.el('zz-board-actions');
  const offs = [];
  let busy = false;

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const icon = name => { const i = document.createElement('img'); i.className = 'zz-icon'; i.src = ctx.assets(name); i.alt = ''; return i; };
  const isHost = () => store.get('role')?.role === 'host';
  const status = () => store.get('meeting')?.status;
  const open = () => { const s = status(); return !s || s === 'ready' || s === 'live'; };
  const currentAgenda = () => {
    const p = store.get('page');
    if (!p?.aid) return null;
    return (store.get('agenda') || []).find(a => a.aid === p.aid) || null;
  };

  // 주관자 막대: 화이트보드 띄우기
  const openBtn = el('button', 'zz-btn zd-board-open');
  openBtn.type = 'button';
  openBtn.append(icon('icon-board'), el('span', 'zd-board-open-text', t('빈 칠판 띄우기')));   // 글자는 휴대폰에서도 보인다(EASY_UX)
  openBtn.addEventListener('click', chooseBg);

  // 쪽 막대: + 새 쪽
  const addBtn = el('button', 'zz-btn ghost zd-board-add');
  addBtn.type = 'button';
  addBtn.append(el('span', 'zd-plus', '+'), el('span', null, t('새 쪽')));
  addBtn.setAttribute('aria-label', t('칠판에 새 쪽 더하기'));
  addBtn.addEventListener('click', addPage);

  function render() {
    const host = isHost();
    if (host) { if (!hostSlot.contains(openBtn)) hostSlot.replaceChildren(openBtn); }
    else hostSlot.replaceChildren();
    openBtn.disabled = busy || !open();
    const a = currentAgenda();
    const showAdd = host && a?.kind === 'board';
    if (showAdd) { if (!pageSlot.contains(addBtn)) pageSlot.replaceChildren(addBtn); }
    else pageSlot.replaceChildren();
    addBtn.disabled = busy || !open() || (a?.pages || 0) >= 200;
  }

  function bgPreview(bg) {
    const c = document.createElement('canvas');
    const W = 160, H = 100, dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = W * dpr; c.height = H * dpr;
    c.className = 'zd-bg-thumb';
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintBoardBackground(g, { x: 0, y: 0, w: W, h: H }, bg);
    return c;
  }

  function chooseBg() {
    if (busy || !open()) return;
    let pick = 'white';
    const body = el('div', 'zd-bg-pick');
    body.setAttribute('role', 'radiogroup');
    body.setAttribute('aria-label', t('바탕 고르기'));
    const cards = BG_LIST.map(b => {
      const card = el('button', 'zd-bg-card'); card.type = 'button';
      card.setAttribute('role', 'radio');
      card.dataset.bg = b.id;
      card.append(bgPreview(b.id), el('span', 'zd-bg-label', t(b.label)));
      card.addEventListener('click', () => { pick = b.id; sync(); });
      return card;
    });
    const sync = () => cards.forEach(c => c.setAttribute('aria-checked', String(c.dataset.bg === pick)));
    sync();
    const hint = el('p', 'zd-bg-hint', t('띄우면 안건 목록 끝에 칠판이 생겨요. 회의 중이면 모두 그 칠판으로 옮겨 가요.'));
    body.append(...cards);
    const wrap = el('div'); wrap.append(body, hint);
    const m = ctx.modal({
      title: t('빈 칠판 띄우기'), body: wrap,
      actions: [
        { label: t('취소'), onClick: () => m.close() },
        { label: t('띄우기'), primary: true, onClick: () => { m.close(); create(pick); } },
      ],
    });
  }

  async function create(bg) {
    busy = true; render();
    try {
      const r = await api.createBoard(mid, bg);
      const title = r?.agenda?.title || t('칠판');
      ctx.toast(t('「{이름}」을 띄웠어요', { 이름: title }), 'ok');
      // 진행자가 아니면 서버가 진행을 옮기지 않으므로 내 화면만 그 판으로
      if (r?.aid && !r?.live) store.emit('cmd:nav', { aid: r.aid, page: 1 });
    } catch (e) {
      ctx.toast(e?.message || t('칠판을 띄우지 못했어요'), 'error');
    } finally { busy = false; render(); }
  }

  async function addPage() {
    const a = currentAgenda();
    if (busy || !a || a.kind !== 'board') return;
    busy = true; render();
    try {
      const r = await api.addBoardPage(mid, a.aid);
      const n = Number(r?.pages) || (a.pages + 1);
      ctx.toast(t('{n}쪽을 더했어요', { n }), 'ok');
      store.emit('cmd:nav', { aid: a.aid, page: n });
    } catch (e) {
      ctx.toast(e?.message || t('쪽을 더하지 못했어요'), 'error');
    } finally { busy = false; render(); }
  }

  for (const k of ['role', 'meeting', 'page', 'agenda']) offs.push(store.on(k, render));
  render();

  return {
    unmount() {
      offs.splice(0).forEach(f => { try { f(); } catch { /* 무시 */ } });
      hostSlot.replaceChildren();
      pageSlot.replaceChildren();
    },
  };
}
