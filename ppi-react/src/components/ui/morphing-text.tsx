"use client"; // Este componente anima el DOM: debe ejecutarse en el cliente.

import { useCallback, useEffect, useRef } from "react"; // Callbacks estables, efecto del loop y refs a los spans.
import { cn } from "@/lib/utils"; // Combina la clase base con la que mande el padre.

const morphTime = 1.5; // Segundos que dura el cruce (blur + fade) entre dos frases.
const cooldownTime = 0.5; // Pausa con la frase nítida antes del siguiente morph.

/**
 * Hook: alterna dos capas de texto con blur/opacidad según un reloj interno.
 * text1 se desvanece y text2 aparece; al terminar, avanza el índice del array.
 */
const useMorphingText = (texts: string[]) => {  // Abre useMorphingText.
  const textIndexRef = useRef(0); // Índice de la frase “actual” (capa 1).
  const morphRef = useRef(0); // Tiempo acumulado dentro del morph.
  const cooldownRef = useRef(0); // Tiempo restante de la pausa nítida.
  const timeRef = useRef(new Date()); // Marca del frame anterior (para dt).
  const text1Ref = useRef<HTMLSpanElement>(null); // Capa que se está yendo.
  const text2Ref = useRef<HTMLSpanElement>(null); // Capa que está llegando.

  const setStyles = useCallback( // Aplica blur y opacidad según fraction 0–1.
    (fraction: number) => { // 0 = solo capa 1; 1 = solo capa 2.
      const [current1, current2] = [text1Ref.current, text2Ref.current]; // Nodos reales.
      if (!current1 || !current2) return; // Aún no montaron: no toca el DOM.
      current2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`; // Capa 2 sale del blur (fraction↑ → blur↓).
      current2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`; // Opacidad con curva suave (pow 0.4).
      const invertedFraction = 1 - fraction; // Complemento: lo que le queda a la capa 1.
      current1.style.filter = `blur(${Math.min(8 / invertedFraction - 8, 100)}px)`; // Capa 1 entra en blur.
      current1.style.opacity = `${Math.pow(invertedFraction, 0.4) * 100}%`; // Capa 1 se apaga.
      current1.textContent = texts[textIndexRef.current % texts.length]; // Texto saliente.
      current2.textContent = texts[(textIndexRef.current + 1) % texts.length]; // Texto entrante (cíclico).
    }, // Fin de useMorphingText.
    [texts], // Si cambia el array, esta función se recrea.
  ); // Cierra la llamada.

  const doMorph = useCallback(() => { // Avanza el morph con el dt ya restado del cooldown.
    morphRef.current -= cooldownRef.current; // Si veníamos de cooldown, morph no debe contar ese resto.
    cooldownRef.current = 0; // Ya no estamos en pausa.
    let fraction = morphRef.current / morphTime; // Progreso 0–1 (puede pasarse).
    if (fraction > 1) { // El morph se acabó.
      cooldownRef.current = cooldownTime; // Empieza la pausa nítida.
      fraction = 1; // Clampa a 1 para estilos finales.
    } // Fin de el bloque.
    setStyles(fraction); // Pinta blur/opacidad/textos.
    if (fraction === 1) textIndexRef.current += 1; // Avanza a la siguiente frase.
  }, [setStyles]); // Depende de setStyles.

  const doCooldown = useCallback(() => { // Frame de pausa: capa 2 nítida, capa 1 invisible.
    morphRef.current = 0; // Reinicia el acumulador del morph.
    const [current1, current2] = [text1Ref.current, text2Ref.current]; // Nodos.
    if (current1 && current2) { // Ambos existen.
      current2.style.filter = "none"; // Sin blur.
      current2.style.opacity = "100%"; // Totalmente visible.
      current1.style.filter = "none"; // Limpia el blur de la capa oculta.
      current1.style.opacity = "0%"; // Invisible (será la siguiente saliente).
    } // Fin de el bloque.
  }, []); // Sin deps: solo toca refs.

  useEffect(() => { // Loop rAF + pausa si la pestaña está oculta o hay reduced-motion.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // Accesibilidad.
    if (reduced) { // Sin animación: muestra la primera frase y listo.
      if (text2Ref.current) { // Capa visible.
        text2Ref.current.textContent = texts[0] ?? ""; // Primera frase (o vacío).
        text2Ref.current.style.opacity = "100%"; // Opaca.
        text2Ref.current.style.filter = "none"; // Nítida.
      } // Fin de el bloque.
      if (text1Ref.current) text1Ref.current.style.opacity = "0%"; // Capa 1 oculta.
      return undefined; // No arranca el loop.
    } // Fin de el bloque.
    let animationFrameId = 0; // Id para cancelar el rAF.
    let hidden = document.hidden; // Copia local de visibilidad.
    const animate = () => { // Un tick del reloj.
      animationFrameId = requestAnimationFrame(animate); // Encadena el siguiente frame.
      if (hidden) return; // Pestaña oculta: no gasta CPU.
      const newTime = new Date(); // Ahora.
      const dt = (newTime.getTime() - timeRef.current.getTime()) / 1000; // Delta en segundos.
      timeRef.current = newTime; // Guarda para el próximo dt.
      cooldownRef.current -= dt; // Consume la pausa (si era 0, queda negativo).
      if (cooldownRef.current <= 0) doMorph(); // Pausa terminada: morph.
      else doCooldown(); // Todavía en pausa: estilos nítidos.
    }; // Fin de el bloque.
    const onVis = () => { // Al cambiar de pestaña.
      hidden = document.hidden; // Actualiza la bandera.
      timeRef.current = new Date(); // Evita un dt enorme al volver.
    }; // Fin de el bloque.
    animate(); // Arranca el loop.
    document.addEventListener("visibilitychange", onVis); // Escucha visibilidad.
    return () => { // Cleanup.
      cancelAnimationFrame(animationFrameId); // Para el rAF.
      document.removeEventListener("visibilitychange", onVis); // Quita el listener.
    }; // Fin de el bloque.
  }, [doMorph, doCooldown, texts]); // Se reinicia si cambian callbacks o frases.

  return { text1Ref, text2Ref }; // El componente Texts las engancha a dos <span>.
}; // Fin de el bloque.

interface MorphingTextProps { // Props públicas del export.
  className?: string; // Clases extra del wrapper.
  texts: string[]; // Frases que se van a cruzar.
} // Fin de el bloque.

/**
 * Dos spans apilados: el filtro SVG threshold los “funde” en un morph.
 * Recibe las refs del hook para que el loop escriba filter/opacity/text.
 */
function Texts({ texts }: Pick<MorphingTextProps, "texts">) {  // Abre Texts.
  const { text1Ref, text2Ref } = useMorphingText(texts); // Hook de animación.
  return ( // Fragmento con las dos capas.
    <>{/* Fragmento sin nodo extra en el DOM. */}
      <span className="morphing-line" ref={text1Ref} />{/* Capa saliente (empieza visible). */}
      <span className="morphing-line" ref={text2Ref} />{/* Capa entrante (empieza en blur). */}
    </>// Cierra el fragmento.
  ); // Cierra la llamada.
} // Fin de el bloque.

/**
 * SVG oculto: feColorMatrix tipo threshold para el look de morph líquido.
 * El CSS aplica filter:url(#threshold) sobre las capas de texto.
 */
function SvgFilters() {  // Abre SvgFilters.
  return ( // svg.defs no se pinta: solo registra el filtro.
    <svg id="filters" className="morphing-filters" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{/* aria-hidden: es decorativo. */}
      <defs>{/* Contenedor de filtros reutilizables. */}
        <filter id="threshold">{/* El CSS lo referencia por este id. */}
          <feColorMatrix// Matriz de color que hace el threshold del morph.
            in="SourceGraphic" /* Parte del texto ya dibujado. */
            type="matrix" /* Matriz 5×4 (RGBA + offset). */
            values="1 0 0 0 0// RGB identidad; alfa contrastado para el fuse.
                    0 1 0 0 0// Fila RGB de la matriz (identidad).
                    0 0 1 0 0// Fila RGB de la matriz (identidad).
                    0 0 0 255 -140" /* RGB intacto; alfa muy contrastado (threshold). */
          />{/* Cierra el input. */}
        </filter>{/* Cierra el <filter>. */}
      </defs>{/* Cierra el <defs>. */}
    </svg>// Cierra el <svg>.
  ); // Cierra la llamada.
} // Fin de el bloque.

/**
 * Componente público: wrapper + dos capas de texto + filtro SVG.
 * El padre solo pasa `texts` (y opcionalmente className).
 */
export function MorphingText({ texts, className }: MorphingTextProps) {  // Abre MorphingText.
  return ( // Caja que el CSS posiciona y recorta.
    <div className={cn("morphing-text", className)}>{/* Une clases del módulo y del padre. */}
      <Texts texts={texts} />{/* Capas animadas. */}
      <SvgFilters />{/* Filtro SVG compartido. */}
    </div>// Cierra el <div>.
  ); // Cierra la llamada.
} // Fin de el bloque.
