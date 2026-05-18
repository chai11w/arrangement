import type { Arrangement } from "@/types/record";
import { isPastArrangement } from "@/types/record";

export function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Bar chart overlay background color */
export function statusBarBg(a: Arrangement): string {
  if (a.status === "done") return "bg-[#F46363]/50";
  if (a.status === "later") return "bg-[#EDBE09]/50";
  return isPastArrangement(a) ? "bg-[#9CA3AF]/40" : "bg-[#09B83E]/60";
}

/** List item title text (line-through for done, colors for other statuses) */
export function statusTitleClass(a: Arrangement): string {
  if (a.status === "done") return "line-through text-text-disabled";
  if (a.status === "later") return "text-[#EDBE09]";
  return isPastArrangement(a) ? "text-[#9CA3AF]" : "text-[#09B83E]";
}

/** Compact tag/badge in grid views (text + background) */
export function statusTagClass(a: Arrangement): string {
  if (a.status === "done") return "text-[#F46363] line-through bg-[#F46363]/10";
  if (a.status === "later") return "text-[#EDBE09] bg-[#EDBE09]/10";
  return isPastArrangement(a) ? "text-[#9CA3AF] bg-[#9CA3AF]/10" : "text-[#09B83E] bg-[#09B83E]/10";
}

/** Sticky column header text color (no line-through, no background) */
export function statusHeaderColor(a: Arrangement): string {
  if (a.status === "later") return "text-[#EDBE09]";
  return isPastArrangement(a) ? "text-[#9CA3AF]" : "text-[#09B83E]";
}
