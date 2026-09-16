'use strict';
const express = require('express');
const path = require('node:path');
const { createHash, randomBytes, timingSafeEqual } = require('node:crypto');
const domain = require('./domain');
const { createStore } = require('./store');
const config = require('./config');
const mock = require('./providers/mock');
const hash = value => createHash('sha256').update(value).digest('hex');
const summary = r => ({ id: r.id, title: r.title, school: r.school, field: r.field, status: r.status, createdAt: r.createdAt, candidateCount: r.candidates.length, reviewerCount: r.reviewers.length, version: r.version });

function createRouter({ validateSession, redis, serverless = false, directory = path.join(__dirname, '../../data/recruitment'), store = createStore({ redis, serverless, directory }) }) {
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
                const digest = hash(token); const reviewer = r.reviewers.find(v => v.inviteHash && timingSafeEqual(Buffer.from(v.inviteHash, 'hex'), Buffer.from(digest, 'hex')) && Date.parse(v.inviteExpiresAt) > Date.now());
                domain.assert(reviewer, '초대 링크가 만료되었거나 유효하지 않습니다.', 401); req.actor = { role: 'reviewer', id: reviewer.id, name: reviewer.name, stages: reviewer.stages };
            }
            req.recruitment = r; next();
        } catch (e) { next(e); }
    }
    const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
    router.get('/config', admin, wrap(async (req, res) => res.json({ ...config, google: await googleAuth.status() })));
    router.post('/google/start', admin, (req, res, next) => { try { res.json({ authorizationUrl: googleAuth.start(res) }); } catch (e) { next(e); } });
    router.get('/google/callback', wrap(async (req, res) => { await googleAuth.callback(req, res); res.redirect('/recruitment?google=connected'); }));
    router.post('/google/check', admin, wrap(async (req, res) => {
        const { GoogleWorkspaceClient } = require('./providers/google');
        const client = new GoogleWorkspaceClient({ getAccessToken: () => googleAuth.getAccessToken() });
        const result = await client.checkConnection(); res.json({ email: result.email, folderName: result.folder.name, canProvision: false, message: '접근 확인 완료. 운영용 템플릿 검증 후 자동 생성 어댑터를 활성화하세요.' });
    }));
    router.get('/', admin, wrap(async (req, res) => res.json({ items: (await store.list()).map(summary) })));
    router.post('/', admin, wrap(async (req, res) => { const r = await store.create(domain.createRecruitment(req.body)); res.status(201).json(domain.publicView(r, req.actor)); }));
    router.get('/:id', access, (req, res) => res.json(domain.publicView(req.recruitment, req.actor)));
    const mutate = (url, gate, fn) => router.post(url, gate, wrap(async (req, res) => {
        const result = await store.mutate(req.params.id, req.body.version, r => fn(r, req)); res.json(domain.publicView(result, req.actor));
    }));
    mutate('/:id/provision', admin, r => mock.provision(r));
    router.post('/:id/invites/:reviewerId', admin, wrap(async (req, res) => {
        const token = randomBytes(32).toString('hex');
        const result = await store.mutate(req.params.id, req.body.version, r => {
            domain.assert(r.status !== 'finalized', '확정된 채용에는 새 초대 링크를 발급할 수 없습니다.', 409);
            const reviewer = r.reviewers.find(v => v.id === req.params.reviewerId); domain.assert(reviewer, '위원을 찾을 수 없습니다.', 404);
            reviewer.inviteHash = hash(token); reviewer.inviteExpiresAt = new Date(Date.now() + 7 * 86400000).toISOString(); domain.audit(r, 'admin', '위원 링크 발급', reviewer.name); return r;
        });
        res.json({ recruitment: domain.publicView(result, req.actor), invitationPath: `/recruitment?id=${result.id}#invite=${token}`, expiresInDays: 7 });
    }));
    mutate('/:id/pledge', access, (r, req) => { domain.assert(req.actor.role === 'reviewer', '위원 초대 링크로 접속해 서명하세요.', 403); return domain.signPledge(r, req.actor.id, req.body.image); });
    mutate('/:id/evaluations/:stage/save', access, (r, req) => { domain.assert(req.actor.role === 'reviewer', '위원 초대 링크로 접속해 평가하세요.', 403); return domain.saveEvaluation(r, req.actor.id, req.params.stage, req.body.rows); });
    mutate('/:id/evaluations/:stage/submit', access, (r, req) => { domain.assert(req.actor.role === 'reviewer', '위원 계정만 평가를 제출할 수 있습니다.', 403); return domain.submitEvaluation(r, req.actor.id, req.params.stage); });
    mutate('/:id/evaluations/:stage/reopen', admin, (r, req) => domain.reopen(r, req.body.reviewerId, req.params.stage, req.body.reason));
    mutate('/:id/shortlist', admin, (r, req) => domain.selectShortlist(r, req.body.candidateIds, req.body.reason));
    mutate('/:id/finalize', admin, r => domain.finalize(r));
    router.get('/:id/export/:format', admin, wrap(async (req, res) => {
        const r = await store.get(req.params.id); domain.assert(r.snapshot, '결과 확정 후 다운로드할 수 있습니다.', 409);
        domain.assert(['xlsx', 'html', 'zip'].includes(req.params.format), '지원하지 않는 형식입니다.');
        const { exportResult } = require('./exports'); const output = await exportResult(r, req.params.format);
        res.set('Content-Type', output.type); res.set('Content-Disposition', `attachment; filename="recruitment-v1.${req.params.format}"; filename*=UTF-8''${encodeURIComponent(`${r.title}_확정본_v1.${req.params.format}`)}`); res.send(output.buffer);
    }));
    router.use((err, req, res, next) => { if (res.headersSent) return next(err); if (!(err instanceof domain.DomainError)) console.error('[recruitment]', err.message); const status = err.status || 500; res.status(status).json({ error: status >= 500 ? '채용 작업 처리에 실패했습니다. 저장소·서버 설정을 확인하세요.' : err.message }); });
    return router;
}
module.exports = { createRouter, hash };
