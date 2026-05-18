export type RecordSourceConversationType = "ai" | "self" | "test";

export type RecordSourceConversation = {
  type: RecordSourceConversationType;
  label: string;
  actionLabel: string;
  iconLabel: string;
  entryIndex?: number;
  recordUid?: string;
  identityId?: string;
  conversationId?: string;
};

export type RecordReference = {
  uid: string;
  text_content: string;
  send_at: number;
  create_at: number;
  update_at: number;
  sourceConversation?: RecordSourceConversation;
};

export type RecordItem = {
  uid: string;
  text_content: string;
  send_at: number;
  create_at: number;
  update_at: number;
  sourceConversation?: RecordSourceConversation;
  referencedRecord?: RecordReference;
};

export type ArrangementStatus = "pending" | "done" | "later";

export type Arrangement = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  content?: string;
  status: ArrangementStatus;
  source?: {
    type: "manual" | "ai";
    conversationIds?: string[];
  };
  createdAt: number;
  updatedAt: number;
};

export function isMultiDay(a: Arrangement): boolean {
  return Boolean(a.endDate && a.endDate !== a.date);
}

export function isCrossMonth(a: Arrangement): boolean {
  if (!a.endDate || a.endDate === a.date) return false;
  const startYm = a.date.slice(0, 7);
  const endYm = a.endDate.slice(0, 7);
  return startYm !== endYm;
}

export function isPastArrangement(a: Arrangement): boolean {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const endStr = a.endDate || a.date;
  if (endStr < todayStr) return true;
  if (endStr > todayStr) return false;
  if (a.endTime) {
    const [h, m] = a.endTime.split(":").map(Number);
    return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
  }
  if (a.startTime) {
    const [h, m] = a.startTime.split(":").map(Number);
    return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
  }
  return false;
}
