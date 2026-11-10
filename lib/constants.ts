export const TOOL_CATEGORIES = [
  { id: "power_tools", label: "Power Tools" },
  { id: "garden", label: "Garden" },
  { id: "kitchen", label: "Kitchen" },
  { id: "camping", label: "Camping" },
  { id: "automotive", label: "Automotive" },
  { id: "cleaning", label: "Cleaning" },
  { id: "other", label: "Other" },
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number]["id"];

export const TOOL_CONDITIONS = [
  { id: "like_new", label: "Like New" },
  { id: "good", label: "Good" },
  { id: "fair", label: "Fair" },
  { id: "worn", label: "Worn" },
] as const;

export type ToolCondition = (typeof TOOL_CONDITIONS)[number]["id"];

export const LOAN_STATUSES = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "returned", label: "Returned" },
  { id: "declined", label: "Declined" },
] as const;

export type LoanStatus = (typeof LOAN_STATUSES)[number]["id"];

export const LOAN_STATUS_META: Record<
  LoanStatus,
  { label: string; badgeClass: string }
> = {
  pending: {
    label: "Pending Approval",
    badgeClass:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  },
  approved: {
    label: "Approved / Out on Loan",
    badgeClass:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  returned: {
    label: "Returned",
    badgeClass:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  declined: {
    label: "Declined",
    badgeClass: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  },
};

const CATEGORY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  TOOL_CATEGORIES.map((c) => [c.id, c.label])
);

const CONDITION_LABEL_MAP: Record<string, string> = Object.fromEntries(
  TOOL_CONDITIONS.map((c) => [c.id, c.label])
);

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABEL_MAP[category] ?? category;
}

export function getConditionLabel(condition: string): string {
  return CONDITION_LABEL_MAP[condition] ?? condition;
}
