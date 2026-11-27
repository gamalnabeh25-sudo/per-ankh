/* بر عنخ — ويدجت التعليقات والإعجابات المشترك لكل الصفحات (التفاعل للأعضاء المسجلين، القراءة للجميع) */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://cmhxfkkxlijjvjgvqctj.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_iTQCxO9-vnDJIiksePF5Hg_yrQbcsFA';
  var SB_SRC = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.min.js';

  function pageId() {
    var p = location.pathname.replace(/\/index\.html?$/i, '').replace(/^\/+|\/+$/g, '');
    if (!p) return 'home';
    var id = p.split('/').join('-').toLowerCase()
      .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return (id || 'home').slice(0, 80);
  }

  function visitorId() {
    var v = null;
    try { v = localStorage.getItem('perAnkhVisitorId'); } catch (e) {}
    if (!v) {
      v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      try { localStorage.setItem('perAnkhVisitorId', v); } catch (e) {}
    }
    return v;
  }

  function likedKey(id) { return 'perAnkhLiked:' + id; }

  function buildUI(host) {
    host.className = 'pc-wrap';
    host.innerHTML =
      '<div class="pc-card">' +
        '<div class="pc-head">' +
          '<h2>التعليقات والإعجابات</h2>' +
          '<div class="pc-actions">' +
          '<button class="pc-like" id="pcLike" type="button" aria-pressed="false">' +
            '<span class="pc-heart" aria-hidden="true">♥</span> أعجبني ' +
            '<span class="pc-count" id="pcCount">0</span>' +
          '</button>' +
          '<button class="pc-save" id="pcSave" type="button" aria-pressed="false">' +
            '<span aria-hidden="true">☆</span> حفظ' +
          '</button>' +
          '</div>' +
        '</div>' +
        '<form id="pcForm" novalidate>' +
          '<input id="pcName" maxlength="40" autocomplete="name" placeholder="اسمك (اختياري)">' +
          '<textarea id="pcBody" maxlength="1000" required placeholder="شارك رأيك أو سؤالك عن هذه الصفحة..."></textarea>' +
          '<button type="submit" class="pc-submit">إرسال للمراجعة</button>' +
          '<div class="pc-hint">يظهر تعليقك بعد مراجعة إدارة الموقع. الروابط غير مسموحة في التعليقات.</div>' +
          '<div class="pc-msg" id="pcMsg" aria-live="polite"></div>' +
        '</form>' +
        '<div class="pc-list" id="pcList"></div>' +
      '</div>';
  }

  function esc(s) { return s == null ? '' : String(s); }

  function init() {
    var host = document.getElementById('pageCommunity');
    if (!host || !window.supabase || !window.supabase.createClient) return;
    buildUI(host);

    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    var pid = host.dataset.pageId || pageId();
    var vid = visitorId();
    var authUser = null;
    sb.auth.getSession().then(function (ar) {
      authUser = ar && ar.data && ar.data.session && ar.data.session.user;
      paintLocks();
      if (authUser) loadSaved();
      if (!authUser) {
        // دعوة التسجيل بعد دقيقة من دخول الموقع (مرة في الجلسة، وتعود في الزيارة التالية)
        var nudged = false;
        try { nudged = sessionStorage.getItem('perAnkhPcNudged') === '1'; } catch (e) {}
        if (!nudged) setTimeout(function () {
          if (authUser) return;
          try { sessionStorage.setItem('perAnkhPcNudged', '1'); } catch (e) {}
          var bar = document.createElement('div');
          bar.className = 'pc-nudge';
          var t = document.createElement('span');
          t.textContent = 'سجّل حسابًا مجانيًا للتعليق والإعجاب وحفظ نشاطك.';
          var a = document.createElement('a');
          a.className = 'pc-nudge-link';
          a.href = '/?account=1';
          a.textContent = 'إنشاء حساب';
          var x = document.createElement('button');
          x.type = 'button';
          x.className = 'pc-nudge-x';
          x.textContent = 'لاحقًا';
          x.addEventListener('click', function () { bar.remove(); });
          bar.append(t, a, x);
          host.insertBefore(bar, host.firstChild);
        }, 60000);
        // زائر: نموذج التعليق يتحول لدعوة تسجيل لطيفة
        var nameField = document.getElementById('pcName');
        if (nameField) nameField.remove();
        var body0 = document.getElementById('pcBody');
        if (body0) { body0.placeholder = 'سجّل الدخول لتشارك رأيك...'; }
        var sub = form.querySelector('.pc-submit');
        if (sub) sub.textContent = 'سجّل الدخول / إنشاء حساب للمشاركة';
        var hint = form.querySelector('.pc-hint');
        if (hint) hint.textContent = 'التسجيل مجاني ويفتح التعليق والإعجاب وحفظ نشاطك في ملفك.';
      } else {
        var nameField2 = document.getElementById('pcName');
        if (nameField2) nameField2.remove();
        // نبضة وقت القراءة للأعضاء: كل دقيقة والصفحة ظاهرة (للوحة الصدارة)
        setInterval(function () {
          if (document.visibilityState === 'visible') {
            sb.rpc('track_reading', { p_seconds: 60, p_page_id: pid }).catch(function () {});
          }
        }, 60000);
      }
    }).catch(function () {});
    var likeBtn = document.getElementById('pcLike');
    var countEl = document.getElementById('pcCount');
    var form = document.getElementById('pcForm');
    var msg = document.getElementById('pcMsg');
    var list = document.getElementById('pcList');

    var liked = false;
    var saved = false;
    try { liked = localStorage.getItem(likedKey(pid)) === '1'; } catch (e) {}
    paintLike();

    var saveBtn = document.getElementById('pcSave');

    /* علامة القفل للزائر: تظهر على الإعجاب والحفظ ونموذج التعليق، وتختفي بعد تسجيل الدخول */
    function paintLocks() {
      var locked = !authUser;
      [likeBtn, saveBtn, form].forEach(function (n) {
        if (!n) return;
        n.classList.toggle('pc-locked', locked);
        var chip = n.querySelector(':scope > .pc-lock');
        if (locked && !chip) {
          var c = document.createElement('span');
          c.className = 'pc-lock';
          c.title = 'للأعضاء المسجلين';
          c.textContent = '🔒';
          n.appendChild(c);
        } else if (!locked && chip) { chip.remove(); }
      });
    }

    function paintSaved() {
      saveBtn.classList.toggle('pc-saved', saved);
      saveBtn.setAttribute('aria-pressed', saved ? 'true' : 'false');
      saveBtn.childNodes[1].textContent = saved ? ' محفوظ' : ' حفظ';
    }

    function loadSaved() {
      sb.from('member_reading_list').select('page_id').eq('member_id', authUser.id).eq('page_id', pid).maybeSingle()
        .then(function (r) { saved = !!(r.data && r.data.page_id); paintSaved(); })
        .catch(function () {});
    }

    saveBtn.addEventListener('click', function () {
      if (!authUser) {
        if (window.confirm('حفظ الصفحات في قائمة قراءتك متاح للأعضاء المسجلين. هل تريد تسجيل الدخول؟')) location.href = '/?account=1';
        return;
      }
      saveBtn.disabled = true;
      if (saved) {
        sb.rpc('remove_reading_item', { p_page_id: pid }).then(function (r) {
          saveBtn.disabled = false;
          if (!r.error) { saved = false; paintSaved(); }
        }).catch(function () { saveBtn.disabled = false; });
        return;
      }
      var note = window.prompt('ملاحظة خاصة تُحفظ مع الصفحة (اختياري):', '');
      if (note === null) { saveBtn.disabled = false; return; }
      sb.rpc('save_reading_item', { p_page_id: pid, p_note: note.trim() }).then(function (r) {
        saveBtn.disabled = false;
        if (r.error) { say('تعذر الحفظ. جرّب لاحقًا.', false); return; }
        saved = true; paintSaved(); say('حُفظت الصفحة في قائمة قراءتك (صفحة «نشاطي»).', true);
      }).catch(function () { saveBtn.disabled = false; say('تعذر الحفظ. جرّب لاحقًا.', false); });
    });

    function paintLike() {
      likeBtn.classList.toggle('pc-on', liked);
      likeBtn.setAttribute('aria-pressed', liked ? 'true' : 'false');
      likeBtn.childNodes[1].textContent = liked ? ' أعجبك هذا ' : ' أعجبني ';
    }

    function say(text, ok) {
      msg.textContent = text || '';
      msg.className = 'pc-msg ' + (ok ? 'pc-ok' : 'pc-err');
    }

    function loadLikes() {
      sb.from('page_like_counts').select('likes').eq('page_id', pid).maybeSingle()
        .then(function (r) { countEl.textContent = (r.data && r.data.likes) || 0; })
        .catch(function () {});
    }

    function loadComments() {
      sb.from('page_comments').select('id,display_name,body,created_at')
        .eq('page_id', pid).eq('status', 'approved')
        .order('created_at', { ascending: false }).limit(20)
        .then(function (r) {
          list.replaceChildren();
          if (r.error || !r.data || !r.data.length) {
            var d = document.createElement('div');
            d.className = 'pc-empty';
            d.textContent = 'لا توجد تعليقات منشورة على هذه الصفحة بعد.';
            list.appendChild(d);
            return;
          }
          r.data.forEach(function (c) {
            var entry = document.createElement('div');
            entry.className = 'pc-entry';
            var head = document.createElement('div');
            head.className = 'pc-entry-head';
            var name = document.createElement('span');
            name.className = 'pc-name';
            name.textContent = esc(c.display_name) || 'زائر';
            var date = document.createElement('span');
            date.className = 'pc-date';
            try { date.textContent = new Date(c.created_at).toLocaleDateString('ar-EG'); } catch (e) {}
            var rep = document.createElement('button');
            rep.className = 'pc-report';
            rep.type = 'button';
            rep.textContent = 'إبلاغ';
            rep.addEventListener('click', function () {
              sb.auth.getSession().then(function (ar) {
                var u = ar && ar.data && ar.data.session && ar.data.session.user;
                if (!u) {
                  if (window.confirm('الإبلاغ عن المحتوى متاح للأعضاء المسجلين. هل تريد تسجيل الدخول؟')) location.href = '/?account=1';
                  return;
                }
                var reason = window.prompt('ما سبب الإبلاغ عن هذا التعليق؟');
                if (!reason || reason.trim().length < 3) return;
                sb.rpc('report_community_content', {
                  p_target_type: 'comment', p_target_id: String(c.id),
                  p_reason: reason.trim()
                }).then(function (r) {
                  say(r.error ? 'تعذر إرسال البلاغ. جرّب لاحقًا.' : 'وصل بلاغك لإدارة الموقع. شكرًا.', !r.error);
                }).catch(function () { say('تعذر إرسال البلاغ. جرّب لاحقًا.', false); });
              });
            });
            head.append(name, date, rep);
            var p = document.createElement('p');
            p.textContent = esc(c.body);
            entry.append(head, p);
            list.appendChild(entry);
          });
        })
        .catch(function () {});
    }

    likeBtn.addEventListener('click', function () {
      if (!authUser) {
        if (window.confirm('الإعجاب متاح للأعضاء المسجلين. هل تريد تسجيل الدخول؟')) location.href = '/?account=1';
        return;
      }
      likeBtn.disabled = true;
      sb.rpc('toggle_page_like', { p_page_id: pid })
        .then(function (r) {
          likeBtn.disabled = false;
          if (r.error) return;
          var row = Array.isArray(r.data) ? r.data[0] : r.data;
          if (row) {
            liked = !!row.liked;
            countEl.textContent = row.likes;
            try { localStorage.setItem(likedKey(pid), liked ? '1' : '0'); } catch (e) {}
            paintLike();
          }
        })
        .catch(function () { likeBtn.disabled = false; });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!authUser) {
        if (window.confirm('التعليق متاح للأعضاء المسجلين. هل تريد تسجيل الدخول؟')) location.href = '/?account=1';
        return;
      }
      var body = document.getElementById('pcBody').value.trim();
      if (body.length < 3) { say('اكتب تعليقًا لا يقل عن 3 أحرف.', false); return; }
      say('', true);
      sb.rpc('submit_page_comment', {
        p_page_id: pid, p_body: body
      }).then(function (r) {
        if (r.error) {
          var m = r.error.message || '';
          if (/الروابط/.test(m)) say('الروابط غير مسموحة في التعليقات.', false);
          else if (/مهلة|دقيقة/.test(m)) say('مهلة قصيرة بين التعليقات، جرّب بعد دقيقة.', false);
          else if (/الحد الأقصى/.test(m)) say('وصلت للحد الأقصى اليومي للتعليقات.', false);
          else if (/يلزم تسجيل الدخول/.test(m)) say('سجّل الدخول أولًا للمشاركة.', false);
          else say('تعذر إرسال التعليق. جرّب مرة أخرى.', false);
          return;
        }
        document.getElementById('pcBody').value = '';
        say('وصل تعليقك وسيظهر بعد المراجعة. شكرًا لمشاركتك!', true);
      }).catch(function () { say('تعذر إرسال التعليق. جرّب مرة أخرى.', false); });
    });

    loadLikes();
    loadComments();
  }

  function boot() {
    if (window.supabase && window.supabase.createClient) { init(); return; }
    var s = document.createElement('script');
    s.src = SB_SRC;
    s.crossOrigin = 'anonymous';
    s.onload = init;
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
