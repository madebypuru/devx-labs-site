/*
 * devx host for Hairline figures.
 *
 * Hairline draws the geometry and answers the pointer. This layer adds the devx
 * grammar on top: B&W photography and the pixel gradient as skins on a solid's
 * faces, pill labels set in HTML over the drawing, and the one red pixel.
 * Figures receive it as `dx` in mount(). Load after kernel.js, before figures.
 */
(() => {
  const figs = new Map();
  window.hairline = (figure) => figs.set(figure.name, figure);

  // textures live next to this folder, wherever the page that loads it sits
  const base = document.currentScript ? document.currentScript.src : location.href;
  const TEX = {
    photo: new URL("../photo-trees.jpg", base).href,
    beach: new URL("../photo-beach.jpg", base).href,
    pixel: new URL("../pixel-face.jpg", base).href,
  };
  let uid = 0;

  const box = (pts) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    return [x0, y0, x1 - x0, y1 - y0];
  };

  function makeDx(stage, svg) {
    const pins = document.createElement("div");
    pins.className = "hl-pins";
    stage.appendChild(pins);
    const defs = HL.mk("defs", {}, svg);

    return {
      /** A texture laid on one face of a solid, clipped to that face; returns set(points | null). */
      face(solid, kind) {
        const id = "hl-clip-" + ++uid;
        const shape = HL.mk("polygon", {}, HL.mk("clipPath", { id }, defs));
        const img = HL.mk("image", { href: TEX[kind], preserveAspectRatio: "xMidYMid slice", "clip-path": `url(#${id})`, class: "hl-tex hl-" + kind });
        solid.g.insertBefore(img, solid.cr);
        let last = "";
        return (pts) => {
          if (!pts) { img.setAttribute("visibility", "hidden"); last = ""; return; }
          const key = pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
          if (key === last) return;
          last = key;
          img.removeAttribute("visibility");
          shape.setAttribute("points", key);
          const [x, y, w, h] = box(pts);
          img.setAttribute("x", x - 1); img.setAttribute("y", y - 1);
          img.setAttribute("width", w + 2); img.setAttribute("height", h + 2);
        };
      },

      /** A pill label over the drawing, anchored to a viewBox point. */
      pin(text, { dx = 0, dy = -18, tone = "" } = {}) {
        const el = document.createElement("span");
        el.className = "hl-pin " + tone;
        el.textContent = text;
        pins.appendChild(el);
        let ox = dx, oy = dy;
        return {
          at(p, nx, ny) {
            if (nx !== undefined) { ox = nx; oy = ny; }
            el.style.left = (p[0] / 4) + "%";
            el.style.top = (p[1] / 3.2) + "%";
            el.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
          },
          text(t) { if (el.textContent !== t) el.textContent = t; },
          show(on) { el.classList.toggle("off", !on); },
          on(on) { el.classList.toggle("is-on", !!on); },
        };
      },

      /** The red pixel: one small square, wherever the eye should land. */
      pixel(parent) {
        const r = HL.mk("rect", { width: 6, height: 6, class: "hl-px" }, parent || svg);
        return (p) => {
          if (!p) { r.setAttribute("visibility", "hidden"); return; }
          r.removeAttribute("visibility");
          r.setAttribute("x", (p[0] - 3).toFixed(2));
          r.setAttribute("y", (p[1] - 3).toFixed(2));
        };
      },
    };
  }

  /** Mounts a registered figure into `host`. Returns { stage, handle, play, stop }. */
  window.devxMount = (host, name, { intensity = 0.5, onRead } = {}) => {
    const f = figs.get(name);
    if (!f) return null;
    HL.inject(document);
    const stage = document.createElement("div");
    host.appendChild(stage);
    stage.setAttribute("data-hairline", name);
    stage.setAttribute("role", "img");
    stage.setAttribute("aria-label", f.means);
    const svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);

    let text = null;
    const read = {
      get textContent() { return text; },
      set textContent(v) { text = v == null ? "" : String(v); if (onRead) onRead(text); },
    };
    const [lo, mid, hi] = f.range;
    const value = intensity <= 0.5 ? lo + (intensity / 0.5) * (mid - lo) : mid + ((intensity - 0.5) / 0.5) * (hi - mid);
    const handle = f.mount({ stage, svg, read, dx: makeDx(stage, svg) }, value);
    if (text === null) read.textContent = "rest";

    let tour = null;
    return {
      stage, handle, means: f.means,
      play() { if (!tour) tour = HL.tour(stage, f.tour || HL.LAP); },
      stop() { if (tour) { tour.stop(); tour = null; } },
    };
  };
})();
