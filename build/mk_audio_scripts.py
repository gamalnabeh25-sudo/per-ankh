#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""يستخرج نص كل قسم من صفحات المواقع والعصور إلى ملف JSON جاهز للتسجيل.
النص هنا بلا تشكيل؛ ملف التشكيل يُكتب يدويًا في audio/scripts/<slug>.tashkeel.json
والتسجيل يُبنى منه فقط (نص القسم كما هو، بلا مقدمة ولا تنبيه صوتي)."""
import json, os, re, html as H

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def plain(fragment):
    t = re.sub(r"<script.*?</script>", "", fragment, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    t = H.unescape(t)
    return re.sub(r"\s+", " ", t).strip()

def sections(path):
    s = open(path, encoding="utf-8").read()
    out = []
    for m in re.finditer(r'<section class="panel" id="(s\d+)"><h2>(.*?)</h2>(.*?)</section>', s, flags=re.S):
        sid, head, body = m.group(1), m.group(2), m.group(3)
        title = plain(re.sub(r'<span class="num">.*?</span>', "", head))
        paras = [plain(p) for p in re.findall(r"<p(?![^>]*class=\"note\")[^>]*>(.*?)</p>", body, flags=re.S)]
        paras = [p for p in paras if p and "المصدر:" not in p]
        out.append(dict(id=sid, title=title, parts=paras))
    return out

def main():
    total = 0
    for kind in ("sites", "eras"):
        base = os.path.join(ROOT, kind)
        for slug in sorted(os.listdir(base)):
            f = os.path.join(base, slug, "index.html")
            if not os.path.isfile(f):
                continue
            secs = sections(f)
            if not secs:
                continue
            data = dict(slug=slug, kind=kind, sections=secs)
            p = os.path.join(ROOT, "audio", "scripts", f"{kind}-{slug}.json")
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, "w", encoding="utf-8").write(json.dumps(data, ensure_ascii=False, indent=1))
            chars = sum(len(x) for s in secs for x in s["parts"])
            total += chars
            print(f"{kind}/{slug}: {len(secs)} sections, {chars} chars")

if __name__ == "__main__":
    main()
