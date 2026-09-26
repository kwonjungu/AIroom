// mock 이미지 공급자 — 실제 API 호출 없음. 정상·지연·실패·위조·대용량·가짜 투명·체커보드 등 시나리오를 재현한다.
// 그림은 코드로 합성한 PNG(원·그라데이션)라 수업용 품질이 아니다. 개발·테스트 전용.

import { encodePng } from '../image/codec.js';
import { ProviderError } from './errors.js';

export const MOCK_SCENARIOS = Object.freeze([
  'ok', 'slow', 'hang', 'fail', 'failOnce', 'down', 'webhook',
  'greenScreen', 'whiteBackground', 'fakeTransparent', 'checkerboard',
  'mimeForged', 'mimeHtml', 'large', 'hugePixels', 'broken', 'blank', 'cropped', 'offCenter',
]);

// ── 합성 그림 ──

function canvas(w, h, fill = [0, 0, 0, 0]) {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(fill, i * 4);
  return { width: w, height: h, data };
}
function disc(img, cx, cy, r, color) {
  const { width: w, data } = img;
  for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(img.height, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(w, Math.ceil(cx + r)); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > r) continue;
      const shade = 1 - 0.35 * (d / r);                        // 입체감(밝기 변화 → 빈 그림 아님)
      const i = (y * w + x) * 4;
      data[i] = Math.round(color[0] * shade); data[i + 1] = Math.round(color[1] * shade); data[i + 2] = Math.round(color[2] * shade); data[i + 3] = 255;
    }
  }
  // 눈 두 개
  for (const ex of [-0.3, 0.3]) {
    const exx = cx + ex * r, eyy = cy - 0.2 * r, er = r * 0.1;
    for (let y = Math.floor(eyy - er); y < eyy + er; y++) for (let x = Math.floor(exx - er); x < exx + er; x++) {
      if (x < 0 || y < 0 || x >= w || y >= img.height || Math.hypot(x - exx, y - eyy) > er) continue;
      const i = (y * w + x) * 4; data[i] = 20; data[i + 1] = 20; data[i + 2] = 40; data[i + 3] = 255;
    }
  }
  return img;
}

/** 공개: 테스트가 직접 쓰는 합성 이미지들 */
export const mockImages = {
  sprite(size = 256, { color = [255, 140, 60], cx = 0.5, cy = 0.5, r = 0.32, bg = [0, 0, 0, 0] } = {}) {
    return disc(canvas(size, size, bg), size * cx, size * cy, size * r, color);
  },
  background(w = 512, h = 288) {
    const img = canvas(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      img.data[i] = 90 + Math.round(100 * y / h); img.data[i + 1] = 160 + Math.round(60 * x / w); img.data[i + 2] = 230; img.data[i + 3] = 255;
    }
    disc(img, w * 0.8, h * 0.25, h * 0.12, [255, 220, 90]);
    return img;
  },
  checkerboard(size = 256, cell = 16) {
    const img = canvas(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const v = ((x / cell | 0) + (y / cell | 0)) % 2 ? 204 : 255;
      img.data.set([v, v, v, 255], (y * size + x) * 4);
    }
    return disc(img, size / 2, size / 2, size * 0.3, [80, 170, 255]);
  },
  noisyOpaque(size = 256) {
    const img = canvas(size, size);
    let s = 7;
    for (let i = 0; i < size * size; i++) { s = (s * 1103515245 + 12345) >>> 0; const v = 60 + (s >>> 24) % 160; img.data.set([v, (v * 3) % 256, 255 - v, 255], i * 4); }
    return disc(img, size / 2, size / 2, size * 0.3, [240, 90, 90]);
  },
};

export function pngBytes(img, opts) { return new Uint8Array(encodePng(img, opts)); }

/** IHDR만 거대한 크기로 선언한 PNG (디코딩 폭탄 모사) */
export function hugePngHeader() {
  const small = Buffer.from(pngBytes(mockImages.sprite(64)));
  small.writeUInt32BE(20000, 16); small.writeUInt32BE(20000, 20);
  return new Uint8Array(small); // CRC는 틀리지만 크기 검사가 먼저 거부해야 한다
}

function imageFor(req, scenario) {
  const bg = req.width !== req.height;
  const w = bg ? 512 : 256, h = bg ? Math.round(512 * req.height / req.width) : 256;
  switch (scenario) {
    case 'greenScreen': return pngBytes(mockImages.sprite(256, { bg: [0, 255, 0, 255] }), { opaque: true });
    case 'whiteBackground': return pngBytes(mockImages.sprite(256, { bg: [255, 255, 255, 255] }), { opaque: true });
    case 'fakeTransparent': return pngBytes(mockImages.noisyOpaque(256), { opaque: true });
    case 'checkerboard': return pngBytes(mockImages.checkerboard(256), { opaque: true });
    case 'blank': return pngBytes(canvas(256, 256));
    case 'cropped': return pngBytes(mockImages.sprite(256, { r: 0.7 }));
    case 'offCenter': return pngBytes(mockImages.sprite(256, { cx: 0.2, cy: 0.2, r: 0.15 }));
    case 'mimeForged': return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
    case 'mimeHtml': return new TextEncoder().encode('<!doctype html><html><script>alert(1)</script></html>');
    case 'large': { const b = new Uint8Array(5 * 1024 * 1024); b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); return b; }
    case 'hugePixels': return hugePngHeader();
    case 'broken': { const ok = pngBytes(mockImages.sprite(128)); return ok.slice(0, Math.floor(ok.length * 0.6)); }
    default: return bg ? pngBytes(mockImages.background(w, h), { opaque: true }) : pngBytes(mockImages.sprite(256));
  }
}

/**
 * @param {{ scenario?: string, sequence?: string[], costMicroUsd?: number, transparent?: boolean, readyAfterPolls?: number, live?: boolean }} [o]
 *   sequence: 호출마다 다른 시나리오(없으면 scenario 고정). live:true로 유료 공급자처럼 예산을 태울 수 있다(테스트용).
 */
export function createMockProvider(o = {}) {
  const calls = [];
  const polls = new Map();       // providerJobId → poll 횟수
  const pendingReq = new Map();  // providerJobId → {req, scenario}
  let n = 0;
  const cost = o.costMicroUsd ?? 0;
  const readyAfter = o.readyAfterPolls ?? 2;
  const nextScenario = () => (o.sequence ? o.sequence[Math.min(n, o.sequence.length - 1)] : (o.scenario || 'ok'));

  const provider = {
    id: 'mock', model: 'mock-image-1', live: !!o.live,
    capabilities: { transparent: o.transparent ?? true, seed: true, referenceImages: false, maxSide: 1024, async: true, webhook: true, costPerImageMicroUsd: cost },
    calls,
    estimateCost() { return cost; },
    async generate(req, { signal } = {}) {
      const scenario = nextScenario();
      n += 1;
      calls.push({ req, scenario });
      if (signal?.aborted) throw new ProviderError('ABORTED');
      switch (scenario) {
        case 'down': throw new ProviderError('PROVIDER_DOWN', { retryable: false });
        case 'fail': throw new ProviderError('PROVIDER_ERROR', { retryable: true });
        case 'failOnce': if (calls.filter(c => c.scenario === 'failOnce').length === 1) throw new ProviderError('PROVIDER_ERROR'); break;
        case 'hang': return new Promise((_, rej) => {
          if (!signal) return; // 신호가 없으면 영원히 대기(파이프라인이 반드시 deadline을 건다)
          signal.addEventListener('abort', () => rej(new ProviderError('TIMEOUT')), { once: true });
        });
        case 'slow': case 'webhook': {
          const id = `mock_${n}_${req.jobRef || 'x'}`;
          polls.set(id, 0);
          pendingReq.set(id, { req, scenario });
          return { status: 'pending', providerJobId: id };
        }
        default: break;
      }
      return { status: 'done', bytes: imageFor(req, scenario), declaredMime: 'image/png', costMicroUsd: cost };
    },
    async poll(providerJobId) {
      const p = pendingReq.get(providerJobId);
      if (!p) throw new ProviderError('UNKNOWN_JOB', { retryable: false });
      if (p.scenario === 'webhook') return { status: 'pending', providerJobId }; // webhook으로만 완료
      const k = (polls.get(providerJobId) || 0) + 1;
      polls.set(providerJobId, k);
      if (k < readyAfter) return { status: 'pending', providerJobId };
      return { status: 'done', bytes: imageFor(p.req, 'ok'), declaredMime: 'image/png', costMicroUsd: cost };
    },
    /** 테스트: webhook 본문을 만든다(서명은 파이프라인 쪽 HMAC) */
    webhookBody(providerJobId, eventId = 'evt_' + providerJobId) {
      const p = pendingReq.get(providerJobId);
      const bytes = imageFor(p ? p.req : { width: 1, height: 1 }, 'ok');
      return { eventId, providerJobId, status: 'done', mime: 'image/png', dataBase64: Buffer.from(bytes).toString('base64') };
    },
    parseWebhook(body) {
      if (!body || typeof body.eventId !== 'string' || typeof body.providerJobId !== 'string') throw new ProviderError('BAD_WEBHOOK', { retryable: false });
      if (body.status !== 'done') return { eventId: body.eventId, providerJobId: body.providerJobId, result: { status: 'failed', code: String(body.code || 'PROVIDER_ERROR') } };
      return { eventId: body.eventId, providerJobId: body.providerJobId, result: { status: 'done', bytes: new Uint8Array(Buffer.from(String(body.dataBase64 || ''), 'base64')), declaredMime: body.mime, costMicroUsd: cost } };
    },
  };
  return provider;
}
