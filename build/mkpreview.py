import os,re,shutil
SRC=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST='/tmp/preview'
if os.path.exists(DST): shutil.rmtree(DST)
for d in ['assets','kings','eras','sites','dynasties']:
    shutil.copytree(os.path.join(SRC,d),os.path.join(DST,d))
shutil.copy(os.path.join(SRC,'index.html'),DST)
def fix(path,depth):
    h=open(path,encoding='utf-8').read()
    pre='../'*depth
    h=re.sub(r'(href|src)="/(?![/])',lambda m:m.group(1)+'="'+pre,h)
    open(path,'w',encoding='utf-8').write(h)
fix(os.path.join(DST,'index.html'),0)
for root,dirs,files in os.walk(DST):
    for f in files:
        if f.endswith('.html') and root!=DST:
            depth=os.path.relpath(root,DST).count(os.sep)+1
            fix(os.path.join(root,f),depth)
print('preview ready')
