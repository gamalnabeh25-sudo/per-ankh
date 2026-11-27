import re, glob, html, collections, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKS = [
    ("عبد العزيز صالح", "عبد العزيز صالح — الشرق الأدنى القديم، ج1 (مصر والعراق)", "كتاب", "عربي",
     "https://archive.org/details/20210510_20210510_0037", "طبعة دار النهضة العربية؛ النقل بالمعنى مع الحفاظ على الألفاظ، وأرقام الصفحات كما وردت في نسخة archive.org"),
    ("سليم حسن", "سليم حسن — الشرق الأدنى القديم، ج1", "كتاب", "عربي",
     "https://archive.org/details/20201104_20201104_1559", "جداول المقاطعات وأسماء منف وبتاح"),
    ("نور الدين", "عبد الحليم نور الدين — آثار وحضارة مصر القديمة، ج1", "كتاب", "عربي",
     "https://archive.org/details/AAlexandrina-117303", "مادة الأهرامات ومعابد الشمس وفيلة؛ OCR النسخة رديء في بعض الصفحات فأرقام الصفحات تحتاج مراجعة على الأصل"),
    ("وزارة السياحة", "وزارة السياحة والآثار المصرية — صفحات المواقع الأثرية والآثار والمجموعات، ودليل المواقع المفتوحة، والبيانات الصحفية", "موقع رسمي", "عربي",
     "https://egymonuments.gov.eg/ar/ ; https://mota.gov.eg/ar/", "كل صفحة موقع لها رابطها الخاص في ملف المراجع أدناه"),
    ("محافظة الجيزة", "محافظة الجيزة — صفحة «منطقة آثار أبوصير»", "موقع حكومي", "عربي",
     "http://www.giza.gov.eg/Tourism1/Arch.aspx", "تواريخ أهرامات الأسرة الخامسة كما وردت في الصفحة، ولم تُضبط على مصدر آخر"),
    ("بوابة الأهرام", "بوابة الأهرام — خبرا تانيس (نوفمبر 2025) وتل قويسنا (يوليو 2026)", "صحافة", "عربي",
     "https://gate.ahram.org.eg/News/5337947.aspx ; https://gate.ahram.org.eg/News/5815405.aspx", "نقل لبيانات الوزارة وتصريحات الأثريين"),
    ("Rowland", "J. Rowland & M. Hamdan — The Holocene Evolution of the Quesna Turtle Back (2012)", "دراسة أكاديمية", "إنجليزي",
     "https://books.ub.uni-heidelberg.de/propylaeum/catalog/view/167/216/75815", "دراسة جيولوجية أثرية لمشروع مسح الدلتا (EES)"),
]

pages = sorted(glob.glob(os.path.join(ROOT, "sites", "*", "index.html"))) + \
        sorted(glob.glob(os.path.join(ROOT, "eras", "*", "index.html")))
use = collections.defaultdict(list)
per_page = {}
for f in pages:
    s = open(f, encoding="utf-8").read()
    slug = f.split("/")[-2]
    notes = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", m)) for m in re.findall(r'<p class="note">(.*?)</p>', s, flags=re.S))
    refm = re.search(r'<section class="panel" id="refs">(.*?)</section>', s, flags=re.S)
    refs = html.unescape(re.sub(r"<[^>]+>", " ", refm.group(1))) if refm else ""
    blob = notes + " " + refs
    found = []
    for key, name, *_ in WORKS:
        if key in blob:
            use[name].append(slug)
            found.append(name)
    per_page[slug] = found

lines = ["# Per Ankh — مصادر صفحات المواقع والعصور (sites + eras)\n",
         "كل مصدر استُخدم في أي جملة، مع الصفحات التي تستخدمه. أرقام الصفحات التفصيلية لكل قسم موجودة داخل الصفحة نفسها تحت كل مقطع («المصدر: …»).\n",
         "## الأعمال\n",
         "| # | المؤلف والعنوان | النوع | اللغة | الرابط | الصفحات التي تستخدمه | ملاحظات |",
         "|---|---|---|---|---|---|---|"]
for i, (key, name, typ, lang, url, note) in enumerate(WORKS, 1):
    used = use.get(name, [])
    lines.append("| %d | %s | %s | %s | %s | %d صفحة: %s | %s |" % (
        i, name, typ, lang, url, len(used), "، ".join(used) if used else "—", note))

lines += ["\n## روابط المصادر الرسمية بالتفصيل\n"]
seen = set()
for f in pages:
    s = open(f, encoding="utf-8").read()
    slug = f.split("/")[-2]
    for li in re.findall(r'<li>(.*?)</li>', s, flags=re.S):
        if "href" not in li:
            continue
        txt = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", li))).strip()
        for u in re.findall(r'href="([^"]+)"', li):
            if u in seen:
                continue
            seen.add(u)
            lines.append("- %s — `%s` — %s" % (slug, u, txt[:120]))

lines += ["\n## الخلافات العلمية ومسألة النسبة\n",
          "- **اسم عين شمس:** سليم حسن يكتبها «عني شمس»، وعبد الحليم نور الدين يكتبها «عين شمس». نُقل كل منهما بصيغة صاحبه، ولم نوحّد الرسم.",
          "- **مقابر الملوك الأوائل: سقارة أم أبيدوس؟** يذكر عبد العزيز صالح رأي ولتر إمرى بأن لكل ملك قبرين (قبر فعلي وضريح رمزي)، ثم يورد الرأي المقابل الذي يرجّح أن مقابر سقارة هي الفعلية وأن أبيدوس أضرحة. الصفحة تعرض الرأيين منسوبين.",
          "- **حدود العصور والتواريخ:** تواريخ بدايات ونهايات الأسر تقديرية وتختلف بين الباحثين؛ الصفحات تذكر ذلك صريحًا ولا تعرض سنة واحدة لكل حدث، وتترك تواريخ كل أسرة باسم صاحبها حين يتوفر.",
          "- **أهرامات الأسرة الخامسة:** التواريخ في صفحة أبو صير منقولة كما وردت في صفحة محافظة الجيزة ولم تُضبط على مصدر آخر، والصفحة تقول ذلك.",
          "- **أمنمسه (king 074):** الصفحة kings/142-amnmsw تحويل إلى kings/074-amnmsh بعد دمج التكرار؛ العدد النهائي 149 صفحة ملك.\n",
          "\n## الصفحات وتغطيتها\n"]
for slug in sorted(per_page):
    lines.append("- **%s** — %s" % (slug, "، ".join(per_page[slug]) if per_page[slug] else "لا مصدر خارجي بعد"))

out = "/downloads/per-ankh-references-sites-eras.md"
open(out, "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("written", out, len(lines), "lines")
