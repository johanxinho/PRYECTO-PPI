export function cn(...inputs) { // Une clases CSS ignorando valores falsy (false, null, "").
  return inputs.flat(Infinity).filter(Boolean).join(" "); // Aplana arrays anidados, filtra vacíos y los junta con espacios.
} // Fin de cn: se usa en MorphingText y otros componentes de UI.
