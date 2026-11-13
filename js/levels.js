var STAGE_COUNT = 100;
var SEG = 16;
var TRACK_HALF = 4.6;
var BASE_POWER = 10;

var THEMES = [
  { name: 'Blue Sky', nameId: 'Langit Biru', sky: 0x6ec6ff, fog: 0x9fd8ff, ground: 0x3d9be9, track: 0x2f6fb5, deco: 0xffffff, kind: 'cloud' },
  { name: 'Sunset', nameId: 'Senja', sky: 0xff9a5a, fog: 0xffb37a, ground: 0xc45a3c, track: 0x7a3550, deco: 0xffd9b0, kind: 'cloud' },
  { name: 'Desert', nameId: 'Gurun', sky: 0xf6d98a, fog: 0xf3dfa6, ground: 0xd9a55a, track: 0x9a6a35, deco: 0xb9803f, kind: 'rock' },
  { name: 'Snow Valley', nameId: 'Salju', sky: 0xcfe9ff, fog: 0xe6f4ff, ground: 0xf2f8ff, track: 0x7fa6c9, deco: 0xffffff, kind: 'pine' },
  { name: 'Night City', nameId: 'Kota Malam', sky: 0x101a3a, fog: 0x18244d, ground: 0x0c1226, track: 0x2b3566, deco: 0x2a3a78, kind: 'tower' },
  { name: 'Deep Space', nameId: 'Luar Angkasa', sky: 0x05030f, fog: 0x0a0620, ground: 0x120a2a, track: 0x3a1f6b, deco: 0x8e6bff, kind: 'crystal' },
  { name: 'Tropical Island', nameId: 'Pulau Tropis', sky: 0x7fe3f0, fog: 0xb5f0f5, ground: 0x1ea7c9, track: 0xc9a46a, deco: 0x2ecc71, leaf: 0x1f9d55, kind: 'palm' },
  { name: 'Mist Forest', nameId: 'Hutan Kabut', sky: 0xb8d8c4, fog: 0xc9e3d2, ground: 0x2b5d3f, track: 0x4b3a2a, deco: 0x1f6b45, leaf: 0x1f6b45, kind: 'pine' },
  { name: 'Lava Mountain', nameId: 'Gunung Lava', sky: 0x2a0f0f, fog: 0x4a1a14, ground: 0x2a0d0a, track: 0x4a2b2b, deco: 0x5a2a1c, emis: 0xff4a00, kind: 'volcano' },
  { name: 'Neon Metropolis', nameId: 'Kota Neon', sky: 0x1a0a33, fog: 0x2a0f4d, ground: 0x120622, track: 0x3d1f6b, deco: 0xff3ea5, emis: 0x8a1f66, kind: 'tower' },
  { name: 'Thunderstorm', nameId: 'Badai Petir', sky: 0x2b3347, fog: 0x3d465e, ground: 0x1b2233, track: 0x4a5675, deco: 0x59637f, kind: 'cloud' },
  { name: 'Orbital Station', nameId: 'Stasiun Orbit', sky: 0x02040a, fog: 0x0a1020, ground: 0x0a1630, track: 0x1f3a73, deco: 0x35e8a5, emis: 0x0f6b4c, kind: 'crystal' },
  { name: 'Polar Aurora', nameId: 'Aurora Kutub', sky: 0x0b1f3a, fog: 0x14325a, ground: 0xdff3ff, track: 0x4a7fa8, deco: 0x7fffd4, emis: 0x1f8f7a, kind: 'crystal' },
  { name: 'Red Canyon', nameId: 'Ngarai Merah', sky: 0xffb27a, fog: 0xffc9a0, ground: 0xb2452b, track: 0x6b2d1f, deco: 0xc9582f, kind: 'rock' },
  { name: 'Candy Valley', nameId: 'Taman Permen', sky: 0xffd1ec, fog: 0xffe3f5, ground: 0xff8fcf, track: 0xb04fa6, deco: 0xfff1a8, kind: 'cloud' },
  { name: 'Ancient Ruins', nameId: 'Reruntuhan Kuno', sky: 0xe8c98a, fog: 0xf0d9a8, ground: 0x8a6a3a, track: 0x5a4326, deco: 0xc9a96a, emis: 0x3a2a10, kind: 'tower' },
  { name: 'Abyssal Ocean', nameId: 'Samudra Dalam', sky: 0x0a4a6e, fog: 0x0e6e96, ground: 0x06304a, track: 0x1a6f8f, deco: 0x4ee0d0, emis: 0x0f6b66, kind: 'crystal' },
  { name: 'Sakura Hills', nameId: 'Bukit Sakura', sky: 0xffe0ec, fog: 0xffeef5, ground: 0x8ccf8a, track: 0x9a6a5a, deco: 0xffffff, leaf: 0xff9ec7, kind: 'pine' },
  { name: 'Golden City', nameId: 'Kota Emas', sky: 0xffe9a8, fog: 0xfff0c2, ground: 0xd9a520, track: 0x8a5a10, deco: 0xffc93c, emis: 0x8a5a00, kind: 'tower' },
  { name: 'Galactic Gate', nameId: 'Gerbang Galaksi', sky: 0x0b0030, fog: 0x1a0a50, ground: 0x100030, track: 0x5a2fa0, deco: 0xff5ed0, emis: 0x7a1f8f, kind: 'crystal' }
];

function rng(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function applyOp(p, g) {
  var r = p;
  if (g.op === '+') r = p + g.v;
  else if (g.op === '-') r = p - g.v;
  else if (g.op === 'x') r = p * g.v;
  else if (g.op === '/') r = Math.floor(p / g.v);
  return Math.min(999999, r);
}

function opLabel(g) {
  return (g.op === 'x' ? '×' : g.op === '/' ? '÷' : g.op === '-' ? '−' : '+') + g.v;
}

function isGood(g) { return g.op === '+' || g.op === 'x'; }

function buildLevel(n) {
  var R = rng(n * 7919 + 13);
  var segs = Math.min(46, 13 + Math.floor(n * 0.7));
  var items = [];
  var best = BASE_POWER;
  var hard = Math.min(1, n / 30);

  function goodOp() {
    if (R() < 0.35) return { op: 'x', v: (n > 3 && R() < 0.3) ? 3 : 2 };
    return { op: '+', v: Math.max(5, Math.round(best * (0.3 + R() * 0.5))) };
  }
  function badOp() {
    if (R() < 0.3) return { op: '/', v: 2 };
    return { op: '-', v: Math.max(2, Math.round(best * (0.15 + R() * 0.25))) };
  }
  function pickX() { return [-3, 0, 3][Math.floor(R() * 3)]; }

  for (var i = 0; i < segs; i++) {
    var z = -(i + 2) * SEG;
    if (i % 2 === 0) {
      var a, b, k = R();
      if (k < 0.6 || n < 3) { a = goodOp(); b = badOp(); }
      else if (k < 0.85 || n < 6) { a = goodOp(); b = goodOp(); }
      else { a = badOp(); b = badOp(); }
      if (R() < 0.5) { var t = a; a = b; b = t; }
      var moving = n > 8 && R() < 0.25 + hard * 0.25;
      items.push({ t: 'gate', z: z, L: a, R: b, moving: moving });
      best = Math.max(1, Math.max(applyOp(best, a), applyOp(best, b)));
    } else {
      var q = R();
      if (n === 1 || q < 0.2) {
        var cx = pickX();
        for (var c = 0; c < 5; c++) items.push({ t: 'coin', z: z + 4 - c * 2, x: cx });
      } else if (q < 0.35) {
        // Shield power-up
        items.push({ t: 'shield', z: z, x: pickX() });
        items.push({ t: 'coin', z: z - 3, x: pickX() });
      } else if (q < 0.45) {
        // Magnet power-up
        items.push({ t: 'magnet', z: z, x: pickX() });
        items.push({ t: 'coin', z: z + 2, x: pickX() });
        items.push({ t: 'coin', z: z - 2, x: pickX() });
      } else if (q < 0.6) {
        var dv = Math.max(1, Math.round(best * (0.2 + R() * 0.2)));
        var dx = pickX();
        items.push({ t: 'drone', z: z, x: dx, v: dv });
        if (n > 5 && R() < 0.5) items.push({ t: 'drone', z: z - 3, x: dx === 0 ? 3 : 0, v: dv });
        items.push({ t: 'coin', z: z, x: dx === -3 ? 3 : -3 });
      } else if (q < 0.75) {
        var bx = pickX();
        items.push({ t: 'block', z: z, x: bx });
        if (n > 10 && R() < 0.5) items.push({ t: 'block', z: z, x: bx === 3 ? -3 : 3 });
      } else if (q < 0.87 && n > 4) {
        items.push({ t: 'spin', z: z, ph: R() * 6.28, sp: 1.2 + hard * 1.6 });
      } else {
        var wv = Math.max(1, Math.round(best * (0.2 + R() * 0.15 + hard * 0.1)));
        items.push({ t: 'wall', z: z, v: wv });
        best -= wv;
      }
    }
  }

  var isBig = n % 5 === 0;
  var bossHp = Math.max(5, Math.floor(best * (isBig ? 0.6 : 0.45 + hard * 0.1)));
  return {
    n: n,
    theme: THEMES[Math.floor((n - 1) / 5) % THEMES.length],
    items: items,
    endZ: -(segs + 3) * SEG,
    best: best,
    bossHp: bossHp,
    big: isBig,
    speed: 15 + hard * 9 + Math.min(7, Math.max(0, n - 30) * 0.15)
  };
}
