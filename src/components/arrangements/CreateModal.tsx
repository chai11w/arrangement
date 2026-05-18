import { useState } from "react";
import type { Arrangement } from "@/types/record";

interface CreateModalProps {
  date: string;
  onConfirm: (data: {
    title: string;
    date: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    content?: string;
  }) => void;
  onClose: () => void;
  editData?: Arrangement;
}

export default function CreateModal({ date, onConfirm, onClose, editData }: CreateModalProps) {
  const isEdit = !!editData;
  const [title, setTitle] = useState(editData?.title || "");
  const [selectedDate, setSelectedDate] = useState(editData?.date || date);
  const [hasTime, setHasTime] = useState(!!(editData?.startTime));
  const [startTime, setStartTime] = useState(editData?.startTime || "");
  const [endTime, setEndTime] = useState(editData?.endTime || "");
  const [hasEndDate, setHasEndDate] = useState(!!(editData?.endDate && editData.endDate !== editData.date));
  const [endDate, setEndDate] = useState(editData?.endDate || editData?.date || date);
  const [content, setContent] = useState(editData?.content || "");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onConfirm({
      title: title.trim(),
      date: selectedDate,
      endDate: hasEndDate ? endDate : undefined,
      startTime: hasTime ? startTime : undefined,
      endTime: hasTime ? endTime : undefined,
      content: content.trim() || undefined,
    });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-surface px-5 pb-8 pt-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-center text-base font-semibold text-text mb-4">
          {isEdit ? "编辑安排" : "新建安排"}
        </h2>

        <div className="mb-3">
          <label className="block text-xs text-text-muted mb-1">主题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="安排什么？"
            autoFocus
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-[#09B83E]"
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs text-text-muted mb-1">日期</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              if (hasEndDate && e.target.value > endDate) {
                setEndDate(e.target.value);
              }
            }}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-[#09B83E]"
          />
        </div>

        <div className="mb-3">
          <label className="flex items-center gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={hasTime}
              onChange={(e) => setHasTime(e.target.checked)}
              className="accent-[#09B83E]"
            />
            设置时间段
          </label>
          {hasTime && !hasEndDate && (
            <div className="mt-2 flex gap-2">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-[#09B83E]"
              />
              <span className="flex items-center text-xs text-text-tertiary">~</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-[#09B83E]"
              />
            </div>
          )}
          {hasTime && hasEndDate && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[11px] text-text-tertiary w-10">起始</span>
                <span className="text-xs text-text-muted">{selectedDate}</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-[#09B83E]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[11px] text-text-tertiary w-10">结束</span>
                <span className="text-xs text-text-muted">{endDate}</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-[#09B83E]"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mb-3">
          <label className="flex items-center gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={hasEndDate}
              onChange={(e) => {
                setHasEndDate(e.target.checked);
                if (e.target.checked) setHasTime(true);
              }}
              className="accent-[#09B83E]"
            />
            跨天→月记，跨月/跨年→年记
          </label>
          {hasEndDate && (
            <div className="mt-2">
              <input
                type="date"
                value={endDate}
                min={selectedDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-[#09B83E]"
              />
              <p className="mt-1 text-[10px] text-text-muted">目标请到年记→目标</p>
            </div>
          )}
        </div>

        <div className="mb-3">
          <label className="block text-xs text-text-muted mb-1">内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="补充描述..."
            rows={4}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-[#09B83E] resize-none"
          />
        </div>

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm text-text-muted active:bg-surface-muted"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex-1 rounded-xl bg-[#09B83E] py-2.5 text-sm font-semibold text-white active:bg-[#08A836] disabled:opacity-40"
          >
            {isEdit ? "保存" : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}
