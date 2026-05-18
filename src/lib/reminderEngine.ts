import type { Arrangement } from "@/types/record";
import { isMultiDay, isCrossMonth } from "@/types/record";

export type ReminderClass = "daily" | "monthly" | "yearly";

export interface ReminderTrigger {
  arrangementId: string;
  title: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime?: string;
  triggerAt: Date;
  tier: "early1" | "early2" | "start";
  class: ReminderClass;
}

function parseWakeUp(memoryContent: string): string {
  const match = memoryContent.match(/起床[：:]\s*(\d{1,2}:\d{2})/);
  return match ? match[1] : "08:00";
}

export function classifyArrangement(a: Arrangement): ReminderClass {
  if (isCrossMonth(a)) return "yearly";
  if (isMultiDay(a)) return "monthly";
  return "daily";
}

function getStartDate(a: Arrangement, memoryContent: string): Date {
  const time = a.startTime || parseWakeUp(memoryContent);
  const [h, m] = time.split(":").map(Number);
  const d = new Date(a.date + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
}

function getEndDatetime(a: Arrangement, memoryContent: string): Date {
  const defaultTime = parseWakeUp(memoryContent);
  const endDate = a.endDate || a.date;
  const endTime = a.endTime || a.startTime || defaultTime;
  const [h, m] = endTime.split(":").map(Number);
  const d = new Date(endDate + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
}

const TIER_RULES: Record<ReminderClass, Array<{ tier: ReminderTrigger["tier"]; offsetMs: number }>> = {
  yearly: [
    { tier: "early1", offsetMs: -24 * 60 * 60 * 1000 },
    { tier: "early2", offsetMs: -60 * 60 * 1000 },
    { tier: "start", offsetMs: 0 },
  ],
  monthly: [
    { tier: "early1", offsetMs: -12 * 60 * 60 * 1000 },
    { tier: "early2", offsetMs: -30 * 60 * 1000 },
    { tier: "start", offsetMs: 0 },
  ],
  daily: [
    { tier: "early1", offsetMs: -60 * 60 * 1000 },
    { tier: "early2", offsetMs: -10 * 60 * 1000 },
    { tier: "start", offsetMs: 0 },
  ],
};

export function computeTriggers(a: Arrangement, memoryContent: string): ReminderTrigger[] {
  const cls = classifyArrangement(a);
  const start = getStartDate(a, memoryContent);
  const rules = TIER_RULES[cls];

  return rules.map((rule) => ({
    arrangementId: a.id,
    title: a.title,
    date: a.date,
    endDate: a.endDate || undefined,
    startTime: a.startTime || parseWakeUp(memoryContent),
    endTime: a.endTime || undefined,
    triggerAt: new Date(start.getTime() + rule.offsetMs),
    tier: rule.tier,
    class: cls,
  }));
}

export function scanDueTriggers(
  arrangements: Arrangement[],
  memoryContent: string,
  now: Date = new Date(),
): ReminderTrigger[] {
  const all: ReminderTrigger[] = [];
  for (const a of arrangements) {
    if (a.status === "done" || a.status === "later") continue;
    // Skip arrangements that have already ended
    const endDt = getEndDatetime(a, memoryContent);
    if (now.getTime() >= endDt.getTime()) continue;
    const triggers = computeTriggers(a, memoryContent);
    // Only keep the latest due tier per arrangement (skip earlier tiers if later ones are due)
    let latestDue: ReminderTrigger | null = null;
    for (const t of triggers) {
      if (t.triggerAt.getTime() <= now.getTime()) {
        if (!latestDue || t.triggerAt.getTime() > latestDue.triggerAt.getTime()) {
          latestDue = t;
        }
      }
    }
    if (latestDue) all.push(latestDue);
  }
  all.sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime());
  return all;
}
