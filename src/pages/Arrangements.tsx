import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useArrangements } from "@/lib/arrangementStore";
import { cn, getTodayStr } from "@/lib/utils";
import { isMultiDay, isCrossMonth } from "@/types/record";
import type { Arrangement } from "@/types/record";
import MonthView from "@/components/arrangements/MonthView";
import DayView from "@/components/arrangements/DayView";
import ListView from "@/components/arrangements/ListView";
import MonthlyRecordView from "@/components/arrangements/MonthlyRecordView";
import YearlyRecordView from "@/components/arrangements/YearlyRecordView";
import CreateModal from "@/components/arrangements/CreateModal";
import AiRecognitionModal from "@/components/arrangements/AiRecognitionModal";

type DailySubTab = "year" | "month" | "day" | "note";
type MonthlySubTab = "year" | "mon" | "mnote";
type YearlySubTab = "year" | "ynote" | "goal";
type ModeType = "daily" | "monthly" | "yearly";

export default function ArrangementsPage({
  onGoToAiSettings,
  aiNavTarget,
  onAiNavTargetHandled,
  editTargetId,
  onEditClosed,
}: {
  onGoToAiSettings?: () => void;
  aiNavTarget?: {
    mode: "daily" | "monthly" | "yearly";
    subTab?: string;
    date: string;
    month: number;
    year: number;
  } | null;
  onAiNavTargetHandled?: () => void;
  editTargetId?: string | null;
  onEditClosed?: () => void;
}) {
  const todayStr = getTodayStr();
  const [mode, setMode] = useState<ModeType>("daily");
  const [dailySub, setDailySub] = useState<DailySubTab>("month");
  const [monthlySub, setMonthlySub] = useState<MonthlySubTab>("year");
  const [yearlySub, setYearlySub] = useState<YearlySubTab>("year");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [showCreate, setShowCreate] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const { arrangements, create, update, updateStatus, reload } = useArrangements();
  const [editingArrangement, setEditingArrangement] = useState<Arrangement | null>(null);
  const [goalsVersion, setGoalsVersion] = useState(0);
  const [aiInitialText, setAiInitialText] = useState<string | undefined>(undefined);

  // Three-way filter
  const dailyItems = useMemo(() => arrangements.filter((a) => !isMultiDay(a)), [arrangements]);
  const dailyItemsSorted = useMemo(
    () => [...dailyItems].sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || "99").localeCompare(b.startTime || "99")),
    [dailyItems]
  );
  const monthlyItems = useMemo(
    () => arrangements.filter((a) => isMultiDay(a) && !isCrossMonth(a)),
    [arrangements]
  );
  const yearlyItems = useMemo(
    () => arrangements.filter((a) => isCrossMonth(a)),
    [arrangements]
  );

  const dailyGetByMonth = useCallback(
    (year: number, month: number) => {
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      return dailyItems.filter((a) => a.date.startsWith(prefix));
    },
    [dailyItems]
  );

  const dailyGetByDate = useCallback(
    (date: string) => dailyItems.filter((a) => a.date === date),
    [dailyItems]
  );

  const handleDayClick = useCallback((date: string) => {
    setSelectedDate(date);
    setMode("daily");
    setDailySub("day");
  }, []);

  const handleDaySelect = useCallback((date: string) => {
    setSelectedDate(date);
    const d = new Date(date + "T00:00:00");
    setSelectedMonth(d.getMonth() + 1);
    setSelectedYear(d.getFullYear());
  }, []);

  const handleMonthSelect = useCallback((year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setMode("monthly");
    setMonthlySub("mon");
  }, []);

  const handleMonthlyYearChange = useCallback((year: number) => {
    setSelectedYear(year);
  }, []);

  const handleDailyYearMonthClick = useCallback((year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setDailySub("month");
  }, []);

  const handleDailyYearChange = useCallback((year: number) => {
    setSelectedYear(year);
  }, []);

  const handleYearSelect = useCallback((year: number) => {
    setSelectedYear(year);
    setMode("yearly");
    setYearlySub("year");
  }, []);

  const handleAiNavigate = useCallback(
    (target: { mode: "daily" | "monthly" | "yearly"; subTab?: string; date: string; month: number; year: number }) => {
      if (target.mode === "daily") {
        setSelectedDate(target.date);
        setSelectedMonth(target.month);
        setSelectedYear(target.year);
        setMode("daily");
        setDailySub("day");
      } else if (target.mode === "monthly") {
        setSelectedMonth(target.month);
        setSelectedYear(target.year);
        setMode("monthly");
        setMonthlySub("mon");
      } else {
        setSelectedYear(target.year);
        setMode("yearly");
        if (target.subTab === "goal") {
          setYearlySub("goal");
        } else {
          setYearlySub("year");
        }
      }
    },
    []
  );

  // Apply AI nav target from global modal (Home.tsx)
  useEffect(() => {
    if (aiNavTarget) {
      handleAiNavigate(aiNavTarget);
      onAiNavTargetHandled?.();
    }
  }, [aiNavTarget, handleAiNavigate, onAiNavTargetHandled]);

  // Track whether edit was opened from a reminder tap
  const editFromReminderRef = useRef(false);

  // When reminder triggers edit: find the arrangement and open edit modal
  useEffect(() => {
    if (!editTargetId) return;
    const target = arrangements.find((a) => a.id === editTargetId);
    if (target) {
      editFromReminderRef.current = true;
      setEditingArrangement(target);
    }
  }, [editTargetId, arrangements]);

  // When edit modal closes after being opened from reminder
  useEffect(() => {
    if (!editingArrangement && editFromReminderRef.current) {
      editFromReminderRef.current = false;
      onEditClosed?.();
    }
  }, [editingArrangement, onEditClosed]);

  const handleCreate = useCallback(
    (data: { title: string; date: string; endDate?: string; startTime?: string; endTime?: string }) => {
      create(data);
      setShowCreate(false);
    },
    [create]
  );

  const handleEdit = useCallback((a: Arrangement) => {
    setEditingArrangement(a);
  }, []);

  const handleUpdate = useCallback(
    (data: { title: string; date: string; endDate?: string; startTime?: string; endTime?: string; content?: string }) => {
      if (!editingArrangement) return;
      update(editingArrangement.id, data);
      setEditingArrangement(null);
    },
    [editingArrangement, update]
  );

  const selectedDateArrangements = dailyGetByDate(selectedDate);

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex shrink-0 flex-col px-4 pt-3.5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-text">安排</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAi(true)}
              className="flex h-8 items-center gap-1 rounded-full bg-gradient-to-r from-[#09B83E] to-[#0E9DEC] px-3 text-xs font-medium text-white active:opacity-80"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2a4 4 0 014 4c0 2-2 6-4 8-2-2-4-6-4-8a4 4 0 014-4z" />
                <path d="M8 14c-2 1-6 2-6 4 0 2 4 4 10 4s10-2 10-4c0-2-4-3-6-4" />
              </svg>
              AI
            </button>
            <ModeToggle mode={mode} onMode={setMode} />
          </div>
        </div>
        <div className="mt-1 flex items-center">
          {mode === "daily" && <DailySubTabBar subTab={dailySub} onSubTab={setDailySub} />}
          {mode === "monthly" && <MonthlySubTabBar subTab={monthlySub} onSubTab={setMonthlySub} />}
          {mode === "yearly" && <YearlySubTabBar subTab={yearlySub} onSubTab={setYearlySub} />}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        {mode === "daily" && dailySub === "year" && (
          <DailyYearGrid
            year={selectedYear}
            selectedMonth={selectedMonth}
            onMonthClick={handleDailyYearMonthClick}
            onYearChange={handleDailyYearChange}
          />
        )}
        {mode === "daily" && dailySub === "month" && (
          <MonthView
            year={selectedYear}
            month={selectedMonth}
            selectedDate={selectedDate}
            onSelectDate={handleDaySelect}
            onDayDoubleClick={handleDayClick}
            getByMonth={dailyGetByMonth}
            onUpdateStatus={updateStatus}
            onEdit={handleEdit}
          />
        )}
        {mode === "daily" && dailySub === "day" && (
          <DayView
            date={selectedDate}
            arrangements={selectedDateArrangements}
            onDateChange={setSelectedDate}
            selectedDate={selectedDate}
            onSelectDate={handleDaySelect}
            onEdit={handleEdit}
          />
        )}
        {mode === "daily" && dailySub === "note" && (
          <ListView
            items={dailyItemsSorted}
            onUpdateStatus={updateStatus}
            onDayClick={handleDayClick}
            onEdit={handleEdit}
          />
        )}
        {mode === "monthly" && (
          <MonthlyRecordView
            subTab={monthlySub}
            year={selectedYear}
            month={selectedMonth}
            items={monthlyItems}
            onMonthSelect={handleMonthSelect}
            onYearChange={handleMonthlyYearChange}
            onUpdateStatus={updateStatus}
            onEdit={handleEdit}
          />
        )}
        {mode === "yearly" && (
          <YearlyRecordView
            key={goalsVersion}
            subTab={yearlySub}
            year={selectedYear}
            items={yearlyItems}
            onYearChange={handleYearSelect}
            onUpdateStatus={updateStatus}
            onEdit={handleEdit}
          />
        )}
      </main>

      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="fixed bottom-20 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#09B83E] text-white shadow-lg active:scale-95 transition-transform"
        aria-label="创建安排"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {showCreate && (
        <CreateModal
          date={selectedDate}
          onConfirm={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingArrangement && (
        <CreateModal
          date={editingArrangement.date}
          editData={editingArrangement}
          onConfirm={handleUpdate}
          onClose={() => setEditingArrangement(null)}
        />
      )}

      {showAi && (
        <AiRecognitionModal
          onClose={() => { setShowAi(false); setAiInitialText(undefined); reload(); setGoalsVersion(v => v + 1); }}
          onNavigate={handleAiNavigate}
          onGoToSettings={onGoToAiSettings}
          initialText={aiInitialText}
        />
      )}
    </div>
  );
}

function ModeToggle({ mode, onMode }: { mode: ModeType; onMode: (m: ModeType) => void }) {
  const items: { key: ModeType; label: string }[] = [
    { key: "daily", label: "日记" },
    { key: "monthly", label: "月记" },
    { key: "yearly", label: "年记" },
  ];
  return (
    <div className="flex items-center rounded-lg bg-surface-muted p-0.5">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onMode(item.key)}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            mode === item.key ? "bg-surface text-text shadow-sm" : "text-text-muted"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function DailySubTabBar({ subTab, onSubTab }: { subTab: DailySubTab; onSubTab: (t: DailySubTab) => void }) {
  const items: { key: DailySubTab; label: string }[] = [
    { key: "year", label: "年" },
    { key: "month", label: "月" },
    { key: "day", label: "日" },
    { key: "note", label: "记" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-0.5">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSubTab(item.key)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            subTab === item.key ? "bg-surface text-text shadow-sm" : "text-text-muted"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function MonthlySubTabBar({ subTab, onSubTab }: { subTab: MonthlySubTab; onSubTab: (t: MonthlySubTab) => void }) {
  const items: { key: MonthlySubTab; label: string }[] = [
    { key: "year", label: "年" },
    { key: "mon", label: "月" },
    { key: "mnote", label: "月记" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-0.5">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSubTab(item.key)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            subTab === item.key ? "bg-surface text-text shadow-sm" : "text-text-muted"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function YearlySubTabBar({ subTab, onSubTab }: { subTab: YearlySubTab; onSubTab: (t: YearlySubTab) => void }) {
  const items: { key: YearlySubTab; label: string }[] = [
    { key: "year", label: "年" },
    { key: "ynote", label: "年记" },
    { key: "goal", label: "目标" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-0.5">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSubTab(item.key)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            subTab === item.key ? "bg-surface text-text shadow-sm" : "text-text-muted"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function DailyYearGrid({
  year,
  selectedMonth,
  onMonthClick,
  onYearChange,
}: {
  year: number;
  selectedMonth: number;
  onMonthClick: (year: number, month: number) => void;
  onYearChange: (year: number) => void;
}) {
  const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const today = new Date();
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth() + 1;

  return (
    <div className="flex h-full flex-col overflow-auto px-4">
      <div className="flex items-center justify-between py-2">
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
      <div className="grid grid-cols-3 gap-3 pb-4">
        {MONTHS.map((label, i) => {
          const m = i + 1;
          const isThisMonth = m === thisMonth && year === thisYear;
          const isSelected = m === selectedMonth;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onMonthClick(year, m)}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border py-5 transition-colors active:bg-surface-muted",
                isSelected
                  ? "border-[#09B83E] bg-[#F0FFF4]"
                  : "border-border bg-surface"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold",
                  isThisMonth
                    ? "bg-[#09B83E] text-white"
                    : "bg-surface-muted text-text"
                )}
              >
                {m}
              </span>
              <span className="mt-1 text-xs text-text-muted">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
