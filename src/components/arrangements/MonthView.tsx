import { useState, useMemo, useRef } from "react";
import { cn, getTodayStr, statusTagClass, statusTitleClass } from "@/lib/utils";
import type { Arrangement, ArrangementStatus } from "@/types/record";
import SwipeableItem from "@/components/ui/swipeable-item";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

const lunarFormatter = new Intl.DateTimeFormat("zh-u-ca-chinese", { day: "numeric" });

function getLunarDay(date: Date): string {
  try {
    const parts = lunarFormatter.formatToParts(date);
    const dayPart = parts.find((p) => p.type === "day");
    if (!dayPart) return "";
    const day = parseInt(dayPart.value, 10);

    const DAY_NAMES = [
      "",
      "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
      "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
      "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
    ];

    return DAY_NAMES[day] || String(day);
  } catch {
    return "";
  }
}

interface MonthViewProps {
  year: number;
  month: number;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onDayDoubleClick: (date: string) => void;
  getByMonth: (year: number, month: number) => Arrangement[];
  onUpdateStatus: (id: string, status: ArrangementStatus) => void;
  onEdit?: (a: Arrangement) => void;
}

export default function MonthView({
  year,
  month,
  selectedDate,
  onSelectDate,
  onDayDoubleClick,
  getByMonth,
  onUpdateStatus,
  onEdit,
}: MonthViewProps) {
  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month);
  const [showDaySheet, setShowDaySheet] = useState(false);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const todayStr = getTodayStr();

  const monthArrangements = useMemo(
    () => getByMonth(viewYear, viewMonth),
    [getByMonth, viewYear, viewMonth]
  );

  const days = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const result: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      result.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      result.push(d);
    }
    while (result.length % 7 !== 0) {
      result.push(null);
    }

    return result;
  }, [viewYear, viewMonth]);

  const dateStr = (day: number) =>
    `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const dayArrangementsMap = useMemo(() => {
    const map: Record<number, Arrangement[]> = {};
    for (const a of monthArrangements) {
      const d = parseInt(a.date.split("-")[2], 10);
      if (!map[d]) map[d] = [];
      map[d].push(a);
    }
    return map;
  }, [monthArrangements]);

  const selectedDay = selectedDate.startsWith(
    `${viewYear}-${String(viewMonth).padStart(2, "0")}`
  )
    ? parseInt(selectedDate.split("-")[2], 10)
    : null;

  const sheetArrangements = selectedDay
    ? dayArrangementsMap[selectedDay]?.slice().sort((a, b) => {
        const aTime = a.startTime || "99:99";
        const bTime = b.startTime || "99:99";
        return aTime.localeCompare(bTime);
      }) || []
    : [];

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m > 12) {
      m = 1;
      y++;
    } else if (m < 1) {
      m = 12;
      y--;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy < -50 && !showDaySheet && selectedDay) {
      setShowDaySheet(true);
    } else if (dy > 50 && showDaySheet) {
      setShowDaySheet(false);
    }
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:bg-surface-muted"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" /></svg>
        </button>
        <span className="text-base font-semibold text-text">
          {viewYear}年{viewMonth}月
        </span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:bg-surface-muted"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 px-2 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 text-xs font-medium text-text-tertiary">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 px-2 text-sm">
        {days.map((day, i) => {
          const isSelected = day === selectedDay;
          const isToday = !!(day && dateStr(day) === todayStr);
          const items = day ? dayArrangementsMap[day] || [] : [];

          return (
            <div
              key={i}
              className={cn(
                "relative flex flex-col py-1 overflow-hidden",
                day ? "cursor-pointer active:bg-surface-muted rounded-lg" : "",
                isSelected && "bg-primary-soft rounded-lg"
              )}
              onClick={() => {
                if (day) {
                  if (isSelected) {
                    onDayDoubleClick(dateStr(day));
                  } else {
                    onSelectDate(dateStr(day));
                  }
                }
              }}
            >
              {day && (
                <>
                  <span
                    className={cn(
                      "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm",
                      isToday && "bg-[#09B83E] font-semibold text-white",
                      isSelected && !isToday && "font-semibold text-[#09B83E]",
                      !isToday && !isSelected && "text-text"
                    )}
                  >
                    {day}
                  </span>
                  <span className="text-[8px] text-text-tertiary text-center leading-tight">
                    {getLunarDay(new Date(dateStr(day) + "T00:00:00"))}
                  </span>
                  <div className="mt-0.5 flex flex-col gap-px px-0.5">
                    {items.slice(0, 4).map((a, j) => (
                      <span
                        key={j}
                        className={cn(
                          "text-[9px] leading-tight truncate rounded px-0.5",
                          statusTagClass(a)
                        )}
                      >
                        {a.title}
                      </span>
                    ))}
                    {items.length > 4 && (
                      <span className="text-[8px] text-text-tertiary text-center">+{items.length - 4}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="px-4 py-1 text-xs text-text-tertiary text-center">
        ↑ 上推查看当日安排
      </p>

      {showDaySheet && selectedDay && (
        <DaySheet
          date={dateStr(selectedDay)}
          arrangements={sheetArrangements}
          onClose={() => setShowDaySheet(false)}
          onUpdateStatus={onUpdateStatus}
          onEdit={onEdit}
        />
      )}
    </div>
  );
}

function DaySheet({
  date,
  arrangements,
  onClose,
  onUpdateStatus,
  onEdit,
}: {
  date: string;
  arrangements: Arrangement[];
  onClose: () => void;
  onUpdateStatus: (id: string, status: ArrangementStatus) => void;
  onEdit?: (a: Arrangement) => void;
}) {
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const dateObj = new Date(date + "T00:00:00");
  const label = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

  return (
    <div className="absolute inset-x-0 bottom-0 top-0 z-10 flex flex-col rounded-t-2xl bg-surface shadow-lg">
      <div
        className="mt-2 h-1 w-10 self-center rounded-full bg-gray-4"
        onClick={onClose}
      />
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-text">{label}</span>
        <button onClick={onClose} className="text-xs text-text-muted">收起</button>
      </div>
      <div className="flex-1 overflow-auto px-4">
        {arrangements.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-tertiary">暂无安排</p>
        ) : (
          <ul className="space-y-2 pb-4">
            {arrangements.map((a) => (
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
                  <div className={cn("text-sm", statusTitleClass(a))}>{a.title}</div>
                  {(a.startTime || a.endTime) && (
                    <div className="mt-0.5 text-xs text-text-tertiary">
                      {a.startTime || "?"} ~ {a.endTime || "?"}
                  </div>
                )}
                </button>
              </SwipeableItem>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

