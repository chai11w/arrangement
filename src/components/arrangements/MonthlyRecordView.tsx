import { useEffect, useMemo, useRef, useState } from "react";
import { cn, statusBarBg, statusTagClass, statusTitleClass, statusHeaderColor } from "@/lib/utils";
import type { Arrangement, ArrangementStatus } from "@/types/record";
import SwipeableItem from "@/components/ui/swipeable-item";

const MONTH_LABELS = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月",
];

type MonthlySubTab = "year" | "mon" | "mnote";

interface MonthlyRecordViewProps {
  subTab: MonthlySubTab;
  year: number;
  month: number;
  items: Arrangement[];
  onMonthSelect: (year: number, month: number) => void;
  onYearChange: (year: number) => void;
  onUpdateStatus: (id: string, status: ArrangementStatus) => void;
  onEdit?: (a: Arrangement) => void;
}

export default function MonthlyRecordView({
  subTab,
  year,
  month,
  items,
  onMonthSelect,
  onYearChange,
  onUpdateStatus,
  onEdit,
}: MonthlyRecordViewProps) {
  if (subTab === "year") {
    return (
      <YearGrid
        year={year}
        month={month}
        items={items}
        onMonthSelect={onMonthSelect}
        onYearChange={onYearChange}
        onUpdateStatus={onUpdateStatus}
        onEdit={onEdit}
      />
    );
  }
  if (subTab === "mon") {
    return (
      <MonthChart
        year={year}
        month={month}
        items={items}
        onMonthSelect={onMonthSelect}
        onYearChange={onYearChange}
        onEdit={onEdit}
      />
    );
  }
  return (
    <MonthlyNoteList items={items} onUpdateStatus={onUpdateStatus} onEdit={onEdit} />
  );
}

/* ============ 年：3×4月网格 ============ */
function YearGrid({
  year,
  month,
  items,
  onMonthSelect,
  onYearChange,
  onUpdateStatus,
  onEdit,
}: {
  year: number;
  month: number;
  items: Arrangement[];
  onMonthSelect: (year: number, month: number) => void;
  onYearChange: (year: number) => void;
  onUpdateStatus: (id: string, status: ArrangementStatus) => void;
  onEdit?: (a: Arrangement) => void;
}) {
  const [touchedMonth, setTouchedMonth] = useState<number | null>(month);
  const [showMonthSheet, setShowMonthSheet] = useState(false);
  const touchStartY = useRef(0);

  const monthArrangements = useMemo(() => {
    const map: Record<number, Arrangement[]> = {};
    for (const a of items) {
      const [ay, am] = a.date.split("-").map(Number);
      if (ay !== year) continue;
      if (!map[am]) map[am] = [];
      map[am].push(a);
    }
    return map;
  }, [items, year]);

  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayYear = today.getFullYear();

  const sheetItems = touchedMonth ? (monthArrangements[touchedMonth] || []) : [];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const targetMonth = touchedMonth ?? (year === todayYear ? todayMonth : null);
    if (dy < -50 && !showMonthSheet && targetMonth !== null) {
      if (touchedMonth === null) setTouchedMonth(targetMonth);
      setShowMonthSheet(true);
    } else if (dy > 50 && showMonthSheet) {
      setShowMonthSheet(false);
    }
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Year header with arrows */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={() => onYearChange(year - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:bg-surface-muted"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" /></svg>
        </button>
        <span className="text-base font-semibold text-text">{year}年</span>
        <button
          type="button"
          onClick={() => onYearChange(year + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:bg-surface-muted"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5" /></svg>
        </button>
      </div>

      {/* 3×4 month grid */}
      <div className="grid grid-cols-3 gap-3 flex-1 content-start px-4 py-2 overflow-auto pb-4">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const monthItems = monthArrangements[m] || [];
          const isThisMonth = m === todayMonth && year === todayYear;
          const isTouched = m === touchedMonth;

          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                if (isTouched) {
                  onMonthSelect(year, m);
                } else {
                  setTouchedMonth(m);
                }
              }}
              className={cn(
                "flex flex-col items-center rounded-xl border py-3 transition-colors active:bg-surface-muted",
                isTouched
                  ? "border-[#09B83E] bg-primary-soft"
                  : "border-[#E5E7EB] bg-surface"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold",
                  isThisMonth
                    ? "bg-[#09B83E] text-white"
                    : "bg-surface-muted text-text"
                )}
              >
                {m}
              </span>
              <div className="mt-2 flex flex-col items-center gap-0.5 min-h-[24px] px-1 w-full">
                {monthItems.slice(0, 1).map((a, j) => (
                  <span
                    key={j}
                    className={cn(
                      "text-[9px] leading-tight truncate rounded px-0.5 w-full text-center",
                      statusTagClass(a)
                    )}
                  >
                    {a.title}
                  </span>
                ))}
                {monthItems.length > 1 && (
                  <span className="text-[8px] text-text-tertiary">+{monthItems.length - 1}</span>
                )}
              </div>
              <span className="mt-1 text-xs text-text-muted">{MONTH_LABELS[m - 1]}</span>
            </button>
          );
        })}
      </div>

      <p className="px-4 py-1 text-xs text-text-tertiary text-center">
        ↑ 上推查看当月安排
      </p>

      {showMonthSheet && touchedMonth !== null && (
        <MonthSheet
          year={year}
          month={touchedMonth}
          arrangements={sheetItems}
          onClose={() => setShowMonthSheet(false)}
          onUpdateStatus={onUpdateStatus}
          onEdit={onEdit}
        />
      )}
    </div>
  );
}

/* ============ 月：季度标题 + 31天柱状图 ============ */
function MonthChart({
  year,
  month,
  items,
  onMonthSelect,
  onYearChange,
  onEdit,
}: {
  year: number;
  month: number;
  items: Arrangement[];
  onMonthSelect: (year: number, month: number) => void;
  onYearChange: (year: number) => void;
  onEdit?: (a: Arrangement) => void;
}) {
  const quarter = Math.ceil(month / 3);
  const quarterStart = (quarter - 1) * 3 + 1;
  const quarterMonths = [quarterStart, quarterStart + 1, quarterStart + 2];
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const todayY = isCurrentMonth
    ? (today.getDate() - 1) * 30 + 28 + ((today.getHours() + today.getMinutes() / 60) / 24) * 30
    : null;

  const monthItems = useMemo(
    () =>
      items
        .filter((a) => {
          const [ay, am] = a.date.split("-").map(Number);
          return ay === year && am === month;
        })
        .sort((a, b) => a.date.localeCompare(b.date)),
    [items, year, month]
  );

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    else if (m < 1) { m = 12; y--; }
    onMonthSelect(y, m);
    if (y !== year) onYearChange(y);
  };

  const chartRef = useRef<HTMLDivElement>(null);

  // When no arrangements, scroll Y-axis so "本月暂无跨天安排" is centered visible
  useEffect(() => {
    if (monthItems.length === 0 && chartRef.current) {
      // Scroll to day 7 position: header (28px) + 6 day rows (6 × 30px) = 208px
      chartRef.current.scrollTop = 208;
    }
  }, [monthItems.length, month, year]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Quarter navigation */}
      <div className="flex items-center justify-between px-4 py-0.5 border-b border-[#E5E7EB]">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:bg-surface-muted"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" /></svg>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-text-tertiary">{year}年</span>
          {quarterMonths.map((m) => {
            const active = m === month;
            const isCurrentMonth = m === today.getMonth() + 1 && year === today.getFullYear();
            return (
              <button
                key={m}
                type="button"
                onClick={() => onMonthSelect(year, m)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  active
                    ? "bg-[#09B83E] text-white"
                    : isCurrentMonth
                    ? "bg-surface-muted text-[#09B83E]"
                    : "bg-surface-muted text-text-muted"
                )}
              >
                {m}
              </button>
            );
          })}
          <span className="text-base text-text-tertiary">Q{quarter}</span>
        </div>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:bg-surface-muted"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5" /></svg>
        </button>
      </div>

      {/* Column-based bar chart: days = rows, arrangements = columns */}
      <div ref={chartRef} className="min-h-0 flex-1 overflow-auto relative">
        <div className="flex" style={{ minHeight: `${daysInMonth * 30 + 28}px` }}>
          {/* Day labels on left */}
          <div className="shrink-0 w-9 sticky left-0 z-10 bg-bg">
            <div className="h-7 border-b border-[#E5E7EB]" />
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <div
                key={d}
                className="flex items-center justify-end pr-1 border-t border-[#E5E7EB]/30"
                style={{ height: "30px" }}
              >
                <span className="text-[10px] text-text-tertiary leading-none">{d}号</span>
              </div>
            ))}
          </div>

          {/* Arrangement columns */}
          {monthItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-text-tertiary">本月暂无跨天安排</p>
            </div>
          ) : (
            <div className="relative flex flex-1">
              {monthItems.map((a) => {
              const startDay = parseInt(a.date.split("-")[2], 10);
              const endDay = a.endDate
                ? parseInt(a.endDate.split("-")[2], 10)
                : startDay;

              // Fractional day positions for time-precise bars
              const [sh, sm] = a.startTime ? a.startTime.split(":").map(Number) : [0, 0];
              const [eh, em] = a.endTime ? a.endTime.split(":").map(Number) : [0, 0];
              const startFrac = startDay - 1 + (a.startTime ? (sh * 60 + sm) / (24 * 60) : 0);
              const endFrac = endDay - 1 + (a.endTime ? (eh * 60 + em) / (24 * 60) : 1);
              const barTop = startFrac * 30;
              const barH = Math.max(4, (endFrac - startFrac) * 30);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onEdit?.(a)}
                  className="shrink-0 border-l border-[#E5E7EB] cursor-pointer text-left relative"
                  style={{ width: "64px" }}
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

                  {/* Day grid lines */}
                  <div style={{ height: `${daysInMonth * 30}px` }} className="relative">
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                      <div
                        key={d}
                        className="border-t border-[#E5E7EB]/30"
                        style={{ height: "30px" }}
                      />
                    ))}

                    {/* Single colored bar overlay */}
                    <div
                      className={cn(
                        "absolute left-0 right-0 rounded-sm px-0.5",
                        statusBarBg(a)
                      )}
                      style={{ top: `${barTop}px`, height: `${barH}px` }}
                    >
                      <span className="block text-[8px] text-white leading-tight pt-0.5 truncate">
                        {(() => {
                          if (startDay === endDay) {
                            return a.startTime ? `${startDay} ${a.startTime}~${a.endTime || "24:00"}` : `${startDay}号`;
                          }
                          if (a.startTime || a.endTime) {
                            return `${startDay} ${a.startTime || "00:00"}~${endDay} ${a.endTime || "24:00"}`;
                          }
                          return `${startDay}~${endDay}号`;
                        })()}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
              {/* Current day line — inside content wrapper to span full scroll width */}
              {isCurrentMonth && todayY != null && (
                <div
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{ top: `${todayY}px` }}
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

function MonthSheet({
  year,
  month,
  arrangements,
  onClose,
  onUpdateStatus,
  onEdit,
}: {
  year: number;
  month: number;
  arrangements: Arrangement[];
  onClose: () => void;
  onUpdateStatus: (id: string, status: ArrangementStatus) => void;
  onEdit?: (a: Arrangement) => void;
}) {
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const sorted = [...arrangements].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="absolute inset-x-0 bottom-0 top-0 z-10 flex flex-col rounded-t-2xl bg-surface shadow-lg">
      <div
        className="mt-2 h-1 w-10 self-center rounded-full bg-gray-4"
        onClick={onClose}
      />
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-text">{year}年{month}月</span>
        <button onClick={onClose} className="text-xs text-text-muted">收起</button>
      </div>
      <div className="flex-1 overflow-auto px-4">
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-tertiary">本月暂无跨天安排</p>
        ) : (
          <ul className="space-y-2 pb-4">
            {sorted.map((a) => (
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
                    {a.endDate && (
                      <span className="ml-2 text-text-disabled">
                        {daysBetween(a.date, a.endDate) + 1}天
                      </span>
                    )}
                  </div>
                </button>
              </SwipeableItem>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ============ 月记：跨天安排列表 ============ */
function MonthlyNoteList({
  items,
  onUpdateStatus,
  onEdit,
}: {
  items: Arrangement[];
  onUpdateStatus: (id: string, status: ArrangementStatus) => void;
  onEdit?: (a: Arrangement) => void;
}) {
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, Arrangement[]> = {};
    for (const a of items) {
      const key = a.date.slice(0, 7);
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
        <div className="text-center">
          <p className="text-sm text-text-muted">暂无跨天安排</p>
          <p className="mt-1 text-xs text-text-tertiary">创建时开启"跨天安排"即可在这里查看</p>
          <p className="text-xs text-text-tertiary">超过1天的安排（如出差、旅行）会自动归入月记</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto px-4">
      {Object.entries(grouped).map(([key, monthItems]) => {
        const [y, m] = key.split("-").map(Number);
        return (
          <div key={key} className="mb-4">
            {(() => {
              const now = new Date();
              const cur = now.getFullYear() === y && now.getMonth() + 1 === m;
              return (
                <h3 className={cn("mb-2 text-sm font-semibold", cur ? "text-[#09B83E]" : "text-text")}>
                  {y}年{m}月{cur ? " 本月" : ""}
                </h3>
              );
            })()}
            <ul className="space-y-1">
              {monthItems.map((a) => (
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
                    <div className="text-xs text-text-tertiary">
                      {a.date} ~ {a.endDate || a.date}
                      <span className="ml-2 text-text-disabled">
                        {a.endDate ? daysBetween(a.date, a.endDate) + 1 : 1}天
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

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a + "T00:00:00");
  const d2 = new Date(b + "T00:00:00");
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}
