/* Per Ankh — بوابة الميزات للمسجلين (soft gate)
   ترسم شارة قفل صغيرة على الميزات المخصّصة للمسجلين، وتنقل الزائر إلى /?account=1 عند الضغط،
   وتخفي الشارات بعد تسجيل الدخول، وترسل نتيجة تمرين الأكاديمية إلى award_quiz_points. */
(function () {
  var SUPA_URL = 'https://cmhxfkkxlijjvjgvqctj.supabase.co';
  var SUPA_KEY = 'sb_publishable_iTQCxO9-vnDJIiksePF5Hg_yrQbcsFA';
  var REF = 'cmhxfkkxlijjvjgvqctj';
  var TOKEN_KEY = 'sb-' + REF + '-auth-token';
  var TARGETS = ['#digital-lab', '#interactive-lab', '#academy-courses', '#hiero-academy'];
  var state = { known: false, member: false, client: null, drawn: false };

  function client() {
    if (state.client) return state.client;
    try { if (typeof sb !== 'undefined' && sb && sb.auth) { state.client = sb; return sb; } } catch (e) {}
    if (window.__paGateSb) { state.client = window.__paGateSb; return state.client; }
    if (window.supabase && window.supabase.createClient) {
      try {
        window.__paGateSb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
        state.client = window.__paGateSb;
        return state.client;
      } catch (e) {}
    }
    return null;
  }

  /* على الصفحات التي لا تُحمّل مكتبة الحسابات، نكتفي بوجود جلسة محفوظة في هذا الجهاز. */
  function storedSession() {
    try {
      var raw = localStorage.getItem(TOKEN_KEY);
      if (!raw) return false;
      var v = JSON.parse(raw);
      if (Array.isArray(v)) v = v[v.length - 1];
      if (!v || typeof v !== 'object') return false;
      if (v.refresh_token) return true;
      if (v.expires_at && v.expires_at * 1000 < Date.now()) return false;
      return !!v.access_token;
    } catch (e) { return false; }
  }

  function resolve() {
    var c = client();
    if (c && c.auth && c.auth.getSession) {
      try {
        c.auth.getSession().then(function (r) {
          state.member = !!(r && r.data && r.data.session);
          state.known = true;
          apply();
        }).catch(function () {
          state.member = storedSession();
          state.known = true;
          apply();
        });
        return;
      } catch (e) {}
    }
    state.member = storedSession();
    state.known = true;
    apply();
  }

  function chip(inline) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pa-gate-chip' + (inline ? ' pa-gate-inline' : '');
    b.setAttribute('aria-label', 'ميزة للمسجلين فقط. اضغط لإنشاء حساب أو تسجيل الدخول.');
    b.title = 'ميزة للمسجلين: أنشئ حسابًا مجانيًا أو سجّل الدخول لفتحها.';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="4.2" y="10.4" width="15.6" height="9.6" rx="2.2"></rect>' +
      '<path d="M7.8 10.4V7.9a4.2 4.2 0 0 1 8.4 0v2.5"></path>' +
      '<circle cx="12" cy="15.2" r="1.35" fill="currentColor" stroke="none"></circle></svg>' +
      '<span>للمسجلين</span>';
    b.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      location.href = '/?account=1';
    });
    return b;
  }

  function draw() {
    if (state.drawn) return;
    state.drawn = true;
    TARGETS.forEach(function (sel) {
      var host = document.querySelector(sel);
      if (!host || host.querySelector(':scope > .pa-gate-chip')) return;
      host.classList.add('pa-gate-host');
      host.appendChild(chip(false));
    });
    /* الصوت: الشارة في شريط الاستماع الظاهر أعلى الصفحة، وفي المشغّل أيضًا */
    var bar = document.querySelector('.pa-listen') || document.querySelector('.tools');
    if (bar && !bar.querySelector('.pa-gate-chip')) bar.appendChild(chip(true));
    var player = document.getElementById('pl');
    if (player && !player.querySelector('.pa-gate-chip')) player.appendChild(chip(true));
  }

  function apply() {
    state.drawn = false;
    draw();
    document.documentElement.classList.toggle('pa-member', !!state.member);
  }

  /* الصوت ميزة للمسجلين: الزائر المؤكد يُحوَّل إلى إنشاء الحساب قبل التشغيل. */
  document.addEventListener('click', function (e) {
    if (!state.known || state.member) return;
    var t = e.target;
    if (!t || !t.closest) return;
    var hit = t.closest('.lbtn, #pp');
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    location.href = '/?account=1';
  }, true);

  function awardQuiz(correct, total) {
    if (!state.member) return false;
    var c = client();
    if (!c || !c.rpc) return false;
    try {
      var p = c.rpc('award_quiz_points', { p_correct: correct, p_total: total });
      if (p && p.catch) p.catch(function () {});
      return true;
    } catch (e) { return false; }
  }

  window.PA_GATE = {
    isMember: function () { return !!state.member; },
    ready: function () { return !!state.known; },
    awardQuiz: awardQuiz,
    refresh: resolve
  };

  function boot() { resolve(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('perankh:auth', function () { resolve(); });
  window.addEventListener('load', function () {
    setTimeout(function () { if (!state.known) resolve(); else apply(); }, 1200);
  });
})();
