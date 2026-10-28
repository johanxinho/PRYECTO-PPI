import { describe, expect, it } from "vitest";
import { reminderOffsetMs, taskDueAtUtc, taskReminderAtUtc } from "../../../supabase/functions/send-push/schedule.ts";

describe("Web Push reminder scheduling", () => {
  it("maps all selectable and legacy reminder labels", () => {
    expect(reminderOffsetMs("Al momento")).toBe(0);
    expect(reminderOffsetMs("30 minutos antes")).toBe(30 * 60_000);
    expect(reminderOffsetMs("24 horas antes")).toBe(24 * 60 * 60_000);
    expect(reminderOffsetMs("1 día antes")).toBe(24 * 60 * 60_000);
    expect(reminderOffsetMs("un valor desconocido")).toBeNull();
  });

  it("converts a Medellín wall-clock task time to UTC", () => {
    expect(taskDueAtUtc("2026-10-29", "08:00:00", "America/Bogota")?.toISOString())
      .toBe("2026-10-29T13:00:00.000Z");
  });

  it("subtracts the selected reminder offset from the task deadline", () => {
    const reminderAt = taskReminderAtUtc({
      date: "2026-10-29",
      time: "08:00",
      time_zone: "America/Bogota",
      reminder: "1 hora antes",
    });
    expect(reminderAt?.toISOString()).toBe("2026-10-29T12:00:00.000Z");
  });

  it("rejects invalid zones and nonexistent daylight-saving wall times", () => {
    expect(taskDueAtUtc("2026-10-29", "08:00", "Not/A_Real_Zone")).toBeNull();
    expect(taskDueAtUtc("2026-03-08", "02:30", "America/New_York")).toBeNull();
    expect(taskDueAtUtc("2026-02-31", "08:00", "America/Bogota")).toBeNull();
  });
});
