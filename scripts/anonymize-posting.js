// 공유용(/posting) 데이터 생성 스크립트
// defaults/*.json -> defaults-posting/*.json (개인정보 제거 + 가상 데이터)
//
// 실행: node scripts/anonymize-posting.js
// (원본 defaults를 절대 수정하지 않음. 결과는 defaults-posting/에만 저장)

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'defaults');
const DST = path.join(__dirname, '..', 'defaults-posting');

// staff.json 의 id 순서에 맞춰 가짜 이름 매핑.
// 길이가 긴 키부터 정렬하여 부분 매칭 사고를 방지.
const NAME_MAP = {
    // 관리자
    '하춘식': '김교장',
    '조성균': '이교감',
    // 담임
    '권준구': '김선생',
    '김민정': '이선생',
    '이원빈': '박선생',
    '이지현': '최선생',
    '장재선': '정선생',
    '황혜원': '강선생',
    '설미선': '윤선생',
    // 전담/유아/특수
    '김 윤': '조선생',
    '김윤':   '조선생',
    '김은정': '임유아',
    '한은선': '송선생',
    '이현정': '안선생',
    '황의순': '홍선생',
    '정승자': '권선생',
    '이선미': '류선생',
    // 영양/보건/사서
    '백경미': '장영양',
    '강민경': '한보건',
    '강은주': '표사서',
    // 행정
    '김종기': '신실장',
    '박혜선': '김주무',
    '장주선': '이주무',
    '윤광호': '박주무',
    '이미희': '최행정',
    '남희정': '노행정',
    '채래윤': '표행정',
    // 방과후/돌봄/조리/씨름/늘봄
    '오현숙': '도방과',
    '윤진성': '양돌봄',
    '김희경': '봉조리',
    '양지인': '명조리',
    '박현주': '차조리',
    '김흥석': '마감독',
    '지지영': '도늘봄',
    '장동훈': '모늘봄',
};

// 기관/장소 매핑 — 학교명·분교명 등
const PLACE_MAP = {
    '백암초등학교': '샘플초등학교',
    '백암초': '샘플초',
    '백암놀이학교': '샘플놀이학교',
    '백암일보': '학교소식지',
    '수정분교': '나눔분교',
    '백봉초': '샘플2초',
    '장평초': '샘플3초',
    '백암':  '샘플',  // 잔여 케이스 (학교 이름 부분 등). 위 키들이 먼저 매칭되므로 마지막.
    // 분교명 잔여 (예: "1-수정", "6-수정") — 본 데이터에선 분교 약칭으로만 쓰임
    '-수정': '-나눔',
};

function applyMap(text, mapping) {
    // 키 길이 내림차순으로 정렬해서 긴 키부터 치환 (부분 매칭 방지)
    const keys = Object.keys(mapping).sort((a, b) => b.length - a.length);
    for (const k of keys) {
        const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        text = text.replace(re, mapping[k]);
    }
    return text;
}

function anonymize(text) {
    text = applyMap(text, PLACE_MAP);
    text = applyMap(text, NAME_MAP);
    return text;
}

function processFile(filename) {
    const src = path.join(SRC, filename);
    if (!fs.existsSync(src)) return;
    const raw = fs.readFileSync(src, 'utf-8');
    const anonymized = anonymize(raw);
    // 파싱해서 유효한 JSON 인지 확인
    try { JSON.parse(anonymized); }
    catch (e) {
        console.error(`[ERROR] ${filename} 익명화 후 JSON 파싱 실패: ${e.message}`);
        return;
    }
    fs.writeFileSync(path.join(DST, filename), anonymized, 'utf-8');
    console.log(`✓ ${filename}`);
}

if (!fs.existsSync(DST)) fs.mkdirSync(DST, { recursive: true });

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.json'));
files.forEach(processFile);

// ===== 빈 컬렉션에 데모 시드 (원본이 [])이면 데모 콘텐츠 채워 넣기) =====
// 현재 달 기준으로 날짜 생성하여 어느 시점에 봐도 자연스럽게 보이도록.
const today = new Date();
const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

// 학교 일정 데모 (10건 정도)
const scheduleSeed = [
    { id: 'sch_demo1', date: `${ym}-03`, text: '학부모 공개수업', manager: '이선생', emoji: '🏫', detail: '오전 10시 ~ 11시 30분' },
    { id: 'sch_demo2', date: `${ym}-05`, text: '안전점검의 날', manager: '김선생', emoji: '🛡️' },
    { id: 'sch_demo3', date: `${ym}-08`, text: '교직원 회의', manager: '이교감', emoji: '📋', detail: '오후 3시 30분 / 교무실' },
    { id: 'sch_demo4', date: `${ym}-12`, text: '현장체험학습 (3~4학년)', manager: '박선생', emoji: '🚌' },
    { id: 'sch_demo5', date: `${ym}-15`, text: '인성교육 학교자체연수', manager: '최선생', emoji: '🎓', detail: '90분 / 시청각실' },
    { id: 'sch_demo6', date: `${ym}-19`, text: '학교운영위원회', manager: '김교장', emoji: '🏛️' },
    { id: 'sch_demo7', date: `${ym}-22`, text: '심폐소생술 실습 연수', manager: '한보건', emoji: '❤️', detail: '120분 / 보건실' },
    { id: 'sch_demo8', date: `${ym}-25`, text: '독서의 날 행사', manager: '표사서', emoji: '📚' },
    { id: 'sch_demo9', date: `${ym}-26`, text: '학생자치회 정기회의', manager: '정선생', emoji: '👥' },
    { id: 'sch_demo10', date: `${ym}-28`, text: '월말 평가 자료 제출 마감', manager: '강선생', emoji: '📊' },
];
fs.writeFileSync(path.join(DST, 'schedules.json'), JSON.stringify(scheduleSeed, null, 2), 'utf-8');
console.log('✓ schedules.json (데모 시드)');

// 학교 소식 데모
const newsSeed = [
    { id: 'nw_demo1', title: '샘플초 디지털 교무실 오픈 안내', content: '교직원 누구나 쉽게 학사 일정·연수 이수 현황을 확인할 수 있는 디지털 교무실이 오픈되었습니다.', date: `${ym}-01`, author: '이교감' },
    { id: 'nw_demo2', title: '봄맞이 환경정화 활동', content: '학년별 환경정화 활동을 다음 주 수요일 5교시 후 진행합니다.', date: `${ym}-07`, author: '최선생' },
    { id: 'nw_demo3', title: '학부모 상담주간 운영', content: '이달 셋째 주는 학부모 상담주간입니다. 학년별 시간표는 별도 안내드립니다.', date: `${ym}-14`, author: '이선생' },
    { id: 'nw_demo4', title: '도서관 새 책 입고 안내', content: '신간 200여 권이 입고되었습니다. 학년별 추천 도서는 도서관 게시판을 참고하세요.', date: `${ym}-20`, author: '표사서' },
];
fs.writeFileSync(path.join(DST, 'news.json'), JSON.stringify(newsSeed, null, 2), 'utf-8');
console.log('✓ news.json (데모 시드)');

// 연수 이수 기록 데모 — 일부 교직원이 일부 연수를 완료한 것처럼
// 이수 기록 자체는 매우 단순한 boolean/객체 형태
const recordSeed = {
    t1:  { s3: { completed: true, date: `${ym}-04` }, s4: { completed: true, date: `${ym}-04` }, s6: { completed: true, date: `${ym}-05` } },
    t6:  { s3: { completed: true, date: `${ym}-08` }, s4: { completed: true, date: `${ym}-08` }, s5: { completed: true, date: `${ym}-08` }, s8: { completed: true, date: `${ym}-08` } },
    t9:  { s3: { completed: true, date: `${ym}-10` }, s4: { completed: true, date: `${ym}-10` }, s7: { completed: true, date: `${ym}-11` } },
    t17: { s3: { completed: true, date: `${ym}-12` }, s6: { completed: true, date: `${ym}-12` } },
};
fs.writeFileSync(path.join(DST, 'training-records.json'), JSON.stringify(recordSeed, null, 2), 'utf-8');
console.log('✓ training-records.json (데모 시드)');

console.log(`\n완료: ${files.length}개 파일 → defaults-posting/ (+ 데모 시드 3종)`);
