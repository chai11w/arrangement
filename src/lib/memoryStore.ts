import { useState, useEffect, useCallback } from "react";

const MEMORY_KEY = "arkme-demo.memoryFile";

const DEFAULT_MEMORY = `# 我的生活记忆

## 基本信息
- 姓名：
- 性别：
- 年龄：
- 生日：

## 作息时间
### 上午
- 起床：
- 上班/上学：
- 下班/放学：
### 下午
- 上班/上学：
- 下班/放学：
### 晚上
- 睡觉：

## 生活习惯
- 爱好：

## 其他备注
（可以写任何你觉得 AI 应该了解的信息）
`;

function loadMemory(): string {
  if (typeof window === "undefined") return DEFAULT_MEMORY;
  const raw = window.localStorage.getItem(MEMORY_KEY);
  if (raw === null) return DEFAULT_MEMORY;
  return raw;
}

function saveMemory(text: string) {
  window.localStorage?.setItem(MEMORY_KEY, text);
}

export function useMemoryFile() {
  const [content, setContent] = useState(loadMemory);

  useEffect(() => {
    setContent(loadMemory());
  }, []);

  const update = useCallback((text: string) => {
    setContent(text);
    saveMemory(text);
  }, []);

  const reset = useCallback(() => {
    setContent(DEFAULT_MEMORY);
    saveMemory(DEFAULT_MEMORY);
  }, []);

  return { content, update, reset };
}
