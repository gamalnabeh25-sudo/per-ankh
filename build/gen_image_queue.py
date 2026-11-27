import re, os, glob, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = ["# Per Ankh — image generation queue (covers first, then section banners)\n",
       "Run only after the parent's go-ahead and within the allotted number. Every cover: 900x1200 portrait, webp, same framing as Narmer's cover (single subject centered, low horizon, dark warm grade, space at top and bottom for the title). No text in the image — titles are HTML.\n",
       "## 1. Covers — 26 (priority)\n",
       "| # | page | Arabic title | target path | prompt |", "|---|---|---|---|---|"]
n = 0
covers = []
for kind in ("sites", "eras"):
    for f in sorted(glob.glob(os.path.join(ROOT, kind, "*", "index.html"))):
        s = open(f, encoding="utf-8").read()
        slug = f.split("/")[-2]
        m = re.search(r'<div class="ctext">\s*<h1>(.*?)</h1>', s, flags=re.S)
        title = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else slug
        en = re.search(r'<p class="sub">(.*?)</p>', s, flags=re.S)
        sub = html.unescape(re.sub(r"<[^>]+>", "", en.group(1))).strip() if en else ""
        n += 1
        path = f"assets/{kind}/{slug}.webp" if kind == "sites" else f"assets/eras/{slug.split('-')[0]}.webp"
        if kind == "sites":
            path = f"assets/sites/{slug}.webp"
        else:
            path = f"assets/eras/era{slug.split('-')[0]}.webp"
        prompt = (f"vertical portrait photograph, 900x1200, of {title} in Egypt: the site's defining monument as the single centred subject, "
                  f"warm low sun, deep blue-to-amber sky, clean foreground, no people, no text, no watermark, archaeological documentary style")
        covers.append((n, f"{kind}/{slug}", title, path, prompt))
for c in covers:
    out.append("| %d | %s | %s | %s | %s |" % c)

out.append("\n## 2. Section banners — 99 (after the covers)\n")
out.append("Size 1000x667 (3:2), webp, same grade as the covers, each one a specific archaeological subject from that section, never a generic pyramid. Target path: `assets/sections/<page-slug>-<section-id>.webp`. Full section list with titles is in /downloads/per-ankh-image-gaps.md.\n")

open("/downloads/per-ankh-image-queue.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
print("queue written:", len(covers), "covers")
