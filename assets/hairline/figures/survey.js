/**
 * Survey: the estate as it stands, twelve parts scattered on a plinth. Models
 * are tall blocks, keys small cubes, data flows long low bars, spend lines flat
 * tiles. A survey ring rides the ground after the pointer; what falls inside it
 * lifts to be counted, more the nearer the centre, and the nearest takes the
 * bright edge. The read-out names and numbers it. The slider is the ring's radius.
 */
const {
  Cam, clamp, facing, fit, poly, prism, proj, ringAt, rings, rrect, spring, stepS, unproj,
  disposer, mk, pointer, put, register, solid,
} = HL;

const W = 144, D = 104, PB = 6, LIFT = 11;
const PARTS = [
  ["model", 24, 24, 14, 14, 28], ["key", 56, 16, 8, 8, 8], ["flow", 88, 22, 28, 8, 5], ["spend", 122, 20, 12, 12, 2],
  ["key", 30, 58, 8, 8, 8], ["spend", 62, 50, 12, 12, 2], ["model", 96, 56, 14, 14, 21], ["flow", 126, 60, 8, 28, 5],
  ["spend", 24, 88, 12, 12, 2], ["flow", 58, 84, 28, 8, 5], ["key", 92, 90, 8, 8, 8], ["model", 124, 92, 14, 14, 16],
];
const REST = [96, 56];

/** Share of the full lift at u radii from the ring's centre: 1, down to .3 at the rim, nothing outside. */
const falloff = (u) => (u >= 1 ? 0 : 1 - 0.7 * u * u);

function mount({ stage, svg, read, dx }, value) {
  const bag = disposer();
  let R = value;

  const C = Cam(45, 0.5, 1.66);
  fit(C, [[0, 0, -PB], [W, D, -PB], [W, 0, -PB], [0, D, -PB], [24, 24, 28 + LIFT]], 200, 168);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(0, 0, W, D, 10, 2.2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));
  const lens = dx.face({ g: mk("g", {}, g), cr: null }, "beach");
  const ringEl = mk("path", { class: "nf" }, g), hub = mk("path", { class: "nf lo" }, g);

  const count = {};
  const parts = PARTS.map(([kind, x, y, w, d, h]) => {
    count[kind] = (count[kind] || 0) + 1;
    const [ring, inner] = rings(x - w / 2, y - d / 2, x + w / 2, y + d / 2, Math.min(w, d) > 9 ? 3 : 2, h > 3 ? 0.9 : 0.5);
    return { kind, n: count[kind], x, y, h, ring, inner, sp: spring(0, { eps: 0.02 }), drawn: NaN };
  });
  // back to front by x + y; the parts never move on the ground, so the order holds
  parts.slice().sort((a, b) => a.x + a.y - (b.x + b.y)).forEach((p) => {
    p.el = solid(g);
  });
  const tag = dx.pin(""), px = dx.pixel(g);

  const cx = spring(REST[0]), cy = spring(REST[1]);
  let drawnRing = "", lit = null;

  function draw() {
    const key = cx.x.toFixed(2) + "," + cy.x.toFixed(2) + "," + R;
    if (key !== drawnRing) {
      drawnRing = key;
      const disc = ringAt(P, rrect(cx.x - R, cy.x - R, cx.x + R, cy.x + R, R, 14), 0);
      ringEl.setAttribute("d", poly(disc));
      lens(disc);
      hub.setAttribute("d", poly(ringAt(P, rrect(cx.x - 2, cy.x - 2, cx.x + 2, cy.x + 2, 2, 4), 0)));
    }
    if (lit) {
      const top = P(lit.x, lit.y, Math.max(0, lit.sp.x) + lit.h);
      tag.at(top, 0, -24); px(P(lit.x + 1, lit.y + 1, Math.max(0, lit.sp.x) + lit.h));
    } else { tag.show(false); px(null); }
    for (const p of parts) {
      const z = Math.max(0, p.sp.x);
      if (z === p.drawn) continue;
      p.drawn = z;
      put(p.el, prism(P, front, p.ring, p.inner, z, z + p.h));
      if (p.top) p.top(ringAt(P, p.inner, z + p.h));
    }
  }

  /** Targets come from the ring's target centre, not where it is drawn (rule 01). */
  function retarget() {
    let best = null, bd = Infinity;
    for (const p of parts) {
      const u = Math.hypot(p.x - cx.t, p.y - cy.t) / R;
      p.sp.t = LIFT * falloff(u);
      if (u < 1 && u < bd) { bd = u; best = p; }
    }
    if (best !== lit) {
      if (lit) lit.el.sil.classList.remove("hi");
      lit = best;
      if (lit) lit.el.sil.classList.add("hi");
      if (lit) { tag.show(true); tag.text(`${lit.kind} ${String(lit.n).padStart(2, "0")}`); }
    }
    B.wake();
  }

  const B = register(stage, (dt) => {
    let m = stepS(cx, dt) | stepS(cy, dt);
    for (const p of parts) if (stepS(p.sp, dt)) m = true;
    draw();
    return !!m;
  });
  bag.add(B.unregister);

  function aim(pt) {
    if (pt) {
      const [x, y] = unproj(C, pt[0], pt[1], 0);
      cx.t = clamp(x, R * 0.5, W - R * 0.5); cy.t = clamp(y, R * 0.5, D - R * 0.5);
    } else { cx.t = REST[0]; cy.t = REST[1]; }
    retarget();
    read.textContent = !pt ? "rest" : lit ? `${lit.kind} ${String(lit.n).padStart(2, "0")}` : "clear";
  }
  aim(null);

  bag.add(pointer(stage, { move: aim, leave: () => aim(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { R = clamp(v, 10, 44); retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "survey",
  means: "The estate as it stands: a survey ring follows the pointer, and every model, key, flow and spend line inside it lifts to be counted.",
  rules: [1, 3, 4, 5],
  range: [16, 24, 36],
  tour: [[150, 150], [250, 140], [200, 206], null],
  mount,
});
