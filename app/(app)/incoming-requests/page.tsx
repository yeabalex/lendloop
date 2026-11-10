"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { LoanList } from "@/components/loans/loan-list";
import { LoanStatusFilter } from "@/components/loans/loan-status-filter";
import { useLoanActions } from "@/components/loans/use-loan-actions";
import { api } from "@/convex/_generated/api";
import type { LoanStatus } from "@/lib/constants";

export default function IncomingRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<LoanStatus | "all">("all");
  const incoming = useQuery(api.loans.listIncoming);
  const { busyLoanId, error, approve, decline, markReturned } =
    useLoanActions();

  const filteredIncoming =
    incoming && statusFilter !== "all"
      ? incoming.filter((r) => r.status === statusFilter)
      : incoming;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Incoming Requests
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Review borrow requests from neighbors and mark returned tools.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <LoanStatusFilter selected={statusFilter} onSelect={setStatusFilter} />

      <LoanList
        loans={filteredIncoming}
        mode="incoming"
        busyLoanId={busyLoanId}
        onApprove={approve}
        onDecline={decline}
        onMarkReturned={markReturned}
        emptyMessage={
          statusFilter === "all"
            ? "No neighbors have requested your tools yet."
            : `No ${statusFilter} incoming requests.`
        }
      />
    </div>
  );
}
