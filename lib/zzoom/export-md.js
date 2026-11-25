'use strict';
// AI용 md (DESIGN G-2). 누를 때마다 만들고 저장하지 않는다.
const { kst } = require('./util');

const oneLine = s => String(s || '').replace(/\s+/g, ' ').trim();

function buildMarkdown({ meeting: m, agenda, transcript, chat, polls }) {
    const L = [];
    const startedAt = m.startedAt || m.startsAt || m.createdAt;
    L.push(`# ${oneLine(m.title)} (${kst(startedAt)})`, '');
    L.push('## 회의 정보');
    const dur = m.startedAt && m.endedAt ? Math.round((m.endedAt - m.startedAt) / 60000) + '분' : (m.startedAt ? '진행 중' : '시작 전');
    L.push(`- 진행 시간: ${m.startedAt ? kst(m.startedAt) : '-'} ~ ${m.endedAt ? kst(m.endedAt, false) : '-'} (${dur})`);
    L.push(`- 참석 인원(최대 동시 접속): ${m.counts?.peak || 0}명`, '');
    const byAid = Object.fromEntries(agenda.map(a => [a.id, a.data]));
    const order = (m.agendaOrder || []).filter(id => byAid[id]);
    const no = Object.fromEntries(order.map((id, i) => [id, i + 1]));
    L.push('## 안건');
    if (!order.length) L.push('- (없음)');
    order.forEach((id, i) => L.push(`${i + 1}. ${oneLine(byAid[id].title)} (${byAid[id].pages}쪽)`));
    L.push('');
    const where = (aid, page) => aid && no[aid] ? ` · 안건${no[aid]}${page ? ' ' + page + '쪽' : ''}` : '';
    L.push('## 대화 기록');
    const tr = transcript.map(t => t.data).filter(t => t.text).sort((a, b) => a.at - b.at);
    if (!tr.length) L.push('(녹음 기록 없음)');
    for (const t of tr) L.push(`[${kst(t.at, false)}${where(t.aid, t.page)}] ${oneLine(t.text)}`);
    L.push('');
    L.push('## 채팅');
    const ch = chat.map(c => c.data).sort((a, b) => a.at - b.at);
    if (!ch.length) L.push('(채팅 없음)');
    for (const c of ch) L.push(`[${kst(c.at, false)}${c.ref ? where(c.ref.aid, c.ref.page) : ''}] ${oneLine(c.name)}: ${oneLine(c.text)}`);
    L.push('');
    L.push('## 투표 결과');
    if (!polls.length) L.push('(투표 없음)');
    for (const p of polls) {
        L.push(`- ${oneLine(p.q)}${p.anonymous ? ' (비공개)' : ' (공개)'}`);
        L.push('  ' + p.options.map(o => `${oneLine(o.label)} ${p.tally[o.id] || 0}`).join(' / ') + ` (모두 ${p.total})`);
        if (!p.anonymous && p.names) for (const o of p.options) if ((p.names[o.id] || []).length) L.push(`  - ${oneLine(o.label)}: ${p.names[o.id].map(oneLine).join(', ')}`);
    }
    L.push('');
    L.push('## AI에게 부탁할 일 (예시)');
    L.push('- 위 기록으로 회의록을 써 주세요. 안건별로 논의 내용, 결정 사항, 할 일(담당자·기한)을 나눠 주세요.');
    L.push('- 결정되지 않은 안건과 다음 회의에서 다룰 것을 따로 모아 주세요.');
    L.push('- 학생 개인정보가 보이면 지우고 알려 주세요.');
    return L.join('\n') + '\n';
}

module.exports = { buildMarkdown };
