/* Flight Simulator: 3D scene, controls and HUD. Physics lives in flight-physics.js */
(() => {
  const FP = FlightPhysics, P = FP.P;
  const $ = id => document.getElementById(id);
  const canvas = $('view');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { $('nogl').hidden = false; $('start').hidden = true; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  /* ---------- scene ---------- */
  const SKY = 0x9ec9f0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 1500, 16000);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 40000);
  scene.add(new THREE.HemisphereLight(0xdff0ff, 0x6a8a4a, 0.7));
  const sun = new THREE.DirectionalLight(0xfff3d6, 0.6); sun.position.set(-300, 600, 200); scene.add(sun);

  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rand = rng(20261109);

  // ground
  (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#5f8f43'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) { const v = 90 + rand() * 60; g.fillStyle = `rgba(${v * 0.6 | 0},${v | 0},${v * 0.4 | 0},.35)`; g.fillRect(rand() * 256, rand() * 256, 2 + rand() * 6, 2 + rand() * 6); }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(500, 500); tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshLambertMaterial({ map: tex }));
    m.rotation.x = -Math.PI / 2; scene.add(m);
  })();

  // runway (z from -650 to +650, 30 m wide)
  (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 2048; const g = c.getContext('2d');
    g.fillStyle = '#3b4048'; g.fillRect(0, 0, 128, 2048);
    g.fillStyle = '#e8eaf0'; g.fillRect(4, 0, 3, 2048); g.fillRect(121, 0, 3, 2048);
    for (let y = 160; y < 1900; y += 70) g.fillRect(61, y, 6, 36);
    for (const y0 of [24, 1964]) for (let i = 0; i < 8; i++) g.fillRect(14 + i * 13, y0, 7, 52);
    g.fillRect(10, 112, 108, 6); g.fillRect(10, 1930, 108, 6);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(30, 1300), new THREE.MeshLambertMaterial({ map: tex }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.06; scene.add(m);
    // grass verge strip for contrast
    const v = new THREE.Mesh(new THREE.PlaneGeometry(70, 1340), new THREE.MeshLambertMaterial({ color: 0x4f7d3a }));
    v.rotation.x = -Math.PI / 2; v.position.y = 0.03; scene.add(v);
  })();

  // trees, houses, mountains, clouds
  (() => {
    const treeGeo = new THREE.ConeGeometry(3.2, 11, 6); treeGeo.translate(0, 5.5, 0);
    const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshLambertMaterial({ color: 0x2f6b34 }), 900);
    const houseGeo = new THREE.BoxGeometry(11, 7, 13); houseGeo.translate(0, 3.5, 0);
    const houses = new THREE.InstancedMesh(houseGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), 160);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
    const clear = (x, z) => Math.abs(x) < 70 && z > -900 && z < 4200;
    const place = (mesh, n, minR, maxR, scaleFn, colorFn) => {
      for (let i = 0; i < n; i++) {
        let x, z; do { const a = rand() * Math.PI * 2, r = minR + rand() * (maxR - minR); x = Math.cos(a) * r; z = Math.sin(a) * r + 800; } while (clear(x, z));
        q.setFromEuler(new THREE.Euler(0, rand() * 6.28, 0)); const k = scaleFn(); s.set(k, k * (0.8 + rand() * 0.6), k); p.set(x, 0, z);
        m.compose(p, q, s); mesh.setMatrixAt(i, m); if (colorFn) mesh.setColorAt(i, colorFn(col));
      }
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; scene.add(mesh);
    };
    place(trees, 900, 90, 5500, () => 0.7 + rand() * 0.9);
    place(houses, 160, 140, 3500, () => 0.7 + rand() * 0.6, c => c.setHSL(0.05 + rand() * 0.1, 0.25, 0.7 + rand() * 0.2));
    const palette = [0x7b8fa8, 0x8a9bb0, 0x6f8296];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rand() * 0.3, r = 11000 + rand() * 4500, h = 1200 + rand() * 1800;
      const mt = new THREE.Mesh(new THREE.ConeGeometry(h * 0.9, h, 5), new THREE.MeshLambertMaterial({ color: palette[i % 3] }));
      mt.position.set(Math.cos(a) * r, h / 2 - 20, Math.sin(a) * r + 800); mt.rotation.y = rand() * 3; scene.add(mt);
    }
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: true });
    for (let i = 0; i < 36; i++) {
      const g = new THREE.Group();
      for (let j = 0; j < 4; j++) { const sp = new THREE.Mesh(new THREE.SphereGeometry(40 + rand() * 50, 8, 6), cloudMat); sp.position.set((rand() - .5) * 160, (rand() - .5) * 20, (rand() - .5) * 90); sp.scale.y = 0.55; g.add(sp); }
      g.position.set((rand() - .5) * 14000, 700 + rand() * 900, (rand() - .5) * 14000 + 800); scene.add(g);
    }
  })();

  // plane model (nose points to -Z)
  const plane = new THREE.Group();
  const prop = (() => {
    const white = new THREE.MeshLambertMaterial({ color: 0xf4f6fb }), red = new THREE.MeshLambertMaterial({ color: 0xd9363e }), dark = new THREE.MeshLambertMaterial({ color: 0x20252e }), glass = new THREE.MeshLambertMaterial({ color: 0x7fb4de });
    const add = (geo, mat, x, y, z, rx, ry, rz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (rx) m.rotation.x = rx; if (ry) m.rotation.y = ry; if (rz) m.rotation.z = rz; plane.add(m); return m; };
    add(new THREE.CylinderGeometry(0.75, 0.55, 5.6, 10), white, 0, 1.1, 0, Math.PI / 2);       // fuselage
    add(new THREE.CylinderGeometry(0.55, 0.15, 3.4, 8), white, 0, 1.25, 4.4, Math.PI / 2);    // tail cone
    add(new THREE.ConeGeometry(0.76, 1.0, 10), red, 0, 1.05, -3.2, -Math.PI / 2);             // nose
    add(new THREE.BoxGeometry(11, 0.14, 1.7), white, 0, 1.75, -0.4);                          // wing
    add(new THREE.BoxGeometry(11, 0.15, 0.4), red, 0, 1.75, -1.35);                           // wing edge
    add(new THREE.BoxGeometry(3.8, 0.1, 1.0), white, 0, 1.5, 6.0);                            // h-stab
    add(new THREE.BoxGeometry(0.1, 1.5, 1.2), red, 0, 2.2, 5.9);                              // fin
    add(new THREE.BoxGeometry(1.0, 0.5, 1.3), glass, 0, 1.75, -1.0);                          // canopy
    add(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 6), dark, 0, 0.35, -1.7);                 // nose gear
    add(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 10), dark, 0, 0.0, -1.7, 0, 0, Math.PI / 2);
    for (const x of [-1.5, 1.5]) { add(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6), dark, x, 0.5, 0.2, 0, 0, x > 0 ? -0.35 : 0.35); add(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10), dark, x * 1.1, 0.0, 0.2, 0, 0, Math.PI / 2); }
    const pr = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.3, 0.14), dark); pr.position.set(0, 1.05, -3.7); plane.add(pr); return pr;
  })();
  plane.position.y = 0.3; // wheels on ground at y=0 for model origin
  const planeRoot = new THREE.Group(); planeRoot.add(plane); scene.add(planeRoot);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.6, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.26, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1.2, 0.8, 1); scene.add(shadow);

  /* ---------- state & input ---------- */
  let s = FP.create('takeoff'), mode = 'takeoff', running = false, paused = false, camMode = 0, keepRolling = false;
  const keys = {}, vk = {};
  const inp = { pitch: 0, roll: 0, throttleRate: 0, brake: false, assist: true };
  const opt = { invert: false };
  let ramp = { pitch: 0, roll: 0 };

  const pressed = k => !!(keys[k] || vk[k]);
  window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) { keys[e.code] = true; return; }
    keys[e.code] = true;
    if (!running) return;
    if (e.code === 'KeyP') togglePause();
    else if (e.code === 'KeyC') camMode = (camMode + 1) % 2;
    else if (e.code === 'KeyR') restart();
    else if (e.code === 'KeyH') $('start').hidden = false, paused = true;
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  document.querySelectorAll('#touch button').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); vk[k] = true; b.classList.add('on'); }, off = e => { e.preventDefault(); vk[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  });

  function readInput(dt) {
    let pt = (pressed('ArrowUp') || pressed('up') ? 1 : 0) - (pressed('ArrowDown') || pressed('down') ? 1 : 0);
    if (opt.invert) pt = -pt;
    let rt = (pressed('ArrowRight') || pressed('right') ? 1 : 0) - (pressed('ArrowLeft') || pressed('left') ? 1 : 0);
    const mv = (cur, tgt) => { const rate = tgt === 0 ? 5 : 3; return cur + Math.max(-rate * dt, Math.min(rate * dt, tgt - cur)); };
    ramp.pitch = mv(ramp.pitch, pt); ramp.roll = mv(ramp.roll, rt);
    inp.pitch = ramp.pitch; inp.roll = ramp.roll;
    inp.throttleRate = ((pressed('KeyW') || pressed('PageUp') || pressed('thrUp')) ? 1 : 0) - ((pressed('KeyS') || pressed('PageDown') || pressed('thrDn')) ? 1 : 0);
    inp.brake = !!(pressed('KeyB') || pressed('Space') || pressed('brake'));
    inp.assist = $('optAssist').checked;
  }

  /* ---------- HUD ---------- */
  const att = $('att').getContext('2d');
  function drawAttitude() {
    const w = 132, c = w / 2, r = 62; att.clearRect(0, 0, w, w); att.save();
    att.beginPath(); att.arc(c, c, r, 0, Math.PI * 2); att.clip();
    att.translate(c, c); att.rotate(-s.phi);
    const pitchPx = Math.max(-60, Math.min(60, s.theta * 57.3 * 2.2));
    att.fillStyle = '#4aa3e8'; att.fillRect(-100, -100 + pitchPx, 200, 100);
    att.fillStyle = '#8a6a3d'; att.fillRect(-100, pitchPx, 200, 100);
    att.strokeStyle = '#fff'; att.lineWidth = 2; att.beginPath(); att.moveTo(-100, pitchPx); att.lineTo(100, pitchPx); att.stroke();
    att.lineWidth = 1; for (const d of [-10, 10, 20, -20]) { const y = pitchPx - d * 2.2; att.beginPath(); att.moveTo(-14, y); att.lineTo(14, y); att.stroke(); }
    att.restore();
    att.strokeStyle = '#fbbf24'; att.lineWidth = 3; att.beginPath(); att.moveTo(c - 30, c); att.lineTo(c - 10, c); att.moveTo(c + 10, c); att.lineTo(c + 30, c); att.moveTo(c, c - 2); att.lineTo(c, c + 2); att.stroke();
    att.strokeStyle = 'rgba(255,255,255,.5)'; att.lineWidth = 2; att.beginPath(); att.arc(c, c, r, 0, Math.PI * 2); att.stroke();
  }
  let toastTimer = 0;
  function toast(html, ms = 5000) { const t = $('toast'); t.innerHTML = html; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, ms); }

  const isTouch = window.matchMedia && matchMedia('(pointer:coarse)').matches;
  const KEYS = isTouch ? { W: 'PWR +', S: 'PWR −', UP: '▲', DOWN: '▼', LR: '◀ ▶', B: 'BRAKE' } : { W: 'W', S: 'S', UP: '↑', DOWN: '↓', LR: '← →', B: 'B' };
  const T = str => str.replace(/\{(W|S|UP|DOWN|LR|B)\}/g, (_, k) => KEYS[k]);
  function coachText() { return T(coachRaw()); }
  function coachRaw() {
    const kt = Math.hypot(s.vx, s.vz) * FP.KT, alt = s.y * FP.FT, vs = s.vy * FP.FPM;
    if (s.landing && !s.landing.crash && s.onGround) return kt > 3 ? 'Safe on the ground. Hold {B} to brake and stay on the centerline.' : 'Landed. Use the restart button to fly again.';
    if (!s.onGround && s.y > 60 && vs < -1000) return 'FALLING FAST (' + Math.round(-vs) + ' ft/min). Lower the nose to gain speed, add power ({W}), then ease the nose up gently.';
    if (!s.onGround && alt > 1500) return 'TOO HIGH (above 1,500 ft). Reduce power ({S}) and lower the nose gently to come back to a normal altitude.';
    if (!s.onGround && s.y > 3 && s.y < 25 && s.mode !== 'approach' && !s.landing) return 'TOO LOW. Add power ({W}) and raise the nose gently to climb to a safe altitude.';
    if (!s.onGround && kt > 115) return 'TOO FAST. Cut power ({S}) and raise the nose a little to get back to normal speed (60 to 100 kt).';
    if (!s.onGround && !s.stalled && s.y > 5 && kt < 50 && s.mode !== 'approach') return 'TOO SLOW. Lower the nose and add power ({W}) to get back to normal speed (60 to 100 kt).';
    if (s.stalled) return 'STALL. Release the pitch keys, lower the nose and add power ({W}).';
    if (s.mode === 'approach' && !s.landing) {
      const dist = Math.max(0, Math.round(s.z - 650));
      if (alt > 60) return `Final approach: ${dist} m to the runway. Aim for ~65 kt and a descent of about 400 ft/min. Speed: nose angle. Descent: power.`;
      return 'Almost there. Cut power ({S}), keep wings level and let the plane settle onto the runway.';
    }
    if (s.onGround && !s.landing) {
      if (s.throttle < 0.9 && kt < 5) return 'Hold {W} for full power. Keep the nose straight with {LR}.';
      if (kt < 50) return `Accelerating: ${Math.round(kt)} kt. At about 55 kt, press {UP} gently to lift the nose.`;
      return 'Rotate now! Press {UP} gently to lift off.';
    }
    if (alt < 150) return 'You are flying! Keep the nose up slightly and keep climbing.';
    if (alt < 600) return 'Nice climb. Try a gentle turn with {LR}. Then level off by easing the nose down ({DOWN}).';
    if (vs > 300) return 'Level off: press {DOWN} a little and reduce power ({S}) until the climb rate is near zero.';
    if (s.landing && s.landing.crash) return '';
    return 'Ready to land? Turn back toward the runway, descend to ~65 kt at about 400 ft/min, then cut power near the ground.';
  }

  function updateHud() {
    const kt = Math.hypot(s.vx, s.vy, s.vz) * FP.KT;
    $('gSpd').textContent = Math.round(kt);
    $('gAlt').textContent = Math.max(0, Math.round(s.y * FP.FT / 10) * 10);
    $('gVs').textContent = (Math.round(s.vy * FP.FPM / 10) * 10 > 0 ? '+' : '') + Math.round(s.vy * FP.FPM / 10) * 10;
    $('gHdg').textContent = String(Math.round(((s.psi * 180 / Math.PI) % 360 + 360) % 360)).padStart(3, '0');
    $('thrBar').style.height = (s.throttle * 100) + '%'; $('thrTxt').textContent = Math.round(s.throttle * 100) + '%';
    const aoa = Math.max(0, Math.min(1, (s.alpha + 0.05) / 0.4));
    $('aoaBar').style.height = (aoa * 100) + '%'; $('aoaBar').style.background = s.alpha > P.aStall ? '#f87171' : s.alpha > P.aStall - 0.07 ? '#fbbf24' : '#34d399';
    $('aoaTxt').textContent = (s.alpha * 57.3).toFixed(0) + '°';
    { const k = Math.hypot(s.vx, s.vz) * FP.KT; $('gAlt').style.color = (s.onGround || s.mode === 'approach') ? '' : (s.y * FP.FT > 1500 ? '#f87171' : s.y < 25 ? '#fbbf24' : '#34d399'); $('gVs').style.color = (!s.onGround && s.vy * FP.FPM < -1000) ? '#f87171' : ''; $('gSpd').style.color = s.onGround ? '' : (k > 115 || k < 50) ? '#f87171' : (k > 100 || k < 60) ? '#fbbf24' : '#34d399'; }
    { // warning lamps
      const k = Math.hypot(s.vx, s.vz) * FP.KT, alt = s.y * FP.FT, vs = s.vy * FP.FPM, air = !s.onGround;
      const on = {
        stall: s.stalled, slow: air && !s.stalled && s.y > 5 && k < 50 && s.mode !== 'approach', fast: air && k > 115,
        sink: air && s.y < 60 && vs < -700, low: air && s.y > 3 && s.y < 25 && s.mode !== 'approach' && !s.landing, high: air && alt > 1500,
        bank: air && Math.abs(s.phi) > 0.6, nose: !!s.aoaWarn, off: s.onGround && !s.landing && (Math.abs(s.x) > 15 || Math.abs(s.z) > 650)
      };
      document.querySelectorAll('#annun span').forEach(e => e.classList.toggle('on', !!on[e.dataset.w]));
    }
    const w = $('warn');
    if (s.stalled) { w.textContent = 'STALL'; w.hidden = false; }
    else if (!s.onGround && s.y < 60 && s.vy * FP.FPM < -700) { w.textContent = '⚠ SINK RATE: PULL UP'; w.hidden = false; }
    else if (!s.onGround && s.y > 60 && s.vy * FP.FPM < -1000) { w.textContent = '⚠ FALLING FAST'; w.hidden = false; }
    else if (!s.onGround && s.y * FP.FT > 1500) { w.textContent = '⚠ ALTITUDE TOO HIGH'; w.hidden = false; }
    else if (!s.onGround && s.y > 3 && s.y < 25 && s.mode !== 'approach' && !s.landing) { w.textContent = '⚠ TOO LOW'; w.hidden = false; }
    else if (!s.onGround && Math.hypot(s.vx, s.vz) * FP.KT > 115) { w.textContent = '⚠ TOO FAST'; w.hidden = false; }
    else if (!s.onGround && s.y > 5 && Math.hypot(s.vx, s.vz) * FP.KT < 50) { w.textContent = '⚠ TOO SLOW'; w.hidden = false; }
    else if (!s.onGround && Math.abs(s.phi) > 0.6) { w.textContent = '⚠ STEEP BANK: LEVEL THE WINGS'; w.hidden = false; }
    else if (s.aoaWarn) { w.textContent = 'NOSE TOO HIGH'; w.hidden = false; }
    else w.hidden = true;
    $('coachText').textContent = coachText();
    $('coach').hidden = !$('coachText').textContent;
    drawAttitude();
  }

  /* ---------- flow ---------- */
  function begin(m) {
    mode = m; s = FP.create(m); ramp = { pitch: 0, roll: 0 }; keepRolling = false; paused = false; running = true;
    $('start').hidden = true; $('result').hidden = true; $('hud').hidden = false; $('toast').hidden = true;
    $('coachTag').textContent = m === 'approach' ? 'Landing' : 'Takeoff';
    $('btnPause').textContent = '⏸'; canvas.focus();
  }
  const restart = () => begin(mode);
  function togglePause() { paused = !paused; $('btnPause').textContent = paused ? '▶' : '⏸'; if (paused) toast('Paused. Press P to continue.', 99999); else $('toast').hidden = true; }
  $('modeTake').onclick = () => begin('takeoff'); $('modeLand').onclick = () => begin('approach');
  $('btnPause').onclick = togglePause; $('btnCam').onclick = () => camMode = (camMode + 1) % 2; $('btnRestart').onclick = restart;
  $('btnHelp').onclick = () => { paused = true; $('start').hidden = false; };
  $('optInvert').onchange = e => opt.invert = e.target.checked;
  $('resAgain').onclick = restart; $('resMenu').onclick = () => { $('result').hidden = true; $('start').hidden = false; running = false; };
  $('resKeep').onclick = () => { $('result').hidden = true; keepRolling = true; };

  let shownLanding = null;
  function checkLanding() {
    if (!s.landing || shownLanding === s.landing) return; shownLanding = s.landing;
    const L = s.landing;
    if (L.crash) {
      $('resEyebrow').textContent = 'Crash'; $('resTitle').textContent = 'That was a hard one'; $('resKeep').hidden = true;
      $('resText').textContent = `You hit the ground at ${L.sinkFpm} ft/min (${L.reason}). A safe touchdown is under about 890 ft/min with wings level and the nose slightly up. Reduce power earlier and keep the descent gentle.`;
      $('result').hidden = false;
    } else {
      const g = L.grade, spot = L.onRunway ? 'on the runway' + (L.offCenter > 5 ? ` (${L.offCenter} m off center)` : ', centered') : 'off the runway';
      toast(`<b>Touchdown: ${g}</b><br>${L.sinkFpm} ft/min · ${L.speedKt} kt · ${spot}`, 7000);
    }
  }

  /* ---------- loop ---------- */
  const V3 = THREE.Vector3, M4 = THREE.Matrix4;
  const camPos = new V3(0, 8, 640), tmpP = new V3(), tmpF = new V3(), tmpU = new V3(), tmpR = new V3(), tmpB = new V3(), basisM = new M4(), tgt = new V3();
  let last = performance.now(), propAngle = 0;
  function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (running && !paused && !(s.crashed)) {
      readInput(dt);
      const n = Math.ceil(dt / (1 / 120)), h = dt / n;
      for (let i = 0; i < n; i++) FP.step(s, inp, h);
      checkLanding();
    } else if (running) { inp.pitch = inp.roll = 0; }
    const b = FP.basis(s);
    tmpF.set(b.f[0], b.f[1], b.f[2]); tmpU.set(b.u[0], b.u[1], b.u[2]); tmpR.set(b.r[0], b.r[1], b.r[2]); tmpB.copy(tmpF).multiplyScalar(-1);
    basisM.makeBasis(tmpR, tmpU, tmpB);
    planeRoot.quaternion.setFromRotationMatrix(basisM); planeRoot.position.set(s.x, s.y, s.z);
    propAngle += (0.3 + s.throttle * 1.6) * 40 * dt; prop.rotation.z = propAngle;
    shadow.position.set(s.x, 0.1, s.z); const k = 1 + s.y / 120; shadow.scale.set(1.2 * k, 0.8 * k, 1); shadow.material.opacity = Math.max(0.05, 0.26 - s.y / 900);

    // camera
    if (camMode === 0) {
      tgt.copy(planeRoot.position).addScaledVector(tmpF, -21).addScaledVector(new V3(0, 1, 0), 6.5).addScaledVector(tmpU, 0.5);
      camPos.lerp(tgt, 1 - Math.exp(-7 * dt)); camera.position.copy(camPos);
      if (camPos.y < 1.5) camera.position.y = 1.5;
      camera.up.set(0, 1, 0).lerp(tmpU, 0.35).normalize();
      camera.lookAt(tmpP.copy(planeRoot.position).addScaledVector(tmpF, 14).add(new V3(0, 1.5, 0)));
    } else {
      camera.position.copy(planeRoot.position).addScaledVector(tmpF, -0.4).addScaledVector(tmpU, 2.1);
      camera.up.copy(tmpU); camera.lookAt(tmpP.copy(camera.position).addScaledVector(tmpF, 50));
    }
    if (running) updateHud();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // debug / test hooks
  window.__fs = { get s() { return s; }, begin, FP, THREE, renderer, keys };
})();
