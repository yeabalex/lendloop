"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getErrorMessage } from "@/lib/utils";

/**
 * Shared mutation handlers and busy/error state for loan lifecycle transitions.
 */
export function useLoanActions() {
  const [busyLoanId, setBusyLoanId] = useState<Id<"loans"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approveMutation = useMutation(api.loans.approveLoan);
  const declineMutation = useMutation(api.loans.declineLoan);
  const cancelMutation = useMutation(api.loans.cancelRequest);
  const returnMutation = useMutation(api.loans.markReturned);

  async function runAction(
    loanId: Id<"loans">,
    fn: () => Promise<unknown>,
    fallbackMessage: string
  ) {
    setError(null);
    setBusyLoanId(loanId);
    try {
      await fn();
    } catch (err: unknown) {
      setError(getErrorMessage(err, fallbackMessage));
    } finally {
      setBusyLoanId(null);
    }
  }

  return {
    busyLoanId,
    error,
    approve: (loanId: Id<"loans">) =>
      runAction(
        loanId,
        () => approveMutation({ loanId }),
        "Failed to approve request."
      ),
    decline: (loanId: Id<"loans">) =>
      runAction(
        loanId,
        () => declineMutation({ loanId }),
        "Failed to decline request."
      ),
    cancel: (loanId: Id<"loans">) =>
      runAction(
        loanId,
        () => cancelMutation({ loanId }),
        "Failed to cancel request."
      ),
    markReturned: (loanId: Id<"loans">) =>
      runAction(
        loanId,
        () => returnMutation({ loanId }),
        "Failed to mark loan as returned."
      ),
  };
}
