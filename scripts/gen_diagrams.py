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
        ("Next.js\n재료 확인/추천", "Server Action"),
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
    box_with_label(d, 60, y1 + bh + 30, bw, bh, "AI 판정", "openrouter/free · 자동, 매 요청", fill=WHITE,
                    outline=ACCENT, title_font=f_box, sub_font=f_small)

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
    text_left(d, 40, 48, "화살표 = FK 참조 방향", f_sub, MUTED)

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
    edge("fridge_sessions", "model_ratings")
    edge("recipe_requests", "model_ratings")

    save(img, "erd.png")


if __name__ == "__main__":
    gen_architecture(mock=True)
    gen_architecture(mock=False)
    gen_milestones()
    gen_model_eval()
    gen_erd()
