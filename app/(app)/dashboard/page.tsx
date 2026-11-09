import { CategoryFilter } from "@/components/tools/category-filter";
import { ToolList } from "@/components/tools/tool-list";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">All Tools</h1>
      <CategoryFilter />
      {/* TODO: pass Convex data + filter state */}
      <ToolList />
    </div>
  );
}

