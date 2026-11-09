"use client";

const CATEGORIES = [
  { id: "all", label: "All Categories" },
  { id: "power_tools", label: "Power Tools" },
  { id: "garden", label: "Garden" },
  { id: "kitchen", label: "Kitchen" },
  { id: "camping", label: "Camping" },
  { id: "automotive", label: "Automotive" },
  { id: "cleaning", label: "Cleaning" },
  { id: "other", label: "Other" },
];

export function CategoryFilter({
  selected = "all",
  onSelect,
}: {
  selected?: string;
  onSelect?: (category: string) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect?.(cat.id)}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-emerald-600 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
