import { useEffect, useRef } from "react";

const COLS = 48;
const ROWS = 30;

type Anchor = {
  nx: number;
  ny: number;
  amp: number;
  r: number;
  label?: string;
  isHub?: boolean;
  cx?: number;
  cy?: number;
};

const ANCHORS: Anchor[] = [
  { nx: 0.5, ny: 0.56, amp: 0.42, r: 0.085, isHub: true },
  { nx: 0.2, ny: 0.24, amp: 0.9, r: 0.06, label: "TECH" },
  { nx: 0.8, ny: 0.21, amp: 1.0, r: 0.055, label: "AI" },
  { nx: 0.17, ny: 0.8, amp: 0.78, r: 0.06, label: "FINANCE" },
  { nx: 0.83, ny: 0.8, amp: 0.84, r: 0.06, label: "ENG" },
];
const HUB = ANCHORS[0];
const DOMAINS = ANCHORS.slice(1);

// precompute bezier control points (hub -> each domain), gentle alternating bend
DOMAINS.forEach((d, i) => {
  const mx = (HUB.nx + d.nx) / 2;
  const my = (HUB.ny + d.ny) / 2;
  const dx = d.nx - HUB.nx;
  const dy = d.ny - HUB.ny;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const bend = 0.1 * (i % 2 === 0 ? 1 : -1);
  d.cx = mx + px * bend;
  d.cy = my + py * bend;
});

const COL_DEEP: [number, number, number] = [58, 18, 16];
const COL_MID: [number, number, number] = [224, 90, 53]; // #e05a35
const COL_PEAK: [number, number, number] = [240, 237, 232]; // #f0ede8

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function noise2D(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < 3; i++) {
    s += noise2D(x * f, y * f) * amp;
    amp *= 0.5;
    f *= 2.1;
  }
  return s;
}
function terrainHeight(nx: number, ny: number, t: number) {
  let h = 0;
  for (const a of ANCHORS) {
    const dx = nx - a.nx;
    const dy = ny - a.ny;
    h += a.amp * Math.exp(-(dx * dx + dy * dy) / (2 * a.r * a.r));
  }
  h += fbm(nx * 3.2 + t * 6, ny * 3.2 + t * 4.6) * 0.14;
  return h;
}
function lerp(a: number, b: number, u: number) {
  return a + (b - a) * u;
}
function lerpColor(a: [number, number, number], b: [number, number, number], u: number) {
  return [0, 1, 2].map((i) => Math.round(lerp(a[i], b[i], u)));
}
function heightColor(n: number, near: boolean) {
  n = Math.max(0, Math.min(1, n));
  const [r, g, b] =
    n < 0.55 ? lerpColor(COL_DEEP, COL_MID, n / 0.55) : lerpColor(COL_MID, COL_PEAK, (n - 0.55) / 0.45);
  return `rgba(${r},${g},${b},${near ? 1 : 0.85})`;
}
function bezier(p0x: number, p0y: number, cx: number, cy: number, p1x: number, p1y: number, s: number) {
  const u = 1 - s;
  return {
    x: u * u * p0x + 2 * u * s * cx + s * s * p1x,
    y: u * u * p0y + 2 * u * s * cy + s * s * p1y,
  };
}

export function LibraryHeroVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, active: false });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let t = 0;
    let hoverAmt = 0;

    function resize() {
      const rect = container!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      canvas!.style.width = `${rect.width}px`;
      canvas!.style.height = `${rect.height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawBookIcon(x: number, y: number, scale: number, glow: number) {
      ctx!.save();
      ctx!.translate(x - 14 * scale, y - 13 * scale);
      ctx!.scale(scale, scale);
      ctx!.beginPath();
      ctx!.moveTo(2, 4);
      ctx!.bezierCurveTo(8, 2, 12, 5, 14, 6);
      ctx!.bezierCurveTo(16, 5, 20, 2, 26, 4);
      ctx!.lineTo(26, 22);
      ctx!.bezierCurveTo(20, 20, 16, 22, 14, 23);
      ctx!.bezierCurveTo(12, 22, 8, 20, 2, 22);
      ctx!.closePath();
      ctx!.fillStyle = "#0e0e10";
      ctx!.fill();
      ctx!.strokeStyle = `rgba(224,90,53,${0.75 + glow * 0.25})`;
      ctx!.lineWidth = 1.5;
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(14, 6);
      ctx!.lineTo(14, 23);
      ctx!.stroke();
      ctx!.strokeStyle = `rgba(240,237,232,${0.35 + glow * 0.25})`;
      ctx!.lineWidth = 1;
      ([
        [6, 9, 10, 8],
        [6, 13, 10, 12],
        [18, 8, 22, 9],
        [18, 12, 22, 13],
      ] as [number, number, number, number][]).forEach(([x1, y1, x2, y2]) => {
        ctx!.beginPath();
        ctx!.moveTo(x1, y1);
        ctx!.lineTo(x2, y2);
        ctx!.stroke();
      });
      ctx!.restore();
    }

    function draw() {
      const w = canvas!.width / dpr;
      const h = canvas!.height / dpr;
      const mouse = mouseRef.current;
      hoverAmt += ((mouse.active ? 1 : 0) - hoverAmt) * 0.06;

      ctx!.clearRect(0, 0, w, h);
      ctx!.fillStyle = "#0e0e10";
      ctx!.fillRect(0, 0, w, h);

      ctx!.save();
      ctx!.strokeStyle = `rgba(255,255,255,${0.05 + hoverAmt * 0.02})`;
      ctx!.lineWidth = 1;
      const gap = 24;
      const shear = h * 0.32;
      for (let x = -h; x < w + h; x += gap) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x + shear, h);
        ctx!.stroke();
      }
      ctx!.restore();

      t += 0.00022 + hoverAmt * 0.00035;

      const tiltX = hoverAmt * (mouse.y - 0.5) * 0.4;
      const tiltY = hoverAmt * (mouse.x - 0.5) * 0.4;
      const originX = w * 0.5;
      const originY = h * 0.22;
      const spanX = w * 0.86;
      const spanY = h * 0.62;
      const amp = h * 0.3;

      function project(nx: number, ny: number, hh: number) {
        const x = originX + (nx - ny) * spanX * 0.5 + tiltY * 40;
        const y = originY + (nx + ny) * spanY * 0.5 - hh * amp + tiltX * 40;
        return { x, y };
      }

      for (let r = 0; r < ROWS; r++) {
        const ny = r / (ROWS - 1);
        ctx!.beginPath();
        let avg = 0;
        for (let c = 0; c < COLS; c++) {
          const nx = c / (COLS - 1);
          const hh = terrainHeight(nx, ny, t);
          avg += hh;
          const p = project(nx, ny, hh);
          if (c === 0) ctx!.moveTo(p.x, p.y);
          else ctx!.lineTo(p.x, p.y);
        }
        avg /= COLS;
        const near = r / (ROWS - 1);
        ctx!.strokeStyle = heightColor(avg / 1.1, near > 0.55);
        ctx!.lineWidth = near > 0.55 ? 1.3 : 1;
        ctx!.globalAlpha = 0.5 + near * 0.5;
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;

      DOMAINS.forEach((d, i) => {
        const N = 28;
        ctx!.beginPath();
        for (let s = 0; s <= N; s++) {
          const u = s / N;
          const b = bezier(HUB.nx, HUB.ny, d.cx!, d.cy!, d.nx, d.ny, u);
          const hh = terrainHeight(b.x, b.y, t) + 0.05;
          const p = project(b.x, b.y, hh);
          if (s === 0) ctx!.moveTo(p.x, p.y);
          else ctx!.lineTo(p.x, p.y);
        }
        ctx!.setLineDash([3, 4]);
        ctx!.strokeStyle = `rgba(240,237,232,${0.25 + hoverAmt * 0.35})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
        ctx!.setLineDash([]);

        for (let s = 1; s < 4; s++) {
          const u = s / 4;
          const b = bezier(HUB.nx, HUB.ny, d.cx!, d.cy!, d.nx, d.ny, u);
          const hh = terrainHeight(b.x, b.y, t) + 0.05;
          const p = project(b.x, b.y, hh);
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(224,90,53,${0.5 + hoverAmt * 0.4})`;
          ctx!.fill();
        }

        const u = (((t * 90 + i * 0.27) % 1) + 1) % 1;
        const b = bezier(HUB.nx, HUB.ny, d.cx!, d.cy!, d.nx, d.ny, u);
        const hh = terrainHeight(b.x, b.y, t) + 0.06;
        const p = project(b.x, b.y, hh);
        ctx!.beginPath();
        ctx!.fillStyle = "rgba(224,90,53,0.85)";
        ctx!.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        ctx!.fill();
        if (hoverAmt > 0.02) {
          ctx!.beginPath();
          ctx!.strokeStyle = `rgba(224,90,53,${hoverAmt * 0.4})`;
          ctx!.arc(p.x, p.y, 6 + hoverAmt * 6, 0, Math.PI * 2);
          ctx!.stroke();
        }

        const peakHH = terrainHeight(d.nx, d.ny, t);
        const pp = project(d.nx, d.ny, peakHH);
        ctx!.font = "600 9px 'Roboto Mono', monospace";
        ctx!.fillStyle = `rgba(240,237,232,${0.4 + hoverAmt * 0.4})`;
        ctx!.textAlign = "center";
        ctx!.fillText(d.label ?? "", pp.x, pp.y - 12);
      });

      const hubHH = terrainHeight(HUB.nx, HUB.ny, t);
      const hp = project(HUB.nx, HUB.ny, hubHH);
      drawBookIcon(hp.x, hp.y, 0.9, hoverAmt);

      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    function onMove(e: PointerEvent) {
      const rect = container!.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = (e.clientY - rect.top) / rect.height;
      mouseRef.current.active = true;
    }
    function onLeave() {
      mouseRef.current.active = false;
    }
    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={containerRef} className="lib-home-visual" aria-hidden="true">
      <canvas ref={canvasRef} className="lib-visual-canvas" />
      <span className="lib-visual-corner lib-visual-corner--tl">+</span>
      <span className="lib-visual-corner lib-visual-corner--tr">+</span>
      <span className="lib-visual-corner lib-visual-corner--bl">+</span>
      <span className="lib-visual-corner lib-visual-corner--br">+</span>
      <span className="lib-visual-tag">LEARN / BUILD / GROW</span>
    </div>
  );
}
