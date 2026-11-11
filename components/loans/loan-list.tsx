"use client";

import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { LoanCard, type LoanItem } from "./loan-card";

interface LoanListProps {
  loans: LoanItem[] | undefined;
  mode: "outgoing" | "incoming" | "admin";
  emptyMessage: string;
  busyLoanId?: Id<"loans"> | null;
  onApprove?: (loanId: Id<"loans">) => void;
  onDecline?: (loanId: Id<"loans">) => void;
  onCancel?: (loanId: Id<"loans">) => void;
  onMarkReturned?: (loanId: Id<"loans">) => void;
}

export function LoanList({
  loans,
  mode,
  emptyMessage,
  busyLoanId,
  onApprove,
  onDecline,
  onCancel,
  onMarkReturned,
}: LoanListProps) {
  const [nowMs] = useState(() => Date.now());

  if (loans === undefined) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="h-32 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loans.map((loan) => (
        <LoanCard
          key={loan._id}
          loan={loan}
          mode={mode}
          nowMs={nowMs}
          busyLoanId={busyLoanId}
          onApprove={onApprove}
          onDecline={onDecline}
          onCancel={onCancel}
          onMarkReturned={onMarkReturned}
        />
      ))}
    </div>
  );
}

