// 쭘 변환 엔진이 쓰는 외부 코드·글꼴의 주소, 고정 버전, 해시를 이 파일 한 곳에 둔다.
// 해시는 2026-11-25 에 jsDelivr 와 unpkg 에서 받은 파일이 서로 같음을 확인한 값이다.
// 주소를 바꿀 때는 해시도 같이 바꾼다. 해시가 다르면 변환기는 HASH_MISMATCH 로 멈춘다.
// 시험·비상용으로 globalThis.ZZOOM_VENDOR_OVERRIDE 에 같은 모양의 객체를 두면 덮어쓴다.

const JSD = 'https://cdn.jsdelivr.net/npm/';
const UNP = 'https://unpkg.com/';

// 1순위 jsDelivr(brotli 로 8.4MB, 측정 0.4초), 2순위 unpkg(gzip 10.5MB, 측정 2.6초).
// 해시로 묶을 수 있는 한 파일(rhwp·pdf.js 본체·글꼴)만 CDN 에서 받는다.
const both = (path) => [JSD + path, UNP + path];
// 같은 출처 고정 배포본(public/zzoom/vendor/). 파일마다 sha256 이 manifest.json 에 있고 시험이 확인한다(지적11).
// 여러 파일이 서로를 상대 경로로 부르는 묶음(silurus 조각·pdf.js 보조 자료)은 CDN 해시로 묶을 수 없어서 이쪽으로 옮겼다.
const LOCAL = (path) => new URL('../vendor/' + path, import.meta.url).href;

export const VENDOR_DEFAULT = {
  rhwp: {
    version: '0.9.1',
    js: both('@rhwp/core@0.9.1/rhwp.js'),
    jsSha256: '75eaf7070854c66d31b2223558a4128d05d00dff46b51051ec943cfe250c6365',
    wasm: both('@rhwp/core@0.9.1/rhwp_bg.wasm'),
    wasmSha256: 'e2e56dfd387ffee5b0995d23e4a0086001407f12a045820eb61bd6a506c9abc1',
    wasmBytes: 27882066,
  },
  pdfjs: {
    version: '6.5.438',
    lib: both('pdfjs-dist@6.5.438/build/pdf.min.mjs'),
    libSha256: '3a88402882cfa3e7e72c2c9b5149f52f0f88baf1c5b62aa11a41abdbc2072440',
    worker: both('pdfjs-dist@6.5.438/build/pdf.worker.min.mjs'),
    workerSha256: '1e64c8240e54735ec5913b37acd5134747799cb8c6bb3777c70adbc01232d2aa',
    // 글꼴 없는 PDF 의 한글 cmap·표준 글꼴·JBIG2/JPX wasm·ICC. 같은 출처 고정본(manifest.json 해시).
    base: LOCAL('pdfjs-dist-6.5.438/'),
  },
  silurus: {
    // @silurus/ooxml 0.90.2 (MIT). 진입 파일 pptx.mjs(1197B)가 같은 폴더의 조각 파일 91개를 상대 경로로 부른다.
    // 조각까지 해시로 묶으려고 npm 원본 dist 중 pptx.mjs 가 닿는 파일 전부를 같은 출처에 둔다(manifest.json, 지적11).
    // 진입 파일과 WASM 은 받을 때도 해시를 확인한다.
    version: '0.90.2',
    entry: [LOCAL('silurus-ooxml-0.90.2/pptx.mjs')],
    entrySha256: '1d8255979b80349ae58402b4ab75049bb0bb565ca0d53a3c3f0420aab5122c69',
    wasm: [LOCAL('silurus-ooxml-0.90.2/pptx_parser_bg.wasm'), ...both('@silurus/ooxml@0.90.2/dist/pptx_parser_bg.wasm')],
    wasmSha256: '89f8d41a91fb5e574a2a6d2f58163e831367a305346590d1b41da891a8e380d8',
    wasmBytes: 2030801,
  },
  // Noto Sans KR · Noto Serif KR (SIL OFL 1.1, @fontsource 5.3.1). 한글 전체 'korean' + 'latin' + 'latin-ext'.
  // 함초롬체 재배포 조건이 확실하지 않아 쓰지 않는다. 한글 글자는 모두 'korean' 파일 안에 있다.
  fonts: [
    ['Noto Sans KR', 400, 'noto-sans-kr', 'korean', '809450f0b886d49a453c91a95908834ddff32a1b4ffea610a4a23128002a7296'],
    ['Noto Sans KR', 400, 'noto-sans-kr', 'latin', 'd45129ae032c4b94cd598f26d69bd0ce11e72b423a77883f01f481b39e8d3ac1'],
    ['Noto Sans KR', 400, 'noto-sans-kr', 'latin-ext', '0fea49522d92fc679a74d609711413267b59219a01d0f247cc0a73b6599e8bca'],
    ['Noto Sans KR', 700, 'noto-sans-kr', 'korean', '419a46fa75b0c492aa18218ff8c2d36221ad182cfa3db96a535c0e734961228b'],
    ['Noto Sans KR', 700, 'noto-sans-kr', 'latin', '2e07c0443f54ec3e9096dd64274234304bc351f68b2a610013c1841f83734852'],
    ['Noto Sans KR', 700, 'noto-sans-kr', 'latin-ext', '4bcc7d14afd5d766c0579bd67c088600e9b3e054b889346fdaa8e28732dc0311'],
    ['Noto Serif KR', 400, 'noto-serif-kr', 'korean', 'c9a1e3ac69994d680883b53b1fd83d520733b704792522a932bfaa276117de45'],
    ['Noto Serif KR', 400, 'noto-serif-kr', 'latin', 'b02203d9be35c7fa0457605f78cc0ff861b8330429beffdffa170c68ca702447'],
    ['Noto Serif KR', 400, 'noto-serif-kr', 'latin-ext', '106b1991df8ae8af2b2e7bba616eb395722f9e56e7b704d74feb88f28966d4ca'],
    ['Noto Serif KR', 700, 'noto-serif-kr', 'korean', '504d6af6abb882acd912d47bafa383c4512a6c8c33635e4e8fb37111d9310941'],
    ['Noto Serif KR', 700, 'noto-serif-kr', 'latin', 'fb6e6a582960565cc33339659e32b1dea2530b91d9a058fb488a730424a96d3f'],
    ['Noto Serif KR', 700, 'noto-serif-kr', 'latin-ext', '0d0447ca95bb15eaa653a3c5a97516736a0fb7d821b4afbc2f31f9b913770f5a'],
  ].map(([family, weight, slug, subset, sha256]) => ({
    family, weight, sha256,
    urls: both(`@fontsource/${slug}@5.3.1/files/${slug}-${subset}-${weight}-normal.woff2`),
  })),
};

export function getVendor() {
  const o = globalThis.ZZOOM_VENDOR_OVERRIDE;
  if (!o) return VENDOR_DEFAULT;
  return { ...VENDOR_DEFAULT, ...o, rhwp: { ...VENDOR_DEFAULT.rhwp, ...(o.rhwp || {}) },
    pdfjs: { ...VENDOR_DEFAULT.pdfjs, ...(o.pdfjs || {}) },
    silurus: { ...VENDOR_DEFAULT.silurus, ...(o.silurus || {}) } };
}
