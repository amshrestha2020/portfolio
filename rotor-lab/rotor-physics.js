/* Hover rotor model: blade-element + momentum theory (simplified, uniform inflow).
   Baseline roughly matches a light 4-seat helicopter (about 1,000 kg, 10 m rotor).
   Pure JavaScript so it can be tested in Node. Values are indicative, for learning. */
const RotorPhysics = (() => {
  const RHO = 1.225, A_LIFT = 5.73, CD0 = 0.011, G = 9.81, MASS = 1000, SOUND = 340, STALL_DEG = 14;
  const BASE = { N: 2, R: 5.0, c: 0.22, rpm: 400, theta: 8.0, h: 12 };

  function compute(p) {
    const omega = p.rpm * 2 * Math.PI / 60, Vt = omega * p.R, A = Math.PI * p.R * p.R;
    const sigma = p.N * p.c / (Math.PI * p.R), th = p.theta * Math.PI / 180;
    const geF = 1 / (1 + Math.pow(p.R / (4 * Math.max(p.h, 0.5)), 2)); // in-ground-effect inflow factor
    let CT = 0.002, lam = 0;
    for (let i = 0; i < 80; i++) {
      lam = geF * Math.sqrt(Math.max(CT, 0) / 2);
      const n = sigma * A_LIFT / 2 * (th / 3 - lam / 2);
      CT = 0.5 * CT + 0.5 * Math.max(n, 0);
    }
    lam = geF * Math.sqrt(CT / 2);
    const alpha75 = th - lam / 0.75;                       // blade angle of attack at 75% radius
    const stallDeg = alpha75 * 180 / Math.PI;
    const stalled = stallDeg > STALL_DEG;
    if (stalled) CT *= Math.max(0.35, 1 - 0.5 * (stallDeg - STALL_DEG) / 5);
    lam = geF * Math.sqrt(CT / 2);
    const T = CT * RHO * A * Vt * Vt, W = MASS * G;
    const vi = lam * Vt;                                    // induced velocity through the disk
    const Mt = Vt / SOUND;
    const B = Math.max(0.5, 1 - Math.sqrt(2 * CT) / p.N);   // Prandtl tip-loss factor
    const kappa = 1.12 / B;
    let cd = CD0; if (Mt > 0.8) cd *= 1 + 3 * Math.pow((Mt - 0.8) / 0.1, 2);
    if (stalled) cd *= 1 + 0.8 * (stallDeg - STALL_DEG);
    const Pi = kappa * T * vi;
    const P0 = sigma * cd / 8 * RHO * A * Vt * Vt * Vt;
    const P = Pi + P0;
    const Pideal = T * Math.sqrt(T / (2 * RHO * A));
    const FM = P > 0 ? Pideal / P : 0;
    const climb = Math.max(-6, Math.min(8, 30 * (T / W - 1)));
    return { omega, Vt, A, sigma, CT, lam, geF, T, W, TW: T / W, vi, wake: 2 * vi, DL: T / A, Mt, Pi, P0, P, FM, alpha75: stallDeg, stalled, bpf: p.N * p.rpm / 60, climb, phi75: lam / 0.75 * 180 / Math.PI };
  }

  const pct = (a, b) => b === 0 ? 0 : (a - b) / Math.abs(b) * 100;

  /* Turn parameter changes (versus the baseline) into plain-language pros and cons. */
  function tradeoffs(p, b, m, mb) {
    const pros = [], cons = [], notes = [];
    const add = (arr, t) => { if (!arr.includes(t)) arr.push(t); };
    if (p.N > b.N) {
      add(pros, 'More blades give more lift at the same pitch and RPM (higher solidity) and a smoother ride: the blade-pass frequency rises to ' + m.bpf.toFixed(0) + ' Hz.');
      add(pros, 'Each blade carries less load, which can mean less blade stress and a lower vibration level.');
      add(cons, 'More blades add profile drag, so more engine power is spent just spinning them.');
      add(cons, 'A heavier, costlier and more complex rotor hub, with more parts to inspect.');
      add(cons, 'Each blade flies in the wake and tip vortices of the one before it, which wastes some lift.');
    } else if (p.N < b.N) {
      add(pros, 'Fewer blades mean less profile drag, a lighter and simpler hub, and lower cost.');
      add(cons, 'Lift drops because the solidity drops. You need more pitch or RPM to hover.');
      add(cons, 'Heavier load per blade and a rougher, lower-frequency vibration (' + m.bpf.toFixed(0) + ' Hz).');
    }
    if (p.R > b.R) {
      add(pros, 'A bigger rotor disk spreads the thrust over more air: lower disk loading (' + m.DL.toFixed(0) + ' N/m²), a slower downwash (' + m.vi.toFixed(1) + ' m/s) and better hover efficiency.');
      add(pros, 'Gentler rotor wash on the ground means less dust and less danger to people nearby.');
      add(cons, 'Longer blades are heavier and more flexible, so they see more bending stress.');
      add(cons, 'At the same RPM the tips move faster (' + m.Vt.toFixed(0) + ' m/s), which raises noise and compressibility risk.');
      add(cons, 'A larger footprint makes landing in tight spaces and fitting in hangars harder.');
    } else if (p.R < b.R) {
      add(pros, 'A smaller rotor is lighter, more compact and easier to land in tight spaces.');
      add(pros, 'Tip speed falls at the same RPM (' + m.Vt.toFixed(0) + ' m/s), so it is quieter.');
      add(cons, 'Disk loading rises (' + m.DL.toFixed(0) + ' N/m²): the air must be pushed down faster (' + m.vi.toFixed(1) + ' m/s), which costs more power and blasts the ground harder.');
    }
    if (p.rpm > b.rpm) {
      add(pros, 'Thrust grows with the square of RPM, so you get more lift without changing the blade pitch.');
      add(pros, 'The blades are further from stall because the airflow relative to them is faster.');
      add(cons, 'Tip speed climbs to ' + m.Vt.toFixed(0) + ' m/s (Mach ' + m.Mt.toFixed(2) + '), which raises noise ' + (mb ? (60 * Math.log10(m.Mt / mb.Mt)).toFixed(1) : '') + ' dB (rough) and, near Mach 0.8, brings compressibility drag.');
      add(cons, 'Profile power rises with RPM cubed, and centrifugal forces on the blades and hub grow.');
    } else if (p.rpm < b.rpm) {
      add(pros, 'Lower tip speed is quieter and wastes less power on blade drag.');
      add(cons, 'Thrust falls with RPM squared, so the helicopter may not be able to hold a hover.');
      add(cons, 'Blades work closer to stall, and the rotor stores less energy for emergency autorotation.');
    }
    if (p.theta > b.theta) {
      add(pros, 'More collective pitch means more thrust, so you can climb or carry a heavier load.');
      add(cons, 'The rotor pulls air through the disk faster (' + m.vi.toFixed(1) + ' m/s), so induced power rises sharply.');
      add(cons, 'The angle of attack rises to ' + m.alpha75.toFixed(1) + '°. Past about 14° the blades stall and thrust collapses.');
    } else if (p.theta < b.theta) {
      add(pros, 'Lower pitch uses less power and keeps the blades far from stall (' + m.alpha75.toFixed(1) + '°).');
      add(cons, 'Less thrust: the helicopter ' + (m.TW < 1 ? 'can no longer hover and will sink.' : 'has less climb margin.'));
    }
    if (p.c > b.c) {
      add(pros, 'Wider blades add solidity, so more thrust and a larger stall margin at the same pitch.');
      add(cons, 'More blade area means more profile drag and weight, so efficiency drops.');
    } else if (p.c < b.c) {
      add(pros, 'Narrow blades have less drag and weigh less.');
      add(cons, 'Less lift per blade, so you need more pitch or RPM and blades stall sooner.');
    }
    if (p.h < b.h - 1) {
      add(pros, 'Close to the ground the rotor gets ground effect: the downwash is cushioned, so inflow drops and hover costs less power.');
      add(cons, 'Rotor wash kicks up dust, snow or debris (brownout) and can recirculate into the rotor.');
    } else if (p.h > b.h + 1) {
      add(cons, 'High above the ground you lose ground effect, so hover needs more power.');
    }
    if (m.Mt > 0.85) add(cons, 'DANGER: blade tips are near the speed of sound (Mach ' + m.Mt.toFixed(2) + '). Expect very loud noise and a steep rise in drag.');
    if (m.stalled) add(cons, 'DANGER: the blades are stalled. Thrust collapses while power demand shoots up.');
    if (!pros.length && !cons.length) notes.push('Move a slider to change the rotor. The trade-offs for your change appear here.');
    return { pros, cons, notes };
  }

  return { BASE, MASS, G, SOUND, STALL_DEG, compute, tradeoffs, pct };
})();
if (typeof module !== 'undefined') module.exports = RotorPhysics;
