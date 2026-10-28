"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

const morphTime = 1.5;
const cooldownTime = 0.5;
const EMPTY_TEXTS = [""];
type NavigatorWithResourceHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

const useMorphingText = (inputTexts: string[]) => {
  const texts = inputTexts?.length ? inputTexts : EMPTY_TEXTS;
  const textIndexRef = useRef(0);
  const morphRef = useRef(0);
  const cooldownRef = useRef(0);
  const timeRef = useRef(new Date());
  const text1Ref = useRef<HTMLSpanElement>(null);
  const text2Ref = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const resourceNavigator =
    typeof navigator === "undefined" ? null : (navigator as NavigatorWithResourceHints);
  const memory = Number(resourceNavigator?.deviceMemory) || 0;
  const cores = Number(resourceNavigator?.hardwareConcurrency) || 0;
  const saveData = Boolean(resourceNavigator?.connection?.saveData);
  const frameInterval =
    saveData || (memory > 0 && memory <= 2) || (cores > 0 && cores <= 2) ? 32 : 16;

  const setStyles = useCallback(
    (fraction: number) => {
      const [current1, current2] = [text1Ref.current, text2Ref.current];
      if (!current1 || !current2) return;
      current2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
      current2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;
      const invertedFraction = 1 - fraction;
      current1.style.filter = `blur(${Math.min(8 / invertedFraction - 8, 100)}px)`;
      current1.style.opacity = `${Math.pow(invertedFraction, 0.4) * 100}%`;
      current1.textContent = texts[textIndexRef.current % texts.length];
      current2.textContent = texts[(textIndexRef.current + 1) % texts.length];
    },
    [texts]
  );

  const doMorph = useCallback(() => {
    morphRef.current -= cooldownRef.current;
    cooldownRef.current = 0;
    let fraction = morphRef.current / morphTime;
    if (fraction > 1) {
      cooldownRef.current = cooldownTime;
      fraction = 1;
    }
    setStyles(fraction);
    if (fraction === 1) textIndexRef.current += 1;
  }, [setStyles]);

  const doCooldown = useCallback(() => {
    morphRef.current = 0;
    const [current1, current2] = [text1Ref.current, text2Ref.current];
    if (current1 && current2) {
      current2.style.filter = "none";
      current2.style.opacity = "100%";
      current1.style.filter = "none";
      current1.style.opacity = "0%";
    }
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      textIndexRef.current = 0;
      morphRef.current = 0;
      cooldownRef.current = 0;
      if (text1Ref.current) {
        text1Ref.current.textContent = texts[0];
        text1Ref.current.style.filter = "none";
        text1Ref.current.style.opacity = "0%";
      }
      if (text2Ref.current) {
        text2Ref.current.textContent = texts[0];
        text2Ref.current.style.opacity = "100%";
        text2Ref.current.style.filter = "none";
      }
      return undefined;
    }

    let animationFrameId = 0;
    let active = true;
    let lastUpdate = 0;
    timeRef.current = new Date();

    const animateFrame = (now: number) => {
      animationFrameId = 0;
      if (!active || document.hidden) return;
      if (!lastUpdate || now - lastUpdate >= frameInterval) {
        lastUpdate = now;
        const newTime = new Date();
        const dt = (newTime.getTime() - timeRef.current.getTime()) / 1000;
        timeRef.current = newTime;
        cooldownRef.current -= dt;
        if (cooldownRef.current <= 0) doMorph();
        else doCooldown();
      }
      animationFrameId = requestAnimationFrame(animateFrame);
    };
    const startAnimation = () => {
      if (active && !document.hidden && !animationFrameId) {
        animationFrameId = requestAnimationFrame(animateFrame);
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
        return;
      }
      timeRef.current = new Date();
      lastUpdate = 0;
      startAnimation();
    };

    startAnimation();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [doMorph, doCooldown, texts, prefersReducedMotion, frameInterval]);

  return { text1Ref, text2Ref };
};

interface MorphingTextProps {
  className?: string;
  texts: string[];
}

function Texts({ texts }: Pick<MorphingTextProps, "texts">) {
  const { text1Ref, text2Ref } = useMorphingText(texts);
  return (
    <>
      <span className="morphing-line" ref={text1Ref} />
      <span className="morphing-line" ref={text2Ref} />
    </>
  );
}

function SvgFilters() {
  return (
    <svg id="filters" className="morphing-filters" width="0" height="0" aria-hidden="true">
      <defs>
        <filter id="threshold" x="0%" y="0%" width="100%" height="100%">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 255 -140"
          />
        </filter>
      </defs>
    </svg>
  );
}

export function MorphingText({ texts, className }: MorphingTextProps) {
  const safeTexts = texts?.length ? texts : EMPTY_TEXTS;
  return (
    <>
      <div className={["morphing-text", className].filter(Boolean).join(" ")}>
        <Texts texts={safeTexts} />
      </div>
      <SvgFilters />
    </>
  );
}
