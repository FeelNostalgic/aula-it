"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUp, ArrowDown, ArrowUpDown, RotateCcw, UserX, UserCheck, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClassroomStudent } from "./types";

interface StudentColumnConfig {
  canDelete: boolean;
  isPending: boolean;
  onResetPassword: (student: ClassroomStudent) => void;
  onToggleStatus: (student: ClassroomStudent) => void;
  onDelete?: (student: ClassroomStudent) => void;
  onUnenrollOne: (student: ClassroomStudent, moduleId: string) => void;
  onManageEnrollments: (student: ClassroomStudent) => void;
}

export function buildStudentColumns(config: StudentColumnConfig): ColumnDef<ClassroomStudent>[] {
  const {
    canDelete,
    isPending,
    onResetPassword,
    onToggleStatus,
    onDelete,
    onUnenrollOne,
    onManageEnrollments,
  } = config;

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Seleccionar todos"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "identifier",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Identificador
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="size-3" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="size-3" />
          ) : (
            <ArrowUpDown className="size-3 opacity-40" />
          )}
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-bold font-mono">{row.getValue("identifier")}</span>
      ),
    },
    {
      accessorKey: "is_banned",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Estado <ArrowUpDown className="size-3 opacity-40" />
        </button>
      ),
      cell: ({ row }) =>
        row.getValue("is_banned") ? (
          <Badge variant="outline" className="text-[9px] font-mono border-destructive/50 text-destructive bg-destructive/5">
            Desactivado
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] font-mono border-green-500/50 text-green-400 bg-green-500/5">
            Activo
          </Badge>
        ),
    },
    {
      accessorKey: "enrolledModules",
      header: () => <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Matrículas</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const mods: Array<{ id: string; name: string }> = row.getValue("enrolledModules");
        if (mods.length === 0)
          return <span className="text-muted-foreground text-[10px] font-mono">—</span>;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {mods.slice(0, 2).map((m) => (
              <Badge
                key={m.id}
                variant="outline"
                className="text-[9px] font-mono h-5 gap-1 pr-1 border-border/50"
              >
                {m.name}
                <button
                  className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                  title={`Desmatricular de ${m.name}`}
                  onClick={() => onUnenrollOne(row.original, m.id)}
                >
                  <X className="size-2.5" />
                </button>
              </Badge>
            ))}
            {mods.length > 2 && (
              <button
                className="text-[9px] font-mono text-primary hover:underline"
                onClick={() => onManageEnrollments(row.original)}
              >
                +{mods.length - 2} más
              </button>
            )}
            {mods.length <= 2 && (
              <button
                className="text-[9px] font-mono text-muted-foreground hover:text-foreground"
                onClick={() => onManageEnrollments(row.original)}
                title="Gestionar matrículas"
              >
                ···
              </button>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-center justify-end gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              title="Resetear contraseña"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onResetPassword(s)}
            >
              <RotateCcw className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title={s.is_banned ? "Reactivar" : "Desactivar"}
              className={`h-7 w-7 p-0 ${s.is_banned ? "text-green-500 hover:text-green-400" : "text-amber-500 hover:text-amber-400"}`}
              disabled={isPending}
              onClick={() => onToggleStatus(s)}
            >
              {s.is_banned ? <UserCheck className="size-3.5" /> : <UserX className="size-3.5" />}
            </Button>
            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                title="Eliminar cuenta"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(s)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
