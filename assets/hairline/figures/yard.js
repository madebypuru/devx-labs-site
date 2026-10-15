/**
 * Yard: a landing zone as a walled yard, three accounts laid out as pads on
 * its floor. A new workload, a block, follows the pointer across the yard on a
 * spring, but the guardrail wall holds it in: pushed past the edge it stops at
 * the wall, and the wall's rim takes the bright edge from the block. The
 * read-out names the pad it stands on, or the guardrail. The slider is how
 * close to the wall the block may come.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, prism, proj, ringAt, rings, rrect, run, spring, stepS, unproj,
  disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const X1 = 140, Y1 = 104, WH = 12, WT = 3, WR = 10, BS = 16, BH = 30, PH = 4;
const PADS = [[16, 14, 56, 46], [72, 14, 124, 40], [16, 58, 60, 90]];
const REST = [84, 54];
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

function mount({ stage, svg, read, dx }, value) {
  const bag = disposer();
  let pad = value;

  const C = Cam(45, 0.5, 1.68);
  fit(C, [[0, 0, 0], [X1, Y1, 0], [X1, 0, 0], [0, Y1, 0], [0, 0, WH]], 200, 166);
  const P = proj(C), front = facing(C);
  const outer = rrect(0, 0, X1, Y1, WR, 6), inner = rrect(WT, WT, X1 - WT, Y1 - WT, WR - WT, 6);

  const g = mk("g", {}, svg);
  // far half of the wall: body, rim, and the floor seam along the far walls
  mk("path", { d: poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), class: "sil" }, g);
  mk("path", { d: poly(ringAt(P, inner, 0)), class: "fo" }, g);
  const rimIn = mk("path", { d: poly(ringAt(P, inner, WH)), class: "nf" }, g);
  mk("path", { d: open(ringAt(P, run(inner, (q) => !front(q)), 0)), class: "nf lo" }, g);
  // the accounts: pads on the floor, each numbered by its dots
  PADS.forEach(([a, b, c, d], i) => {
    const [r, ri] = rings(a, b, c, d, 5, 1.2);
    put(solid(g), prism(P, front, r, ri, 0, PH));
    for (let k = 0; k <= i; k++) place(flatDot(g, C, 0.8, "dot m"), P(a + 6 + k * 3.5, b + 6, PH));
  });

  const block = solid(g), mark = flatDot(block.g, C, 0.95, "dot");
  const photo = dx.face(block, "photo"), pixel = dx.face(block, "pixel"), tag = dx.pin("Workload");
  // near half of the wall, painted over the block: the block is always inside it
  const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
  mk("path", { d: poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), class: "fo" }, g);
  const rim = mk("path", { d: open(oT), class: "nf lo" }, g);
  const rimNear = mk("path", { d: open(iF), class: "nf" }, g);
  mk("path", { d: open([oT[0], ...oB, oT[oT.length - 1]]), class: "nf sil" }, g);

  const px = dx.pixel(g);
  const lim = () => [WT + pad, X1 - WT - pad - BS, WT + pad, Y1 - WT - pad - BS];
  const bx = spring(REST[0]), by = spring(REST[1]), bz = spring(0);
  const padAt = (x, y) => PADS.findIndex(([a, b, c, d]) => x > a && x < c && y > b && y < d);
  let drawn = "";

  function draw() {
    const key = bx.x.toFixed(2) + "," + by.x.toFixed(2) + "," + bz.x.toFixed(2);
    if (key === drawn) return;
    drawn = key;
    const [ring, inr] = rings(bx.x, by.x, bx.x + BS, by.x + BS, 3.5, 1.1);
    put(block, prism(P, front, ring, inr, bz.x, bz.x + BH));
    place(mark, P(bx.x + BS / 2, by.x + BS / 2, bz.x + BH));
    photo(ringAt(P, inr, bz.x + BH));
    const y1 = by.x + BS;
    pixel([P(bx.x + 2, y1, bz.x), P(bx.x + BS - 2, y1, bz.x), P(bx.x + BS - 2, y1, bz.x + BH), P(bx.x + 2, y1, bz.x + BH)]);
    tag.at(P(bx.x + BS / 2, by.x + BS / 2, bz.x + BH), 0, -22);
  }

  const B = register(stage, (dt) => { const m = stepS(bx, dt) | stepS(by, dt) | stepS(bz, dt); draw(); return !!m; });
  bag.add(B.unregister);

  function light(wall) {
    block.sil.classList.toggle("hi", !wall);
    mark.setAttribute("class", wall ? "dot m" : "dot");
    [rimIn, rimNear].forEach((el) => el.classList.toggle("hi", wall));
    rim.classList.toggle("lo", !wall);
  }

  /** The pointer is read on the floor, which never moves (rule 01); the wall clamps the target, never the pointer. */
  function aim(p) {
    if (!p) { tag.text("New workload"); tag.on(false); px(null); bx.t = REST[0]; by.t = REST[1]; bz.t = padAt(REST[0] + BS / 2, REST[1] + BS / 2) >= 0 ? PH : 0; light(false); read.textContent = "rest"; B.wake(); return; }
    const [x, y] = unproj(C, p[0], p[1], 0), [x0, x1, y0, y1] = lim();
    const tx = x - BS / 2, ty = y - BS / 2;
    bx.t = clamp(tx, x0, x1); by.t = clamp(ty, y0, y1);
    const wall = tx < x0 - 2 || tx > x1 + 2 || ty < y0 - 2 || ty > y1 + 2;
    light(wall);
    const cxp = bx.t + BS / 2, cyp = by.t + BS / 2;
    const on = padAt(cxp, cyp);
    bz.t = on >= 0 ? PH : 0;
    read.textContent = wall ? "guardrail" : on >= 0 ? `account ${on + 1}` : "floor";
    tag.text(read.textContent); tag.on(wall);
    px(wall ? P(clamp(x, 2, X1 - 2), clamp(y, 2, Y1 - 2), WH) : null);
    B.wake();
  }
  aim(null);

  bag.add(pointer(stage, { move: aim, leave: () => aim(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { pad = clamp(v, 0, 24); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "yard",
  means: "A landing zone as a walled yard: a new workload follows the pointer anywhere inside, and the guardrail holds it in.",
  rules: [1, 3, 4, 6],
  range: [2, 6, 12],
  tour: [[150, 150], [236, 196], [340, 170], null],
  mount,
});
