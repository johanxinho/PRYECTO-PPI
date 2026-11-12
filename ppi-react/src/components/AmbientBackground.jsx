import { useEffect, useRef, useState } from "react";

// Escena continua de RECORDATE: un solo fondo para portada, acceso y app.
// Primer pintado en CSS; el canvas entra después del primer idle y se funde.
export default function AmbientBackground() {
  const canvasRef = useRef(null);
  const parallaxRef = useRef(null);
  const [webgl, setWebgl] = useState(false);
  const [cssFallback, setCssFallback] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const lowEnd =
      (navigator.hardwareConcurrency || 8) <= 4 ||
      (navigator.deviceMemory || 8) <= 4;
    if (lowEnd) {
      setCssFallback(true);
      return undefined;
    }

    let cancelled = false;
    let handle = null;
    let idleId = 0;
    let timeoutId = 0;

    const mount = async () => {
      if (cancelled) return;
      try {
        const { createAurora } = await import("../background/aurora");
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        handle = createAurora(canvas, {
          animate: !reduce?.matches,
          onLowFps: () => {
            handle?.destroy();
            handle = null;
            setWebgl(false);
            setCssFallback(true);
          },
          onLost: () => {
            handle = null;
            setWebgl(false);
            setCssFallback(true);
          },
        });
        if (!handle) {
          setCssFallback(true);
          return;
        }
        handle.start();
        if (!cancelled) setWebgl(true);
      } catch {
        if (!cancelled) setCssFallback(true);
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(mount, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(mount, 220);
    }

    return () => {
      cancelled = true;
      if (idleId && window.cancelIdleCallback) window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
      handle?.destroy();
    };
  }, []);

  // Parallax mínimo: solo transform, sin tocar el layout y sin animar en reduced motion.
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (reduce?.matches) return undefined;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const node = parallaxRef.current;
        if (!node) return;
        const offset = Math.min(window.scrollY * 0.045, 46);
        node.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0) scale(1.04)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="ambient" aria-hidden="true">
      <div className={`ambient__scene ${webgl ? "is-live" : ""}`} ref={parallaxRef}>
        <div className="ambient__base" />
        <div className={`ambient__blobs ${cssFallback || !webgl ? "is-visible" : ""}`}>
          <span className="ambient__blob ambient__blob--a" />
          <span className="ambient__blob ambient__blob--b" />
          <span className="ambient__blob ambient__blob--c" />
        </div>
        <canvas ref={canvasRef} className="ambient__canvas" />
      </div>
      <div className="ambient__veil" />
    </div>
  );
}