// 학생 범위 세션(학급 초대 코드 / 연습) · 교사 학급 관리 · CSRF(Origin) 검사.
// 공유 secret 헤더(X-Vibe-Client 등)를 인증으로 쓰지 않는다. 학생 식별은 서버가 발급한 무작위 studentId뿐.

import { errors } from '../http/errors.js';
import {
  STUDENT_COOKIE, TEACHER_COOKIE, secretProblem, signToken, verifyToken, parseCookies, serializeCookie,
  appendSetCookie, randomId, newInviteCode, normalizeInviteCode,
} from './tokens.js';
import { DEFAULT_API_LIMITS } from '../http/limits.js';

const DAY = 86_400_000;
export const AUTH_DEFAULTS = Object.freeze({
  classSessionMs: 14 * DAY,     // 학급 세션 토큰 수명 (사용 중 절반 이하로 남으면 자동 갱신)
  practiceSessionMs: 1 * DAY,   // 연습 세션
  classStudentTtlMs: 180 * DAY, // 학생 레코드 보존
  practiceStudentTtlMs: 7 * DAY,
  inviteTtlMs: 30 * DAY,
  teacherCookieMs: 365 * DAY,
  maxStudentsPerClass: 60,
  maxClassesPerTeacher: 50,
});

const DISPLAY_NAME_MAX = 12;

export function cleanDisplayName(v) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') return undefined;
  // 제어문자·꺾쇠 제거, 공백 정리
  const s = v.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return [...s].slice(0, DISPLAY_NAME_MAX).join('');
}

function onlyKeys(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  return Object.keys(body).every(k => allowed.includes(k));
}

/**
 * @param {{ kv:object, env:object, now:()=>number, limiter:ReturnType<import('../http/limits.js').createRateLimiter>,
 *           validateStaffSession:(token:string)=>Promise<object|null>, options?:Partial<typeof AUTH_DEFAULTS> }} deps
 */
export function createAuth(deps) {
  const { kv, env, now, limiter } = deps;
  const opt = { ...AUTH_DEFAULTS, ...(deps.options || {}) };
  const secret = env.VIBE_SESSION_SECRET || '';
  const secretErr = secretProblem(secret);
  const secure = env.VIBE_COOKIE_SECURE ? env.VIBE_COOKIE_SECURE === '1' : (env.NODE_ENV === 'production' || !!env.VERCEL);
  const cookiePath = env.VIBE_COOKIE_PATH || '/api/vibe';
  const allowedOrigins = String(env.VIBE_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

  function requireSecret() {
    if (secretErr) throw Object.assign(errors.internal('서버 설정 오류: ' + secretErr + ' 관리자에게 알려 주세요.'), { retryable: false });
  }

  // ── CSRF: 상태 변경 요청의 Origin 검사 ──
  function originCheck(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const site = req.get('sec-fetch-site');
    if (site === 'cross-site') return next(errors.forbidden('다른 사이트에서 온 요청은 받을 수 없어요.'));
    const origin = req.get('origin');
    if (!origin) return next(); // 브라우저 외 클라이언트 (쿠키 자동 첨부가 없음)
    if (allowedOrigins.includes(origin)) return next();
    let host = null;
    try { host = new URL(origin).host; } catch { /* 잘못된 Origin */ }
    if (host && host === req.get('host')) return next();
    return next(errors.forbidden('다른 사이트에서 온 요청은 받을 수 없어요.'));
  }

  function setStudentCookie(res, payload) {
    appendSetCookie(res, serializeCookie(STUDENT_COOKIE, signToken(secret, payload), { maxAgeMs: payload.exp - now(), secure, path: cookiePath }));
  }

  async function readStudent(req) {
    if (secretErr) return null;
    const tok = parseCookies(req.get('cookie'))[STUDENT_COOKIE];
    if (!tok) return null;
    const p = verifyToken(secret, tok, now());
    if (!p || p.typ !== 's' || typeof p.sid !== 'string') return null;
    const rec = await kv.get(`stu:${p.sid}`);
    if (!rec || rec.classId !== (p.cid ?? null)) return null; // 교사가 학생을 지웠거나 위조
    return { payload: p, record: rec };
  }

  async function requireStudent(req, res, next) {
    const s = await readStudent(req);
    if (!s) return next(errors.unauthenticated());
    const { payload: p, record } = s;
    const life = record.kind === 'practice' ? opt.practiceSessionMs : opt.classSessionMs;
    if (p.exp - now() < life / 2) { // 슬라이딩 갱신
      setStudentCookie(res, { ...p, iat: now(), exp: now() + life });
    }
    res.locals.student = { studentId: record.studentId, classId: record.classId, kind: record.kind, displayName: record.displayName };
    next();
  }

  // ── 교사 ──
  async function staffFrom(req) {
    const token = req.get('x-auth-token');
    if (!token) return null;
    try { return (await deps.validateStaffSession(token)) || null; } catch { return null; }
  }

  function teacherIdFrom(req, staff) {
    const direct = staff && (staff.teacherId || staff.userId || staff.id);
    if (typeof direct === 'string' && direct) return 'st_' + direct.slice(0, 60);
    if (secretErr) return null;
    const tok = parseCookies(req.get('cookie'))[TEACHER_COOKIE];
    const p = tok ? verifyToken(secret, tok, now()) : null;
    return p && p.typ === 't' && typeof p.tid === 'string' ? p.tid : null;
  }

  async function requireTeacher(req, res, next) {
    const staff = await staffFrom(req);
    if (!staff) {
      // 학생 쿠키만 있으면 권한 없음(403), 아무것도 없으면 401
      const s = await readStudent(req);
      return next(s ? errors.forbidden('교사만 볼 수 있어요.') : errors.unauthenticated('교사 로그인이 필요합니다.'));
    }
    res.locals.staff = staff;
    res.locals.teacherId = teacherIdFrom(req, staff);
    next();
  }

  function ensureTeacherId(res) {
    if (res.locals.teacherId) return res.locals.teacherId;
    requireSecret();
    const tid = randomId('t_');
    const exp = now() + opt.teacherCookieMs;
    appendSetCookie(res, serializeCookie(TEACHER_COOKIE, signToken(secret, { v: 1, typ: 't', tid, iat: now(), exp }), { maxAgeMs: opt.teacherCookieMs, secure, path: cookiePath }));
    res.locals.teacherId = tid;
    return tid;
  }

  async function loadOwnedClass(res, classId) {
    const tid = res.locals.teacherId;
    if (!tid || typeof classId !== 'string' || !/^c_[A-Za-z0-9_-]{4,40}$/.test(classId)) throw errors.notFound();
    const c = await kv.get(`class:${classId}`);
    if (!c || c.teacherId !== tid) throw errors.notFound(); // 남의 학급 존재 여부도 숨김
    return c;
  }

  // ── 라우트 ──
  function mount(router, { progress }) {
    router.post('/session', async (req, res) => {
      requireSecret();
      const body = req.body ?? {};
      if (!onlyKeys(body, ['inviteCode', 'displayName', 'practice'])) throw errors.badRequest();
      const displayName = cleanDisplayName(body.displayName);
      if (displayName === undefined) throw errors.badRequest('이름 형식이 올바르지 않아요.');

      let classId = null;
      if (body.inviteCode !== undefined && body.inviteCode !== null && body.inviteCode !== '') {
        const ip = String(req.ip || 'unknown');
        const failRule = { scope: 'inviteFail', id: ip, ...(deps.limits?.inviteFailure || DEFAULT_API_LIMITS.inviteFailure) };
        const pk = await limiter.peek(failRule);
        if (pk.over) throw errors.rateLimited(pk.retryAfterMs, '코드를 너무 많이 틀렸어요. 잠시 후 다시 해 보세요.');
        const code = normalizeInviteCode(body.inviteCode);
        const inv = code ? await kv.get(`invite:${code}`) : null;
        if (!inv) {
          await limiter.hit([failRule]);
          throw errors.notFound('입장 코드를 다시 확인해 주세요.');
        }
        classId = inv.classId;
      } else if (body.practice !== true && body.practice !== undefined) {
        throw errors.badRequest();
      }

      // 이미 같은 범위의 유효한 세션이 있으면 그대로 이어 쓴다(새로고침·재전송 멱등)
      const existing = await readStudent(req);
      if (existing && existing.record.classId === classId) {
        const rec = existing.record;
        if (displayName !== null && displayName !== rec.displayName) {
          rec.displayName = displayName;
          await kv.set(`stu:${rec.studentId}`, rec, { ttlMs: rec.kind === 'practice' ? opt.practiceStudentTtlMs : opt.classStudentTtlMs });
        }
        res.locals.student = rec;
        return res.json(sessionView(rec, existing.payload.exp));
      }

      if (classId) {
        const n = await kv.zcard(`class:${classId}:students`);
        if (n >= opt.maxStudentsPerClass) throw errors.forbidden('이 반은 인원이 다 찼어요. 선생님께 알려 주세요.');
      }
      const kind = classId ? 'class' : 'practice';
      const rec = { studentId: randomId('s_'), classId, kind, displayName, createdAt: new Date(now()).toISOString() };
      await kv.set(`stu:${rec.studentId}`, rec, { ttlMs: kind === 'practice' ? opt.practiceStudentTtlMs : opt.classStudentTtlMs });
      if (classId) await kv.zadd(`class:${classId}:students`, now(), rec.studentId);
      const exp = now() + (kind === 'practice' ? opt.practiceSessionMs : opt.classSessionMs);
      setStudentCookie(res, { v: 1, typ: 's', sid: rec.studentId, cid: classId, iat: now(), exp });
      res.locals.student = rec;
      res.status(201).json(sessionView(rec, exp));
    });

    router.get('/session/me', requireStudent, (req, res) => {
      res.json(sessionView(res.locals.student, null));
    });

    router.post('/session/logout', (req, res) => {
      appendSetCookie(res, serializeCookie(STUDENT_COOKIE, '', { maxAgeMs: 0, secure, path: cookiePath }));
      res.json({ ok: true });
    });

    // 교사
    router.post('/teacher/classes', requireTeacher, async (req, res) => {
      const body = req.body ?? {};
      if (!onlyKeys(body, ['name'])) throw errors.badRequest();
      const name = cleanDisplayName(typeof body.name === 'string' ? body.name.slice(0, 30) : body.name);
      if (name === undefined) throw errors.badRequest('학급 이름 형식이 올바르지 않아요.');
      const teacherId = ensureTeacherId(res);
      const count = await kv.zcard(`teacher:${teacherId}:classes`);
      if (count >= opt.maxClassesPerTeacher) throw errors.forbidden('만들 수 있는 학급 수를 넘었어요.');

      const classId = randomId('c_');
      let inviteCode = null;
      for (let i = 0; i < 8 && !inviteCode; i++) {
        const c = newInviteCode();
        if (await kv.set(`invite:${c}`, { classId }, { nx: true, ttlMs: opt.inviteTtlMs })) inviteCode = c;
      }
      if (!inviteCode) throw errors.internal();
      const cls = {
        classId, name: name || '우리 반', teacherId, inviteCode,
        inviteExpiresAt: new Date(now() + opt.inviteTtlMs).toISOString(), createdAt: new Date(now()).toISOString(),
      };
      await kv.set(`class:${classId}`, cls, { ttlMs: opt.classStudentTtlMs });
      await kv.zadd(`teacher:${teacherId}:classes`, now(), classId);
      res.status(201).json(publicClass(cls));
    });

    router.get('/teacher/classes', requireTeacher, async (req, res) => {
      const tid = res.locals.teacherId;
      if (!tid) return res.json({ classes: [] });
      const ids = await kv.zrange(`teacher:${tid}:classes`, 0, opt.maxClassesPerTeacher - 1);
      const classes = (await Promise.all(ids.map(id => kv.get(`class:${id}`)))).filter(c => c && c.teacherId === tid);
      res.json({ classes: classes.map(publicClass) });
    });

    router.get('/teacher/classes/:id/progress', requireTeacher, async (req, res) => {
      const cls = await loadOwnedClass(res, req.params.id);
      const sids = await kv.zrange(`class:${cls.classId}:students`, 0, opt.maxStudentsPerClass - 1);
      const students = await Promise.all(sids.map(async sid => {
        const rec = await kv.get(`stu:${sid}`);
        if (!rec || rec.classId !== cls.classId) return null;
        const p = await progress.read(sid);
        return { studentId: sid, displayName: rec.displayName, missions: p.missions, updatedAt: p.updatedAt };
      }));
      res.json({ classId: cls.classId, name: cls.name, students: students.filter(Boolean) });
    });

  }

  return { requireStudent, requireTeacher, originCheck, mount, secretError: secretErr };
}

function sessionView(rec, expMs) {
  return {
    studentId: rec.studentId, classId: rec.classId, kind: rec.kind, displayName: rec.displayName ?? null,
    expiresAt: expMs ? new Date(expMs).toISOString() : null,
  };
}

function publicClass(c) {
  return { classId: c.classId, name: c.name, inviteCode: c.inviteCode, inviteExpiresAt: c.inviteExpiresAt, createdAt: c.createdAt };
}
