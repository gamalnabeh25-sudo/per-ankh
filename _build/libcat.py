import json,re,html
from urllib.parse import urlparse
BAN=re.compile(r'(?:[بلوف]?ال)?(?:فرعون\w*|فراعن\w*|فرعوني\w*)')
scrub=lambda s:BAN.sub('[ملوك مصر القديمة]',s)
cat=json.load(open('/tmp/catalog.json'))
OPEN=('egymonuments.gov.eg','gate.ahram.org.eg','www.almasryalyoum.com','escholarship.org','www.metmuseum.org','www.youm7.com','english.ahram.org.eg','smarthistory.org','egyptianmuseumcairo.eg','www.globalegyptianmuseum.org','www.elwatannews.com','www.britishmuseum.org','www.penn.museum','www.dainst.org','www.reuters.com','gizamedia.rc.fas.harvard.edu','www.aljazeera.net','www.giza.gov.eg','archaeology.org','www.smithsonianmag.com','www.cairo24.com','ccdl.claremont.edu','scc.gov.eg','doi.org','www.griffith.ox.ac.uk','mota.gov.eg','www.ucl.ac.uk','kids.britannica.com','www.britannica.com','www.nature.com','aeraweb.org','sis.gov.eg','www.cairo.gov.eg','streetstory.gov.eg','library.ecssr.ae','journal.walycenter.org','www.arabicacademy.gov.eg','catalogue.bnf.fr','www.bbc.com','www.abc.net.au','www.mesr24.com','www.elbalad.news','www.elfagr.org','www.nationalgeographic.com','www.worldhistory.org','www.ebsco.com','www.ashmolean.org','www.hierakonpolis-online.org','nowa.muzarp.poznan.pl','collections.rom.on.ca','library.biblicalarchaeology.org','www.monash.edu','ancient-egypt.org','web.archive.org','www.munzinger.de','www.hindawi.org')
rows=[];hid=0
for i,e in enumerate(cat):
    u=e['u']; host=urlparse(u).netloc if u else ''
    link=u if host in OPEN else ''
    note='' if link else ('لا رابط مسجل' if not u else 'الرابط غير معروض: لم يُتحقق من أن المصدر مفتوح قانونيًا')
    if u and not link: hid+=1
    rows.append({'t':scrub(re.sub(r'[:\s—-]+(?:https?://)?(?:www\.)?[\w-]+(?:\.[\w-]+)+/\S*\s*$','',re.sub(r'[:\s—-]+(?:https?://)?www\.[\w.-]+\s*$','',e['t']))),'l':e['l'],'k':e['k'],'tp':e['tp'],'pr':e['pr'],'u':link,'n':note})

import re as _re
KEEP=_re.compile(r'مصر القديمة|مصر|الأهرام|الديانة المصرية|الحضارة المصرية|النوبة|الهكسوس|فرع|المومياء|هيروغليف')
def _hd():
    out=[]
    for i,t in json.load(open('/tmp/hdb.json')).items():
        p=[x.strip() for x in t.split('|')]
        if len(p)<3 or 'هنداوي' not in p[-1]: continue
        if not KEEP.search(p[0]) or 'الحرب الروسية' in p[0] or 'المسرح' in p[0] or 'خواطر' in p[0] or 'الفتح العثماني' in p[0] or 'عمرو بن' in p[0]: continue
        out.append({'t':scrub(p[0]+' — '+p[1]+' — مؤسسة هنداوي (نسخة رقمية، سنة الطبعة الأصلية غير مسجلة هنا)'),'l':'عربي','k':'كتب','tp':['كتب هنداوي'],'pr':[],'u':'https://www.hindawi.org/books/'+i+'/','n':''})
    return out
def _uee():
    out=[]
    for k,v in json.load(open('/tmp/uee.json')).items():
        out.append({'t':scrub(v['author']+' ('+v['date'][:4]+'). '+v['title']+'. UCLA Encyclopedia of Egyptology, '+v['journal'].replace('UCLA Encyclopedia of Egyptology, ','')+'. eScholarship.'),'l':'أجنبي','k':'مقالات','tp':['موسوعة UCLA لعلم المصريات'],'pr':[],'u':v['perm'],'n':''})
    return out
_hx=_hd();_ux=_uee();rows+=_hx+_ux

def _ekb():
    out=[];K=re.compile(r'ancient|egypt|pyramid|temple|tomb|mumm|papyr|hierogl|nile|pharaon|karnak|luxor|thebes|giza|saqqara|abydos|amarna|ptolem|nubia|obelisk|sphinx|coffin|scarab|amun|osiris|isis|hathor|horus|deir|مصر|مصري|فرعون|أثري|آثار|معبد|مقبر|هرم|بردي|مومي',re.I)
    EX=re.compile(r'فرعون|فراعن')
    for u,v in json.load(open('/tmp/ekb.json')).items():
        j=v['j']
        if re.search(r'Hospitality|Tourism and Hotels|Chemistry|Design',j) and not re.search(r'ancient|pharaon|pyramid|temple|tomb|mumm|papyr|hierogl|karnak|luxor|egyptian (art|antiq)',v['t'],re.I): continue
        if not K.search(v['t']): continue
        ar=bool(re.search(r'[\u0600-\u06FF]',v['t']))
        doi=(' DOI: '+v['doi']) if v['doi'] else ''
        out.append({'t':scrub(v['t']+'. '+j+'. Egyptian Knowledge Bank (EKB).'+doi+' المؤلف والسنة غير مسجلين هنا.'),'l':'عربي' if ar else 'أجنبي','k':'مقالات','tp':['دوريات بنك المعرفة المصري'],'pr':[],'u':u,'n':''})
    return out
_ex=_ekb();rows+=_ex
print('extra ekb',len(_ex))
print('extra hindawi',len(_hx),'uee',len(_ux))
T=json.load(open('/tmp/data.json'))['terms']
EN={'مصطبة':'Mastaba','السرخ':'Serekh','الكارتوش':'Cartouche','النطرون':'Natron','الصرح':'Pylon','قدس الأقداس':'Sanctuary / Holy of Holies','المسلة':'Obelisk','نصوص الأهرام':'Pyramid Texts','نصوص التوابيت':'Coffin Texts','أبو الهول':'Sphinx','الهيبوسطايل':'Hypostyle hall','السرابيوم':'Serapeum','الفيوم':'Fayum','القرابين':'Offerings','التاسوع':'Ennead','العلامة الدلالية':'Determinative','العلامة الصوتية':'Phonogram (phonetic sign)','أخيتاتون':'Akhetaten'}
import re as _r2
def _n(x): return _r2.sub(r'[\u064B-\u0652\u0640]','',x).replace('أ','ا').replace('إ','ا').replace('آ','ا').replace('ى','ي').replace('ة','ه').replace('ال','',1) if x.startswith('ال') else _r2.sub(r'[\u064B-\u0652\u0640]','',x).replace('أ','ا').replace('إ','ا').replace('آ','ا').replace('ى','ي').replace('ة','ه')
_g=json.load(open('/tmp/gem.json'))
_ids=sorted({int(k[:-1]) for k,v in _g.items() if v})
GEM=[]
for i in _ids:
    e=_g.get(f'{i}E'); a=_g.get(f'{i}A')
    if e and a and 'فرع' not in a[0]: GEM.append({'a':scrub(re.sub(r'\s+',' ',a[0]).strip()),'e':re.sub(r'\s+',' ',e[0]).strip(),'d':'','u':f'https://www.globalegyptianmuseum.org/glossary.aspx?id={i}&lan=A','s':'قاموس المتحف المصري العالمي (CULTNAT)، المدخل رقم %d. المقابل الإنجليزي والعربي كما ورد في المصدر.'%i})
gk={_n(g['a']):g for g in GEM}
terms=[]
for a,d in T:
    g=gk.get(_n(a))
    if g: g['d']=scrub(d); g['s']='التعريف نص الموقع. الاسم العربي والإنجليزي من قاموس المتحف المصري العالمي (CULTNAT)، المدخل رقم '+g['u'].split('id=')[1].split('&')[0]+'.'
    else: terms.append({'a':scrub(a),'e':EN.get(a,''),'d':scrub(d),'u':'','s':'التعريف نص الموقع. المقابل الإنجليزي غير موثق من مصدر بعد.'})
GD=json.load(open('gdefs.json'))
for g in GEM:
    i=g['u'].split('id=')[1].split('&')[0]
    if not g['d'] and i in GD:
        g['d']=scrub(GD[i]); g['s']='التعريف بصياغتنا اعتمادًا على المدخل الإنجليزي رقم '+i+' في قاموس المتحف المصري العالمي (CULTNAT)، دون نقل نصه. الاسمان العربي والإنجليزي كما وردا في المصدر.'
terms+=GEM
for _r in rows: _r['t']=_r['t'].replace('الآلهة','[المعبودات]').replace('آلهة','[معبودات]')
data=json.dumps({'rows':rows,'terms':terms},ensure_ascii=False).replace('</','<\\/')
CSS='''<style>.lc{--b:#8a5a00}.lc input,.lc select{font:inherit;padding:8px 10px;border-radius:8px;border:1px solid #b79a5a;background:#fffaf0;color:#222;max-width:100%}.lc .bar{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.lc .bar input{flex:1 1 220px}.lc .it{padding:10px 0;border-bottom:1px solid rgba(0,0,0,.12);line-height:1.7}.lc .m{font-size:.85em;color:#6a5a3a}.lc .tg{display:inline-block;font-size:.78em;padding:1px 8px;border-radius:99px;background:rgba(176,120,20,.16);margin-inline-end:4px}.lc .az{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0}.lc .az button{font:inherit;padding:4px 9px;border-radius:6px;border:1px solid #b79a5a;background:#fffaf0;cursor:pointer}.lc .az button.on{background:#8a5a00;color:#fff}.lc .cnt{font-size:.9em;color:#6a5a3a}</style>'''
lib=f'''{CSS}<div class="lc" id="libcat"><p class="pt">فهرس بكل مرجع استُخدم في صفحات الموقع. لا نضيف مؤلفًا أو سنة أو ناشرًا لم نتحقق منه: ما هو مكتوب في المدخل هو ما سُجّل من المرجع، وغيره غير مذكور. الروابط تظهر فقط للمصادر المفتوحة المعروفة (مواقع الوزارة والمتاحف والجامعات والدوريات). الروابط إلى نسخ كتب على مواقع لم نتحقق من حقوقها مخفية.</p><div class="bar"><input id="lq" type="search" placeholder="ابحث في الفهرس" aria-label="ابحث في الفهرس"><select id="lk" aria-label="النوع"><option value="">كل الأنواع</option></select><select id="ll" aria-label="اللغة"><option value="">كل اللغات</option></select><select id="lp" aria-label="الفترة"><option value="">كل الفترات</option></select><select id="lt" aria-label="الموضوع"><option value="">كل المواضيع</option></select></div><p class="cnt" id="lc" aria-live="polite"></p><div id="lr"></div><p class="m">الفترة تؤخذ من صفحات الملوك التي تستخدم المرجع، والموضوع من الصفحة التي تستخدمه، وليسا وسمًا يدويًا من المؤلف.</p></div>'''
gl='''<div class="lc" id="glos"><p class="pt">مسرد المصطلحات بالعربية والإنجليزية. الأسماء العربية والإنجليزية مأخوذة من قاموس المتحف المصري العالمي (CULTNAT) كما وردت، مع رقم المدخل ورابطه. حيث لا يوجد تعريف مكتوب فالتعريف في المصدر ولم نكتب بدله شيئًا غير موثق.</p><div class="bar"><input id="gq" type="search" placeholder="ابحث عن مصطلح بالعربية أو الإنجليزية" aria-label="ابحث عن مصطلح"></div><div class="az" id="gaz"></div><p class="cnt" id="gc" aria-live="polite"></p><div id="gr"></div></div>'''
js='''<script>(function(){var D=window.__LIB;function $(i){return document.getElementById(i)}function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function fill(id,vals){var s=$(id);vals.forEach(function(v){var o=document.createElement('option');o.value=v;o.textContent=v;s.appendChild(o)})}
var U=function(a){return Array.from(new Set(a)).sort()};
fill('lk',U(D.rows.map(function(r){return r.k})));fill('ll',U(D.rows.map(function(r){return r.l})));fill('lp',U([].concat.apply([],D.rows.map(function(r){return r.pr}))));fill('lt',U([].concat.apply([],D.rows.map(function(r){return r.tp}))));
function nz(s){return s.replace(/[\\u064B-\\u0652\\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase()}
function rl(){var q=nz($('lq').value),k=$('lk').value,l=$('ll').value,p=$('lp').value,t=$('lt').value,n=0,h='';D.rows.forEach(function(r){if(k&&r.k!==k)return;if(l&&r.l!==l)return;if(p&&r.pr.indexOf(p)<0)return;if(t&&r.tp.indexOf(t)<0)return;if(q&&nz(r.t).indexOf(q)<0)return;n++;if(n<=150)h+='<div class="it"><div>'+esc(r.t)+'</div><div class="m"><span class="tg">'+esc(r.k)+'</span><span class="tg">'+esc(r.l)+'</span>'+r.tp.map(function(x){return'<span class="tg">'+esc(x)+'</span>'}).join('')+(r.u?' <a href="'+esc(r.u)+'" rel="noopener" target="_blank">فتح المصدر</a>':' <small>'+esc(r.n)+'</small>')+'</div></div>'});$('lr').innerHTML=h||'<p>لا نتائج.</p>';$('lc').textContent=n>150?('أول 150 نتيجة، قيّد البحث لرؤية الباقي'):''}
['lq','lk','ll','lp','lt'].forEach(function(i){$(i).addEventListener('input',rl);$(i).addEventListener('change',rl)});rl();
var letter='';var L=U(D.terms.map(function(t){return nz(t.a.replace(/^ال/,'')).charAt(0)}));
function az(){var h='<button class="'+(letter?'':'on')+'" data-l="">الكل</button>';L.forEach(function(c){h+='<button class="'+(letter===c?'on':'')+'" data-l="'+c+'">'+c+'</button>'});$('gaz').innerHTML=h}
$('gaz').addEventListener('click',function(e){if(e.target.dataset&&e.target.tagName==='BUTTON'){letter=e.target.dataset.l;az();rg()}});
function rg(){var q=nz($('gq').value),n=0,h='';D.terms.slice().sort(function(a,b){return a.a.localeCompare(b.a,'ar')}).forEach(function(t){var c=nz(t.a.replace(/^ال/,'')).charAt(0);if(letter&&c!==letter)return;if(q&&nz(t.a+' '+t.e+' '+t.d).indexOf(q)<0)return;n++;h+='<div class="it"><div><b>'+esc(t.a)+'</b>'+(t.e?' <span dir="ltr" class="m">'+esc(t.e)+'</span>':'')+'</div><div>'+(t.d?esc(t.d):'<span class="m">التعريف في المصدر (رابط أدناه). لم نكتب تعريفًا بكلماتنا بعد.</span>')+'</div><div class="m">'+esc(t.s||'')+(t.u?' <a href="'+esc(t.u)+'" rel="noopener" target="_blank">فتح المدخل</a>':'')+'</div></div>'});$('gr').innerHTML=h||'<p>لا نتائج.</p>';$('gc').textContent=''}
$('gq').addEventListener('input',rg);az();rg()})();</script>'''
out={'lib':lib,'gl':gl,'js':'<script>window.__LIB='+data+';</script>'+js,'hidden':hid,'n':len(rows),'terms':len(terms)}
json.dump(out,open('/tmp/libcat.json','w'),ensure_ascii=False)
print(len(rows),hid,len(terms),len(data))
