# -*- coding: utf-8 -*-
"""Generate the teaching diagrams under docs/diagrams/ using plain PIL drawing
(no internet, no graphviz/svg tooling available in this environment).
Palette matches md_to_pdf.py so the PDFs look like one family of documents.

Re-run after future feature rounds: `python3 scripts/gen_diagrams.py`.
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "diagrams")
os.makedirs(OUT_DIR, exist_ok=True)

FONT_PATH = "/System/Library/Fonts/Supplemental/AppleGothic.ttf"

INK = (34, 36, 43)
MUTED = (107, 111, 118)
ACCENT = (91, 83, 168)
ACCENT_SOFT = (239, 237, 249)
LINE = (222, 219, 232)
WHITE = (255, 255, 255)
GREEN = (46, 143, 90)
GREEN_SOFT = (227, 244, 234)
AMBER = (191, 122, 22)
AMBER_SOFT = (250, 236, 214)

SCALE = 2  # supersample then downscale for crisper text/lines


def font(size, bold=False):
    return ImageFont.truetype(FONT_PATH, size * SCALE)


def new_canvas(w, h, bg=WHITE):
    return Image.new("RGB", (w * SCALE, h * SCALE), bg)


def save(img, name):
    img = img.resize((img.width // SCALE, img.height // SCALE), Image.LANCZOS)
    path = os.path.join(OUT_DIR, name)
    img.save(path, "PNG")
    print("wrote", path, img.size)


def s(v):
    return v * SCALE


def rounded_box(d, xy, radius=10, fill=WHITE, outline=ACCENT, width=2):
    d.rounded_rectangle([s(v) for v in xy], radius=s(radius), fill=fill,
                         outline=outline, width=s(width))


def text_centered(d, cx, cy, txt, f, fill=INK):
    bbox = d.textbbox((0, 0), txt, font=f)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((s(cx) - w / 2, s(cy) - h / 2 - bbox[1]), txt, font=f, fill=fill)


def text_left(d, x, y, txt, f, fill=INK):
    d.text((s(x), s(y)), txt, font=f, fill=fill)


def wrap_lines(txt, width_chars):
    words = txt.split(" ")
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if len(trial) > width_chars and cur:
            lines.append(cur)
            cur = w
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines


def arrow(d, p1, p2, color=ACCENT, width=3, head=9):
    x1, y1 = p1
    x2, y2 = p2
    d.line([s(x1), s(y1), s(x2), s(y2)], fill=color, width=s(width))
    import math
    ang = math.atan2(y2 - y1, x2 - x1)
    hx, hy = s(x2), s(y2)
    a1 = ang + math.radians(150)
    a2 = ang - math.radians(150)
    l = s(head)
    d.polygon([
        (hx, hy),
        (hx + l * math.cos(a1), hy + l * math.sin(a1)),
        (hx + l * math.cos(a2), hy + l * math.sin(a2)),
    ], fill=color)


def elbow(d, points, color=ACCENT, width=2, head=7):
    """Draw a multi-segment orthogonal connector; arrowhead only on the last leg."""
    for i in range(len(points) - 1):
        if i < len(points) - 2:
            d.line([s(points[i][0]), s(points[i][1]), s(points[i + 1][0]), s(points[i + 1][1])],
                   fill=color, width=s(width))
        else:
            arrow(d, points[i], points[i + 1], color=color, width=width, head=head)


def dashed_rounded_rect(d, xy, radius=12, color=MUTED, width=2, dash=14, gap=8):
    """Approximate a dashed rounded-rectangle border by drawing short dash segments
    along the four edges (corners left solid-ish for simplicity)."""
    x0, y0, x1, y1 = xy

    def dashed_line(p1, p2):
        import math
        x1_, y1_ = p1
        x2_, y2_ = p2
        length = math.hypot(x2_ - x1_, y2_ - y1_)
        if length == 0:
            return
        ux, uy = (x2_ - x1_) / length, (y2_ - y1_) / length
        pos = 0.0
        while pos < length:
            seg_end = min(pos + dash, length)
            d.line([s(x1_ + ux * pos), s(y1_ + uy * pos), s(x1_ + ux * seg_end), s(y1_ + uy * seg_end)],
                   fill=color, width=s(width))
            pos += dash + gap

    dashed_line((x0 + radius, y0), (x1 - radius, y0))
    dashed_line((x0 + radius, y1), (x1 - radius, y1))
    dashed_line((x0, y0 + radius), (x0, y1 - radius))
    dashed_line((x1, y0 + radius), (x1, y1 - radius))
    d.arc([s(x0), s(y0), s(x0 + radius * 2), s(y0 + radius * 2)], 180, 270, fill=color, width=s(width))
    d.arc([s(x1 - radius * 2), s(y0), s(x1), s(y0 + radius * 2)], 270, 360, fill=color, width=s(width))
    d.arc([s(x0), s(y1 - radius * 2), s(x0 + radius * 2), s(y1)], 90, 180, fill=color, width=s(width))
    d.arc([s(x1 - radius * 2), s(y1 - radius * 2), s(x1), s(y1)], 0, 90, fill=color, width=s(width))


def tag(d, cx, top, text, f, fill, text_color=WHITE, pad_x=10, pad_y=5):
    """A small rounded pill label, e.g. a 'hosted on Vercel' sticker."""
    bbox = d.textbbox((0, 0), text, font=f)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    box_w, box_h = w / SCALE + pad_x * 2, h / SCALE + pad_y * 2
    x0 = cx - box_w / 2
    rounded_box(d, (x0, top, x0 + box_w, top + box_h), radius=box_h / 2, fill=fill, outline=fill, width=1)
    text_centered(d, cx, top + box_h / 2, text, f, text_color)
    return box_h


def box_with_label(d, x, y, w, h, title, subtitle=None, fill=WHITE, outline=ACCENT,
                    title_font=None, sub_font=None, title_color=INK, sub_color=MUTED):
    rounded_box(d, (x, y, x + w, y + h), radius=10, fill=fill, outline=outline, width=2)
    if subtitle:
        text_centered(d, x + w / 2, y + h / 2 - 9, title, title_font, title_color)
        text_centered(d, x + w / 2, y + h / 2 + 11, subtitle, sub_font, sub_color)
    else:
        text_centered(d, x + w / 2, y + h / 2, title, title_font, title_color)


# ============================================================
# 1. Architecture / data-flow diagram
# ============================================================
def gen_architecture(mock=False):
    W, H = 1200, 620
    img = new_canvas(W, H)
    d = ImageDraw.Draw(img)
    f_title = font(18, bold=True)
    f_box = font(14)
    f_sub = font(11)
    f_small = font(10)

    text_left(d, 40, 24, "아키텍처 / 데이터 흐름도" + (" (MVP · mock)" if mock else ""), f_title, INK)
    text_left(d, 40, 52,
               "냉장고 사진 한 장이 레시피 3개로 바뀌기까지" + (" — 이 시점엔 AI 호출이 전부 하드코딩된 mock" if mock else ""),
               f_sub, MUTED)

    bw, bh = 168, 64
    y1 = 110
    xs = [40, 250, 460, 670, 880]
    vision_label = "비전 Provider\n(mock)" if mock else "비전 API\nOpenRouter"
    text_label = "텍스트 Provider\n(mock)" if mock else "텍스트 API\nOpenRouter"
    labels = [
        ("사용자\n(브라우저)", None),
        ("Next.js\n사진 업로드", "Server Action"),
        (vision_label, "재료 인식(가짜 응답)" if mock else "재료 인식"),
        ("Next.js\n재료 확인/추천 요청", "Server Action"),
        (text_label, "레시피 생성(가짜 응답)" if mock else "레시피 생성"),
    ]
    centers = []
    for x, (title, sub) in zip(xs, labels):
        fill = ACCENT_SOFT if ("API" in title or "Provider" in title) else WHITE
        box_with_label(d, x, y1, bw, bh, title.split("\n")[0], None, fill=fill,
                        outline=ACCENT, title_font=f_box)
        # second line of title
        text_centered(d, x + bw / 2, y1 + bh / 2 + 16, title.split("\n")[1] if "\n" in title else "",
                       f_box, INK)
        if sub:
            text_centered(d, x + bw / 2, y1 - 14, sub, f_small, MUTED)
        centers.append((x + bw, y1 + bh / 2, x, y1 + bh / 2))

    # Vercel hosting tags — the two Next.js boxes (index 1, 3) actually run on Vercel;
    # a small sticker makes that explicit instead of leaving it implied.
    for idx in (1, 3):
        x = xs[idx]
        tag(d, x + bw / 2, y1 - 38, "Vercel에서 실행", f_small, INK)

    for i in range(len(xs) - 1):
        y = y1 + bh / 2
        arrow(d, (xs[i] + bw, y), (xs[i + 1], y))

    # result box at the end
    rx, ry, rw, rh = 880, 230, 168, 64
    box_with_label(d, rx, ry, rw, rh, "추천 레시피 3개", "요리명·재료·조리단계", fill=GREEN_SOFT,
                    outline=GREEN, title_font=f_box, sub_font=f_small, sub_color=GREEN)
    arrow(d, (880 + bw / 2, y1 + bh), (rx + rw / 2, ry), color=GREEN)

    # Supabase box spanning bottom
    sy = 400
    sbw, sbh = 1040, 150
    rounded_box(d, (40, sy, 40 + sbw, sy + sbh), radius=14, fill=(250, 250, 252), outline=LINE, width=2)
    text_left(d, 60, sy + 14, "Supabase", f_box, ACCENT)

    sub_w, sub_h = 300, 80
    sub_y = sy + 50
    sub_boxes = [
        (70, "Auth", "이메일/비밀번호, Google OAuth"),
        (410, "Postgres", "profiles·세션·재료·레시피·평가 (RLS 적용)"),
        (750, "Storage", "냉장고 사진 (private bucket, signed URL)"),
    ]
    for x, title, sub in sub_boxes:
        box_with_label(d, x, sub_y, sub_w, sub_h, title, None, fill=WHITE, outline=ACCENT,
                        title_font=f_box)
        for j, line in enumerate(wrap_lines(sub, 26)):
            text_centered(d, x + sub_w / 2, sub_y + sub_h / 2 + 14 + j * 15, line, f_small, MUTED)

    # vertical arrows from Next.js boxes down to Supabase
    for x in (250, 670):
        arrow(d, (x + bw / 2, y1 + bh), (x + bw / 2, sy), color=MUTED, width=2)

    # Google Cloud Console — issues the OAuth key that Supabase Auth uses for
    # "구글로 로그인"; drawn as a small external box feeding into the Auth sub-box
    # so its scope (a key issuer, not a data store) reads clearly.
    gx0, gy0, gw0, gh0 = 40, sy - 92, 240, 62
    box_with_label(d, gx0, gy0, gw0, gh0, "Google Cloud Console", "OAuth 열쇠 발급", fill=WHITE,
                    outline=GREEN, title_font=f_small, sub_font=f_small, title_color=GREEN,
                    sub_color=MUTED)
    arrow(d, (gx0 + gw0 / 2, gy0 + gh0), (70 + sub_w / 2, sub_y), color=GREEN, width=2)

    save(img, "architecture_mock.png" if mock else "architecture.png")


# ============================================================
# 2. Milestone timeline
# ============================================================
def gen_milestones():
    W, H = 1200, 460
    img = new_canvas(W, H)
    d = ImageDraw.Draw(img)
    f_title = font(18, bold=True)
    f_sub = font(11)
    f_box = font(12)
    f_small = font(10)

    text_left(d, 40, 24, "이정표: 초기 계획 vs 현재 상황", f_title, INK)
    text_left(d, 40, 52, "PRD 9장 기준", f_sub, MUTED)

    def row(y, heading, items, fill, outline, text_color):
        text_left(d, 40, y, heading, f_box, ACCENT)
        bw, bh, gap = 138, 74, 8
        x = 40
        yy = y + 26
        for num, title, sub in items:
            rounded_box(d, (x, yy, x + bw, yy + bh), radius=8, fill=fill, outline=outline, width=2)
            text_centered(d, x + bw / 2, yy + 16, f"{num}. {title}", f_box, text_color)
            for j, line in enumerate(wrap_lines(sub, 15)):
                text_centered(d, x + bw / 2, yy + 38 + j * 13, line, f_small, MUTED)
            text_left(d, x + 6, yy + bh - 16, "완료", f_small, GREEN)
            x += bw + gap
        return yy + bh

    y2 = row(90, "① 초기 계획 (PRD 초안) — 전부 완료", [
        (1, "PRD 확정", ""),
        (2, "디자인 시안", "3종"),
        (3, "MVP", "파이프라인"),
        (4, "인증", "+ 개인화"),
        (5, "API 선택 UI", ""),
        (6, "보안 점검", ""),
        (7, "배포", ""),
        (8, "문서화", ""),
    ], GREEN_SOFT, GREEN, INK)

    y3 = row(y2 + 60, "② 계획에 없던 확장 작업 — 전부 완료", [
        (9, "UX 고도화", "마법사·반응형"),
        (10, "브랜드 리뉴얼", "찰칵레시피"),
        (11, "공개 평가 전환", "관리자→회원"),
        (12, "AI 모델 품질평가", "신규 시스템"),
        (13, "평가 메뉴 분리", "레시피/모델"),
        (14, "버그 수정 3건", "확대·overflow"),
    ], ACCENT_SOFT, ACCENT, INK)

    text_left(d, 40, y3 + 60, "남은 일: 없음 — D4 API 검증, 저장버튼 아이콘 확인, 문서화 모두 완료", f_sub, MUTED)

    save(img, "milestones.png")


# ============================================================
# 3. AI model quality-rating architecture
# ============================================================
def gen_model_eval():
    W, H = 1200, 530
    img = new_canvas(W, H)
    d = ImageDraw.Draw(img)
    f_title = font(18, bold=True)
    f_sub = font(11)
    f_box = font(13)
    f_small = font(10)

    text_left(d, 40, 24, "AI 모델 품질평가 구조도", f_title, INK)
    text_left(d, 40, 52, "사용자 평가 + AI 판정 → 집계 → 자동 우선순위 반영", f_sub, MUTED)

    bw, bh = 260, 90
    y1 = 110
    box_with_label(d, 60, y1, bw, bh, "사용자 평가", "1~5점 · 세션/배치당 1회", fill=WHITE,
                    outline=ACCENT, title_font=f_box, sub_font=f_small)
    box_with_label(d, 60, y1 + bh + 30, bw, bh, "AI 판정", "인식·추천할 때마다 서버가 자동 채점", fill=WHITE,
                    outline=ACCENT, title_font=f_box, sub_font=f_small)
    text_centered(d, 60 + bw / 2, y1 + bh + 30 + bh / 2 + 27, "(openrouter/free 모델 사용)", f_small, MUTED)

    mx, my, mw, mh = 420, y1 + bh / 2 + 15 - 20, 260, 100
    box_with_label(d, mx, my, mw, mh, "model_ratings", "subject_type · source · score", fill=ACCENT_SOFT,
                    outline=ACCENT, title_font=f_box, sub_font=f_small)

    arrow(d, (60 + bw, y1 + bh / 2), (mx, my + mh / 2 - 15))
    arrow(d, (60 + bw, y1 + bh + 30 + bh / 2), (mx, my + mh / 2 + 15))

    ax, ay, aw, ah = 760, my - 10, 260, 60
    box_with_label(d, ax, ay, aw, ah, "집계", "모델별 평균 · 표본 수", fill=WHITE, outline=ACCENT,
                    title_font=f_box, sub_font=f_small)
    arrow(d, (mx + mw, my + mh / 2), (ax, ay + ah / 2))

    gx, gy, gw, gh = 760, ay + ah + 20, 260, 60
    box_with_label(d, gx, gy, gw, gh, f"최소 표본 게이트", "MIN_SAMPLES = 5", fill=AMBER_SOFT,
                    outline=AMBER, title_font=f_box, sub_font=f_small, sub_color=AMBER)
    arrow(d, (ax + aw / 2, ay + ah), (gx + gw / 2, gy), color=MUTED)

    ox1, oy1 = 1040, ay - 30
    ow, oh = 130, 60
    box_with_label(d, ox1, oy1, ow, oh, "/models", "점수판 표시", fill=GREEN_SOFT, outline=GREEN,
                    title_font=f_box, sub_font=f_small, sub_color=GREEN)
    arrow(d, (ax + aw, ay + ah / 2), (ox1, oy1 + oh / 2), color=GREEN)

    ox2, oy2 = 1040, gy + 5
    box_with_label(d, ox2, oy2, ow, oh, "선택 드롭다운", "우선순위 자동정렬", fill=GREEN_SOFT, outline=GREEN,
                    title_font=f_box, sub_font=f_small, sub_color=GREEN)
    arrow(d, (gx + gw, gy + gh / 2), (ox2, oy2 + oh / 2), color=GREEN)

    text_left(d, 40, 470, "공개 동의: fridge_sessions.public_consent — 기능 도입 이후 세션만 기본 동의, 과거 세션은 제외",
              f_sub, MUTED)
    text_left(d, 40, 495, "레시피 인기투표(recipe_feedback: 좋아요/싫어요)와는 완전히 분리된 별도 데이터", f_sub, MUTED)

    save(img, "model_eval.png")


# ============================================================
# 4. ERD
# ============================================================
def gen_erd():
    W, H = 1300, 620
    img = new_canvas(W, H)
    d = ImageDraw.Draw(img)
    f_title = font(18, bold=True)
    f_sub = font(11)
    f_name = font(13)
    f_col = font(10)

    text_left(d, 40, 20, "데이터베이스 ERD (핵심 테이블)", f_title, INK)
    arrow(d, (40, 58), (95, 58), color=MUTED, width=2, head=6)
    text_left(d, 105, 50, "화살표 방향: 왼쪽 표의 한 행이, 화살표가 가리키는 오른쪽 표의 여러 행과 연결된다는 뜻 (1:N)",
              f_sub, MUTED)

    tables = {
        "profiles": (40, 100, 200, ["id (PK, =auth user)", "cuisine_type, theme", "is_admin (미사용)"]),
        "fridge_sessions": (300, 100, 210, ["id (PK)", "user_id (FK)", "public_consent"]),
        "fridge_images": (300, 250, 210, ["id (PK)", "session_id (FK)"]),
        "detected_ingredients": (300, 360, 210, ["id (PK)", "session_id (FK)"]),
        "recipe_requests": (580, 100, 210, ["id (PK)", "session_id (FK)", "text_provider"]),
        "recipes": (860, 100, 210, ["id (PK)", "request_id (FK)", "title, steps_json"]),
        "saved_recipes": (860, 250, 210, ["id (PK)", "user_id (FK)", "recipe_id (FK)"]),
        "recipe_feedback": (860, 360, 210, ["id (PK)", "recipe_id (FK)", "reaction, comment"]),
        "model_ratings": (580, 500, 210, ["id (PK)", "session_id / request_id (FK)", "subject_type, source, score"]),
    }

    boxes = {}
    for name, (x, y, w, cols) in tables.items():
        h = 34 + 16 * len(cols)
        boxes[name] = (x, y, w, h)
        rounded_box(d, (x, y, x + w, y + h), radius=8, fill=WHITE, outline=ACCENT, width=2)
        d.line([s(x), s(y + 30), s(x + w), s(y + 30)], fill=LINE, width=s(1))
        text_centered(d, x + w / 2, y + 15, name, f_name, ACCENT)
        for i, col in enumerate(cols):
            text_left(d, x + 10, y + 36 + i * 16, col, f_col, INK)

    def edge(a, b):
        ax, ay, aw, ah = boxes[a]
        bx, by, bw, bh = boxes[b]
        x_overlap = min(ax + aw, bx + bw) - max(ax, bx)
        if x_overlap > 20 and by != ay:
            # vertically stacked (or offset-diagonal-but-same-column): connect
            # bottom-center <-> top-center, ordered by which is actually above
            if by > ay:
                p1 = (ax + aw * 0.5, ay + ah)
                p2 = (bx + bw * 0.5, by)
            else:
                p1 = (ax + aw * 0.5, ay)
                p2 = (bx + bw * 0.5, by + bh)
        else:
            # side by side: connect near edges
            if bx >= ax + aw:
                p1 = (ax + aw, ay + ah / 2)
                p2 = (bx, by + bh / 2)
            else:
                p1 = (ax, ay + ah / 2)
                p2 = (bx + bw, by + bh / 2)
        arrow(d, p1, p2, color=MUTED, width=2, head=7)

    edge("profiles", "fridge_sessions")
    edge("fridge_sessions", "fridge_images")
    edge("fridge_sessions", "detected_ingredients")
    edge("fridge_sessions", "recipe_requests")
    edge("recipe_requests", "recipes")
    edge("recipes", "saved_recipes")
    edge("recipes", "recipe_feedback")
    edge("recipe_requests", "model_ratings")

    # fridge_sessions -> model_ratings is routed by hand as an elbow through the
    # empty channel between the fridge_images/detected_ingredients column and the
    # recipe_requests/model_ratings column, so it never crosses another table box.
    fsx, fsy, fsw, fsh = boxes["fridge_sessions"]
    mrx, mry, mrw, mrh = boxes["model_ratings"]
    elbow(d, [
        (fsx + fsw * 0.5, fsy + fsh),
        (545, fsy + fsh),
        (545, mry + mrh * 0.5),
        (mrx, mry + mrh * 0.5),
    ], color=MUTED, width=2, head=7)

    save(img, "erd.png")


# ============================================================
# 5. Full journey map (idea -> docs), for the v2 lecture opener
# ============================================================
def gen_journey():
    W, H = 1300, 640
    img = new_canvas(W, H)
    d = ImageDraw.Draw(img)
    f_title = font(20, bold=True)
    f_sub = font(12)
    f_box = font(13)
    f_small = font(10)

    text_left(d, 40, 22, "전체 개발 여정 지도", f_title, INK)
    text_left(d, 40, 54, "아이디어 한 문장에서 오늘의 찰칵레시피가 되기까지, 열 걸음", f_sub, MUTED)

    row1 = [
        ("1", "아이디어", "일상의 작은 불편 발견"),
        ("2", "PRD 작성", "무엇을 만들지 글로 정리"),
        ("3", "계정·환경 준비", "5개 사이트 가입·연결"),
        ("4", "mock으로 완성", "가짜 응답으로 전체 흐름"),
        ("5", "실제 AI 연동", "OpenRouter로 교체"),
    ]
    row2 = [
        ("6", "배포", "Vercel로 실제 공개"),
        ("7", "실사용 테스트", "직접 써보며 확인"),
        ("8", "버그 수정·보완", "발견한 문제 고치기"),
        ("9", "확장(신기능)", "계획에 없던 아이디어"),
        ("10", "문서화", "과정을 기록해 남기기"),
    ]

    bw, bh, gap = 220, 130, 15
    y1 = 100
    y2 = y1 + bh + 70

    def draw_row(items, y, fill, outline):
        boxes = []
        for i, (num, title, desc) in enumerate(items):
            x = 40 + (bw + gap) * i
            rounded_box(d, (x, y, x + bw, y + bh), radius=10, fill=fill, outline=outline, width=2)
            text_centered(d, x + 34, y + 28, num, f_title, outline)
            text_centered(d, x + bw / 2 + 14, y + 28, title, f_box, INK)
            for j, line in enumerate(wrap_lines(desc, 16)):
                text_centered(d, x + bw / 2, y + 62 + j * 17, line, f_small, MUTED)
            boxes.append((x, y, bw, bh))
            if i < len(items) - 1:
                arrow(d, (x + bw, y + bh / 2), (x + bw + gap, y + bh / 2), color=outline)
        return boxes

    boxes1 = draw_row(row1, y1, ACCENT_SOFT, ACCENT)
    boxes2 = draw_row(row2, y2, GREEN_SOFT, GREEN)

    # connector wrapping from end of row 1 down to start of row 2
    lx, ly, lw, lh = boxes1[-1]
    nx_, ny_, nw_, nh_ = boxes2[0]
    elbow(d, [
        (lx + lw / 2, ly + lh),
        (lx + lw / 2, y1 + bh + 35),
        (nx_ + nw_ / 2, y1 + bh + 35),
        (nx_ + nw_ / 2, ny_),
    ], color=ACCENT, width=2, head=7)

    # feedback loop annotation: testing/fixing often sends you back to earlier steps.
    # Steps 4-8 span the tail of row1 (mock, 실API연동) and the head+middle of row2
    # (배포, 실사용테스트, 버그수정·보완) — two separate dashed frames, since the two
    # rows don't line up in x.
    fx0, fy0, fw0, fh0 = boxes1[3]
    lx1, ly1, lw1, lh1 = boxes1[4]
    dashed_rounded_rect(d, (fx0 - 6, fy0 - 6, lx1 + lw1 + 6, ly1 + lh1 + 6), radius=16,
                        color=MUTED, width=2, dash=10, gap=6)
    bx0, by0, bw0, bh0 = boxes2[0]
    bx1, by1, bw1, bh1 = boxes2[2]
    dashed_rounded_rect(d, (bx0 - 6, by0 - 6, bx1 + bw1 + 6, by1 + bh1 + 6), radius=16,
                        color=MUTED, width=2, dash=10, gap=6)
    loop_y = y2 + bh + 34
    text_centered(d, W / 2 + 20, loop_y,
                  "🔁 점선으로 묶은 4~8단계는 한 번에 끝나지 않는다 — 문제를 발견할 때마다 이 구간을 여러 번 되돌아간다",
                  f_sub, MUTED)

    save(img, "journey.png")


if __name__ == "__main__":
    gen_architecture(mock=True)
    gen_architecture(mock=False)
    gen_milestones()
    gen_model_eval()
    gen_erd()
    gen_journey()
