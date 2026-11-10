"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { getCategoryLabel, getConditionLabel } from "@/lib/constants";

export interface ToolItem {
  _id: Id<"tools">;
  name: string;
  category: string;
  condition?: string;
  description?: string;
  isAvailable?: boolean;
  owner?: {
    _id: Id<"users">;
    name: string;
    isTrustedLender: boolean;
  } | null;
  isOwner?: boolean;
  hasPendingRequest?: boolean;
}

interface ToolCardProps {
  tool: ToolItem;
  publicView?: boolean;
  isAdmin?: boolean;
  showOwnerActions?: boolean;
  onEdit?: (tool: ToolItem) => void;
  onDelete?: (tool: ToolItem) => void;
  onBorrow?: (tool: ToolItem) => void;
}

export function ToolCard({
  tool,
  publicView = false,
  isAdmin = false,
  showOwnerActions = false,
  onEdit,
  onDelete,
  onBorrow,
}: ToolCardProps) {
  if (publicView) {
    return (
      <article className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-zinc-900 dark:text-zinc-100">
            {tool.name}
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {getCategoryLabel(tool.category)}
          </p>
        </div>
        <span className="ml-3 shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
          Available
        </span>
      </article>
    );
  }

  const canEdit = Boolean(tool.isOwner || showOwnerActions);
  const canDelete = Boolean(tool.isOwner || showOwnerActions || isAdmin);
  const isAvailable = tool.isAvailable ?? true;

  return (
    <article className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div>
        {/* Title & Availability */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {tool.name}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isAvailable
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
            }`}
          >
            {isAvailable ? "Available" : "On Loan"}
          </span>
        </div>

        {/* Category & Condition Tags */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {getCategoryLabel(tool.category)}
          </span>
          {tool.condition && (
            <span className="rounded-md border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              {getConditionLabel(tool.condition)}
            </span>
          )}
        </div>

        {/* Description */}
        {tool.description && (
          <p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
            {tool.description}
          </p>
        )}
      </div>

      {/* Owner & Action Footer */}
      <div className="mt-5 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
        {tool.owner && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Listed by{" "}
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {tool.isOwner ? "You" : tool.owner.name}
              </span>
            </span>
            {tool.owner.isTrustedLender && (
              <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                ★ Trusted Lender
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!tool.isOwner && !showOwnerActions && onBorrow && (
            <button
              type="button"
              disabled={!isAvailable || tool.hasPendingRequest}
              onClick={() => onBorrow(tool)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                tool.hasPendingRequest
                  ? "cursor-not-allowed border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
                  : isAvailable
                  ? "cursor-pointer bg-emerald-600 text-white hover:bg-emerald-500"
                  : "cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
              }`}
            >
              {tool.hasPendingRequest
                ? "Requested (Pending)"
                : isAvailable
                ? "Request to Borrow"
                : "Currently Borrowed"}
            </button>
          )}

          {canEdit && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(tool)}
              className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Edit
            </button>
          )}

          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(tool)}
              className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {isAdmin && !tool.isOwner && !showOwnerActions
                ? "Admin Remove"
                : "Delete"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

