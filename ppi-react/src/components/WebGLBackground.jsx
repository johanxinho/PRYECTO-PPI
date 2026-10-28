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
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
      failIfMajorPerformanceCaveat: false,
    });
    if (!gl) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const automated = Boolean(navigator.webdriver);
    const maxPixels = 1600 * 900;
    let program;
    let buffer;
    let raf = 0;
    let readyRaf = 0;
    let running = true;
    let contextLost = false;
    let frozen = reduced.matches;
    let hiddenAt = 0;
    let start = performance.now();
    let lastDraw = 0;
    const mouse = { x: 0, y: 0, presence: 0, target: 0 };

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
      if (program) gl.deleteProgram(program);
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

    const stopFrames = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };
    const canAnimate = () =>
      running && !document.hidden && !contextLost && !frozen && !reduced.matches && !automated;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const cssWidth = rect.width || window.innerWidth;
      const cssHeight = rect.height || window.innerHeight;
      let scale = Math.min(window.devicePixelRatio || 1, 2);
      const area = Math.max(1, cssWidth * cssHeight);
      scale = Math.min(scale, Math.sqrt(maxPixels / area));
      const width = Math.max(1, Math.floor(cssWidth * scale));
      const height = Math.max(1, Math.floor(cssHeight * scale));
      if (canvas.width === width && canvas.height === height) return false;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      return true;
    };

    const draw = (now) => {
      if (contextLost || gl.isContextLost()) return;
      const time = frozen || reduced.matches ? 0.4 : ((now - start) / 1000) * 0.67;
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
      raf = 0;
      if (!canAnimate()) return;
      if (now - lastDraw >= 32) {
        draw(now);
        lastDraw = now;
      }
      scheduleFrame();
    };
    const scheduleFrame = () => {
      if (!canAnimate() || raf) return;
      raf = window.requestAnimationFrame(loop);
    };
    const resizeAndDraw = () => {
      if (resize() && !document.hidden) draw(performance.now());
    };

    const onPointer = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = 1 - (event.clientY / window.innerHeight) * 2;
      mouse.target = 1;
    };
    const onLeave = () => {
      mouse.target = 0;
    };
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = performance.now();
        running = false;
        stopFrames();
        return;
      }
      if (hiddenAt) start += performance.now() - hiddenAt;
      hiddenAt = 0;
      running = true;
      draw(performance.now());
      scheduleFrame();
    };
    const onReducedMotion = (event) => {
      frozen = event.matches;
      if (frozen) {
        stopFrames();
        draw(performance.now());
      } else {
        scheduleFrame();
      }
    };
    const onContextLost = (event) => {
      event.preventDefault();
      contextLost = true;
      running = false;
      stopFrames();
      setOk(false);
    };

    canvas.addEventListener("webglcontextlost", onContextLost, false);
    resize();
    draw(performance.now());
    readyRaf = window.requestAnimationFrame(() => {
      readyRaf = 0;
      if (!contextLost) setOk(true);
    });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", resizeAndDraw, { passive: true });
    window.visualViewport?.addEventListener("resize", resizeAndDraw, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    if (reduced.addEventListener) reduced.addEventListener("change", onReducedMotion);
    else reduced.addListener?.(onReducedMotion);

    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resizeAndDraw);
    observer?.observe(canvas);
    scheduleFrame();

    return () => {
      running = false;
      stopFrames();
      if (readyRaf) window.cancelAnimationFrame(readyRaf);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resizeAndDraw);
      window.visualViewport?.removeEventListener("resize", resizeAndDraw);
      document.removeEventListener("visibilitychange", onVisibility);
      if (reduced.removeEventListener) reduced.removeEventListener("change", onReducedMotion);
      else reduced.removeListener?.(onReducedMotion);
      observer?.disconnect();
      if (!gl.isContextLost()) {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      }
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
