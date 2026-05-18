import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Arrangement, ArrangementStatus } from "@/types/record";
import { isPastArrangement } from "@/types/record";

const SWIPE_THRESHOLD = 80;

interface SwipeableItemProps {
  arrangement: Arrangement;
  swipedId: string | null;
  setSwipedId: (id: string | null) => void;
  onUpdateStatus: (id: string, status: ArrangementStatus) => void;
  children: React.ReactNode;
}

export default function SwipeableItem({
  arrangement,
  swipedId,
  setSwipedId,
  onUpdateStatus,
  children,
}: SwipeableItemProps) {
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const startX = useRef(0);
  const startOffset = useRef(0);

  const isPast = isPastArrangement(arrangement);
  const dimmed = isPast && arrangement.status !== "later";

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startOffset.current = offset;
    setSwipedId(arrangement.id);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipedId !== arrangement.id) return;
    const dx = e.touches[0].clientX - startX.current;
    const v = Math.max(-SWIPE_THRESHOLD, Math.min(SWIPE_THRESHOLD, startOffset.current + dx));
    offsetRef.current = v;
    setOffset(v);
  };

  const handleTouchEnd = () => {
    if (offsetRef.current > 40) {
      setOffset(SWIPE_THRESHOLD);
    } else if (offsetRef.current < -40) {
      setOffset(-SWIPE_THRESHOLD);
    } else {
      setOffset(0);
      setSwipedId(null);
    }
  };

  const close = () => {
    setOffset(0);
    setSwipedId(null);
  };

  return (
    <li className="relative overflow-hidden rounded-lg">
      <button
        type="button"
        onClick={() => {
          onUpdateStatus(
            arrangement.id,
            arrangement.status === "later" ? "pending" : "later"
          );
          close();
        }}
        className="absolute left-0 top-0 bottom-0 flex w-[80px] items-center justify-center bg-[#EDBE09] text-white text-sm font-semibold active:bg-[#D4A808]"
        aria-label="暂缓"
      >
        暂缓
      </button>
      <button
        type="button"
        onClick={() => {
          onUpdateStatus(arrangement.id, "done");
          close();
        }}
        className="absolute right-0 top-0 bottom-0 flex w-[80px] items-center justify-center bg-[#F46363] text-white text-sm font-semibold active:bg-[#DD5252]"
        aria-label="删除"
      >
        删除
      </button>
      <div
        className={cn(
          "flex items-center border border-[#E5E7EB] px-3 py-2 transition-transform rounded-lg relative z-10",
          dimmed ? "bg-[#F3F4F6]" : "bg-surface"
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </li>
  );
}
