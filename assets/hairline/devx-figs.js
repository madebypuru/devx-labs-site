/*
 * devx figures: the Figma illustrations ("How we work · Illustration explorations"),
 * redrawn as vectors on the Hairline engine (kernel.js, loaded before this module).
 *
 * Hairline gives the camera, the rounded solids, the springs, the pointer and the
 * tour. The devx layer on top keeps the design's grammar: B&W photography and the
 * pixel gradient mapped onto faces in perspective, small uppercase labels, the one
 * red pixel. No plate behind the drawing: it sits on whatever it is placed on.
 *
 *   mountFigure(host, name)  → { play(), stop() }
 */
const {
  Cam, clamp, extremes, facing, fit, lerp, open, poly, prism, proj, ringAt, rings, rrect, seg,
  spring, stepS, unproj, disposer, mk, pointer, put, register, solid, inject, tour,
} = HL;

const ROOT = new URL("../", import.meta.url).href;
const TEX = {
  trees: ROOT + "photo-trees.jpg",
  pixel: ROOT + "pixel-blocks.jpg",
  flow: ROOT + "ill/c2/flow.jpg",
  beach: ROOT + "ill/c2/beach.jpg",
  beachRound: ROOT + "ill/a2/a49eb.png",
  dashRing: ROOT + "ill/a2/fd528.png",
  seed: ROOT + "ill/c3/f9a99.png",
  seedRing: ROOT + "ill/c3/8edf9.png",
};
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = (cur, to, k, dt) => cur + (to - cur) * (1 - Math.exp(-k * dt));
const pts = (a) => a.map((p) => p[0].toFixed(2) + "," + p[1].toFixed(2)).join(" ");
let uid = 0;

/* ---------- the devx layer ---------- */
function devx(stage, svg) {
  const defs = mk("defs", {}, svg);
  const over = document.createElement("div");
  over.className = "hx-over";
  stage.appendChild(over);
  const api = {
    /** A texture on one face. set(o, u, v, pan): o the face's origin, u and v its two edges, on screen. */
    skin(parent, src, fw, fh, { opacity = 1, before = null } = {}) {
      const id = "hx" + ++uid;
      const pat = mk("pattern", { id, patternUnits: "userSpaceOnUse", width: fw, height: fh }, defs);
      const im = mk("image", { href: src, width: fw, height: fh, preserveAspectRatio: "xMidYMid slice" }, pat);
      const pg = mk("polygon", { class: "hx-tex", style: `fill:url(#${id});stroke:none;opacity:${opacity}` });
      parent.insertBefore(pg, before);
      return (o, u, v, pan) => {
        const a = (u[0] - o[0]) / fw, b = (u[1] - o[1]) / fw, c = (v[0] - o[0]) / fh, d = (v[1] - o[1]) / fh;
        pat.setAttribute("patternTransform", `matrix(${a} ${b} ${c} ${d} ${o[0]} ${o[1]})`);
        if (pan !== undefined) pat.setAttribute("x", (pan % fw).toFixed(2));
        pg.setAttribute("points", pts([o, u, [u[0] + v[0] - o[0], u[1] + v[1] - o[1]], v]));
      };
    },
    /** A round photograph facing the viewer. */
    round(parent, src) {
      const id = "hr" + ++uid;
      const c = mk("circle", {}, mk("clipPath", { id }, defs));
      const im = mk("image", { href: src, preserveAspectRatio: "xMidYMid slice", "clip-path": `url(#${id})` }, parent);
      return (x, y, r) => {
        c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", Math.max(0, r));
        im.setAttribute("x", x - r); im.setAttribute("y", y - r); im.setAttribute("width", Math.max(0, 2 * r)); im.setAttribute("height", Math.max(0, 2 * r));
      };
    },
    /** Small uppercase type over the drawing, anchored to a viewBox point. */
    label(text, { tone = "", anchor = "left" } = {}) {
      const s = document.createElement("span");
      s.className = "hx-lbl " + tone;
      s.textContent = text;
      over.appendChild(s);
      const ax = anchor === "center" ? "-50%" : anchor === "right" ? "-100%" : "0%";
      return {
        el: s,
        at(p, dx = 0, dy = 0) {
          s.style.left = (p[0] / 4) + "%"; s.style.top = (p[1] / 3.2) + "%";
          s.style.transform = `translate(${ax}, -50%) translate(${dx}px, ${dy}px)`;
        },
        on(b) { s.classList.toggle("on", !!b); },
        text(t) { s.textContent = t; },
      };
    },
    /** The red pixel. */
    px(parent, size = 4, cls = "hx-px") {
      const r = mk("rect", { width: size, height: size, class: cls }, parent);
      return (p) => { r.setAttribute("x", (p[0] - size / 2).toFixed(2)); r.setAttribute("y", (p[1] - size / 2).toFixed(2)); };
    },
    over,
  };
  return api;
}

/**
 * A block in the devx grammar: a rounded Hairline solid, nature on its lid, the
 * digital layer down its left face, its right face white, and the front edge drawn.
 */
function isoBlock(g, P, front, dx, { x0, y0, x1, y1, h, r = 1.4, top = TEX.trees, left = TEX.pixel, right = true }) {
  const el = solid(g);
  const [ring, inner] = rings(x0, y0, x1, y1, r, 0.7);
  const W = x1 - x0, D = y1 - y0;
  const white = right ? mk("polygon", { class: "hx-white" }) : null;
  if (white) el.g.insertBefore(white, el.cr);
  const sLeft = left ? dx.skin(el.g, left, W, h, { before: el.cr }) : null;
  const sTop = top ? dx.skin(el.g, top, W, D, { before: el.cr }) : null;
  const outline = mk("path", { class: "nf sil" }, el.g);
  const edge = mk("path", { class: "nf sil" }, el.g);
  return {
    el,
    draw(z0 = 0, ox = 0, oy = 0) {
      const z1 = z0 + h, X0 = x0 + ox, X1 = x1 + ox, Y0 = y0 + oy, Y1 = y1 + oy;
      const [rg, ig] = ox || oy ? rings(X0, Y0, X1, Y1, r, 0.7) : [ring, inner];
      const p = prism(P, front, rg, ig, z0, z1);
      put(el, p);
      outline.setAttribute("d", p.sil);
      if (white) white.setAttribute("points", pts([P(X1, Y1, z1), P(X1, Y0, z1), P(X1, Y0, z0), P(X1, Y1, z0)]));
      if (sLeft) sLeft(P(X0, Y1, z1), P(X1, Y1, z1), P(X0, Y1, z0));
      if (sTop) sTop(P(X0, Y0, z1), P(X1, Y0, z1), P(X0, Y1, z1));
      edge.setAttribute("d", seg(P(X1, Y1, z0), P(X1, Y1, z1)));
    },
  };
}

/* ---------- shared bits for the practice figures ---------- */
/** A texture as a fill for anything drawn in viewBox space: returns "url(#id)". */
function texFill(svg, src, x, y, w, h) {
  const id = "hp" + ++uid;
  const defs = svg.querySelector("defs") || mk("defs", {}, svg);
  const pat = mk("pattern", { id, patternUnits: "userSpaceOnUse", x, y, width: w, height: h }, defs);
  mk("image", { href: src, width: w, height: h, preserveAspectRatio: "xMidYMid slice" }, pat);
  return `url(#${id})`;
}
/** An HTML card laid over the drawing, positioned in viewBox units (400 × 320). */
function overCard(dx, cls, x, y, w, inner) {
  const c = document.createElement("div");
  c.className = "hx-card " + cls;
  c.style.left = (x / 4) + "%"; c.style.top = (y / 3.2) + "%"; c.style.width = (w / 4) + "%";
  c.innerHTML = inner;
  dx.over.appendChild(c);
  return c;
}
const near = (list, x, y, key = (d) => d.p) => {
  let best = 0, bd = Infinity;
  list.forEach((d, i) => { const q = key(d); const dd = Math.hypot(q[0] - x, q[1] - y); if (dd < bd) { bd = dd; best = i; } });
  return best;
};

/* ---------- the figures ---------- */
const FIGS = {

  /* C1 · The block: one solid on its axis, nature on top, the digital layer through it. The pointer lifts it. */
  block: {
    tour: [[200, 90], [200, 250], [260, 160], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const C = Cam(45, 0.577, 1.32);
      fit(C, [[0, 0, -60], [100, 100, -60], [0, 0, 120], [100, 100, 0], [100, 0, 50], [0, 100, 50]], 200, 150);
      const P = proj(C), front = facing(C);
      const g = mk("g", {}, svg);
      const axis = mk("path", { class: "nf sil", d: seg(P(50, 50, -72), P(50, 50, 128)) }, g);
      const guides = mk("path", { class: "nf lo" }, g);
      const b = isoBlock(g, P, front, dx, { x0: 0, y0: 0, x1: 100, y1: 100, h: 50 });
      const marks = mk("g", {}, g);
      const mL = mk("circle", { r: 1.6, class: "hx-ink" }, marks), mR = mk("circle", { r: 1.6, class: "hx-ink" }, marks);
      const red = dx.px(g, 5.5);
      const live = mk("circle", { r: 2.4, class: "hx-ink hx-beat" }, g);
      const lp = P(50, 50, -64); live.setAttribute("cx", lp[0]); live.setAttribute("cy", lp[1]);
      const tag = dx.label("Live · week 10"); tag.at(lp, 10, 0);
      const z = spring(0, { eps: 0.02 });
      let t = 0;
      const B = register(stage, (dt) => {
        t += dt; stepS(z, dt);
        const lift = z.x + (reduce() ? 0 : Math.sin(t * 1.3) * 1.6);
        b.draw(lift);
        const l = P(0, 100, 50 + lift), r = P(100, 0, 50 + lift), l2 = P(0, 100, 74 + lift), r2 = P(100, 0, 74 + lift);
        guides.setAttribute("d", seg(l, l2) + seg(r, r2));
        mL.setAttribute("cx", l2[0]); mL.setAttribute("cy", l2[1]); mR.setAttribute("cx", r2[0]); mR.setAttribute("cy", r2[1]);
        red(P(0, 0, 50 + lift));
        return true;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { z.t = clamp((250 - p[1]) / 170, 0, 1) * 26; read.textContent = z.t > 13 ? "lifted" : "week 10"; B.wake(); },
        leave: () => { z.t = 0; read.textContent = "rest"; B.wake(); },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* C2 · River to channel: raw flow enters on the left, leaves governed on the right. The pointer picks a junction. */
  river: {
    tour: [[150, 130], [215, 165], [290, 205], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const L = 180, Dp = 45, H = 7;
      const C = Cam(45, 0.577, 1.5);
      fit(C, [[0, 0, -H], [L, Dp, -H], [L, 0, -H], [0, Dp, -H], [60, 0, 62]], 200, 168);
      const P = proj(C), front = facing(C);
      const g = mk("g", {}, svg);
      const el = solid(g);
      const [ring, inner] = rings(0, 0, L, Dp, 1.2, 0.6);
      put(el, prism(P, front, ring, inner, -H, 0));
      const side = mk("polygon", { class: "hx-white", points: pts([P(0, Dp, 0), P(L, Dp, 0), P(L, Dp, -H), P(0, Dp, -H)]) });
      el.g.insertBefore(side, el.cr);
      const segs = [TEX.beach, TEX.flow, TEX.pixel].map((src, i) => {
        const s = dx.skin(el.g, src, 60, Dp, { before: el.cr });
        s(P(i * 60, 0, 0), P(i * 60 + 60, 0, 0), P(i * 60, Dp, 0), 0);
        return s;
      });
      mk("path", { class: "nf sil", d: poly(ringAt(P, ring, 0)) }, el.g);
      mk("path", { class: "nf sil", d: seg(P(L, Dp, 0), P(L, Dp, -H)) + seg(P(60, 0, 0), P(60, Dp, 0)) + seg(P(120, 0, 0), P(120, Dp, 0)) }, el.g);
      const JN = opts.junctions || ["Landing zone", "Gateway", "Pipeline"];
      const J = [[JN[0], 60, 22], [JN[1], 120, 26], [JN[2], 178, Dp - 3]].map(([name, x, y], i) => {
        const base = P(x, y, 0), topp = P(x, y, 44 + i * 6);
        mk("path", { class: "nf dash", d: seg(base, topp) }, g);
        const dot = mk("circle", { r: 2.2, cx: base[0], cy: base[1], class: "hx-ring" }, g);
        const lab = dx.label(name, { anchor: "center" }); lab.at(topp, 0, -8);
        return { name, x, y, dot, lab, base };
      });
      const red = dx.px(g, 5.5);
      let lit = -1, t = 0;
      const light = (i) => {
        if (i === lit) return; lit = i;
        J.forEach((j, k) => { j.lab.on(k === i); j.dot.classList.toggle("on", k === i); });
        red(J[i].base);
      };
      light(2);
      const B = register(stage, (dt) => {
        if (reduce()) return false;
        t += dt;
        segs[1](P(60, 0, 0), P(120, 0, 0), P(60, Dp, 0), -t * 6);
        segs[2](P(120, 0, 0), P(180, 0, 0), P(120, Dp, 0), -t * 4);
        return true;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => {
          const [x] = unproj(C, p[0], p[1], 0);
          let best = 0, bd = Infinity; J.forEach((j, k) => { const d = Math.abs(x - j.x); if (d < bd) { bd = d; best = k; } });
          light(best); read.textContent = J[best].name.toLowerCase();
        },
        leave: () => { light(2); read.textContent = "rest"; },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* B3 · Where they agree: security and finance as two fields; the pointer pulls them together. */
  lens: {
    tour: [[200, 160], [330, 160], [70, 160], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const CX = 200, CY = 166, R = 92;
      const g = mk("g", {}, svg);
      mk("path", { class: "nf sil", d: seg([22, CY], [378, CY]) }, g);
      [22, 378].forEach((x) => mk("circle", { r: 1.6, cx: x, cy: CY, class: "hx-ink" }, g));
      const lensG = mk("g", {}, g);
      const id = "hl" + ++uid, defs = mk("defs", {}, svg);
      const pat = mk("pattern", { id, patternUnits: "userSpaceOnUse", x: CX - 70, y: CY - 100, width: 140, height: 200 }, defs);
      mk("image", { href: TEX.pixel, width: 140, height: 200, preserveAspectRatio: "xMidYMid slice" }, pat);
      const lens = mk("path", { style: `fill:url(#${id});stroke:none` }, lensG);
      const c1 = mk("circle", { r: R, cy: CY, class: "nf sil" }, g), c2 = mk("circle", { r: R, cy: CY, class: "nf sil" }, g);
      const red = dx.px(g, 5.5), ink = dx.px(g, 5, "hx-px ink");
      const ls = dx.label((opts.labels || [])[0] || "Security", { anchor: "center" }), lf = dx.label((opts.labels || [])[1] || "Finance", { anchor: "center" });
      const d = spring(100, { eps: 0.02 });
      const B = register(stage, (dt) => {
        const m = stepS(d, dt);
        const x1 = CX - d.x / 2, x2 = CX + d.x / 2, hh = Math.sqrt(Math.max(0, R * R - (d.x / 2) ** 2));
        c1.setAttribute("cx", x1); c2.setAttribute("cx", x2);
        lens.setAttribute("d", hh > 0.5 ? `M${CX},${CY - hh} A${R},${R} 0 0 1 ${CX},${CY + hh} A${R},${R} 0 0 1 ${CX},${CY - hh}Z` : "");
        red([CX, CY - hh]); ink([CX, CY + hh]);
        ls.at([x1 - 42, CY - R - 8]); lf.at([x2 + 42, CY - R - 8]);
        return m;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { d.t = lerp(48, 170, clamp(Math.abs(p[0] - CX) / 170, 0, 1)); read.textContent = Math.round(100 - d.t / 2) + "% agreed"; B.wake(); },
        leave: () => { d.t = 100; read.textContent = "rest"; B.wake(); },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* D1 · Block and readout: the built object hands over to the interface. The pointer scrubs six months. */
  readout: {
    tour: [[300, 150], [345, 150], [380, 150], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const C = Cam(45, 0.577, 1.05);
      fit(C, [[0, 0, 0], [100, 100, 0], [0, 0, 50], [100, 0, 50], [0, 100, 50]], 96, 166);
      const P = proj(C), front = facing(C);
      const g = mk("g", {}, svg);
      const b = isoBlock(g, P, front, dx, { x0: 0, y0: 0, x1: 100, y1: 100, h: 52 });
      b.draw(0);
      const v = P(100, 0, 52);
      mk("path", { class: "nf dash", d: seg(v, [214, v[1] + 4]) }, g);
      mk("circle", { r: 2.2, cx: v[0], cy: v[1], class: "hx-ring" }, g);
      // the interface: an HTML card, where iso becomes UI
      const card = document.createElement("div");
      card.className = "hx-card";
      card.innerHTML = `<span class="hx-lbl static">${opts.title || "Cost to serve · sample"}</span><span class="hx-num">−31%</span>
        <svg viewBox="0 0 226 96" class="hx-chart"><line x1="0" y1="88" x2="226" y2="88" class="base"/><polyline points=""/><line class="guide" x1="0" x2="0" y1="0" y2="88"/><rect class="hx-px" width="6" height="6"/></svg>
        <span class="hx-m">M1</span><span class="hx-m r">M6</span>`;
      dx.over.appendChild(card);
      const VAL = opts.value ?? -31;
      const PTS = [[0, 78], [40, 64], [80, 70], [120, 38], [160, 28], [200, 8], [226, 1]];
      const pl = card.querySelector("polyline"), rect = card.querySelector("rect"), guide = card.querySelector(".guide"), num = card.querySelector(".hx-num");
      pl.setAttribute("points", PTS.map((p) => p.join(",")).join(" "));
      const LEN = 300; pl.style.strokeDasharray = LEN;
      const at = (x) => { x = clamp(x, 0, 226); let i = 0; while (i < PTS.length - 2 && PTS[i + 1][0] < x) i++; const a = PTS[i], c = PTS[i + 1]; const y = lerp(a[1], c[1], (x - a[0]) / (c[0] - a[0])); return { y, v: VAL * (78 - y) / 77 }; };
      let drawn = 0, shown = 0, sx = 226, scrub = null;
      const B = register(stage, (dt) => {
        drawn = ease(drawn, 1, reduce() ? 99 : 1.8, dt);
        pl.style.strokeDashoffset = (LEN * (1 - drawn)).toFixed(1);
        sx = ease(sx, scrub == null ? 226 * drawn : scrub, 9, dt);
        const { y, v: val } = at(sx);
        shown = ease(shown, scrub == null ? VAL * drawn : val, 8, dt);
        const n = Math.round(shown); num.textContent = (n === 0 ? "0" : (n < 0 ? "−" : "+") + Math.abs(n)) + "%";
        rect.setAttribute("x", sx - 3); rect.setAttribute("y", y - 3);
        guide.setAttribute("x1", sx); guide.setAttribute("x2", sx);
        return drawn < 0.999 || Math.abs(sx - (scrub ?? 226)) > 0.1 || Math.abs(shown - (scrub == null ? VAL : val)) > 0.05;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => {
          const inCard = p[0] > 222 && p[0] < 392;
          card.classList.toggle("scrub", inCard);
          scrub = inCard ? clamp((p[0] - 236) / 142 * 226, 0, 226) : null;
          read.textContent = inCard ? "M" + (1 + Math.round((scrub / 226) * 5)) : "rest"; B.wake();
        },
        leave: () => { scrub = null; card.classList.remove("scrub"); read.textContent = "rest"; B.wake(); },
      }));
      bag.add(() => { svg.replaceChildren(); card.remove(); });
      return { destroy: bag.dispose };
    },
  },

  /* A2 · Survey: map the terrain before moving anything. The reticle follows the pointer to what's live. */
  survey: {
    tour: [[150, 120], [262, 205], [235, 105], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const CX = 200, CY = 158, k = 0.6;
      const g = mk("g", {}, svg);
      mk("circle", { cx: CX, cy: CY, r: 210 * k, class: "nf sil" }, g);
      const spin = mk("g", { class: "hx-spin", style: `transform-origin:${CX}px ${CY}px` }, g);
      dx.round(spin, TEX.dashRing)(CX, CY, 188 * k);
      dx.round(g, TEX.beachRound)(CX, CY, 170 * k);
      const hl = mk("path", { class: "nf sil" }, g), vl = mk("path", { class: "nf sil" }, g);
      const S = (x, y) => [CX + (x - 319) * k, CY + (y - 249) * k];
      const DOTS = [[249, 179, "model 03"], [379, 159, "key 12"], [229, 299, "flow 07"], [409, 289, "spend 04"], [299, 349, "model 09"], [349, 219, "key 21"], [199, 239, "model 01"], [439, 219, "key 30"]];
      const dots = DOTS.map(([x, y, name]) => { const p = S(x, y); return { p, name, el: mk("circle", { r: 2.6, cx: p[0], cy: p[1], class: "hx-ring" }, g) }; });
      const leader = (pts2) => mk("path", { class: "nf lo", d: open(pts2.map(([x, y]) => S(x, y))) }, g);
      leader([[59, 119], [249, 179]]); leader([[469, 379], [409, 289]]); leader([[479, 149], [439, 219]]);
      const CO = opts.callouts || ["Models · 14", "Spend lines · 9", "Keys · 32"];
      dx.label(CO[0]).at(S(61, 109)); dx.label(CO[1]).at(S(475, 372)); dx.label(CO[2]).at(S(485, 142));
      const red = dx.px(g, 5.5);
      const cx = spring(CX), cy = spring(CY);
      let lit = -1;
      const pick = (x, y) => {
        let best = 3, bd = Infinity;
        dots.forEach((d, i) => { const dd = Math.hypot(d.p[0] - x, d.p[1] - y); if (dd < bd) { bd = dd; best = i; } });
        if (best !== lit) { if (lit >= 0) dots[lit].el.classList.remove("on"); lit = best; dots[lit].el.classList.add("on"); red(dots[lit].p); }
        return dots[best];
      };
      pick(S(409, 289)[0], S(409, 289)[1]);
      const B = register(stage, (dt) => {
        const m = stepS(cx, dt) | stepS(cy, dt);
        hl.setAttribute("d", seg([CX - 168, cy.x], [CX + 168, cy.x]));
        vl.setAttribute("d", seg([cx.x, CY - 138], [cx.x, CY + 138]));
        return !!m;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => {
          const r = Math.hypot(p[0] - CX, p[1] - CY), lim = 160 * k * 0.66 / 0.6;
          const s = r > lim ? lim / r : 1;
          cx.t = CX + (p[0] - CX) * s; cy.t = CY + (p[1] - CY) * s;
          read.textContent = pick(cx.t, cy.t).name; B.wake();
        },
        leave: () => { cx.t = CX; cy.t = CY; pick(S(409, 289)[0], S(409, 289)[1]); read.textContent = "rest"; B.wake(); },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* B1 · Aligned in guardrails: the same planes on one axis, inside the boundary security and finance drew. */
  guardrails: {
    tour: [[200, 120], [200, 230], [120, 170], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const BX = 0, BW = 100, PI = 15, PW = 70, TOP = 116, Z = [96, 72, 48, 24];
      const C = Cam(45, 0.577, 1.34);
      fit(C, [[BX, BX, 0], [BW, BW, 0], [BW, BX, 0], [BX, BW, 0], [BX, BX, TOP], [50, 50, TOP + 26]], 200, 160);
      const P = proj(C), front = facing(C);
      const g = mk("g", {}, svg);
      const [bound] = rings(BX, BX, BW, BW, 0.8, 0.3);
      const [lft, rgt, near] = extremes(P, bound);
      mk("path", { class: "nf dash", d: open(ringAt(P, bound.filter((q) => front(q)), 0)) }, g);
      mk("path", { class: "nf sil", d: poly([P(BX, BX, TOP), P(BW, BX, TOP), P(BW, BW, TOP), P(BX, BW, TOP)]) }, g);
      mk("path", { class: "nf dash", d: [lft, rgt, near].map((q) => seg(P(q.u, q.v, 0), P(q.u, q.v, TOP))).join("") }, g);
      mk("path", { class: "nf sil", d: seg(P(50, 50, -18), P(50, 50, TOP + 26)) }, g);
      const planes = Z.map((z, i) => {
        const pg = mk("g", {}, g);
        const fill = mk("polygon", { class: "hx-glass" }, pg);
        const tex = i === 1 ? dx.skin(pg, TEX.trees, PW, PW, { opacity: 0.38 }) : null;
        const out = mk("path", { class: "nf sil" }, pg);
        return { z, pg, fill, tex, out, sp: spring(z, { eps: 0.02 }) };
      });
      // lowest first, so the higher plane covers the one beneath
      planes.slice().reverse().forEach((p) => g.appendChild(p.pg));
      const red = dx.px(g, 5.5);
      dx.label((opts.labels || [])[0] || "Security", { anchor: "right" }).at(P(BX, BW, TOP * 0.5), -10, 0);
      dx.label((opts.labels || [])[1] || "Finance").at(P(BW, BX, TOP * 0.5), 10, 0);
      let t = 0, open_ = 0;
      const B = register(stage, (dt) => {
        t += dt;
        planes.forEach((p, i) => {
          stepS(p.sp, dt);
          const z = p.sp.x + (reduce() ? 0 : Math.sin(t * 1.4 + i) * 0.9 * (1 - open_));
          const c = [P(PI, PI, z), P(PI + PW, PI, z), P(PI + PW, PI + PW, z), P(PI, PI + PW, z)];
          p.fill.setAttribute("points", pts(c));
          p.out.setAttribute("d", poly(c));
          if (p.tex) p.tex(c[0], c[1], c[3]);
          if (i === 0) red(c[0]);
        });
        return true;
      });
      bag.add(B.unregister);
      const NAMES = opts.planes || ["pipelines", "gateway", "identity", "landing zone"];
      bag.add(pointer(stage, {
        move: (p) => {
          open_ = 1;
          const [, py] = [0, p[1]];
          planes.forEach((pl, i) => { pl.sp.t = pl.z + (1.5 - i) * 12; });
          let best = 0, bd = Infinity; planes.forEach((pl, i) => { const d = Math.abs(P(50, 50, pl.sp.t)[1] - py); if (d < bd) { bd = d; best = i; } });
          planes.forEach((pl, i) => pl.out.classList.toggle("hi", i === best));
          read.textContent = NAMES[best]; B.wake();
        },
        leave: () => { open_ = 0; planes.forEach((pl) => { pl.sp.t = pl.z; pl.out.classList.remove("hi"); }); read.textContent = "rest"; B.wake(); },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* C3 · First two shoots: two use cases grow from the platform; the empty ones around them grow under the pointer. */
  shoots: {
    tour: [[269, 188], [135, 192], [223, 208], null],      // resting heads of three empty use cases
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const W = 105;
      const C = Cam(45, 0.577, 1.36);
      fit(C, [[0, 0, 0], [W, W, 0], [W, 0, 0], [0, W, 0], [30, 40, 120]], 200, 160);
      const P = proj(C);
      const g = mk("g", {}, svg);
      const plane = mk("g", {}, g);
      const c = [P(0, 0, 0), P(W, 0, 0), P(W, W, 0), P(0, W, 0)];
      mk("polygon", { class: "hx-glass", points: pts(c) }, plane);
      dx.skin(plane, TEX.pixel, W, W)(c[0], c[1], c[3]);
      mk("path", { class: "nf sil", d: poly(c) }, plane);
      const R = 17, r2 = 13;
      const mkPlant = (x, y, hgt, label, side) => {
        const base = P(x, y, 0), top = P(x, y, hgt);
        const stem = mk("path", { class: "nf sil" }, g);
        mk("circle", { r: 2, cx: base[0], cy: base[1], class: "hx-ink" }, g);
        const head = dx.round(g, TEX.seed);
        const ring = mk("circle", { r: R, class: "nf sil" }, g);
        const lab = dx.label(label, { anchor: side < 0 ? "right" : "left" });
        return { base, top, stem, head, ring, lab, side };
      };
      const LIVE = opts.live || ["Use case 01", "Use case 02"];
      const live = [mkPlant(40, 60, 92, LIVE[0], -1), mkPlant(70, 46, 78, LIVE[1], 1)];
      // the next use cases: empty heads on short dashed stems, spread over the platform. Each one grows under the pointer.
      const SPOTS = [[4, 62, 54], [58, 86, 62], [94, 70, 58], [98, 26, 54], [30, 98, 50]];
      const next = SPOTS.map(([x, y, hgt]) => {
        const base = P(x, y, 0), top = P(x, y, hgt);
        mk("circle", { r: 1.6, cx: base[0], cy: base[1], class: "hx-ink" }, g);
        const stem = mk("path", { class: "nf dash" }, g);
        const bloom = dx.round(g, TEX.seed);
        const ring = dx.round(g, TEX.seedRing);
        const edge = mk("circle", { class: "nf dash" }, g);       // the empty head's outline, so it reads at rest
        return { base, top, stem, bloom, ring, edge, head: [top[0], top[1]], sp: spring(0, { eps: 0.01 }) };
      });
      const red = dx.px(g, 5.5); red(live[0].base);
      let t = 0;
      const B = register(stage, (dt) => {
        t += dt;
        live.forEach((pl, i) => {
          const sway = reduce() ? 0 : Math.sin(t * (0.9 + i * 0.3) + i) * 2.4;
          const hx = pl.top[0] + sway, hy = pl.top[1];
          pl.stem.setAttribute("d", `M${pl.base[0]},${pl.base[1]} Q${pl.top[0]},${(pl.base[1] + hy) / 2} ${hx},${hy + R}`);
          pl.head(hx, hy, R); pl.ring.setAttribute("cx", hx); pl.ring.setAttribute("cy", hy);
          pl.lab.at([hx + pl.side * (R + 8), hy - 6]);
        });
        next.forEach((n, i) => {
          stepS(n.sp, dt);
          const k = n.sp.x;                                          // 0 resting, 1 grown
          const lift = 0.5 + 0.5 * k, r = 8 + (R - 8) * k;          // half height and a small empty head at rest
          const sway = reduce() ? 0 : Math.sin(t * 0.8 + i * 1.7) * 1.6 * k;
          const hx = n.base[0] + (n.top[0] - n.base[0]) * lift + sway, hy = n.base[1] + (n.top[1] - n.base[1]) * lift;
          n.head = [hx, hy];
          n.stem.setAttribute("d", `M${n.base[0]},${n.base[1]} L${hx},${hy + r}`);
          n.ring(hx, hy, r);
          n.edge.setAttribute("cx", hx); n.edge.setAttribute("cy", hy); n.edge.setAttribute("r", r);
          n.bloom(hx, hy, Math.max(0, k - 0.15) / 0.85 * (r - 1.5));
        });
        return true;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => {
          // the nearest empty head within reach grows; the rest settle back
          let any = -1, best = 30;
          next.forEach((n, i) => { const d = Math.hypot(p[0] - n.head[0], p[1] - n.head[1]); if (d < best) { best = d; any = i; } });
          next.forEach((n, i) => { n.sp.t = i === any ? 1 : 0; });
          read.textContent = any >= 0 ? "use case 0" + (any + 3) : "rest"; B.wake();
        },
        leave: () => { next.forEach((n) => { n.sp.t = 0; }); read.textContent = "rest"; B.wake(); },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* D2 · Orbit: the platform at the centre; cost, reliability and adoption ride round it. The pointer turns it. */
  orbit: {
    tour: [[90, 190], [320, 190], [200, 250], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const RO = 128, RI = 90;
      const C = Cam(45, 0.577, 1.06);
      fit(C, [[-RO, -RO, 0], [RO, RO, 0], [RO, -RO, 0], [-RO, RO, 0], [0, 0, 40]], 200, 170);
      const P = proj(C), front = facing(C);
      const g = mk("g", {}, svg);
      mk("path", { class: "nf sil", d: poly(ringAt(P, rrect(-RO, -RO, RO, RO, RO, 16), 0)) }, g);
      mk("path", { class: "nf dash", d: poly(ringAt(P, rrect(-RI, -RI, RI, RI, RI, 16), 0)) }, g);
      const back = mk("g", {}, g);
      const b = isoBlock(g, P, front, dx, { x0: -24, y0: -24, x1: 24, y1: 24, h: 28 });
      b.draw(0);
      const fore = mk("g", {}, g);
      const READS = (opts.reads || ["SLO 99.9%", "Cost / call −31%", "Adoption 82%"]).map((t, i) => [t, t.toLowerCase(), [2.45, 0.5, -1.0][i]]);
      const marks = READS.map(([text, name, a]) => ({ name, a, dot: mk("circle", { r: 2.6, class: "hx-ring" }, fore), pill: dx.label(text, { tone: "pill", anchor: "center" }) }));
      const red = dx.px(fore, 5.5);
      let rot = 0; const off = spring(0, { eps: 0.0005 });
      const B = register(stage, (dt) => {
        if (!reduce()) rot += dt * 0.12;
        stepS(off, dt);
        marks.forEach((m, i) => {
          const a = m.a + rot + off.x, x = RO * Math.cos(a), y = RO * Math.sin(a), p = P(x, y, 0);
          (x + y < 0 ? back : fore).appendChild(m.dot);
          m.dot.setAttribute("cx", p[0]); m.dot.setAttribute("cy", p[1]);
          m.pill.at(p, 0, x + y < 0 ? -18 : 18);
          if (i === 1) red(P(x * 0.86, y * 0.86, 0));
        });
        return true;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { off.t = clamp((p[0] - 200) / 170, -1, 1) * 1.2; read.textContent = "turning"; B.wake(); },
        leave: () => { off.t = 0; read.textContent = "rest"; B.wake(); },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },












  /* ================= practice figures: one idea each, same grammar ================= */

  /* P1 · Gateway: every app's calls go through one door; the pointer picks the model the route goes to. */
  gateway: {
    tour: [[330, 90], [330, 230], [330, 160], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const models = opts.models || ["Gemini", "Claude", "GPT", "Open-weight"];
      const door = opts.door || "AI gateway";
      const g = mk("g", {}, svg);
      const D = { x: 160, y: 104, w: 52, h: 112 };
      const apps = [70, 110, 150, 190, 230].map((y) => ({ p: [40, y + 10] }));
      const outs = models.map((m, i) => ({ name: m, p: [292, 88 + i * (148 / Math.max(1, models.length - 1))] }));
      apps.forEach((a) => mk("path", { class: "nf lo", d: `M${a.p[0]},${a.p[1]} C100,${a.p[1]} 116,160 ${D.x},160` }, g));
      const routes = outs.map((o) => mk("path", { class: "nf lo", d: `M${D.x + D.w},160 C250,160 256,${o.p[1]} ${o.p[0]},${o.p[1]}` }, g));
      apps.forEach((a) => mk("circle", { r: 3, cx: a.p[0], cy: a.p[1], class: "hx-ring" }, g));
      mk("rect", { x: D.x, y: D.y, width: D.w, height: D.h, rx: 14, style: `fill:${texFill(svg, TEX.pixel, D.x - 40, D.y - 20, 140, 160)};stroke:none` }, g);
      mk("rect", { x: D.x, y: D.y, width: D.w, height: D.h, rx: 14, class: "nf sil" }, g);
      mk("path", { class: "nf sil", d: seg([D.x + 14, 160], [D.x + D.w - 14, 160]) }, g);
      const dots = outs.map((o) => mk("circle", { r: 4, cx: o.p[0], cy: o.p[1], class: "hx-ring" }, g));
      const labs = outs.map((o) => { const l = dx.label(o.name); l.at(o.p, 12, 0); return l; });
      dx.label(door, { anchor: "center" }).at([D.x + D.w / 2, D.y], 0, -14);
      dx.label("Every app", { anchor: "center" }).at([40, 62], 0, 0);
      const red = dx.px(g, 5.5);
      const pk = [0, 1, 2].map(() => mk("circle", { r: 2.4, class: "hx-ink" }, g));
      let at = 1, t = 0;
      const pick = (i) => { at = i; routes.forEach((r, j) => r.setAttribute("class", j === i ? "nf sil" : "nf lo")); dots.forEach((d, j) => d.classList.toggle("on", j === i)); labs.forEach((l, j) => l.on(j === i)); red(outs[i].p); };
      pick(1);
      const B = register(stage, (dt) => {
        if (reduce()) return false;
        t += dt;
        pk.forEach((c, k) => {
          const u = (t * 0.45 + k / 3) % 1;
          const path = routes[at], L = path.getTotalLength();
          const q = path.getPointAtLength(u * L);
          c.setAttribute("cx", q.x); c.setAttribute("cy", q.y);
        });
        return true;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { const i = near(outs, p[0], p[1]); if (i !== at) pick(i); read.textContent = outs[i].name; },
        leave: () => { pick(1); read.textContent = "rest"; },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* P2 · Meter: cost to serve, team by team; the pointer reads one team's number. */
  meter: {
    tour: [[200, 120], [200, 200], [200, 250], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const rows = opts.rows || [["Claims", 0.034, 0.72], ["Service", 0.029, 0.6], ["Underwriting", 0.041, 0.86], ["Search", 0.012, 0.28]];
      const unit = opts.unit || "per completed task";
      const g = mk("g", {}, svg);
      const X0 = 110, X1 = 250, Y0 = 92, GAP = 42, H = 18;
      const fill = texFill(svg, TEX.pixel, X0, Y0 - 20, X1 - X0, GAP * rows.length + 20);
      mk("path", { class: "nf lo", d: seg([X0, Y0 - 24], [X0, Y0 + GAP * rows.length - 10]) }, g);
      const bars = rows.map(([name, v, w], i) => {
        const y = Y0 + i * GAP;
        mk("rect", { x: X0, y, width: X1 - X0, height: H, rx: 6, class: "hx-glass" }, g);
        mk("rect", { x: X0, y, width: X1 - X0, height: H, rx: 6, class: "nf lo" }, g);
        const bar = mk("rect", { x: X0, y, width: 0, height: H, rx: 6, style: `fill:${fill};stroke:none` }, g);
        const lab = dx.label(name, { anchor: "right" }); lab.at([X0, y + H / 2], -10, 0);
        return { name, v, w, y, bar, lab, sp: spring(0, { eps: 0.002 }), p: [200, y + H / 2] };
      });
      const card = overCard(dx, "meter-card", 266, 112, 120, `<span class="hx-lbl static">Cost to serve</span><span class="hx-num">$0.000</span><span class="hx-m">${unit}</span>`);
      const num = card.querySelector(".hx-num");
      const red = dx.px(g, 5);
      let lit = 2;
      const light = (i) => { lit = i; bars.forEach((b, j) => { b.lab.on(j === i); b.sp.t = j === i ? b.w : b.w * 0.92; }); red([X0 + (X1 - X0) * bars[i].w, bars[i].y + H / 2]); num.textContent = "$" + bars[i].v.toFixed(3); };
      bars.forEach((b) => (b.sp.t = b.w));
      light(2);
      const B = register(stage, (dt) => {
        let m = false;
        bars.forEach((b) => { m = stepS(b.sp, dt) || m; b.bar.setAttribute("width", Math.max(0, (X1 - X0) * b.sp.x)); });
        return m;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { const i = near(bars, 200, p[1]); if (i !== lit) light(i); read.textContent = bars[i].name; B.wake(); },
        leave: () => { light(2); read.textContent = "rest"; B.wake(); },
      }));
      bag.add(() => { svg.replaceChildren(); card.remove(); });
      return { destroy: bag.dispose };
    },
  },

  /* P3 · Golden paths: one start, a few paved routes; the pointer picks the route a team takes. */
  paths: {
    tour: [[330, 90], [330, 160], [330, 235], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const names = opts.paths || ["RAG", "Agent", "Batch"];
      const start = opts.start || "New use case";
      const g = mk("g", {}, svg);
      const S = [70, 160];
      const ends = names.map((n, i) => ({ name: n, p: [330, 90 + i * (145 / Math.max(1, names.length - 1))] }));
      const stroke = texFill(svg, TEX.pixel, 60, 60, 300, 200);
      const ds = ends.map((e) => `M${S[0]},${S[1]} C180,${S[1]} 210,${e.p[1]} ${e.p[0]},${e.p[1]}`);
      ds.forEach((d) => mk("path", { class: "nf dash", d }, g));
      const paved = mk("path", { d: ds[0], style: `fill:none;stroke:${stroke};stroke-width:9;stroke-linecap:round` }, g);
      const edge = mk("path", { class: "nf sil", d: ds[0] }, g);
      mk("circle", { r: 6, cx: S[0], cy: S[1], class: "hx-ring on" }, g);
      dx.label(start, { anchor: "center" }).at(S, 0, -18);
      const rings_ = ends.map((e) => mk("rect", { x: e.p[0] - 7, y: e.p[1] - 7, width: 14, height: 14, rx: 4, class: "hx-ring" }, g));
      const labs = ends.map((e) => { const l = dx.label(e.name); l.at(e.p, 14, 0); return l; });
      const red = dx.px(g, 5);
      const L = { v: 0 }; let at = 0, drawn = 0;
      const pick = (i) => { at = i; drawn = 0; paved.setAttribute("d", ds[i]); edge.setAttribute("d", ds[i]); rings_.forEach((r, j) => r.classList.toggle("on", j === i)); labs.forEach((l, j) => l.on(j === i)); red(ends[i].p); B.wake(); };
      const B = register(stage, (dt) => {
        drawn = ease(drawn, 1, reduce() ? 99 : 3, dt);
        const len = paved.getTotalLength();
        paved.style.strokeDasharray = len; paved.style.strokeDashoffset = len * (1 - drawn);
        return drawn < 0.999;
      });
      pick(0);
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { const i = near(ends, p[0], p[1]); if (i !== at) pick(i); read.textContent = ends[i].name; },
        leave: () => { read.textContent = "rest"; },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* P4 · One definition: the semantic layer as a stack, each team's numbers a sheet above it. Pointing at a layer names it. */
  merge: {
    tour: [[200, 120], [150, 160], [200, 240], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const src = opts.sources || [["Finance", 4.21], ["Sales", 4.63], ["Ops", 3.94]];
      const truth = opts.truth || 4.38, metric = opts.metric || "Revenue · one definition";
      const fmt = (v) => (opts.prefix || "$") + v.toFixed(2) + (opts.suffix || "M");
      const W = 110, GAP = 24, LIFT = 16;
      const C = Cam(45, 0.577, 1.6);
      fit(C, [[0, 0, 0], [W, W, 0], [W, 0, 0], [0, W, 0], [0, 0, 10 + GAP * src.length + 6]], 200, 168);
      const P = proj(C), front = facing(C);
      const g = mk("g", {}, svg);
      // the semantic layer at the base, the pixel gradient on its top
      const layer = isoBlock(g, P, front, dx, { x0: 0, y0: 0, x1: W, y1: W, h: 10, top: TEX.pixel, left: TEX.pixel, r: 1.2 });
      layer.draw(0);
      // construction lines: the stack's corners, top to bottom
      const zTop = 10 + GAP * src.length;
      mk("path", { class: "nf dash", d: [[0, W], [W, 0], [W, W]].map(([u, v]) => seg(P(u, v, 10), P(u, v, zTop))).join("") }, g);
      // one sheet per team, evenly above it; nearer (lower) sheets drawn last
      const sheets = src.map(([name, v], i) => {
        const z = 10 + GAP * (src.length - i), sg = mk("g", {}, g);
        sg.style.transition = "transform .35s cubic-bezier(.2,.8,.2,1)";
        const c = [P(0, 0, z), P(W, 0, z), P(W, W, z), P(0, W, z)];
        mk("polygon", { class: "hx-white", points: pts(c) }, sg);
        const out = mk("path", { class: "nf sil", d: poly(c) }, sg);
        mk("path", { class: "nf lo", d: [0.3, 0.45, 0.6].map((t) => seg(P(W * 0.18, W * t, z), P(W * (t === 0.45 ? 0.5 : 0.72), W * t, z))).join("") }, sg);
        const lab = dx.label(name + " · " + fmt(v), { tone: "pill", anchor: "center" }); lab.at(P(W / 2, 0, z), 0, -12);
        return { name, z, sg, out, lab, p: P(W / 2, W / 2, z) };
      });
      sheets.forEach((sh) => g.appendChild(sh.sg));
      const base = { name: metric, lab: dx.label(metric + " · " + fmt(truth), { tone: "pill", anchor: "center" }), p: P(W / 2, W / 2, 10), out: null };
      base.lab.at(P(W / 2, W, 0), 0, 24);
      const all = [...sheets, base];
      all.forEach((l) => { l.lab.el.style.opacity = 0; l.lab.el.style.transition = "opacity .25s ease, translate .35s cubic-bezier(.2,.8,.2,1)"; });
      // the lift in screen units: the sheet rises, and is drawn over the ones above it
      const lift = P(0, 0, 0)[1] - P(0, 0, LIFT)[1];
      const red = dx.px(g, 5.5); red(P(W, W, 10)); const redDot = g.lastChild;
      let lit = -1;
      const show = (i) => {
        if (i === lit) return; lit = i;
        all.forEach((l, j) => { l.lab.el.style.opacity = j === i ? 1 : 0; if (l.out) l.out.classList.toggle("hi", j === i); });
        sheets.forEach((sh, j) => {
          const up = j === i;
          sh.sg.style.transform = up ? `translateY(${-lift}px)` : "";
          sh.lab.el.style.translate = up ? `0 ${-lift * stage.getBoundingClientRect().width / 400}px` : "";
        });
        // order: hovered sheet last (on top); otherwise back to the stack order
        sheets.forEach((sh) => g.appendChild(sh.sg));
        if (i >= 0 && i < sheets.length) g.appendChild(sheets[i].sg);
        g.appendChild(redDot);
      };
      bag.add(pointer(stage, {
        move: (p) => { const i = near(all, p[0], p[1]); show(i); read.textContent = all[i].name.toLowerCase(); },
        leave: () => { show(-1); read.textContent = "rest"; },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* P5 · Ontology: the business as a graph on one plane; the pointer lights a thing and everything it touches. */
  graph: {
    tour: [[200, 150], [120, 190], [290, 120], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const names = opts.nodes || ["Customer", "Order", "Contract", "Asset", "Invoice", "Event"];
      const EDGES = opts.edges || [[0, 1], [0, 2], [1, 4], [2, 3], [3, 5], [1, 5], [0, 5], [2, 4]];
      const W = 120;
      const C = Cam(45, 0.577, 1.3);
      fit(C, [[0, 0, 0], [W, W, 0], [W, 0, 0], [0, W, 0], [0, 0, 60]], 200, 175);
      const P = proj(C);
      const g = mk("g", {}, svg);
      const c4 = [P(0, 0, 0), P(W, 0, 0), P(W, W, 0), P(0, W, 0)];
      mk("polygon", { class: "hx-glass", points: pts(c4) }, g);
      dx.skin(g, TEX.pixel, W, W, { opacity: 0.22 })(c4[0], c4[1], c4[3]);
      mk("path", { class: "nf sil", d: poly(c4) }, g);
      const POS = [[14, 60, "right"], [60, 14, "left"], [18, 108, "right"], [108, 18, "left"], [106, 104, "center"], [58, 58, "center"]];
      const nodes = names.map((n, i) => { const [u, v, side] = POS[i % POS.length]; return { name: n, side, p: P(u, v, 0), top: P(u, v, 0) }; });
      const edges = EDGES.map(([a, b]) => ({ a, b, el: mk("path", { class: "nf lo", d: seg(nodes[a].p, nodes[b].p) }, g) }));
            nodes.forEach((nd) => { nd.el = mk("circle", { r: 4.2, cx: nd.p[0], cy: nd.p[1], class: "hx-ring" }, g); nd.lab = dx.label(nd.name, { anchor: nd.side }); nd.lab.at(nd.p, nd.side === "right" ? -10 : nd.side === "left" ? 10 : 0, nd.side === "center" ? (nd.name === names[4] ? 14 : -14) : 0); });
      const red = dx.px(g, 5);
      let lit = -1;
      const light = (i) => {
        if (i === lit) return; lit = i;
        const touch = new Set([i]);
        edges.forEach((e) => { const on = e.a === i || e.b === i; e.el.setAttribute("class", on ? "nf sil" : "nf lo"); if (on) { touch.add(e.a); touch.add(e.b); } });
        nodes.forEach((nd, j) => { nd.el.classList.toggle("on", j === i); nd.lab.on(touch.has(j)); });
        red([nodes[i].p[0], nodes[i].p[1] - 9]);
      };
      light(0);
      bag.add(pointer(stage, {
        move: (p) => { const i = near(nodes, p[0], p[1]); light(i); read.textContent = nodes[i].name.toLowerCase(); },
        leave: () => { light(0); read.textContent = "rest"; },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* P6 · Forecast: history in ink, the future as a band; the pointer scrubs the horizon and the band widens. */
  forecast: {
    tour: [[230, 160], [330, 160], [370, 160], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const title = opts.title || "Demand · next 13 weeks";
      const g = mk("g", {}, svg);
      const X0 = 40, X1 = 370, NOW = 210, BASE = 250;
      mk("path", { class: "nf lo", d: seg([X0, BASE], [X1, BASE]) }, g);
      mk("path", { class: "nf dash", d: seg([NOW, 70], [NOW, BASE]) }, g);
      dx.label("Today", { anchor: "center" }).at([NOW, 62]);
      dx.label(title).at([X0, 50]);
      const f = (x) => 168 - 34 * Math.sin((x - X0) / 38) - (x - X0) * 0.12;
      const hist = []; for (let x = X0; x <= NOW; x += 6) hist.push([x, f(x) + Math.sin(x * 1.7) * 7]);
      mk("path", { class: "nf sil", d: open(hist) }, g);
      const band = mk("path", { style: `fill:${texFill(svg, TEX.pixel, NOW, 60, X1 - NOW, 200)};stroke:none;opacity:.9` }, g);
      const mid = mk("path", { class: "nf sil", style: "stroke-dasharray:3 3" }, g);
      const red = dx.px(g, 5);
      const hz = spring(X1, { eps: 0.2 });
      const card = overCard(dx, "fc-card", 250, 248, 120, `<span class="hx-lbl static">P10 – P90</span><span class="hx-num sm">±0%</span>`);
      const num = card.querySelector(".hx-num");
      const B = register(stage, (dt) => {
        const m = stepS(hz, dt), end = hz.x;
        const up = [], lo = [], md = [];
        for (let x = NOW; x <= end; x += 4) { const w = 4 + (x - NOW) * 0.22, y = f(x); up.push([x, y - w]); lo.push([x, y + w]); md.push([x, y]); }
        if (up.length > 1) { band.setAttribute("d", open(up) + " L" + lo.reverse().map((q) => q.join(",")).join(" L") + " Z"); mid.setAttribute("d", open(md)); }
        const w = 4 + (end - NOW) * 0.22; red([end, f(end)]);
        num.textContent = "±" + Math.round(w / 1.6) + "%";
        return m;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { hz.t = clamp(p[0], NOW + 20, X1); read.textContent = "week " + Math.round((hz.t - NOW) / (X1 - NOW) * 13); B.wake(); },
        leave: () => { hz.t = X1; read.textContent = "rest"; B.wake(); },
      }));
      bag.add(() => { svg.replaceChildren(); card.remove(); });
      return { destroy: bag.dispose };
    },
  },

  /* P7 · Eval grid: every case from your history is a cell; the pointer runs the suite across them. */
  evals: {
    tour: [[120, 160], [260, 160], [360, 160], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const title = opts.title || "Eval suite · 120 real cases";
      const COLS = 15, ROWS = 8, S = 16, GAP = 4, X0 = 200 - (COLS * (S + GAP) - GAP) / 2, Y0 = 68;
      const g = mk("g", {}, svg);
      dx.label(title).at([X0, Y0 - 22]);
      const fill = texFill(svg, TEX.pixel, X0, Y0, COLS * (S + GAP), ROWS * (S + GAP));
      const FAILS = new Set(opts.fails || [17, 46, 63, 98, 111]);
      const cells = [];
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        const i = r * COLS + c, x = X0 + c * (S + GAP), y = Y0 + r * (S + GAP);
        mk("rect", { x, y, width: S, height: S, rx: 3, class: "nf lo" }, g);
        cells.push({ i, c, x, y, el: mk("rect", { x, y, width: S, height: S, rx: 3, style: "opacity:0" }, g), fail: FAILS.has(i) });
      }
      // passes take the devx gradient by column (blue → orange → pink), so the grid reads as one clean sweep; fails are the red pixel
      const RAMP = [[106, 154, 250], [134, 173, 241], [245, 159, 129], [246, 159, 194], [251, 191, 215]];
      const ramp = (t) => { const f = t * (RAMP.length - 1), k = Math.min(RAMP.length - 2, Math.floor(f)), u = f - k; return "rgb(" + RAMP[k].map((v, j) => Math.round(v + (RAMP[k + 1][j] - v) * u)).join(",") + ")"; };
      cells.forEach((cl) => cl.el.setAttribute("style", `fill:${cl.fail ? "#f2543d" : ramp(cl.c / (COLS - 1))};opacity:0;transition:opacity .25s ease`));
      const card = overCard(dx, "fc-card", 268, 238, 112, `<span class="hx-lbl static">Pass rate</span><span class="hx-num sm">—</span>`);
      const num = card.querySelector(".hx-num");
      const sweep = spring(COLS, { eps: 0.02 });
      const B = register(stage, (dt) => {
        const m = stepS(sweep, dt);
        let run = 0, pass = 0;
        cells.forEach((cl) => { const on = cl.c < sweep.x; cl.el.style.opacity = on ? 1 : 0; if (on) { run++; if (!cl.fail) pass++; } });
        num.textContent = run ? Math.round(pass / run * 1000) / 10 + "%" : "—";
        return m;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { sweep.t = clamp((p[0] - X0) / (S + GAP), 0, COLS); read.textContent = Math.round(sweep.t) + " columns run"; B.wake(); },
        leave: () => { sweep.t = COLS; read.textContent = "rest"; B.wake(); },
      }));
      bag.add(() => { svg.replaceChildren(); card.remove(); });
      return { destroy: bag.dispose };
    },
  },

  /* P8 · Autonomy ladder: assist, act with approval, act alone. The pointer climbs; autonomy is earned a step at a time. */
  ladder: {
    tour: [[110, 200], [200, 170], [290, 130], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const steps = opts.steps || ["Assist", "Act with approval", "Act alone"];
      const C = Cam(45, 0.577, 1.15);
      fit(C, [[0, 0, 0], [190, 40, 0], [190, 0, 0], [0, 40, 0], [150, 0, 84]], 200, 170);
      const P = proj(C), front = facing(C);
      const g = mk("g", {}, svg);
      const blocks = steps.map((n, i) => {
        const x0 = i * 75, h = 22 + i * 30;
        const b = isoBlock(g, P, front, dx, { x0, y0: 0, x1: x0 + 40, y1: 40, h, top: i === steps.length - 1 ? TEX.pixel : TEX.trees, left: i === steps.length - 1 ? TEX.pixel : null, r: 1.2 });
        b.draw(0);
        const foot = P(x0 + 20, 40, 0);
        const lab = dx.label(n, { anchor: "center" }); lab.at(foot, 0, 22);
        return { lab, top: P(x0 + 20, 20, h), p: P(x0 + 20, 20, h / 2) };
      });
      mk("path", { class: "nf dash", d: open(blocks.map((bl) => [bl.top[0], bl.top[1] - 10])) }, g);
      const red = dx.px(g, 6);
      const tok = { x: spring(blocks[0].top[0]), y: spring(blocks[0].top[1]) };
      let at = 0;
      const B = register(stage, (dt) => { const m = stepS(tok.x, dt) | stepS(tok.y, dt); red([tok.x.x, tok.y.x - 10]); return !!m; });
      const go = (i) => { at = i; blocks.forEach((bl, j) => bl.lab.on(j === i)); tok.x.t = blocks[i].top[0]; tok.y.t = blocks[i].top[1]; B.wake(); };
      go(1);
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { const i = near(blocks, p[0], p[1]); if (i !== at) go(i); read.textContent = steps[i].toLowerCase(); },
        leave: () => { go(1); read.textContent = "rest"; },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* P9 · Agent run: plan, call a tool, verify, wait for approval, done. The pointer is the approver. */
  flow: {
    tour: [[300, 130], [300, 130], [200, 240], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const steps = opts.steps || ["Plan", "Call tool", "Verify", "Approve", "Done"];
      const tools = opts.tools || ["ERP", "CRM", "Ticketing"];
      const g = mk("g", {}, svg);
      const Y = 130, X0 = 50, X1 = 350;
      const N = steps.map((n, i) => ({ name: n, p: [X0 + i * (X1 - X0) / (steps.length - 1), Y] }));
      mk("path", { class: "nf lo", d: seg(N[0].p, N[N.length - 1].p) }, g);
      const TOOL = tools.map((t, i) => ({ name: t, p: [118 + i * 82, 236] }));
      TOOL.forEach((t) => { mk("path", { class: "nf dash", d: seg(N[1].p, t.p) }, g); mk("rect", { x: t.p[0] - 34, y: t.p[1] - 13, width: 68, height: 26, rx: 8, class: "hx-ring" }, g); dx.label(t.name, { anchor: "center" }).at(t.p); });
      dx.label("Tools · scoped, logged", { anchor: "center" }).at([200, 276]);
      const dots = N.map((nd, i) => { nd.el = mk("circle", { r: i === 3 ? 7 : 5, cx: nd.p[0], cy: nd.p[1], class: "hx-ring" }, g); nd.lab = dx.label(nd.name, { anchor: "center" }); nd.lab.at(nd.p, 0, -20); return nd; });
      const gate = dx.px(g, 6); gate(N[3].p);
      const tok = mk("circle", { r: 3.4, class: "hx-ink" }, g);
      const trail = mk("path", { style: `fill:none;stroke:${texFill(svg, TEX.pixel, X0, Y - 20, X1 - X0, 40)};stroke-width:6;stroke-linecap:round` }, g);
      g.insertBefore(trail, g.firstChild.nextSibling);
      let x = X0, approved = false, wait = 0;
      const B = register(stage, (dt) => {
        if (reduce()) { x = X1; }
        const gx = N[3].p[0];
        if (!approved && x >= gx) { x = gx; wait += dt; if (wait > 1.6) approved = true; } else x += dt * 70;
        if (x > X1 + 30) { x = X0; approved = false; wait = 0; }
        const cx = Math.min(x, X1);
        tok.setAttribute("cx", cx); tok.setAttribute("cy", Y);
        trail.setAttribute("d", seg([X0, Y], [cx, Y]));
        dots.forEach((d) => { d.el.classList.toggle("on", d.p[0] <= cx + 1); d.lab.on(Math.abs(d.p[0] - cx) < 26); });
        read.textContent = x >= gx - 1 && !approved ? "waiting for approval" : "running";
        return true;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { if (Math.hypot(p[0] - N[3].p[0], p[1] - N[3].p[1]) < 40) approved = true; },
        leave: () => {},
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* P10 · Console: what the agents did, in one feed; people approve or override. The pointer reads a row. */
  console: {
    tour: [[300, 110], [300, 170], [300, 230], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const rows = opts.rows || [["Reserve suggested", "Claim 4471", "approve"], ["Policy checked", "Claim 4470", "done"], ["Docs requested", "Claim 4468", "done"], ["Escalated to adjuster", "Claim 4465", "override"]];
      const title = opts.title || "Agent activity";
      const C = Cam(45, 0.577, 1.0);
      fit(C, [[0, 0, 0], [80, 80, 0], [0, 0, 44], [80, 0, 44], [0, 80, 44]], 82, 180);
      const P = proj(C), front = facing(C);
      const g = mk("g", {}, svg);
      const b = isoBlock(g, P, front, dx, { x0: 0, y0: 0, x1: 80, y1: 80, h: 44 });
      b.draw(0);
      const v = P(80, 0, 44);
      mk("path", { class: "nf dash", d: seg(v, [168, v[1]]) }, g);
      mk("circle", { r: 2.2, cx: v[0], cy: v[1], class: "hx-ring" }, g);
      const card = overCard(dx, "feed-card", 168, 54, 222, `<span class="hx-lbl static">${title}</span><ul class="hx-feed">${rows.map(([a, c, s]) => `<li data-s="${s}"><b>${a}</b><span>${c}</span><em>${s === "approve" ? "Approve" : s === "override" ? "Override" : "Done"}</em></li>`).join("")}</ul>`);
      const lis = [...card.querySelectorAll("li")];
      let lit = 0;
      const light = (i) => { lit = i; lis.forEach((l, j) => l.classList.toggle("on", j === i)); };
      light(0);
      let t = 0;
      const B = register(stage, (dt) => { if (reduce()) return false; t += dt; lis.forEach((l, j) => l.classList.toggle("in", t > j * 0.35)); return t < 2; });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { const r = card.getBoundingClientRect(), s = stage.getBoundingClientRect(); const y = s.top + p[1] / 320 * s.height; const i = lis.findIndex((l) => { const b2 = l.getBoundingClientRect(); return y >= b2.top && y <= b2.bottom; }); if (i >= 0 && i !== lit) light(i); read.textContent = i >= 0 ? rows[i][0].toLowerCase() : "rest"; },
        leave: () => { light(0); read.textContent = "rest"; },
      }));
      bag.add(() => { svg.replaceChildren(); card.remove(); });
      return { destroy: bag.dispose };
    },
  },

  /* P11 · Voice: a conversation as a ring of sound, in the customer's language. The pointer speaks. */
  voice: {
    tour: [[200, 160], [270, 120], [130, 210], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const langs = opts.langs || ["English", "हिन्दी", "தமிழ்", "Bahasa"];
      const CX = 200, CY = 160, R = 70, NB = 64;
      const g = mk("g", {}, svg);
      mk("circle", { cx: CX, cy: CY, r: R + 52, class: "nf dash" }, g);
      dx.round(g, TEX.beachRound)(CX, CY, R - 8);
      mk("circle", { cx: CX, cy: CY, r: R - 8, class: "nf sil" }, g);
      const fill = texFill(svg, TEX.pixel, CX - R - 50, CY - R - 50, 2 * R + 100, 2 * R + 100);
      const bars = Array.from({ length: NB }, (_, i) => mk("path", { style: `stroke:${fill};stroke-width:3.2;stroke-linecap:round;fill:none` }, g));
      const chips = langs.map((l, i) => { const a = -Math.PI / 2 + i * (Math.PI * 2 / langs.length) + 0.4; const p = [CX + Math.cos(a) * (R + 52), CY + Math.sin(a) * (R + 52)]; const lab = dx.label(l, { tone: "pill", anchor: "center" }); lab.at(p); return { lab, p }; });
      const red = dx.px(g, 5);
      const amp = spring(0.35, { eps: 0.005 });
      let t = 0, lang = 0;
      const B = register(stage, (dt) => {
        t += reduce() ? 0 : dt; stepS(amp, dt);
        bars.forEach((b, i) => {
          const a = i / NB * Math.PI * 2, h = 6 + amp.x * 40 * (0.45 + 0.55 * Math.abs(Math.sin(i * 0.9 + t * 5) * Math.cos(i * 0.37 - t * 3)));
          b.setAttribute("d", seg([CX + Math.cos(a) * R, CY + Math.sin(a) * R], [CX + Math.cos(a) * (R + h), CY + Math.sin(a) * (R + h)]));
        });
        chips.forEach((c, i) => c.lab.on(i === lang));
        red(chips[lang].p);
        return true;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { const d = Math.hypot(p[0] - CX, p[1] - CY); amp.t = clamp(1.1 - d / 180, 0.2, 1); lang = near(chips, p[0], p[1]); read.textContent = langs[lang]; B.wake(); },
        leave: () => { amp.t = 0.35; read.textContent = "rest"; B.wake(); },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* P12 · Conversation: the chat does the task, not just answers; a form appears in the thread. The pointer moves it on. */
  chat: {
    tour: [[200, 120], [200, 200], [200, 260], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const turns = opts.turns || [["user", "Where is my claim?"], ["ai", "Approved yesterday. Payout lands Friday."], ["ui", "Change payout account"], ["user", "Yes, switch it"]];
      const card = overCard(dx, "chat-card", 100, 24, 200, `<span class="hx-lbl static">${opts.channel || "WhatsApp"}</span><div class="hx-chat">${turns.map(([who, txt]) => who === "ui" ? `<div class="t ui"><i></i><b>${txt}</b><em>Confirm</em></div>` : `<div class="t ${who}">${txt}</div>`).join("")}</div>`);
      const ts = [...card.querySelectorAll(".t")];
      let shown = 0;
      const show = (n) => { shown = n; ts.forEach((el, i) => el.classList.toggle("in", i < n)); };
      let t = 0;
      const B = register(stage, (dt) => { if (reduce()) { show(ts.length); return false; } t += dt; const n = Math.min(ts.length, 1 + Math.floor(t / 0.9)); if (n !== shown) show(n); return n < ts.length; });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { show(clamp(Math.round((p[1] - 60) / 50) + 1, 1, ts.length)); read.textContent = "turn " + shown; },
        leave: () => { show(ts.length); read.textContent = "rest"; },
      }));
      bag.add(() => { svg.replaceChildren(); card.remove(); });
      return { destroy: bag.dispose };
    },
  },

  /* P13 · Cited search: an answer with its sources beside it. The pointer on a citation lights where it came from. */
  search: {
    tour: [[150, 170], [330, 110], [330, 230], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const q = opts.q || "Is flood damage covered on the home plan?";
      const a = opts.a || ["Yes, up to the sum insured", "after a 7-day waiting period", "excluding basements"];
      const srcs = opts.sources || ["Policy wording §4.2", "Product guide", "Claims FAQ"];
      const g = mk("g", {}, svg);
      const card = overCard(dx, "search-card", 24, 40, 212, `<div class="hx-q">${q}</div><p class="hx-a">${a.map((s, i) => `${s}<sup>${i + 1}</sup>`).join(", ")}.</p>`);
      const sups = [...card.querySelectorAll("sup")];
      const S = srcs.map((s, i) => ({ name: s, p: [318, 96 + i * 66] }));
      const ims = [TEX.trees, TEX.beach, TEX.flow];
      S.forEach((s, i) => {
        dx.skin(g, ims[i % 3], 46, 34)([s.p[0] - 23, s.p[1] - 17], [s.p[0] + 23, s.p[1] - 17], [s.p[0] - 23, s.p[1] + 17]);
        s.box = mk("rect", { x: s.p[0] - 23, y: s.p[1] - 17, width: 46, height: 34, rx: 5, class: "nf sil" }, g);
        s.lab = dx.label(s.name, { anchor: "center" }); s.lab.at(s.p, 0, 26);
        s.line = mk("path", { class: "nf lo", d: `M240,${150 + i * 14} C270,${150 + i * 14} 270,${s.p[1]} ${s.p[0] - 24},${s.p[1]}` }, g);
      });
      const red = dx.px(g, 5);
      let lit = -1;
      const light = (i) => { if (i === lit) return; lit = i; S.forEach((s, j) => { s.lab.on(j === i); s.line.setAttribute("class", j === i ? "nf sil" : "nf lo"); }); sups.forEach((u, j) => u.classList.toggle("on", j === i)); red([S[i].p[0] - 24, S[i].p[1]]); };
      light(0);
      let t = 0;
      const B = register(stage, (dt) => { if (reduce()) return false; t += dt; light(Math.floor(t / 1.6) % S.length); return true; });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { B.unregister(); const i = p[0] > 260 ? near(S, p[0], p[1]) : clamp(Math.floor((p[0] - 30) / 70), 0, S.length - 1); light(i); read.textContent = S[i].name; },
        leave: () => { read.textContent = "rest"; },
      }));
      bag.add(() => { svg.replaceChildren(); card.remove(); });
      return { destroy: bag.dispose };
    },
  },

  /* P14 · Shield: guardrails as rings around the system; the pointer is the attack, and it stops at the ring. */
  shield: {
    tour: [[60, 80], [350, 120], [90, 270], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const attacks = opts.attacks || ["Prompt injection", "Data leakage", "Excessive agency"];
      const CX = 200, CY = 165, R = 56;
      const g = mk("g", {}, svg);
      [R + 46, R + 28].forEach((r, i) => mk("circle", { cx: CX, cy: CY, r, class: i ? "nf sil" : "nf dash" }, g));
      mk("circle", { cx: CX, cy: CY, r: R, style: `fill:${texFill(svg, TEX.pixel, CX - R, CY - R, 2 * R, 2 * R)};stroke:none` }, g);
      mk("circle", { cx: CX, cy: CY, r: R, class: "nf sil" }, g);
      dx.label(opts.core || "Your assistant", { anchor: "center" }).at([CX, CY + R + 46], 0, 14);
      const A = attacks.map((n, i) => { const a = -2.4 + i * 1.9; const p = [CX + Math.cos(a) * 168, CY + Math.sin(a) * 128]; const lab = dx.label(n, { anchor: "center" }); lab.at(p, 0, -12); mk("circle", { r: 3, cx: p[0], cy: p[1], class: "hx-ink" }, g); return { name: n, p, lab }; });
      const ray = mk("path", { class: "nf sil", style: "stroke-dasharray:4 3" }, g);
      const red = dx.px(g, 6);
      const src = { x: spring(A[0].p[0]), y: spring(A[0].p[1]) };
      let t = 0, k = 0;
      const B = register(stage, (dt) => {
        t += dt; const m = stepS(src.x, dt) | stepS(src.y, dt);
        const sx = src.x.x, sy = src.y.x, d = Math.hypot(sx - CX, sy - CY) || 1, ux = (CX - sx) / d, uy = (CY - sy) / d;
        const hit = [CX - ux * (R + 28), CY - uy * (R + 28)];
        ray.setAttribute("d", seg([sx, sy], hit)); ray.style.strokeDashoffset = -t * 20; red(hit);
        return true;
      });
      const aim = (i) => { k = i; A.forEach((a, j) => a.lab.on(j === i)); src.x.t = A[i].p[0]; src.y.t = A[i].p[1]; B.wake(); };
      aim(0);
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { const d = Math.hypot(p[0] - CX, p[1] - CY); if (d > R + 34) { src.x.t = p[0]; src.y.t = p[1]; const i = near(A, p[0], p[1]); A.forEach((a, j) => a.lab.on(j === i)); read.textContent = "blocked: " + A[i].name.toLowerCase(); } B.wake(); },
        leave: () => { aim(k); read.textContent = "rest"; },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* P15 · Migration: the old model and the new one, side by side on your evals; the pointer moves traffic across. */
  migrate: {
    tour: [[120, 160], [280, 160], [330, 160], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const from = opts.from || "Current model", to = opts.to || "New model";
      const C = Cam(45, 0.577, 1.1);
      fit(C, [[0, 0, 0], [230, 60, 0], [230, 0, 0], [0, 60, 0], [0, 0, 50], [230, 0, 50]], 200, 150);
      const P = proj(C), front = facing(C);
      const g = mk("g", {}, svg);
      const A = isoBlock(g, P, front, dx, { x0: 0, y0: 0, x1: 60, y1: 60, h: 40, top: TEX.beach, left: null });
      const Bk = isoBlock(g, P, front, dx, { x0: 170, y0: 0, x1: 230, y1: 60, h: 40 });
      A.draw(0); Bk.draw(0);
      dx.label(from, { anchor: "center" }).at(P(30, 30, 40), 0, -26);
      dx.label(to, { anchor: "center" }).at(P(200, 30, 40), 0, -26);
      const lane = [P(60, 30, 4), P(170, 30, 4)];
      mk("path", { class: "nf dash", d: seg(lane[0], lane[1]) }, g);
      const card = overCard(dx, "fc-card mig", 24, 238, 150, `<span class="hx-lbl static">Traffic on ${to.toLowerCase()}</span><span class="hx-num sm">0%</span><span class="hx-m">regressions on your evals: 0</span>`);
      const num = card.querySelector(".hx-num");
      const dots = Array.from({ length: 10 }, () => mk("circle", { r: 2.4, class: "hx-ink" }, g));
      const red = dx.px(g, 5);
      const share = spring(0.1, { eps: 0.002 });
      let t = 0;
      const B = register(stage, (dt) => {
        t += reduce() ? 0 : dt; stepS(share, dt);
        dots.forEach((d, i) => {
          const goesB = (i / dots.length) < share.x, u = (t * 0.35 + i / dots.length) % 1;
          const a = P(-40, 30, 20), end = goesB ? P(200, 30, 20) : P(30, 30, 20), mid = [(a[0] + end[0]) / 2, Math.min(a[1], end[1]) - 30];
          const x = (1 - u) ** 2 * a[0] + 2 * (1 - u) * u * mid[0] + u * u * end[0], y = (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * mid[1] + u * u * end[1];
          d.setAttribute("cx", x); d.setAttribute("cy", y);
        });
        num.textContent = Math.round(share.x * 100) + "%"; red(P(170, 30, 40));
        return true;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { share.t = clamp((p[0] - 80) / 240, 0, 1); read.textContent = Math.round(share.t * 100) + "% migrated"; B.wake(); },
        leave: () => { share.t = 0.1; read.textContent = "rest"; B.wake(); },
      }));
      bag.add(() => { svg.replaceChildren(); card.remove(); });
      return { destroy: bag.dispose };
    },
  },

  /* P16 · Evidence: the paper trail as a stack; the pointer fans it open to show what is in it. */
  evidence: {
    tour: [[200, 160], [200, 90], [120, 220], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const docs = opts.docs || ["Risk register", "Eval history", "Gateway logs", "Model card"];
      const W = 90, D = 64;
      const C = Cam(45, 0.577, 1.35);
      fit(C, [[0, 0, 0], [W, D, 0], [W, 0, 0], [0, D, 0], [0, 0, 96]], 190, 170);
      const P = proj(C);
      const g = mk("g", {}, svg);
      const sheets = docs.map((n, i) => {
        const sg = mk("g", {}, g);
        const fillEl = mk("polygon", { class: i === docs.length - 1 ? "" : "hx-white" }, sg);
        const tex = i === docs.length - 1 ? dx.skin(sg, TEX.pixel, W, D) : null;
        const out = mk("path", { class: "nf sil" }, sg);
        const lines = mk("path", { class: "nf lo" }, sg);
        const lab = dx.label(n); return { sg, fillEl, tex, out, lines, lab, z: spring(i * 6, { eps: 0.02 }), base: i * 6 };
      });
      const red = dx.px(g, 5);
      const B = register(stage, (dt) => {
        let m = false;
        sheets.forEach((s, i) => {
          m = stepS(s.z, dt) || m; const z = s.z.x;
          const c = [P(0, 0, z), P(W, 0, z), P(W, D, z), P(0, D, z)];
          s.fillEl.setAttribute("points", pts(c)); s.out.setAttribute("d", poly(c));
          if (s.tex) s.tex(c[0], c[1], c[3]);
          s.lines.setAttribute("d", [0.3, 0.5, 0.7].map((v) => seg(P(W * 0.15, D * v, z), P(W * 0.7, D * v, z))).join(""));
          s.lab.at(P(W, D * 0.5, z), 14, 0);
          if (i === sheets.length - 1) red(P(W * 0.85, D * 0.2, z));
        });
        return m;
      });
      bag.add(B.unregister);
      let fanned = false;
      const fan = (on) => { fanned = on; sheets.forEach((s, i) => (s.z.t = on ? i * 26 : s.base)); sheets.forEach((s) => s.lab.on(on)); B.wake(); };
      fan(true);
      bag.add(pointer(stage, {
        move: (p) => { if (!fanned) fan(true); const i = clamp(Math.round((250 - p[1]) / 40), 0, sheets.length - 1); sheets.forEach((s, j) => s.out.classList.toggle("hi", j === i)); read.textContent = docs[i].toLowerCase(); },
        leave: () => { sheets.forEach((s) => s.out.classList.remove("hi")); read.textContent = "rest"; },
      }));
      bag.add(() => svg.replaceChildren());
      return { destroy: bag.dispose };
    },
  },

  /* P17 · Fairness: outcomes across groups on one beam; the pointer tips it, and the threshold shows when it is too far. */
  scale: {
    tour: [[120, 200], [280, 200], [200, 200], null],
    mount({ stage, svg, read, opts = {} }, dx) {
      const bag = disposer();
      const groups = opts.groups || ["Group A", "Group B"];
      const CX = 200, CY = 130, L = 120;
      const g = mk("g", {}, svg);
      mk("path", { class: "nf sil", d: seg([CX, CY], [CX, 262]) + seg([CX - 40, 262], [CX + 40, 262]) }, g);
      mk("path", { class: "nf dash", d: seg([CX - L, CY - 18], [CX + L, CY - 18]) + seg([CX - L, CY + 18], [CX + L, CY + 18]) }, g);
      dx.label("Agreed threshold", { anchor: "center" }).at([CX, CY - 18], 0, -12);
      const beam = mk("path", { class: "nf sil", style: "stroke-width:2" }, g);
      const pans = groups.map((n, i) => {
        const pg = mk("g", {}, g);
        const hang = mk("path", { class: "nf lo" }, pg);
        const pan = mk("path", { style: `fill:${i ? "var(--paper)" : texFill(svg, TEX.pixel, 40, 120, 320, 140)};stroke:var(--solid);stroke-width:1` }, pg);
        const lab = dx.label(n, { anchor: "center" });
        return { hang, pan, lab };
      });
      const red = dx.px(g, 6);
      const tilt = spring(0.06, { eps: 0.0005 });
      const card = overCard(dx, "fc-card", 262, 238, 120, `<span class="hx-lbl static">Disparity</span><span class="hx-num sm">0.0 pts</span>`);
      const num = card.querySelector(".hx-num");
      const B = register(stage, (dt) => {
        const m = stepS(tilt, dt), a = tilt.x;
        const e = [[CX - L * Math.cos(a), CY - L * Math.sin(a)], [CX + L * Math.cos(a), CY + L * Math.sin(a)]];
        beam.setAttribute("d", seg(e[0], e[1]));
        pans.forEach((p, i) => { const [x, y] = e[i]; p.hang.setAttribute("d", seg([x, y], [x - 24, y + 44]) + seg([x, y], [x + 24, y + 44])); p.pan.setAttribute("d", `M${x - 28},${y + 44} Q${x},${y + 66} ${x + 28},${y + 44} Z`); p.lab.at([x, y + 76]); });
        red([CX, CY]);
        const pts_ = Math.abs(a) * 60; num.textContent = pts_.toFixed(1) + " pts"; card.classList.toggle("over", Math.abs(L * Math.sin(a)) > 18);
        return m;
      });
      bag.add(B.unregister);
      bag.add(pointer(stage, {
        move: (p) => { tilt.t = clamp((p[0] - CX) / 600, -0.28, 0.28); read.textContent = Math.abs(L * Math.sin(tilt.t)) > 18 ? "over threshold" : "within threshold"; B.wake(); },
        leave: () => { tilt.t = 0.06; read.textContent = "rest"; B.wake(); },
      }));
      bag.add(() => { svg.replaceChildren(); card.remove(); });
      return { destroy: bag.dispose };
    },
  },
};

/* ---------- mounting ---------- */
export function mountFigure(host, name) {
  const f = FIGS[name];
  if (!f) return null;
  inject(document);
  const stage = document.createElement("div");
  stage.setAttribute("data-hairline", name);
  stage.setAttribute("role", "img");
  stage.setAttribute("aria-label", host.dataset.label || name);
  host.appendChild(stage);
  const svg = mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);
  const read = { textContent: "rest" };
  const dx = devx(stage, svg);
  const opts = host.dataset.opts ? JSON.parse(host.dataset.opts) : {};
  const handle = f.mount({ stage, svg, read, opts }, dx);
  let walk = null;
  return {
    handle,
    play() { if (!walk && !reduce()) walk = tour(stage, f.tour, () => {}); },
    stop() { if (walk) { walk.stop(); walk = null; } },
  };
}
