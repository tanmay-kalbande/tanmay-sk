import { useEffect, useRef, useCallback } from "react";
import "../styles/gameOverlay.css";

/**
 * Enhanced 3D pixel-game layer that plays ON TOP of the existing landing page.
 * Uses WebGL (Three.js-style custom renderer) for gorgeous 3D character + particle effects.
 * Falls back gracefully to 2D canvas on weaker devices.
 * Fully responsive across all screen sizes.
 */
type Props = { onClose: () => void };

/* ── Platform selector ─────────────────────────────────────────── */
const SEL =
  ".lv5-nav__brand,.lv5-nav__link,.lv5-nav__cta,.lv5-nav__theme,.lv5-name__first,.lv5-name__last," +
  ".lv5-identity,.lv5-tagline,.lv5-btn,.lv5-stat,.lv5-social";
const TXT = /lv5-name__|lv5-tagline|lv5-identity/;

/* ── Character sprite definitions (enhanced pixel art) ────────── */
const CHR_HEAD   = ["...oooooo...","..oooooooo..","..oooooooo..","..ffffffff..","..ffeeffee..","..ffffffff..","..oommmmoo..","...oooooo..."];
const CHR_BODY   = ["....hhhh....","...hhhhhh...",".hhhahahhh.","..hhhhhhhh..","..hhhhhhhh..","...hhhhhh..."];
const CHR_ARMS_I = ["rh........hr"];
const CHR_ARMS_A = [".rh......hr."];
const CHR_LEG_I  = ["...pp..pp...","...ss..ss..."];
const CHR_LEG_A  = ["..pp....pp..","..ss....ss.."];
const CHR_LEG_B  = ["....pp..pp..","...ss....ss."];
const CHR_LEG_J  = ["...pp..pp...","..ss....ss.."];

/* ── Bug sprites ───────────────────────────────────────────────── */
const BUG_BODY = ["..k....k..","...kkkk...","..gggggg..",".gwegwegg.","..gggggg.."];
const BUG_LEGS = [".k.k..k.k.","k.k....k.k"];
const BUG_LABELS = ["NaN","NULL","DUP","ERR"];

/* ── Performance detection ─────────────────────────────────────── */
const detectPerf = () => {
  const c = document.createElement("canvas");
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  if (!gl) return "low";
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
  if (/swiftshader|llvmpipe|software/i.test(renderer)) return "low";
  if (window.innerWidth < 480 || navigator.hardwareConcurrency <= 2) return "low";
  if (window.innerWidth < 768 || navigator.hardwareConcurrency <= 4) return "mid";
  return "high";
};

export default function GameOverlay({ onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const getScale = useCallback(() => {
    const w = window.innerWidth;
    if (w < 400) return 2;
    if (w < 600) return 2.5;
    if (w < 900) return 3;
    if (w < 1400) return 4;
    return 5;
  }, []);

  useEffect(() => {
    const root = rootRef.current!;
    const shell = (document.querySelector(".lv5-shell") || document.documentElement) as HTMLElement;
    const E: Record<string, any> = {};
    root.querySelectorAll("[data-id]").forEach((n) => (E[n.getAttribute("data-id")!] = n));
    (document.activeElement as HTMLElement | null)?.blur?.();

    /* ── Canvases ──────────────────────────────────────────────── */
    const cv = E.cv as HTMLCanvasElement;
    const cx = cv.getContext("2d", { alpha: true })!;
    const glCv = E.gl as HTMLCanvasElement;
    const ch = E.ch as HTMLCanvasElement;
    const hx = ch.getContext("2d")!;

    /* ── WebGL 3D setup ────────────────────────────────────────── */
    const perf = detectPerf();
    let gl: WebGLRenderingContext | null = null;
    let glProgram: WebGLProgram | null = null;
    let glBuf: WebGLBuffer | null = null;
    let glTimeLoc: WebGLUniformLocation | null = null;
    let glResLoc: WebGLUniformLocation | null = null;
    let glAccLoc: WebGLUniformLocation | null = null;
    let glPosLoc: WebGLUniformLocation | null = null;
    let glMagLoc: WebGLUniformLocation | null = null;
    let glInvLoc: WebGLUniformLocation | null = null;

    const initGL = () => {
      try {
        gl = glCv.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false }) || null;
        if (!gl) return;

        const vs = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vs, `
          attribute vec2 a_pos;
          void main(){gl_Position=vec4(a_pos,0,1);}
        `);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fs, `
          precision mediump float;
          uniform float u_time;
          uniform vec2 u_res;
          uniform vec3 u_accent;
          uniform vec2 u_player;
          uniform float u_mag;
          uniform float u_inv;

          float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}

          float noise(vec2 p){
            vec2 i=floor(p),f=fract(p);
            f=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                       mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
          }

          void main(){
            vec2 uv=gl_FragCoord.xy/u_res;
            vec2 puv=u_player/u_res;
            float t=u_time*0.5;

            // Ambient glow around player
            float d=distance(uv,puv);
            float glow=smoothstep(0.35,0.0,d)*0.12;

            // Scanlines
            float scan=sin(gl_FragCoord.y*1.5+t*2.0)*0.02+0.02;

            // Grid perspective
            float gy=1.0-uv.y;
            float grid=0.0;
            if(gy>0.5){
              float py=(gy-0.5)*2.0;
              float gx=fract((uv.x-0.5)*mix(4.0,12.0,py)+t*0.3);
              float fy=fract(py*8.0+t*0.5);
              grid=smoothstep(0.02,0.0,min(gx,1.0-gx))*py*0.06;
              grid+=smoothstep(0.02,0.0,min(fy,1.0-fy))*py*0.04;
            }

            // Energy particles
            float particles=0.0;
            for(int i=0;i<8;i++){
              float fi=float(i);
              vec2 pp=vec2(
                fract(sin(fi*17.3)*43.7+t*0.15*(1.0+fi*0.1)),
                fract(cos(fi*31.1)*27.3+t*0.08*(1.0+fi*0.15))
              );
              float pd=distance(uv,pp);
              particles+=smoothstep(0.015,0.0,pd)*0.05;
            }

            // Magnet aura
            float mag=0.0;
            if(u_mag>0.0){
              float mr=0.15+sin(t*4.0)*0.03;
              mag=smoothstep(mr,mr-0.06,d)*0.08*u_mag;
            }

            // Damage flash
            float inv=u_inv*smoothstep(0.0,1.0,sin(t*20.0)*0.5+0.5)*0.06;

            vec3 col=u_accent*(glow+grid+particles+mag)+vec3(1.0,0.2,0.1)*inv;
            col+=vec3(scan);

            float a=glow+grid+particles+mag+inv+scan*0.3;
            gl_FragColor=vec4(col,min(a,0.35));
          }
        `);
        gl.compileShader(fs);

        glProgram = gl.createProgram()!;
        gl.attachShader(glProgram, vs);
        gl.attachShader(glProgram, fs);
        gl.linkProgram(glProgram);
        gl.useProgram(glProgram);

        const posAttr = gl.getAttribLocation(glProgram, "a_pos");
        glBuf = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, glBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(posAttr);
        gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

        glTimeLoc = gl.getUniformLocation(glProgram, "u_time");
        glResLoc = gl.getUniformLocation(glProgram, "u_res");
        glAccLoc = gl.getUniformLocation(glProgram, "u_accent");
        glPosLoc = gl.getUniformLocation(glProgram, "u_player");
        glMagLoc = gl.getUniformLocation(glProgram, "u_mag");
        glInvLoc = gl.getUniformLocation(glProgram, "u_inv");

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      } catch {
        gl = null;
      }
    };
    if (perf !== "low") initGL();

    /* ── State variables ───────────────────────────────────────── */
    let W = 0, H = 0, raf = 0, fr = 0, ac: AudioContext | undefined;
    let tt: any, rzT: any, winT: any, depT: any;
    let ACC = "#e8542a", INK = "#f0ede8";
    let accR = 0.91, accG = 0.33, accB = 0.16;
    const C: any = { o: ACC, f: "#f0ede8", e: "#222", h: "#5a5a65", a: "#e05a35", p: "#34343b", s: "#f0ede8", g: "#2f9e44", k: "#145a24", w: "#fff", m: "#cb6537", r: "#f0ede8" };
    const OUT: any = new Proxy({}, { get: () => "#0b0b0d" });
    const readTheme = () => {
      const cs = getComputedStyle(shell);
      ACC = cs.getPropertyValue("--accent").trim() || ACC;
      INK = cs.getPropertyValue("--ink").trim() || INK;
      C.o = ACC; C.a = ACC;
      // Parse accent for WebGL
      const tmp = document.createElement("div");
      tmp.style.color = ACC;
      document.body.appendChild(tmp);
      const rgb = getComputedStyle(tmp).color.match(/\d+/g);
      document.body.removeChild(tmp);
      if (rgb && rgb.length >= 3) {
        accR = parseInt(rgb[0]) / 255;
        accG = parseInt(rgb[1]) / 255;
        accB = parseInt(rgb[2]) / 255;
      }
    };
    readTheme();

    const rg = document.createRange();
    let played = 0, jp = 0, score = 0, cg = 0, total = 0, win = 0, mute = 0, dep = 0, cl = 0, r2 = 0, lastLv = 1;
    let bugs: any[] = [], pts: any[] = [], drops: any[] = [];
    const k: any = { l: 0, r: 0, j: 0 };
    const got = new Set<number>(), ach = new Set<string>(), ps: any[] = [], ft: any[] = [], NC: number[] = [];
    let SCALE = getScale();
    const charW = () => 12 * SCALE;
    const charH = () => 16 * SCALE;
    const BW = 40, BH = 24;
    const P: any = { x: 80, y: 0, vx: 0, vy: 0, on: 0, f: 1, j: 0, t: 0, co: 0, jb: 0, inv: 0, sq: 0, hp: 3, mag: 0, trail: [] as {x:number,y:number,a:number}[] };

    /* ── Element helpers ───────────────────────────────────────── */
    const getEls = () => [...document.querySelectorAll(SEL)].filter((e) => shell.contains(e)) as HTMLElement[];
    let els = getEls();
    let textOffsets = new WeakMap<HTMLElement, number>();
    const getTextTopOffset = (e: HTMLElement): number => {
      if (textOffsets.has(e)) return textOffsets.get(e)!;
      let delta = 0;
      try {
        const cs = getComputedStyle(e);
        cx.font = `${cs.fontStyle || "normal"} ${cs.fontWeight || "400"} ${cs.fontSize || "16px"} ${cs.fontFamily || "sans-serif"}`;
        const m = cx.measureText((e.textContent || "").trim());
        if (m.actualBoundingBoxAscent) {
          const fontAsc = m.fontBoundingBoxAscent || (parseFloat(cs.fontSize) * 0.95);
          delta = Math.max(0, fontAsc - m.actualBoundingBoxAscent);
        }
      } catch {
        delta = 0;
      }
      textOffsets.set(e, delta);
      return delta;
    };

    const rectOf = (e: HTMLElement) => {
      if (TXT.test(e.className)) {
        rg.selectNodeContents(e);
        const r = rg.getBoundingClientRect();
        const delta = getTextTopOffset(e);
        const top = r.top + delta;
        return { left: r.left, right: r.right, top, bottom: r.bottom, width: r.width, height: Math.max(0, r.bottom - top) };
      }
      return e.getBoundingClientRect();
    };
    const labelOf = (e: HTMLElement) => (e.getAttribute("aria-label") || e.textContent || "").replace(/\s+/g, " ").trim().toUpperCase().slice(0, 30);

    /* ── Init & resize ─────────────────────────────────────────── */
    function init() {
      els = getEls(); total = 0;
      els.forEach((e, i) => { const r = rectOf(e); NC[i] = r.width > 0 ? Math.min(3, Math.max(1, Math.round(r.width / 190))) : 0; total += NC[i]; });
      E.tt.textContent = String(total);
    }
    function mkBugs() {
      const a = els.map((e, i) => ({ i, w: rectOf(e).width })).filter((o) => o.w > 170);
      bugs = [];
      for (let n = 0; n < Math.min(4, a.length); n++) {
        const o = a.splice((Math.random() * a.length) | 0, 1)[0];
        bugs.push({ i: o.i, f: Math.random(), d: 1, alive: 1, rt: 0, x: 0, y: 0, l: BUG_LABELS[n] });
      }
    }
    function rs() {
      textOffsets = new WeakMap<HTMLElement, number>();
      const d = devicePixelRatio || 1;
      W = innerWidth; H = innerHeight;
      SCALE = getScale();
      cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
      if (gl) {
        glCv.width = W * (perf === "high" ? d : Math.min(d, 1.5));
        glCv.height = H * (perf === "high" ? d : Math.min(d, 1.5));
        gl.viewport(0, 0, glCv.width, glCv.height);
      }
      init();
    }

    /* ── Sprite renderer ───────────────────────────────────────── */
    const spr = (rows: string[], x: number, y: number, s: number, fl: number, col: any) => {
      const n = rows[0].length;
      rows.forEach((r, j) => {
        for (let i = 0; i < n; i++) {
          const c = r[i]; if (c === ".") continue;
          cx.fillStyle = col[c];
          cx.fillRect(x + (fl > 0 ? i : n - 1 - i) * s, y + j * s, s, s);
        }
      });
    };
    const outlined = (rows: string[], x: number, y: number, s: number, fl: number) => {
      const outOff = Math.max(1, Math.round(s * 0.6));
      for (const [dx, dy] of [[-outOff,0],[outOff,0],[0,-outOff],[0,outOff]]) spr(rows, x + dx, y + dy, s, fl, OUT);
      spr(rows, x, y, s, fl, C);
    };

    /* ── 3D shadow/glow under character ────────────────────────── */
    const drawCharShadow = (x: number, y: number, w: number, h: number) => {
      const gradient = cx.createRadialGradient(x + w / 2, y + h + 2, 0, x + w / 2, y + h + 2, w * 0.8);
      gradient.addColorStop(0, "rgba(0,0,0,0.25)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      cx.fillStyle = gradient;
      cx.beginPath();
      cx.ellipse(x + w / 2, y + h + 2, w * 0.7, SCALE * 2, 0, 0, Math.PI * 2);
      cx.fill();
    };

    /* ── Enhanced character with 3D-like shading ───────────────── */
    const drawCharacter = (fl: number, isOnGround: number, vx: number, t: number, isJumping: number) => {
      const s = SCALE;
      const arms = Math.abs(vx) > 0.8 ? ((t | 0) % 2 ? CHR_ARMS_A : CHR_ARMS_I) : CHR_ARMS_I;
      const legs = isOnGround
        ? (Math.abs(vx) > 0.8 ? ((t | 0) % 2 ? CHR_LEG_A : CHR_LEG_B) : CHR_LEG_I)
        : CHR_LEG_J;
      const full = CHR_HEAD.concat(arms, CHR_BODY, legs);
      return full;
    };

    /* ── HUD & scoring ─────────────────────────────────────────── */
    function hud() {
      E.sc.textContent = String(cg);
      const lv = 1 + ((score / 60) | 0);
      if (lv > lastLv) { lastLv = lv; toast("★ LEVEL UP", "YOU REACHED LV " + lv); sfx(600, .3, "square", 1200); }
      E.lv.textContent = String(lv);
      E.xpn.textContent = String(score);
      E.xp.style.width = ((score % 60) / 60) * 100 + "%";
      E.hp.textContent = "♥".repeat(P.hp) + "♡".repeat(3 - P.hp);
    }
    function add(n: number, t: string, x: number, y: number) { score += n; ft.push({ x, y, l: 50, t }); hud(); }
    function toast(a: string, b?: string) {
      const t = E.ts as HTMLElement;
      t.innerHTML = b ? `<b>${a}</b>${b}` : a;
      t.classList.add("on");
      clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 2400);
    }
    function burst(x: number, y: number, n: number, cols: string[], sp = 3) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, s = Math.random() * sp + 1;
        ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, l: 30 + Math.random() * 20, c: cols[i % cols.length], z: 3 + ((Math.random() * 3) | 0) });
      }
    }
    function sfx(f: number, d = .08, t: OscillatorType = "square", f2?: number) {
      if (mute || !ac) return;
      const T = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = t; o.frequency.setValueAtTime(f, T); if (f2) o.frequency.linearRampToValueAtTime(f2, T + d);
      g.gain.setValueAtTime(.05, T); g.gain.exponentialRampToValueAtTime(.001, T + d);
      o.connect(g).connect(ac.destination); o.start(); o.stop(T + d);
    }
    function start() {
      if (!played) {
        played = 1;
        E.msg.classList.remove("gm-blink");
        E.msg.style.color = "var(--ink-2)";
        E.msg.textContent = "COLLECT COINS · TRAIN THE MODEL";
      }
      (document.activeElement as HTMLElement | null)?.blur?.();
      try { ac = ac || new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* no audio */ }
    }

    /* ── Chart ──────────────────────────────────────────────────── */
    function drawChart() {
      const cw = 180, chh = 70;
      hx.clearRect(0, 0, cw, chh);
      hx.fillStyle = INK; hx.globalAlpha = .12;
      for (let i = 1; i < 4; i++) { hx.fillRect(0, (i * chh) / 4, cw, 1); hx.fillRect((i * cw) / 4, 0, 1, chh); }
      hx.globalAlpha = 1;
      pts.forEach((p) => { hx.fillStyle = p.o ? ACC : INK; hx.fillRect(p.x * (cw - 6) + 1, (1 - p.y) * (chh - 6) + 1, 4, 4); });
      if (pts.length > 2) {
        let sx = 0, sy = 0, sxx = 0, sxy = 0; const n = pts.length;
        pts.forEach((p) => { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; });
        const m = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1), b = (sy - m * sx) / n;
        hx.strokeStyle = ACC; hx.lineWidth = 2; hx.beginPath();
        hx.moveTo(0, (1 - b) * (chh - 6) + 1); hx.lineTo(cw, (1 - (m + b)) * (chh - 6) + 1); hx.stroke();
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

    /* ── Input handling ─────────────────────────────────────────── */
    const KEYS: Record<string, string> = { ArrowLeft: "l", a: "l", A: "l", ArrowRight: "r", d: "r", D: "r", ArrowUp: "j", w: "j", W: "j", " ": "j" };
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName));
    const onDown = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (e.key === "Escape") { closeRef.current(); return; }
      if (e.key === "m" || e.key === "M") { mute ^= 1; return; }
      const m = KEYS[e.key]; if (m) { k[m] = 1; start(); e.preventDefault(); }
    };
    const onUp = (e: KeyboardEvent) => { const m = KEYS[e.key]; if (m) { k[m] = 0; if (!typing(e.target)) e.preventDefault(); } };
    addEventListener("keydown", onDown);
    addEventListener("keyup", onUp);

    /* ── Touch controls ────────────────────────────────────────── */
    root.querySelectorAll<HTMLElement>(".gm-pad button").forEach((b) => {
      const m = b.dataset.k!;
      b.onpointerdown = (e) => { e.preventDefault(); k[m] = 1; start(); };
      ["pointerup", "pointerleave", "pointercancel"].forEach((v) =>
        ((b as any)["on" + v] = () => (k[m] = 0))
      );
    });
    E.mu.onclick = () => { mute ^= 1; E.mu.style.opacity = mute ? ".4" : "1"; };

    /* ── Main game loop ────────────────────────────────────────── */
    function frame() {
      fr++;
      if (fr % 60 === 0) readTheme();
      const w = charW(), h = charH();
      const R: any[] = [], Rm: Record<number, any> = {};
      els.forEach((e, i) => {
        const r = rectOf(e);
        if (r.width > 0 && r.top > 0 && r.top < H) {
          const o = { i, e, l: r.left, r: r.right, t: r.top, w: r.width };
          R.push(o); Rm[i] = o;
        }
      });
      const gy = ((document.querySelector(".lv5-footer") as HTMLElement | null)?.getBoundingClientRect().top) ?? H - 40;
      const tm = fr / 60;
      const coins: any[] = [];
      R.forEach((o) => {
        for (let q = 0; q < (NC[o.i] || 0); q++) {
          const id = o.i * 10 + q;
          if (!got.has(id)) coins.push({ id, x: o.l + (o.w * (q + 1)) / (NC[o.i] + 1), y: o.t - 32 + Math.sin(tm * 4 + id) * 3 });
        }
      });

      /* ── AI auto-play when idle ──────────────────────────────── */
      let dir = k.r - k.l, want = k.j;
      if (!played) {
        let best = 1e9, tgt: any = null;
        coins.concat(drops.filter((d) => d.t !== "o" && d.y > 0)).forEach((c) => {
          const d = Math.abs(c.x - P.x - w / 2) + Math.abs(c.y - P.y) * .6;
          if (d < best) { best = d; tgt = c; }
        });
        if (tgt) {
          const dx = tgt.x - P.x - w / 2;
          dir = dx > 10 ? 1 : dx < -10 ? -1 : 0;
          want = tgt.y < P.y + h / 2 - 24 && fr % 18 < 9;
          if (!dir && tgt.y > P.y + h) dir = (fr >> 5) & 1 ? 1 : -1;
        } else dir = 0;
      }

      /* ── Physics ─────────────────────────────────────────────── */
      if (want && !jp) P.jb = 8;
      jp = want;
      if (P.jb > 0) P.jb--;
      if (P.on) P.co = 7; else if (P.co > 0) P.co--;
      if (P.jb > 0 && (P.co > 0 || P.j < 2)) {
        P.j = P.co > 0 ? 1 : 2; P.vy = -14.5; P.co = 0; P.jb = 0; P.sq = -.3;
        sfx(380, .12, "square", 720);
        burst(P.x + w / 2, P.y + h, 6, [INK], 2);
      }
      if (played && !want && P.vy < -4) P.vy += .9;
      P.vx += (dir * 4.2 - P.vx) * (dir ? .28 : .2);
      if (dir) P.f = dir;
      const pb = P.y + h;
      P.vy = Math.min(P.vy + .7, 16);
      const fv = P.vy;
      P.x = Math.max(0, Math.min(W - w, P.x + P.vx));
      P.y += P.vy;

      /* ── Platform collision ──────────────────────────────────── */
      const was = P.on; P.on = 0; let hit: any = null;
      const land = (o: any) => {
        if (P.vy >= 0 && pb <= o.t + 3 && P.y + h >= o.t && P.x + w > o.l + 6 && P.x < o.r - 6) {
          P.y = o.t - h; hit = o;
        }
      };
      R.forEach(land);
      land({ t: gy, l: 0, r: W });
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
      if (P.inv > 0) P.inv--;
      P.sq *= .82;
      P.t += Math.abs(P.vx) * .07;

      /* ── Motion trail ────────────────────────────────────────── */
      if (Math.abs(P.vx) > 2 || !P.on) {
        P.trail.push({ x: P.x + w / 2, y: P.y + h / 2, a: 0.3 });
        if (P.trail.length > 8) P.trail.shift();
      } else if (P.trail.length > 0) {
        P.trail.shift();
      }
      P.trail.forEach((tr: any) => tr.a *= 0.88);

      /* ── Dust particles ──────────────────────────────────────── */
      if (P.on && Math.abs(P.vx) > 3.5 && fr % 7 === 0)
        ps.push({ x: P.x + w / 2 - P.f * 12, y: P.y + h - 3, vx: -P.f * .5, vy: -.4, l: 16, c: "#8f8d89", z: 4 });

      /* ── Bug collision ───────────────────────────────────────── */
      bugs.forEach((b) => {
        const o = Rm[b.i]; if (!o) return;
        if (!b.alive) { if (--b.rt <= 0) b.alive = 1; return; }
        b.f += (b.d * 1.2) / Math.max(o.w - BW, 60);
        if (b.f > 1) { b.f = 1; b.d = -1; }
        if (b.f < 0) { b.f = 0; b.d = 1; }
        b.x = o.l + b.f * (o.w - BW);
        b.y = o.t - BH;
        if (P.x + w - 12 > b.x && P.x + 12 < b.x + BW && P.y + h > b.y && P.y < b.y + BH) {
          if (fv > 1 && pb <= b.y + 14) {
            b.alive = 0; b.rt = 420; P.vy = -10; P.j = 1; cl++;
            E.cl.textContent = String(cl);
            add(10, "CLEANED " + b.l, b.x, b.y - 10);
            burst(b.x + BW / 2, b.y + BH / 2, 12, ["#2f9e44", INK], 3.5);
            sfx(200, .15, "square", 60);
          } else if (!P.inv && played) {
            P.hp--; P.inv = 90; P.vy = -8;
            P.vx = (P.x + w / 2 < b.x + BW / 2 ? -1 : 1) * 9;
            P.sq = .3;
            burst(P.x + w / 2, P.y + h / 2, 10, [ACC, INK]);
            sfx(120, .25, "sawtooth", 60);
            hud();
            if (P.hp <= 0) {
              P.hp = 3; P.x = 80; P.y = 0;
              toast("GAME OVER", "RESPAWNING...");
              hud();
            }
          }
        }
      });

      /* ── Coin collection ─────────────────────────────────────── */
      coins.forEach((c) => {
        if (Math.abs(c.x - P.x - w / 2) < 32 && Math.abs(c.y - P.y - h / 2) < 40) {
          got.add(c.id); cg++;
          add(5, "+5", c.x, c.y);
          burst(c.x, c.y, 8, [ACC, INK], 2.5);
          sfx(880, .09, "square", 1320);
          if (cg >= total && !win) {
            win = 1;
            for (let i = 0; i < 8; i++) burst(Math.random() * W, Math.random() * H * .5, 18, [ACC, INK, "#2f9e44"], 5);
            toast("★ LEVEL CLEAR ★", "LET'S WORK TOGETHER");
            document.querySelectorAll(".lv5-btn").forEach((b) => b.classList.add("gm-pulse"));
            sfx(523, .5, "square", 1046);
            winT = setTimeout(() => {
              got.clear(); cg = 0; win = 0;
              document.querySelectorAll(".lv5-btn").forEach((b) => b.classList.remove("gm-pulse"));
              toast("NEW GAME+", "COINS RESPAWNED"); hud();
            }, 9000);
          }
        }
      });

      /* ── Data rain ───────────────────────────────────────────── */
      const dropInterval = W < 600 ? 70 : 50;
      if (fr % dropInterval === 0) {
        const r = Math.random(), fx = Math.random(), t = r < .07 ? "z" : r < .22 ? "o" : "c";
        let fy = .12 + .7 * fx + (Math.random() - .5) * .16;
        if (t === "o") fy = fx > .5 ? .05 + Math.random() * .15 : .8 + Math.random() * .15;
        drops.push({ x: 30 + fx * (W - 60), y: -20, fx, fy: Math.max(0, Math.min(1, fy)), t, v: 1.4 + Math.random() * 1.2 });
      }
      const px = P.x + w / 2, py = P.y + h / 2;
      if (P.mag > 0) P.mag--;
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]; d.y += d.v;
        if (P.mag > 0 && d.t === "c") {
          const dx = px - d.x, dy = py - d.y;
          if (dx * dx + dy * dy < 70000) { d.x += dx * .06; d.y += dy * .06; }
        }
        if (d.y > gy) { drops.splice(i, 1); continue; }
        if (Math.abs(d.x - px) < 34 && Math.abs(d.y - py) < 40) {
          drops.splice(i, 1);
          if (d.t === "z") {
            P.mag = 360; toast("★ STANDARDIZED", "CLEAN DATA MAGNET ON");
            sfx(700, .3, "square", 1200); burst(d.x, d.y, 12, ["#2f9e44", INK], 3);
          } else {
            pts.push({ x: d.fx, y: d.fy, o: d.t === "o" });
            if (pts.length > 50) pts.shift();
            if (d.t === "o") { add(0, "OUTLIER!", d.x, d.y); burst(d.x, d.y, 10, [ACC, "#0b0b0d"], 3); sfx(110, .2, "sawtooth", 70); }
            else { add(3, "+3", d.x, d.y); burst(d.x, d.y, 5, [INK], 2); sfx(560, .06); }
            fit();
          }
        }
      }

      /* ════════════════════════════════════════════════════════════
         RENDER
         ════════════════════════════════════════════════════════════ */

      /* ── WebGL 3D background layer ───────────────────────────── */
      if (gl && glProgram) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(glProgram);
        gl.uniform1f(glTimeLoc, tm);
        gl.uniform2f(glResLoc, glCv.width, glCv.height);
        gl.uniform3f(glAccLoc, accR, accG, accB);
        const dpr = perf === "high" ? (devicePixelRatio || 1) : Math.min(devicePixelRatio || 1, 1.5);
        gl.uniform2f(glPosLoc, (P.x + w / 2) * dpr, (H - P.y - h / 2) * dpr);
        gl.uniform1f(glMagLoc, P.mag > 0 ? Math.min(P.mag / 60, 1) : 0);
        gl.uniform1f(glInvLoc, P.inv > 80 ? 1 : 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      /* ── 2D Canvas layer ─────────────────────────────────────── */
      cx.clearRect(0, 0, W, H);

      // Ground line
      cx.fillStyle = ACC;
      for (let x = 0; x < W; x += 16) cx.fillRect(x, gy - 4, 8, 4);

      // Coins (3D spinning effect)
      coins.forEach((c) => {
        const phase = tm * 4 + c.id;
        const wd = Math.abs(Math.cos(phase)) * 14 + 2;
        const shine = Math.sin(phase) * 0.5 + 0.5;
        // Shadow
        cx.fillStyle = "rgba(0,0,0,0.2)";
        cx.beginPath();
        cx.ellipse(c.x, c.y + 10, wd / 2 + 1, 3, 0, 0, Math.PI * 2);
        cx.fill();
        // Coin body
        cx.fillStyle = "#0b0b0d";
        cx.fillRect(c.x - wd / 2 - 2, c.y - 9, wd + 4, 18);
        // Gradient coin
        const coinGrad = cx.createLinearGradient(c.x - wd / 2, c.y - 7, c.x + wd / 2, c.y + 7);
        coinGrad.addColorStop(0, ACC);
        coinGrad.addColorStop(shine, "#ffd700");
        coinGrad.addColorStop(1, ACC);
        cx.fillStyle = coinGrad;
        cx.fillRect(c.x - wd / 2, c.y - 7, wd, 14);
        if (wd > 8) { cx.fillStyle = "#f0ede8"; cx.fillRect(c.x - 2, c.y - 3, 4, 6); }
      });

      // Bugs
      bugs.forEach((b) => {
        if (!b.alive) return;
        outlined(BUG_BODY.concat([BUG_LEGS[(fr >> 4) & 1]]), b.x, b.y, 4, b.d);
        cx.font = `${Math.max(7, SCALE * 2)}px "Press Start 2P",monospace`;
        cx.fillStyle = "#2f9e44";
        cx.fillText(b.l, b.x + BW / 2 - b.l.length * 3.5, b.y - 6);
      });

      // Data drops (3D rotating effect)
      drops.forEach((d) => {
        const s = 14, x = d.x - s / 2, y = d.y - s / 2;
        const rot = tm * 3 + d.x;
        const scaleX = Math.abs(Math.cos(rot));
        // Shadow
        cx.fillStyle = "rgba(0,0,0,0.15)";
        cx.beginPath();
        cx.ellipse(d.x, d.y + s, s * 0.3, 2, 0, 0, Math.PI * 2);
        cx.fill();
        // Body
        cx.save();
        cx.translate(d.x, d.y);
        cx.scale(scaleX * 0.7 + 0.3, 1);
        cx.fillStyle = "#0b0b0d";
        cx.fillRect(-s / 2 - 2, -s / 2 - 2, s + 4, s + 4);
        cx.fillStyle = d.t === "o" ? ACC : d.t === "z" ? "#2f9e44" : "#f0ede8";
        cx.fillRect(-s / 2, -s / 2, s, s);
        cx.fillStyle = "#0b0b0d";
        if (d.t === "o") { cx.fillRect(-s / 2 + 3, -s / 2 + 3, 3, 3); cx.fillRect(-s / 2 + 8, -s / 2 + 3, 3, 3); cx.fillRect(-s / 2 + 5, -s / 2 + 6, 4, 3); cx.fillRect(-s / 2 + 3, -s / 2 + 9, 3, 3); cx.fillRect(-s / 2 + 8, -s / 2 + 9, 3, 3); }
        else if (d.t === "z") { cx.fillRect(-s / 2 + 3, -s / 2 + 3, 8, 2); cx.fillRect(-s / 2 + 3, -s / 2 + 11, 8, 2); }
        else cx.fillRect(-s / 2 + 4, -s / 2 + 4, 2, 2);
        cx.restore();
      });

      // Magnet aura
      if (P.mag > 0) {
        const magAlpha = Math.min(P.mag / 60, 1) * 0.4;
        cx.save();
        cx.strokeStyle = "#2f9e44";
        cx.lineWidth = 2;
        cx.globalAlpha = magAlpha;
        const magR = 18 + Math.sin(tm * 4) * 4;
        cx.setLineDash([6, 6]);
        cx.beginPath();
        cx.arc(P.x + w / 2, P.y + h / 2, w / 2 + magR, 0, Math.PI * 2);
        cx.stroke();
        cx.setLineDash([]);
        // Inner glow
        const magGrad = cx.createRadialGradient(P.x + w / 2, P.y + h / 2, 0, P.x + w / 2, P.y + h / 2, w / 2 + magR);
        magGrad.addColorStop(0, "rgba(47,158,68,0.08)");
        magGrad.addColorStop(1, "rgba(47,158,68,0)");
        cx.fillStyle = magGrad;
        cx.fill();
        cx.restore();
      }

      // Particles
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]; p.x += p.vx; p.y += p.vy; p.vy += .12;
        if (--p.l <= 0) { ps.splice(i, 1); continue; }
        cx.globalAlpha = Math.min(1, p.l / 15);
        cx.fillStyle = p.c;
        cx.fillRect(p.x, p.y, p.z, p.z);
      }
      cx.globalAlpha = 1;

      // Character trail (ghost effect)
      P.trail.forEach((tr: any) => {
        if (tr.a < 0.03) return;
        cx.globalAlpha = tr.a;
        cx.fillStyle = ACC;
        cx.beginPath();
        cx.arc(tr.x, tr.y, SCALE * 2, 0, Math.PI * 2);
        cx.fill();
      });
      cx.globalAlpha = 1;

      // Character
      if (!(P.inv > 0 && (P.inv >> 2) & 1)) {
        const cw = charW(), ch2 = charH();
        // 3D shadow under character
        drawCharShadow(P.x, P.y, cw, ch2);
        // Squash & stretch
        cx.save();
        cx.translate(P.x + cw / 2, P.y + ch2);
        cx.scale(1 + P.sq * .6, 1 - P.sq * .8);
        const charSprite = drawCharacter(P.f, P.on, P.vx, P.t, P.j);
        outlined(charSprite, -cw / 2, -ch2, SCALE, P.f);
        cx.restore();
      }

      // Damage flash
      if (P.inv > 80) { cx.fillStyle = "rgba(232,84,42,.14)"; cx.fillRect(0, 0, W, H); }

      // Player label
      cx.font = `${Math.max(8, SCALE * 2)}px "Press Start 2P",monospace`;
      cx.fillStyle = "#0b0b0d";
      cx.fillText("P1", P.x + w / 2 - 7, P.y - SCALE * 2 - 1);
      cx.fillStyle = ACC;
      cx.fillText("P1", P.x + w / 2 - 8, P.y - SCALE * 2 - 2);

      // Floating text
      for (let i = ft.length - 1; i >= 0; i--) {
        const f = ft[i]; f.y -= .8;
        if (--f.l <= 0) { ft.splice(i, 1); continue; }
        cx.globalAlpha = Math.min(1, f.l / 15);
        // Text shadow
        cx.fillStyle = "#0b0b0d";
        cx.font = `${Math.max(10, SCALE * 2.5)}px "Press Start 2P",monospace`;
        cx.fillText(f.t, f.x - 19, f.y + 1);
        cx.fillStyle = ACC;
        cx.fillText(f.t, f.x - 20, f.y);
      }
      cx.globalAlpha = 1;

      drawChart();
      raf = requestAnimationFrame(frame);
    }

    /* ── Bootstrap ─────────────────────────────────────────────── */
    document.fonts?.load('8px "Press Start 2P"');
    document.fonts?.ready?.then(() => { textOffsets = new WeakMap<HTMLElement, number>(); init(); });
    rs(); mkBugs(); hud(); frame();
    addEventListener("resize", rs);
    rzT = setTimeout(() => { textOffsets = new WeakMap<HTMLElement, number>(); init(); mkBugs(); }, 900);

    return () => {
      cancelAnimationFrame(raf); clearTimeout(tt); clearTimeout(rzT); clearTimeout(winT); clearTimeout(depT);
      removeEventListener("keydown", onDown); removeEventListener("keyup", onUp); removeEventListener("resize", rs);
      document.querySelectorAll(".lv5-btn").forEach((b) => b.classList.remove("gm-pulse"));
      ac?.close?.();
      if (gl) {
        if (glBuf) gl.deleteBuffer(glBuf);
        if (glProgram) gl.deleteProgram(glProgram);
        const ext = gl.getExtension("WEBGL_lose_context");
        ext?.loseContext();
      }
    };
  }, [getScale]);

  return (
    <div className="gm-root" ref={rootRef}>
      {/* WebGL layer (3D effects - behind 2D canvas) */}
      <canvas className="gm-gl" data-id="gl" />
      {/* 2D Canvas layer (sprites, coins, bugs) */}
      <canvas className="gm-cv" data-id="cv" />
      {/* Toast notification */}
      <div className="gm-ts" data-id="ts" />
      {/* HUD Panel */}
      <div className="gm-hud">
        <div className="gm-hud__header">
          <span className="gm-hud__title">GAME MODE</span>
          <button data-id="mu" type="button" className="gm-hud__mute">♪</button>
        </div>
        <div className="gm-r">
          <span>LV <em data-id="lv">1</em></span>
          <span>XP <em data-id="xpn">0</em></span>
          <span data-id="hp">♥♥♥</span>
        </div>
        <div className="gm-xp"><i data-id="xp" /></div>
        <div className="gm-stats-grid">
          <div className="gm-stat-item">
            <span className="gm-stat-label">COINS</span>
            <span className="gm-stat-value"><em data-id="sc">0</em>/<span data-id="tt">0</span></span>
          </div>
          <div className="gm-stat-item">
            <span className="gm-stat-label">CLEANED</span>
            <span className="gm-stat-value"><em data-id="cl">0</em></span>
          </div>
          <div className="gm-stat-item">
            <span className="gm-stat-label">MODEL R²</span>
            <span className="gm-stat-value"><em data-id="r2">0.00</em></span>
          </div>
        </div>
        <canvas data-id="ch" width={180} height={70} className="gm-chart" />
        <div data-id="msg" className="gm-blink gm-msg">PRESS ANY KEY</div>
        <div className="gm-instructions">
          <span>ARROWS/WASD · SPACE JUMP x2</span>
          <span>CATCH DATA, DODGE OUTLIERS (X)</span>
          <span>STOMP NaN BUGS · GREEN Z = MAGNET</span>
          <span>R² 0.85+ = MODEL DEPLOYED</span>
        </div>
        <button type="button" className="gm-exit" onClick={() => closeRef.current()}>✕ EXIT GAME (ESC)</button>
      </div>
      {/* Mobile touch controls */}
      <div className="gm-pad">
        <div className="gm-pad__left">
          <button type="button" data-k="l" aria-label="Move left">◀</button>
          <button type="button" data-k="r" aria-label="Move right">▶</button>
        </div>
        <button type="button" data-k="j" className="gm-pad__jump" aria-label="Jump">▲</button>
      </div>
    </div>
  );
}
