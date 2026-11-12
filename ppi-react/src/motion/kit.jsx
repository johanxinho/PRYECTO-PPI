import { useEffect, useRef, useState } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence, useMotionValue, useSpring, useReducedMotion } from "motion/react";

// Solo se carga el subconjunto de animaciones que usamos (domAnimation).
export function MotionProvider({ children }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

export { m, AnimatePresence };

const EASE = [0.22, 1, 0.36, 1];

/* Aparición al entrar en pantalla, una sola vez. */
export function Reveal({ children, delay = 0, y = 14, className = "", as = "div" }) {
  const reduce = useReducedMotion();
  const Tag = m[as] || m.div;
  if (reduce) return <Tag className={className}>{children}</Tag>;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.5, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

/* Foco que sigue al cursor, solo con puntero fino y sin tocar el layout. */
export function useSpotlight() {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (!window.matchMedia?.("(pointer: fine)").matches) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    let frame = 0;
    let last = null;
    const paint = () => {
      frame = 0;
      if (!last) return;
      const rect = node.getBoundingClientRect();
      node.style.setProperty("--mx", `${(last.clientX - rect.left).toFixed(1)}px`);
      node.style.setProperty("--my", `${(last.clientY - rect.top).toFixed(1)}px`);
    };
    const onMove = (event) => {
      last = event;
      if (!frame) frame = window.requestAnimationFrame(paint);
    };
    node.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      node.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
}

/* Desplazamiento magnético muy leve en botones principales. */
export function useMagnetic(strength = 5) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 30, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 300, damping: 30, mass: 0.4 });

  const onPointerMove = (event) => {
    if (reduce || !window.matchMedia?.("(pointer: fine)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    x.set(dx * strength);
    y.set(dy * strength);
  };

  const onPointerLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { style: { x: springX, y: springY }, onPointerMove, onPointerLeave };
}

/* Cifra que sube contando, sin bloquear el hilo. */
export function AnimatedNumber({ value = 0, duration = 700, suffix = "", className = "" }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const from = useRef(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return undefined;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now) => {
      const ratio = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - ratio, 3);
      setDisplay(Math.round(origin + (value - origin) * eased));
      if (ratio < 1) frame = window.requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value, duration, reduce]);

  return <span className={className}>{display}{suffix}</span>;
}

export { EASE };
