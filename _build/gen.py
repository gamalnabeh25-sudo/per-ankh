import re,json,sys,html,os
R=os.path.expanduser('~/per-ankh')
T=open(R+'/beliefs/maat/index.html',encoding='utf8').read()
a=T.index('<details class="acc k1"'); b=T.index('</article>')
head=T[:a]; tail=T[b:]
e=lambda s:html.escape(s,quote=False)
def inline(t):
    # **x** not used; escape plain text; allow <bdi>
    return e(t).replace('&lt;bdi dir=&quot;ltr&quot;&gt;','<bdi dir="ltr">').replace('&lt;/bdi&gt;','</bdi>')
PLAY='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 001.5.86l12-7.5a1 1 0 000-1.72l-12-7.5A1 1 0 007 4.5z"/></svg>'
BD={'v':'موثّق','d':'محل خلاف','u':'لم يُتحقق منه'}
def build(d):
    slug=d['slug']; pre=d.get('pre','x')
    secs=d['sections']; refs=d['refs']
    out=[]
    S={}
    for i,s in enumerate(secs,1):
        sid=f"{pre}{i}"; S[sid]=[s['title'],1]
        body=[]
        if d.get('audio',True):
            body.append(f'<button class="lbtn" type="button" data-s="{sid}" aria-label="استمع إلى قسم {e(s["title"])}">{PLAY}<span>استمع لهذا القسم</span><small>صوت اصطناعي</small></button>')
        for bl in s['blocks']:
            if 'h' in bl: body.append(f'<h3>{inline(bl["h"])}</h3>')
            if 'p' in bl:
                bd=f'<span class="bdg {bl["badge"]}">{BD[bl["badge"]]}</span> ' if bl.get('badge') else ''
                cites=''.join(f'<sup class="cn" title="{e(re.sub("<[^>]+>","",refs[c-1]["t"])[:90])}"><a href="#r{c}">[{c}]</a></sup>' for c in bl.get('cite',[]))
                body.append(f'<p class="pt">{bd}{inline(bl["p"])}{cites}</p>')
            if 'html' in bl: body.append(bl['html'])
        banner=s.get('banner') or d['banner']
        out.append(f'<details class="acc k{(i-1)%6+1}" id="{sid}"><summary><img class="bnr" src="{banner}" alt="" loading="lazy" width="1000" height="667"><span class="n">{i}</span><span class="t">{e(s["title"])}</span><span class="ch"></span></summary><div class="body pgb">{"".join(body)}</div></details>')
    n=len(secs)+1
    rl=''.join(f'<li id="r{i}">{r["t"]}{(" — <a href=%s rel=noopener target=_blank>%s</a>"%(chr(34)+r["u"]+chr(34),e(re.sub("^https?://","",r["u"])))) if r.get("u") else ""}</li>' for i,r in enumerate(refs,1))
    out.append(f'<details class="acc k{(n-1)%6+1}" id="{pre}{n}"><summary><img class="bnr" src="{d["banner"]}" alt="" loading="lazy" width="1000" height="667"><span class="n">{n}</span><span class="t">المراجع</span><span class="ch"></span></summary><div class="body pgb"><p class="src-note">هذه هي المراجع التي رجعنا إليها. لا نذكر مصدرًا لم نفتحه.</p><ol class="rl">{rl}</ol></div></details>')
    h=head
    h=re.sub(r'<title>.*?</title>',f'<title>{e(d["title"])} — بر عنخ</title>',h)
    h=re.sub(r'(<meta name="description" content=")[^"]*',r'\g<1>'+e(d['sub']),h)
    h=re.sub(r'(og:title" content=")[^"]*',r'\g<1>'+e(d['title']),h)
    h=re.sub(r'(og:description" content=")[^"]*',r'\g<1>'+e(d['sub']),h)
    h=re.sub(r'<span aria-current="page">[^<]*</span>',f'<span aria-current="page">{e(d["title"])}</span>',h)
    h=re.sub(r'<a href="/#religion-details" data-ar="الديانة المصرية" data-en="Egyptian religion">الديانة المصرية</a><i aria-hidden="true">‹</i>','',h)
    h=re.sub(r'<h1>[^<]*</h1><p class="sub">[^<]*</p>',f'<h1>{e(d["title"])}</h1><p class="sub">{e(d["sub"])}</p>',h)
    h=re.sub(r'<div class="hero-img"><img src="[^"]*" alt="[^"]*" width="600" height="800"',f'<div class="hero-img"><img src="{d["hero"]}" alt="{e(d["title"])}" width="600" height="800"',h)
    h=h.replace('</head>','<style id="pa-cap">.acc>summary{position:relative;display:block}.acc>summary .bnr{display:block;width:100%;height:auto}.acc>summary .t,.acc>summary .n{position:absolute!important;clip:auto!important;overflow:visible!important;white-space:normal!important;height:auto!important}.acc>summary .t{width:auto!important;right:6%;left:6%;bottom:7%;text-align:center;font-size:clamp(17px,3.4vw,34px);font-weight:800;line-height:1.4;color:#fff3d0;text-shadow:0 2px 10px #000,0 0 3px #000;padding:10px 14px;border-radius:12px;background:linear-gradient(180deg,rgba(5,12,24,.0),rgba(5,12,24,.78))}.acc>summary .n{width:clamp(30px,5vw,48px)!important;height:clamp(30px,5vw,48px)!important;top:7%;right:5%;font-size:clamp(15px,2.6vw,24px)!important;z-index:2}.acc>summary .ch{position:absolute;left:5%;top:7%}.hero h1{position:static!important;width:auto!important;height:auto!important;clip:auto!important;overflow:visible!important;white-space:normal!important;font-size:clamp(44px,12vw,84px)!important;line-height:1.25!important;margin:6px 0 10px!important;background:linear-gradient(180deg,#fff0c4,#e0bd73 60%,#b88a3a)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;color:transparent!important;filter:drop-shadow(0 3px 6px #000);text-align:center}</style>'+'</head>',1)
    t=tail
    t=re.sub(r'var S=\{[^}]*\}',lambda m:'var S='+json.dumps(S,ensure_ascii=False),t,count=1)
    t=t.replace('/beliefs/maat/audio/',f'/{slug}/audio/')
    t=re.sub(r'<aside class="abt".*?</aside>',d.get('about','<aside class="abt" aria-label="عن هذه الصفحة"><h3>عن هذه الصفحة</h3><ul><li><b>المحتوى</b><span>جزء من موسوعة بر عنخ. كل رأي منسوب لصاحبه، وما لم نتحقق منه موسوم بذلك.</span></li><li><b>الصور</b><span>زخارف الأقسام مولّدة بالذكاء الاصطناعي، وهي تفسير فني وليست نسخًا من أثر بعينه.</span></li></ul></aside>'),t,flags=re.S)
    pg=h+''.join(out)+t
    os.makedirs(f'{R}/{slug}',exist_ok=True)
    open(f'{R}/{slug}/index.html','w',encoding='utf8').write(pg)
    print(slug,len(pg),len(secs))
if __name__=='__main__':
    for f in sys.argv[1:]: build(json.load(open(f,encoding='utf8')))
