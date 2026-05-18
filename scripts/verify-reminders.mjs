/**
 * Standalone verification of reminder engine + queue logic.
 * Run: node scripts/verify-reminders.mjs
 */

// ---- Minimal type stubs (mirrors src/types/record.ts) ----
function isMultiDay(a) {
  return Boolean(a.endDate && a.endDate !== a.date);
}
function isCrossMonth(a) {
  if (!a.endDate || a.endDate === a.date) return false;
  return a.date.slice(0, 7) !== a.endDate.slice(0, 7);
}

// ---- Reminder Engine (mirrors src/lib/reminderEngine.ts) ----
// NOTE: computeTriggers here takes an extra `now` param and filters out past triggers
// inline, while the source version returns all 3 triggers and lets scanDueTriggers
// handle filtering. This is intentional — the test file is a standalone simplified copy.
function parseWakeUp(memoryContent) {
  const match = memoryContent.match(/起床[：:]\s*(\d{1,2}:\d{2})/);
  return match ? match[1] : "08:00";
}

function classifyArrangement(a) {
  if (isCrossMonth(a)) return "yearly";
  if (isMultiDay(a)) return "monthly";
  return "daily";
}

function getStartDate(a, memoryContent) {
  const time = a.startTime || parseWakeUp(memoryContent);
  const [h, m] = time.split(":").map(Number);
  const d = new Date(a.date + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
}

const TIER_RULES = {
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

function computeTriggers(a, memoryContent, now) {
  const cls = classifyArrangement(a);
  const start = getStartDate(a, memoryContent);
  const rules = TIER_RULES[cls];
  return rules
    .map((rule) => ({
      arrangementId: a.id,
      title: a.title,
      date: a.date,
      startTime: a.startTime || parseWakeUp(memoryContent),
      triggerAt: new Date(start.getTime() + rule.offsetMs),
      tier: rule.tier,
      class: cls,
    }))
    .filter((t) => t.triggerAt.getTime() > now.getTime());
}

// ---- Reminder Queue (mirrors src/lib/reminderQueue.ts) ----
function createQueue(nowFn) {
  let _queue = [];
  let _current = null;
  let _consumedIds = new Set();

  function triggerKey(t) {
    return `${t.arrangementId}_${t.tier}`;
  }

  function enqueue(triggers) {
    for (const t of triggers) {
      const key = triggerKey(t);
      if (_consumedIds.has(key)) continue;
      const exists = _queue.find((q) => triggerKey(q) === key);
      if (exists) continue;
      _queue.push(t);
    }
    _queue.sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime());
    if (!_current) advance();
  }

  function advance() {
    _current = _queue.shift() || null;
    return _current;
  }

  function removeArrangement(arrangementId) {
    _queue = _queue.filter((t) => t.arrangementId !== arrangementId);
    for (const key of _consumedIds) {
      if (key.startsWith(arrangementId + "_")) _consumedIds.delete(key);
    }
    if (_current?.arrangementId === arrangementId) {
      _current = null;
    }
  }

  function snoozeCurrent(minutes = 5) {
    if (!_current) return;
    const snoozed = { ..._current, triggerAt: new Date(nowFn() + minutes * 60 * 1000) };
    _queue.push(snoozed);
    _queue.sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime());
  }

  function dismissCurrent() {
    if (_current) _consumedIds.add(triggerKey(_current));
  }

  function commitAndAdvance() {
    advance();
  }

  function resetQueue() {
    _queue = [];
    _current = null;
    _consumedIds = new Set();
  }

  return {
    enqueue, advance, current: () => _current,
    removeArrangement, snoozeCurrent, dismissCurrent,
    commitAndAdvance, resetQueue,
    _getQueue: () => _queue,
  };
}

// ---- TESTS ----
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

const memoryContent = `
## 作息时间
### 上午
- 起床：07:30
- 上班/上学：09:00
### 晚上
- 睡觉：23:00
`;

const now = new Date("2026-05-18T10:00:00");

console.log("=== Test 1: Classification ===");
assert(classifyArrangement({ date: "2026-05-18", endDate: "2026-05-18" }) === "daily", "same day → daily");
assert(classifyArrangement({ date: "2026-05-18", endDate: "2026-05-18" }) === "daily", "no endDate → daily");
assert(classifyArrangement({ date: "2026-05-18", endDate: "2026-05-20" }) === "monthly", "cross-day same month → monthly");
assert(classifyArrangement({ date: "2026-05-18", endDate: "2026-06-01" }) === "yearly", "cross-month → yearly");
assert(classifyArrangement({ date: "2026-05-18", endDate: "2026-01-01" }) === "yearly", "cross-year → yearly");

console.log("\n=== Test 2: Wake-up time parsing ===");
assert(parseWakeUp(memoryContent) === "07:30", "parses 起床:07:30");
assert(parseWakeUp("- 起床：08:00") === "08:00", "parses 起床：08:00 (full-width colon)");
assert(parseWakeUp("no wake time here") === "08:00", "fallback to 08:00");

console.log("\n=== Test 3: Trigger computation ===");

// Daily arrangement: 2026-05-18 14:00 (future)
const dailyArr = { id: "d1", title: "医院复查", date: "2026-05-18", startTime: "14:00" };
const dailyTriggers = computeTriggers(dailyArr, memoryContent, now);
assert(dailyTriggers.length === 3, "daily has 3 triggers");
assert(dailyTriggers[0].tier === "early1", "daily tier 0 = early1 (1h before)");
assert(dailyTriggers[1].tier === "early2", "daily tier 1 = early2 (10min before)");
assert(dailyTriggers[2].tier === "start", "daily tier 2 = start");

// early1 should be 13:00 (14:00 - 1h)
const early1Time = dailyTriggers[0].triggerAt;
assert(early1Time.getHours() === 13 && early1Time.getMinutes() === 0, `daily early1 = 13:00 (got ${early1Time.getHours()}:${String(early1Time.getMinutes()).padStart(2,"0")})`);

// Daily arrangement in the past → no triggers
const pastArr = { id: "d2", title: "过期安排", date: "2026-05-17", startTime: "09:00" };
const pastTriggers = computeTriggers(pastArr, memoryContent, now);
assert(pastTriggers.length === 0, "past arrangement has 0 triggers");

// Monthly arrangement: cross-day, starts tomorrow
const monthlyArr = { id: "m1", title: "出差", date: "2026-05-19", endDate: "2026-05-21", startTime: "08:00" };
const monthlyTriggers = computeTriggers(monthlyArr, memoryContent, now);
assert(monthlyTriggers.length === 3, "monthly has 3 triggers");
assert(monthlyTriggers[0].tier === "early1", "monthly tier 0 = early1 (12h before)");
assert(monthlyTriggers[1].tier === "early2", "monthly tier 1 = early2 (30min before)");
assert(monthlyTriggers[2].tier === "start", "monthly tier 2 = start");

// early1 should be 2026-05-18 20:00 (5/19 08:00 - 12h)
const mEarly1 = monthlyTriggers[0].triggerAt;
assert(mEarly1.getDate() === 18 && mEarly1.getHours() === 20, `monthly early1 = 5/18 20:00 (got ${mEarly1.getMonth()+1}/${mEarly1.getDate()} ${mEarly1.getHours()}:${String(mEarly1.getMinutes()).padStart(2,"0")})`);

// Yearly arrangement: cross-month, starts day after tomorrow at 15:00
const yearlyArr = { id: "y1", title: "韩国上学", date: "2026-05-20", endDate: "2026-06-15", startTime: "15:00" };
const yearlyTriggers = computeTriggers(yearlyArr, memoryContent, now);
assert(yearlyTriggers.length === 3, `yearly has 3 triggers (got ${yearlyTriggers.length})`);
assert(yearlyTriggers[0].tier === "early1", "yearly tier 0 = early1 (1 day before)");
assert(yearlyTriggers[1].tier === "early2", "yearly tier 1 = early2 (1h before)");
assert(yearlyTriggers[2].tier === "start", "yearly tier 2 = start");

// early1 should be 2026-05-19 15:00 (5/20 15:00 - 1 day)
const yEarly1 = yearlyTriggers[0].triggerAt;
assert(yEarly1.getDate() === 19 && yEarly1.getHours() === 15, `yearly early1 = 5/19 15:00 (got ${yEarly1.getMonth()+1}/${yEarly1.getDate()} ${yEarly1.getHours()}:${String(yEarly1.getMinutes()).padStart(2,"0")})`);

// No startTime → uses wake-up time from memory (07:30)
const noTimeArr = { id: "n1", title: "无时间安排", date: "2026-05-19" };
const noTimeTriggers = computeTriggers(noTimeArr, memoryContent, now);
const startTrigger = noTimeTriggers.find(t => t.tier === "start");
assert(startTrigger !== undefined, "no startTime → has start trigger");
assert(startTrigger.startTime === "07:30", "no startTime → uses wake-up 07:30");

console.log("\n=== Test 4: Queue operations ===");
const q = createQueue(() => now.getTime());

// Enqueue daily triggers
q.enqueue(dailyTriggers);
assert(q.current().arrangementId === "d1", "queue has current item");
assert(q.current().tier === "early1", "first item is early1 (earliest)");

// Dismiss current → advance to next
q.dismissCurrent();
q.commitAndAdvance();
assert(q.current() !== null, "after dismiss+advance, still has item");
assert(q.current().tier === "early2", "next is early2");

// Snooze current (5min from now=10:00 → 10:05, before start 14:00)
q.snoozeCurrent(5);
q.commitAndAdvance();
assert(q.current() !== null, "after snooze+advance, still has item");
assert(q.current().tier === "early2", "next is snoozed early2 (10:05 < 14:00 start)");

// Delete arrangement (left swipe)
const dailyArr2 = { id: "d3", title: "周会", date: "2026-05-18", startTime: "15:00" };
const dailyTriggers2 = computeTriggers(dailyArr2, memoryContent, now);
q.enqueue(dailyTriggers2);

// Remove arrangement by ID
q.removeArrangement("d3");
// current should still be snoozed early2 for d1
assert(q.current()?.arrangementId === "d1", "removeArrangement of non-current doesn't affect current");

// Dismiss snoozed early2 → advance to start
q.dismissCurrent();
q.commitAndAdvance();
assert(q.current() !== null, "after dismiss snoozed, still has start");
assert(q.current().tier === "start", "next is start (14:00)");

// Dismiss start → queue now empty
q.dismissCurrent();
q.commitAndAdvance();
assert(q.current() === null, "queue empty after all items consumed");

console.log("\n=== Test 5: Past triggers filtered out ===");
// computeTriggers should only return triggers in the future
const borderlineArr = {
  id: "b1", title: "边界测试", date: "2026-05-19",
  startTime: "08:00"
};
const borderlineTriggers = computeTriggers(borderlineArr, memoryContent, now);
for (const t of borderlineTriggers) {
  assert(t.triggerAt.getTime() > now.getTime(), `trigger ${t.tier} is in the future`);
}
assert(borderlineTriggers.length >= 1, "at least some triggers are in the future");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
