"use client";

import {
  useActionState,
  useState,
  useTransition,
  useEffect,
  useMemo,
} from "react";
import { useFormStatus } from "react-dom";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  createBulkStudents,
  resetStudentPassword,
  bulkResetPasswords,
  bulkEnrollByPrefix,
  bulkUnenrollByPrefix,
  bulkUnenrollByStudentIds,
  bulkToggleStatus,
  bulkDeleteStudents,
  unenrollStudentFromModule,
  toggleStudentStatus,
  deleteStudent,
  type BulkCreateResult,
  type ClassroomStudent,
  type TeacherModule,
} from "./actions";
import { useBreadcrumb } from "@/components/dashboard/breadcrumb-context";
import {
  Users,
  KeyRound,
  Loader2,
  Printer,
  Download,
  RotateCcw,
  CheckCircle2,
  XCircle,
  BookOpen,
  UserX,
  UserCheck,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractPrefix(identifier: string): string {
  const match = identifier.match(/^(.+)-\d+$/);
  return match ? match[1] : identifier;
}

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} className="w-full h-11 font-bold" type="submit">
      {pending
        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />GENERANDO...</>
        : <><Users className="mr-2 h-4 w-4" />GENERAR CUENTAS</>
      }
    </Button>
  );
}

// ── Estilos de tabs reutilizables (igual que settings-client.tsx) ──────────────

const TAB_TRIGGER_CLASS =
  "bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 py-2 text-muted-foreground hover:text-foreground transition-colors uppercase font-bold";

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  initialStudents: ClassroomStudent[];
  fetchError?: string;
  modules: TeacherModule[];
}

// ── Componente principal ───────────────────────────────────────────────────────

export function AlumnosClientPanel({ initialStudents, fetchError, modules }: Props) {
  const { setSegments } = useBreadcrumb();
  useEffect(() => {
    setSegments([{ label: "Alumnos" }]);
    return () => setSegments([]);
  }, [setSegments]);

  const [createState, createAction] = useActionState(createBulkStudents, null);
  const [students, setStudents] = useState<ClassroomStudent[]>(initialStudents);
  const [isPending, startTransition] = useTransition();

  // Cuando llegan resultados de creación, añadir los nuevos alumnos al estado local
  useEffect(() => {
    if (!createState?.results) return;
    const newStudents: ClassroomStudent[] = createState.results
      .filter((r) => !r.error && r.userId && r.email)
      .map((r) => ({
        id: r.userId!,
        identifier: r.identifier,
        email: r.email!,
        is_banned: false,
        enrolledModules: [],
      }));
    if (newStudents.length === 0) return;
    setStudents((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      const toAdd = newStudents.filter((s) => !existingIds.has(s.id));
      if (toAdd.length === 0) return prev;
      return [...prev, ...toAdd].sort((a, b) => a.identifier.localeCompare(b.identifier));
    });
  }, [createState]);

  // ── DataTable: sorting + selection + global filter ───────────────────────────
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  // ── Combobox de prefijo para crear cuentas ───────────────────────────────────
  const [createPrefixOpen, setCreatePrefixOpen] = useState(false);
  const [createPrefix, setCreatePrefix] = useState("");

  // ── Combobox de prefijos ─────────────────────────────────────────────────────
  const [prefixOpen, setPrefixOpen] = useState(false);
  const [prefixFilter, setPrefixFilter] = useState("__all__");

  const prefixes = useMemo(
    () => [...new Set(students.map((s) => extractPrefix(s.identifier)))].sort(),
    [students]
  );

  const prefixCounts = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => {
      const p = extractPrefix(s.identifier);
      map.set(p, (map.get(p) ?? 0) + 1);
    });
    return map;
  }, [students]);

  const filteredStudents = useMemo(
    () =>
      prefixFilter === "__all__"
        ? students
        : students.filter((s) => extractPrefix(s.identifier) === prefixFilter),
    [students, prefixFilter]
  );

  // ── Dialogs state ────────────────────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState<ClassroomStudent | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ClassroomStudent | null>(null);
  const [enrollmentsTarget, setEnrollmentsTarget] = useState<ClassroomStudent | null>(null);
  const [bulkUnenrollOpen, setBulkUnenrollOpen] = useState(false);
  const [bulkUnenrollModules, setBulkUnenrollModules] = useState<string[]>([]);
  const [bulkResetOpen, setBulkResetOpen] = useState(false);
  const [bulkResetPassword, setBulkResetPassword] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // ── Matriculación tab state ──────────────────────────────────────────────────
  const [enrollPrefix, setEnrollPrefix] = useState("");
  const [enrollModules, setEnrollModules] = useState<string[]>([]);
  const [enrollResult, setEnrollResult] = useState<{ enrolled: number; skipped: number } | null>(null);
  const [unenrollPrefix, setUnenrollPrefix] = useState("");
  const [unenrollModules, setUnenrollModules] = useState<string[]>([]);
  const [unenrollResult, setUnenrollResult] = useState<{ unenrolled: number } | null>(null);

  // ── Columnas DataTable ───────────────────────────────────────────────────────
  const columns: ColumnDef<ClassroomStudent>[] = useMemo(
    () => [
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
            className="flex items-center gap-1 hover:text-foreground transition-colors"
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
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Estado <ArrowUpDown className="size-3 opacity-40" />
          </button>
        ),
        cell: ({ row }) =>
          row.getValue("is_banned") ? (
            <Badge variant="outline" className="text-[9px] font-mono border-destructive/50 text-destructive bg-destructive/5">Desactivado</Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] font-mono border-green-500/50 text-green-400 bg-green-500/5">Activo</Badge>
          ),
      },
      {
        accessorKey: "enrolledModules",
        header: "Matrículas",
        enableSorting: false,
        cell: ({ row }) => {
          const mods: Array<{ id: string; name: string }> = row.getValue("enrolledModules");
          if (mods.length === 0) return <span className="text-muted-foreground text-[10px] font-mono">—</span>;
          return (
            <div className="flex items-center gap-1 flex-wrap">
              {mods.slice(0, 2).map((m) => (
                <Badge key={m.id} variant="outline" className="text-[9px] font-mono h-5 gap-1 pr-1 border-border/50">
                  {m.name}
                  <button
                    className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                    title={`Desmatricular de ${m.name}`}
                    onClick={() => handleUnenrollOne(row.original, m.id)}
                  >
                    <X className="size-2.5" />
                  </button>
                </Badge>
              ))}
              {mods.length > 2 && (
                <button className="text-[9px] font-mono text-primary hover:underline" onClick={() => setEnrollmentsTarget(row.original)}>
                  +{mods.length - 2} más
                </button>
              )}
              {mods.length <= 2 && (
                <button className="text-[9px] font-mono text-muted-foreground hover:text-foreground" onClick={() => setEnrollmentsTarget(row.original)} title="Gestionar matrículas">
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
              <Button variant="ghost" size="sm" title="Resetear contraseña" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => { setResetTarget(s); setResetPassword(""); }}>
                <RotateCcw className="size-3.5" />
              </Button>
              <Button variant="ghost" size="sm" title={s.is_banned ? "Reactivar" : "Desactivar"} className={`h-7 w-7 p-0 ${s.is_banned ? "text-green-500 hover:text-green-400" : "text-amber-500 hover:text-amber-400"}`} disabled={isPending} onClick={() => handleToggle(s)}>
                {s.is_banned ? <UserCheck className="size-3.5" /> : <UserX className="size-3.5" />}
              </Button>
              <Button variant="ghost" size="sm" title="Eliminar cuenta" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(s)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [isPending]
  );

  const table = useReactTable({
    data: filteredStudents,
    columns,
    state: { sorting, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedStudentIds = selectedRows.map((r) => r.original.id);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleUnenrollOne(student: ClassroomStudent, moduleId: string) {
    const moduleName = student.enrolledModules.find((m) => m.id === moduleId)?.name ?? moduleId;
    startTransition(async () => {
      const promise = (async () => {
        const result = await unenrollStudentFromModule(student.id, moduleId);
        if (result.error) throw new Error(result.error);
        setStudents((prev) => prev.map((s) => s.id === student.id ? { ...s, enrolledModules: s.enrolledModules.filter((m) => m.id !== moduleId) } : s));
        if (enrollmentsTarget?.id === student.id) {
          setEnrollmentsTarget((t) => t ? { ...t, enrolledModules: t.enrolledModules.filter((m) => m.id !== moduleId) } : null);
        }
      })();
      toast.promise(promise, {
        loading: `Desmatriculando de ${moduleName}…`,
        success: `${student.identifier} desmatriculado de ${moduleName}`,
        error: (err) => err.message,
      });
      await promise.catch(() => {});
    });
  }

  function handleToggle(student: ClassroomStudent) {
    const ban = !student.is_banned;
    startTransition(async () => {
      const promise = (async () => {
        const result = await toggleStudentStatus(student.id, ban);
        if (result.error) throw new Error(result.error);
        setStudents((prev) => prev.map((s) => s.id === student.id ? { ...s, is_banned: ban } : s));
      })();
      toast.promise(promise, {
        loading: ban ? `Desactivando ${student.identifier}…` : `Reactivando ${student.identifier}…`,
        success: ban ? `${student.identifier} desactivado` : `${student.identifier} reactivado`,
        error: (err) => err.message,
      });
      await promise.catch(() => {});
    });
  }

  function handleResetConfirm() {
    if (!resetTarget || !resetPassword) return;
    const target = resetTarget;
    const pwd = resetPassword;
    startTransition(async () => {
      const promise = (async () => {
        const result = await resetStudentPassword(target.id, pwd);
        if (result.error) throw new Error(result.error);
        setResetTarget(null);
        setResetPassword("");
      })();
      toast.promise(promise, {
        loading: `Restableciendo contraseña de ${target.identifier}…`,
        success: `Contraseña de ${target.identifier} restablecida → "${pwd}"`,
        error: (err) => err.message,
      });
      await promise.catch(() => {});
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const promise = (async () => {
        const result = await deleteStudent(target.id);
        if (result.error) throw new Error(result.error);
        setStudents((prev) => prev.filter((s) => s.id !== target.id));
        setDeleteTarget(null);
      })();
      toast.promise(promise, {
        loading: `Eliminando cuenta ${target.identifier}…`,
        success: `Cuenta ${target.identifier} eliminada`,
        error: (err) => err.message,
      });
      await promise.catch(() => {});
    });
  }

  function handleBulkReset() {
    if (!bulkResetPassword) return;
    const pwd = bulkResetPassword;
    const ids = selectedStudentIds;
    startTransition(async () => {
      const promise = (async () => {
        const result = await bulkResetPasswords(ids, pwd);
        if (result.error) throw new Error(result.error);
        setBulkResetOpen(false);
        setBulkResetPassword("");
        setRowSelection({});
        return result.reset;
      })();
      toast.promise(promise, {
        loading: `Restableciendo contraseña de ${ids.length} alumno${ids.length !== 1 ? "s" : ""}…`,
        success: (n) => `Contraseña restablecida para ${n} alumno${n !== 1 ? "s" : ""}`,
        error: (err) => err.message,
      });
      await promise.catch(() => {});
    });
  }

  function handleBulkToggle(ban: boolean) {
    const ids = selectedStudentIds;
    startTransition(async () => {
      const promise = (async () => {
        const result = await bulkToggleStatus(ids, ban);
        if (result.error) throw new Error(result.error);
        setStudents((prev) => prev.map((s) => ids.includes(s.id) ? { ...s, is_banned: ban } : s));
        setRowSelection({});
        return result.updated;
      })();
      toast.promise(promise, {
        loading: ban ? `Desactivando ${ids.length} alumno${ids.length !== 1 ? "s" : ""}…` : `Reactivando ${ids.length} alumno${ids.length !== 1 ? "s" : ""}…`,
        success: (n) => `${n} alumno${n !== 1 ? "s" : ""} ${ban ? "desactivado" : "reactivado"}${n !== 1 ? "s" : ""}`,
        error: (err) => err.message,
      });
      await promise.catch(() => {});
    });
  }

  function handleBulkDelete() {
    const ids = selectedStudentIds;
    startTransition(async () => {
      const promise = (async () => {
        const result = await bulkDeleteStudents(ids);
        if (result.error) throw new Error(result.error);
        setStudents((prev) => prev.filter((s) => !ids.includes(s.id)));
        setBulkDeleteOpen(false);
        setRowSelection({});
        return result.deleted;
      })();
      toast.promise(promise, {
        loading: `Eliminando ${ids.length} cuenta${ids.length !== 1 ? "s" : ""}…`,
        success: (n) => `${n} cuenta${n !== 1 ? "s" : ""} eliminada${n !== 1 ? "s" : ""}`,
        error: (err) => err.message,
      });
      await promise.catch(() => {});
    });
  }

  function handleBulkEnroll() {
    if (enrollModules.length === 0) { toast.error("Selecciona al menos un módulo"); return; }
    startTransition(async () => {
      const promise = (async () => {
        const result = await bulkEnrollByPrefix(enrollPrefix, enrollModules);
        if (result.error) throw new Error(result.error);
        setEnrollResult({ enrolled: result.enrolled, skipped: result.skipped });
        return result;
      })();
      toast.promise(promise, {
        loading: "Matriculando alumnos…",
        success: (r) => `${r.enrolled} matrículas creadas${r.skipped > 0 ? ` · ${r.skipped} ya existían` : ""}`,
        error: (err) => err.message,
      });
      await promise.catch(() => {});
    });
  }

  function handleBulkUnenrollByPrefix() {
    if (unenrollModules.length === 0) { toast.error("Selecciona al menos un módulo"); return; }
    startTransition(async () => {
      const promise = (async () => {
        const result = await bulkUnenrollByPrefix(unenrollPrefix, unenrollModules);
        if (result.error) throw new Error(result.error);
        setUnenrollResult({ unenrolled: result.unenrolled });
        return result.unenrolled;
      })();
      toast.promise(promise, {
        loading: "Desmatriculando alumnos…",
        success: (n) => `${n} matrículas eliminadas`,
        error: (err) => err.message,
      });
      await promise.catch(() => {});
    });
  }

  function handleBulkUnenrollSelected() {
    if (bulkUnenrollModules.length === 0) { toast.error("Selecciona al menos un módulo"); return; }
    const ids = selectedStudentIds;
    const mods = bulkUnenrollModules;
    startTransition(async () => {
      const promise = (async () => {
        const result = await bulkUnenrollByStudentIds(ids, mods);
        if (result.error) throw new Error(result.error);
        setStudents((prev) =>
          prev.map((s) => ids.includes(s.id)
            ? { ...s, enrolledModules: s.enrolledModules.filter((m) => !mods.includes(m.id)) }
            : s
          )
        );
        setBulkUnenrollOpen(false);
        setBulkUnenrollModules([]);
        setRowSelection({});
        return result.unenrolled;
      })();
      toast.promise(promise, {
        loading: `Desmatriculando ${ids.length} alumno${ids.length !== 1 ? "s" : ""}…`,
        success: (n) => `${n} matrículas eliminadas`,
        error: (err) => err.message,
      });
      await promise.catch(() => {});
    });
  }

  function handlePrint() {
    if (!createState?.results) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Lista de Alumnos — Aula IT</title>
      <style>body{font-family:monospace;padding:2rem}table{border-collapse:collapse;width:100%;margin-top:1rem}th,td{border:1px solid #ccc;padding:8px 16px;text-align:left}th{background:#f0f0f0}</style>
      </head><body><h2>Lista de acceso — Aula IT</h2>
      <p>El alumno debe cambiar su contraseña en el primer acceso.</p>
      <table><tr><th>Identificador</th><th>Contraseña inicial</th></tr>
      ${createState.results.filter((r) => !r.error).map((r) => `<tr><td>${r.identifier}</td><td>${r.password}</td></tr>`).join("")}
      </table></body></html>`);
    win.print();
  }

  function handleDownloadCSV() {
    if (!createState?.results) return;
    const lines = ["Identificador,Contraseña inicial"];
    createState.results.filter((r) => !r.error).forEach((r) => lines.push(`${r.identifier},${r.password}`));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "alumnos-aula-it.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function ModuleCheckboxList({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
    if (modules.length === 0) return <p className="text-xs text-muted-foreground font-mono">No tienes módulos creados.</p>;
    return (
      <div className="border border-border/50 rounded-md divide-y divide-border/30 max-h-44 overflow-y-auto">
        {modules.map((m) => (
          <label key={m.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/10 transition-colors">
            <Checkbox checked={selected.includes(m.id)} onCheckedChange={() => onToggle(m.id)} />
            <span className="text-sm flex-1 truncate">{m.name}</span>
            <Badge variant="outline" className="text-[9px] font-mono uppercase h-5 shrink-0">{m.status}</Badge>
          </label>
        ))}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Tabs defaultValue="alumnos" className="space-y-6">
        {/* ── Tab list estilo settings ── */}
        <div className="flex items-center justify-start border-b border-border/40 font-mono text-sm tracking-tighter">
          <TabsList className="bg-transparent h-auto p-0 gap-8">
            <TabsTrigger value="crear" className={TAB_TRIGGER_CLASS}>
              Crear cuentas
            </TabsTrigger>
            <TabsTrigger value="matriculacion" className={TAB_TRIGGER_CLASS}>
              Matriculación
            </TabsTrigger>
            <TabsTrigger value="alumnos" className={TAB_TRIGGER_CLASS}>
              Alumnos{students.length > 0 && <span className="ml-1.5 font-normal opacity-60">({students.length})</span>}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Tab: Crear cuentas ── */}
        <TabsContent value="crear" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
                  <Users className="size-4 text-primary" /> Crear cuentas en bloque
                </CardTitle>
                <CardDescription className="text-xs font-mono">
                  Genera identificadores anónimos (ALU-001…). Los alumnos cambian la contraseña en el primer acceso.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createAction} className="flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="grid gap-1.5">
                      <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Prefijo</Label>
                      <input type="hidden" name="prefix" value={createPrefix} />
                      <Popover open={createPrefixOpen} onOpenChange={setCreatePrefixOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={createPrefixOpen}
                            className="h-10 justify-between bg-background/50 border-border/50 font-mono text-sm font-normal"
                          >
                            <span className={createPrefix ? "text-foreground" : "text-muted-foreground"}>
                              {createPrefix || "ALU, 1DAW…"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-52 p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Escribe un prefijo..."
                              value={createPrefix}
                              onValueChange={(v) => setCreatePrefix(v.toUpperCase())}
                              className="h-9 text-xs font-mono"
                            />
                            <CommandList>
                              <CommandEmpty className="py-4 text-center text-xs text-muted-foreground font-mono">
                                {createPrefix
                                  ? <><span className="text-foreground font-bold">{createPrefix}</span> — nuevo prefijo</>
                                  : "Escribe para crear"}
                              </CommandEmpty>
                              {prefixes.length > 0 && (
                                <CommandGroup heading="Prefijos existentes">
                                  {prefixes.map((p) => (
                                    <CommandItem
                                      key={p}
                                      value={p}
                                      onSelect={() => { setCreatePrefix(p); setCreatePrefixOpen(false); }}
                                      className="text-xs font-mono justify-between"
                                    >
                                      <span className="flex items-center gap-2">
                                        <Check className={cn("h-3.5 w-3.5", createPrefix === p ? "opacity-100" : "opacity-0")} />
                                        {p}
                                      </span>
                                      <span className="text-muted-foreground">{prefixCounts.get(p)} alumnos</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="count" className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Nº alumnos</Label>
                      <Input id="count" name="count" type="number" required min={1} max={60} defaultValue={30} className="h-10 bg-background/50 border-border/50 font-mono text-sm" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="password" className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Contraseña inicial</Label>
                      <Input id="password" name="password" type="text" required minLength={6} placeholder="Mín. 6 caracteres" className="h-10 bg-background/50 border-border/50 font-mono text-sm" />
                    </div>
                  </div>
                  {createState?.error && (
                    <p className="text-[10px] font-mono text-destructive bg-destructive/10 border border-destructive/20 rounded p-2 uppercase">{createState.error}</p>
                  )}
                  <CreateButton />
                </form>

                {createState?.results && (
                  <div className="mt-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                        {createState.results.filter((r) => !r.error).length} creadas
                        {createState.results.filter((r) => r.error).length > 0 && <span className="text-destructive ml-2">· {createState.results.filter((r) => r.error).length} errores</span>}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrint} className="h-7 text-[10px] gap-1.5"><Printer className="size-3" /> Imprimir</Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="h-7 text-[10px] gap-1.5"><Download className="size-3" /> CSV</Button>
                      </div>
                    </div>
                    <div className="border border-border/50 rounded-md overflow-auto max-h-52">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Identificador</TableHead>
                            <TableHead>Contraseña</TableHead>
                            <TableHead className="w-8" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {createState.results.map((r) => (
                            <TableRow key={r.identifier}>
                              <TableCell className="font-bold">{r.identifier}</TableCell>
                              <TableCell className="text-muted-foreground">{r.error ? "—" : r.password}</TableCell>
                              <TableCell className="text-center">
                                {r.error ? <XCircle className="size-3 text-destructive inline" title={r.error} /> : <CheckCircle2 className="size-3 text-green-500 inline" />}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab: Matriculación ── */}
        <TabsContent value="matriculacion" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
                  <BookOpen className="size-4 text-green-500" /> Matriculación en bloque
                </CardTitle>
                <CardDescription className="text-xs font-mono">Matricula todos los alumnos de un prefijo en los módulos seleccionados.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Prefijo <span className="normal-case font-normal">(vacío = todos)</span></Label>
                  <Input type="text" value={enrollPrefix} onChange={(e) => setEnrollPrefix(e.target.value)} placeholder="ALU, 1DAW… o vacío para todos" className="h-10 bg-background/50 border-border/50 font-mono text-sm" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Módulos</Label>
                  <ModuleCheckboxList selected={enrollModules} onToggle={(id) => setEnrollModules((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])} />
                </div>
                {enrollResult && <p className="text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/20 rounded p-2">✓ {enrollResult.enrolled} matrículas creadas{enrollResult.skipped > 0 && ` · ${enrollResult.skipped} ya existían`}</p>}
                <Button onClick={handleBulkEnroll} disabled={isPending || enrollModules.length === 0} className="h-11 font-bold">
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />} Matricular alumnos
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
                  <BookOpen className="size-4 text-destructive" /> Desmatriculación en bloque
                </CardTitle>
                <CardDescription className="text-xs font-mono">Desmatricula todos los alumnos de un prefijo de los módulos seleccionados.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Prefijo <span className="normal-case font-normal">(vacío = todos)</span></Label>
                  <Input type="text" value={unenrollPrefix} onChange={(e) => setUnenrollPrefix(e.target.value)} placeholder="ALU, 1DAW… o vacío para todos" className="h-10 bg-background/50 border-border/50 font-mono text-sm" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Módulos</Label>
                  <ModuleCheckboxList selected={unenrollModules} onToggle={(id) => setUnenrollModules((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])} />
                </div>
                {unenrollResult && <p className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2">✓ {unenrollResult.unenrolled} matrículas eliminadas</p>}
                <Button variant="destructive" onClick={handleBulkUnenrollByPrefix} disabled={isPending || unenrollModules.length === 0} className="h-11 font-bold">
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />} Desmatricular alumnos
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab: Alumnos ── */}
        <TabsContent value="alumnos" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-border/50 bg-card flex flex-col overflow-hidden" style={{ height: "calc(100vh - 300px)" }}>
            <CardHeader className="pb-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-mono tracking-wider uppercase text-white flex items-center gap-2">
                    <KeyRound className="size-4 text-primary" /> Alumnos en el sistema
                  </CardTitle>
                  <CardDescription className="text-xs font-mono mt-1">
                    {students.length > 0
                      ? `${students.length} cuentas · ${students.filter((s) => s.is_banned).length} desactivadas`
                      : "Aún no hay cuentas anónimas creadas"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* Combobox de prefijos */}
                  <Popover open={prefixOpen} onOpenChange={setPrefixOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={prefixOpen}
                        className="h-9 w-48 justify-between text-xs font-mono bg-background/50 border-border/50"
                      >
                        {prefixFilter === "__all__" ? "Todos los prefijos" : prefixFilter}
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-0">
                      <Command>
                        <CommandInput placeholder="Buscar prefijo..." className="h-9 text-xs" />
                        <CommandList>
                          <CommandEmpty className="text-xs py-4">Sin resultados</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="__all__"
                              onSelect={() => { setPrefixFilter("__all__"); setPrefixOpen(false); setRowSelection({}); }}
                              className="text-xs font-mono"
                            >
                              <Check className={cn("mr-2 h-3.5 w-3.5", prefixFilter === "__all__" ? "opacity-100" : "opacity-0")} />
                              Todos
                            </CommandItem>
                            {prefixes.map((p) => (
                              <CommandItem
                                key={p}
                                value={p}
                                onSelect={() => { setPrefixFilter(p); setPrefixOpen(false); setRowSelection({}); }}
                                className="text-xs font-mono"
                              >
                                <Check className={cn("mr-2 h-3.5 w-3.5", prefixFilter === p ? "opacity-100" : "opacity-0")} />
                                {p}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Búsqueda global */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      value={globalFilter}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      placeholder="Buscar..."
                      className="h-9 pl-8 w-40 bg-background/50 border-border/50 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            {/* Barra de acción bulk — animada en altura, no afecta layout exterior */}
            <div className={cn(
              "shrink-0 overflow-hidden transition-[max-height] duration-200 ease-in-out",
              selectedRows.length > 0 ? "max-h-14" : "max-h-0"
            )}>
              <div className="mx-6 mb-3 flex items-center justify-between gap-3 bg-primary/10 border border-primary/20 rounded-md px-4 py-2.5">
                <span className="text-xs font-mono text-primary font-bold shrink-0">
                  {selectedRows.length} alumno{selectedRows.length !== 1 ? "s" : ""} seleccionado{selectedRows.length !== 1 ? "s" : ""}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1.5" onClick={() => { setBulkResetPassword(""); setBulkResetOpen(true); }} disabled={isPending}>
                    <RotateCcw className="size-3" /> Resetear contraseña
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1.5 border-amber-500/40 text-amber-500 hover:bg-amber-500/10" onClick={() => handleBulkToggle(true)} disabled={isPending}>
                    <UserX className="size-3" /> Desactivar
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1.5 border-green-500/40 text-green-500 hover:bg-green-500/10" onClick={() => handleBulkToggle(false)} disabled={isPending}>
                    <UserCheck className="size-3" /> Reactivar
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1.5 border-border/50 text-muted-foreground hover:text-foreground" onClick={() => { setBulkUnenrollModules([]); setBulkUnenrollOpen(true); }} disabled={isPending}>
                    <X className="size-3" /> Desmatricular
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setBulkDeleteOpen(true)} disabled={isPending}>
                    <Trash2 className="size-3" /> Eliminar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setRowSelection({})}>Cancelar</Button>
                </div>
              </div>
            </div>

            {fetchError && <p className="text-xs text-destructive font-mono px-6 pb-4 shrink-0">{fetchError}</p>}

            {students.length === 0 && !fetchError ? (
              <CardContent><p className="text-xs text-muted-foreground font-mono">Usa la pestaña "Crear cuentas" para generar alumnos.</p></CardContent>
            ) : (
              <div className="flex-1 overflow-auto min-h-0">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id} className="border-b border-border/50 hover:bg-transparent">
                        {hg.headers.map((header) => (
                          <TableHead key={header.id} className={cn(header.id === "select" ? "w-10 pl-6" : "", header.id === "actions" ? "w-28 pr-6" : "")}>
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8 font-mono">Sin resultados</TableCell>
                      </TableRow>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className={cn(cell.column.id === "select" ? "pl-6" : "", cell.column.id === "actions" ? "pr-6" : "")}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Gestionar matrículas ── */}
      <Dialog open={!!enrollmentsTarget} onOpenChange={(open) => !open && setEnrollmentsTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wider">Matrículas</DialogTitle>
            <DialogDescription className="font-mono text-xs">Alumno: <span className="text-foreground font-bold">{enrollmentsTarget?.identifier}</span></DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2 max-h-64 overflow-y-auto">
            {enrollmentsTarget?.enrolledModules.length === 0
              ? <p className="text-xs text-muted-foreground font-mono">Sin matrículas activas.</p>
              : enrollmentsTarget?.enrolledModules.map((m) => (
                <div key={m.id} className="flex items-center justify-between border border-border/40 rounded-md px-3 py-2">
                  <span className="text-sm">{m.name}</span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => enrollmentsTarget && handleUnenrollOne(enrollmentsTarget, m.id)}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))
            }
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEnrollmentsTarget(null)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Desmatricular seleccionados ── */}
      <Dialog open={bulkUnenrollOpen} onOpenChange={(open) => { setBulkUnenrollOpen(open); if (!open) setBulkUnenrollModules([]); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wider">Desmatricular seleccionados</DialogTitle>
            <DialogDescription className="font-mono text-xs">{selectedRows.length} alumno{selectedRows.length !== 1 ? "s" : ""} seleccionado{selectedRows.length !== 1 ? "s" : ""}. Elige los módulos de los que desmatricular.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <ModuleCheckboxList selected={bulkUnenrollModules} onToggle={(id) => setBulkUnenrollModules((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkUnenrollOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleBulkUnenrollSelected} disabled={isPending || bulkUnenrollModules.length === 0}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Desmatricular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Reset contraseña ── */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wider">Resetear contraseña</DialogTitle>
            <DialogDescription className="font-mono text-xs">Alumno: <span className="text-foreground font-bold">{resetTarget?.identifier}</span><br />El alumno deberá cambiarla en su próximo acceso.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Nueva contraseña temporal</Label>
            <Input type="text" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="h-10 font-mono bg-background/50 border-border/50" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
            <Button onClick={handleResetConfirm} disabled={isPending || resetPassword.length < 6}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Resetear contraseña en bloque ── */}
      <Dialog open={bulkResetOpen} onOpenChange={(open) => { setBulkResetOpen(open); if (!open) setBulkResetPassword(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wider">Resetear contraseña</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Se aplicará a <span className="text-foreground font-bold">{selectedStudentIds.length} alumno{selectedStudentIds.length !== 1 ? "s" : ""}</span>. Deberán cambiarla en su próximo acceso.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Nueva contraseña temporal</Label>
            <Input type="text" value={bulkResetPassword} onChange={(e) => setBulkResetPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="h-10 font-mono bg-background/50 border-border/50" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkResetOpen(false)}>Cancelar</Button>
            <Button onClick={handleBulkReset} disabled={isPending || bulkResetPassword.length < 6}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: Eliminar seleccionados ── */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono uppercase">¿Eliminar {selectedStudentIds.length} cuenta{selectedStudentIds.length !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs">
              Se eliminarán permanentemente junto con sus matrículas y progreso. Acción irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: Eliminar alumno ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono uppercase">¿Eliminar cuenta?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs">
              Se eliminará permanentemente <span className="text-foreground font-bold">{deleteTarget?.identifier}</span> junto con sus matrículas y progreso. Acción irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
