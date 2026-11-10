"use client";

import { ToolCard, type ToolItem } from "./tool-card";

interface ToolListProps {
  tools: ToolItem[] | undefined;
  publicView?: boolean;
  isAdmin?: boolean;
  showOwnerActions?: boolean;
  emptyMessage?: string;
  onEdit?: (tool: ToolItem) => void;
  onDelete?: (tool: ToolItem) => void;
  onBorrow?: (tool: ToolItem) => void;
}

export function ToolList({
  tools,
  publicView = false,
  isAdmin = false,
  showOwnerActions = false,
  emptyMessage = "No tools listed yet.",
  onEdit,
  onDelete,
  onBorrow,
}: ToolListProps) {
  if (tools === undefined) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="h-32 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <ToolCard
          key={tool._id}
          tool={tool}
          publicView={publicView}
          isAdmin={isAdmin}
          showOwnerActions={showOwnerActions}
          onEdit={onEdit}
          onDelete={onDelete}
          onBorrow={onBorrow}
        />
      ))}
    </div>
  );
}
