"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { BrandMark } from "@/components/bhaiway/BrandMark";
import { NAVIGATION } from "@/config/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onNavigate?: () => void;
}

function sectionContainsPath(sectionId: string, pathname: string): boolean {
  const section = NAVIGATION.find((s) => s.id === sectionId);
  if (!section) return false;
  return section.items.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const activeSectionIds = useMemo(
    () => NAVIGATION.filter((s) => sectionContainsPath(s.id, pathname)).map((s) => s.id),
    [pathname],
  );

  /** Manual open/closed overrides scoped to the pathname they were made on. */
  const [manualPath, setManualPath] = useState(pathname);
  const [manual, setManual] = useState<Record<string, boolean>>({});

  const effectiveManual = pathname === manualPath ? manual : {};

  function isSectionOpen(id: string): boolean {
    if (Object.prototype.hasOwnProperty.call(effectiveManual, id)) {
      return effectiveManual[id]!;
    }
    if (activeSectionIds.includes(id)) return true;
    if (activeSectionIds.length === 0 && NAVIGATION[0]?.id === id) return true;
    return false;
  }

  function toggleSection(id: string) {
    const currentlyOpen = isSectionOpen(id);
    setManualPath(pathname);
    setManual((prev) => {
      const base = pathname === manualPath ? prev : {};
      return { ...base, [id]: !currentlyOpen };
    });
  }

  return (
    <aside
      className={cn(
        "flex h-dvh max-h-dvh w-60 shrink-0 flex-col border-r border-[var(--bw-border)] bg-[var(--bw-surface)] transition-[margin,transform] duration-200",
        open
          ? "translate-x-0"
          : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0",
        "fixed inset-y-0 left-0 z-40 lg:sticky lg:top-0 lg:self-start",
      )}
      aria-label="Main navigation"
      data-testid="admin-sidebar"
      data-open={open}
    >
      <div className="flex h-14 items-center border-b border-[var(--bw-border)] bg-[var(--bw-brand-soft)] px-4">
        <BrandMark size="sm" />
        <span className="ml-2 rounded-full bg-[var(--bw-brand)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Admin
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Admin sections">
        <ul className="space-y-1">
          {NAVIGATION.map((section) => {
            const isOpen = isSectionOpen(section.id);
            const panelId = `nav-section-${section.id}`;
            const hasActiveChild = activeSectionIds.includes(section.id);

            return (
              <li key={section.id}>
                <button
                  type="button"
                  id={`${panelId}-trigger`}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleSection(section.id)}
                  data-testid={`nav-section-${section.id}`}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold uppercase tracking-[0.06em] transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]",
                    hasActiveChild || isOpen
                      ? "bg-[var(--bw-brand-soft)] text-[var(--bw-brand)]"
                      : "text-[var(--bw-text-muted)] hover:bg-[var(--bw-elevated)] hover:text-[var(--bw-brand)]",
                  )}
                >
                  <span className="truncate">{section.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={`${panelId}-trigger`}
                  hidden={!isOpen}
                  className={cn(isOpen ? "mt-0.5 pb-1" : "hidden")}
                >
                  <ul className="ml-1 space-y-0.5 border-l-2 border-[var(--bw-brand)]/25 pl-1.5">
                    {section.items.map((item) => {
                      const active =
                        pathname === item.href || pathname.startsWith(`${item.href}/`);
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bw-brand)]",
                              active
                                ? "bg-[var(--bw-brand)] font-medium text-white shadow-sm"
                                : "text-[var(--bw-text-secondary)] hover:bg-[var(--bw-brand-soft)] hover:text-[var(--bw-brand)]",
                            )}
                            aria-current={active ? "page" : undefined}
                          >
                            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
