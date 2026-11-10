import { ConvexError } from "convex/values";

/**
 * Safely extracts a human-readable message from an unknown thrown value,
 * handling structured `ConvexError` payloads cleanly.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError) {
    const data = err.data as { message?: string } | string | undefined;
    if (typeof data === "string") return data;
    if (data && typeof data.message === "string") return data.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * Formats an epoch millisecond timestamp as a short readable date (e.g. "Nov 12, 2026").
 */
export function formatDate(epochMs: number): string {
  return dateFormatter.format(new Date(epochMs));
}

/**
 * Formats a start/end borrow window cleanly.
 */
export function formatDateRange(startMs: number, endMs: number): string {
  return `${formatDate(startMs)} → ${formatDate(endMs)}`;
}

/**
 * Formats an HTML `<input type="date">` value (`YYYY-MM-DD`) in local midnight epoch ms,
 * or end-of-day UTC/local for due date clarity.
 */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a timestamp as a concise relative string (e.g. "2 days ago", "just now").
 */
export function formatRelativeTime(epochMs: number, nowMs = Date.now()): string {
  const diffSeconds = Math.round((nowMs - epochMs) / 1000);
  if (diffSeconds < 60) return "just now";

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}
