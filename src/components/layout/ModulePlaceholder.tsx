import { EmptyState } from "@/components/ui/States";

interface ModulePlaceholderProps {
  title: string;
  phase: number;
  description?: string;
}

export function ModulePlaceholder({ title, phase, description }: ModulePlaceholderProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <EmptyState
        title={title}
        description={
          description ??
          `This module is scaffolded for Phase ${phase}. Foundation (shell, auth, services, theme) is ready; full UI arrives in a later phase.`
        }
      />
    </div>
  );
}
