// 자체 QR 인코더(public/recruitment/qr.js) 회귀 테스트.
// 외부 CDN 을 못 쓰는 환경이라 직접 구현했으므로, 표준 디코더로 되읽어 확인한다.
// jsqr / sharp 가 없으면 건너뛴다(운영 의존성이 아니라 검증용이라 devDependency 로도 넣지 않았다).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let jsQR, sharp;
try { jsQR = require('jsqr'); sharp = require('sharp'); } catch { /* 아래에서 skip */ }

function loadEncoder() {
    const src = fs.readFileSync(path.join(__dirname, '../../public/recruitment/qr.js'), 'utf8');
    const sandbox = { window: {}, unescape };
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);
    return sandbox.window.SimpleQR;
}

async function decode(svg) {
    const png = await sharp(Buffer.from(svg))
        .resize(512, 512, { kernel: 'nearest' }).ensureAlpha().raw()
        .toBuffer({ resolveWithObject: true });
    const result = jsQR(new Uint8ClampedArray(png.data), png.info.width, png.info.height);
    return result && result.data;
}

const hex = n => Array.from({ length: n }, (_, i) => '0123456789abcdef'[(i * 7 + 3) % 16]).join('');
const invite = id => `https://a-iroom.vercel.app/recruitment?id=${id}#invite=${hex(64)}`;

test('QR 인코더', { skip: jsQR && sharp ? false : 'jsqr/sharp 미설치' }, async t => {
    const QR = loadEncoder();

    await t.test('초대 링크를 그대로 되읽는다', async () => {
        for (const url of [invite('r_abc123'), invite('a5f84749-c322-443e-9000-7bee39f072a7'), invite('r'.repeat(40))]) {
            assert.strictEqual(await decode(QR.toSVG(url)), url, url.slice(0, 60));
        }
    });

    await t.test('한글도 UTF-8 로 왕복한다', async () => {
        assert.strictEqual(await decode(QR.toSVG('백암초 인사위원 채점')), '백암초 인사위원 채점');
    });

    await t.test('용량을 넘으면 던진다', () => {
        assert.throws(() => QR.toSVG('x'.repeat(400)), /용량 초과/);
    });

    await t.test('SVG 는 외부 자원을 참조하지 않는다', () => {
        const svg = QR.toSVG(invite('r1'));
        assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
        assert.doesNotMatch(svg, /<image|href=|url\(/, '외부 참조가 섞이면 CSP 에서 막힌다');
    });
});
