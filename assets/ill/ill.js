/*
 * devx illustrations, rebuilt live from the Figma file ("How we work · Illustration explorations").
 *
 * Every layer sits at its Figma coordinates on a 640 × 600 stage, so the drawing
 * matches the design; the stage is scaled to whatever plate it lands in. Then
 * the parts move: each illustration draws itself in when it reaches the screen,
 * keeps a quiet idle motion, and answers the pointer the way its object would.
 *
 *   mountIll(host, name, { view })  → { el }
 */
const BASE = new URL("./", import.meta.url).href;
const TEX = {
  trees: new URL("../photo-trees.jpg", BASE).href,
  pixel: new URL("../pixel-blocks.jpg", BASE).href,
  flow: BASE + "c2/flow.jpg",
  beachSq: BASE + "c2/beach.jpg",
  grid: new URL("../dot-grid.svg", BASE).href,
};
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ISO = {
  top: "rotate(30deg) skewX(-30deg) scaleY(.866)",
  left: "rotate(30deg) skewX(30deg) scaleY(.866)",
  right: "rotate(-30deg) skewX(-30deg) scaleY(.866)",
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (cur, to, k, dt) => cur + (to - cur) * (1 - Math.exp(-k * dt));

/* ---------- building blocks ---------- */
function el(tag, cls, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
function box(parent, x, y, w, h, cls) {
  const d = el("div", "b " + (cls || ""), parent);
  Object.assign(d.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
  return d;
}
/** A vector from the file, with Figma's stroke insets as [top, right, bottom, left]. */
function vec(parent, x, y, w, h, src, ins = ["0", "0", "0", "0"], cls = "") {
  const b = box(parent, x, y, w, h, "v " + cls);
  const i = el("img", "", b);
  i.src = BASE + src; i.alt = ""; i.decoding = "async";
  const [t, r, bt, l] = ins;
  Object.assign(i.style, { left: l, top: t, width: `calc(100% - (${l}) - (${r}))`, height: `calc(100% - (${t}) - (${bt}))` });
  return b;
}
/** An isometric face: a flat rectangle turned onto the top, left or right of a block. */
function face(parent, x, y, w, h, iw, ih, kind, { src, color, opacity, cls } = {}) {
  const b = box(parent, x, y, w, h, "f " + (cls || ""));
  const f = el("div", "fi", b);
  Object.assign(f.style, { width: iw + "px", height: ih + "px", transform: `translate(-50%, -50%) ${ISO[kind]}` });
  if (src) f.style.backgroundImage = `url("${src}")`;
  if (color) f.style.background = color;
  if (opacity != null) f.style.opacity = opacity;
  return f;
}
function img(parent, x, y, w, h, src, cls = "") { const b = box(parent, x, y, w, h, "i " + cls); const i = el("img", "", b); i.src = src.startsWith("http") ? src : BASE + src; i.alt = ""; return b; }
function label(parent, x, y, text, cls = "") { const p = el("span", "lbl " + cls, parent); p.textContent = text; Object.assign(p.style, { left: x + "px", top: y + "px" }); return p; }
function px(parent, x, y, s = 8, color) { const d = box(parent, x, y, s, s, "px"); if (color) d.style.background = color; return d; }
function line(parent, x, y, w, h, cls = "") { return box(parent, x, y, Math.max(w, 1), Math.max(h, 1), "ln " + cls); }
function group(parent, cls = "") { return el("div", "g " + cls, parent); }
/** Staggered entrance: every element given an order draws in when the plate reaches the screen. */
function enter(node, order, kind = "rise") { node.classList.add("in-" + kind); node.style.setProperty("--d", order * 70 + "ms"); return node; }

/* ---------- the eight illustrations ---------- */
const BUILD = {

  /* A2 · Survey: the reticle follows the pointer across the terrain; the nearest live thing takes the red pixel. */
  survey(st) {
    enter(img(st, 109, 39, 420, 420, "a2/1644b.svg"), 0, "scale");
    const dash = enter(img(st, 131, 61, 376, 376, "a2/fd528.png", "spin"), 1, "scale");
    enter(img(st, 149, 79, 340, 340, "a2/a49eb.png"), 2, "scale");
    const cross = group(st, "cross");
    const h = enter(line(cross, 39, 249, 560, 0, "hair"), 3, "draw-x");
    const v = enter(line(cross, 319, 19, 0, 460, "hair"), 3, "draw-y");
    const pts = [[245, 175], [375, 155], [225, 295], [405, 285], [295, 345], [345, 215], [195, 235], [435, 215]];
    const dots = pts.map(([x, y], i) => enter(img(st, x, y, 8, 8, "a2/adffb.svg", "dot"), 4 + i * 0.5, "pop"));
    enter(vec(st, 59, 119, 190, 60, "a2/d4eff.svg", ["-0.79%", "0", "-0.79%", "0"]), 8, "fade");
    enter(label(st, 61, 99, "Models · 14"), 8, "fade");
    enter(vec(st, 409, 289, 60, 90, "a2/f5374.svg", ["-0.31%", "-0.69%", "-0.31%", "-0.69%"]), 9, "fade");
    enter(label(st, 475, 365, "Spend lines · 9"), 9, "fade");
    enter(vec(st, 439, 149, 40, 70, "a2/526a7.svg", ["-0.35%", "-1.09%", "-0.35%", "-1.09%"]), 10, "fade");
    enter(label(st, 485, 135, "Keys · 32"), 10, "fade");
    const red = enter(px(st, 405, 285), 11, "pop");
    let cx = 319, cy = 249, tx = 319, ty = 249, lit = 3;
    return {
      point(p) {
        if (p && Math.hypot(p[0] - 319, p[1] - 249) < 200) { tx = p[0]; ty = p[1]; }
        else { tx = 319; ty = 249; }
        let best = 3, bd = Infinity;
        pts.forEach(([x, y], i) => { const d = Math.hypot(x + 4 - tx, y + 4 - ty); if (d < bd) { bd = d; best = i; } });
        if (!p) best = 3;
        if (best !== lit) { dots[lit].classList.remove("on"); lit = best; }
        dots[lit].classList.add("on");
        red.style.left = pts[lit][0] + "px"; red.style.top = pts[lit][1] + "px";
      },
      tick(dt) {
        cx = ease(cx, tx, 9, dt); cy = ease(cy, ty, 9, dt);
        h.style.transform = `translateY(${(cy - 249).toFixed(2)}px)`;
        v.style.transform = `translateX(${(cx - 319).toFixed(2)}px)`;
        return Math.abs(cx - tx) > 0.05 || Math.abs(cy - ty) > 0.05;
      },
    };
  },

  /* B1 · Aligned in guardrails: the planes breathe on their axis; the pointer opens the stack. */
  guardrails(st) {
    enter(vec(st, 145.8, 59, 346.4, 200, "b1/0a6b4.svg", ["-0.29%", "-0.29%", "-0.29%", "-0.29%"]), 0, "fade");
    [[492.2, 159], [319, 259], [145.8, 159]].forEach(([x, y], i) => enter(vec(st, x, y, 0, 230, "b1/a1b73.svg", ["0", "-0.5px", "0", "-0.5px"]), 1 + i * 0.3, "draw-y"));
    enter(vec(st, 145.8, 389, 346.4, 100, "b1/65b41.svg", ["-0.43%", "0", "-0.58%", "0"]), 2, "fade");
    enter(vec(st, 319, 39, 0, 460, "b1/04926.svg", ["0", "-0.5px", "0", "-0.5px"]), 2, "draw-y");
    const planes = [];
    const p1 = group(st); vec(p1, 197.76, 109, 242.48, 140, "b1/27737.svg", ["-0.41%", "-0.41%", "-0.41%", "-0.41%"]); px(p1, 315, 105);
    const p2 = group(st); face(p2, 197.76, 174, 242.485, 140.003, 140, 140, "top", { src: TEX.trees, opacity: 0.35 }); vec(p2, 197.76, 174, 242.48, 140, "b1/30c3f.svg", ["-0.41%", "-0.41%", "-0.41%", "-0.41%"]);
    const p3 = group(st); vec(p3, 197.76, 239, 242.48, 140, "b1/27737.svg", ["-0.41%", "-0.41%", "-0.41%", "-0.41%"]);
    const p4 = group(st); vec(p4, 197.76, 304, 242.48, 140, "b1/27737.svg", ["-0.41%", "-0.41%", "-0.41%", "-0.41%"]);
    // paint order: lowest plane first, so a higher one covers it
    [p4, p3, p2, p1].forEach((g) => st.appendChild(g));
    [p1, p2, p3, p4].forEach((g, i) => { enter(g, 3 + i * 0.6, "drop"); planes.push(g); });
    enter(label(st, 139.8, 279, "Security"), 6, "fade");
    enter(label(st, 434.2, 279, "Finance"), 6, "fade");
    let spread = 0, target = 0, t = 0;
    return {
      point(p) { target = p && p[0] > 150 && p[0] < 490 && p[1] > 60 && p[1] < 470 ? 1 : 0; },
      tick(dt) {
        t += dt; spread = ease(spread, target, 6, dt);
        planes.forEach((g, i) => {
          const off = (i - 1.5) * 26 * spread + (reduce ? 0 : Math.sin(t * 1.4 + i * 0.9) * 2.2 * (1 - spread));
          g.style.transform = `translateY(${off.toFixed(2)}px)`;
        });
        return true;
      },
    };
  },

  /* C3 · First two shoots: the two live use cases sway; the pointer brings the next ones into bloom. */
  shoots(st) {
    enter(face(st, 137.14, 249, 363.728, 210.005, 210, 210, "top", { src: TEX.pixel }).parentNode, 0, "scale");
    enter(vec(st, 137.14, 249, 363.72, 210, "c3/f1377.svg", ["-0.27%", "-0.27%", "-0.27%", "-0.27%"]), 0, "fade");
    const plant = (stemSrc, sx, sy, sh, hx, hy, base, order) => {
      const g = enter(group(st, "plant"), order, "grow");
      vec(g, sx, sy, 0, sh, stemSrc, ["0", "-0.5px", "0", "-0.5px"]);
      const head = group(g, "head");
      img(head, hx, hy, 68, 68, "c3/f9a99.png"); img(head, hx, hy, 68, 68, "c3/2aa6c.svg");
      img(g, base[0], base[1], 7, 7, "c3/d04a9.svg");
      g.style.transformOrigin = `${sx}px ${sy + sh}px`;
      return g;
    };
    const live = [plant("c3/85d83.svg", 267, 158, 196, 233, 90, [263.5, 350.5], 2), plant("c3/6bbde.svg", 377, 178, 166, 343, 110, [373.5, 340.5], 3)];
    enter(label(st, 157, 118, "Use case 01"), 4, "fade");
    enter(label(st, 421, 138, "Use case 02"), 4, "fade");
    const next = [[329, 215, 174, 303, 163, "c3/7d3aa.svg"], [439, 225, 144, 413, 173, "c3/f6641.svg"]].map(([sx, sy, sh, cx, cy, src], i) => {
      const g = enter(group(st, "next"), 5 + i * 0.5, "fade");
      vec(g, sx, sy, 0, sh, src, ["0", "-0.5px", "0", "-0.5px"]);
      img(g, cx, cy, 52, 52, "c3/8edf9.png", "ring");
      const bloom = img(g, cx + 2, cy + 2, 48, 48, "c3/f9a99.png", "bloom");
      return { g, bloom, cx: cx + 26, cy: cy + 26 };
    });
    enter(px(st, 263, 350), 6, "pop");
    let t = 0;
    return {
      point(p) { next.forEach((n) => n.g.classList.toggle("on", !!p && Math.hypot(p[0] - n.cx, p[1] - n.cy) < 70)); },
      tick(dt) {
        if (reduce) return false;
        t += dt;
        live.forEach((g, i) => { g.style.rotate = (Math.sin(t * (0.9 + i * 0.25) + i) * 2.2).toFixed(2) + "deg"; });
        return true;
      },
    };
  },

  /* D2 · Orbit: the readings ride the orbit round the platform; the pointer turns it. */
  orbit(st) {
    enter(img(st, 79, 179, 480, 240, "d2/513fc.svg"), 0, "scale");
    const inner = enter(img(st, 149, 214, 340, 170, "d2/f7475.png"), 1, "scale");
    const back = group(st, "orbit-back");
    const block = enter(group(st, "block"), 2, "drop");
    face(block, 241.06, 189, 155.883, 90.002, 90, 90, "top", { src: TEX.trees });
    face(block, 241.06, 234, 77.942, 95.001, 90, 50, "left", { src: TEX.pixel });
    face(block, 319, 234, 77.942, 95.001, 90, 50, "right", { color: "#fff" });
    vec(block, 241.06, 189, 155.88, 90, "d2/efad0.svg", ["-0.64%", "-0.64%", "-0.64%", "-0.64%"]);
    vec(block, 241.06, 234, 155.88, 95, "d2/d45b3.svg", ["0", "-0.32%", "-0.61%", "-0.32%"]);
    vec(block, 319, 279, 0, 50, "d2/bd1cd.svg", ["0", "-0.5px", "0", "-0.5px"]);
    const fore = group(st, "orbit-fore");
    const CX = 319, CY = 299, RX = 240, RY = 120;
    const reads = [["SLO 99.9%", Math.PI], ["Cost / call −31%", 0.955], ["Adoption 82%", -0.73]].map(([text, a], i) => {
      const dot = img(fore, 0, 0, 7, 7, "d2/d04a9.svg", "odot");
      const pill = el("span", "pill", fore); pill.textContent = text;
      enter(dot, 3 + i * 0.4, "pop"); enter(pill, 3.4 + i * 0.4, "fade");
      return { dot, pill, a };
    });
    const red = enter(px(fore, 0, 0), 5, "pop");
    let rot = 0, off = 0, target = 0;
    return {
      point(p) { target = p ? clamp((p[0] - CX) / RX, -1, 1) * 1.1 : 0; },
      tick(dt) {
        if (!reduce) rot += dt * 0.12;
        off = ease(off, target, 3, dt);
        reads.forEach((r, i) => {
          const a = r.a + rot + off, x = CX + RX * Math.cos(a), y = CY + RY * Math.sin(a);
          (Math.sin(a) < -0.15 ? back : fore).appendChild(r.dot);
          (Math.sin(a) < -0.15 ? back : fore).appendChild(r.pill);
          r.dot.style.left = (x - 3.5).toFixed(1) + "px"; r.dot.style.top = (y - 3.5).toFixed(1) + "px";
          const below = Math.sin(a) > 0.35;
          r.pill.style.left = x.toFixed(1) + "px"; r.pill.style.top = (y + (below ? 30 : -30)).toFixed(1) + "px";
          if (i === 1) { red.style.left = (x - 0.5).toFixed(1) + "px"; red.style.top = (y - 22).toFixed(1) + "px"; }
        });
        return true;
      },
    };
  },

  /* C1 · The block: one solid object riding its axis; the pointer lifts it, the live mark keeps time. */
  block(st) {
    enter(vec(st, 319, 19, 0, 480, "c1/4539d.svg", ["0", "-0.5px", "0", "-0.5px"]), 0, "draw-y");
    const b = enter(group(st, "block"), 1, "drop");
    face(b, 145.8, 69, 346.408, 200.004, 200, 200, "top", { src: TEX.trees });
    face(b, 145.8, 169, 173.204, 200.002, 200, 100, "left", { src: TEX.pixel });
    face(b, 319, 169, 173.204, 200.002, 200, 100, "right", { color: "#fff" });
    vec(b, 145.8, 69, 346.4, 200, "c1/31b19.svg", ["-0.29%", "-0.29%", "-0.29%", "-0.29%"]);
    vec(b, 145.8, 169, 346.4, 200, "c1/c7832.svg", ["0", "-0.14%", "-0.29%", "-0.14%"]);
    vec(b, 319, 269, 0, 100, "c1/c77d6.svg", ["0", "-0.5px", "0", "-0.5px"]);
    vec(b, 492.2, 123, 0, 46, "c1/a1c06.svg", ["0", "-0.5px", "0", "-0.5px"]); img(b, 489.7, 120.5, 5, 5, "c1/63ffe.svg");
    vec(b, 145.8, 123, 0, 46, "c1/a1c06.svg", ["0", "-0.5px", "0", "-0.5px"]); img(b, 143.3, 120.5, 5, 5, "c1/63ffe.svg");
    px(b, 315, 65);
    enter(label(st, 339, 403, "Live · week 10"), 3, "fade");
    enter(img(st, 316, 406, 6, 6, "c1/0f66c.svg", "beat"), 3, "pop");
    let y = 0, ty = 0, t = 0;
    return {
      point(p) { ty = p ? -clamp((420 - p[1]) / 400, 0, 1) * 34 : 0; },
      tick(dt) {
        t += dt; y = ease(y, ty, 5, dt);
        b.style.transform = `translateY(${(y + (reduce ? 0 : Math.sin(t * 1.3) * 3)).toFixed(2)}px)`;
        return true;
      },
    };
  },

  /* C2 · River to channel: the raw flow keeps moving down the channel; the pointer picks a junction. */
  river(st) {
    enter(face(st, 151.06, 99, 181.864, 105.002, 120, 90, "top", { src: TEX.beachSq }).parentNode, 0, "fade");
    const f2 = face(st, 254.98, 159, 181.864, 105.002, 120, 90, "top", { src: TEX.flow, cls: "flow" });
    const f3 = face(st, 358.9, 219, 181.864, 105.002, 120, 90, "top", { src: TEX.pixel, cls: "flow" });
    enter(f2.parentNode, 1, "fade"); enter(f3.parentNode, 2, "fade");
    enter(face(st, 151.06, 144, 311.767, 194.004, 360, 14, "left", { color: "#fff" }).parentNode, 1, "fade");
    enter(vec(st, 151.06, 99, 389.7, 225, "c2/1cfac.svg", ["-0.26%", "-0.26%", "-0.26%", "-0.26%"]), 1, "fade");
    enter(vec(st, 151.06, 144, 311.76, 194, "c2/b1fae.svg", ["0", "-0.16%", "-0.45%", "-0.16%"]), 1, "fade");
    enter(vec(st, 254.98, 159, 77.94, 45, "c2/35565.svg", ["-0.96%", "-0.32%", "-0.96%", "-0.32%"]), 2, "fade");
    enter(vec(st, 358.9, 219, 77.94, 45, "c2/35565.svg", ["-0.96%", "-0.32%", "-0.96%", "-0.32%"]), 2, "fade");
    const J = [[293.95, 81.5, 100, 290.45, 178, "Landing zone", 263.95, 65.5, "c2/eb179.svg"],
               [397.87, 131.5, 110, 394.37, 238, "Gateway", 367.87, 115.5, "c2/30a1b.svg"],
               [501.79, 181.5, 120, 498.29, 298, "Pipeline", 471.79, 165.5, "c2/522ef.svg"]].map(([lx, ly, lh, dx, dy, text, tx, ty, src], i) => {
      const g = enter(group(st, "junction"), 3 + i * 0.6, "fade");
      vec(g, lx, ly, 0, lh, src, ["0", "-0.5px", "0", "-0.5px"]);
      img(g, dx, dy, 7, 7, "c2/d04a9.svg", "jdot");
      label(g, tx, ty, text);
      return { g, x: dx + 3.5, y: dy + 3.5 };
    });
    const red = enter(px(st, 497.79, 297.5), 5, "pop");
    let t = 0, lit = 2;
    const light = (i) => { J.forEach((j, k) => j.g.classList.toggle("on", k === i)); red.style.left = (J[i].x - 4) + "px"; red.style.top = (J[i].y - 4) + "px"; };
    light(2);
    return {
      point(p) {
        let best = 2;
        if (p) { let bd = Infinity; J.forEach((j, k) => { const d = Math.abs(p[0] - j.x) + Math.abs(p[1] - j.y) * 0.5; if (d < bd) { bd = d; best = k; } }); }
        if (best !== lit) { lit = best; light(best); }
      },
      tick(dt) {
        if (reduce) return false;
        t += dt;
        f2.style.backgroundPosition = `${(-t * 14) % 600}px 50%`;
        f3.style.backgroundPosition = `${(-t * 10) % 600}px 50%`;
        return true;
      },
    };
  },

  /* B3 · Where they agree: two fields; the pointer pulls them together, and the design lives in the overlap. */
  lens(st) {
    const lensEl = enter(box(st, 0, 0, 640, 600, "lens"), 2, "fade");
    const c1 = enter(img(st, 89, 109, 300, 300, "b3/9885d.svg"), 0, "scale");
    const c2 = enter(img(st, 249, 109, 300, 300, "b3/9885d.svg"), 0, "scale");
    enter(line(st, 39, 259, 560, 0, "hair"), 1, "draw-x");
    enter(img(st, 36.5, 256.5, 5, 5, "b3/63ffe.svg"), 1, "pop");
    enter(img(st, 596.5, 256.5, 5, 5, "b3/63ffe.svg"), 1, "pop");
    const red = enter(px(st, 315, 128), 3, "pop");
    const ink = enter(px(st, 315.5, 382.5, 7, "#121721"), 3, "pop");
    const ls = enter(label(st, 119, 81, "Security"), 3, "fade");
    const lf = enter(label(st, 459, 81, "Finance"), 3, "fade");
    const R = 150, CY = 259;
    let d = 160, td = 160;
    return {
      point(p) { td = p ? lerp(70, 250, clamp(Math.abs(p[0] - 319) / 240, 0, 1)) : 160; },
      tick(dt) {
        d = ease(d, td, 5, dt);
        const x1 = 319 - d / 2, x2 = 319 + d / 2, s = (d - 160) / 2;
        c1.style.transform = `translateX(${-s}px)`; c2.style.transform = `translateX(${s}px)`;
        ls.style.transform = `translateX(${-s}px)`; lf.style.transform = `translateX(${s}px)`;
        const m = `radial-gradient(circle ${R}px at ${x1}px ${CY}px, #000 ${R - 0.5}px, transparent ${R}px), radial-gradient(circle ${R}px at ${x2}px ${CY}px, #000 ${R - 0.5}px, transparent ${R}px)`;
        lensEl.style.webkitMaskImage = m; lensEl.style.maskImage = m;
        const hh = Math.sqrt(Math.max(0, R * R - (d / 2) * (d / 2)));
        red.style.top = (CY - hh - 4) + "px"; ink.style.top = (CY + hh - 3.5) + "px";
        return Math.abs(d - td) > 0.05;
      },
    };
  },

  /* D1 · Block and readout: the block hands over to the interface; the pointer scrubs six months of cost. */
  readout(st) {
    const b = enter(group(st, "block"), 0, "drop");
    face(b, 56.42, 169, 225.165, 130.003, 130, 130, "top", { src: TEX.trees });
    face(b, 56.42, 234, 112.582, 135.001, 130, 70, "left", { src: TEX.pixel });
    face(b, 169, 234, 112.582, 135.001, 130, 70, "right", { color: "#fff" });
    vec(b, 56.42, 169, 225.16, 130, "d1/d5374.svg", ["-0.44%", "-0.44%", "-0.44%", "-0.44%"]);
    vec(b, 56.42, 234, 225.16, 135, "d1/adae3.svg", ["0", "-0.22%", "-0.43%", "-0.22%"]);
    vec(b, 169, 299, 0, 70, "d1/7228a.svg", ["0", "-0.5px", "0", "-0.5px"]);
    enter(vec(st, 281.58, 234, 47.42, 10, "d1/e8f49.svg", ["-4.89%", "-0.22%", "-4.89%", "-0.22%"]), 1, "draw-x");
    enter(img(st, 278.08, 230.5, 7, 7, "d1/d04a9.svg"), 1, "pop");
    const card = enter(box(st, 329, 129, 270, 230, "card"), 2, "rise");
    label(card, 21, 19, "Cost to serve · sample");
    const num = el("span", "num", card); Object.assign(num.style, { left: "21px", top: "39px" }); num.textContent = "−31%";
    line(card, 21, 199, 226, 0, "base");
    const PTS = [[0.25, 78.7], [40.25, 64.7], [80.25, 70.7], [120.25, 38.7], [160.25, 28.7], [200.25, 8.7], [226.25, 0.7]];
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 226.468 79.4247"); svg.setAttribute("class", "chart");
    Object.assign(svg.style, { left: "21px", top: "111px", width: "226px", height: "78px" });
    const path = document.createElementNS(NS, "polyline");
    path.setAttribute("points", PTS.map((p) => p.join(",")).join(" "));
    svg.appendChild(path); card.appendChild(svg);
    const guide = line(card, 0, 105, 0, 94, "guide");
    const red = px(card, 243.5, 107.5, 7);
    label(card, 21, 205, "M1", "faint"); label(card, 231, 205, "M6", "faint");
    const len = 270; path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
    let drawn = 0, shown = 0, target = -31, scrub = null, sx = 226;
    const valueAt = (x) => {
      x = clamp(x, 0.25, 226.25);
      let i = 0; while (i < PTS.length - 2 && PTS[i + 1][0] < x) i++;
      const [a, b2] = [PTS[i], PTS[i + 1]], u = (x - a[0]) / (b2[0] - a[0]);
      const y = lerp(a[1], b2[1], u);
      return { y, v: -31 * (78.7 - y) / 78 };
    };
    return {
      started: false,
      point(p) {
        if (p && p[0] > 329 && p[0] < 599 && p[1] > 129 && p[1] < 359) { scrub = p[0] - 329 - 21; card.classList.add("scrub"); }
        else { scrub = null; card.classList.remove("scrub"); }
      },
      tick(dt) {
        if (!st.parentNode.classList.contains("on")) return true;
        drawn = ease(drawn, 1, reduce ? 99 : 2.2, dt);
        path.style.strokeDashoffset = (len * (1 - drawn)).toFixed(1);
        sx = ease(sx, scrub == null ? 226 : clamp(scrub, 0, 226), 10, dt);
        const { y, v } = valueAt(sx);
        target = scrub == null ? -31 * drawn : v;
        shown = ease(shown, target, 8, dt);
        num.textContent = (Math.round(shown) === 0 ? "0" : "−" + Math.abs(Math.round(shown))) + "%";
        guide.style.left = (21 + sx).toFixed(1) + "px";
        red.style.left = (21 + sx - 3.5).toFixed(1) + "px"; red.style.top = (111 + y - 3.5).toFixed(1) + "px";
        return true;
      },
    };
  },
};

/* ---------- mounting, scaling, the one loop ---------- */
const live = new Set();
let last = 0, raf = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
  for (const it of live) it.api.tick && it.api.tick(dt);
  raf = live.size ? requestAnimationFrame(loop) : 0;
  if (!raf) last = 0;
}
const seen = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const it = e.target._ill;
    if (e.isIntersecting) {
      e.target.classList.add("on");
      live.add(it);
      if (!raf) raf = requestAnimationFrame(loop);
    } else live.delete(it);
  }
}, { rootMargin: "0px 0px -10% 0px" });

export function mountIll(host, name, { view = { x: 0, y: 0, w: 640, h: 500 }, grid = true } = {}) {
  host.classList.add("ill");
  host.style.aspectRatio = `${view.w} / ${view.h}`;
  const st = el("div", "ill-stage", host);
  if (grid) { const g = img(st, -1, -1, 640, 600, TEX.grid, "grid"); g.style.zIndex = 0; }
  const api = BUILD[name](st);
  const fit = () => { const s = host.clientWidth / view.w; st.style.transform = `scale(${s}) translate(${-view.x}px, ${-view.y}px)`; };
  new ResizeObserver(fit).observe(host); fit();
  const toStage = (e) => { const r = host.getBoundingClientRect(), s = r.width / view.w; return [(e.clientX - r.left) / s + view.x, (e.clientY - r.top) / s + view.y]; };
  host.addEventListener("pointermove", (e) => { api.point && api.point(toStage(e)); if (!raf && live.size) raf = requestAnimationFrame(loop); });
  host.addEventListener("pointerleave", () => api.point && api.point(null));
  api.point && api.point(null);
  const it = { api };
  host._ill = it;
  seen.observe(host);
  return it;
}
