"use client"; // Directiva: este módulo usa hooks y debe correr en el cliente.

import { useEffect, useMemo, useRef, useState } from "react"; // Hooks de React para medida, refs y estado.
import {  // Abre el bloque.
  animate, // Controla la animación del MotionValue.
  motion, // span animable de Motion.
  useInView, // Detecta si el texto está visible en el viewport.
  useMotionValue, // Valor numérico animable (posición del barrido).
  useReducedMotion, // Respeta prefers-reduced-motion.
  useTransform, // Deriva el CSS gradient a partir del MotionValue.
  type HTMLMotionProps, // Tipos de props de un motion.span.
} from "motion/react"; // Fin de block.
import { cn } from "@/lib/utils"; // Une classNames sin pisar las del padre.

const DEFAULT_COLORS = ["#3D46E8", "#B18CFF", "#FFD6E7", "#EF5A21", "#F0BC12"]; // Paleta RECORDATE del barrido.
const BAND_HALF = 17; // Mitad del ancho de la banda de color (en % del texto).
const SWEEP_START = -BAND_HALF; // El barrido nace fuera, a la izquierda.
const SWEEP_END = 100 + BAND_HALF; // El barrido termina fuera, a la derecha.

const sweepEase = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2); // Ease-in-out cúbico (más suave que linear).

/**
 * Arma un linear-gradient 90deg: texto base + banda de colores + transparente.
 * `pos` es el centro de la banda en porcentaje (puede ser <0 o >100).
 */
function buildGradient(pos: number, colors: string[], textColor: string) {  // Abre buildGradient.
  const bandStart = pos - BAND_HALF; // Borde izquierdo de la banda.
  const bandEnd = pos + BAND_HALF; // Borde derecho de la banda.
  if (bandStart >= 100) return `linear-gradient(90deg, ${textColor}, ${textColor})`; // Ya pasó: el texto queda en su color final.
  const n = colors.length; // Cuántos colores hay en la banda.
  const parts: string[] = []; // Stops CSS que se van a unir con comas.
  if (bandStart > 0) parts.push(`${textColor} 0%`, `${textColor} ${bandStart.toFixed(2)}%`); // Rellena a la izquierda con el color del texto.
  colors.forEach((c, i) => { // Coloca cada color a lo largo de la banda.
    const pct = n === 1 ? pos : bandStart + (i / (n - 1)) * BAND_HALF * 2; // Un color = centro; varios = repartidos.
    parts.push(`${c} ${pct.toFixed(2)}%`); // Stop "color porcentaje".
  }); // Cierra la llamada y buildGradient.
  if (bandEnd < 100) parts.push(`transparent ${bandEnd.toFixed(2)}%`, `transparent 100%`); // A la derecha, transparente (se ve el recorte).
  return `linear-gradient(90deg, ${parts.join(", ")})`; // Gradient horizontal listo para backgroundImage.
} // Fin de el bloque.

/**
 * Mide el ancho de cada texto clonando el span (invisible) y leyendo el layout.
 * Así el contenedor puede animar su width al cambiar de frase.
 */
function measureWidths(el: HTMLElement, texts: string[]) {  // Abre measureWidths.
  const ghost = el.cloneNode() as HTMLElement; // Clon vacío con las mismas clases/estilos.
  Object.assign(ghost.style, { // Lo saca del flujo visual.
    position: "absolute", // No empuja el layout.
    visibility: "hidden", // Invisible, pero medible.
    pointerEvents: "none", // No intercepta clics.
    width: "auto", // Que crezca con el texto.
    whiteSpace: "nowrap", // Una sola línea, como el original.
  }); // Cierra la llamada y measureWidths.
  el.parentElement!.appendChild(ghost); // Lo mete al mismo padre para heredar tipografía.
  const widths = texts.map((t) => { // Un ancho por cada frase.
    ghost.textContent = t; // Pone la frase en el fantasma.
    return ghost.getBoundingClientRect().width; // Mide en px reales.
  }); // Cierra la llamada y el bloque.
  ghost.remove(); // Limpia el nodo temporal.
  return widths; // Array de anchos, mismo orden que `texts`.
} // Fin de el bloque.

export interface DiaTextRevealProps extends Omit< // Props públicas: las de motion.span menos las que controlamos.
  HTMLMotionProps<"span">, // Base: un span de Motion.
  "ref" | "children" | "style" | "animate" | "transition" | "color" // Estas las maneja el componente.
> { // Abre el bloque.
  text: string | string[]; // Una frase o varias que rotan.
  colors?: string[]; // Colores de la banda (opcional).
  textColor?: string; // Color final del glifo.
  duration?: number; // Segundos del barrido.
  delay?: number; // Espera antes de arrancar.
  repeat?: boolean; // Si vuelve a barrer (y rota de frase).
  repeatDelay?: number; // Pausa entre repeticiones.
  startOnView?: boolean; // Solo anima al entrar en viewport.
  once?: boolean; // useInView: observar una sola vez.
  className?: string; // Clases extra.
  fixedWidth?: boolean; // Si hay varias frases, usa el ancho máximo.
} // Fin de block.

/**
 * Texto que se “revela” con un barrido de colores RECORDATE (background-clip: text).
 * Si `text` es un array, rota frases y anima el ancho del span.
 */
export function DiaTextReveal({  // Abre DiaTextReveal.
  text, // Frase o lista de frases.
  colors = DEFAULT_COLORS, // Paleta por defecto.
  textColor = "var(--ink)", // Color de tinta del tema.
  duration = 1.5, // 1.5 s de barrido.
  delay = 0, // Sin espera extra.
  repeat = false, // Por defecto un solo barrido.
  repeatDelay = 0.5, // Media segundo entre loops.
  startOnView = true, // Espera a ser visible.
  once = true, // No re-observa al salir/entrar.
  className, // Clases del padre.
  fixedWidth = false, // Ancho fijo desactivado.
  ...props // Resto de props del span (aria, id, etc.).
}: DiaTextRevealProps) { // Abre el bloque.
  const texts = useMemo(() => (Array.isArray(text) ? text : [text]), [text]); // Normaliza a array y memoiza.
  const isMulti = texts.length > 1; // ¿Hay que rotar frases?
  const prefersReducedMotion = useReducedMotion(); // true si el SO pide menos animación.
  const spanRef = useRef<HTMLSpanElement>(null); // Ref al motion.span (medida + inView).
  const optsRef = useRef({ colors, textColor, duration, delay, repeat, repeatDelay, texts }); // Copia mutable para el callback de animate.
  optsRef.current = { colors, textColor, duration, delay, repeat, repeatDelay, texts }; // Siempre el valor más reciente (evita stale closures).
  const indexRef = useRef(0); // Índice de la frase activa (no re-renderiza al avanzar).
  const hasPlayedRef = useRef(false); // Ya se reprodujo al menos una vez.
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined); // Timeout entre repeticiones.
  const playRef = useRef<() => void>(() => {}); // Función play actual (se reasigna abajo).
  const stopRef = useRef<(() => void) | null>(null); // stop() del control de animate.
  const [activeIndex, setActiveIndex] = useState(0); // Índice que pinta el DOM.
  const [measuredWidths, setMeasuredWidths] = useState<number[]>([]); // Anchos medidos de cada frase.
  const sweepPos = useMotionValue(SWEEP_START); // Posición % de la banda (animable).
  const backgroundImage = useTransform(sweepPos, (pos) => // Recalcula el gradient cada frame.
    buildGradient(pos, optsRef.current.colors, optsRef.current.textColor), // Usa opts vivos, no los del render viejo.
  ); // Cierra la llamada.
  const isInView = useInView(spanRef, { once, amount: 0.1 }); // true cuando ~10% del span es visible.

  useEffect(() => { // Mide anchos cuando hay varias frases.
    const el = spanRef.current; // Nodo real.
    if (!el || !isMulti) return; // Nada que medir si es una sola frase.
    setMeasuredWidths(measureWidths(el, texts)); // Guarda px por frase.
  }, [isMulti, texts]); // Se re-ejecuta si cambian las frases.

  playRef.current = () => { // Define “reproducir un barrido” (se llama al entrar en vista o al repetir).
    const next = optsRef.current; // Opciones actuales.
    sweepPos.set(SWEEP_START); // Reinicia la banda a la izquierda.
    const controls = animate(sweepPos, SWEEP_END, { // Anima de inicio a fin.
      duration: next.duration, // Duración del barrido.
      delay: next.delay, // Delay inicial.
      ease: sweepEase, // Curva cúbica.
      onComplete() { // Al terminar el barrido.
        if (!next.repeat) return; // Sin repeat: se queda en el color final.
        timerRef.current = setTimeout(() => { // Espera repeatDelay y rota.
          const i = (indexRef.current + 1) % next.texts.length; // Siguiente frase (cíclico).
          indexRef.current = i; // Actualiza el ref.
          setActiveIndex(i); // Re-render con el nuevo texto.
          playRef.current(); // Encadena otro barrido.
        }, next.repeatDelay * 1000); // De segundos a ms.
      }, // Fin de DiaTextReveal.
    }); // Cierra la llamada y el bloque.
    stopRef.current = () => controls.stop(); // Permite cancelar al desmontar.
  }; // Fin de el bloque.

  useEffect(() => { // Arranca o salta la animación según visibilidad y reduced-motion.
    if (prefersReducedMotion) { // Accesibilidad: sin barrido.
      sweepPos.set(SWEEP_END); // Deja el texto en color final.
      return undefined; // No hay cleanup extra.
    } // Fin de el bloque.
    if (startOnView && !isInView) return undefined; // Aún no se ve: espera.
    if (once && hasPlayedRef.current) return undefined; // Ya se reprodujo y once=true.
    hasPlayedRef.current = true; // Marca que ya corrió.
    playRef.current(); // Dispara el barrido.
    return () => { // Al desmontar o cambiar deps.
      stopRef.current?.(); // Detiene animate().
      clearTimeout(timerRef.current); // Cancela el timeout de repeat.
    }; // Fin de el bloque.
  }, [isInView, startOnView, once, prefersReducedMotion, sweepPos]); // Deps que reinician el efecto.

  const fixedW = // Ancho fijo = el máximo de todas las frases.
    isMulti && fixedWidth && measuredWidths.length > 0 ? Math.max(...measuredWidths) : undefined; // undefined si no aplica.
  const animatedW = // Ancho animado = el de la frase activa.
    isMulti && !fixedWidth && measuredWidths[activeIndex] != null // Hay medida de esta frase.
      ? measuredWidths[activeIndex] // Úsala.
      : undefined; // Si no, Motion no anima width.

  return ( // El span recorta el gradient al glifo (background-clip: text).
    <motion.span// Span animado con gradient recortado al texto.
      ref={spanRef} /* Para inView y para medir. */
      className={cn("dia-text-reveal", className)} /* Clase base + extras. */
      style={{ // Estilos inline que Motion puede actualizar.
        transform: "translateY(-2px)", // Micro-ajuste óptico de línea.
        color: "transparent", // El relleno lo da el gradient, no el color.
        backgroundClip: "text", // Recorta el fondo a las letras (estándar).
        WebkitBackgroundClip: "text", // Prefijo WebKit (Safari/Chrome).
        backgroundSize: "100% 100%", // El gradient cubre todo el span.
        backgroundImage, // MotionValue → CSS en cada frame.
        ...(isMulti && { // Si hay varias frases, recorta el overflow.
          display: "inline-block", // Permite animar width.
          overflow: "hidden", // Esconde el texto que se sale al cambiar width.
          whiteSpace: "nowrap", // Una línea.
          ...(fixedW != null && { width: fixedW }), // Ancho fijo si se pidió.
        }), // Cierra el callback.
      }} // Cierra el objeto de estilo.
      animate={animatedW != null ? { width: animatedW } : undefined} /* Anima width al cambiar de frase. */
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }} /* Ease de Material para el width. */
      {...props} /* Props extra (id, aria-label…). */
    >  {/* Continúa el bloque. */}
      {texts[activeIndex]} // Frase visible ahora.
    </motion.span>// Cierra el <motion>.
  ); // Cierra la llamada.
} // Fin de el bloque.
