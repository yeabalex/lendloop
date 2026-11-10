"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import type { ToolItem } from "@/components/tools/tool-card";
import { api } from "@/convex/_generated/api";
import { getCategoryLabel } from "@/lib/constants";
import { getErrorMessage, toDateInputValue } from "@/lib/utils";

interface BorrowModalProps {
  tool: ToolItem | null;
  onClose: () => void;
  onSuccess?: (toolName: string) => void;
}

export function BorrowModal({ tool, onClose, onSuccess }: BorrowModalProps) {
  if (!tool) {
    return null;
  }

  return (
    <BorrowDialog
      key={tool._id}
      tool={tool}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function BorrowDialog({
  tool,
  onClose,
  onSuccess,
}: {
  tool: ToolItem;
  onClose: () => void;
  onSuccess?: (toolName: string) => void;
}) {
  const requestLoan = useMutation(api.loans.requestLoan);

  const [defaultRange] = useState(() => {
    const start = new Date();
    const end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);
    return {
      startStr: toDateInputValue(start),
      endStr: toDateInputValue(end),
    };
  });

  const [startDateStr, setStartDateStr] = useState(defaultRange.startStr);
  const [endDateStr, setEndDateStr] = useState(defaultRange.endStr);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!startDateStr || !endDateStr) {
      setError("Please select both a pickup date and a return date.");
      return;
    }

    // Parse start at beginning of selected day and end at end of selected day
    const startMs = new Date(`${startDateStr}T00:00:00`).getTime();
    const endMs = new Date(`${endDateStr}T23:59:59`).getTime();

    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      setError("Return date must be after the pickup date.");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestLoan({
        toolId: tool._id,
        startDate: startMs,
        endDate: endMs,
        notes: notes.trim() || undefined,
      });
      onSuccess?.(tool.name);
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to submit borrow request."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Request to Borrow
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {tool.name} · {getCategoryLabel(tool.category)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="borrow-start"
                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Pickup Date
              </label>
              <input
                id="borrow-start"
                type="date"
                value={startDateStr}
                min={defaultRange.startStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="borrow-end"
                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Return Date
              </label>
              <input
                id="borrow-end"
                type="date"
                value={endDateStr}
                min={startDateStr || defaultRange.startStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="borrow-notes"
              className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Message to Owner{" "}
              <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="borrow-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Let your neighbor know what project you need it for or when you can pick it up..."
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Sending Request..." : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
