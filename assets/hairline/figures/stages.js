/**
 * Stages: a pipeline as a flight of four steps down to production, numbered
 * by the dots on their treads: build, evaluate, shadow, live. A change, a crate,
 * stands on one of them. The pointer picks a step and the crate walks to it,
 * hopping down or up one tread at a time on the lift curve. The crate holds the
 * bright edge; the step it heads for shows its dots. The read-out names the
 * stage. The slider is the hop.
 */
const {
  Cam, clamp, facing, fit, lerp, prism, proj, ringAt, rings, unproj,
  tdone, tset, tval, tween, disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const SW = 32, D = 46, CS = 15, PB = 5, HS = [46, 34, 22, 10], NAMES = ["build", "evaluate", "shadow", "live"], REST = 1;

function mount({ stage, svg, read, dx }, value) {
  const bag = disposer();
  let hop = value;

  const C = Cam(45, 0.5, 1.9);
  fit(C, [[-6, -6, -PB], [4 * SW + 6, D + 6, -PB], [4 * SW + 6, -6, -PB], [-6, D + 6, -PB], [SW / 2, D / 2, HS[0] + CS + 14]], 200, 164);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [br, bi] = rings(-6, -6, 4 * SW + 6, D + 6, 8, 2);
  put(solid(g), prism(P, front, br, bi, -PB, 0));
  // back to front: ascending x, the highest step first
  const steps = HS.map((h, i) => {
    const el = solid(g), [r, ri] = rings(i * SW + 1, 0, (i + 1) * SW - 1, D, 5, 1.4);
    put(el, prism(P, front, r, ri, 0, h));
    const dots = [];
    for (let k = 0; k <= i; k++) {
      const d = flatDot(el.g, C, 0.85, "dot off");
      place(d, P(i * SW + 7 + k * 4, D - 7, h));
      dots.push(d);
    }
    return { i, h, el, dots };
  });

  steps.forEach((s) => { s.pin = dx.pin(NAMES[s.i], { tone: "quiet" }); s.pin.at(P(s.i * SW + SW / 2, D, 0), -18, 14); });
  dx.pixel(g)(P(3 * SW + SW - 7, D - 7, HS[3]));
  const crate = solid(g), lid = flatDot(crate.g, C, 1, "dot");
  const cPhoto = dx.face(crate, "photo"), cPixel = dx.face(crate, "pixel");
  crate.sil.classList.add("hi");
  const t = tween(REST);
  let drawn = NaN, under = -1;

  function draw(now) {
    const x = tval(t, now);
    if (x === drawn) return;
    drawn = x;
    const i0 = clamp(Math.floor(x), 0, 2), f = clamp(x - i0, 0, 1);
    const z = lerp(HS[i0], HS[i0 + 1], f) + hop * Math.sin(Math.PI * f);
    const cx = (x + 0.5) * SW, cy = D / 2;
    const [r, ri] = rings(cx - CS / 2, cy - CS / 2, cx + CS / 2, cy + CS / 2, 3.5, 1.1);
    put(crate, prism(P, front, r, ri, z, z + CS));
    place(lid, P(cx, cy, z + CS));
    cPhoto(ringAt(P, ri, z + CS));
    const y1 = cy + CS / 2;
    cPixel([P(cx - CS / 2 + 2, y1, z), P(cx + CS / 2 - 2, y1, z), P(cx + CS / 2 - 2, y1, z + CS), P(cx - CS / 2 + 2, y1, z + CS)]);
    // the crate is painted just after the step it stands over, and before the nearer, lower ones
    const k = clamp(Math.round(x), 0, 3);
    if (k !== under) { under = k; steps[k].el.g.after(crate.g); }
  }

  const B = register(stage, (_dt, now) => { draw(now); return !tdone(t, now); });
  bag.add(B.unregister);

  /** Each step is read on its own resting tread (rule 01). */
  function hit(p) {
    for (const s of steps) {
      const [x, y] = unproj(C, p[0], p[1], s.h);
      if (x >= s.i * SW && x < (s.i + 1) * SW && y > -4 && y < D + 4) return s.i;
    }
    return -1;
  }

  let act = -2;
  function choose(a) {
    if (a === act) return;
    act = a;
    const k = a >= 0 ? a : REST;
    tset(t, k, performance.now(), 0);
    steps.forEach((s) => { s.dots.forEach((d) => d.setAttribute("class", s.i === k ? "dot m" : "dot off")); s.pin.on(s.i === k); });
    read.textContent = a < 0 ? "rest" : NAMES[a];
    B.wake();
  }
  choose(-1);

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { hop = clamp(v, 6, 14); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "stages",
  means: "A pipeline as four steps down to production: the pointer picks a stage, and the change walks to it one tread at a time.",
  rules: [1, 4, 6, 8],
  range: [6, 9, 13],
  tour: [[226, 196], [262, 214], [150, 150], null],
  mount,
});
