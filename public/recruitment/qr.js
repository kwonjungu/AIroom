// 최소 QR 코드 생성기 — 바이트 모드, 오류정정 M 고정.
// 외부 CDN 을 못 쓰는 환경이라(브라우저 차단 사례 있음) 필요한 부분만 직접 구현했다.
// 초대 링크(약 60~90바이트)를 담으려고 버전 4~10 을 자동으로 고른다.
(function (global) {
    'use strict';

    // ── 갈루아 필드 GF(256) 로그/역로그 테이블 (리드-솔로몬용)
    const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
    for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

    // 생성 다항식
    function rsPoly(degree) {
        let poly = [1];
        for (let i = 0; i < degree; i++) {
            const next = new Array(poly.length + 1).fill(0);
            for (let j = 0; j < poly.length; j++) {
                next[j] ^= poly[j];
                next[j + 1] ^= mul(poly[j], EXP[i]);
            }
            poly = next;
        }
        return poly;
    }
    function rsEncode(data, ecLen) {
        const gen = rsPoly(ecLen), res = new Array(ecLen).fill(0);
        for (const byte of data) {
            const factor = byte ^ res[0];
            res.shift(); res.push(0);
            for (let i = 0; i < ecLen; i++) res[i] ^= mul(gen[i + 1], factor);
        }
        return res;
    }

    // ── 버전별 스펙 (오류정정 M): [총 코드워드, EC 코드워드/블록, 블록1 수, 블록1 데이터, 블록2 수, 블록2 데이터]
    const SPEC = {
        4:  [100, 18, 2, 32, 0, 0],
        5:  [134, 24, 2, 43, 0, 0],
        6:  [172, 16, 4, 27, 0, 0],
        7:  [196, 18, 4, 31, 0, 0],
        8:  [242, 22, 2, 38, 2, 39],
        9:  [292, 22, 3, 36, 2, 37],
        10: [346, 26, 4, 43, 1, 44],
    };
    const ALIGN = { 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
    // 버전 7 이상은 버전 정보 블록이 필요하다 (BCH(18,6) 미리 계산)
    const VERSION_BITS = { 7: 0x07C94, 8: 0x085BC, 9: 0x09A99, 10: 0x0A4D3 };
    // 포맷 정보: 오류정정 M(0b00) + 마스크 0 → BCH(15,5)
    const FORMAT_M0 = 0x5412;

    function capacity(version) {
        const [total, ecLen, b1, d1, b2, d2] = SPEC[version];
        return b1 * d1 + b2 * d2;
    }

    function toBytes(str) {
        const out = [];
        for (const ch of unescape(encodeURIComponent(str))) out.push(ch.charCodeAt(0));
        return out;
    }

    function buildData(bytes, version) {
        const dataWords = capacity(version);
        const bits = [];
        const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
        push(0b0100, 4);                                   // 바이트 모드
        push(bytes.length, version < 10 ? 8 : 16);         // 길이 (버전 1~9 는 8비트)
        for (const b of bytes) push(b, 8);
        // 종료 패턴 + 바이트 정렬
        for (let i = 0; i < 4 && bits.length < dataWords * 8; i++) bits.push(0);
        while (bits.length % 8) bits.push(0);
        const words = [];
        for (let i = 0; i < bits.length; i += 8) {
            let v = 0; for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
            words.push(v);
        }
        // 패딩 (0xEC / 0x11 반복)
        const PAD = [0xEC, 0x11];
        for (let i = 0; words.length < dataWords; i++) words.push(PAD[i % 2]);

        // 블록 분할 → 인터리브
        const [, ecLen, b1, d1, b2, d2] = SPEC[version];
        const blocks = [], ecBlocks = [];
        let pos = 0;
        for (let i = 0; i < b1; i++) { const blk = words.slice(pos, pos + d1); pos += d1; blocks.push(blk); ecBlocks.push(rsEncode(blk, ecLen)); }
        for (let i = 0; i < b2; i++) { const blk = words.slice(pos, pos + d2); pos += d2; blocks.push(blk); ecBlocks.push(rsEncode(blk, ecLen)); }
        const out = [];
        const maxData = Math.max(d1, d2);
        for (let i = 0; i < maxData; i++) for (const blk of blocks) if (i < blk.length) out.push(blk[i]);
        for (let i = 0; i < ecLen; i++) for (const blk of ecBlocks) out.push(blk[i]);
        return out;
    }

    function makeMatrix(version, codewords) {
        const size = version * 4 + 17;
        const m = Array.from({ length: size }, () => new Array(size).fill(null)); // null = 미배치
        const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

        const setFn = (row, col, val) => { if (row >= 0 && row < size && col >= 0 && col < size) { m[row][col] = val; reserved[row][col] = true; } };

        // 파인더 패턴 3개 + 분리자
        for (const [r0, c0] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
            for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
                const inner = r >= 0 && r <= 6 && c >= 0 && c <= 6;
                const on = inner && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
                setFn(r0 + r, c0 + c, on ? 1 : 0);
            }
        }
        // 타이밍 패턴
        for (let i = 8; i < size - 8; i++) { setFn(6, i, i % 2 === 0 ? 1 : 0); setFn(i, 6, i % 2 === 0 ? 1 : 0); }
        // 정렬 패턴
        const centers = ALIGN[version] || [];
        for (const r of centers) for (const c of centers) {
            if ((r <= 7 && c <= 7) || (r <= 7 && c >= size - 8) || (r >= size - 8 && c <= 7)) continue;
            for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
                const on = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
                setFn(r + dr, c + dc, on ? 1 : 0);
            }
        }
        // 다크 모듈
        setFn(size - 8, 8, 1);
        // 포맷 정보 자리 예약
        for (let i = 0; i <= 8; i++) { if (i !== 6) { reserved[8][i] = true; reserved[i][8] = true; } }
        for (let i = 0; i < 8; i++) { reserved[8][size - 1 - i] = true; reserved[size - 1 - i][8] = true; }
        // 버전 정보 자리 예약 (7 이상)
        if (version >= 7) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { reserved[i][size - 11 + j] = true; reserved[size - 11 + j][i] = true; }

        // 데이터 배치 (오른쪽 아래 → 지그재그 위로)
        let bitIdx = 0;
        const totalBits = codewords.length * 8;
        const bitAt = i => (codewords[i >> 3] >> (7 - (i & 7))) & 1;
        let upward = true;
        for (let col = size - 1; col > 0; col -= 2) {
            if (col === 6) col--; // 타이밍 열 건너뛰기
            for (let i = 0; i < size; i++) {
                const row = upward ? size - 1 - i : i;
                for (const c of [col, col - 1]) {
                    if (reserved[row][c]) continue;
                    let bit = bitIdx < totalBits ? bitAt(bitIdx) : 0;
                    bitIdx++;
                    // 마스크 0: (row + col) % 2 === 0
                    if ((row + c) % 2 === 0) bit ^= 1;
                    m[row][c] = bit;
                }
            }
            upward = !upward;
        }

        // 포맷 정보 기록 (마스크 0, EC M)
        const fmt = FORMAT_M0;
        for (let i = 0; i <= 5; i++) m[8][i] = (fmt >> (14 - i)) & 1;
        m[8][7] = (fmt >> 8) & 1; m[8][8] = (fmt >> 7) & 1; m[7][8] = (fmt >> 6) & 1;
        for (let i = 9; i <= 14; i++) m[14 - i][8] = (fmt >> (14 - i)) & 1;
        for (let i = 0; i <= 7; i++) m[size - 1 - i][8] = (fmt >> (14 - i)) & 1;
        for (let i = 8; i <= 14; i++) m[8][size - 15 + i] = (fmt >> (14 - i)) & 1;

        // 버전 정보 (7 이상)
        if (version >= 7) {
            const vb = VERSION_BITS[version];
            for (let i = 0; i < 18; i++) {
                const bit = (vb >> i) & 1;
                m[Math.floor(i / 3)][size - 11 + (i % 3)] = bit;
                m[size - 11 + (i % 3)][Math.floor(i / 3)] = bit;
            }
        }
        return m;
    }

    // 공개 API: 문자열 → SVG 문자열
    function toSVG(text, opts) {
        const o = opts || {};
        const px = o.size || 128;
        const bytes = toBytes(text);
        let version = 0;
        for (const v of [4, 5, 6, 7, 8, 9, 10]) {
            // 모드(4) + 길이(8) + 데이터 + 종료(4) 가 들어가야 한다
            if (capacity(v) * 8 >= 4 + 8 + bytes.length * 8 + 4) { version = v; break; }
        }
        if (!version) throw new Error('QR 용량 초과: ' + bytes.length + '바이트');

        const m = makeMatrix(version, buildData(bytes, version));
        const size = m.length, quiet = 4, total = size + quiet * 2;
        let path = '';
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
            if (m[r][c]) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="QR 코드">`
            + `<rect width="${total}" height="${total}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
    }

    global.SimpleQR = { toSVG };
})(window);
