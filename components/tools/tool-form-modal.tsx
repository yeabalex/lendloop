"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import {
  TOOL_CATEGORIES,
  TOOL_CONDITIONS,
  type ToolCategory,
  type ToolCondition,
} from "@/lib/constants";
import { getErrorMessage } from "@/lib/utils";
import type { ToolItem } from "./tool-card";

interface ToolFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTool?: ToolItem | null;
}

export function ToolFormModal({
  isOpen,
  onClose,
  initialTool = null,
}: ToolFormModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <ToolFormDialog
      key={initialTool?._id ?? "new"}
      initialTool={initialTool}
      onClose={onClose}
    />
  );
}

function ToolFormDialog({
  initialTool,
  onClose,
}: {
  initialTool: ToolItem | null;
  onClose: () => void;
}) {
  const createTool = useMutation(api.tools.create);
  const updateTool = useMutation(api.tools.update);

  const [name, setName] = useState(initialTool?.name ?? "");
  const [category, setCategory] = useState<ToolCategory>(
    (initialTool?.category as ToolCategory) || "power_tools"
  );
  const [condition, setCondition] = useState<ToolCondition>(
    (initialTool?.condition as ToolCondition) || "good"
  );
  const [description, setDescription] = useState(
    initialTool?.description ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(initialTool);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a tool name.");
      return;
    }
    if (!description.trim()) {
      setError("Please enter a short description.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (initialTool) {
        await updateTool({
          toolId: initialTool._id,
          name: name.trim(),
          category,
          condition,
          description: description.trim(),
        });
      } else {
        await createTool({
          name: name.trim(),
          category,
          condition,
          description: description.trim(),
        });
      }
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Something went wrong saving the tool."));
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
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {isEditing ? "Edit Tool Listing" : "List a New Tool"}
          </h2>
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

          <div>
            <label
              htmlFor="tool-name"
              className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Tool Name
            </label>
            <input
              id="tool-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DeWalt 20V Cordless Drill"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="tool-category"
                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Category
              </label>
              <select
                id="tool-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ToolCategory)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                {TOOL_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="tool-condition"
                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Condition
              </label>
              <select
                id="tool-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value as ToolCondition)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                {TOOL_CONDITIONS.map((cond) => (
                  <option key={cond.id} value={cond.id}>
                    {cond.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="tool-description"
              className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Short Description
            </label>
            <textarea
              id="tool-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Include key details, accessories included, or pickup notes..."
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
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "List Tool"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
