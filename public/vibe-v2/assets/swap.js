// 에셋 도착 → 외형 교체 계획 (순수 함수, 브라우저·Node 공용). WP6.
//
// 원칙 (HARNESS §6.2, AS04·AS05):
//  - 이미지 완료를 기다리며 게임을 멈추지 않는다. 그동안은 지금 preset(이모지·색)이 placeholder다.
//  - 게임 중(playing)에 도착하면 바로 바꾸지 않고 미뤘다가(defer) 일시정지·다음 시작 때 외형만 바꾼다.
//  - 바꾸는 것은 project.assets의 해당 slot 한 줄뿐. program(collider·속도·점수·규칙)은 절대 건드리지 않는다.
//  - 요청 뒤 슬롯이 바뀌었거나(다른 preset/asset) 지워졌거나 요청이 취소됐으면 자동 반영하지 않는다(keep-only = 보관만).
//  - 조건을 모두 만족해도 결과는 "후보 제안"이다. 실제 반영은 호출자가 store로 한다(자동 덮어쓰기 금지).

/** @typedef {{slotId:string, assetId:string|null, preset:string|null}} AssetRef */
/**
 * @typedef {{
 *   status: string, slotId: string, cancelled?: boolean,
 *   requestedFrom: {assetId:string|null, preset:string|null} | null,
 *   candidate: {assetId:string|null, preset:string|null, url?:string|null} | null
 * }} ArrivedAsset
 */

export const RUNNING_STATES = Object.freeze(['playing']);

export function slotLook(assets, slotId) {
  const a = (assets || []).find(x => x && x.slotId === slotId);
  return a ? { assetId: a.assetId ?? null, preset: a.preset ?? null } : null;
}

const sameLook = (a, b) => !!a && !!b && (a.assetId ?? null) === (b.assetId ?? null) && (a.preset ?? null) === (b.preset ?? null);

/**
 * 자동 반영(후보 제안) 가능 여부.
 * @param {ArrivedAsset} arrived
 * @param {AssetRef[]} currentAssets
 * @returns {{applicable:boolean, reason:string}}
 */
export function checkApplicable(arrived, currentAssets) {
  if (!arrived || arrived.status !== 'ready') return { applicable: false, reason: 'NOT_READY' };
  if (arrived.cancelled || arrived.status === 'cancelled') return { applicable: false, reason: 'CANCELLED' };
  const c = arrived.candidate;
  if (!c || (!c.assetId && !c.preset)) return { applicable: false, reason: 'NO_CANDIDATE' };
  const cur = slotLook(currentAssets, arrived.slotId);
  if (!cur) return { applicable: false, reason: 'SLOT_REMOVED' };
  if (c.assetId ? cur.assetId === c.assetId : (!cur.assetId && cur.preset === c.preset)) return { applicable: false, reason: 'ALREADY_APPLIED' };
  if (!sameLook(cur, arrived.requestedFrom)) return { applicable: false, reason: 'SLOT_CHANGED' };
  return { applicable: true, reason: 'OK' };
}

/**
 * @param {AssetRef[]} currentAssets
 * @param {ArrivedAsset} arrived
 * @param {string|{state:string}|null} runtimeState  RuntimeSnapshot.state (ready|playing|paused|won|lost|halted) 또는 null(실행 안 함)
 * @returns {{action:'apply-now'|'defer'|'keep-only'|'ignore', reason:string, nextAssets?:AssetRef[], resolverAdd?:Record<string,string>}}
 */
export function planSwap(currentAssets, arrived, runtimeState) {
  if (!arrived || arrived.status !== 'ready') return { action: 'ignore', reason: arrived?.status === 'cancelled' ? 'CANCELLED' : 'NOT_READY' };
  const chk = checkApplicable(arrived, currentAssets);
  if (!chk.applicable) return { action: chk.reason === 'ALREADY_APPLIED' ? 'ignore' : 'keep-only', reason: chk.reason };
  const state = typeof runtimeState === 'string' ? runtimeState : runtimeState?.state ?? null;
  const resolverAdd = arrived.candidate.assetId && arrived.candidate.url ? { [arrived.candidate.assetId]: arrived.candidate.url } : {};
  if (RUNNING_STATES.includes(state)) return { action: 'defer', reason: 'GAME_RUNNING', resolverAdd };
  return { action: 'apply-now', reason: 'OK', nextAssets: applySwap(currentAssets, arrived), resolverAdd };
}

/**
 * 해당 slot의 외형만 바꾼 새 assets 배열 (원본 불변). 생성 에셋은 preset을 fallback으로 남긴다.
 * @returns {AssetRef[]}
 */
export function applySwap(currentAssets, arrived) {
  const chk = checkApplicable(arrived, currentAssets);
  if (!chk.applicable) throw new Error('swap not applicable: ' + chk.reason);
  const c = arrived.candidate;
  return currentAssets.map(a => {
    if (a.slotId !== arrived.slotId) return { ...a };
    return c.assetId
      ? { slotId: a.slotId, assetId: c.assetId, preset: a.preset }      // 이미지 실패 시 preset으로 그린다
      : { slotId: a.slotId, assetId: null, preset: c.preset };
  });
}

/** createAssetResolver(assets, map)에 넘길 url 맵 = 승인 manifest.urls + 도착한 생성 에셋 */
export function mergeResolverMap(baseUrls, arrivedList = []) {
  const out = { ...(baseUrls || {}) };
  for (const a of arrivedList) {
    const c = a?.candidate;
    if (a?.status === 'ready' && c?.assetId && typeof c.url === 'string' && isSafeAssetUrl(c.url)) out[c.assetId] = c.url;
  }
  return out;
}

/** 같은 출처 상대 경로만 허용 (임의 원격 URL을 캔버스에 불러오지 않는다) */
export function isSafeAssetUrl(u) {
  return typeof u === 'string' && /^\/(api\/vibe\/assets\/files\/ga_[a-f0-9]{32}(\?size=(128|256|512))?|assets\/vibe\/[a-z0-9-]+\.(png|jpg|svg))$/.test(u);
}

/**
 * placeholder 규칙: 생성 중에는 지금 모습을 그대로 둔다. 지금 모습이 없으면 종류별 기본값.
 * 스프라이트 null → 렌더러가 slot 이름 색 원으로 그린다. 배경 → 'bg-sky'.
 */
export function placeholderFor(kind, currentLook, matchPlaceholder = null) {
  if (currentLook && (currentLook.assetId || currentLook.preset)) return currentLook.preset ?? null;
  if (matchPlaceholder) return matchPlaceholder;
  return kind === 'background' ? 'bg-sky' : null;
}

/**
 * 미뤄 둔 교체 대기열. 게임 중 도착한 에셋을 모아 두었다가 일시정지·다음 시작 때 flush.
 * flush 시점에 다시 checkApplicable로 검사한다(그 사이 슬롯이 바뀌었으면 보관만).
 */
export function createSwapQueue() {
  const pending = new Map(); // slotId → arrived (슬롯당 가장 최근 것만)
  return {
    offer(currentAssets, arrived, runtimeState) {
      const plan = planSwap(currentAssets, arrived, runtimeState);
      if (plan.action === 'defer') pending.set(arrived.slotId, arrived);
      return plan;
    },
    /** @returns {{nextAssets:AssetRef[], applied:string[], kept:{slotId:string, reason:string}[], resolverAdd:Record<string,string>}} */
    flush(currentAssets, runtimeState) {
      let assets = currentAssets;
      const applied = [], kept = [], resolverAdd = {};
      for (const [slotId, arrived] of [...pending]) {
        const plan = planSwap(assets, arrived, runtimeState);
        if (plan.action === 'defer') continue;
        pending.delete(slotId);
        if (plan.action === 'apply-now') { assets = plan.nextAssets; applied.push(slotId); Object.assign(resolverAdd, plan.resolverAdd); }
        else kept.push({ slotId, reason: plan.reason });
      }
      return { nextAssets: assets, applied, kept, resolverAdd };
    },
    size() { return pending.size; },
    clear() { pending.clear(); },
  };
}
