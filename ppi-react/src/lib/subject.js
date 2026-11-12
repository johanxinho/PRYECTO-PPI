// Color estable por materia: el mismo nombre siempre recibe el mismo tono.
const TONES = 6;

export function subjectTone(subject = "") {
  let hash = 0;
  for (let index = 0; index < subject.length; index += 1) {
    hash = (hash * 31 + subject.charCodeAt(index)) >>> 0;
  }
  return (hash % TONES) + 1;
}

export function subjectColor(subject = "") {
  return `var(--subject-${subjectTone(subject)})`;
}

export function firstName(value = "") {
  return String(value).trim().split(/\s+/)[0] || "";
}