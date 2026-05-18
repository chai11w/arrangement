import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAiSettings } from "@/lib/aiSettingsStore";
import { useMemoryFile } from "@/lib/memoryStore";
import { useArrangements } from "@/lib/arrangementStore";
import {
  recognizeArrangementsStream,
  type RecognizedArrangement,
} from "@/lib/aiRecognitionService";

interface Props {
  onClose: () => void;
  onNavigate?: (target: { mode: "daily" | "monthly" | "yearly"; subTab?: string; date: string; month: number; year: number }) => void;
  onGoToSettings?: () => void;
  initialText?: string;
}

function classifyArrangement(item: RecognizedArrangement): "daily" | "monthly" | "yearly" {
  if (item.type === "goal") return "yearly";
  const hasEnd = item.endDate && item.endDate !== item.date;
  if (!hasEnd) return "daily";
  const startYm = item.date.slice(0, 7);
  const endYm = item.endDate!.slice(0, 7);
  return startYm !== endYm ? "yearly" : "monthly";
}

function getNavTarget(item: RecognizedArrangement) {
  const d = new Date((item.date || new Date().toISOString().slice(0, 10)) + "T00:00:00");
  const mode = classifyArrangement(item);
  return { mode, subTab: item.type === "goal" ? "goal" : undefined, date: item.date, month: d.getMonth() + 1, year: d.getFullYear() } as {
    mode: "daily" | "monthly" | "yearly";
    subTab?: string;
    date: string;
    month: number;
    year: number;
  };
}

type Step = "input" | "loading" | "result" | "error";

export default function AiRecognitionModal({ onClose, onNavigate, onGoToSettings, initialText }: Props) {
  const ai = useAiSettings();
  const memory = useMemoryFile();
  const { create } = useArrangements();

  const [inputText, setInputText] = useState(initialText || "");
  const [step, setStep] = useState<Step>("input");
  const [results, setResults] = useState<RecognizedArrangement[]>([]);
  const [hadResults, setHadResults] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [navTarget, setNavTarget] = useState<{ mode: "daily" | "monthly" | "yearly"; subTab?: string; date: string; month: number; year: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [rawResponse, setRawResponse] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<RecognizedArrangement>({
    title: "",
    date: "",
    endDate: "",
    startTime: "",
    endTime: "",
    content: "",
    reason: "",
    type: "event",
  });

  const canRecognize = ai.enabled && ai.apiKey.trim().length > 0 && inputText.trim().length > 0;

  const handleRecognize = async () => {
    if (!canRecognize) return;
    setStep("loading");
    setErrorMsg("");
    setHadResults(false);
    setAddedCount(0);
    setRawResponse("");
    try {
      const result = await recognizeArrangementsStream(
        [inputText.trim()],
        ai,
        memory.content,
        (text) => setRawResponse(text)
      );
      setResults(result.arrangements);
      setRawResponse(result.rawResponse);
      setHadResults(result.arrangements.length > 0);
      setStep("result");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "识别失败，请检查 API 配置");
      setStep("error");
    }
  };

  // Auto-trigger recognition when text is pre-filled from message long-press
  useEffect(() => {
    if (initialText && initialText.trim() && ai.enabled && ai.apiKey.trim()) {
      handleRecognize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = (item: RecognizedArrangement) => {
    const d = new Date((item.date || new Date().toISOString().slice(0, 10)) + "T00:00:00");

    if (item.type === "goal") {
      try {
        const raw = localStorage.getItem("arkme-demo.goals");
        const goals = raw ? JSON.parse(raw) : [];
        goals.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
          title: item.title,
          year: d.getFullYear(),
          done: false,
        });
        localStorage.setItem("arkme-demo.goals", JSON.stringify(goals));
      } catch { /* ignore */ }
    } else {
      create({
        title: item.title,
        date: item.date || new Date().toISOString().slice(0, 10),
        endDate: item.endDate || undefined,
        startTime: item.startTime || undefined,
        endTime: item.endTime || undefined,
        content: item.content || item.reason || undefined,
        sourceType: "ai",
      });
    }

    setAddedCount((c) => c + 1);
  };

  const handleConfirmAll = () => {
    if (results.length === 0) return;
    for (const item of results) {
      handleConfirm(item);
    }
    const firstItem = results.find((r) => r.type !== "goal") || results[0];
    setNavTarget(getNavTarget(firstItem));
    setResults([]);
    onClose();
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...results[index] });
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const next = [...results];
    next[editingIndex] = editForm;
    setResults(next);
    setEditingIndex(null);
  };

  const rejectItem = (index: number) => {
    setResults((prev) => prev.filter((_, i) => i !== index));
  };

  if (!ai.enabled) {
    return (
      <div className="absolute inset-0 z-50 flex items-end bg-black/30" onClick={onClose}>
        <div
          className="w-full rounded-t-2xl bg-surface px-5 pb-8 pt-5 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-center text-base font-semibold text-text mb-4">AI 识别</h2>
          <p className="text-sm text-text-muted text-center mb-4">
            请先在「我的 → 设置 → AI 识别」中开启开关并配置 API Key
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5 text-sm text-text-muted"
            >
              知道了
            </button>
            {onGoToSettings && (
              <button
                onClick={() => { onClose(); onGoToSettings(); }}
                className="flex-1 rounded-xl bg-[#09B83E] py-2.5 text-sm font-semibold text-white"
              >
                去设置
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!ai.apiKey.trim()) {
    return (
      <div className="absolute inset-0 z-50 flex items-end bg-black/30" onClick={onClose}>
        <div
          className="w-full rounded-t-2xl bg-surface px-5 pb-8 pt-5 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-center text-base font-semibold text-text mb-4">AI 识别</h2>
          <p className="text-sm text-text-muted text-center mb-4">
            请先在「我的 → 设置 → AI 识别」中填写 API Key
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5 text-sm text-text-muted"
            >
              知道了
            </button>
            {onGoToSettings && (
              <button
                onClick={() => { onClose(); onGoToSettings(); }}
                className="flex-1 rounded-xl bg-[#09B83E] py-2.5 text-sm font-semibold text-white"
              >
                去设置
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="w-full max-h-[90%] flex flex-col rounded-t-2xl bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
          <button onClick={onClose} className="text-sm text-text-muted">
            取消
          </button>
          <h2 className="text-base font-semibold text-text">AI 识别安排</h2>
          <div className="w-10" />
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5">
          {/* Input step */}
          {step === "input" && (
            <div className="pb-4">
              <p className="text-xs text-text-tertiary mb-2">
                输入对话内容，AI 将识别其中可能存在的安排
              </p>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`例如：\n"明天下午去医院复查"\n"好的，后天帮你带早餐"`}
                rows={6}
                autoFocus
                className="w-full rounded-lg border border-[#E5E7EB] bg-bg px-3 py-2 text-sm text-text outline-none focus:border-[#09B83E] resize-none"
              />
            </div>
          )}

          {/* Loading step */}
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#09B83E]" />
              <p className="mt-3 text-sm text-text-muted">AI 正在分析...</p>
            </div>
          )}

          {/* Error step */}
          {step === "error" && (
            <div className="pb-4">
              <div className="rounded-lg bg-[#FFF0F0] px-4 py-3 mb-4">
                <p className="text-sm text-[#F46363]">{errorMsg}</p>
              </div>
              <button
                onClick={() => setStep("input")}
                className="w-full rounded-xl border border-[#E5E7EB] py-2.5 text-sm text-text-muted"
              >
                返回重试
              </button>
            </div>
          )}

          {/* Result step */}
          {step === "result" && (
            <div className="pb-4">
              {results.length === 0 ? (
                <div className="text-center py-8">
                  {hadResults ? (
                    <>
                      <p className="text-sm text-[#09B83E] font-medium">
                        已添加 {addedCount} 条安排
                      </p>
                      <div className="mt-3 flex gap-2 justify-center">
                        {navTarget && onNavigate && (
                          <button
                            onClick={() => { onNavigate(navTarget); onClose(); }}
                            className="rounded-lg bg-[#09B83E] px-4 py-1.5 text-sm font-medium text-white"
                          >
                            跳转查看
                          </button>
                        )}
                        <button
                          onClick={onClose}
                          className="rounded-lg border border-[#E5E7EB] px-4 py-1.5 text-sm text-text-muted"
                        >
                          关闭
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-text-muted">未识别到安排内容</p>
                      <button
                        onClick={() => setStep("input")}
                        className="mt-3 text-sm text-[#09B83E]"
                      >
                        重新输入
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-xs text-text-tertiary mb-3">
                    识别到 {results.length} 条安排，请确认后添加到对应视图中
                  </p>
                  {rawResponse && (
                    <details className="mb-3">
                      <summary className="text-xs text-text-tertiary cursor-pointer">查看 AI 原始返回</summary>
                      <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-bg p-2 text-xs text-text-muted whitespace-pre-wrap">{rawResponse}</pre>
                    </details>
                  )}
                  <ul className="space-y-2">
                    {results.map((item, i) => {
                      if (editingIndex === i) {
                        return (
                          <li key={i} className="rounded-xl border border-[#09B83E] bg-bg p-3">
                            <input
                              value={editForm.title}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, title: e.target.value }))
                              }
                              placeholder="标题"
                              className="w-full mb-2 rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm outline-none focus:border-[#09B83E]"
                            />
                            <div className="flex gap-2 mb-2">
                              <input
                                type="date"
                                value={editForm.date}
                                onChange={(e) =>
                                  setEditForm((f) => ({ ...f, date: e.target.value }))
                                }
                                className="flex-1 rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm outline-none"
                              />
                              <span className="flex items-center text-xs text-text-tertiary">~</span>
                              <input
                                type="date"
                                value={editForm.endDate}
                                onChange={(e) =>
                                  setEditForm((f) => ({ ...f, endDate: e.target.value }))
                                }
                                placeholder="结束日期"
                                className="flex-1 rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm outline-none"
                              />
                            </div>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="time"
                                value={editForm.startTime}
                                onChange={(e) =>
                                  setEditForm((f) => ({ ...f, startTime: e.target.value }))
                                }
                                className="flex-1 rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm outline-none"
                              />
                              <span className="flex items-center text-xs text-text-tertiary">~</span>
                              <input
                                type="time"
                                value={editForm.endTime}
                                onChange={(e) =>
                                  setEditForm((f) => ({ ...f, endTime: e.target.value }))
                                }
                                className="flex-1 rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm outline-none"
                              />
                            </div>
                            {editForm.reason && (
                              <p className="text-xs text-text-tertiary mb-2">{editForm.reason}</p>
                            )}
                            <textarea
                              value={editForm.content}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, content: e.target.value }))
                              }
                              placeholder="内容详情（可选）"
                              rows={2}
                              className="w-full mb-2 rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm outline-none focus:border-[#09B83E] resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={saveEdit}
                                className="flex-1 rounded-lg bg-[#09B83E] py-1.5 text-xs font-semibold text-white"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingIndex(null)}
                                className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-xs text-text-muted"
                              >
                                取消
                              </button>
                            </div>
                          </li>
                        );
                      }

                      const isGoal = item.type === "goal";
                      return (
                        <li
                          key={i}
                          className={cn(
                            "rounded-xl border p-3",
                            isGoal
                              ? "border-[#7C5CFC] bg-[#F8F6FF]"
                              : "border-[#E5E7EB] bg-bg"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {isGoal && (
                                  <span className="shrink-0 rounded bg-[#7C5CFC] px-1.5 py-0.5 text-[10px] font-medium text-white">目标</span>
                                )}
                                <p className="text-sm font-medium text-text">{item.title}</p>
                              </div>
                              {!isGoal && (item.date || item.startTime) && (
                                <p className="mt-0.5 text-sm font-medium text-text">
                                  {item.date && <span>{item.date}</span>}
                                  {item.endDate && <span> ~ {item.endDate}</span>}
                                  {item.startTime && (
                                    <span>
                                      {" "}
                                      {item.startTime}
                                      {item.endTime ? ` ~ ${item.endTime}` : ""}
                                    </span>
                                  )}
                                </p>
                              )}
                              {item.content && (
                                <p className="mt-1 text-xs text-text-secondary">
                                  {item.content}
                                </p>
                              )}
                              {item.reason && (
                                <p className="mt-0.5 text-xs text-text-tertiary italic">
                                  {item.reason}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => {
                                handleConfirm(item);
                                setNavTarget(getNavTarget(item));
                                rejectItem(i);
                              }}
                              className="flex-1 rounded-lg bg-[#09B83E] py-1.5 text-xs font-semibold text-white active:bg-[#08A836]"
                            >
                              添加
                            </button>
                            <button
                              onClick={() => startEdit(i)}
                              className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs text-text-muted"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => rejectItem(i)}
                              className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs text-[#F46363]"
                            >
                              忽略
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {results.length > 1 && (
                    <button
                      onClick={handleConfirmAll}
                      className="mt-3 w-full rounded-xl bg-[#09B83E] py-2.5 text-sm font-semibold text-white active:bg-[#08A836]"
                    >
                      全部添加
                    </button>
                  )}

                  {results.length > 0 && (
                    <button
                      onClick={() => setStep("input")}
                      className="mt-2 w-full rounded-xl border border-[#E5E7EB] py-2.5 text-sm text-text-muted"
                    >
                      重新识别
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Bottom button for input step */}
        {step === "input" && (
          <div className="shrink-0 px-5 pb-8 pt-2">
            <button
              onClick={handleRecognize}
              disabled={!canRecognize}
              className="w-full rounded-xl bg-[#09B83E] py-3 text-sm font-semibold text-white active:bg-[#08A836] disabled:opacity-40"
            >
              开始识别
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
