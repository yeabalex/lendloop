"use client";

import { Show, SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { ToolList } from "./tool-list";

export function PublicHeroCta() {
  return (
    <div className="mt-8 flex justify-center">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="cursor-pointer rounded-full bg-zinc-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Sign in to lend or borrow
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Link
          href="/dashboard"
          className="rounded-full bg-emerald-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          Go to Tool Board →
        </Link>
      </Show>
    </div>
  );
}

export function PublicToolBoard() {
  const publicTools = useQuery(api.tools.listPublic);

  return (
    <ToolList
      tools={publicTools}
      publicView
      emptyMessage="No tools are currently available. Sign in to list the first tool in your neighborhood!"
    />
  );
}
