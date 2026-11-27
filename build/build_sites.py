#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""يبني صفحات المواقع الأثرية (sites/) في موقع بر عنخ.
كل نص منسوب إلى صاحبه مع رقم الصفحة؛ وما لا مصدر له يُذكر في «ما ينقصنا» ولا يُكتب.
"""
import json, os, html, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://per-ankh-egypt.vercel.app"

# مراجع متكررة
R_NUR = ("عبد الحليم نور الدين، آثار وحضارة مصر القديمة ج1، ص{p}",
         "https://archive.org/details/AAlexandrina-117303")
R_SALEH = ("عبد العزيز صالح، الشرق الأدنى القديم ج1 (مصر والعراق)، ص{p}",
           "https://archive.org/details/20210510_20210510_0037")

SITES = {
    "01-hdbh-algyzh": dict(
        name="هضبة الجيزة", en="GIZA PLATEAU", loc="شمال منف – الضفة الغربية للنيل",
        period="الأسرة الرابعة – الدولة القديمة", era=["03-aldwlh-alqdymh"],
        cover="era03",
        intro="جبانة منف الملكية في عصر الأسرة الرابعة، وفيها الهرم الأكبر وهرما خفرع ومنكاورع وأبو الهول.",
        secs=[
            dict(h="الهرم الأكبر: وصف عبد الحليم نور الدين", badge="v",
                 body="""<p>«ويُشيد الهرم على مساحة تبلغ حوالي ١٣ فدانًا، ويصل ارتفاعه إلى ١٤٦ مترًا (أصبحت الآن ١٣٧م بفعل عوامل التعرية)، ويشارك في بنائه عشرات الآلاف من العمال، ويستوعب الهرم بضع ملايين من الكتل الحجرية، ويضم ثلاث حجرات دفن، ومدخل في واجهته الشمالية، وممرين يعتبر الكبير منهما (البهو الكبير) والذي يصل طوله إلى نحو ٤٧ مترًا آية في فن العمارة. ورغم ضخامة الهرم وجمال عمارته، فقد خلا من نقوش أو مناظر أو عناصر زخرفية، باستثناء نص (مخربشة) كتب بخط سريع (هيروغليفي مختصر) في الغرفة الثالثة من غرف تخفيف الضغط التي تعلو غرفة الدفن الرئيسية التي دفن فيها الملك. ويشير النص إلى العام السابع عشر من حكم الملك خوفو.»</p>
<p class="note">نقل حرفي عن نور الدين ص215. الأرقام في نسخة الكتاب المشوّشة وُضبطت من سياقها، والمراجعة على الأصل مطلوبة قبل النشر.</p>""",
                 src=[("نور الدين", R_NUR, "215")]),
            dict(h="ما يضيفه عبد العزيز صالح عن عهد خوفو", badge="v",
                 body="""<p>يذكر عبد العزيز صالح أن شهرة خوفو بصاحب الهرم الأكبر لم تحفظ عن أخبار عهده إلا القليل، ومن هذا القليل أن اسمه نُقش على جزء من محاجر في منطقة جنوبية بعيدة تقع في الصحراء الغربية شمال شرق أبو سنبل وشمال غرب توشكا؛ وأن رجاله استغلوا منجم الجمشت فيها، وقطعوا أحجار الديوريت ونقلوا عددًا من كتلتها الضخمة نحو ٧٥٠ ميلًا إلى الجيزة ليُصنع منها تماثيل الملك ولتُرصف بها أرضية معبده فوق الهضبة.</p>""",
                 src=[("صالح", R_SALEH, "176")]),
            dict(h="من يخصّه من الملوك", badge="v",
                 body="""<p>ملوك الأسرة الرابعة الذين تخصّهم الهضبة أو جوارها، ولكل منهم صفحته:</p>
<div class="grid"><a href="/kings/018-snfrw/"><b>سنفرو</b><span>الأسرة الرابعة · أهرامه في دهشور وميدوم</span></a><a href="/kings/019-khwfw/"><b>خوفو</b><span>الأسرة الرابعة · الهرم الأكبر</span></a><a href="/kings/020-gdf-ra/"><b>جدف رع</b><span>الأسرة الرابعة</span></a><a href="/kings/021-khfra/"><b>خفرع</b><span>الأسرة الرابعة · الهرم الثاني وأبو الهول</span></a><a href="/kings/022-mnkawra/"><b>منكاورع</b><span>الأسرة الرابعة · الهرم الثالث</span></a><a href="/kings/023-shbskaf/"><b>شبسكاف</b><span>الأسرة الرابعة</span></a></div>""",
                 src=[]),
            dict(h="المواقع المجاورة", badge="v",
                 body="""<div class="grid"><a href="/sites/02-sqarh/"><b>سقارة</b><span>جبانة منف جنوب القاهرة</span></a><a href="/sites/03-dhshwr/"><b>دهشور</b><span>جنوب سقارة</span></a><a href="/sites/04-abw-syr/"><b>أبو صير</b><span>بين الجيزة وسقارة</span></a><a href="/sites/05-mydwm/"><b>ميدوم</b><span>محافظة بني سويف</span></a></div>""",
                 src=[]),
        ],
        gaps=["بعد الهرم الأكبر وعهد خوفو، لا يوجد في المصادر المفتوحة التي فتحناها وصف تفصيلي لكل أثر على الهضبة (المعابد الجنائزية، مقابر النبلاء، المدينة السكنية للعمال) بأرقام صفحات.",
              "كتاب زاهي حواس «بناة الأهرام» — وفيه ٢٦ موضعًا عن الجيزة — غير متاح لنا كنص مفتوح بعد، وهو أهم ما ينقص هذه الصفحة.",
              "أرقام أبعاد الهرم تحتاج مراجعة على نسخة ورقية قبل النشر، لأن مسح الكتاب المشوّف شوّه الأرقام."],
    ),
    "02-sqarh": dict(
        name="سقارة", en="SAQQARA", loc="جبانة منف جنوب القاهرة",
        period="من الأسرة الثالثة حتى العصر المتأخر", era=["02-alasr-alatyq", "03-aldwlh-alqdymh"],
        cover=None,
        intro="جبانة منف الكبرى، وفيها مجمع زوسر المدرج وأهرامات ونصوص أهرام ومقابر النبلاء وسراديب الحيوانات المقدسة.",
        secs=[
            dict(h="هرم سخم خت «الدفين»: المرحلة الثالثة في تطور المقبرة الملكية", badge="v",
                 body="""<p>«وجرت المرحلة الثالثة من مراحل تطور المقبرة الملكية على أرض سقارة أيضًا في عهد خليفة زوسر (ابنه الملك سخم خت) إلى الجنوب الغربي من مجموعة أبيه. وكان من المفروض أن تمثل المصطبة المدرجة للملك "سخم خت" والتي تعرف "بالهرم الدفين" خطوة على الطريق نحو الوصول بالمقبرة إلى الشكل الهرمي الكامل، وإن رأى البعض أن تخطيطها يشير إلى أنها كانت ستتكوّن من سبع إضافات، وما عدا ذلك فإن المجموعة الخاصة بالملك سخم خت تماثل إلى حد كبير مجموعة أبيه.»</p>""",
                 src=[("نور الدين", R_NUR, "213")]),
            dict(h="إيمحوتب: ألقاب مهندس مجموعة زوسر", badge="v",
                 body="""<p>«كان لحسن الحظ أن احتفظت الأيام باسم مهندس مجموعة زوسر المعمارية في سقارة وصاحب الفضل في تصميمها وهو إيمحوتب، الذي سجّل من ألقابه في عهد ملكه ألقابًا تدل على أنه كان أمينًا لأختام الوجه البحري، وتاليًا للملك أو الأول لدى الملك، وناظرًا على القصر العالي، ومهندسًا، ومسجلًا للحوليات، وكبيرًا للرائين.»</p>""",
                 src=[("صالح", R_SALEH, "141")]),
            dict(h="من يخصّه من الملوك", badge="v",
                 body="""<p>ملوك سقارة في الموسوعة:</p>
<div class="grid"><a href="/kings/014-zwsr/"><b>زوسر</b><span>الأسرة الثالثة · الهرم المدرج</span></a><a href="/kings/015-skhm-kht/"><b>سخم خت</b><span>الأسرة الثالثة · الهرم الدفين</span></a><a href="/kings/016-kha-ba/"><b>خع با</b><span>الأسرة الثالثة · هرم زاوية العريان</span></a><a href="/kings/030-wnys/"><b>أوناس</b><span>الأسرة الخامسة · نصوص الأهرام</span></a><a href="/kings/031-tyty/"><b>تيتي</b><span>الأسرة السادسة</span></a><a href="/kings/032-awsr-ka-ra/"><b>أوسر كا رع</b><span>الأسرة السادسة</span></a></div>""",
                 src=[]),
            dict(h="المواقع المجاورة", badge="v",
                 body="""<div class="grid"><a href="/sites/01-hdbh-algyzh/"><b>هضبة الجيزة</b><span>شمال منف</span></a><a href="/sites/03-dhshwr/"><b>دهشور</b><span>جنوب سقارة</span></a><a href="/sites/04-abw-syr/"><b>أبو صير</b><span>بين الجيزة وسقارة</span></a><a href="/sites/05-mydwm/"><b>ميدوم</b><span>محافظة بني سويف</span></a></div>""",
                 src=[]),
        ],
        gaps=["لا يوجد بعدُ نص موثق عن هرم أوناس ونصوص الأهرام فيه، ولا عن السرابيوم ومقابر النبلاء، من الكتب التي نعتمدها.",
              "كتاب زاهي حواس «بناة الأهرام» فيه مواضع عن سقارة (ص40، 47) ولم يصلنا نصه بعد."],
    ),
    "05-mydwm": dict(
        name="ميدوم", en="MEIDUM", loc="محافظة بني سويف",
        period="نهاية الأسرة الثالثة وبداية الرابعة", era=["03-aldwlh-alqdymh"],
        cover=None,
        intro="هرم حوني، آخر ملوك الأسرة الثالثة، وأقدم مجموعة هرمية تقليدية كاملة.",
        secs=[
            dict(h="هرم حوني وأقدم مجموعة هرمية تقليدية", badge="v",
                 body="""<p>«ووصلت الإضافات الجانبية إلى ثمانية، ولم يتبقَّ منها سوى أربعة، وخطا المعماري خطوة هامة في هذا الهرم، تمثلت في كساء الإضافات بالحجر الجيري، لتبدو المنشأة وكأنها هرم كامل. وقد سقط هذا الكساء بمرور الزمن؛ ولهذا سُمي "الهرم الناقص". ويتميز هرم "حوني" بأنه يضم أقدم مجموعة هرمية تقليدية، تلك التي تتكون من الهرم، والمعبد الجنائزي، ومعبد الوادي، ويربط بينهما الطريق الصاعد.»</p>""",
                 src=[("نور الدين", R_NUR, "214")]),
            dict(h="كيف انتهى بناء الهرم في عهد سنفرو", badge="v",
                 body="""<p>يذكر عبد العزيز صالح أن الملك حوني شاد له مهندسوه هرمًا ضخمًا في منطقة ميدوم غيّروا تصميمه أكثر من مرة، وجعلوه في نهاية أمره على هيئة هرم مدرج ذي ثماني درجات كاملة، وبدءوا في كساء درجاته بأحجار جيرية بيضاء، ثم مات الملك قبل إتمامه، فأتمّه ابنه سنفرو أول ملوك الأسرة الرابعة، وملأ الفراغات بين الدرجات بالأحجار وكساه ببلاطات جيرية كبيرة؛ وأن أغلب أجزاء الهرم تهدمت ولم يتبقَّ منه غير نحو ثلث ارتفاعه الأصلي.</p>""",
                 src=[("صالح", R_SALEH, "170")]),
            dict(h="من يخصّه من الملوك", badge="v",
                 body="""<div class="grid"><a href="/kings/017-hwny/"><b>حوني</b><span>الأسرة الثالثة · باني هرم ميدوم</span></a><a href="/kings/018-snfrw/"><b>سنفرو</b><span>الأسرة الرابعة · أتمّ هرم أبيه</span></a></div>""",
                 src=[]),
        ],
        gaps=["لا نص عندنا عن مقبرة ميدوم الملكية الداخلية ولا عن مقابر النبلاء حول الهرم.",
              "مسح نور الدين يذكر أن الكساء سقط فسُمي «الهرم الناقص»، ويُسمّى بالاسم نفسه هرم آخر في زاوية العريان في الصفحة التالية من الكتاب؛ التباس تسمية داخل المصدر نفسه، ننقله كما هو."],
    ),
    "03-dhshwr": dict(
        name="دهشور", en="DAHSHUR", loc="جنوب سقارة",
        period="الدولة القديمة والوسطى", era=["03-aldwlh-alqdymh", "05-aldwlh-alwsta"],
        cover=None,
        intro="مجموعة أهرامات سنفرو، ثم أهرامات الدولة الوسطى الصغيرة المبنية بالطوب اللبن.",
        secs=[
            dict(h="الهرم المنحني لسنفرو", badge="v",
                 body="""<p>«وشهدت منطقة دهشور الواقعة إلى الجنوب من سقارة خطوة هامة نحو الوصول للشكل الهرمي الكامل، تمثلت في الهرم الذي شُيد في عهد الملك سنفرو (أول ملوك الأسرة الرابعة)، والذي يُعرف باسم الهرم المنحني، أو المنكسر الأضلاع، أو المنبعج... كان المهندس المعماري يهدف بعد التجارب الطويلة السابقة أن يصل بالمقبرة للشكل الهرمي الكامل، والواضح أنه بدأ بزاوية اتضح — بعد أن قطع العمل شوطًا — أنها تصل بالهرم إلى ارتفاع شاهق.»</p>""",
                 src=[("نور الدين", R_NUR, "214")]),
            dict(h="أهرامات الدولة الوسطى في دهشور", badge="v",
                 body="""<p>«وينتقل زمام الحكم لملوك الأسرة الثانية عشرة (الذين يحملون أسماء أمنمحات وسنوسرت)، والذين اختاروا عاصمة لهم في أرض الفيوم قديمًا، والتي أصبحت تعرف حاليًا باسم "اللشت" وحوارة واللاهون ودهشور، ليشيدوا أهراماتهم. وجاءت أهراماتهم صغيرة في أحجامها، مشيدة من الطوب اللبن، مكسوة بالحجر الجيري أحيانًا، وتعلوها هريمات من الحجر.»</p>""",
                 src=[("نور الدين", R_NUR, "216")]),
            dict(h="من يخصّه من الملوك", badge="v",
                 body="""<div class="grid"><a href="/kings/018-snfrw/"><b>سنفرو</b><span>الأسرة الرابعة · الهرم المنحني والهرم الأحمر</span></a><a href="/kings/044-amnmhat-alawl/"><b>أمنمحات الأول</b><span>الأسرة الثانية عشرة</span></a><a href="/kings/048-snwsrt-althalth/"><b>سنوسرت الثالث</b><span>الأسرة الثانية عشرة</span></a><a href="/kings/049-amnmhat-althalth/"><b>أمنمحات الثالث</b><span>الأسرة الثانية عشرة</span></a></div>""",
                 src=[]),
        ],
        gaps=["لم نجد نصًا يصف الهرم الأحمر (الشمالي) لسنفرو بوصف تفصيلي في المصادر المفتوحة التي فتحناها.",
              "نسب أهرامات الدولة الوسطى في دهشور إلى أصحابها يحتاج تثبيتًا من نص بأرقام صفحات، لا من قائمة أسماء فقط."],
    ),
}

CSS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "site_style.css"), encoding="utf-8").read()


def refs_block(used):
    out, seen = [], set()
    for label, (tpl, url), page in used:
        key = (label, page)
        if key in seen:
            continue
        seen.add(key)
        title = tpl.format(p=page)
        out.append(f'<li>{html.escape(title)}: <a href="{url}" rel="noopener" target="_blank">نسخة الكتاب على archive.org</a></li>')
    return "<ol class=\"refs\">" + "".join(out) + "</ol>" if out else ""


def build(slug, d):
    url = f"{BASE}/sites/{slug}/"
    used = [u for s in d["secs"] for u in s["src"]]
    secs_html = []
    for i, s in enumerate(d["secs"], 1):
        bdg = '<span class="bdg v">موثّق</span>' if s["badge"] == "v" else ""
        src_line = ""
        if s["src"]:
            label, (tpl, _u), page = s["src"][0]
            src_line = f'<p class="note">المصدر: {html.escape(tpl.format(p=page))}.</p>'
        secs_html.append(
            f'<section class="panel" id="s{i}"><h2><span class="num">{i}</span>{html.escape(s["h"])} {bdg}</h2>{s["body"]}{src_line}</section>')
    gaps = "".join(f"<li>{html.escape(g)}</li>" for g in d["gaps"])
    era_links = "".join(
        f'<a href="/eras/{e}/">العصر</a>' for e in d["era"])
    desc = f"{d['name']} ({d['en']}): {d['intro']}"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url + "#webpage", "url": url, "name": f"{d['name']} | بر عنخ",
         "description": desc, "inLanguage": "ar-EG",
         "isPartOf": {"@id": BASE + "/#website"}},
        {"@type": "Article", "headline": f"{d['name']} | بر عنخ", "description": desc,
         "inLanguage": "ar-EG", "mainEntityOfPage": url,
         "author": {"@type": "Organization", "name": "بر عنخ | PER ANKH", "url": BASE + "/"}}]}
    return f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(d['name'])} | المواقع الأثرية — بر عنخ</title><meta name="description" content="{html.escape(desc)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{url}"><meta property="og:type" content="article"><meta property="og:locale" content="ar_EG"><meta property="og:site_name" content="بر عنخ | PER ANKH"><meta property="og:title" content="{html.escape(d['name'])} | بر عنخ"><meta property="og:description" content="{html.escape(desc)}"><meta property="og:url" content="{url}"><meta name="twitter:card" content="summary"><link rel="icon" href="/assets/per-ankh-favicon-v2.png?v=20261115-3"><style>{CSS}</style><script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script></head><body><main class="wrap"><a class="brand" href="/">بر عنخ | PER ANKH</a><div class="crumb"><a href="/">الرئيسية</a> / <a href="/sites/">المواقع الأثرية</a> / {html.escape(d['name'])}</div>
<header class="hero"><div class="cover{' plain' if not d['cover'] else ''}">{('<img src="/assets/eras/'+d['cover']+'.webp" alt="" width="1600" height="900">') if d['cover'] else ''}<div class="cgrad"></div><div class="ctext"><h1>{html.escape(d['name'])}</h1><p class="sub">{html.escape(d['en'])} · {html.escape(d['period'])}</p></div></div></header>
<div class="facts"><div class="fact"><b>الاسم بالإنجليزية</b><span>{html.escape(d['en'])}</span></div><div class="fact"><b>الموقع</b><span>{html.escape(d['loc'])}</span></div><div class="fact"><b>الفترة</b><span>{html.escape(d['period'])}</span></div></div>
<p class="lead">{html.escape(d['intro'])}</p>
{''.join(secs_html)}
<section class="panel" id="gaps"><h2>ما ينقص هذه الصفحة</h2><ul>{gaps}</ul><p class="note">لا نكتب في هذه الصفحة ما لا مصدر له. ما ينقص مذكور هنا حتى يُضاف بنص منسوب إلى صاحبه.</p></section>
<section class="panel" id="refs"><h2>المراجع</h2>{refs_block(used)}<p class="refs">لم نستخدم ويكيبيديا في هذه الصفحة.</p></section>
<nav class="pn"><a href="/sites/">← كل المواقع</a><a href="/">الرئيسية</a></nav>
<footer>صفحة تعليمية من موسوعة بر عنخ. <a href="/eras/">العصور</a> · <a href="/kings/">الملوك</a></footer>
</main></body></html>"""


def main():
    for slug, d in SITES.items():
        p = os.path.join(ROOT, "sites", slug, "index.html")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, "w", encoding="utf-8").write(build(slug, d))
        print(slug, len(open(p, encoding="utf-8").read()))


if __name__ == "__main__":
    main()
