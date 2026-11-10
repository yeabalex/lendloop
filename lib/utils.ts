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
