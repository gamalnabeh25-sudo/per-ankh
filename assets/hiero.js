(function(){
  var D = window.PA_HIERO; if(!D) return;
  var signs = D.signs;

  /* ---------- 2. biliteral / triliteral grid ---------- */
  var grid = document.getElementById('haGrid');
  var countEl = document.getElementById('haCount');
  var searchEl = document.getElementById('haSearch');
  var moreBtn = document.getElementById('haMore');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.ha-chips button'));
  var cls = 'bi', shown = 24;

  function pool(){
    return signs.filter(function(s){
      if(cls === 'all') return s.k === 'bi' || s.k === 'tri';
      return s.k === cls;
    });
  }
  function render(){
    if(!grid) return;
    var q = (searchEl && searchEl.value || '').trim().toLowerCase();
    var list = pool();
    if(q) list = list.filter(function(s){
      return (s.v + ' ' + s.c + ' ' + s.d).toLowerCase().indexOf(q) >= 0;
    });
    if(countEl) countEl.textContent = list.length + ' علامة';
    var slice = list.slice(0, shown);
    grid.innerHTML = slice.map(function(s){
      return '<article class="ha-sig"><span class="hsg">' + s.g + '</span><b>' + s.c + '</b><em>' + (s.v || '—') + '</em><span class="hsd">' + s.d + '</span></article>';
    }).join('');
    if(moreBtn) moreBtn.style.display = list.length > shown ? '' : 'none';
  }
  chips.forEach(function(b){
    b.addEventListener('click', function(){
      chips.forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active'); cls = b.getAttribute('data-ha-cls'); shown = 24; render();
    });
  });
  if(searchEl) searchEl.addEventListener('input', function(){ shown = 24; render(); });
  if(moreBtn) moreBtn.addEventListener('click', function(){ shown += 36; render(); });
  render();

  /* ---------- 4. cartouche ---------- */
  var MAP = {
    'ا':'𓄿','أ':'𓄿','إ':'𓄿','آ':'𓄿','ء':'𓄿','ع':'𓂝','ي':'𓇋','ى':'𓇋','ئ':'𓇋','و':'𓅱','ؤ':'𓅱',
    'ب':'𓃀','پ':'𓊪','ف':'𓆑','م':'𓅓','ن':'𓈖','ر':'𓂋','ل':'𓂋','ه':'𓉔','ة':'𓏏','ح':'𓎛','خ':'𓐍',
    'غ':'𓎼','ج':'𓎼','س':'𓊃','ص':'𓋴','ز':'𓊃','ش':'𓈙','ق':'𓈎','ك':'𓎡','ت':'𓏏','ط':'𓏏','ث':'𓍿',
    'د':'𓂧','ض':'𓂧','ذ':'𓆓','ظ':'𓆓'
  };
  var LAT = {a:'𓄿',i:'𓇋',j:'𓇋',y:'𓇋',w:'𓅱',b:'𓃀',p:'𓊪',f:'𓆑',m:'𓅓',n:'𓈖',r:'𓂋',l:'𓂋',h:'𓉔',
    s:'𓊃',z:'𓊃',q:'𓈎',k:'𓎡',g:'𓎼',t:'𓏏',d:'𓂧'};
  var input = document.getElementById('haName');
  var out = document.getElementById('haCartText');
  function convert(){
    if(!input || !out) return;
    var raw = input.value.trim();
    var res = '';
    for(var i=0;i<raw.length;i++){
      var ch = raw[i], low = ch.toLowerCase();
      if(MAP[ch]) res += MAP[ch];
      else if(LAT[low]) res += LAT[low];
      else if(/[\s\-'’]/.test(ch)) continue;
    }
    out.textContent = res || '';
  }
  var go = document.getElementById('haNameGo');
  if(go) go.addEventListener('click', convert);
  if(input) input.addEventListener('input', convert);

  convert();

  /* ---------- 5. practice reveal ---------- */
  Array.prototype.slice.call(document.querySelectorAll('.ha-reveal')).forEach(function(btn){
    btn.addEventListener('click', function(){
      var card = btn.closest('.ha-practice');
      var ans = card && card.querySelector('.hp-a');
      if(!ans) return;
      ans.hidden = false; btn.style.display = 'none';
    });
  });
})();
