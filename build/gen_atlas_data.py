import re, glob, html, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def grab(s, pat):
    m = re.search(pat, s, flags=re.S)
    return html.unescape(re.sub(r"<[^>]+>", " ", m.group(1))).strip() if m else ""

def clean(t):
    return re.sub(r"\s+", " ", t).strip()

rows = []
for f in sorted(glob.glob(os.path.join(ROOT, "sites", "*", "index.html"))):
    s = open(f, encoding="utf-8").read()
    slug = f.split("/")[-2]
    name = clean(grab(s, r'<div class="ctext">\s*<h1>(.*?)</h1>'))
    sub = clean(grab(s, r'<p class="sub">(.*?)</p>'))
    en = sub.split("·")[0].strip()
    period = sub.split("·")[1].strip() if "·" in sub else ""
    loc = clean(grab(s, r"<b>الموقع</b><span>(.*?)</span>"))
    desc = clean(grab(s, r'name="description" content="(.*?)"'))
    oneliner = desc.split(":")[-1].strip() if ":" in desc else desc
    rows.append(("sites", slug, name, en, period, loc, oneliner[:160], "/sites/%s/" % slug))

for f in sorted(glob.glob(os.path.join(ROOT, "eras", "*", "index.html"))):
    s = open(f, encoding="utf-8").read()
    slug = f.split("/")[-2]
    name = clean(grab(s, r'<div class="ctext">\s*<h1>(.*?)</h1>'))
    sub = clean(grab(s, r'<p class="sub">(.*?)</p>'))
    about = clean(grab(s, r'<section class="panel" id="about">(.*?)</section>'))
    about = about.replace("ملامح العصر كما يراها عبد العزيز صالح", "").replace("موثّق", "").strip()
    oneliner = (about[:150].rsplit(" ", 1)[0] + "…") if len(about) > 150 else about
    rows.append(("eras", slug, name, "", sub, "—", oneliner, "/eras/%s/" % slug))

out = ["# Per Ankh — data list for the atlas (sites 01-17 and eras 01-09)\n",
       "Every row is a real page in the encyclopedia; the last column is the page path the marker should open.\n",
       "**Coordinates: I hold none.** No coordinate, latitude or longitude appears anywhere in my pages or my sources — my sources are books and ministry pages that describe locations in words (e.g. «جنوب أسوان – النوبة»), not coordinates. I have deliberately left that column empty rather than guess, because a wrong pin on a map is worse than a missing one. If you want them from me, I can fetch coordinates from an official source per site and bring the citation back before you place any marker.\n",
       "| kind | slug | الاسم العربي | English | العصر / الفترة | الموقع كما في الصفحة | سطر واحد | الإحداثيات | صفحة |",
       "|---|---|---|---|---|---|---|---|---|"]
for r in rows:
    out.append("| %s | %s | %s | %s | %s | %s | %s | — | %s |" % r)

open("/downloads/per-ankh-atlas-data.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
print("rows:", len(rows))
