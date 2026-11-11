'use strict';
const express = require('express');
const path = require('node:path');
const { createHash, randomBytes, timingSafeEqual } = require('node:crypto');
const domain = require('./domain');
const { createStore } = require('./store');
const config = require('./config');
const { PRESETS, BONUS } = require('./presets');
const mock = require('./providers/mock');
const hash = value => createHash('sha256').update(value).digest('hex');
// 위원 링크 해시. 링크 원문을 저장하기 전(2026-11-11 이전)에 나간 링크는 legacyInviteHashes 에 남겨 계속 열리게 한다.
const hashesOf = v => [v.inviteHash, ...(v.legacyInviteHashes || [])].filter(h => typeof h === 'string' && /^[a-f0-9]{64}$/.test(h));
const summary = r => ({ id: r.id, title: r.title, school: r.school, field: r.field, status: r.status, createdAt: r.createdAt, candidateCount: r.candidates.length, reviewerCount: r.reviewers.length, version: r.version });

// pagePath: 채용 화면 주소. 백암이는 /recruitment, 학교 공간(/hub)은 /hub/s/<학교코드>/recruitment — 위원 초대 링크가 이 주소로 나간다.
function createRouter({ validateSession, redis, serverless = false, directory = path.join(__dirname, '../../data/recruitment'), store = createStore({ redis, serverless, directory }), pagePath = '/recruitment' }) {
    const router = express.Router();
    const googleAuth = require('./google-auth').createGoogleAuth({ redis, directory });
    router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); res.set('X-Content-Type-Options', 'nosniff'); next(); });
    router.use(express.json({ limit: '128kb' }));
    router.use((req, res, next) => { if (req.method === 'POST' && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) return res.status(400).json({ error: 'JSON 객체를 전송하세요.' }); if (req.body && Buffer.byteLength(JSON.stringify(req.body)) > 128 * 1024) return res.status(413).json({ error: '입력 데이터가 너무 큽니다.' }); next(); });
    // 백암이에 들어올 때 쓰는 접근 코드면 채용 관리자로 인정한다 (role 'user' 또는 'admin').
    // 채용 탭이 백암이 안에 있어서 코드를 두 번 묻지 않기 위한 결정이다. 대신 백암이 코드를
    // 아는 사람은 누구나 지원자 명단과 점수를 볼 수 있다. 다시 좁히려면 아래 조건을
    // session?.role === 'admin' 으로 되돌리면 된다.
    const MANAGER_ROLES = ['admin', 'user'];
    async function admin(req, res, next) { try { const session = await validateSession(req.get('X-Auth-Token')); domain.assert(MANAGER_ROLES.includes(session?.role), '백암이 접근 코드로 로그인이 필요합니다.', session ? 403 : 401); req.actor = { role: 'admin', id: 'admin' }; next(); } catch (e) { next(e); } }
    async function access(req, res, next) {
        try {
            const r = await store.get(req.params.id);
            const session = await validateSession(req.get('X-Auth-Token'));
            if (MANAGER_ROLES.includes(session?.role)) req.actor = { role: 'admin', id: 'admin' };
            else {
                const token = req.get('X-Recruitment-Token') || ''; domain.assert(/^[a-f0-9]{64}$/.test(token), '위원 초대 링크 또는 백암이 로그인이 필요합니다.', 401);
                const digest = hash(token); const reviewer = r.reviewers.find(v => hashesOf(v).some(h => timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(digest, 'hex'))));
                domain.assert(reviewer, '초대 링크가 유효하지 않습니다.', 401); req.actor = { role: 'reviewer', id: reviewer.id, name: reviewer.name, stages: reviewer.stages }; req.inviteDigest = digest;
            }
            req.recruitment = r; next();
        } catch (e) { next(e); }
    }
    // 관리자에게만 위원별 링크 주소를 붙여 준다. 위원 화면에는 링크 원문이 나가지 않는다(domain.publicView 가 지움).
    const adminView = (r, actor) => {
        const view = domain.publicView(r, actor);
        if (actor?.role === 'admin') for (const v of view.reviewers) { const src = r.reviewers.find(x => x.id === v.id); if (src?.inviteToken) v.invitePath = `${pagePath}?id=${r.id}#invite=${src.inviteToken}`; }
        return view;
    };
    const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
    // 운영 계정 주소와 내부 폴더 ID 는 화면에 필요 없다. 브라우저로 내보내지 않는다.
    router.get('/config', admin, wrap(async (req, res) => {
        const { operatorEmail, folderId, folderVerification, ...safe } = config;
        const google = await googleAuth.status();
        // 심사표 프리셋은 서버에만 둔다. 새 채용 화면의 '심사표 불러오기'가 이 목록을 쓴다.
        res.json({ ...safe, presets: PRESETS, bonus: BONUS, google: { configured: google.configured, connected: google.connected } });
    }));
    router.post('/google/start', admin, (req, res, next) => { try { res.json({ authorizationUrl: googleAuth.start(res) }); } catch (e) { next(e); } });
    router.get('/google/callback', wrap(async (req, res) => { await googleAuth.callback(req, res); res.redirect(`${pagePath}?google=connected`); }));
    router.post('/google/check', admin, wrap(async (req, res) => {
        const { GoogleWorkspaceClient } = require('./providers/google');
        const client = new GoogleWorkspaceClient({ getAccessToken: () => googleAuth.getAccessToken() });
        const result = await client.checkConnection(); res.json({ folderName: result.folder.name, canProvision: false, message: '접근 확인 완료. 운영용 템플릿 검증 후 자동 생성 어댑터를 활성화하세요.' });
    }));
    router.get('/', admin, wrap(async (req, res) => res.json({ items: (await store.list()).map(summary) })));
    router.post('/', admin, wrap(async (req, res) => { const r = await store.create(domain.createRecruitment(req.body)); res.status(201).json(adminView(r, req.actor)); }));
    router.get('/:id', access, (req, res) => res.json(adminView(req.recruitment, req.actor)));
    const mutate = (url, gate, fn) => router.post(url, gate, wrap(async (req, res) => {
        const result = await store.mutate(req.params.id, req.body.version, r => fn(r, req)); res.json(adminView(result, req.actor));
    }));
    // 위원 자기 몫의 쓰기(서명·임시 저장·제출). 같은 채용에 다른 위원·관리자가 동시에 저장해도 서로 막지 않도록
    // 최신 저장본에 다시 적용한다(rebase). 다시 적용할 때마다 이 링크가 아직 유효한지(위원 삭제 등) 최신 상태로 다시 확인한다.
    const stillInvited = (r, req) => { const v = r.reviewers.find(x => x.id === req.actor.id); domain.assert(v && hashesOf(v).includes(req.inviteDigest), '초대 링크가 유효하지 않습니다.', 401); };
    const reviewerMutate = (url, fn) => router.post(url, access, wrap(async (req, res) => {
        const own = req.actor.role === 'reviewer';
        // 같은 위원이 두 기기(PC·태블릿)에서 같은 링크를 열어 둔 경우: 내 채점표가 내가 본 뒤로 바뀌었으면 다시 적용하지 않는다.
        // 화면은 자기 평가의 updatedAt 을 base 로 보낸다. base 를 보내지 않는 옛 화면은 예전처럼 엄격한 버전 검사를 받는다.
        // 서명은 base 없이 다시 적용한다 — 방금 직접 그린 서명이 최신 의사이고, 그 앞의 점수 저장은 base 검사를 받는다.
        const stage = req.params.stage, hasBase = stage ? Object.prototype.hasOwnProperty.call(req.body, 'base') : true;
        const result = await store.mutate(req.params.id, req.body.version, r => {
            if (own) stillInvited(r, req);
            if (own && stage && hasBase) {
                const mine = r.evaluations?.[`${stage}:${req.actor.id}`]?.updatedAt ?? null;
                if (mine !== (req.body.base ?? null)) throw Object.assign(new domain.DomainError('다른 기기(또는 다른 창)에서 이 채점표가 먼저 저장되었습니다. 이 기기에서 입력하던 내용은 반영되지 않았고, 먼저 저장된 내용을 불러왔습니다. 확인한 뒤 다시 저장해 주세요.', 409), { code: 'own_conflict', currentVersion: r.version });
            }
            return fn(r, req);
        }, { rebase: own && hasBase });
        res.json(adminView(result, req.actor));
    }));
    mutate('/:id/provision', admin, r => mock.provision(r));
    // 위원 링크는 위원마다 하나로 고정한다. 처음 누를 때만 만들고, 그 뒤에는 같은 링크를 돌려준다(만료·재발급 없음).
    // 관리자가 언제든 다시 복사할 수 있도록 원문(inviteToken)을 저장하고, 관리자 화면에만 내보낸다.
    router.post('/:id/invites/:reviewerId', admin, wrap(async (req, res) => {
        let result = req.recruitment || await store.get(req.params.id);
        const found = result.reviewers.find(v => v.id === req.params.reviewerId); domain.assert(found, '위원을 찾을 수 없습니다.', 404);
        if (!found.inviteToken) {
            const token = randomBytes(32).toString('hex');
            result = await store.mutate(req.params.id, req.body.version, r => {
                domain.assert(r.status !== 'finalized', '확정된 채용에는 새 초대 링크를 발급할 수 없습니다.', 409);
                const reviewer = r.reviewers.find(v => v.id === req.params.reviewerId); domain.assert(reviewer, '위원을 찾을 수 없습니다.', 404);
                if (!reviewer.inviteToken) { if (reviewer.inviteHash) reviewer.legacyInviteHashes = [...(reviewer.legacyInviteHashes || []), reviewer.inviteHash]; reviewer.inviteToken = token; reviewer.inviteHash = hash(token); delete reviewer.inviteExpiresAt; domain.audit(r, 'admin', '위원 링크 발급', reviewer.name); }
                return r;
            });
        }
        const view = adminView(result, req.actor);
        res.json({ recruitment: view, invitationPath: view.reviewers.find(v => v.id === req.params.reviewerId).invitePath });
    }));
    reviewerMutate('/:id/pledge', (r, req) => { domain.assert(req.actor.role === 'reviewer', '위원 초대 링크로 접속해 서명하세요.', 403); return domain.signPledge(r, req.actor.id, req.body.image); });
    reviewerMutate('/:id/evaluations/:stage/save', (r, req) => { domain.assert(req.actor.role === 'reviewer', '위원 초대 링크로 접속해 평가하세요.', 403); return domain.saveEvaluation(r, req.actor.id, req.params.stage, req.body.rows); });
    reviewerMutate('/:id/evaluations/:stage/submit', (r, req) => { domain.assert(req.actor.role === 'reviewer', '위원 계정만 평가를 제출할 수 있습니다.', 403); return domain.submitEvaluation(r, req.actor.id, req.params.stage); });
    mutate('/:id/evaluations/:stage/reopen', admin, (r, req) => domain.reopen(r, req.body.reviewerId, req.params.stage, req.body.reason));
    mutate('/:id/shortlist', admin, (r, req) => domain.selectShortlist(r, req.body.candidateIds, req.body.reason));
    mutate('/:id/finalize', admin, r => domain.finalize(r));
    // 성명 동의를 받지 못한 사람의 이름을 가운데 0으로 바꾼다. ids 가 없으면 전원.
    mutate('/:id/anonymize', admin, (r, req) => domain.anonymizeNames(r, req.body.ids === undefined ? null : req.body.ids));
    // 확정 문서를 운영 계정 Drive 에 올린다. 보관 기한이 지난 예전 채용 폴더는 이때 같이 지운다.
    // 별도 스케줄러가 없으므로 삭제는 이 요청에 얹혀 돌아간다. 아무도 보관하지 않으면 삭제도 미뤄진다.
    // 보관 기한이 지난 폴더를 지우는 예약 경로. Vercel Cron 이 하루 한 번 호출한다.
    // 관리자 세션이 없으므로 CRON_SECRET 으로 인증한다. 아무도 보관을 실행하지 않아도
    // 7일이 지나면 삭제되게 하는 것이 이 경로의 존재 이유다.
    router.post('/maintenance/purge', wrap(async (req, res) => {
        const secret = process.env.CRON_SECRET || '';
        domain.assert(secret, '예약 작업 비밀키가 설정되지 않았습니다.', 503);
        const given = (req.get('Authorization') || '').replace(/^Bearer /, '');
        const ok = given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
        domain.assert(ok, '예약 작업 인증에 실패했습니다.', 401);
        const status = await googleAuth.status();
        if (!status.connected) return res.json({ skipped: '문서 보관함이 연결되지 않았습니다.', deleted: 0 });
        const { GoogleWorkspaceClient } = require('./providers/google');
        const { purgeExpired } = require('./providers/drive-archive');
        const client = new GoogleWorkspaceClient({ getAccessToken: () => googleAuth.getAccessToken() });
        const purged = await purgeExpired(client);
        console.log(`[recruitment] 보관 정리: 검사 ${purged.checked}건 · 삭제 ${purged.deleted.length}건 · 실패 ${purged.failed.length}건`);
        res.json({ checked: purged.checked, deleted: purged.deleted.length, failed: purged.failed.length });
    }));
    router.post('/:id/archive', admin, wrap(async (req, res) => {
        const { GoogleWorkspaceClient } = require('./providers/google');
        const { archiveResults, purgeExpired, RETENTION_DAYS } = require('./providers/drive-archive');
        const { exportResult } = require('./exports');
        const r = await store.get(req.params.id);
        domain.assert(r.snapshot, '결과 확정 후 보관할 수 있습니다.', 409);
        const client = new GoogleWorkspaceClient({ getAccessToken: () => googleAuth.getAccessToken() });
        await client.checkConnection();
        const html = await exportResult(r, 'html'), xlsx = await exportResult(r, 'xlsx');
        const archived = await archiveResults(client, r, [
            { name: `${r.title}_채점표_서약서.html`, buffer: html.buffer, mimeType: 'text/html' },
            { name: `${r.title}_평가통계.xlsx`, buffer: xlsx.buffer, mimeType: xlsx.type }
        ]);
        const purged = await purgeExpired(client).catch(e => ({ deleted: [], failed: [{ reason: e.message }], checked: 0 }));
        await store.mutate(req.params.id, req.body.version, current => {
            current.archive = { folderId: archived.folderId, folderUrl: archived.folderUrl, purgeAfter: archived.purgeAfter, archivedAt: new Date().toISOString(), files: archived.files.map(f => f.name) };
            domain.audit(current, 'admin', 'Drive 보관', `${archived.files.length}개 파일 · ${RETENTION_DAYS}일 뒤 삭제 예정`);
            if (purged.deleted.length || purged.failed.length) domain.audit(current, 'admin', '기한 지난 보관 정리', `삭제 ${purged.deleted.length}건 · 실패 ${purged.failed.length}건`);
            return current;
        });
        res.json({ archive: archived, purged, retentionDays: RETENTION_DAYS });
    }));
    // 채용 삭제: 되돌릴 수 없다. 실수로 진행 중인 채용을 지우지 않도록 채용 제목을 그대로
    // 입력받아 대조하고, 아직 확정되지 않았으면 한 번 더 confirmUnfinished 를 요구한다.
    router.delete('/:id', admin, wrap(async (req, res) => {
        const r = await store.get(req.params.id);
        domain.assert(typeof req.body?.confirmTitle === 'string' && req.body.confirmTitle.trim() === r.title,
            '삭제하려면 채용 제목을 정확히 입력하세요.', 400);
        domain.assert(r.status === 'finalized' || req.body.confirmUnfinished === true,
            '아직 결과가 확정되지 않은 채용입니다. 정말 지우려면 한 번 더 확인해 주세요.', 409);
        await store.remove(req.params.id);
        res.json({ deleted: true, id: r.id, title: r.title });
    }));
    // 샘플 심사표: 채용을 만들기 전에 고른 심사표가 어떻게 인쇄되는지 본다. 가상의 지원자·위원으로 끝까지 채점한 확정본이며 저장하지 않는다.
    // ?stages=document 이면 서류전형만 하는 채용의 출력물(면접 표 없음)을 보여 준다.
    router.get('/sample/:presetId/:format', admin, wrap(async (req, res) => {
        domain.assert(['html', 'hwpx', 'xlsx'].includes(req.params.format), '지원하지 않는 형식입니다.');
        const { buildSample } = require('./sample'); const { exportResult } = require('./exports');
        const r = buildSample(req.params.presetId, typeof req.query.field === 'string' ? req.query.field : '', { documentOnly: req.query.stages === 'document' }), output = await exportResult(r, req.params.format);
        res.set('Content-Type', output.type); res.set('Content-Disposition', `attachment; filename="recruitment-sample.${req.params.format}"; filename*=UTF-8''${encodeURIComponent(`${r.title}.${req.params.format}`)}`); res.send(output.buffer);
    }));
    // 개인정보(성명) 수집 및 이용 동의서. 채용마다 학교·제목을 채워 주고, 새 채용 화면에서는 빈칸 양식을 준다.
    const sendConsent = async (res, info) => {
        const buffer = await require('./hwpx').buildConsentHwpx(info);
        res.set('Content-Type', 'application/hwp+zip'); res.set('Content-Disposition', `attachment; filename="consent.hwpx"; filename*=UTF-8''${encodeURIComponent('개인정보 수집 및 이용 동의서.hwpx')}`); res.send(buffer);
    };
    router.get('/consent/hwpx', admin, wrap(async (req, res) => sendConsent(res, {})));
    router.get('/:id/consent/hwpx', admin, wrap(async (req, res) => { const r = await store.get(req.params.id); await sendConsent(res, { school: r.school, title: r.title }); }));
    router.get('/:id/export/:format', admin, wrap(async (req, res) => {
        const r = await store.get(req.params.id); domain.assert(r.snapshot, '결과 확정 후 다운로드할 수 있습니다.', 409);
        domain.assert(['xlsx', 'html', 'zip', 'hwpx'].includes(req.params.format), '지원하지 않는 형식입니다.');
        const { exportResult } = require('./exports'); const output = await exportResult(r, req.params.format);
        res.set('Content-Type', output.type); res.set('Content-Disposition', `attachment; filename="recruitment-v1.${req.params.format}"; filename*=UTF-8''${encodeURIComponent(`${r.title}_확정본_v1.${req.params.format}`)}`); res.send(output.buffer);
    }));
    router.use((err, req, res, next) => { if (res.headersSent) return next(err); if (!(err instanceof domain.DomainError)) console.error('[recruitment]', err.message); const status = err.status || 500; res.status(status).json({ error: status >= 500 ? '채용 작업 처리에 실패했습니다. 저장소·서버 설정을 확인하세요.' : err.message, ...(Number.isInteger(err.currentVersion) ? { currentVersion: err.currentVersion } : {}), ...(err.code === 'own_conflict' ? { code: err.code } : {}) }); });
    return router;
}
module.exports = { createRouter, hash };
