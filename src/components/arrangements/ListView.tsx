import { useState, useMemo } from "react";
import { cn, statusTitleClass } from "@/lib/utils";
import type { Arrangement, ArrangementStatus } from "@/types/record";
import SwipeableItem from "@/components/ui/swipeable-item";

interface ListViewProps {
  items: Arrangement[];
  onUpdateStatus: (id: string, status: ArrangementStatus) => void;
  onDayClick: (date: string) => void;
  onEdit?: (a: Arrangement) => void;
}

function groupByDate(items: Arrangement[]): Record<string, Arrangement[]> {
  const groups: Record<string, Arrangement[]> = {};
  for (const item of items) {
    if (!groups[item.date]) groups[item.date] = [];
    groups[item.date].push(item);
  }
  for (const date of Object.keys(groups)) {
    groups[date].sort((a, b) =>
      (a.startTime || "99").localeCompare(b.startTime || "99")
    );
  }
  return groups;
}

export default function ListView({
  items,
  onUpdateStatus,
  onDayClick,
  onEdit,
}: ListViewProps) {
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const grouped = useMemo(() => groupByDate(items), [items]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-text-muted">暂无安排</p>
          <p className="mt-1 text-xs text-text-tertiary">点击右下角 + 创建安排</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto px-4">
      {Object.entries(grouped).map(([date, dateItems]) => {
        const dateObj = new Date(date + "T00:00:00");
        const isToday = date === todayStr;
        const label = isToday
          ? `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 今天`
          : `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

        return (
          <div key={date} className="mb-4">
            <button
              type="button"
              onClick={() => onDayClick(date)}
              className={cn(
                "mb-2 flex items-center gap-2 text-sm",
                isToday ? "font-semibold text-[#09B83E]" : "text-text"
              )}
            >
              {label}
            </button>
            <ul className="space-y-1">
              {dateItems.map((a) => (
                <SwipeableItem
                  key={a.id}
                  arrangement={a}
                  onUpdateStatus={onUpdateStatus}
                  swipedId={swipedId}
                  setSwipedId={setSwipedId}
                >
                  <button
                    type="button"
                    className="w-full text-left cursor-pointer"
                    onClick={() => onEdit?.(a)}
                  >
                    <div
                      className={cn("text-sm", statusTitleClass(a))}
                    >
                      {a.title}
                    </div>
                    {(a.startTime || a.endTime) && (
                      <div className="text-xs text-text-tertiary">
                        {a.startTime || ""}
                        {a.endTime ? ` ~ ${a.endTime}` : ""}
                      </div>
                    )}
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
