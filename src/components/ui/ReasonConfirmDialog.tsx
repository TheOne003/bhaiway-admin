"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";

interface ReasonConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  reasonLabel?: string;
  reasonRequired?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ReasonConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  reasonLabel = "Reason",
  reasonRequired = true,
  onConfirm,
  onCancel,
  danger = false,
}: ReasonConfirmDialogProps) {
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setReason("");
        onCancel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const canConfirm = !reasonRequired || reason.trim().length > 0;

  function handleCancel() {
    setReason("");
    onCancel();
  }

  function handleConfirm() {
    const value = reason.trim();
    setReason("");
    onConfirm(value);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      data-testid="reason-confirm-dialog"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Cancel dialog overlay"
        onClick={handleCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm rounded-lg border border-[var(--bw-border)] bg-[var(--bw-surface)] p-5 shadow-xl"
      >
        <h2 id={titleId} className="text-base font-semibold text-[var(--bw-text-primary)]">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[var(--bw-text-secondary)]">{description}</p>
        <label htmlFor={reasonId} className="mt-4 block text-sm font-medium">
          {reasonLabel}
          {reasonRequired ? <span className="text-[var(--bw-danger)]"> *</span> : null}
        </label>
        <textarea
          id={reasonId}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-[var(--bw-border)] bg-[var(--bw-bg)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
          data-testid="reason-input"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            disabled={!canConfirm}
            onClick={handleConfirm}
            data-testid="reason-confirm"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
