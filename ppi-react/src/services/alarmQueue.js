export function enqueueAlarmTasks(queue = [], incoming = []) {
  const queuedIds = new Set(queue.map((task) => task.id));
  const additions = [];

  for (const task of incoming) {
    if (!task?.id || queuedIds.has(task.id)) continue;
    queuedIds.add(task.id);
    additions.push(task);
  }

  return additions.length ? [...queue, ...additions] : queue;
}

export function removeAlarmTask(queue = [], taskId) {
  if (!queue.some((task) => task.id === taskId)) return queue;
  return queue.filter((task) => task.id !== taskId);
}
