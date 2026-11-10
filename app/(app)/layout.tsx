import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { AppSyncGate } from "@/components/providers/app-sync-gate";

async function AuthShell({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <AppSyncGate>{children}</AppSyncGate>
      </main>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
          Loading workspace...
        </div>
      }
    >
      <AuthShell>{children}</AuthShell>
    </Suspense>
  );
}
