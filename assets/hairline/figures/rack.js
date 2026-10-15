/**
 * Rack: eight blades standing in a low tray, the inference fleet. The pointer
 * picks how many are serving: blades up to the one under it rise out of their
 * slots, staggered outwards from it, and the rest sink back. The last blade
 * serving carries the bright edge and the bright dot on its spine. The read-out
 * says how many of the eight are up. The slider is the stagger, in ms.
 */
const {
  Cam, clamp, facing, fit, poly, prism, proj, ringAt, rings, tdone, tset, tval, tween,
  disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const N = 8, L = 66, T = 5, G = 12, H = 30, LIFT = 22, PB = 6, REST = 3;
const Y1 = (N - 1) * G + T;

function mount({ stage, svg, read, dx }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.74);
  fit(C, [[-8, -8, -PB], [L + 8, Y1 + 8, -PB], [L + 8, -8, -PB], [-8, Y1 + 8, -PB], [0, 0, H + LIFT]], 200, 170);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [br, bi] = rings(-8, -8, L + 8, Y1 + 8, 7, 1.8);
  put(solid(g), prism(P, front, br, bi, -PB, 0));
  // the slots, cut into the tray's top: one dim line each, under its blade
  for (let i = 0; i < N; i++) {
    const [s] = rings(-2, i * G - 1.5, L + 2, i * G + T + 1.5, 2.5, 0.5);
    mk("path", { d: poly(ringAt(P, s, 0)), class: "nf lo" }, g);
  }

  // back to front: ascending y, so a nearer blade covers a farther one
  const blades = [];
  for (let i = 0; i < N; i++) {
    const [ring, inner] = rings(0, i * G, L, i * G + T, 2.4, 0.8);
    const el = solid(g);
    const dot = flatDot(el.g, C, 0.9, "dot off");
    blades.push({ i, ring, inner, el, dot, pixel: dx.face(el, "pixel"), z: tween(i < REST ? LIFT : 0), drawn: NaN });
  }

  let count = REST;
  const tag = dx.pin("");

  function draw(b, now) {
    const h = H + tval(b.z, now);
    if (h === b.drawn) return;
    b.drawn = h;
    put(b.el, prism(P, front, b.ring, b.inner, 0, h));
    place(b.dot, P(L - 9, b.i * G + T / 2, h));
    const y1 = b.i * G + T;
    b.pixel(h > H + 4 ? [P(3, y1, 0), P(L - 3, y1, 0), P(L - 3, y1, h), P(3, y1, h)] : null);
    if (b.i === count - 1) tag.at(P(L / 2, b.i * G + T / 2, h), 0, -22);
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const b of blades) { draw(b, now); if (!tdone(b.z, now)) moving = true; }
    return moving;
  });
  bag.add(B.unregister);

  // the hit test reads each blade's resting spine, which never moves: the nearest on screen x wins
  const spine = blades.map((b) => P(L / 2, b.i * G + T / 2, H)[0]);
  function hit([x, y]) {
    if (y < 40 || y > 300) return -1;
    let best = -1, d = 26;
    spine.forEach((sx, i) => { if (Math.abs(sx - x) < d) { d = Math.abs(sx - x); best = i; } });
    return best;
  }

  let act = -2;
  function choose(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : REST - 1;
    act = a;
    count = a < 0 ? REST : a + 1;
    blades.forEach((b) => {
      tset(b.z, b.i < count ? LIFT : 0, now, Math.abs(b.i - from) * stag);
      const last = b.i === count - 1;
      b.el.sil.classList.toggle("hi", last);
      b.dot.setAttribute("class", last ? "dot" : b.i < count ? "dot m" : "dot off");
    });
    read.textContent = a < 0 ? "rest" : `${count} of ${N}`;
    tag.text(`${count} of ${N} serving`);
    blades.forEach((b) => { b.drawn = NaN; });
    B.wake();
  }
  choose(-1);

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = clamp(v, 0, 120); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "rack",
  means: "Eight blades in a rack: the pointer sets how many are serving, and capacity rises to meet it.",
  rules: [1, 2, 5, 8],
  range: [0, 40, 90],
  tour: [[150, 210], [210, 150], [262, 118], null],
  mount,
});
