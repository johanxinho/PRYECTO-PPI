// Alarmas locales con Web Audio; no descargan audio remoto ni exponen datos del usuario.
export const DEFAULT_ALARM_SOUND = "classic";
export const DEFAULT_ALARM_VOLUME = 0.55;
export const ALARM_DURATION_MS = 30_000;
export const ALARM_REPEAT_MS = 1_500;

export const ALARM_SOUNDS = [
  { value: "classic", label: "Sirena potente", description: "Barrido insistente de dos tonos" },
  { value: "digital", label: "Digital fuerte", description: "Pulsos electrónicos agudos y repetidos" },
  { value: "chime", label: "Campanilla", description: "Secuencia ascendente clara" },
  { value: "gentle", label: "Suave", description: "Tonos más cálidos para estudiar" },
];

const MAX_GAIN = 0.9;
const validSound = (value) => ALARM_SOUNDS.some((item) => item.value === value);
const clampVolume = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 0;
};
const volumeToGain = (value) => {
  const normalized = clampVolume(value);
  return normalized === 0 ? 0 : Math.min(MAX_GAIN, 0.18 + Math.pow(normalized, 0.7) * 0.72);
};

let audioContext = null;
const activeOscillators = new Set();

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    if (!audioContext || audioContext.state === "closed") audioContext = new AudioContextClass();
    return audioContext;
  } catch {
    return null;
  }
}

async function getRunningAudioContext() {
  const context = getAudioContext();
  if (!context) return null;
  try {
    if (context.state === "suspended") await context.resume();
  } catch {
    return null;
  }
  return context.state === "running" ? context : null;
}

/** Debe llamarse desde un gesto del usuario para autorizar audio en el navegador. */
export async function unlockAlarmAudio() {
  return Boolean(await getRunningAudioContext());
}

function scheduleTone(context, frequency, start, duration, volume, type = "triangle", sweepTo = null) {
  if (volume <= 0) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (sweepTo && typeof oscillator.frequency.linearRampToValueAtTime === "function") {
    oscillator.frequency.linearRampToValueAtTime(sweepTo, start + duration / 2);
    oscillator.frequency.linearRampToValueAtTime(frequency, start + duration);
  }
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.onended = () => {
    activeOscillators.delete(oscillator);
    try { oscillator.disconnect(); gain.disconnect(); } catch { /* Ya desconectado. */ }
  };
  activeOscillators.add(oscillator);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

function playPattern(context, sound, level) {
  const selected = validSound(sound) ? sound : DEFAULT_ALARM_SOUND;
  const start = context.currentTime + 0.025;
  if (selected === "classic") {
    scheduleTone(context, 720, start, 0.48, level * 0.72, "sawtooth", 1_080);
    scheduleTone(context, 1_080, start + 0.55, 0.48, level * 0.72, "sawtooth", 720);
  } else if (selected === "digital") {
    scheduleTone(context, 988, start, 0.2, level * 0.82, "square");
    scheduleTone(context, 740, start + 0.25, 0.2, level * 0.82, "square");
    scheduleTone(context, 988, start + 0.72, 0.2, level * 0.82, "square");
  } else if (selected === "chime") {
    scheduleTone(context, 523.25, start, 0.5, level * 0.58, "sine");
    scheduleTone(context, 659.25, start + 0.2, 0.58, level * 0.52, "sine");
    scheduleTone(context, 783.99, start + 0.4, 0.68, level * 0.46, "sine");
  } else {
    scheduleTone(context, 392, start, 0.42, level * 0.5, "triangle");
    scheduleTone(context, 493.88, start + 0.32, 0.52, level * 0.46, "triangle");
  }
}

function stopActiveOscillators() {
  for (const oscillator of activeOscillators) {
    try { oscillator.stop(); } catch { /* Puede haber terminado entre tanto. */ }
  }
  activeOscillators.clear();
}

/** Reproduce un ciclo corto para previsualizar el tono desde un botón. */
export async function playAlarm(sound = DEFAULT_ALARM_SOUND, volume = DEFAULT_ALARM_VOLUME) {
  const context = await getRunningAudioContext();
  const level = volumeToGain(volume);
  if (!context || level <= 0) return false;
  try {
    playPattern(context, sound, level);
    return true;
  } catch {
    return false;
  }
}

/** Repite la alarma mientras la ventana del aviso está abierta; siempre devuelve un stop(). */
export async function startAlarm(sound = DEFAULT_ALARM_SOUND, volume = DEFAULT_ALARM_VOLUME, durationMs = ALARM_DURATION_MS) {
  const context = await getRunningAudioContext();
  const level = volumeToGain(volume);
  if (!context || level <= 0) return null;

  let stopped = false;
  let repeatTimer;
  let stopTimer;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(repeatTimer);
    clearTimeout(stopTimer);
    stopActiveOscillators();
  };
  const playCycle = () => {
    if (stopped || context.state !== "running") return;
    try { playPattern(context, sound, level); } catch { stop(); }
  };

  playCycle();
  repeatTimer = window.setInterval(playCycle, ALARM_REPEAT_MS);
  stopTimer = window.setTimeout(stop, Math.max(1_000, Number(durationMs) || ALARM_DURATION_MS));
  return { stop };
}

export const isAlarmSound = validSound;
export const normalizeAlarmVolume = clampVolume;
