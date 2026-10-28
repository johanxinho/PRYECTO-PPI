const REMINDER_OFFSETS_MS: Record<string, number> = {
  "Al momento": 0,
  "5 minutos antes": 5 * 60_000,
  "10 minutos antes": 10 * 60_000,
  "30 minutos antes": 30 * 60_000,
  "1 hora antes": 60 * 60_000,
  "3 horas antes": 3 * 60 * 60_000,
  "12 horas antes": 12 * 60 * 60_000,
  "24 horas antes": 24 * 60 * 60_000,
  "1 día antes": 24 * 60 * 60_000,
  "1 dia antes": 24 * 60 * 60_000,
};

export function reminderOffsetMs(reminder: string | null | undefined): number | null {
  if (!reminder) return null;
  return Object.prototype.hasOwnProperty.call(REMINDER_OFFSETS_MS, reminder)
    ? REMINDER_OFFSETS_MS[reminder]
    : null;
}

export function taskDueAtUtc(
  date: string | null | undefined,
  time: string | null | undefined,
  timeZone: string | null | undefined,
): Date | null {
  if (!date || !time) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText, secondText = "0"] = timeMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;

  const normalizedDate = new Date(Date.UTC(year, month - 1, day));
  if (normalizedDate.getUTCFullYear() !== year || normalizedDate.getUTCMonth() !== month - 1 || normalizedDate.getUTCDate() !== day) return null;
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const zone = timeZone || "America/Bogota";
  let guess = targetAsUtc;
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    return null;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]),
    );
    const renderedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const difference = targetAsUtc - renderedAsUtc;
    if (difference === 0) return new Date(guess);
    guess += difference;
  }

  // Reject nonexistent local times (for example, a clock jump at DST start).
  return null;
}

export function taskReminderAtUtc(task: {
  date?: string;
  time?: string;
  time_zone?: string | null;
  reminder?: string | null;
}): Date | null {
  const offset = reminderOffsetMs(task.reminder);
  if (offset === null) return null;
  const dueAt = taskDueAtUtc(task.date, task.time, task.time_zone);
  if (!dueAt) return null;
  return new Date(dueAt.getTime() - offset);
}
