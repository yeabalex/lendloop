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
