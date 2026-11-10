"use client";

import type { Id } from "@/convex/_generated/dataModel";
import {
  getCategoryLabel,
  LOAN_STATUS_META,
  type LoanStatus,
} from "@/lib/constants";
import { formatDateRange, formatRelativeTime } from "@/lib/utils";

export interface AutomationLogItem {
  _id: Id<"automationLogs">;
  summary: string;
  status: string;
  createdAt: number;
}

export interface LoanItem {
  _id: Id<"loans">;
  status: LoanStatus;
  startDate: number;
  endDate: number;
  notes?: string;
  createdAt: number;
  returnedAt?: number;
  lastReminderSentAt?: number;
  reminderCount: number;
  tool: {
    _id: Id<"tools">;
    name: string;
    category: string;
  } | null;
  borrower: {
    _id: Id<"users">;
    name: string;
    email: string;
  } | null;
  lender: {
    _id: Id<"users">;
    name: string;
    email: string;
    isTrustedLender: boolean;
  } | null;
  automationLogs?: AutomationLogItem[];
}

interface LoanCardProps {
  loan: LoanItem;
  mode: "outgoing" | "incoming" | "admin";
  nowMs: number;
  busyLoanId?: Id<"loans"> | null;
  onApprove?: (loanId: Id<"loans">) => void;
  onDecline?: (loanId: Id<"loans">) => void;
  onCancel?: (loanId: Id<"loans">) => void;
  onMarkReturned?: (loanId: Id<"loans">) => void;
}

export function LoanCard({
  loan,
  mode,
  nowMs,
  busyLoanId,
  onApprove,
  onDecline,
  onCancel,
  onMarkReturned,
}: LoanCardProps) {
  const statusMeta = LOAN_STATUS_META[loan.status];
  const isOverdue = loan.status === "approved" && loan.endDate < nowMs;
  const isBusy = busyLoanId === loan._id;

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {loan.tool ? loan.tool.name : "Removed Tool"}
            </h3>
            {loan.tool && (
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {getCategoryLabel(loan.tool.category)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Borrow window: {formatDateRange(loan.startDate, loan.endDate)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMeta.badgeClass}`}
          >
            {statusMeta.label}
          </span>
          {isOverdue && (
            <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              Overdue
            </span>
          )}
        </div>
      </div>

      {/* Counterparty details */}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        {(mode === "outgoing" || mode === "admin") && loan.lender && (
          <div className="flex items-center gap-1.5">
            <span>Lender:</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {loan.lender.name}
            </span>
            {loan.lender.isTrustedLender && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                ★ Trusted Lender
              </span>
            )}
          </div>
        )}

        {(mode === "incoming" || mode === "admin") && loan.borrower && (
          <div>
            Borrower:{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {loan.borrower.name}
            </span>{" "}
            <span className="text-zinc-400">({loan.borrower.email})</span>
          </div>
        )}

        <div>Requested {formatRelativeTime(loan.createdAt, nowMs)}</div>
      </div>

      {loan.notes && (
        <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
          &ldquo;{loan.notes}&rdquo;
        </p>
      )}

      {/* Automation Activity Preview (populated once n8n workflows run) */}
      {loan.automationLogs && loan.automationLogs.length > 0 && (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
            Recent Automation Activity
          </p>
          <ul className="space-y-1">
            {loan.automationLogs.map((log) => (
              <li
                key={log._id}
                className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400"
              >
                <span>{log.summary}</span>
                <span>{formatRelativeTime(log.createdAt, nowMs)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contextual Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {mode === "incoming" && loan.status === "pending" && (
          <>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onApprove?.(loan._id)}
              className="cursor-pointer rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {isBusy ? "Updating..." : "Approve Request"}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onDecline?.(loan._id)}
              className="cursor-pointer rounded-lg border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Decline
            </button>
          </>
        )}

        {(mode === "incoming" || mode === "admin") &&
          loan.status === "approved" && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onMarkReturned?.(loan._id)}
              className="cursor-pointer rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {isBusy ? "Updating..." : "Mark as Returned"}
            </button>
          )}

        {mode === "outgoing" && loan.status === "pending" && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onCancel?.(loan._id)}
            className="cursor-pointer rounded-lg border border-zinc-200 px-3.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {isBusy ? "Cancelling..." : "Cancel Request"}
          </button>
        )}
      </div>
    </article>
  );
}
