/* Per Ankh · Digital Archaeology Lab
   Educational 3D models built only from documented measurements.
   Every figure shown in the facts panel is cited to its source.
   Shapes without a documented dimension are labelled schematic. */
(function () {
  var canvas = document.getElementById('lab3d');
  if (!canvas || !window.THREE) return;
  var T = THREE;

  var scene = new T.Scene();
  scene.background = new T.Color(0x081726);
  scene.fog = new T.Fog(0x081726, 900, 2600);

  var camera = new T.PerspectiveCamera(45, 1, 0.5, 6000);
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene.add(new T.HemisphereLight(0xdff0ff, 0x1a2b3a, 0.85));
  var key = new T.DirectionalLight(0xffe6b8, 1.15);
  key.position.set(320, 520, 260);
  scene.add(key);
  var rim = new T.DirectionalLight(0x8fd0e0, 0.45);
  rim.position.set(-260, 180, -320);
  scene.add(rim);

  var group = new T.Group();
  scene.add(group);

  function mat(color, opts) {
    opts = opts || {};
    return new T.MeshStandardMaterial({
      color: color,
      roughness: opts.roughness === undefined ? 0.85 : opts.roughness,
      metalness: opts.metalness === undefined ? 0.05 : opts.metalness,
      flatShading: !!opts.flat,
      transparent: !!opts.opacity,
      opacity: opts.opacity || 1,
      side: opts.side || T.FrontSide
    });
  }
  var STONE = mat(0xd8c9a8, { flat: true });
  var STONE_DARK = mat(0x9c8b6b, { flat: true });
  var CUT = mat(0x2f6b7a, { opacity: 0.42, roughness: 0.6 });
  var GOLD = mat(0xe2b457, { roughness: 0.45, metalness: 0.25 });
  var GLOW = new T.MeshStandardMaterial({ color: 0xf0c86a, emissive: 0xd99b2e, emissiveIntensity: 0.9, roughness: 0.5 });
  var GRANITE = mat(0xa8543f, { flat: true, roughness: 0.9 });
  var GROUND = mat(0x0e2233, { roughness: 1 });
  var SHELL = mat(0xe6d6b2, { flat: true, roughness: .8, opacity: .46 });
  SHELL.depthWrite = false;

  function base(w, d) {
    var g = new T.Mesh(new T.BoxGeometry(w, Math.max(2, w * 0.006), d), GROUND);
    g.position.y = -Math.max(2, w * 0.006) / 2;
    return g;
  }
  function squarePyramid(side, height, material) {
    // square pyramid: 4 radial segments, radius = half diagonal
    var geo = new T.CylinderGeometry(0.001, (side / 2) * Math.SQRT2, height, 4, 1, false);
    var m = new T.Mesh(geo, material);
    m.rotation.y = Math.PI / 4;
    m.position.y = height / 2;
    return m;
  }
  function frustum(sideBottom, sideTop, height, material) {
    var geo = new T.CylinderGeometry((sideTop / 2) * Math.SQRT2, (sideBottom / 2) * Math.SQRT2, height, 4, 1, false);
    var m = new T.Mesh(geo, material);
    m.rotation.y = Math.PI / 4;
    m.position.y = height / 2;
    return m;
  }

  /* ---------- models ---------- */

  // 1. Khufu: original height 147 m, base 230 m, slope 51.87° (Britannica)
  function buildPyramid() {
    var g = new T.Group();
    var baseSide = 230, original = 147, present = 137;
    var body = squarePyramid(baseSide, original, SHELL);
    body.position.y = original / 2;
    g.add(body);

    // present-day height shown as a lighter cap line, not a second solid
    var capEdge = new T.Mesh(new T.BoxGeometry(baseSide * 0.02, 1.4, baseSide * 0.02), GOLD);
    capEdge.position.set(0, present, 0);
    g.add(capEdge);

    // cut-away: descending passage, grand gallery, king's chamber (schematic layout)
    var cut = new T.Group();
    var passage = new T.Mesh(new T.BoxGeometry(3.4, 2.6, 46), GLOW);
    passage.position.set(0, 12, 62);
    passage.rotation.x = -0.62;
    cut.add(passage);
    var gallery = new T.Mesh(new T.BoxGeometry(3.6, 8.6, 47), GLOW);
    gallery.position.set(0, 42, -6);
    gallery.rotation.x = 0.62;
    cut.add(gallery);
    var chamber = new T.Mesh(new T.BoxGeometry(10.5, 5.8, 5.2), mat(0x2f6b7a, {opacity:.85}));
    chamber.position.set(0, 43, -32);
    cut.add(chamber);
    var sarc = new T.Mesh(new T.BoxGeometry(3.2, 1.6, 1.6), GOLD);
    sarc.position.set(0, 41, -32);
    cut.add(sarc);
    g.add(cut);

    g.add(base(300, 300));
    return { obj: g, dist: 520, label: 'هرم خوفو' };
  }

  // 2. Karnak hypostyle hall: ~5,000 m², 134 pillars, 12 nave columns ~24 m (Britannica)
  function buildHypostyle() {
    var g = new T.Group();
    var W = 100, D = 50, naveH = 24, aisleH = 13.5;
    var floor = new T.Mesh(new T.BoxGeometry(W, 1.2, D), GROUND);
    floor.position.y = 0.6;
    g.add(floor);

    var naveCols = 12, aisleRows = 7, perRow = Math.round((134 - naveCols) / (aisleRows * 2));
    var colGeoNave = new T.CylinderGeometry(1.55, 1.75, naveH, 14);
    var colGeoAisle = new T.CylinderGeometry(1.05, 1.25, aisleH, 12);
    var i, j;
    // two central rows of 6 = 12 nave columns
    for (i = 0; i < naveCols; i++) {
      var side = i % 2 === 0 ? -1 : 1;
      var m = new T.Mesh(colGeoNave, STONE);
      m.position.set(side * 5.2, naveH / 2, -D / 2 + 4 + Math.floor(i / 2) * ((D - 8) / 5));
      g.add(m);
    }
    // side aisles
    for (j = 0; j < aisleRows; j++) {
      for (i = 0; i < perRow * 2; i++) {
        var z = -D / 2 + 3 + (i % perRow) * ((D - 6) / (perRow - 1));
        var x = (j + 1) * 6.1;
        [-x, x].forEach(function (px) {
          var c = new T.Mesh(colGeoAisle, STONE_DARK);
          c.position.set(px, aisleH / 2, z);
          g.add(c);
        });
      }
    }
    // clerestory roof over the nave only
    var roof = new T.Mesh(new T.BoxGeometry(13, 1.1, D - 4), STONE_DARK);
    roof.position.set(0, naveH + 0.6, 0);
    g.add(roof);
    g.add(base(W + 24, D + 24));
    return { obj: g, dist: 210, label: 'قاعة الأعمدة الكبرى' };
  }

  // 3. Lateran obelisk (Thutmose III): 32 m tall, base 2.7 m, top 1.88 m (Britannica)
  function buildObelisk() {
    var g = new T.Group();
    var shaft = frustum(2.7, 1.88, 29.4, GRANITE);
    g.add(shaft);
    var cap = frustum(1.88, 0.05, 2.6, GOLD);
    cap.position.y = 29.4;
    g.add(cap);
    var plinth = new T.Mesh(new T.BoxGeometry(4.6, 2.2, 4.6), STONE_DARK);
    plinth.position.y = -1.1;
    g.add(plinth);
    g.add(base(26, 26));
    return { obj: g, dist: 74, label: 'مسلة لاتيران' };
  }

  // 4. mastaba -> step pyramid: Djoser step pyramid ~61 m, six tiers (Britannica)
  function buildMastaba() {
    var g = new T.Group();
    // schematic mastaba (no documented dimensions for this shape; labelled as such)
    var mas = new T.Group();
    var body = frustum(26, 21, 7.5, STONE);
    mas.add(body);
    var chapel = new T.Mesh(new T.BoxGeometry(4.2, 3.4, 6), STONE_DARK);
    chapel.position.set(0, 1.7, 12.4);
    mas.add(chapel);
    mas.position.x = -46;
    g.add(mas);

    // step pyramid: six tiers, total 61 m
    var steps = 6, totalH = 61, baseSide = 62, side = baseSide;
    for (var i = 0; i < steps; i++) {
      var h = totalH / steps;
      var tier = frustum(side, side * 0.86, h, i % 2 ? STONE_DARK : STONE);
      tier.position.set(0, i * h, 0);
      g.add(tier);
      side *= 0.86;
    }
    g.add(base(150, 110));
    return { obj: g, dist: 190, label: 'من المصطبة إلى الهرم' };
  }

  var BUILDERS = { pyramid: buildPyramid, hypostyle: buildHypostyle, obelisk: buildObelisk, mastaba: buildMastaba };

  var FACTS = {
    pyramid: {
      title: 'هرم خوفو · مقطع تعليمي',
      note: 'الشكل الخارجي والأبعاد موثّقة؛ أما تخطيط الممرات والغرف فمبسّط للتوضيح ولا يقيس المسافات الداخلية.',
      rows: [
        ['الارتفاع الأصلي', 'نحو 147 م (482 قدمًا)'],
        ['الارتفاع الحالي', 'نحو 137 م (449 قدمًا)'],
        ['طول ضلع القاعدة', 'نحو 230 م (755 قدمًا)'],
        ['زاوية ميل الأوجه', '51.87°'],
        ['عدد الكتل الحجرية', 'نحو 2.3 مليون كتلة']
      ],
      src: [['Britannica — Great Pyramid of Giza', 'https://www.britannica.com/topic/Great-Pyramid-of-Giza']]
    },
    hypostyle: {
      title: 'قاعة الأعمدة الكبرى · الكرنك',
      note: 'المساحة وعدد الأعمدة وارتفاع أعمدة الصحن موثّقة. ارتفاع أعمدة الأروقة الجانبية غير مذكور في المصدر، فالنموذج يعرضها أدنى من الصحن دون ادعاء قياس.',
      rows: [
        ['مساحة القاعة', 'نحو 5,000 م² (54,000 قدم²)'],
        ['عدد الأعمدة', '134 عمودًا'],
        ['أعمدة الصحن الوسطي', '12 عمودًا، ارتفاعها نحو 24 م'],
        ['الموضع', 'بين الصرحين الثاني والثالث']
      ],
      src: [['Britannica — Karnak', 'https://www.britannica.com/topic/Karnak']]
    },
    obelisk: {
      title: 'مسلة لاتيران · تحتمس الثالث',
      note: 'أكبر مسلة مصرية قديمة قائمة، نُقلت إلى روما وتقف اليوم في ساحة لاتيران. النسب في النموذج مأخوذة من القياسات أدناه.',
      rows: [
        ['الارتفاع', 'نحو 32 م (105 أقدام)'],
        ['ضلع القاعدة', 'نحو 2.7 م (9 أقدام)'],
        ['ضلع القمة', 'نحو 1.88 م (6 أقدام وبوصتان)'],
        ['الوزن', 'نحو 230 طنًا']
      ],
      src: [['Britannica — Obelisk', 'https://www.britannica.com/technology/obelisk']]
    },
    mastaba: {
      title: 'من المصطبة إلى الهرم',
      note: 'الهرم المدرّج لزوسر: ست طبقات وارتفاع نحو 61 م، وهي أبعاد موثّقة. أما المصطبة فمعروضة بشكل تخطيطي لأن المصدر لا يذكر لها قياسات، وضلع قاعدة الهرم تقريبي في النموذج.',
      rows: [
        ['الهرم المدرّج · الارتفاع', 'نحو 61 م (200 قدم)'],
        ['الهرم المدرّج · الطبقات', 'ست طبقات'],
        ['المصطبة', 'شكل تخطيطي بلا قياسات موثّقة']
      ],
      src: [['Britannica — Step Pyramid of Djoser', 'https://www.britannica.com/topic/Step-Pyramid-of-Djoser']]
    }
  };

  var state = { model: 'pyramid', rotY: -0.55, rotX: 0.22, dist: 520, target: 520, auto: true };
  var factsEl = document.getElementById('lab3dFacts');

  function renderFacts(name) {
    if (!factsEl) return;
    var f = FACTS[name];
    if (!f) return;
    var html = '<h3>' + f.title + '</h3><p class="lab3d-note">' + f.note + '</p><table class="lab3d-table"><tbody>';
    f.rows.forEach(function (r) {
      html += '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td></tr>';
    });
    html += '</tbody></table><p class="lab3d-src"><b>المصدر</b> ';
    html += f.src.map(function (s) {
      return '<a href="' + s[1] + '" target="_blank" rel="noopener">' + s[0] + ' ↗</a>';
    }).join(' · ');
    html += '</p>';
    factsEl.innerHTML = html;
  }

  function setModel(name) {
    if (!BUILDERS[name]) return;
    while (group.children.length) {
      var c = group.children.pop();
      group.remove(c);
    }
    var built = BUILDERS[name]();
    group.add(built.obj);
    state.model = name;
    state.dist = built.dist;
    state.target = built.dist;
    renderFacts(name);
    document.querySelectorAll('.lab3d-tab').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-model') === name);
      b.setAttribute('aria-selected', b.getAttribute('data-model') === name ? 'true' : 'false');
    });
  }

  function resize() {
    var w = canvas.clientWidth || canvas.parentNode.clientWidth || 640;
    var h = canvas.clientHeight || Math.round(w * 0.62);
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function frame() {
    resize();
    state.dist += (state.target - state.dist) * 0.12;
    if (state.auto) state.rotY += 0.0022;
    var r = state.dist;
    camera.position.set(Math.sin(state.rotY) * Math.cos(state.rotX) * r, Math.sin(state.rotX) * r + r * 0.12, Math.cos(state.rotY) * Math.cos(state.rotX) * r);
    camera.lookAt(0, state.model === 'obelisk' ? 16 : 22, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  var drag = null;
  canvas.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY };
    state.auto = false;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    state.rotY -= (e.clientX - drag.x) * 0.007;
    state.rotX = Math.max(-0.15, Math.min(1.15, state.rotX + (e.clientY - drag.y) * 0.005));
    drag = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointerup', function () { drag = null; });
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    state.target = Math.max(28, Math.min(1400, state.target * (e.deltaY > 0 ? 1.12 : 0.89)));
    state.auto = false;
  }, { passive: false });

  document.querySelectorAll('.lab3d-tab').forEach(function (b) {
    b.addEventListener('click', function () {
      setModel(b.getAttribute('data-model'));
      state.rotX = 0.22;
      state.auto = true;
    });
  });
  var reset = document.getElementById('lab3dReset');
  if (reset) reset.addEventListener('click', function () {
    state.rotY = -0.55; state.rotX = 0.22; state.auto = true;
    var d = BUILDERS[state.model]().dist;
    state.target = d; state.dist = d;
  });

  var wanted = null;
  try {
    wanted = new URLSearchParams(location.search).get('model');
    if (!wanted && location.hash.indexOf('model=') > -1) wanted = location.hash.split('model=')[1].split('&')[0];
  } catch (e) {}
  setModel(BUILDERS[wanted] ? wanted : 'pyramid');
  frame();

  /* ---------- 360 panorama slots ---------- */
  document.querySelectorAll('.pano').forEach(function (slot) {
    var src = slot.getAttribute('data-src');
    if (!src) return;
    var probe = new Image();
    probe.onload = function () {
      slot.style.backgroundImage = 'url("' + src + '")';
      slot.classList.add('has-img');
      var empty = slot.querySelector('.pano-empty');
      if (empty) empty.remove();
      var x = 50, down = null;
      slot.addEventListener('pointerdown', function (e) { down = e.clientX; slot.setPointerCapture && slot.setPointerCapture(e.pointerId); });
      slot.addEventListener('pointermove', function (e) {
        if (down === null) return;
        x = Math.max(0, Math.min(100, x + (down - e.clientX) * 0.06));
        slot.style.backgroundPosition = x + '% 50%';
        down = e.clientX;
      });
      window.addEventListener('pointerup', function () { down = null; });
    };
    probe.src = src;
  });
})();
