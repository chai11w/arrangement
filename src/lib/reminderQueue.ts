import type { ReminderTrigger } from "./reminderEngine";

const CONSUMED_KEY = "arkme-demo.reminderConsumed";

let _queue: ReminderTrigger[] = [];
let _current: ReminderTrigger | null = null;
let _listener: (() => void) | null = null;
let _consumedIds = new Set<string>();

function loadConsumed(): Set<string> {
  try {
    const raw = localStorage.getItem(CONSUMED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveConsumed() {
  try {
    localStorage.setItem(CONSUMED_KEY, JSON.stringify([..._consumedIds]));
  } catch { /* ignore */ }
}

// Restore persisted consumed IDs on module load
_consumedIds = loadConsumed();

function triggerKey(t: ReminderTrigger): string {
  return `${t.arrangementId}_${t.tier}`;
}

export function enqueue(triggers: ReminderTrigger[]) {
  for (const t of triggers) {
    const key = triggerKey(t);
    if (_consumedIds.has(key)) continue;
    const exists = _queue.find((q) => triggerKey(q) === key) || (_current && triggerKey(_current) === key);
    if (exists) continue;
    _queue.push(t);
  }
  _queue.sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime());
  if (!_current) advance();
}

export function advance(): ReminderTrigger | null {
  _current = _queue.shift() || null;
  _listener?.();
  return _current;
}

export function current(): ReminderTrigger | null {
  return _current;
}

export function peekNext(): ReminderTrigger | null {
  return _queue[0] || null;
}

export function removeArrangement(arrangementId: string) {
  _queue = _queue.filter((t) => t.arrangementId !== arrangementId);
  let changed = false;
  for (const key of _consumedIds) {
    if (key.startsWith(arrangementId + "_")) {
      _consumedIds.delete(key);
      changed = true;
    }
  }
  if (changed) saveConsumed();
  if (_current?.arrangementId === arrangementId) {
    _current = null;
  }
}

export function snoozeCurrent(minutes: number = 5) {
  if (!_current) return;
  // Clear consumed record so the snoozed trigger can fire again
  _consumedIds.delete(triggerKey(_current));
  saveConsumed();
  const snoozed: ReminderTrigger = {
    ..._current,
    triggerAt: new Date(Date.now() + minutes * 60 * 1000),
  };
  _queue.push(snoozed);
  _queue.sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime());
}

export function dismissCurrent() {
  if (_current) {
    _consumedIds.add(triggerKey(_current));
    saveConsumed();
  }
}

/** Call after any queue-mutating action to advance + notify UI */
export function commitAndAdvance() {
  advance();
}

export function onQueueChange(fn: () => void) {
  _listener = fn;
  return () => {
    _listener = null;
  };
}

/** Clears queue and current item only; _consumedIds is intentionally preserved so dismissed triggers don't re-fire on next scan. */
export function resetQueue() {
  _queue = [];
  _current = null;
}

export function queueLength(): number {
  return _queue.length + (_current ? 1 : 0);
}
