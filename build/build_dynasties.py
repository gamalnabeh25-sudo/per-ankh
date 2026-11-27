#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""يبني صفحات الأسرات (dynasties/) في موقع بر عنخ.
قائمة الملوك تُقرأ آليًا من kings/*/index.html وقت البناء، فأي صفحة ملك جديدة تظهر في جدول أسرتها تلقائيًا.
المحتوى مكتوب فقط حيث يوجد مصدر مسمّى، وما لا مصدر له يُذكر صريحًا في «ما ينقص هذه الصفحة».
"""
import re, os, html, glob, json
from shell import STYLES as SHELL_STYLES, TOPBAR, TAILSCRIPTS, crumb as _crumb
from dyn_content import CONTENT

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://per-ankh-egypt.vercel.app"
CSS = open(os.path.join(ROOT, "build", "site_style.css"), encoding="utf-8").read()

SALEH = ("عبد العزيز صالح، الشرق الأدنى القديم ج1 (مصر والعراق)", "https://archive.org/details/20210510_20210510_0037")
SELIM = ("سليم حسن، الشرق الأدنى القديم ج1", "https://archive.org/details/20201104_20201104_1559")
NUR = ("عبد الحليم نور الدين، آثار وحضارة مصر القديمة ج1", "https://archive.org/details/AAlexandrina-117303")
GIZA = ("محافظة الجيزة، صفحة «منطقة آثار أبوصير»", "http://www.giza.gov.eg/Tourism1/Arch.aspx")

ORD = {1: "الأولى", 2: "الثانية", 3: "الثالثة", 4: "الرابعة", 5: "الخامسة", 6: "السادسة", 7: "السابعة", 8: "الثامنة",
       9: "التاسعة", 10: "العاشرة", 11: "الحادية عشرة", 12: "الثانية عشرة", 13: "الثالثة عشرة", 14: "الرابعة عشرة",
       15: "الخامسة عشرة", 16: "السادسة عشرة", 17: "السابعة عشرة", 18: "الثامنة عشرة", 19: "التاسعة عشرة",
       20: "العشرون", 21: "الحادية والعشرون", 22: "الثانية والعشرون", 23: "الثالثة والعشرون", 24: "الرابعة والعشرون",
       25: "الخامسة والعشرون", 26: "السادسة والعشرون", 27: "السابعة والعشرون", 28: "الثامنة والعشرون",
       29: "التاسعة والعشرون", 30: "الثلاثون", 31: "الحادية والثلاثون"}

ERA_OF = {}
for n in (1, 2): ERA_OF[n] = ("02-alasr-alatyq", "العصر العتيق")
for n in (3, 4, 5, 6): ERA_OF[n] = ("03-aldwlh-alqdymh", "الدولة القديمة")
for n in (7, 8, 9, 10): ERA_OF[n] = ("04-alasr-alantqaly-alawl", "العصر الانتقالي الأول")
for n in (11, 12): ERA_OF[n] = ("05-aldwlh-alwsta", "الدولة الوسطى")
for n in (13, 14, 15, 16, 17): ERA_OF[n] = ("06-alasr-alantqaly-althany", "العصر الانتقالي الثاني")
for n in (18, 19, 20): ERA_OF[n] = ("07-aldwlh-alhdythh", "الدولة الحديثة")
for n in (21, 22, 23, 24, 25): ERA_OF[n] = ("08-alasr-alantqaly-althalth", "العصر الانتقالي الثالث")
for n in (26, 27, 28, 29, 30, 31): ERA_OF[n] = ("09-alasr-almtakhr", "العصر المتأخر")
ERA_OF["ptol"] = ("09-alasr-almtakhr", "العصر المتأخر")
ERA_OF["roman"] = ("09-alasr-almtakhr", "العصر المتأخر")

SLUGS = {1: "01-alasrh-alawla", 2: "02-alasrh-althanyh", 3: "03-alasrh-althalthh", 4: "04-alasrh-alraabh",
         5: "05-alasrh-alkhamsh", 6: "06-alasrh-alsadsh", 7: "07-alasrh-alsabgh", 8: "08-alasrh-althamn",
         9: "09-alasrh-altasgh", 10: "10-alasrh-alashrh", 11: "11-alasrh-alhadyh-ashrh",
         12: "12-alasrh-althanyh-ashrh", 13: "13-alasrh-althalthh-ashrh", 14: "14-alasrh-alraabh-ashrh",
         15: "15-alasrh-alkhamsh-ashrh", 16: "16-alasrh-alsadsh-ashrh", 17: "17-alasrh-alsabgh-ashrh",
         18: "18-alasrh-althamn-ashrh", 19: "19-alasrh-altasgh-ashrh", 20: "20-alasrh-alashrun",
         21: "21-alasrh-alhadyh-walashrun", 22: "22-alasrh-althanyh-walashrun",
         23: "23-alasrh-althalthh-walashrun", 24: "24-alasrh-alraabh-walashrun",
         25: "25-alasrh-alkhamsh-walashrun", 26: "26-alasrh-alsadsh-walashrun",
         27: "27-alasrh-alsabgh-walashrun", 28: "28-alasrh-althamn-walashrun",
         29: "29-alasrh-altasgh-walashrun", 30: "30-alasrh-althalathun",
         31: "31-alasrh-alhadyh-walathalathun", "ptol": "32-albtalmh", "roman": "33-alruman"}


def dynasty_label(key):
    if key == "ptol":
        return "البطالمة"
    if key == "roman":
        return "الرومان"
    return "الأسرة " + ORD[key]


def read_kings():
    """(num|'ptol'|'roman') -> [(order, name, href, note)] ; يتخطى صفحات التحويل."""
    out = {}
    words = sorted(ORD.items(), key=lambda kv: -len(kv[1]))
    for f in sorted(glob.glob(os.path.join(ROOT, "kings", "*", "index.html"))):
        s = open(f, encoding="utf-8").read()
        if '<meta name="description"' not in s or len(s) < 3000:
            continue
        m = re.search(r"<title>(.*?)</title>", s, flags=re.S)
        t = html.unescape(m.group(1)) if m else ""
        if "الأسرة" not in t:
            continue
        slug = f.split("/")[-2]
        name = t.split("|")[0].split("—")[0].strip()
        seg = t.split("الأسرة", 1)[1].strip()
        nums = []
        for n, w in words:
            if seg.startswith(w) and (len(seg) == len(w) or not seg[len(w)].isalpha()):
                nums = [n]
                break
        if not nums and seg.startswith("13"):
            nums = [13, 17]
        if not nums:
            continue
        note = "الأسرة غير محسومة بين 13 و17" if seg.startswith("13") else ""
        for n in nums:
            out.setdefault(n, []).append((int(re.match(r"(\d+)", slug).group(1)), name, "/kings/%s/" % slug, note))
    for k in out:
        out[k].sort()
    return out


ERA_NAME = {
    "02-alasr-alatyq": "العصر العتيق",
    "03-aldwlh-alqdymh": "الدولة القديمة",
    "04-alasr-alantqaly-alawl": "العصر الانتقالي الأول",
    "05-aldwlh-alwsta": "الدولة الوسطى",
    "06-alasr-alantqaly-althany": "العصر الانتقالي الثاني",
    "07-aldwlh-alhdythh": "الدولة الحديثة",
    "08-alasr-alantqaly-althalth": "العصر الانتقالي الثالث",
    "09-alasr-almtakhr": "العصر المتأخر",
}
ORDER = list(range(1, 32)) + ["ptol", "roman"]


def kcount(n):
    if n == 0:
        return "لا صفحات ملوك بعد"
    if n == 1:
        return "ملك واحد على الموقع"
    if n == 2:
        return "ملكان على الموقع"
    if 3 <= n <= 10:
        return f"{n} ملوك على الموقع"
    return f"{n} ملكًا على الموقع"


def refs_block(used):
    out, seen = [], set()
    for tpl, url in used:
        if (tpl, url) in seen:
            continue
        seen.add((tpl, url))
        out.append(f'<li>{html.escape(tpl)}: <a href="{url}" rel="noopener" target="_blank">النسخة الرقمية</a></li>')
    return '<ol class="refs">' + "".join(out) + "</ol>" if out else ""


def page(key, kings_by_dyn, nxt=None, prv=None):
    slug = SLUGS[key]
    label = dynasty_label(key)
    era_slug, era_label = ERA_OF[key]
    c = CONTENT.get(key, {})
    url = f"{BASE}/dynasties/{slug}/"
    ks = kings_by_dyn.get(key, [])
    used = []
    for _t, _h, srcs in c.get("panels", []):
        used += srcs
    if key in CONTENT and CONTENT[key].get("capital_src"):
        used += CONTENT[key]["capital_src"]
    panels = []
    for i, (h, body, srcs) in enumerate(c.get("panels", []), 1):
        src_line = ""
        if srcs:
            src_line = '<p class="note">المصدر: ' + " · ".join(html.escape(t) for t, _u in srcs) + ".</p>"
        panels.append(f'<section class="panel" id="s{i}"><h2><span class="num">{i}</span>{html.escape(h)} <span class="bdg v">موثّق</span></h2>{body}{src_line}</section>')
    nk = len(ks)
    if ks:
        cards = "".join(
            f'<a href="{href}"><b>{html.escape(re.split(r"[()]", name)[0].strip())}</b><span>{pos}</span></a>'
            for pos, (_o, name, href, _n) in enumerate(ks, 1))
        kbody = f'<div class="grid kingsgrid">{cards}</div>'
        kfoot = '<p class="note">الترتيب كما في قائمة الملوك على الموقع. الجدول يُبنى آليًا من صفحات الملوك، فأي صفحة ملك تُضاف تظهر هنا.</p>'
        if any(n for *_x, n in ks):
            kfoot += '<p class="note">بعض هؤلاء الملوك تختلف المصادر في نسبتهم بين الأسرة 13 والأسرة 17، وهم مذكورون هنا وفي صفحة الأسرة 17 معًا، مع بيان الخلاف.</p>'
    else:
        kbody = ('<p>لم تُنشر بعدُ على الموقع صفحة مستقلة لأي ملك من ملوك هذه الأسرة. تُضاف أسماؤهم هنا تلقائيًا حين تُنشر صفحاتهم.</p>'
                 if isinstance(key, int) else
                 '<p>لا تُنشر على الموقع صفحات مستقلة لملوك هذا العصر حتى الآن؛ تُضاف أسماؤهم هنا تلقائيًا حين تُنشر.</p>')
        kfoot = ""
    gaps = c.get("gaps", "")
    facts = (
        f'<div class="fact"><b>العصر</b><span><a href="/eras/{era_slug}/">{html.escape(era_label)}</a></span></div>'
        f'<div class="fact"><b>العاصمة</b><span>{html.escape(c.get("capital", "غير محدد في المصادر المتاحة"))}</span></div>'
        f'<div class="fact"><b>الفترة</b><span>{html.escape(c.get("span", "—"))}</span></div>'
        f'<div class="fact"><b>{"ملوك هذه الأسرة على الموقع" if isinstance(key, int) else "الملوك على الموقع"}</b><span>{kcount(nk)}</span></div>'
    )
    desc = f"{label} ({era_label}): العاصمة، والأحداث الكبرى، والعمارة، والملوك، والمصادر."
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url + "#webpage", "url": url, "name": f"{label} | بر عنخ",
         "description": desc, "inLanguage": "ar-EG", "isPartOf": {"@id": BASE + "/#website"}},
        {"@type": "Article", "headline": f"{label} | بر عنخ", "description": desc,
         "inLanguage": "ar-EG", "mainEntityOfPage": url,
         "author": {"@type": "Organization", "name": "بر عنخ | PER ANKH", "url": BASE + "/"}}]}
    pn = ['<a href="/dynasties/">← كل الأسرات</a>']
    if prv:
        pn.append(f'<a href="/dynasties/{SLUGS[prv]}/">{html.escape(dynasty_label(prv))} ›</a>')
    if nxt:
        pn.append(f'<a href="/dynasties/{SLUGS[nxt]}/">‹ {html.escape(dynasty_label(nxt))}</a>')
    pn.append(f'<a href="/eras/{era_slug}/">{html.escape(era_label)}</a>')
    return f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(label)} | العصور والأسرات — بر عنخ</title><meta name="description" content="{html.escape(desc)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{url}"><meta property="og:type" content="article"><meta property="og:locale" content="ar_EG"><meta property="og:site_name" content="بر عنخ | PER ANKH"><meta property="og:title" content="{html.escape(label)} | بر عنخ"><meta property="og:description" content="{html.escape(desc)}"><meta property="og:url" content="{url}"><meta name="twitter:card" content="summary"><link rel="icon" href="/assets/per-ankh-favicon-v2.png?v=20261115-3">{SHELL_STYLES}<style>{CSS}</style><script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script></head><body>{TOPBAR}<main class="wrap">{_crumb([("الرئيسية", "/"), ("العصور والأسرات", "/dynasties/"), (era_label, "/eras/%s/" % era_slug), (label, None)])}
<header class="phero"><div class="cover plain"><div class="cgrad"></div><div class="ctext"><h1>{html.escape(label)}</h1><p class="sub">{html.escape(era_label)} · {html.escape(c.get('span', ''))}</p></div></div></header>
<div class="facts">{facts}</div>
{''.join(panels)}
<section class="panel" id="kings"><h2><span class="num">{len(panels) + 1}</span>{"ملوك هذه الأسرة" if isinstance(key, int) else "الملوك"} <span class="bdg v">من قائمة الملوك</span></h2>{kbody}{kfoot}</section>
<section class="panel" id="gaps"><h2><span class="num">{len(panels) + 2}</span>ما ينقص هذه الصفحة</h2>{gaps or '<p>لم يُسجَّل نقص محدد بعد.</p>'}<p class="note">لا نكتب في هذه الصفحة ما لا مصدر له. ما ينقص مذكور هنا حتى يُضاف بنص منسوب إلى صاحبه.</p></section>
<section class="abt"><h2>عن هذه الصفحة</h2><ul><li><b>المحتوى</b><span>كل فقرة منسوبة إلى صاحبها أسفل القسم؛ وما لم نجد له مصدرًا مذكور في «ما ينقص هذه الصفحة» ولا يُكتب.</span></li><li><b>التواريخ</b><span>تواريخ الأسر تقريبية كما هي مبيّنة أعلى الصفحة، وليست مسجّلة في مصدر قديم.</span></li><li><b>الصور</b><span>لا تحمل الصفحة صورة بعد؛ تُضاف صورة معتمدة عند توفرها، ولا تُستبدل بصورة موقع آخر.</span></li></ul></section>
<section class="panel" id="refs"><h2>المراجع</h2>{refs_block(used)}<p class="refs">لم نستخدم ويكيبيديا في هذه الصفحة.</p></section>
<nav class="pn">{''.join(pn)}</nav>
<footer>صفحة تعليمية من موسوعة بر عنخ. <a href="/eras/">العصور</a> · <a href="/kings/">الملوك</a></footer>
</main>{TAILSCRIPTS}</body></html>"""


def index_page(kings_by_dyn):
    by_era = {}
    for k in ORDER:
        by_era.setdefault(ERA_OF[k][0], []).append(k)
    blocks = []
    seen = []
    for k in ORDER:
        e = ERA_OF[k][0]
        if e in seen:
            continue
        seen.append(e)
        cards = []
        for k2 in by_era[e]:
            n = len(kings_by_dyn.get(k2, []))
            c = CONTENT.get(k2, {})
            if k2 in CONTENT:
                cards.append(
                    f'<a class="dyn" href="/dynasties/{SLUGS[k2]}/"><b>{html.escape(dynasty_label(k2))}</b>'
                    f'<span>{html.escape(c.get("capital", "—"))}</span><i>{kcount(n)}</i></a>')
            else:
                cards.append(
                    f'<span class="dyn soon"><b>{html.escape(dynasty_label(k2))}</b>'
                    f'<span>قيد الإعداد</span><i>{kcount(n)}</i></span>')
        blocks.append(
            f'<section class="panel"><h2><a href="/eras/{e}/">{html.escape(ERA_NAME[e])}</a></h2><div class="dyngrid">{"".join(cards)}</div></section>')
    url = f"{BASE}/dynasties/"
    desc = "صفحات أسرات مصر القديمة: العاصمة، والأحداث، والعمارة، والملوك، والمصادر لكل أسرة من الأسرات 1–31 ثم البطالمة والرومان."
    return f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>الأسرات | العصور والأسرات — بر عنخ</title><meta name="description" content="{desc}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{url}"><meta property="og:type" content="website"><meta property="og:locale" content="ar_EG"><meta property="og:site_name" content="بر عنخ | PER ANKH"><meta property="og:title" content="الأسرات | بر عنخ"><meta property="og:description" content="{desc}"><meta property="og:url" content="{url}"><link rel="icon" href="/assets/per-ankh-favicon-v2.png?v=20261115-3">{SHELL_STYLES}<style>{CSS}
.dyngrid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}}
.dyngrid .dyn{{display:flex;flex-direction:column;gap:6px;padding:16px 18px;border:1px solid var(--line,#2a3b45);border-radius:14px;text-decoration:none}}
.dyngrid .dyn b{{font-size:1.06rem}}
.dyngrid .dyn span{{font-size:.86rem;opacity:.78}}
.dyngrid .dyn i{{font-style:normal;font-size:.8rem;opacity:.62}}
.dyngrid span.dyn{{opacity:.55;border-style:dashed}}
.phero .cover.plain:after{{display:none}}
.phero .ctext h1{{font-size:clamp(1.6rem,3.6vw,2.9rem);line-height:1.3}}
.phero .cover.plain{{background:radial-gradient(120% 150% at 82% 0%,rgba(212,175,55,.10),transparent 62%),linear-gradient(135deg,#071321,#0d2130 55%,#0a1a28);border:1px solid rgba(212,175,55,.14);border-radius:16px}}
.kingsgrid a b{{font-size:.98rem}}
.kingsgrid a span{{font-variant-numeric:tabular-nums}}
</style></head><body>{TOPBAR}<main class="wrap">{_crumb([("الرئيسية", "/"), ("العصور والأسرات", None)])}
<header class="phero"><div class="cover plain"><div class="cgrad"></div><div class="ctext"><h1>الأسرات</h1><p class="sub">من الأسرة الأولى إلى العصر الروماني · 33 صفحة</p></div></div></header>
<p class="lead">صفحة لكل أسرة حاكمة: العاصمة، وما يُعرف عن أحداثها، وعمارتها، وملوكها بصفحاتهم، والمصادر. كل ما فيها منسوب إلى صاحبه، وما لا مصدر له مذكور صريحًا في «ما ينقص» بكل صفحة.</p>
{''.join(blocks)}
<nav class="pn"><a href="/eras/">← العصور</a><a href="/kings/">قائمة الملوك</a><a href="/">الرئيسية</a></nav>
<footer>صفحة تعليمية من موسوعة بر عنخ. <a href="/eras/">العصور</a> · <a href="/kings/">الملوك</a></footer>
</main>{TAILSCRIPTS}</body></html>"""


def main():
    kb = read_kings()
    os.makedirs(os.path.join(ROOT, "dynasties"), exist_ok=True)
    made = 0
    for i, k in enumerate(ORDER):
        if k not in CONTENT:
            continue
        prv = ORDER[i - 1] if i else None
        nxt = ORDER[i + 1] if i + 1 < len(ORDER) else None
        d = os.path.join(ROOT, "dynasties", SLUGS[k])
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(page(k, kb, nxt, prv))
        made += 1
    open(os.path.join(ROOT, "dynasties", "index.html"), "w", encoding="utf-8").write(index_page(kb))
    print("dynasty pages:", made)
    for k in ORDER:
        if k in CONTENT:
            print(dynasty_label(k), len(kb.get(k, [])))


if __name__ == "__main__":
    main()
