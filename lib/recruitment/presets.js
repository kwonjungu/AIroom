'use strict';
// 강사 유형별 심사 기준 프리셋. 새 채용을 만들 때 평가 항목·배점·심사관점을 한 번에 채운다.
// 채용마다 r.rubrics 로 복사해 저장하므로, 여기를 고쳐도 이미 만든 채용의 점수는 바뀌지 않는다.
//
// 항목(criterion)의 kind 는 원본 심사표의 '심사관점' 칸을 위원이 어떻게 쓰는지에 맞춘다.
//   pick  : 해당하는 관점 한 줄을 고른다(택1). 점수 = 그 줄의 점수. 학력처럼 구간이 나뉜 항목.
//   sum   : 해당하는 줄을 모두 고르고 더한다. unit 이 있는 줄(건당·1년당)은 개수를 넣는다.
//           합계는 항목 배점에서 자른다. 자격증·경력처럼 쌓이는 항목.
//   judge : 관점(guide 의 줄)을 보고 위원이 0~배점 사이에서 직접 매긴다. 면접·자기소개서.
// 새 영역은 AREAS 에 한 줄, 기준이 다른 유형은 SHEET 같은 기준 묶음을 하나 더 만들어 붙인다. id 는 바꾸지 않는다.
// 원본 구글 시트(KHSDO)는 '영역'만 바꿔 고르고 심사 기준은 모든 영역이 같다. 그래서 기준(SHEET)은 하나로 두고 영역마다 이름만 붙인다.
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
// 원본 시트 '영역 추가 입력' 목록(시작 필수입력 M21:M31) 순서 그대로. id 는 저장된 채용이 참조하므로 바꾸지 않는다.
// 원본의 '돌봄[창의미슬]'은 '창의미술'의 오타로 보고 고쳐 적었다.
const AREAS = [
    ['basic-literacy', '기초학력 협력강사'],
    ['arts-gugak', '문화예술강사[국악]'],
    ['arts-sogeum-danso', '문화예술강사[소금 단소]'],
    ['ai-digital-tutor', 'AI중점 지원인력 [디지털튜터]'],
    ['ai-class-assistant', 'AI중점 지원인력 [수업협력강사]'],
    ['afterschool-creative-play', '방과후학교[창의놀이부] 강사'],
    ['afterschool-computer', '방과후학교[컴퓨터부] 강사'],
    ['g12-origami', '초1,2맞춤형 종이접기 강사'],
    ['g12-play-pe', '초1,2맞춤형 놀이체육 강사'],
    ['care-creative-art', '돌봄[창의미술] 강사'],
    ['care-pe', '돌봄[생활체육] 강사']
];
const PRESETS = AREAS.map(([id, name]) => ({ id, name, field: name, ...SHEET }));
// 가점 행(원본 6번). 국가유공자법 제31조: 시험마다 '만점의' 10%·5%를 더하고, 그 시험 만점의 40% 미만이면 주지 않는다.
// 점수는 고정값이 아니라 rate 다. 채용을 만들 때 서류 만점에 곱해 points 로 굳힌다(서류 50점이면 5점·2.5점).
const BONUS = {
    label: '채용시험 가점 대상자 중 40% 이상 득점자',
    options: [
        { rate: 0.1, label: '국가유공자법 제29조제1항 제1·2·4호' },
        { rate: 0.05, label: '국가유공자법 제29조제1항 제3·5호' }
    ]
};
// 만점 × 비율. 0.01점까지 남긴다(서류 47점이면 4.7점·2.35점).
const bonusOptionsFor = total => BONUS.options.map(o => ({ ...o, points: Math.round(total * o.rate * 100) / 100 }));
const presetById = id => PRESETS.find(p => p.id === id) || null;
module.exports = { PRESETS, DEFAULT_PRESET: PRESETS[0], BONUS, bonusOptionsFor, presetById };
