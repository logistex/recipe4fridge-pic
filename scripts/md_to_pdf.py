import os
import re
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Preformatted, HRFlowable, PageBreak, KeepTogether, Image as RLImage,
)
from PIL import Image as PILImage

SRC = sys.argv[1]
OUT = sys.argv[2]
DOC_TITLE = sys.argv[3] if len(sys.argv) > 3 else "Document"
DOC_SUBTITLE = sys.argv[4] if len(sys.argv) > 4 else ""

# ---------- fonts ----------
KOR = "Korean"
pdfmetrics.registerFont(TTFont(KOR, "/System/Library/Fonts/Supplemental/AppleGothic.ttf"))
pdfmetrics.registerFontFamily(KOR, normal=KOR, bold=KOR, italic=KOR, boldItalic=KOR)

INK = colors.HexColor("#22242b")
MUTED = colors.HexColor("#6b6f76")
ACCENT = colors.HexColor("#5b53a8")
ACCENT_SOFT = colors.HexColor("#efedf9")
LINE = colors.HexColor("#dedbe8")
CODE_BG = colors.HexColor("#f4f3f8")

# ---------- styles ----------
S_TITLE = ParagraphStyle("title", fontName=KOR, fontSize=22, leading=27,
                          textColor=INK, spaceAfter=2)
S_SUBTITLE = ParagraphStyle("subtitle", fontName=KOR, fontSize=11, leading=15,
                             textColor=MUTED, spaceAfter=0)
S_META = ParagraphStyle("meta", fontName=KOR, fontSize=9, leading=13,
                         textColor=MUTED, spaceAfter=0)

S_H2 = ParagraphStyle("h2", fontName=KOR, fontSize=14.5, leading=19,
                       textColor=ACCENT, spaceBefore=18, spaceAfter=8)
S_H3 = ParagraphStyle("h3", fontName=KOR, fontSize=11.5, leading=16,
                       textColor=INK, spaceBefore=10, spaceAfter=5)
S_LABEL = ParagraphStyle("label", fontName=KOR, fontSize=10, leading=14,
                          textColor=ACCENT, spaceBefore=8, spaceAfter=3)

S_BODY = ParagraphStyle("body", fontName=KOR, fontSize=9.7, leading=15,
                         textColor=INK, spaceAfter=5)
S_BULLET = ParagraphStyle("bullet", fontName=KOR, fontSize=9.7, leading=14.5,
                           textColor=INK, leftIndent=14, spaceAfter=3,
                           bulletIndent=2)
S_NUM = ParagraphStyle("num", fontName=KOR, fontSize=9.7, leading=14.5,
                        textColor=INK, leftIndent=16, spaceAfter=3)
S_QUOTE = ParagraphStyle("quote", fontName=KOR, fontSize=9, leading=13.5,
                          textColor=MUTED, spaceAfter=4)
S_CELL = ParagraphStyle("cell", fontName=KOR, fontSize=9, leading=13, textColor=INK)
S_CELL_HEAD = ParagraphStyle("cellhead", fontName=KOR, fontSize=9.3, leading=13,
                              textColor=colors.white)
S_CODE = ParagraphStyle("code", fontName=KOR, fontSize=8, leading=11.8,
                         textColor=INK)


def inline(text):
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"\*\*(.+?)\*\*", r'<font color="#5b53a8">\1</font>', text)
    text = re.sub(r"`([^`]+)`",
                   r'<font face="Courier" size="8.6" color="#3c3960">\1</font>', text)
    return text


def build_table(rows):
    data = []
    for i, row in enumerate(rows):
        style = S_CELL_HEAD if i == 0 else S_CELL
        data.append([Paragraph(inline(c.strip()), style) for c in row])
    ncols = len(rows[0])
    avail = 495
    if ncols == 2:
        widths = [avail * 0.32, avail * 0.68]
    else:
        widths = [avail / ncols] * ncols
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.6, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#faf9fc")]),
    ]))
    return t


IMG_RE = re.compile(r"^!\[([^\]]*)\]\(([^)]+)\)$")
AVAIL_W = 495


def build_image(alt, rel_path, base_dir):
    path = os.path.normpath(os.path.join(base_dir, rel_path))
    with PILImage.open(path) as im:
        px_w, px_h = im.size
    w = AVAIL_W
    h = w * px_h / px_w
    max_h = 700
    if h > max_h:
        h = max_h
        w = h * px_w / px_h
    items = [RLImage(path, width=w, height=h)]
    if alt:
        items.append(Spacer(1, 3))
        items.append(Paragraph(inline(alt), S_QUOTE))
    items.append(Spacer(1, 10))
    return KeepTogether(items)


def parse(md_text, base_dir="."):
    flow = []
    lines = md_text.split("\n")
    i = 0
    table_buf = []
    quote_buf = []

    def flush_table():
        nonlocal table_buf
        if table_buf:
            flow.append(Spacer(1, 4))
            flow.append(build_table(table_buf))
            flow.append(Spacer(1, 8))
            table_buf = []

    def flush_quote():
        nonlocal quote_buf
        if quote_buf:
            para = Paragraph(inline(" ".join(quote_buf)), S_QUOTE)
            bar = Table([[Paragraph("", S_QUOTE), para]], colWidths=[6, 489])
            bar.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (0, 0), ACCENT),
                ("BACKGROUND", (1, 0), (1, 0), ACCENT_SOFT),
                ("LEFTPADDING", (0, 0), (0, 0), 0),
                ("RIGHTPADDING", (0, 0), (0, 0), 0),
                ("LEFTPADDING", (1, 0), (1, 0), 10),
                ("RIGHTPADDING", (1, 0), (1, 0), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]))
            flow.append(Spacer(1, 3))
            flow.append(bar)
            flow.append(Spacer(1, 8))
            quote_buf = []

    while i < len(lines):
        raw = lines[i]
        line = raw.rstrip()
        stripped = line.strip()

        if stripped.startswith("```"):
            flush_table(); flush_quote()
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            code_str = "\n".join(code_lines)
            box = Table([[Preformatted(code_str, S_CODE)]], colWidths=[495])
            box.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]))
            flow.append(box)
            flow.append(Spacer(1, 8))
            i += 1
            continue

        if stripped.startswith("|"):
            flush_quote()
            cells = [c for c in stripped.strip("|").split("|")]
            if re.match(r"^[\s\-:]+$", stripped.strip("|").replace("|", "")):
                i += 1
                continue
            table_buf.append(cells)
            i += 1
            continue
        else:
            flush_table()

        if stripped.startswith(">"):
            quote_buf.append(stripped.lstrip(">").strip())
            i += 1
            continue
        else:
            flush_quote()

        if not stripped:
            i += 1
            continue

        img_m = IMG_RE.match(stripped)
        if img_m:
            flow.append(build_image(img_m.group(1), img_m.group(2), base_dir))
            i += 1
            continue

        if stripped.startswith("# "):
            flow.append(Paragraph(inline(stripped[2:]), S_TITLE))
        elif stripped.startswith("## "):
            flow.append(HRFlowable(width="100%", thickness=0.6, color=LINE,
                                    spaceBefore=2, spaceAfter=0))
            flow.append(Paragraph(inline(stripped[3:]), S_H2))
        elif stripped.startswith("### "):
            flow.append(Paragraph(inline(stripped[4:]), S_H3))
        elif re.match(r"^\*\*(.+)\*\*$", stripped):
            flow.append(Paragraph(inline(stripped), S_LABEL))
        elif stripped.startswith("- "):
            txt = inline(stripped[2:])
            flow.append(Paragraph(f'<bullet>&#8226;</bullet>{txt}', S_BULLET))
        elif re.match(r"^\d+\.\s", stripped):
            m = re.match(r"^(\d+)\.\s(.*)$", stripped)
            flow.append(Paragraph(f'<bullet>{m.group(1)}.</bullet>{inline(m.group(2))}', S_NUM))
        else:
            flow.append(Paragraph(inline(stripped), S_BODY))
        i += 1

    flush_table()
    flush_quote()
    return flow


def main():
    with open(SRC, encoding="utf-8") as f:
        md = f.read()

    doc = SimpleDocTemplate(
        OUT, pagesize=A4,
        leftMargin=50, rightMargin=50, topMargin=54, bottomMargin=48,
        title=DOC_TITLE,
    )

    story = []
    story.append(Paragraph(DOC_TITLE, S_TITLE))
    if DOC_SUBTITLE:
        story.append(Paragraph(DOC_SUBTITLE, S_SUBTITLE))
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=14))

    body_flow = parse(md, base_dir=os.path.dirname(os.path.abspath(SRC)))
    if body_flow and isinstance(body_flow[0], Paragraph) and body_flow[0].style.name == "title":
        body_flow = body_flow[1:]
    story.extend(body_flow)

    def on_page(canvas, doc_):
        canvas.saveState()
        canvas.setFont(KOR, 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(50, 28, "recipe4fridge_pic")
        canvas.drawRightString(545, 28, f"{doc_.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
