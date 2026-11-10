"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { LoanList } from "@/components/loans/loan-list";
import { LoanStatusFilter } from "@/components/loans/loan-status-filter";
import { useLoanActions } from "@/components/loans/use-loan-actions";
import { ToolFormModal } from "@/components/tools/tool-form-modal";
import { ToolList } from "@/components/tools/tool-list";
import { useToolManager } from "@/components/tools/use-tool-manager";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { LoanStatus } from "@/lib/constants";
import { getErrorMessage } from "@/lib/utils";

type AdminTab = "loans" | "listings" | "users";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("loans");
  const [loanStatusFilter, setLoanStatusFilter] = useState<LoanStatus | "all">(
    "all"
  );
  const [userError, setUserError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<Id<"users"> | null>(null);

  const me = useQuery(api.users.currentUser);
  const isAdmin = me?.role === "admin";

  const allLoans = useQuery(api.loans.listAllAdmin, isAdmin ? {} : "skip");
  const allTools = useQuery(
    api.tools.listAll,
    isAdmin ? { category: "all" } : "skip"
  );
  const allUsers = useQuery(api.users.listAll, isAdmin ? {} : "skip");

  const setTrustedLender = useMutation(api.users.setTrustedLender);
  const setUserRole = useMutation(api.users.setUserRole);

  const {
    busyLoanId,
    error: loanError,
    markReturned,
  } = useLoanActions();

  const {
    modalOpen,
    editingTool,
    feedback: toolError,
    openEdit,
    closeModal,
    handleDelete,
  } = useToolManager();

  if (me === undefined) {
    return (
      <div className="py-20 text-center text-sm text-zinc-500">
        Verifying admin access...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
        <h1 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
          Admin Access Required
        </h1>
        <p className="mt-2 text-sm text-amber-800/80 dark:text-amber-300/80">
          Your account has standard user permissions. Only neighborhood admins
          can manage all listings, view all loans, and grant Trusted Lender
          status.
        </p>
      </div>
    );
  }

  const filteredLoans =
    allLoans && loanStatusFilter !== "all"
      ? allLoans.filter((l) => l.status === loanStatusFilter)
      : allLoans;

  async function handleToggleTrusted(
    userId: Id<"users">,
    nextTrusted: boolean
  ) {
    setUserError(null);
    setBusyUserId(userId);
    try {
      await setTrustedLender({ userId, isTrustedLender: nextTrusted });
    } catch (err: unknown) {
      setUserError(
        getErrorMessage(err, "Failed to update Trusted Lender status.")
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleToggleRole(
    userId: Id<"users">,
    currentRole: "admin" | "user"
  ) {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    setUserError(null);
    setBusyUserId(userId);
    try {
      await setUserRole({ userId, role: nextRole });
    } catch (err: unknown) {
      setUserError(getErrorMessage(err, "Failed to update user role."));
    } finally {
      setBusyUserId(null);
    }
  }

  const activeError = loanError ?? toolError ?? userError;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Admin Panel
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage all neighborhood loans, moderate listings, and grant Trusted
          Lender badges.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        {(
          [
            { id: "loans", label: `All Loans (${allLoans?.length ?? "—"})` },
            {
              id: "listings",
              label: `All Listings (${allTools?.length ?? "—"})`,
            },
            {
              id: "users",
              label: `Neighbors & Trust (${allUsers?.length ?? "—"})`,
            },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-amber-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {activeError}
        </div>
      )}

      {activeTab === "loans" && (
        <div>
          <LoanStatusFilter
            selected={loanStatusFilter}
            onSelect={setLoanStatusFilter}
          />
          <LoanList
            loans={filteredLoans}
            mode="admin"
            busyLoanId={busyLoanId}
            onMarkReturned={markReturned}
            emptyMessage="No loans recorded across the neighborhood yet."
          />
        </div>
      )}

      {activeTab === "listings" && (
        <div>
          <ToolList
            tools={allTools}
            isAdmin
            emptyMessage="No tools are currently listed."
            onEdit={openEdit}
            onDelete={handleDelete}
          />
          <ToolFormModal
            isOpen={modalOpen}
            onClose={closeModal}
            initialTool={editingTool}
          />
        </div>
      )}

      {activeTab === "users" && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          {allUsers === undefined ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Loading users...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                  <tr>
                    <th className="px-5 py-3.5">Neighbor</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Trusted Lender</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {allUsers.map((user) => {
                    const isSelf = user._id === me._id;
                    const isBusy = busyUserId === user._id;
                    return (
                      <tr key={user._id}>
                        <td className="px-5 py-4">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {user.name} {isSelf && "(You)"}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                              user.role === "admin"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {user.isTrustedLender ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              ★ Trusted Lender
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-400">
                              Standard
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleToggleTrusted(
                                  user._id,
                                  !user.isTrustedLender
                                )
                              }
                              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                                user.isTrustedLender
                                  ? "border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                              }`}
                            >
                              {user.isTrustedLender
                                ? "Revoke Trust"
                                : "Mark Trusted Lender"}
                            </button>
                            {!isSelf && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleToggleRole(user._id, user.role)
                                }
                                className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                              >
                                {user.role === "admin"
                                  ? "Demote to User"
                                  : "Make Admin"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
