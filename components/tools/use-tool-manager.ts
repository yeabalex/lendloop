"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { getErrorMessage } from "@/lib/utils";
import type { ToolItem } from "./tool-card";

/**
 * Shared state and handlers for creating, editing, and removing tools
 * across the Dashboard and My Listings views.
 */
export function useToolManager() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolItem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const removeTool = useMutation(api.tools.remove);

  function openCreate() {
    setEditingTool(null);
    setModalOpen(true);
  }

  function openEdit(tool: ToolItem) {
    setEditingTool(tool);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function handleDelete(tool: ToolItem) {
    if (!window.confirm(`Remove "${tool.name}" from LendLoop?`)) {
      return;
    }

    setFeedback(null);
    try {
      await removeTool({ toolId: tool._id });
    } catch (err: unknown) {
      setFeedback(getErrorMessage(err, "Failed to remove tool."));
    }
  }

  return {
    modalOpen,
    editingTool,
    feedback,
    openCreate,
    openEdit,
    closeModal,
    handleDelete,
  };
}
