const listenersBySchedule = new Map();

export function subscribeToScheduleVisitors(scheduleId, listener) {
  const listeners = listenersBySchedule.get(scheduleId) || new Set();
  listeners.add(listener);
  listenersBySchedule.set(scheduleId, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) listenersBySchedule.delete(scheduleId);
  };
}

export function publishScheduleVisitor(scheduleId, visitor) {
  const listeners = listenersBySchedule.get(scheduleId);
  if (!listeners) return;
  for (const listener of listeners) listener(visitor);
}
