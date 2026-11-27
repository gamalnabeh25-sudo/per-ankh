#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""يولّد سكربتات التعليق الصوتي لصفحات الأسرات من نصوص الصفحة نفسها.
قسم واحد لكل لوحة، ثم قسم الملوك، ثم «ما ينقص هذه الصفحة». بلا مقدمة ولا خاتمة.
لكل مقطع: text (نص الصفحة) و say (نص مسموع مُطبَّع: الأرقام بالحروف والاختصارات مفتوحة)،
ومدة تقديرية بالثواني، ومسرد تلفّظ لأسماء الأعلام بالشكل.
"""
import os, re, json, html
from dyn_content import CONTENT

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "audio", "scripts")
WPS = 2.4  # كلمات في الثانية لتعليق عربي هادئ

# مسرد أسماء الأعلام بالشكل (يُطبَّق على النص المسموع فقط، لا على نص الصفحة)
NAMES = {
 "خوفو":"خُوفُو","سنفرو":"سِنِفرو","خفرع":"خَفْرَع","منقرع":"مِنْقَرَع","جدف رع":"جَدِف رَع",
 "أوسركاف":"أُوسِرْكاف","ساحورع":"ساحُورَع","نفر إر كا رع":"نِفِر إر كا رَع","شبسس كا رع":"شِبْسِس كا رَع",
 "ونيس":"وِنِيس","تتي":"تِتِي","بيبي":"بِيبِي","مرنرع":"مِرِنْرَع","نيتوكريس":"نِيتُوكْرِيس",
 "أحمس":"أَحْمَس","تحتمس":"تُحْتُمُس","حتشبسوت":"حَتْشِبْسُوت","أمنحتب":"أَمِنْحُتِب","إخناتون":"إخْناتُون",
 "توت عنخ آمون":"تُوت عَنْخ آمُون","حورمحب":"حُورِمْحَب","رمسيس":"رَمْسِيس","سيتي":"سِيتِي",
 "مرنبتاح":"مِرِنْبَتاح","ششنق":"شِشَنْق","تاكلوت":"تاكِلُوت","أوسركن":"أُوسِرْكُن","بسماتيك":"بِسْماتِيك",
 "أبسماتيك":"أَبْسَماتِيك","نخاو":"نِخاو","بسماتيك الثالث":"بِسْماتِيك الثالث","بعنخي":"بِعَنْخِي",
 "شباكا":"شَباكا","شباتاكا":"شَباتاكا","طهرق":"طَهَرْقا","أرتكزرسس":"أَرْتَكْزَرْكْسِس","داريوس":"دارْيُوس",
 "الإسكندر":"الإسْكَنْدَر","بطليموس":"بَطْلَمْيُوس","كليوباترا":"كِلْيُوباتْرا","مانيتون":"مانِيتُون",
 "هيرودوت":"هِيرُودُوت","ديودوروس":"دِيُودُورُوس","سترابو":"سْتْرابُون","بردية تورين":"بُرْدِيَّة تُورِين",
 "سخا":"سَخا","منف":"مَنْف","أفاريس":"أَوارِيس","أواريس":"أَوارِيس","إهناسيا":"إهْناسْيا","أبيدوس":"أَبِيدُوس",
 "الكرنك":"الكَرْنَك","الجيزة":"الجِيزَة","سقارة":"سَقّارَة","دهشور":"دَهْشُور","ميدوم":"مَيْدُوم",
 "تل العمارنة":"تِلّ العَمارْنَة","وادي الملوك":"وادِي المُلُوك","النوبة":"النُّوبَة","كرما":"كَرْما",
 "سيناء":"سِيناء","إلفنتين":"إلِفَنْتِين","هكسوس":"هِكْسُوس","ليبيا":"لِيبْيا","نباتا":"نَباتا","مروي":"مَروِي",
 "أوزوريس":"أُوزِيرِيس","آمون":"آمُون","رع":"رَع","حورس":"حُورُس","إيزيس":"إيزِيس","سخمت":"سَخْمِت",
 "أبوصير":"أَبُوصِير","اللاهون":"اللاهُون","هوارة":"هَوارَة","العريش":"العَرِيش","أولاد علي":"أَوْلاد عَلِي",
}

UNITS = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"]
TEENS = {10: "عشرة", 11: "أحد عشر", 12: "اثنا عشر", 13: "ثلاثة عشر", 14: "أربعة عشر", 15: "خمسة عشر",
         16: "ستة عشر", 17: "سبعة عشر", 18: "ثمانية عشر", 19: "تسعة عشر"}
TENS = {20: "عشرون", 30: "ثلاثون", 40: "أربعون", 50: "خمسون", 60: "ستون", 70: "سبعون", 80: "ثمانون", 90: "تسعون"}
HUND = {100: "مائة", 200: "مائتان", 300: "ثلاثمائة", 400: "أربعمائة", 500: "خمسمائة", 600: "ستمائة",
        700: "سبعمائة", 800: "ثمانمائة", 900: "تسعمائة"}


def _u3(n):
    """0-999 بالحروف."""
    out = []
    h, r = divmod(n, 100)
    if h:
        out.append(HUND[h * 100])
    if r:
        if r in TEENS:
            out.append(TEENS[r])
        else:
            t, u = divmod(r, 10)
            if u:
                out.append(UNITS[u] + (" و" + TENS[t * 10] if t else ""))
            else:
                out.append(TENS[r])
    return " و".join(out)


def num2ar(n):
    n = int(n)
    if n == 0:
        return "صفر"
    if n < 1000:
        return _u3(n)
    th, rest = divmod(n, 1000)
    if th == 1:
        head = "ألف"
    elif th == 2:
        head = "ألفان"
    else:
        head = _u3(th) + " آلاف"
    return head + (" و" + _u3(rest) if rest else "")


def expand_numbers(s):
    def rep(m):
        d = m.group(0)
        if len(d) > 1 and d[0] == "0":
            return d
        return num2ar(d)
    return re.sub(r"\d{1,6}", rep, s)


def normalize(s):
    s = expand_numbers(s)
    s = s.replace("ق.م.", "قبل الميلاد").replace("ق. م.", "قبل الميلاد").replace("قبل الميلاد.", "قبل الميلاد")
    s = re.sub(r"\bص(\d+)", lambda m: "صفحة " + num2ar(m.group(1)), s)
    s = s.replace("ج1", "الجزء الأول").replace("ج2", "الجزء الثاني").replace("ج4", "الجزء الرابع")
    s = re.sub(r"\bم\.\s", "ميلادية ", s)
    s = re.sub(r"\(\s*\)", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    for k, v in NAMES.items():
        s = re.sub(r"(?<![\u0621-\u064A])" + re.escape(k) + r"(?![\u0621-\u064A])", v, s)
    return s


def split_long(s, limit=520):
    """يقسم فقرة طويلة عند نهايات الجمل حتى يبقى المقطع الصوتي قصيرًا ومريحًا."""
    if len(s) <= limit:
        return [s]
    sents = re.split(r"(?<=[.!؟:])\s+", s)
    out, cur = [], ""
    for x in sents:
        if cur and len(cur) + len(x) + 1 > limit:
            out.append(cur)
            cur = x
        else:
            cur = (cur + " " + x).strip()
    if cur:
        out.append(cur)
    return out


def plain(s):
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def sec(sid, title, paras):
    parts = []
    for p in paras:
        for chunk in split_long(p):
            say = normalize(chunk)
            parts.append({"text": chunk, "say": say, "est": round(len(say.split()) / WPS)})
    return {"id": sid, "title": plain(title), "parts": parts,
            "seconds": sum(p["est"] for p in parts)}


def build(key, slug, label, kings):
    secs = []
    for i, (h, body, _src) in enumerate(CONTENT[key]["panels"], 1):
        paras = [plain(p) for p in re.findall(r"<p>(.*?)</p>", body, flags=re.S)]
        paras = [p for p in paras if p]
        if paras:
            secs.append(sec("s%d" % i, h, paras))
    n = len(kings)
    if n:
        kp = ("ملوك هذه الأسرة على الموقع: %s، ولكل منهم صفحة مستقلة تفتح من جدول الملوك في الصفحة."
              % ("ملك واحد" if n == 1 else ("ملكان" if n == 2 else ("%d ملوك" % n if n < 11 else "%d ملكًا" % n))))
    else:
        kp = "لم تُنشر بعدُ على الموقع صفحة مستقلة لأي ملك من ملوك هذه الأسرة."
    secs.append(sec("kings", "ملوك هذه الأسرة" if isinstance(key, int) else "الملوك", [kp]))
    gaps = plain(CONTENT[key].get("gaps", ""))
    if gaps:
        secs.append(sec("gaps", "ما ينقص هذه الصفحة", [gaps]))
    total = sum(s["seconds"] for s in secs)
    return {"slug": slug, "kind": "dynasties", "title": label, "sections": secs,
            "seconds": total, "duration": "%d:%02d" % (total // 60, total % 60)}


def main():
    from build_dynasties import read_kings, SLUGS, ORDER, dynasty_label
    kb = read_kings()
    made = 0
    for k in ORDER:
        if k not in CONTENT:
            continue
        d = build(k, SLUGS[k], dynasty_label(k), kb.get(k, []))
        p = os.path.join(OUT, "dynasties-%s.json" % SLUGS[k])
        open(p, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=1))
        made += 1
    print("scripts:", made)


if __name__ == "__main__":
    main()
