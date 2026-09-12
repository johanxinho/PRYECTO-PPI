// @ts-nocheck
import { useEffect, useRef, useState } from "react"; // Hooks: efecto, ref al canvas y estado de éxito WebGL.
import { HALFTONE_FRAG, HALFTONE_VERT } from "../shaders/halftoneFrag"; // Shaders GLSL del fondo halftone RECORDATE.

// Paleta de 8 colores RGB 0–1: azul oscuro, índigo, lila y rosados.
const COLORS = [  // Arreglo COLORS.
  [0.043, 0.063, 0.149], // Azul noche de fondo.
  [0.239, 0.275, 0.91], // Índigo RECORDATE.
  [0.694, 0.549, 1.0], // Lila medio.
  [1.0, 0.839, 0.906], // Rosa claro (se repite para suavizar la paleta).
  [1.0, 0.839, 0.906], // Rosa claro.
  [1.0, 0.839, 0.906], // Rosa claro.
  [1.0, 0.839, 0.906], // Rosa claro.
  [1.0, 0.839, 0.906], // Rosa claro.
]; // Cierra el arreglo COLORS.

/**
 * Compila un shader WebGL (vértice o fragmento) y lanza error si falla.
 * Así el alumno ve el log de GLSL en consola en vez de un canvas negro.
 */
function compile(gl, type, source) {  // Abre compile.
  const shader = gl.createShader(type); // Crea el objeto shader vacío.
  gl.shaderSource(shader, source); // Carga el código GLSL.
  gl.compileShader(shader); // Compila en la GPU.
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { // Si la GPU rechazó el código…
    const log = gl.getShaderInfoLog(shader); // Lee el mensaje de error del compilador.
    gl.deleteShader(shader); // Libera el shader inválido.
    throw new Error(log || "shader compile failed"); // Propaga el error al try/catch del efecto.
  } // Fin de compile.
  return shader; // Shader listo para enlazar al programa.
} // Fin de el bloque.

/**
 * Fondo WebGL de pantalla completa: un triángulo enorme + shader de halftone.
 * Sigue el mouse, respeta reduced-motion y se apaga si no hay WebGL.
 */
export default function WebGLBackground() {  // Abre WebGLBackground.
  const canvasRef = useRef(null); // Referencia al <canvas> WebGL.
  const [ok, setOk] = useState(false); // true cuando el contexto y el programa están listos.

  useEffect(() => { // Inicializa WebGL una sola vez al montar.
    const canvas = canvasRef.current; // Nodo canvas del DOM.
    if (!canvas) return undefined; // Sin canvas, no hay nada que hacer.

    const gl = canvas.getContext("webgl", { // Pide un contexto WebGL1 con opciones de ahorro.
      alpha: false, // Sin canal alfa: el fondo es opaco.
      antialias: false, // Sin AA: el shader ya suaviza con smoothstep.
      depth: false, // No usamos buffer de profundidad (es 2D).
      stencil: false, // No usamos stencil.
      premultipliedAlpha: false, // Alfa no premultiplicado.
      preserveDrawingBuffer: true, // Conserva el último frame (capturas/tests).
      powerPreference: "low-power", // Prefiere GPU integrada para no calentar el portátil.
      failIfMajorPerformanceCaveat: false, // Acepta GPU software si hace falta.
    }); // Cierra la llamada y WebGLBackground.
    if (!gl) return undefined; // El navegador no soporta WebGL: se verá el fallback CSS.

    let program; // Programa GPU (vs + fs enlazados).
    let buffer; // Buffer de vértices del triángulo.
    let raf = 0; // Id de requestAnimationFrame.
    let running = true; // El loop está activo.
    let start = performance.now(); // Tiempo de inicio para u_time.
    let frozen = false; // true si reduced-motion o se congeló el tiempo.
    const mouse = { x: 0, y: 0, presence: 0, target: 0 }; // Cursor NDC y suavizado de presencia.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)"); // Media query de accesibilidad.
    const automated = Boolean(navigator.webdriver); // true en Puppeteer/CI: un solo frame.
    let frames = 0; // Contador de frames dibujados.
    let lastDraw = 0; // Timestamp del último draw (para limitar a ~30 fps).

    try { // Cualquier fallo de shader deja el fallback CSS.
      const vs = compile(gl, gl.VERTEX_SHADER, HALFTONE_VERT); // Compila el vertex shader.
      const fs = compile(gl, gl.FRAGMENT_SHADER, HALFTONE_FRAG); // Compila el fragment shader.
      program = gl.createProgram(); // Crea el programa GPU vacío.
      gl.attachShader(program, vs); // Adjunta el vertex.
      gl.attachShader(program, fs); // Adjunta el fragment.
      gl.bindAttribLocation(program, 0, "a_position"); // Fija a_position en el atributo 0.
      gl.linkProgram(program); // Enlaza vs+fs en un ejecutable GPU.
      gl.deleteShader(vs); // Ya está en el programa: se puede borrar el objeto vs.
      gl.deleteShader(fs); // Igual con el fs.
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { // Si el linker falló…
        throw new Error(gl.getProgramInfoLog(program) || "link failed"); // …lanza el log.
      } // Fin de el bloque.
      gl.useProgram(program); // Activa este programa para los draws.
      buffer = gl.createBuffer(); // Crea el VBO del triángulo.
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer); // Lo deja como buffer activo.
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // Triángulo que cubre todo el clip space.
      gl.enableVertexAttribArray(0); // Habilita el atributo 0 (posición).
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); // 2 floats por vértice, sin stride.
    } catch { // Shader o link rotos: no pintamos WebGL.
      return undefined; // El CSS fallback cubre la pantalla.
    } // Fin de el bloque.

    const loc = { // Ubicaciones de uniforms (se consultan una vez).
      colors: Array.from({ length: 8 }, (_, i) => gl.getUniformLocation(program, `u_colors[${i}]`)), // Paleta u_colors[0..7].
      scene: gl.getUniformLocation(program, "u_scene"), // Resolución, tiempo y conteo de colores.
      shape: gl.getUniformLocation(program, "u_shape"), // Escala, intensidad, paramA, warp.
      surface: gl.getUniformLocation(program, "u_surface"), // Detalle, contraste, brillo, saturación.
      finish: gl.getUniformLocation(program, "u_finish"), // Hue, viñeta, blur, grano.
      transform: gl.getUniformLocation(program, "u_transform"), // Semilla, rotación, drift, oklab.
      space: gl.getUniformLocation(program, "u_space"), // Offset y mouse.
      cursor: gl.getUniformLocation(program, "u_cursor"), // Presencia y radio del cursor.
    }; // Fin de el bloque.
    COLORS.forEach((color, i) => gl.uniform3fv(loc.colors[i], color)); // Sube la paleta a la GPU (no cambia por frame).

    const resize = () => { // Ajusta el backing store al viewport, con tope de píxeles.
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // DPR máximo 2.
      let width = Math.max(1, Math.floor(window.innerWidth * dpr)); // Ancho en píxeles reales.
      let height = Math.max(1, Math.floor(window.innerHeight * dpr)); // Alto en píxeles reales.
      const maxPixels = 1600 * 900; // Tope para no saturar GPU de portátil.
      if (width * height > maxPixels) { // Si se pasa del tope…
        const scale = Math.sqrt(maxPixels / (width * height)); // Escala uniforme para conservar aspecto.
        width = Math.max(1, Math.floor(width * scale)); // Nuevo ancho limitado.
        height = Math.max(1, Math.floor(height * scale)); // Nuevo alto limitado.
      } // Fin de el bloque.
      if (canvas.width !== width || canvas.height !== height) { // Solo reasigna si cambió.
        canvas.width = width; // Nuevo ancho del buffer.
        canvas.height = height; // Nuevo alto del buffer.
        gl.viewport(0, 0, width, height); // El viewport cubre todo el canvas.
      } // Fin de el bloque.
      canvas.style.width = "100%"; // El CSS, no el backing store, define el tamaño visual.
      canvas.style.height = "100%"; // Evita que innerHeight*dpr sume un hueco enorme al scroll.
    }; // Fin de el bloque.

    const draw = (now) => { // Envía uniforms y dibuja el triángulo.
      const seconds = (now - start) / 1000; // Segundos desde el montaje.
      const time = frozen || reduced.matches ? 0.4 : seconds * 0.67; // Tiempo congelado o animado más lento.
      mouse.presence += (mouse.target - mouse.presence) * 0.08; // Interpola presencia del cursor (ease).
      gl.uniform4f(loc.scene, canvas.width, canvas.height, time, 4.0); // xy=resolución, z=tiempo, w=4 colores útiles.
      gl.uniform4f(loc.shape, 1.26, 1.0, 0.6, 0.0); // Escala 1.26, intensidad 1, paramA 0.6, sin warp.
      gl.uniform4f(loc.surface, 2.4, 0.91, -0.06, 1.0); // Detalle, contraste, brillo ligeramente negativo, saturación 1.
      gl.uniform4f(loc.finish, 4.63, 0.0, 0.006, 0.08); // Hue, sin viñeta, blur mínimo, grano suave.
      gl.uniform4f(loc.transform, 2926.0, 0.14, 0.06, 0.0); // Semilla, rotación, drift, oklab off.
      gl.uniform4f(loc.space, -0.02, 0.0, mouse.x, mouse.y); // Offset y posición del mouse.
      gl.uniform4f(loc.cursor, mouse.presence, 0.0, 0.1, 0.46); // Presencia, efecto 0, fuerza y radio.
      gl.drawArrays(gl.TRIANGLES, 0, 3); // Dibuja el full-screen triangle (3 vértices).
    }; // Fin de el bloque.

    const loop = (now) => { // Loop limitado a ~30 fps.
      if (!running) return; // Se desmontó: no pide más frames.
      if (now - lastDraw < 32) { // Menos de 32 ms desde el último draw…
        raf = requestAnimationFrame(loop); // …espera el siguiente vsync.
        return; // No dibuja todavía.
      } // Fin de el bloque.
      lastDraw = now; // Marca este draw.
      draw(now); // Pinta el frame.
      frames += 1; // Cuenta el frame.
      if (frozen || reduced.matches || automated) return; // Congelado o bot: no continúa el loop.
      raf = requestAnimationFrame(loop); // Pide el siguiente frame.
    }; // Fin de el bloque.

    const onPointer = (event) => { // Actualiza el mouse en clip space (-1 a 1).
      const x = (event.clientX / window.innerWidth) * 2 - 1; // X NDC: izquierda -1, derecha +1.
      const y = 1 - (event.clientY / window.innerHeight) * 2; // Y NDC invertida (WebGL Y+ arriba).
      mouse.x = x; // Guarda X.
      mouse.y = y; // Guarda Y.
      mouse.target = 1; // Objetivo: el cursor “está presente”.
    }; // Fin de el bloque.
    const onLeave = () => { // El puntero salió de la ventana.
      mouse.target = 0; // La presencia baja suavemente a 0.
    }; // Fin de el bloque.
    const onVisibility = () => { // Pausa si la pestaña está oculta.
      if (document.hidden) { // Segundo plano.
        running = false; // Para el loop.
        cancelAnimationFrame(raf); // Cancela RAF.
      } else if (!automated) { // Volvió a primer plano y no es un bot.
        running = true; // Reactiva.
        start = performance.now() - (performance.now() - start); // Conserva el tiempo transcurrido.
        raf = requestAnimationFrame(loop); // Reanuda el loop.
      } // Fin de el bloque.
    }; // Fin de el bloque.
    const onReduced = () => { // Reacciona si el usuario cambia reduced-motion.
      frozen = reduced.matches; // Congela o descongela.
      if (frozen) { // Si ahora pide menos movimiento…
        cancelAnimationFrame(raf); // Detiene el loop.
        draw(performance.now()); // Deja un frame estático.
      } else if (running) { // Si se desactivó reduced-motion…
        raf = requestAnimationFrame(loop); // …vuelve a animar.
      } // Fin de el bloque.
    }; // Fin de el bloque.

    resize(); // Primer ajuste de tamaño.
    setOk(true); // Marca WebGL como disponible (quita el fallback visual).
    frozen = reduced.matches; // Estado inicial de reduced-motion.
    draw(performance.now()); // Primer frame inmediato.
    if (!frozen && !automated) raf = requestAnimationFrame(loop); // Arranca el loop si se puede animar.

    window.addEventListener("resize", resize); // Recalcula al cambiar la ventana.
    window.addEventListener("pointermove", onPointer, { passive: true }); // Sigue el puntero sin bloquear scroll.
    window.addEventListener("pointerleave", onLeave); // Detecta salida del puntero.
    document.addEventListener("visibilitychange", onVisibility); // Pausa en pestaña oculta.
    reduced.addEventListener?.("change", onReduced); // Escucha cambios de la media query.
    const observer = new ResizeObserver(resize); // También observa el <html> (zoom, teclado móvil).
    observer.observe(document.documentElement); // Empieza a observar el documento.

    return () => { // Limpieza al desmontar el componente.
      running = false; // Para el loop.
      cancelAnimationFrame(raf); // Cancela RAF.
      window.removeEventListener("resize", resize); // Quita resize.
      window.removeEventListener("pointermove", onPointer); // Quita pointermove.
      window.removeEventListener("pointerleave", onLeave); // Quita pointerleave.
      document.removeEventListener("visibilitychange", onVisibility); // Quita visibility.
      reduced.removeEventListener?.("change", onReduced); // Quita el listener de reduced-motion.
      observer.disconnect(); // Deja de observar el documento.
      if (buffer) gl.deleteBuffer(buffer); // Libera el VBO.
      if (program) gl.deleteProgram(program); // Libera el programa GPU.
      const lose = gl.getExtension("WEBGL_lose_context"); // Extensión para soltar el contexto.
      lose?.loseContext(); // Fuerza la pérdida del contexto (libera GPU).
    }; // Fin de el bloque.
  }, []); // Sin dependencias: se configura una vez.

  return ( // Markup del stack: fallback CSS + canvas + velo ambiental.
    <div className={`webgl-stack ${ok ? "has-webgl" : "no-webgl"}`} aria-hidden="true">{/* Contenedor: clase según si WebGL arrancó. */}
      <div className="webgl-fallback" />{/* Degradado CSS por si no hay GPU. */}
      <canvas ref={canvasRef} className="webgl-bg" />{/* Lienzo donde corre el shader. */}
      <div className="webgl-ambient" />{/* Capa suave encima del canvas. */}
    </div>// Cierra el <div>.
  ); // Cierra la llamada.
} // Fin de el bloque.
