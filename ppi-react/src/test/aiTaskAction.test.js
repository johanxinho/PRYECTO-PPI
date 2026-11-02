import { describe, expect, it } from "vitest";
import {
  hasExplicitCreateIntent,
  resolveTimeZone,
  validateReminderArgs,
} from "../../../supabase/functions/ai-chat/taskAction.ts";

const now = new Date("2026-11-02T12:00:00.000Z");

const validArgs = {
  title: "Estudiar matemáticas",
  subject: "Matemáticas",
  date: "2026-11-02",
  time: "08:00",
};

describe("AI alarm action safety", () => {
  it("only enables task creation for clear create requests", () => {
    expect(hasExplicitCreateIntent("Crea una alarma para estudiar mañana a las ocho")).toBe(true);
    expect(hasExplicitCreateIntent("Recuérdame estudiar mañana a las ocho")).toBe(true);
    expect(hasExplicitCreateIntent("¿Cómo puedo crear una alarma?")).toBe(false);
    expect(hasExplicitCreateIntent("Dime cómo crear una alarma")).toBe(false);
    expect(hasExplicitCreateIntent("Quiero saber cómo crear una alarma")).toBe(false);
    expect(hasExplicitCreateIntent("No crees una alarma")).toBe(false);
    expect(hasExplicitCreateIntent("Ayúdame a organizar la semana")).toBe(false);
  });

  it("uses the supplied valid timezone and falls back for invalid values", () => {
    expect(resolveTimeZone("America/Bogota")).toBe("America/Bogota");
    expect(resolveTimeZone("Not/A_Real_Zone")).toBe("America/Bogota");
    expect(resolveTimeZone("x".repeat(65))).toBe("America/Bogota");
  });

  it("normalizes defaults and preserves the user's timezone", () => {
    const result = validateReminderArgs(validArgs, "America/Bogota", now);
    expect(result.ok).toBe(true);
    expect(result.task).toMatchObject({
      subject: "Matemáticas",
      time_zone: "America/Bogota",
      priority: "Media",
      reminder: "30 minutos antes",
      source: "recordate",
    });
  });

  it("rejects missing or malformed time, past dates and invalid calendar dates", () => {
    expect(
      validateReminderArgs({ title: "Estudiar", date: "2026-11-03" }, "America/Bogota", now).ok
    ).toBe(false);
    expect(validateReminderArgs({ ...validArgs, time: "25:00" }, "America/Bogota", now).ok).toBe(
      false
    );
    expect(
      validateReminderArgs({ ...validArgs, date: "2026-11-01" }, "America/Bogota", now).ok
    ).toBe(false);
    expect(
      validateReminderArgs({ ...validArgs, date: "2026-02-31" }, "America/Bogota", now).ok
    ).toBe(false);
  });
});
