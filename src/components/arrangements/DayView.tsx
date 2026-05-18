import { useMemo, useRef, useEffect, useState } from "react";
import { cn, getTodayStr, statusBarBg, statusHeaderColor } from "@/lib/utils";
import type { Arrangement } from "@/types/record";
import { isPastArrangement } from "@/types/record";

const HOUR_HEIGHT = 60;
const HEADER_H = 28;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function formatDateCN(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${y}年${parseInt(m, 10)}月${parseInt(d, 10)}日`;
}

function getWeekDates(dateStr: string): { day: number; date: string; weekday: string }[] {
  const d = new Date(dateStr + "T00:00:00");
  const dayOfWeek = d.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const result: { day: number; date: string; weekday: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const cd = new Date(d);
    cd.setDate(d.getDate() + mondayOffset + i);
    const year = cd.getFullYear();
    const month = String(cd.getMonth() + 1).padStart(2, "0");
    const day = String(cd.getDate()).padStart(2, "0");
    result.push({
      day: cd.getDate(),
      date: `${year}-${month}-${day}`,
      weekday: WEEKDAYS[cd.getDay()],
    });
  }
  return result;
}

interface DayViewProps {
  date: string;
  arrangements: Arrangement[];
  onDateChange: (date: string) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onEdit?: (a: Arrangement) => void;
}

export default function DayView({
  date,
  arrangements,
  onDateChange,
  selectedDate,
  onSelectDate,
  onEdit,
}: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowY, setNowY] = useState(0);

  const weekDates = useMemo(() => getWeekDates(date), [date]);

  const changeDay = (delta: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    onDateChange(`${year}-${month}-${day}`);
  };

  useEffect(() => {
    const updateNow = () => {
      const now = new Date();
      setNowY(now.getHours() * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT);
    };
    updateNow();
    const id = setInterval(updateNow, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const hours = now.getHours();
      if (hours >= 6) {
        scrollRef.current.scrollTop = (hours - 2) * HOUR_HEIGHT;
      }
    }
  }, [date]);

  const timedArrangements = useMemo(
    () =>
      arrangements
        .filter((a) => a.startTime)
        .map((a) => {
          const [sh, sm] = (a.startTime || "0:00").split(":").map(Number);
          const [eh, em] = (a.endTime || "1:00").split(":").map(Number);
          return { ...a, startHour: sh + sm / 60, endHour: eh + em / 60 };
        })
        .sort((a, b) => a.startHour - b.startHour),
    [arrangements]
  );

  const untimedArrangements = useMemo(
    () =>
      arrangements
        .filter((a) => !a.startTime)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [arrangements]
  );

  const todayStr = getTodayStr();
  const isToday = date === todayStr;

  return (
    <div className="flex h-full flex-col">
      {/* Header: prev day ← date → next day */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={() => changeDay(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:bg-surface-muted"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" /></svg>
        </button>
        <span className="text-base font-semibold text-text">{formatDateCN(date)}</span>
        <button
          type="button"
          onClick={() => changeDay(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:bg-surface-muted"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5" /></svg>
        </button>
      </div>

      {/* Week strip */}
      <div className="flex shrink-0 border-b border-[#E5E7EB] px-1">
        {weekDates.map((wd) => {
          const active = wd.date === selectedDate;
          const isTodayDate = wd.date === todayStr;
          return (
            <button
              key={wd.date}
              type="button"
              onClick={() => onSelectDate(wd.date)}
              className={cn(
                "flex flex-1 flex-col items-center py-1 text-xs rounded-md",
                active && "bg-primary-soft",
                isTodayDate && !active && "text-[#09B83E]"
              )}
            >
              <span className="text-text-tertiary">{wd.weekday}</span>
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm",
                  active && "bg-[#09B83E] font-semibold text-white",
                  isTodayDate && !active && "font-semibold text-[#09B83E]"
                )}
              >
                {wd.day}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bar chart: columns = arrangements, rows = hours */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto relative">
        <div className="flex" style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}>
          {/* Time labels inside scroll area */}
          <div className="shrink-0 w-8 sticky left-0 z-10 bg-bg">
            <div className="h-7 border-b border-[#E5E7EB]" />
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex items-start justify-end pr-1 border-t border-[#E5E7EB]"
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                <span className="text-[10px] text-text-tertiary leading-none mt-0.5">
                  {h}:00
                </span>
              </div>
            ))}
          </div>

          {/* Arrangement columns + untimed */}
          {timedArrangements.length === 0 && untimedArrangements.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-text-tertiary">
              暂无安排
            </div>
          ) : (
            <div className="relative flex flex-1">
              {timedArrangements.map((a) => {
                  const barTop = a.startHour * HOUR_HEIGHT;
                  const barH = Math.max(4, (a.endHour - a.startHour) * HOUR_HEIGHT);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onEdit?.(a)}
                      className="shrink-0 border-l border-[#E5E7EB] cursor-pointer text-left"
                      style={{ width: "72px" }}
                    >
                      <div className="sticky top-0 z-[5] bg-bg border-b border-[#E5E7EB] px-1 h-7 flex items-center">
                        <span className={cn(
                          "text-[10px] leading-tight truncate",
                          statusHeaderColor(a)
                        )} title={a.title}>
                          {a.title}
                        </span>
                      </div>
                      <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
                        {HOURS.map((h) => (
                          <div
                            key={h}
                            className="border-t border-[#E5E7EB]/30"
                            style={{ height: `${HOUR_HEIGHT}px` }}
                          />
                        ))}
                        <div
                          className={cn(
                            "absolute left-0 right-0 rounded-sm px-0.5",
                            statusBarBg(a)
                          )}
                          style={{ top: `${barTop}px`, height: `${barH}px` }}
                        >
                          <span className="block text-[8px] text-white leading-tight pt-0.5 truncate">
                            {a.startTime}~{a.endTime}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              {untimedArrangements.length > 0 && (
                <div className="flex-1 border-l-2 border-dashed border-[#E5E7EB] px-3">
                  <div className="sticky top-0 z-[5] bg-surface py-1">
                    <span className="text-[10px] text-text-tertiary">全天</span>
                  </div>
                  {untimedArrangements.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onEdit?.(a)}
                      className={cn(
                        "rounded-full px-2 py-1 mb-1 text-[10px] leading-tight text-left max-w-full truncate",
                        a.status === "done"
                          ? "bg-[#F46363]/20 text-[#F46363] line-through"
                          : a.status === "later"
                            ? "bg-[#EDBE09]/20 text-[#EDBE09]"
                            : isPastArrangement(a)
                              ? "bg-surface-muted text-text-disabled"
                              : "bg-[#09B83E]/20 text-[#09B83E]"
                      )}
                    >
                      {a.title}
                    </button>
                  ))}
                </div>
              )}
              {/* Current time line — inside content wrapper to span full scroll width */}
              {isToday && (
                <div
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{ top: `${nowY + HEADER_H}px` }}
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
