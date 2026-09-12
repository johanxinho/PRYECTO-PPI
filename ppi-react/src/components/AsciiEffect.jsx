// @ts-nocheck
import { useEffect, useRef } from "react"; // Trae el ciclo de vida y referencias del DOM de React.

// Valores iniciales del efecto ASCII: tamaño de celda, color, animación y post-efectos.
const ASCII_DEFAULTS = {  // Abre ASCII_DEFAULTS.
  renderMode: "dither", // Estilo de dibujo por celda (puntos, mosaico, dither, etc.).
  bgMode: "none", // Cómo se pinta el fondo detrás de los caracteres.
  bgBlur: 12, // Intensidad del desenfoque del fondo.
  bgOpacity: 90, // Opacidad del fondo en porcentaje.
  cellSize: 9, // Tamaño en píxeles de cada celda de la grilla ASCII.
  coverage: 100, // Porcentaje de celdas que se dibujan (100 = todas).
  invert: false, // Si es true, invierte luces y sombras.
  styleBlend: "source-over", // Modo de mezcla 2D al componer el canvas.
  charSet: "standard", // Conjunto de caracteres a usar en modos de texto.
  customChars: "", // Cadena opcional de caracteres personalizados.
  brightness: 0, // Ajuste de brillo sobre la luminancia.
  contrast: 158, // Contraste alto para resaltar bordes del retrato.
  edgeEmphasis: 0, // Énfasis extra en bordes (reservado para el pipeline).
  density: 20, // Densidad visual del patrón.
  toneCurve: [ // Curva tono de entrada/salida (identidad por defecto).
    { x: 0, y: 0 }, // Punto negro: 0 de entrada da 0 de salida.
    { x: 1, y: 1 }, // Punto blanco: 1 de entrada da 1 de salida.
  ], // Cierra el arreglo ASCII_DEFAULTS.
  tint: "#3ca6ff", // Color de tinte azul RECORDATE.
  tintOpacity: 0, // Opacidad del tinte (0 = desactivado).
  overlayBlend: "multiply", // Mezcla del overlay de color.
  saturation: 100, // Saturación del color original (100 = sin cambio).
  grayscale: 0, // Cantidad de escala de grises.
  blurType: "off", // Tipo de blur previo al muestreo.
  blurAmount: 35, // Cantidad de blur si estuviera activo.
  animated: true, // Activa el loop de animación.
  animStyle: "shimmer", // Estilo de animación (brillo ondulado).
  animSpeed: { enabled: true, intensity: 100 }, // Velocidad de la animación.
  animIntensity: { enabled: true, intensity: 60 }, // Intensidad del shimmer.
  pfx: { // Post-efectos de cine/VHS aplicados al canvas.
    vignette: { enabled: false, intensity: 38 }, // Oscurece las esquinas.
    scanLines: { enabled: false, intensity: 40 }, // Líneas de escaneo tipo CRT.
    chromatic: { enabled: false, intensity: 15 }, // Aberración cromática.
    bloom: { enabled: false, intensity: 25 }, // Resplandor en zonas claras.
    filmGrain: { enabled: false, intensity: 30 }, // Grano de película.
    glitch: { enabled: false, intensity: 20 }, // Desplazamiento tipo glitch.
    pixelate: { enabled: false, intensity: 15 }, // Pixelado extra.
    halftone: { enabled: false, intensity: 20 }, // Puntos de medio tono.
    filmDust: { enabled: false, intensity: 20 }, // Polvo de película.
  }, // Fin de el bloque.
}; // Fin de el bloque.

// Matriz Bayer 4x4: umbrales de dithering ordenado (valores 0–15).
const BAYER = [  // Arreglo BAYER.
  [0, 8, 2, 10], // Primera fila de umbrales Bayer.
  [12, 4, 14, 6], // Segunda fila de umbrales Bayer.
  [3, 11, 1, 9], // Tercera fila de umbrales Bayer.
  [15, 7, 13, 5], // Cuarta fila de umbrales Bayer.
]; // Cierra el arreglo BAYER.

// Paletas de caracteres: de vacío (oscuro) a denso (claro).
const CHARS = {  // Abre CHARS.
  standard: " .:-=+*#%@", // ASCII clásico de 10 niveles.
  blocks: " ░▒▓█", // Bloques Unicode de densidad creciente.
  braille: "⠀⠁⠃⠇⠏⠟⠿", // Puntos Braille para un look de terminal.
}; // Fin de CHARS.

/**
 * Ajusta la luminancia con brillo y contraste, y la recorta a [0, 1].
 * Así el alumno controla qué tan “negro” o “blanco” se ve cada celda.
 */
function applyTone(luma, brightness, contrast) {  // Abre applyTone.
  const b = brightness / 100; // Pasa el brillo de porcentaje a 0–1.
  const c = contrast / 100; // Pasa el contraste de porcentaje a factor.
  let v = (luma - 0.5) * c + 0.5 + b; // Contrasta alrededor de 0.5 y suma brillo.
  return Math.min(1, Math.max(0, v)); // Evita valores fuera de 0 y 1.
} // Fin de applyTone.

/**
 * Recorta la imagen en un canvas, la centra y promedia cada celda.
 * Devuelve la grilla { cells, cols, rows } lista para dibujar primitivas.
 */
function sampleImage(image, width, height, cell) {  // Abre sampleImage.
  const src = document.createElement("canvas"); // Canvas temporal solo para leer píxeles.
  src.width = width; // Ancho igual al canvas visible (con DPR).
  src.height = height; // Alto igual al canvas visible (con DPR).
  const ctx = src.getContext("2d", { willReadFrequently: true }); // Contexto 2D optimizado para getImageData.
  if (!ctx) return []; // Si el navegador no da contexto, no hay grilla.
  const scale = Math.min(width / image.width, height / image.height); // Escala para “contain” sin deformar.
  const dw = image.width * scale; // Ancho dibujado respetando aspecto.
  const dh = image.height * scale; // Alto dibujado respetando aspecto.
  ctx.clearRect(0, 0, width, height); // Limpia el canvas temporal.
  ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh); // Dibuja la foto centrada.
  const { data } = ctx.getImageData(0, 0, width, height); // RGBA crudo: 4 bytes por píxel.
  const cols = Math.ceil(width / cell); // Número de columnas de la grilla.
  const rows = Math.ceil(height / cell); // Número de filas de la grilla.
  const cells = []; // Aquí se guardan las celdas muestreadas.
  for (let y = 0; y < rows; y += 1) { // Recorre cada fila de celdas.
    for (let x = 0; x < cols; x += 1) { // Recorre cada columna de celdas.
      let r = 0; // Rojo del píxel más brillante de la celda.
      let g = 0; // Verde del píxel más brillante de la celda.
      let b = 0; // Azul del píxel más brillante de la celda.
      let a = 0; // Alfa del píxel más brillante de la celda.
      let best = -1; // Luminancia máxima encontrada en la celda.
      for (let oy = 0; oy < cell; oy += 1) { // Recorre el alto interno de la celda.
        for (let ox = 0; ox < cell; ox += 1) { // Recorre el ancho interno de la celda.
          const px = Math.min(width - 1, x * cell + ox); // X del píxel, sin salir del canvas.
          const py = Math.min(height - 1, y * cell + oy); // Y del píxel, sin salir del canvas.
          const i = (py * width + px) * 4; // Índice RGBA en el arreglo data.
          const lumaPx = ((0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255) * (data[i + 3] / 255); // Luma perceptual * alfa.
          if (lumaPx > best) { // Si este píxel es el más luminoso de la celda…
            best = lumaPx; // …guarda esa luma como referencia.
            r = data[i]; // Copia el canal rojo.
            g = data[i + 1]; // Copia el canal verde.
            b = data[i + 2]; // Copia el canal azul.
            a = data[i + 3]; // Copia el canal alfa.
          } // Fin de sampleImage.
        } // Fin de el bloque.
      } // Fin de el bloque.
      const luma = best < 0 ? 0 : best; // Si no hubo píxeles, luma = 0.
      cells.push({ x, y, r, g, b, a, luma }); // Guarda la celda con color y brillo.
    } // Fin de el bloque.
  } // Fin de el bloque.
  return { cells, cols, rows }; // Entrega la grilla completa al pintor.
} // Fin de el bloque.

/**
 * Dibuja una celda según el modo: puntos, mosaico, cruces, texto, dither, etc.
 * `t` sirve para micro-animación (p. ej. el seno en caracteres).
 */
function drawPrimitive(ctx, mode, cell, size, luma, color, t) {  // Abre drawPrimitive.
  const { x, y } = cell; // Coordenadas de la celda en la grilla.
  const px = x * size; // X en píxeles del canvas.
  const py = y * size; // Y en píxeles del canvas.
  ctx.fillStyle = color; // Color de relleno de esta celda.
  ctx.strokeStyle = color; // Color de trazo de esta celda.
  switch (mode) { // Elige la primitiva según renderMode.
    case "dots": // Puntos sólidos.
    case "disco": // Variante disco (mismo círculo).
    case "bubbles": { // Burbujas: el radio crece con la luma.
      const r = Math.max(1, size * 0.18 + luma * size * 0.32); // Radio mínimo 1, mayor si hay luz.
      ctx.beginPath(); // Empieza un path circular.
      ctx.arc(px + size / 2, py + size / 2, r, 0, Math.PI * 2); // Círculo centrado en la celda.
      ctx.fill(); // Rellena el círculo.
      break; // Sale de este caso.
    } // Fin de drawPrimitive.
    case "mosaic": // Mosaico rectangular.
    case "pixel": // Pixel art.
    case "lego": // Lego: deja más separación.
    case "voxel": { // Voxel: cubo 2D.
      const pad = mode === "lego" ? 1.5 : 0.4; // Padding mayor en lego para juntas.
      ctx.fillRect(px + pad, py + pad, size - pad * 2, size - pad * 2); // Rectángulo interno.
      break; // Sale de este caso.
    } // Fin de el bloque.
    case "cross": // Cruces en X.
    case "hatch": { // Hatch: mismas dos diagonales.
      ctx.lineWidth = 1 + luma * 1.4; // Grosor según luminancia.
      ctx.beginPath(); // Empieza el trazo.
      ctx.moveTo(px + 1, py + 1); // Esquina superior izquierda.
      ctx.lineTo(px + size - 1, py + size - 1); // Diagonal principal.
      ctx.moveTo(px + size - 1, py + 1); // Esquina superior derecha.
      ctx.lineTo(px + 1, py + size - 1); // Diagonal inversa.
      ctx.stroke(); // Dibuja las dos líneas.
      break; // Sale de este caso.
    } // Fin de el bloque.
    case "diamond": // Diamante.
    case "hexagons": // Hexágono aproximado como rombo.
    case "triangles": { // Triángulo/rombo relleno.
      ctx.beginPath(); // Empieza el polígono.
      ctx.moveTo(px + size / 2, py + 1); // Vértice superior.
      ctx.lineTo(px + size - 1, py + size / 2); // Vértice derecho.
      ctx.lineTo(px + size / 2, py + size - 1); // Vértice inferior.
      ctx.lineTo(px + 1, py + size / 2); // Vértice izquierdo.
      ctx.closePath(); // Cierra el rombo.
      ctx.fill(); // Rellena el polígono.
      break; // Sale de este caso.
    } // Fin de el bloque.
    case "lines": // Líneas diagonales.
    case "diagonal": // Misma línea.
    case "contour": { // Contorno: la pendiente sigue la luma.
      ctx.lineWidth = 1 + luma * 2; // Grosor proporcional al brillo.
      ctx.beginPath(); // Empieza el trazo.
      ctx.moveTo(px, py + size * luma); // Origen según luma.
      ctx.lineTo(px + size, py + size * (1 - luma)); // Destino invertido: da pendiente.
      ctx.stroke(); // Dibuja la línea.
      break; // Sale de este caso.
    } // Fin de el bloque.
    case "rings": { // Anillos: círculo solo con trazo.
      ctx.lineWidth = 1.2; // Grosor fijo del anillo.
      ctx.beginPath(); // Empieza el arco.
      ctx.arc(px + size / 2, py + size / 2, 1 + luma * size * 0.4, 0, Math.PI * 2); // Radio según luma.
      ctx.stroke(); // Dibuja el contorno.
      break; // Sale de este caso.
    } // Fin de el bloque.
    case "characters": // Caracteres ASCII.
    case "braille": // Braille.
    case "hexdump": // Hexdump (usa el set estándar).
    case "matrix": // Matrix (usa el set estándar).
    case "hearts": // Corazones fijos.
    case "stars": { // Estrellas fijas.
      const set = mode === "braille" ? CHARS.braille : CHARS.standard; // Elige paleta de glifos.
      const ch = set[Math.min(set.length - 1, Math.floor(luma * (set.length - 0.01)))]; // Índice según luma.
      ctx.font = `${Math.max(8, size)}px ui-monospace, monospace`; // Fuente monoespaciada, mínimo 8px.
      ctx.textAlign = "center"; // Centra el glifo en X.
      ctx.textBaseline = "middle"; // Centra el glifo en Y.
      ctx.fillText(mode === "hearts" ? "♥" : mode === "stars" ? "✦" : ch, px + size / 2, py + size / 2 + Math.sin(t + x) * 0.4); // Dibuja el carácter con un leve bounce.
      break; // Sale de este caso.
    } // Fin de el bloque.
    case "halfblocks": { // Medio bloque: rellena desde abajo según luma.
      ctx.fillRect(px, py + size * (1 - luma), size, size * luma); // Rectángulo inferior proporcional.
      break; // Sale de este caso.
    } // Fin de el bloque.
    case "mixed": { // Alterna círculo y cuadrado como tablero.
      if ((x + y) % 2 === 0) { // Celdas “pares”: círculo.
        ctx.beginPath(); // Empieza el círculo.
        ctx.arc(px + size / 2, py + size / 2, size * 0.28 * (0.4 + luma), 0, Math.PI * 2); // Radio mixto.
        ctx.fill(); // Rellena el círculo.
      } else { // Celdas “impares”: cuadrado.
        ctx.fillRect(px + 1, py + 1, size - 2, size - 2); // Cuadrado con 1px de margen.
      } // Fin de el bloque.
      break; // Sale de este caso.
    } // Fin de el bloque.
    default: { // Dither Bayer: solo pinta si luma supera el umbral.
      const threshold = BAYER[y % 4][x % 4] / 16; // Umbral 0–1 según posición 4x4.
      if (luma > threshold * 0.85) { // Si hay suficiente luz respecto al umbral…
        const r = Math.max(1.1, size * (0.16 + luma * 0.28)); // Radio del punto dither.
        ctx.beginPath(); // Empieza el círculo.
        ctx.arc(px + size / 2, py + size / 2, r, 0, Math.PI * 2); // Punto centrado.
        ctx.fill(); // Rellena el punto.
      } // Fin de el bloque.
    } // Fin de el bloque.
  } // Fin de el bloque.
} // Fin de el bloque.

/**
 * Aplica post-procesado píxel a píxel: grano, scanlines, viñeta y glitch.
 * Opera sobre ImageData y lo vuelve a escribir en el canvas.
 */
function applyPost(ctx, width, height, pfx, time) {  // Abre applyPost.
  if (!pfx) return; // Sin config de efectos, no hace nada.
  const image = ctx.getImageData(0, 0, width, height); // Lee todos los píxeles actuales.
  const data = image.data; // Vista RGBA mutable.
  if (pfx.filmGrain?.enabled) { // Grano de película si está activo.
    const amount = pfx.filmGrain.intensity / 100 * 28; // Amplitud del ruido.
    for (let i = 0; i < data.length; i += 4) { // Recorre cada píxel (salta de 4 en 4).
      const n = (Math.random() - 0.5) * amount; // Ruido centrado en 0.
      data[i] += n; // Suma ruido al rojo.
      data[i + 1] += n; // Suma el mismo ruido al verde (grano monocromo).
      data[i + 2] += n; // Suma el mismo ruido al azul.
    } // Fin de applyPost.
  } // Fin de el bloque.
  if (pfx.scanLines?.enabled) { // Scanlines: oscurece filas pares.
    const amount = pfx.scanLines.intensity / 100; // Intensidad 0–1.
    for (let y = 0; y < height; y += 2) { // Solo cada dos filas.
      for (let x = 0; x < width; x += 1) { // Cada columna de esa fila.
        const i = (y * width + x) * 4; // Índice RGBA.
        data[i] *= 1 - amount * 0.35; // Atenúa rojo.
        data[i + 1] *= 1 - amount * 0.35; // Atenúa verde.
        data[i + 2] *= 1 - amount * 0.35; // Atenúa azul.
      } // Fin de el bloque.
    } // Fin de el bloque.
  } // Fin de el bloque.
  if (pfx.vignette?.enabled) { // Viñeta: más oscuro lejos del centro.
    const amount = pfx.vignette.intensity / 100; // Intensidad 0–1.
    const cx = width / 2; // Centro X.
    const cy = height / 2; // Centro Y.
    const max = Math.hypot(cx, cy); // Distancia máxima (esquina).
    for (let y = 0; y < height; y += 1) { // Todas las filas.
      for (let x = 0; x < width; x += 1) { // Todas las columnas.
        const i = (y * width + x) * 4; // Índice RGBA.
        const v = 1 - amount * Math.min(1, Math.hypot(x - cx, y - cy) / max); // Factor 1 en centro, menor en borde.
        data[i] *= v; // Aplica viñeta al rojo.
        data[i + 1] *= v; // Aplica viñeta al verde.
        data[i + 2] *= v; // Aplica viñeta al azul.
      } // Fin de el bloque.
    } // Fin de el bloque.
  } // Fin de el bloque.
  if (pfx.glitch?.enabled && Math.sin(time * 9) > 0.92) { // Glitch solo en picos del seno.
    const shift = Math.floor((pfx.glitch.intensity / 100) * 12); // Desplazamiento máximo en píxeles.
    for (let y = 0; y < height; y += 3) { // Cada tres filas para un look de interferencia.
      const off = ((y * 17) % shift) * 4; // Offset en bytes (×4 canales).
      const start = y * width * 4; // Inicio de la fila en el buffer.
      data.copyWithin(start, start + off, start + width * 4); // Copia la fila desplazada.
    } // Fin de el bloque.
  } // Fin de el bloque.
  ctx.putImageData(image, 0, 0); // Escribe el buffer modificado de vuelta.
} // Fin de el bloque.

/**
 * Componente React: pinta la foto de RECORDATE como grilla ASCII animada.
 * Recibe `src` (URL), `className` y un `config` opcional que pisa los defaults.
 */
export default function AsciiEffect({  // Abre AsciiEffect.
  src, // URL o ruta de la imagen fuente.
  className = "", // Clases extra para el <canvas>.
  config = ASCII_DEFAULTS, // Ajustes visuales; si faltan, usa ASCII_DEFAULTS.
}) { // Abre el bloque.
  const canvasRef = useRef(null); // Referencia al <canvas> del DOM.
  const settings = { ...ASCII_DEFAULTS, ...config }; // Mezcla defaults + config del padre.

  useEffect(() => { // Monta el motor 2D cuando hay src o cambia el modo/celda.
    const canvas = canvasRef.current; // Nodo canvas real.
    if (!canvas || !src) return undefined; // Sin canvas o sin imagen, no arranca.
    const ctx = canvas.getContext("2d"); // Contexto 2D de dibujo.
    if (!ctx) return undefined; // Si falla el contexto, aborta el efecto.

    let raf = 0; // Id de requestAnimationFrame para cancelarlo.
    let running = true; // Bandera: el loop sigue vivo.
    let image = null; // HTMLImageElement cuando carga.
    let grid = null; // Resultado de sampleImage.
    let start = performance.now(); // Marca de tiempo inicial (ms).
    let frames = 0; // Contador de frames (útil en tests automatizados).
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // Respeta accesibilidad.
    const automated = Boolean(navigator.webdriver); // Detecta bots/CI para no animar de más.

    const fit = () => { // Ajusta resolución del canvas al tamaño CSS × DPR.
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // DPR tope 2 para no matar el CPU.
      const rect = canvas.getBoundingClientRect(); // Tamaño CSS del canvas.
      const width = Math.max(64, Math.floor(rect.width * dpr)); // Ancho interno, mínimo 64.
      const height = Math.max(64, Math.floor(rect.height * dpr)); // Alto interno, mínimo 64.
      canvas.width = width; // Aplica el ancho (esto limpia el canvas).
      canvas.height = height; // Aplica el alto.
      if (image) grid = sampleImage(image, width, height, Math.max(4, Math.round(settings.cellSize * dpr))); // Reconstruye la grilla.
    }; // Fin de block.

    const paint = (now) => { // Dibuja un frame completo.
      if (!grid || !image) return; // No pinta si aún no hay datos.
      const { cells } = grid; // Lista de celdas muestreadas.
      const size = Math.max(4, Math.round(settings.cellSize * Math.min(window.devicePixelRatio || 1, 2))); // Tamaño de primitiva.
      const t = ((now - start) / 1000) * ((settings.animSpeed?.intensity || 100) / 100); // Tiempo en segundos, escalado.
      const shimmer = (settings.animIntensity?.intensity || 60) / 100; // Amplitud del shimmer 0–1.
      ctx.globalCompositeOperation = "source-over"; // Mezcla normal para el fondo.
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpia el frame anterior.
      const scale = Math.min(canvas.width / image.width, canvas.height / image.height); // Escala contain.
      const dw = image.width * scale; // Ancho de la foto de fondo.
      const dh = image.height * scale; // Alto de la foto de fondo.
      const pulse = reduced || !settings.animated ? 1 : 0.94 + Math.sin(t * 1.35) * 0.06; // Pulso de opacidad.
      ctx.globalAlpha = pulse; // Aplica el pulso a la foto.
      ctx.drawImage(image, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh); // Foto de fondo centrada.
      ctx.globalAlpha = 1; // Restaura opacidad plena.
      ctx.globalCompositeOperation = "screen"; // Las primitivas se aclaran sobre la foto.
      cells.forEach((cell) => { // Dibuja cada celda de la grilla.
        if (cell.a < 12) return; // Ignora celdas casi transparentes.
        if (cell.luma < 0.08) return; // Ignora celdas muy oscuras.
        if (settings.coverage < 100 && ((cell.x * 13 + cell.y * 7) % 100) > settings.coverage) return; // Cobertura parcial pseudoaleatoria.
        const chroma = Math.max(cell.r, cell.g, cell.b) - Math.min(cell.r, cell.g, cell.b); // Qué tan saturado está el color.
        if (cell.luma > 0.93 && cell.a > 200 && chroma < 18) return; // Salta blancos planos (fondo de estudio).
        let luma = applyTone(cell.luma, settings.brightness, settings.contrast); // Aplica curva de tono.
        if (settings.invert) luma = 1 - luma; // Invierte si el usuario lo pidió.
        if (settings.animated && settings.animStyle === "shimmer" && !reduced) { // Shimmer solo si hay animación.
          luma = Math.min(1, Math.max(0, luma + Math.sin(t * 2.2 + cell.x * 0.35 + cell.y * 0.28) * shimmer * 0.14)); // Oscila la luma.
        } // Fin de AsciiEffect.
        const sat = settings.saturation / 100; // Factor de saturación 0–1+.
        const gray = 0.299 * cell.r + 0.587 * cell.g + 0.114 * cell.b; // Luma del color original.
        const r = Math.min(255, gray + (cell.r - gray) * sat); // Rojo re-saturado.
        const g = Math.min(255, gray + (cell.g - gray) * sat); // Verde re-saturado.
        const b = Math.min(255, gray + (cell.b - gray) * sat); // Azul re-saturado.
        const color = `rgba(${r | 0},${g | 0},${b | 0},${Math.min(1, 0.22 + luma * 0.5)})`; // Color final con alfa según luma.
        drawPrimitive(ctx, settings.renderMode, cell, size, luma, color, t); // Pinta la primitiva de esta celda.
      }); // Cierra la llamada y el bloque.
      ctx.globalCompositeOperation = "source-over"; // Vuelve a mezcla normal para el post.
      const anyPost = Object.values(settings.pfx || {}).some((item) => item?.enabled); // ¿Hay algún pfx activo?
      if (anyPost) applyPost(ctx, canvas.width, canvas.height, settings.pfx, t); // Aplica grano/viñeta/glitch.
    }; // Fin de el bloque.

    const loop = (now) => { // Bucle de animación por frames.
      if (!running) return; // Si se desmontó, no sigue.
      paint(now); // Pinta este frame.
      frames += 1; // Cuenta el frame.
      if (!reduced && settings.animated && !(automated && frames > 4)) raf = requestAnimationFrame(loop); // Pide el siguiente frame.
    }; // Fin de el bloque.

    const onVis = () => { // Pausa cuando la pestaña está oculta (ahorra CPU).
      if (document.hidden) { // Pestaña en segundo plano.
        running = false; // Detiene el loop.
        cancelAnimationFrame(raf); // Cancela el RAF pendiente.
      } else { // La pestaña volvió a verse.
        running = true; // Reactiva el loop.
        if (automated) { // En tests: un solo paint, sin loop infinito.
          paint(performance.now()); // Pinta un frame estático.
        } else { // En uso real: reanuda la animación.
          raf = requestAnimationFrame(loop); // Arranca de nuevo el loop.
        } // Fin de el bloque.
      } // Fin de el bloque.
    }; // Fin de el bloque.

    const img = new Image(); // Crea el cargador de la foto.
    img.crossOrigin = "anonymous"; // Permite leer píxeles si el CORS lo autoriza.
    img.onload = () => { // Cuando la imagen está lista…
      image = img; // Guarda la referencia.
      fit(); // Ajusta canvas y muestrea.
      paint(performance.now()); // Primer frame inmediato.
      if (!reduced && settings.animated && !automated) raf = requestAnimationFrame(loop); // Arranca animación si aplica.
    }; // Fin de el bloque.
    img.src = src; // Dispara la descarga de la imagen.

    const observer = new ResizeObserver(() => { // Recalcula al cambiar el tamaño del canvas.
      fit(); // Reajusta resolución y grilla.
      paint(performance.now()); // Repinta con el nuevo tamaño.
    }); // Cierra la llamada y el bloque.
    observer.observe(canvas); // Observa el canvas.
    document.addEventListener("visibilitychange", onVis); // Escucha pestaña visible/oculta.

    return () => { // Cleanup al desmontar o cambiar deps.
      running = false; // Para el loop.
      cancelAnimationFrame(raf); // Cancela RAF.
      observer.disconnect(); // Deja de observar el tamaño.
      document.removeEventListener("visibilitychange", onVis); // Quita el listener de visibilidad.
    }; // Fin de el bloque.
    // Sampling is rebuilt from src/cellSize; animation uniforms are read live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, settings.renderMode, settings.cellSize, settings.animated]); // Rehace el efecto si cambia imagen, modo, celda o animación.

  return <canvas ref={canvasRef} className={`ascii-canvas ${className}`} aria-hidden="true" />; // Canvas decorativo, oculto a lectores de pantalla.
} // Fin de el bloque.
