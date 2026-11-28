# -*- coding: utf-8 -*-
"""مشغّل الاستماع لصفحات الأسرات: نفس مكوّن صفحات الملوك (CSS + JS) مع خرائط الأقسام."""
import json

CSS = """.pl{position:fixed;left:0;right:0;bottom:0;z-index:70;transform:translateY(110%);transition:transform .25s;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(11,9,7,.97);border-top:2px solid #e2b457;box-shadow:0 -8px 30px rgba(0,0,0,.6)}
.pl.on{transform:none}
.pl .in{max-width:760px;margin:auto;display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center}
.pl button{font:inherit;cursor:pointer;touch-action:manipulation;border:1px solid rgba(226,180,87,.6);background:transparent;color:#f3d68e;border-radius:999px;min-width:44px;min-height:44px;padding:0 12px;font-size:14px;font-weight:700;direction:ltr;unicode-bidi:isolate}
.pl .pp{width:52px;height:52px;background:#e2b457;color:#1b1306;border:0;display:grid;place-items:center;padding:0}.pl .pp svg{width:26px;height:26px}
.pl .mid{min-width:0}.pl .ttl{font-size:13px;color:#f4ead2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pl .ttl i{font-style:normal;color:#5fd0c4;font-size:11.5px;margin-inline-start:6px}
.pl input[type=range]{width:100%;direction:ltr;height:28px;margin:0;background:transparent;accent-color:#e2b457}
.pl .tm{display:flex;justify-content:space-between;direction:ltr;font-size:12px;color:#b9ab8e;font-variant-numeric:tabular-nums}
.pl .ex{display:flex;gap:6px;align-items:center;grid-column:1/-1;justify-content:center}
.pl .err{grid-column:1/-1;color:#e0674a;font-size:13px;margin:0}
.pbar{position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,#e2b457,#5fd0c4,#e0674a);z-index:60}
.lbtn{display:inline-flex;align-items:center;gap:10px;margin:4px 0 12px;padding:8px 18px;border-radius:999px;border:0;background:linear-gradient(180deg,#f3d68e,#d9a73d);color:#1b1306;font:inherit;font-weight:800;font-size:15.5px;cursor:pointer;min-height:44px;box-shadow:0 3px 0 #8a5a00;touch-action:manipulation}
.lbtn svg{width:20px;height:20px;flex:none}.lbtn small{font-weight:700;font-size:11.5px;color:#4a3410;opacity:.85}
.lbtn:focus-visible{outline:3px solid #0b6a96;outline-offset:3px}.lbtn.on{background:linear-gradient(180deg,#bfeee8,#5fd0c4);box-shadow:0 3px 0 #1d7f76}
body.pl-on .wrap{padding-bottom:130px}
@media(min-width:768px){.pl .in{grid-template-columns:auto 1fr auto}.pl .ex{grid-column:auto}}
@media(max-width:380px){.pl .ex .sp{display:none}}
@media(prefers-reduced-motion:reduce){.pl{transition:none}}
"""

HTML = """<div class="pbar" id="pbar"></div><div class="pl" id="pl" role="region" aria-label="مشغّل الاستماع"><div class="in"><button class="pp" id="pp" type="button" aria-label="تشغيل"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 001.5.86l12-7.5a1 1 0 000-1.72l-12-7.5A1 1 0 007 4.5z"/></svg></button><div class="mid"><div class="ttl"><span id="tt">استماع</span> <i>صوت اصطناعي</i></div><input id="sk" type="range" min="0" max="1000" value="0" aria-label="موضع التشغيل"><div class="tm"><span id="cur">0:00</span><span id="dur">0:00</span></div></div><div class="ex"><button id="bk" type="button" aria-label="رجوع 10 ثوانٍ">−10</button><button id="fw" type="button" aria-label="تقدم 10 ثوانٍ">+10</button><button id="sp" class="sp" type="button" aria-label="سرعة التشغيل">1×</button><button id="cl" type="button" aria-label="إغلاق المشغّل">✕</button></div><p class="err" id="er" role="alert" hidden>تعذر تحميل الملف الصوتي. حاول لاحقًا.</p></div><div aria-live="polite" id="st" style="position:absolute;left:-9999px"></div><audio id="au" preload="none"></audio></div>"""

PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 001.5.86l12-7.5a1 1 0 000-1.72l-12-7.5A1 1 0 007 4.5z"/></svg>'

JS = """(function(){
var S=__S__,$=function(i){return document.getElementById(i)},au=$("au"),pl=$("pl"),pp=$("pp"),sk=$("sk"),P="<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M7 4.5v15a1 1 0 001.5.86l12-7.5a1 1 0 000-1.72l-12-7.5A1 1 0 007 4.5z\"/></svg>",Q="<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\"><rect x=\"5.5\" y=\"4\" width=\"4.5\" height=\"16\" rx=\"1.2\"/><rect x=\"14\" y=\"4\" width=\"4.5\" height=\"16\" rx=\"1.2\"/></svg>",cur=null,part=1,seeking=false;
function fmt(t){if(!isFinite(t))return"0:00";var m=Math.floor(t/60),s=Math.floor(t%60);return m+":"+(s<10?"0":"")+s}
function btns(){document.querySelectorAll(".lbtn").forEach(function(b){var on=b.dataset.s===cur&&!au.paused;b.classList.toggle("on",on);b.querySelector("span").textContent=on?"إيقاف مؤقت":(b.dataset.s===cur&&au.currentTime>1?"أكمل الاستماع":"استمع لهذا القسم");b.querySelector("svg").outerHTML=on?Q:P})}
function ui(){var pa=au.paused;pp.innerHTML=pa?P:Q;pp.setAttribute("aria-label",pa?"تشغيل":"إيقاف مؤقت");btns()}
function show(){pl.classList.add("on");document.body.classList.add("pl-on")}
function load(id,n){cur=id;part=n;au.src=__BASE__+id+"-"+n+".mp3?v=r8";au.playbackRate=sp[si];$("tt").textContent=S[id][0]+(S[id][1]>1?" ("+n+"/"+S[id][1]+")":"");$("er").hidden=true;sk.value=0;$("cur").textContent="0:00";$("dur").textContent="0:00"}
function play(){var r=au.play();if(r&&r.catch)r.catch(function(){$("er").hidden=false})}
function start(id){show();if(cur===id){au.paused?play():au.pause();return}load(id,1);play()}
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest(".lbtn");if(b){e.preventDefault();start(b.dataset.s)}});
pp.addEventListener("click",function(){if(!cur)return;au.paused?play():au.pause()});
au.addEventListener("play",ui);au.addEventListener("pause",ui);
au.addEventListener("ended",function(){if(cur&&part<S[cur][1]){load(cur,part+1);play()}else{$("st").textContent="انتهى القسم";ui()}});
au.addEventListener("error",function(){if(au.src)$("er").hidden=false});au.addEventListener("loadedmetadata",function(){$("dur").textContent=fmt(au.duration)});
au.addEventListener("timeupdate",function(){if(!seeking&&au.duration)sk.value=Math.round(au.currentTime/au.duration*1000);$("cur").textContent=fmt(au.currentTime)});
sk.addEventListener("input",function(){seeking=true;if(au.duration)$("cur").textContent=fmt(sk.value/1000*au.duration)});
sk.addEventListener("change",function(){if(au.duration)au.currentTime=sk.value/1000*au.duration;seeking=false});
$("bk").addEventListener("click",function(){au.currentTime=Math.max(0,au.currentTime-10)});
$("fw").addEventListener("click",function(){au.currentTime=Math.min(au.duration||1e9,au.currentTime+10)});
var sp=[1,1.25,1.5,.85],si=0;$("sp").addEventListener("click",function(){si=(si+1)%sp.length;au.playbackRate=sp[si];this.textContent=sp[si]+"×"});
function closeP(){au.pause();pl.classList.remove("on");document.body.classList.remove("pl-on")}
$("cl").addEventListener("click",closeP);document.addEventListener("keydown",function(e){if(e.key==="Escape"&&pl.classList.contains("on"))closeP()});
var pb=$("pbar");function sc(){var d=document.documentElement,h=d.scrollHeight-d.clientHeight;pb.style.width=(h>0?d.scrollTop/h*100:0)+"%";0}
addEventListener("scroll",sc,{passive:true});sc();
})();"""


def listen_button(sid, title):
    return ('<button class="lbtn" type="button" data-s="%s" aria-label="استمع إلى %s">%s<span>استمع لهذا القسم</span><small>صوت اصطناعي</small></button>' % (sid, title, PLAY_SVG))


def player(sections, base):
    """sections: [(id, title, parts)] — base: مسار مجلد الصوت داخل الموقع."""
    s = {i: [t, n] for i, t, n in sections}
    js = JS.replace("__S__", json.dumps(s, ensure_ascii=False)).replace("__BASE__", json.dumps(base, ensure_ascii=False))
    return HTML + "<script>" + js + "</script>"
