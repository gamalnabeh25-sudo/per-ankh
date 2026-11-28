import json,re,csv,os,glob
R=os.path.expanduser('~/per-ankh')
dirs={}
for sec in ['kings','sites','eras','beliefs']:
    for p in os.listdir(f'{R}/{sec}'):
        if os.path.isdir(f'{R}/{sec}/{p}'): dirs.setdefault(p,f'/{sec}/{p}/')
NEWSITES={'18-edfu-horus':'معبد إدفو','19-alramsyum':'الرامسيوم','20-kom-ombo':'معبد كوم أمبو','21-dendera':'معبد دندرة','22-tl-bsta':'تل بسطة','23-mnf':'منف','24-alaskndryh':'الإسكندرية','25-dyr-almdynh':'دير المدينة','26-wady-almlkat':'وادي الملكات','27-alfywm-allahwn':'الفيوم واللاهون','28-tmthala-mmnwn':'تمثالا ممنون','29-awaris-tl-aldbaa':'أواريس تل الضبعة','30-siwa':'سيوة','31-alwahat-albahria':'الواحات البحرية','32-alkharga-hibis':'الخارجة ومعبد هيبس','33-ilfantin':'إلفنتين'}
def hl(slug,sec=None):
    if slug in dirs: return dirs[slug]
    if slug in NEWSITES: return f'/sites/{slug}/'
    return f'/{sec or "kings"}/{slug}/'
def card_dir(c):
    for p,h in dirs.items():
        if h.startswith('/kings/') and p.startswith('%03d-'%c): return h
    return None
items=[]  # t,u,pages[(href,label)],hints
def add(t,u,pages,k=None,f=None):
    items.append({'t':t,'u':u,'pages':pages,'k':k,'for':f})
# local
for i in json.load(open('/tmp/refs_raw.json')):
    add(i['t'],i['u'],[('/'+i['page']+'/',None)])
# kings 39fb
d=json.load(open('/downloads/kings-references-39fb8a6f.json'))
for s in d['sources']:
    if 'Wikimedia' in s['source'] or not s['source']: continue
    add(s['source'],(s['urls'] or [None])[0],[(hl(p,'kings'),None) for p in s['used_in_pages']])
# sites 18-22
d=json.load(open('/downloads/sites-references-b72683c3.json'))
for s in d['sources']:
    t=(s['author']+'، ' if s.get('author') else '')+s['title']
    add(t,(s.get('url') or '').split(' ; ')[0] or None,[(hl(p,'sites'),None) for p in s.get('pages_using',[])])
# museum atlas
d=json.load(open('/downloads/museum-atlas-references-2f945802.json'))
for s in d['references']:
    t=s['author']+'، '+s['title']
    if 'non-scholarly' in s['type']: t+=' (مصدر غير أكاديمي، والمعلومة المأخوذة منه مُعلَّمة لم يُتحقق منه)'
    u=s['url']; u=u.replace('?id=<id>','') ; 
    if u and not u.startswith('http'): u='https://'+u
    add(t,u,[(None,x.split(' (')[0]) for x in s['used_in']])
# kings-all
d=json.load(open('/downloads/references-all-7ebfd7c3.json'))
for s in d['references']:
    pg=[]
    for u in s['uses']:
        pg.append((card_dir(u['card']),u['king']))
    add(s['work'],s['url'],pg)
# features
d=json.load(open('/downloads/per-ankh-features-references-aee60db2.json'))
for s in d['external_sources']:
    ti=s['title']; ti='صفحة بالرابط المذكور' if 'not fetched' in ti else ti
    add(s['organization']+': '+ti,s['url'],[(None,'اختبر نفسك (بنك الأسئلة)')])
# csv
for r in csv.DictReader(open('/downloads/per-ankh-references-6de6edad.csv',encoding='utf8')):
    if 'ويكي' in r['type'] or 'wiki' in r['url'].lower(): continue
    pg=[]
    for p in [x.strip() for x in r['pages_using'].split(';') if x.strip()]:
        p=re.sub(r'/?index\.html$','',p)
        pg.append(('/'+p+'/',None) if p else ('/', 'الصفحة الرئيسية'))
    t=(r['author']+'، ' if r['author'] else '')+r['title']
    ty=r['type']; k=None
    if 'متحف' in ty: k='museum'
    elif 'كتاب' in ty: k='book'
    elif 'صحافة' in ty or 'بحث' in ty or 'موسوعة' in ty: k='article'
    lg=r['language']; f=True if re.search('إنج|إنك|أجنبي|فرنس|ألمان|foreign',lg) else (False if 'عرب' in lg else None)
    add(t,r['url'].split(' ; ')[0],pg,k,f)
# sites/eras md
md=open('/downloads/per-ankh-references-sites-eras-e6d29aba.md',encoding='utf8').read()
for m in re.finditer(r'^- (\S+) — `([^`]+)` — (.*)$',md,re.M):
    slug,u,t=m.groups(); t=re.sub(r':? ?نسخة الكتاب على archive.org$','',t).strip()
    add(t,u,[(hl(slug,'sites'),None)])
# primary sources md
md2=open('/downloads/sources-refs-67847299.md',encoding='utf8').read()
cur=None
for ln in md2.split('\n'):
    h=re.match(r'^## .*\((/[^)]+/)\)',ln)
    if h: cur=h.group(1); continue
    m=re.match(r'^\d+\. (.*)$',ln)
    if m and cur:
        t=re.sub(r'\s*\(تاريخ الاطلاع[^)]*\)\s*$','',m.group(1))
        mu=re.search(r'—\s*((?:https?://)?[\w.-]+\.[a-z]{2,}(?:/\S*)?)\s*$',t)
        u=None
        if mu:
            u=mu.group(1); t=t[:mu.start()].strip()
            if not u.startswith('http'): u='https://'+u
        add(t,u,[(cur,None)])
# dynasties md
md3=open('/downloads/per-ankh-references-dynasties-48a26561.md',encoding='utf8').read()
for blk in re.split(r'\n### ',md3.split('## تفصيل كل صفحة')[1].split('## ما زال ينقص')[0])[1:]:
    pm=re.search(r'المسار: `([^`]+)`',blk)
    if not pm: continue
    for m in re.finditer(r'^  - (.+?) — (https?://\S+) — في \d+',blk,re.M):
        add(m.group(1).strip(),m.group(2),[(pm.group(1),None)])
json.dump(items,open('/tmp/items.json','w'),ensure_ascii=False)
print(len(items))
