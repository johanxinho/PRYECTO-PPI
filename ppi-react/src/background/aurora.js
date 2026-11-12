// Fondo ambiental tipo aurora: un único contexto WebGL para toda la app.
// Se dibuja a baja resolución (es un degradado difuso), a 30 fps y con
// degradación automática si el dispositivo no sostiene el ritmo.

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;

uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_pointer;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.55;
  for (int i = 0; i < 3; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y) * 1.35;

  float t = u_time * 0.028;
  vec2 drift = vec2(t * 0.6, -t * 0.4);
  vec2 q = vec2(fbm(p + drift), fbm(p + vec2(4.7, 1.9) - drift));
  float field = fbm(p + 1.9 * q + vec2(t * 0.9, t * 0.35));

  // Paleta de marca: azul noche, índigo, lila y un toque cálido.
  vec3 navy = vec3(0.043, 0.055, 0.145);
  vec3 indigo = vec3(0.165, 0.145, 0.430);
  vec3 lilac = vec3(0.520, 0.400, 0.880);
  vec3 warm = vec3(0.900, 0.620, 0.340);

  vec3 color = mix(navy, indigo, smoothstep(0.08, 0.82, field));
  color = mix(color, lilac, smoothstep(0.46, 1.0, q.x) * 0.55);
  color += lilac * 0.16 * smoothstep(0.42, 1.0, field);
  color = mix(color, warm, smoothstep(0.74, 1.0, field) * 0.12);

  // Presencia muy leve del puntero, solo en equipos con mouse.
  vec2 pointer = (u_pointer * 0.5 + 0.5);
  float glow = smoothstep(0.62, 0.0, distance(vec2(uv.x * aspect, uv.y), vec2(pointer.x * aspect, pointer.y)));
  color += vec3(0.085, 0.065, 0.130) * glow;

  // Viñeta para que los bordes no compitan con el contenido.
  float vignette = smoothstep(1.25, 0.30, length(uv - 0.5));
  color *= mix(0.74, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log || "No se pudo compilar el shader ambiental");
  }
  return shader;
}

export function createAurora(canvas, { animate = true, onLowFps, onLost } = {}) {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  let program;
  try {
    const vertex = compile(gl, gl.VERTEX_SHADER, VERT);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "No se pudo enlazar el programa");
    }
  } catch (error) {
    if (program) gl.deleteProgram(program);
    return null;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(program);

  const loc = {
    res: gl.getUniformLocation(program, "u_res"),
    time: gl.getUniformLocation(program, "u_time"),
    pointer: gl.getUniformLocation(program, "u_pointer"),
  };

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let raf = 0;
  let running = false;
  let destroyed = false;
  let contextLost = false;
  let quality = 1;
  let frames = 0;
  let windowStart = 0;
  let lowWindows = 0;
  const startedAt = performance.now();
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const pointerFine = window.matchMedia?.("(pointer: fine)");

  function size() {
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, rect.width || window.innerWidth);
    const cssHeight = Math.max(1, rect.height || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    // Techo de píxeles: el fondo es difuso, no necesita nitidez.
    const budget = Math.sqrt(760000 / (cssWidth * cssHeight));
    const scale = Math.max(0.5, Math.min(dpr, budget) * quality);
    const width = Math.max(1, Math.round(cssWidth * scale));
    const height = Math.max(1, Math.round(cssHeight * scale));
    if (canvas.width === width && canvas.height === height) return false;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    return true;
  }

  function draw(now) {
    if (contextLost || gl.isContextLost()) return;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    const time = reduce?.matches ? 12.5 : ((now - startedAt) / 1000);
    gl.uniform2f(loc.res, canvas.width, canvas.height);
    gl.uniform1f(loc.time, time);
    gl.uniform2f(loc.pointer, pointer.x, pointer.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function degrade() {
    if (quality > 0.6) {
      quality = 0.62;
      size();
      draw(performance.now());
      return false;
    }
    return true;
  }

  function loop(now) {
    raf = 0;
    if (!running || contextLost || destroyed) return;
    raf = window.requestAnimationFrame(loop);
    if (now - (loop.last || 0) < 32) return; // ~30 fps
    loop.last = now;
    draw(now);

    if (!windowStart) windowStart = now;
    frames += 1;
    const elapsed = now - windowStart;
    if (elapsed >= 1600) {
      const fps = (frames * 1000) / elapsed;
      frames = 0;
      windowStart = now;
      if (fps < 45) {
        lowWindows += 1;
        if (lowWindows >= 1 && degrade()) {
          running = false;
          if (raf) window.cancelAnimationFrame(raf);
          raf = 0;
          onLowFps?.();
        }
      } else {
        lowWindows = 0;
      }
    }
  }

  function start() {
    if (destroyed || contextLost) return;
    running = true;
    size();
    draw(performance.now());
    if (animate && !reduce?.matches && !raf) {
      windowStart = 0;
      raf = window.requestAnimationFrame(loop);
    }
  }

  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  function onVisibility() {
    if (document.hidden) stop();
    else start();
  }

  function onPointerMove(event) {
    if (!pointerFine?.matches) return;
    pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = 1 - (event.clientY / window.innerHeight) * 2;
  }

  function onResize() {
    if (size()) draw(performance.now());
  }

  function onContextLost(event) {
    event.preventDefault();
    contextLost = true;
    stop();
    onLost?.();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stop();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    if (!gl.isContextLost()) {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    }
  }

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("webglcontextlost", onContextLost, false);

  return { start, stop, drawStatic: () => draw(performance.now()), resize: onResize, destroy };
}
