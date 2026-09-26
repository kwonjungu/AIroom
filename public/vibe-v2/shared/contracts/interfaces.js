// 모듈 간 인터페이스 (JSDoc 전용, 런타임 코드 없음). WP0 소유 — 변경은 통합 담당 승인 후.

/**
 * 모드 생명주기. modes/<name>/index.js 는 `export function createMode(ctx): ModeInstance` 를 제공한다.
 * @typedef {Object} ModeInstance
 * @property {(root: HTMLElement) => void} enter   화면 부착. 두 번 호출 금지.
 * @property {() => void} pause                     실행·소리·타이머 정지 (탭 숨김, 다른 패널 전환)
 * @property {() => void} resume
 * @property {() => void} dispose                   모든 리스너·타이머·rAF·AI 요청 해제. 이후 root 비움.
 */

/**
 * createMode에 전달되는 문맥.
 * @typedef {Object} ModeContext
 * @property {ReturnType<import('../../state/store.js').createProjectStore>} store
 * @property {'low'|'mid'|'high'} grade        low=1~2학년 카드 코딩, mid=3~4, high=5~6 (UI 프리셋일 뿐 잠금 아님)
 * @property {ShellApi} shell
 * @property {GenerationClient} generation
 * @property {{ get(key:string): any, set(key:string, v:any): void }} prefs   음소거·속도·reduce motion 등
 * @property {object|null} mission             학습 미션 데이터 (자유 제작이면 null)
 */

/**
 * WP1 공통 셸이 모드에 제공하는 API. 모드는 셸 DOM을 직접 건드리지 않는다.
 * @typedef {Object} ShellApi
 * @property {(step: 'think'|'make'|'try'|'change'|'save') => void} setStep       작업 단계 ①~⑤ 표시
 * @property {(state: 'idle'|'preparing'|'assembling'|'checking'|'done'|'failed') => void} setAiStatus   AI 처리 상태 (단계와 별개)
 * @property {(msg: {text:string, tone?:'info'|'hint'|'success'|'warn', actions?:{label:string, onClick:()=>void}[]}) => void} say   한 번에 한 문장 안내
 * @property {(opts: {title:string, body:HTMLElement|string, actions:{label:string, onClick:()=>void, primary?:boolean}[]}) => {close():void}} dialog   접근 가능한 dialog (focus 복원)
 * @property {() => HTMLElement} stageSlot     무대(목표/내 그림/게임) 영역
 * @property {() => HTMLElement} editorSlot    카드·블록 편집 영역
 * @property {() => HTMLElement} assistSlot    AI·도움 영역 (좁은 화면에서는 탭)
 * @property {(onBack: () => void) => void} onBack
 */

/**
 * 생성 작업 클라이언트. 실제(서버 /api/vibe/generations)와 mock이 같은 모양이다.
 * @typedef {Object} GenerationClient
 * @property {(req: {projectId:string, baseRevision:number, intentText:string, mode:string, requestId:string, project:object}) => Promise<object>} start   Job 반환 (JobSchema)
 * @property {(jobId: string, opts?: {signal?: AbortSignal}) => Promise<object>} get                최신 Job
 * @property {(jobId: string, requestId: string) => Promise<object>} cancel                         반복 호출 안전
 * @property {(jobId: string, onUpdate: (job:object)=>void, opts?: {signal?: AbortSignal, intervalMs?: number}) => Promise<object>} watch   종결 상태까지 폴링, 최종 Job 반환
 */

/**
 * 게임 실행기 (WP4). Node 시뮬레이터와 브라우저가 같은 코드를 쓴다. DOM 없음.
 * @typedef {Object} GameRuntime
 * @property {(program: object, assets: object, seed: number) => object[]} load   Diagnostic[]
 * @property {(ev: NormalizedInput) => void} input
 * @property {(dtMs: number) => RuntimeSnapshot} step
 * @property {() => void} pause
 * @property {() => void} resume
 * @property {(seed: number) => void} reset
 * @property {() => void} dispose
 */

/**
 * @typedef {Object} NormalizedInput
 * @property {'left'|'right'|'up'|'down'|'action'} control
 * @property {boolean} pressed
 */

/**
 * @typedef {Object} RuntimeSnapshot
 * @property {number} tick
 * @property {'ready'|'playing'|'paused'|'won'|'lost'|'halted'} state   halted = 자원 상한 초과 안전 정지
 * @property {number} score
 * @property {number} lives
 * @property {number} elapsedMs
 * @property {{id:string, entity:string, x:number, y:number, r:number, slot:string}[]} entities
 * @property {{type:string, tick:number, [k:string]: any}[]} events    이번 step에서 발생한 이벤트 (collect, hit, win …)
 * @property {object[]} diagnostics
 */

export {};
