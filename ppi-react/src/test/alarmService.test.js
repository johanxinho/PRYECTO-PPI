import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockAudioParam {
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
}

class MockOscillator {
  frequency = new MockAudioParam();
  detune = new MockAudioParam();
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn(() => this.onended?.());
  onended = null;
  type = "sine";
}

class MockGain {
  gain = new MockAudioParam();
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioContext {
  state = window.__mockAudioState || "running";
  currentTime = 1;
  destination = {};
  oscillators = [];
  gains = [];
  resume = vi.fn(async () => {
    if (window.__rejectAudioResume) throw new Error("NotAllowedError");
    this.state = "running";
  });
  createOscillator = () => {
    const oscillator = new MockOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  };
  createGain = () => {
    const gain = new MockGain();
    this.gains.push(gain);
    return gain;
  };
}

let alarmService;
let createdContexts;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  createdContexts = [];
  window.__mockAudioState = "running";
  window.__rejectAudioResume = false;
  window.AudioContext = class extends MockAudioContext {
    constructor() {
      super();
      createdContexts.push(this);
    }
  };
  alarmService = await import("../services/alarmService");
});

afterEach(() => {
  vi.useRealTimers();
  delete window.AudioContext;
  delete window.__mockAudioState;
  delete window.__rejectAudioResume;
});

describe("alarmService", () => {
  it("reproduce la sirena potente con niveles de audio útiles", async () => {
    await expect(alarmService.playAlarm("classic", 0.55)).resolves.toBe(true);
    expect(createdContexts).toHaveLength(1);
    expect(createdContexts[0].oscillators).toHaveLength(2);
    expect(createdContexts[0].oscillators[0].type).toBe("sawtooth");
    const peak = (0.18 + (0.55 ** 0.7) * 0.72) * 0.72;
    expect(createdContexts[0].gains[0].gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      expect.closeTo(peak, 4),
      expect.any(Number),
    );
  });

  it("reanuda un contexto suspendido durante una acción de usuario", async () => {
    window.__mockAudioState = "suspended";
    await expect(alarmService.unlockAlarmAudio()).resolves.toBe(true);
    expect(createdContexts[0].resume).toHaveBeenCalledOnce();
  });

  it("devuelve false en lugar de rechazar si el navegador bloquea la reproducción", async () => {
    window.__mockAudioState = "suspended";
    window.__rejectAudioResume = true;
    await expect(alarmService.playAlarm("digital", 0.8)).resolves.toBe(false);
  });

  it("repite la alarma hasta detenerla explícitamente", async () => {
    const handle = await alarmService.startAlarm("digital", 0.8, 10_000);
    expect(handle).toEqual({ stop: expect.any(Function) });
    const firstCycleCount = createdContexts[0].oscillators.length;
    await vi.advanceTimersByTimeAsync(alarmService.ALARM_REPEAT_MS);
    expect(createdContexts[0].oscillators.length).toBeGreaterThan(firstCycleCount);
    handle.stop();
    const stoppedCount = createdContexts[0].oscillators.length;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(createdContexts[0].oscillators.length).toBe(stoppedCount);
  });

  it("no intenta reproducir con el volumen en cero", async () => {
    await expect(alarmService.playAlarm("classic", 0)).resolves.toBe(false);
    expect(createdContexts).toHaveLength(1);
    expect(createdContexts[0].oscillators).toHaveLength(0);
  });
});
