#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""يولّد سكربتات التعليق الصوتي لصفحات الأسرات من نصوص الصفحة نفسها.
قسم واحد لكل لوحة، ثم قسم الملوك، ثم «ما ينقص هذه الصفحة». بلا مقدمة ولا خاتمة.
النص المُشكَّل (tashkeel) يُكتب يدويًا في ملف منفصل كما في المواقع والعصور.
"""
import os, re, json, html
from dyn_content import CONTENT

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "audio", "scripts")


def plain(s):
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def build(key, slug, label, kings):
    secs = []
    for i, (h, body, _src) in enumerate(CONTENT[key]["panels"], 1):
        parts = [plain(p) for p in re.findall(r"<p>(.*?)</p>", body, flags=re.S)]
        parts = [p for p in parts if p]
        if parts:
            secs.append({"id": "s%d" % i, "title": plain(h), "parts": parts})
    n = len(kings)
    if n:
        kp = "ملوك هذه الأسرة على الموقع: %d، ولكل منهم صفحة مستقلة تفتح من جدول الملوك في الصفحة." % n
    else:
        kp = "لم تُنشر بعدُ على الموقع صفحة مستقلة لأي ملك من ملوك هذه الأسرة."
    secs.append({"id": "kings", "title": "ملوك هذه الأسرة" if isinstance(key, int) else "الملوك", "parts": [kp]})
    gaps = plain(CONTENT[key].get("gaps", ""))
    if gaps:
        secs.append({"id": "gaps", "title": "ما ينقص هذه الصفحة", "parts": [gaps]})
    return {"slug": slug, "kind": "dynasties", "title": label, "sections": secs}


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
