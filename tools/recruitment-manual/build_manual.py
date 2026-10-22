# -*- coding: utf-8 -*-
"""채용 관리 사용 설명서(담당자용·심사자용) 덱을 만든다. 캡처는 capture.py 가 실제 사이트에서 찍은 shots/.

    python tools/recruitment-manual/build_manual.py      → public/recruitment/manual/{index,admin,reviewer}.html

모양은 kwonjungu/inline-ai-setup·classroomaicontents 강의안을 따른다: 1280×720 장, 흑백 + 강조색 하나, 큰 제목 위 짧은 선,
캡처는 회색 패널 안 빨간 테두리, 아래 설명 줄, ← → 넘기기 · T 목차 · N 노트 · F 목록 · P 인쇄.
한 권에 두 방식을 함께 담는다: 같은 단계는 한 번, 갈리는 곳만 🅐 강사 채용 표준 / 🅑 계약제 교원 채용 표준을 나란히.
"""
import html, os, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'recruitment' / 'manual'
SHOTS = OUT / 'shots'
E = html.escape
AC = '#ED1AA0'          # 강조색(강의안과 같음)
A_COL, B_COL = '#0F766E', '#ED1AA0'   # 🅐 강사 · 🅑 계약제 표시 색


def focus(name, aspect, min_w=760):
    """PC 화면(1440×900) 캡처에서 빨간 테두리(누를 곳) 둘레만 잘라 크게 보이게 한다. 테두리가 없으면 그대로.
    aspect = 가로/세로(장 안 칸 비율). 결과는 shots/focus/ 에 둔다(빌드할 때마다 다시 만든다)."""
    from PIL import Image
    import numpy as np
    src = SHOTS / name; im = Image.open(src).convert('RGB')
    if im.width < 1200: return name
    a = np.asarray(im).astype(int)
    red = (a[:, :, 0] > 200) & (a[:, :, 1] < 70) & (a[:, :, 2] > 40) & (a[:, :, 2] < 120)
    ys, xs = np.nonzero(red)
    if len(xs) < 40: return name
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    w = max(min_w, (x1 - x0) + 260); h = w / aspect
    if h < (y1 - y0) + 140: h = (y1 - y0) + 140; w = h * aspect
    w, h = min(w, im.width), min(h, im.height)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    L = int(min(max(0, cx - w / 2), im.width - w)); T = int(min(max(0, cy - h / 2), im.height - h))
    out = SHOTS / 'focus' / name; out.parent.mkdir(exist_ok=True)
    im.crop((L, T, L + int(w), T + int(h))).save(out)
    return 'focus/' + name


def img(name, alt, h=None, w=None):
    assert (SHOTS / name).exists(), name
    st = ';'.join(x for x in [f'max-height:{h}px' if h else '', f'max-width:{w}px' if w else ''] if x)
    return f'<img src="shots/{name}" alt="{E(alt)}" style="{st}">'


def tag(k):
    return {'A': f'<span class="kt" style="background:{A_COL}">🅐 강사 채용 표준</span>', 'B': f'<span class="kt" style="background:{B_COL}">🅑 계약제 교원 채용 표준</span>', 'AB': f'<span class="kt" style="background:#111">🅐·🅑 같음</span>'}[k]


class Deck:
    def __init__(self, title, kicker):
        self.title, self.kicker, self.frames, self.sec = title, kicker, [], '시작'

    def add(self, inner, title, dark=False, expl='', note='', tight=True):
        n = len(self.frames) + 1
        cls = 'slide' + (' dark' if dark else '') + (' has-ex' if expl else '')
        self.frames.append(
            f'<div class="frame" data-i="{n}" data-sec="{E(self.sec)}" data-title="{E(title)}" data-src="" data-secs="0">'
            f'<section class="{cls}" id="p{n}" style="--ac:{AC}" aria-label="{n}. {E(title)}"><div class="pad{" tight" if tight else ""}">{inner}</div>'
            + (f'<p class="expl">{expl}</p>' if expl else '')
            + f'<div class="pnum"><span>{E(self.sec)}</span><b>{n:02d}</b></div></section>'
            + (f'<template class="notes"><div class="nb"><p>{note}</p></div></template>' if note else '') + '</div>')

    # ── 장 모양들 ──
    def cover(self, lines, sub):
        self.sec = '시작'
        self.add(f'<div class="cover-pad grow" style="display:flex;flex-direction:column"><span class="chip-k">{E(self.kicker)}</span><h1 class="d-xxl" style="margin-top:28px">{"<br>".join(E(l) for l in lines)}</h1><p class="sub" style="color:#cacacb">{sub}</p><div class="cover-dots" aria-hidden="true"><i></i><i></i><i></i></div></div>', '표지', dark=True, tight=False)

    def section(self, no, title, sub=''):
        self.sec = title
        self.add(f'<div class="grow" style="display:flex;flex-direction:column;justify-content:center"><p class="secno">{no:02d}</p><h1 class="d-lg">{E(title)}</h1>{f"<p class=sub>{sub}</p>" if sub else ""}</div>', title, dark=True, tight=False)

    def sentence(self, lines, sub='', expl=''):
        self.add(f'<div class="grow" style="display:flex;flex-direction:column;justify-content:center"><span class="bar"></span><h1 class="d-lg">{"<br>".join(lines)}</h1>{f"<p class=sub>{sub}</p>" if sub else ""}</div>', ' '.join(lines).replace('<span class="hl2">', '').replace('</span>', ''), expl=expl, tight=False)

    def head(self, title, accent=''):
        return f'<div class="hd"><span class="tick" style="background:{AC}"></span><h2 class="d-sm">{E(title)}{f" <span class=hl2>{E(accent)}</span>" if accent else ""}</h2></div>'

    def capture(self, title, accent, shot, expl, which='AB', note=''):
        self.add(self.head(title, accent) + f'<div class="figwrap grow"><div class="panel shot">{tag(which)}{img(focus(shot, 1096 / 500), title, 500, 1096)}</div></div>', f'{title} {accent}', expl=expl, note=note)

    def compare(self, title, accent, a_shot, b_shot, a_cap, b_cap, expl, h=370):
        cell = lambda k, s, c: f'<figure class="cmpfig">{tag(k)}<div class="panel shot">{img(focus(s, 540 / h, 640), c, h, 540)}</div><figcaption>{c}</figcaption></figure>'
        self.add(self.head(title, accent) + f'<div class="duo2 grow">{cell("A", a_shot, a_cap)}{cell("B", b_shot, b_cap)}</div>', f'{title} {accent}', expl=expl)

    def phones(self, title, accent, items, side='', expl=''):
        """items: [(shot, caption, 'A'|'B'|'AB')] 휴대폰 화면 1~3장 + 오른쪽 설명."""
        figs = ''.join(f'<figure class="phone">{tag(k)}<div class="pframe">{img(s, c, 470)}</div><figcaption>{c}</figcaption></figure>' for s, c, k in items)
        self.add(self.head(title, accent) + f'<div class="phones grow"><div class="prow">{figs}</div>{f"<div class=pside>{side}</div>" if side else ""}</div>', f'{title} {accent}', expl=expl)

    def steps(self, title, accent, items, expl=''):
        cells = ''.join(f'<div class="scell2"><span class="sno2">{i + 1}</span><h3>{E(n)}</h3><p>{d}</p></div>' for i, (n, d) in enumerate(items))
        self.add(self.head(title, accent) + f'<div class="steps2 grow" style="grid-template-columns:repeat({len(items)},1fr)">{cells}</div>', f'{title} {accent}', expl=expl)

    def table(self, title, accent, rows, expl=''):
        """rows: [(항목, 🅐, 🅑)]"""
        body = ''.join(f'<tr><th>{E(k)}</th><td>{a}</td><td>{b}</td></tr>' for k, a, b in rows)
        self.add(self.head(title, accent) + f'<div class="grow" style="display:flex;align-items:center"><table class="vs2"><thead><tr><th></th><th>{tag("A")}</th><th>{tag("B")}</th></tr></thead><tbody>{body}</tbody></table></div>', f'{title} {accent}', expl=expl)

    def cards(self, title, accent, items, expl=''):
        cs = ''.join(f'<div class="card2"><span class="lab2">{E(l)}</span><h3>{E(h)}</h3><p>{d}</p></div>' for l, h, d in items)
        self.add(self.head(title, accent) + f'<div class="cards2 grow" style="grid-template-columns:repeat({min(3, len(items))},1fr)">{cs}</div>', f'{title} {accent}', expl=expl)

    def html(self, page_title, desc):
        chrome = '''<div class="progress" aria-hidden="true"><i id="prog"></i></div>
<div class="ui" id="ui"><button id="prev" aria-label="이전 장">‹</button><span class="cnt" id="cnt"></span><button id="next" aria-label="다음 장">›</button><button id="btnToc" title="목차 (T)">목차</button><button id="btnNotes" title="노트 (N)">노트</button><button id="mode" title="목록/발표 (F)">목록 보기</button><a class="ui-home" href="./">설명서 처음</a></div>
<aside class="notes-panel" id="notes" aria-label="노트"><div class="np-hd"><b>노트</b><span id="npMeta"></span><button id="npX" aria-label="노트 닫기">✕</button></div><div class="np-body" id="npBody"></div></aside>
<div class="toc" id="toc" role="dialog" aria-label="목차"><div class="toc-box"><div class="toc-hd"><b>목차</b><span>누르면 그 장으로 가요 · T 또는 Esc로 닫기</span></div><div class="toc-list" id="tocList"></div></div></div>
<div class="keys" id="keys">← → 넘기기 · T 목차 · F 목록/발표 · P 인쇄 보기</div>'''
        return f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>{E(page_title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="{E(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
<link rel="stylesheet" href="deck.css"><link rel="stylesheet" href="manual.css">
</head><body>
<div class="deckwrap">
{chr(10).join(self.frames)}
</div>
{chrome}
<script src="deck.js"></script>
</body></html>'''


# ════════════════════════════════════════ 담당자용 ════════════════════════════════════════
def admin_deck():
    d = Deck('채용 관리 사용 설명서 · 담당자용', '백암이 채용 관리 · 담당자용')
    d.cover(['채용 심사,', '처음부터 끝까지'], '강사 채용 표준 · 계약제 교원 채용 표준을 한 권으로')
    d.sentence(['두 가지 표준,', '<span class="hl2">한 가지 흐름</span>'], '만들기 → 위원 링크 → 채점 → 대상자 → 확정 → 문서',
               expl='고르는 표준만 다르고 순서는 같아요. 갈리는 곳에는 🅐 강사, 🅑 계약제 표시를 붙였어요.')
    d.table('어떤 표준을 고를까요?', '', [
        ('누구를 뽑나요', '방과후·늘봄 강사, 협력강사 등', '기간제교사 · 시간강사'),
        ('전형', '서류 → 면접 (또는 서류만)', '서류 → 면접 + 수업실연(같은 날) (또는 서류만)'),
        ('지원자 · 면접 대상자', '최대 20명 · 4명', '최대 100명 · 10명'),
        ('배점', '영역을 직접 적고 항목을 고쳐 씀', '원본 그대로 서류 30 · 면접 40 · 수업실연 30'),
        ('가점', '서류만 0~5점(0.5점 간격)', '서류 3/1.5 · 면접 4/2 · 수업실연 3/1.5'),
        ('출력 용지', 'A4 세로, 집계표만 세로/가로 고름', '서류전형·집계표 가로, 나머지 세로'),
        ('관리번호', '001, 002 …', '과목 + 순번 (담임01, 담임02 …)'),
    ], expl='원본은 강사 채용 프로그램(KHSDO)과 계약제교원 채용 프로그램(KHSDO) 엑셀이에요. 기준과 문구는 그대로 옮겼어요.')
    d.steps('전체 흐름', '여섯 단계', [
        ('로그인', '학교 찾기 + 학교 코드'), ('채용 만들기', '표준 고르기 → 정보 · 배점 · 위원 · 지원자'), ('링크 보내기', '위원 전체 링크 · QR 배부표'),
        ('대상자 고르기', '서류 결과 보고 면접(·수업실연) 대상자 · 서류만이면 건너뜀'), ('결과 확정', '모든 위원 제출 후'), ('문서 받기', '한글 · Excel · 인쇄용 PDF')])

    d.section(1, '들어가기', '학교 공간 — 학교를 찾고, 학교 코드를 넣어요')
    d.capture('학교 공간', '학교 찾기', 'h-04-login-search.png', '주소 a-iroom.vercel.app/hub 로 들어와 학교 이름을 찾으세요(NEIS 학교 정보). 「사용 중」인 학교만 고를 수 있어요. 미등록이면 관리자에게 등록을 요청하세요.')
    d.capture('관리자가 준', '학교 코드', 'h-05-login-code.png', '우리 학교를 누르고 관리자가 준 학교 코드를 넣으면 들어가요. 같은 학교 선생님들이 같은 코드를 써요. 10번 틀리면 그 기기는 24시간 금지돼요.')
    d.capture('학교 공간에서', '채용 관리', 'h-06-school-home.png', '우리 학교 공간 첫 화면이에요. 「채용 관리」 카드를 누르세요. 학교 공간에 도구가 더해지면 여기에 카드가 늘어나요.')
    d.capture('왼쪽 위', '+ 새 채용', 'k-02-home.png', '왼쪽 채용 목록에 지금까지 만든 채용이 진행 단계와 함께 보여요. 새로 시작하려면 「+ 새 채용」을 누르세요.')

    d.section(2, '채용 만들기', '표준 고르기 → 정보 → 배점 → 위원 → 지원자')
    d.capture('먼저', '심사표 불러오기', 'c-03-preset.png', '맨 위 드롭다운에서 🅐 강사 채용 표준 또는 🅑 계약제 교원 채용 표준을 고르세요. 고르면 아래 평가 항목·배점·위원 칸이 그 표준대로 바뀌어요. 「샘플 인쇄본 보기」로 결과 문서를 미리 볼 수 있어요.')
    d.compare('1단계', '채용 정보', 'k-04-info.png', 'c-04-info.png', '영역을 직접 적고, 집계표 용지(세로/가로)를 골라요', '채용영역 · 과목을 고르면 분야가 저절로 채워져요',
              '「예시 채우기」를 누르면 연습용 값이 채워져요. 면접대상자 최대 수는 🅐 4명, 🅑 10명까지예요. 「전형 구성」에서 「서류만」을 고르면 면접 칸이 사라지고, 서류 평가가 끝나면 대상자 선정 없이 바로 결과를 확정해요. 가점은 처음부터 「사용」으로 골라져 있어요.')
    d.compare('2단계', '평가 항목과 배점', 'k-05-rubric.png', 'c-05-rubric.png', '서류 · 면접 두 칸', '서류 · 면접 · 수업실연 세 칸',
              '불러온 그대로 쓰면 돼요. 고치려면 항목 이름·배점·심사관점 글을 바꾸세요. 「점수 고르기」 항목은 마지막 줄 「점수: 6, 5, 4 …」가 위원이 누를 단추가 돼요.')
    d.compare('3·4단계', '위원과 지원자', 'k-06-people.png', 'c-06-people.png', '위원마다 서류 · 면접 체크', '서류 · 면접 · 수업실연 체크, 관리번호 담임01 …',
              '위원은 최대 5명이에요. 지원자 수를 넣으면 번호가 저절로 붙으니 이름만 넣으세요. 다 됐으면 맨 아래 「채용 생성」.')
    d.capture('만들었으면', '평가 시작하기', 'c-07-created.png', '채용이 만들어지면 위쪽에 지금 할 일이 보여요. 「평가 시작하기」를 누르면 위원 링크를 만들 수 있어요. 시작한 뒤에는 배점과 위원을 바꿀 수 없어요.')

    d.section(3, '위원에게 링크 보내기', '메일이 자동으로 가지 않아요 — 직접 전해 주세요')
    d.capture('기본 설정 탭', '위원 전체 링크 발급', 'k-08-invites.png', '「위원 전체 링크 발급」 → 「전체 링크 복사」로 메신저에 붙여 보내거나, 「QR 배부표 인쇄」로 종이로 나눠 주세요. 화면을 새로 불러오면 링크 목록이 사라지니 바로 복사하세요.')
    d.capture('종이로 나눠 줄 때', 'QR 배부표', 'k-09-qr.png', '위원마다 이름·직위·담당 전형과 본인 전용 QR이 한 장에 나와요. 휴대폰 카메라로 찍으면 바로 서명·채점 화면이 열려요.')
    d.sentence(['링크는 <span class="hl2">7일</span>,', '본인에게만'], '다시 발급하면 이전 링크는 바로 막혀요',
               expl='링크를 가진 사람은 그 위원으로 채점할 수 있어요. 잃어버렸다면 그 위원만 「다시 발급」하세요.')

    d.section(4, '채점 지켜보기 · 대상자 고르기')
    d.capture('평가 진행 탭', '누가 냈나요', 'c-13-progress.png', '위원별로 작성 전 · 작성 중 · 제출 완료가 보여요. 실수로 낸 위원은 「다시 열기」(사유 입력)로 고칠 수 있게 해 주세요.')
    d.compare('통계·결과 탭', '서류 결과', 'k-14-doc-results.png', 'c-14-doc-results.png', '위원별 점수 · 서류 평균 · 순위', '같은 표 · 관리번호(담임01) 기준',
              '모든 위원이 내야 평균과 순위가 나와요. 미제출은 0점으로 치지 않아요. 동점은 공동순위예요.')
    d.capture('대상자 체크', '+ 고른 이유 → 확정', 'c-15-shortlist.png', '면접(🅑는 면접 + 수업실연)할 사람을 체크하고 이유를 적어 확정하세요. 🅐 최대 4명, 🅑 최대 10명. 확정하면 서류 점수는 잠기고 다음 전형이 열려요.')

    d.section(5, '결과 확정 · 문서 받기')
    d.compare('모두 냈으면', '결과 확정', 'k-19-final.png', 'c-19-final.png', '면접 합산 · 순위', '전형별 점수 + 교과목별 집계(서류 + 면접 + 수업실연 = 계)',
              '확정하면 점수가 잠기고 결과 문서를 만들 수 있어요. 되돌릴 수 없으니 표를 한 번 더 보세요. 🅑는 한 영역이라도 40% 미만이면 가산점이 빠져요.')
    d.capture('문서 출력 탭', '한글 · Excel · 인쇄용', 'c-20-exports.png', '한글(HWPX)은 결재·보관용, Excel은 집계 확인용, 인쇄용 HTML은 새 창에서 「인쇄 / PDF로 저장」. 서약서·채점표·집계표가 원본 양식 그대로 나와요.')
    d.compare('출력물', '집계표', 'k-22-print-land.png', 'c-22-print-land.png', '집계표 가로를 고르면 10명씩 한 장', '원본처럼 가로, 10명씩 한 장 · 위원 칸이 늘어나요',
              '지원자가 10명을 넘으면 같은 표가 한 장씩 늘어나요(21명이면 3장). 모든 쪽이 A4 한 장에 들어가요.', h=340)
    d.compare('출력물', '채점표와 서약서', 'c-21-print-sheet.png', 'c-23-print-pledge.png', '🅑 서류전형 평가표(가로, 위원별)', '🅑 임용심사위원 서약서(세로)',
              '🅐는 청렴서약서와 위원별 서류·면접 채점표가 세로로 나와요. 위원이 화면에 한 서명이 그대로 들어가요.', h=340)

    d.section(6, '이럴 땐', '자주 묻는 것')
    d.cards('막혔을 때', '', [
        ('링크', '위원이 링크를 잃어버렸어요', '기본 설정 탭에서 그 위원만 「다시 발급」. 이전 링크는 바로 막혀요.'),
        ('제출', '위원이 잘못 냈어요', '평가 진행 탭 「다시 열기」 → 사유 입력. 다음 전형으로 넘어가면 고칠 수 없어요.'),
        ('로그인', '학교 코드를 모르거나 금지됐어요', '학교 코드는 관리자에게 받아요(잊으면 관리자가 새 코드 발급). 10번 틀려 금지됐으면 관리자가 백암이 관리자 포털 「🔒 로그인 잠금」에서 풀어 줘요.'),
    ])
    d.capture('다 끝났으면', '채용 삭제', 'k-24-delete.png', '문서를 받아 보관했다면 기본 설정 탭 맨 아래에서 지울 수 있어요. 채용 제목을 그대로 입력해야 지워지고, 되돌릴 수 없어요.')
    d.sentence(['표준만 고르면,', '<span class="hl2">나머지는 같아요</span>'], '🅐 강사 채용 표준 · 🅑 계약제 교원 채용 표준')
    return d


# ════════════════════════════════════════ 심사자용 ════════════════════════════════════════
def reviewer_deck():
    d = Deck('채용 관리 사용 설명서 · 심사위원용', '백암이 채용 관리 · 심사위원용')
    d.cover(['링크 하나로', '끝나는 채점'], '휴대폰으로도, PC로도 · 강사 채용 · 계약제 교원 채용')
    d.steps('하실 일', '네 가지', [('링크 열기', '받은 링크나 QR'), ('서약서 서명', '손가락으로 이름'), ('눌러서 채점', '줄·단추를 누르면 점수가 매겨져요'), ('제출', '내면 고칠 수 없어요')],
            expl='로그인이 없어요. 담당 선생님이 보낸 링크가 곧 열쇠예요. 다른 사람에게 넘기지 마세요.')
    d.table('어떤 채용인가요?', '화면 위에 적혀 있어요', [
        ('전형', '서류 → 면접 (또는 서류만)', '서류 → 면접 + 수업실연(같은 날) (또는 서류만)'),
        ('서약서', '청렴서약서', '임용심사위원 서약서'),
        ('서류 채점', '심사관점 줄 누르기 · 해당 줄 체크 · 자기소개서 점수 입력', '준거 줄 누르기 · 점수 단추 누르기'),
        ('면접 날', '면접 채점표 하나', '면접 · 수업실연 두 표를 차례로'),
    ])

    d.section(1, '링크 열기 · 서명')
    d.phones('링크를 열면', '서약서부터', [('k-m10-pledge.png', '🅐 청렴서약서', 'A'), ('c-m10-pledge.png', '🅑 임용심사위원 서약서', 'B')],
             side='<p>서약 내용을 읽고</p><p>아래 칸에 <b>손가락으로 이름</b>을 쓰세요.</p><p class="muted2">PC에서는 마우스로 써요.</p>',
             expl='서명해야 채점표를 낼 수 있어요. 이 서명은 결과 문서에 그대로 인쇄돼요.')
    d.phones('이름을 쓰고', '서명 저장', [('c-m11-signed.png', '서명 칸', 'AB')],
             side='<p>잘못 썼으면 「지우기」.</p><p>「서명 저장」을 누르면 서명 완료가 표시돼요.</p><p class="muted2">나중에 「다시 서명」도 할 수 있어요.</p>')

    d.section(2, '서류 채점', '드롭다운 없이 눌러서 골라요')
    d.phones('먼저', '평가 준거 읽기', [('k-m12-doc-a-sheet.png', '🅐 평가 준거', 'A'), ('c-m12-doc-a-sheet.png', '🅑 평가 준거', 'B')],
             side='<p>채점표 위에 항목별 기준과 배점이 펼쳐져 있어요.</p><p>모든 위원이 같은 기준을 봐요.</p>')
    d.phones('해당하는 걸', '눌러서 고르기', [('k-m12-doc-b-touch.png', '🅐 심사관점 줄 누르기', 'A'), ('c-m12-doc-b-touch.png', '🅑 줄 누르기 · 점수 단추', 'B')],
             side='<p><b>줄 누르기</b>: 해당하는 한 줄(예: 석사 학위 이상 6점)</p><p><b>점수 단추</b>: 6 5 4 … 중 하나</p><p><b>체크</b>: 해당하는 줄 모두(🅐 자격증)</p>',
             expl='누르면 합계가 바로 계산돼요. 불참한 지원자는 「불참」을 누르고 메모에 사유를 적어요.')
    d.capture('PC에서는', '표로 보여요', 'c-p12-doc-b-touch.png', '지원자가 한 줄씩, 항목이 옆으로 놓여요. 항목이 많으면 표를 좌우로 밀어서 보세요. 고르는 방법은 휴대폰과 같아요.', which='B')
    d.phones('다 골랐으면', '저장 후 제출', [('k-m12-doc-c-submit.png', '🅐', 'A'), ('c-m12-doc-c-submit.png', '🅑', 'B')],
             side='<p>잠깐 멈출 땐 <b>임시 저장</b>.</p><p>다 됐으면 <b>저장 후 … 제출</b>.</p><p class="muted2">빈칸이 있으면 제출이 안 돼요.</p>')
    d.phones('제출하면', '끝', [('k-m12-doc-d-done.png', '🅐 제출 완료', 'A'), ('c-m12-doc-d-done.png', '🅑 제출 완료', 'B')],
             side='<p>낸 점수는 잠겨요.</p><p>고칠 게 있으면 담당 선생님께 「다시 열기」를 부탁하세요.</p>')

    d.section(3, '면접 날', '같은 링크를 다시 열고 [새로고침]')
    d.phones('면접 채점', '', [('k-m17-int-b-touch.png', '🅐 면접 점수 입력', 'A'), ('c-m17-int-b-touch.png', '🅑 면접 점수 단추(8~0)', 'B')],
             side='<p>면접 대상자만 나와요.</p><p>🅐는 항목마다 점수를 <b>숫자로</b>, 🅑는 <b>점수 단추</b>를 눌러요.</p>')
    d.phones('🅑 계약제는', '면접 ↔ 수업실연', [('c-m16-stage-switch.png', '전형 전환 단추', 'B'), ('c-m17-int-d-done.png', '면접을 내면 ✓', 'B')],
             side='<p>위쪽 <b>면접심사 · 수업실연</b> 단추로 오가요.</p><p>면접을 내면 수업실연 표로 저절로 넘어가요.</p>')
    d.phones('🅑 수업실연', '점수 단추(5~0)', [('c-m18-demo-b-touch.png', '수업실연 채점', 'B'), ('c-m18-demo-d-done.png', '두 전형 모두 제출', 'B')],
             side='<p>여섯 항목, 항목마다 5점.</p><p>다 내면 두 단추 모두 ✓ 가 붙어요.</p>')

    d.section(4, '꼭 기억해 주세요')
    d.cards('주의', '', [
        ('링크', '7일 동안, 본인만', '남에게 넘기면 그 사람이 위원님 이름으로 채점할 수 있어요.'),
        ('제출', '내면 고칠 수 없어요', '고칠 게 있으면 담당 선생님께 다시 열어 달라고 하세요.'),
        ('불참', '불참 + 사유', '지원자가 오지 않았으면 「불참」을 누르고 메모에 사유를 적어요.'),
    ])
    d.sentence(['링크 열고, 서명하고,', '<span class="hl2">눌러서 채점</span>'], '감사합니다')
    return d


# ════════════════════════════════════════ 관리자용 ════════════════════════════════════════
def manager_deck():
    d = Deck('학교 공간 사용 설명서 · 관리자용', '학교 공간 · 관리자용')
    d.cover(['학교를 등록하면,', '그 학교 공간이 열려요'], '학교 등록 · 학교 코드 · 정지 · 전체 데이터 확인')
    d.steps('관리자가 하는 일', '', [('관리자 로그인', '백암이 관리자 코드'), ('학교 등록', 'NEIS 에서 찾고 학교 코드 정하기'), ('코드 전달', '학교 담당 선생님께'), ('관리', '열기 · 코드 바꾸기 · 정지 · 삭제')],
            expl='등록하지 않았거나 정지한 학교는 들어올 수 없어요. 등록한 학교는 각자 자기 공간과 데이터만 봐요.')
    d.section(1, '관리자 로그인', '/hub/admin')
    d.capture('관리자 화면', '백암이 관리자 코드', 'h-01-admin-login.png', '주소 a-iroom.vercel.app/hub/admin. 백암이 관리자 코드로 들어와요(백암이와 같은 암호화로 확인, 따로 비밀번호를 두지 않아요). 학교 코드처럼 10번 틀리면 그 기기가 금지돼요.')
    d.section(2, '학교 등록', 'NEIS 에서 찾고, 학교 코드를 정해요')
    d.capture('NEIS 에서 찾아', '고르고 코드 정하기', 'h-02-admin-register.png', '학교 이름으로 찾으면 교육청·주소가 함께 나와요(이름이 같은 학교를 구별). 학교를 누르고 「코드 만들기」나 직접 정한 코드로 「등록」. 코드는 등록할 때 한 번만 보여 주니 바로 전해 주세요.')
    d.section(3, '학교 관리')
    d.capture('등록한 학교', '열기 · 코드 · 정지 · 삭제', 'h-03-admin-list.png', '「열기」는 그 학교 채용 관리를 관리자로 열어요(모든 채용·점수·이력 확인, 대신 작업 가능). 「코드 바꾸기」는 이전 코드를 바로 막아요. 「정지」하면 학교 사람·위원 모두 못 들어오고 데이터는 남아요.')
    d.cards('지울 때·옮길 때', '', [
        ('삭제', '학교 이름을 그대로 입력', '등록만 지우거나, 채용 데이터까지 함께 지울지 고를 수 있어요. 데이터 삭제는 되돌릴 수 없어요.'),
        ('옮기기', '백암이 채용 → 학교 공간', '백암이 안에 있던 채용을 한 학교 공간으로 복사해요. 원본은 남고, 백암이 채용 메뉴와 옛 위원 링크는 그 학교 공간으로 이어져요.'),
        ('데이터', '학교마다 따로', '학교 공간끼리는 서로 볼 수 없어요. 관리자만 모든 학교를 열 수 있어요.'),
    ])
    d.sentence(['등록한 학교만,', '<span class="hl2">자기 공간에서</span>'], '관리자는 모든 학교를 확인하고 검증해요')
    return d


INDEX = '''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>채용 관리 사용 설명서</title><meta name="description" content="백암이 채용 관리 사용 설명서 — 담당자용 · 심사위원용">
<link href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
<style>
:root{--ink:#111;--soft:#f2f2f2;--mute:#707072;--ac:#ED1AA0}
*{box-sizing:border-box}body{margin:0;background:#111;color:#fff;font-family:"Pretendard",-apple-system,"Malgun Gothic",sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 16px}
h1{font-family:"Black Han Sans","Pretendard",sans-serif;font-weight:400;font-size:clamp(40px,7vw,76px);line-height:1.1;margin:18px 0 10px;text-align:center}
.k{border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:6px 16px;font-size:14px;font-weight:700}
p.s{color:#cacacb;font-size:18px;margin:0 0 40px;text-align:center}
.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;width:100%;max-width:1080px}
a.c{display:flex;flex-direction:column;gap:10px;background:#fff;color:#111;border-radius:22px;padding:30px 28px;text-decoration:none;min-height:220px;transition:transform .15s}
a.c:hover{transform:translateY(-3px)}a.c:focus-visible{outline:3px solid var(--ac);outline-offset:3px}
a.c b{font-size:15px;color:#fff;background:var(--ac);align-self:flex-start;border-radius:999px;padding:5px 14px}
a.c h2{font-family:"Black Han Sans","Pretendard",sans-serif;font-weight:400;font-size:38px;margin:6px 0 0}
a.c span{color:var(--mute);font-size:16px;line-height:1.55}
.f{margin-top:36px;color:#9e9ea0;font-size:14px;text-align:center;line-height:1.7}.f a{color:#fff}
</style></head><body>
<span class="k">학교 공간 · 채용 관리</span><h1>사용 설명서</h1><p class="s">강사 채용 표준 · 계약제 교원 채용 표준을 한 권에</p>
<div class="g"><a class="c" href="admin.html"><b>담당자용</b><h2>채용 진행하는 선생님</h2><span>채용 만들기 · 위원 링크 · 대상자 선정 · 결과 확정 · 한글/Excel 받기</span></a>
<a class="c" href="reviewer.html"><b>심사위원용</b><h2>평가하는 위원</h2><span>링크 열기 · 서약서 서명 · 눌러서 채점 · 제출 (휴대폰 · PC)</span></a>
<a class="c" href="manager.html"><b>관리자용</b><h2>학교 공간 관리자</h2><span>학교 등록 · 학교 코드 발급 · 정지 · 전체 데이터 확인 · 백암이 채용 옮기기</span></a></div>
<p class="f">← → 로 넘기고, T 목차 · F 목록 보기 · P 인쇄 보기<br><a href="/hub">학교 공간으로</a></p>
</body></html>'''

if __name__ == '__main__':
    (OUT / 'admin.html').write_text(admin_deck().html('채용 관리 사용 설명서 · 담당자용', '백암이 채용 관리 담당자용 설명서 — 강사 채용 표준과 계약제 교원 채용 표준'), encoding='utf-8')
    (OUT / 'reviewer.html').write_text(reviewer_deck().html('채용 관리 사용 설명서 · 심사위원용', '백암이 채용 관리 심사위원용 설명서 — 링크 열기, 서명, 눌러서 채점, 제출'), encoding='utf-8')
    (OUT / 'manager.html').write_text(manager_deck().html('학교 공간 사용 설명서 · 관리자용', '학교 공간 관리자 설명서 — 학교 등록, 학교 코드, 정지, 전체 데이터 확인'), encoding='utf-8')
    (OUT / 'index.html').write_text(INDEX, encoding='utf-8')
    print('만듦:', [p.name for p in OUT.glob('*.html')])
