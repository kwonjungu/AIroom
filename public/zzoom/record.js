// 쭘 녹음과 대화 기록 (디자인 5팀). 모두에게 붙는다.
// 자리: #zz-side-log(모두: 「● 녹음 중」 안내와 대화 기록), #zz-hostbar-record(주관자: ⏺ 녹음 단추)
// 1분 조각마다 ctx.api.transcribe 로 보내고, 실패하면 대기열에서 순서대로 다시 보낸다(G-1, K6).
export const css = 'host.css';

/** 시험에서 바꿀 수 있는 값 */
export const config = {
  chunkMs: 60 * 1000,
  minChunkMs: 1000,          // 이보다 짧은 마지막 조각은 버린다
  bitrate: 32000,            // 1분 약 240KB (서버 한도 3MB)
  maxBytes: 3 * 1024 * 1024,
  retryDelays: [5000, 15000, 30000], // 3번 다시 보냄
  busyDelay: 60000,          // 받아쓰기 한도(429)면 더 오래 쉰다
};

export const NOTICE = '학생 개인정보는 말하지 마세요. 소리는 글로 바꾸려고 외부 서비스(Groq)로 보냅니다.';

// ---------- 순수 함수·대기열(단위 시험용) ----------
/** 다시 보내도 소용없는 오류인지 */
export function isFatal(e) {
  const s = e && e.status;
  if (!s) return false;                // 연결 끊김(0)·알 수 없음은 다시 보냄
  if (s === 429 || s >= 500) return false;
  return true;                         // 400·403·409·410·413·415 등
}

/** 다음 조각 번호: 이미 받은 기록과 이 탭이 쓴 번호보다 크게(서버는 같은 n 을 덮어씀) */
export function nextN(transcript, lastUsed) {
  let max = Number.isInteger(lastUsed) ? lastUsed : -1;
  for (const t of transcript || []) if (Number.isInteger(t.n) && t.n > max) max = t.n;
  return Math.min(max + 1, 9999);
}

/** 「15:12」 */
export function hhmm(ms) {
  const d = new Date(Number(ms) || 0);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/** 「12:03」 경과 시간 */
export function elapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const hh = Math.floor(m / 60);
  const pad = v => String(v).padStart(2, '0');
  return hh ? `${hh}:${pad(m % 60)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

/** 기록 위치 글자: 「안건2 5쪽」 */
export function placeText(t, agenda) {
  if (!t || !t.aid) return '';
  const i = (agenda || []).findIndex(a => a.aid === t.aid);
  const a = agenda && agenda[i];
  const name = i < 0 ? '지운 안건' : a.kind === 'board' ? '화이트보드' : `안건${i + 1}`;
  return t.page ? `${name} ${t.page}쪽` : name;
}

/**
 * 조각 대기열. 한 번에 하나씩, n 순서대로 보낸다.
 * item.state: 'wait' 보낼 차례 기다림, 'send' 보내는 중, 'retry' 쉬었다 다시, 'failed' 실패(직접 다시 보내기)
 * 성공한 조각은 목록에서 빠진다(글은 store transcript 로 들어온다).
 */
export class ChunkQueue {
  constructor({ send, onChange, delays = config.retryDelays, busyDelay = config.busyDelay, timer = globalThis }) {
    this.send = send; this.onChange = onChange || (() => {});
    this.delays = delays; this.busyDelay = busyDelay; this.timer = timer;
    this.list = []; this.busy = false; this.wake = 0; this.closed = false;
  }
  items() { return this.list.map(({ blob, ...rest }) => ({ ...rest, bytes: blob ? blob.size : 0 })); }
  add(chunk) {
    this.list.push({ ...chunk, state: 'wait', tries: 0, error: '' });
    this.list.sort((a, b) => a.n - b.n);
    this.changed(); this.pump();
  }
  retry(n) {
    const it = this.list.find(x => x.n === n && x.state === 'failed');
    if (!it) return;
    it.state = 'wait'; it.tries = 0; it.error = '';
    this.changed(); this.pump();
  }
  pending() { return this.list.filter(x => x.state !== 'failed').length; }
  changed() { try { this.onChange(this.items()); } catch { /* 화면 오류는 대기열을 멈추지 않음 */ } }
  pump() {
    if (this.busy || this.closed) return;
    const now = Date.now();
    const it = this.list.find(x => x.state === 'wait' || x.state === 'retry' && x.at2 <= now);
    if (!it) {
      const next = this.list.filter(x => x.state === 'retry').sort((a, b) => a.at2 - b.at2)[0];
      if (next && !this.wake) this.wake = this.timer.setTimeout(() => { this.wake = 0; this.pump(); }, Math.max(0, next.at2 - now));
      return;
    }
    this.busy = true; it.state = 'send'; this.changed();
    Promise.resolve().then(() => this.send(it)).then(() => {
      this.list = this.list.filter(x => x !== it);
    }, e => {
      it.tries += 1;
      it.error = (e && e.message) || '보내지 못했어요';
      if (isFatal(e) || it.tries > this.delays.length) { it.state = 'failed'; return; }
      const wait = e && e.status === 429 ? Math.max(this.busyDelay, this.delays[it.tries - 1]) : this.delays[it.tries - 1];
      it.state = 'retry'; it.at2 = Date.now() + wait;
    }).finally(() => {
      this.busy = false;
      if (this.closed) return;
      this.changed(); this.pump();
    });
  }
  close() { this.closed = true; if (this.wake) this.timer.clearTimeout(this.wake); this.wake = 0; }
}

/** 브라우저가 만들 수 있는 녹음 형식(서버는 webm·mp4·ogg 받음) */
export function pickMime(MR = globalThis.MediaRecorder) {
  if (!MR || !MR.isTypeSupported) return { mimeType: '', base: 'audio/webm' };
  for (const [m, base] of [['audio/webm;codecs=opus', 'audio/webm'], ['audio/webm', 'audio/webm'], ['audio/ogg;codecs=opus', 'audio/ogg'], ['audio/mp4', 'audio/mp4']]) {
    if (MR.isTypeSupported(m)) return { mimeType: m, base };
  }
  return { mimeType: '', base: 'audio/webm' };
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

export function mount(ctx) {
  const { api, store } = ctx;
  const mid = ctx.mid;
  const logRoot = ctx.el('zz-side-log');
  const recRoot = ctx.el('zz-hostbar-record');
  const offs = [];
  let alive = true;

  // 녹음 상태(이 탭)
  let rec = null;      // {stream, mr, seg, timer, startedAt, continuing, mime}
  let starting = false;
  let tick = 0;
  const lastKey = 'zzoom_rec_n:' + mid;
  const noticeKey = 'zzoom_rec_notice:' + mid;
  let lastN = (() => { try { const v = parseInt(sessionStorage.getItem(lastKey), 10); return Number.isInteger(v) ? v : -1; } catch { return -1; } })();

  const queue = new ChunkQueue({
    send: it => api.transcribe(mid, it.blob, { n: it.n, at: it.at, aid: it.aid, page: it.page }),
    onChange: () => renderQueue(),
  });

  // ===== 옆칸 「기록」 =====
  const banner = h('div', { class: 'zh-rec-banner', role: 'status', hidden: true },
    h('span', { class: 'zz-live-dot', 'aria-hidden': 'true' }),
    h('div', {}, h('strong', { text: '녹음 중이에요' }), h('p', { text: NOTICE })));
  const queueBox = h('ul', { class: 'zh-queue', 'aria-live': 'polite' });
  const list = h('ol', { class: 'zh-log' });
  const empty = h('p', { class: 'zh-muted zh-log-empty' });
  const scroller = h('div', { class: 'zh-log-scroll' }, empty, list, queueBox);
  logRoot.replaceChildren(h('div', { class: 'zh-logwrap' }, banner, scroller));

  let shown = 0;   // 그린 기록 수
  let seen = 0;    // 읽은 기록 수(배지)
  function nearBottom() { return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80; }

  function renderLog() {
    const items = store.get('transcript') || [];
    const agenda = store.get('agenda') || [];
    const m = store.get('meeting') || {};
    const stick = nearBottom();
    if (!items.length) {
      empty.hidden = false;
      empty.textContent = m.allowRecording === false
        ? '이 회의는 녹음을 쓰지 않아요.'
        : '아직 대화 기록이 없어요. 주관자가 녹음을 시작하면 1분마다 글로 바뀌어 여기에 쌓여요.';
    } else empty.hidden = true;
    list.replaceChildren(...items.map(t => {
      const place = placeText(t, agenda);
      const go = place && agenda.some(a => a.aid === t.aid)
        ? h('button', { type: 'button', class: 'zh-log-place', 'aria-label': `${place}로 가기` }, place)
        : (place ? h('span', { class: 'zh-log-place is-static', text: place }) : null);
      if (go && go.tagName === 'BUTTON') go.addEventListener('click', () => store.emit('cmd:nav', { aid: t.aid, page: t.page || 1 }));
      return h('li', { class: 'zh-log-item' },
        h('div', { class: 'zh-log-meta' }, h('time', { class: 'zz-num', text: hhmm(t.at) }), go),
        h('p', { class: 'zh-log-text', text: t.text || '(말소리가 없었어요)' }));
    }));
    if (items.length > shown && stick) scroller.scrollTop = scroller.scrollHeight;
    shown = items.length;
    updateBadge();
  }

  function logVisible() {
    const s = store.get('side');
    return !!(s && s.open && s.tab === 'log');
  }
  function updateBadge() {
    const n = (store.get('transcript') || []).length;
    if (logVisible() || n < seen) seen = n;
    const unread = Math.max(0, n - seen);
    const b = store.get('badges') || {};
    if ((b.log || 0) !== unread) store.set('badges', { ...b, log: unread });
  }

  function renderQueue() {
    if (!alive) return;
    const items = queue.items();
    queueBox.replaceChildren(...items.map(it => {
      const no = it.n + 1;
      if (it.state === 'failed') {
        const again = h('button', { type: 'button', class: 'zz-btn ghost zh-btn' }, h('span', { class: 'zh-label', text: '다시 보내기' }));
        again.addEventListener('click', () => queue.retry(it.n));
        return h('li', { class: 'zh-q is-failed', role: 'alert' },
          h('span', { text: `${no}번째 1분 기록 실패` }), h('span', { class: 'zh-muted', text: it.error }), again);
      }
      const t = it.state === 'retry' ? `${no}번째 1분 기록을 잠시 뒤 다시 보내요` : `${no}번째 1분 기록을 글로 바꾸는 중`;
      return h('li', { class: 'zh-q' }, h('span', { class: 'zh-spin', 'aria-hidden': 'true' }), h('span', { text: t }));
    }));
  }

  // ===== 주관자 ⏺ 단추 =====
  const recBtn = h('button', { type: 'button', class: 'zz-btn zh-btn zh-rec-btn has-short zh-xs-icon', 'aria-label': '녹음 시작' },
    h('img', { class: 'zz-icon', src: ctx.assets('icon-record'), alt: '' }), h('span', { class: 'zh-label', text: '녹음 시작' }),
    h('span', { class: 'zh-short', 'aria-hidden': 'true', text: '녹음' }));
  const recTime = h('span', { class: 'zh-rec-time zz-num', hidden: true });
  const recBox = h('div', { class: 'zh-rec' }, recBtn, recTime);
  recBtn.addEventListener('click', () => (rec || store.get('meeting')?.recording) ? stopRecording(true) : askStart());

  function setRecLabel(t) {
    recBtn.querySelector('.zh-label').textContent = t;
    recBtn.querySelector('.zh-short').textContent = t === '녹음 시작' ? '녹음' : '멈추기';
    recBtn.setAttribute('aria-label', t);
  }

  function syncRec() {
    if (!alive) return;
    const m = store.get('meeting') || {};
    const role = store.get('role') || {};
    const isHost = role.role === 'host';
    const allowed = m.allowRecording !== false;
    const live = m.status === 'live' && !m.gone;
    banner.hidden = !m.recording;

    // 회의가 끝났거나 다른 곳에서 녹음을 멈췄으면 이 탭도 멈춘다
    // (시작 직후 서버 값이 아직 안 왔을 때 멈추지 않도록, 켜진 것을 한 번 본 뒤에만)
    if (rec && m.recording) rec.sawOn = true;
    if (rec && (rec.sawOn && !m.recording || !live || !isHost)) stopLocal();

    if (!isHost || !allowed) { if (recRoot.firstChild) recRoot.replaceChildren(); return; }
    if (!recRoot.firstChild) recRoot.replaceChildren(recBox);

    const on = !!rec || !!m.recording;
    recBtn.classList.toggle('is-on', on);
    recBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    setRecLabel(on ? '녹음 멈추기' : '녹음 시작');
    recBtn.disabled = starting || !on && !live;
    recBtn.title = !live && !on ? '회의를 시작하면 녹음할 수 있어요' : '';
    recTime.hidden = !on;
    if (on) recTime.textContent = rec ? `● ${elapsed(Date.now() - rec.startedAt)}` : '● 다른 기기';
    recTime.title = on ? (rec ? '이 기기에서 녹음 중' : '다른 기기에서 녹음 중') : '';
  }

  function askStart() {
    let ok = false;
    try { ok = sessionStorage.getItem(noticeKey) === '1'; } catch { /* 저장 못 하면 매번 묻는다 */ }
    if (ok) { startRecording(); return; }
    const m = ctx.modal({
      title: '참석자에게 녹음을 알렸나요?',
      body: h('div', { class: 'zh-modal-text' },
        h('p', { text: '녹음을 시작하면 모든 참석자 화면에 「● 녹음 중」이 보여요.' }),
        h('p', { text: NOTICE }),
        h('p', { class: 'zh-muted', text: '소리 파일은 저장하지 않고, 1분마다 글로 바꾼 기록만 남아요.' })),
      actions: [
        { label: '취소', onClick: () => m.close() },
        { label: '알렸어요, 녹음 시작', primary: true, onClick: () => {
          try { sessionStorage.setItem(noticeKey, '1'); } catch { /* 무시 */ }
          m.close(); startRecording();
        } }
      ]
    });
  }

  async function startRecording() {
    if (rec || starting) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      ctx.toast('이 브라우저는 녹음을 지원하지 않아요. 엣지나 크롬에서 해 주세요.', 'error'); return;
    }
    starting = true; syncRec();
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      starting = false; syncRec();
      ctx.toast(e && e.name === 'NotAllowedError' ? '마이크 사용을 허락해 주세요. 주소창 옆 자물쇠에서 바꿀 수 있어요.' : '마이크를 찾지 못했어요.', 'error');
      return;
    }
    try {
      if (!store.get('meeting')?.recording) await api.setState(mid, 'recording', true);
    } catch (e) {
      stream.getTracks().forEach(t => t.stop());
      starting = false; syncRec();
      ctx.toast((e && e.message) || '녹음을 시작하지 못했어요.', 'error');
      return;
    }
    if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }
    rec = { stream, startedAt: Date.now(), continuing: true, mime: pickMime() };
    starting = false;
    startSegment();
    clearInterval(tick);
    tick = setInterval(syncRec, 1000);
    window.addEventListener('beforeunload', onUnload);
    syncRec();
    ctx.toast('녹음을 시작했어요.', 'ok');
  }

  function position() {
    const p = store.get('page') || store.get('live') || store.get('meeting')?.live || {};
    return { aid: p.aid || '', page: p.page || '' };
  }

  function startSegment() {
    if (!rec) return;
    const r = rec;
    const n = nextN(store.get('transcript'), lastN);
    lastN = n;
    try { sessionStorage.setItem(lastKey, String(n)); } catch { /* 무시 */ }
    const seg = { n, at: Date.now(), ...position(), parts: [] };
    let mr;
    try {
      mr = new MediaRecorder(r.stream, { ...(r.mime.mimeType ? { mimeType: r.mime.mimeType } : {}), audioBitsPerSecond: config.bitrate });
    } catch {
      mr = new MediaRecorder(r.stream);
    }
    r.mr = mr; r.seg = seg;
    mr.ondataavailable = e => { if (e.data && e.data.size) seg.parts.push(e.data); };
    mr.onstop = () => {
      const dur = Date.now() - seg.at;
      const blob = new Blob(seg.parts, { type: r.mime.base });
      if (blob.size && dur >= config.minChunkMs) {
        if (blob.size > config.maxBytes) queueFailed(seg, '조각이 3MB 를 넘었어요.');
        else queue.add({ n: seg.n, at: seg.at, aid: seg.aid, page: seg.page, blob });
      }
      if (r.continuing && rec === r) startSegment();
    };
    mr.start();
    clearTimeout(r.timer);
    r.timer = setTimeout(() => { if (mr.state !== 'inactive') mr.stop(); }, config.chunkMs);
  }

  function queueFailed(seg, msg) {
    queue.list.push({ n: seg.n, at: seg.at, aid: seg.aid, page: seg.page, blob: null, state: 'failed', tries: 0, error: msg });
    renderQueue();
  }

  /** 이 탭의 녹음기만 멈춤(마지막 조각은 대기열로) */
  function stopLocal() {
    if (!rec) return;
    const r = rec;
    rec = null;
    r.continuing = false;
    clearTimeout(r.timer);
    try { if (r.mr && r.mr.state !== 'inactive') r.mr.stop(); } catch { /* 이미 멈춤 */ }
    // 마지막 조각이 만들어진 뒤 마이크를 끈다
    setTimeout(() => r.stream.getTracks().forEach(t => t.stop()), 300);
    clearInterval(tick); tick = 0;
    window.removeEventListener('beforeunload', onUnload);
    syncRec();
  }

  async function stopRecording(tellServer) {
    const wasMine = !!rec;
    stopLocal();
    if (!tellServer) return;
    recBtn.disabled = true;
    try {
      if (store.get('meeting')?.recording) await api.setState(mid, 'recording', false);
      ctx.toast(wasMine ? '녹음을 멈췄어요. 남은 기록은 곧 올라와요.' : '녹음을 멈췄어요.', 'ok');
    } catch (e) {
      ctx.toast((e && e.message) || '녹음을 멈추지 못했어요.', 'error');
    } finally { if (alive) syncRec(); }
  }

  function onUnload(e) {
    if (!rec && !queue.pending()) return;
    e.preventDefault();
    e.returnValue = '';
  }

  offs.push(store.on('transcript', renderLog));
  offs.push(store.on('agenda', renderLog));
  offs.push(store.on('side', updateBadge));
  offs.push(store.on('meeting', () => { syncRec(); if (!(store.get('transcript') || []).length) renderLog(); }));
  offs.push(store.on('role', syncRec));
  seen = (store.get('transcript') || []).length; // 들어오기 전 기록은 읽은 것으로
  renderLog();
  syncRec();

  return {
    unmount() {
      alive = false;
      offs.forEach(f => f());
      stopLocal();
      queue.close();
      clearInterval(tick);
      window.removeEventListener('beforeunload', onUnload);
      logRoot.replaceChildren();
      recRoot.replaceChildren();
    }
  };
}
