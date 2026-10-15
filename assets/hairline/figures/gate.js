/**
 * Gate: an AI gateway as a wall with one door. Four teams' requests wait on the
 * near side as crates, told apart by the dots on their lids. The pointer picks
 * one and it crosses to the door and through it, while the one that went
 * before steps back to its place, staggered by distance. Whatever is going
 * through has the bright edge. The read-out names the team. The slider is the
 * stagger, in ms.
 */
const {
  Cam, clamp, facing, fit, lerp, prism, proj, rings, seg, unproj,
  tdone, tset, tval, tween, disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const X1 = 128, Y1 = 104, PB = 6, WX0 = 54, WX1 = 60, DY0 = 40, DY1 = 64, WH = 24, LZ = 18, CS = 12;
const QX = 104, QY = [16, 40, 64, 88], OUT = 22, MID = 52, REST = 1;

function mount({ stage, svg, read, dx }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.84);
  fit(C, [[0, 0, -PB], [X1, Y1, -PB], [X1, 0, -PB], [0, Y1, -PB], [WX0, 0, WH]], 200, 168);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(0, 0, X1, Y1, 10, 2.2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  // the lanes on the floor: where the requests wait, and the one way through the door
  mk("path", { d: seg(P(QX, QY[0] - 8, 0), P(QX, QY[3] + 8, 0)), class: "nf lo" }, g);
  mk("path", { d: seg(P(QX - 10, MID, 0), P(OUT - 8, MID, 0)), class: "nf dash" }, g);
  const layer = mk("g", {}, g);
  const block = (x0, y0, x1, y1, z0, z1, r) => {
    const el = solid(layer), [ring, inner] = rings(x0, y0, x1, y1, r, 1);
    put(el, prism(P, front, ring, inner, z0, z1));
    return el.g;
  };
  const wallA = block(WX0, 4, WX1, DY0, 0, WH, 2.5), lintel = block(WX0, DY0 - 2, WX1, DY1 + 2, LZ, WH, 2.5), wallB = block(WX0, DY1, WX1, Y1 - 4, 0, WH, 2.5);

  dx.pin("Gateway").at(P(WX0 + 3, MID, WH), 0, -20);
  dx.pixel(g)(P(WX1 + 8, MID, 0));
  const crates = QY.map((qy, i) => {
    const el = solid(layer), dots = [];
    for (let k = 0; k <= i; k++) dots.push(flatDot(el.g, C, 0.85, "dot m"));
    return { i, qy, el, dots, pixel: dx.face(el, "pixel"), t: tween(i === REST ? 1 : 0), drawn: NaN, x: QX, y: qy };
  });

  /** Where a crate stands at s: 0 in the queue, .45 at the door, 1 through it. */
  function at(c, s) {
    if (s < 0.45) { const f = s / 0.45; return [lerp(QX, WX1 + CS / 2 + 3, f), lerp(c.qy, MID, f)]; }
    const f = (s - 0.45) / 0.55;
    return [lerp(WX1 + CS / 2 + 3, OUT, f), MID];
  }

  function draw(now) {
    let moved = false;
    for (const c of crates) {
      const s = tval(c.t, now);
      if (s === c.drawn) continue;
      c.drawn = s; moved = true;
      [c.x, c.y] = at(c, s);
      const [r, ri] = rings(c.x - CS / 2, c.y - CS / 2, c.x + CS / 2, c.y + CS / 2, 3.2, 1);
      put(c.el, prism(P, front, r, ri, 0, CS));
      c.dots.forEach((d, k) => place(d, P(c.x - 3 + k * 2.6, c.y - 3 + k * 2.6, CS)));
      const y1 = c.y + CS / 2;
      c.pixel(s > 0.3 ? [P(c.x - CS / 2 + 2, y1, 0), P(c.x + CS / 2 - 2, y1, 0), P(c.x + CS / 2 - 2, y1, CS), P(c.x - CS / 2 + 2, y1, CS)] : null);
    }
    if (!moved) return;
    // far crates, the wall's far half, crates in the door, the lintel and near half, then crates through
    const by = (a, b) => a.x + a.y - (b.x + b.y);
    const far = crates.filter((c) => c.x + CS / 2 <= WX0).sort(by);
    const near = crates.filter((c) => c.x - CS / 2 >= WX1).sort(by);
    const door = crates.filter((c) => !far.includes(c) && !near.includes(c)).sort(by);
    [...far.map((c) => c.el.g), wallA, ...door.map((c) => c.el.g), lintel, wallB, ...near.map((c) => c.el.g)].forEach((n) => layer.appendChild(n));
  }

  const B = register(stage, (_dt, now) => { draw(now); return crates.some((c) => !tdone(c.t, now)); });
  bag.add(B.unregister);

  /** The queue's resting lids, which never move, are what the pointer is tested against (rule 01). */
  function hit(p) {
    const [x, y] = unproj(C, p[0], p[1], CS);
    let best = -1, bd = 13;
    crates.forEach((c) => { const d = Math.hypot(x - QX, y - c.qy); if (d < bd) { bd = d; best = c.i; } });
    return best;
  }

  let act = -2;
  function choose(a) {
    if (a === act) return;
    const now = performance.now(), k = a >= 0 ? a : REST;
    act = a;
    crates.forEach((c) => {
      tset(c.t, c.i === k ? 1 : 0, now, c.i === k ? stag : Math.abs(c.i - k) * stag * 0.5);
      c.el.sil.classList.toggle("hi", c.i === k);
      c.dots.forEach((d) => d.setAttribute("class", c.i === k ? "dot" : "dot m"));
    });
    read.textContent = a < 0 ? "rest" : `team ${a + 1}`;
    B.wake();
  }
  choose(-1);

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = clamp(v, 0, 160); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "gate",
  means: "An AI gateway as a wall with one door: the pointer picks a team's request, and it crosses to the door and through.",
  rules: [1, 2, 4, 6],
  range: [0, 60, 120],
  tour: [[256, 236], [212, 216], [300, 190], null],
  mount,
});
