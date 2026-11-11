/* Helicopter Rotor Lab: UI, airflow animation, blade cross-section, numbers, pros/cons. */
(() => {
  const RP = RotorPhysics;
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DEG = Math.PI / 180;

  /* ---------- state ---------- */
  const DEFAULT = Object.assign({}, RP.BASE);
  let p = Object.assign({}, DEFAULT);
  let base = Object.assign({}, DEFAULT);
  let m = RP.compute(p), mb = RP.compute(base);
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches, slow = false;

  /* ---------- controls ---------- */
  const DEFS = [
    { k: 'N', label: 'Number of blades', unit: '', min: 2, max: 6, step: 1, hint: 'More blades: more lift area, more drag.' },
    { k: 'R', label: 'Blade length (rotor radius)', unit: ' m', min: 3, max: 8, step: 0.1, hint: 'Longer blades move more air, but tips go faster.' },
    { k: 'c', label: 'Blade width (chord)', unit: ' m', min: 0.15, max: 0.5, step: 0.01, hint: 'Wider blades: more lift, more drag.' },
    { k: 'rpm', label: 'Rotor speed', unit: ' rpm', min: 250, max: 520, step: 5, hint: 'Lift grows with the square of speed.' },
    { k: 'theta', label: 'Blade pitch (collective)', unit: '°', min: 2, max: 20, step: 0.5, hint: 'Steeper blades bite more air. Too steep and they stall.' },
    { k: 'h', label: 'Height above ground', unit: ' m', min: 2, max: 30, step: 0.5, hint: 'Close to the ground the air is cushioned.' }
  ];
  const ctlWrap = $('controls');
  const inputs = {}, outs = {};
  DEFS.forEach(d => {
    const div = document.createElement('div');
    div.className = 'ctl';
    div.innerHTML = '<label for="in_' + d.k + '">' + d.label + '<b id="out_' + d.k + '"></b></label>' +
      '<input id="in_' + d.k + '" type="range" min="' + d.min + '" max="' + d.max + '" step="' + d.step + '"><small>' + d.hint + '</small>';
    ctlWrap.appendChild(div);
    inputs[d.k] = div.querySelector('input');
    outs[d.k] = div.querySelector('b');
    inputs[d.k].addEventListener('input', () => { p[d.k] = +inputs[d.k].value; refresh(); });
  });
  function syncControls() {
    DEFS.forEach(d => {
      inputs[d.k].value = p[d.k];
      const v = d.step >= 1 ? p[d.k].toFixed(0) : d.step >= 0.1 ? p[d.k].toFixed(1) : p[d.k].toFixed(2);
      outs[d.k].textContent = v + d.unit;
    });
  }

  /* ---------- numbers table ---------- */
  const ROWS = [
    { l: 'Lift (thrust)', f: x => (x.T / 1000).toFixed(1) + ' kN', v: x => x.T, dir: 0 },
    { l: 'Lift ÷ weight', f: x => x.TW.toFixed(2), v: x => x.TW, dir: 0 },
    { l: 'Downwash speed', f: x => x.wake.toFixed(1) + ' m/s', v: x => x.wake, dir: -1 },
    { l: 'Disk loading', f: x => x.DL.toFixed(0) + ' N/m²', v: x => x.DL, dir: -1 },
    { l: 'Engine power needed', f: x => (x.P / 1000).toFixed(0) + ' kW', v: x => x.P, dir: -1 },
    { l: 'Hover efficiency', f: x => (x.FM * 100).toFixed(0) + '%', v: x => x.FM, dir: 1 },
    { l: 'Blade tip speed', f: x => x.Vt.toFixed(0) + ' m/s (M ' + x.Mt.toFixed(2) + ')', v: x => x.Vt, dir: -1 },
    { l: 'Blade angle of attack', f: x => x.alpha75.toFixed(1) + '°', v: x => x.alpha75, dir: 0 },
    { l: 'Blade-pass vibration', f: x => x.bpf.toFixed(0) + ' Hz', v: x => x.bpf, dir: 0 }
  ];
  const tbody = $('rows');
  function renderRows() {
    let html = '';
    ROWS.forEach(r => {
      const a = r.v(mb), b = r.v(m), c = RP.pct(b, a);
      html += rowHtml(r.l, r.f(mb), r.f(m), c, r.dir, '%');
    });
    const noise = 60 * Math.log10(m.Mt / mb.Mt);
    const cls = Math.abs(noise) < 0.3 ? 'neu' : noise < 0 ? 'good' : 'bad';
    html += '<tr><td>Noise (rough)</td><td>0 dB</td><td>' + (noise > 0 ? '+' : '') + noise.toFixed(1) + ' dB</td><td class="d ' + cls + '">' + (Math.abs(noise) < 0.3 ? '–' : (noise > 0 ? '▲ ' : '▼ ') + Math.abs(noise).toFixed(1) + ' dB') + '</td></tr>';
    tbody.innerHTML = html;
  }
  function rowHtml(l, a, b, c, dir, u) {
    const flat = Math.abs(c) < 0.5;
    const cls = flat || dir === 0 ? 'neu' : (c * dir > 0 ? 'good' : 'bad');
    return '<tr><td>' + l + '</td><td>' + a + '</td><td>' + b + '</td><td class="d ' + cls + '">' + (flat ? '–' : (c > 0 ? '▲ ' : '▼ ') + Math.abs(c).toFixed(0) + u) + '</td></tr>';
  }

  /* ---------- status, pros, cons ---------- */
  function renderStatus() {
    const chips = [];
    const tw = m.TW;
    if (tw > 1.05) chips.push(['good', 'Climbing about ' + m.climb.toFixed(1) + ' m/s']);
    else if (tw >= 0.95) chips.push(['good', 'Hovering']);
    else chips.push(['bad', 'Sinking: not enough lift']);
    if (m.stalled) chips.push(['bad', 'Blades stalled']);
    if (m.Mt > 0.85) chips.push(['bad', 'Tips near speed of sound']);
    else if (m.Mt > 0.75) chips.push(['warn', 'High tip speed']);
    if (m.geF < 0.92) chips.push(['good', 'In ground effect']);
    $('status').innerHTML = chips.map(c => '<span class="pillx ' + c[0] + '">' + c[1] + '</span>').join('');
    $('stallBadge').hidden = !m.stalled;
    const al = $('alert'); let msg = '', lvl = '';
    if (m.stalled) { msg = '⚠ ERROR: blades stalled (angle ' + m.alpha75.toFixed(0) + '°). Lower the pitch to about 8° to fly normally.'; lvl = 'bad'; }
    else if (m.Mt > 0.85 || p.rpm > 480) { msg = '⚠ ERROR: rotor spinning too FAST (tips at Mach ' + m.Mt.toFixed(2) + '). Slow down to about 400 rpm.'; lvl = 'bad'; }
    else if (tw < 0.95 && m.climb < -2) { msg = '⚠ ERROR: falling at about ' + (-m.climb).toFixed(1) + ' m/s. Add pitch, blades or speed to stop the descent.'; lvl = 'bad'; }
    else if (tw > 1.35) { msg = '⚠ WARNING: climbing too fast (about ' + m.climb.toFixed(1) + ' m/s). Reduce pitch to hold a steady height.'; lvl = 'warn'; }
    else if (p.h < 3 && tw >= 0.95) { msg = '⚠ WARNING: very low (' + p.h.toFixed(1) + ' m). Rotor wash can kick up dust. Climb a little.'; lvl = 'warn'; }
    else if (tw < 0.95) { msg = '⚠ WARNING: too little lift, the helicopter sinks. Add pitch, blades or speed.'; lvl = 'warn'; }
    else if (p.rpm < 300) { msg = '⚠ WARNING: rotor spinning too SLOW. Speed up to about 400 rpm.'; lvl = 'warn'; }
    else if (tw > 1.6) { msg = '⚠ WARNING: way more lift than needed. Power use is very high.'; lvl = 'warn'; }
    al.hidden = !msg; al.textContent = msg; al.className = 'alertbar ' + lvl;
  }
  function renderPC() {
    const t = RP.tradeoffs(p, base, m, mb);
    const li = (arr, empty) => arr.length
      ? arr.map(s => '<li' + (s.indexOf('DANGER') === 0 ? ' class="danger"' : '') + '>' + s + '</li>').join('')
      : '<li class="hint">' + empty + '</li>';
    $('pros').innerHTML = li(t.pros, 'Change something to see what you gain.');
    $('cons').innerHTML = li(t.cons, 'Change something to see what it costs.');
  }

  function drawTop() {
    const cv = $('top'), g = cv.getContext('2d'), S = cv.width, c = S / 2;
    g.clearRect(0, 0, S, S);
    const rs = (S / 2 - 6) * p.R / 8;
    g.strokeStyle = 'rgba(34,211,238,.35)'; g.lineWidth = 1; g.beginPath(); g.arc(c, c, rs, 0, 7); g.stroke();
    g.fillStyle = m.stalled ? '#f87171' : '#e6ecff';
    for (let i = 0; i < p.N; i++) {
      const a = i * 2 * Math.PI / p.N + spin;
      g.save(); g.translate(c, c); g.rotate(a);
      g.beginPath(); g.rect(4, -p.c * 8 / 2 * 1.4, rs - 4, p.c * 8 * 1.4); g.fill(); g.restore();
    }
    g.fillStyle = '#22d3ee'; g.beginPath(); g.arc(c, c, 4, 0, 7); g.fill();
  }

  function refresh() {
    m = RP.compute(p);
    syncControls(); renderRows(); renderStatus(); renderPC();
  }

  /* ---------- buttons ---------- */
  $('btnPause').addEventListener('click', e => { paused = !paused; e.target.setAttribute('aria-pressed', paused); e.target.textContent = paused ? 'Play' : 'Pause'; });
  $('btnSlow').addEventListener('click', e => { slow = !slow; e.target.setAttribute('aria-pressed', slow); });
  $('btnBase').addEventListener('click', () => { base = Object.assign({}, p); mb = RP.compute(base); refresh(); });
  $('btnReset').addEventListener('click', () => { p = Object.assign({}, DEFAULT); base = Object.assign({}, DEFAULT); mb = RP.compute(base); refresh(); });
  document.querySelectorAll('[data-try]').forEach(b => b.addEventListener('click', () => {
    p = Object.assign({}, base);
    const k = b.dataset.try;
    if (k === 'blade') p.N = Math.min(6, base.N + 1);
    if (k === 'long') p.R = Math.min(8, +(base.R + 1).toFixed(1));
    if (k === 'fast') p.rpm = Math.min(520, Math.round(base.rpm * 1.15 / 5) * 5);
    if (k === 'pitch') p.theta = Math.min(20, base.theta + 3);
    if (k === 'ground') p.h = 3;
    refresh();
  }));
  if (paused) { $('btnPause').textContent = 'Play'; $('btnPause').setAttribute('aria-pressed', 'true'); }

  /* ---------- canvas helpers ---------- */
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  function fit(cv) {
    const r = cv.getBoundingClientRect(), w = Math.max(10, Math.round(r.width)), h = Math.max(10, Math.round(r.height));
    if (cv.width !== w * DPR || cv.height !== h * DPR) { cv.width = w * DPR; cv.height = h * DPR; }
    const g = cv.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { g, W: w, H: h };
  }

  /* ---------- side-view airflow ---------- */
  const flow = $('flow');
  const NP = 700, TOP_D = -5.5, HALF = 11;
  let parts = [], rings = [], ringT = 0, spin = 0;
  const wake = d => { const R = p.R; return R * (1 - 0.29 * (1 - Math.exp(-d / (1.2 * R)))); };
  const env = d => d < 0 ? p.R * (1 + 0.45 * (1 - Math.exp(d / (0.9 * p.R)))) : wake(d);
  const speed = d => {
    const vi = Math.max(m.vi, 1.2);
    return d < 0 ? vi * (0.45 + 0.55 * Math.exp(d / (0.9 * p.R))) : vi * (2 - Math.exp(-d / (0.9 * p.R)));
  };
  function spawn(q, anywhere) {
    q.f = (Math.random() * 2 - 1) * 1.4;
    q.d = anywhere ? TOP_D + Math.random() * (p.h - TOP_D) : TOP_D;
    q.g = 0; q.x = 0; q.sgn = q.f < 0 ? -1 : 1; q.px = null;
  }
  for (let i = 0; i < NP; i++) { const q = {}; spawn(q, true); parts.push(q); }

  function stepFlow(dt) {
    const wEnd = speed(p.h);
    for (const q of parts) {
      const outer = Math.abs(q.f) > 1;
      if (!q.g) {
        q.d += speed(q.d) * (outer ? 0.45 : 1) * dt;
        q.x = q.f * env(q.d);
        if (q.d >= p.h - 0.5) { q.g = 1; q.d = p.h - 0.15; q.sgn = q.x < 0 ? -1 : 1; if (Math.abs(q.x) < 0.2) q.sgn = Math.random() < .5 ? -1 : 1; }
      } else {
        const ax = Math.abs(q.x);
        q.x += q.sgn * wEnd * 0.9 * Math.max(0.3, Math.exp(-ax / (3 * p.R))) * dt;
        q.d = p.h - 0.15 - Math.min(1.2, Math.max(0, ax - 1.6 * p.R) * 0.12);
        if (Math.abs(q.x) > HALF + 1) spawn(q, false);
      }
    }
    // tip vortices
    ringT += dt;
    const every = Math.max(0.1, 1 / m.bpf);
    while (ringT > every) { ringT -= every; rings.push({ d: 0.1, s: -1 }, { d: 0.1, s: 1 }); }
    for (const r of rings) r.d += speed(r.d) * 0.85 * dt;
    rings = rings.filter(r => r.d < p.h - 0.4);
    if (rings.length > 120) rings.splice(0, rings.length - 120);
  }

  function drawFlow(dt) {
    const { g, W, H } = fit(flow);
    const cx = W / 2, sx = W / (2 * HALF), ry = Math.round(H * 0.2);
    const gy = ry + 70 + (p.h - 2) / 28 * (H - ry - 70 - 22);
    const Y = d => d < 0 ? ry + d / 6 * (ry - 10) : ry + d / p.h * (gy - ry);
    const X = x => cx + x * sx;
    g.clearRect(0, 0, W, H);
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0a1233'); sky.addColorStop(1, '#0c1840');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // ground
    const gg = g.createLinearGradient(0, gy, 0, H); gg.addColorStop(0, '#2a3358'); gg.addColorStop(1, '#141b38');
    g.fillStyle = gg; g.fillRect(0, gy, W, H - gy);
    g.strokeStyle = '#4b5a92'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, gy); g.lineTo(W, gy); g.stroke();
    g.fillStyle = '#7c8bbf'; g.font = '11px Inter, sans-serif'; g.fillText('ground  (' + p.h.toFixed(1) + ' m below the rotor)', 10, Math.min(H - 6, gy + 16));

    // helicopter body (behind the air)
    g.fillStyle = 'rgba(147,160,208,.28)'; g.strokeStyle = 'rgba(190,200,240,.5)'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(cx, ry + 34, 40, 18, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx + 36, ry + 30); g.lineTo(cx + 120, ry + 24); g.lineTo(cx + 120, ry + 32); g.lineTo(cx + 36, ry + 42); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx - 34, ry + 58); g.lineTo(cx + 34, ry + 58); g.stroke();
    g.beginPath(); g.moveTo(cx - 14, ry + 50); g.lineTo(cx - 14, ry + 58); g.moveTo(cx + 14, ry + 50); g.lineTo(cx + 14, ry + 58); g.stroke();
    g.beginPath(); g.moveTo(cx, ry); g.lineTo(cx, ry + 16); g.stroke();

    // air particles
    g.lineCap = 'round';
    for (const q of parts) {
      const x = X(q.x), y = Y(q.d);
      if (q.px !== null && Math.abs(q.px - x) < 40 && Math.abs(q.py - y) < 40) {
        const w = q.g ? speed(p.h) : speed(q.d) * (Math.abs(q.f) > 1 ? .45 : 1);
        const s = clamp(w / 16, 0, 1);
        g.strokeStyle = 'hsla(' + (212 - 170 * s).toFixed(0) + ',90%,' + (58 + 10 * s).toFixed(0) + '%,' + (Math.abs(q.f) > 1 ? .35 : .8) + ')';
        g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(q.px, q.py); g.lineTo(x, y); g.stroke();
      }
      q.px = x; q.py = y;
    }
    // tip vortices
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.3;
    for (const r of rings) {
      const x = X(r.s * wake(r.d)), y = Y(r.d);
      g.globalAlpha = clamp(1 - r.d / p.h * 0.6, .3, 1);
      g.beginPath(); g.arc(x, y, 4, 0, 7); g.stroke();
    }
    g.globalAlpha = 1;

    // rotor blades
    spin += dt * (p.rpm / 400) * 2 * Math.PI * 0.5;
    const beta = clamp(m.TW * 4, 1, 12) * DEG, Rpx = p.R * sx;
    g.strokeStyle = 'rgba(34,211,238,.35)'; g.setLineDash([4, 5]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - Rpx, ry - Math.sin(beta) * Rpx); g.lineTo(cx, ry); g.lineTo(cx + Rpx, ry - Math.sin(beta) * Rpx); g.stroke(); g.setLineDash([]);
    const bl = [];
    for (let i = 0; i < p.N; i++) { const a = spin + i * 2 * Math.PI / p.N; bl.push({ x: Math.cos(a), z: Math.sin(a) }); }
    bl.sort((a, b) => a.z - b.z);
    for (const b of bl) {
      g.strokeStyle = m.stalled ? (b.z > 0 ? '#f87171' : '#b45454') : (b.z > 0 ? '#e6ecff' : '#8e9bd0');
      g.lineWidth = Math.max(2.5, p.c * sx * 0.55) * (0.8 + 0.3 * b.z);
      g.beginPath(); g.moveTo(cx, ry); g.lineTo(cx + b.x * Rpx * Math.cos(beta), ry - Math.sin(beta) * Rpx * Math.abs(b.x) - 0); g.stroke();
    }
    g.fillStyle = '#22d3ee'; g.beginPath(); g.arc(cx, ry, 5, 0, 7); g.fill();

    // labels
    g.fillStyle = '#9fb0e0'; g.font = '12px Inter, sans-serif';
    g.fillText('air drawn in from above', 10, 18);
    g.fillStyle = '#fbbf24';
    const lx = Math.min(W - 150, cx + Math.max(Rpx, 40) + 14), ly = clamp((ry + gy) / 2, ry + 90, gy - 24);
    g.fillText('downwash ' + m.wake.toFixed(0) + ' m/s', lx, ly);
    g.fillStyle = '#9fb0e0';
    g.fillText('rotor disk: ' + (2 * p.R).toFixed(1) + ' m across', 10, ry - 6 < 36 ? 36 : ry - 6);
  }

  /* ---------- blade cross-section (Joukowski potential flow) ---------- */
  const bladeCv = $('blade');
  const FB = 1, FT_ = 0.08, FK = 0.02;
  const c0 = [-FT_ * FB, FK * FB];
  const FA = Math.hypot(FB - c0[0], -c0[1]);
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const dv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const csq = a => { const r = Math.hypot(a[0], a[1]), x = Math.sqrt((r + a[0]) / 2), y = Math.sqrt(Math.max(0, (r - a[0]) / 2)); return [x, a[1] < 0 ? -y : y]; };
  function gammaFor(alpha) {
    const wte = [FB - c0[0], -c0[1]], e1 = [Math.cos(-alpha), Math.sin(-alpha)], e2 = [Math.cos(alpha), Math.sin(alpha)];
    const t2 = dv(mul([FA * FA, 0], e2), mul(wte, wte));
    const term = [e1[0] - t2[0], e1[1] - t2[1]];
    const v = mul([0, 2 * Math.PI], mul(wte, term));
    return v[0];
  }
  function velAt(z, alpha, G) {
    const s = csq([z[0] * z[0] - z[1] * z[1] - 4 * FB * FB, 2 * z[0] * z[1]]);
    const z1 = [(z[0] + s[0]) / 2, (z[1] + s[1]) / 2], z2 = [(z[0] - s[0]) / 2, (z[1] - s[1]) / 2];
    const w1 = [z1[0] - c0[0], z1[1] - c0[1]], w2 = [z2[0] - c0[0], z2[1] - c0[1]];
    const zeta = Math.hypot(w1[0], w1[1]) > Math.hypot(w2[0], w2[1]) ? z1 : z2;
    const w = [zeta[0] - c0[0], zeta[1] - c0[1]];
    if (Math.hypot(w[0], w[1]) < FA * 1.002) return null;
    const e1 = [Math.cos(-alpha), Math.sin(-alpha)], e2 = [Math.cos(alpha), Math.sin(alpha)];
    const w2s = mul(w, w);
    const a = dv(mul([FA * FA, 0], e2), w2s);
    const vort = dv([0, G / (2 * Math.PI)], w);
    const F = [e1[0] - a[0] + vort[0], e1[1] - a[1] + vort[1]];
    const zz = mul(zeta, zeta), b = dv([FB * FB, 0], zz);
    const dz = [1 - b[0], -b[1]];
    const dm = Math.hypot(dz[0], dz[1]);
    if (dm < 0.05) return [1, 0];
    const q = dv(F, dz); // u - i v
    return [q[0], -q[1]];
  }
  const dots = [];
  for (let i = 0; i < 150; i++) dots.push({ x: -5 + Math.random() * 10, y: (Math.random() - .5) * 4.4, px: null, py: null });
  let turb = [];
  for (let i = 0; i < 26; i++) turb.push({ x: Math.random() * 4, y: .4 + Math.random() * 1.2 });
  const outline = [];
  for (let i = 0; i <= 120; i++) {
    const th = i / 120 * 2 * Math.PI, zt = [c0[0] + FA * Math.cos(th), c0[1] + FA * Math.sin(th)];
    const inv = dv([FB * FB, 0], zt);
    outline.push([zt[0] + inv[0], zt[1] + inv[1]]);
  }

  function drawBlade(dt) {
    const { g, W, H } = fit(bladeCv);
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#070d24'; g.fillRect(0, 0, W, H);
    const th = p.theta * DEG, al = clamp(m.alpha75, -2, 24) * DEG, phi = th - al;
    const G0 = gammaFor(al), G = m.stalled ? G0 * 0.35 : G0;
    const sc = Math.min(W / 11, H / 6), ox = W / 2 + 4, oy = H / 2;
    const T = (x, y) => { const c = Math.cos(-th), s = Math.sin(-th); return [ox + (x * c - y * s) * sc, oy - (x * s + y * c) * sc]; };
    // rotor-plane reference
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.setLineDash([5, 6]); g.beginPath(); g.moveTo(0, oy); g.lineTo(W, oy); g.stroke(); g.setLineDash([]);
    // dots
    const spd = 2.6 * dt;
    g.lineCap = 'round'; g.lineWidth = 1.7;
    for (const d of dots) {
      const v = velAt([d.x, d.y], al, G);
      if (!v || d.x > 5.4 || Math.abs(d.y) > 3.2 || !isFinite(v[0])) {
        d.x = -5.2 - Math.random() * 0.8; d.y = (Math.random() - .5) * 4.6; d.px = null; continue;
      }
      let vx = v[0], vy = v[1]; const sp = Math.hypot(vx, vy); if (sp > 3) { vx *= 3 / sp; vy *= 3 / sp; }
      d.x += vx * spd; d.y += vy * spd;
      const q = Math.hypot(vx, vy), P = T(d.x, d.y);
      if (d.px !== null) {
        g.strokeStyle = 'hsl(' + (220 - clamp((q - 0.6) / 1.0, 0, 1) * 220).toFixed(0) + ',85%,62%)';
        g.beginPath(); g.moveTo(d.px, d.py); g.lineTo(P[0], P[1]); g.stroke();
      }
      d.px = P[0]; d.py = P[1];
    }
    // stalled turbulence
    if (m.stalled) {
      g.fillStyle = 'rgba(248,113,113,.75)';
      for (const t of turb) {
        t.x += (0.5 + Math.random() * 0.6) * spd; t.y += (Math.random() - .45) * 0.12;
        if (t.x > 5 || t.y > 2.4 || t.y < 0.1) { t.x = Math.random() * 1.5; t.y = 0.35 + Math.random() * 0.5; }
        const P = T(t.x, t.y); g.beginPath(); g.arc(P[0], P[1], 2.2, 0, 7); g.fill();
      }
    }
    // foil
    g.beginPath();
    outline.forEach((pt, i) => { const P = T(pt[0], pt[1]); i ? g.lineTo(P[0], P[1]) : g.moveTo(P[0], P[1]); });
    g.closePath(); g.fillStyle = '#e6ecff'; g.fill(); g.strokeStyle = '#22d3ee'; g.lineWidth = 1.5; g.stroke();
    // arrows: lift (up, perpendicular to wind) and drag (along wind)
    const CL = clamp(al * 5.73, 0, 1.6) * (m.stalled ? 0.55 : 1);
    const L = 14 + CL * 50, D = 12 + (m.stalled ? 34 : 4 + CL * 8);
    const q = T(-0.6, 0.15);
    arrow(g, q[0], q[1], q[0] + Math.sin(phi) * L, q[1] - Math.cos(phi) * L, '#34d399', 'Lift');
    arrow(g, q[0], q[1], q[0] + Math.cos(phi) * D, q[1] + Math.sin(phi) * D, '#fbbf24', 'Drag');
    // wind label
    g.fillStyle = '#9fb0e0'; g.font = '12px Inter, sans-serif';
    g.fillText('relative wind →', 10, 18);
    g.fillText('pitch ' + p.theta.toFixed(1) + '°   angle of attack ' + m.alpha75.toFixed(1) + '°', 10, H - 10);
  }
  function arrow(g, x0, y0, x1, y1, col, label) {
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    const a = Math.atan2(y1 - y0, x1 - x0);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 9 * Math.cos(a - .4), y1 - 9 * Math.sin(a - .4)); g.lineTo(x1 - 9 * Math.cos(a + .4), y1 - 9 * Math.sin(a + .4)); g.closePath(); g.fill();
    g.font = '600 11px Inter, sans-serif'; g.fillText(label, x1 + 6, y1 + 4);
  }

  /* ---------- loop ---------- */
  let last = performance.now();
  function frame(now) {
    const real = Math.min(0.05, (now - last) / 1000); last = now;
    const dt = paused ? 0 : real * (slow ? 0.15 : 0.6);
    if (dt > 0) stepFlow(dt);
    drawFlow(dt);
    drawBlade(dt);
    spinTop(dt);
    requestAnimationFrame(frame);
  }
  function spinTop() { drawTop(); }

  refresh();
  requestAnimationFrame(frame);
  window.__rotor = { get p() { return p; }, set p(v) { p = v; refresh(); }, refresh, get m() { return m; } };
})();
