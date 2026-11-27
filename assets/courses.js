(function(){
  var KEY = 'perankh.courses.v1';
  var data = window.PA_COURSES || [];
  var root = document.getElementById('paCourses');
  if(!root || !data.length) return;

  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e){ state = {}; }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){} }
  function st(cid){ if(!state[cid]) state[cid] = {done:[], ex:{}}; if(!state[cid].done) state[cid].done=[]; if(!state[cid].ex) state[cid].ex={}; return state[cid]; }
  function totalLessons(){ return data.reduce(function(n,c){ return n + c.lessons.length; }, 0); }
  function totalDone(){ return data.reduce(function(n,c){ return n + st(c.id).done.length; }, 0); }

  function render(){
    var done = totalDone(), total = totalLessons();
    var sum = document.getElementById('paCourseStats');
    if(sum) sum.textContent = 'أكملت ' + done + ' من ' + total + ' دروس';

    root.innerHTML = data.map(function(c){
      var s = st(c.id);
      var pct = Math.round(s.done.length / c.lessons.length * 100);
      var lessons = c.lessons.map(function(L, i){
        var isDone = s.done.indexOf(i) >= 0;
        var answered = s.ex[i];
        var opts = L.ex.o.map(function(o, oi){
          var cls = '';
          if(answered !== undefined){
            if(oi === L.ex.a) cls = ' ok';
            else if(oi === answered) cls = ' no';
          }
          return '<button class="pc-opt'+cls+'" data-course="'+c.id+'" data-lesson="'+i+'" data-opt="'+oi+'" type="button"'+(answered!==undefined?' disabled':'')+'>'+o+'</button>';
        }).join('');
        var fb = answered !== undefined ? '<div class="pc-fb">'+(answered === L.ex.a ? '✔ إجابة صحيحة. ' : '✘ الإجابة الصحيحة: '+L.ex.o[L.ex.a]+'. ')+L.ex.why+'</div>' : '';
        return '<article class="pc-lesson'+(isDone?' is-done':'')+'" data-lesson="'+i+'">'+
          '<div class="pc-lhead"><span class="pc-lnum">'+(i+1)+'</span><h4>'+L.t+'</h4></div>'+
          L.p.map(function(par){ return '<p class="pc-par">'+par+'</p>'; }).join('')+
          '<p class="pc-src">المصدر: '+L.src+'</p>'+
          '<div class="pc-ex"><div class="pc-q">تمرين · '+L.ex.q+'</div><div class="pc-opts">'+opts+'</div>'+fb+'</div>'+
          '<button class="pc-done'+(isDone?' is-done':'')+'" data-course="'+c.id+'" data-lesson="'+i+'" type="button">'+(isDone?'✓ درس مكتمل':'علّم الدرس كمكتمل')+'</button>'+
        '</article>';
      }).join('');
      return '<section class="pc-course" data-course="'+c.id+'">'+
        '<div class="pc-chead">'+
          '<div class="pc-cmeta"><span class="pc-level">'+c.level+'</span><span class="pc-mins">'+c.mins+' دقيقة</span><span class="pc-count">'+c.lessons.length+' دروس</span></div>'+
          '<h3>'+c.title+'</h3><p class="pc-summary">'+c.summary+'</p>'+
          '<div class="pc-bar"><i style="width:'+pct+'%"></i></div><span class="pc-pct">'+pct+'%</span>'+
          '<button class="pc-toggle" data-course="'+c.id+'" type="button">'+(pct?'أكمل المسار':'ابدأ المسار')+'</button>'+
        '</div>'+
        '<div class="pc-lessons" hidden>'+lessons+'</div>'+
      '</section>';
    }).join('');
  }

  root.addEventListener('click', function(e){
    var t = e.target;
    if(!t || t.tagName !== 'BUTTON') return;
    if(t.classList.contains('pc-toggle')){
      var body = t.closest('.pc-course').querySelector('.pc-lessons');
      body.hidden = !body.hidden;
      return;
    }
    if(t.classList.contains('pc-opt')){
      var cid = t.getAttribute('data-course'), li = +t.getAttribute('data-lesson'), oi = +t.getAttribute('data-opt');
      var s = st(cid);
      if(s.ex[li] !== undefined) return;
      s.ex[li] = oi; save(); render();
      return;
    }
    if(t.classList.contains('pc-done')){
      var c2 = t.getAttribute('data-course'), l2 = +t.getAttribute('data-lesson');
      var s2 = st(c2);
      var k = s2.done.indexOf(l2);
      if(k >= 0) s2.done.splice(k,1); else s2.done.push(l2);
      save(); render();
      return;
    }
  });

  var reset = document.getElementById('paCourseReset');
  if(reset) reset.addEventListener('click', function(){
    state = {}; save(); render();
  });

  render();
})();
