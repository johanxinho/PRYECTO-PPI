// Alarmas sintetizadas con Web Audio: no descargan audio remoto ni exponen datos del usuario.
export const DEFAULT_ALARM_SOUND = "classic";
export const DEFAULT_ALARM_VOLUME = 0.55;

export const ALARM_SOUNDS = [
  { value: "classic", label: "Clásica", description: "Tres tonos claros y breves" },
  { value: "digital", label: "Digital", description: "Aviso electrónico de dos pulsos" },
  { value: "chime", label: "Campanilla", description: "Secuencia suave ascendente" },
  { value: "gentle", label: "Suave", description: "Pulso cálido para estudiar" },
];

const validSound = (value) => ALARM_SOUNDS.some((item) => item.value === value);
const clampVolume = (value) => Math.max(0, Math.min(1, Number(value) || 0));
let audioContext = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ||= new AudioContextClass();
  return audioContext;
}

function scheduleTone(context, frequency, start, duration, volume, type = "sine", detune = 0) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.detune.setValueAtTime(detune, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

/** Reproduce un preset corto, iniciable después de una acción del usuario. */
export async function playAlarm(sound = DEFAULT_ALARM_SOUND, volume = DEFAULT_ALARM_VOLUME) {
  const context = getAudioContext();
  if (!context) return false;
  if (context.state === "suspended") await context.resume();
  const selected = validSound(sound) ? sound : DEFAULT_ALARM_SOUND;
  const level = clampVolume(volume) * 0.18;
  const start = context.currentTime + 0.02;

  if (selected === "digital") {
    scheduleTone(context, 880, start, 0.16, level, "square");
    scheduleTone(context, 660, start + 0.22, 0.16, level, "square");
    scheduleTone(context, 880, start + 0.52, 0.16, level, "square");
  } else if (selected === "chime") {
    scheduleTone(context, 523.25, start, 0.7, level * 0.85, "sine");
    scheduleTone(context, 659.25, start + 0.18, 0.8, level * 0.75, "sine");
    scheduleTone(context, 783.99, start + 0.36, 0.95, level * 0.65, "sine");
  } else if (selected === "gentle") {
    scheduleTone(context, 392, start, 0.44, level * 0.7, "triangle");
    scheduleTone(context, 493.88, start + 0.3, 0.55, level * 0.65, "triangle");
  } else {
    scheduleTone(context, 740, start, 0.24, level, "sine");
    scheduleTone(context, 880, start + 0.3, 0.24, level, "sine");
    scheduleTone(context, 740, start + 0.62, 0.24, level, "sine");
  }
  return true;
}

export const isAlarmSound = validSound;
export const normalizeAlarmVolume = clampVolume;
