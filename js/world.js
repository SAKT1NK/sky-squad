var World = (function () {
  var renderer, scene, camera, envGroup, levelGroup, fxGroup;
  var mats = {}, fx = [];
  var BC = [0xb33939, 0x6c5ce7, 0xe17055, 0x00a8a8, 0xc23b9a, 0x2f8f4e, 0xd4a017, 0x3d5afe];
  var G = {};

  function mat(color, opts) {
    var key = color + JSON.stringify(opts || {});
    if (!mats[key]) {
      var o = { color: color };
      if (opts) for (var k in opts) o[k] = opts[k];
      mats[key] = new THREE.MeshLambertMaterial(o);
    }
    return mats[key];
  }

  function mesh(geo, material, x, y, z, parent) {
    var m = new THREE.Mesh(geo, material);
    m.position.set(x || 0, y || 0, z || 0);
    if (parent) parent.add(m);
    return m;
  }

  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x556688, 0.95));
    var sun = new THREE.DirectionalLight(0xffffff, 0.75);
    sun.position.set(6, 14, 8);
    scene.add(sun);
    envGroup = new THREE.Group(); levelGroup = new THREE.Group(); fxGroup = new THREE.Group();
    scene.add(envGroup, levelGroup, fxGroup);

    G.box = new THREE.BoxGeometry(1, 1, 1);
    G.sphere = new THREE.SphereGeometry(1, 10, 8);
    G.cone = new THREE.ConeGeometry(1, 2, 7);
    G.octa = new THREE.OctahedronGeometry(1);
    G.dode = new THREE.DodecahedronGeometry(1);
    G.coin = new THREE.CylinderGeometry(0.55, 0.55, 0.14, 14);
    G.body = new THREE.CylinderGeometry(0.1, 0.3, 2, 8);
    G.ring = new THREE.TorusGeometry(0.7, 0.12, 8, 16);
    G.diamond = new THREE.OctahedronGeometry(0.45);

    for (var i = 0; i < 120; i++) {
      var p = mesh(G.box, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 0, 0, fxGroup);
      p.visible = false;
      fx.push({ m: p, life: 0, vx: 0, vy: 0, vz: 0, s: 0.2 });
    }
    window.addEventListener('resize', resize);
    resize();
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 74 : 56;
    camera.updateProjectionMatrix();
  }

  function clearGroup(g) {
    g.traverse(function (o) {
      if (o.isSprite) { o.material.map.dispose(); o.material.dispose(); }
    });
    while (g.children.length) g.remove(g.children[0]);
  }

  function setTheme(th, endZ) {
    clearGroup(envGroup);
    clearGroup(levelGroup);
    scene.background = new THREE.Color(th.sky);
    scene.fog = new THREE.Fog(th.fog, 45, 175);
    var zEnd = endZ - 50, len = 20 - zEnd, zc = (20 + zEnd) / 2;
    var gr = mesh(G.box, mat(th.ground), 0, -7, zc, envGroup);
    gr.scale.set(400, 1, len + 300);
    var tr = mesh(G.box, mat(th.track), 0, -0.25, zc, envGroup);
    tr.scale.set(TRACK_HALF * 2 + 0.8, 0.4, len);

    // Track lines
    [-1, 1].forEach(function (s) {
      var rail = mesh(G.box, new THREE.MeshBasicMaterial({ color: 0xffffff }), s * (TRACK_HALF + 0.4), 0.05, zc, envGroup);
      rail.scale.set(0.18, 0.25, len);
    });
    // Center dashed line
    for (var d = 0; d < len; d += 6) {
      var dash = mesh(G.box, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }), 0, 0.03, 20 - d, envGroup);
      dash.scale.set(0.12, 0.15, 2.5);
    }

    var R = rng(th.sky + 7);
    var count = Math.floor(len / 5);
    for (var i = 0; i < count; i++) {
      var side = R() < 0.5 ? -1 : 1;
      var x = side * (10 + R() * 45), z = 20 - R() * len, s = 1 + R() * 2.5;
      if (th.kind === 'cloud') {
        var cl = mesh(G.sphere, mat(th.deco), x, -4 + R() * 9, z, envGroup);
        cl.scale.set(s * 2.4, s * 0.9, s * 1.6);
      } else if (th.kind === 'rock') {
        var rk = mesh(G.dode, mat(th.deco), x, -6.5 + s, z, envGroup);
        rk.scale.set(s * 1.6, s * 2, s * 1.6);
      } else if (th.kind === 'pine') {
        var pn = mesh(G.cone, mat(th.leaf || 0x2f7d5b), x, -6.5 + s * 2, z, envGroup);
        pn.scale.set(s, s * 2, s);
        mesh(G.box, mat(0x6b4226), x, -6.5 + s * 0.3, z, envGroup).scale.set(s * 0.25, s * 0.8, s * 0.25);
      } else if (th.kind === 'palm') {
        var pt = mesh(G.box, mat(0x8a5a2b), x, -6.5 + s * 1.2, z, envGroup); pt.scale.set(s * 0.3, s * 2.4, s * 0.3);
        var lf = mesh(G.cone, mat(th.leaf), x, -6.5 + s * 2.6, z, envGroup); lf.scale.set(s * 1.4, s * 0.7, s * 1.4);
      } else if (th.kind === 'volcano') {
        var vc = mesh(G.cone, mat(th.deco, { emissive: th.emis }), x, -6.5 + s * 2.5, z, envGroup); vc.scale.set(s * 2.6, s * 2.5, s * 2.6);
        mesh(G.sphere, new THREE.MeshBasicMaterial({ color: 0xff7a1a }), x, -6.5 + s * 5, z, envGroup).scale.setScalar(s * 0.6);
      } else if (th.kind === 'tower') {
        var h = 4 + R() * 16;
        var tw = mesh(G.box, mat(th.deco, { emissive: th.emis || 0x1a2a66 }), x, -6.5 + h / 2, z, envGroup);
        tw.scale.set(2 + R() * 3, h, 2 + R() * 3);
        mesh(G.box, new THREE.MeshBasicMaterial({ color: 0xffe27a }), x, -6.5 + h * 0.7, z + tw.scale.z / 2 + 0.02, envGroup).scale.set(tw.scale.x * 0.6, 0.4, 0.05);
      } else {
        var cr = mesh(G.octa, mat(th.deco, { emissive: th.emis || 0x3a1f8f }), x, -5 + R() * 10, z, envGroup);
        cr.scale.set(s * 0.8, s * 1.8, s * 0.8);
      }
    }
  }

  function label(text, bg, w) {
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 128;
    var tex = new THREE.CanvasTexture(cv);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(w, w / 2, 1);
    sp.renderOrder = 5;
    sp.userData.set = function (t) {
      var c = cv.getContext('2d');
      c.clearRect(0, 0, 256, 128);
      if (bg) {
        c.fillStyle = bg;
        c.beginPath();
        c.moveTo(30, 14); c.arcTo(242, 14, 242, 114, 26); c.arcTo(242, 114, 14, 114, 26);
        c.arcTo(14, 114, 14, 14, 26); c.arcTo(14, 14, 242, 14, 26); c.fill();
      }
      c.font = 'bold ' + (String(t).length > 5 ? 54 : 72) + 'px Arial';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 8; c.strokeStyle = 'rgba(0,0,0,.55)'; c.strokeText(t, 128, 68);
      c.fillStyle = '#fff'; c.fillText(t, 128, 68);
      tex.needsUpdate = true;
    };
    sp.userData.set(text);
    return sp;
  }

  function makePlane(color, s, sk) {
    var wc = (sk && sk.wing) || 0xf5f7fa, shp = sk && sk.shape;
    var g = new THREE.Group();
    var b = mesh(G.body, mat(color), 0, 0, 0, g); b.rotation.x = -Math.PI / 2;
    if (shp === 'delta') { var dw = mesh(G.cone, mat(wc), 0, 0, 0.5, g); dw.scale.set(1.5, 1.5, 0.07); dw.rotation.x = -Math.PI / 2; }
    else if (shp === 'twin') { mesh(G.box, mat(wc), 0, 0, 0.15, g).scale.set(2.6, 0.08, 0.5); mesh(G.body, mat(color), 0.75, 0, 0.1, g).rotation.x = -Math.PI / 2; mesh(G.body, mat(color), -0.75, 0, 0.1, g).rotation.x = -Math.PI / 2; }
    else mesh(G.box, mat(wc), 0, 0, 0.15, g).scale.set(2.3, 0.08, 0.55);
    mesh(G.box, mat(wc), 0, 0, 0.9, g).scale.set(0.9, 0.07, 0.3);
    mesh(G.box, mat(color), 0, 0.25, 0.9, g).scale.set(0.07, 0.5, 0.35);
    mesh(G.sphere, mat(0x7fd6ff), 0, 0.17, -0.25, g).scale.set(0.16, 0.14, 0.34);
    var fl = mesh(G.cone, new THREE.MeshBasicMaterial({ color: (sk && sk.flame) || 0xffb020 }), 0, 0, 1.25, g);
    fl.scale.set(0.14, 0.3, 0.14); fl.rotation.x = Math.PI / 2;
    g.userData.flame = fl;
    g.scale.setScalar(s || 1);
    return g;
  }

  function makeGate(it) {
    var g = new THREE.Group();
    g.position.set(0, 0, it.z);
    [['L', -2.3], ['R', 2.3]].forEach(function (p) {
      var op = it[p[0]], good = isGood(op), col = good ? 0x2ecc71 : 0xe74c3c;
      var pn = mesh(G.box, mat(col, { transparent: true, opacity: 0.45 }), p[1], 1.9, 0, g);
      (g.userData.pan = g.userData.pan || []).push(pn);
      pn.scale.set(4.4, 3.4, 0.15);
      mesh(G.box, mat(col), p[1], 3.7, 0, g).scale.set(4.5, 0.25, 0.3);
      var lb = label(opLabel(op), null, 3.6);
      lb.position.set(p[1], 2, 0.2);
      (g.userData.lab = g.userData.lab || []).push(lb);
      g.add(lb);
    });
    [-4.6, 0, 4.6].forEach(function (x) { mesh(G.box, mat(0xf5f7fa), x, 1.9, 0, g).scale.set(x === 0 ? 0.7 : 0.25, 3.9, x === 0 ? 0.6 : 0.3); });
    levelGroup.add(g);
    return g;
  }

  function makeDrone(it) {
    var g = new THREE.Group();
    g.position.set(it.x, 1, it.z);
    var p = makePlane(0xc0392b, 1.1); p.rotation.y = Math.PI; g.add(p);
    var lb = label(it.v, '#c0392b', 1.9); lb.position.y = 1.4; g.add(lb);
    levelGroup.add(g);
    return g;
  }

  function makeBlock(it) {
    var g = new THREE.Group();
    g.position.set(it.x, 0, it.z);
    mesh(G.box, mat(0x2d3436), 0, 1.1, 0, g).scale.set(2.7, 2.2, 1.2);
    mesh(G.box, mat(0xfdcb6e), 0, 1.1, 0.02, g).scale.set(2.75, 0.4, 1.2);
    levelGroup.add(g);
    return g;
  }

  function makeSpin(it) {
    var g = new THREE.Group();
    g.position.set(0, 0, it.z);
    mesh(G.box, mat(0x2d3436), 0, 0.6, 0, g).scale.set(0.7, 1.2, 0.7);
    var arm = new THREE.Group(); arm.position.y = 1; g.add(arm);
    mesh(G.box, mat(0xe84393), 0, 0, 0, arm).scale.set(7, 0.5, 0.5);
    g.userData.arm = arm;
    levelGroup.add(g);
    return g;
  }

  function makeWall(it) {
    var g = new THREE.Group();
    g.position.set(0, 0, it.z);
    mesh(G.box, mat(0xe67e22, { transparent: true, opacity: 0.75 }), 0, 1.2, 0, g).scale.set(TRACK_HALF * 2, 2.4, 0.5);
    var lb = label(it.v, null, 4); lb.position.set(0, 1.3, 0.4); g.add(lb);
    g.userData.label = lb;
    levelGroup.add(g);
    return g;
  }

  function makeCoin(it) {
    var c = mesh(G.coin, mat(0xffd60a, { emissive: 0x7a5a00 }), it.x, 1, it.z, levelGroup);
    c.rotation.x = Math.PI / 2;
    return c;
  }

  function makeShield(it) {
    var g = new THREE.Group();
    g.position.set(it.x, 1.2, it.z);
    // Blue spinning diamond
    var d = mesh(G.diamond, new THREE.MeshLambertMaterial({ color: 0x00b4ff, emissive: 0x005577, transparent: true, opacity: 0.85 }), 0, 0, 0, g);
    d.scale.set(1.2, 1.2, 1.2);
    // Outer ring
    var r = mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.5 }), 0, 0, 0, g);
    r.scale.set(1.8, 1.8, 1.8);
    g.userData.diamond = d;
    g.userData.ring = r;
    levelGroup.add(g);
    return g;
  }

  function makeMagnet(it) {
    var g = new THREE.Group();
    g.position.set(it.x, 1.2, it.z);
    // Red U-shaped magnet visual (using boxes)
    mesh(G.box, mat(0xff3333), -0.3, 0.3, 0, g).scale.set(0.3, 0.9, 0.3);
    mesh(G.box, mat(0xff3333), 0.3, 0.3, 0, g).scale.set(0.3, 0.9, 0.3);
    mesh(G.box, mat(0xff3333), 0, 0.8, 0, g).scale.set(0.9, 0.3, 0.3);
    // Tips
    mesh(G.box, mat(0xcccccc), -0.3, -0.15, 0, g).scale.set(0.3, 0.25, 0.3);
    mesh(G.box, mat(0xcccccc), 0.3, -0.15, 0, g).scale.set(0.3, 0.25, 0.3);
    // Glow ring
    var r = mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xff5555, transparent: true, opacity: 0.4 }), 0, 0.4, 0, g);
    r.scale.set(1.6, 1.6, 1.6);
    g.userData.ring = r;
    levelGroup.add(g);
    return g;
  }

  function makeBoss(z, big, k) {
    var g = new THREE.Group(), s = big ? 1.5 : 1, col = BC[(k || 0) % BC.length];
    g.position.set(0, 2.2, z);
    mesh(G.box, mat(col), 0, 0, 0, g).scale.set(3.4 * s, 1.5 * s, 4.6 * s);
    mesh(G.box, mat(0x2d3436), 0, -0.1, 0.3, g).scale.set(9.5 * s, 0.35 * s, 2.2 * s);
    mesh(G.sphere, mat(0xffeaa7, { emissive: 0x806000 }), 0, 0.7 * s, 1.2 * s, g).scale.set(0.9 * s, 0.6 * s, 1.1 * s);
    [-1, 1].forEach(function (k) {
      mesh(G.box, mat(0x636e72), k * 3.4 * s, -0.3, 1.4 * s, g).scale.set(0.5 * s, 0.5 * s, 2.4 * s);
      mesh(G.sphere, new THREE.MeshBasicMaterial({ color: 0xff5252 }), k * 1.1 * s, 0.2, 2.35 * s, g).scale.setScalar(0.3 * s);
    });
    // Cannons
    [-1, 1].forEach(function (k) {
      var cannon = mesh(G.body, mat(0x444444), k * 4.2 * s, 0, 0.5 * s, g);
      cannon.scale.set(0.5 * s, 1.2 * s, 0.5 * s);
      cannon.rotation.x = -Math.PI / 2;
    });
    var fin = mesh(G.box, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, -2.14, 22, g);
    fin.scale.set(TRACK_HALF * 2, 0.05, 1.2);
    levelGroup.add(g);
    return g;
  }

  // Gerbang: tandai pilihan, redupkan yang lain
  var dimM = new THREE.MeshBasicMaterial({ color: 0x555a7a, transparent: true, opacity: 0.3 });
  var hitM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  function gateTaken(g, right) {
    var i = right ? 1 : 0, p = g.userData.pan, l = g.userData.lab;
    if (!p) return;
    p[i].material = hitM; l[i].scale.multiplyScalar(1.4);
    p[1 - i].material = dimM; l[1 - i].visible = false;
  }
  function gateFade(g) { setTimeout(function () { g.visible = false; }, 450); }
  function warn(x, w, z0, z1) {
    var m = mesh(G.box, new THREE.MeshBasicMaterial({ color: 0xff3b5c, transparent: true, opacity: 0.4, depthWrite: false }), x, 0.12, (z0 + z1) / 2, levelGroup);
    m.scale.set(w, 0.08, Math.abs(z1 - z0));
    return m;
  }

  // Trail system
  var trails = [];
  function addTrail(x, y, z, color) {
    var p = null;
    for (var i = 0; i < fx.length; i++) {
      if (fx[i].life <= 0) { p = fx[i]; break; }
    }
    if (!p) return;
    p.life = 0.35; p.max = 0.35;
    p.vx = 0; p.vy = -0.5; p.vz = 3;
    p.s = 0.15;
    p.m.position.set(x, y, z);
    p.m.material.color.setHex(color || 0xffb020);
    p.m.visible = true;
  }

  function spark(x, y, z, vx, vy, vz, life, color, size) {
    for (var i = 0; i < fx.length; i++) {
      var f = fx[i];
      if (f.life > 0) continue;
      f.life = life; f.max = life; f.vx = vx; f.vy = vy; f.vz = vz; f.s = size || 0.22;
      f.m.position.set(x, y, z); f.m.material.color.setHex(color); f.m.visible = true;
      return;
    }
  }

  function burst(x, y, z, color, n) {
    for (var i = 0; i < n; i++) {
      spark(x, y, z, (Math.random() - 0.5) * 12, Math.random() * 9, (Math.random() - 0.5) * 12, 0.45 + Math.random() * 0.3, color);
    }
  }

  function updateFx(dt) {
    for (var i = 0; i < fx.length; i++) {
      var f = fx[i];
      if (f.life <= 0) continue;
      f.life -= dt;
      f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt;
      f.m.scale.setScalar(f.s * Math.max(0.1, f.life / f.max) * 2);
      if (f.life <= 0) f.m.visible = false;
    }
  }

  function screenPos(v) {
    var p = v.clone().project(camera);
    return { x: (p.x + 1) / 2 * window.innerWidth, y: (1 - p.y) / 2 * window.innerHeight };
  }

  return {
    init: init, setTheme: setTheme, makePlane: makePlane, makeGate: makeGate, makeDrone: makeDrone,
    makeBlock: makeBlock, makeSpin: makeSpin, makeWall: makeWall, makeCoin: makeCoin,
    makeShield: makeShield, makeMagnet: makeMagnet,
    makeBoss: makeBoss, warn: warn, gateTaken: gateTaken, gateFade: gateFade,
    burst: burst, spark: spark, updateFx: updateFx, addTrail: addTrail, screenPos: screenPos,
    add: function (o) { levelGroup.add(o); }, remove: function (o) { levelGroup.remove(o); },
    render: function () { renderer.render(scene, camera); },
    camera: function () { return camera; },
    levelGroup: function () { return levelGroup; }
  };
})();
