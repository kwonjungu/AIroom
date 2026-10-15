'use strict';
(() => {
    const $ = selector => document.querySelector(selector);
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const labels = { draft: '설정 완료', document: '서류 평가', interview: '면접 평가', finalized: '결과 확정' };
    const stages = { document: '서류심사', interview: '면접심사', demo: '수업실연' };
    const fmt = v => v === null || v === undefined ? '—' : Number(v).toFixed(1);
    const stamp = v => new Date(v).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const state = { evalStage: null, presetId: null, presetTouched: false, list: [], current: null, tab: 'overview', tabSet: false, config: null, isNew: false, busy: false, dirty: false, invite: null, invites: {}, resign: false };
    let messageTimer;
    const idFromUrl = () => new URL(location.href).searchParams.get('id');
    // 보관함 연결 콜백은 ?google=connected 로 돌아온다. 눌렀던 자리로 되돌려 준다.
    if (new URL(location.href).searchParams.get('google') === 'connected') { state.tab = 'exports'; state.tabSet = true; }
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
        $('#app').innerHTML = `<section class="panel login"><h1>채용 관리 로그인</h1><p class="muted">백암이에 들어갈 때 쓰는 접근 코드를 넣으세요. 평가위원은 받은 링크로 바로 들어갑니다.</p>${error ? `<p class="notice error">${esc(error)}</p>` : ''}<form id="login-form"><label class="field">백암이 접근 코드<input type="password" name="code" autocomplete="current-password" required></label><div class="actions" style="margin-top:20px"><button class="primary">로그인</button><button type="button" class="secondary" data-action="exit">위원 링크 접속 해제</button></div></form></section>`;
    }
    const field = (title, name, value = '', type = 'text', extra = '') => `<label class="field">${title}<input name="${name}" type="${type}" value="${esc(value)}" ${extra} required></label>`;
    // 심사표 프리셋은 서버(lib/recruitment/presets.js)가 /config 로 내려준다. 화면에 따로 두지 않는다.
    // 강사 채용 표준(서류·면접)과 계약제 교원 채용 표준(서류·면접·수업실연, layout 'contract') 두 가지.
    const presets = () => state.config?.presets || [];
    const presetOf = id => presets().find(p => p.id === id) || null;
    const formPreset = () => presetOf($('#create-form [name=preset]')?.value ?? '');
    const isContractPreset = p => p?.layout === 'contract';
    const stagesOfPreset = p => p?.stages || ['document', 'interview'];
    // 인원 상한: 강사 채용 표준 지원자 20명·면접 4명, 계약제 지원자 100명·면접 10명.
    const LIMITS = { standard: { candidates: 20, shortlist: 4 }, contract: { candidates: 100, shortlist: 10 } };
    const limitsOf = p => LIMITS[isContractPreset(p) ? 'contract' : 'standard'];
    function reviewerRow(v = {}, stageList = stagesOfPreset(formPreset() || presets()[0])) {
        const checks = stageList.map(s => `<label class="check"><input type="checkbox" name="${s}" ${v[s] === false ? '' : 'checked'}>${STAGE_SHORT[s]}</label>`).join('');
        return `<div class="reviewer">${field('위원 이름', 'reviewer-name', v.name || '', 'text', 'maxlength="50"')}${field('직위', 'reviewer-position', v.position || '교사', 'text', 'maxlength="50"')}<div class="stage-checks">${checks}</div><button type="button" class="secondary" data-action="remove-reviewer" aria-label="이 위원 삭제">삭제</button></div>`;
    }
    const KIND_NAMES = { pick: '하나 고르기', scale: '점수 고르기', sum: '해당 줄 합산', judge: '위원 재량 점수' };
    const KIND_HINTS = {
        pick: '한 줄에 하나씩, 끝에 점수를 적어 주세요. 예) 채용 관련 전공 대학원 졸업(6점). 위원은 해당하는 한 줄만 고릅니다.',
        scale: '심사관점을 적고, 마지막 줄에 고를 점수를 적어 주세요. 예) 점수: 6, 5, 4, 3, 2, 1, 0  또는  점수: 상 3, 중 2, 하 1, 0. 위원은 점수 단추 하나를 누릅니다.',
        sum: '한 줄에 하나씩, 끝에 점수. 예) 초등 교원자격증(3점) / 채용 관련 자격증 건당(1점). 해당하는 줄을 모두 더하고 배점에서 자릅니다.',
        judge: '살펴볼 심사관점을 한 줄에 하나씩. 예) 용모 / 태도. 위원이 0~배점 사이로 매깁니다.'
    };
    const optionLine = o => `${o.label}(${o.points}점)`;
    const UNIT_WORDS = [['시간당', '시간'], ['건당', '건'], ['년당', '년'], ['회당', '회'], ['개당', '개']];
    // 심사관점 칸의 한 줄 = '대학원 졸업(6점)', '채용 관련 자격증 건당(1점)'. 원본 심사표 표기 그대로 적으면 된다.
    // 끝의 점수만 떼어 낸다: '(6점)'·'6점'·'(6)'·전각 괄호 모두 받는다. '(4년제)'처럼 점수가 아닌 괄호는 이름에 남는다.
    // 시트에서 복사한 줄 앞의 '-'·'·'·번호(1. ①)는 지운다.
    function parseOptionLine(raw) {
        const line = raw.replace(/\t+/g, ' ').replace(/^\s*(?:[-·•▪*]|\d+[.)]|[①-⑳])\s*/, '').trim();
        const m = /^(.*?\S)\s*(?:[(（]\s*(\d+(?:\.5)?)\s*점?\s*[)）]|(\d+(?:\.5)?)\s*점)\s*$/.exec(line);
        if (!m) return { line, error: "줄 끝에 점수를 '(6점)'처럼 적어 주세요." };
        const label = m[1].trim(), unit = UNIT_WORDS.find(([word]) => label.includes(word))?.[1];
        return { label, points: Number(m[2] ?? m[3]), ...(unit ? { unit } : {}) };
    }
    function parseOptionLines(value, label) {
        return value.split(/\n/).map(v => v.trim()).filter(Boolean).map(line => {
            const o = parseOptionLine(line);
            if (o.error) throw new Error(`${label}: '${line}' — ${o.error}`);
            return o;
        });
    }
    // 점수 고르기(scale): 마지막 '점수:' 줄 = 원본 드롭다운 목록. '상 3'처럼 앞에 이름을 붙일 수 있다. 나머지 줄은 심사관점 글.
    const SCALE_RE = /^\s*점수\s*[:：]\s*(.*)$/;
    function parseScale(value) {
        const lines = value.split(/\n/), at = lines.findIndex(l => SCALE_RE.test(l));
        if (at < 0) return { guide: value.trim(), options: [], error: "마지막 줄에 '점수: 6, 5, 4 …'처럼 고를 점수를 적어 주세요." };
        const options = SCALE_RE.exec(lines[at])[1].split(/[,，、]/).map(v => v.trim()).filter(Boolean).map(v => {
            const m = /^(.*?)\s*(\d+(?:\.5)?)\s*점?$/.exec(v);
            return m ? { label: m[1].trim(), points: Number(m[2]) } : { bad: v };
        });
        const bad = options.find(o => o.bad !== undefined);
        return { guide: lines.filter((l, i) => i !== at).join('\n').trim(), options: options.filter(o => o.bad === undefined), ...(bad ? { error: `'${bad.bad}'은 점수로 읽을 수 없습니다.` } : {}) };
    }
    const scaleLine = options => '점수: ' + options.map(o => o.label ? `${o.label} ${o.points}` : o.points).join(', ');
    // 하나 고르기·합산 항목은 적는 대로 '심사관점 | 점수'로 나눠 보여 준다. 하나 고르기·점수 고르기는 배점도 가장 높은 점수로 채운다
    // (사람이 배점을 직접 고치면 그 뒤로는 건드리지 않는다).
    function syncOptionPreview(row) {
        const kind = row.querySelector('[name=kind]').value, out = row.querySelector('.option-preview');
        const text = row.querySelector('[name=guide]').value, lines = text.split(/\n/).map(v => v.trim()).filter(Boolean);
        const max = row.querySelector('[name=max]');
        const autoMax = top => { if (top > 0 && (!max.value || max.dataset.auto === '1')) { max.value = top; max.dataset.auto = '1'; syncTotals(); } };
        if (kind === 'judge' || !lines.length) { out.innerHTML = ''; return; }
        if (kind === 'scale') {
            const s = parseScale(text);
            out.innerHTML = `<div class="chip-preview">${s.options.map(o => `<span class="chip on">${o.label ? esc(o.label) + ' ' : ''}${o.points}</span>`).join('')}${s.error ? `<p class="bad">${esc(s.error)}</p>` : ''}</div>`;
            autoMax(Math.max(0, ...s.options.map(o => o.points))); return;
        }
        const parsed = lines.map(parseOptionLine);
        out.innerHTML = `<table><thead><tr><th>심사관점</th><th class="number">점수</th></tr></thead><tbody>${parsed.map(o => o.error
            ? `<tr class="bad"><td>${esc(o.line)}</td><td class="number">점수 없음</td></tr>`
            : `<tr><td>${esc(o.label)}${o.unit ? ` <span class="muted">(${esc(o.unit)} 수를 넣음)</span>` : ''}</td><td class="number">${o.points}점</td></tr>`).join('')}</tbody></table>`;
        if (kind === 'pick') autoMax(Math.max(0, ...parsed.filter(o => !o.error).map(o => o.points)));
    }
    const STAGE_SHORT = { document: '서류', interview: '면접', demo: '수업실연' };
    const stageName = { document: '서류심사', interview: '면접심사', demo: '수업실연' };
    // 접수번호: 강사 채용 표준은 001부터, 계약제는 원본처럼 과목 + 두 자리(담임01).
    const code = (index, subject = '') => subject ? `${subject}${String(index + 1).padStart(2, '0')}` : String(index + 1).padStart(3, '0');
    function criterionRow(item = { label: '', max: '', kind: 'judge' }) {
        const kind = item.kind || 'judge';
        const lines = kind === 'judge' ? (item.guide || '') : kind === 'scale' ? [item.guide, scaleLine(item.options || [])].filter(Boolean).join('\n') : (item.options || []).map(optionLine).join('\n');
        // 원본 인쇄 모양(평가 기준 글·칸 병합)은 화면에서 고치지 않고 그대로 넘긴다.
        const look = Object.fromEntries(['head', 'join', 'print'].filter(k => item[k] !== undefined).map(k => [k, item[k]]));
        return `<div class="rubric-row"${Object.keys(look).length ? ` data-look="${esc(JSON.stringify(look))}"` : ''}><input name="label" value="${esc(item.label)}" maxlength="40" placeholder="구분 (항목 이름)" aria-label="항목 이름" required><input name="max" type="number" min="0.5" max="100" step="0.5" value="${item.max}" aria-label="배점" required><button type="button" class="secondary" data-action="remove-criterion" aria-label="항목 삭제">×</button><label class="kind-field">채점 방식<select name="kind">${Object.entries(KIND_NAMES).map(([k, v]) => `<option value="${k}" ${k === kind ? 'selected' : ''}>${v}</option>`).join('')}</select></label><textarea name="guide" class="guide-input" rows="${Math.max(4, lines.split(/\n/).length + 1)}" maxlength="1000" aria-label="${esc(item.label) || '이 항목'} 심사관점" placeholder="${esc(KIND_HINTS[kind])}">${esc(lines)}</textarea><div class="option-preview" aria-live="polite"></div></div>`;
    }
    // 편집 칸 한 줄 → 서버에 보낼 항목.
    function readCriterion(row, stage) {
        const label = row.querySelector('[name=label]').value.trim(), max = Number(row.querySelector('[name=max]').value), kind = row.querySelector('[name=kind]').value, lines = row.querySelector('[name=guide]').value.trim();
        const look = row.dataset.look ? JSON.parse(row.dataset.look) : {};
        if (kind === 'judge') return { label, max, kind, guide: lines, ...look };
        if (kind === 'scale') { const s = parseScale(lines); if (s.error) throw new Error(`${stageName[stage]} ${label || '항목'}: ${s.error}`); return { label, max, kind, guide: s.guide, options: s.options, ...look }; }
        return { label, max, kind, options: parseOptionLines(lines, `${stageName[stage]} ${label || '항목'}`), ...look };
    }
    const BLANK_ITEMS = [{ label: '', max: '', kind: 'judge' }];
    function rubricEditor(stage, preset) {
        const items = preset ? preset.rubrics[stage] : BLANK_ITEMS;
        return `<div class="rubric-box"><div class="split"><h4>${stageName[stage]}</h4><span class="badge" data-total="${stage}">—</span></div><div class="rubric-rows" id="rubric-${stage}">${items.map(criterionRow).join('')}</div><button type="button" class="secondary" data-action="add-criterion" data-stage="${stage}">+ 항목 추가</button></div>`;
    }
    // 계약제 전용 칸: 채용영역(기간제교사·시간강사)과 세부 영역(과목). 원본 '시작 필수 입력' 시트의 H15·J15 드롭다운.
    function contractFields(p) {
        const types = p?.recruitTypes || ['기간제교사', '시간강사'], subjects = p?.subjects || [];
        return `<div class="grid contract-only"><label class="field">채용영역<select name="recruitType">${types.map(t => `<option>${esc(t)}</option>`).join('')}</select></label><label class="field">세부 영역(과목)<select name="subject">${subjects.map(t => `<option>${esc(t)}</option>`).join('')}<option value="__custom">직접 입력…</option></select></label><label class="field" data-custom-subject hidden>과목 직접 입력<input name="subjectCustom" maxlength="20" placeholder="예: 음악"></label></div>`;
    }
    const subjectOf = form => { const v = form.elements.subject?.value; return v === '__custom' ? (form.elements.subjectCustom?.value.trim() || '') : (v || ''); };
    function syncContractField() {
        const form = $('#create-form'); if (!form || !isContractPreset(formPreset())) return;
        form.querySelector('[data-custom-subject]').hidden = form.elements.subject.value !== '__custom';
        const subject = subjectOf(form);
        form.elements.field.value = subject ? `${form.elements.recruitType.value}(${subject})` : form.elements.recruitType.value;
        syncCandidates();
    }
    // 심사표를 바꾸면 그 심사표에 맞게 폼 모양을 바꾼다: 전형 수, 위원 담당 전형, 인원 상한, 계약제 전용 칸, 가점 설명.
    function applyPreset(id) {
        const form = $('#create-form'); if (!form) return;
        const preset = presetOf(id), contract = isContractPreset(preset), stageList = stagesOfPreset(preset), lim = limitsOf(preset);
        $('#rubric-editors').innerHTML = stageList.map(stage => rubricEditor(stage, preset)).join('');
        if (!preset) $('#rubric-editors').innerHTML = stageList.map(stage => rubricEditor(stage, null)).join('');
        const reviewers = Array.from(form.querySelectorAll('.reviewer')).map(row => ({ name: row.querySelector('[name=reviewer-name]').value, position: row.querySelector('[name=reviewer-position]').value }));
        $('#reviewer-rows').innerHTML = (reviewers.length ? reviewers : [{}]).map(v => reviewerRow(v, stageList)).join('');
        $('#contract-box').innerHTML = contract ? contractFields(preset) : '';
        form.elements.field.readOnly = contract;
        form.elements.field.closest('.field').querySelector('.field-note')?.remove();
        if (contract) form.elements.field.insertAdjacentHTML('afterend', '<small class="field-note muted">채용영역과 과목을 고르면 저절로 채워집니다.</small>');
        else if (!form.elements.field.value || /^(기간제교사|시간강사)\(/.test(form.elements.field.value)) form.elements.field.value = preset?.field || '';
        form.elements.shortlistLimit.max = lim.shortlist; if (Number(form.elements.shortlistLimit.value) > lim.shortlist) form.elements.shortlistLimit.value = lim.shortlist;
        form.elements.candidateCount.max = lim.candidates;
        form.querySelector('[data-label=interviewDate]').firstChild.textContent = contract ? '면접·수업실연일' : '면접일';
        form.querySelector('[data-summary-orient]').hidden = contract;
        form.elements.allowBonus.options[1].textContent = contract ? '사용 (서류 3/1.5 · 면접 4/2 · 수업실연 3/1.5점 · 전형 만점의 40% 이상 득점자 · 근거 입력)' : '사용 (0~5점, 0.5점 간격 · 서류 만점의 40% 이상 득점자 · 근거 입력)';
        form.elements.rankingBasis.options[0].textContent = contract ? '서류 + 면접 + 수업실연 평균' : '서류 평균 + 면접 평균';
        form.elements.rankingBasis.options[1].textContent = contract ? '면접 + 수업실연 평균' : '면접 평균';
        $('#sample-note').textContent = contract
            ? '가상의 지원자 12명·위원 3명(원본 엑셀과 같은 규모)으로 끝까지 채점한 예시입니다. 서류전형·집계표는 A4 가로, 나머지는 세로로 나옵니다. 저장되지 않습니다.'
            : '가상의 지원자 5명·위원 3명으로 끝까지 채점한 예시입니다. 채용 분야 칸에 적은 영역이 제목에 들어갑니다. 저장되지 않으며, 2단계에서 고친 배점은 반영하지 않고 고른 심사표 그대로 보여 줍니다.';
        $('#reviewer-hint').textContent = contract ? '최대 5명. 서류·면접·수업실연 중 맡을 전형을 한 줄에서 고르세요.' : '최대 5명. 한 위원이 두 전형을 모두 맡으면 한 줄에서 둘 다 선택하세요.';
        $('#candidate-hint').textContent = contract ? `최대 ${lim.candidates}명. 관리번호가 과목 이름 + 01부터 자동으로 붙습니다(예: 담임01). 서류전형 평가표는 10명마다 한 장씩 늘어납니다.` : `최대 ${lim.candidates}명. 인원수를 정하면 접수번호가 001부터 자동으로 붙습니다. 이름만 넣으세요.`;
        syncContractField(); syncCandidates(); syncTotals();
    }
    // 접수번호는 입력받지 않고 순번으로 붙인다. 이름만 채우면 된다.
    function candidateRows(count, names = [], subject = '') {
        return Array.from({ length: count }, (_, i) => `<div class="candidate-row"><span class="candidate-code">${esc(code(i, subject))}</span><input name="candidate-name" maxlength="50" value="${esc(names[i] || '')}" placeholder="${i + 1}번째 지원자 이름" aria-label="${esc(code(i, subject))} 지원자 이름" required></div>`).join('');
    }
    function syncCandidates(names) {
        const form = $('#create-form'); if (!form) return;
        const lim = limitsOf(formPreset()), subject = isContractPreset(formPreset()) ? subjectOf(form) : '';
        const box = $('#candidate-rows'); const count = Math.min(lim.candidates, Math.max(1, Number(form.elements.candidateCount.value) || 1));
        const kept = names || Array.from(box.querySelectorAll('[name=candidate-name]')).map(el => el.value);
        box.innerHTML = candidateRows(count, kept, subject);
    }
    function syncTotals() {
        for (const stage of ['document', 'interview', 'demo']) {
            const box = document.querySelector(`#rubric-${stage}`); const badge = document.querySelector(`[data-total="${stage}"]`); if (!box || !badge) continue;
            const sum = Array.from(box.querySelectorAll('[name=max]')).reduce((total, el) => total + (Number(el.value) || 0), 0);
            badge.textContent = `총 ${Math.round(sum * 10) / 10}점 · ${box.querySelectorAll('.rubric-row').length}개 항목`;
        }
    }
    function createForm() {
        const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10), first = presets()[0];
        return `<section class="panel"><div class="split"><div><h2>새 채용 설정</h2><p class="muted small" style="margin:0">네 가지를 채우면 바로 평가를 시작할 수 있습니다. 생성 후에는 배점과 위원을 바꿀 수 없습니다.</p></div><button class="secondary" data-action="fill-example">예시 채우기</button></div><form id="create-form"><div class="preset-bar"><label class="field">심사표 불러오기<select name="preset">${presets().map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}<option value="">빈 심사표로 직접 만들기</option></select></label><p class="muted small"><b>강사 채용 표준</b>: 방과후·늘봄 강사 등, 서류 → 면접. <b>계약제 교원 채용 표준</b>: 기간제교사·시간강사, 서류 → 면접 + 수업실연. 고르면 평가 항목·배점·심사관점이 그 표준대로 채워집니다.</p><div class="actions sample-actions"><button type="button" class="secondary" data-action="sample" data-format="html">샘플 심사표 인쇄본 보기</button><button type="button" class="secondary" data-action="sample" data-format="hwpx">샘플 한글(HWPX) 받기</button></div><p class="muted small" id="sample-note"></p></div><h3 class="step-title"><b>1</b>채용 정보</h3><div id="contract-box"></div><div class="grid">${field('학교명', 'school', '', 'text', 'maxlength="100"')}${field('채용명', 'title', '', 'text', 'maxlength="100"')}${field('채용 분야(영역)', 'field', '', 'text', 'maxlength="100" placeholder="예: 문화예술강사[국악], 방과후학교 강사[컴퓨터부]"')}${field('면접대상자 최대 수', 'shortlistLimit', '1', 'number', 'min="1" max="4"')}${field('서류전형일', 'documentDate', today, 'date')}<label class="field" data-label="interviewDate">면접일<input name="interviewDate" type="date" value="${today}" required></label><label class="field">최종 순위 기준<select name="rankingBasis"><option value="combined">서류 평균 + 면접 평균</option><option value="interview">면접 평균</option></select></label><label class="field" data-summary-orient>집계표 용지<select name="summaryOrient"><option value="portrait">A4 세로 (원본 · 한 장 40칸)</option><option value="landscape">A4 가로 (지원자 10명씩 · 글씨 큼)</option></select></label><label class="field">가점 사용<select name="allowBonus"><option value="false">미사용</option><option value="true">사용</option></select></label></div>

<h3 class="step-title"><b>2</b>평가 항목과 배점</h3><p class="muted small">항목을 더하거나 지우고 배점·심사관점을 바꿀 수 있습니다. 0.5점 단위, 항목당 100점까지, 전형마다 12개까지. 위원은 여기 적힌 심사관점을 보고 채점합니다.</p><div class="grid" id="rubric-editors">${stagesOfPreset(first).map(stage => rubricEditor(stage, first)).join('')}</div><label class="field" style="margin-top:16px">심사 참고자료 (선택)<textarea name="guidance" class="guidance-input" maxlength="3000" placeholder="자격 요건, 결격 사유, 배점 해석처럼 위원 모두가 같이 알아야 할 내용을 적어 주세요. 채점 화면 맨 위에 펼쳐서 보여 줍니다."></textarea></label>

<h3 class="step-title"><b>3</b>평가위원</h3><p class="muted small" id="reviewer-hint"></p><div id="reviewer-rows">${reviewerRow({}, stagesOfPreset(first))}</div><button type="button" class="secondary" data-action="add-reviewer" style="margin:14px 0 4px">+ 위원 추가</button>

<h3 class="step-title"><b>4</b>지원자</h3><p class="muted small" id="candidate-hint"></p><label class="field" style="max-width:200px">지원자 수<input name="candidateCount" type="number" min="1" max="20" value="3" required></label><div id="candidate-rows">${candidateRows(3)}</div>

<p class="small muted" style="margin-top:18px">동점은 공동순위로 매깁니다. 면접대상자는 서류 평가가 끝난 뒤 관리자가 고릅니다.</p><div class="actions"><button class="primary">채용 생성</button><button type="button" class="secondary" data-action="cancel-new">취소</button></div></form></section>`;
    }
    function navigation() {
        return `<aside><div class="list-head"><h2>채용 목록</h2><button class="ghost" data-action="refresh">새로고침</button></div><button class="primary block" data-action="new">+ 새 채용</button><div class="list">${state.list.map(r => `<button class="card ${state.current?.id === r.id && !state.isNew ? 'active' : ''}" data-action="open" data-id="${r.id}"><span class="tag ${r.status}">${labels[r.status]}</span><strong>${esc(r.title)}</strong><span class="muted small">${esc(r.school)} · 지원자 ${r.candidateCount}명</span></button>`).join('')}</div></aside>`;
    }
    function emptyState() {
        return state.list.length
            ? `<section class="panel empty"><h2>왼쪽에서 채용을 고르세요.</h2><p class="muted">진행 중인 채용을 누르면 지금 할 일이 바로 보입니다. 새로 시작하려면 아래를 누르세요.</p><button class="primary" data-action="new">새 채용 만들기</button></section>`
            : `<section class="panel empty"><h2>아직 만든 채용이 없습니다.</h2><p class="muted">채용 정보와 배점을 한 번 정해 두면 위원 채점부터 결과 문서까지 이어집니다.</p><button class="primary" data-action="new">첫 채용 만들기</button></section>`;
    }
    function render() {
        const r = state.current, admin = !r || r.actor.role === 'admin';
        const content = state.isNew ? createForm() : r ? detail(r) : emptyState();
        $('#app').innerHTML = admin
            ? `<div class="layout">${navigation()}<div class="main-col">${content}</div></div>`
            : `<div class="solo">${content}</div>`;
        state.dirty = false;
        if (state.isNew && $('#create-form')) { const sel = $('#create-form [name=preset]'); if (state.presetId !== null && Array.from(sel.options).some(o => o.value === state.presetId)) sel.value = state.presetId; applyPreset(sel.value); }
        setupSignature();
        syncTotals();
        syncScoreTotals();
    }
    // 진행 단계 막대. 지금 어디이고 다음이 무엇인지 한 줄로 보여 준다.
    function rail(items, currentIndex) {
        return `<ol class="rail">${items.map((name, i) => `<li class="${i < currentIndex ? 'done' : i === currentIndex ? 'now' : ''}"${i === currentIndex ? ' aria-current="step"' : ''}><b>${i + 1}</b>${esc(name)}</li>`).join('')}</ol>`;
    }
    function stageCount(r, stage) {
        return {
            required: r.reviewers.filter(v => v.stages.includes(stage)).length,
            submitted: Object.values(r.evaluations).filter(e => e.stage === stage && e.submittedAt).length
        };
    }
    // 지금 채점하는 전형들. 계약제는 면접 단계에서 면접·수업실연 두 표를 같이 연다.
    const stagesOf = r => r.stages || ['document', 'interview'];
    function activeStages(r) {
        if (r.status === 'draft' || r.status === 'document') return ['document'];
        return stagesOf(r).filter(s => s !== 'document');
    }
    // 화면에 띄울 전형: 고른 것(state.evalStage) → 위원은 아직 제출 안 한 첫 전형 → 첫 전형.
    function currentStage(r) {
        const act = activeStages(r), mine = r.actor.role === 'admin' ? act : act.filter(s => r.actor.stages.includes(s));
        if (mine.includes(state.evalStage)) return state.evalStage;
        if (r.actor.role !== 'admin') { const open = mine.find(s => !r.evaluations[`${s}:${r.actor.id}`]?.submittedAt); if (open) return open; }
        return mine[0] || act[0];
    }
    function stageSwitch(r, stage) {
        const act = activeStages(r), mine = r.actor.role === 'admin' ? act : act.filter(s => r.actor.stages.includes(s));
        if (mine.length < 2) return '';
        return `<nav class="stage-switch" aria-label="채점할 전형">${mine.map(s => { const done = r.actor.role !== 'admin' && !!r.evaluations[`${s}:${r.actor.id}`]?.submittedAt; return `<button type="button" data-action="eval-stage" data-stage="${s}" aria-pressed="${s === stage}">${stages[s]}${done ? ' ✓' : ''}</button>`; }).join('')}</nav>`;
    }
    function adminNext(r) {
        if (r.status === 'draft') return { title: '평가를 시작하세요.', body: '시작하면 위원에게 보낼 평가 링크를 만들 수 있습니다.', button: '<button class="primary" data-action="provision">평가 시작하기</button>' };
        if (r.status === 'finalized') return { tone: 'done', title: '결과를 확정했습니다.', body: '문서 출력에서 인쇄용 HTML·Excel·한글 파일을 받으세요.', button: '<button class="primary" data-action="goto" data-tab="exports">문서 받으러 가기</button>' };
        const act = activeStages(r), counts = act.map(s => stageCount(r, s));
        const required = counts.reduce((a, c) => a + c.required, 0), submitted = counts.reduce((a, c) => a + c.submitted, 0);
        const names = act.map(s => stages[s]).join('·');
        if (submitted < required) return {
            title: `${names} 채점을 기다리는 중입니다.`, body: `제출 ${submitted} / ${required}건${act.length > 1 ? ` (${act.map((s, i) => `${stages[s]} ${counts[i].submitted}/${counts[i].required}`).join(', ')})` : ''}. 아직 링크를 못 받은 위원이 있으면 발급해 보내세요.`,
            meter: [submitted, required], button: '<button class="primary" data-action="goto" data-tab="overview" data-focus="reviewers">위원 링크 보내기</button>'
        };
        if (r.status === 'document') return { title: '면접대상자를 고르세요.', body: `서류 채점 ${required}명분이 모두 들어왔습니다.`, meter: [submitted, required], button: '<button class="primary" data-action="goto" data-tab="results" data-focus="shortlist">면접대상자 고르기</button>' };
        return { title: '결과를 확정하세요.', body: `${names} 채점 ${required}건이 모두 들어왔습니다.`, meter: [submitted, required], button: '<button class="primary" data-action="goto" data-tab="results" data-focus="final">결과 확정하러 가기</button>' };
    }
    function reviewerNext(r, stage) {
        if (!r.actor.stages.includes(stage)) return { title: '아직 차례가 아닙니다.', body: `${stages[stage]}는 다른 위원이 맡았습니다. 담당 전형이 시작되면 이 화면에 채점표가 나옵니다.` };
        const ev = r.evaluations[`${stage}:${r.actor.id}`];
        const signed = !!r.reviewers.find(v => v.id === r.actor.id)?.pledge?.signedAt;
        if (ev?.submittedAt || r.status === 'finalized') return { tone: 'done', title: '제출을 마쳤습니다.', body: '고쳐야 할 것이 있으면 담당 선생님께 알려 주세요.' };
        if (!signed) return { title: '먼저 청렴서약서에 서명해 주세요.', body: '서명을 저장해야 아래 채점표를 제출할 수 있습니다.' };
        return { title: '점수를 넣고 제출해 주세요.', body: '제출 전에는 임시 저장으로 잠시 멈췄다 이어서 할 수 있습니다.' };
    }
    function nextPanel(step) {
        const meter = step.meter ? `<div class="meter" role="img" aria-label="${step.meter[0]} / ${step.meter[1]} 제출"><i style="width:${step.meter[1] ? Math.round(step.meter[0] / step.meter[1] * 100) : 0}%"></i></div>` : '';
        return `<section class="next ${step.tone || ''}"><div><h3>${esc(step.title)}</h3><p>${esc(step.body)}</p>${meter}</div>${step.button || ''}</section>`;
    }
    let pad = null;
    // 캔버스는 render() 마다 새로 만들어지므로 그릴 때마다 다시 붙인다.
    function setupSignature() {
        const canvas = $('#sign-pad'); pad = null; if (!canvas) return;
        const ratio = window.devicePixelRatio || 1, width = canvas.clientWidth || 520, height = 180;
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); canvas.style.height = height + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#11181f';
        pad = { canvas, ctx, drawing: false, dirty: false };
        const at = e => { const box = canvas.getBoundingClientRect(); return { x: e.clientX - box.left, y: e.clientY - box.top }; };
        canvas.addEventListener('pointerdown', e => { e.preventDefault(); pad.drawing = true; canvas.setPointerCapture(e.pointerId); const p = at(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.1, p.y); ctx.stroke(); pad.dirty = true; });
        canvas.addEventListener('pointermove', e => { if (!pad.drawing) return; e.preventDefault(); const p = at(e); ctx.lineTo(p.x, p.y); ctx.stroke(); });
        for (const type of ['pointerup', 'pointercancel', 'pointerleave']) canvas.addEventListener(type, () => { pad.drawing = false; });
    }
    // 서명 칸은 넓지만 문서에는 25mm 로 들어간다. 그린 부분만 잘라 보내야 인쇄에서 획이 살아난다.
    function trimSignature(pad) {
        const { canvas, ctx } = pad, w = canvas.width, h = canvas.height;
        const data = ctx.getImageData(0, 0, w, h).data;
        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 8) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
        }
        if (maxX < 0) return null;
        const gap = Math.round(12 * (window.devicePixelRatio || 1));
        const x0 = Math.max(0, minX - gap), y0 = Math.max(0, minY - gap);
        const width = Math.min(w, maxX + 1 + gap) - x0, height = Math.min(h, maxY + 1 + gap) - y0;
        const out = document.createElement('canvas'); out.width = width; out.height = height;
        out.getContext('2d').drawImage(canvas, x0, y0, width, height, 0, 0, width, height);
        return out.toDataURL('image/png');
    }
    function guideDetails(r, stage, { open = false, guidance = true } = {}) {
        const items = (r.rubrics[stage] || []).filter(c => c.guide);
        const notes = guidance ? (r.guidance || '').trim() : '';
        if (!items.length && !notes) return '';
        const summary = notes && items.length ? `${stages[stage]} 평가 준거와 심사 참고자료` : notes ? '심사 참고자료' : `${stages[stage]} 평가 준거`;
        const notesHtml = notes ? `<h4>심사 참고자료</h4><p class="guidance-text">${esc(notes)}</p>` : '';
        const listHtml = items.length
            ? `${notes ? '<h4>항목별 평가 준거</h4>' : ''}<dl class="criteria">${items.map(c => `<div><dt>${esc(c.label)}<span>${c.max}점</span></dt><dd>${esc(c.guide).split(/\n/).map(v => v.trim()).filter(Boolean).map((v, i) => i === 0 ? `<span>${v}</span>` : `<span class="step">${v}</span>`).join('')}${c.kind === 'scale' ? `<span class="step">고르는 점수: ${c.options.map(o => o.label ? `${esc(o.label)} ${o.points}` : o.points).join(' · ')}</span>` : ''}</dd></div>`).join('')}</dl>`
            : '';
        return `<details class="panel guide-panel"${open ? ' open' : ''}><summary>${esc(summary)}</summary><div class="guide-body">${notesHtml}${listHtml}</div></details>`;
    }
    // 옛 채용(pledgeItems 없음)에 쓰던 문구. 새 채용은 심사표 프리셋의 서약 문구를 채용에 저장해 쓴다.
    const PLEDGE_ITEMS = ['객관적이고 공정한 평가를 위하여 지원자와의 이해관계를 확인하고, 이해충돌이 있는 경우 담당자에게 알리겠습니다.', '평가와 관련하여 금품·향응·편의를 수수하거나 제공받지 않으며, 이러한 상황이 발생하면 담당 부서에 통보하겠습니다.', '업무상 취득한 비밀을 준수하고 보안 관련 규정과 지침을 성실히 수행하겠습니다.', '평가와 관련하여 알게 된 업무상 비밀을 타인에게 누설하지 않겠습니다.'];
    function pledgePanel(r) {
        const me = r.reviewers.find(v => v.id === r.actor.id);
        if (me?.pledge?.signedAt && !state.resign) return `<section class="panel signed"><div class="split"><div><h2>${r.layout === 'contract' ? '임용심사위원 서약서' : '청렴서약서'} 서명 완료</h2><p class="muted small">${stamp(me.pledge.signedAt)} · 결과 문서에 그대로 들어갑니다.</p></div>${r.status !== 'finalized' ? '<button type="button" class="secondary" data-action="resign">다시 서명</button>' : ''}</div>${me.pledge.image ? `<img class="signature-view" src="${me.pledge.image}" alt="내 서명">` : ''}</section>`;
        // 계약제는 원본 '임용심사위원 서약서' 한 문단, 강사 채용 표준은 청렴서약서 항목.
        const body = r.layout === 'contract'
            ? `<h2>임용심사위원 서약서</h2><p>본인은 ${esc(r.documentDate.slice(0, 4))} 학년도 ${esc(r.school)} 『기간제교원』 ${esc((r.pledgeItems || [])[0] || '')}</p>`
            : `<h2>청렴서약서</h2><p>본인은 ${esc(r.school)}의 ${esc(r.field)} 채용 심사를 실시함에 있어 「부패 없는 투명한 사회」 구현 등을 위하여 다음 사항을 준수할 것을 서약합니다.</p><ol class="rule-list">${(r.pledgeItems || PLEDGE_ITEMS).map(v => `<li>${esc(v)}</li>`).join('')}</ol>`;
        return `<section class="panel">${body}<p class="sign-guide">아래 칸에 마우스나 손가락으로 이름을 쓰고 <b>서명 저장</b>을 누르세요. 서명해야 채점표를 제출할 수 있고, 이 서명은 결과 문서에 그대로 인쇄됩니다.</p><canvas id="sign-pad" class="sign-pad" role="img" aria-label="서명란"></canvas><div class="actions"><button type="button" class="primary" data-action="sign-save">서명 저장</button><button type="button" class="secondary" data-action="sign-clear">지우기</button>${state.resign ? '<button type="button" class="secondary" data-action="resign-cancel">취소</button>' : ''}</div></section>`;
    }
    function detail(r) {
        const admin = r.actor.role === 'admin';
        const stage = currentStage(r);
        const tabs = admin
            ? [['overview', '기본 설정'], ['evaluation', '평가 진행'], ['results', '통계·결과'], ['exports', '문서 출력'], ['history', '처리 이력']]
            : [['evaluation', '평가 진행'], ['overview', '채용 정보']];
        if (!admin && !state.tabSet) state.tab = 'evaluation';
        if (!tabs.some(([id]) => id === state.tab)) state.tab = tabs[0][0];
        let steps;
        if (admin) steps = rail(Object.values(labels), Object.keys(labels).indexOf(r.status));
        else {
            const ev = r.evaluations[`${stage}:${r.actor.id}`];
            const signed = !!r.reviewers.find(v => v.id === r.actor.id)?.pledge?.signedAt;
            steps = rail(['서약서 서명', '점수 입력', '제출'], ev?.submittedAt ? 3 : signed ? 1 : 0);
        }
        const who = admin ? '관리자' : `${esc(r.actor.name)} 위원 · ${stages[stage]}`;
        return `<header class="detail-head"><div><h2>${esc(r.title)}</h2><p class="muted small">${esc(r.school)} · ${esc(r.field)}${r.preset ? ` · ${esc(r.preset.name)}` : ''}</p></div><div class="actions"><span class="who">${who}</span>${admin ? '' : '<button class="ghost" data-action="refresh">새로고침</button><button class="ghost" data-action="exit">접속 종료</button>'}</div></header>${steps}${nextPanel(admin ? adminNext(r) : reviewerNext(r, stage))}<nav class="tabs" aria-label="채용 상세">${tabs.map(([id, name]) => `<button data-action="tab" data-tab="${id}" aria-pressed="${state.tab === id}">${name}</button>`).join('')}</nav>${({ overview, evaluation, results, exports: exportsPanel, history: historyPanel })[state.tab](r)}`;
    }
    // 발급된 링크를 QR 로 그린다. 링크가 없으면 안내만 둔다.
    // QR 이미지는 화면에 남지만 링크 원문과 마찬가지로 새로고침하면 사라진다(state.invites 가 메모리라서).
    function qrCell(url) {
        if (!url) return '<span class="muted small">링크 발급 후 표시</span>';
        try { return `<div class="qr-box">${window.SimpleQR.toSVG(url, { size: 104 })}</div>`; }
        catch (e) { return '<span class="muted small">QR 생성 실패</span>'; }
    }

    // 인사위원 배부용 인쇄 창 — 이름·직위·담당 전형·QR 을 한 장에 담는다.
    function printQrSheet(r) {
        const rows = r.reviewers.filter(v => state.invites[v.id]);
        if (!rows.length) { notify('먼저 링크를 발급하세요.'); return; }
        const cards = rows.map(v => {
            let svg = '';
            try { svg = window.SimpleQR.toSVG(state.invites[v.id], { size: 190 }); } catch (e) { svg = '<p>QR 생성 실패</p>'; }
            return `<div class="card"><div class="name">${esc(v.name)}</div><div class="pos">${esc(v.position)}</div>`
                + `<div class="stage">${v.stages.map(s => stages[s]).join(' · ')}</div>${svg}</div>`;
        }).join('');
        const win = window.open('', '_blank');
        if (!win) { notify('팝업이 차단되었습니다. 허용 후 다시 눌러 주세요.'); return; }
        win.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(r.title)} · 위원 배부표</title><style>
            *{box-sizing:border-box;margin:0;padding:0}
            body{font-family:'Pretendard','Malgun Gothic',sans-serif;color:#262626;padding:24px}
            h1{font-size:20px;font-weight:700;margin-bottom:4px}
            .sub{font-size:13px;color:#6b6b6b;margin-bottom:6px}
            .warn{font-size:12px;color:#6b6b6b;border:1px solid #e6e6e6;padding:10px 12px;margin-bottom:18px}
            .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
            .card{border:1px solid #cccccc;padding:16px;text-align:center;break-inside:avoid}
            .name{font-size:17px;font-weight:700}
            .pos{font-size:13px;color:#6b6b6b;margin-top:2px}
            .stage{font-size:12px;color:#3c3c3c;margin:6px 0 10px}
            .card svg{width:100%;height:auto;max-width:190px}
            @media print{body{padding:0}.grid{gap:10px}}
        </style></head><body><h1>${esc(r.title)}</h1>
            <div class="sub">${esc(r.school)} · ${esc(r.field)} · 서류 ${esc(r.documentDate)} · 면접 ${esc(r.interviewDate)}</div>
            <div class="warn">각 QR 은 해당 위원 본인 전용입니다. 다른 사람이 스캔하면 그 위원 이름으로 채점됩니다. 발급일로부터 7일이 지나면 열리지 않으며, 다시 발급하면 이전 QR 은 즉시 막힙니다.</div>
            <div class="grid">${cards}</div></body></html>`);
        win.document.close();
        setTimeout(() => win.print(), 300);
    }

    function overview(r) {
        const admin = r.actor.role === 'admin', open = admin && r.status !== 'finalized';
        const issued = r.reviewers.filter(v => state.invites[v.id]);
        return `<section class="panel"><h2>기본 정보</h2><dl class="facts"><div><dt>서류전형일</dt><dd>${esc(r.documentDate)}</dd></div><div><dt>${r.layout === 'contract' ? '면접·수업실연일' : '면접일'}</dt><dd>${esc(r.interviewDate)}</dd></div><div><dt>최종 순위 기준</dt><dd>${r.layout === 'contract' ? (r.rules.rankingBasis === 'combined' ? '서류 + 면접 + 수업실연 평균' : '면접 + 수업실연 평균') : r.rules.rankingBasis === 'combined' ? '서류 평균 + 면접 평균' : '면접 평균'}</dd></div><div><dt>집계표 용지</dt><dd>${r.layout === 'contract' ? '원본대로 서류전형·집계표 가로, 나머지 세로' : r.rules.summaryOrient === 'landscape' ? 'A4 가로 · 지원자 10명씩' : 'A4 세로'}</dd></div><div><dt>가점</dt><dd>${!r.rules.allowBonus ? '미사용' : r.rules.bonusByStage ? '사용 · 서류 3/1.5 · 면접 4/2 · 수업실연 3/1.5점, 근거 입력' : `서류 · 최대 ${bonusMax(r)}점, 근거 입력`}</dd></div></dl></section>${stagesOf(r).map((st, i) => guideDetails(r, st, { guidance: i === 0 })).join('')}<section class="panel" id="focus-reviewers"><div class="split"><h2>평가위원</h2>${open ? `<div class="actions"><button class="secondary" data-action="invite-all">위원 전체 링크 발급</button>${issued.length ? '<button class="primary" data-action="copy-all">전체 링크 복사</button><button class="secondary" data-action="print-qr">QR 배부표 인쇄</button>' : ''}</div>` : ''}</div>${open ? '<p class="muted small">링크를 발급해 해당 위원에게만 전달하세요. 링크를 열면 바로 서명하고 채점할 수 있습니다.</p>' : ''}<div class="table-wrap"><table><thead><tr><th>위원</th><th>직위</th><th>담당 전형</th><th>평가 링크</th><th class="qr-col">QR</th></tr></thead><tbody>${r.reviewers.map(v => `<tr><td>${esc(v.name)}</td><td>${esc(v.position)}</td><td>${v.stages.map(s => stages[s]).join(' · ')}</td><td>${open ? `<div class="actions"><button class="secondary" data-action="invite" data-id="${v.id}">${state.invites[v.id] ? '다시 발급' : '링크 발급'}</button>${state.invites[v.id] ? `<button class="secondary" data-action="copy-one" data-id="${v.id}">복사</button><a href="${esc(state.invites[v.id])}" target="_blank" rel="noopener noreferrer">열어보기</a>` : ''}</div>` : '배정 완료'}</td><td class="qr-col">${qrCell(state.invites[v.id])}</td></tr>`).join('')}</tbody></table></div>${issued.length ? `<div class="invite-box"><strong>발급된 링크 · 7일 동안 유효</strong><p class="small">링크를 가진 사람은 그 위원으로 채점할 수 있으니 본인에게만 보내세요. 다시 발급하면 이전 링크는 바로 막힙니다. 메일은 자동으로 가지 않습니다. <b>화면을 새로 불러오면 이 목록은 사라집니다. 지금 복사해 두세요.</b></p><textarea id="invite-list" class="invite-list" readonly rows="${Math.min(10, issued.length * 3)}">${esc(issued.map(v => `${v.name} (${v.position})\n${state.invites[v.id]}`).join('\n\n'))}</textarea></div>` : ''}</section><section class="panel"><h2>지원자 ${r.candidates.length}명</h2><div class="table-wrap"><table><thead><tr><th>접수번호</th><th>성명</th><th>면접대상</th></tr></thead><tbody>${r.candidates.map(c => `<tr><td>${esc(c.code)}</td><td>${esc(c.name)}</td><td>${r.shortlist.includes(c.id) ? '<span class="tag ok">선정</span>' : '—'}</td></tr>`).join('')}</tbody></table></div></section>${r.actor.role === 'admin' ? `<section class="panel danger-zone"><h2>채용 삭제</h2><p class="muted small">지원자 명단, 위원 평가와 서명, 결과 문서와 처리 이력이 모두 사라집니다. 되돌릴 수 없습니다.${r.status === 'finalized' ? ' 결과 문서가 필요하면 문서 출력 탭에서 먼저 내려받으세요.' : ' 아직 결과가 확정되지 않은 채용입니다.'}</p><button class="danger" data-action="delete-recruitment">이 채용 삭제</button></section>` : ''}`;
    }
    function evaluation(r) {
        if (r.status === 'draft') return '<section class="panel"><h2>아직 채점을 열지 않았습니다.</h2><p class="muted">위 ‘평가 시작하기’를 누르면 위원 링크를 만들 수 있습니다.</p></section>';
        if (r.actor.role === 'admin') return activeStages(r).map(stage => `<section class="panel"><h2>${stages[stage]} 제출 현황</h2><p class="muted small">위원이 자기 링크로 들어와 직접 채점합니다. 관리자는 점수를 대신 넣지 않습니다.</p><ul class="status-list">${r.reviewers.filter(v => v.stages.includes(stage)).map(v => { const ev = r.evaluations[`${stage}:${v.id}`]; const done = !!ev?.submittedAt; return `<li><div><strong>${esc(v.name)}</strong> <span class="muted small">${esc(v.position)}</span><p class="muted small">${done ? `${stamp(ev.submittedAt)} 제출` : ev ? '점수를 넣는 중' : '아직 점수를 넣지 않음'}</p></div><div class="actions"><span class="tag ${done ? 'ok' : ev ? 'wait' : ''}">${done ? '제출 완료' : ev ? '작성 중' : '작성 전'}</span>${done && r.status !== 'finalized' ? `<button class="secondary" data-action="reopen" data-id="${v.id}" data-stage="${stage}">다시 열기</button>` : ''}</div></li>`; }).join('')}</ul><p class="muted small" style="margin-top:16px">제출한 점수는 잠깁니다. 다시 열 때는 사유를 남겨야 하고, 다음 전형으로 넘어가면 이전 평가는 고칠 수 없습니다.</p></section>`).join('');
        const stage = currentStage(r);
        if (!r.actor.stages.includes(stage)) return `<section class="panel"><h2>지금은 ${stages[stage]} 차례입니다.</h2><p class="muted">담당하신 전형이 시작되면 이 자리에 채점표가 나옵니다. 그때 다시 링크를 열어 주세요.</p></section>`;
        const ev = r.evaluations[`${stage}:${r.actor.id}`]; const locked = !!ev?.submittedAt || r.status === 'finalized';
        const candidates = stage === 'document' ? r.candidates : r.candidates.filter(c => r.shortlist.includes(c.id));
        const hasSigned = !!r.reviewers.find(v => v.id === r.actor.id)?.pledge?.signedAt;
        const total = r.rubrics[stage].reduce((a, c) => a + c.max, 0);
        const guided = r.rubrics[stage].some(c => c.guide);
        const bonus = bonusChoices(r, stage);
        return pledgePanel(r) + stageSwitch(r, stage) + guideDetails(r, stage, { open: true }) + `<section class="panel"><div class="split"><h2>${stages[stage]} 채점표</h2><span class="muted small">지원자 ${candidates.length}명 · 만점 ${total}점</span></div><p class="muted small">심사관점 줄이나 점수 단추를 <b>눌러서</b> 고르면 점수가 저절로 매겨집니다. 재량 점수 칸의 빈칸은 아직 안 넣은 것, 0은 0점입니다.${locked ? '' : '<span class="wide-only"> 항목이 많으면 표를 좌우로 밀어서 보세요.</span>'}</p><form id="score-form" data-stage="${stage}">${guided ? '<input type="checkbox" id="show-guides" class="guide-check"><label class="guide-switch" for="show-guides">표 머리글에 평가 준거 함께 보기</label>' : ''}<div class="table-wrap score-wrap"><table class="score-table"><thead><tr><th>지원자</th><th>참석</th>${r.rubrics[stage].map(c => `<th>${esc(c.label)}<span class="max">${c.max}점</span>${c.guide ? `<span class="th-guide">${esc(c.guide)}</span>` : ''}</th>`).join('')}${bonus ? `<th>가점<span class="th-guide">${esc(bonus.label)}</span></th>` : ''}<th>합계</th><th>메모 / 불참·가점 근거</th></tr></thead><tbody>${candidates.map(c => { const row = ev?.rows.find(x => x.candidateId === c.id); const dis = locked ? 'disabled' : ''; return `<tr data-candidate="${c.id}"><th scope="row"><span class="code">${esc(c.code)}</span>${esc(c.name)}</th><td data-label="참석 여부"><div class="chips att" data-att role="radiogroup" aria-label="${esc(c.code)} 참석 상태"><label class="chip"><input type="radio" name="a-${c.id}" value="present" ${row?.attendance === 'absent' ? '' : 'checked'} ${dis}><span>참석</span></label><label class="chip warn"><input type="radio" name="a-${c.id}" value="absent" ${row?.attendance === 'absent' ? 'checked' : ''} ${dis}><span>불참</span></label></div></td>${r.rubrics[stage].map(item => `<td data-label="${esc(item.label)} · ${item.max}점">${scoreCell(c, item, row, locked)}</td>`).join('')}${bonus ? `<td data-label="가점"><div class="chips" data-bonus role="radiogroup" aria-label="${esc(c.code)} 가점">${bonus.options.map(o => `<label class="chip" title="${esc(o.label)}"><input type="radio" name="b-${c.id}" value="${o.points}" ${(row?.bonus ?? 0) === o.points ? 'checked' : ''} ${dis}><span>${o.points ? `${o.points}${o.tag ? ` <small>${esc(o.tag)}</small>` : ''}` : '없음'}</span></label>`).join('')}</div></td>` : ''}<td class="row-total" data-label="합계">—</td><td class="note-cell" data-label="메모 / 불참·가점 근거"><textarea name="note" class="score-note" maxlength="1000" aria-label="${esc(c.code)} 평가 메모" ${dis}>${esc(row?.note || '')}</textarea></td></tr>`; }).join('')}</tbody></table></div>${!locked ? `<div class="actions submit-bar"><button type="button" class="primary" data-action="submit-evaluation" ${hasSigned ? '' : 'disabled'}>저장 후 ${stages[stage]} 제출</button><button class="secondary" type="submit">임시 저장</button>${hasSigned ? '<span class="muted small">제출하면 점수를 고칠 수 없습니다.</span>' : '<span class="muted small">서약서에 서명하면 제출할 수 있습니다.</span>'}</div>` : '<p class="notice ok-note">제출을 마쳤습니다. 고칠 것이 있으면 담당 선생님께 다시 열어 달라고 알려 주세요.</p>'}</form></section>`;
    }
    // 채점 칸. 심사관점이 정해진 항목은 점수를 직접 넣지 않고 눌러서 고른다(드롭다운 없음).
    //   pick : 심사관점 줄 옆 단추 하나 · scale : 점수 단추 하나 · sum : 해당 줄 체크 / 개수 · judge : 숫자 직접 입력
    function scoreCell(c, item, row, locked) {
        const dis = locked ? 'disabled' : '', aria = `${esc(c.code)} ${esc(item.label)}`, name = `p-${c.id}-${item.id}`;
        if (item.kind === 'pick') {
            const v = row?.picks?.[item.id];
            return `<div class="opt-list" data-pick="${item.id}" role="radiogroup" aria-label="${aria} 심사관점">${item.options.map((o, i) => `<label class="opt"><input type="radio" name="${name}" value="${i}" ${v === i ? 'checked' : ''} ${dis}><span>${esc(o.label)}</span><b>${o.points}점</b></label>`).join('')}<label class="opt none"><input type="radio" name="${name}" value="-1" ${v === -1 ? 'checked' : ''} ${dis}><span>해당 없음</span><b>0점</b></label></div>`;
        }
        if (item.kind === 'scale') {
            const v = row?.picks?.[item.id];
            return `<div class="chips scale" data-pick="${item.id}" role="radiogroup" aria-label="${aria} 점수">${item.options.map((o, i) => `<label class="chip"><input type="radio" name="${name}" value="${i}" ${v === i ? 'checked' : ''} ${dis}><span>${o.label ? `${esc(o.label)} ` : ''}${o.points}</span></label>`).join('')}</div>`;
        }
        if (item.kind === 'sum') {
            const v = row?.picks?.[item.id] || [];
            return `<div class="sum-pick" data-name="${item.id}">${item.options.map((o, i) => o.unit
                ? `<label class="qty"><span>${esc(o.label)} ${o.points}점 ×</span><input type="number" min="0" max="99" step="1" inputmode="numeric" data-i="${i}" value="${v[i] || 0}" aria-label="${aria} ${esc(o.label)} ${esc(o.unit)} 수" ${dis}>${esc(o.unit)}</label>`
                : `<label class="tick"><input type="checkbox" data-i="${i}" ${v[i] ? 'checked' : ''} aria-label="${aria} ${esc(o.label)}" ${dis}><span>${esc(o.label)} ${o.points}점</span></label>`).join('')}<output class="sum-out"></output></div>`;
        }
        // 재량 항목은 숫자를 직접 넣는다(26점 같은 큰 배점을 단추로 고르면 번거롭다). 엉뚱한 값은 cleanScore 가 지운다.
        return `<input class="score" type="text" inputmode="decimal" autocomplete="off" name="${item.id}" data-max="${item.max}" placeholder="0~${item.max}" aria-label="${aria} 점수 (0~${item.max}점, 0.5점 단위)" value="${row?.scores[item.id] ?? ''}" ${dis}>`;
    }
    const stageMax = (r, stage) => Math.round(r.rubrics[stage].reduce((sum, c) => sum + c.max, 0) * 10) / 10;
    const bonusMax = r => r.rules.bonusMax ?? 5;
    // 가점 단추. 강사 채용 표준: 원본 시트처럼 0~5점 0.5점 간격(서류만). 계약제: 전형별 원본 목록(서류 3·1.5, 면접 4·2, 수업실연 3·1.5).
    function bonusChoices(r, stage) {
        if (!r.rules.allowBonus) return null;
        const by = r.rules.bonusByStage;
        if (by) {
            const b = by[stage]; if (!b) return null;
            return { label: `${b.threshold}점(40%) 이상 득점자 · ${b.text.replace(/\n/g, ' ')}`, options: [{ points: 0, label: '해당 없음' }, ...b.options.map(o => ({ points: o.points, label: o.label, tag: o.label }))] };
        }
        if (stage !== 'document') return null;
        const named = r.rules.bonusOptions || [], max = bonusMax(r);
        const values = Array.from({ length: Math.floor(max * 2) + 1 }, (x, i) => i / 2);
        return { label: r.rules.bonusLabel || '확인된 가점 대상자', options: values.map(points => { const o = named.find(x => x.points === points); return { points, label: points === 0 ? '해당 없음' : o?.label || `${points}점` }; }) };
    }
    function readPick(item, tr) {
        if (item.kind === 'pick' || item.kind === 'scale') { const el = tr.querySelector(`[data-pick="${item.id}"] input:checked`); return el ? Number(el.value) : null; }
        return Array.from(tr.querySelectorAll(`[data-name=${item.id}] input`)).map(el => el.type === 'checkbox' ? (el.checked ? 1 : 0) : Math.max(0, Math.floor(Number(el.value) || 0)));
    }
    // 서버 domain.pickScore 와 같은 계산. 화면 표시용이고, 저장되는 점수는 서버가 다시 계산한다.
    function pickPoints(item, pick) {
        if (pick === null) return { score: null, raw: null };
        if (item.kind === 'pick') return { score: pick === -1 ? 0 : item.options[pick].points, raw: null };
        if (item.kind === 'scale') return { score: item.options[pick].points, raw: null };
        const raw = Math.round(item.options.reduce((sum, o, i) => sum + o.points * pick[i], 0) * 10) / 10;
        return { score: Math.min(item.max, raw), raw };
    }
    // 점수 칸 정리. 입력 중에는 숫자·소수점 하나·소수 한 자리만 남기고(전각 숫자·쉼표는 바꿔 준다),
    // 칸을 떠날 때 0~배점 범위의 0.5점 단위가 아니면 지우고 알린다. 지운 칸은 빈칸(미입력)이라 제출 전에 다시 걸린다.
    function cleanScore(el, final) {
        const raw = el.value;
        let v = raw.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/[,，。．]/g, '.').replace(/[^0-9.]/g, '');
        const dot = v.indexOf('.'); if (dot >= 0) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '').slice(0, 1);
        if (!final) { if (v !== raw) el.value = v; return; }
        if (v === '' || v === '.') { el.value = ''; if (raw.trim()) notify('숫자가 아니어서 지웠습니다.'); return; }
        const n = Number(v), max = Number(el.dataset.max);
        if (!(n >= 0 && n <= max && Number.isInteger(n * 2))) { el.value = ''; notify(`${raw.trim()}점은 넣을 수 없어 지웠습니다. 0~${max}점, 0.5점 단위로 입력하세요.`); return; }
        el.value = String(n);
    }
    const attendanceOf = tr => tr.querySelector('[data-att] input:checked')?.value || 'present';
    const bonusOf = tr => Number(tr.querySelector('[data-bonus] input:checked')?.value || 0);
    function syncScoreTotals() {
        const form = $('#score-form'); if (!form || !state.current) return;
        const rubric = state.current.rubrics[form.dataset.stage];
        form.querySelectorAll('tr[data-candidate]').forEach(tr => {
            let total = 0, blank = false;
            for (const item of rubric) {
                let score;
                if (item.kind === 'pick' || item.kind === 'sum' || item.kind === 'scale') {
                    const got = pickPoints(item, readPick(item, tr)); score = got.score;
                    if (item.kind === 'sum') tr.querySelector(`[data-name=${item.id}] .sum-out`).textContent = `= ${fmt(got.score)}점${got.raw > item.max ? ` (배점 ${item.max}점에서 자름)` : ''}`;
                } else { const v = tr.querySelector(`.score[name=${item.id}]`).value; score = v === '' ? null : Number(v); }
                if (score === null) blank = true; else total += score;
            }
            const absent = attendanceOf(tr) === 'absent';
            tr.classList.toggle('is-absent', absent);
            tr.querySelector('.row-total').textContent = absent ? '불참' : `${fmt(total + bonusOf(tr))}점${blank ? ' · 빈칸 있음' : ''}`;
        });
    }
    function scoreTable(r, stage) {
        const rows = stage === 'document' ? r.documentResults : r.finalResults;
        const reviewers = r.reviewers.filter(v => v.stages.includes(stage));
        const val = (row, reviewer) => { const ev = r.evaluations[`${stage}:${reviewer.id}`]; if (!ev?.submittedAt) return '미제출'; const item = ev.rows.find(x => x.candidateId === row.candidateId); return !item ? '—' : item.attendance === 'absent' ? '불참' : fmt(Object.values(item.scores).reduce((a, b) => a + b, 0) + item.bonus); };
        const sub = stage === 'document' ? (r.rules.allowBonus ? '가점 포함' : '서류 점수') : '면접 점수';
        const tally = c => c.conflict ? '<span class="tag warn">참석 표시 불일치</span>' : c.absent ? '<span class="tag">불참</span>' : c.complete ? '<span class="tag ok">완료</span>' : '<span class="tag wait">미제출 있음</span>';
        return `<div class="table-wrap"><table class="result-table"><thead><tr><th>접수번호 / 이름</th>${stage === 'interview' ? '<th class="number">서류 평균</th>' : ''}${reviewers.map(v => `<th class="number">${esc(v.name)}<span class="sub">${sub}</span></th>`).join('')}<th class="number">제출/배정</th><th class="number">${stage === 'document' ? '서류' : '면접'} 평균</th>${stage === 'interview' ? '<th class="number">합산</th><th class="number">순위 기준</th>' : ''}<th class="number">${stage === 'document' ? '서류' : '최종'} 순위</th><th>상태</th></tr></thead><tbody>${rows.map(c => `<tr><th scope="row"><span class="code">${esc(c.code)}</span>${esc(c.name)}</th>${stage === 'interview' ? `<td class="number">${fmt(c.document)}</td>` : ''}${reviewers.map(v => `<td class="number">${val(c, v)}</td>`).join('')}<td class="number">${c.submitted}/${c.required}</td><td class="number strong">${fmt(stage === 'document' ? c.score : c.interview)}</td>${stage === 'interview' ? `<td class="number">${fmt(c.total)}</td><td class="number strong">${fmt(c.rankingScore)}</td>` : ''}<td class="number rank">${c.rank ?? '—'}</td><td>${tally(c)}</td></tr>`).join('')}</tbody></table></div>`;
    }
    // 원본 시트 집계표와 같은 표: 심사관점 줄마다 지원자·위원별 점수, 아래에 총계·평균·순위.
    // 표 모형은 인쇄본·한/글·Excel 과 같은 sheets.js 가 만든다. 제출한 평가만 싣는다.
    function criteriaSheet(r, stage) {
        const S = window.RecruitmentSheets;
        if (!S || r.layout === 'contract' || (stage === 'interview' && !r.shortlist.length)) return '';
        const evaluations = Object.fromEntries(Object.entries(r.evaluations).filter(([, ev]) => ev.submittedAt));
        const pages = S.summaryPages({ ...r, evaluations, results: r.finalResults }, stage, { fit: true });
        const span = c => `${c.cs > 1 ? ` colspan="${c.cs}"` : ''}${c.rs > 1 ? ` rowspan="${c.rs}"` : ''}`;
        const cell = c => { const tag = ['h', 'stage', 'cand', 'who'].includes(c.k) ? 'th' : 'td'; return `<${tag} class="${c.k}"${span(c)}>${esc(c.v).replace(/\n/g, '<br>')}</${tag}>`; };
        const table = t => `<table class="criteria-grid">${t.rows.map(row => `<tr${row.cls ? ` class="${row.cls}"` : ''}>${row.cells.map(cell).join('')}</tr>`).join('')}</table>`;
        return `<details class="criteria-sheet" open><summary>심사관점별 집계표 <span class="muted small">인쇄본·Excel 집계표와 같은 표</span></summary>${pages.map(p => `<div class="table-wrap">${table(p.table)}</div>`).join('')}</details>`;
    }
    // ── 계약제 교원 채용 표준: 통계·결과 ──
    // 전형별(면접·수업실연) 위원 점수표와 교과목별 평가 집계표 같은 최종표(서류 + 면접 + 수업실연 = 계).
    function oralStageTable(r, stage) {
        const reviewers = r.reviewers.filter(v => v.stages.includes(stage));
        const val = (c, v) => { const ev = r.evaluations[`${stage}:${v.id}`]; if (!ev?.submittedAt) return '미제출'; const item = ev.rows.find(x => x.candidateId === c.candidateId); return !item ? '—' : item.attendance === 'absent' ? '불참' : fmt(Object.values(item.scores).reduce((a, b) => a + b, 0) + item.bonus); };
        const submitted = reviewers.filter(v => r.evaluations[`${stage}:${v.id}`]?.submittedAt).length;
        return `<h3>${stages[stage]} 위원별 점수 <span class="muted small">제출 ${submitted}/${reviewers.length}</span></h3><div class="table-wrap"><table class="result-table"><thead><tr><th>관리번호 / 이름</th>${reviewers.map(v => `<th class="number">${esc(v.name)}<span class="sub">가점 포함</span></th>`).join('')}<th class="number">${stages[stage]} 평균</th></tr></thead><tbody>${r.finalResults.map(c => `<tr><th scope="row"><span class="code">${esc(c.code)}</span>${esc(c.name)}</th>${reviewers.map(v => `<td class="number">${val(c, v)}</td>`).join('')}<td class="number strong">${fmt(stage === 'interview' ? c.interview : c.demo)}</td></tr>`).join('')}</tbody></table></div>`;
    }
    function contractFinalTable(r) {
        const tally = c => c.conflict ? '<span class="tag warn">참석 표시 불일치</span>' : c.absent ? '<span class="tag">불참</span>' : c.complete ? (c.bonusExcluded ? '<span class="tag warn">가산점 제외</span>' : '<span class="tag ok">완료</span>') : '<span class="tag wait">미제출 있음</span>';
        return `<h3>교과목별 평가 집계 <span class="muted small">출력물의 교과목별 평가 집계표와 같은 숫자</span></h3><div class="table-wrap"><table class="result-table"><thead><tr><th>관리번호 / 이름</th><th class="number">서류(${stageMax(r, 'document')})</th><th class="number">면접(${stageMax(r, 'interview')})</th><th class="number">수업실연(${stageMax(r, 'demo')})</th><th class="number">계</th><th class="number">순위</th><th>상태</th></tr></thead><tbody>${r.finalResults.map(c => `<tr><th scope="row"><span class="code">${esc(c.code)}</span>${esc(c.name)}</th><td class="number">${fmt(c.document)}</td><td class="number">${fmt(c.interview)}</td><td class="number">${fmt(c.demo)}</td><td class="number strong">${fmt(c.total)}</td><td class="number rank">${c.rank ?? '—'}</td><td>${tally(c)}</td></tr>`).join('')}</tbody></table></div>`;
    }
    function contractResultsView(r) {
        const docReady = r.documentResults.every(c => c.complete && !c.conflict);
        const intReady = r.finalResults.length && r.finalResults.every(c => c.complete && !c.conflict);
        const basis = r.rules.rankingBasis === 'combined' ? '서류 + 면접 + 수업실연 평균' : '면접 + 수업실연 평균';
        const by = r.rules.bonusByStage;
        return `<section class="panel"><h2>서류전형 통계표</h2>${scoreTable(r, 'document')}${r.actor.role === 'admin' && r.status === 'document' ? `<form id="shortlist-form" class="do-next"><h3 id="focus-shortlist">면접·수업실연 대상자 고르기 · 최대 ${r.rules.shortlistLimit}명</h3>${docReady ? '' : '<p class="notice warning">아직 모든 위원이 제출하지 않았습니다. 다 들어오면 확정 버튼이 켜집니다.</p>'}<div class="pick-list">${r.documentResults.map(c => `<label class="check"><input type="checkbox" name="candidateId" value="${c.candidateId}" ${c.score === null ? 'disabled' : ''}><span>${esc(c.code)} ${esc(c.name)}</span><b>${c.rank ?? '—'}위</b></label>`).join('')}</div><label class="field" style="margin-top:15px">고른 이유 · 동점 처리 근거<textarea name="reason" maxlength="1000" required placeholder="예: 서류 상위 3명 선정. 동점자는 학교 기준에 따라 결정."></textarea></label><div class="actions" style="margin-top:15px"><button class="primary" ${!docReady ? 'disabled' : ''}>대상자 확정</button><span class="muted small">확정하면 서류 평가는 잠기고 면접·수업실연 평가가 함께 시작됩니다.</span></div></form>` : ''}</section>`
            + (r.shortlist.length ? `<section class="panel"><h2>면접·수업실연·최종 통계표</h2>${oralStageTable(r, 'interview')}${oralStageTable(r, 'demo')}${contractFinalTable(r)}<p class="small muted">대상자를 고른 이유: ${esc(r.shortlistReason)}</p>${r.actor.role === 'admin' && r.status === 'interview' ? `<div class="do-next" id="focus-final"><h3>결과 확정</h3><p class="muted small">면접·수업실연 모두 제출되면 확정할 수 있습니다. 확정하면 점수가 잠기고 결과 문서를 만들 수 있습니다. 되돌릴 수 없습니다.</p>${intReady ? '' : '<p class="notice warning">아직 모든 위원이 제출하지 않았습니다.</p>'}<button class="primary" data-action="finalize" ${!intReady ? 'disabled' : ''}>결과 확정 · 출력본 준비</button></div>` : ''}${r.snapshot ? `<p class="notice ok-note">${stamp(r.snapshot.finalizedAt)} 확정 · v${r.snapshot.version}. 문서 출력에서 인쇄용 HTML·Excel·한글 파일을 받으세요.</p>` : ''}</section>` : '')
            + `<details class="panel how"><summary>점수를 어떻게 계산하나요?</summary><ul class="rule-list small"><li>서류 ${stageMax(r, 'document')}점 · 면접 ${stageMax(r, 'interview')}점 · 수업실연 ${stageMax(r, 'demo')}점 = 100점.${by ? ` 가점: 서류 ${by.document.options.map(o => o.points).join('/')} · 면접 ${by.interview.options.map(o => o.points).join('/')} · 수업실연 ${by.demo.options.map(o => o.points).join('/')}점, 그 전형 만점의 40%(${by.document.threshold}·${by.interview.threshold}·${by.demo.threshold}점) 이상 득점자만.` : ' 가점 미사용.'}</li><li>한 영역이라도 가점을 뺀 평균이 40% 미만이면 세 전형 모두 가산점을 빼고 계를 냅니다(원본 주석).</li><li>전형마다 배정된 위원이 모두 제출해야 평균을 냅니다. 평균은 소수 첫째 자리에서 반올림합니다.</li><li>최종 순위 기준은 <strong>${basis}</strong>. 동점은 공동순위(1, 2, 2, 4)이며 합격자는 자동으로 정하지 않습니다.</li></ul></details>`;
    }
    function results(r) {
        if (r.layout === 'contract') return contractResultsView(r);
        const docReady = r.documentResults.every(c => c.complete && !c.conflict);
        const intReady = r.finalResults.length && r.finalResults.every(c => c.complete && !c.conflict);
        const basis = r.rules.rankingBasis === 'combined' ? '서류 평균 + 면접 평균' : '면접 평균';
        return `<section class="panel"><h2>서류심사 통계표</h2>${scoreTable(r, 'document')}${criteriaSheet(r, 'document')}${r.actor.role === 'admin' && r.status === 'document' ? `<form id="shortlist-form" class="do-next"><h3 id="focus-shortlist">면접대상자 고르기 · 최대 ${r.rules.shortlistLimit}명</h3>${docReady ? '' : '<p class="notice warning">아직 모든 위원이 제출하지 않았습니다. 다 들어오면 확정 버튼이 켜집니다.</p>'}<div class="pick-list">${r.documentResults.map(c => `<label class="check"><input type="checkbox" name="candidateId" value="${c.candidateId}" ${c.score === null ? 'disabled' : ''}><span>${esc(c.code)} ${esc(c.name)}</span><b>${c.rank ?? '—'}위</b></label>`).join('')}</div><label class="field" style="margin-top:15px">고른 이유 · 동점 처리 근거<textarea name="reason" maxlength="1000" required placeholder="예: 서류 상위 2명 선정. 동점자는 학교 기준에 따라 자격증 점수가 높은 순으로 결정."></textarea></label><div class="actions" style="margin-top:15px"><button class="primary" ${!docReady ? 'disabled' : ''}>면접대상자 확정</button><span class="muted small">확정하면 서류 평가는 잠기고 면접 평가가 시작됩니다.</span></div></form>` : ''}</section>${r.shortlist.length ? `<section class="panel"><h2>면접·최종 합산 통계표</h2>${scoreTable(r, 'interview')}${criteriaSheet(r, 'interview')}<p class="small muted">면접대상자를 고른 이유: ${esc(r.shortlistReason)}</p>${r.actor.role === 'admin' && r.status === 'interview' ? `<div class="do-next" id="focus-final"><h3>결과 확정</h3><p class="muted small">확정하면 점수가 잠기고 결과 문서를 만들 수 있습니다. 확정 뒤에는 되돌릴 수 없습니다.</p>${intReady ? '' : '<p class="notice warning">아직 모든 위원이 제출하지 않았습니다.</p>'}<button class="primary" data-action="finalize" ${!intReady ? 'disabled' : ''}>결과 확정 · 출력본 준비</button></div>` : ''}${r.snapshot ? `<p class="notice ok-note">${stamp(r.snapshot.finalizedAt)} 확정 · v${r.snapshot.version}. 문서 출력에서 인쇄용 HTML·Excel·한글 파일을 받으세요.</p>` : ''}</section>` : ''}<details class="panel how"><summary>점수를 어떻게 계산하나요?</summary><ul class="rule-list small"><li>서류 기본 ${stageMax(r, 'document')}점${r.rules.allowBonus ? ` + 확인 가점 최대 ${bonusMax(r)}점 · ${r.rules.bonusThreshold}점 이상 득점자만` : ' · 가점 미사용'}, 면접 ${stageMax(r, 'interview')}점.</li><li>전형마다 배정된 위원이 모두 제출해야 평균을 냅니다. 미제출은 0점으로 치지 않습니다.</li><li>전형 평균은 소수 첫째 자리에서 반올림하고, 표에 보이는 서류 평균과 면접 평균을 더합니다.</li><li>최종 순위 기준은 <strong>${basis}</strong>. 동점은 공동순위(1, 2, 2, 4)로 매기고 합격자는 자동으로 정하지 않습니다.</li><li>위원 전원이 불참으로 표시한 지원자는 순위에서 뺍니다. 위원마다 참석 표시가 다르면 확정을 막습니다.</li></ul></details>`;
    }
    function exportsPanel(r) {
        return `<section class="panel"><h2>확정 결과 문서</h2><p class="muted">설정한 배점 그대로 통계표·위원별 채점표·청렴서약서를 만듭니다.</p>${!r.snapshot ? '<p class="notice">아직 결과를 확정하지 않았습니다. 통계·결과에서 확정하면 여기에 문서가 생깁니다.</p>' : r.actor.role !== 'admin' ? '<p class="notice">결과 문서는 담당 선생님이 내려받습니다.</p>' : `<div class="download-grid"><button class="primary" data-action="download" data-format="html"><strong>인쇄용 HTML</strong><small>열어서 PDF로 저장</small></button><button class="secondary" data-action="download" data-format="hwpx"><strong>한글 (HWPX)</strong><small>공문서 편집용</small></button><button class="secondary" data-action="download" data-format="xlsx"><strong>Excel 통계표</strong><small>위원별 점수·집계</small></button><button class="secondary" data-action="download" data-format="zip"><strong>전체 ZIP</strong><small>HTML·Excel·확정 데이터</small></button></div><p class="muted small" style="margin-top:16px">인쇄용 HTML은 새 창으로 열립니다. 그 화면의 ‘인쇄 / PDF로 저장’을 누른 뒤 대상을 PDF로 바꾸면 됩니다.</p>${r.archive ? `<div class="notice"><strong>Drive 보관됨</strong> · ${stamp(r.archive.archivedAt)}<br>${esc(r.archive.files.join(', '))}<br>자동 삭제 예정: ${stamp(r.archive.purgeAfter)}<br><a href="${esc(r.archive.folderUrl)}" target="_blank" rel="noopener noreferrer">보관함 열기</a></div>` : ''}${state.config?.google?.connected
    ? `<div class="actions"><button class="secondary" data-action="archive">${r.archive ? '보관본 다시 올리기' : '문서 보관 (7일 뒤 자동 삭제)'}</button></div><p class="small muted" style="margin-top:10px">보관한 문서는 7일 뒤 자동으로 지워집니다. 매일 한 번 기한이 지난 폴더를 정리합니다.</p>`
    : state.config?.google?.configured
        ? `<div class="actions"><button class="secondary" data-action="connect-archive">문서 보관함 연결</button></div><p class="small muted" style="margin-top:10px">확정 문서를 학교 보관함에 올려 7일간 두려면 한 번 연결해야 합니다. 연결 화면으로 이동했다가 돌아옵니다.</p>`
        : '<p class="small muted" style="margin-top:10px">이 서버에는 문서 보관함이 설정되어 있지 않습니다. 문서는 이 기기로 내려받아 보관하세요.</p>'}`}</section>`;
    }
    function historyPanel(r) { return `<section class="panel"><h2>처리 이력</h2>${[...r.audit].reverse().map(e => `<div class="audit"><time>${stamp(e.at)}</time><strong>${esc(e.action)}</strong> · ${e.actor === 'admin' ? '관리자' : esc(r.reviewers.find(v => v.id === e.actor)?.name || e.actor)}${e.detail ? `<p class="muted small">${esc(e.detail)}</p>` : ''}</div>`).join('')}</section>`; }
    // 서버는 토큰 해시만 저장한다. 원본 링크는 발급 응답에만 있으므로 화면에서 붙잡아 둔다.
    async function issueInvite(reviewerId) {
        const data = await api(`/${state.current.id}/invites/${reviewerId}`, 'POST', { version: state.current.version });
        state.current = data.recruitment; state.invites[reviewerId] = location.origin + (window.IS_COPY ? '/copy' : '') + data.invitationPath; return data;
    }
    async function mutate(path, body = {}) { const r = await api(`/${state.current.id}/${path}`, 'POST', { ...body, version: state.current.version }); state.current = r; if (!token()) { const list = await api(''); state.list = list.items; } state.dirty = false; render(); return r; }
    function collectScores() {
        const form = $('#score-form'), stage = form.dataset.stage, rubric = state.current.rubrics[stage];
        const judged = rubric.filter(c => c.kind === 'judge' || !c.kind), picked = rubric.filter(c => c.kind === 'pick' || c.kind === 'sum' || c.kind === 'scale');
        const rows = Array.from(form.querySelectorAll('tr[data-candidate]')).map(tr => ({ candidateId: tr.dataset.candidate, attendance: attendanceOf(tr),
            scores: Object.fromEntries(judged.map(c => { const v = tr.querySelector(`.score[name=${c.id}]`).value; return [c.id, v === '' ? null : Number(v)]; })),
            picks: Object.fromEntries(picked.map(c => [c.id, readPick(c, tr)])),
            bonus: bonusOf(tr), note: tr.querySelector('[name=note]').value }));
        return { stage, rows };
    }
    async function run(fn) { if (state.busy) return; state.busy = true; const buttons = Array.from(document.querySelectorAll('button')).filter(b => !b.disabled); buttons.forEach(b => { b.disabled = true; }); try { await fn(); } catch (e) { notify(e.message); } finally { state.busy = false; buttons.filter(b => b.isConnected).forEach(b => { b.disabled = false; }); } }
    $('#app').addEventListener('change', e => {
        if (e.target.name === 'preset' && e.target.closest('#create-form')) {
            // 고친 항목을 덮어쓰므로 한 번 묻는다. 취소하면 선택도 되돌린다.
            if (state.presetTouched && !confirm('2단계에서 고친 평가 항목이 이 심사표로 바뀝니다. 불러올까요?')) { e.target.value = state.presetId ?? ''; return; }
            state.presetId = e.target.value; state.presetTouched = false; applyPreset(e.target.value); notify(e.target.value ? '심사표를 불러왔습니다.' : '빈 심사표로 바꿨습니다.');
        }
        if (e.target.matches('#score-form input.score')) { cleanScore(e.target, true); syncScoreTotals(); }
        if (['recruitType', 'subject'].includes(e.target.name) && e.target.closest('#create-form')) syncContractField();
        if (e.target.name === 'kind') { const row = e.target.closest('.rubric-row'); row.querySelector('[name=guide]').placeholder = KIND_HINTS[e.target.value]; syncOptionPreview(row); }
    });
    $('#app').addEventListener('input', e => {
        if (e.target.closest('#score-form,#create-form,#shortlist-form')) state.dirty = true;
        if (e.target.closest('.rubric-rows')) state.presetTouched = true;
        if (e.target.name === 'max') { delete e.target.dataset.auto; syncTotals(); }
        if (e.target.name === 'guide' && e.target.closest('.rubric-row')) syncOptionPreview(e.target.closest('.rubric-row'));
        if (e.target.matches('#score-form input.score')) cleanScore(e.target, false);
        if (e.target.closest('#score-form')) syncScoreTotals();
        if (e.target.name === 'candidateCount') syncCandidates();
        if (e.target.name === 'subjectCustom') syncContractField();
    });
    $('#app').addEventListener('submit', e => {
        e.preventDefault(); const form = e.target;
        run(async () => {
            if (form.id === 'login-form') { const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device-Id': (window.baekamDeviceId||(window.baekamDeviceId=(()=>{try{let v=localStorage.getItem('baekam_device_id');if(!/^[A-Za-z0-9_-]{16,64}$/.test(v||'')){v=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g,'');localStorage.setItem('baekam_device_id',v)}return v}catch(e){return ''}})())) }, body: JSON.stringify({ code: new FormData(form).get('code') }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); if (!['admin', 'user'].includes(data.role)) throw new Error('백암이 접근 코드로 로그인하세요. 위원은 초대 링크를 사용합니다.'); localStorage.setItem('airoom_auth_token', data.token); if (token()) sessionStorage.removeItem(`recruitment-invite:${idFromUrl()}`); await load(); }
            if (form.id === 'create-form') {
                const f = new FormData(form), preset = formPreset(), stageList = stagesOfPreset(preset), contract = isContractPreset(preset);
                const reviewers = Array.from(form.querySelectorAll('.reviewer')).map(row => ({ name: row.querySelector('[name=reviewer-name]').value, position: row.querySelector('[name=reviewer-position]').value, stages: stageList.filter(s => row.querySelector(`[name=${s}]`)?.checked) }));
                const subject = contract ? subjectOf(form) : '';
                if (contract && !subject) throw new Error('세부 영역(과목)을 고르거나 적어 주세요.');
                const candidates = Array.from(form.querySelectorAll('[name=candidate-name]')).map((el, k) => ({ code: code(k, subject), name: el.value.trim() }));
                const rubrics = {}; for (const stage of stageList) rubrics[stage] = Array.from(form.querySelectorAll(`#rubric-${stage} .rubric-row`)).map(row => readCriterion(row, stage));
                const r = await api('', 'POST', { school: f.get('school'), title: f.get('title'), field: f.get('field'), documentDate: f.get('documentDate'), interviewDate: f.get('interviewDate'), shortlistLimit: Number(f.get('shortlistLimit')), rankingBasis: f.get('rankingBasis'), allowBonus: f.get('allowBonus') === 'true', summaryOrient: f.get('summaryOrient') || 'portrait', guidance: (f.get('guidance') || '').trim(), preset: f.get('preset') || null, ...(contract ? { recruitType: f.get('recruitType'), subject } : {}), reviewers, candidates, rubrics }); state.isNew = false; state.invites = {}; state.tab = 'overview'; await load(r.id); notify('채용 설정을 저장했습니다.');
            }
            if (form.id === 'score-form') { const { stage, rows } = collectScores(); await mutate(`evaluations/${stage}/save`, { rows }); notify('평가를 임시 저장했습니다.'); }
            if (form.id === 'shortlist-form') { if (!confirm('면접대상자를 확정하면 서류 평가를 수정할 수 없습니다. 확정할까요?')) return; const data = new FormData(form); await mutate('shortlist', { candidateIds: data.getAll('candidateId'), reason: data.get('reason') }); notify('면접 평가를 시작합니다.'); }
        });
    });
    $('#app').addEventListener('click', e => { const button = e.target.closest('[data-action]'); if (!button) return; const action = button.dataset.action;
        run(async () => {
            if (['new', 'open', 'tab', 'goto', 'refresh', 'cancel-new', 'exit', 'eval-stage'].includes(action) && !canLeave()) return;
            if (action === 'eval-stage') { state.evalStage = button.dataset.stage; render(); }
            if (action === 'new') { state.isNew = true; state.invites = {}; state.presetId = presets()[0]?.id ?? ''; state.presetTouched = false; render(); }
            if (action === 'open') state.evalStage = null;
            if (action === 'cancel-new') { state.isNew = false; render(); }
            if (action === 'open') { state.isNew = false; state.invites = {}; state.tab = 'overview'; state.tabSet = false; await load(button.dataset.id); }
            if (action === 'tab') { state.tab = button.dataset.tab; state.tabSet = true; render(); }
            // 다음 할 일 버튼: 해당 탭으로 옮기고 그 자리까지 굴려 준다.
            if (action === 'goto') {
                state.tab = button.dataset.tab; state.tabSet = true; render();
                const target = button.dataset.focus && document.getElementById('focus-' + button.dataset.focus);
                if (target) target.scrollIntoView({ block: 'center' });
            }
            if (action === 'delete-recruitment') {
                const r = state.current;
                const typed = prompt(`이 채용을 지우면 평가와 결과 문서가 모두 사라지고 되돌릴 수 없습니다.
지우려면 채용명을 그대로 입력하세요.

${r.title}`);
                if (typed === null) return;
                if (typed.trim() !== r.title) throw new Error('채용명이 일치하지 않아 삭제를 취소했습니다.');
                if (r.status !== 'finalized' && !confirm('아직 결과가 확정되지 않은 채용입니다. 그래도 삭제할까요?')) return;
                await api(`/${r.id}`, 'DELETE', { confirmTitle: typed.trim(), confirmUnfinished: r.status !== 'finalized' });
                state.current = null; state.invites = {}; state.tab = 'overview'; setId(null);
                await load(null); notify(`'${r.title}' 채용을 삭제했습니다.`);
            }
            if (action === 'refresh') { await load(); notify('최신 상태로 다시 불러왔습니다.'); }
            if (action === 'exit') { if (idFromUrl()) sessionStorage.removeItem(`recruitment-invite:${idFromUrl()}`); setId(null); state.current = null; try { await load(null); } catch (e) { login(e.message); } }
            if (action === 'add-reviewer') { if (document.querySelectorAll('.reviewer').length >= 5) throw new Error('평가위원은 최대 5명입니다.'); $('#reviewer-rows').insertAdjacentHTML('beforeend', reviewerRow({}, stagesOfPreset(formPreset()))); state.dirty = true; }
            if (action === 'remove-reviewer') { if (document.querySelectorAll('.reviewer').length <= 1) throw new Error('위원이 최소 1명 필요합니다.'); button.closest('.reviewer').remove(); state.dirty = true; }
            if (action === 'fill-example') { const form = $('#create-form'); if (!form) return; if (state.dirty && !confirm('현재 입력을 예시로 바꿀까요?')) return;
                if (isContractPreset(formPreset())) {
                    Object.entries({ school: '예시초등학교', title: '2026학년도 기간제교사(담임) 채용 (예시)', shortlistLimit: '3', candidateCount: '12' }).forEach(([k, v]) => { form.elements[k].value = v; });
                    form.elements.recruitType.value = '기간제교사'; form.elements.subject.value = '담임'; syncContractField();
                    syncCandidates(['김하늘', '이하늘', '박하늘', '최하늘', '정하늘', '강하늘', '조하늘', '윤하늘', '장하늘', '임하늘', '김서연', '이서연']);
                    $('#reviewer-rows').innerHTML = [['예시위원 가', '교감'], ['예시위원 나', '교사'], ['예시위원 다', '교사']].map(([name, position]) => reviewerRow({ name, position }, stagesOfPreset(formPreset()))).join('');
                } else {
                    Object.entries({ school: '예시초등학교', title: '2026 기초학력 협력강사 채용 (예시)', field: '기초학력 협력강사', shortlistLimit: '2', candidateCount: '3' }).forEach(([k, v]) => { form.elements[k].value = v; });
                    syncCandidates(['예시지원자 가', '예시지원자 나', '예시지원자 다']); $('#reviewer-rows').innerHTML = reviewerRow({ name: '예시위원 가' }) + reviewerRow({ name: '예시위원 나' });
                }
                state.dirty = true; }
            if (action === 'add-criterion') { const box = document.querySelector(`#rubric-${button.dataset.stage}`); if (box.querySelectorAll('.rubric-row').length >= 12) throw new Error('항목은 전형별 최대 12개입니다.'); box.insertAdjacentHTML('beforeend', criterionRow()); syncTotals(); state.dirty = true; state.presetTouched = true; }
            if (action === 'remove-criterion') { const box = button.closest('.rubric-rows'); if (box.querySelectorAll('.rubric-row').length <= 1) throw new Error('항목이 최소 1개 필요합니다.'); button.closest('.rubric-row').remove(); syncTotals(); state.dirty = true; state.presetTouched = true; }
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
                const image = trimSignature(pad);
                if (!image) throw new Error('서명란에 직접 서명해 주세요.');
                // 서명 저장은 화면을 다시 그린다. 입력 중이던 점수가 날아가지 않도록 먼저 임시 저장한다.
                const form = $('#score-form');
                if (form && form.querySelector('input:not([disabled])')) { const { stage, rows } = collectScores(); await mutate(`evaluations/${stage}/save`, { rows }); }
                await mutate('pledge', { image });
                state.resign = false; render(); notify('서명을 저장했습니다. 입력 중이던 점수도 함께 임시 저장했습니다.');
            }
            if (action === 'provision') { await mutate('provision'); notify('평가를 시작했습니다. 아래 평가위원에서 링크를 발급해 보내세요.'); }
            if (action === 'invite') { await issueInvite(button.dataset.id); render(); notify('링크를 발급했습니다. 본인에게만 전달하세요.'); }
            if (action === 'invite-all') {
                if (!confirm('모든 위원의 링크를 새로 발급합니다. 이미 나눠준 링크는 무효가 됩니다. 계속할까요?')) return;
                for (const v of state.current.reviewers) await issueInvite(v.id);
                render(); notify(`위원 ${state.current.reviewers.length}명의 링크를 발급했습니다.`);
            }
            if (action === 'copy-one') { await navigator.clipboard.writeText(state.invites[button.dataset.id]); notify('링크를 복사했습니다.'); }
            if (action === 'copy-all') { await navigator.clipboard.writeText($('#invite-list').value); notify('전체 링크를 복사했습니다.'); }
            if (action === 'print-qr') printQrSheet(state.current);
            if (action === 'submit-evaluation') { if (!$('#score-form').reportValidity()) return; if (!confirm('제출 후에는 점수를 수정할 수 없습니다. 제출할까요?')) return; const { stage, rows } = collectScores(); await mutate(`evaluations/${stage}/save`, { rows }); await mutate(`evaluations/${stage}/submit`); state.evalStage = null; render(); notify(`${stages[stage]} 제출이 완료되었습니다.`); }
            if (action === 'reopen') { const reason = prompt('평가 재개방 사유를 입력하세요.'); if (reason === null) return; await mutate(`evaluations/${button.dataset.stage}/reopen`, { reviewerId: button.dataset.id, reason }); notify('평가 입력을 다시 열었습니다.'); }
            if (action === 'finalize') { if (!confirm('모든 평가를 확정하고 수정할 수 없는 결과 스냅샷을 저장합니다. 계속할까요?')) return; await mutate('finalize'); state.tab = 'exports'; render(); notify('결과 확정본 v1을 저장했습니다.'); }
            if (action === 'sample') {
                const preset = $('#create-form [name=preset]')?.value; if (!preset) { notify('샘플은 심사표를 고른 뒤 볼 수 있습니다.'); return; }
                const format = button.dataset.format; const popup = format === 'html' ? window.open('about:blank', '_blank') : null;
                try { const response = await fetch(`/api/recruitments/sample/${encodeURIComponent(preset)}/${format}?field=${encodeURIComponent($('#create-form [name=field]')?.value.trim() || '')}`, { headers: headers() }); if (!response.ok) { const data = await response.json(); throw new Error(data.error); } const blob = await response.blob(), url = URL.createObjectURL(blob);
                    if (popup) { popup.opener = null; popup.location.href = url; } else { const a = document.createElement('a'); a.href = url; a.download = `${$('#create-form [name=field]')?.value.trim() || '강사 채용 표준'}_샘플.${format}`; a.click(); }
                    setTimeout(() => URL.revokeObjectURL(url), 60000); notify(format === 'html' ? '샘플 인쇄본을 열었습니다.' : '샘플 한글 파일을 준비했습니다.');
                } catch (e) { popup?.close(); throw e; }
            }
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
