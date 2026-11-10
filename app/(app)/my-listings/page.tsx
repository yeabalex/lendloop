"use client";

import { useQuery } from "convex/react";
import { ToolFormModal } from "@/components/tools/tool-form-modal";
import { ToolList } from "@/components/tools/tool-list";
import { useToolManager } from "@/components/tools/use-tool-manager";
import { api } from "@/convex/_generated/api";

export default function MyListingsPage() {
  const {
    modalOpen,
    editingTool,
    feedback,
    openCreate,
    openEdit,
    closeModal,
    handleDelete,
  } = useToolManager();

  const myTools = useQuery(api.tools.listMine);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            My Listings
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Tools you have shared with the neighborhood.
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

      <ToolList
        tools={myTools}
        showOwnerActions
        emptyMessage="You haven't listed any tools yet. Click '+ List a Tool' to add your first tool."
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
