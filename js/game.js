(function () {
  var $ = function (id) { return document.getElementById(id); };
  var SAVE_KEY = 'skySquadRun2';
  var save = { unlocked: 1, stars: {}, coins: 0, upPow: 0, upShield: 0, upMagnet: 0, snd: true, skin: 'basic', skins: { basic: true } };
  try {
    var raw = null;
    if (raw) for (var k in raw) save[k] = raw[k];
  } catch (e) {}
  var hasYT = typeof ytgame !== 'undefined';
  var lang = 'en';
  if (hasYT && ytgame.system && ytgame.system.getLanguage) {
    try {
      var l = ytgame.system.getLanguage();
      if (l && l.toLowerCase().indexOf('id') === 0) lang = 'id';
    } catch (e) {}
  }
  var I18N = {
    en: {
      sub: 'Build your squad, defeat the boss at the end.',
      hint: 'Drag left / right, choose green gates',
      stage: 'Stage',
      hangar: 'Hangar',
      upgrade: 'Upgrade',
      nextStage: 'Next Stage',
      tryAgain: 'Try Again',
      menu: 'Menu',
      upPow: '? Power',
      upShield: '??? Shield',
      upMagnet: '?? Magnet',
      equipped: 'Equipped',
      equip: 'Equip',
      cleared: ' CLEAR!',
      failed: 'MISSION FAILED ??',
      failInfo: 'Choose green gates, avoid red gates.<br>Coins collected: ?? ',
      powerInfo: 'Power: ',
      max: ' / max ',
      stageComplete: '?? VICTORY!'
    },
    id: {
      sub: 'Kumpulin pasukan, hancurin boss di ujung.',
      hint: 'Geser kiri-kanan, pilih gerbang hijau',
      stage: 'Stage',
      hangar: 'Hangar',
      upgrade: 'Upgrade',
      nextStage: 'Stage berikutnya',
      tryAgain: 'Main lagi',
      menu: 'Menu',
      upPow: '? Kekuatan',
      upShield: '??? Shield',
      upMagnet: '?? Magnet',
      equipped: 'Dipakai',
      equip: 'Pakai',
      cleared: ' CLEAR!',
      failed: 'GAGAL ??',
      failInfo: 'Pilih gerbang hijau, hindari yang merah.<br>Koin di jalan: ?? ',
      powerInfo: 'Kekuatan: ',
      max: ' / maks ',
      stageComplete: '?? TAMAT!'
    }
  };
  function t(k) { return (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k; }
  var YT = hasYT && !!ytgame.IN_PLAYABLES_ENV, saveReady = false, audioOn = true, paused = false;
  function persist() {
    var s = JSON.stringify(save);
    if (hasYT && ytgame.game && ytgame.game.saveData) { try { ytgame.game.saveData(s); } catch (e) {} }
    try { localStorage.setItem(SAVE_KEY, s); } catch (e) {}
  }
  function applySave(str) { try { var r = JSON.parse(str); if (r) for (var k in r) save[k] = r[k]; } catch (e) {} }
  function loadSave(cb) {
    if (hasYT && ytgame.game && ytgame.game.loadData) {
      try {
        ytgame.game.loadData().then(function (s) { applySave(s); saveReady = true; cb(); }, function () {
          try { applySave(localStorage.getItem(SAVE_KEY)); } catch (e) {} cb();
        });
      } catch (e) {
        try { applySave(localStorage.getItem(SAVE_KEY)); } catch (e2) {} cb();
      }
    } else { try { applySave(localStorage.getItem(SAVE_KEY)); } catch (e) {} cb(); }
  }

  var state = 'menu', lvl, objs, player, wingmen, boss;
  var px, pz, prevZ, power, bossHp, bossHpMax, powerAtBoss, shotAcc, hurtT, endT, time = 0, runT, stageCoins;
  var last = 0, keys = {}, dragX = null;
  var streak = 0, shieldTimer = 0, magnetTimer = 0, trailAcc = 0;
  var comboPopT = 0, comboText = '';
  var shieldMesh = null;
  var flashT = 0, punch = 0, ghost = 1, dmgAcc = 0, dmgT = 0, bossPhase = 0, slow = 1, flashMat = null;
  var atk = null, atkT = 0;
  function clearAtk() { if (atk) { atk.meshes.forEach(function (m) { World.remove(m); }); atk = null; } }

  // ---------- efek boss ----------
  function showBanner(t, c, cls) {
    var b = $('banner'); b.textContent = t; b.style.color = c || ''; b.className = cls || '';
    void b.offsetHeight; b.classList.add('go');
  }
  function flashVig(c, o) {
    var v = $('vig'); v.style.setProperty('--c', c); v.style.opacity = o || 1;
    setTimeout(function () { v.style.opacity = 0; }, 180);
  }
  function popDmg(n, big) {
    var sp = World.screenPos(new THREE.Vector3(boss.position.x + (Math.random() - 0.5) * 3, boss.position.y + 2.5, boss.position.z));
    var d = document.createElement('div');
    d.className = 'dmg' + (big ? ' big' : ''); d.textContent = '-' + fmt(n);
    d.style.left = sp.x + 'px'; d.style.top = sp.y + 'px';
    $('dmgLayer').appendChild(d);
    setTimeout(function () { d.remove(); }, 800);
  }
  function bossFlash(on) {
    flashMat = flashMat || new THREE.MeshBasicMaterial({ color: 0xffffff });
    boss.traverse(function (m) {
      if (!m.isMesh) return;
      if (!m.userData.orig) m.userData.orig = m.material;
      m.material = on ? flashMat : m.userData.orig;
    });
  }

  // ---------- suara ----------
  var actx;
  function beep(f, d, type, vol) {
    if (!audioOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'square'; o.frequency.value = f;
      g.gain.value = vol || 0.06;
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + d);
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + d);
    } catch (e) {}
  }
  function playJingle(notes) {
    notes.forEach(function (n, i) {
      setTimeout(function () { beep(n[0], n[1], n[2] || 'square', n[3] || 0.06); }, i * 120);
    });
  }

  function fmt(n) {
    n = Math.max(0, Math.floor(n));
    return n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k' : String(n);
  }

  var SKINS = [
    { id: 'basic', name: 'Jagoan Biru', body: 0x1e90ff, wing: 0xf5f7fa, flame: 0xffb020, price: 0 },
    { id: 'flame', name: 'Api Merah', body: 0xff4d3d, wing: 0xffd9b0, flame: 0xff7a00, price: 120 },
    { id: 'sakura', name: 'Sakura Delta', shape: 'delta', body: 0xff7eb6, wing: 0xffe3ef, flame: 0xff9ad0, price: 300 },
    { id: 'mint', name: 'Mint Kilat', body: 0x2ee59d, wing: 0xeafff6, flame: 0x7affd0, price: 500, shape: 'delta' },
    { id: 'volt', name: 'Kembar Petir', shape: 'twin', body: 0xffd23c, wing: 0x2b2250, flame: 0xfff07a, price: 800 },
    { id: 'gold', name: 'Emas Sultan', body: 0xffc93c, wing: 0xfff2c2, flame: 0xfff07a, price: 1200, shape: 'delta' },
    { id: 'void', name: 'Void Hitam', body: 0x2b2250, wing: 0x7b5cff, flame: 0xb18cff, price: 2000, shape: 'twin' }
  ];
  function shipSvg(s) {
    var b = hex(s.body), w = hex(s.wing), f = hex(s.flame), p;
    if (s.shape === 'delta') p = '<path d="M32 8L60 52L32 46L4 52Z" fill="' + w + '"/><path d="M32 4C35 12 35 30 34 48L32 54L30 48C29 30 29 12 32 4Z" fill="' + b + '"/><path d="M29 56L32 70L35 56Z" fill="' + f + '"/>';
    else if (s.shape === 'twin') p = '<path d="M6 34H58V40H6Z" fill="' + w + '"/><path d="M20 10C24 18 24 34 23 52L20 56L17 52C16 34 16 18 20 10Z" fill="' + b + '"/><path d="M44 10C48 18 48 34 47 52L44 56L41 52C40 34 40 18 44 10Z" fill="' + b + '"/><path d="M17 58L20 70L23 58ZM41 58L44 70L47 58Z" fill="' + f + '"/>';
    else p = '<path d="M32 22L60 42V47L36 40H28L4 47V42Z" fill="' + w + '"/><path d="M32 3C36 10 37 20 36 40L37 54L42 58V61L32 59L22 61V58L27 54L28 40C27 20 28 10 32 3Z" fill="' + b + '"/><path d="M29 60L32 71L35 60Z" fill="' + f + '"/>';
    return '<svg viewBox="0 0 64 72" aria-hidden="true">' + p + '</svg>';
  }
  function setTab(t) {
    var ids = { stages: 'pStages', hangar: 'pHangar', upgrade: 'pUpgrade' };
    for (var k in ids) $(ids[k]).classList.toggle('hide', k !== t);
    document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
    if (t === 'stages') { var c = document.querySelector('.st.cur'); if (c) c.scrollIntoView({ block: 'center' }); }
  }
  function boot() {
    try {
      if (hint) hint.textContent = t('hint');
      var s = document.querySelector('#menu .sub'); if (s) s.textContent = t('sub');
      var bS = document.querySelector('[data-t="stages"]'); if (bS) bS.textContent = t('stage');
      var bH = document.querySelector('[data-t="hangar"]'); if (bH) bH.textContent = t('hangar');
      var bU = document.querySelector('[data-t="upgrade"]'); if (bU) bU.textContent = t('upgrade');
      if (rNext) rNext.textContent = t('nextStage');
      if (rRetry) rRetry.textContent = t('tryAgain');
      if (rMenu) rMenu.textContent = t('menu');
    } catch (e) {}
    document.querySelectorAll('.tab').forEach(function (b) { b.onclick = function () { setTab(b.dataset.t); beep(660, 0.05); }; });
    requestAnimationFrame(loop);
    if (YT) {
      try { audioOn = ytgame.system.isAudioEnabled(); ytgame.system.onAudioEnabledChange(function (e) { audioOn = e; }); } catch (e) {}
      try {
        ytgame.system.onPause(function () { paused = true; if (actx) actx.suspend(); persist(); });
        ytgame.system.onResume(function () { paused = false; if (actx) actx.resume(); });
      } catch (e) {}
      requestAnimationFrame(function () { try { ytgame.game.firstFrameReady(); } catch (e) {} });
    }
    loadSave(function () {
      $('loading').classList.add('hide'); showMenu(); setTab('stages');
      if (YT) { try { ytgame.game.gameReady(); } catch (e) {} }
    });
  }
  function skin() { for (var i = 0; i < SKINS.length; i++) if (SKINS[i].id === save.skin) return SKINS[i]; return SKINS[0]; }
  function hex(n) { return '#' + ('000000' + n.toString(16)).slice(-6); }
  function renderSkins() {
    var row = $('skinRow'); row.innerHTML = '';
    SKINS.forEach(function (s) {
      var own = !!save.skins[s.id], on = save.skin === s.id;
      var b = document.createElement('button');
      b.className = 'skin' + (on ? ' on' : '');
      b.innerHTML = shipSvg(s) + '<div class="nm">' + s.name + '</div><div class="pr">' + (on ? t('equipped') : own ? t('equip') : '\uD83E\uDE99 ' + s.price) + '</div>';
      b.onclick = function () {
        if (!own) {
          if (save.coins < s.price) { beep(140, 0.15, 'sawtooth'); return; }
          save.coins -= s.price; save.skins[s.id] = true; beep(880, 0.12);
        }
        save.skin = s.id; persist(); showMenu();
      };
      row.appendChild(b);
    });
  }

  function startPower() { return BASE_POWER + save.upPow * 5; }
  function shieldDuration() { return 3 + save.upShield * 1.5; }
  function magnetDuration() { return 4 + save.upMagnet * 2; }

  var SHOP_ITEMS = [
    { key: 'upPow', label: '⚡ Kekuatan', desc: function () { return startPower() + ' → ' + (startPower() + 5); }, cost: function () { return 50 * (save.upPow + 1); }, color: '#6c5ce7' },
    { key: 'upShield', label: '🛡️ Shield', desc: function () { return shieldDuration().toFixed(1) + 's → ' + (shieldDuration() + 1.5).toFixed(1) + 's'; }, cost: function () { return 40 * (save.upShield + 1); }, color: '#0984e3' },
    { key: 'upMagnet', label: '🧲 Magnet', desc: function () { return magnetDuration().toFixed(1) + 's → ' + (magnetDuration() + 2).toFixed(1) + 's'; }, cost: function () { return 40 * (save.upMagnet + 1); }, color: '#d63031' }
  ];

  // ---------- menu ----------
  function showMenu() {
    state = 'menu';
    $('menu').classList.remove('hide');
    $('result').classList.add('hide');
    $('hud').classList.add('hide'); $('pow').classList.add('hide');
    $('bossBar').classList.add('hide'); $('hint').classList.add('hide');
    $('streakBox').classList.add('hide'); $('powerups').classList.add('hide');
    $('coins').textContent = save.coins;

    // Stats
    var totalS = 0, cleared = 0;
    for (var i = 1; i <= STAGE_COUNT; i++) { var s = save.stars[i] || 0; totalS += s; if (s > 0) cleared++; }
    $('totalStars').textContent = totalS;
    $('cleared').textContent = cleared + '/' + STAGE_COUNT;

    renderSkins(); 

    // Grid
    var grid = $('grid');
    grid.innerHTML = '';
    for (var n = 1; n <= STAGE_COUNT; n++) {
      var b = document.createElement('button');
      if ((n - 1) % 5 === 0) {
      var wt = document.createElement('div'); wt.className = 'wTitle';
      wt.textContent = 'Dunia ' + ((n - 1) / 5 + 1) + ': ' + THEMES[Math.floor((n - 1) / 5) % THEMES.length].name;
      grid.appendChild(wt);
    }
    var locked = n > save.unlocked;
      b.className = 'st' + (locked ? ' lock' : n % 5 === 0 ? ' boss' : '') + (n === save.unlocked ? ' cur' : '');
      var st = save.stars[n] || 0;
      b.innerHTML = (locked ? '🔒' : n % 5 === 0 ? '👾' : n) + '<small>' + (st ? '★★★'.slice(0, st) : '') + '</small>';
      if (!locked) b.onclick = (function (m) { return function () { startStage(m); }; })(n);
      grid.appendChild(b);
    }

    // Shop
    var shop = $('shopRow');
    shop.innerHTML = '';
    SHOP_ITEMS.forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'shopBtn';
      btn.style.setProperty('--c', item.color);
      /* style ada di CSS */
      btn.innerHTML = '<div class="label">' + item.label + '</div><div class="cost">' + item.desc() + ' · 🪙' + item.cost() + '</div>';
      btn.onclick = function () {
        if (save.coins < item.cost()) { beep(140, 0.15, 'sawtooth'); return; }
        save.coins -= item.cost(); save[item.key]++; persist();
        beep(880, 0.12);
        showMenu();
      };
      shop.appendChild(btn);
    });
  }

  
  $('rMenu').onclick = showMenu;
  $('rRetry').onclick = function () { startStage(lvl.n); };
  $('rNext').onclick = function () { startStage(Math.min(STAGE_COUNT, lvl.n + 1)); };

  // ---------- countdown ----------
  function doCountdown(cb) {
    var steps = ['3', '2', '1', 'GO!'];
    var idx = 0;
    var cd = $('countdown'), ct = $('cdText');
    cd.classList.remove('hide');
    function tick() {
      if (idx >= steps.length) { cd.classList.add('hide'); cb(); return; }
      ct.textContent = steps[idx];
      ct.style.color = idx === 3 ? '#2ecc71' : '#ffd60a';
      ct.style.animation = 'none'; void ct.offsetHeight; ct.style.animation = '';
      beep(idx === 3 ? 880 : 440, 0.12);
      idx++;
      setTimeout(tick, idx >= steps.length ? 300 : 600);
    }
    tick();
  }

  // ---------- stage ----------
  function startStage(n) {
    $('fade').style.opacity = '1';
    $('menu').classList.add('hide');
    $('result').classList.add('hide');

    setTimeout(function () {
      lvl = buildLevel(n);
      World.setTheme(lvl.theme, lvl.endZ);
      objs = lvl.items.map(function (it) {
        var o;
        if (it.t === 'gate') o = World.makeGate(it);
        else if (it.t === 'drone') o = World.makeDrone(it);
        else if (it.t === 'block') o = World.makeBlock(it);
        else if (it.t === 'spin') o = World.makeSpin(it);
        else if (it.t === 'wall') o = World.makeWall(it);
        else if (it.t === 'shield') o = World.makeShield(it);
        else if (it.t === 'magnet') o = World.makeMagnet(it);
        else o = World.makeCoin(it);
        return { it: it, o: o, done: false };
      });
      boss = World.makeBoss(lvl.endZ, lvl.big, Math.floor(n / 5));
      flashT = 0; punch = 0; slow = 1; dmgAcc = 0; dmgT = 0; atk = null; atkT = 1.4;
      player = new THREE.Group();
      player.add(World.makePlane(skin().body, 1.15, skin()));
      wingmen = [];
      shieldMesh = null;
      World.add(player);

      px = 0; pz = 0; prevZ = 0; power = startPower(); bossHp = lvl.bossHp; bossHpMax = lvl.bossHp;
      shotAcc = 0; hurtT = 0; endT = 0; runT = 0; stageCoins = 0; dragX = null;
      streak = 0; shieldTimer = 0; magnetTimer = 0; trailAcc = 0;
      comboPopT = 0;

      $('hud').classList.remove('hide'); $('pow').classList.remove('hide');
      $('bossBar').classList.add('hide');
      $('hint').textContent = 'Geser kiri-kanan, pilih satu gerbang'; $('hint').classList.remove('hide');
      $('hStage').textContent = 'Stage ' + n + ' · ' + lvl.theme.name;
      $('hCoins').textContent = save.coins;
      updatePowerupUI();

      $('fade').style.opacity = '0';

      doCountdown(function () {
        state = 'run';
      });
      state = 'countdown';
    }, 400);
  }

  function syncWingmen() {
    var want = Math.max(0, Math.min(8, Math.floor(Math.log(Math.max(1, power) / 10) / Math.LN2)));
    while (wingmen.length < want) {
      var i = wingmen.length, row = Math.ceil((i + 1) / 2), w = World.makePlane(skin().body, 0.7, skin());
      w.position.set((i % 2 ? 1 : -1) * row * 0.62, 0, row * 0.9);
      player.add(w); wingmen.push(w);
    }
    while (wingmen.length > want) player.remove(wingmen.pop());
  }

  function updatePowerupUI() {
    var box = $('powerups');
    box.innerHTML = '';
    if (shieldTimer > 0) {
      var s = document.createElement('div');
      s.className = 'puIcon';
      s.classList.add('shield');
      s.textContent = '🛡️ ' + Math.ceil(shieldTimer) + 's';
      box.appendChild(s);
    }
    if (magnetTimer > 0) {
      var m = document.createElement('div');
      m.className = 'puIcon';
      m.classList.add('magnet');
      m.textContent = '🧲 ' + Math.ceil(magnetTimer) + 's';
      box.appendChild(m);
    }
    box.classList.toggle('hide', shieldTimer <= 0 && magnetTimer <= 0);
  }

  function updateShieldVisual() {
    if (shieldTimer > 0 && !shieldMesh) {
      var geo = new THREE.SphereGeometry(1.8, 12, 8);
      shieldMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 0x00aaff, transparent: true, opacity: 0.2, wireframe: true
      }));
      player.add(shieldMesh);
    } else if (shieldTimer <= 0 && shieldMesh) {
      player.remove(shieldMesh);
      shieldMesh = null;
    }
    if (shieldMesh) {
      shieldMesh.rotation.y += 0.03;
      shieldMesh.rotation.x += 0.01;
      shieldMesh.material.opacity = 0.15 + Math.sin(time * 6) * 0.08;
    }
  }

  function hurt(amount, color) {
    if (shieldTimer > 0) {
      // Shield absorbs hit
      World.burst(px, 1.2, pz, 0x00aaff, 12);
      beep(800, 0.08, 'sine');
      shieldTimer = Math.max(0, shieldTimer - 0.8);
      return;
    }
    power -= amount; hurtT = 0.3; flashVig('rgba(255,77,109,.7)', 0.8);
    World.burst(px, 1.2, pz, color || 0xff5252, 14);
    beep(150, 0.18, 'sawtooth');
    streak = 0;
    updateStreakUI();
  }

  function showCombo(text) {
    comboText = text;
    comboPopT = 1.2;
  }

  function updateStreakUI() {
    var el = $('streakBox');
    if (streak >= 2) {
      el.classList.remove('hide');
      el.textContent = '🔥 x' + streak + ' COMBO';
      el.dataset.tier = streak >= 5 ? 3 : streak >= 3 ? 2 : 1;
    } else {
      el.classList.add('hide');
    }
  }

  function finish(win) {
    state = win ? 'win' : 'lose'; clearAtk();
    endT = win ? 0.9 : 1.2;
    if (win) {
      World.burst(0, 2.5, lvl.endZ, 0xffd60a, 50);
      World.burst(0, 2.5, lvl.endZ, 0xff7675, 35);
      World.burst(2, 3, lvl.endZ, 0x2ecc71, 25);
      World.burst(-2, 3, lvl.endZ, 0x6c5ce7, 25);
      var b = boss; bossFlash(false);
      setTimeout(function () { b.visible = false; }, 450);
      slow = 0.4; showBanner('BOSS HANCUR!', '#ffc93c'); flashVig('rgba(255,255,255,.95)', 1);
      [0, 150, 300, 450, 600, 800].forEach(function (ms, i) {
        setTimeout(function () {
          World.burst(b.position.x + (Math.random() - 0.5) * 6, 2 + Math.random() * 3, lvl.endZ + 2, [0xffc93c, 0xff4d6d, 0xffffff, 0x5fd3ff][i % 4], 30);
          beep(200 + i * 90, 0.12, 'sawtooth', 0.07);
        }, ms);
      });
      playJingle([[660, 0.15], [880, 0.15], [1100, 0.25], [1320, 0.4]]);
    } else {
      World.burst(px, 1.2, pz, 0xff5252, 50);
      player.visible = false;
      beep(90, 0.5, 'sawtooth', 0.09);
    }
    $('pow').classList.add('hide'); $('bossBar').classList.add('hide');
    $('streakBox').classList.add('hide'); $('powerups').classList.add('hide');
  }

  function showResult() {
    var win = state === 'win', n = lvl.n;
    $('result').classList.remove('hide');
    $('hud').classList.add('hide');
    if (win) {
      var ratio = powerAtBoss / Math.max(1, lvl.best);
      var stars = ratio >= 0.85 ? 3 : ratio >= 0.6 ? 2 : 1;
      var reward = 10 + n * 2 + stars * 5;
      var bonusCoins = stageCoins;
      save.coins += reward + bonusCoins;
      save.stars[n] = Math.max(save.stars[n] || 0, stars);
      save.unlocked = Math.max(save.unlocked, Math.min(STAGE_COUNT, n + 1));
      $('rTitle').textContent = n === STAGE_COUNT ? '🏆 TAMAT!' : 'STAGE ' + n + ' CLEAR!';
      $('rStars').innerHTML = [1, 2, 3].map(function (i) { return '<i class="' + (i <= stars ? 'on' : '') + '" style="animation-delay:' + (0.4 + i * 0.25) + 's">★</i>'; }).join('');
      for (var q = 1; q <= stars; q++) (function (q) { setTimeout(function () { beep(600 + q * 200, 0.12, 'triangle', 0.07); }, 400 + q * 250); })(q);
      $('rInfo').innerHTML = t('powerInfo') + fmt(powerAtBoss) + t('max') + fmt(lvl.best);
      $('rRewards').innerHTML = '🪙 +' + reward + ' (stage) · +' + bonusCoins + ' (koin)';
      $('rNext').classList.toggle('hide', n >= STAGE_COUNT);
    } else {
      $('rTitle').textContent = 'GAGAL 💥';
      $('rStars').textContent = '';
      $('rInfo').innerHTML = 'Pilih gerbang hijau, hindari yang merah.<br>Koin di jalan: 🪙 ' + stageCoins;
      $('rRewards').textContent = '';
      $('rNext').classList.add('hide');
    }
    persist();
    state = 'result';
  }

  // ---------- update ----------
  function steer(dt) {
    if (keys.ArrowLeft || keys.a) px -= 11 * dt;
    if (keys.ArrowRight || keys.d) px += 11 * dt;
    px = Math.max(-TRACK_HALF + 0.6, Math.min(TRACK_HALF - 0.6, px));
  }

  function collide() {
    for (var i = 0; i < objs.length; i++) {
      var e = objs[i], it = e.it;
      if (e.done) continue;
      if (it.z < pz - 60) break;

      // Animate items
      if (it.t === 'gate' && it.moving) e.o.position.x = Math.sin(time * 1.5 + it.z) * 1.5;
      if (it.t === 'coin') {
        e.o.rotation.z += 0.08;
        // Magnet attraction
        if (magnetTimer > 0) {
          var cdx = px - e.o.position.x;
          var cdz = pz - it.z;
          var dist = Math.sqrt(cdx * cdx + cdz * cdz);
          if (dist < 6 && dist > 0.5) {
            e.o.position.x += cdx / dist * 12 * (1 / 60);
            it.x = e.o.position.x;
          }
        }
      }
      if (it.t === 'drone') e.o.position.y = 1 + Math.sin(time * 4 + it.z) * 0.15;
      if (it.t === 'shield') {
        e.o.userData.diamond.rotation.y += 0.04;
        e.o.userData.diamond.rotation.x += 0.02;
        e.o.userData.ring.rotation.x += 0.03;
        e.o.position.y = 1.2 + Math.sin(time * 3 + it.z) * 0.2;
      }
      if (it.t === 'magnet') {
        e.o.rotation.y += 0.04;
        e.o.position.y = 1.2 + Math.sin(time * 3 + it.z) * 0.2;
      }
      if (it.t === 'spin') {
        var a = it.ph + time * it.sp;
        e.o.userData.arm.rotation.y = a;
        var dx = px, dz = pz - it.z;
        if (Math.abs(dz) < 4) {
          var pr = Math.max(-3.5, Math.min(3.5, dx * Math.cos(a) - dz * Math.sin(a)));
          var ex = dx - pr * Math.cos(a), ez = dz + pr * Math.sin(a);
          if (ex * ex + ez * ez < 0.55) { e.done = true; hurt(Math.ceil(power * 0.3), 0xe84393); }
        } else if (dz < -4) e.done = true;
        continue;
      }
      if (!(prevZ > it.z && pz <= it.z)) continue;
      e.done = true;
      if (it.t === 'gate') {
        var pickR = px >= e.o.position.x, op = pickR ? it.R : it.L;
        World.gateTaken(e.o, pickR);
        power = applyOp(power, op);
        if (isGood(op)) {
          streak++;
          var bonus = streak >= 5 ? 3 : streak >= 3 ? 2 : 0;
          if (bonus > 0) {
            save.coins += bonus; stageCoins += bonus;
            showCombo('🔥 COMBO x' + streak + ' +' + bonus);
          }
          World.burst(px, 1.2, pz, 0x2ecc71, 16 + streak * 2);
          beep(700 + streak * 50, 0.1);
          updateStreakUI();
        } else {
          hurtT = 0.3; streak = 0; updateStreakUI();
          World.burst(px, 1.2, pz, 0xff5252, 12);
          beep(170, 0.16, 'sawtooth');
        }
        e.o.visible = false;
      if (it.t === 'gate') { e.o.visible = true; World.gateFade(e.o); }
      } else if (it.t === 'coin') {
        if (Math.abs(px - it.x) < 1.4) {
          e.o.visible = false; save.coins++; stageCoins++;
          $('hCoins').textContent = save.coins;
          beep(1200, 0.05, 'sine');
        } else { e.done = false; }
      } else if (it.t === 'shield') {
        if (Math.abs(px - it.x) < 1.6) {
          e.o.visible = false;
          shieldTimer = shieldDuration();
          World.burst(px, 1.2, pz, 0x00aaff, 20);
          beep(900, 0.15, 'sine'); setTimeout(function () { beep(1100, 0.1, 'sine'); }, 80);
          updatePowerupUI();
        } else { e.done = false; }
      } else if (it.t === 'magnet') {
        if (Math.abs(px - it.x) < 1.6) {
          e.o.visible = false;
          magnetTimer = magnetDuration();
          World.burst(px, 1.2, pz, 0xff5555, 20);
          beep(600, 0.15, 'sine'); setTimeout(function () { beep(800, 0.1, 'sine'); }, 80);
          updatePowerupUI();
        } else { e.done = false; }
      } else if (it.t === 'drone') {
        if (Math.abs(px - it.x) < 1.6) { e.o.visible = false; hurt(it.v); }
      } else if (it.t === 'block') {
        if (Math.abs(px - it.x) < 1.75) hurt(Math.ceil(power * 0.3), 0xfdcb6e);
      } else if (it.t === 'wall') {
        e.o.visible = false; hurt(it.v, 0xe67e22);
      }
    }
  }

  function update(dt) {
    if (state === 'win') dt *= slow; else slow = 1;
    time += dt;
    if (state === 'countdown') {
      // Camera idle during countdown
    } else if (state === 'run') {
      runT += dt;
      if (runT > 2.5) $('hint').classList.add('hide');
      steer(dt);
      prevZ = pz;
      pz -= lvl.speed * dt;
      collide();

      // Power-up timers
      if (shieldTimer > 0) { shieldTimer -= dt; if (shieldTimer <= 0) { shieldTimer = 0; beep(300, 0.2, 'sine'); } updatePowerupUI(); }
      if (magnetTimer > 0) { magnetTimer -= dt; if (magnetTimer <= 0) { magnetTimer = 0; beep(300, 0.2, 'sine'); } updatePowerupUI(); }

      // Trail
      trailAcc += dt;
      if (trailAcc > 0.04) {
        trailAcc = 0;
        World.addTrail(px + (Math.random() - 0.5) * 0.3, 0.6, pz + 1.4, shieldTimer > 0 ? 0x00bbff : skin().flame);
      }

      if (power <= 0) { power = 0; finish(false); }
      else if (pz <= lvl.endZ + 22) {
        pz = lvl.endZ + 22; state = 'boss'; powerAtBoss = power; shotAcc = 0;
        $('bossBar').classList.remove('hide'); $('hint').classList.add('hide');
        $('bossLabel').textContent = lvl.big ? '👾 MEGA BOSS' : '👾 BOSS';
        ghost = 1; bossPhase = 0; $('bossBar').dataset.phase = 0; atkT = 1.6;
        setTimeout(function () { if (state === 'boss') { $('hint').textContent = 'Hindari jalur merah!'; $('hint').classList.remove('hide'); setTimeout(function () { $('hint').classList.add('hide'); }, 2200); } }, 1200);
        showBanner(lvl.big ? 'MEGA BOSS!' : 'BOSS!', '#ff4d6d', 'warn');
        flashVig('rgba(255,77,109,.8)'); beep(110, 0.5, 'sawtooth', 0.09);
      }
    } else if (state === 'boss') {
      steer(dt);
      boss.position.x = Math.sin(time * 1.3) * 2;
      if (lvl.big) boss.position.y = 2.2 + Math.sin(time * 0.7) * 0.5;
      shotAcc += Math.max(4, bossHpMax / (lvl.big ? 11 : 7)) * dt * (1 + bossPhase * 0.25);
      var d = Math.min(Math.floor(shotAcc), power, bossHp);
      if (d > 0) {
        shotAcc -= d; power -= d; bossHp -= d;
        dmgAcc += d; flashT = 0.07; punch = 1;
        wingmen.forEach(function (w) { World.spark(px + w.position.x, 1, pz + w.position.z - 1, (boss.position.x - px - w.position.x) * 2, 2.5, -44, 0.45, 0x9fe8ff, 0.2); });
        World.spark(px, 1, pz - 1, (boss.position.x - px) * 2, 2.5, -44, 0.45, 0xffe066, 0.3);
        if (Math.random() < 0.3) { World.burst(boss.position.x, 2.2, lvl.endZ + 2, 0xff7675, 3); beep(260 + (1 - bossHp / bossHpMax) * 500 + Math.random() * 80, 0.05, 'square', 0.05); }
      }
      var pct = Math.max(0, bossHp / bossHpMax);
      $('bossBarFill').style.width = pct * 100 + '%';
      ghost = Math.max(pct, ghost - dt * 0.35);
      $('bossBarGhost').style.width = ghost * 100 + '%';
      $('bossNum').textContent = fmt(bossHp);
      var ph = pct > 0.66 ? 0 : pct > 0.33 ? 1 : 2;
      if (ph !== bossPhase && bossHp > 0) {
        bossPhase = ph; $('bossBar').dataset.phase = ph;
        showBanner(ph === 1 ? 'MAKIN PANAS!' : 'TINGGAL DIKIT!', ph === 1 ? '#ffc93c' : '#ff4d6d');
        flashVig('rgba(255,201,60,.7)'); hurtT = 0.3; beep(220, 0.3, 'square', 0.08);
        World.burst(boss.position.x, 2.5, boss.position.z, 0xffc93c, 30);
      }
      dmgT -= dt;
      if (dmgT <= 0 && dmgAcc > 0) { popDmg(dmgAcc, dmgAcc >= bossHpMax * 0.06); dmgAcc = 0; dmgT = 0.16; }
      flashT = Math.max(0, flashT - dt); punch = Math.max(0, punch - dt * 8);
      bossFlash(flashT > 0);
      boss.scale.setScalar(1 + punch * 0.05);
      boss.position.z = lvl.endZ + punch * 0.9;
      if (bossHp > 0) {
        atkT -= dt;
        if (!atk && atkT <= 0) {
          var xs = bossPhase === 2 ? [-3.2, 3.2] : [[-3, 0, 3][Math.floor(Math.random() * 3)]];
          var aw = bossPhase === 1 ? 4.4 : 3.2;
          atk = { xs: xs, w: aw, t: bossPhase === 2 ? 0.75 : 1, meshes: xs.map(function (ax) { return World.warn(ax, aw, lvl.endZ + 1.5, pz); }) };
          beep(500, 0.08, 'square', 0.04);
        }
        if (atk) {
          atk.t -= dt;
          var wop = Math.sin(time * 32) > 0 ? 0.55 : 0.2;
          atk.meshes.forEach(function (m) { m.material.opacity = wop; });
          if (atk.t <= 0) {
            var ak = atk, hit = ak.xs.some(function (ax) { return Math.abs(px - ax) < ak.w / 2 + 0.15; });
            clearAtk();
            ak.xs.forEach(function (ax) { World.burst(ax, 1.4, pz - 5, 0xff4d6d, 18); World.burst(ax, 1.4, pz - 14, 0xffc93c, 14); });
            if (hit) hurt(Math.max(1, Math.ceil(powerAtBoss * 0.08)), 0xff4d6d);
            else { beep(1100, 0.1, 'sine', 0.06); World.burst(px, 1.2, pz, 0x5fd3ff, 10); }
            atkT = bossPhase === 2 ? 1.1 : bossPhase === 1 ? 1.5 : 2;
          }
        }
      }
      if (bossHp <= 0) finish(true);
      else if (power <= 0) finish(false);
    } else if (state === 'win' || state === 'lose') {
      endT -= dt;
      if (endT <= 0) showResult();
    }

    // Combo popup
    if (comboPopT > 0) comboPopT -= dt;

    if (player && state !== 'menu' && state !== 'result') {
      syncWingmen();
      updateShieldVisual();
      var bank = (px - player.position.x) * 0.5;
      player.position.set(px, 1 + Math.sin(time * 5) * 0.08, pz);
      player.rotation.z = -Math.max(-0.6, Math.min(0.6, bank * 4));
      player.children.forEach(function (c) { if (c.userData.flame) c.userData.flame.scale.y = 0.25 + Math.random() * 0.2; });
    }
    hurtT = Math.max(0, hurtT - dt);
    World.updateFx(dt);

    var cam = World.camera();
    if (state === 'menu' || state === 'result') {
      cam.position.set(Math.sin(time * 0.3) * 3, 9, 14); cam.lookAt(0, 1, -12);
    } else if (state === 'countdown') {
      cam.position.set(0, 8, 12); cam.lookAt(0, 1, -9);
    } else {
      var shake = hurtT > 0 ? (Math.random() - 0.5) * 0.4 : state === 'win' ? (Math.random() - 0.5) * 0.35 : state === 'boss' ? (Math.random() - 0.5) * 0.14 * punch : 0;
      var back = state === 'boss' ? 15 : 12;
      cam.position.set(px * 0.55 + shake, 8 + shake, pz + back);
      cam.lookAt(px * 0.55, 1, pz - 9);
      if (state === 'run' || state === 'boss') {
        var sp = World.screenPos(new THREE.Vector3(px, 2.3, pz));
        var el = $('pow');
        el.style.left = sp.x + 'px'; el.style.top = sp.y + 'px';
        el.textContent = fmt(power);
        el.style.background = hurtT > 0 ? '#ff4d6d' : shieldTimer > 0 ? '#7b5cff' : '#3a5bff';
        $('bar').style.width = Math.min(100, pz / (lvl.endZ + 22) * 100) + '%';
      }
    }
  }

  function loop(ts) {
    if (paused) { last = ts; requestAnimationFrame(loop); return; }
    var dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    update(dt);
    World.render();
    requestAnimationFrame(loop);
  }

  // ---------- input ----------
  var cv = $('c');
  cv.addEventListener('pointerdown', function (e) { dragX = e.clientX; });
  window.addEventListener('pointermove', function (e) {
    if (dragX === null || (state !== 'run' && state !== 'boss')) return;
    px += (e.clientX - dragX) / window.innerWidth * 13;
    dragX = e.clientX;
  });
  window.addEventListener('pointerup', function () { dragX = null; });
  window.addEventListener('pointercancel', function () { dragX = null; });
  window.addEventListener('keydown', function (e) { keys[e.key] = true; });
  window.addEventListener('keyup', function (e) { keys[e.key] = false; });
  window.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  World.init(cv);
  World.setTheme(THEMES[0], -200);
  boot();
})();
