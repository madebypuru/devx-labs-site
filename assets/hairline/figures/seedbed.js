/**
 * Seedbed: the built platform as a plinth with eight sockets. Two use cases
 * already stand in theirs; the rest are empty. The pointer picks a socket and a
 * use case grows out of it, with the sockets round it sprouting after it,
 * staggered by distance: the next use cases, already in reach. The tallest new
 * one takes the bright edge and the seed dot on its lid. The read-out numbers
 * the socket. The slider is the stagger, in ms.
 */
const {
  Cam, clamp, facing, fit, poly, prism, proj, ringAt, rings, unproj,
  tdone, tset, tval, tween, disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const NX = 4, NY = 2, CX = 30, CY = 34, F = 16, W = NX * CX + 10, D = NY * CY + 6, PB = 7;
const LIVE = { 1: 30, 4: 21 }, GROW = 38, SPROUT = 9;

function mount({ stage, svg, read, dx }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 2.02);
  fit(C, [[0, 0, -PB], [W, D, -PB], [W, 0, -PB], [0, D, -PB], [0, 0, GROW]], 200, 172);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(0, 0, W, D, 9, 2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  const cells = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const cx = 5 + CX * (i + 0.5), cy = 3 + CY * (j + 0.5), k = j * NX + i;
    const [sock] = rings(cx - F / 2 - 3, cy - F / 2 - 3, cx + F / 2 + 3, cy + F / 2 + 3, 5, 0.5);
    mk("path", { d: poly(ringAt(P, sock, 0)), class: "nf lo" }, g);
    const [ring, inner] = rings(cx - F / 2, cy - F / 2, cx + F / 2, cy + F / 2, 4, 1.1);
    cells.push({ k, i, j, cx, cy, ring, inner, h0: LIVE[k] || 0 });
  }
  // the blocks, back to front by x + y
  cells.slice().sort((a, b) => a.cx + a.cy - (b.cx + b.cy)).forEach((c) => {
    c.el = solid(g);
    c.dot = flatDot(c.el.g, C, 0.95, "dot off");
    c.z = tween(c.h0);
    c.photo = dx.face(c.el, "photo");
    c.pixel = dx.face(c.el, "pixel");
    c.pin = dx.pin(c.k === 1 ? "Use case 01" : c.k === 4 ? "Use case 02" : "Next");
    c.pin.show(!!c.h0);
    c.drawn = NaN;
  });

  function draw(c, now) {
    const h = tval(c.z, now);
    if (h === c.drawn) return;
    c.drawn = h;
    if (h < 0.4) { c.el.sil.setAttribute("d", ""); c.el.cr.setAttribute("d", ""); c.photo(null); c.pixel(null); place(c.dot, P(c.cx, c.cy, 0)); return; }
    put(c.el, prism(P, front, c.ring, c.inner, 0, h));
    place(c.dot, P(c.cx, c.cy, h));
    const x0 = c.cx - F / 2, x1 = c.cx + F / 2, y1 = c.cy + F / 2;
    c.photo(c.h0 ? ringAt(P, c.inner, h) : null);
    c.pixel(!c.h0 && h > 12 ? [P(x0 + 2, y1, 0), P(x1 - 2, y1, 0), P(x1 - 2, y1, h), P(x0 + 2, y1, h)] : null);
    c.pin.at(P(c.cx, c.cy, h), c.k === 4 ? -34 : 0, -20);
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const c of cells) { draw(c, now); if (!tdone(c.z, now)) moving = true; }
    return moving;
  });
  bag.add(B.unregister);

  /** Parts stand at different heights, so the pointer is put on each socket's own resting top (rule 01). */
  function hit(p) {
    let best = -1, bd = 15;
    for (const c of cells) {
      const [x, y] = unproj(C, p[0], p[1], c.h0);
      const d = Math.max(Math.abs(x - c.cx), Math.abs(y - c.cy));
      if (d < bd) { bd = d; best = c.k; }
    }
    return best;
  }

  let act = -2;
  function choose(a) {
    if (a === act) return;
    const now = performance.now(), A = a >= 0 ? cells[a] : cells[1];
    act = a;
    cells.forEach((c) => {
      const dist = Math.abs(c.i - A.i) + Math.abs(c.j - A.j);
      let t = c.h0;
      if (a >= 0 && !c.h0) t = c.k === a ? GROW : dist === 1 ? SPROUT : 0;
      tset(c.z, t, now, dist * stag);
      const on = c.k === (a >= 0 ? a : 1);
      c.el.sil.classList.toggle("hi", on);
      c.dot.setAttribute("class", on ? "dot" : t > 0 ? "dot m" : "dot off");
      if (!c.h0) { c.pin.text("Next use case"); c.pin.show(c.k === a); }
      c.pin.on(on);
    });
    read.textContent = a < 0 ? "rest" : "use case " + String(a + 1).padStart(2, "0");
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
  name: "seedbed",
  means: "Two use cases stand on the platform; the pointer grows the next one, and the sockets round it sprout after it.",
  rules: [1, 2, 5, 8],
  range: [0, 60, 120],
  tour: [[268, 150], [196, 206], [150, 176], null],
  mount,
});
