#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""يبني صفحات العصور (eras/) في موقع بر عنخ.
البيانات الأساسية: قائمة الملوك من kings/index.html (الأسرة + العصر لكل ملك)،
ونصوص العصر القديمة تُنقل كما هي مع وسم «لم يُتحقق منه» حتى تُوثّق من الكتب.
"""
import re, json, os, html
from shell import STYLES as SHELL_STYLES, TOPBAR, TAILSCRIPTS, crumb as _crumb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ERAS = [
    ("01-ma-qbl-alasrat", "ما قبل الأسرات", "نحو 4400–3100 ق.م. (تقريبي)", ["ما قبل الأسرات"]),
    ("02-alasr-alatyq", "العصر العتيق", "الأسرات 1–2؛ نحو 3100–2686 ق.م.", ["العصر العتيق"]),
    ("03-aldwlh-alqdymh", "الدولة القديمة", "الأسرات 3–6؛ نحو 2686–2181 ق.م.", ["الدولة القديمة"]),
    ("04-alasr-alantqaly-alawl", "العصر الانتقالي الأول", "الأسرات 7–10 وجزء من 11؛ نحو 2181–2055 ق.م.", ["العصر الانتقالي الأول"]),
    ("05-aldwlh-alwsta", "الدولة الوسطى", "الأسرات 11–12؛ نحو 2055–1650 ق.م. (مع اختلافات في التقسيم)", ["الدولة الوسطى"]),
    ("06-alasr-alantqaly-althany", "العصر الانتقالي الثاني", "الأسرات 13–17؛ نحو 1650–1550 ق.م.", ["العصر الانتقالي الثاني"]),
    ("07-aldwlh-alhdythh", "الدولة الحديثة", "الأسرات 18–20؛ نحو 1550–1069 ق.م.", ["الدولة الحديثة"]),
    ("08-alasr-alantqaly-althalth", "العصر الانتقالي الثالث", "الأسرات 21–25؛ نحو 1069–664 ق.م.", ["العصر الانتقالي الثالث"]),
    ("09-alasr-almtakhr", "العصر المتأخر", "الأسرات 26–30؛ نحو 664–343 ق.م.", ["العصر المتأخر"]),
]

# أسر معروفة داخل كل عصر وليست لها صفحات ملوك بعد (مأخوذة من نطاق الأسر المذكور في كل عصر)
MISSING_DYNASTIES = {
    "04-alasr-alantqaly-alawl": ["الأسرة السابعة", "الأسرة التاسعة", "الأسرة العاشرة"],
    "06-alasr-alantqaly-althany": ["الأسرة الرابعة عشرة", "الأسرة الخامسة عشرة (الهكسوس)"],
    "08-alasr-alantqaly-althalth": ["الأسرة الرابعة والعشرون"],
    "09-alasr-almtakhr": ["الأسرة السابعة والعشرون (الفارسية)", "الأسرة التاسعة والعشرون"],
}

SALEH = {'01-ma-qbl-alasrat': 'يصف عبد العزيز صالح آثار ما قبل الأسرات بأنها بقيت غفلاً من الكتابة، وأن أولاها بالدراسة عند الأثري المؤرخ هي الأواني الفخارية، لأنها تدل على التتابع الزمني والتطور الصناعي والفني خلال العصر الحجري الحديث، سواء الأواني الغفل ذات الأشكال المتطورة أو الأواني ذات الرسوم والأشكال المعبرة.', '02-alasr-alatyq': 'يذكر عبد العزيز صالح أن هذا العصر بدأ في فترة من القرن الثاني والثلاثين قبل الميلاد، وامتاز تاريخيًا باستقرار ووحدة مصر السياسية الكاملة منذ أوائله، وبمعرفة الكتابة منذ بدايته، وبظهور المصادر التاريخية المكتوبة فيه لأول مرة؛ ويُعدّ عصر التكوين بالنسبة لنظم الحكم وأوضاع الإدارة، وتعاقبت فيه الأسرتان الأوليتان.', '03-aldwlh-alqdymh': 'يذكر عبد العزيز صالح أن أغلب عهود الدولة القديمة اتصفت بالاستقرار السياسي النسبي ومركزية الحكم، وتميزت معالم الحضارة فيها بالنمو الداخلي في شكّون العمارة والفنون وتنظيمات الإدارة وعقائد الآخرة، واستقرت مبادئ ذلك كله دون تأثيرات خارجية ملموسة؛ وتمثلت أغلب آثارها في مقابرها الفخمة وأهرامها الرائعة التي انتشرت حول عاصمتها إنب حج (منف) فيما بين ميدوم ودهشور وسقارة والجيزة.', '04-alasr-alantqaly-alawl': 'يصف عبد العزيز صالح هذا العصر بأنه انتقال من مركزية الحكم الموحّد إلى تفرّق سياسات الحكام ووجهاتهم، ومن الاستقرار السياسي والأمني إلى حال من القلقلة، ومن ضخامة إمكانيات الدولة إلى تفرّقها وقلّتها؛ وإن انتعشت خلاله في الوقت نفسه أحوال الطبقات الوسطى والبسيطة، ونمت فيه روح الفردية، وظهرت مبادئ سياسية وعقائد دينية متحررة.', '05-aldwlh-alwsta': 'يذكر عبد العزيز صالح أن الدولة الوسطى تميزت باستعادة مركزية الحكم والسلطة الملكية ووحدة السياسة في شؤون الداخل والخارج مع الإبقاء على ازدهار الفردية، واتسعت فيها مجالات التعامل والتأثير بين مصر وجيرانها في الشرق الأدنى وجزر البحر المتوسط، وتُعدّ العصر الذهبي للغة المصرية وإدابها؛ وكانت من عواصمها طيبة في الصعيد، واللشت عند مدخل مصر الوسطى، ومنف قرب رأس الدلتا.', '06-alasr-alantqaly-althany': 'يصف عبد العزيز صالح هذا العصر بأنه انتقال اضطراري من القوة إلى الضعف، ومن الوحدة السياسية إلى التفكك، ومن الاستقرار إلى القلق، ومن الحكم القومي إلى تدخل الأغراب؛ وشغلت أغلب أيامه محنة الهكسوس، وانتهى بإجلاء الهكسوس وتشتيتهم وتحرر البلاد منهم.', '07-aldwlh-alhdythh': 'يذكر عبد العزيز صالح أن الدولة الحديثة بدأت بعودة الاستقرار السياسي القومي الكامل ومركزية الحكم وقوة الملكية، وتميزت ببلوغ الذروة في الرخاء العام وفي الفنون، وبرقيّ مذاهب الدين حتى مرتبة الوحدانية، وبالانطلاق الواسع في مجالات السياسة الدولية والتبادل الحضاري والتوسع الخارجي.', '08-alasr-alantqaly-althalth': 'لا يفرد عبد العزيز صالح للعصر الانتقالي الثالث فصلًا مستقلًا بالاسم الذي نستعمله هنا: فهو يُنهي عصور الدولة الحديثة بنهاية عصر الأسرة الحادية والعشرين، ويبدأ «العصور المتأخرة» من القرن العاشر قبل الميلاد. ويصف تلك المرحلة بتذبذب النشاط المصري بين مدّ وجزر في مجالات السياسة والحروب، واختلاط بعض العناصر الدخيلة بالمصريين، وتأثر مصر بتأرجح موازين القوى بين أقطار الشرق والغرب القديمة.', '09-alasr-almtakhr': 'يذكر عبد العزيز صالح أن مظاهر العصور المتأخرة بدأت منذ القرن العاشر قبل الميلاد، وتذبذب خلالها النشاط المصري بين مدّ وجزر في مجالات السياسة والحروب، واختلطت فيها بعض العناصر الدخيلة بالمصريين اختلاطًا ملحوظًا، وتأثرت مصر بتأرجح موازين القوى بين أقطار الشرق والغرب القديمة، وابتدأت مقاليد الحضارة والسيادة تنفلت منها، بل وتعرضت أرضها لأكثر من غزو خارجي، ثم انتهت بانتهاء الحكم الفرعوني القومي بعد عصر الأسرة الثلاثين.'}

SITE_ERAS = {
    "01-hdbh-algyzh": ["03-aldwlh-alqdymh"],
    "02-sqarh": ["02-alasr-alatyq", "03-aldwlh-alqdymh"],
    "03-dhshwr": ["03-aldwlh-alqdymh", "05-aldwlh-alwsta"],
    "04-abw-syr": ["03-aldwlh-alqdymh"],
    "05-mydwm": ["03-aldwlh-alqdymh"],
    "06-abydws": ["01-ma-qbl-alasrat", "02-alasr-alatyq"],
    "07-bny-hsn": ["05-aldwlh-alwsta"],
    "08-tybh-alaqsr": ["05-aldwlh-alwsta", "07-aldwlh-alhdythh"],
    "09-alkrnk": ["07-aldwlh-alhdythh"],
    "10-aldyr-albhry": ["05-aldwlh-alwsta", "07-aldwlh-alhdythh"],
    "11-wady-almlwk": ["07-aldwlh-alhdythh", "08-alasr-alantqaly-althalth"],
    "12-tl-alamarnh": ["07-aldwlh-alhdythh"],
    "13-abw-smbl": ["07-aldwlh-alhdythh"],
    "14-mdynh-habw": ["07-aldwlh-alhdythh"],
    "15-tanys": ["08-alasr-alantqaly-althalth"],
    "16-fylh": ["09-alasr-almtakhr"],
}


def read_kings():
    h = open(os.path.join(ROOT, "kings", "index.html"), encoding="utf-8").read()
    cards = re.findall(
        r'<a href="/kings/([^/]+)/"><strong>([^<]+)</strong><br><span class="note">([^<]+)</span>', h)
    out = {}
    for slug, name, note in cards:
        dyn, era = [x.strip() for x in note.split("·")]
        out.setdefault(era, {}).setdefault(dyn, []).append((slug, name))
    return out


def read_sites():
    out = {}
    base = os.path.join(ROOT, "sites")
    for d in sorted(os.listdir(base)):
        p = os.path.join(base, d, "index.html")
        if not os.path.isfile(p):
            continue
        h = open(p, encoding="utf-8").read()
        name = re.search(r"<h1>([^<]+)</h1>", h).group(1)
        facts = dict(re.findall(r'<div class="fact"><b>([^<]+)</b><span>([^<]+)</span>', h))
        out[d] = {"name": name, "facts": facts}
    return out


def read_old(era_dir):
    p = os.path.join(ROOT, "eras", era_dir, "index.html")
    h = open(p, encoding="utf-8").read()
    facts = dict(re.findall(r'<div class="fact"><b>([^<]+)</b><span>([^<]+)</span>', h))
    secs = re.findall(r"<h2>([^<]+)</h2><p>(.*?)</p>", h)
    return facts, secs


CSS = """
/* palette comes from the Narmer shell */
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--white);font-family:"Noto Naskh Arabic","Segoe UI",Tahoma,Arial,sans-serif;line-height:1.9;overflow-x:hidden}
.wrap{max-width:900px;margin:auto;padding:16px 16px 70px}
.brand{color:var(--gold);font-weight:800;text-decoration:none;font-size:17px}
.crumb,.note{color:var(--muted);font-size:14px}
a{color:var(--teal)}
h1{font-size:clamp(30px,7vw,52px);color:var(--gold);line-height:1.25;margin:6px 0 8px}
h2{font-size:clamp(20px,4.4vw,26px);color:var(--gold);margin:0 0 10px;line-height:1.4}
h3{font-size:clamp(17px,3.6vw,20px);color:var(--gold2);margin:22px 0 8px}
p,li{font-size:17px}
.hero{padding:8px 0 6px;margin-bottom:8px}
.phero{display:block;margin:6px 0 10px}
.cover{position:relative;border-radius:16px;overflow:hidden;border:1px solid var(--line);margin:6px 0 14px;background:var(--panel)}

.abt{margin:16px 0 6px;padding:14px 16px;border:1px solid rgba(216,181,107,.30);border-radius:14px;background:rgba(12,26,42,.75)}
.abt h2{font-size:15px;margin:0 0 8px;color:var(--gold2)}
.abt ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.abt li{display:flex;gap:8px;font-size:13.5px;line-height:1.85;color:var(--muted)}
.abt b{color:var(--white);flex:0 0 auto;min-width:52px}
.abt span{flex:1}
.cover img{width:100%;height:clamp(200px,34vw,380px);object-fit:cover;display:block}
.cgrad{position:absolute;inset:0;background:linear-gradient(to top,rgba(7,19,33,.97) 4%,rgba(7,19,33,.6) 40%,rgba(7,19,33,.12) 78%)}
.ctext{position:absolute;inset:auto 0 0 0;padding:16px 16px 12px;text-align:center}
.ctext h1{margin:0 0 2px;text-shadow:0 2px 18px rgba(0,0,0,.75)}
.ctext .sub{margin:0;color:#e3eaf2;font-size:15px;text-shadow:0 1px 10px rgba(0,0,0,.8)}
.hero .sub{color:var(--muted);font-size:16px;margin:0 0 4px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 4px}
.chips a{display:inline-block;background:rgba(216,181,107,.08);border:1px solid var(--line);border-radius:999px;padding:5px 13px;font-size:14px;color:var(--gold2);text-decoration:none}
.chips a:hover{background:rgba(216,181,107,.18)}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:16px 0}
.fact{padding:12px;background:rgba(255,255,255,.035);border:1px solid rgba(216,181,107,.16);border-radius:10px}
.fact b{display:block;color:var(--gold);font-size:13px;margin-bottom:2px}
.fact span{font-size:15px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px;margin:16px 0}
.panel .bdg{display:inline-block;font-size:12px;border-radius:999px;padding:1px 10px;margin-left:6px;vertical-align:middle}
.bdg.u{background:rgba(169,183,197,.14);border:1px solid rgba(169,183,197,.45);color:#cfd8e2}
.bdg.v{background:rgba(131,214,206,.12);border:1px solid rgba(131,214,206,.5);color:#a9ece5}
.bdg.d{background:rgba(216,181,107,.12);border:1px solid rgba(216,181,107,.5);color:var(--gold2)}
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:12px;border:1px solid var(--line);margin:10px 0 4px}
table{border-collapse:collapse;width:100%;min-width:420px;font-size:15px;background:rgba(0,0,0,.14)}
th,td{padding:9px 12px;text-align:right;border-bottom:1px solid rgba(216,181,107,.14);white-space:nowrap}
th{color:var(--gold);font-weight:700;background:rgba(216,181,107,.07);font-size:14px}
tr:last-child td{border-bottom:0}
td a{text-decoration:none;color:var(--gold2)}
td a:hover{text-decoration:underline}
.num{color:var(--muted);font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:10px 0 0}
.grid a{display:block;background:rgba(255,255,255,.035);border:1px solid rgba(216,181,107,.16);border-radius:10px;padding:11px 13px;text-decoration:none;color:var(--white)}
.grid a:hover{border-color:rgba(216,181,107,.5)}
.grid a b{display:block;color:var(--gold2);font-size:16px}
.grid a span{color:var(--muted);font-size:13px}
.flag{background:rgba(216,181,107,.07);border-right:3px solid var(--gold);border-radius:8px;padding:10px 14px;margin:12px 0;font-size:15px;color:#e6dfd0}
.pn{display:flex;justify-content:space-between;gap:10px;margin:22px 0 0;flex-wrap:wrap}
.pn a{display:inline-block;padding:8px 14px;border:1px solid var(--gold);border-radius:9px;text-decoration:none;color:var(--gold);font-size:15px}
.pn .off{opacity:.35;pointer-events:none}
.refs{font-size:14px;color:var(--muted)}
.refs li{margin:6px 0}
footer{border-top:1px solid var(--line);margin-top:26px;padding-top:14px;color:var(--muted);font-size:14px}
@media(max-width:520px){.wrap{padding:12px 12px 60px}p,li{font-size:16px}.panel{padding:14px}}
"""


def page(era_dir, title, dating, dyn_html, sites_html, old_facts, old_secs, prev_era, next_era,
         n_kings, n_sites, era_num):
    url = f"https://per-ankh-egypt.vercel.app/eras/{era_dir}/"
    desc = f"{title} في تاريخ مصر القديمة: {dating}. الأسرات والملوك والمواقع الأثرية ومراجع الموسوعة."
    secs = {k: v for k, v in old_secs}
    saleh = SALEH[era_dir]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url + "#webpage", "url": url,
         "name": f"{title} | بر عنخ", "description": desc, "inLanguage": "ar-EG",
         "isPartOf": {"@id": "https://per-ankh-egypt.vercel.app/#website"}},
        {"@type": "Article", "headline": f"{title} | بر عنخ", "description": desc,
         "inLanguage": "ar-EG", "mainEntityOfPage": url,
         "author": {"@type": "Organization", "name": "بر عنخ | PER ANKH",
                    "url": "https://per-ankh-egypt.vercel.app/"}}]}
    prev_html = (f'<a href="/eras/{prev_era[0]}/">→ {prev_era[1]}</a>' if prev_era
                 else '<span class="off">→ السابق</span>')
    next_html = (f'<a href="/eras/{next_era[0]}/">← {next_era[1]}</a>' if next_era
                 else '<span class="off">← التالي</span>')
    return f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)} | عصور مصر القديمة — بر عنخ</title><meta name="description" content="{html.escape(desc)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{url}"><meta property="og:type" content="article"><meta property="og:locale" content="ar_EG"><meta property="og:site_name" content="بر عنخ | PER ANKH"><meta property="og:title" content="{html.escape(title)} | بر عنخ"><meta property="og:description" content="{html.escape(desc)}"><meta property="og:url" content="{url}"><meta name="twitter:card" content="summary"><link rel="icon" href="/assets/per-ankh-favicon-v2.png?v=20261115-3"><style>{SHELL_STYLES}</style><style>{CSS}</style><script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script></head><body>{TOPBAR}<main class="wrap">{_crumb([("الرئيسية","/"),("العصور والأسرات","/#timeline-details"),(title,None)])}
<header class="phero"><div class="cover"><img src="/assets/eras/era{era_num}.webp" alt="{html.escape(title)}" width="1600" height="900" loading="eager"><div class="cgrad"></div><div class="ctext"><h1>{html.escape(title)}</h1><p class="sub">{html.escape(dating)}</p></div></div><div class="chips"><a href="#dyn">الأسرات والملوك</a><a href="#sites">مواقع العصر</a><a href="#date">التأريخ</a><a href="#gaps">ما ينقصنا</a><a href="#refs">المراجع</a></div></header>
<div class="facts"><div class="fact"><b>حدود العصر</b><span>{html.escape(dating)}</span></div><div class="fact"><b>الملوك في الموسوعة</b><span>{n_kings} ملكًا</span></div><div class="fact"><b>مواقع مرتبطة</b><span>{n_sites} موقعًا</span></div></div>
<section class="panel" id="about"><h2>ملامح العصر كما يراها عبد العزيز صالح <span class="bdg v">موثّق</span></h2><p>{saleh}</p><p class="refs">المصدر: عبد العزيز صالح، الشرق الأدنى القديم، ج1 (مصر والعراق)، تصنيف عصور مصر القديمة — <a href="https://archive.org/details/20210510_20210510_0037" rel="noopener" target="_blank">نسخة الكتاب على archive.org</a>. النقل بالمعنى مع الحفاظ على ألفاظه.</p></section>
<section class="panel" id="date"><h2>التأريخ</h2><p>حدود العصور في الموسوعة: {html.escape(dating)}.</p><p>التواريخ المطلقة لمصر القديمة تقديرية وتختلف بين الباحثين، ولذلك لا نعرض هنا سنة واحدة لكل حدث، ونذكر في صفحة كل ملك ما تنص عليه مصادره مع اسم صاحب الرأي.</p><div class="flag">لم نُثبِّت بعد تواريخ بداية ونهاية كل أسرة بمصدر صفحة محددة، فهذه الحدود قيد التوثيق. البند مفتوح في قسم «ما ينقصنا» أدناه.</div></section>
<section class="panel" id="dyn"><h2>الأسرات والملوك</h2><p>كل ملك في الجدول يفتح صفحته في الموسوعة. الأسر التي لا توجد لها صفحات بعد مذكورة بالاسم في آخر الجدول.</p>{dyn_html}</section>
<section class="panel" id="sites"><h2>مواقع أثرية من هذا العصر</h2>{sites_html}</section>
<section class="panel" id="gaps"><h2>ما ينقصنا الآن</h2><ul><li>نصوص موثقة لملامح العصر من كتب العلماء المصريين (سليم حسن، عبد العزيز صالح، عبد الحليم نور الدين، أحمد فخري، زاهي حواس) بأرقام صفحات.</li><li>تواريخ بداية ونهاية كل أسرة مع اسم الباحث الذي يؤرخها.</li><li>آراء العلماء في المسائل الخلافية لكل عصر (مثل بداية الدولة الوسطى ونهاية الأسرة الثانية عشرة).</li><li>صور وخرائط لكل عصر، وتسجيل صوتي لكل قسم.</li></ul><div class="flag">لا نضع في الصفحة رأيًا أو رقمًا بلا مصدر. ما لم يُوثَّق يبقى هنا مذكورًا حتى يُضاف.</div></section>
<section class="abt"><h2>عن هذه الصفحة</h2><ul><li><b>المحتوى</b><span>كل فقرة منسوبة إلى صاحبها برقم الصفحة؛ وما لم نجد له مصدرًا مذكور في «ما ينقصنا» ولا يُكتب.</span></li><li><b>الصور</b><span>صورة الغلاف توليد توضيحي بالذكاء الاصطناعي وليست صورة فوتوغرافية.</span></li></ul></section><section class="panel" id="refs"><h2>المراجع</h2><ol class="refs"><li>عبد العزيز صالح، الشرق الأدنى القديم، ج1 (مصر والعراق)، تصنيف عصور مصر القديمة: <a href="https://archive.org/details/20210510_20210510_0037" rel="noopener" target="_blank">archive.org/details/20210510_20210510_0037</a></li><li>سجلات الموسوعة الداخلية لصفحات الملوك (الأسرة والعصر لكل ملك) — أساس جداول الأسرات.</li></ol><p class="refs">لم نستخدم ويكيبيديا في هذه الصفحة.</p></section>
<nav class="pn">{prev_html}{next_html}</nav>
<footer>صفحة تعليمية من موسوعة بر عنخ. التواريخ والتفسيرات الأثرية تُعرض وفق المصادر المتاحة، وقد تختلف بعض التفاصيل بين الدراسات. <a href="/eras/">كل العصور</a> · <a href="/">الرئيسية</a></footer>
</main>{TAILSCRIPTS}</body></html>"""


def main():
    kings = read_kings()
    sites = read_sites()
    site_by_era = {}
    for s, eras in SITE_ERAS.items():
        for e in eras:
            site_by_era.setdefault(e, []).append(s)

    for idx, (era_dir, title, dating, era_keys) in enumerate(ERAS):
        dyns = {}
        for k in era_keys:
            dyns.update(kings.get(k, {}))
        n_kings = sum(len(v) for v in dyns.values())
        s_list = site_by_era.get(era_dir, [])
        n_sites = len(s_list)

        parts = []
        for dyn, ks in dyns.items():
            rows = "".join(
                f'<tr><td><a href="/kings/{slug}/">{html.escape(name)}</a></td>'
                f'<td class="num">{i}</td></tr>' for i, (slug, name) in enumerate(ks, 1))
            parts.append(
                f'<h3>{html.escape(dyn)} <span class="num">({len(ks)} ملكًا)</span></h3>'
                f'<div class="tw"><table><thead><tr><th>الملك</th><th>الترتيب في القائمة</th></tr></thead><tbody>{rows}</tbody></table></div>')
        for d in MISSING_DYNASTIES.get(era_dir, []):
            parts.append(f'<div class="flag"><b>{html.escape(d)}:</b> لا توجد لها صفحات ملوك في الموسوعة بعد.</div>')
        if not dyns:
            parts.append('<div class="flag">لا توجد صفحات ملوك لهذا العصر بعد؛ العصر مبني على المواقع والآثار.</div>')
        dyn_html = "".join(parts)

        if s_list:
            cards = "".join(
                f'<a href="/sites/{s}/"><b>{html.escape(sites[s]["name"])}</b>'
                f'<span>{html.escape(sites[s]["facts"].get("الموقع",""))}</span></a>'
                for s in s_list if s in sites)
            sites_html = f'<div class="grid">{cards}</div>'
        else:
            sites_html = '<div class="flag">لم نُضِف مواقع هذا العصر بعد.</div>'

        old_facts, old_secs = read_old(era_dir)
        prev_era = ERAS[idx - 1][:2] if idx > 0 else None
        next_era = ERAS[idx + 1][:2] if idx < len(ERAS) - 1 else None

        out = page(era_dir, title, dating, dyn_html, sites_html, old_facts, old_secs,
                   prev_era, next_era, n_kings, n_sites, era_dir[:2])
        p = os.path.join(ROOT, "eras", era_dir, "index.html")
        open(p, "w", encoding="utf-8").write(out)
        print(era_dir, len(out), "kings", n_kings, "sites", n_sites)


if __name__ == "__main__":
    main()
