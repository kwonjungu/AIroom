// 지적11: 변환기가 실행하는 외부 코드는 모두 해시로 묶이거나 같은 출처의 고정 배포본이어야 한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const VENDOR_DIR = new URL('../../public/zzoom/vendor/', import.meta.url);
const sha = (u) => crypto.createHash('sha256').update(fs.readFileSync(u)).digest('hex');

test('지적11: PPTX 변환기 코드는 CDN 이 아니라 같은 출처의 고정 배포본에서 불러온다', async () => {
  const { VENDOR_DEFAULT } = await import('../../public/zzoom/convert/vendor.js');
  for (const u of [].concat(VENDOR_DEFAULT.silurus.entry)) assert.ok(!/^https?:/.test(u), `CDN 주소 금지: ${u}`);
  assert.ok(fs.existsSync(fileURLToPath(new URL([].concat(VENDOR_DEFAULT.silurus.entry)[0]))), '진입 파일이 저장소에 있다');
});

test('지적11: PDF 보조 자료(cmap·표준 글꼴·wasm)도 같은 출처 고정본을 쓴다', async () => {
  const { VENDOR_DEFAULT } = await import('../../public/zzoom/convert/vendor.js');
  assert.ok(!/^https?:/.test(VENDOR_DEFAULT.pdfjs.base), VENDOR_DEFAULT.pdfjs.base);
  for (const f of ['cmaps/KSC-EUC-H.bcmap', 'standard_fonts/FoxitSans.pfb', 'wasm/openjpeg.wasm', 'wasm/jbig2.wasm', 'wasm/qcms_bg.wasm']) {
    assert.ok(fs.existsSync(fileURLToPath(new URL(f, VENDOR_DEFAULT.pdfjs.base))), f);
  }
});

test('지적11: 고정 배포본의 모든 파일은 npm 원본 해시 목록과 같다', () => {
  const man = JSON.parse(fs.readFileSync(new URL('manifest.json', VENDOR_DIR), 'utf8'));
  const n = Object.keys(man.files).length;
  assert.ok(n > 100, `파일 ${n}개`);
  for (const [p, h] of Object.entries(man.files)) assert.equal(sha(new URL(p, VENDOR_DIR)), h, p);
  // 목록에 없는 실행 파일이 끼어들지 않았는지
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(new URL(e.name + '/', d)) : [new URL(e.name, d)]);
  const extra = walk(VENDOR_DIR).map((u) => fileURLToPath(u).slice(fileURLToPath(VENDOR_DIR).length).replace(/\\/g, '/')).filter((p) => p !== 'manifest.json' && !(p in man.files));
  assert.deepEqual(extra, []);
});
