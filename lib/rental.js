'use strict';
// ===== 소규모 학교 연계 교구 대여소 =====
// 초안(완전 개방판): 참여코드·학교 PIN·관리자 코드 없음.
// 신원(학교/이름/직)은 각인만 하고 서버가 검증하지 않는다.
// 설계 근거는 RENTAL_DESIGN.md 참고.

const fs = require('fs');
const path = require('path');

// 물건이 아직 보유교로 돌아오지 않은 상태들 (= 재고에서 빠져 있음)
const OCCUPYING = ['approved', 'out', 'return_requested'];

// 상태 전이표
const ACTIONS = {
    'cancel':         { from: ['requested', 'approved'],            to: 'canceled'  },
    'approve':        { from: ['requested'],                        to: 'approved'  },
    'reject':         { from: ['requested'],                        to: 'rejected'  },
    'pickup':         { from: ['approved'],                         to: 'out'       },
    'return-request': { from: ['out'],                              to: 'return_requested' },
    'return-cancel':  { from: ['return_requested'],                 to: 'out'       },
    'return-confirm': { from: ['return_requested'],                 to: 'returned'  },
    'force-return':   { from: ['approved', 'out', 'return_requested'], to: 'returned' }
};

module.exports = function registerRentalRoutes(app, deps) {
    const { readData, writeData, redis, generateToken } = deps;
    const PHOTO_DIR = path.join(__dirname, '..', 'data', 'rental-photos');

    // ===== 유틸 =====
    const nowIso = () => new Date().toISOString();
    // 서버는 UTC로 돌아간다. 한국 날짜는 +9시간 해서 뽑는다.
    const kstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
    const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);

    function fail(res, code, msg) { res.status(code).json({ error: msg }); }

    // ===== 동시성 락 =====
    // Redis 전체-JSON read-modify-write 구조라 락이 없으면 동시 승인 시 기록이 통째로 날아간다.
    async function withLock(fn) {
        if (!redis) return fn();
        const token = generateToken().slice(0, 16);
        for (let i = 0; i < 25; i++) {
            let got = null;
            try { got = await redis.set('rental:lock', token, { nx: true, ex: 5 }); } catch (e) { got = null; }
            if (got) {
                try { return await fn(); }
                finally {
                    try {
                        const cur = await redis.get('rental:lock');
                        if (cur === token) await redis.del('rental:lock');
                    } catch (e) {}
                }
            }
            await new Promise(r => setTimeout(r, 120));
        }
        const e = new Error('다른 분이 동시에 처리 중이에요. 잠시 후 다시 눌러 주세요.');
        e.code = 409;
        throw e;
    }

    // ===== 사진 저장 (items 배열에 절대 넣지 않는다) =====
    async function photoSet(id, dataUrl) {
        if (redis) { await redis.set('rental-photo:' + id, dataUrl); return; }
        fs.mkdirSync(PHOTO_DIR, { recursive: true });
        fs.writeFileSync(path.join(PHOTO_DIR, id + '.txt'), dataUrl, 'utf-8');
    }
    async function photoGet(id) {
        if (redis) { try { return await redis.get('rental-photo:' + id); } catch (e) { return null; } }
        const p = path.join(PHOTO_DIR, id + '.txt');
        return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;
    }
    async function photoDel(id) {
        if (redis) { try { await redis.del('rental-photo:' + id); } catch (e) {} return; }
        const p = path.join(PHOTO_DIR, id + '.txt');
        if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    // ===== 도메인 계산 =====
    function availableOf(item, loans) {
        if (!item) return 0;
        const used = loans
            .filter(l => l.itemId === item.id && OCCUPYING.includes(l.status))
            .reduce((s, l) => s + (Number(l.qty) || 0), 0);
        return Math.max(0, (Number(item.total) || 0) - used);
    }
    function queueOf(itemId, loans) {
        return loans.filter(l => l.itemId === itemId && l.status === 'requested')
                    .sort((a, b) => a.seq - b.seq);
    }
    // 반납이 확정되면 대기열 1번에게 "내 차례" 표시를 붙인다.
    function recomputeReady(itemId, items, loans) {
        const item = items.find(i => i.id === itemId);
        if (!item) return;
        const avail = availableOf(item, loans);
        const q = queueOf(itemId, loans);
        q.forEach((l, idx) => {
            const ready = idx === 0 && avail >= l.qty;
            if (ready && !l.readyAt) l.readyAt = nowIso();
            if (!ready && l.readyAt) l.readyAt = null;
        });
    }

    function stamp(loan, status, by, note) {
        loan.status = status;
        loan.updatedAt = nowIso();
        loan.history = loan.history || [];
        loan.history.push({ at: nowIso(), status, by: by || '', note: note || '' });
    }
    function who(b) {
        const p = (b && b.actor) || {};
        return [clean(p.school, 30), clean(p.name, 30), clean(p.role, 20)].filter(Boolean).join('·') || '익명';
    }

    // ===== 권한 =====
    // 신원은 여전히 자기 신고(비밀번호 없음)지만, 최소한 남의 학교 결재는 막는다.
    function actorOf(b) {
        const p = (b && b.actor) || {};
        return { school: clean(p.school, 30), name: clean(p.name, 30), role: clean(p.role, 20) };
    }
    const OWNER_ONLY    = ['approve', 'reject', 'return-confirm', 'force-return'];
    const BORROWER_ONLY = ['cancel', 'return-request', 'return-cancel'];
    // pickup 은 보유교(건네주며 확인)와 신청자(받고서 확인) 둘 다 누를 수 있다.

    async function audit(action, target, detail, actor) {
        try {
            const log = (await readData('rental-audit.json')) || [];
            log.push({ at: nowIso(), actor, action, target, detail });
            while (log.length > 500) log.shift();
            await writeData('rental-audit.json', log);
        } catch (e) { /* 감사로그 실패가 본 기능을 막지 않는다 */ }
    }

    async function loadAll() {
        const [items, loans, schools, settings] = await Promise.all([
            readData('rental-items.json'),
            readData('rental-loans.json'),
            readData('rental-schools.json'),
            readData('rental-settings.json')
        ]);
        return {
            items: items || [],
            loans: loans || [],
            schools: schools || [],
            settings: settings || {}
        };
    }

    // ===== 상태 조회 =====
    app.get('/api/rental/state', async (req, res) => {
        try {
            const s = await loadAll();
            // 완료건은 최근 90일만 내려보낸다 (목록이 무한정 커지는 것 방지)
            const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
            const loans = s.loans.filter(l =>
                !['returned', 'rejected', 'canceled'].includes(l.status) ||
                (l.updatedAt || l.createdAt || '') >= cutoff
            );
            res.json({
                items: s.items,
                loans,
                schools: s.schools,
                settings: {
                    title: s.settings.title || '소규모 학교 연계 교구 대여소',
                    notice: s.settings.notice || '',
                    categories: s.settings.categories || [],
                    roles: s.settings.roles || [],
                    defaultMaxDays: s.settings.defaultMaxDays || 14
                },
                serverDate: kstToday()
            });
        } catch (e) {
            console.error('[rental] state 실패:', e.message);
            fail(res, 500, '목록을 불러오지 못했어요. 잠시 후 새로고침해 주세요.');
        }
    });

    // ===== 학교 등록 (완전 개방: 누구나 추가) =====
    app.post('/api/rental/schools', async (req, res) => {
        try {
            const name = clean(req.body && req.body.name, 30);
            if (!name) return fail(res, 400, '학교 이름을 적어 주세요.');
            const out = await withLock(async () => {
                const schools = (await readData('rental-schools.json')) || [];
                if (!schools.find(s => s.name === name)) {
                    schools.push({ id: uid('sc_'), name, short: name.replace(/등학교$|학교$/, ''), createdAt: nowIso() });
                    await writeData('rental-schools.json', schools);
                }
                return schools;
            });
            res.json({ ok: true, schools: out });
        } catch (e) { fail(res, e.code || 500, e.message); }
    });

    // ===== 교구 등록 =====
    app.post('/api/rental/items', async (req, res) => {
        try {
            const b = req.body || {};
            const name = clean(b.name, 60);
            const total = Math.max(1, Math.min(999, parseInt(b.total, 10) || 1));
            if (!name) return fail(res, 400, '교구 이름을 적어 주세요.');
            const owner = {
                school: clean(b.owner && b.owner.school, 30),
                name: clean(b.owner && b.owner.name, 30),
                role: clean(b.owner && b.owner.role, 20)
            };
            if (!owner.school || !owner.name) return fail(res, 400, '학교와 이름을 먼저 입력해 주세요.');

            const photo = typeof b.photoDataUrl === 'string' ? b.photoDataUrl : '';
            if (photo) {
                if (photo.length > 200000) return fail(res, 400, '사진이 너무 커요. 다시 골라 주세요.');
                if (!/^data:image\/(jpeg|png);base64,/.test(photo)) return fail(res, 400, '사진 형식을 읽지 못했어요.');
            }

            const item = {
                id: uid('it_'),
                name,
                category: clean(b.category, 20) || '기타',
                emoji: clean(b.emoji, 8) || '📦',
                hasPhoto: !!photo,
                total,
                trackQty: b.trackQty !== false,
                owner,
                place: clean(b.place, 60),
                note: clean(b.note, 300),
                maxDays: Math.max(0, Math.min(365, parseInt(b.maxDays, 10) || 0)),
                autoApprove: !!b.autoApprove,
                active: true,
                createdAt: nowIso(),
                updatedAt: nowIso()
            };

            if (photo) {
                try { await photoSet(item.id, photo); }
                catch (e) { return fail(res, 500, '사진을 저장하지 못했어요. 사진 없이 다시 올려 주세요.'); }
            }
            const items = await withLock(async () => {
                const list = (await readData('rental-items.json')) || [];
                list.push(item);
                await writeData('rental-items.json', list);
                return list;
            });
            await audit('item.create', item.id, item.name, who(b));
            res.json({ ok: true, items });
        } catch (e) {
            console.error('[rental] item create 실패:', e.message);
            fail(res, e.code || 500, e.message);
        }
    });

    // ===== 교구 수정 =====
    app.patch('/api/rental/items/:id', async (req, res) => {
        try {
            const b = req.body || {};
            const photo = typeof b.photoDataUrl === 'string' ? b.photoDataUrl : null;
            if (photo && photo.length > 200000) return fail(res, 400, '사진이 너무 커요. 다시 골라 주세요.');

            const out = await withLock(async () => {
                const items = (await readData('rental-items.json')) || [];
                const it = items.find(i => i.id === req.params.id);
                if (!it) return { err: '교구를 찾지 못했어요.' };
                const me = actorOf(b);
                if (!me.school || it.owner.school !== me.school) {
                    return { err403: '이 교구를 올린 학교만 고칠 수 있어요.' };
                }
                if (b.name !== undefined) it.name = clean(b.name, 60) || it.name;
                if (b.category !== undefined) it.category = clean(b.category, 20);
                if (b.emoji !== undefined) it.emoji = clean(b.emoji, 8) || '📦';
                if (b.place !== undefined) it.place = clean(b.place, 60);
                if (b.note !== undefined) it.note = clean(b.note, 300);
                if (b.total !== undefined) it.total = Math.max(1, Math.min(999, parseInt(b.total, 10) || it.total));
                if (b.maxDays !== undefined) it.maxDays = Math.max(0, Math.min(365, parseInt(b.maxDays, 10) || 0));
                if (b.autoApprove !== undefined) it.autoApprove = !!b.autoApprove;
                if (b.trackQty !== undefined) it.trackQty = !!b.trackQty;
                if (b.active !== undefined) it.active = !!b.active;
                if (photo) it.hasPhoto = true;
                it.updatedAt = nowIso();
                await writeData('rental-items.json', items);
                return { items };
            });
            if (out.err403) return fail(res, 403, out.err403);
            if (out.err) return fail(res, 404, out.err);
            if (photo) await photoSet(req.params.id, photo);
            await audit('item.update', req.params.id, '', who(b));
            res.json({ ok: true, items: out.items });
        } catch (e) { fail(res, e.code || 500, e.message); }
    });

    // ===== 교구 삭제 =====
    app.delete('/api/rental/items/:id', async (req, res) => {
        try {
            const out = await withLock(async () => {
                const items = (await readData('rental-items.json')) || [];
                const loans = (await readData('rental-loans.json')) || [];
                const it = items.find(i => i.id === req.params.id);
                if (!it) return { err: 404 };
                const me = actorOf(req.body);
                if (!me.school || it.owner.school !== me.school) return { err: 403 };
                const busy = loans.some(l => l.itemId === it.id &&
                    ['requested', 'approved', 'out', 'return_requested'].includes(l.status));
                if (busy) return { err: 409 };
                const next = items.filter(i => i.id !== it.id);
                await writeData('rental-items.json', next);
                return { items: next, name: it.name };
            });
            if (out.err === 404) return fail(res, 404, '교구를 찾지 못했어요.');
            if (out.err === 403) return fail(res, 403, '이 교구를 올린 학교만 지울 수 있어요.');
            if (out.err === 409) return fail(res, 409, '아직 대여 중이거나 대기 중인 신청이 있어 지울 수 없어요. 먼저 반납을 확인해 주세요.');
            await photoDel(req.params.id);
            await audit('item.delete', req.params.id, out.name, who(req.body));
            res.json({ ok: true, items: out.items });
        } catch (e) { fail(res, e.code || 500, e.message); }
    });

    // ===== 사진 =====
    app.get('/api/rental/items/:id/photo', async (req, res) => {
        try {
            const dataUrl = await photoGet(req.params.id);
            if (!dataUrl) return res.status(404).end();
            const m = /^data:(image\/(?:jpeg|png));base64,(.*)$/.exec(dataUrl);
            if (!m) return res.status(404).end();
            const buf = Buffer.from(m[2], 'base64');
            res.setHeader('Content-Type', m[1]);
            res.setHeader('Cache-Control', 'public, max-age=604800');
            res.end(buf);
        } catch (e) { res.status(500).end(); }
    });

    // ===== 대여 신청 =====
    app.post('/api/rental/loans', async (req, res) => {
        try {
            const b = req.body || {};
            const borrower = {
                school: clean(b.borrower && b.borrower.school, 30),
                name: clean(b.borrower && b.borrower.name, 30),
                role: clean(b.borrower && b.borrower.role, 20)
            };
            if (!borrower.school || !borrower.name) return fail(res, 400, '학교와 이름을 먼저 입력해 주세요.');
            if (!isDate(b.wantFrom) || !isDate(b.wantTo)) return fail(res, 400, '사용 기간을 골라 주세요.');
            if (b.wantFrom > b.wantTo) return fail(res, 400, '끝나는 날이 시작하는 날보다 빨라요.');
            if (b.wantTo < kstToday()) return fail(res, 400, '이미 지난 날짜로는 신청할 수 없어요.');

            const out = await withLock(async () => {
                const items = (await readData('rental-items.json')) || [];
                const loans = (await readData('rental-loans.json')) || [];
                const settings = (await readData('rental-settings.json')) || {};
                const item = items.find(i => i.id === b.itemId);
                if (!item) return { err: [404, '교구를 찾지 못했어요.'] };

                const qty = Math.max(1, Math.min(999, parseInt(b.qty, 10) || 1));
                if (qty > item.total) return { err: [400, '총 수량보다 많이 신청했어요.'] };
                if (item.maxDays > 0) {
                    const days = Math.round((Date.parse(b.wantTo + 'T00:00:00Z') - Date.parse(b.wantFrom + 'T00:00:00Z')) / 86400000) + 1;
                    if (days > item.maxDays) return { err: [400, '이 교구는 최대 ' + item.maxDays + '일까지 빌릴 수 있어요.'] };
                }

                settings.seq = (Number(settings.seq) || 1000) + 1;
                const loan = {
                    id: uid('ln_'),
                    seq: settings.seq,
                    itemId: item.id,
                    qty,
                    borrower,
                    contact: clean(b.contact, 30),
                    wantFrom: b.wantFrom,
                    wantTo: b.wantTo,
                    method: clean(b.method, 10) || '방문',
                    memo: clean(b.memo, 200),
                    status: 'requested',
                    readyAt: null,
                    history: [{ at: nowIso(), status: 'requested', by: borrower.school + '·' + borrower.name, note: '' }],
                    createdAt: nowIso(), updatedAt: nowIso(),
                    decidedAt: null, decidedBy: null,
                    pickedUpAt: null, returnRequestedAt: null, returnedAt: null,
                    rejectReason: null
                };
                loans.push(loan);

                // 자동 승인: 재고가 있고 내가 대기열 1번일 때만
                if (item.autoApprove) {
                    const q = queueOf(item.id, loans);
                    if (q.length && q[0].id === loan.id && availableOf(item, loans) >= qty) {
                        stamp(loan, 'approved', '자동 승인', '');
                        loan.decidedAt = nowIso();
                        loan.decidedBy = '자동 승인';
                    }
                }
                recomputeReady(item.id, items, loans);

                await writeData('rental-loans.json', loans);
                await writeData('rental-settings.json', settings);
                return { loans, loan, item };
            });
            if (out.err) return fail(res, out.err[0], out.err[1]);
            await audit('loan.request', out.loan.id, out.item.name + ' ' + out.loan.qty + '개', who({ actor: borrower }));
            res.json({ ok: true, loans: out.loans, loan: out.loan });
        } catch (e) {
            console.error('[rental] loan 실패:', e.message);
            fail(res, e.code || 500, e.message);
        }
    });

    // ===== 상태 전이 (취소/승인/반려/수령/반납신청/반납확인/강제반납) =====
    app.post('/api/rental/loans/:id/:action', async (req, res) => {
        const action = req.params.action;
        const spec = ACTIONS[action];
        if (!spec) return fail(res, 400, '알 수 없는 요청이에요.');
        const b = req.body || {};

        try {
            const out = await withLock(async () => {
                const items = (await readData('rental-items.json')) || [];
                const loans = (await readData('rental-loans.json')) || [];
                const settings = (await readData('rental-settings.json')) || {};
                const loan = loans.find(l => l.id === req.params.id);
                if (!loan) return { err: [404, '신청 내역을 찾지 못했어요.'] };
                if (!spec.from.includes(loan.status)) {
                    return { err: [409, '이미 처리된 신청이에요. 화면을 새로고침해 주세요.'] };
                }
                const item = items.find(i => i.id === loan.itemId);
                const me = actorOf(b);
                if (!me.school || !me.name) return { err: [400, '학교와 이름을 먼저 입력해 주세요.'] };
                const isOwner    = !!item && item.owner.school === me.school;
                const isBorrower = loan.borrower.school === me.school && loan.borrower.name === me.name;
                if (OWNER_ONLY.includes(action) && !isOwner) {
                    return { err: [403, '이 교구를 올린 학교(' + (item ? item.owner.school : '보유교') + ')만 결재할 수 있어요.'] };
                }
                if (BORROWER_ONLY.includes(action) && !isBorrower) {
                    return { err: [403, '본인이 신청한 건만 처리할 수 있어요.'] };
                }
                if (action === 'pickup' && !isOwner && !isBorrower) {
                    return { err: [403, '신청한 분이나 보유교만 수령을 확인할 수 있어요.'] };
                }
                const actor = who(b);

                if (action === 'approve') {
                    const grant = Math.max(1, Math.min(parseInt(b.qty, 10) || loan.qty, loan.qty));
                    const avail = availableOf(item, loans);
                    if (grant > avail) {
                        return { err: [409, '방금 다른 학교가 먼저 가져갔어요. 대기열 순번은 그대로 유지됩니다.'] };
                    }
                    const q = queueOf(loan.itemId, loans);
                    if (!b.override && q.length && q[0].id !== loan.id) {
                        return { err: [409, '앞 순번이 있어요. 그래도 먼저 승인하려면 [먼저 승인]을 눌러 주세요.'] };
                    }
                    // 부분 승인 → 잔여분은 대기열 맨 앞을 지키도록 seq - 0.5 로 분할
                    if (grant < loan.qty) {
                        // 잔여분은 대기열 맨 앞을 지켜야 한다. 이미 쓰인 순번과 겹치지 않게 내린다.
                        let remSeq = loan.seq - 0.5;
                        while (loans.some(l => l.seq === remSeq)) remSeq -= 0.0001;
                        loans.push({
                            ...loan,
                            id: uid('ln_'),
                            seq: remSeq,
                            qty: loan.qty - grant,
                            status: 'requested',
                            readyAt: null,
                            history: [{ at: nowIso(), status: 'requested', by: actor, note: '부분 승인 후 남은 수량' }],
                            createdAt: nowIso(), updatedAt: nowIso()
                        });
                        loan.qty = grant;
                    }
                    loan.decidedAt = nowIso();
                    loan.decidedBy = actor;
                    stamp(loan, 'approved', actor, b.override ? '먼저 승인' : '');
                } else if (action === 'reject') {
                    const reason = clean(b.reason, 100);
                    if (!reason) return { err: [400, '반려 사유를 적어 주세요.'] };
                    loan.rejectReason = reason;
                    loan.decidedAt = nowIso();
                    loan.decidedBy = actor;
                    stamp(loan, 'rejected', actor, reason);
                } else if (action === 'pickup') {
                    loan.pickedUpAt = nowIso();
                    stamp(loan, 'out', actor, '');
                } else if (action === 'return-request') {
                    loan.returnRequestedAt = nowIso();
                    stamp(loan, 'return_requested', actor, '');
                } else if (action === 'return-cancel') {
                    loan.returnRequestedAt = null;
                    stamp(loan, 'out', actor, '반납 신청 취소');
                } else if (action === 'return-confirm' || action === 'force-return') {
                    loan.returnedAt = nowIso();
                    stamp(loan, 'returned', actor, action === 'force-return' ? '강제 반납 처리' : '');
                } else {
                    stamp(loan, spec.to, actor, clean(b.reason, 100));
                }

                loan.readyAt = null;
                recomputeReady(loan.itemId, items, loans);
                await writeData('rental-loans.json', loans);
                await writeData('rental-settings.json', settings);
                return { loans, loan, item, actor };
            });

            if (out.err) return fail(res, out.err[0], out.err[1]);
            await audit('loan.' + action, out.loan.id, (out.item ? out.item.name : '') + ' ' + out.loan.qty + '개', out.actor);
            res.json({ ok: true, loans: out.loans });
        } catch (e) {
            console.error('[rental] ' + action + ' 실패:', e.message);
            fail(res, e.code || 500, e.message);
        }
    });

    // ===== 이력 CSV (엑셀 한글 깨짐 방지용 BOM 포함) =====
    app.get('/api/rental/export.csv', async (req, res) => {
        try {
            const s = await loadAll();
            const nameOf = (id) => { const i = s.items.find(x => x.id === id); return i ? i.name : '(삭제된 교구)'; };
            const LABEL = {
                requested: '대기', approved: '승인', out: '대여중',
                return_requested: '반납확인대기', returned: '반납완료',
                rejected: '반려', canceled: '취소'
            };
            const rows = [['순번', '교구', '수량', '학교', '이름', '직', '희망시작', '희망반납', '상태', '신청일시', '반납일시', '메모']];
            s.loans.slice().sort((a, b) => a.seq - b.seq).forEach(l => {
                rows.push([l.seq, nameOf(l.itemId), l.qty, l.borrower.school, l.borrower.name, l.borrower.role,
                    l.wantFrom, l.wantTo, LABEL[l.status] || l.status, l.createdAt, l.returnedAt || '', l.memo || '']);
            });
            const csv = rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="rental-history.csv"');
            res.end('﻿' + csv);
        } catch (e) { fail(res, e.code || 500, e.message); }
    });
};
