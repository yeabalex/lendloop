"use client";

import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";

/**
 * Waits until the authenticated Clerk user is synchronized into Convex's `users` table
 * before mounting child views that call protected Convex queries (`requireUser`).
 */
export function AppSyncGate({ children }: { children: ReactNode }) {
  const me = useQuery(api.users.currentUser);

  if (!me) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
        Loading your neighbor profile...
      </div>
    );
  }

  return <>{children}</>;
}

