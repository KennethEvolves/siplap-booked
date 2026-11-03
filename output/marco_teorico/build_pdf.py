from pathlib import Path
import json
import re
from html import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import cm
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
source = (ROOT / 'marco_teorico_siplap_booked.md').read_text(encoding='utf-8')
source = source.replace('—', '-')
body, references = source.split('<!-- REFERENCES -->')
blocks = body.strip().split('<!-- PAGEBREAK -->')
assert len(blocks) == 25
for name, file in [('TNR', 'times.ttf'), ('TNRBold', 'timesbd.ttf'), ('TNRItalic', 'timesi.ttf')]:
    pdfmetrics.registerFont(TTFont(name, f'C:/Windows/Fonts/{file}'))
pdfmetrics.registerFontFamily('TNR', normal='TNR', bold='TNRBold', italic='TNRItalic')
W, H = A4
M = 2.5 * cm
width = W - 2 * M
normal = ParagraphStyle('Body', fontName='TNR', fontSize=12, leading=18,
                        alignment=TA_JUSTIFY, firstLineIndent=1.25 * cm, spaceAfter=4)
heading = ParagraphStyle('Heading', fontName='TNRBold', fontSize=13, leading=17,
                         alignment=TA_LEFT, spaceAfter=12)
title = ParagraphStyle('Title', fontName='TNRBold', fontSize=15, leading=19, spaceAfter=12)
refstyle = ParagraphStyle('Reference', fontName='TNR', fontSize=11, leading=15,
                          alignment=TA_LEFT, leftIndent=1.25*cm, firstLineIndent=-1.25*cm,
                          spaceAfter=10, splitLongWords=True)
pdfpath = ROOT / 'marco_teorico_siplap_booked.pdf'
c = canvas.Canvas(str(pdfpath), pagesize=A4)
c.setTitle('Marco teórico del control de acceso en SIPLAP Booked')
c.setAuthor('Jaziel Anatanai Euan Be')
c.setSubject('Fundamentos conceptos y teorías aplicadas al Sistema de Planeación Institucional')
qa = []

def furniture(page, is_ref=False):
    c.setFont('TNR', 9)
    c.drawString(M, H - 1.5*cm, 'SIPLAP Booked  |  Sistema de Planeación Institucional')
    c.drawRightString(W-M, 1.5*cm, str(page))
    c.drawString(M, 1.5*cm, 'Referencias' if is_ref else 'Marco teórico')

for index, block in enumerate(blocks, 1):
    furniture(index)
    y = H - M
    for raw in re.split(r'\n\s*\n', block.strip()):
        raw = raw.strip()
        if raw.startswith('# '):
            style, text = title, raw[2:]
        elif raw.startswith('## '):
            style, text = heading, raw[3:]
        else:
            style, text = normal, raw
        p = Paragraph(escape(text).replace('\n', ' '), style)
        _, height = p.wrap(width, H)
        if y - height < M:
            raise ValueError(f'Page {index} overflow by {M - y + height:.1f} pt')
        p.drawOn(c, M, y-height)
        y -= height + style.spaceAfter
    qa.append({'page':index,'words':len(block.split()), 'bottom_text_y':round(y,1),
               'free_space_pt':round(y-M,1)})
    c.showPage()

page = 26
furniture(page, True)
y = H - M
for raw in re.split(r'\n\s*\n', references.strip()):
    raw = raw.strip()
    style = heading if raw.startswith('## ') else refstyle
    raw = raw[3:] if raw.startswith('## ') else raw
    text = escape(raw)
    text = re.sub(r'(https?://[^\s]+)', r'<link href="\1" color="#000000">\1</link>', text)
    p = Paragraph(text, style)
    _, height = p.wrap(width, H)
    if y - height < M:
        c.showPage()
        page += 1
        furniture(page, True)
        y = H - M
    p.drawOn(c, M, y-height)
    y -= height + style.spaceAfter
c.save()
reader = PdfReader(pdfpath)
assert len(reader.pages) == page
for i, block in enumerate(blocks):
    expected_heading = next(line[3:] for line in block.splitlines() if line.startswith('## '))
    actual = reader.pages[i].extract_text()
    assert expected_heading in actual.replace('\n',' '), (i, expected_heading)
    last_sentence = re.split(r'\n\s*\n', block.strip())[-1].strip()
    assert last_sentence[-60:] in actual.replace('\n',' '), (i, 'missing tail')
report = {'content_pages':25,'total_pages':page,'references_pages':page-25,
          'body_words':len(body.split()),'font':'Times New Roman 12 pt',
          'leading_pt':18,'size':'A4','margin_cm':2.5,'pages':qa}
(ROOT / 'layout_verification.json').write_text(json.dumps(report, indent=2),encoding='utf-8')
print(json.dumps(report, indent=2))
