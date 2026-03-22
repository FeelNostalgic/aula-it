"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface BulkAction {
  label: string;
  icon: LucideIcon;
  variant?: "outline" | "ghost";
  className?: string;
  onClick: () => void;
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onCancel: () => void;
}

export function BulkActionBar({ selectedCount, actions, onCancel }: BulkActionBarProps) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden transition-[max-height] duration-200 ease-in-out",
        selectedCount > 0 ? "max-h-14" : "max-h-0"
      )}
    >
      <div className="mx-6 mb-3 flex items-center justify-between gap-3 bg-primary/10 border border-primary/20 rounded-md px-4 py-2.5">
        <span className="text-xs font-mono text-primary font-bold shrink-0">
          {selectedCount} alumno{selectedCount !== 1 ? "s" : ""} seleccionado{selectedCount !== 1 ? "s" : ""}
        </span>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                size="sm"
                variant={action.variant ?? "outline"}
                className={cn("h-7 text-[11px] gap-1.5", action.className)}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                <Icon className="size-3" />
                {action.label}
              </Button>
            );
          })}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px]"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
