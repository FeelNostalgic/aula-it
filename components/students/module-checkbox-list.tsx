"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Module {
  id: string;
  name: string;
  status: string;
  teacher_name?: string;
}

interface ModuleCheckboxListProps {
  modules: Module[];
  selected: string[];
  onToggle: (id: string) => void;
  emptyMessage?: string;
}

const STATUS_CLASS: Record<string, string> = {
  active:   "border-green-500/50 text-green-400 bg-green-500/5",
  draft:    "border-amber-500/50 text-amber-400 bg-amber-500/5",
  archived: "border-border/40 text-muted-foreground/60 bg-muted/5",
};

export function ModuleCheckboxList({
  modules,
  selected,
  onToggle,
  emptyMessage = "No hay módulos disponibles.",
}: ModuleCheckboxListProps) {
  if (modules.length === 0) {
    return <p className="text-xs text-muted-foreground font-mono">{emptyMessage}</p>;
  }

  return (
    <div className="border border-border/50 rounded-md divide-y divide-border/30 max-h-150 overflow-y-auto">
      {modules.map((m) => (
        <label
          key={m.id}
          className="flex items-center gap-3 px-3 py-3 cursor-pointer odd:bg-muted/60 even:bg-transparent hover:bg-blue-500/10 transition-colors"
        >
          <Checkbox
            checked={selected.includes(m.id)}
            onCheckedChange={() => onToggle(m.id)}
          />
          <span className="text-xs font-mono flex-1 truncate">{m.name}</span>
          {m.teacher_name && (
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              {m.teacher_name}
            </span>
          )}
          <Badge
            variant="outline"
            className={cn("text-[9px] font-mono uppercase h-5 shrink-0", STATUS_CLASS[m.status] ?? "border-border/50 text-muted-foreground")}
          >
            {m.status}
          </Badge>
        </label>
      ))}
    </div>
  );
}
