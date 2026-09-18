# -*- coding: utf-8 -*-
"""把论文 Markdown 转成《计算机教育》投稿风格的 Word 文档。
用法: python tools/md2docx.py 论文-数据结构算法可视化系统.md 论文.docx

排版约定：中文正文宋体五号、西文 Times New Roman，标题黑体加粗，
代码块等宽字体加浅底，表格三线表。
"""
import io
import re
import sys

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor, Cm

HAN = '宋体'
HEI = '黑体'
LAT = 'Times New Roman'
MONO = 'Consolas'


def set_font(run, latin=LAT, han=HAN, size=10.5, bold=False, color=None):
    """python-docx 不会自动设置东亚字体，必须直接写 w:eastAsia。"""
    run.font.name = latin
    run.font.size = Pt(size)
    run.font.bold = bold
    if color:
        run.font.color.rgb = color
    rpr = run._element.get_or_add_rPr()
    rf = rpr.find(qn('w:rFonts'))
    if rf is None:
        rf = OxmlElement('w:rFonts')
        rpr.append(rf)
    rf.set(qn('w:ascii'), latin)
    rf.set(qn('w:hAnsi'), latin)
    rf.set(qn('w:eastAsia'), han)


def shade(el, fill):
    """给段落或单元格加底色。"""
    pr = el._element.get_or_add_pPr() if hasattr(el, 'paragraph_format') \
        else el._element.get_or_add_tcPr()
    sh = OxmlElement('w:shd')
    sh.set(qn('w:val'), 'clear')
    sh.set(qn('w:fill'), fill)
    pr.append(sh)


def borders(cell, top=None, bottom=None):
    """三线表用：只画需要的横线。"""
    tcpr = cell._element.get_or_add_tcPr()
    tb = OxmlElement('w:tcBorders')
    for name, sz in (('top', top), ('bottom', bottom)):
        if not sz:
            continue
        e = OxmlElement('w:' + name)
        e.set(qn('w:val'), 'single')
        e.set(qn('w:sz'), str(sz))
        e.set(qn('w:color'), '000000')
        tb.append(e)
    tcpr.append(tb)


# **粗体** 与 `代码` 的行内切分
TOKEN = re.compile(r'(\*\*.+?\*\*|`[^`]+`)')


def add_rich(p, text, size=10.5, han=HAN, latin=LAT, base_bold=False):
    """把一行 Markdown 的行内标记渲染成多个 run。"""
    for part in TOKEN.split(text):
        if not part:
            continue
        if part.startswith('**') and part.endswith('**') and len(part) > 4:
            set_font(p.add_run(part[2:-2]), latin, han, size, True)
        elif part.startswith('`') and part.endswith('`') and len(part) > 2:
            r = p.add_run(part[1:-1])
            set_font(r, MONO, MONO, size - 0.5, False,
                     RGBColor(0xA3, 0x14, 0x51))
        else:
            set_font(p.add_run(part), latin, han, size, base_bold)


def blank(doc, size=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    set_font(p.add_run(''), size=size)
    return p


def add_title(doc, text, level, center=False):
    """level 1 主标题居中，2 为一级节标题，3 为二级节标题。"""
    p = doc.add_paragraph()
    pf = p.paragraph_format
    if center:
        pf.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if level == 1:
        pf.alignment = WD_ALIGN_PARAGRAPH.CENTER
        pf.space_before, pf.space_after = Pt(6), Pt(6)
        add_font = dict(size=16)
    elif level == 2:
        pf.space_before, pf.space_after = Pt(12), Pt(6)
        add_font = dict(size=12)
    else:
        pf.space_before, pf.space_after = Pt(10), Pt(4)
        add_font = dict(size=10.5)
    for part in TOKEN.split(text):
        if not part:
            continue
        set_font(p.add_run(part.strip('*`')), LAT, HEI, add_font['size'], True)
    return p


def add_body(doc, text, indent=True, align=None, size=10.5):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before, pf.space_after = Pt(0), Pt(0)
    pf.line_spacing = 1.35
    if indent:
        pf.first_line_indent = Pt(size * 2)
    if align is not None:
        pf.alignment = align
    add_rich(p, text, size=size)
    return p


def add_caption(doc, text):
    """表/图题：黑体小五号居中。"""
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf.space_before, pf.space_after = Pt(8), Pt(3)
    for part in TOKEN.split(text):
        if part:
            set_font(p.add_run(part.strip('*`')), LAT, HEI, 9.5, True)
    return p


def add_code(doc, lines, lang=''):
    """代码块／ASCII 图：等宽字体、浅灰底、单倍行距、不缩进。"""
    for i, ln in enumerate(lines):
        p = doc.add_paragraph()
        pf = p.paragraph_format
        pf.space_before = Pt(3) if i == 0 else Pt(0)
        pf.space_after = Pt(3) if i == len(lines) - 1 else Pt(0)
        pf.line_spacing = 1.0
        pf.left_indent = Cm(0.5)
        shade(p, 'F4F5F7')
        set_font(p.add_run(ln if ln else ' '), MONO, MONO, 8.5)


def split_row(line):
    return [c.strip() for c in line.strip().strip('|').split('|')]


ALIGN = {':---:': WD_ALIGN_PARAGRAPH.CENTER,
         '---:': WD_ALIGN_PARAGRAPH.RIGHT,
         ':---': WD_ALIGN_PARAGRAPH.LEFT}


def add_table(doc, rows):
    """三线表：表头上下各一条粗线，表尾一条粗线，中间无框线。"""
    head = split_row(rows[0])
    aligns = [ALIGN.get(re.sub(r'-+', '---', c), WD_ALIGN_PARAGRAPH.LEFT)
              for c in split_row(rows[1])]
    body = [split_row(r) for r in rows[2:]]
    t = doc.add_table(rows=1 + len(body), cols=len(head))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = True

    def fill(cell, txt, align, bold):
        cell.text = ''
        p = cell.paragraphs[0]
        p.paragraph_format.alignment = align
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        if bold:
            for part in TOKEN.split(txt):
                if part:
                    set_font(p.add_run(part.strip('*`')), LAT, HEI, 9, True)
        else:
            add_rich(p, txt, size=9)

    for j, c in enumerate(head):
        fill(t.rows[0].cells[j], c, aligns[j] if j < len(aligns) else None, True)
        borders(t.rows[0].cells[j], top=12, bottom=6)
    for i, r in enumerate(body):
        last = (i == len(body) - 1)
        for j in range(len(head)):
            txt = r[j] if j < len(r) else ''
            fill(t.rows[i + 1].cells[j], txt,
                 aligns[j] if j < len(aligns) else None, False)
            if last:
                borders(t.rows[i + 1].cells[j], bottom=12)
    return t


def add_ref(doc, text):
    """参考文献：悬挂缩进，西文 Times New Roman。"""
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before, pf.space_after = Pt(0), Pt(2)
    pf.line_spacing = 1.2
    pf.left_indent = Pt(20)
    pf.first_line_indent = Pt(-20)
    set_font(p.add_run(text), LAT, HAN, 9)
    return p


def setup(doc):
    s = doc.sections[0]
    s.page_width, s.page_height = Cm(21), Cm(29.7)
    s.left_margin = s.right_margin = Cm(2.6)
    s.top_margin = s.bottom_margin = Cm(2.5)
    st = doc.styles['Normal']
    st.font.name = LAT
    st.font.size = Pt(10.5)
    st.element.rPr.rFonts.set(qn('w:eastAsia'), HAN)


CAPTION = re.compile(r'^\*\*(表|图)\s*\d+')
# 摘要/关键词/中图分类号/Abstract/Keywords 这些行不缩进、整段紧排
LABEL = re.compile(r'^\*\*(摘要|关键词|中图分类号|作者|基金项目|Abstract|Keywords)')


def convert(md_path, out_path):
    lines = io.open(md_path, encoding='utf-8').read().split('\n')
    doc = Document()
    setup(doc)
    i, n = 0, len(lines)
    in_refs = False

    while i < n:
        raw = lines[i]
        s = raw.strip()

        if not s:
            i += 1
            continue

        # 分隔线：只作留白，不画横线
        if s == '---':
            blank(doc, 4)
            i += 1
            continue

        # 围栏代码块 / ASCII 图
        if s.startswith('```'):
            lang = s[3:].strip()
            i += 1
            buf = []
            while i < n and not lines[i].strip().startswith('```'):
                buf.append(lines[i].rstrip())
                i += 1
            i += 1
            while buf and not buf[-1]:
                buf.pop()
            add_code(doc, buf, lang)
            continue

        # 表格
        if s.startswith('|'):
            buf = []
            while i < n and lines[i].strip().startswith('|'):
                buf.append(lines[i])
                i += 1
            if len(buf) >= 2:
                add_table(doc, buf)
                blank(doc, 4)
            continue

        # 标题
        m = re.match(r'^(#{1,4})\s+(.*)$', s)
        if m:
            lvl, txt = len(m.group(1)), m.group(2).strip()
            in_refs = txt.startswith('参考文献')
            # 英文标题与副题居中，与中文题名保持一致
            add_title(doc, txt, min(lvl, 3),
                      center=bool(re.match(r'^[A-Za-z]', txt)))
            i += 1
            continue

        # 参考文献条目
        if in_refs and re.match(r'^\[\d+\]', s):
            add_ref(doc, s)
            i += 1
            continue

        # 表题 / 图题
        if CAPTION.match(s):
            add_caption(doc, s)
            i += 1
            continue

        # 摘要、关键词等标签段落：不首行缩进
        if LABEL.match(s):
            add_body(doc, s, indent=False, size=10)
            i += 1
            continue

        # 作者单位一行
        if s.startswith('（1.') or s.startswith('(1.'):
            add_body(doc, s, indent=False,
                     align=WD_ALIGN_PARAGRAPH.CENTER, size=9.5)
            i += 1
            continue

        add_body(doc, s)
        i += 1

    doc.save(out_path)
    return out_path


if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else '论文-数据结构算法可视化系统.md'
    dst = sys.argv[2] if len(sys.argv) > 2 else '论文-数据结构算法可视化系统.docx'
    print('已生成', convert(src, dst))
