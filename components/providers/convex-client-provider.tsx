"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { type ReactNode, useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { convex } from "@/lib/convex";

// When a user logs in, save their Clerk profile into Convex's `users` table
function UserProfileSync() {
  const { isAuthenticated } = useConvexAuth();
  const syncUser = useMutation(api.users.syncUser);

  useEffect(() => {
    if (isAuthenticated) {
      void syncUser({});
    }
  }, [isAuthenticated, syncUser]);

  return null;
}

// Wrap the app with Clerk (Auth) + Convex (Database)
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <UserProfileSync />
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
