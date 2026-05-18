import { useState } from "react";
import { useAiSettings } from "@/lib/aiSettingsStore";
import { useMemoryFile } from "@/lib/memoryStore";
import AiOnboardingModal from "@/components/mine/AiOnboardingModal";
import MobilePageHeader from "@/components/mine/MobilePageHeader";

interface Props {
  onBack: () => void;
}

export default function AiSettingsScreen({ onBack }: Props) {
  const ai = useAiSettings();
  const memory = useMemoryFile();
  const [showMemory, setShowMemory] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [memDraft, setMemDraft] = useState(memory.content);

  const hasOnboarded = window.localStorage?.getItem("arkme-demo.aiOnboarded") === "true";

  const handleToggle = (v: boolean) => {
    ai.setEnabled(v);
    if (v && !hasOnboarded) {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingDone = () => {
    window.localStorage?.setItem("arkme-demo.aiOnboarded", "true");
    setShowOnboarding(false);
  };

  const handleSaveMemory = () => {
    memory.update(memDraft);
    setShowMemory(false);
  };

  if (showMemory) {
    return (
      <div className="relative flex h-full flex-col bg-bg">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => { setMemDraft(memory.content); setShowMemory(false); }} className="text-sm text-text-muted">
            取消
          </button>
          <span className="text-base font-semibold text-text">编辑记忆文件</span>
          <button onClick={handleSaveMemory} className="text-sm font-semibold text-[#09B83E]">
            保存
          </button>
        </div>
        <textarea
          value={memDraft}
          onChange={(e) => setMemDraft(e.target.value)}
          className="min-h-0 flex-1 resize-none bg-bg px-4 py-2 text-sm text-text outline-none font-mono leading-relaxed"
          placeholder="写下你的生活习惯..."
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-bg">
      <MobilePageHeader title="AI 设置" onBack={onBack} />

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3 space-y-3">
        {/* AI 识别开关 */}
        <section className="rounded-[12px] bg-surface px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-text">AI 识别</h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                开启后可使用 AI 从对话中识别安排
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle(!ai.enabled)}
              className={`flex items-center h-7 w-12 rounded-full transition-colors ${
                ai.enabled ? "bg-[#09B83E] justify-end" : "bg-[#E5E7EB] justify-start"
              }`}
            >
              <span className="mx-0.5 h-6 w-6 rounded-full bg-white shadow" />
            </button>
          </div>

          {!ai.enabled && (
            <div className="mt-3 rounded-lg bg-bg px-3 py-2">
              <p className="text-xs text-text-tertiary leading-relaxed">
                开启 AI 识别后，你可以从对话记录中智能提取安排，自动创建到日记/月记/年记中。需要配置你自己的大模型 API Key，消耗你自己的 Token。
              </p>
            </div>
          )}
        </section>

        {ai.enabled && (
          <>
            {/* API 配置 */}
            <section className="rounded-[12px] bg-surface px-4 py-4 space-y-3">
              <h2 className="text-[15px] font-semibold text-text">API 配置</h2>

              <div>
                <label className="block mb-1 text-xs text-text-muted">API Key</label>
                <input
                  type="password"
                  value={ai.apiKey}
                  onChange={(e) => ai.setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-[#E5E7EB] bg-bg px-3 py-2 text-sm text-text outline-none focus:border-[#09B83E]"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs text-text-muted">Base URL</label>
                <input
                  type="text"
                  value={ai.baseUrl}
                  onChange={(e) => ai.setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full rounded-lg border border-[#E5E7EB] bg-bg px-3 py-2 text-sm text-text outline-none focus:border-[#09B83E]"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs text-text-muted">模型</label>
                <input
                  type="text"
                  value={ai.model}
                  onChange={(e) => ai.setModel(e.target.value)}
                  placeholder="例如 gpt-4o-mini / deepseek-chat"
                  className="w-full rounded-lg border border-[#E5E7EB] bg-bg px-3 py-2 text-sm text-text outline-none focus:border-[#09B83E]"
                />
              </div>

            </section>

            {/* 记忆文件 */}
            <section className="rounded-[12px] bg-surface px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-text">生活记忆</h2>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    AI 识别安排时参考你的作息和习惯
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setMemDraft(memory.content); setShowMemory(true); }}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-text active:bg-surface-muted"
                >
                  编辑
                </button>
              </div>
              <div className="mt-2 rounded-lg bg-bg px-3 py-2 max-h-24 overflow-auto">
                <pre className="text-xs text-text-tertiary whitespace-pre-wrap font-mono leading-relaxed">
                  {memory.content.slice(0, 200)}{memory.content.length > 200 ? "..." : ""}
                </pre>
              </div>
            </section>
          </>
        )}
      </div>

      {showOnboarding && <AiOnboardingModal onDone={handleOnboardingDone} />}
    </div>
  );
}
