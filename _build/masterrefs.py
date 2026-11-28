import json,re,glob,html,os
from urllib.parse import urlparse
R=os.path.expanduser('~/per-ankh')
raw=json.load(open('/tmp/items.json'))
# page titles
titles={}
for f in glob.glob(R+'/**/index.html',recursive=True):
    rel=os.path.relpath(f,R)
    if rel.startswith(('_build','supabase')): continue
    m=re.search(r'<h1[^>]*>(.*?)</h1>',open(f,encoding='utf8').read(),re.S)
    titles['/'+os.path.dirname(rel)+'/']=re.sub(r'<[^>]+>','',m.group(1)).strip() if m else rel
import re as _r
for _m in _r.finditer(r'^## (.*?)\s*\((/[^)]+/)\)',open('/downloads/sources-refs-67847299.md',encoding='utf8').read(),_r.M): titles[_m.group(2)]=_m.group(1).strip()
titles.update({'/sites/'+k+'/':v for k,v in {'18-edfu-horus':'معبد إدفو','19-alramsyum':'الرامسيوم','20-kom-ombo':'معبد كوم أمبو','21-dendera':'معبد دندرة','22-tl-bsta':'تل بسطة','23-mnf':'منف','24-alaskndryh':'الإسكندرية','25-dyr-almdynh':'دير المدينة','26-wady-almlkat':'وادي الملكات','27-alfywm-allahwn':'الفيوم واللاهون','28-tmthala-mmnwn':'تمثالا ممنون','29-awaris-tl-aldbaa':'أواريس تل الضبعة','30-siwa':'سيوة','31-alwahat-albahria':'الواحات البحرية','32-alkharga-hibis':'الخارجة ومعبد هيبس','33-ilfantin':'إلفنتين'}.items()})
BAN=re.compile(r'(?:[بلوف]?ال)?(?:فرعون\w*|فراعن\w*|فرعوني\w*)')
def scrub(s): return BAN.sub('[ملوك مصر القديمة]',s)
def norm(t):
    t=re.sub(r'^م\d+:\s*','',t); return t
CANON=[(r'Gods of the Egyptians.*vol\.? ?1|Gods of the Egyptians, vol\. 1','budge-gods1'),(r'Gods of the Egyptians.*vol\.? ?2','budge-gods2'),(r'Legends of the Gods','budge-legends'),(r'Handbook of Egyptian Religion','erman'),(r'Development of Religion','breasted'),(r'Amun und','sethe'),(r'Egyptian Heaven and Hell','budge-hh'),(r'De Iside|بلوتار','plutarch'),(r'Documents.*Oriental Institute|وثائق كتاب الموتى|Book of the Dead: Documents','allen-oip'),(r'خريطة كتاب الأمدوات','amduat-map'),(r'ديمقراطية الآخرة','smith-dem'),(r'عيد أوبت','darnell-opet'),(r'الحكم بعد الموت|Judgement after Death','stadler-judg'),(r'أوزير والمتوفى|Osiris and the Deceased','smith-osiris'),(r'الطقس اليومي','dk-ritual'),(r'المراسم اليومية','ucl-ritual'),(r'هرموبوليس','corbinian'),(r'نظرية الخلق|Cosmogony','mcclain'),(r'هورنونج.*الأمدوات|الأمدوات.*هورنونج','hornung-amd'),(r'الديانة المصرية القديمة|Ancient Egyptian religion','brit-religion'),(r'شباكا','shabaka'),(r'معبد آمون رع|Commins|كامنز','smarthistory-karnak'),(r'أوزير','brit-osiris-kids'),(r'نور الدين، آثار وحضارة','nur1'),(r'سليم حسن.*الجزء الأول','sh1'),(r'سليم حسن.*الجزء الثاني','sh2'),(r'فخري.*الأهرام','fakhry'),(r'الشرق الأدنى القديم','saleh-neareast'),(r'الأهرامات كانت مقابر','ab-article'),(r'Ahmed Fakhry','fakhry')]
D={}
for i in raw:
    t=norm(i['t']).replace('فتح المصدر','').strip(' :')
    if len(t)<28 or re.match(r'^(كلاهما|أبو زيد، المجلة نفسها|مصدر الصور)',t): continue
    k=None
    for p,kk in CANON:
        if re.search(p,t[:140]) and not (kk in('brit-osiris-kids',) and 'بريتانيكا' not in t and 'Britannica' not in t) and not (kk=='hornung-amd' and 'خريطة' in t) : k=kk;break
    if k is None: k=i['u'] or re.sub(r'[\W_]+','',t)[:45]
    e=D.setdefault(k,{'t':t,'u':i['u'],'pages':set(),'kh':None,'fh':None})
    if len(t)>len(e['t']) or (i['u'] and not e['u']): 
        e['t']=t; e['u']=i['u'] or e['u']
    for h,l in i['pages']: e['pages'].add((h,l))
    e['kh']=e['kh'] or i.get('k'); 
    if e['fh'] is None: e['fh']=i.get('for')
# merge same URL
U={}
for k,e in list(D.items()):
    if e['u'] and e['u'] in U:
        o=U[e['u']]; o['pages']|=e['pages']; o['kh']=o['kh'] or e['kh']; 
        if o['fh'] is None: o['fh']=e['fh']
        if len(e['t'])>len(o['t']): o['t']=e['t']
        del D[k]
    elif e['u']: U[e['u']]=e
FOR_DOM=('britannica','escholarship','ucl.ac.uk','penn.museum','nature.com','harvard','smithsonian','reuters','bbc.com','abc.net','archaeology.org','biblicalarchaeology','ancient-egypt.org','monash','academia.edu','smarthistory','worldhistory','ebsco','ashmolean','hierakonpolis','muzarp','nefershapiland','rom.on.ca','globalegyptianmuseum','dainst','munzinger','prabook','claremont','bnf.fr','aeraweb','digitalkarnak','metmuseum','egyptianmuseum.org','lockwood','britishmuseum','perseus','english.ahram','aucegypt','wmf.org','sis.gov.eg/en')
FOR_KW=('بريتانيكا','Britannica','كاليفورنيا','كلية لندن','جامعة لندن','المتحف البريطاني','المتروبوليتان','بروكلين','معهد شيكاغو','سمارت','كرنك الرقمي','روزيكروشان','هيرودوت','بلوتارك','بلوتارخ','برستد','بدج','إيرمان','جاردنر','ويلكنسون','فرانكفورت','شتادلر','سميث','هورنونج','هارينغ','دارنل','لبسيوس','سيثه','كوربينيان','تيتر','مكلين','ألن','ليشتنبرج','Wallis','Breasted','Erman','Petrie','Frankfort','Plutarch','Kurt Sethe','أكرام','سليمة عكرام','لازاريديس','هيغو','هيس','Nature','المتحف المصري العالمي','Global Egyptian Museum')
def isfor(e):
    t=e['t']; u=e['u'] or ''
    h=t.split('،')[0].split(':')[0]
    if any(d in u for d in FOR_DOM): return True
    if re.search(r'[A-Za-z]{4,}.*[A-Za-z]{4,}',re.sub(r'\(.*?\)','',h)): return True
    if any(k in t[:70] for k in FOR_KW): return True
    return False
NEWS=('بوابة الأهرام','المصري اليوم','اليوم السابع','الوطن','الجزيرة','Ahram','Reuters','BBC','ABC','الأقباط','البوابة نيوز','نيوزروم','البورصة','إيلاف','كايرو 24','الفجر','Smithsonian','National Geographic','Archaeology Magazine','نور بوك','دار المنظومة','الأهرام (الحضارة)','نفين','الأهرام ويكلي','جريدة','Nekhen','الجزيرة نت','مجلة','Britannica','بريتانيكا','Encyclopaedia','موسوعة جامعة','UCLA','Coptic Encyclopedia','Nature','Morishima','Levy','Eras','Smarthistory','World History','EBSCO','The Ancient Egypt Site','David O','Biblical','Expedition','Abydos','رسالة','حسين عبد البصير،','مصطفى وزيري،','زاهي حواس، «','زاهي حواس، لقاء','زاهي حواس، ردًا','أبو زيد','الشيماء','«بوابات','مسعود','نجيب ميخائيل','سليمان سالي','عبد العزيز صالح، «','وليد','مارك','مارتن','Martin','Mark','Harold','J. Berton','Jochen','سليمة','نيكولاس','بريت','جون','توكيهيسا','بن هارينغ','إليزابيث','كوربينيان','Ahram Online','ريتشارد ويلكنسون') 
BOOKS=('سليم حسن','عبد الحليم نور الدين، آثار','عبد العزيز صالح، الشرق','أحمد فخري','محمد بيومي','عبد الرحمن الرافعي','خزعل','زاهي حواس، 100','روجيه','Budge','E.A.','E. A.','James Henry','J. H.','Adolf','Petrie','W. M. F.','Kurt','Ramadan','Henri','Plutarch','Thomas George','جيمس ألن','كارل','ويلكنسون','إيرك تيتر','هيرودوت','توماس جورج','آلن جاردنر','عبد الحليم وعطية الله','بلوتار','إيريك هورنونج')
MUS=('متحف','المتحف','The Global Egyptian','ROM','Ashmolean','بردية')
INST=('وزارة','محافظة','هيئة','المجلس','مجمع','اليونسكو','DAI','AERA','المعهد','مكتبة','مؤسسة','الجامعة','فهرس','UCL','جامعة','كرنك','Prabook','Munzinger','المكتبة','حكاية','محمد بيومي مهران:','كتيب','موقع','معهد')
def kind(e):
    t=re.split(r' — |: (?:www|http|[a-z]+\.[a-z])',e['t'])[0].strip()
    if re.match(r'^(بوابة الأهرام|الأهرام|اليوم السابع|المصري اليوم|الوطن)',t) : return 'article'
    if any(t.startswith(x) for x in MUS) and 'يحتفل' not in t: return 'museum'
    if re.match(r'^(UCL Digital|جامعة لندن|كرنك الرقمي|Mark Smith|Martin)',t) and 'Digital' in t and not 'Stadler' in t: return 'inst'
    if t.startswith('محمد بيومي مهران:'): return 'inst'
    if any(t.startswith(x) for x in BOOKS): return 'book'
    if any(t.startswith(x) for x in NEWS) or any(x in t[:25] for x in ('Britannica','بريتانيكا','موسوعة جامعة','UCLA')): return 'article'
    if any(t.startswith(x) for x in INST): return 'inst'
    return 'article'
for e in D.values():
    e['t']=scrub(e['t']); e['for']=e['fh'] if e['fh'] is not None else isfor(e); e['k']=e['kh'] or kind(e)
KN={'book':'كتب','inst':'مؤسسات ووزارات وجامعات ومواقع رسمية','article':'مقالات وأبحاث وصحف ومواد موسوعية','museum':'سجلات المتاحف والمجموعات'}
def CL(t): return re.sub(r'[:\s—-]+(?:https?://)?[\w.-]+\.(?:org|com|gov\.eg|net|eg|uk|de|ae|info|news|edu|ca|pl|au|fr)(?:/\S*)?\s*$','',t).strip()
def li(e):
    pg=sorted(e['pages'],key=lambda x:(x[0] or 'z',x[1] or ''))
    def lk(h,l):
        name=l or titles.get(h) or (h or '').strip('/').split('/')[-1]
        name=scrub(html.escape(name))
        return f'<a href="{h}">{name}</a>' if h else name
    links=' · '.join(lk(h,l) for h,l in pg)
    disp_u=re.sub('^https?://(www[.])?','',e['u'] or '')[:60]
    u=(' — <a href="%s" rel="noopener" target="_blank">%s</a>'%(e['u'],html.escape(disp_u))) if e['u'] else ''
    return f'<li>{html.escape(CL(e["t"]))}{u}<br><small>تُستخدم في: {links}</small></li>'
def blocks(forn):
    b=[]; cnt={}
    for k in ['book','inst','article','museum']:
        L=[e for e in D.values() if e['for']==forn and e['k']==k]
        L.sort(key=lambda e:e['t'])
        cnt[k]=len(L)
        if not L: continue
        b.append({'h':KN[k]})
        b.append({'html':'<ol class="rl">'+''.join(li(e) for e in L)+'</ol>'})
    return b,cnt
ar,ca=blocks(False); fo,cf=blocks(True)
# disputes
FAV=re.compile(r'(يرجّح|يرجح|ترجيح|الترجيح|الأرجح|الراجح|يفضّل|يفضل|يميل إلى|الأقرب|رجّح|رجح|الأكثر قبولًا)')
REJ=re.compile(r'(يردّ|يرد على|يرفض|يستبعد|يعارض|يدحض|ينفي|يعترض|يخطّئ|يخطئ)')
def stance(x):
    sents=[z.strip() for z in re.split(r'(?<=[.؟!])\s+',x) if z.strip()]
    for z in sents:
        if FAV.search(z): return 'الترجيح كما ورد في النص: '+z
    for z in sents:
        if REJ.search(z): return 'اعتراض صاحب المصدر على الرأي المقابل كما ورد في النص: '+z
    return 'لا يوجد في النص ترجيح صريح من أي مصدر، والمسألة كما عُرضت أعلاه دون حسم.'
G={}  # href -> list of (text)
def put(h,x): G.setdefault(h,[]).append(scrub(x.strip()))
ka=json.load(open('/downloads/references-all-7ebfd7c3.json'))
cards={d['card'] for d in ka['disputes']}
def card_h(c):
    for p,h in [(os.path.basename(os.path.dirname(f)),'/kings/'+os.path.basename(os.path.dirname(f))+'/') for f in glob.glob(R+'/kings/*/index.html')]:
        if p.startswith('%03d-'%c): return h
covered={card_h(c) for c in cards}
for f in sorted(glob.glob(R+'/**/index.html',recursive=True)):
    rel=os.path.relpath(f,R)
    if rel.startswith(('_build','supabase','references')): continue
    h='/'+os.path.dirname(rel)+'/'
    if h in covered: continue
    t=open(f,encoding='utf8').read()
    for m in re.finditer(r'<span class="bdg d">[^<]*</span>(.*?)(?:</p>|</li>|</div>)',t,re.S):
        x=html.unescape(re.sub(r'<sup.*?</sup>','',m.group(1),flags=re.S)); x=re.sub(r'<[^>]+>','',x).strip()
        if len(x)>20 and not x.startswith('الصفحة نفسها تذكر'): put(h,x)
for d in ka['disputes']:
    h=card_h(d['card']) or '/kings/%03d/'%d['card']
    x=d['summary_who_said_what']
    if d.get('section'): x=d['section']+': '+x
    if d.get('sources'): x+=' المصادر: '+'؛ '.join(d['sources'])+'.'
    put(h,x)
kf=json.load(open('/downloads/per-ankh-features-references-66249272.json'))
for d in kf['disputes']:
    vs='؛ '.join(f'{k}: {v}' for k,v in d['favors'].items()) if isinstance(d['favors'],dict) else str(d['favors'])
    put('QUIZ','موضوع: '+d['topic']+'. الآراء ومن يقول بها: '+vs+'. ورد في: '+d['used_in']+'.')
put('MUS','تاريخ كشف تمثال كا عبر: تذكر مصادر سنة 1870 وتذكر مصادر أخرى سنة 1860، والبطاقة لا تنسب الرأيين إلى عالم باسمه ولا تحسم بينهما.')
for m in re.finditer(r'^- \*\*([^*]+)\*\*(.*)$',open('/downloads/per-ankh-references-sites-eras-e6d29aba.md',encoding='utf8').read(),re.M):
    if 'king 074' in m.group(1): continue
    put('SITES',m.group(1).strip(' :')+': '+m.group(2).strip())
sv=json.load(open('/downloads/sites-references-b72683c3.json'))
for d in sv['disputes']:
    h='/sites/%s/'%d['page']
    x='موضوع: '+d['topic']+'. الآراء: '+'؛ '.join(f'{k}: {v}' for k,v in d['positions'].items())+'. نقلها: '+d.get('reported_by','')+'.'+(' ملاحظة: '+d['note'] if d.get('note') else '')
    put(h,x)
import csv
for r in csv.DictReader(open('/downloads/per-ankh-references-6de6edad.csv',encoding='utf8')):
    if r['disputes_notes'] and 'خلاف' in r['disputes_notes']: put('CSV',r['title'][:80]+': '+r['disputes_notes'])
HEAD={'QUIZ':'اختبر نفسك (بنك الأسئلة)','MUS':'المتحف الافتراضي','SITES':'المواقع الأثرية والعصور','CSV':'العقيدة والمعبودات: ملاحظات المراجع'}
db=[{'p':'هذه كل المواضع التي ذكرت فيها صفحات الموقع أن الباحثين أو المصادر مختلفون، مجمّعة من الصفحات نفسها. نذكر من يقول ماذا. وتحت كل موضع سطر يبيّن الترجيح: إن كان صاحب المصدر يرجّح رأيًا ويذكر سببه نقلنا ذلك السطر كما ورد وهو منسوب إليه، وإلا قلنا إنه لا يوجد في النص ترجيح صريح. والموقع نفسه لا يحكم بين الآراء.'}]
tot=0
def order(h): 
    return (0 if h.startswith('/kings') else 1 if h.startswith('/sites') else 2 if h.startswith('/eras') else 3 if h.startswith('/beliefs') else 4, h)
for h in sorted(G,key=order):
    ps=G[h]; nm=HEAD.get(h) or titles.get(h) or h.strip('/').split('/')[-1]
    inner=''
    if h.startswith('/'): inner+=f'<p class="pt"><a href="{h}">فتح الصفحة</a></p>'
    for x in ps:
        inner+=f'<p class="pt"><span class="bdg d">محل خلاف</span> {html.escape(x)}</p><p class="pt"><small>{html.escape(stance(x))}</small></p>'; tot+=1
    db.append({'html':f'<details class="dg" style="margin:8px 0;border:1px solid rgba(176,120,20,.35);border-radius:10px"><summary style="cursor:pointer;padding:10px 14px;font-weight:700">{html.escape(nm)}</summary><div style="padding:0 14px 10px">{inner}</div></details>'})
disp=list(G)
KDATA=json.load(open('/tmp/data.json'))
ERA={k['name']:k['era'] for k in KDATA['kings']}
CAT=[]
for e in D.values():
    tp=set(); pr=set()
    for h,l in e['pages']:
        h=h or ''
        sec=h.strip('/').split('/')[0] if h else ''
        tp.add({'kings':'الملوك','sites':'المواقع','eras':'العصور','beliefs':'الديانة','architecture':'العمارة والفنون','daily-life':'الحياة اليومية','library':'المكتبة','references':'المراجع'}.get(sec, l or 'أخرى') if sec else (l or 'أخرى'))
        if sec=='kings' and titles.get(h) in ERA: pr.add(ERA[titles[h]])
    CAT.append({'t':CL(e['t']),'u':e['u'] or '','l':'أجنبي' if e['for'] else 'عربي','k':KN[e['k']].split(' ')[0] if e['k']!='inst' else 'مؤسسات ومواقع رسمية','tp':sorted(tp),'pr':sorted(pr),'n':len(e['pages'])})
json.dump(CAT,open('/tmp/catalog.json','w'),ensure_ascii=False)
out={'ar':ar,'fo':fo,'db':db,'counts':{'ar':ca,'fo':cf,'disputes':tot,'disputed_pages':len(disp),'unique':len(D),'raw':len(raw)}}
json.dump(out,open('/tmp/master.json','w'),ensure_ascii=False)
print(out['counts'])
import sys
if '-q' in sys.argv: sys.exit()
for k in ['ar','fo']:
    for e in D.values():
        pass
# audit lines
for e in sorted(D.values(),key=lambda e:(e['for'],e['k'])): print('F' if e['for'] else 'A',e['k'][:3],e['t'][:70])
