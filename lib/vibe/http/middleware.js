// requestId · JSON 크기 제한 · 오류 처리 · 비식별 로그.

import crypto from 'node:crypto';
import { LIMITS } from '../../../public/vibe-v2/shared/contracts/schemas.js';
import { ApiError, errors, sendError } from './errors.js';

const RID = /^[A-Za-z0-9_-]{8,64}$/;

export function newId(prefix, bytes = 12) {
  return prefix + crypto.randomBytes(bytes).toString('base64url');
}

/** 들어온 X-Request-Id가 안전한 형식이면 이어 쓰고, 아니면 새로 만든다. 응답 헤더에 항상 싣는다. */
export function requestIdMiddleware() {
  return (req, res, next) => {
    const incoming = String(req.get('x-request-id') || '');
    const id = RID.test(incoming) ? incoming : newId('r_');
    res.locals.requestId = id;
    res.locals.startedAt = Date.now();
    res.setHeader('X-Request-Id', id);
    next();
  };
}

/**
 * 128KB 초과 요청을 413으로 거부한다.
 * - Content-Length가 있으면 본문을 읽기 전에 거부.
 * - server.js 전역 express.json(10MB)이 이미 파싱했다면 직렬화 크기로 재검사.
 * - 아직 파싱 전이면 이 라우터 전용 express.json(limit 128KB)으로 파싱.
 */
export function jsonBodyLimit(express, maxBytes = LIMITS.apiJsonBytes) {
  const parser = express.json({ limit: maxBytes, strict: true });
  return (req, res, next) => {
    const len = Number(req.get('content-length'));
    if (Number.isFinite(len) && len > maxBytes) return next(errors.tooLarge());
    if (req.body !== undefined && req.readableEnded) { // body-parser v2: 스트림을 다 읽었으면 이미 파싱된 것
      let bytes = 0;
      try { bytes = Buffer.byteLength(JSON.stringify(req.body)); } catch { return next(errors.badRequest()); }
      if (bytes > maxBytes) return next(errors.tooLarge());
      return next();
    }
    parser(req, res, err => {
      if (!err) return next();
      if (err.type === 'entity.too.large' || err.status === 413) return next(errors.tooLarge());
      return next(errors.badRequest('JSON 형식이 올바르지 않아요.'));
    });
  };
}

/** 라우터 끝 오류 처리기. 예상치 못한 예외는 INTERNAL로 감추고 스택은 로그에만 남긴다(본문 제외). */
export function errorHandler(log) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    let e = err;
    if (!(e instanceof ApiError)) {
      if (e?.code === 'KV_VALUE_TOO_LARGE') e = errors.tooLarge('작품이 너무 커요.');
      else if (e?.type === 'entity.too.large') e = errors.tooLarge();
      else {
        log?.({ level: 'error', event: 'unhandled', requestId: res.locals.requestId, route: routeOf(req), message: String(err?.message || err).slice(0, 200) });
        e = errors.internal();
      }
    }
    if (res.headersSent) return;
    sendError(res, e);
  };
}

export function routeOf(req) {
  return `${req.method} ${(req.baseUrl || '') + (req.route?.path || req.path || '')}`;
}

/** 요청 한 줄 로그 — requestId·경로·상태·지연·비식별 학생 참조만. 본문·이름·원문 금지. */
export function accessLog(log, hashRef) {
  return (req, res, next) => {
    if (!log) return next();
    res.on('finish', () => {
      log({
        level: 'info', event: 'request', requestId: res.locals.requestId, route: routeOf(req), status: res.statusCode,
        elapsedMs: Date.now() - (res.locals.startedAt || Date.now()),
        studentRef: res.locals.student ? hashRef(res.locals.student.studentId) : null,
      });
    });
    next();
  };
}
