"use client";

import { LOAN_STATUSES, type LoanStatus } from "@/lib/constants";

const STATUS_TABS = [
  { id: "all", label: "All" },
  ...LOAN_STATUSES,
] as const;

export function LoanStatusFilter({
  selected,
  onSelect,
}: {
  selected: LoanStatus | "all";
  onSelect: (status: LoanStatus | "all") => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {STATUS_TABS.map((tab) => {
        const isActive = selected === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-emerald-600 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
