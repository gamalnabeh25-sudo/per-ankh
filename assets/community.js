/* مجتمع بر عنخ — منطق صفحات المركز (الكتابة للأعضاء المسجلين، القراءة للجميع) */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://cmhxfkkxlijjvjgvqctj.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_iTQCxO9-vnDJIiksePF5Hg_yrQbcsFA';
  var SB_SRC = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.min.js';
  var TOPICS = ['ملوك', 'مواقع أثرية', 'عصور وأسر', 'معتقدات', 'عام'];
  var NUDGE_KEY = 'perAnkhCoNudgeAt';
  var NUDGE_INTERVAL = 3 * 24 * 3600 * 1000; // كل ٣ أيام كحد أقصى

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }
  function qp(k) { return new URLSearchParams(location.search).get(k); }
  function fmtDate(t) { try { return new Date(t).toLocaleDateString('ar-EG'); } catch (e) { return ''; } }

  var sb = null;
  var currentUser = null;
  var currentName = '';

  function loadAuth() {
    return sb.auth.getSession().then(function (r) {
      currentUser = (r && r.data && r.data.session && r.data.session.user) || null;
      if (!currentUser) return;
      return sb.from('profiles').select('display_name').eq('id', currentUser.id).maybeSingle()
        .then(function (p) {
          currentName = (p && p.data && p.data.display_name)
            || (currentUser.user_metadata && currentUser.user_metadata.display_name)
            || currentUser.email || 'عضو بر عنخ';
        });
    }).catch(function () { currentUser = null; });
  }

  function srvErr(r, fallback) {
    var m = (r && r.error && r.error.message) || '';
    return /[\u0600-\u06FF]/.test(m) ? m : fallback;
  }
  function say(id, text, ok) {
    var m = $(id); if (!m) return;
    m.textContent = text || '';
    m.className = 'co-msg ' + (ok ? 'ok' : 'err');
  }

  /* لوحة دعوة التسجيل — تظهر للزائر في أماكن الكتابة */
  function registerPanel(why) {
    var box = el('div', 'co-register');
    box.append(el('h3', null, 'انضم إلى مجتمع بر عنخ'));
    box.append(el('p', null, why || 'الكتابة في المجتمع متاحة للأعضاء المسجلين. التسجيل مجاني ويستغرق دقيقة.'));
    var a = el('a', 'co-btn', 'تسجيل الدخول / إنشاء حساب');
    a.href = '/?account=1';
    box.append(a);
    return box;
  }

  /* شريط دعوة لطيف أعلى صفحات القراءة — يظهر مرة كل ٣ أيام ويمكن إغلاقه */
  function maybeNudge() {
    if (currentUser) return;
    var last = 0;
    try { last = parseInt(localStorage.getItem(NUDGE_KEY) || '0', 10) || 0; } catch (e) {}
    if (Date.now() - last < NUDGE_INTERVAL) return;
    try { localStorage.setItem(NUDGE_KEY, String(Date.now())); } catch (e) {}
    var bar = el('div', 'co-nudge');
    bar.setAttribute('role', 'note');
    var txt = el('span', null, 'سجّل حسابًا مجانيًا لتكتب مقالات، تفتح مناقشات، وتحفظ نشاطك في المجتمع.');
    var a = el('a', 'co-btn co-ghost', 'إنشاء حساب');
    a.href = '/?account=1';
    var x = el('button', 'co-nudge-x', 'لاحقًا');
    x.type = 'button';
    x.addEventListener('click', function () { bar.remove(); });
    bar.append(txt, a, x);
    var main = document.querySelector('main.wrap') || document.body;
    main.insertBefore(bar, main.firstChild);
  }

  function memberLink(memberId, name) {
    var a = el('a', null, name || 'عضو');
    a.href = '/community/member/?id=' + encodeURIComponent(memberId);
    return a;
  }

  function articleRow(a) {
    var item = el('a', 'co-item');
    item.href = '/community/article/?id=' + a.id;
    item.append(el('h3', null, a.title));
    var snippet = (a.body || '').slice(0, 140);
    item.append(el('p', null, snippet + (a.body && a.body.length > 140 ? '…' : '')));
    var meta = el('div', 'co-meta');
    meta.append(el('span', 'co-chip', a.topic || 'عام'));
    meta.append(memberLink(a.member_id, a.author_name));
    meta.append(el('span', null, fmtDate(a.created_at)));
    item.append(meta);
    return item;
  }

  function discussionRow(d) {
    var item = el('a', 'co-item');
    item.href = '/community/discussion/?id=' + d.id;
    item.append(el('h3', null, d.title));
    var snippet = (d.body || '').slice(0, 140);
    item.append(el('p', null, snippet + (d.body && d.body.length > 140 ? '…' : '')));
    var meta = el('div', 'co-meta');
    meta.append(memberLink(d.member_id, d.author_name));
    meta.append(el('span', null, fmtDate(d.created_at)));
    item.append(meta);
    return item;
  }

  var PAGE_PREFIX = { kings: 'الملوك', sites: 'المواقع الأثرية', eras: 'العصور', sections: 'الأقسام' };
  function pageLinkFromId(pid) {
    var i = pid.indexOf('-');
    return i > 0 ? '/' + pid.slice(0, i) + '/' + pid.slice(i + 1) + '/' : '/';
  }
  function pageTitleFromId(pid) {
    var i = pid.indexOf('-');
    if (i <= 0) return pid;
    var kind = PAGE_PREFIX[pid.slice(0, i)] || pid.slice(0, i);
    return kind + ' · ' + pid.slice(i + 1).replace(/-/g, ' ');
  }

  function reportButton(targetType, targetId) {
    var b = el('button', 'co-report', 'إبلاغ');
    b.type = 'button';
    b.addEventListener('click', function () {
      if (!currentUser) {
        var reason0 = window.confirm('الإبلاغ عن المحتوى متاح للأعضاء المسجلين. هل تريد تسجيل الدخول؟');
        if (reason0) location.href = '/?account=1';
        return;
      }
      var reason = window.prompt('ما سبب الإبلاغ عن هذا المحتوى؟');
      if (!reason || reason.trim().length < 3) return;
      sb.rpc('report_community_content', {
        p_target_type: targetType, p_target_id: String(targetId),
        p_reason: reason.trim()
      }).then(function (r) {
        say('coMsg', r.error ? 'تعذر إرسال البلاغ. جرّب لاحقًا.' : 'وصل بلاغك لإدارة الموقع. شكرًا.', !r.error);
      }).catch(function () { say('coMsg', 'تعذر إرسال البلاغ. جرّب لاحقًا.', false); });
    });
    return b;
  }

  /* ---------- الصفحات ---------- */

  function pageHub() {
    var arts = $('coArticles'), discs = $('coDiscussions'), liked = $('coLiked');
    sb.from('community_articles').select('id,title,body,topic,author_name,member_id,created_at')
      .eq('status', 'approved').order('created_at', { ascending: false }).limit(5)
      .then(function (r) {
        arts.replaceChildren();
        if (!r.data || !r.data.length) { arts.append(el('div', 'co-empty', 'لا توجد مقالات منشورة بعد. كن أول من يكتب!')); return; }
        r.data.forEach(function (a) { arts.append(articleRow(a)); });
      });
    sb.from('community_discussions').select('id,title,body,author_name,member_id,created_at')
      .eq('status', 'approved').order('created_at', { ascending: false }).limit(5)
      .then(function (r) {
        discs.replaceChildren();
        if (!r.data || !r.data.length) { discs.append(el('div', 'co-empty', 'لا توجد مناقشات بعد. افتح أول نقاش!')); return; }
        r.data.forEach(function (d) { discs.append(discussionRow(d)); });
      });
    sb.from('page_like_counts').select('page_id,likes')
      .order('likes', { ascending: false }).limit(5)
      .then(function (r) {
        liked.replaceChildren();
        var rows = (r.data || []).filter(function (x) { return x.likes > 0; });
        if (!rows.length) { liked.append(el('div', 'co-empty', 'لا توجد إعجابات بعد.')); return; }
        var list = el('div', 'co-list');
        rows.forEach(function (x) {
          var a = el('a', 'co-item');
          a.href = pageLinkFromId(x.page_id);
          a.append(el('h3', null, pageTitleFromId(x.page_id)));
          a.append(el('p', null, x.likes + ' إعجاب'));
          list.append(a);
        });
        liked.append(list);
      });
  }

  function pageArticles() {
    var host = $('coList');
    sb.from('community_articles').select('id,title,body,topic,author_name,member_id,created_at')
      .eq('status', 'approved').order('created_at', { ascending: false }).limit(50)
      .then(function (r) {
        host.replaceChildren();
        if (!r.data || !r.data.length) { host.append(el('div', 'co-empty', 'لا توجد مقالات منشورة بعد.')); return; }
        r.data.forEach(function (a) { host.append(articleRow(a)); });
      });
  }

  function pageDiscussions() {
    var host = $('coList');
    sb.from('community_discussions').select('id,title,body,author_name,member_id,created_at')
      .eq('status', 'approved').order('created_at', { ascending: false }).limit(50)
      .then(function (r) {
        host.replaceChildren();
        if (!r.data || !r.data.length) { host.append(el('div', 'co-empty', 'لا توجد مناقشات منشورة بعد.')); return; }
        r.data.forEach(function (d) { host.append(discussionRow(d)); });
      });
  }

  /* بوابة الكتابة: الزائر يرى دعوة تسجيل بدل النموذج */
  function gateWrite(form, why) {
    if (currentUser) return true;
    form.replaceChildren(registerPanel(why));
    return false;
  }

  function pageWrite() {
    var form = $('coForm');
    var sel = $('coTopic');
    if (!gateWrite(form, 'كتابة المقالات متاحة للأعضاء المسجلين. سجّل حسابك المجاني وشارك معرفتك.')) return;
    TOPICS.forEach(function (t) { sel.append(el('option', null, t)); });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var title = $('coTitle').value.trim(),
          body = $('coBody').value.trim(), topic = $('coTopic').value;
      say('coMsg', '', true);
      sb.rpc('submit_community_article', {
        p_title: title, p_body: body, p_topic: topic
      }).then(function (r) {
        if (r.error) return say('coMsg', srvErr(r, 'تعذر إرسال المقال. جرّب مرة أخرى.'), false);
        $('coTitle').value = ''; $('coBody').value = '';
        say('coMsg', 'وصل مقالك وسيظهر بعد مراجعة إدارة الموقع. شكرًا لمشاركتك!', true);
      }).catch(function () { say('coMsg', 'تعذر إرسال المقال. جرّب مرة أخرى.', false); });
    });
  }

  function pageNewDiscussion() {
    var form = $('coForm');
    if (!gateWrite(form, 'فتح المناقشات متاح للأعضاء المسجلين. سجّل حسابك المجاني وابدأ الحوار.')) return;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var title = $('coTitle').value.trim(), body = $('coBody').value.trim();
      say('coMsg', '', true);
      sb.rpc('start_community_discussion', {
        p_title: title, p_body: body
      }).then(function (r) {
        if (r.error) return say('coMsg', srvErr(r, 'تعذر فتح المناقشة. جرّب مرة أخرى.'), false);
        $('coTitle').value = ''; $('coBody').value = '';
        say('coMsg', 'وصلت مناقشتك وستظهر بعد المراجعة. شكرًا!', true);
      }).catch(function () { say('coMsg', 'تعذر فتح المناقشة. جرّب مرة أخرى.', false); });
    });
  }

  function pageArticle() {
    var id = qp('id'), host = $('coArticle');
    if (!id) { host.append(el('div', 'co-empty', 'رابط غير صالح.')); return; }
    sb.from('community_articles').select('id,title,body,topic,author_name,member_id,created_at')
      .eq('id', id).eq('status', 'approved').maybeSingle()
      .then(function (r) {
        host.replaceChildren();
        if (!r.data) { host.append(el('div', 'co-empty', 'هذا المقال غير موجود أو لم يُنشر بعد.')); return; }
        var a = r.data;
        document.title = a.title + ' | مجتمع بر عنخ';
        var head = el('div', 'co-article');
        head.append(el('h1', null, a.title));
        var meta = el('div', 'co-meta');
        meta.append(el('span', 'co-chip', a.topic || 'عام'));
        meta.append(document.createTextNode('بقلم '));
        meta.append(memberLink(a.member_id, a.author_name));
        meta.append(el('span', null, fmtDate(a.created_at)));
        meta.append(reportButton('article', a.id));
        head.append(meta);
        head.append(el('div', 'co-body-text', a.body));
        host.append(head);
      });
  }

  function pageDiscussion() {
    var id = qp('id'), host = $('coArticle'), repliesHost = $('coReplies');
    if (!id) { host.append(el('div', 'co-empty', 'رابط غير صالح.')); return; }
    sb.from('community_discussions').select('id,title,body,author_name,member_id,created_at')
      .eq('id', id).eq('status', 'approved').maybeSingle()
      .then(function (r) {
        host.replaceChildren();
        if (!r.data) { host.append(el('div', 'co-empty', 'هذه المناقشة غير موجودة أو لم تُنشر بعد.')); return; }
        var d = r.data;
        document.title = d.title + ' | مجتمع بر عنخ';
        var head = el('div', 'co-article');
        head.append(el('h1', null, d.title));
        var meta = el('div', 'co-meta');
        meta.append(document.createTextNode('فتحها '));
        meta.append(memberLink(d.member_id, d.author_name));
        meta.append(el('span', null, fmtDate(d.created_at)));
        meta.append(reportButton('discussion', d.id));
        head.append(meta);
        head.append(el('div', 'co-body-text', d.body));
        host.append(head);
        loadReplies(d.id);
      });

    function loadReplies(did) {
      sb.from('community_replies').select('id,body,author_name,member_id,created_at')
        .eq('discussion_id', did).eq('status', 'approved').order('created_at', { ascending: true }).limit(100)
        .then(function (r) {
          repliesHost.replaceChildren();
          if (!r.data || !r.data.length) { repliesHost.append(el('div', 'co-empty', 'لا توجد ردود بعد.')); return; }
          r.data.forEach(function (rep) {
            var row = el('div', 'co-reply');
            var meta = el('div', 'co-meta');
            meta.append(memberLink(rep.member_id, rep.author_name));
            meta.append(el('span', null, fmtDate(rep.created_at)));
            meta.append(reportButton('reply', rep.id));
            row.append(meta);
            row.append(el('p', null, rep.body));
            repliesHost.append(row);
          });
        });
    }

    var form = $('coForm');
    if (!gateWrite(form, 'الرد على المناقشات متاح للأعضاء المسجلين.')) return;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var body = $('coBody').value.trim();
      say('coMsg', '', true);
      sb.rpc('reply_to_discussion', {
        p_discussion_id: id, p_body: body
      }).then(function (r) {
        if (r.error) return say('coMsg', srvErr(r, 'تعذر إرسال الرد. جرّب مرة أخرى.'), false);
        $('coBody').value = '';
        say('coMsg', 'وصل ردك وسيظهر بعد المراجعة.', true);
      }).catch(function () { say('coMsg', 'تعذر إرسال الرد. جرّب مرة أخرى.', false); });
    });
  }

  function pageLeaderboard() {
    var host = $('coBoard');
    function draw(r) {
      host.replaceChildren();
      if (!r.data || !r.data.length) { host.append(el('div', 'co-empty', 'لا توجد نقاط بعد. كن أول من يدخل اللوحة!')); return; }
      r.data.forEach(function (row, i) {
        var item = el('div', 'co-item co-board-row');
        var rank = el('span', 'co-rank', String(i + 1));
        item.append(rank);
        var mid = el('div', 'co-board-mid');
        var name = el('h3', null, row.display_name || 'عضو');
        mid.append(name);
        if (row.badges && row.badges.length) {
          var bs = el('div', 'co-meta');
          row.badges.forEach(function (b) { bs.append(el('span', 'co-chip co-badge', b)); });
          mid.append(bs);
        }
        item.append(mid);
        item.append(el('span', 'co-points', row.points + ' نقطة'));
        item.addEventListener('click', function () { location.href = '/community/member/?id=' + row.member_id; });
        host.append(item);
      });
    }
    function load() {
      sb.from('community_leaderboard').select('member_id,display_name,avatar_url,points,badges')
        .then(draw).catch(function () {});
    }
    load();
    setInterval(load, 60000); // تحديث كل دقيقة
  }

  function pageMember() {
    var id = qp('id'), host = $('coProfile'), arts = $('coArticles'), discs = $('coDiscussions'), reps = $('coReplies');
    if (!id) { host.append(el('div', 'co-empty', 'رابط غير صالح.')); return; }
    sb.from('community_members_public').select('id,display_name,bio,avatar_url,created_at').eq('id', id).maybeSingle()
      .then(function (r) {
        host.replaceChildren();
        if (!r.data) { host.append(el('div', 'co-empty', 'هذا العضو غير موجود أو ملفه خاص.')); return; }
        var m = r.data;
        document.title = m.display_name + ' | مجتمع بر عنخ';
        var head = el('div', 'co-profile-head');
        if (m.avatar_url) { var img = el('img', 'co-avatar'); img.src = m.avatar_url; img.alt = ''; head.append(img); }
        head.append(el('h1', null, m.display_name));
        if (m.bio) head.append(el('p', 'co-bio', m.bio));
        head.append(el('span', 'co-hint', 'عضو منذ ' + fmtDate(m.created_at)));
        sb.from('member_badges').select('badge,awarded_at').eq('member_id', id)
          .then(function (br) {
            if (br.data && br.data.length) {
              var bs = el('div', 'co-meta co-badges');
              br.data.forEach(function (b) { bs.append(el('span', 'co-chip co-badge', b.badge)); });
              head.append(bs);
            }
          });
        host.append(head);
      });
    sb.from('community_articles').select('id,title,body,topic,author_name,member_id,created_at')
      .eq('member_id', id).eq('status', 'approved').order('created_at', { ascending: false }).limit(20)
      .then(function (r) {
        arts.replaceChildren();
        if (!r.data || !r.data.length) { arts.append(el('div', 'co-empty', 'لا مقالات منشورة.')); return; }
        r.data.forEach(function (a) { arts.append(articleRow(a)); });
      });
    sb.from('community_discussions').select('id,title,body,author_name,member_id,created_at')
      .eq('member_id', id).eq('status', 'approved').order('created_at', { ascending: false }).limit(20)
      .then(function (r) {
        discs.replaceChildren();
        if (!r.data || !r.data.length) { discs.append(el('div', 'co-empty', 'لا مناقشات منشورة.')); return; }
        r.data.forEach(function (d) { discs.append(discussionRow(d)); });
      });
    sb.from('community_replies').select('id,body,discussion_id,created_at')
      .eq('member_id', id).eq('status', 'approved').order('created_at', { ascending: false }).limit(20)
      .then(function (r) {
        reps.replaceChildren();
        if (!r.data || !r.data.length) { reps.append(el('div', 'co-empty', 'لا ردود منشورة.')); return; }
        var list = el('div', 'co-list');
        r.data.forEach(function (rep) {
          var row = el('a', 'co-item');
          row.href = '/community/discussion/?id=' + rep.discussion_id;
          row.append(el('p', null, rep.body.slice(0, 160)));
          row.append(el('span', 'co-hint', fmtDate(rep.created_at)));
          list.append(row);
        });
        reps.append(list);
      });
  }

  /* نشاطي: للعضو المسجل — مساهماته وحالتها، وإعدادات الملف في صفحة الحساب */
  function pageMe() {
    var host = $('coProfile'), arts = $('coArticles'), discs = $('coDiscussions'), reps = $('coReplies');
    if (!currentUser) {
      host.replaceChildren(registerPanel('صفحة "نشاطي" تعرض مساهماتك وحالة مراجعتها، وهي متاحة بعد تسجيل الدخول.'));
      [arts, discs, reps].forEach(function (h) { if (h) h.replaceChildren(el('div', 'co-empty', 'سجّل الدخول لعرض نشاطك.')); });
      return;
    }
    var uid = currentUser.id;
    document.title = 'نشاطي | مجتمع بر عنخ';
    var head = el('div', 'co-profile-head');
    head.append(el('h1', null, currentName));
    var acc = el('a', 'co-btn co-ghost', 'إعدادات حسابي وملفي (الاسم، الصورة، النبذة، الخصوصية)');
    acc.href = '/?account=1';
    head.append(acc);
    var pub = el('a', 'co-btn co-ghost', 'ملفي العام');
    pub.href = '/community/member/?id=' + uid;
    head.append(pub);
    host.replaceChildren(head);

    function fill(dst, rows, empty, make) {
      dst.replaceChildren();
      if (!rows || !rows.length) { dst.append(el('div', 'co-empty', empty)); return; }
      rows.forEach(function (row) { dst.append(make(row)); });
    }
    function withStatus(node, st) {
      var chip = el('span', 'co-chip', st === 'approved' ? 'منشور' : st === 'rejected' ? 'مرفوض' : 'قيد المراجعة');
      node.querySelector('.co-meta, h3').append(chip);
      return node;
    }
    sb.from('community_articles').select('id,title,body,topic,author_name,member_id,created_at,status')
      .eq('member_id', uid).order('created_at', { ascending: false }).limit(20)
      .then(function (r) { fill(arts, r.data, 'لم ترسل مقالات بعد.', function (a) { return withStatus(articleRow(a), a.status); }); });
    sb.from('community_discussions').select('id,title,body,author_name,member_id,created_at,status')
      .eq('member_id', uid).order('created_at', { ascending: false }).limit(20)
      .then(function (r) { fill(discs, r.data, 'لم تفتح مناقشات بعد.', function (d) { return withStatus(discussionRow(d), d.status); }); });
    sb.from('community_replies').select('id,body,discussion_id,created_at,status')
      .eq('member_id', uid).order('created_at', { ascending: false }).limit(20)
      .then(function (r) {
        fill(reps, r.data, 'لم تكتب ردودًا بعد.', function (rep) {
          var row = el('a', 'co-item');
          row.href = '/community/discussion/?id=' + rep.discussion_id;
          var h = el('h3', null, 'رد على مناقشة');
          h.append(el('span', 'co-chip', rep.status === 'approved' ? 'منشور' : rep.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'));
          row.append(h);
          row.append(el('p', null, rep.body.slice(0, 160)));
          row.append(el('span', 'co-hint', fmtDate(rep.created_at)));
          return row;
        });
      });
  }

  function boot() {
    if (!window.supabase || !window.supabase.createClient) {
      var s = document.createElement('script');
      s.src = SB_SRC; s.crossOrigin = 'anonymous'; s.onload = boot;
      document.head.appendChild(s);
      return;
    }
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    var page = document.body.dataset.cpage;
    loadAuth().then(function () {
      if (page === 'hub') pageHub();
      else if (page === 'articles') pageArticles();
      else if (page === 'write') pageWrite();
      else if (page === 'article') pageArticle();
      else if (page === 'discussions') pageDiscussions();
      else if (page === 'new-discussion') pageNewDiscussion();
      else if (page === 'discussion') pageDiscussion();
      else if (page === 'member') pageMember();
      else if (page === 'me') pageMe();
      else if (page === 'leaderboard') pageLeaderboard();
      if (page !== 'me' && page !== 'write' && page !== 'new-discussion') maybeNudge();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
