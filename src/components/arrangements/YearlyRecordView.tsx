import { useEffect, useMemo, useState } from "react";
import { cn, statusBarBg, statusTitleClass, statusHeaderColor } from "@/lib/utils";
import type { Arrangement, ArrangementStatus } from "@/types/record";
import SwipeableItem from "@/components/ui/swipeable-item";

const MONTH_SHORT = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

type YearlySubTab = "year" | "ynote" | "goal";

interface YearlyRecordViewProps {
  subTab: YearlySubTab;
  year: number;
  items: Arrangement[];
  onYearChange: (year: number) => void;
  onUpdateStatus: (id: string, status: ArrangementStatus) => void;
  onEdit?: (a: Arrangement) => void;
}

export default function YearlyRecordView({
  subTab,
  year,
  items,
  onYearChange,
  onUpdateStatus,
  onEdit,
}: YearlyRecordViewProps) {
  if (subTab === "year") {
    return <YearChart year={year} items={items} onYearChange={onYearChange} onEdit={onEdit} />;
  }
  if (subTab === "ynote") {
    return <YearlyNoteList items={items} year={year} onUpdateStatus={onUpdateStatus} onEdit={onEdit} />;
  }
  return <GoalView year={year} />;
}

/* ============ 年：奥运四年周期 + 月份柱状图 ============ */
function YearChart({
  year,
  items,
  onYearChange,
  onEdit,
}: {
  year: number;
  items: Arrangement[];
  onYearChange: (year: number) => void;
  onEdit?: (a: Arrangement) => void;
}) {
  const offset = year - 2024;
  const olympiadStart = year - ((offset % 4) + 4) % 4;
  const olympiadYears = [olympiadStart, olympiadStart + 1, olympiadStart + 2, olympiadStart + 3];
  const today = new Date();
  const isCurrentYear = year === today.getFullYear();
  const currentMonthY = isCurrentYear
    ? `calc(28px + (${today.getMonth()} + ${(today.getDate() - 1 + (today.getHours() + today.getMinutes() / 60) / 24) / new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()}) * ((100% - 28px) / 12))`
    : null;

  const yearItems = useMemo(
    () =>
      items
        .filter(
          (a) =>
            a.date <= `${year}-12-31` &&
            (a.endDate || a.date) >= `${year}-01-01`
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [items, year]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 四年周期导航 */}
      <div className="flex items-center justify-between px-4 py-1 border-b border-[#E5E7EB]">
        <button
          type="button"
          onClick={() => onYearChange(year - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:bg-surface-muted"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" /></svg>
        </button>
        <div className="flex items-center gap-2">
          {olympiadYears.map((y) => {
            const active = y === year;
            const isCurrentYear = y === today.getFullYear();
            return (
              <button
                key={y}
                type="button"
                onClick={() => onYearChange(y)}
                className={cn(
                  "flex h-8 w-12 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                  active
                    ? "bg-[#09B83E] text-white"
                    : isCurrentYear
                    ? "bg-surface-muted text-[#09B83E]"
                    : "bg-surface-muted text-text-muted"
                )}
              >
                {y}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onYearChange(year + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:bg-surface-muted"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5" /></svg>
        </button>
      </div>

      {/* Column-based chart: months = rows, arrangements = columns */}
      <div className="min-h-0 flex-1 overflow-auto pr-4 relative">
        <div className="flex h-full">
          {/* Month labels on left */}
          <div className="shrink-0 w-9 sticky left-0 z-10 bg-bg">
            <div className="h-7 border-b border-[#E5E7EB]" />
            {MONTH_SHORT.map((mLabel) => (
              <div
                key={mLabel}
                className="flex items-center justify-end pr-1 border-t border-[#E5E7EB]/30"
                style={{ height: "calc((100% - 28px) / 12)" }}
              >
                <span className="text-xs text-text-tertiary leading-none">{mLabel}</span>
              </div>
            ))}
          </div>

          {/* Arrangement columns */}
          {yearItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-text-tertiary">本年暂无跨月安排</p>
            </div>
          ) : (
            <div className="relative flex flex-1">
              {(() => {
              const totalDays = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
              const dayOfYear = (m: number, d: number) =>
                Math.floor((new Date(year, m - 1, d).getTime() - new Date(year, 0, 1).getTime()) / 86400000) + 1;
              return yearItems.map((a) => {
              const [startY, startM, startD] = a.date.split("-").map(Number);
              const isStartInYear = a.date.startsWith(`${year}-`);
              const startDOY = isStartInYear ? dayOfYear(startM, startD) : 1;
              const [, endM, endD] = a.endDate ? a.endDate.split("-").map(Number) : [startY, startM, startD];
              const isEndInYear = a.endDate ? a.endDate.startsWith(`${year}-`) : true;
              const endDOY = isEndInYear ? dayOfYear(endM, endD) : totalDays;

              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onEdit?.(a)}
                  className="shrink-0 border-l border-[#E5E7EB] cursor-pointer text-left"
                  style={{ width: "68px" }}
                >
                  {/* Sticky column header */}
                  <div className="sticky top-0 z-[5] bg-bg border-b border-[#E5E7EB] px-1 h-7 flex items-center">
                    <div className={cn(
                      "text-[10px] leading-tight truncate",
                      statusHeaderColor(a)
                    )} title={a.title}>
                      {a.title}
                    </div>
                  </div>

                  {/* Month grid + single overlay bar */}
                  <div className="relative" style={{ height: "calc(100% - 28px)" }}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <div
                        key={m}
                        className="border-t border-[#E5E7EB]/30"
                        style={{ height: "calc(100% / 12)" }}
                      />
                    ))}
                    <div
                      className={cn(
                        "absolute left-0 right-0 rounded-sm px-0.5",
                        statusBarBg(a)
                      )}
                      style={{
                        top: `${((startDOY - 1) / totalDays) * 100}%`,
                        height: `${((endDOY - startDOY + 1) / totalDays) * 100}%`,
                      }}
                    >
                      <span className="block text-[8px] text-white leading-tight pt-0.5 truncate">
                        {(() => {
                          const s = isStartInYear ? `${startM}/${startD}` : "1/1";
                          if (!a.endDate || a.endDate === a.date) return s;
                          const e = isEndInYear ? `${endM}/${endD}` : "12/31";
                          return `${s}~${e}`;
                        })()}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })})()}
              {/* Current month line — inside content wrapper to span full scroll width */}
              {currentMonthY && (
                <div
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{ top: currentMonthY }}
                >
                  <div className="h-px bg-[#F46363]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#F46363] -mt-[3px]" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ 年记：跨月安排列表 ============ */
function YearlyNoteList({
  items,
  year: _year,
  onUpdateStatus,
  onEdit,
}: {
  items: Arrangement[];
  year: number;
  onUpdateStatus: (id: string, status: ArrangementStatus) => void;
  onEdit?: (a: Arrangement) => void;
}) {
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, Arrangement[]> = {};
    for (const a of items) {
      const key = a.date.slice(0, 4);
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.date.localeCompare(b.date));
    }
    return map;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center px-8">
          <p className="text-sm text-text-muted">暂无跨月安排</p>
          <p className="mt-1 text-xs text-text-tertiary">创建时设置超过1个月的结束日期，就会出现在这里</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto px-4">
      {Object.entries(grouped).map(([yearKey, yearItems]) => {
        const y = Number(yearKey);
        const cur = y === new Date().getFullYear();
        return (
          <div key={yearKey} className="mb-4">
            <h3 className={cn("mb-2 text-sm font-semibold", cur ? "text-[#09B83E]" : "text-text")}>
              {y}年{cur ? " 本年" : ""}
            </h3>
            <ul className="space-y-2">
              {yearItems.map((a) => (
                <SwipeableItem
                  key={a.id}
                  arrangement={a}
                  swipedId={swipedId}
                  setSwipedId={setSwipedId}
                  onUpdateStatus={onUpdateStatus}
                >
                  <button
                    type="button"
                    className="w-full text-left cursor-pointer"
                    onClick={() => onEdit?.(a)}
                  >
                    <div className={cn("text-sm", statusTitleClass(a))}>
                      {a.title}
                    </div>
                    <div className="mt-0.5 text-xs text-text-tertiary">
                      {a.date} ~ {a.endDate || a.date}
                      <span className="ml-2 text-text-disabled">
                        {monthSpan(a.date, a.endDate)}个月
                      </span>
                    </div>
                  </button>
                </SwipeableItem>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function monthSpan(start: string, end?: string): number {
  if (!end) return 1;
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  return (ey - sy) * 12 + (em - sm) + 1;
}

/* ============ 目标：年度目标视图 ============ */
interface Goal {
  id: string;
  title: string;
  year: number;
  done: boolean;
}

function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem("arkme-demo.goals");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGoals(goals: Goal[]) {
  localStorage.setItem("arkme-demo.goals", JSON.stringify(goals));
}

function GoalView({ year }: { year: number }) {
  const [goalYear, setGoalYear] = useState(year);
  const [goals, setGoals] = useState<Goal[]>(loadGoals);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => { setGoalYear(year); }, [year]);
  useEffect(() => { setGoals(loadGoals()); }, [year]);

  const today = new Date();
  const yearEnd = new Date(goalYear, 11, 31);
  const yearStart = new Date(goalYear, 0, 1);

  let daysLeft = 0;
  let progressPct = 0;

  if (goalYear === today.getFullYear()) {
    const totalDays = (yearEnd.getTime() - yearStart.getTime()) / 86400000 + 1;
    const elapsed = (today.getTime() - yearStart.getTime()) / 86400000;
    daysLeft = Math.max(0, Math.round((yearEnd.getTime() - today.getTime()) / 86400000));
    progressPct = Math.round((elapsed / totalDays) * 100);
  } else if (goalYear < today.getFullYear()) {
    progressPct = 100;
    daysLeft = Math.round((today.getTime() - yearEnd.getTime()) / 86400000);
  } else {
    daysLeft = Math.round((yearEnd.getTime() - today.getTime()) / 86400000);
    progressPct = 0;
  }

  const isPastYear = goalYear < today.getFullYear();

  const yearGoals = useMemo(
    () => goals.filter((g) => g.year === goalYear),
    [goals, goalYear]
  );
  const pending = yearGoals.filter((g) => !g.done);
  const done = yearGoals.filter((g) => g.done);

  const addGoal = () => {
    if (!newTitle.trim()) return;
    const next = [...goals, { id: Date.now().toString(36), title: newTitle.trim(), year: goalYear, done: false }];
    setGoals(next);
    saveGoals(next);
    setNewTitle("");
  };

  const toggleGoal = (id: string) => {
    const next = goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g));
    setGoals(next);
    saveGoals(next);
  };

  const changeGoalYear = (delta: number) => {
    setGoalYear((y) => y + delta);
  };

  return (
    <div className="flex h-full flex-col items-center overflow-auto px-8 py-6">
      {/* Year navigation */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={() => changeGoalYear(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:bg-surface-muted"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" /></svg>
        </button>
        <span className="text-base font-semibold text-text">{goalYear}年</span>
        <button
          type="button"
          onClick={() => changeGoalYear(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:bg-surface-muted"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5" /></svg>
        </button>
      </div>

      {/* 倒计时 */}
      <div className="text-center">
        <p className="text-xs text-text-muted">
          {goalYear === today.getFullYear() ? "今年还剩" : goalYear < today.getFullYear() ? "已过去" : "距离"}
        </p>
        <p className="mt-2 text-5xl font-bold text-text tracking-tight">
          {daysLeft}
        </p>
        <p className="text-sm text-text-muted">天</p>
      </div>

      {/* 漏斗进度 */}
      <div className="mt-6 flex flex-col items-center">
        <div className="relative h-40 w-20">
          <svg viewBox="0 0 80 160" className="h-full w-full" aria-hidden="true">
            <defs>
              <clipPath id="goalFunnel">
                <path d="M5 0 L25 70 L55 70 L75 0 Z" />
              </clipPath>
            </defs>
            <path
              d="M5 0 L25 70 L55 70 L75 0 Z"
              fill="none"
              stroke="var(--border)"
              strokeWidth="2"
            />
            <rect
              x="5"
              y={70 - (progressPct / 100) * 70}
              width="70"
              height={(progressPct / 100) * 70}
              fill="var(--primary)"
              opacity="0.3"
              clipPath="url(#goalFunnel)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-[#09B83E]">{progressPct}%</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-text-muted">年度进度</p>
      </div>

      {/* 年度目标 */}
      <div className="mt-6 w-full">
        <h3 className="mb-3 text-sm font-semibold text-text">{goalYear}年{isPastYear ? "回顾" : "目标"}</h3>

        {/* 添加目标 */}
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addGoal()}
            placeholder={isPastYear ? "往年已经达成了什么？" : "今年想达成什么？"}
            className="flex-1 rounded-lg border border-[#E5E7EB] bg-bg px-3 py-2 text-sm text-text outline-none focus:border-[#09B83E]"
          />
          <button
            type="button"
            onClick={addGoal}
            disabled={!newTitle.trim()}
            className="rounded-lg bg-[#09B83E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            加
          </button>
        </div>

        {pending.length === 0 && done.length === 0 ? (
          <p className="text-xs text-text-tertiary">{isPastYear ? "还没有往年回顾" : "还没有年度目标"}</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => toggleGoal(g.id)}
                  className="flex w-full items-center rounded-lg border border-[#E5E7EB] bg-surface px-3 py-2 text-left"
                >
                  <div className="mr-2 h-2 w-2 shrink-0 rounded-full bg-[#09B83E]" />
                  <span className="text-sm text-text">{g.title}</span>
                </button>
              </li>
            ))}
            {done.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => toggleGoal(g.id)}
                  className="flex w-full items-center rounded-lg border border-[#E5E7EB] bg-surface px-3 py-2 text-left opacity-50"
                >
                  <div className="mr-2 h-2 w-2 shrink-0 rounded-full bg-[#F46363]" />
                  <span className="text-sm text-text line-through">{g.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
