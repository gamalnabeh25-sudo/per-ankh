/* Per Ankh · Digital Archaeology Lab (v2)
   Educational 3D models built only from documented measurements.
   Every figure in the facts panel and every hotspot is cited to its source.
   Shapes without a documented dimension are labelled schematic in the panel. */
(function () {
  var canvas = document.getElementById('lab3d');
  if (!canvas || !window.THREE) return;
  var T = THREE;

  var scene = new T.Scene();
  scene.background = SKY_DAY;
  scene.fog = new T.Fog(0x081726, 900, 2600);

  var camera = new T.PerspectiveCamera(45, 1, 0.5, 6000);
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  if ('outputEncoding' in renderer) renderer.outputEncoding = T.sRGBEncoding;


  function skyTexture(top, bottom) {
    var c = document.createElement('canvas');
    c.width = 2; c.height = 256;
    var ctx = c.getContext('2d');
    var grd = ctx.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, top); grd.addColorStop(1, bottom);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 2, 256);
    var t = new T.CanvasTexture(c);
    if ('encoding' in t) t.encoding = T.sRGBEncoding;
    return t;
  }
  var SKY_DAY = skyTexture('#1c3f5c', '#0a1c2a');
  var SKY_NIGHT = skyTexture('#04080f', '#010306');

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
  var GLOW_SOFT = new T.MeshStandardMaterial({ color: 0xd8c6a0, emissive: 0x8a6420, emissiveIntensity: 0.45, roughness: 0.75 });
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
    g.userData.isBase = true;
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
    asc.position.set(0, 12, 28);
    asc.rotation.x = 0.45;
    cut.add(asc);
    // Queen's Chamber (position schematic, horizontal passage cited)
    var queen = new T.Mesh(new T.BoxGeometry(9, 4.4, 8), GLOW_SOFT);
    queen.position.set(0, 22, -2);
    cut.add(queen);
    // Grand Gallery: 46 m long, corbelled (length cited; width/height schematic)
    var gallery = new T.Mesh(new T.BoxGeometry(4.2, 8.6, 46), GLOW);
    gallery.position.set(0, 33, -12);
    gallery.rotation.x = 0.45;
    cut.add(gallery);
    // King's Chamber: granite-lined (cited); sarcophagus + five relieving compartments above (cited)
    var king = new T.Mesh(new T.BoxGeometry(10.4, 5.8, 5.4), mat(0xa8543f, { opacity: .92 }));
    king.position.set(0, 45, -34);
    cut.add(king);
    var sarc = new T.Mesh(new T.BoxGeometry(3.2, 1.5, 1.6), GOLD);
    sarc.position.set(0, 43.4, -34);
    cut.add(sarc);
    for (var i = 0; i < 5; i++) {
      var slab = new T.Mesh(new T.BoxGeometry(11, 0.7, 6), STONE_DARK);
      slab.position.set(0, 49 + i * 2.2, -34);
      cut.add(slab);
    }
    // two shafts from the King's Chamber (purpose unknown, cited as such)
    [-1, 1].forEach(function (s) {
      var shaft = new T.Mesh(new T.BoxGeometry(0.9, 0.9, 46), GLOW);
      shaft.position.set(s * 3.2, 56, -20);
      shaft.rotation.x = -0.62;
      shaft.rotation.z = s * 0.12;
      cut.add(shaft);
    });
    g.add(cut);
    g.add(base(320, 320));
    var h = human(34, 132);
    g.add(h);
    return {
      obj: g, dist: 520, label: 'هرم خوفو', explode: [shell],
      interior: { hideShell: true, stops: [
        { t: 'مقطع عام · الممرات والحجرات', pos: [132, 100, 140], look: [0, 6, 30] },
        { t: 'الممر الهابط والحجرة الأرضية', pos: [92, 34, 116], look: [0, -8, 60] },
        { t: 'الممر الصاعد الكبير وحجرة الملك', pos: [72, 66, 6], look: [0, 42, -30] }
      ] }
    };
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
    return {
      obj: g, dist: 210, label: 'قاعة الأعمدة الكبرى', explode: [roof, naveGroup],
      interior: { stops: [
        { t: 'الصحن الوسطي · 12 عمودًا', pos: [0, 8, 30], look: [0, 15, -10] },
        { t: 'الرواق الجانبي', pos: [-30, 6, 26], look: [-26, 9, -10] },
        { t: 'من أعلى · الرواق الأعلى', pos: [0, 46, 40], look: [0, 18, -8] }
      ] }
    };
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


  /* ---------- 5. Abu Simbel ----------
     Cited: four seated colossi 66 ft / 20 m; the temple consists of three halls extending 185 ft / 56 m into the cliff;
     the first rays of the morning sun reach the sanctuary on about 22 February and 22 October; the small Hathor temple
     north of it has 35 ft / 10.5 m statues (Britannica). Facade width, hall widths and colossus width are schematic. */
  function buildAbuSimbel() {
    var g = new T.Group();
    var facadeH = 33, facadeW = 38;           // schematic proportions
    var cliff = new T.Mesh(new T.BoxGeometry(120, facadeH + 26, 74), mat(0x8d6f4e, { flat: true, roughness: .95 }));
    cliff.position.set(0, (facadeH + 26) / 2 - 6, -37);
    g.add(cliff);

    // recessed facade frame
    var frame = new T.Mesh(new T.BoxGeometry(facadeW, facadeH, 1.6), mat(0xa8835c, { flat: true }));
    frame.position.set(0, facadeH / 2, 0.9);
    g.add(frame);

    // four seated colossi, 20 m tall (cited height; width and pose simplified)
    var colossi = new T.Group();
    [-1, 1].forEach(function (side) {
      [0, 1].forEach(function (row) {
        var c = new T.Group();
        var body = new T.Mesh(new T.BoxGeometry(6.4, 11, 5.4), STONE);
        body.position.y = 5.5;
        var legs = new T.Mesh(new T.BoxGeometry(7.4, 4.4, 7.2), STONE_DARK);
        legs.position.y = 2.2;
        var head = new T.Mesh(new T.BoxGeometry(3.4, 3.6, 3.4), STONE);
        head.position.y = 12.8;
        var crown = new T.Mesh(new T.CylinderGeometry(1.5, 2.1, 3.4, 10), GOLD);
        crown.position.y = 16.2;
        c.add(body, legs, head, crown);
        c.scale.setScalar(20 / 18.5);          // total height ~20 m
        c.position.set(side * (4.6 + row * 8.4), 0, 3.2);
        colossi.add(c);
      });
    });
    g.add(colossi);

    // entrance and three halls cut 56 m into the cliff (cited depth)
    var door = new T.Mesh(new T.BoxGeometry(3.4, 6.4, 1.2), mat(0x1b2b33));
    door.position.set(0, 3.2, 1.6);
    g.add(door);
    var halls = new T.Group();
    [0, 1, 2].forEach(function (i) {
      var h = new T.Mesh(new T.BoxGeometry(16 - i * 3, 9 - i * 1.6, 56 / 3 - 1.2), mat(0x6fa8b8, { opacity: .16, roughness: .7 }));
      h.position.set(0, 4.5 - i * 0.4, -6 - i * (56 / 3));
      halls.add(h);
    });
    g.add(halls);
    // first hall: rows of square pillars (the temple is described as decorated with Osiride statues of the king;
    // their number and spacing are not given in the source, so the rows are schematic)
    var pillars = new T.Group();
    for (var pi = 0; pi < 4; pi++) {
      [-1, 1].forEach(function (side) {
        var col = new T.Mesh(new T.BoxGeometry(2.2, 9, 2.2), STONE_DARK);
        col.position.set(side * 6.4, 4.5, -9 - pi * 4.6);
        pillars.add(col);
      });
    }
    g.add(pillars);
    var hallFloor = new T.Mesh(new T.BoxGeometry(18, 0.6, 56), mat(0x9c8b6b, { flat: true }));
    hallFloor.position.set(0, 0.3, -30);
    g.add(hallFloor);
    var hallRoof = new T.Mesh(new T.BoxGeometry(18, 0.8, 56), mat(0x6b5a44, { flat: true }));
    hallRoof.position.set(0, 9.4, -30);
    g.add(hallRoof);

    // side walls of the three halls, so the cutaway reads as an interior
    var hallWalls = new T.Group();
    [-1, 1].forEach(function (side) {
      var wl = new T.Mesh(new T.BoxGeometry(0.9, 9.4, 56), mat(0x7d6a4f, { flat: true, roughness: .95 }));
      wl.position.set(side * 8.9, 4.7, -30);
      hallWalls.add(wl);
    });
    g.add(hallWalls);

    // sanctuary at the far end (position cited: end of the 56 m axis)
    var sanct = new T.Mesh(new T.BoxGeometry(7.4, 6, 1), mat(0x8a7350, { flat: true, roughness: .9 }));
    sanct.position.set(0, 3, -58.2);
    g.add(sanct);
    // four seated figures of the sanctuary: the sun reaches them on about 22 February and 22 October (date cited;
    // the number and identity of the figures are not in the source used here, so they are shown without labels)
    var sanctStatues = new T.Group();
    [-3.3, -1.1, 1.1, 3.3].forEach(function (sx) {
      var fig = new T.Group();
      var body = new T.Mesh(new T.BoxGeometry(1.7, 2.7, 1.3), GLOW);
      body.position.y = 1.55;
      var head = new T.Mesh(new T.BoxGeometry(0.95, 1.05, 0.95), GLOW);
      head.position.y = 3.35;
      var knees = new T.Mesh(new T.BoxGeometry(1.9, 1.2, 0.9), GLOW);
      knees.position.set(0, 0.6, 0.75);
      fig.add(body, head, knees);
      fig.position.set(sx, 0.4, -57.1);
      sanctStatues.add(fig);
    });
    g.add(sanctStatues);

    // small Hathor temple to the north, statues 10.5 m (cited height)
    var small = new T.Group();
    var sm = new T.Mesh(new T.BoxGeometry(16, 14, 16), mat(0x8d6f4e, { flat: true }));
    sm.position.y = 7;
    var st1 = new T.Mesh(new T.BoxGeometry(2.2, 10.5, 2.2), STONE);
    st1.position.set(-4.4, 5.25, -8.4);
    var st2 = new T.Mesh(new T.BoxGeometry(2.2, 10.5, 2.2), STONE);
    st2.position.set(4.4, 5.25, -8.4);
    small.add(sm, st1, st2);
    small.position.set(-44, 0, 12);
    g.add(small);

    g.add(base(170, 130));
    g.add(human(26, 12));
    return {
      obj: g, dist: 240, label: 'معبد أبو سمبل',
      explode: [halls, colossi, hallRoof],
      interior: { stops: [
        { t: 'الواجهة · التماثيل الأربعة', pos: [0, 19, 74], look: [0, 13, 0] },
        { t: 'الصالة الأولى · الأعمدة والتماثيل', pos: [0, 5.4, -3], look: [0, 4.2, -40] },
        { t: 'قدس الأقداس · تعامد الشمس', pos: [0, 3.6, -44], look: [0, 3, -57] }
      ] },
      sun: { pos: [0, 40, 60], target: [0, 3, -58] }
    };
  }

  var BUILDERS = { pyramid: buildPyramid, hypostyle: buildHypostyle, obelisk: buildObelisk, mastaba: buildMastaba, abusimbel: buildAbuSimbel };

  /* ---------- hotspots: every one carries its source line ---------- */
  var HOTSPOTS = {
    pyramid: [
      { p: [0, 20, 116], t: 'المدخل', d: 'المدخل في الجهة الشمالية على ارتفاع نحو 18 مترًا من سطح الأرض.', s: 'Britannica' },
      { p: [0, 34, -12], t: 'الممر الصاعد الكبير', d: 'ممر مسقوف بطريقة «الحضن» (corbel)، طوله 46 مترًا.', s: 'Britannica' },
      { p: [0, 46, -34], t: 'حجرة الدفن الملكية', d: 'مبطّنة بالجرانيت بالكامل، وفوقها خمس حجرات فاصلة من ألواح جرانيتية أفقيّة لتخفيف الثقل.', s: 'Britannica' },
      { p: [4, 58, -20], t: 'بئر تهوية', d: 'بئران ضيّقان ينفذان من الحجرة إلى خارج البناء؛ الغرض منهما غير معروف، دينيًا كان أو للتهوية.', s: 'Britannica' },
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
    abusimbel: [
      { p: [0, 21, -4], t: 'التماثيل الأربعة', d: 'أربعة تماثيل جالسة للملك بارتفاع 20 مترًا (66 قدمًا) على واجهة المعبد.', s: 'Britannica' },
      { p: [0, 5, -30], t: 'القاعات الثلاث', d: 'ثلاث قاعات متتابعة تنفذ 56 مترًا (185 قدمًا) في الصخر.', s: 'Britannica' },
      { p: [0, 3, -58], t: 'قدس الأقداس', d: 'في يومين من السنة، نحو 22 فبراير و22 أكتوبر، تنفذ أشعة الشمس الأولى بطول المعبد وتضيء قدس الأقداس.', s: 'Britannica' },
      { p: [-44, 11, -2], t: 'معبد حتحور', d: 'إلى الشمال معبد أصغر مكرّس للملكة نفرتاري وللمعبودة حتحور، وتماثيله بارتفاع 10.5 مترًا (35 قدمًا).', s: 'Britannica' }
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
    abusimbel: {
      title: 'معبد أبو سمبل الكبير',
      note: 'الارتفاع والعُمق وتاريخ تعامد الشمس موثّقة. أما عرض الواجهة وعرض القاعات وشكل التماثيل فمبسّطة للتوضيح، ولا تقيس الأبعاد الفعلية.',
      rows: [
        ['ارتفاع التماثيل', 'نحو 20 م (66 قدمًا)'],
        ['عُمق المعبد في الصخر', 'نحو 56 م (185 قدمًا)'],
        ['عدد القاعات', 'ثلاث قاعات متتابعة'],
        ['تعامد الشمس', 'نحو 22 فبراير و22 أكتوبر'],
        ['معبد حتحور · التماثيل', 'نحو 10.5 م (35 قدمًا)']
      ],
      src: [['Britannica — Abu Simbel', 'https://www.britannica.com/place/Abu-Simbel']]
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

  var state = { model: 'pyramid', rotY: -0.55, rotX: 0.22, dist: 520, target: 520, auto: true, night: false, explode: false, interior: false, stop: 0 };
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
      dot.innerHTML = '<i>' + (idx + 1) + '</i><span>' + hs.t + '</span>';
      dot.addEventListener('click', function () {
        if (!hotInfo) return;
        hotInfo.hidden = false;
        hotInfo.innerHTML = '<b>' + hs.t + '</b><p>' + hs.d + '</p><span class="lab3d-hot-src">المصدر: ' + hs.s + '</span>';
      });
      hotLayer.appendChild(dot);
      markers.push({ el: dot, p: new T.Vector3(hs.p[0], hs.p[1], hs.p[2]) });
    });
  }

  function interiorStops(o) { return (o && o.stops) ? o.stops : (o ? [o] : []); }

  // walk-through caption: names the current interior stop above the canvas
  var stopCap = null;
  function showStop() {
    if (!stopCap) {
      stopCap = document.createElement('div');
      stopCap.className = 'lab3d-stop';
      stopCap.style.cssText = 'position:absolute;inset-inline-start:14px;top:50px;z-index:3;max-width:58%;background:rgba(7,19,33,.86);border:1px solid rgba(216,181,107,.5);border-radius:8px;padding:7px 12px;font-size:12px;line-height:1.6;color:#f0d9a2;pointer-events:none;opacity:0;transition:opacity .25s';
      var host = canvas.parentNode;
      if (host) host.appendChild(stopCap);
    }
    var stops = (built && built.interior) ? interiorStops(built.interior) : [];
    if (!state.interior || !stops.length) { stopCap.style.opacity = '0'; return; }
    var s = stops[state.stop] || stops[0];
    stopCap.textContent = (state.stop + 1) + '/' + stops.length + ' · ' + s.t;
    stopCap.style.opacity = '1';
  }

  function applyInteriorView() {
    if (!built) return;
    if (hotLayer) hotLayer.style.display = state.interior ? 'none' : '';
    var cut = !!(state.interior && built.interior && built.interior.hideShell);
    var dim = cut ? 0 : (state.interior && !state.explode ? 0.17 : (state.explode ? 0.16 : 0.42));
    SHELL.opacity = dim;
    built.obj.traverse(function (o) {
      if (o.isMesh && o.material === SHELL) o.material.opacity = dim;
      if (o.isMesh && o.userData.isBase) o.visible = !state.interior;
    });
    showStop();
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
    state.stop = 0;
    state.sun = false;
    sunBeam.intensity = 0;
    renderFacts(name);
    addHotspots(name);
    document.querySelectorAll('.lab3d-tab').forEach(function (b) {
      var on = b.getAttribute('data-model') === name;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    syncButtons();
    applyInteriorView();
  }

  function syncButtons() {
    var en = document.getElementById('lab3dNight');
    if (en) { en.classList.toggle('on', state.night); en.textContent = state.night ? '☾ ليل' : '☀ نهار'; }
    var ex = document.getElementById('lab3dExplode');
    if (ex) ex.classList.toggle('on', state.explode);
    var sb = document.getElementById('lab3dSun');
    if (sb) { sb.disabled = !(built && built.sun); if (!(built && built.sun)) sb.classList.remove('on'); }
    var inn = document.getElementById('lab3dInside');
    if (inn) {
      inn.classList.toggle('on', state.interior);
      inn.disabled = !(built && built.interior);
      var sn = (built && built.interior) ? interiorStops(built.interior).length : 0;
      inn.textContent = state.interior && sn > 1 ? ('داخل · ' + (state.stop + 1) + '/' + sn) : 'داخل البناء';
    }
  }

  function applyLight() {
    if (state.night) {
      scene.background = SKY_NIGHT;
      scene.fog = new T.Fog(0x02060c, 700, 2400);
      hemi.color.set(0x2a4a66); hemi.groundColor.set(0x050b12); hemi.intensity = 0.3;
      key.color.set(0x9fc4ff); key.intensity = 0.35; key.position.set(-260, 420, -180);
      rim.color.set(0x4b7fbf); rim.intensity = 0.55;
      sunBeam.intensity = 0.0;
    } else {
      scene.background = SKY_DAY;
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
      var stops = interiorStops(built.interior);
      var st = stops[state.stop] || stops[0];
      camera.position.set(st.pos[0], st.pos[1], st.pos[2]);
      camera.lookAt(st.look[0], st.look[1], st.look[2]);
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
    state.interior = false; state.stop = 0;
    applyInteriorView();
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
  var sunBtn = document.getElementById('lab3dSun');
  if (sunBtn) sunBtn.addEventListener('click', function () {
    if (!built || !built.sun) return;
    state.sun = !state.sun;
    if (state.sun) {
      state.interior = true; state.stop = 0; applyInteriorView();
      sunBeam.position.set(built.sun.pos[0], built.sun.pos[1], built.sun.pos[2]);
      sunBeam.target.position.set(built.sun.target[0], built.sun.target[1], built.sun.target[2]);
      sunBeam.intensity = 3.2;
    } else {
      sunBeam.intensity = 0;
    }
    sunBtn.classList.toggle('on', state.sun);
    syncButtons();
  });
  var inBtn = document.getElementById('lab3dInside');
  if (inBtn) inBtn.addEventListener('click', function () {
    if (!built || !built.interior) return;
    var stops = interiorStops(built.interior);
    if (!state.interior) { state.interior = true; state.stop = 0; }
    else { state.stop = (state.stop + 1) % stops.length; }
    state.auto = false;
    applyInteriorView(); syncButtons();
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
