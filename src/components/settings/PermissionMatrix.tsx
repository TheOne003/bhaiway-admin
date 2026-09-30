"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Permission, PermissionId } from "@/types/permission";

interface PermissionMatrixProps {
  permissions: Permission[];
  selectedIds: PermissionId[];
  onToggle: (permissionId: PermissionId, nextChecked: boolean) => void;
  disabled?: boolean;
}

export function PermissionMatrix({
  permissions,
  selectedIds,
  onToggle,
  disabled = false,
}: PermissionMatrixProps) {
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const byDomain = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) {
      const list = map.get(p.domain) ?? [];
      list.push(p);
      map.set(p.domain, list);
    }
    return [...map.entries()];
  }, [permissions]);

  return (
    <div className="space-y-6" data-testid="permission-matrix" role="group" aria-label="Permission matrix">
      {byDomain.map(([domain, perms]) => (
        <section key={domain} aria-labelledby={`domain-${domain}`}>
          <h3
            id={`domain-${domain}`}
            className="mb-2 text-sm font-semibold text-[var(--bw-text-primary)]"
          >
            {domain}
          </h3>
          <ul className="space-y-2">
            {perms.map((p) => {
              const checked = selected.has(p.id);
              return (
                <li key={p.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-md border border-[var(--bw-border)] px-3 py-2",
                      disabled && "cursor-not-allowed opacity-60",
                      checked && "border-[var(--bw-brand)] bg-[var(--bw-brand-soft)]/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-[var(--bw-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]"
                      checked={checked}
                      disabled={disabled}
                      data-testid={`perm-toggle-${p.id}`}
                      aria-label={p.label}
                      onChange={(e) => onToggle(p.id, e.target.checked)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{p.label}</span>
                      <span className="block text-xs text-[var(--bw-text-secondary)]">
                        {p.description}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] text-[var(--bw-text-muted)]">
                        {p.id}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
