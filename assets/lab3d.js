/* Per Ankh · Digital Archaeology Lab (v2)
   Educational 3D models built only from documented measurements.
   Every figure in the facts panel and every hotspot is cited to its source.
   Shapes without a documented dimension are labelled schematic in the panel. */
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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  if ('outputEncoding' in renderer) renderer.outputEncoding = T.sRGBEncoding;

  var hemi = new T.HemisphereLight(0xdff0ff, 0x1a2b3a, 0.85);
  scene.add(hemi);
  var key = new T.DirectionalLight(0xffe6b8, 1.2);
  key.position.set(320, 520, 260);
  key.castShadow = true;
  key.shadow.mapSize.width = 1024;
  key.shadow.mapSize.height = 1024;
  key.shadow.camera.left = -260; key.shadow.camera.right = 260;
  key.shadow.camera.top = 260; key.shadow.camera.bottom = -260;
  key.shadow.camera.near = 1; key.shadow.camera.far = 1600;
  key.shadow.bias = -0.0008;
  scene.add(key);
  var rim = new T.DirectionalLight(0x8fd0e0, 0.45);
  rim.position.set(-260, 180, -320);
  scene.add(rim);
  var sunBeam = new T.SpotLight(0xffd9a0, 0.0, 900, 0.22, 0.4, 1.4);
  sunBeam.position.set(0, 120, 420);
  sunBeam.target.position.set(0, 30, -120);
  scene.add(sunBeam); scene.add(sunBeam.target);

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
  var GOLD = mat(0xe2b457, { roughness: 0.42, metalness: 0.3 });
  var GLOW = new T.MeshStandardMaterial({ color: 0xf0c86a, emissive: 0xd99b2e, emissiveIntensity: 0.85, roughness: 0.5 });
  var GLOW_SOFT = new T.MeshStandardMaterial({ color: 0x6fd3c4, emissive: 0x2b8f86, emissiveIntensity: 0.7, roughness: 0.6, transparent: true, opacity: 0.92 });
  var GRANITE = mat(0xa8543f, { flat: true, roughness: 0.9 });
  var GROUND = mat(0x0e2233, { roughness: 1 });
  var SHELL = mat(0xe6d6b2, { flat: true, roughness: .8, opacity: .42 });
  SHELL.depthWrite = false;
  var HUMAN = mat(0x55c4b5, { roughness: 0.6, metalness: 0.1 });

  function shadowOn(obj) {
    obj.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return obj;
  }
  function base(w, d) {
    var g = new T.Mesh(new T.BoxGeometry(w, Math.max(2, w * 0.006), d), GROUND);
    g.position.y = -Math.max(2, w * 0.006) / 2;
    g.receiveShadow = true;
    return g;
  }
  function squarePyramid(side, height, material) {
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
  // human figure, 1.7 m tall, for scale (height is the only documented figure: average adult height is not a source claim, so it is labelled as a scale figure)
  function human(x, z) {
    var g = new T.Group();
    var body = new T.Mesh(new T.CylinderGeometry(0.28, 0.34, 1.15, 10), HUMAN);
    body.position.y = 0.85;
    var head = new T.Mesh(new T.SphereGeometry(0.22, 12, 10), HUMAN);
    head.position.y = 1.58;
    g.add(body, head);
    g.position.set(x, 0, z);
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; } });
    return g;
  }

  /* ---------- 1. Khufu ----------
     Cited: base 230 m, original 147 m, present 137 m, slope 51.87°, ~2.3M blocks, ~5.75M tons,
     entrance ~18 m up the north side, Grand Gallery 46 m long, King's Chamber granite with two shafts,
     five relieving compartments above it, subterranean chambers never finished (Britannica). */
  function buildPyramid() {
    var g = new T.Group();
    var baseSide = 230, original = 147, present = 137;

    var shell = new T.Group();
    var body = squarePyramid(baseSide, original, SHELL);
    body.position.y = original / 2;
    shell.add(body);
    // casing line at present-day height (147 -> 137 m, cited)
    var capEdge = new T.Mesh(new T.BoxGeometry(baseSide * 0.02, 1.2, baseSide * 0.02), GOLD);
    capEdge.position.y = present;
    shell.add(capEdge);
    g.add(shell);

    var cut = new T.Group();
    // descending corridor from the entrance (~18 m up the north face, cited) down to the rock
    var desc = new T.Mesh(new T.BoxGeometry(3.2, 2.4, 74), GLOW_SOFT);
    desc.position.set(0, 4, 78);
    desc.rotation.x = -0.55;
    cut.add(desc);
    // unfinished subterranean chamber (cited as never completed; size schematic)
    var sub = new T.Mesh(new T.BoxGeometry(14, 5, 12), GLOW_SOFT);
    sub.position.set(0, -26, 44);
    cut.add(sub);
    // ascending passage up to the Grand Gallery (Grand Gallery length 46 m, cited)
    var asc = new T.Mesh(new T.BoxGeometry(3.2, 2.4, 46), GLOW_SOFT);
    asc.position.set(0, 14, 30);
    asc.rotation.x = 0.5;
    cut.add(asc);
    // Queen's Chamber (position schematic, horizontal passage cited)
    var queen = new T.Mesh(new T.BoxGeometry(9, 4.4, 8), GLOW_SOFT);
    queen.position.set(0, 24, -2);
    cut.add(queen);
    // Grand Gallery: 46 m long, corbelled (length cited; width/height schematic)
    var gallery = new T.Mesh(new T.BoxGeometry(4.2, 8.6, 46), GLOW);
    gallery.position.set(0, 44, -14);
    gallery.rotation.x = 0.52;
    cut.add(gallery);
    // King's Chamber: granite-lined (cited); sarcophagus + five relieving compartments above (cited)
    var king = new T.Mesh(new T.BoxGeometry(10.4, 5.8, 5.4), mat(0xa8543f, { opacity: .92 }));
    king.position.set(0, 60, -34);
    cut.add(king);
    var sarc = new T.Mesh(new T.BoxGeometry(3.2, 1.5, 1.6), GOLD);
    sarc.position.set(0, 58, -34);
    cut.add(sarc);
    for (var i = 0; i < 5; i++) {
      var slab = new T.Mesh(new T.BoxGeometry(11, 0.7, 6), STONE_DARK);
      slab.position.set(0, 64 + i * 2.4, -34);
      cut.add(slab);
    }
    // two shafts from the King's Chamber (purpose unknown, cited as such)
    [-1, 1].forEach(function (s) {
      var shaft = new T.Mesh(new T.BoxGeometry(0.9, 0.9, 46), GLOW);
      shaft.position.set(s * 3.2, 74, -18);
      shaft.rotation.x = -0.62;
      shaft.rotation.z = s * 0.12;
      cut.add(shaft);
    });
    g.add(cut);
    g.add(base(320, 320));
    var h = human(34, 132);
    g.add(h);
    return { obj: g, dist: 520, label: 'هرم خوفو', explode: [shell], interior: { pos: [0, 62, 6], look: [0, 60, -34] } };
  }

  /* ---------- 2. Karnak hypostyle ----------
     Cited: ~5,000 m², 134 pillars, 12 nave columns ~24 m (Britannica). */
  function buildHypostyle() {
    var g = new T.Group();
    var W = 100, D = 50, naveH = 24, aisleH = 13.5;
    var floor = new T.Mesh(new T.BoxGeometry(W, 1.2, D), GROUND);
    floor.position.y = 0.6;
    floor.receiveShadow = true;
    g.add(floor);

    var naveCols = 12, aisleRows = 7, perRow = Math.round((134 - naveCols) / (aisleRows * 2));
    var colGeoNave = new T.CylinderGeometry(1.55, 1.75, naveH, 16);
    var colGeoAisle = new T.CylinderGeometry(1.05, 1.25, aisleH, 12);
    var i, j;
    var naveGroup = new T.Group();
    for (i = 0; i < naveCols; i++) {
      var side = i % 2 === 0 ? -1 : 1;
      var m = new T.Mesh(colGeoNave, STONE);
      m.position.set(side * 5.2, naveH / 2, -D / 2 + 4 + Math.floor(i / 2) * ((D - 8) / 5));
      // papyrus-bud capital (shape schematic; no documented capital dimensions)
      var cap = new T.Mesh(new T.CylinderGeometry(2.6, 1.7, 2.2, 16), STONE_DARK);
      cap.position.set(m.position.x, naveH + 0.6, m.position.z);
      naveGroup.add(m, cap);
    }
    g.add(naveGroup);

    var aisles = new T.Group();
    for (j = 0; j < aisleRows; j++) {
      for (i = 0; i < perRow * 2; i++) {
        var z = -D / 2 + 3 + (i % perRow) * ((D - 6) / (perRow - 1));
        var x = (j + 1) * 6.1;
        [-x, x].forEach(function (px) {
          var c = new T.Mesh(colGeoAisle, STONE_DARK);
          c.position.set(px, aisleH / 2, z);
          aisles.add(c);
        });
      }
    }
    g.add(aisles);

    var roof = new T.Mesh(new T.BoxGeometry(13, 1.1, D - 4), STONE_DARK);
    roof.position.set(0, naveH + 1.9, 0);
    g.add(roof);
    g.add(base(W + 24, D + 24));
    g.add(human(44, 18));
    return { obj: g, dist: 210, label: 'قاعة الأعمدة الكبرى', explode: [roof, naveGroup], interior: { pos: [0, 8, 26], look: [0, 14, -10] } };
  }

  /* ---------- 3. Lateran obelisk ----------
     Cited: 32 m tall, base 2.7 m, top 1.88 m, ~230 tons (Britannica). */
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
    g.add(human(4.2, 2.4));
    return { obj: g, dist: 74, label: 'مسلة لاتيران', explode: [cap], interior: null };
  }

  /* ---------- 4. mastaba -> step pyramid ----------
     Cited: Djoser step pyramid six tiers, ~61 m; enclosure wall over 1.6 km long, originally 11 m high (Britannica).
     The mastaba and the pyramid's base side are schematic. */
  function buildMastaba() {
    var g = new T.Group();
    var mas = new T.Group();
    var body = frustum(26, 21, 7.5, STONE);
    mas.add(body);
    var chapel = new T.Mesh(new T.BoxGeometry(4.2, 3.4, 6), STONE_DARK);
    chapel.position.set(0, 1.7, 12.4);
    mas.add(chapel);
    mas.position.x = -46;
    g.add(mas);

    var steps = 6, totalH = 61, baseSide = 62, side = baseSide;
    var stepGroup = new T.Group();
    for (var i = 0; i < steps; i++) {
      var hh = totalH / steps;
      var tier = frustum(side, side * 0.86, hh, i % 2 ? STONE_DARK : STONE);
      tier.position.set(0, i * hh, 0);
      stepGroup.add(tier);
      side *= 0.86;
    }
    g.add(stepGroup);

    // enclosure wall: over 1.6 km long, originally 11 m high (cited) - shown as a partial segment, length not to scale
    var wall = new T.Mesh(new T.BoxGeometry(150, 11, 2.4), STONE_DARK);
    wall.position.set(0, 5.5, 62);
    g.add(wall);
    var wall2 = new T.Mesh(new T.BoxGeometry(2.4, 11, 130), STONE_DARK);
    wall2.position.set(-74, 5.5, -2);
    g.add(wall2);
    g.add(base(190, 150));
    g.add(human(34, 40));
    return { obj: g, dist: 190, label: 'من المصطبة إلى الهرم', explode: [mas, stepGroup], interior: null };
  }

  var BUILDERS = { pyramid: buildPyramid, hypostyle: buildHypostyle, obelisk: buildObelisk, mastaba: buildMastaba };

  /* ---------- hotspots: every one carries its source line ---------- */
  var HOTSPOTS = {
    pyramid: [
      { p: [0, 20, 116], t: 'المدخل', d: 'المدخل في الجهة الشمالية على ارتفاع نحو 18 مترًا من سطح الأرض.', s: 'Britannica' },
      { p: [0, 46, -14], t: 'الممر الصاعد الكبير', d: 'ممر مسقوف بطريقة «الحضن» (corbel)، طوله 46 مترًا.', s: 'Britannica' },
      { p: [0, 62, -34], t: 'حجرة الدفن الملكية', d: 'مبطّنة بالجرانيت بالكامل، وفوقها خمس حجرات فاصلة من ألواح جرانيتية أفقيّة لتخفيف الثقل.', s: 'Britannica' },
      { p: [4, 76, -18], t: 'بئر تهوية', d: 'بئران ضيّقان ينفذان من الحجرة إلى خارج البناء؛ الغرض منهما غير معروف، دينيًا كان أو للتهوية.', s: 'Britannica' },
      { p: [0, -22, 44], t: 'الحجرة الأرضية', d: 'الحجرات تحت الأرض لم تُكتمل، ويصفها المصدر بأنها غير منتهية.', s: 'Britannica' }
    ],
    hypostyle: [
      { p: [0, 26, -6], t: 'الصحن الوسطي', d: '12 عمودًا في صفّين، ارتفاعها نحو 24 مترًا، والسقف فوقها أعلى من سقف الأروقة.', s: 'Britannica' },
      { p: [-30, 8, 10], t: 'الأروقة الجانبية', d: '134 عمودًا في القاعة كلها، بينها أعمدة الصحن؛ ارتفاع أعمدة الأروقة غير مذكور في المصدر.', s: 'Britannica' },
      { p: [0, 25.5, 20], t: 'الرواق الأعلى', d: 'فتحات الإضاءة بين سقف الصحن وسقف الأروقة هي ما يُسمى «الرواق الأعلى» (clerestory).', s: 'Britannica' },
      { p: [40, 2, 20], t: 'المساحة', d: 'مساحة القاعة نحو 5,000 م² (54,000 قدم²).', s: 'Britannica' }
    ],
    obelisk: [
      { p: [0, 2, 2], t: 'القاعدة', d: 'ضلع القاعدة نحو 2.7 مترًا، والارتفاع الكلي نحو 32 مترًا.', s: 'Britannica' },
      { p: [0, 31, 1], t: 'القمة', d: 'ضلع القمة نحو 1.88 مترًا، والوزن نحو 230 طنًا.', s: 'Britannica' }
    ],
    mastaba: [
      { p: [0, 62, 0], t: 'هرم زوسر', d: 'ست طبقات، ارتفاعها نحو 61 مترًا، وهي أبعاد موثّقة.', s: 'Britannica' },
      { p: [0, 12, 62], t: 'السور', d: 'سور المجموعة يزيد طوله على 1.6 كيلومتر وكان ارتفاعه الأصلي 11 مترًا؛ القطاع المعروض جزء منه لا الطول كله.', s: 'Britannica' },
      { p: [-46, 8, 0], t: 'المصطبة', d: 'شكل تخطيطي بلا قياسات موثّقة؛ يُعرض للمقارنة مع الهرم المدرّج.', s: 'مخطط' }
    ]
  };

  var FACTS = {
    pyramid: {
      title: 'هرم خوفو · مقطع داخلي',
      note: 'الأبعاد الخارجية والممرات المذكورة موثّقة من المصدر. أما مقاسات الحجرات وأطوال الممرات غير المذكورة، وأي تفصيل داخلي آخر، فمبسّط للتوضيح ولا يقيس المسافات الفعلية.',
      rows: [
        ['الارتفاع الأصلي', 'نحو 147 م (482 قدمًا)'],
        ['الارتفاع الحالي', 'نحو 137 م (449 قدمًا)'],
        ['ضلع القاعدة', 'نحو 230 م (755 قدمًا)'],
        ['زاوية الميل', '51.87°'],
        ['الكتل الحجرية', 'نحو 2.3 مليون كتلة'],
        ['الوزن التقديري', 'نحو 5.75 مليون طن'],
        ['ارتفاع المدخل', 'نحو 18 م من الأرض'],
        ['الممر الصاعد الكبير', 'طوله 46 م'],
        ['مدة البناء التقديرية', 'نحو 20 سنة']
      ],
      src: [['Britannica — Great Pyramid of Giza', 'https://www.britannica.com/topic/Great-Pyramid-of-Giza']],
      ar: 'مرجع عربي للعمارة الجنائزية: عبد الحليم نور الدين، آثار وحضارة مصر القديمة، الجزء الأول.'
    },
    hypostyle: {
      title: 'قاعة الأعمدة الكبرى · الكرنك',
      note: 'المساحة وعدد الأعمدة وارتفاع أعمدة الصحن موثّقة. ارتفاع أعمدة الأروقة وشكل التيجان غير مذكورين بالقياس، فالنموذج يعرضهما تخطيطيًا.',
      rows: [
        ['المساحة', 'نحو 5,000 م² (54,000 قدم²)'],
        ['عدد الأعمدة', '134 عمودًا'],
        ['أعمدة الصحن', '12 عمودًا بارتفاع نحو 24 م'],
        ['الموضع', 'بين الصرحين الثاني والثالث']
      ],
      src: [['Britannica — Karnak', 'https://www.britannica.com/topic/Karnak']],
      ar: 'مرجع عربي: عبد الحليم نور الدين، آثار وحضارة مصر القديمة، الجزء الأول (الكرنك والأقصر).'
    },
    obelisk: {
      title: 'مسلة لاتيران · تحتمس الثالث',
      note: 'النسب في النموذج مأخوذة من القياسات أدناه؛ أما شكل القاعدة الحالية فمبسّط.',
      rows: [
        ['الارتفاع', 'نحو 32 م (105 أقدام)'],
        ['ضلع القاعدة', 'نحو 2.7 م (9 أقدام)'],
        ['ضلع القمة', 'نحو 1.88 م (6 أقدام وبوصتان)'],
        ['الوزن', 'نحو 230 طنًا']
      ],
      src: [['Britannica — Obelisk', 'https://www.britannica.com/technology/obelisk']]
    },
    mastaba: {
      title: 'من المصطبة إلى الهرم · سقارة',
      note: 'الهرم المدرّج لزوسر: ست طبقات وارتفاع نحو 61 م، وسور المجموعة موثّق الطول والارتفاع. أما المصطبة وضلع قاعدة الهرم وشكل السور المعروض فمخططة تخطيطيًا.',
      rows: [
        ['الهرم المدرّج · الارتفاع', 'نحو 61 م (200 قدم)'],
        ['الهرم المدرّج · الطبقات', 'ست طبقات'],
        ['السور · الطول', 'أكثر من 1.6 كم'],
        ['السور · الارتفاع الأصلي', 'نحو 11 م (34 قدمًا)'],
        ['المصطبة', 'شكل تخطيطي بلا قياسات']
      ],
      src: [['Britannica — Step Pyramid of Djoser', 'https://www.britannica.com/topic/Step-Pyramid-of-Djoser']]
    }
  };

  var state = { model: 'pyramid', rotY: -0.55, rotX: 0.22, dist: 520, target: 520, auto: true, night: false, explode: false, interior: false };
  var factsEl = document.getElementById('lab3dFacts');
  var hotLayer = document.getElementById('lab3dHot');
  var hotInfo = document.getElementById('lab3dHotInfo');
  var markers = [];
  var built = null;

  function renderFacts(name) {
    if (!factsEl) return;
    var f = FACTS[name];
    if (!f) return;
    var html = '<h3>' + f.title + '</h3><p class="lab3d-note">' + f.note + '</p><table class="lab3d-table"><tbody>';
    f.rows.forEach(function (r) { html += '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td></tr>'; });
    html += '</tbody></table><p class="lab3d-src"><b>المصدر</b> ';
    html += f.src.map(function (s) { return '<a href="' + s[1] + '" target="_blank" rel="noopener">' + s[0] + ' ↗</a>'; }).join(' · ');
    html += '</p>';
    if (f.ar) html += '<p class="lab3d-ar">' + f.ar + '</p>';
    factsEl.innerHTML = html;
    if (hotInfo) { hotInfo.hidden = true; hotInfo.innerHTML = ''; }
  }

  function clearGroup() {
    while (group.children.length) {
      var c = group.children.pop();
      group.remove(c);
    }
    markers = [];
    if (hotLayer) hotLayer.innerHTML = '';
  }

  function addHotspots(name) {
    var list = HOTSPOTS[name] || [];
    if (!hotLayer) return;
    list.forEach(function (hs, idx) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'lab3d-dot';
      dot.setAttribute('aria-label', hs.t);
      dot.innerHTML = '<i></i><span>' + hs.t + '</span>';
      dot.addEventListener('click', function () {
        if (!hotInfo) return;
        hotInfo.hidden = false;
        hotInfo.innerHTML = '<b>' + hs.t + '</b><p>' + hs.d + '</p><span class="lab3d-hot-src">المصدر: ' + hs.s + '</span>';
      });
      hotLayer.appendChild(dot);
      markers.push({ el: dot, p: new T.Vector3(hs.p[0], hs.p[1], hs.p[2]) });
    });
  }

  function setModel(name) {
    if (!BUILDERS[name]) return;
    clearGroup();
    built = BUILDERS[name]();
    shadowOn(built.obj);
    group.add(built.obj);
    state.model = name;
    state.dist = built.dist;
    state.target = built.dist;
    state.explode = false;
    state.interior = false;
    renderFacts(name);
    addHotspots(name);
    document.querySelectorAll('.lab3d-tab').forEach(function (b) {
      var on = b.getAttribute('data-model') === name;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    syncButtons();
  }

  function syncButtons() {
    var en = document.getElementById('lab3dNight');
    if (en) { en.classList.toggle('on', state.night); en.textContent = state.night ? '☾ ليل' : '☀ نهار'; }
    var ex = document.getElementById('lab3dExplode');
    if (ex) ex.classList.toggle('on', state.explode);
    var inn = document.getElementById('lab3dInside');
    if (inn) { inn.classList.toggle('on', state.interior); inn.disabled = !(built && built.interior); }
  }

  function applyLight() {
    if (state.night) {
      scene.background = new T.Color(0x02060c);
      scene.fog = new T.Fog(0x02060c, 700, 2400);
      hemi.color.set(0x2a4a66); hemi.groundColor.set(0x050b12); hemi.intensity = 0.3;
      key.color.set(0x9fc4ff); key.intensity = 0.35; key.position.set(-260, 420, -180);
      rim.color.set(0x4b7fbf); rim.intensity = 0.55;
      sunBeam.intensity = 0.0;
    } else {
      scene.background = new T.Color(0x081726);
      scene.fog = new T.Fog(0x081726, 900, 2600);
      hemi.color.set(0xdff0ff); hemi.groundColor.set(0x1a2b3a); hemi.intensity = 0.85;
      key.color.set(0xffe6b8); key.intensity = 1.2; key.position.set(320, 520, 260);
      rim.color.set(0x8fd0e0); rim.intensity = 0.45;
      sunBeam.intensity = 0.0;
    }
  }

  function applyExplode() {
    if (!built) return;
    var parts = built.explode || [];
    parts.forEach(function (p, i) {
      if (!p) return;
      if (p.userData.baseY === undefined) p.userData.baseY = p.position.y;
      p.position.y = p.userData.baseY + (state.explode ? 46 + i * 12 : 0);
    });
    if (built.obj) built.obj.traverse(function (o) {
      if (o.isMesh && o.material && o.material === SHELL) o.material.opacity = state.explode ? 0.16 : 0.42;
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

  var tmp = new T.Vector3();
  function placeMarkers() {
    if (!hotLayer) return;
    var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    markers.forEach(function (m) {
      tmp.copy(m.p).project(camera);
      var visible = tmp.z < 1 && tmp.z > -1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
      m.el.style.display = visible ? '' : 'none';
      if (!visible) return;
      m.el.style.transform = 'translate(-50%,-50%) translate(' + ((tmp.x * 0.5 + 0.5) * w).toFixed(1) + 'px,' + ((-tmp.y * 0.5 + 0.5) * h).toFixed(1) + 'px)';
    });
  }

  function frame() {
    resize();
    state.dist += (state.target - state.dist) * 0.12;
    if (state.auto) state.rotY += 0.0022;
    var r = state.dist;
    if (state.interior && built && built.interior) {
      camera.position.set(built.interior.pos[0], built.interior.pos[1], built.interior.pos[2]);
      camera.lookAt(built.interior.look[0], built.interior.look[1], built.interior.look[2]);
    } else {
      camera.position.set(Math.sin(state.rotY) * Math.cos(state.rotX) * r, Math.sin(state.rotX) * r + r * 0.12, Math.cos(state.rotY) * Math.cos(state.rotX) * r);
      camera.lookAt(0, state.model === 'obelisk' ? 16 : 22, 0);
    }
    renderer.render(scene, camera);
    placeMarkers();
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
    state.target = Math.max(24, Math.min(1400, state.target * (e.deltaY > 0 ? 1.12 : 0.89)));
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
    state.interior = false;
    var d = built ? built.dist : 520;
    state.target = d; state.dist = d;
    syncButtons();
  });
  var nightBtn = document.getElementById('lab3dNight');
  if (nightBtn) nightBtn.addEventListener('click', function () {
    state.night = !state.night; applyLight(); syncButtons();
  });
  var expBtn = document.getElementById('lab3dExplode');
  if (expBtn) expBtn.addEventListener('click', function () {
    state.explode = !state.explode; applyExplode(); syncButtons();
  });
  var inBtn = document.getElementById('lab3dInside');
  if (inBtn) inBtn.addEventListener('click', function () {
    if (!built || !built.interior) return;
    state.interior = !state.interior; state.auto = false; syncButtons();
  });

  var wanted = null;
  try {
    wanted = new URLSearchParams(location.search).get('model');
    if (!wanted && location.hash.indexOf('model=') > -1) wanted = location.hash.split('model=')[1].split('&')[0];
  } catch (e) {}
  applyLight();
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
