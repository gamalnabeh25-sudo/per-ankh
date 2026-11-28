#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""جدول التسجيل: كل مقطع صوتي لصفحات الأسرات والعصور، بنصه المشكول وملف الإخراج المطلوب."""
import os, json, glob, csv
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "audio", "scripts")
rows = []
for f in sorted(glob.glob(os.path.join(S, "dynasties-*.json"))):
    if f.endswith(".tashkeel.json"): continue
    d = json.load(open(f, encoding="utf-8"))
    slug = d["slug"] if "slug" in d else os.path.basename(f)[10:-5]
    tk = json.load(open(f.replace(".json", ".tashkeel.json"), encoding="utf-8"))
    tmap = {s["id"]: s["parts"] for s in tk["sections"]}
    for sec in d["sections"]:
        for k, part in enumerate(sec["parts"], 1):
            t = tmap[sec["id"]][k - 1]
            rows.append({
                "page": slug, "page_title": d.get("title", ""), "section": sec["id"],
                "section_title": sec.get("title", ""), "part": k,
                "out": "dynasties/%s/audio/%s-%d.mp3" % (slug, sec["id"], k),
                "text_tashkeel": t, "text_plain_say": part["say"],
                "est_seconds": part["est"], "words": len(part["say"].split()),
            })
out = os.path.join(ROOT, "audio")
json.dump({"voice_brief": "عربية فصحى هادئة، وتيرة تعليمية بطيئة، بلا مبالغة تمثيلية، وقفة قصيرة عند الفاصلة ووقفة أطول عند النقطة. النص المشكول هو المرجع للنطق. مقطع واحد لكل ملف. صيغة mp3 بمعدل 128kbps أحادي، تسوية صوت -16 LUFS، صمت 0.3 ث في البداية والنهاية.",
           "label_on_page": "صوت اصطناعي", "count": len(rows), "total_est_seconds": sum(r["est_seconds"] for r in rows), "items": rows},
          open(os.path.join(out, "manifest-dynasties.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
with open(os.path.join(out, "manifest-dynasties.csv"), "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
print(len(rows), "items", sum(r["est_seconds"] for r in rows), "sec", len({r["page"] for r in rows}), "pages")
