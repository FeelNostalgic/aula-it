"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface PrefixComboboxProps {
  prefixes: string[];
  value: string;
  onChange: (value: string) => void;
  allowCreate?: boolean;
  counts?: Map<string, number>;
  placeholder?: string;
  allLabel?: string;
  allValue?: string;
}

export function PrefixCombobox({
  prefixes,
  value,
  onChange,
  allowCreate = false,
  counts,
  placeholder = "ALU, 1DAW…",
  allLabel,
  allValue,
}: PrefixComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const displayValue =
    allValue && value === allValue
      ? allLabel ?? "Todos"
      : value || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between bg-background/50 border-border/50 font-mono text-sm font-normal"
        >
          <span className={cn("flex-1 min-w-0 truncate text-left", value && (!allValue || value !== allValue) ? "text-foreground" : "text-muted-foreground")}>
            {displayValue}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar prefijo..."
            value={inputValue}
            onValueChange={(v) => {
              const upper = v.toUpperCase();
              setInputValue(upper);
              if (allowCreate) onChange(upper);
            }}
            className="h-9 text-xs font-mono"
          />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground font-mono">
              {allowCreate && inputValue ? (
                <>
                  <span className="text-foreground font-bold">{inputValue}</span> — nuevo prefijo
                </>
              ) : (
                "Sin resultados"
              )}
            </CommandEmpty>
            <CommandGroup>
              {allValue && allLabel && (
                <CommandItem
                  value={allValue}
                  onSelect={() => {
                    onChange(allValue);
                    setInputValue("");
                    setOpen(false);
                  }}
                  className="text-xs font-mono"
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === allValue ? "opacity-100" : "opacity-0")} />
                  {allLabel}
                </CommandItem>
              )}
              {prefixes.map((p) => (
                <CommandItem
                  key={p}
                  value={p}
                  onSelect={() => {
                    onChange(p);
                    setInputValue("");
                    setOpen(false);
                  }}
                  className="text-xs font-mono justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Check className={cn("h-3.5 w-3.5", value === p ? "opacity-100" : "opacity-0")} />
                    {p}
                  </span>
                  {counts && (
                    <span className="text-muted-foreground">{counts.get(p)} alumnos</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
