/* بر عنخ — ويدجت التعليقات والإعجابات المشترك لكل الصفحات (بدون حسابات) */
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
          '<button class="pc-like" id="pcLike" type="button" aria-pressed="false">' +
            '<span class="pc-heart" aria-hidden="true">♥</span> أعجبني ' +
            '<span class="pc-count" id="pcCount">0</span>' +
          '</button>' +
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
    var pid = pageId();
    var vid = visitorId();
    var likeBtn = document.getElementById('pcLike');
    var countEl = document.getElementById('pcCount');
    var form = document.getElementById('pcForm');
    var msg = document.getElementById('pcMsg');
    var list = document.getElementById('pcList');

    var liked = false;
    try { liked = localStorage.getItem(likedKey(pid)) === '1'; } catch (e) {}
    paintLike();

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
      sb.from('page_comments').select('display_name,body,created_at')
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
            head.append(name, date);
            var p = document.createElement('p');
            p.textContent = esc(c.body);
            entry.append(head, p);
            list.appendChild(entry);
          });
        })
        .catch(function () {});
    }

    likeBtn.addEventListener('click', function () {
      likeBtn.disabled = true;
      sb.rpc('toggle_page_like', { p_page_id: pid, p_visitor: vid })
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
      var name = document.getElementById('pcName').value.trim();
      var body = document.getElementById('pcBody').value.trim();
      if (body.length < 3) { say('اكتب تعليقًا لا يقل عن 3 أحرف.', false); return; }
      say('', true);
      sb.rpc('submit_page_comment', {
        p_page_id: pid, p_display_name: name, p_body: body, p_visitor: vid
      }).then(function (r) {
        if (r.error) {
          var m = r.error.message || '';
          if (/الروابط/.test(m)) say('الروابط غير مسموحة في التعليقات.', false);
          else if (/مهلة|دقيقة/.test(m)) say('مهلة قصيرة بين التعليقات، جرّب بعد دقيقة.', false);
          else if (/الحد الأقصى/.test(m)) say('وصلت للحد الأقصى اليومي للتعليقات.', false);
          else if (/مكرر/.test(m)) say('هذا التعليق مكرر.', false);
          else if (/الاسم/.test(m)) say('الاسم بين 2 و40 حرفًا.', false);
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
