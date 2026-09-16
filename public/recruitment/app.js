'use strict';
(() => {
    const $ = selector => document.querySelector(selector);
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const labels = { draft: '설정 완료', document: '서류 평가', interview: '면접 평가', finalized: '결과 확정' };
    const stages = { document: '서류심사', interview: '면접심사' };
    const fmt = v => v === null || v === undefined ? '—' : Number(v).toFixed(1);
    const stamp = v => new Date(v).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const state = { list: [], current: null, tab: 'overview', config: null, isNew: false, busy: false, dirty: false, invite: null, invites: {}, resign: false };
    let messageTimer;
    const idFromUrl = () => new URL(location.href).searchParams.get('id');
    // 보관함 연결 콜백은 ?google=connected 로 돌아온다. 눌렀던 자리로 되돌려 준다.
    if (new URL(location.href).searchParams.get('google') === 'connected') state.tab = 'exports';
    const incoming = new URLSearchParams(location.hash.slice(1)).get('invite');
    if (incoming && /^[a-f0-9]{64}$/.test(incoming) && idFromUrl()) { sessionStorage.setItem(`recruitment-invite:${idFromUrl()}`, incoming); history.replaceState(null, '', location.pathname + location.search); }
    function token() { return idFromUrl() && sessionStorage.getItem(`recruitment-invite:${idFromUrl()}`); }
    function headers() { const h = { 'Content-Type': 'application/json' }; if (token()) h['X-Recruitment-Token'] = token(); else h['X-Auth-Token'] = localStorage.getItem('airoom_auth_token') || ''; return h; }
    function notify(message) { clearTimeout(messageTimer); $('#message').textContent = message; $('#message').hidden = false; messageTimer = setTimeout(() => { $('#message').hidden = true; }, 6000); }
    async function api(endpoint, method = 'GET', body) {
        const response = await fetch('/api/recruitments' + endpoint, { method, headers: headers(), body: body === undefined ? undefined : JSON.stringify(body) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error || '요청을 처리하지 못했습니다.'); return data;
    }
    function canLeave() { return !state.dirty || confirm('저장하지 않은 입력이 있습니다. 화면을 이동할까요?'); }
    window.addEventListener('beforeunload', event => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
    function setId(id) { history.replaceState(null, '', '/recruitment' + (id ? `?id=${id}` : '')); }
    async function load(id = idFromUrl()) {
        if (!token()) { const [list, config] = await Promise.all([api(''), api('/config')]); state.list = list.items; state.config = config; }
        if (id) { state.current = await api('/' + id); setId(id); }
        state.dirty = false; render();
    }
    function login(error = '') {
        $('#app').innerHTML = `<section class="panel login"><p class="eyebrow">BAEKAMI RECRUITMENT</p><h1>채용 관리 로그인</h1><p class="muted">백암이에 들어갈 때 쓰는 접근 코드로 로그인하세요. 담당 위원은 받은 초대 링크를 이용합니다.</p>${error ? `<p class="notice error">${esc(error)}</p>` : ''}<form id="login-form"><label class="field">백암이 접근 코드<input type="password" name="code" autocomplete="current-password" required></label><div class="actions" style="margin-top:20px"><button class="primary">로그인</button><button type="button" class="secondary" data-action="exit">초대 접속 해제</button></div></form></section>`;
    }
    const field = (title, name, value = '', type = 'text', extra = '') => `<label class="field">${title}<input name="${name}" type="${type}" value="${esc(value)}" ${extra} required></label>`;
    function reviewerRow(v = {}) { return `<div class="reviewer">${field('위원 이름', 'reviewer-name', v.name || '', 'text', 'maxlength="50"')}${field('직위', 'reviewer-position', v.position || '교사', 'text', 'maxlength="50"')}<div><label class="check"><input type="checkbox" name="document" ${v.document === false ? '' : 'checked'}>서류</label><label class="check"><input type="checkbox" name="interview" ${v.interview === false ? '' : 'checked'}>면접</label></div><button type="button" class="secondary" data-action="remove-reviewer" aria-label="이 위원 삭제">삭제</button></div>`; }
    const DEFAULT_RUBRICS = {
        document: [{ label: '학력', max: 6 }, { label: '자격증', max: 6 }, { label: '경력', max: 6 }, { label: '지속 근무', max: 6 }, { label: '자기소개서', max: 26 }],
        interview: [{ label: '인성', max: 10 }, { label: '교직관', max: 10 }, { label: '소양', max: 10 }, { label: '수업 이해', max: 10 }, { label: '학생 이해', max: 10 }]
    };
    const stageName = { document: '서류심사', interview: '면접심사' };
    const code = index => String(index + 1).padStart(3, '0');
    function criterionRow(item = { label: '', max: '' }) {
        return `<div class="rubric-row"><input name="label" value="${esc(item.label)}" maxlength="40" placeholder="항목 이름" aria-label="항목 이름" required><input name="max" type="number" min="0.5" max="100" step="0.5" value="${item.max}" aria-label="배점" required><button type="button" class="secondary" data-action="remove-criterion" aria-label="항목 삭제">×</button></div>`;
    }
    function rubricEditor(stage) {
        return `<div class="rubric-box"><div class="split"><h4>${stageName[stage]}</h4><span class="badge" data-total="${stage}">—</span></div><div class="rubric-rows" id="rubric-${stage}">${DEFAULT_RUBRICS[stage].map(criterionRow).join('')}</div><button type="button" class="secondary" data-action="add-criterion" data-stage="${stage}">+ 항목 추가</button></div>`;
    }
    // 접수번호는 입력받지 않고 순번으로 붙인다. 이름만 채우면 된다.
    function candidateRows(count, names = []) {
        return Array.from({ length: count }, (_, i) => `<div class="candidate-row"><span class="candidate-code">${code(i)}</span><input name="candidate-name" maxlength="50" value="${esc(names[i] || '')}" placeholder="${i + 1}번째 지원자 이름" aria-label="${code(i)} 지원자 이름" required></div>`).join('');
    }
    function syncCandidates(names) {
        const form = $('#create-form'); if (!form) return;
        const box = $('#candidate-rows'); const count = Math.min(20, Math.max(1, Number(form.elements.candidateCount.value) || 1));
        const kept = names || Array.from(box.querySelectorAll('[name=candidate-name]')).map(el => el.value);
        box.innerHTML = candidateRows(count, kept);
    }
    function syncTotals() {
        for (const stage of ['document', 'interview']) {
            const box = document.querySelector(`#rubric-${stage}`); const badge = document.querySelector(`[data-total="${stage}"]`); if (!box || !badge) continue;
            const sum = Array.from(box.querySelectorAll('[name=max]')).reduce((total, el) => total + (Number(el.value) || 0), 0);
            badge.textContent = `총 ${Math.round(sum * 10) / 10}점 · ${box.querySelectorAll('.rubric-row').length}개 항목`;
        }
    }
    function createForm() {
        const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
        return `<section class="panel"><div class="split"><div><p class="eyebrow">NEW RECRUITMENT</p><h2>새 채용 설정</h2></div><button class="secondary" data-action="fill-example">예시 채우기</button></div><p class="notice">평가는 이 웹에서 진행합니다. 점수 입력·집계·결과 문서 모두 실제로 저장됩니다.</p><form id="create-form"><div class="grid">${field('학교명', 'school', '', 'text', 'maxlength="100"')}${field('채용명', 'title', '', 'text', 'maxlength="100"')}${field('채용 분야', 'field', '', 'text', 'maxlength="100"')}${field('면접대상자 최대 수', 'shortlistLimit', '1', 'number', 'min="1" max="4"')}${field('서류전형일', 'documentDate', today, 'date')}${field('면접일', 'interviewDate', today, 'date')}<label class="field">최종 순위 기준<select name="rankingBasis"><option value="combined">서류 평균 + 면접 평균</option><option value="interview">면접 평균</option></select></label><label class="field">가점 사용<select name="allowBonus"><option value="false">미사용</option><option value="true">사용 (서류 총점의 40% 이상 · 근거 입력)</option></select></label></div>

<h3 style="margin-top:28px">평가 항목과 배점</h3><p class="muted small">전형별로 항목을 추가·삭제하고 배점을 바꿀 수 있습니다. 0.5점 단위, 항목당 최대 100점, 전형별 최대 12개. 생성 후에는 바꿀 수 없습니다.</p><div class="grid">${rubricEditor('document')}${rubricEditor('interview')}</div>

<h3 style="margin-top:28px">평가위원</h3><p class="muted small">전형별 1~4명. 같은 위원이 두 전형에 참여하면 한 줄에 모두 선택하세요.</p><div id="reviewer-rows">${reviewerRow()}</div><button type="button" class="secondary" data-action="add-reviewer" style="margin:14px 0 24px">+ 위원 추가</button>

<h3>지원자</h3><p class="muted small">인원수를 정하면 접수번호가 001부터 자동으로 붙습니다. 이름만 입력하세요.</p><label class="field" style="max-width:200px">지원자 수<input name="candidateCount" type="number" min="1" max="20" value="3" required></label><div id="candidate-rows">${candidateRows(3)}</div>

<p class="small muted" style="margin-top:18px">순위는 동점 시 공동순위입니다. 설정은 생성 후 고정되며 면접대상자는 서류 평가 완료 후 관리자가 확정합니다.</p><div class="actions"><button class="primary">채용 생성</button><button type="button" class="secondary" data-action="cancel-new">취소</button></div></form></section>`;
    }
    function navigation() { return `<aside><div class="split"><h2>채용 목록</h2><span class="badge gray">${state.list.length}</span></div><button class="primary" style="width:100%" data-action="new">+ 새 채용</button><div class="list">${state.list.map(r => `<button class="card ${state.current?.id === r.id && !state.isNew ? 'active' : ''}" data-action="open" data-id="${r.id}"><span class="badge">${labels[r.status]}</span><strong>${esc(r.title)}</strong><span class="muted small">${esc(r.school)} · 지원자 ${r.candidateCount}명</span></button>`).join('')}</div></aside>`; }
    function render() {
        const r = state.current, admin = !r || r.actor.role === 'admin';
        const content = state.isNew ? createForm() : r ? detail(r) : `<section class="panel empty"><p class="eyebrow">READY FOR YOUR NEXT HIRE</p><h1>평가 준비를 한곳에서.</h1><p class="muted">채용 정보를 한 번 설정하고, 위원별 평가와 집계·출력까지 이어가세요.</p><button class="primary" data-action="new">첫 채용 만들기</button></section>`;
        $('#app').innerHTML = `<div class="split"><div><p class="eyebrow">RECRUITMENT WORKSPACE</p><h1>채용 관리</h1><p class="muted">설정 · 공동 평가 · 결과 확정 · 문서 출력</p></div><div class="actions"><button class="secondary" data-action="refresh">새로고침</button>${!admin ? '<button class="secondary" data-action="exit">위원 접속 종료</button>' : ''}</div></div><div class="layout" ${!admin ? 'style="grid-template-columns:1fr"' : ''}>${admin ? navigation() : ''}<div>${content}</div></div>`;
        state.dirty = false;
        setupSignature();
        syncTotals();
    }
    let pad = null;
    // 캔버스는 render() 마다 새로 만들어지므로 그릴 때마다 다시 붙인다.
    function setupSignature() {
        const canvas = $('#sign-pad'); pad = null; if (!canvas) return;
        const ratio = window.devicePixelRatio || 1, width = canvas.clientWidth || 600, height = 190;
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); canvas.style.height = height + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#11181f';
        pad = { canvas, ctx, drawing: false, dirty: false };
        const at = e => { const box = canvas.getBoundingClientRect(); return { x: e.clientX - box.left, y: e.clientY - box.top }; };
        canvas.addEventListener('pointerdown', e => { e.preventDefault(); pad.drawing = true; canvas.setPointerCapture(e.pointerId); const p = at(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.1, p.y); ctx.stroke(); pad.dirty = true; });
        canvas.addEventListener('pointermove', e => { if (!pad.drawing) return; e.preventDefault(); const p = at(e); ctx.lineTo(p.x, p.y); ctx.stroke(); });
        for (const type of ['pointerup', 'pointercancel', 'pointerleave']) canvas.addEventListener(type, () => { pad.drawing = false; });
    }
    const PLEDGE_ITEMS = ['객관적이고 공정한 평가를 위하여 지원자와의 이해관계를 확인하고, 이해충돌이 있는 경우 담당자에게 알리겠습니다.', '평가와 관련하여 금품·향응·편의를 수수하거나 제공받지 않으며, 이러한 상황이 발생하면 담당 부서에 통보하겠습니다.', '업무상 취득한 비밀을 준수하고 보안 관련 규정과 지침을 성실히 수행하겠습니다.', '평가와 관련하여 알게 된 업무상 비밀을 타인에게 누설하지 않겠습니다.'];
    function pledgePanel(r) {
        const me = r.reviewers.find(v => v.id === r.actor.id);
        if (me?.pledge?.signedAt && !state.resign) return `<section class="panel"><div class="split"><div><h2>청렴서약서</h2><p class="muted small">${stamp(me.pledge.signedAt)} 서명 완료 · 결과 문서에 반영됩니다.</p></div>${r.status !== 'finalized' ? '<button type="button" class="secondary" data-action="resign">다시 서명</button>' : ''}</div>${me.pledge.image ? `<img class="signature-view" src="${me.pledge.image}" alt="내 서명">` : ''}</section>`;
        return `<section class="panel"><h2>청렴서약서</h2><p>본인은 ${esc(r.school)}의 ${esc(r.field)} 채용 심사를 실시함에 있어 다음 사항을 준수할 것을 서약합니다.</p><ol class="rule-list">${PLEDGE_ITEMS.map(v => `<li>${esc(v)}</li>`).join('')}</ol><p class="notice">아래 칸에 마우스나 손가락으로 직접 서명해 주세요. 서명해야 평가를 제출할 수 있으며, 서명은 확정 결과 문서의 서약서와 채점표에 그대로 인쇄됩니다.</p><canvas id="sign-pad" class="sign-pad" role="img" aria-label="서명란"></canvas><div class="actions"><button type="button" class="secondary" data-action="sign-clear">지우기</button><button type="button" class="primary" data-action="sign-save">서명 저장</button>${state.resign ? '<button type="button" class="secondary" data-action="resign-cancel">취소</button>' : ''}</div></section>`;
    }
    function detail(r) {
        const active = ['document', 'interview'].includes(r.status) ? r.status : 'document';
        const required = r.reviewers.filter(v => v.stages.includes(active)).length;
        const submitted = Object.values(r.evaluations).filter(e => e.stage === active && e.submittedAt).length;
        return `<div class="split"><div><span class="badge">${labels[r.status]}</span><h2 style="margin:12px 0 4px">${esc(r.title)}</h2><p class="muted small">${esc(r.school)} · ${esc(r.field)}</p></div><span class="readonly">${r.actor.role === 'admin' ? '관리자' : esc(r.actor.name) + ' 위원'}</span></div><div class="steps">${Object.keys(labels).map(s => `<span class="${r.status === s ? 'active' : ''}">${labels[s]}</span>`).join('')}</div><div class="stats"><div class="stat"><strong>${r.candidates.length}<small> 명</small></strong><span>지원자</span></div><div class="stat"><strong>${submitted} / ${required}</strong><span>${stages[active]} 제출 위원</span></div><div class="stat"><strong>${r.shortlist.length}<small> 명</small></strong><span>확정 면접대상자</span></div></div><nav class="tabs" aria-label="채용 상세">${[['overview', '기본 설정'], ['evaluation', '평가 진행'], ['results', '통계·결과'], ['exports', '문서 출력'], ['history', '처리 이력']].map(([id, name]) => `<button data-action="tab" data-tab="${id}" aria-pressed="${state.tab === id}">${name}</button>`).join('')}</nav>${({ overview, evaluation, results, exports: exportsPanel, history: historyPanel })[state.tab](r)}`;
    }
    function overview(r) {
        return `<section class="panel"><h2>기본 정보</h2><div class="grid"><p><span class="muted small">서류전형일</span><br>${esc(r.documentDate)}</p><p><span class="muted small">면접일</span><br>${esc(r.interviewDate)}</p><p><span class="muted small">최종 순위 기준</span><br>${r.rules.rankingBasis === 'combined' ? '서류 평균 + 면접 평균' : '면접 평균'}</p><p><span class="muted small">서류 가점</span><br>${r.rules.allowBonus ? '사용 · 최대 5점, 확인 근거 필수' : '미사용'}</p></div><p class="notice">평가는 이 웹에서 진행합니다. 위원에게 초대 링크를 보내면 바로 채점할 수 있습니다. Google 시트 파일은 따로 만들지 않습니다.</p>${r.status === 'draft' && r.actor.role === 'admin' ? '<button class="primary" data-action="provision">평가 시작하기</button>' : ''}<h3 style="margin-top:24px">평가위원</h3><div class="table-wrap"><table><thead><tr><th>위원</th><th>직위</th><th>담당 전형</th><th>평가 접속</th></tr></thead><tbody>${r.reviewers.map(v => `<tr><td>${esc(v.name)}</td><td>${esc(v.position)}</td><td>${v.stages.map(s => stages[s]).join(' · ')}</td><td>${r.actor.role === 'admin' && r.status !== 'finalized' ? `<div class="actions"><button class="secondary" data-action="invite" data-id="${v.id}">${state.invites[v.id] ? '재발급' : '링크 발급'}</button>${state.invites[v.id] ? `<button class="secondary" data-action="copy-one" data-id="${v.id}">복사</button><a href="${esc(state.invites[v.id])}" target="_blank" rel="noopener noreferrer">열기 ↗</a>` : ''}</div>` : '배정 완료'}</td></tr>`).join('')}</tbody></table></div>${r.actor.role === 'admin' && r.status !== 'finalized' ? `<div class="actions" style="margin-top:14px"><button class="secondary" data-action="invite-all">위원 전체 링크 발급</button>${Object.keys(state.invites).length ? '<button class="primary" data-action="copy-all">전체 링크 복사</button>' : ''}</div>` : ''}${Object.keys(state.invites).length ? `<div class="invite-box"><strong>위원 전용 링크 · 7일 유효</strong><p class="small">재발급하면 이전 링크는 즉시 무효가 됩니다. 링크를 가진 사람은 그 위원으로 평가할 수 있으니 본인에게만 전달하세요. 메일은 자동 발송하지 않습니다. 이 목록은 화면을 새로 불러오면 사라지니 지금 복사해 두세요.</p><textarea id="invite-list" class="invite-list" readonly rows="${Math.min(8, r.reviewers.filter(v => state.invites[v.id]).length * 2)}">${esc(r.reviewers.filter(v => state.invites[v.id]).map(v => `${v.name} (${v.position})\n${state.invites[v.id]}`).join('\n\n'))}</textarea></div>` : ''}<h3>지원자</h3><div class="table-wrap"><table><thead><tr><th>접수번호</th><th>성명</th><th>면접대상</th></tr></thead><tbody>${r.candidates.map(c => `<tr><td>${esc(c.code)}</td><td>${esc(c.name)}</td><td>${r.shortlist.includes(c.id) ? '선정' : '—'}</td></tr>`).join('')}</tbody></table></div></section>`;
    }
    function evaluation(r) {
        if (r.status === 'draft') return '<section class="panel"><h2>평가 준비</h2><p>관리자가 기본 설정에서 ‘평가 시작하기’를 누르면 채점을 시작할 수 있습니다.</p></section>';
        const stage = r.status === 'interview' || r.status === 'finalized' ? 'interview' : 'document';
        if (r.actor.role === 'admin') return `<section class="panel"><h2>${stages[stage]} 제출 현황</h2><p class="muted small">위원이 자기 초대 링크로 접속해 저장·제출합니다. 관리자는 점수를 대신 입력하지 않습니다.</p>${r.reviewers.filter(v => v.stages.includes(stage)).map(v => { const ev = r.evaluations[`${stage}:${v.id}`]; return `<div class="split audit"><div><strong>${esc(v.name)}</strong><p class="muted small">${ev?.submittedAt ? `제출 ${stamp(ev.submittedAt)}` : ev ? '작성 중 · 미제출' : '작성 전'}</p></div>${ev?.submittedAt && r.status !== 'finalized' ? `<button class="secondary" data-action="reopen" data-id="${v.id}" data-stage="${stage}">평가 재개방</button>` : ''}</div>`; }).join('')}<p class="notice" style="margin-top:18px">제출 완료 후 점수는 잠깁니다. 재개방 시 사유를 기록합니다. 다음 전형 또는 확정 상태에서는 이전 평가를 수정할 수 없습니다.</p></section>`;
        if (!r.actor.stages.includes(stage)) return '<section class="panel"><h2>현재 전형에 배정되지 않았습니다.</h2><p>담당 전형의 시작을 기다려주세요.</p></section>';
        const ev = r.evaluations[`${stage}:${r.actor.id}`]; const locked = !!ev?.submittedAt || r.status === 'finalized';
        const candidates = stage === 'document' ? r.candidates : r.candidates.filter(c => r.shortlist.includes(c.id));
        const hasSigned = !!r.reviewers.find(v => v.id === r.actor.id)?.pledge?.signedAt;
        return pledgePanel(r) + `<section class="panel"><h2>${stages[stage]} 평가 입력</h2><p class="muted">${esc(r.actor.name)} 위원 · ${locked ? '제출 완료 · 수정 잠김' : '임시 저장 후 평가 제출을 눌러주세요.'}</p><form id="score-form" data-stage="${stage}"><div class="table-wrap"><table><caption>빈칸은 미입력, 0은 0점입니다. 0.5점 단위로 입력할 수 있습니다.</caption><thead><tr><th>지원자</th><th>참석</th>${r.rubrics[stage].map(c => `<th>${esc(c.label)}<br><small>최대 ${c.max}</small></th>`).join('')}${stage === 'document' && r.rules.allowBonus ? '<th>가점</th>' : ''}<th>메모 / 불참·가점 근거</th></tr></thead><tbody>${candidates.map(c => { const row = ev?.rows.find(x => x.candidateId === c.id); return `<tr data-candidate="${c.id}"><th scope="row">${esc(c.code)}<br>${esc(c.name)}</th><td><select name="attendance" aria-label="${esc(c.code)} 참석 상태" ${locked ? 'disabled' : ''}><option value="present">참석</option><option value="absent" ${row?.attendance === 'absent' ? 'selected' : ''}>불참</option></select></td>${r.rubrics[stage].map(item => `<td><input class="score" type="number" min="0" max="${item.max}" step="0.5" name="${item.id}" aria-label="${esc(c.code)} ${esc(item.label)} 점수" value="${row?.scores[item.id] ?? ''}" ${locked ? 'disabled' : ''}></td>`).join('')}${stage === 'document' && r.rules.allowBonus ? `<td><select name="bonus" aria-label="${esc(c.code)} 가점" ${locked ? 'disabled' : ''}>${[0, 2.5, 5].map(v => `<option value="${v}" ${row?.bonus === v ? 'selected' : ''}>${v}</option>`).join('')}</select></td>` : ''}<td><textarea name="note" class="score-note" maxlength="1000" aria-label="${esc(c.code)} 평가 메모" ${locked ? 'disabled' : ''}>${esc(row?.note || '')}</textarea></td></tr>`; }).join('')}</tbody></table></div>${!locked ? `<div class="actions"><button class="secondary" type="submit">임시 저장</button><button type="button" class="primary" data-action="submit-evaluation" ${hasSigned ? '' : 'disabled'}>저장 후 평가 제출</button>${hasSigned ? '' : '<span class="muted small">청렴서약서에 서명하면 제출할 수 있습니다.</span>'}</div>` : '<p class="notice">제출이 완료되었습니다. 수정이 필요하면 관리자에게 재개방을 요청하세요.</p>'}</form></section>`;
    }
    function scoreTable(r, stage) {
        const rows = stage === 'document' ? r.documentResults : r.finalResults;
        const reviewers = r.reviewers.filter(v => v.stages.includes(stage));
        const val = (row, reviewer) => { const ev = r.evaluations[`${stage}:${reviewer.id}`]; if (!ev?.submittedAt) return '미제출'; const item = ev.rows.find(x => x.candidateId === row.candidateId); return !item ? '—' : item.attendance === 'absent' ? '불참' : fmt(Object.values(item.scores).reduce((a, b) => a + b, 0) + item.bonus); };
        return `<div class="table-wrap"><table><thead><tr><th>접수번호 / 이름</th>${stage === 'interview' ? '<th>서류 평균</th>' : ''}${reviewers.map(v => `<th>${esc(v.name)}<br><small>${stage === 'document' ? '가점 포함' : '면접 점수'}</small></th>`).join('')}<th>제출/배정</th><th>${stage === 'document' ? '서류' : '면접'} 평균</th>${stage === 'interview' ? '<th>합산</th><th>순위 기준 점수</th>' : ''}<th>${stage === 'document' ? '서류' : '최종'} 순위</th><th>상태</th></tr></thead><tbody>${rows.map(c => `<tr><td>${esc(c.code)}<br><strong>${esc(c.name)}</strong></td>${stage === 'interview' ? `<td class="number">${fmt(c.document)}</td>` : ''}${reviewers.map(v => `<td class="number">${val(c, v)}</td>`).join('')}<td>${c.submitted}/${c.required}</td><td class="number">${fmt(stage === 'document' ? c.score : c.interview)}</td>${stage === 'interview' ? `<td class="number">${fmt(c.total)}</td><td class="number">${fmt(c.rankingScore)}</td>` : ''}<td class="number">${c.rank ?? '—'}</td><td>${c.conflict ? '참석 표시 불일치' : c.absent ? '불참' : c.complete ? '완료' : '미제출 있음'}</td></tr>`).join('')}</tbody></table></div>`;
    }
    function results(r) {
        const docReady = r.documentResults.every(c => c.complete && !c.conflict);
        const intReady = r.finalResults.length && r.finalResults.every(c => c.complete && !c.conflict);
        return `<section class="panel"><h2>집계 기준</h2><ul class="rule-list small"><li>서류 기본 50점${r.rules.allowBonus ? ' + 확인 가점 최대 5점' : ' · 가점 미사용'}, 면접 50점.</li><li>각 전형은 배정 위원 전원 제출 후 평균을 계산합니다. 미제출을 0점으로 계산하지 않습니다.</li><li>전형 평균은 소수 첫째 자리로 반올림하고, 표시된 서류 평균과 면접 평균을 합산합니다.</li><li>최종 순위 기준: <strong>${r.rules.rankingBasis === 'combined' ? '서류 평균 + 면접 평균' : '면접 평균'}</strong>. 동점은 공동순위(1, 2, 2, 4)이며 합격자는 자동 결정하지 않습니다.</li><li>모든 위원이 불참으로 표시한 대상자는 순위에서 제외합니다. 참석 표시가 다르면 확정을 막습니다.</li></ul></section><section class="panel"><h2>서류심사 통계표</h2>${scoreTable(r, 'document')}${r.actor.role === 'admin' && r.status === 'document' ? `<form id="shortlist-form"><h3>면접대상자 확정 (최대 ${r.rules.shortlistLimit}명)</h3><div class="actions">${r.documentResults.map(c => `<label class="check"><input type="checkbox" name="candidateId" value="${c.candidateId}" ${c.score === null ? 'disabled' : ''}>${esc(c.code)} ${esc(c.name)} (${c.rank ?? '—'}위)</label>`).join('')}</div><label class="field" style="margin-top:15px">선정 사유 · 동점 처리 근거<textarea name="reason" maxlength="1000" required placeholder="예: 서류 상위 3명 선정. 동점자는 기관의 확정 기준 적용."></textarea></label><button class="primary" style="margin-top:15px" ${!docReady ? 'disabled' : ''}>면접대상자 확정</button><p class="small muted" style="margin-top:10px">확정하면 서류 평가는 잠기고 면접 평가가 시작됩니다.</p></form>` : ''}</section>${r.shortlist.length ? `<section class="panel"><h2>면접·최종 합산 통계표</h2>${scoreTable(r, 'interview')}<p class="small muted">면접대상자 선정 사유: ${esc(r.shortlistReason)}</p>${r.actor.role === 'admin' && r.status === 'interview' ? `<button class="primary" data-action="finalize" ${!intReady ? 'disabled' : ''}>결과 확정 · 출력본 준비</button>` : ''}${r.snapshot ? `<p class="notice">${stamp(r.snapshot.finalizedAt)} 확정 · v${r.snapshot.version}. 문서 출력 탭에서 HTML/PDF·Excel·ZIP을 받을 수 있습니다.</p>` : ''}</section>` : ''}`;
    }
    function exportsPanel(r) {
        return `<section class="panel"><h2>확정 결과 문서</h2><p class="muted">설정한 배점 그대로 통계표·위원별 채점표·청렴서약서를 만듭니다.</p>${!r.snapshot ? '<p class="notice">모든 평가를 제출하고 통계·결과 탭에서 결과를 확정하세요.</p>' : r.actor.role !== 'admin' ? '<p class="notice">전체 결과 문서 다운로드는 관리자가 진행합니다.</p>' : `<div class="download-grid"><button class="primary" data-action="download" data-format="html"><strong>HTML → PDF</strong><small>인쇄용 서식 열기</small></button><button class="secondary" data-action="download" data-format="xlsx"><strong>Excel 통계표</strong><small>위원별 점수·집계·평가 상세</small></button><button class="secondary" data-action="download" data-format="zip"><strong>전체 ZIP</strong><small>HTML · Excel · 확정 데이터</small></button><button class="secondary" data-action="download" data-format="hwpx"><strong>한글(HWPX)</strong><small>공문서 편집용 · 한/글에서 열기</small></button></div><p class="notice" style="margin-top:20px">HTML 인쇄 화면의 ‘인쇄 / PDF로 저장’을 누르고 PDF로 저장을 선택하세요.</p>${r.archive ? `<div class="notice"><strong>Drive 보관됨</strong> · ${stamp(r.archive.archivedAt)}<br>${esc(r.archive.files.join(', '))}<br>자동 삭제 예정: ${stamp(r.archive.purgeAfter)}<br><a href="${esc(r.archive.folderUrl)}" target="_blank" rel="noopener noreferrer">보관함 열기 ↗</a></div>` : ''}${state.config?.google?.connected
    ? `<div class="actions"><button class="secondary" data-action="archive">${r.archive ? '보관본 다시 올리기' : '문서 보관 (7일 뒤 자동 삭제)'}</button></div><p class="small muted" style="margin-top:10px">보관한 문서는 7일 뒤 지워집니다. 삭제는 별도 예약 작업이 아니라 누군가 보관을 실행할 때 함께 정리됩니다.</p>`
    : state.config?.google?.configured
        ? `<div class="actions"><button class="secondary" data-action="connect-archive">문서 보관함 연결</button></div><p class="small muted" style="margin-top:10px">확정 문서를 학교 보관함에 올려 7일간 두려면 한 번 연결해야 합니다. 연결 화면으로 이동했다가 돌아옵니다.</p>`
        : '<p class="small muted" style="margin-top:10px">이 서버에는 문서 보관함이 설정되어 있지 않습니다. 문서는 이 기기로 내려받아 보관하세요.</p>'}`}</section>`;
    }
    function historyPanel(r) { return `<section class="panel"><h2>처리 이력</h2>${[...r.audit].reverse().map(e => `<div class="audit"><time>${stamp(e.at)}</time><strong>${esc(e.action)}</strong> · ${e.actor === 'admin' ? '관리자' : esc(r.reviewers.find(v => v.id === e.actor)?.name || e.actor)}${e.detail ? `<p class="muted small">${esc(e.detail)}</p>` : ''}</div>`).join('')}</section>`; }
    // 서버는 토큰 해시만 저장한다. 원본 링크는 발급 응답에만 있으므로 화면에서 붙잡아 둔다.
    async function issueInvite(reviewerId) {
        const data = await api(`/${state.current.id}/invites/${reviewerId}`, 'POST', { version: state.current.version });
        state.current = data.recruitment; state.invites[reviewerId] = location.origin + data.invitationPath; return data;
    }
    async function mutate(path, body = {}) { const r = await api(`/${state.current.id}/${path}`, 'POST', { ...body, version: state.current.version }); state.current = r; if (!token()) { const list = await api(''); state.list = list.items; } state.dirty = false; render(); return r; }
    function collectScores() { const form = $('#score-form'), stage = form.dataset.stage; const rows = Array.from(form.querySelectorAll('tr[data-candidate]')).map(tr => ({ candidateId: tr.dataset.candidate, attendance: tr.querySelector('[name=attendance]').value, scores: Object.fromEntries(state.current.rubrics[stage].map(c => { const v = tr.querySelector(`[name=${c.id}]`).value; return [c.id, v === '' ? null : Number(v)]; })), bonus: Number(tr.querySelector('[name=bonus]')?.value || 0), note: tr.querySelector('[name=note]').value })); return { stage, rows }; }
    async function run(fn) { if (state.busy) return; state.busy = true; const buttons = Array.from(document.querySelectorAll('button')).filter(b => !b.disabled); buttons.forEach(b => { b.disabled = true; }); try { await fn(); } catch (e) { notify(e.message); } finally { state.busy = false; buttons.filter(b => b.isConnected).forEach(b => { b.disabled = false; }); } }
    $('#app').addEventListener('input', e => {
        if (e.target.closest('#score-form,#create-form,#shortlist-form')) state.dirty = true;
        if (e.target.name === 'max') syncTotals();
        if (e.target.name === 'candidateCount') syncCandidates();
    });
    $('#app').addEventListener('submit', e => {
        e.preventDefault(); const form = e.target;
        run(async () => {
            if (form.id === 'login-form') { const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: new FormData(form).get('code') }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); if (!['admin', 'user'].includes(data.role)) throw new Error('백암이 접근 코드로 로그인하세요. 위원은 초대 링크를 사용합니다.'); localStorage.setItem('airoom_auth_token', data.token); if (token()) sessionStorage.removeItem(`recruitment-invite:${idFromUrl()}`); await load(); }
            if (form.id === 'create-form') {
                const f = new FormData(form); const reviewers = Array.from(form.querySelectorAll('.reviewer')).map(row => ({ name: row.querySelector('[name=reviewer-name]').value, position: row.querySelector('[name=reviewer-position]').value, stages: ['document', 'interview'].filter(s => row.querySelector(`[name=${s}]`).checked) }));
                const candidates = Array.from(form.querySelectorAll('[name=candidate-name]')).map((el, k) => ({ code: code(k), name: el.value.trim() }));
                const rubrics = {}; for (const stage of ['document', 'interview']) rubrics[stage] = Array.from(form.querySelectorAll(`#rubric-${stage} .rubric-row`)).map(row => ({ label: row.querySelector('[name=label]').value, max: Number(row.querySelector('[name=max]').value) }));
                const r = await api('', 'POST', { school: f.get('school'), title: f.get('title'), field: f.get('field'), documentDate: f.get('documentDate'), interviewDate: f.get('interviewDate'), shortlistLimit: Number(f.get('shortlistLimit')), rankingBasis: f.get('rankingBasis'), allowBonus: f.get('allowBonus') === 'true', reviewers, candidates, rubrics }); state.isNew = false; state.invites = {}; state.tab = 'overview'; await load(r.id); notify('채용 설정을 저장했습니다.');
            }
            if (form.id === 'score-form') { const { stage, rows } = collectScores(); await mutate(`evaluations/${stage}/save`, { rows }); notify('평가를 임시 저장했습니다.'); }
            if (form.id === 'shortlist-form') { if (!confirm('면접대상자를 확정하면 서류 평가를 수정할 수 없습니다. 확정할까요?')) return; const data = new FormData(form); await mutate('shortlist', { candidateIds: data.getAll('candidateId'), reason: data.get('reason') }); notify('면접 평가를 시작합니다.'); }
        });
    });
    $('#app').addEventListener('click', e => { const button = e.target.closest('[data-action]'); if (!button) return; const action = button.dataset.action;
        run(async () => {
            if (['new', 'open', 'tab', 'refresh', 'cancel-new', 'exit'].includes(action) && !canLeave()) return;
            if (action === 'new') { state.isNew = true; state.invites = {}; render(); }
            if (action === 'cancel-new') { state.isNew = false; render(); }
            if (action === 'open') { state.isNew = false; state.invites = {}; state.tab = 'overview'; await load(button.dataset.id); }
            if (action === 'tab') { state.tab = button.dataset.tab; render(); }
            if (action === 'refresh') { await load(); notify('최신 상태를 불러왔습니다.'); }
            if (action === 'exit') { if (idFromUrl()) sessionStorage.removeItem(`recruitment-invite:${idFromUrl()}`); setId(null); state.current = null; try { await load(null); } catch (e) { login(e.message); } }
            if (action === 'add-reviewer') { if (document.querySelectorAll('.reviewer').length >= 8) throw new Error('위원은 최대 8명입니다.'); $('#reviewer-rows').insertAdjacentHTML('beforeend', reviewerRow()); state.dirty = true; }
            if (action === 'remove-reviewer') { if (document.querySelectorAll('.reviewer').length <= 1) throw new Error('위원이 최소 1명 필요합니다.'); button.closest('.reviewer').remove(); state.dirty = true; }
            if (action === 'fill-example') { const form = $('#create-form'); if (!form) return; if (state.dirty && !confirm('현재 입력을 예시로 바꿀까요?')) return; Object.entries({ school: '예시초등학교', title: '2026 기초학력 협력강사 채용 (예시)', field: '기초학력 협력강사', shortlistLimit: '2', candidateCount: '3' }).forEach(([k, v]) => { form.elements[k].value = v; });
                syncCandidates(['예시지원자 가', '예시지원자 나', '예시지원자 다']); $('#reviewer-rows').innerHTML = reviewerRow({ name: '예시위원 가' }) + reviewerRow({ name: '예시위원 나' }); state.dirty = true; }
            if (action === 'add-criterion') { const box = document.querySelector(`#rubric-${button.dataset.stage}`); if (box.querySelectorAll('.rubric-row').length >= 12) throw new Error('항목은 전형별 최대 12개입니다.'); box.insertAdjacentHTML('beforeend', criterionRow()); syncTotals(); state.dirty = true; }
            if (action === 'remove-criterion') { const box = button.closest('.rubric-rows'); if (box.querySelectorAll('.rubric-row').length <= 1) throw new Error('항목이 최소 1개 필요합니다.'); button.closest('.rubric-row').remove(); syncTotals(); state.dirty = true; }
            if (action === 'connect-archive') {
                if (!canLeave()) return;
                const data = await api('/google/start', 'POST', {});
                location.href = data.authorizationUrl;
            }
            if (action === 'archive') {
                if (!confirm('확정 문서를 Drive에 올립니다. 7일 뒤 폴더째 자동 삭제됩니다. 계속할까요?')) return;
                const data = await api(`/${state.current.id}/archive`, 'POST', { version: state.current.version });
                await load(state.current.id);
                notify(`Drive에 보관했습니다. ${data.retentionDays}일 뒤 삭제됩니다.` + (data.purged.deleted.length ? ` 기한 지난 ${data.purged.deleted.length}건도 정리했습니다.` : ''));
            }
            if (action === 'sign-clear') { if (!pad) return; pad.ctx.clearRect(0, 0, pad.canvas.width, pad.canvas.height); pad.dirty = false; }
            if (action === 'resign') { state.resign = true; render(); }
            if (action === 'resign-cancel') { state.resign = false; render(); }
            if (action === 'sign-save') {
                if (!pad || !pad.dirty) throw new Error('서명란에 직접 서명해 주세요.');
                // 서명 저장은 화면을 다시 그린다. 입력 중이던 점수가 날아가지 않도록 먼저 임시 저장한다.
                const form = $('#score-form');
                if (form && form.querySelector('.score:not([disabled])')) { const { stage, rows } = collectScores(); await mutate(`evaluations/${stage}/save`, { rows }); }
                await mutate('pledge', { image: pad.canvas.toDataURL('image/png') });
                state.resign = false; render(); notify('서명을 저장했습니다. 입력 중이던 점수도 함께 임시 저장했습니다.');
            }
            if (action === 'provision') { await mutate('provision'); notify('평가를 시작했습니다. 위원 탭에서 초대 링크를 발급하세요.'); }
            if (action === 'invite') { await issueInvite(button.dataset.id); render(); notify('링크를 발급했습니다. 해당 위원에게만 전달하세요.'); }
            if (action === 'invite-all') {
                if (!confirm('모든 위원의 링크를 새로 발급합니다. 이미 나눠준 링크는 무효가 됩니다. 계속할까요?')) return;
                for (const v of state.current.reviewers) await issueInvite(v.id);
                render(); notify(`위원 ${state.current.reviewers.length}명의 링크를 발급했습니다.`);
            }
            if (action === 'copy-one') { await navigator.clipboard.writeText(state.invites[button.dataset.id]); notify('링크를 복사했습니다.'); }
            if (action === 'copy-all') { await navigator.clipboard.writeText($('#invite-list').value); notify('전체 링크를 복사했습니다.'); }
            if (action === 'submit-evaluation') { if (!$('#score-form').reportValidity()) return; if (!confirm('제출 후에는 점수를 수정할 수 없습니다. 제출할까요?')) return; const { stage, rows } = collectScores(); await mutate(`evaluations/${stage}/save`, { rows }); await mutate(`evaluations/${stage}/submit`); notify('평가 제출이 완료되었습니다.'); }
            if (action === 'reopen') { const reason = prompt('평가 재개방 사유를 입력하세요.'); if (reason === null) return; await mutate(`evaluations/${button.dataset.stage}/reopen`, { reviewerId: button.dataset.id, reason }); notify('평가 입력을 다시 열었습니다.'); }
            if (action === 'finalize') { if (!confirm('모든 평가를 확정하고 수정할 수 없는 결과 스냅샷을 저장합니다. 계속할까요?')) return; await mutate('finalize'); state.tab = 'exports'; render(); notify('결과 확정본 v1을 저장했습니다.'); }
            if (action === 'download') {
                const format = button.dataset.format; const popup = format === 'html' ? window.open('about:blank', '_blank') : null;
                try { const response = await fetch(`/api/recruitments/${state.current.id}/export/${format}`, { headers: headers() }); if (!response.ok) { const data = await response.json(); throw new Error(data.error); } const blob = await response.blob(), url = URL.createObjectURL(blob);
                    if (popup) { popup.opener = null; popup.location.href = url; } else { const a = document.createElement('a'); a.href = url; a.download = `${state.current.title}_확정본_v1.${format}`; a.click(); }
                    setTimeout(() => URL.revokeObjectURL(url), 60000); notify(format === 'html' ? '인쇄용 HTML을 열었습니다. PDF로 저장할 수 있습니다.' : '다운로드를 준비했습니다.');
                } catch (e) { popup?.close(); throw e; }
            }
        });
    });
    load().catch(e => login(e.message));
})();
