'use strict';
// 강사 유형별 심사 기준 프리셋. 새 채용을 만들 때 평가 항목·배점·심사관점을 한 번에 채운다.
// 채용마다 r.rubrics 로 복사해 저장하므로, 여기를 고쳐도 이미 만든 채용의 점수는 바뀌지 않는다.
//
// 항목(criterion)의 kind 는 원본 심사표의 '심사관점' 칸을 위원이 어떻게 쓰는지에 맞춘다.
//   pick  : 해당하는 관점 한 줄을 고른다(택1). 점수 = 그 줄의 점수. 학력처럼 구간이 나뉜 항목.
//   sum   : 해당하는 줄을 모두 고르고 더한다. unit 이 있는 줄(건당·1년당)은 개수를 넣는다.
//           합계는 항목 배점에서 자른다. 자격증·경력처럼 쌓이는 항목.
//   judge : 관점(guide 의 줄)을 보고 위원이 0~배점 사이에서 직접 매긴다. 면접·자기소개서.
// 기준이 다른 유형이 생기면 SHEET 같은 기준 묶음을 하나 더 만들어 PRESETS 에 붙인다. id 는 바꾸지 않는다.
const SHEET = {
    source: '강사 채용 프로그램 심사표(KHSDO) 서류·면접 심사관점 — 영역마다 같은 기준',
    // 청렴서약서 항목(원본 문구 그대로). 위원 서명 화면과 출력물에 같은 글이 나간다.
    pledge: [
        '객관적이고 공정한 평가를 위하여 방과후학교 계약업체 또는 입찰참가업체(개인위탁강사)의 임직원, 임직원의 배우자, 형제자매, 직계존속, 직계비속이 아님을 확인합니다.(자필 서명)',
        '제안서 평가와 관련하여 관련 업체(개인위탁강사)로부터 어떠한 경우에도 금품·향응·편의 등(친인척 등에 대한 부정한 취업 제공 포함)을 수수하거나 제공받지 않을 것이며, 이러한 상황이 발생하면 사업부서에 통보하여 공정한 평가가 이루어지도록 하겠습니다.',
        '업무상 취득한 비밀을 준수하고 보안관계 규정 및 지침을 성실히 수행하겠습니다.',
        '평가와 관련하여 알게 된 업무상 비밀을 타인에게 누설하지 않겠으며, 업무상 취득한 비밀을 누설할 때에는 관계 법규에 따라 처벌을 받는 것에 이의를 제기하지 않겠습니다.'
    ],
    rubrics: {
        document: [
            { label: '강사 자격 기준 학위 취득 및 동등 이상의 학력', max: 6, kind: 'pick', options: [
                { label: '채용 관련 전공 대학원 졸업', points: 6 },
                { label: '채용 관련 전공 대학 졸업(4년제)', points: 5 },
                { label: '채용 관련 전공 대학 졸업(2년제)', points: 4 },
                { label: '일반 대학원 및 대학 졸업(4년제 이상)', points: 3 },
                { label: '일반 대학원 및 대학 졸업(2년제)', points: 2 },
                { label: '학력 인정 범위 내 기타 과정', points: 1 }
            ] },
            { label: '자격증 소지', max: 6, kind: 'sum', options: [
                { label: '초등 교원자격증', points: 3 },
                { label: '유치원 교원자격증', points: 2 },
                { label: '중등 교원자격증', points: 1 },
                { label: '채용 관련 자격증 건당', points: 1, unit: '건' }
            ] },
            { label: '강사 경력', max: 6, kind: 'sum', options: [
                { label: '1년당', points: 1, unit: '년' }
            ] },
            { label: '지속 근무 여부', max: 6, kind: 'judge', guide: '직업적 가치관\n생활환경\n조직 적합성' },
            { label: '자기소개서', max: 26, kind: 'judge', guide: '' }
        ],
        interview: [
            { label: '인성', max: 10, kind: 'judge', guide: '용모\n태도\n근면성\n협동성 등' },
            { label: '교직관', max: 10, kind: 'judge', guide: '책임감\n성실도\n적극성\n진취성\n추진력 등' },
            { label: '소양', max: 10, kind: 'judge', guide: '표현력\n논리성\n이해력\n지도력 등' },
            { label: '수업에 대한 이해', max: 10, kind: 'judge', guide: '수업설계\n지도방법\n피드백 등' },
            { label: '학생에 대한 이해', max: 10, kind: 'judge', guide: '학생 특성\n발화법\n안전관리\n문제시 대처법 등' }
        ]
    }
};
// 계약제교원(기간제교사·시간강사) 표준 양식. 출처: 계약제교원 채용 [지원12, 심사3] 프로그램(KHSDO) 엑셀·구글 시트.
// 기준·배점·문구는 원본 그대로 옮긴다(임의 변경 금지). 원본과 다른 점은 화면 규칙 두 가지뿐이다:
//   지원자 12칸 → 10칸 한 장(넘치면 장 추가), 심사위원 3명 고정 → 1~5명(집계표 칸·응모자별 줄이 따라 늘어남),
//   면접 시연 대상자 3칸 → 최대 10명(면접·수업실연 표는 3칸씩 장 추가), 저작권 표기 줄은 뺀다.
// 전형이 셋이다: 서류전형 → 면접 + 수업실연(같은 날, 같은 대상자).
// kind 'scale' = 원본 드롭다운 점수 목록을 그대로 칩으로 터치. options 의 label 은 칩 앞 글(상·중·하), 없으면 숫자만.
// print: 원본 인쇄 모양 — rows 는 원본 B열 줄 수(빈 줄 포함), merge 는 점수 칸을 줄 전체에 걸쳐 하나로 합치는지(D11:D13 처럼).
// head 는 원본 '평가 기준' A열 글, join 은 앞 항목과 A열 칸을 함께 쓰는지(3. 경력 + 지속근무).
const scale = (...points) => points.map(p => ({ label: '', points: p }));
const CONTRACT = {
    layout: 'contract',
    source: '계약제교원 채용 [지원12, 심사3] 프로그램(KHSDO) — 시작 필수 입력·서류전형(1)·면접(1)·수업실연(1)',
    stages: ['document', 'interview', 'demo'],
    recruitTypes: ['기간제교사', '시간강사'],
    subjects: ['담임', '인력풀 재채용', '영어', '과학', '체육', '정보', '통합', '특수', '특수협력', '보건', '영양', '전문상담'],
    // 원본 서약서(임용심사위원 서약서)는 항목 목록이 아니라 한 문단이다. 문단은 sheets.js 가 학년도·학교명을 넣어 만든다.
    pledge: ['임용심사위원으로서 부여된 임무를 성실히 수행할 것이며, 심사위원으로 알게 된 심사 자료 내용에 대해서는 누설하지 아니 할 것을 서약합니다.'],
    rubrics: {
        document: [
            { label: '전공/부전공 여부', max: 6, kind: 'pick', head: '1. 전공/부전공 여부\n[교원자격 상한점 6점]\n초등, 중등 동시 점수 불가', print: { rows: 3 },
                options: [{ label: '초등 교원자격증', points: 6 }] },
            { label: '학위 취득 및 대학원 수학 여부', max: 6, kind: 'pick', head: '2. 학위 취득 및\n대학원 수학 여부', print: { merge: true },
                options: [{ label: '석사 학위 이상', points: 6 }, { label: '학사 학위', points: 5 }, { label: '학위 없음', points: 2 }] },
            { label: '교사 경력(계약제 포함)', max: 3, kind: 'pick', head: '3. 교사 경력(계약제 포함)\n[기간제교사/시간강사]\n및 지속근무 여부', print: { merge: true },
                options: [{ label: '5년이상', points: 3 }, { label: '2년이상 5년미만', points: 2 }, { label: '1년이상 2년미만', points: 1 }] },
            { label: '지속근무 여부', max: 3, kind: 'scale', join: true, guide: '지속근무 상3 / 중2 / 하1',
                options: [{ label: '상', points: 3 }, { label: '중', points: 2 }, { label: '하', points: 1 }, { label: '', points: 0 }] },
            { label: '기타(전임교 관련)', max: 6, kind: 'scale', head: '4. 기타(전임교 관련)', guide: '업무, 학년, 교과(6/4/2)', options: scale(6, 4, 2, 0) },
            { label: '자기소개서', max: 6, kind: 'scale', head: '5. 자기소개서\n(A4 단면 1쪽 이내)', guide: '교육관,성격,학생이해,책임감\n상(6~5), 중(4~3), 하(2~1)', options: scale(6, 5, 4, 3, 2, 1, 0) }
        ],
        interview: [
            { label: '인성', max: 8, kind: 'scale', guide: '인성\n(태도, 근면성, 협동성, 적응력 등)', options: scale(8, 7, 6, 5, 4, 3, 2, 1, 0) },
            { label: '교직관', max: 8, kind: 'scale', guide: '교직관\n(책임감, 성실도, 봉사정신 등)', options: scale(8, 7, 6, 5, 4, 3, 2, 1, 0) },
            { label: '자질', max: 8, kind: 'scale', guide: '자질\n(적극성/진취성/추진력/책임감/지도력 등)', options: scale(8, 7, 6, 5, 4, 3, 2, 1, 0) },
            { label: '소양', max: 8, kind: 'scale', guide: '소양\n(표현력, 논리성, 이해력, 지도력 등)', options: scale(8, 7, 6, 5, 4, 3, 2, 1, 0) },
            { label: '기타', max: 8, kind: 'scale', guide: '기타\n(지역, 학교, 학생의 특성 이해도 등)', options: scale(8, 7, 6, 5, 4, 3, 2, 1, 0) }
        ],
        demo: [
            { label: '수업 계획의 적절성', max: 5, kind: 'scale', guide: '수업 계획의 적절성(학습목표 및 동기유발)', options: scale(5, 4, 3, 2, 1, 0) },
            { label: '수업 설계 능력', max: 5, kind: 'scale', guide: '수업 설계 능력(수업모형 및 내용 구성)', options: scale(5, 4, 3, 2, 1, 0) },
            { label: '교수 활동', max: 5, kind: 'scale', guide: '교수 활동(발음 및 발문 능력)', options: scale(5, 4, 3, 2, 1, 0) },
            { label: '학습 자료 활용', max: 5, kind: 'scale', guide: '학습 자료 활용(교수 매체 활용 능력)', options: scale(5, 4, 3, 2, 1, 0) },
            { label: '발문 및 판서', max: 5, kind: 'scale', guide: '발문 및 판서(학생 사고의 촉진 여부)', options: scale(5, 4, 3, 2, 1, 0) },
            { label: '평가 및 정리의 적절성', max: 5, kind: 'scale', guide: '평가 및 정리의 적절성', options: scale(5, 4, 3, 2, 1, 0) }
        ]
    },
    // 전형마다 가점이 다르다(원본 X·Z열 드롭다운). 문턱 40%는 전형 만점에서 계산한다(서류 12점·면접 16점·수업실연 12점).
    bonus: {
        document: { text: '국가유공자법 29조1항\n1,2,4호(3점), 3,5호(1.5점)', options: [{ points: 3, label: '1,2,4호' }, { points: 1.5, label: '3,5호' }] },
        interview: { text: '국가유공자법 29조1항[1,2,4호(4점), 3,5호(2점)]', options: [{ points: 4, label: '1,2,4호' }, { points: 2, label: '3,5호' }] },
        demo: { text: '국가유공자법 29조1항[1,2,4호(3점), 3,5호(1.5점)]', options: [{ points: 3, label: '1,2,4호' }, { points: 1.5, label: '3,5호' }] }
    },
    notes: {
        document: ['※ 채용시험 가점 대상자 : {t}점(40%) 이상 득점자만 해당됨. 세부기준은 계약제교원 운영지침 p.8 참조(본인이 해당자료 증빙 필요)'],
        interview: ['※ 채용시험 가점 대상자 : {t}점(40%) 이상 득점자만 해당됨. ', '세부기준은 계약제교원 운영지침 p.8 참조.  (본인이 해당자료 증빙 필요)'],
        demo: ['※ 채용시험 가점 대상자 : {t}점(40%) 이상 득점자만 해당됨. ', '세부기준은 계약제교원 운영지침 p.8 참조.  (본인이 해당자료 증빙 필요)'],
        final: ['※  어느 한 영역이라도40%미만이면 가산점 대상에서 제외']
    }
    // 원본 각 시트 A4 칸의 저작권 표기는 출력물에 넣지 않는다(사용자 결정 2026-10-15).
};
// 표준 심사표 하나만 불러온다. 원본 시트는 '영역'만 바꿔 고르고 기준은 모든 영역이 같으므로,
// 영역(채용 분야)은 사람이 직접 적는다(예: 문화예술강사[국악]). field 가 비어 있으면 화면이 분야 칸을 건드리지 않는다.
const PRESETS = [{ id: 'standard', name: '강사 채용 표준', field: '', ...SHEET }, { id: 'contract-teacher', name: '계약제 교원 채용 표준', field: '', ...CONTRACT }];
// 예전에 영역별로 두었던 id 들. 샘플 링크 등에서 들어와도 표준 심사표로 연다.
const LEGACY_IDS = ['basic-literacy', 'arts', 'ai-support', 'afterschool', 'g12-origami', 'g12-play-pe', 'care',
    'arts-gugak', 'arts-sogeum-danso', 'ai-digital-tutor', 'ai-class-assistant', 'afterschool-creative-play', 'afterschool-computer', 'care-creative-art', 'care-pe'];
// 가점 행. 출처는 원본 구글 시트(강사 채용 프로그램 심사표 KHSDO) 서류심사 6번 행과 그 드롭다운이다.
// 방과후·돌봄 길라잡이에는 가점 점수 기준이 없다. 배점과 상관없이 0~5점을 0.5점 간격으로 고르고(원본 V열 목록),
// 5점·2.5점 줄은 원본 문구대로 근거 호를 붙여 보여 준다. 40% 문턱은 원본 행 이름('40% 이상 득점자')을 따른다.
const BONUS = {
    label: '채용시험 가점 대상자 중 40% 이상 득점자',
    source: '강사 채용 프로그램 심사표(KHSDO) 서류심사 6. 채용시험 가점',
    max: 5,
    options: [
        { points: 5, label: '국가유공자법 제29조제1항 제1·2·4호' },
        { points: 2.5, label: '국가유공자법 제29조제1항 제3·5호' }
    ]
};
const presetById = id => PRESETS.find(p => p.id === id) || (LEGACY_IDS.includes(id) ? PRESETS[0] : null);
module.exports = { PRESETS, DEFAULT_PRESET: PRESETS[0], BONUS, presetById };
