import re,glob,json,os,html
R=os.path.expanduser('~/per-ankh')
items=[]
for f in glob.glob(R+'/**/index.html',recursive=True):
    rel=os.path.relpath(f,R)
    if rel.startswith('_build') or rel.startswith('supabase'): continue
    t=open(f,encoding='utf8').read()
    page=os.path.dirname(rel) or 'home'
    for m in re.finditer(r'<li[^>]*id="r[a-z]*(\d+)"[^>]*>(.*?)</li>',t,re.S):
        raw=m.group(2)
        u=re.findall(r'href="([^"]+)"',raw)
        txt=html.unescape(re.sub(r'<[^>]+>','',raw)).strip()
        items.append({'page':page,'n':int(m.group(1)),'t':txt,'u':u[0] if u else None})
json.dump(items,open('/tmp/refs_raw.json','w'),ensure_ascii=False)
print(len(items),len({i['page'] for i in items}))
from collections import Counter
print(Counter(i['page'].split('/')[0] for i in items))
print(len({i['u'] for i in items if i['u']}))
