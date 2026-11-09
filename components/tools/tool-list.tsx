"use client";

export function ToolList({ publicView = false }: { publicView?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      {publicView
        ? "Available neighborhood tools will appear here once connected to Convex."
        : "Your neighborhood tool board will appear here."}
    </div>
  );
}
