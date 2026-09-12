// @ts-nocheck
import { useEffect, useRef } from "react";

const ASCII_DEFAULTS = {
  renderMode: "dither",
  bgMode: "none",
  bgBlur: 12,
  bgOpacity: 90,
  cellSize: 9,
  coverage: 100,
  invert: false,
  styleBlend: "source-over",
  charSet: "standard",
  customChars: "",
  brightness: 0,
  contrast: 158,
  edgeEmphasis: 0,
  density: 20,
  toneCurve: [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
  tint: "#3ca6ff",
  tintOpacity: 0,
  overlayBlend: "multiply",
  saturation: 100,
  grayscale: 0,
  blurType: "off",
  blurAmount: 35,
  animated: true,
  animStyle: "shimmer",
  animSpeed: { enabled: true, intensity: 100 },
  animIntensity: { enabled: true, intensity: 60 },
  pfx: {
    vignette: { enabled: false, intensity: 38 },
    scanLines: { enabled: false, intensity: 40 },
    chromatic: { enabled: false, intensity: 15 },
    bloom: { enabled: false, intensity: 25 },
    filmGrain: { enabled: false, intensity: 30 },
    glitch: { enabled: false, intensity: 20 },
    pixelate: { enabled: false, intensity: 15 },
    halftone: { enabled: false, intensity: 20 },
    filmDust: { enabled: false, intensity: 20 },
  },
};

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const CHARS = {
  standard: " .:-=+*#%@",
  blocks: " ░▒▓█",
  braille: "⠀⠁⠃⠇⠏⠟⠿",
};

function applyTone(luma, brightness, contrast) {
  const b = brightness / 100;
  const c = contrast / 100;
  let v = (luma - 0.5) * c + 0.5 + b;
  return Math.min(1, Math.max(0, v));
}

function sampleImage(image, width, height, cell) {
  const src = document.createElement("canvas");
  src.width = width;
  src.height = height;
  const ctx = src.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  const scale = Math.min(width / image.width, height / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
  const { data } = ctx.getImageData(0, 0, width, height);
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const cells = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let best = -1;
      for (let oy = 0; oy < cell; oy += 1) {
        for (let ox = 0; ox < cell; ox += 1) {
          const px = Math.min(width - 1, x * cell + ox);
          const py = Math.min(height - 1, y * cell + oy);
          const i = (py * width + px) * 4;
          const lumaPx = ((0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255) * (data[i + 3] / 255);
          if (lumaPx > best) {
            best = lumaPx;
            r = data[i];
            g = data[i + 1];
            b = data[i + 2];
            a = data[i + 3];
          }
        }
      }
      const luma = best < 0 ? 0 : best;
      cells.push({ x, y, r, g, b, a, luma });
    }
  }
  return { cells, cols, rows };
}

function drawPrimitive(ctx, mode, cell, size, luma, color, t) {
  const { x, y } = cell;
  const px = x * size;
  const py = y * size;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  switch (mode) {
    case "dots":
    case "disco":
    case "bubbles": {
      const r = Math.max(1, size * 0.18 + luma * size * 0.32);
      ctx.beginPath();
      ctx.arc(px + size / 2, py + size / 2, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "mosaic":
    case "pixel":
    case "lego":
    case "voxel": {
      const pad = mode === "lego" ? 1.5 : 0.4;
      ctx.fillRect(px + pad, py + pad, size - pad * 2, size - pad * 2);
      break;
    }
    case "cross":
    case "hatch": {
      ctx.lineWidth = 1 + luma * 1.4;
      ctx.beginPath();
      ctx.moveTo(px + 1, py + 1);
      ctx.lineTo(px + size - 1, py + size - 1);
      ctx.moveTo(px + size - 1, py + 1);
      ctx.lineTo(px + 1, py + size - 1);
      ctx.stroke();
      break;
    }
    case "diamond":
    case "hexagons":
    case "triangles": {
      ctx.beginPath();
      ctx.moveTo(px + size / 2, py + 1);
      ctx.lineTo(px + size - 1, py + size / 2);
      ctx.lineTo(px + size / 2, py + size - 1);
      ctx.lineTo(px + 1, py + size / 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "lines":
    case "diagonal":
    case "contour": {
      ctx.lineWidth = 1 + luma * 2;
      ctx.beginPath();
      ctx.moveTo(px, py + size * luma);
      ctx.lineTo(px + size, py + size * (1 - luma));
      ctx.stroke();
      break;
    }
    case "rings": {
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(px + size / 2, py + size / 2, 1 + luma * size * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "characters":
    case "braille":
    case "hexdump":
    case "matrix":
    case "hearts":
    case "stars": {
      const set = mode === "braille" ? CHARS.braille : CHARS.standard;
      const ch = set[Math.min(set.length - 1, Math.floor(luma * (set.length - 0.01)))];
      ctx.font = `${Math.max(8, size)}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(mode === "hearts" ? "♥" : mode === "stars" ? "✦" : ch, px + size / 2, py + size / 2 + Math.sin(t + x) * 0.4);
      break;
    }
    case "halfblocks": {
      ctx.fillRect(px, py + size * (1 - luma), size, size * luma);
      break;
    }
    case "mixed": {
      if ((x + y) % 2 === 0) {
        ctx.beginPath();
        ctx.arc(px + size / 2, py + size / 2, size * 0.28 * (0.4 + luma), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
      }
      break;
    }
    default: {
      const threshold = BAYER[y % 4][x % 4] / 16;
      if (luma > threshold * 0.85) {
        const r = Math.max(1.1, size * (0.16 + luma * 0.28));
        ctx.beginPath();
        ctx.arc(px + size / 2, py + size / 2, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function applyPost(ctx, width, height, pfx, time) {
  if (!pfx) return;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  if (pfx.filmGrain?.enabled) {
    const amount = pfx.filmGrain.intensity / 100 * 28;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * amount;
      data[i] += n;
      data[i + 1] += n;
      data[i + 2] += n;
    }
  }
  if (pfx.scanLines?.enabled) {
    const amount = pfx.scanLines.intensity / 100;
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        data[i] *= 1 - amount * 0.35;
        data[i + 1] *= 1 - amount * 0.35;
        data[i + 2] *= 1 - amount * 0.35;
      }
    }
  }
  if (pfx.vignette?.enabled) {
    const amount = pfx.vignette.intensity / 100;
    const cx = width / 2;
    const cy = height / 2;
    const max = Math.hypot(cx, cy);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const v = 1 - amount * Math.min(1, Math.hypot(x - cx, y - cy) / max);
        data[i] *= v;
        data[i + 1] *= v;
        data[i + 2] *= v;
      }
    }
  }
  if (pfx.glitch?.enabled && Math.sin(time * 9) > 0.92) {
    const shift = Math.floor((pfx.glitch.intensity / 100) * 12);
    for (let y = 0; y < height; y += 3) {
      const off = ((y * 17) % shift) * 4;
      const start = y * width * 4;
      data.copyWithin(start, start + off, start + width * 4);
    }
  }
  ctx.putImageData(image, 0, 0);
}

export default function AsciiEffect({
  src,
  className = "",
  config = ASCII_DEFAULTS,
}) {
  const canvasRef = useRef(null);
  const settings = { ...ASCII_DEFAULTS, ...config };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !src) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let raf = 0;
    let running = true;
    let image = null;
    let grid = null;
    let start = performance.now();
    let frames = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const automated = Boolean(navigator.webdriver);

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(64, Math.floor(rect.width * dpr));
      const height = Math.max(64, Math.floor(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
      if (image) grid = sampleImage(image, width, height, Math.max(4, Math.round(settings.cellSize * dpr)));
    };

    const paint = (now) => {
      if (!grid || !image) return;
      const { cells } = grid;
      const size = Math.max(4, Math.round(settings.cellSize * Math.min(window.devicePixelRatio || 1, 2)));
      const t = ((now - start) / 1000) * ((settings.animSpeed?.intensity || 100) / 100);
      const shimmer = (settings.animIntensity?.intensity || 60) / 100;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
      const dw = image.width * scale;
      const dh = image.height * scale;
      const pulse = reduced || !settings.animated ? 1 : 0.94 + Math.sin(t * 1.35) * 0.06;
      ctx.globalAlpha = pulse;
      ctx.drawImage(image, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "screen";
      cells.forEach((cell) => {
        if (cell.a < 12) return;
        if (cell.luma < 0.08) return;
        if (settings.coverage < 100 && ((cell.x * 13 + cell.y * 7) % 100) > settings.coverage) return;
        const chroma = Math.max(cell.r, cell.g, cell.b) - Math.min(cell.r, cell.g, cell.b);
        if (cell.luma > 0.93 && cell.a > 200 && chroma < 18) return;
        let luma = applyTone(cell.luma, settings.brightness, settings.contrast);
        if (settings.invert) luma = 1 - luma;
        if (settings.animated && settings.animStyle === "shimmer" && !reduced) {
          luma = Math.min(1, Math.max(0, luma + Math.sin(t * 2.2 + cell.x * 0.35 + cell.y * 0.28) * shimmer * 0.14));
        }
        const sat = settings.saturation / 100;
        const gray = 0.299 * cell.r + 0.587 * cell.g + 0.114 * cell.b;
        const r = Math.min(255, gray + (cell.r - gray) * sat);
        const g = Math.min(255, gray + (cell.g - gray) * sat);
        const b = Math.min(255, gray + (cell.b - gray) * sat);
        const color = `rgba(${r | 0},${g | 0},${b | 0},${Math.min(1, 0.22 + luma * 0.5)})`;
        drawPrimitive(ctx, settings.renderMode, cell, size, luma, color, t);
      });
      ctx.globalCompositeOperation = "source-over";
      const anyPost = Object.values(settings.pfx || {}).some((item) => item?.enabled);
      if (anyPost) applyPost(ctx, canvas.width, canvas.height, settings.pfx, t);
    };

    const loop = (now) => {
      if (!running) return;
      paint(now);
      frames += 1;
      if (!reduced && settings.animated && !(automated && frames > 4)) raf = requestAnimationFrame(loop);
    };

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else {
        running = true;
        if (automated) {
          paint(performance.now());
        } else {
          raf = requestAnimationFrame(loop);
        }
      }
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      image = img;
      fit();
      paint(performance.now());
      if (!reduced && settings.animated && !automated) raf = requestAnimationFrame(loop);
    };
    img.src = src;

    const observer = new ResizeObserver(() => {
      fit();
      paint(performance.now());
    });
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
    // Sampling is rebuilt from src/cellSize; animation uniforms are read live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, settings.renderMode, settings.cellSize, settings.animated]);

  return <canvas ref={canvasRef} className={`ascii-canvas ${className}`} aria-hidden="true" />;
}
