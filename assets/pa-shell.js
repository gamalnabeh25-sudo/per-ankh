/* بر عنخ — سكربت الشل الموحد */
(function(){var K='perAnkhLanguage',h=document.getElementById('pash'),nav=document.getElementById('panav'),mb=document.getElementById('paMenu'),lb=document.getElementById('paLang'),note=document.getElementById('paNote');
function closeM(){nav.classList.remove('open');mb.setAttribute('aria-expanded','false')}
mb.addEventListener('click',function(e){e.stopPropagation();var o=nav.classList.toggle('open');mb.setAttribute('aria-expanded',String(o))});
nav.addEventListener('click',function(e){if(e.target.closest('a'))closeM()});
document.addEventListener('click',function(e){if(!h.contains(e.target))closeM()});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeM()});
function setL(l){var en=l==='en';h.setAttribute('dir',en?'ltr':'rtl');document.getElementById('paCrumb').setAttribute('dir',en?'ltr':'rtl');lb.textContent=en?'AR':'EN';
document.querySelectorAll('#pash [data-ar],#paCrumb [data-ar]').forEach(function(a){a.textContent=en?a.dataset.en:a.dataset.ar});note.hidden=!en;
mb.setAttribute('aria-label',en?'Open site sections menu':'فتح قائمة أقسام الموقع');}
var cur='ar';try{cur=localStorage.getItem(K)==='en'?'en':'ar'}catch(e){}
setL(cur);
lb.addEventListener('click',function(){cur=cur==='ar'?'en':'ar';try{localStorage.setItem(K,cur)}catch(e){}setL(cur)});
})();