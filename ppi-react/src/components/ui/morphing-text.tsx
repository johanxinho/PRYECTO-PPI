"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";

const EMPTY_TEXTS = [""];

interface MorphingTextProps {
  className?: string;
  texts: string[];
}

export function MorphingText({ texts, className }: MorphingTextProps) {
  const phrases = useMemo(
    () =>
      Array.isArray(texts) ? texts.filter((text) => typeof text === "string" && text.trim()) : [],
    [texts]
  );
  const safePhrases = phrases.length > 0 ? phrases : EMPTY_TEXTS;
  const [index, setIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setIndex(0);
    if (prefersReducedMotion || safePhrases.length < 2) return undefined;

    let timer = 0;
    let stopped = false;
    const scheduleNext = () => {
      if (stopped || document.hidden) return;
      timer = window.setTimeout(() => {
        setIndex((current) => (current + 1) % safePhrases.length);
        scheduleNext();
      }, 2600);
    };
    const onVisibilityChange = () => {
      window.clearTimeout(timer);
      if (!document.hidden) scheduleNext();
    };

    scheduleNext();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [safePhrases, prefersReducedMotion]);

  return (
    <div className={["morphing-text", className].filter(Boolean).join(" ")} aria-live="off">
      <span key={`${index}-${safePhrases[index]}`} className="morphing-line">
        {safePhrases[index]}
      </span>
    </div>
  );
}
