/**
 * Layers: the target architecture as four plates on one axis, held inside a
 * dashed boundary that security and finance drew round them. The pointer's
 * height picks a layer: the plates above it lift away to open it, staggered
 * outwards from it, and it takes the bright edge. Each plate is numbered by the
 * dots on its near corner. The read-out names the layer. The slider is the gap.
 */
const {
  Cam, clamp, extremes, facing, fit, open, poly, prism, proj, ringAt, rings, run, seg,
  tdone, tset, tval, tween, disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const W = 92, D = 72, TK = 5, BX = 9, NAMES = ["landing zone", "identity", "gateway", "pipelines"];
const REST = [0, 13, 29, 42], TOP = 112, STEP = 40;

function mount({ stage, svg, read, dx }, value) {
  const bag = disposer();
  let gap = value;

  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-BX, -BX, 0], [W + BX, D + BX, 0], [W + BX, -BX, 0], [-BX, D + BX, 0], [-BX, -BX, TOP]], 200, 164);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  // the boundary: a dashed footprint and top, and dashed drops where its sides turn
  const [bound] = rings(-BX, -BX, W + BX, D + BX, 10, 1);
  const [lft, rgt] = extremes(P, bound);
  const drop = (q) => seg(P(q.u, q.v, 0), P(q.u, q.v, TOP));
  mk("path", { d: poly(ringAt(P, bound, 0)), class: "nf dash" }, g);
  mk("path", { d: drop(lft) + drop(rgt), class: "nf dash" }, g);

  const [ring, inner] = rings(0, 0, W, D, 7, 1.6);
  const plates = NAMES.map((name, i) => {
    const el = solid(g), dots = [];
    for (let k = 0; k <= i; k++) dots.push(flatDot(el.g, C, 0.9, "dot off"));
    return { name, i, el, dots, photo: dx.face(el, "photo"), pixel: dx.face(el, "pixel"), z: tween(REST[i]), drawn: NaN };
  });
  // over every plate: the top of the boundary
  const topRing = mk("path", { d: open(ringAt(P, run(bound, front), TOP)), class: "nf dash" }, g);
  mk("path", { d: open(ringAt(P, run(bound, (q) => !front(q)), TOP)), class: "nf dash" }, g).before(topRing);

  function draw(pl, now) {
    const z = tval(pl.z, now);
    if (z === pl.drawn) return;
    pl.drawn = z;
    put(pl.el, prism(P, front, ring, inner, z, z + TK));
    pl.dots.forEach((el, k) => place(el, P(W - 8 - k * 4.5, D - 8, z + TK)));
    const top = ringAt(P, inner, z + TK), on = pl.i === lit;
    pl.pixel(on ? top : null);
    pl.photo(!on && pl.i === 3 ? top : null);
    if (on) tag.at(P(W, D / 2, z + TK), 58, 0);
  }

  let lit = 3;
  const tag = dx.pin("");
  dx.pin("Security", { tone: "quiet" }).at(P(lft.u, lft.v, TOP), 0, -14);
  dx.pin("Finance", { tone: "quiet" }).at(P(rgt.u, rgt.v, TOP), 0, -14);
  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const pl of plates) { draw(pl, now); if (!tdone(pl.z, now)) moving = true; }
    return moving;
  });
  bag.add(B.unregister);

  // the hit test reads each plate's resting centre on screen, which never moves
  const rest = plates.map((pl) => P(W / 2, D / 2, REST[pl.i] + TK));
  function hit([x, y]) {
    if (Math.abs(x - rest[0][0]) > 120) return -1;
    let best = -1, d = 22;
    rest.forEach((c, i) => { if (Math.abs(c[1] - y) < d) { d = Math.abs(c[1] - y); best = i; } });
    return best;
  }

  let act = -2;
  function choose(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : 3;
    act = a;
    plates.forEach((pl) => {
      const lift = a >= 0 && pl.i > a ? gap : 0;
      tset(pl.z, REST[pl.i] + lift, now, Math.abs(pl.i - from) * STEP);
      const on = a < 0 ? pl.i === 3 : pl.i === a;
      if (on) { lit = pl.i; tag.text(pl.name); }
      pl.drawn = NaN;
      pl.el.sil.classList.toggle("hi", on);
      pl.dots.forEach((d) => d.setAttribute("class", on ? "dot" : "dot m"));
    });
    read.textContent = a < 0 ? "rest" : NAMES[a];
    B.wake();
  }
  choose(-1);

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { gap = clamp(v, 0, 40); if (act >= 0) { const a = act; act = -2; choose(a); } },
    destroy: bag.dispose,
  };
}

hairline({
  name: "layers",
  means: "Four layers of the platform on one axis, inside a boundary drawn by security and finance; the pointer opens one.",
  rules: [2, 3, 6, 8],
  range: [12, 24, 36],
  tour: [[200, 214], [200, 168], [200, 140], null],
  mount,
});
