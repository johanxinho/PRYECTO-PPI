// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { HALFTONE_FRAG, HALFTONE_VERT } from "../shaders/halftoneFrag";

const COLORS = [
  [0.043, 0.063, 0.149],
  [0.239, 0.275, 0.91],
  [0.694, 0.549, 1.0],
  [1.0, 0.839, 0.906],
  [1.0, 0.839, 0.906],
  [1.0, 0.839, 0.906],
  [1.0, 0.839, 0.906],
  [1.0, 0.839, 0.906],
];

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log || "shader compile failed");
  }
  return shader;
}

export default function WebGLBackground() {
  const canvasRef = useRef(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
      failIfMajorPerformanceCaveat: false,
    });
    if (!gl) return undefined;

    let program;
    let buffer;
    let raf = 0;
    let running = true;
    let start = performance.now();
    let frozen = false;
    const mouse = { x: 0, y: 0, presence: 0, target: 0 };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const automated = Boolean(navigator.webdriver);
    let frames = 0;
    let lastDraw = 0;

    try {
      const vs = compile(gl, gl.VERTEX_SHADER, HALFTONE_VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, HALFTONE_FRAG);
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.bindAttribLocation(program, 0, "a_position");
      gl.linkProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "link failed");
      }
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    } catch {
      return undefined;
    }

    const loc = {
      colors: Array.from({ length: 8 }, (_, i) => gl.getUniformLocation(program, `u_colors[${i}]`)),
      scene: gl.getUniformLocation(program, "u_scene"),
      shape: gl.getUniformLocation(program, "u_shape"),
      surface: gl.getUniformLocation(program, "u_surface"),
      finish: gl.getUniformLocation(program, "u_finish"),
      transform: gl.getUniformLocation(program, "u_transform"),
      space: gl.getUniformLocation(program, "u_space"),
      cursor: gl.getUniformLocation(program, "u_cursor"),
    };
    COLORS.forEach((color, i) => gl.uniform3fv(loc.colors[i], color));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let width = Math.max(1, Math.floor(window.innerWidth * dpr));
      let height = Math.max(1, Math.floor(window.innerHeight * dpr));
      const maxPixels = 1600 * 900;
      if (width * height > maxPixels) {
        const scale = Math.sqrt(maxPixels / (width * height));
        width = Math.max(1, Math.floor(width * scale));
        height = Math.max(1, Math.floor(height * scale));
      }
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const draw = (now) => {
      const seconds = (now - start) / 1000;
      const time = frozen || reduced.matches ? 0.4 : seconds * 0.67;
      mouse.presence += (mouse.target - mouse.presence) * 0.08;
      gl.uniform4f(loc.scene, canvas.width, canvas.height, time, 4.0);
      gl.uniform4f(loc.shape, 1.26, 1.0, 0.6, 0.0);
      gl.uniform4f(loc.surface, 2.4, 0.91, -0.06, 1.0);
      gl.uniform4f(loc.finish, 4.63, 0.0, 0.006, 0.08);
      gl.uniform4f(loc.transform, 2926.0, 0.14, 0.06, 0.0);
      gl.uniform4f(loc.space, -0.02, 0.0, mouse.x, mouse.y);
      gl.uniform4f(loc.cursor, mouse.presence, 0.0, 0.1, 0.46);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now) => {
      if (!running) return;
      if (now - lastDraw < 32) {
        raf = requestAnimationFrame(loop);
        return;
      }
      lastDraw = now;
      draw(now);
      frames += 1;
      if (frozen || reduced.matches || automated) return;
      raf = requestAnimationFrame(loop);
    };

    const onPointer = (event) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = 1 - (event.clientY / window.innerHeight) * 2;
      mouse.x = x;
      mouse.y = y;
      mouse.target = 1;
    };
    const onLeave = () => {
      mouse.target = 0;
    };
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!automated) {
        running = true;
        start = performance.now() - (performance.now() - start);
        raf = requestAnimationFrame(loop);
      }
    };
    const onReduced = () => {
      frozen = reduced.matches;
      if (frozen) {
        cancelAnimationFrame(raf);
        draw(performance.now());
      } else if (running) {
        raf = requestAnimationFrame(loop);
      }
    };

    resize();
    setOk(true);
    frozen = reduced.matches;
    draw(performance.now());
    if (!frozen && !automated) raf = requestAnimationFrame(loop);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener?.("change", onReduced);
    const observer = new ResizeObserver(resize);
    observer.observe(document.documentElement);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener?.("change", onReduced);
      observer.disconnect();
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    };
  }, []);

  return (
    <div className={`webgl-stack ${ok ? "has-webgl" : "no-webgl"}`} aria-hidden="true">
      <div className="webgl-fallback" />
      <canvas ref={canvasRef} className="webgl-bg" />
      <div className="webgl-ambient" />
    </div>
  );
}
