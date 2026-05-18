import { useState, useRef, useEffect } from "react";
import type { ArrangementStatus } from "@/types/record";
import type { ReminderTrigger } from "@/lib/reminderEngine";
import {
  dismissCurrent,
  removeArrangement,
  commitAndAdvance,
  current,
  queueLength,
} from "@/lib/reminderQueue";

const SWIPE_THRESHOLD = 80;
const SNAP_THRESHOLD = 40;
const TAP_MOVE_MAX = 8;
const VERTICAL_DISMISS_THRESHOLD = 60;
const AUTO_DISMISS_MS = 5000;
const TRANSITION_MS = 200;

interface Props {
  onClose: () => void;
  onUpdateStatus: (id: string, status: ArrangementStatus) => void;
  frozen?: boolean;
  onEdit?: (arrangementId: string) => void;
}

function formatDateRange(item: ReminderTrigger): string {
  if (!item.endDate || item.endDate === item.date) {
    return item.startTime ? `${item.date} ${item.startTime}` : item.date;
  }
  const startPart = item.startTime ? `${item.date} ${item.startTime}` : item.date;
  const endPart = item.endTime ? `${item.endDate} ${item.endTime}` : item.endDate;
  return `${startPart} ~ ${endPart}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "正在进行中";
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `还有 ${h} 小时 ${m} 分钟`;
  if (h > 0) return `还有 ${h} 小时`;
  return `还有 ${m} 分钟`;
}

export default function ReminderPopup({ onClose, onUpdateStatus, frozen = false, onEdit }: Props) {
  const [item, setItem] = useState<ReminderTrigger | null>(current);
  const [offset, setOffset] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const [countdownMs, setCountdownMs] = useState(0);

  const offsetRef = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const movedRef = useRef(false);
  const dismissingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function advanceQueue() {
    commitAndAdvance();
    const next = current();
    if (next) {
      setItem(next);
      setOffset(0);
      offsetRef.current = 0;
      dismissingRef.current = false;
      setDismissing(false);
      startTimer();
    } else {
      onClose();
    }
  }

  function doDismissAnimation(andThen: () => void) {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    setDismissing(true);
    setTimeout(() => {
      andThen();
    }, TRANSITION_MS);
  }

  function doAutoDismiss() {
    doDismissAnimation(() => {
      dismissCurrent();
      advanceQueue();
    });
  }

  function doSwipeUpDismiss() {
    doDismissAnimation(() => {
      dismissCurrent();
      advanceQueue();
    });
  }

  function doLater() {
    if (!item) return;
    doDismissAnimation(() => {
      onUpdateStatus(item.arrangementId, "later");
      removeArrangement(item.arrangementId);
      advanceQueue();
    });
  }

  function doDone() {
    if (!item) return;
    doDismissAnimation(() => {
      onUpdateStatus(item.arrangementId, "done");
      removeArrangement(item.arrangementId);
      advanceQueue();
    });
  }

  function startTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (frozen) return;
    if (!item || item.triggerAt.getTime() > Date.now()) return;
    timerRef.current = setTimeout(() => {
      if (Math.abs(offsetRef.current) > SNAP_THRESHOLD) return;
      doAutoDismiss();
    }, AUTO_DISMISS_MS);
  }

  useEffect(() => {
    if (frozen) {
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      startTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frozen]);

  useEffect(() => {
    if (!item) return;
    const update = () => {
      const [h, m] = item.startTime.split(":").map(Number);
      const startDt = new Date(item.date + "T00:00:00");
      startDt.setHours(h, m, 0, 0);
      setCountdownMs(startDt.getTime() - Date.now());
    };
    update();
    countdownRef.current = setInterval(update, 30000);
    startTimer();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  // ---- touch handlers ----
  function handleTouchStart(e: React.TouchEvent) {
    if (frozen) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startOffset.current = offsetRef.current;
    movedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (frozen) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (Math.abs(dx) > TAP_MOVE_MAX || Math.abs(dy) > TAP_MOVE_MAX) movedRef.current = true;

    if (Math.abs(dx) >= Math.abs(dy)) {
      const v = Math.max(-SWIPE_THRESHOLD, Math.min(SWIPE_THRESHOLD, startOffset.current + dx));
      offsetRef.current = v;
      setOffset(v);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (frozen) return;

    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;

    if (dy < -VERTICAL_DISMISS_THRESHOLD && Math.abs(dy) > Math.abs(dx) && Math.abs(offsetRef.current) < SNAP_THRESHOLD) {
      doSwipeUpDismiss();
      return;
    }

    if (!movedRef.current) {
      const absOffset = Math.abs(startOffset.current);
      if (absOffset >= SWIPE_THRESHOLD - 1) {
        if (startOffset.current > 0) {
          doLater();
          return;
        } else {
          doDone();
          return;
        }
      }
      if (absOffset < SNAP_THRESHOLD && onEdit && item) {
        onEdit(item.arrangementId);
        return;
      }
      return;
    }

    if (offsetRef.current > SNAP_THRESHOLD) {
      setOffset(SWIPE_THRESHOLD);
      offsetRef.current = SWIPE_THRESHOLD;
    } else if (offsetRef.current < -SNAP_THRESHOLD) {
      setOffset(-SWIPE_THRESHOLD);
      offsetRef.current = -SWIPE_THRESHOLD;
    } else {
      setOffset(0);
      offsetRef.current = 0;
      startTimer();
    }
  }

  if (!item) return null;

  const totalInQueue = queueLength();

  return (
    <div
      className={`absolute top-0 left-0 right-0 ${frozen ? "z-40" : "z-[60]"}`}
      style={{
        transform: dismissing ? "translateY(-120px)" : "translateY(0)",
        transition: `transform ${TRANSITION_MS}ms`,
      }}
    >
      <div className="mx-2 mt-2 overflow-hidden rounded-xl relative">
        {/* Main card */}
        <div
          className={`relative rounded-xl shadow-lg border border-[#E5E7EB] px-4 py-3 transition-colors duration-200 ${
            frozen ? "bg-[#F3F4F6]" : "bg-surface"
          }`}
          style={{
            transform: `translateX(${offset}px)`,
            transition: offset === 0 ? `transform ${TRANSITION_MS}ms` : "none",
            touchAction: "none",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Row 1: date (left) + badge (right) */}
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-text-muted leading-relaxed break-all">
              {formatDateRange(item)}
            </span>
            <span className="shrink-0 text-[10px] text-text-tertiary bg-surface-muted px-1.5 py-0.5 rounded">
              {item.class === "daily" ? "日记" : item.class === "monthly" ? "月记" : "年记"}
            </span>
          </div>

          {/* Row 2: title */}
          <p className="mt-2 text-sm font-semibold text-text text-center">
            {item.title}
          </p>

          {/* Row 3: status */}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className={`text-xs font-medium ${frozen ? "text-text-tertiary" : "text-[#09B83E]"}`}>
              {frozen ? "编辑中..." : formatCountdown(countdownMs)}
            </span>
            {totalInQueue > 1 && (
              <span className="text-[10px] text-text-tertiary">
                后面还有 {totalInQueue - 1} 条
              </span>
            )}
          </div>
        </div>

        {/* Action buttons — on top of card, revealed when card slides away */}
        <button
          type="button"
          onClick={doLater}
          className="absolute left-0 top-0 bottom-0 w-[80px] flex items-center justify-center bg-[#EDBE09] text-white text-sm font-semibold active:bg-[#D4A808] transition-opacity duration-200"
          style={{ opacity: offset > 5 ? 1 : 0, pointerEvents: offset > 5 ? "auto" : "none" }}
        >
          暂缓
        </button>
        <button
          type="button"
          onClick={doDone}
          className="absolute right-0 top-0 bottom-0 w-[80px] flex items-center justify-center bg-[#F46363] text-white text-sm font-semibold active:bg-[#DD5252] transition-opacity duration-200"
          style={{ opacity: offset < -5 ? 1 : 0, pointerEvents: offset < -5 ? "auto" : "none" }}
        >
          删除
        </button>
      </div>
    </div>
  );
}
