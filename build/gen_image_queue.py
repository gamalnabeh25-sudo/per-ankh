import re, os, glob, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SITE_PROMPT = {
    "01-hdbh-algyzh": "the Great Pyramid of Khufu and the Sphinx on the Giza plateau, limestone casing at the apex, desert sand foreground",
    "02-sqarh": "the Step Pyramid of Djoser at Saqqara with its colonnaded court, six tiers of stone, sand and rubble foreground",
    "03-dhshwr": "the Bent Pyramid of Sneferu at Dahshur, its lower courses in smooth casing, wide desert plain",
    "04-abw-syr": "the pyramid of Sahure at Abusir with its palm-lined approach and the low sun temples of Abu Ghurab behind",
    "05-mydwm": "the tower-like pyramid of Meidum rising as a three-stepped core out of drifted sand",
    "06-abydws": "the temple of Seti I at Abydos, first pylon and columned hall, low warm light on the reliefs",
    "07-bny-hsn": "the rock-cut tomb facades of Beni Hasan above the Nile, two columned porticos cut into the cliff",
    "08-tybh-alaqsr": "the Luxor temple colonnade at Thebes with a single obelisk and papyrus-bundle columns",
    "09-alkrnk": "the hypostyle hall of Karnak, forest of carved sandstone columns with open papyrus capitals",
    "10-aldyr-albhry": "the terraced temple of Hatshepsut at Deir el-Bahari, colonnades stacked against the sheer cliff",
    "11-wady-almlwk": "the rock-cut entrance of a royal tomb in the Valley of the Kings, dry limestone walls, no people",
    "12-tl-alamarnh": "the desert cliffs and rock tombs of Tell el-Amarna on the east bank, wide empty plain",
    "13-abw-smbl": "the rock-cut facade of Abu Simbel with its four seated colossi, Lake Nasser water in front",
    "14-mdynh-habw": "the fortified migdol gate of Medinet Habu, massive stone towers and reliefs of Ramesses III",
    "15-tanys": "the fallen obelisks and granite blocks of Tanis at San el-Hagar, flat Delta farmland behind",
    "16-fylh": "the temple of Isis on Philae island, kiosk columns at the water's edge, granite boulders",
    "17-tl-qwsna": "an excavated tell at Tell Quesna in the Delta, mud-brick tomb chambers cut into the ground, open trench",
}

ERA_PROMPT = {
    "01": "Predynastic Egypt: a Naqada-period decorated pottery vessel and flint knife on sand, desert edge behind",
    "02": "Early Dynastic Egypt: the mud-brick mastaba fields of Saqqara with the Step Pyramid far behind, first hieroglyphs on stone",
    "03": "Old Kingdom Egypt: the Giza pyramids under a deep sky, limestone casing and workers' ramp traces",
    "04": "First Intermediate Period: a weathered provincial mud-brick tomb chapel in Middle Egypt, dry fields",
    "05": "Middle Kingdom Egypt: the Bent Pyramid and the pyramid of Amenemhat III at Dahshur in flat desert light",
    "06": "Second Intermediate Period: Hyksos-era mud-brick fortification walls at Tell el-Dab'a in the Delta",
    "07": "New Kingdom Egypt: the colonnades of Karnak and Luxor at golden hour, obelisks and painted relief",
    "08": "Third Intermediate Period: the temple precinct of Tanis with reused granite blocks and obelisk fragments",
    "09": "Late Period Egypt: the temple of Philae and the granite quays of Aswan, Ptolemaic columns",
}

out = ["# Per Ankh — image generation queue (covers first, then section banners)\n",
       "Run only after the parent's go-ahead and within the allotted number. Every cover is 900x1200 portrait webp, framed like Narmer's cover: one subject centred, low horizon, dark warm grade, breathing room top and bottom. No text inside the image; page titles are HTML.\n",
       "## 1. Covers — 26 (priority)\n",
       "| # | page | Arabic title | target path | prompt |", "|---|---|---|---|---|"]
n = 0
rows = []
for kind in ("sites", "eras"):
    for f in sorted(glob.glob(os.path.join(ROOT, kind, "*", "index.html"))):
        s = open(f, encoding="utf-8").read()
        slug = f.split("/")[-2]
        m = re.search(r'<div class="ctext">\s*<h1>(.*?)</h1>', s, flags=re.S)
        title = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else slug
        n += 1
        if kind == "sites":
            path = "assets/sites/%s.webp" % slug
            subject = SITE_PROMPT.get(slug, title)
        else:
            num = slug.split("-")[0]
            path = "assets/eras/era%s.webp" % num
            subject = ERA_PROMPT.get(num, title)
        count = ""
        if kind == "eras":
            nk = len(re.findall(r'<td><a href="/kings/', s))
            ns = len(set(re.findall(r'<a href="/sites/([a-z0-9\-]+)/"', s)))
            bits = []
            if nk:
                bits.append("%d ملكًا" % nk)
            if ns:
                bits.append("%d مواقع" % ns)
            count = " · ".join(bits)
        prompt = ("vertical portrait photograph 900x1200 of %s. %s. Warm low sun, deep blue to amber sky, clean foreground, "
                  "no people, no watermark, archaeological documentary photography, high detail" % (title, subject))
        if count:
            prompt += (' The only text baked into the image is the count "%s", small gold Arabic type in the lower third.' % count)
        rows.append("| %d | %s/%s | %s | %s | %s |" % (n, kind, slug, title, path, prompt))
out += rows
out.append("\nCounts rule: a count is baked into the image itself, never printed as text under a cover or in a card. Era covers carry the verified number of kings with pages and related sites; if that number changes, the image is regenerated.\n")
out.append("\n## 2. Section banners — 99 (after the covers)\n")
out.append("Size 1000x667 (3:2), webp, same grade as the covers. Each banner shows a specific archaeological subject named in that section, never a generic pyramid. Target path: `assets/sections/<page-slug>-<section-id>.webp`. The full per-page section list is in /downloads/per-ankh-image-gaps.md.\n")
open("/downloads/per-ankh-image-queue.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
print("queue written:", len(rows), "covers")
