import re, os, glob, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUBJECT = {
    "01-hdbh-algyzh": "the Giza plateau", "02-sqarh": "Saqqara", "03-dhshwr": "Dahshur",
    "04-abw-syr": "Abusir", "05-mydwm": "Meidum", "06-abydws": "Abydos",
    "07-bny-hsn": "Beni Hasan", "08-tybh-alaqsr": "Thebes and Luxor", "09-alkrnk": "Karnak",
    "10-aldyr-albhry": "Deir el-Bahari", "11-wady-almlwk": "the Valley of the Kings",
    "12-tl-alamarnh": "Tell el-Amarna", "13-abw-smbl": "Abu Simbel", "14-mdynh-habw": "Medinet Habu",
    "15-tanys": "Tanis", "16-fylh": "Philae", "17-tl-qwsna": "Tell Quesna",
}
ERA_SUBJECT = {
    "01": "Predynastic Egypt", "02": "the Early Dynastic period", "03": "the Old Kingdom",
    "04": "the First Intermediate Period", "05": "the Middle Kingdom",
    "06": "the Second Intermediate Period", "07": "the New Kingdom",
    "08": "the Third Intermediate Period", "09": "the Late Period",
}

rows = []
for kind in ("sites", "eras"):
    for f in sorted(glob.glob(os.path.join(ROOT, kind, "*", "index.html"))):
        s = open(f, encoding="utf-8").read()
        slug = f.split("/")[-2]
        if kind == "sites":
            subject = SUBJECT.get(slug, slug)
        else:
            subject = ERA_SUBJECT.get(slug.split("-")[0], slug)
        for m in re.finditer(r'<section class="panel"(?: id="([^"]*)")?[^>]*>(.*?)</section>', s, flags=re.S):
            sid, body = m.group(1) or "", m.group(2)
            h = re.search(r"<h2[^>]*>(.*?)</h2>", body, flags=re.S)
            title = html.unescape(re.sub(r"<[^>]+>", "", h.group(1))).strip() if h else ""
            title = re.sub(r"^\s*\d+\s*", "", title).replace("موثّق", "").strip()
            if not title or title.startswith("ما ينقص") or title.startswith("المراجع"):
                continue
            if not sid:
                sid = "s%d" % (len(rows) + 1)
            path = "assets/sections/%s-%s.webp" % (slug, sid)
            prompt = ("landscape photograph 1000x667, subject: %s, at %s. %s. Warm low sun, dark warm grade matching the covers, "
                      "no people, no text, no watermark, archaeological documentary photography"
                      % (title, subject, "Egypt"))
            rows.append((path, kind + "/" + slug, sid, title, prompt))

out = ["# Per Ankh — section banner queue (run after the 26 covers)\n",
       "Size 1000x667 (3:2), webp, same grade as the covers. One banner per content section, and the subject is the section's own subject, not a generic pyramid. No text in the image unless a verified count belongs to that section.\n",
       "| # | target path | page | section id | section title | prompt |", "|---|---|---|---|---|---|"]
for i, r in enumerate(rows, 1):
    out.append("| %d | %s | %s | %s | %s | %s |" % (i, r[0], r[1], r[2], r[3], r[4]))
out.append("\nTotal: %d section banners.\n" % len(rows))
open("/downloads/per-ankh-section-banners.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
print("section banners:", len(rows))
