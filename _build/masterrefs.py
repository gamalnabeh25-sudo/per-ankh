import json,re,glob,html,os
from urllib.parse import urlparse
R=os.path.expanduser('~/per-ankh')
raw=json.load(open('/tmp/refs_raw.json'))
# page titles
titles={}
for f in glob.glob(R+'/**/index.html',recursive=True):
    rel=os.path.relpath(f,R)
    if rel.startswith(('_build','supabase')): continue
    m=re.search(r'<h1[^>]*>(.*?)</h1>',open(f,encoding='utf8').read(),re.S)
    titles['/'+os.path.dirname(rel)+'/']=re.sub(r'<[^>]+>','',m.group(1)).strip() if m else rel
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
    e=D.setdefault(k,{'t':t,'u':i['u'],'pages':set()})
    if len(t)>len(e['t']) or (i['u'] and not e['u']): 
        e['t']=t; e['u']=i['u'] or e['u']
    e['pages'].add('/'+i['page']+'/')
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
    e['t']=scrub(e['t']); e['for']=isfor(e); e['k']=kind(e)
KN={'book':'كتب','inst':'مؤسسات ووزارات وجامعات ومواقع رسمية','article':'مقالات وأبحاث وصحف ومواد موسوعية','museum':'سجلات المتاحف والمجموعات'}
def CL(t): return re.sub(r'[:\s—-]+(?:https?://)?[\w.-]+\.(?:org|com|gov\.eg|net|eg|uk|de|ae|info|news|edu|ca|pl|au|fr)(?:/\S*)?\s*$','',t).strip()
def li(e):
    pg=sorted(e['pages'])
    links=' · '.join(f'<a href="{p}">{html.escape(titles.get(p,p))}</a>' for p in pg)
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
disp=[]
for f in sorted(glob.glob(R+'/**/index.html',recursive=True)):
    rel=os.path.relpath(f,R)
    if rel.startswith(('_build','supabase','references')): continue
    t=open(f,encoding='utf8').read()
    ps=[]
    for m in re.finditer(r'<span class="bdg d">[^<]*</span>(.*?)(?:</p>|</li>|</div>)',t,re.S):
        x=html.unescape(re.sub(r'<sup.*?</sup>','',m.group(1),flags=re.S)); x=re.sub(r'<[^>]+>','',x).strip()
        if len(x)>20 and not x.startswith('الصفحة نفسها تذكر'): ps.append(scrub(x))
    if ps: disp.append(('/'+os.path.dirname(rel)+'/',ps))
db=[{'p':'هذه كل المواضع التي ذكرت فيها صفحات الموقع أن الباحثين أو المصادر مختلفون، مجمّعة من الصفحات نفسها. نذكر من يقول ماذا كما ورد في الصفحة، وإن كان صاحب المصدر نفسه يرجّح رأيًا ويذكر سببه فهذا ينسب إليه هو. أما الموقع فلا يحكم بين الآراء.'}]
tot=0
for p,ps in disp:
    db.append({'h':titles.get(p,p)})
    db.append({'html':f'<p class="pt"><a href="{p}">فتح الصفحة</a></p>'})
    for x in ps: db.append({'badge':'d','p':x}); tot+=1
out={'ar':ar,'fo':fo,'db':db,'counts':{'ar':ca,'fo':cf,'disputes':tot,'disputed_pages':len(disp),'unique':len(D),'raw':len(raw)}}
json.dump(out,open('/tmp/master.json','w'),ensure_ascii=False)
print(out['counts'])
for k in ['ar','fo']:
    for e in D.values():
        pass
# audit lines
for e in sorted(D.values(),key=lambda e:(e['for'],e['k'])): print('F' if e['for'] else 'A',e['k'][:3],e['t'][:70])
