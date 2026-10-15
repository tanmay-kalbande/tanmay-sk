import { useEffect, useRef } from "react";
import "../styles/gameOverlay.css";

/**
 * Pixel-game layer that plays ON TOP of the existing landing page.
 * It reads the live position of your real elements (.lv5-*) and uses them as
 * platforms, so nothing in the page is duplicated or replaced.
 */
type Props = { onClose: () => void };

const SEL =
  ".lv5-nav__brand,.lv5-nav__link,.lv5-nav__cta,.lv5-nav__theme,.lv5-name__first,.lv5-name__last," +
  ".lv5-identity,.lv5-tagline,.lv5-btn,.lv5-stat,.lv5-social";
const TXT = /lv5-name__|lv5-tagline|lv5-identity/;

const BODY = ["...oooooo...","..oooooooo..","..oooooooo..","..ffffffff..","..ffeffeff..","..ffffffff..","..oooooooo..",".hhhhhhhhhh.","fhhhhhhhhhhf",".hhhhhhhhhh.","..hhhhhhhh..","..pppppppp.."];
const LEG: Record<string, string[]> = { i:["..pp....pp..","..ss....ss.."], a:["...pp..pp...","...ss..ss..."], b:["..pp....pp..",".ss.....ss.."], j:["...pp..pp...","..ss....ss.."] };
const BUG = ["..k....k..","...kkkk...","..gggggg..",".gwegwegg.","..gggggg.."];
const BL = [".k.k..k.k.","k.k....k.k"];
const BUG_LABELS = ["NaN","NULL","DUP","ERR"];

export default function GameOverlay({ onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const root = rootRef.current!;
    const shell = (document.querySelector(".lv5-shell") || document.documentElement) as HTMLElement;
    const E: Record<string, any> = {};
    root.querySelectorAll("[data-id]").forEach((n) => (E[n.getAttribute("data-id")!] = n));
    (document.activeElement as HTMLElement | null)?.blur?.();

    const cv = E.cv as HTMLCanvasElement, cx = cv.getContext("2d")!;
    const ch = E.ch as HTMLCanvasElement, hx = ch.getContext("2d")!;
    let W = 0, H = 0, raf = 0, fr = 0, ac: AudioContext | undefined, tt: any, rzT: any, winT: any, depT: any;
    let ACC = "#e8542a", INK = "#f0ede8";
    const C: any = { o: ACC, f: "#f0ede8", e: "#111", h: "#6d6d78", p: "#34343b", s: "#f0ede8", g: "#2f9e44", k: "#145a24", w: "#fff" };
    const OUT: any = new Proxy({}, { get: () => "#0b0b0d" });
    const readTheme = () => { const cs = getComputedStyle(shell); ACC = cs.getPropertyValue("--accent").trim() || ACC; INK = cs.getPropertyValue("--ink").trim() || INK; C.o = ACC; };
    readTheme();

    let played = 0, jp = 0, score = 0, cg = 0, total = 0, win = 0, mute = 0, dep = 0, cl = 0, r2 = 0, lastLv = 1;
    let bugs: any[] = [], pts: any[] = [], drops: any[] = [];
    const k: any = { l: 0, r: 0, j: 0 }, got = new Set<number>(), ach = new Set<string>(), ps: any[] = [], ft: any[] = [], NC: number[] = [];
    const P: any = { x: 80, y: 0, vx: 0, vy: 0, on: 0, f: 1, j: 0, t: 0, co: 0, jb: 0, inv: 0, sq: 0, hp: 3, mag: 0 };
    const w = 48, h = 56, BW = 40, BH = 24;
    const rg = document.createRange();

    const getEls = () => [...document.querySelectorAll(SEL)].filter((e) => shell.contains(e)) as HTMLElement[];
    let els = getEls();
    const rectOf = (e: HTMLElement) => { if (TXT.test(e.className)) { rg.selectNodeContents(e); return rg.getBoundingClientRect(); } return e.getBoundingClientRect(); };
    const labelOf = (e: HTMLElement) => (e.getAttribute("aria-label") || e.textContent || "").replace(/\s+/g, " ").trim().toUpperCase().slice(0, 30);

    function init() {
      els = getEls(); total = 0;
      els.forEach((e, i) => { const r = rectOf(e); NC[i] = r.width > 0 ? Math.min(3, Math.max(1, Math.round(r.width / 190))) : 0; total += NC[i]; });
      E.tt.textContent = String(total);
    }
    function mkBugs() {
      const a = els.map((e, i) => ({ i, w: rectOf(e).width })).filter((o) => o.w > 170);
      bugs = [];
      for (let n = 0; n < Math.min(4, a.length); n++) { const o = a.splice((Math.random() * a.length) | 0, 1)[0]; bugs.push({ i: o.i, f: Math.random(), d: 1, alive: 1, rt: 0, x: 0, y: 0, l: BUG_LABELS[n] }); }
    }
    function rs() {
      const d = devicePixelRatio || 1; W = innerWidth; H = innerHeight;
      cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
      init();
    }

    const spr = (rows: string[], x: number, y: number, s: number, fl: number, col: any) => {
      const n = rows[0].length;
      rows.forEach((r, j) => { for (let i = 0; i < n; i++) { const c = r[i]; if (c === ".") continue; cx.fillStyle = col[c]; cx.fillRect(x + (fl > 0 ? i : n - 1 - i) * s, y + j * s, s, s); } });
    };
    const outlined = (rows: string[], x: number, y: number, s: number, fl: number) => {
      for (const [dx, dy] of [[-4,0],[4,0],[0,-4],[0,4]]) spr(rows, x + dx, y + dy, s, fl, OUT);
      spr(rows, x, y, s, fl, C);
    };

    function hud() {
      E.sc.textContent = String(cg);
      const lv = 1 + ((score / 60) | 0);
      if (lv > lastLv) { lastLv = lv; toast("★ LEVEL UP", "YOU REACHED LV " + lv); sfx(600, .3, "square", 1200); }
      E.lv.textContent = String(lv); E.xpn.textContent = String(score);
      E.xp.style.width = ((score % 60) / 60) * 100 + "%";
      E.hp.textContent = "♥".repeat(P.hp) + "♡".repeat(3 - P.hp);
    }
    function add(n: number, t: string, x: number, y: number) { score += n; ft.push({ x, y, l: 45, t }); hud(); }
    function toast(a: string, b?: string) {
      const t = E.ts as HTMLElement; t.innerHTML = b ? `<b>${a}</b>${b}` : a; t.classList.add("on");
      clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 2400);
    }
    function burst(x: number, y: number, n: number, cols: string[], sp = 3) {
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = Math.random() * sp + 1; ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, l: 30 + Math.random() * 20, c: cols[i % cols.length], z: 3 + ((Math.random() * 3) | 0) }); }
    }
    function sfx(f: number, d = .08, t: OscillatorType = "square", f2?: number) {
      if (mute || !ac) return;
      const T = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = t; o.frequency.setValueAtTime(f, T); if (f2) o.frequency.linearRampToValueAtTime(f2, T + d);
      g.gain.setValueAtTime(.05, T); g.gain.exponentialRampToValueAtTime(.001, T + d);
      o.connect(g).connect(ac.destination); o.start(); o.stop(T + d);
    }
    function start() {
      if (!played) { played = 1; E.msg.classList.remove("gm-blink"); E.msg.style.color = "var(--ink-2)"; E.msg.textContent = "COLLECT COINS · TRAIN THE MODEL"; }
      (document.activeElement as HTMLElement | null)?.blur?.();
      try { ac = ac || new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* no audio */ }
    }

    function drawChart() {
      const cw = 180, chh = 70; hx.clearRect(0, 0, cw, chh); hx.fillStyle = INK; hx.globalAlpha = .12;
      for (let i = 1; i < 4; i++) { hx.fillRect(0, (i * chh) / 4, cw, 1); hx.fillRect((i * cw) / 4, 0, 1, chh); }
      hx.globalAlpha = 1;
      pts.forEach((p) => { hx.fillStyle = p.o ? ACC : INK; hx.fillRect(p.x * (cw - 6) + 1, (1 - p.y) * (chh - 6) + 1, 4, 4); });
      if (pts.length > 2) {
        let sx = 0, sy = 0, sxx = 0, sxy = 0; const n = pts.length;
        pts.forEach((p) => { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; });
        const m = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1), b = (sy - m * sx) / n;
        hx.strokeStyle = ACC; hx.lineWidth = 2; hx.beginPath(); hx.moveTo(0, (1 - b) * (chh - 6) + 1); hx.lineTo(cw, (1 - (m + b)) * (chh - 6) + 1); hx.stroke();
      }
    }
    function fit() {
      const n = pts.length;
      if (n < 3) r2 = 0; else {
        let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
        pts.forEach((p) => { sx += p.x; sy += p.y; sxx += p.x * p.x; syy += p.y * p.y; sxy += p.x * p.y; });
        const c = n * sxy - sx * sy, vx = n * sxx - sx * sx, vy = n * syy - sy * sy;
        r2 = vx > 0 && vy > 0 ? (c * c) / (vx * vy) : 0;
      }
      E.r2.textContent = r2.toFixed(2);
      if (n >= 15 && r2 >= .85 && !dep) {
        dep = 1; add(100, "+100 MODEL!", P.x, P.y - 30);
        toast("★ MODEL DEPLOYED", "R² " + r2.toFixed(2) + " · ACCURACY 85%+");
        for (let i = 0; i < 6; i++) burst(Math.random() * W, Math.random() * H * .5, 16, [ACC, INK, "#2f9e44"], 5);
        sfx(523, .5, "square", 1046);
        depT = setTimeout(() => { pts = []; dep = 0; fit(); toast("NEW DATASET", "TRAIN AGAIN"); }, 7000);
      }
    }

    const KEYS: Record<string, string> = { ArrowLeft: "l", a: "l", A: "l", ArrowRight: "r", d: "r", D: "r", ArrowUp: "j", w: "j", W: "j", " ": "j" };
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName));
    const onDown = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (e.key === "Escape") { closeRef.current(); return; }
      if (e.key === "m" || e.key === "M") { mute ^= 1; return; }
      const m = KEYS[e.key]; if (m) { k[m] = 1; start(); e.preventDefault(); }
    };
    const onUp = (e: KeyboardEvent) => { const m = KEYS[e.key]; if (m) { k[m] = 0; if (!typing(e.target)) e.preventDefault(); } };
    addEventListener("keydown", onDown); addEventListener("keyup", onUp);
    root.querySelectorAll<HTMLElement>(".gm-pad button").forEach((b) => {
      const m = b.dataset.k!; b.onpointerdown = () => { k[m] = 1; start(); };
      ["pointerup", "pointerleave", "pointercancel"].forEach((v) => ((b as any)["on" + v] = () => (k[m] = 0)));
    });
    E.mu.onclick = () => { mute ^= 1; E.mu.style.opacity = mute ? ".4" : "1"; };

    function frame() {
      fr++; if (fr % 60 === 0) readTheme();
      const R: any[] = [], Rm: Record<number, any> = {};
      els.forEach((e, i) => { const r = rectOf(e); if (r.width > 0 && r.top > 0 && r.top < H) { const o = { i, e, l: r.left, r: r.right, t: r.top, w: r.width }; R.push(o); Rm[i] = o; } });
      const gy = ((document.querySelector(".lv5-footer") as HTMLElement | null)?.getBoundingClientRect().top) ?? H - 40, tm = fr / 60;
      const coins: any[] = [];
      R.forEach((o) => { for (let q = 0; q < (NC[o.i] || 0); q++) { const id = o.i * 10 + q; if (!got.has(id)) coins.push({ id, x: o.l + (o.w * (q + 1)) / (NC[o.i] + 1), y: o.t - 32 + Math.sin(tm * 4 + id) * 3 }); } });

      let dir = k.r - k.l, want = k.j;
      if (!played) {
        let best = 1e9, t: any = null;
        coins.concat(drops.filter((d) => d.t !== "o" && d.y > 0)).forEach((c) => { const d = Math.abs(c.x - P.x - w / 2) + Math.abs(c.y - P.y) * .6; if (d < best) { best = d; t = c; } });
        if (t) { const dx = t.x - P.x - w / 2; dir = dx > 10 ? 1 : dx < -10 ? -1 : 0; want = t.y < P.y + h / 2 - 24 && fr % 18 < 9; if (!dir && t.y > P.y + h) dir = (fr >> 5) & 1 ? 1 : -1; } else dir = 0;
      }
      if (want && !jp) P.jb = 8; jp = want; if (P.jb > 0) P.jb--;
      if (P.on) P.co = 7; else if (P.co > 0) P.co--;
      if (P.jb > 0 && (P.co > 0 || P.j < 2)) { P.j = P.co > 0 ? 1 : 2; P.vy = -14.5; P.co = 0; P.jb = 0; P.sq = -.3; sfx(380, .12, "square", 720); burst(P.x + w / 2, P.y + h, 6, [INK], 2); }
      if (played && !want && P.vy < -4) P.vy += .9;
      P.vx += (dir * 4.2 - P.vx) * (dir ? .28 : .2); if (dir) P.f = dir;
      const pb = P.y + h; P.vy = Math.min(P.vy + .7, 16); const fv = P.vy;
      P.x = Math.max(0, Math.min(W - w, P.x + P.vx)); P.y += P.vy;
      const was = P.on; P.on = 0; let hit: any = null;
      const land = (o: any) => { if (P.vy >= 0 && pb <= o.t + 3 && P.y + h >= o.t && P.x + w > o.l + 6 && P.x < o.r - 6) { P.y = o.t - h; hit = o; } };
      R.forEach(land); land({ t: gy, l: 0, r: W });
      if (hit) {
        P.vy = 0; P.on = 1; P.j = 0;
        if (!was) {
          if (fv > 5) { P.sq = .35; burst(P.x + w / 2, P.y + h, 7, [INK], 2); sfx(150, .06, "triangle"); }
          if (hit.e) {
            if (fv > 3) hit.e.animate([{ transform: "translateY(0)" }, { transform: "translateY(-7px)" }, { transform: "translateY(0)" }], { duration: 200 });
            const a = labelOf(hit.e);
            if (a && !ach.has(a)) { ach.add(a); add(25, "+25 XP", P.x + w / 2, P.y - 24); toast("★ ACHIEVEMENT", a); sfx(660, .25, "square", 990); }
          }
        }
      }
      if (P.y > H) { P.y = 0; P.vy = 0; }
      if (P.inv > 0) P.inv--; P.sq *= .82; P.t += Math.abs(P.vx) * .07;
      if (P.on && Math.abs(P.vx) > 3.5 && fr % 7 === 0) ps.push({ x: P.x + w / 2 - P.f * 12, y: P.y + h - 3, vx: -P.f * .5, vy: -.4, l: 16, c: "#8f8d89", z: 4 });

      bugs.forEach((b) => {
        const o = Rm[b.i]; if (!o) return;
        if (!b.alive) { if (--b.rt <= 0) b.alive = 1; return; }
        b.f += (b.d * 1.2) / Math.max(o.w - BW, 60); if (b.f > 1) { b.f = 1; b.d = -1; } if (b.f < 0) { b.f = 0; b.d = 1; }
        b.x = o.l + b.f * (o.w - BW); b.y = o.t - BH;
        if (P.x + w - 12 > b.x && P.x + 12 < b.x + BW && P.y + h > b.y && P.y < b.y + BH) {
          if (fv > 1 && pb <= b.y + 14) { b.alive = 0; b.rt = 420; P.vy = -10; P.j = 1; cl++; E.cl.textContent = String(cl); add(10, "CLEANED " + b.l, b.x, b.y - 10); burst(b.x + BW / 2, b.y + BH / 2, 12, ["#2f9e44", INK], 3.5); sfx(200, .15, "square", 60); }
          else if (!P.inv && played) { P.hp--; P.inv = 90; P.vy = -8; P.vx = (P.x + w / 2 < b.x + BW / 2 ? -1 : 1) * 9; P.sq = .3; burst(P.x + w / 2, P.y + h / 2, 10, [ACC, INK]); sfx(120, .25, "sawtooth", 60); hud(); if (P.hp <= 0) { P.hp = 3; P.x = 80; P.y = 0; toast("GAME OVER", "RESPAWNING..."); hud(); } }
        }
      });

      coins.forEach((c) => {
        if (Math.abs(c.x - P.x - w / 2) < 32 && Math.abs(c.y - P.y - h / 2) < 40) {
          got.add(c.id); cg++; add(5, "+5", c.x, c.y); burst(c.x, c.y, 8, [ACC, INK], 2.5); sfx(880, .09, "square", 1320);
          if (cg >= total && !win) {
            win = 1; for (let i = 0; i < 8; i++) burst(Math.random() * W, Math.random() * H * .5, 18, [ACC, INK, "#2f9e44"], 5);
            toast("★ LEVEL CLEAR ★", "LET'S WORK TOGETHER"); document.querySelectorAll(".lv5-btn").forEach((b) => b.classList.add("gm-pulse")); sfx(523, .5, "square", 1046);
            winT = setTimeout(() => { got.clear(); cg = 0; win = 0; document.querySelectorAll(".lv5-btn").forEach((b) => b.classList.remove("gm-pulse")); toast("NEW GAME+", "COINS RESPAWNED"); hud(); }, 9000);
          }
        }
      });

      // data rain
      if (fr % 50 === 0) {
        const r = Math.random(), fx = Math.random(), t = r < .07 ? "z" : r < .22 ? "o" : "c";
        let fy = .12 + .7 * fx + (Math.random() - .5) * .16;
        if (t === "o") fy = fx > .5 ? .05 + Math.random() * .15 : .8 + Math.random() * .15;
        drops.push({ x: 30 + fx * (W - 60), y: -20, fx, fy: Math.max(0, Math.min(1, fy)), t, v: 1.4 + Math.random() * 1.2 });
      }
      const px = P.x + w / 2, py = P.y + h / 2; if (P.mag > 0) P.mag--;
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]; d.y += d.v;
        if (P.mag > 0 && d.t === "c") { const dx = px - d.x, dy = py - d.y; if (dx * dx + dy * dy < 70000) { d.x += dx * .06; d.y += dy * .06; } }
        if (d.y > gy) { drops.splice(i, 1); continue; }
        if (Math.abs(d.x - px) < 34 && Math.abs(d.y - py) < 40) {
          drops.splice(i, 1);
          if (d.t === "z") { P.mag = 360; toast("★ STANDARDIZED", "CLEAN DATA MAGNET ON"); sfx(700, .3, "square", 1200); burst(d.x, d.y, 12, ["#2f9e44", INK], 3); }
          else {
            pts.push({ x: d.fx, y: d.fy, o: d.t === "o" }); if (pts.length > 50) pts.shift();
            if (d.t === "o") { add(0, "OUTLIER!", d.x, d.y); burst(d.x, d.y, 10, [ACC, "#0b0b0d"], 3); sfx(110, .2, "sawtooth", 70); }
            else { add(3, "+3", d.x, d.y); burst(d.x, d.y, 5, [INK], 2); sfx(560, .06); }
            fit();
          }
        }
      }

      // draw (transparent canvas over the real page)
      cx.clearRect(0, 0, W, H); cx.fillStyle = ACC; for (let x = 0; x < W; x += 16) cx.fillRect(x, gy - 4, 8, 4);
      coins.forEach((c) => { const wd = Math.abs(Math.cos(tm * 4 + c.id)) * 12 + 2; cx.fillStyle = "#0b0b0d"; cx.fillRect(c.x - wd / 2 - 2, c.y - 9, wd + 4, 18); cx.fillStyle = ACC; cx.fillRect(c.x - wd / 2, c.y - 7, wd, 14); if (wd > 8) { cx.fillStyle = "#f0ede8"; cx.fillRect(c.x - 2, c.y - 3, 4, 6); } });
      bugs.forEach((b) => { if (!b.alive) return; outlined(BUG.concat([BL[(fr >> 4) & 1]]), b.x, b.y, 4, b.d); cx.font = '7px "Press Start 2P",monospace'; cx.fillStyle = "#2f9e44"; cx.fillText(b.l, b.x + BW / 2 - b.l.length * 3.5, b.y - 6); });
      drops.forEach((d) => {
        const s = 14, x = d.x - s / 2, y = d.y - s / 2; cx.fillStyle = "#0b0b0d"; cx.fillRect(x - 2, y - 2, s + 4, s + 4);
        cx.fillStyle = d.t === "o" ? ACC : d.t === "z" ? "#2f9e44" : "#f0ede8"; cx.fillRect(x, y, s, s); cx.fillStyle = "#0b0b0d";
        if (d.t === "o") { cx.fillRect(x + 3, y + 3, 3, 3); cx.fillRect(x + 8, y + 3, 3, 3); cx.fillRect(x + 5, y + 6, 4, 3); cx.fillRect(x + 3, y + 9, 3, 3); cx.fillRect(x + 8, y + 9, 3, 3); }
        else if (d.t === "z") { cx.fillRect(x + 3, y + 3, 8, 2); cx.fillRect(x + 3, y + 11, 8, 2); } else cx.fillRect(x + 4, y + 4, 2, 2);
      });
      if (P.mag > 0) { cx.strokeStyle = "#2f9e44"; cx.lineWidth = 3; cx.setLineDash([6, 6]); cx.strokeRect(P.x - 12, P.y - 12, w + 24, h + 24); cx.setLineDash([]); }
      for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; p.x += p.vx; p.y += p.vy; p.vy += .12; if (--p.l <= 0) { ps.splice(i, 1); continue; } cx.globalAlpha = Math.min(1, p.l / 15); cx.fillStyle = p.c; cx.fillRect(p.x, p.y, p.z, p.z); }
      cx.globalAlpha = 1;
      if (!(P.inv > 0 && (P.inv >> 2) & 1)) {
        cx.save(); cx.translate(P.x + w / 2, P.y + h); cx.scale(1 + P.sq * .6, 1 - P.sq * .8);
        const lg = P.on ? (Math.abs(P.vx) > .8 ? LEG[(P.t | 0) % 2 ? "a" : "b"] : LEG.i) : LEG.j;
        outlined(BODY.concat(lg), -w / 2, -h, 4, P.f); cx.restore();
      }
      if (P.inv > 80) { cx.fillStyle = "rgba(232,84,42,.14)"; cx.fillRect(0, 0, W, H); }
      cx.font = '8px "Press Start 2P",monospace'; cx.fillStyle = ACC; cx.fillText("P1", P.x + w / 2 - 8, P.y - 8);
      for (let i = ft.length - 1; i >= 0; i--) { const f = ft[i]; f.y -= .8; if (--f.l <= 0) { ft.splice(i, 1); continue; } cx.globalAlpha = Math.min(1, f.l / 15); cx.fillStyle = ACC; cx.font = '10px "Press Start 2P",monospace'; cx.fillText(f.t, f.x - 20, f.y); }
      cx.globalAlpha = 1;
      drawChart(); raf = requestAnimationFrame(frame);
    }

    document.fonts?.load('8px "Press Start 2P"');
    rs(); mkBugs(); hud(); frame();
    addEventListener("resize", rs);
    rzT = setTimeout(() => { init(); mkBugs(); }, 900); // after the page's intro animation settles

    return () => {
      cancelAnimationFrame(raf); clearTimeout(tt); clearTimeout(rzT); clearTimeout(winT); clearTimeout(depT);
      removeEventListener("keydown", onDown); removeEventListener("keyup", onUp); removeEventListener("resize", rs);
      document.querySelectorAll(".lv5-btn").forEach((b) => b.classList.remove("gm-pulse"));
      ac?.close?.();
    };
  }, []);

  return (
    <div className="gm-root" ref={rootRef}>
      <canvas className="gm-cv" data-id="cv" />
      <div className="gm-ts" data-id="ts" />
      <div className="gm-hud">
        <div className="gm-r"><span>LV <em data-id="lv">1</em> · XP <em data-id="xpn">0</em></span><span data-id="hp">♥♥♥</span><button data-id="mu" type="button">♪</button></div>
        <div className="gm-xp"><i data-id="xp" /></div>
        <div>COINS <em data-id="sc">0</em>/<span data-id="tt">0</span> · CLEANED <em data-id="cl">0</em></div>
        <div>MODEL R² <em data-id="r2">0.00</em></div>
        <canvas data-id="ch" width={180} height={70} />
        <div data-id="msg" className="gm-blink">PRESS ANY KEY</div>
        <small>ARROWS/WASD · SPACE JUMP x2<br />CATCH DATA, DODGE OUTLIERS (X)<br />STOMP NaN BUGS · GREEN Z = MAGNET<br />R² 0.85+ = MODEL DEPLOYED</small>
        <button type="button" className="gm-exit" onClick={() => closeRef.current()}>✕ EXIT GAME (ESC)</button>
      </div>
      <div className="gm-pad"><div><button type="button" data-k="l">◀</button><button type="button" data-k="r">▶</button></div><button type="button" data-k="j">▲</button></div>
    </div>
  );
}
