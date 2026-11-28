#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""قشرة الموقع المشتركة: تُستخرج من صفحة نارمر (الصفحة المرجعية للتصميم)
حتى تخرج صفحات المواقع والعصور بالترويسة والقائمة والتذييل نفسها، بلا ترويسة مصغّرة خاصة."""
import os, re, html as H

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, "kings", "001-narmr", "index.html")

_s = open(REF, encoding="utf-8").read()
STYLES = "".join(re.findall(r"<style[^>]*>.*?</style>", _s, flags=re.S))
TOPBAR = _s[_s.index('<div class="pa-topline">'):_s.index('<main class="wrap">')]
_i = _s.index("<script>(function(){var K='perAnkhLanguage'")
_j = _s.index("</script>", _s.index("<script>(function(){function w(){", _i))
TAILSCRIPTS = _s[_i:_j + len("</script>")]


def crumb(items):
    """items: [(label, href or None)] من اليمين إلى اليسار."""
    out = []
    for i, (label, href) in enumerate(items):
        if i:
            out.append('<i aria-hidden="true">‹</i>')
        if href:
            out.append(f'<a href="{href}">{H.escape(label)}</a>')
        else:
            out.append(f'<span aria-current="page">{H.escape(label)}</span>')
    return ('<nav class="pa-crumb" id="paCrumb" aria-label="مسار الصفحة">'
            + "".join(out) + "</nav>")


def wrap_body(crumb_html, content):
    return ('<body>' + TOPBAR + '<main class="wrap">' + crumb_html + content
            + '</main>' + TAILSCRIPTS + '</body>')
