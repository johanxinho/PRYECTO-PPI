import { taskDueAtUtc } from "../../../supabase/functions/send-push/schedule.ts";

export function taskDueAtMs(task) {
  if (!task) return null;
  return taskDueAtUtc(task.date, task.time, task.timeZone || task.time_zone)?.getTime() ?? null;
}
