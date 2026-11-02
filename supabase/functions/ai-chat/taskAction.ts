const PRIORITIES = new Set(["Alta", "Media", "Baja"]);
const REMINDERS = new Set([
  "Al momento",
  "5 minutos antes",
  "10 minutos antes",
  "30 minutos antes",
  "1 hora antes",
  "3 horas antes",
  "12 horas antes",
  "24 horas antes",
  "1 día antes",
]);

export function resolveTimeZone(value: unknown) {
  if (typeof value === "string" && value.trim().length <= 64) {
    const candidate = value.trim();
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format();
      return candidate;
    } catch {
      // Fall through to the institution's timezone.
    }
  }
  return "America/Bogota";
}

function localClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}-${values.minute}`.replace("-", ":"),
  };
}

export function hasExplicitCreateIntent(message: string) {
  const text = String(message || "").trim();
  if (!text) return false;
  if (
    /^\s*¿?\s*(cómo|como|puedes|podrías|podrias|se puede|es posible|quisiera saber)\b/i.test(
      text,
    ) ||
    /\b(?:dime|explícame|explicame|enséñame|ensenname|quiero saber|quisiera saber)\b[\s\S]{0,80}\b(?:cómo|como|crear|crea|programar|alarma|recordatorio|tarea)\b/i.test(
      text,
    )
  ) {
    return false;
  }
  if (
    /\b(no|nunca|evita|sin)\b.{0,50}\b(alarma|recordatorio|tarea|actividad)\b/i.test(
      text,
    )
  ) {
    return false;
  }
  return (
    /\b(crea|crear|agrega|añade|pon|ponme|haz|programa|agenda|registra|anota|recuérdame|recuerdame|quiero|necesito)\b[\s\S]{0,120}\b(alarma|recordatorio|tarea|actividad)\b/i.test(
      text,
    ) || /^\s*recu[eé]rdame\b/i.test(text)
  );
}

export function validateReminderArgs(
  args: Record<string, unknown>,
  timeZone: string,
  now = new Date(),
) {
  const title = typeof args.title === "string" ? args.title.trim() : "";
  const subject =
    typeof args.subject === "string" ? args.subject.trim() : "Personal";
  const date = typeof args.date === "string" ? args.date.trim() : "";
  const time = typeof args.time === "string" ? args.time.trim() : "";
  const description =
    typeof args.description === "string" ? args.description.trim() : "";

  if (!title || title.length > 120) {
    return {
      ok: false as const,
      message: "Necesito un título breve para crear la alarma.",
    };
  }
  if (subject.length > 60) {
    return {
      ok: false as const,
      message: "La asignatura no puede superar 60 caracteres.",
    };
  }
  if (description.length > 500) {
    return {
      ok: false as const,
      message: "La descripción no puede superar 500 caracteres.",
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      ok: false as const,
      message: "¿Para qué fecha quieres la alarma?",
    };
  }
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    return {
      ok: false as const,
      message: "No pude interpretar esa fecha. Indícame una fecha válida.",
    };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return {
      ok: false as const,
      message: "¿A qué hora quieres que suene la alarma?",
    };
  }

  const clock = localClock(now, timeZone);
  if (date < clock.date || (date === clock.date && time < clock.time)) {
    return {
      ok: false as const,
      message: "Esa fecha y hora ya pasó. Indícame un momento futuro.",
    };
  }

  const priority =
    typeof args.priority === "string" && PRIORITIES.has(args.priority)
      ? args.priority
      : "Media";
  const reminder =
    typeof args.reminder === "string" && REMINDERS.has(args.reminder)
      ? args.reminder
      : "30 minutos antes";

  return {
    ok: true as const,
    task: {
      title,
      subject: subject || "Personal",
      description,
      date,
      time,
      time_zone: timeZone,
      priority,
      reminder,
      completed: false,
      source: "recordate",
      external_id: null,
    },
  };
}
