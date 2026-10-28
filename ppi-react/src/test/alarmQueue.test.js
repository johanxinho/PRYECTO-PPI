import { describe, expect, it } from "vitest";
import { enqueueAlarmTasks, removeAlarmTask } from "../services/alarmQueue";

const task = (id) => ({ id, title: `Actividad ${id}` });

describe("alarmQueue", () => {
  it("encola todas las alarmas vencidas y evita duplicados", () => {
    const first = task("a");
    const second = task("b");
    const queue = enqueueAlarmTasks([first], [first, second, second]);

    expect(queue).toEqual([first, second]);
  });

  it("retira una alarma sin descartar las siguientes", () => {
    const queue = [task("a"), task("b"), task("c")];

    expect(removeAlarmTask(queue, "a")).toEqual([queue[1], queue[2]]);
    expect(removeAlarmTask(queue, "missing")).toBe(queue);
  });
});
