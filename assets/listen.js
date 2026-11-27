/* Per Ankh · listening upgrades for the page audio player.
   Adds: continuous listen-through, resume where you stopped, remembered speed,
   keyboard control and lock-screen (Media Session) metadata.
   It never invents audio: if a file is missing it says so and stops. */
(function () {
  var au = document.getElementById('au');
  if (!au) return;

  var bar = document.querySelector('.pl') || document.querySelector('[id="pl"]');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.lbtn'));
  if (!buttons.length) return;

  var keys = [], titles = {};
  buttons.forEach(function (b) {
    var k = b.getAttribute('data-s');
    if (!k || titles[k]) return;
    keys.push(k);
    var t = b.getAttribute('data-title');
    if (!t) {
      var sec = b.closest ? b.closest('section, article, li, div') : null;
      var h = sec ? sec.querySelector('h2, h3, h4, summary') : null;
      if (h) t = (h.textContent || '').replace(/\s+/g, ' ').trim();
    }
    if (!t) {
      var clone = b.cloneNode(true);
      var sp = clone.querySelector('span');
      if (sp) sp.remove();
      t = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    }
    titles[k] = t || k;
  });
  if (!keys.length) return;

  var pageKey = 'pa.listen.' + location.pathname;
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(pageKey) || '{}'); } catch (e) { return {}; } },
    set: function (v) { try { localStorage.setItem(pageKey, JSON.stringify(v)); } catch (e) {} }
  };
  var saved = store.get();

  function dirOf(src) {
    if (!src) return null;
    var i = src.lastIndexOf('/');
    return i > -1 ? src.slice(0, i + 1) : null;
  }
  function srcFor(key, like) {
    var dir = dirOf(like || au.getAttribute('src') || '');
    if (!dir) {
      // fall back to the page's own audio folder
      dir = location.pathname.replace(/[^/]*$/, '') + 'audio/';
    }
    return dir + key + '-1.mp3';
  }
  function currentKey() {
    var src = au.getAttribute('src') || '';
    var m = src.match(/\/([^\/]+)-(\d+)\.mp3/);
    return m ? m[1] : null;
  }

  /* ---- control bar ---- */
  var box = document.createElement('div');
  box.className = 'pa-listen';
  box.innerHTML =
    '<button type="button" class="pa-listen-all">▶ استماع كامل للصفحة</button>' +
    '<span class="pa-listen-now" aria-live="polite"></span>' +
    '<button type="button" class="pa-listen-resume" hidden></button>' +
    '<span class="pa-listen-hint">مسافة = تشغيل/إيقاف · ← → = 10 ثوانٍ</span>';
  var host = null;
  var firstBtn = buttons[0];
  var sec = firstBtn && firstBtn.closest ? firstBtn.closest('section, article') : null;
  if (sec) { sec.insertBefore(box, sec.firstChild); }
  else if (bar && bar.parentNode) { bar.parentNode.insertBefore(box, bar.nextSibling || null); }
  else { document.body.appendChild(box); }

  var allBtn = box.querySelector('.pa-listen-all');
  var nowEl = box.querySelector('.pa-listen-now');
  var resumeBtn = box.querySelector('.pa-listen-resume');
  var chain = false, chainIndex = -1, lastError = false;

  function setNow(txt) { if (nowEl) nowEl.textContent = txt || ''; }

  function playKey(key) {
    var src = srcFor(key);
    lastError = false;
    au.src = src;
    setNow('يُشغَّل: ' + (titles[key] || key));
    var p = au.play();
    if (p && p.catch) p.catch(function () { onFail(key); });
  }
  function onFail(key) {
    lastError = true;
    chain = false;
    setNow('الصوت غير متاح لهذا القسم بعد (' + (titles[key] || key) + ').');
    allBtn.textContent = '▶ استماع كامل للصفحة';
  }
  function nextInChain() {
    if (!chain) return;
    chainIndex++;
    if (chainIndex >= keys.length) { chain = false; chainIndex = -1; setNow('انتهى الاستماع الكامل.'); allBtn.textContent = '▶ استماع كامل للصفحة'; return; }
    playKey(keys[chainIndex]);
  }

  allBtn.addEventListener('click', function () {
    if (chain) { chain = false; chainIndex = -1; au.pause(); allBtn.textContent = '▶ استماع كامل للصفحة'; setNow('أُوقف الاستماع الكامل.'); return; }
    chain = true; chainIndex = -1;
    allBtn.textContent = '⏸ إيقاف الاستماع الكامل';
    nextInChain();
  });

  au.addEventListener('ended', function () {
    if (chain) nextInChain();
  });
  au.addEventListener('error', function () {
    var k = currentKey();
    if (k) onFail(k);
  });

  /* ---- resume ---- */
  if (saved && saved.key && saved.time > 3 && keys.indexOf(saved.key) > -1) {
    var mm = Math.floor(saved.time / 60), ss = Math.floor(saved.time % 60);
    resumeBtn.hidden = false;
    resumeBtn.textContent = 'أكمل «' + (titles[saved.key] || saved.key) + '» من ' + mm + ':' + (ss < 10 ? '0' : '') + ss;
    resumeBtn.addEventListener('click', function () {
      var src = srcFor(saved.key, saved.src);
      au.src = src;
      au.addEventListener('loadedmetadata', function once() {
        au.removeEventListener('loadedmetadata', once);
        try { au.currentTime = saved.time; } catch (e) {}
        au.play();
      });
      if (bar) bar.classList.add('on');
      document.body.classList.add('pl-on');
      setNow('أكمل من: ' + (titles[saved.key] || saved.key));
      resumeBtn.hidden = true;
    });
  }

  var saveTimer = null;
  function remember() {
    var k = currentKey();
    if (!k || !au.currentTime || lastError) return;
    store.set({ key: k, time: au.currentTime, src: au.getAttribute('src') || '' });
  }
  au.addEventListener('timeupdate', function () {
    if (saveTimer) return;
    saveTimer = setTimeout(function () { saveTimer = null; remember(); }, 3000);
  });
  window.addEventListener('pagehide', remember);
  au.addEventListener('pause', remember);

  /* ---- remembered speed ---- */
  var rates = [1, 1.25, 1.5, 0.85];
  var spBtn = document.getElementById('sp');
  if (spBtn) {
    var rate = parseFloat(localStorage.getItem('pa.listen.rate') || '1');
    if (rate && rates.indexOf(rate) === -1) rate = 1;
    au.playbackRate = rate;
    spBtn.textContent = rate + '×';
    spBtn.addEventListener('click', function () {
      setTimeout(function () {
        try { localStorage.setItem('pa.listen.rate', String(au.playbackRate)); } catch (e) {}
      }, 0);
    });
  }

  /* ---- keyboard ---- */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (e.code === 'Space') { e.preventDefault(); if (au.paused) au.play(); else au.pause(); }
    else if (e.key === 'ArrowRight') { au.currentTime = Math.min(au.duration || 1e9, au.currentTime + 10); }
    else if (e.key === 'ArrowLeft') { au.currentTime = Math.max(0, au.currentTime - 10); }
  });

  /* ---- media session (lock screen / headphones) ---- */
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', function () { au.play(); });
      navigator.mediaSession.setActionHandler('pause', function () { au.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', function () {
        var k = currentKey(), i = keys.indexOf(k);
        if (i > 0) playKey(keys[i - 1]);
      });
      navigator.mediaSession.setActionHandler('nexttrack', function () {
        var k = currentKey(), i = keys.indexOf(k);
        if (i > -1 && i < keys.length - 1) playKey(keys[i + 1]);
      });
    } catch (e) {}
  }
  au.addEventListener('play', function () {
    var k = currentKey();
    if ('mediaSession' in navigator && k) {
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: titles[k] || k,
          artist: 'بر عنخ · PER ANKH',
          album: document.title || 'بر عنخ'
        });
      } catch (e) {}
    }
    setNow('يُشغَّل: ' + (titles[k] || ''));
  });
})();
