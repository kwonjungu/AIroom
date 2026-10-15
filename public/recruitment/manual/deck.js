/* 사용 설명서 덱 넘김·목차·노트·인쇄 보기. 출처: kwonjungu/inline-ai-setup 강의안(lecture.html) 스크립트에서 화면 언어 부분만 뺐다. */
(function(){
  var qs = new URLSearchParams(location.search);
  var frames = [].slice.call(document.querySelectorAll('.frame'));
  var N = frames.length, cur = 0, present = true, printmode = qs.get('print') === '1';
  var body = document.body;
  var npBody = document.getElementById('npBody'), npMeta = document.getElementById('npMeta');
  var toc = document.getElementById('toc');

  function layout(){
    if (printmode){ frames.forEach(function(f){ f.style.width=''; f.style.height=''; f.firstElementChild.style.transform=''; }); return; }
    var notesW = body.classList.contains('notes-on') ? 420 : 0, s;
    if (present) s = Math.min((innerWidth - notesW - 24) / 1280, (innerHeight - 120) / 720);
    else s = Math.min(1, (innerWidth - notesW - 28) / 1280);
    frames.forEach(function(f){
      f.style.width = Math.round(1280 * s) + 'px';
      f.style.height = Math.round(720 * s) + 'px';
      f.firstElementChild.style.transform = 'scale(' + s + ')';
    });
  }
  addEventListener('resize', layout);

  function renderNotes(){
    var f = frames[cur], t = f.querySelector('template.notes');
    npMeta.textContent = (cur + 1) + '장 · ' + f.dataset.sec;
    npBody.innerHTML = t ? t.innerHTML : '';
    npBody.scrollTop = 0;
  }
  function show(i, noScroll){
    cur = Math.max(0, Math.min(N - 1, i));
    frames.forEach(function(f, k){ f.classList.toggle('on', k === cur); });
    document.getElementById('cnt').textContent = (cur + 1) + ' / ' + N;
    document.getElementById('prog').style.width = ((cur + 1) / N * 100) + '%';
    if (body.classList.contains('notes-on')) renderNotes();
    var tb = toc.querySelectorAll('button[data-go]');
    for (var k = 0; k < tb.length; k++) tb[k].classList.toggle('cur', +tb[k].dataset.go === cur);
    if (!present && !noScroll) frames[cur].scrollIntoView({block:'center'});
    try { history.replaceState(null, '', location.pathname + location.search + '#' + (cur + 1)); } catch(e) {}
  }
  function setPresent(on){
    present = on;
    body.classList.toggle('present', on);
    document.getElementById('mode').textContent = on ? '목록 보기' : '발표 모드';
    layout(); show(cur);
  }
  function toggleNotes(){ body.classList.toggle('notes-on'); layout(); renderNotes(); }
  function setPrint(on){
    printmode = on; body.classList.toggle('printmode', on);
    if (on) body.classList.remove('present', 'notes-on'); else body.classList.toggle('present', present);
    layout(); if (!on) show(cur);
  }

  function tr(k){ return k; }

  /* 목차 */
  var tocList = document.getElementById('tocList');
  function buildToc(){
    var html = '', last = null;
    frames.forEach(function(f, k){
      if (f.dataset.sec !== last){
        if (last !== null) html += '</div>';
        var c = getComputedStyle(f.firstElementChild).getPropertyValue('--ac') || '#111';
        html += '<div class="toc-sec"><h4><i style="background:' + c + '"></i>' + tr(f.dataset.sec) + '</h4>';
        last = f.dataset.sec;
      }
      html += '<button data-go="' + k + '"' + (k === cur ? ' class="cur"' : '') + '><em>' + (k + 1) + '</em>' + tr(f.dataset.title).replace(/</g, '&lt;') + '</button>';
    });
    tocList.innerHTML = html + '</div>';
  }
  tocList.addEventListener('click', function(e){
    var b = e.target.closest('button[data-go]'); if (!b) return;
    toc.classList.remove('on'); show(+b.dataset.go);
  });
  buildToc();

  /* 영상: 누르면 그 자리에 재생 */
  document.addEventListener('click', function(e){
    if (e.target.closest('.vlink')) return;
    var v = e.target.closest('.vid'); if (!v || v.dataset.on) return;
    v.dataset.on = '1';
    v.innerHTML = '<iframe src="' + v.dataset.embed + '" title="' + (v.getAttribute('aria-label') || '영상') + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
  });
  document.addEventListener('keydown', function(e){
    if ((e.key === 'Enter') && e.target.classList && e.target.classList.contains('vid')) e.target.click();
  });

  /* 키보드 */
  addEventListener('keydown', function(ev){
    if (window.__deckLocked) return;
    if (ev.target.tagName === 'INPUT') return;
    var k = ev.key;
    if (k === 'Escape'){ if (toc.classList.contains('on')) toc.classList.remove('on'); else if (printmode) setPrint(false); else if (body.classList.contains('notes-on')) toggleNotes(); return; }
    if (k === 't' || k === 'T' || k === 'ㅅ'){ toc.classList.toggle('on'); return; }
    if (toc.classList.contains('on')) return;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'ArrowDown' && present){ ev.preventDefault(); show(cur + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp' && present){ ev.preventDefault(); show(cur - 1); }
    else if (k === 'Home'){ show(0); }
    else if (k === 'End'){ show(N - 1); }
    else if (k === 'n' || k === 'N' || k === 'ㅜ'){ toggleNotes(); }
    else if (k === 'f' || k === 'F' || k === 'ㄹ'){ if (printmode) setPrint(false); setPresent(!present); }
    else if (k === 'p' || k === 'P' || k === 'ㅔ'){ setPrint(!printmode); }
  });

  /* 목록 보기에서 스크롤하면 현재 장 갱신 */
  var st;
  addEventListener('scroll', function(){
    if (present || printmode) return;
    clearTimeout(st); st = setTimeout(function(){
      var mid = innerHeight / 2, best = 0, bd = 1e9;
      frames.forEach(function(f, k){ var r = f.getBoundingClientRect(); var d = Math.abs(r.top + r.height / 2 - mid); if (d < bd){ bd = d; best = k; } });
      if (best !== cur) show(best, true);
    }, 80);
  });

  document.getElementById('mode').onclick = function(){ setPresent(!present); };
  document.getElementById('prev').onclick = function(){ show(cur - 1); };
  document.getElementById('next').onclick = function(){ show(cur + 1); };
  document.getElementById('btnNotes').onclick = toggleNotes;
  document.getElementById('npX').onclick = toggleNotes;
  document.getElementById('btnToc').onclick = function(){ toc.classList.add('on'); };
  toc.addEventListener('click', function(e){ if (e.target === toc) toc.classList.remove('on'); });

  var start = parseInt((location.hash || '').slice(1), 10);
  if (start >= 1 && start <= N) cur = start - 1;
  if (printmode){ setPrint(true); }
  else { setPresent(qs.get('list') !== '1'); }

  /* 인쇄 렌더용: 글꼴·이미지 로드 후 표시 */
  var imgs = [].slice.call(document.images).map(function(im){ return im.complete ? Promise.resolve() : new Promise(function(r){ im.onload = im.onerror = r; }); });
  Promise.all([document.fonts ? document.fonts.ready : Promise.resolve()].concat(imgs)).then(function(){ body.setAttribute('data-ready', '1'); });
})();
/* ?audit=1 : 넘침·겹침·깨진 이미지 점검(품질 검사용) */
(function(){
  if (new URLSearchParams(location.search).get('audit') !== '1') return;
  function run(){
    var out = [];
    [].slice.call(document.querySelectorAll('.frame')).forEach(function(f, i){
      var sl = f.firstElementChild, R = sl.getBoundingClientRect();
      var pn = sl.querySelector('.pnum').getBoundingClientRect();
      sl.querySelectorAll('*').forEach(function(el){
        if (el.closest('.ghost') || el.closest('.pnum') || el.closest('template') || el.closest('svg') && el.tagName !== 'svg') return;
        var r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
        var cls = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || el.tagName;
        if (r.right > R.right + 1 || r.bottom > R.bottom + 1 || r.left < R.left - 1 || r.top < R.top - 1)
          out.push((i+1) + ' OUT ' + el.tagName + '.' + cls + ' ' + Math.round(r.left-R.left) + ',' + Math.round(r.top-R.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow === 'hidden' && el.tagName !== 'svg' && !el.classList.contains('slide') && !el.classList.contains('vid'))
          out.push((i+1) + ' CLIP-X ' + el.tagName + '.' + cls);
        if (el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflow === 'hidden' && !el.classList.contains('slide') && el.tagName !== 'svg' && !el.classList.contains('vid'))
          out.push((i+1) + ' CLIP-Y ' + el.tagName + '.' + cls);
        if (el.children.length === 0 && el.textContent.trim() && !(r.right < pn.left || r.left > pn.right || r.bottom < pn.top || r.top > pn.bottom))
          out.push((i+1) + ' HIT-PNUM ' + el.tagName + '.' + cls + ' "' + el.textContent.trim().slice(0,20) + '"');
      });
      sl.querySelectorAll('img').forEach(function(im){ if (!im.naturalWidth) out.push((i+1) + ' BROKEN ' + im.getAttribute('src')); });
      var pad = sl.querySelector('.pad'); if (pad && pad.scrollHeight > pad.clientHeight + 2) out.push((i+1) + ' PAD-OVER ' + (pad.scrollHeight - pad.clientHeight) + 'px');
    });
    var pre = document.createElement('pre'); pre.id = 'audit'; pre.textContent = 'AUDIT-BEGIN\n' + out.join('\n') + '\nAUDIT-END'; document.body.appendChild(pre);
  }
  var imgs = [].slice.call(document.images).map(function(im){ return im.complete ? Promise.resolve() : new Promise(function(r){ im.onload = im.onerror = r; }); });
  Promise.all([document.fonts.ready].concat(imgs)).then(function(){ setTimeout(run, 300); });
})();
