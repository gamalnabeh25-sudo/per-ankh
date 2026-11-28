const fs=require('fs');const t=fs.readFileSync(process.env.HOME+'/per-ankh/index.html','utf8');
const i=t.indexOf('DATA={');let j=i+5,d=0,k=j;for(;k<t.length;k++){const c=t[k];if(c=='{')d++;else if(c=='}'){d--;if(d==0)break;}}
const D=eval('('+t.slice(j,k+1)+')');fs.writeFileSync('/tmp/data.json',JSON.stringify(D));
console.log(Object.keys(D).map(x=>x+':'+(Array.isArray(D[x])?D[x].length:typeof D[x])).join(' '));
