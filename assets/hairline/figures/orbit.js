/**
 * Orbit: the platform, one block, at the centre of a round plate; nature on
 * its lid, the digital layer down its side. Three readings ride an orbit round
 * it: cost, reliability and adoption. The pointer turns the orbit: the reading
 * nearest it swings round to meet it on a spring, and takes the red pixel.
 */
const {
  Cam, clamp, facing, fit, poly, prism, proj, ringAt, rings, rrect, spring, stepS, unproj,
  disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const RD = 100, RO = 76, PB = 4, BW = 26, BH = 30;
const READS = [["cost", "Cost / call −31%"], ["reliability", "SLO 99.9%"], ["adoption", "Adoption 82%"]];
const REST = Math.PI * 0.32, TAU = Math.PI * 2;

function mount({ stage, svg, read, dx }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.52);
  fit(C, [[-RD, -RD, -PB], [RD, RD, -PB], [RD, -RD, -PB], [-RD, RD, -PB], [0, 0, BH + 20]], 200, 170);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  mk("path", { d: poly(ringAt(P, rrect(-RO, -RO, RO, RO, RO, 14), 0)), class: "nf sil" }, g);
  mk("path", { d: poly(ringAt(P, rrect(-RO + 22, -RO + 22, RO - 22, RO - 22, RO - 22, 14), 0)), class: "nf dash" }, g);

  // the readings sit on the ground: those behind the block are painted before it, the rest after
  const back = mk("g", {}, g);
  const plat = solid(g);
  const fore = mk("g", {}, g);
  const [b0, b0i] = rings(-BW, -BW, BW, BW, 3, 1.2);
  put(plat, prism(P, front, b0, b0i, 0, BH));
  plat.sil.classList.add("hi");
  dx.face(plat, "photo")(ringAt(P, b0i, BH));
  dx.face(plat, "pixel")([P(-BW + 3, BW, 0), P(BW - 3, BW, 0), P(BW - 3, BW, BH), P(-BW + 3, BW, BH)]);

  const marks = READS.map(([name, label], i) => {
    const dot = flatDot(back, C, 1.5, "dot m");
    return { name, i, dot, pin: dx.pin(label) };
  });
  const px = dx.pixel(g);

  const sp = spring(REST, { k: value, eps: 0.0005 });
  let drawn = NaN, chosen = 0;

  function draw() {
    const th = sp.x;
    if (th === drawn) return;
    drawn = th;
    marks.forEach((m) => {
      const a = th + (m.i * TAU) / 3, x = RO * Math.cos(a), y = RO * Math.sin(a), p = P(x, y, 0);
      place(m.dot, p);
      (x + y < 0 ? back : fore).appendChild(m.dot);
      const side = p[0] < 200 ? -1 : 1;
      m.pin.at(p, side * 30, -18);
      if (m.i === chosen) px(P(x + 10, y + 10, 0));
    });
  }

  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(B.unregister);

  function light(i) {
    chosen = i; drawn = NaN;
    marks.forEach((m) => { m.pin.on(m.i === i); m.dot.setAttribute("class", m.i === i ? "dot" : "dot m"); });
  }

  /** The reading nearest the pointer's angle, judged from the spring's target (rule 01), swings to meet it. */
  function aim(p) {
    if (!p) { sp.t = REST; light(0); read.textContent = "rest"; B.wake(); return; }
    const [x, y] = unproj(C, p[0], p[1], 0);
    if (Math.hypot(x, y) < BW + 8 || Math.hypot(x, y) > RD + 40) return aim(null);
    const phi = Math.atan2(y, x);
    let best = 0, bd = Infinity, bt = sp.t;
    marks.forEach((m) => {
      const a = sp.t + (m.i * TAU) / 3;
      const d = ((phi - a) % TAU + TAU * 1.5) % TAU - Math.PI;
      if (Math.abs(d) < bd) { bd = Math.abs(d); best = m.i; bt = sp.t + d; }
    });
    sp.t = bt;
    light(best);
    read.textContent = marks[best].name;
    B.wake();
  }
  light(0);

  bag.add(pointer(stage, { move: aim, leave: () => aim(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { sp.k = clamp(v, 20, 300); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "orbit",
  means: "The platform at the centre; cost, reliability and adoption ride an orbit round it and turn to meet the pointer.",
  rules: [1, 5, 8],
  range: [40, 100, 220],
  tour: [[96, 200], [304, 200], [210, 256], null],
  mount,
});
