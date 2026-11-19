/* RecipeFlow — disegni vettoriali generati in SVG: illustrazioni dei passaggi, icone. */
'use strict';
(function () {
  const RF = window.RF;
  // colori come interi ARGB (come nella versione Android)
  const G = {
    rgb: hex => 0xFF000000 + hex,
    argb: (a, r, g, b) => a * 16777216 + r * 65536 + g * 256 + b,
    parts: c => [Math.floor(c / 16777216) % 256, Math.floor(c / 65536) % 256, Math.floor(c / 256) % 256, c % 256],
    mix(a, b, t) { const x = G.parts(a), y = G.parts(b); return G.argb(...x.map((v, i) => Math.round(v + (y[i] - v) * t))); },
    alpha: (c, a) => a * 16777216 + c % 16777216,
    css(c) { if (typeof c === 'string') return c; const [a, r, g, b] = G.parts(c); return a === 255 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`; }
  };
  const f2 = v => Math.round(v * 100) / 100;

  class P {
    constructor() { this.d = ''; }
    moveTo(x, y) { this.d += `M${f2(x)} ${f2(y)}`; }
    lineTo(x, y) { this.d += `L${f2(x)} ${f2(y)}`; }
    cubicTo(a, b, c, d, e, f) { this.d += `C${f2(a)} ${f2(b)} ${f2(c)} ${f2(d)} ${f2(e)} ${f2(f)}`; }
    quadTo(a, b, c, d) { this.d += `Q${f2(a)} ${f2(b)} ${f2(c)} ${f2(d)}`; }
    close() { this.d += 'Z'; }
  }

  class Rnd { // generatore pseudo-casuale con seme, per disegni sempre uguali
    constructor(seed) { this.s = seed * 9301 + 49297; }
    nextInt(n) { this.s = (this.s * 9301 + 49297) % 233280; return Math.floor(this.s / 233280 * n); }
  }

  let gid = 0;
  /** "Pennello" che scrive SVG con primitive simili a Java2D. */
  class Pen {
    constructor() { this.out = []; this.defs = []; this.fillC = '#000'; this.strokeC = '#000'; this.sw = 2; }
    color(c) { this.fillC = this.strokeC = G.css(c); }
    stroke(w) { this.sw = w; }
    linear(x0, y0, c0, x1, y1, c1) {
      const id = 'g' + (++gid);
      this.defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"><stop offset="0" stop-color="${G.css(c0)}"/><stop offset="1" stop-color="${G.css(c1)}"/></linearGradient>`);
      this.fillC = `url(#${id})`;
    }
    radial(cx, cy, r, c0, c1) {
      const id = 'g' + (++gid);
      this.defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${G.css(c0)}"/><stop offset="1" stop-color="${G.css(c1)}"/></radialGradient>`);
      this.fillC = `url(#${id})`;
    }
    get F() { return `fill="${this.fillC}"`; }
    get S() { return `fill="none" stroke="${this.strokeC}" stroke-width="${this.sw}" stroke-linecap="round" stroke-linejoin="round"`; }
    fillOval(x, y, w, h) { this.out.push(`<ellipse cx="${f2(x + w / 2)}" cy="${f2(y + h / 2)}" rx="${f2(w / 2)}" ry="${f2(h / 2)}" ${this.F}/>`); }
    drawOval(x, y, w, h) { this.out.push(`<ellipse cx="${f2(x + w / 2)}" cy="${f2(y + h / 2)}" rx="${f2(w / 2)}" ry="${f2(h / 2)}" ${this.S}/>`); }
    fillRect(x, y, w, h) { this.out.push(`<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" ${this.F}/>`); }
    fillRR(x, y, w, h, aw, ah) { this.out.push(`<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" rx="${f2(aw / 2)}" ry="${f2(ah / 2)}" ${this.F}/>`); }
    drawRR(x, y, w, h, aw, ah) { this.out.push(`<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" rx="${f2(aw / 2)}" ry="${f2(ah / 2)}" ${this.S}/>`); }
    line(x1, y1, x2, y2) { this.out.push(`<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" ${this.S}/>`); }
    /** Arco con gli angoli di Java2D (gradi, antiorario da ore 3). */
    arc(x, y, w, h, start, extent) {
      const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
      const pt = a => [cx + rx * Math.cos(a * Math.PI / 180), cy - ry * Math.sin(a * Math.PI / 180)];
      let d = '', a0 = start, rest = extent;
      const [sx, sy] = pt(a0);
      d += `M${f2(sx)} ${f2(sy)}`;
      while (Math.abs(rest) > 0.01) {
        const step = Math.sign(rest) * Math.min(Math.abs(rest), 179);
        const [ex, ey] = pt(a0 + step);
        d += `A${f2(rx)} ${f2(ry)} 0 0 ${step > 0 ? 0 : 1} ${f2(ex)} ${f2(ey)}`;
        a0 += step; rest -= step;
      }
      this.out.push(`<path d="${d}" ${this.S}/>`);
    }
    fill(p) { this.out.push(`<path d="${p.d}" ${this.F}/>`); }
    draw(p) { this.out.push(`<path d="${p.d}" ${this.S}/>`); }
    rotate(deg, px, py) { this.out.push(`<g transform="rotate(${deg} ${px} ${py})">`); }
    restore() { this.out.push('</g>'); }
    text(s, x, y, size, color, bold) { this.out.push(`<text x="${x}" y="${y}" font-size="${size}" font-family="-apple-system,system-ui,sans-serif" font-weight="${bold ? 800 : 400}" fill="${G.css(color)}">${s}</text>`); }
    svg(viewBox, extra = '') { return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" ${extra}>${this.defs.length ? '<defs>' + this.defs.join('') + '</defs>' : ''}${this.out.join('')}</svg>`; }
  }

  const METAL = G.rgb(0xC3CCD6), METAL_D = G.rgb(0x7D8896), DARK = G.rgb(0x2B313B), DOUGH = G.rgb(0xF3DBA8),
    DOUGH_D = G.rgb(0xE2BF7E), WOOD = G.rgb(0xB98352), WOOD_D = G.rgb(0x8C5A33), FLAME = G.rgb(0xFF7A2F), FLAME2 = G.rgb(0xFFC23D),
    WATER = G.rgb(0x6CB8FF), CREAM = G.rgb(0xFBF6EC), RED = G.rgb(0xE0452E), LEAF = G.rgb(0x5DAA48), CARROT = G.rgb(0xF08A24),
    GLOW = G.rgb(0xFFB347);
  let accent = G.rgb(0x2ED47A);

    function flame(g, cx, by, size) {
        for (let i = -1; i <= 1; i++) {
            let fx = cx + i * size * 0.9;
            let p = new P();
            p.moveTo(fx, by);
            p.cubicTo(fx - size * 0.55, by - size * 0.2, fx - size * 0.2, by - size * 0.9, fx, by - size * 1.3);
            p.cubicTo(fx + size * 0.2, by - size * 0.9, fx + size * 0.55, by - size * 0.2, fx, by);
            g.color(FLAME); g.fill(p);
            g.color(FLAME2);
            g.fillOval(fx - size * 0.18, by - size * 0.55, size * 0.36, size * 0.5);
        }
    }

    function bowl(g, cx, top, w, c) {
        let b = new P();
        b.moveTo(cx - w / 2, top);
        b.lineTo(cx + w / 2, top);
        b.cubicTo(cx + w / 2, top + w * 0.55, cx - w / 2, top + w * 0.55, cx - w / 2, top);
        g.color(c); g.fill(b);
        g.color(G.argb(70, 255, 255, 255));
        g.fillRR(cx - w / 2 + 6, top + 4, w * 0.18, 4, 4, 4);
        g.color(G.mix(c, 0xFF000000, 0.25));
        g.fillOval(cx - w / 2, top - 4, w, 8);
    }

    function steam(g, x, y) {
        g.color(G.argb(120, 255, 255, 255));
        g.stroke(2.5);
        for (let i = 0; i < 3; i++) {
            let sx = x + i * 12;
            let p = new P();
            p.moveTo(sx, y);
            p.cubicTo(sx - 5, y - 6, sx + 5, y - 12, sx, y - 18);
            g.draw(p);
        }
    }

    // ---------------- scene ----------------
    function oven(g, text) {
        g.color(DARK); g.fillRR(32, 14, 96, 80, 12, 12);
        g.color(METAL_D); g.fillRR(36, 18, 88, 14, 6, 6);
        for (let i = 0; i < 3; i++) { g.color(METAL); g.fillOval(44 + i * 14, 21, 8, 8); }
        let t = RF.temperature(text);
        g.color(G.rgb(0x101317)); g.fillRR(92, 20, 28, 10, 4, 4);
        g.text(t, 95, 28.5, 8, G.rgb(0x7CFF9A), true);
        g.radial(80, 62, 44, GLOW, G.rgb(0x8A3B12));
        g.fillRR(42, 38, 76, 48, 8, 8);
        // teglia con il cibo
        g.color(METAL); g.fillRR(50, 70, 60, 5, 3, 3);
        g.color(DOUGH_D); g.fillOval(56, 62, 48, 11);
        g.color(RED); g.fillOval(62, 63, 36, 7);
        g.color(G.argb(160, 255, 230, 160)); g.stroke(2);
        for (let i = 0; i < 3; i++) g.arc(56 + i * 16, 44, 14, 10, 0, 180);
        g.color(METAL); g.fillRR(54, 34, 52, 4, 4, 4);
    }

    function fridge(g) {
        g.color(G.rgb(0xE9EEF3)); g.fillRR(52, 8, 56, 88, 12, 12);
        g.color(G.rgb(0xC7D0DA)); g.fillRect(52, 38, 56, 2);
        g.color(METAL_D); g.stroke(3);
        g.line(100, 18, 100, 30); g.line(100, 48, 100, 70);
        // fiocco di neve
        g.color(WATER); g.stroke(2.4);
        let cx = 124, cy = 26;
        for (let i = 0; i < 3; i++) {
            let a = Math.PI / 3 * i;
            g.line(cx - Math.cos(a) * 11, cy - Math.sin(a) * 11, cx + Math.cos(a) * 11, cy + Math.sin(a) * 11);
        }
        // ciotola coperta che entra
        bowl(g, 36, 70, 34, G.mix(WATER, 0xFF000000, 0.3));
        g.color(G.argb(140, 255, 255, 255)); g.fillOval(19, 64, 34, 8);
    }

    function fry(g) {
        flame(g, 80, 98, 9);
        g.color(DARK); g.fillRR(36, 66, 88, 20, 10, 10);
        g.fillRR(118, 70, 36, 7, 7, 7);
        g.color(G.rgb(0xF5C542)); g.fillOval(40, 62, 80, 10);
        g.color(CARROT);
        for (let i = 0; i < 4; i++) g.fillRR(50 + i * 16, 58, 12, 8, 6, 6);
        g.color(G.argb(180, 255, 255, 255));
        let r = new Rnd(3);
        for (let i = 0; i < 9; i++) { let bx = 44 + r.nextInt(70), by = 46 + r.nextInt(14), d = 3 + r.nextInt(4); g.fillOval(bx, by, d, d); }
    }

    function rise(g) {
        bowl(g, 70, 56, 76, G.rgb(0xD8E2EC));
        // impasto che cresce oltre il bordo
        g.color(DOUGH);
        g.fillOval(38, 28, 64, 36);
        g.color(G.argb(90, 255, 255, 255));
        g.fillOval(50, 34, 18, 8);
        bowl(g, 70, 56, 76, G.rgb(0xD8E2EC));
        g.color(DOUGH); g.fillRect(34, 52, 72, 6);
        // frecce in su
        g.color(G.rgb(0x2ECC71)); g.stroke(3);
        g.line(116, 64, 116, 34); g.line(116, 34, 109, 42); g.line(116, 34, 123, 42);
        // orologio
        g.color(0xFFFFFFFF); g.fillOval(118, 70, 26, 26);
        g.color(DARK); g.stroke(2.2); g.drawOval(118, 70, 26, 26);
        g.line(131, 83, 131, 75); g.line(131, 83, 137, 86);
    }

    function roll(g) {
        g.color(WOOD); g.fillRR(14, 66, 132, 28, 10, 10);
        g.color(DOUGH); g.fillOval(30, 62, 100, 26);
        g.color(DOUGH_D); g.fillOval(34, 70, 92, 12);
        g.color(DOUGH); g.fillOval(38, 66, 84, 14);
        // mattarello
        g.color(WOOD_D);
        g.fillRR(20, 46, 14, 8, 6, 6); g.fillRR(126, 46, 14, 8, 6, 6);
        g.linear(0, 40, G.rgb(0xE0B07A), 0, 60, WOOD);
        g.fillRR(32, 40, 96, 20, 20, 20);
        g.color(G.argb(120, 255, 255, 255)); g.stroke(2);
        g.line(70, 30, 92, 30); g.line(92, 30, 86, 26); g.line(92, 30, 86, 34);
        g.line(90, 30, 68, 30); g.line(68, 30, 74, 26); g.line(68, 30, 74, 34);
    }

    function knead(g) {
        g.color(WOOD); g.fillRR(14, 70, 132, 24, 10, 10);
        // farina sparsa
        g.color(G.argb(150, 255, 255, 255));
        let r = new Rnd(7);
        for (let i = 0; i < 18; i++) g.fillOval(24 + r.nextInt(110), 74 + r.nextInt(14), 2.5, 2.5);
        g.color(DOUGH); g.fillOval(40, 40, 80, 42);
        g.color(DOUGH_D); g.stroke(2.4);
        g.arc(54, 48, 50, 26, 200, 220);
        // mani stilizzate
        for (let side = 0; side < 2; side++) {
            let hx = side == 0 ? 36 : 96;
            g.color(G.rgb(0xF0B48A));
            g.fillRR(hx, 30, 30, 22, 14, 14);
            for (let f = 0; f < 4; f++) g.fillRR(hx + 2 + f * 7, 46, 6, 12, 6, 6);
            g.color(G.rgb(0xD9966A));
            g.fillRR(hx + 4, 14, 22, 20, 8, 8);
        }
        g.color(G.argb(120, 255, 255, 255)); g.stroke(2);
        g.arc(66, 14, 28, 16, 20, 140);
    }

    function whisk(g) {
        bowl(g, 74, 58, 84, G.rgb(0xD8E2EC));
        g.color(CREAM); g.fillOval(36, 50, 76, 14);
        g.color(G.argb(200, 255, 255, 255));
        g.fillOval(52, 44, 22, 12); g.fillOval(70, 42, 26, 14);
        // frusta inclinata
        g.rotate(-28, 96, 36);
        g.color(DARK); g.fillRR(92, 2, 8, 26, 6, 6);
        g.color(METAL_D); g.stroke(2);
        for (let i = 0; i < 3; i++) g.drawOval(88 + i * 3, 26, 16 - i * 6, 32);
        g.restore();
        g.color(G.alpha(accent, 200)); g.stroke(2.5);
        g.arc(110, 30, 30, 22, -60, 160);
        g.arc(116, 24, 30, 30, -50, 140);
    }

    function blend(g) {
        g.color(DARK); g.fillRR(54, 74, 52, 22, 8, 8);
        g.color(G.rgb(0x7CFF9A)); g.fillOval(76, 81, 8, 8);
        let jar = new P();
        jar.moveTo(56, 12); jar.lineTo(104, 12); jar.lineTo(98, 74); jar.lineTo(62, 74); jar.close();
        g.color(G.argb(120, 220, 235, 250)); g.fill(jar);
        let liquid = new P();
        liquid.moveTo(59, 38); liquid.lineTo(101, 38); liquid.lineTo(98, 74); liquid.lineTo(62, 74); liquid.close();
        g.color(G.rgb(0xF28CB0)); g.fill(liquid);
        g.color(G.argb(130, 255, 255, 255)); g.stroke(2);
        g.arc(66, 46, 28, 18, 20, 300);
        g.color(METAL_D); g.fillRR(52, 8, 56, 7, 4, 4);
        g.stroke(2.4); g.color(G.argb(160, 255, 255, 255));
        g.line(56, 12, 62, 74);
    }

    function chop(g) {
        g.color(WOOD); g.fillRR(14, 58, 132, 34, 10, 10);
        g.color(WOOD_D); g.fillOval(130, 64, 8, 8);
        // verdure tagliate
        g.color(CARROT);
        for (let i = 0; i < 5; i++) g.fillOval(22 + i * 11, 66, 9, 9);
        g.color(LEAF);
        for (let i = 0; i < 4; i++) g.fillRR(28 + i * 12, 78, 9, 7, 3, 3);
        g.color(CARROT); g.fillRR(84, 68, 40, 12, 10, 10);
        // coltello
        let blade = new P();
        blade.moveTo(70, 22); blade.lineTo(118, 30); blade.cubicTo(118, 44, 104, 50, 74, 48); blade.close();
        g.color(METAL); g.fill(blade);
        g.color(G.argb(120, 255, 255, 255)); g.fillRect(78, 26, 30, 3);
        g.color(DARK); g.fillRR(40, 22, 32, 12, 8, 8);
        g.color(G.argb(110, 255, 255, 255)); g.stroke(2);
        g.line(90, 54, 92, 60); g.line(100, 53, 103, 59);
    }

    function pot(g) {
        flame(g, 80, 100, 9);
        g.color(METAL_D); g.fillRR(30, 40, 10, 6, 4, 4); g.fillRR(120, 40, 10, 6, 4, 4);
        g.linear(38, 0, METAL, 122, 0, METAL_D);
        g.fillRR(38, 34, 84, 54, 10, 10);
        g.color(WATER); g.fillOval(40, 30, 80, 12);
        g.color(G.argb(180, 255, 255, 255));
        g.fillOval(54, 32, 6, 5); g.fillOval(78, 31, 5, 5); g.fillOval(98, 33, 6, 5);
        g.color(G.rgb(0xE9C46A)); g.stroke(2.4);
        for (let i = 0; i < 4; i++) g.line(60 + i * 8, 24, 66 + i * 8, 38);
        steam(g, 60, 22);
    }

    function pan(g) {
        flame(g, 72, 100, 9);
        g.color(DARK);
        g.fillRR(26, 66, 92, 18, 12, 12);
        g.fillRR(112, 68, 42, 8, 8, 8);
        g.color(G.rgb(0x3A414D)); g.fillOval(28, 60, 88, 14);
        // cibo
        g.color(G.rgb(0xE3A87A)); g.fillRR(40, 56, 26, 12, 10, 10);
        g.color(LEAF); g.fillOval(70, 58, 10, 8); g.fillOval(86, 60, 9, 7);
        g.color(RED); g.fillOval(78, 54, 10, 10);
        g.color(CARROT); g.fillOval(96, 56, 9, 9);
        steam(g, 52, 44);
        // spatola
        g.color(WOOD_D); g.stroke(4); g.line(100, 20, 86, 52);
        g.color(WOOD); g.fillRR(80, 48, 14, 10, 6, 6);
    }

    function pour(g) {
        bowl(g, 64, 62, 80, G.rgb(0xD8E2EC));
        g.color(CREAM); g.fillOval(28, 56, 72, 12);
        // brocca inclinata
        g.rotate(-35, 112, 26);
        g.color(G.argb(200, 220, 235, 250));
        g.fillRR(96, 8, 34, 40, 10, 10);
        g.color(WATER); g.fillRR(98, 22, 30, 24, 8, 8);
        g.color(METAL_D); g.stroke(3); g.arc(124, 16, 14, 22, -90, 180);
        g.restore();
        // getto
        g.color(WATER); g.stroke(4);
        let st = new P(); st.moveTo(92, 30); st.cubicTo(84, 38, 80, 48, 78, 58); g.draw(st);
        g.color(G.argb(160, 255, 255, 255));
        g.fillOval(70, 56, 14, 5);
    }

    function plate(g) {
        g.color(G.rgb(0xE6E0D6)); g.fillOval(30, 22, 100, 72);
        g.color(0xFFFFFFFF); g.fillOval(40, 29, 80, 58);
        g.color(G.rgb(0xE9C46A)); g.fillOval(52, 40, 56, 36);
        g.color(RED); g.fillOval(60, 46, 14, 12); g.fillOval(84, 54, 12, 10);
        g.color(LEAF); g.fillOval(74, 44, 12, 6); g.fillOval(68, 60, 12, 6);
        // posate
        g.color(METAL_D);
        g.fillRR(18, 30, 5, 58, 4, 4);
        for (let i = 0; i < 3; i++) g.fillRR(14 + i * 5, 22, 3, 14, 3, 3);
        g.fillRR(138, 22, 6, 66, 4, 4);
        // stelline
        g.color(G.alpha(accent, 220));
        for (const p of [[120, 18], [40, 16], [132, 92]]) {
            let st = new P();
            st.moveTo(p[0], p[1] - 6); st.quadTo(p[0], p[1], p[0] + 6, p[1]); st.quadTo(p[0], p[1], p[0], p[1] + 6);
            st.quadTo(p[0], p[1], p[0] - 6, p[1]); st.quadTo(p[0], p[1], p[0], p[1] - 6);
            g.fill(st);
        }
    }

    function mix(g) {
        bowl(g, 76, 56, 90, G.rgb(0xD8E2EC));
        g.color(G.rgb(0xF2D29B)); g.fillOval(36, 48, 80, 14);
        g.color(G.rgb(0xD9A95E)); g.stroke(2.4);
        g.arc(56, 50, 40, 10, 10, 300);
        // cucchiaio di legno
        g.color(WOOD); g.stroke(5);
        g.line(112, 12, 84, 50);
        g.fillOval(76, 46, 16, 10);
        // ingredienti che cadono
        g.color(LEAF); g.fillOval(40, 24, 8, 8);
        g.color(RED); g.fillOval(56, 14, 9, 9);
        g.color(G.rgb(0xF6C445)); g.fillOval(46, 34, 7, 7);
    }


  const SCENES = { oven, fridge, fry, rise, roll, knead, whisk, blend, chop, pot, pan, pour, plate, mix };

  /** SVG dell'illustrazione di un passaggio (scena 160 × 110). */
  function stepSvg(text, dark) {
    const g = new Pen();
    g.color(G.argb(dark ? 50 : 22, 0, 0, 0));
    g.fillOval(30, 92, 100, 10);
    const k = RF.classify(text);
    if (k === 'oven') oven(g, text); else SCENES[k](g);
    return g.svg('0 0 160 110', 'preserveAspectRatio="xMidYMid meet"');
  }

  const iconCache = {};
  /** Icona 24 × 24 nel colore del testo (currentColor). */
  function icon(name) {
    if (iconCache[name]) return iconCache[name];
    const g = new Pen();
    g.color('currentColor');
    g.stroke(2.1);
        if (name === "search") { g.drawOval(3, 3, 14, 14); g.line(15, 15, 21, 21);
    } else if (name === "heart" || name === "heartFill") { 
            let p = new P();
            p.moveTo(12, 20.5);
            p.cubicTo(4, 15, 2, 11, 2, 8);
            p.cubicTo(2, 4.5, 5, 3, 7.5, 3);
            p.cubicTo(9.5, 3, 11, 4.2, 12, 6);
            p.cubicTo(13, 4.2, 14.5, 3, 16.5, 3);
            p.cubicTo(19, 3, 22, 4.5, 22, 8);
            p.cubicTo(22, 11, 20, 15, 12, 20.5);
            p.close();
            if (name === "heartFill") g.fill(p); else g.draw(p);
    } else if (name === "cart") { 
            let p = new P();
            p.moveTo(2, 3); p.lineTo(5, 3); p.lineTo(7.5, 15); p.lineTo(19, 15); p.lineTo(21, 7); p.lineTo(6, 7);
            g.draw(p);
            g.fillOval(7, 18, 3.4, 3.4); g.fillOval(16, 18, 3.4, 3.4);
    } else if (name === "magic") { 
            g.line(4, 20, 15, 9);
            star(g, 17.5, 6.5, 4.5);
            star(g, 7, 6, 2.6);
            star(g, 19.5, 16.5, 2.4);
    } else if (name === "gear") { 
            g.drawOval(8.5, 8.5, 7, 7);
            for (let i = 0; i < 8; i++) {
                let a = Math.PI * 2 * i / 8;
                g.line(12 + Math.cos(a) * 7, 12 + Math.sin(a) * 7, 12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10);
            }
            g.drawOval(5, 5, 14, 14);
    } else if (name === "clock") { g.drawOval(3, 3, 18, 18); g.line(12, 7, 12, 12); g.line(12, 12, 15.5, 14);
    } else if (name === "users") { 
            g.drawOval(5.5, 3, 7, 7);
            g.arc(2, 12, 14, 14, 0, 180);
            g.arc(14, 4, 6, 6, -80, 250);
            g.arc(14, 13, 9, 11, 0, 120);
    } else if (name === "flame") { 
            let p = new P();
            p.moveTo(12, 2);
            p.cubicTo(13, 7, 19, 9, 19, 15);
            p.cubicTo(19, 19, 16, 22, 12, 22);
            p.cubicTo(8, 22, 5, 19, 5, 15);
            p.cubicTo(5, 11, 8, 10, 8.5, 6.5);
            p.cubicTo(10, 8, 10.5, 9, 10.5, 10.5);
            p.cubicTo(12.5, 8.5, 12.5, 5, 12, 2);
            p.close();
            g.fill(p);
    } else if (name === "play") { 
            let p = new P();
            p.moveTo(7, 4); p.lineTo(20, 12); p.lineTo(7, 20); p.close();
            g.fill(p);
    } else if (name === "plus") { g.line(12, 5, 12, 19); g.line(5, 12, 19, 12);
    } else if (name === "minus") { g.line(5, 12, 19, 12);
    } else if (name === "back") { g.line(19, 12, 5, 12); g.line(11, 6, 5, 12); g.line(11, 18, 5, 12);
    } else if (name === "check") { let p = new P(); p.moveTo(5, 12.5); p.lineTo(10, 17.5); p.lineTo(19.5, 7); g.draw(p);
    } else if (name === "leaf") { 
            let p = new P();
            p.moveTo(4, 20); p.cubicTo(4, 9, 10, 4, 21, 3); p.cubicTo(20, 14, 15, 20, 4, 20); p.close();
            g.draw(p); g.line(4, 20, 14, 10);
    } else if (name === "bolt") { 
            let p = new P();
            p.moveTo(13, 2); p.lineTo(4, 14); p.lineTo(11, 14); p.lineTo(10, 22); p.lineTo(20, 9); p.lineTo(13, 9); p.close();
            g.fill(p);
    } else if (name === "timer") { 
            g.drawOval(4, 5, 16, 16); g.line(12, 13, 12, 9);
            g.line(9.5, 2.5, 14.5, 2.5);
    } else if (name === "calendar") { 
            g.drawRR(3, 5, 18, 16, 4, 4); g.line(3, 10, 21, 10);
            g.line(8, 2.5, 8, 7); g.line(16, 2.5, 16, 7);
            g.fillRect(7, 13, 3, 3); g.fillRect(14, 13, 3, 3);
    } else if (name === "fridge") { 
            g.drawRR(6, 2.5, 12, 19, 3, 3); g.line(6, 9, 18, 9);
            g.line(9, 5, 9, 7); g.line(9, 12, 9, 15);
    } else if (name === "book") { 
            let p = new P();
            p.moveTo(12, 6); p.cubicTo(9, 4, 5, 4, 3, 5); p.lineTo(3, 19); p.cubicTo(5, 18, 9, 18, 12, 20);
            p.cubicTo(15, 18, 19, 18, 21, 19); p.lineTo(21, 5); p.cubicTo(19, 4, 15, 4, 12, 6); p.close();
            g.draw(p); g.line(12, 6, 12, 20);
    } else if (name === "edit") { 
            let p = new P(); p.moveTo(4, 20); p.lineTo(5, 15); p.lineTo(16, 4); p.lineTo(20, 8); p.lineTo(9, 19); p.close();
            g.draw(p); g.line(14, 6, 18, 10);
    } else if (name === "star" || name === "starFill") { 
            let p = new P();
            for (let i = 0; i < 10; i++) {
                let a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 == 0 ? 10 : 4.3;
                let px = 12 + Math.cos(a) * rr, py = 12.5 + Math.sin(a) * rr;
                if (i == 0) p.moveTo(px, py); else p.lineTo(px, py);
            }
            p.close();
            if (name === "starFill") g.fill(p); else g.draw(p);
    } else if (name === "camera") { 
            g.drawRR(3, 7, 18, 13, 4, 4); g.drawOval(8.5, 9.5, 7, 7);
            g.line(9, 7, 10.5, 4.5); g.line(10.5, 4.5, 13.5, 4.5); g.line(13.5, 4.5, 15, 7);
    } else if (name === "trash") { 
            g.line(4, 6, 20, 6); g.line(9, 6, 9.5, 3.5); g.line(9.5, 3.5, 14.5, 3.5); g.line(14.5, 3.5, 15, 6);
            let p = new P(); p.moveTo(6, 6); p.lineTo(7, 20.5); p.lineTo(17, 20.5); p.lineTo(18, 6); g.draw(p);
    } else if (name === "chef") { 
            let hat = new P(); hat.moveTo(7, 17); hat.lineTo(7, 12.6); hat.cubicTo(4.6, 12.3, 3, 10.6, 3, 9); hat.cubicTo(3, 6.8, 4.8, 5, 7, 5); hat.cubicTo(7.6, 3.5, 9.6, 2.5, 12, 2.5); hat.cubicTo(14.4, 2.5, 16.4, 3.5, 17, 5); hat.cubicTo(19.2, 5, 21, 6.8, 21, 9); hat.cubicTo(21, 10.6, 19.4, 12.3, 17, 12.6); hat.lineTo(17, 17); hat.close(); g.draw(hat); g.drawRR(6.5, 17, 11, 4, 2, 2);
    } else if (name === "up") { g.line(12, 19, 12, 5); g.line(6, 11, 12, 5); g.line(18, 11, 12, 5);
    } else if (name === "down") { g.line(12, 5, 12, 19); g.line(6, 13, 12, 19); g.line(18, 13, 12, 19);
    } else if (name === "next") { g.line(9, 5, 16, 12); g.line(16, 12, 9, 19);
    } else if (name === "prev") { g.line(15, 5, 8, 12); g.line(8, 12, 15, 19);
    } else if (name === "close") { g.line(6, 6, 18, 18); g.line(18, 6, 6, 18);
    } else if (name === "compass") {
            g.drawOval(3, 3, 18, 18);
            let p = new P(); p.moveTo(15.5, 8.5); p.lineTo(13.5, 13.5); p.lineTo(8.5, 15.5); p.lineTo(10.5, 10.5); p.close(); g.fill(p);
    } else if (name === "dots") { g.fillOval(3.5, 10.5, 3.4, 3.4); g.fillOval(10.3, 10.5, 3.4, 3.4); g.fillOval(17.1, 10.5, 3.4, 3.4);
    } else if (name === "share") {
            g.line(12, 3, 12, 15); g.line(7.5, 7.5, 12, 3); g.line(16.5, 7.5, 12, 3);
            let p = new P(); p.moveTo(8, 11); p.lineTo(5, 11); p.lineTo(5, 21); p.lineTo(19, 21); p.lineTo(19, 11); p.lineTo(16, 11); g.draw(p);
    } else if (name === "speaker") {
            let p = new P(); p.moveTo(3, 9); p.lineTo(7, 9); p.lineTo(12, 4.5); p.lineTo(12, 19.5); p.lineTo(7, 15); p.lineTo(3, 15); p.close(); g.fill(p);
            g.arc(11, 8, 6, 8, -60, 120); g.arc(11, 4.5, 10, 15, -60, 120);
    } else if (name === "globe") {
            g.drawOval(3, 3, 18, 18); g.drawOval(8, 3, 8, 18); g.line(3, 12, 21, 12); g.line(5, 7.5, 19, 7.5); g.line(5, 16.5, 19, 16.5);
    } else if (name === "list") {
            g.line(9, 6, 20, 6); g.line(9, 12, 20, 12); g.line(9, 18, 20, 18);
            g.fillOval(3.5, 4.6, 2.8, 2.8); g.fillOval(3.5, 10.6, 2.8, 2.8); g.fillOval(3.5, 16.6, 2.8, 2.8);
    } else if (name === "photo") {
            g.drawRR(3, 4, 18, 16, 4, 4); g.fillOval(14, 7, 4, 4);
            let p = new P(); p.moveTo(3.5, 18); p.lineTo(9, 11.5); p.lineTo(13.5, 16); p.lineTo(16, 13.5); p.lineTo(20.5, 18); g.draw(p);
    } else if (name === "refresh") {
            g.arc(4, 4, 16, 16, 40, 290);
            let p = new P(); p.moveTo(18.5, 2.5); p.lineTo(18.5, 8); p.lineTo(13, 8); g.draw(p);
    } else if (name === "copy") {
            g.drawRR(8, 8, 13, 13, 4, 4);
            let p = new P(); p.moveTo(5, 16); p.lineTo(3, 16); p.lineTo(3, 3); p.lineTo(16, 3); p.lineTo(16, 5); g.draw(p);
    } else if (name === "pause") { g.fillRR(6, 4, 4, 16, 2, 2); g.fillRR(14, 4, 4, 16, 2, 2);
    } else if (name === "scale") {
            g.line(12, 4, 12, 20); g.line(5, 7, 19, 7); g.line(8, 20, 16, 20);
            g.arc(2, 9, 7, 6, 180, 180); g.arc(15, 9, 7, 6, 180, 180);
            g.line(5.5, 7, 2, 12); g.line(5.5, 7, 9, 12); g.line(18.5, 7, 15, 12); g.line(18.5, 7, 22, 12);
    } else { g.drawOval(4, 4, 16, 16);
    }

    return (iconCache[name] = g.svg('0 0 24 24', 'class="ic" aria-hidden="true"'));
  }

    function star(g, cx, cy, r) {
        let p = new P();
        p.moveTo(cx, cy - r);
        p.quadTo(cx, cy, cx + r, cy);
        p.quadTo(cx, cy, cx, cy + r);
        p.quadTo(cx, cy, cx - r, cy);
        p.quadTo(cx, cy, cx, cy - r);
        g.fill(p);
    }



  function setAccent(hex) { accent = G.rgb(hex); }

  Object.assign(RF, { stepSvg, icon, setAccent });
})();
