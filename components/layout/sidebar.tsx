"use client";

import { UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "All Tools" },
  { href: "/my-listings", label: "My Listings" },
  { href: "/my-requests", label: "My Requests" },
  { href: "/incoming-requests", label: "Incoming Requests" },
];

export function Sidebar() {
  const pathname = usePathname();
  const me = useQuery(api.users.currentUser);

  const isAdmin = me?.role === "admin";

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Brand header */}
      <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white">
            L
          </div>
          <span className="text-lg font-semibold tracking-tight">LendLoop</span>
        </Link>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 space-y-1 p-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <div className="pt-4">
            <p className="px-3.5 pb-1.5 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Administration
            </p>
            <Link
              href="/admin"
              className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                pathname.startsWith("/admin")
                  ? "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
            >
              <span>Admin Panel</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                Admin
              </span>
            </Link>
          </div>
        )}
      </nav>

      {/* Current user & role footer */}
      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <UserButton />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {me?.name ?? "Loading profile..."}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                  isAdmin
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {isAdmin ? "Admin" : "User"}
              </span>

              {me?.isTrustedLender && (
                <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  ★ Trusted Lender
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

