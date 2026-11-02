import { describe, expect, it } from "vitest";
import { taskDueAtMs } from "../services/alarmSchedule";

describe("local alarm schedule", () => {
  it("uses the task's IANA timezone instead of the device timezone", () => {
    expect(taskDueAtMs({
      date: "2026-10-29",
      time: "08:00",
      timeZone: "America/Bogota",
    })).toBe(Date.parse("2026-10-29T13:00:00.000Z"));

    expect(taskDueAtMs({
      date: "2026-10-29",
      time: "08:00",
      timeZone: "America/New_York",
    })).toBe(Date.parse("2026-10-29T12:00:00.000Z"));
  });

  it("returns null for invalid or missing task schedules", () => {
    expect(taskDueAtMs({ date: "2026-02-31", time: "08:00", timeZone: "America/Bogota" })).toBeNull();
    expect(taskDueAtMs(null)).toBeNull();
  });
});
