// 쭘 안건 올리기 (디자인 5팀). 자리: #zz-hostbar-upload
// 파일 고르기, 변환(진행 표시·취소), 썸네일 미리보기, 「이대로 올리기」, 업로드 진행·취소, 오류 안내.
// 변환은 ctx.api.convertFile, 업로드는 ctx.api.uploadAgenda 만 쓴다(직접 fetch 금지).
export const css = 'host.css';

export const ACCEPT = '.pdf,.hwp,.hwpx,.pptx,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif,.heic,.heif';
export const MAX_AGENDA = 30;
export const MAX_BYTES = 50 * 1024 * 1024; // 원본 50MB 미만(서버 originalBytes 와 같음)

// ---------- 순수 함수(단위 시험용) ----------
/** 파일 이름에서 확장자를 뺀 제목(100자까지) */
export function titleFromName(name) {
  const base = String(name || '').replace(/\.[^.\\/]+$/, '').replace(/[_]+/g, ' ').trim();
  return (base || '새 안건').slice(0, 100);
}

/** 올리기 전에 막을 것. 막으면 안내 문구, 괜찮으면 null */
export function precheck(file, { agendaCount = 0, status = 'ready' } = {}) {
  if (status === 'ended') return '끝난 회의에는 안건을 올릴 수 없어요.';
  if (agendaCount >= MAX_AGENDA) return `안건은 ${MAX_AGENDA}개까지 올릴 수 있어요. 안 쓰는 안건을 지운 뒤 올려 주세요.`;
  if (!file) return '파일을 골라 주세요.';
  const ext = String(file.name || '').toLowerCase().split('.').pop();
  if (ext === 'ppt' || ext === 'pps') return 'PowerPoint 에서 PPTX 나 PDF 로 저장해 올려 주세요.';
  if (!file.size) return '빈 파일이에요. 다른 파일을 골라 주세요.';
  if (file.size >= MAX_BYTES) return '50MB 보다 작은 파일만 올릴 수 있어요.';
  return null;
}

/** 진행 문구와 비율(0~1) */
export function progressView(p) {
  if (!p) return { text: '준비하고 있어요', ratio: 0 };
  const total = Number(p.total) || 0;
  const done = Number(p.done) || 0;
  const ratio = Number.isFinite(p.ratio) ? p.ratio : total ? done / total : 0;
  const r = Math.max(0, Math.min(1, ratio));
  switch (p.phase) {
    case 'load': return { text: '변환 도구를 준비하고 있어요', ratio: r };
    case 'render': return { text: total ? `쪽 그림으로 바꾸는 중 (${done}/${total}쪽)` : '쪽 그림으로 바꾸는 중', ratio: r };
    case 'upload': return { text: total ? `올리는 중 (${done}/${total})` : '올리는 중', ratio: r };
    case 'commit': return { text: '안건으로 등록하고 있어요', ratio: 1 };
    default: return { text: '처리하고 있어요', ratio: r };
  }
}

/** 취소인지(오류로 보이지 않고 조용히 닫음) */
export function isAbort(e) {
  return !!e && (e.code === 'ABORTED' || e.name === 'AbortError' || e.code === 'aborted');
}

/** 오류 안내 문구. 변환기·api 모두 한국어 message 를 주므로 그대로 쓰고, 몇 가지만 보탠다 */
export function errorText(e) {
  if (!e) return '알 수 없는 문제가 생겼어요.';
  if (e.code === 'webp_unsupported') return '이 브라우저는 쪽 그림을 만들 수 없어요. 엣지나 크롬 최신판에서 올려 주세요.';
  if (e.code === 'network') return '연결이 끊겼어요. 인터넷을 확인한 뒤 다시 올려 주세요.';
  if (e.code === 'upload_failed') return '쪽 그림을 올리지 못했어요. 연결을 확인한 뒤 「다시 올리기」를 눌러 주세요.';
  return e.message || '올리지 못했어요. 잠시 뒤 다시 해 주세요.';
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
  const root = ctx.el('zz-hostbar-upload');
  let alive = true;
  let job = null; // {file, ac, modal, converted, urls, phase}

  const input = h('input', { type: 'file', accept: ACCEPT, class: 'zz-sr', tabindex: '-1', 'aria-hidden': 'true' });
  const button = h('button', { type: 'button', class: 'zz-btn primary zh-btn zh-upload-btn has-short zh-xs-icon', 'aria-label': '안건 올리기' },
    h('img', { class: 'zz-icon', src: ctx.assets('icon-upload'), alt: '' }),
    h('span', { class: 'zh-label', text: '안건 올리기' }),
    h('span', { class: 'zh-short', 'aria-hidden': 'true', text: '올리기' }));
  button.addEventListener('click', () => {
    const why = precheck({ name: 'x.pdf', size: 1 }, state());
    if (why) { ctx.toast(why, 'warn'); return; }
    input.value = '';
    input.click();
  });
  input.addEventListener('change', () => { const f = input.files && input.files[0]; if (f) start(f); });
  root.replaceChildren(h('div', { class: 'zh-upload' }, button, input));

  function state() {
    const m = store.get('meeting') || {};
    return { agendaCount: (store.get('agenda') || []).length, status: m.gone ? 'ended' : m.status };
  }
  function sync() {
    if (!alive) return;
    const s = state();
    button.disabled = !!job || s.status === 'ended';
    button.title = s.status === 'ended' ? '끝난 회의에는 안건을 올릴 수 없어요' : '';
  }

  // --- 모달 안쪽 ---
  const body = h('div', { class: 'zh-up' });
  const fileLine = h('p', { class: 'zh-up-file' });
  const bar = h('div', { class: 'zh-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' },
    h('div', { class: 'zh-progress-fill' }));
  const barText = h('p', { class: 'zh-progress-text zz-num', 'aria-live': 'polite' });
  const main = h('div', { class: 'zh-up-main' });
  const actions = h('div', { class: 'zh-up-actions' });
  body.append(fileLine, main, actions);

  function setProgress(p) {
    const v = progressView(p);
    bar.firstChild.style.width = Math.round(v.ratio * 100) + '%';
    bar.setAttribute('aria-valuenow', String(Math.round(v.ratio * 100)));
    barText.textContent = v.text;
  }
  function act(...btns) { actions.replaceChildren(...btns.filter(Boolean)); }
  function abtn(label, cls, fn) {
    const b = h('button', { type: 'button', class: 'zz-btn zh-btn ' + (cls || '') }, h('span', { class: 'zh-label', text: label }));
    b.addEventListener('click', fn);
    return b;
  }

  function cleanup() {
    if (!job) return;
    try { job.ac.abort(); } catch { /* 이미 끝남 */ }
    (job.urls || []).forEach(u => URL.revokeObjectURL(u));
    job.converted = null;
    job = null;
    sync();
  }
  function close() {
    const m = job && job.modal;
    cleanup();
    if (m) m.close();
  }

  async function start(file) {
    if (job) return;
    const why = precheck(file, state());
    if (why) { ctx.toast(why, 'warn'); return; }
    job = { file, ac: new AbortController(), urls: [], phase: 'convert' };
    sync();
    // 익명(U19): 원본 파일 이름은 보이지 않는다. 종류만 알린다
    { const ext = String(file.name || '').toLowerCase().split('.').pop(); fileLine.textContent = `고른 자료: ${ext === 'pdf' ? 'PDF' : ext === 'hwp' || ext === 'hwpx' ? '한/글' : ext === 'pptx' ? 'PPTX' : '그림'}`; }
    showConverting();
    job.modal = ctx.modal({ title: '안건 올리기', body, onClose: () => cleanup(), keep: () => !!job });   // 발표가 시작돼도 접기만(작업 유지)
    const my = job;
    try {
      const converted = await api.convertFile(file, { signal: my.ac.signal, onProgress: p => { if (job === my) setProgress(p); } });
      if (job !== my || !alive) return;
      my.converted = converted;
      showPreview();
    } catch (e) {
      if (job !== my || !alive) return;
      if (isAbort(e)) { close(); return; }
      showError(errorText(e));
    }
  }

  function showConverting() {
    job.phase = 'convert';
    setProgress({ phase: 'load' });
    main.replaceChildren(bar, barText,
      h('p', { class: 'zh-muted', text: '파일을 쪽 그림으로 바꾸고 있어요. 쪽이 많으면 몇 분 걸릴 수 있어요.' }));
    act(abtn('취소', 'ghost', () => { close(); ctx.toast('올리기를 취소했어요.', 'info'); }));
  }

  function showPreview() {
    job.phase = 'preview';
    const c = job.converted;
    const n = c.pages.length;
    const title = h('input', { type: 'text', class: 'zh-title-input', value: '', placeholder: '예: 2학기 학사 일정', maxlength: '100', id: 'zh-up-title' });   // 파일 이름으로 미리 채우지 않는다(익명)
    const thumbs = h('ol', { class: 'zh-thumbs' }, c.thumbs.map((t, i) => {
      const u = URL.createObjectURL(t);
      job.urls.push(u);
      return h('li', { class: 'zh-thumb' }, h('img', { src: u, alt: `${i + 1}쪽`, loading: 'lazy' }), h('span', { class: 'zz-num', text: String(i + 1) }));
    }));
    const warns = (c.warnings || []).length
      ? h('ul', { class: 'zh-warns' }, c.warnings.map(w => h('li', { text: w })))
      : null;
    main.replaceChildren(...[
      h('label', { class: 'zh-field', for: 'zh-up-title' }, h('span', { text: '안건 이름' }), title),
      h('p', { class: 'zh-muted zz-num', text: `모두 ${n}쪽이에요. 쪽 그림을 확인해 주세요.` }),
      warns, thumbs].filter(Boolean));
    const go = abtn('이대로 올리기', 'primary', () => {
      const t = title.value.trim() || '새 안건';
      doUpload(t);
    });
    act(abtn('취소', 'ghost', () => close()), go);
    setTimeout(() => go.focus(), 0);
  }

  async function doUpload(title) {
    const my = job;
    my.phase = 'upload';
    setProgress({ phase: 'upload', done: 0, total: my.converted.pages.length * 2 });
    main.replaceChildren(bar, barText, h('p', { class: 'zh-muted', text: '창을 닫지 말고 기다려 주세요.' }));
    act(abtn('취소', 'ghost', () => { close(); ctx.toast('올리기를 취소했어요.', 'info'); }));
    try {
      await api.uploadAgenda(mid, {
        file: my.file, converted: my.converted, title, signal: my.ac.signal,
        onProgress: p => { if (job === my) setProgress(p); }
      });
      if (job !== my || !alive) return;
      close();
      ctx.toast(`「${title}」 안건을 올렸어요.`, 'ok');
    } catch (e) {
      if (job !== my || !alive) return;
      if (isAbort(e)) { close(); return; }
      showError(errorText(e), true);
    }
  }

  function showError(text, canRetry) {
    job.phase = 'error';
    main.replaceChildren(h('div', { class: 'zh-error', role: 'alert' }, h('p', { text })));
    const again = abtn('다른 파일 고르기', 'ghost', () => { close(); input.value = ''; input.click(); });
    const retry = canRetry && job.converted
      ? abtn('다시 올리기', 'primary', () => { job.ac = new AbortController(); showPreview(); })
      : null;
    act(abtn('닫기', 'ghost', () => close()), again, retry);
  }

  const offs = ['meeting', 'agenda'].map(k => store.on(k, sync));
  sync();

  return {
    unmount() {
      alive = false;
      offs.forEach(f => f());
      close();
      root.replaceChildren();
    }
  };
}
