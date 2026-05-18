interface Props {
  onDone: () => void;
}

export default function AiOnboardingModal({ onDone }: Props) {
  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/30" onClick={onDone}>
      <div
        className="w-full max-h-[85%] overflow-auto rounded-t-2xl bg-surface px-5 pb-8 pt-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-center text-base font-semibold text-text mb-3">
          AI 识别引导
        </h2>

        <p className="text-sm text-text-muted leading-relaxed mb-4">
          为了让 AI 更准确地从对话中识别安排，请花一分钟填写你的<b className="text-text">生活记忆</b>。
          告诉 AI 你的作息、习惯，它会据此推理合适的时间。
        </p>

        <div className="rounded-xl bg-bg px-4 py-3 mb-4">
          <h3 className="text-xs font-semibold text-text mb-2">举个例子 — 小张</h3>
          <div className="text-xs text-text-tertiary leading-relaxed space-y-1 font-mono">
            <p className="text-text-muted font-semibold">基本信息</p>
            <p>性别：女</p>
            <p>年龄：24</p>
            <p>生日：2002-07-21</p>
            <p className="text-text-muted font-semibold mt-2">作息时间</p>
            <p className="text-text-tertiary">上午</p>
            <p>起床：07:30</p>
            <p>上班：09:00</p>
            <p>下班：12:00</p>
            <p className="text-text-tertiary">下午</p>
            <p>上班：13:30</p>
            <p>下班：18:30</p>
            <p className="text-text-tertiary">晚上</p>
            <p>睡觉：23:00</p>
            <p className="text-text-muted font-semibold mt-2">生活习惯</p>
            <p>爱好：喝咖啡</p>
          </div>
        </div>

        <div className="rounded-lg bg-[#F0FFF4] px-3 py-2 mb-4">
          <p className="text-xs text-[#09B83E] leading-relaxed">
            有了这些信息，当你收到消息"下午上班顺路帮我带杯咖啡"——<b>长按</b>这条消息
            → 点击<b>AI识别</b>，AI 就会知道应该在<b>13:00-13:30</b>（午休结束到下午上班之间）
            安排这件事，而不是其他时间。
          </p>
        </div>

        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-xl bg-[#09B83E] py-3 text-sm font-semibold text-white active:bg-[#08A836]"
        >
          我知道了，去填写记忆文件
        </button>
      </div>
    </div>
  );
}
