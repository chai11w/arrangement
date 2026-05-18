import type { AiSettings } from "@/lib/aiSettingsStore";
import { getTodayStr } from "@/lib/utils";

export type RecognizedArrangement = {
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  content: string;
  reason: string;
  type: "event" | "goal";
};

export type RecognitionResult = {
  arrangements: RecognizedArrangement[];
  rawResponse: string;
};

function buildSystemPrompt(memoryContent: string): string {
  const today = getTodayStr();
  const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
  const d = new Date();
  const weekday = dayNames[d.getDay()];
  const thisYear = today.slice(0, 4);
  const nextYear = String(Number(thisYear) + 1);
  const prevYear = String(Number(thisYear) - 1);
  const yearAfter = String(Number(thisYear) + 2);

  const memorySection = memoryContent?.trim()
    ? `\n用户作息（优先参考）：\n${memoryContent}\n`
    : "";

  return `你是日历助理。从消息中提取安排，输出纯JSON数组。纯闲聊→[]。

当前：${today} 周${weekday}
今年=${thisYear} 明年=${nextYear} 后年=${yearAfter} 去年=${prevYear}
${memorySection}
## 日期规则
- 今天/今早/今晚→${today} 明天→${today}+1天 后天→${today}+2天
- 下月/下个月→月份+1(可能跨年) 下周X→推算具体日期
- 无日期线索→默认${today}
- 跨月/跨年安排date和endDate须精确到日(不确定时取月初1号或月末最后一天)
- 同条消息中startDate和endDate可能属于不同年份，各自独立推算

## 时间规则
- 明确时间(3点/两点半)→直接用
- 模糊时段无具体时间→须推理，不许留空：先查用户作息，其次用默认值
  早08:00 上午09:00 中午12:00 下午14:00 傍晚17:00 晚19:00
- 完全没提时段→startTime/endTime留空""
- 时长估算：看病+2h 聚餐+1.5h 开会+1h 健身+1.5h 购物+2.5h 电影+2.5h 理发+1h 接送+0.5h 上课+1.5h 其他+1h

## 跨天
- 单天→endDate留空""
- 多天(含跨年)→endDate写最后一天
- 有具体时间必须填startTime/endTime(如23:00~01:00跨午夜)
- 无具体时间→startTime/endTime留空，按整天显示

## 目标识别
含"目标/计划/flag/考上/完成/达成/拿到/买"等词或往年回顾→type="goal", date=对应年份12-31, startTime/endTime留空, title去年代和结果词
其余→type="event"

## 字段要求
- title: 去掉日期时间和对话人称(你我他)，如"医院复查""部门周会"
- content: 1~2句备注，不重复日期时间
- reason: ≤15字，只写时间推理(如"下午默认14:00，看病+2h")

只输出JSON数组，不要markdown代码块：
[{"title":"","type":"event或goal","date":"YYYY-MM-DD","endDate":"YYYY-MM-DD或空","startTime":"HH:MM","endTime":"HH:MM","content":"","reason":""}]`;
}

function extractJson(text: string): string {
  // Strip markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
  }
  // Find the JSON array
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || start >= end) {
    return cleaned;
  }
  return cleaned.slice(start, end + 1);
}

export async function recognizeArrangements(
  messages: string[],
  settings: AiSettings,
  memoryContent: string
): Promise<RecognitionResult> {
  const systemPrompt = buildSystemPrompt(memoryContent);
  const userMessage = messages
    .map((m, i) => `[消息${i + 1}] ${m}`)
    .join("\n\n");

  const url = `${settings.baseUrl.replace(/\/$/, "")}/chat/completions`;

  const body = JSON.stringify({
    model: settings.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `请识别以下对话中可能存在的安排：\n\n${userMessage}` },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API 请求失败 (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawResponse: string =
    data?.choices?.[0]?.message?.content || JSON.stringify(data);

  const jsonStr = extractJson(rawResponse);
  let arrangements: RecognizedArrangement[] = [];

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      arrangements = parsed
        .filter(
          (item: unknown) =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as RecognizedArrangement).title === "string" &&
            (item as RecognizedArrangement).title.trim().length > 0
        )
        .map((item: RecognizedArrangement) => ({
          title: item.title.trim(),
          date: item.date || "",
          endDate: item.endDate || "",
          startTime: item.startTime || "",
          endTime: item.endTime || "",
          content: item.content || "",
          reason: item.reason || "",
          type: item.type === "goal" ? "goal" : "event",
        }));
    }
  } catch {
    // JSON parse failed, return empty
  }

  return { arrangements, rawResponse };
}

export async function recognizeArrangementsStream(
  messages: string[],
  settings: AiSettings,
  memoryContent: string,
  onChunk: (text: string) => void
): Promise<RecognitionResult> {
  const systemPrompt = buildSystemPrompt(memoryContent);
  const userMessage = messages
    .map((m, i) => `[消息${i + 1}] ${m}`)
    .join("\n\n");

  const url = `${settings.baseUrl.replace(/\/$/, "")}/chat/completions`;

  const body = JSON.stringify({
    model: settings.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `请识别以下对话中可能存在的安排：\n\n${userMessage}` },
    ],
    temperature: 0.3,
    max_tokens: 800,
    stream: true,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API 请求失败 (${res.status}): ${text.slice(0, 200)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("不支持流式响应");

  const decoder = new TextDecoder();
  let rawResponse = "";

  let done = false;
  while (!done) {
    const { done: streamDone, value } = await reader.read();
    done = streamDone;
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (delta) {
          rawResponse += delta;
          onChunk(rawResponse);
        }
      } catch {
        // skip unparseable lines
      }
    }
  }

  const jsonStr = extractJson(rawResponse);
  let arrangements: RecognizedArrangement[] = [];

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      arrangements = parsed
        .filter(
          (item: unknown) =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as RecognizedArrangement).title === "string" &&
            (item as RecognizedArrangement).title.trim().length > 0
        )
        .map((item: RecognizedArrangement) => ({
          title: item.title.trim(),
          date: item.date || "",
          endDate: item.endDate || "",
          startTime: item.startTime || "",
          endTime: item.endTime || "",
          content: item.content || "",
          reason: item.reason || "",
          type: item.type === "goal" ? "goal" : "event",
        }));
    }
  } catch {
    // JSON parse failed, return empty
  }

  return { arrangements, rawResponse };
}
