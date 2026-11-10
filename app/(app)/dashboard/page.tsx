"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { CategoryFilter } from "@/components/tools/category-filter";
import { ToolFormModal } from "@/components/tools/tool-form-modal";
import { ToolList } from "@/components/tools/tool-list";
import { useToolManager } from "@/components/tools/use-tool-manager";
import { api } from "@/convex/_generated/api";
import type { ToolCategory } from "@/lib/constants";

export default function DashboardPage() {
  const [selectedCategory, setSelectedCategory] = useState<
    ToolCategory | "all"
  >("all");
  const {
    modalOpen,
    editingTool,
    feedback,
    openCreate,
    openEdit,
    closeModal,
    handleDelete,
  } = useToolManager();

  const me = useQuery(api.users.currentUser);
  const tools = useQuery(api.tools.listAll, {
    category: selectedCategory,
  });

  const isAdmin = me?.role === "admin";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            All Tools
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Browse tools available across your neighborhood.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          + List a Tool
        </button>
      </div>

      {feedback && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {feedback}
        </div>
      )}

      <CategoryFilter
        selected={selectedCategory}
        onSelect={(cat) => setSelectedCategory(cat as ToolCategory | "all")}
      />

      <ToolList
        tools={tools}
        isAdmin={isAdmin}
        emptyMessage={
          selectedCategory === "all"
            ? "No tools have been listed yet. Be the first neighbor to share one!"
            : "No tools found in this category."
        }
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <ToolFormModal
        isOpen={modalOpen}
        onClose={closeModal}
        initialTool={editingTool}
      />
    </div>
  );
}
