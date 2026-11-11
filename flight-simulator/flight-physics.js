/* Simple point-mass flight model (small single-engine plane, SI units).
   Pure JavaScript, no dependencies, so it can be tested in Node. */
const FlightPhysics = (() => {
  const G = 9.81, RHO = 1.225;
  const P = {
    mass: 1100, S: 16, CL0: 0.3, a: 5.0, aStall: 0.28,
    CD0: 0.032, k: 0.06, Tmax: 3400, Vzero: 100,
    trimAlpha: 0.0, qmax: 0.45, pitchStab: 2.2,
    rollRate: 1.0, rollMax: 0.7, rollLevel: 0.5,
    qAir: 0.05, trimRate: 0.12, trimMin: -0.12, trimMax: 0.26, muRoll: 0.035, muBrake: 0.45, thetaGroundMax: 0.2,
  };
  const KT = 1.94384, FT = 3.28084, FPM = 196.85;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function create(mode) {
    const s = { x: 0, y: 0, z: 620, vx: 0, vy: 0, vz: 0, psi: 0, theta: 0, phi: 0,
      throttle: 0, trim: 0.13, onGround: true, crashed: false, landing: null, stalled: false,
      alpha: 0, aoaWarn: false, t: 0, touchdowns: 0, mode };
    if (mode === 'approach') {
      s.x = 0; s.y = 190; s.z = 3300; s.throttle = 0.12; s.onGround = false; s.trim = 0.137;
      const V = 33.5, gam = -0.045;
      s.vx = 0; s.vy = V * Math.sin(gam); s.vz = -V * Math.cos(gam);
      s.theta = gam + P.trimAlpha + s.trim;
    }
    return s;
  }

  function basis(s) {
    const cp = Math.cos(s.psi), sp = Math.sin(s.psi), ct = Math.cos(s.theta), st = Math.sin(s.theta);
    const f = [sp * ct, st, -cp * ct];
    const r0 = [cp, 0, sp];
    const u0 = [-sp * st, ct, cp * st];
    const c = Math.cos(s.phi), sn = Math.sin(s.phi);
    const u = [u0[0] * c + r0[0] * sn, u0[1] * c + r0[1] * sn, u0[2] * c + r0[2] * sn];
    const r = [r0[0] * c - u0[0] * sn, r0[1] * c - u0[1] * sn, r0[2] * c - u0[2] * sn];
    return { f, u, r };
  }

  function liftCoeff(alpha) {
    const aS = P.aStall;
    if (alpha < -0.25) alpha = -0.25;
    if (alpha <= aS) return P.CL0 + P.a * alpha;
    const clmax = P.CL0 + P.a * aS;
    return clmax * (1 - 0.3 * clamp((alpha - aS) / 0.15, 0, 1));
  }

  // opts: {pitch:-1..1 (+nose up), roll:-1..1 (+right), throttleRate:-1..1, brake:bool, assist:bool}
  function step(s, inp, dt) {
    if (s.crashed) return s;
    s.t += dt;
    s.throttle = clamp(s.throttle + (inp.throttleRate || 0) * 0.5 * dt, 0, 1);
    const V = Math.hypot(s.vx, s.vy, s.vz) || 0.001;
    const vh = Math.hypot(s.vx, s.vz);
    const gamma = Math.asin(clamp(s.vy / V, -1, 1));
    const alpha = s.theta - gamma;
    s.alpha = alpha;
    s.stalled = !s.onGround && alpha > P.aStall;
    s.aoaWarn = !s.onGround && alpha > P.aStall - 0.07;

    // attitude
    const ctrl = Math.min(1, 0.35 + V / 25);
    if (s.onGround) {
      const authority = clamp((V / 24) * (V / 24), 0, 1);
      s.theta += (inp.pitch * P.qmax * authority - (Math.abs(inp.pitch) < 0.01 ? 0.6 : 0)) * dt;
      s.theta = clamp(s.theta, 0, P.thetaGroundMax);
      s.phi = 0;
      s.psi += inp.roll * 0.5 * Math.min(1, V / 8) * dt;
    } else {
      let thd;
      if (inp.assist !== false) {
        s.trim = clamp(s.trim + inp.pitch * P.trimRate * dt, P.trimMin, P.trimMax);
        thd = inp.pitch * P.qAir * ctrl - P.pitchStab * (s.theta - (gamma + P.trimAlpha + s.trim));
      } else {
        thd = inp.pitch * 0.6 * ctrl;
      }
      s.theta = clamp(s.theta + thd * dt, -0.7, 0.7);
      let phd = inp.roll * P.rollRate;
      if (Math.abs(inp.roll) < 0.01) phd = -P.rollLevel * s.phi;
      s.phi = clamp(s.phi + phd * dt, -P.rollMax, P.rollMax);
      if (vh > 5) s.psi = Math.atan2(s.vx, -s.vz);
    }

    const { f, u } = basis(s);
    // ground effect: a cushion of extra lift and less induced drag in the last few metres
    const ge = Math.exp(-Math.max(0, s.y) / 3.5);
    const CL = liftCoeff(alpha) * (1 + 0.3 * ge);
    const CD = P.CD0 + P.k * (1 - 0.5 * ge) * CL * CL + (alpha > P.aStall ? 0.5 * Math.sin(alpha) ** 2 : 0);
    const q = 0.5 * RHO * V * V;
    const L = q * P.S * CL, D = q * P.S * CD;
    const T = s.throttle * P.Tmax * Math.max(0, 1 - V / P.Vzero);
    const vhat = [s.vx / V, s.vy / V, s.vz / V];
    const ud = u[0] * vhat[0] + u[1] * vhat[1] + u[2] * vhat[2];
    let lx = u[0] - ud * vhat[0], ly = u[1] - ud * vhat[1], lz = u[2] - ud * vhat[2];
    const ln = Math.hypot(lx, ly, lz) || 1; lx /= ln; ly /= ln; lz /= ln;
    let ax = (L * lx + T * f[0] - D * vhat[0]) / P.mass;
    let ay = (L * ly + T * f[1] - D * vhat[1]) / P.mass - G;
    let az = (L * lz + T * f[2] - D * vhat[2]) / P.mass;

    if (s.onGround) {
      if (ay > 0.02 && V > 5) { s.onGround = false; } // lift-off
      else {
        // roll along heading, friction
        const sp = Math.sin(s.psi), cp = Math.cos(s.psi);
        let speed = vh;
        const mu = inp.brake ? P.muBrake : P.muRoll;
        const aLong = ax * sp + az * -cp; // along heading
        speed += aLong * dt - Math.min(speed, mu * G * dt);
        speed = Math.max(0, speed);
        s.vx = speed * sp; s.vz = -speed * cp; s.vy = 0; s.y = 0;
        s.x += s.vx * dt; s.z += s.vz * dt;
        return s;
      }
    }
    s.vx += ax * dt; s.vy += ay * dt; s.vz += az * dt;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;

    if (s.y <= 0) {
      const sink = -s.vy;
      const spd = Math.hypot(s.vx, s.vz);
      let result = null;
      if (sink > 4.5 || Math.abs(s.phi) > 0.25 || s.theta < -0.08 || s.theta > 0.35) {
        s.crashed = true;
        result = { crash: true, sinkFpm: Math.round(sink * FPM), reason: sink > 4.5 ? 'too steep / too fast a descent' : Math.abs(s.phi) > 0.25 ? 'wings not level' : s.theta < -0.08 ? 'nose too low' : 'tail strike' };
      } else {
        result = { crash: false, sinkFpm: Math.round(sink * FPM), grade: sink < 1.0 ? 'Butter' : sink < 2.0 ? 'Good' : 'Hard', speedKt: Math.round(spd * KT),
          onRunway: Math.abs(s.x) < 15 && Math.abs(s.z) < 650, offCenter: Math.round(Math.abs(s.x)) };
        s.onGround = true; s.vy = 0; s.y = 0; s.phi = 0;
        s.touchdowns++;
      }
      s.landing = result;
    }
    return s;
  }

  return { P, create, step, basis, KT, FT, FPM, clamp };
})();
if (typeof module !== 'undefined') module.exports = FlightPhysics;
