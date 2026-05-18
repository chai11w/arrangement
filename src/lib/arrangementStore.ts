import { useState, useEffect, useCallback, useMemo } from "react";
import type { Arrangement, ArrangementStatus } from "@/types/record";

const STORAGE_KEY = "arkme-demo.arrangements";

function generateId(): string {
  return `arr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadArrangements(): Arrangement[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a: unknown) =>
        typeof a === "object" &&
        a !== null &&
        typeof (a as Arrangement).id === "string" &&
        typeof (a as Arrangement).title === "string" &&
        typeof (a as Arrangement).date === "string"
    );
  } catch {
    return [];
  }
}

function saveArrangements(arrangements: Arrangement[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arrangements));
    window.dispatchEvent(new CustomEvent("arkme-arrangements-changed"));
    return true;
  } catch {
    console.warn("Failed to save arrangements to localStorage");
    return false;
  }
}

type CreateData = {
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  content?: string;
  sourceType?: "manual" | "ai";
  conversationIds?: string[];
};

export function useArrangements() {
  const [arrangements, setArrangements] = useState<Arrangement[]>([]);

  useEffect(() => {
    setArrangements(loadArrangements());
  }, []);

  const create = useCallback((data: CreateData) => {
    const now = Date.now();
    const next: Arrangement = {
      id: generateId(),
      title: data.title,
      date: data.date,
      endDate: data.endDate || undefined,
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      content: data.content || undefined,
      status: "pending",
      source: { type: data.sourceType || "manual", conversationIds: data.conversationIds },
      createdAt: now,
      updatedAt: now,
    };
    setArrangements((prev) => {
      const list = [next, ...prev];
      saveArrangements(list);
      return list;
    });
    return next;
  }, []);

  const updateStatus = useCallback(
    (id: string, status: ArrangementStatus) => {
      setArrangements((prev) => {
        let next: Arrangement[];
        if (status === "done") {
          next = prev.filter((a) => a.id !== id);
        } else {
          next = prev.map((a) =>
            a.id === id ? { ...a, status, updatedAt: Date.now() } : a
          );
        }
        saveArrangements(next);
        return next;
      });
    },
    []
  );

  const update = useCallback(
    (id: string, data: Partial<CreateData>) => {
      setArrangements((prev) => {
        const next = prev.map((a) =>
          a.id === id
            ? {
                ...a,
                ...data,
                endDate: "endDate" in data ? (data.endDate || undefined) : a.endDate,
                startTime: "startTime" in data ? (data.startTime || undefined) : a.startTime,
                endTime: "endTime" in data ? (data.endTime || undefined) : a.endTime,
                content: "content" in data ? (data.content || undefined) : a.content,
                updatedAt: Date.now(),
              }
            : a
        );
        saveArrangements(next);
        return next;
      });
    },
    []
  );

  const remove = useCallback((id: string) => {
    setArrangements((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveArrangements(next);
      return next;
    });
  }, []);

  const getByDate = useCallback(
    (date: string) => arrangements.filter((a) => a.date === date),
    [arrangements]
  );

  const getByMonth = useCallback(
    (year: number, month: number) => {
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      return arrangements.filter((a) => a.date.startsWith(prefix));
    },
    [arrangements]
  );

  const upcoming = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return arrangements
      .filter((a) => a.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || "99").localeCompare(b.startTime || "99"));
  }, [arrangements]);

  return {
    arrangements,
    create,
    update,
    updateStatus,
    remove,
    getByDate,
    getByMonth,
    upcoming,
    reload: () => setArrangements(loadArrangements()),
  };
}
