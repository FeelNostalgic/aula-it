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
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  createBulkStudents,
  resetStudentPassword,
  bulkResetPasswords,
  bulkToggleStatus,
  bulkDeleteStudents,
  toggleStudentStatus,
  deleteStudent,
  unenrollStudentFromModule,
} from "./actions";
import {
  adminBulkEnrollByStudentIds,
  adminBulkUnenrollByStudentIds,
  getAllModulesWithTeachers,
} from "../enrollment/actions";
import type { ClassroomStudent, BulkCreateResult, AdminModule } from "@/components/students/types";
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
  UserX,
  UserCheck,
  Trash2,
  Search,
  BookOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PrefixCombobox } from "@/components/students/prefix-combobox";
import { ModuleCheckboxList } from "@/components/students/module-checkbox-list";
import { BulkActionBar } from "@/components/students/bulk-action-bar";
import { buildStudentColumns } from "@/components/students/student-table-columns";

const TAB_TRIGGER_CLASS =
  "bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 py-2 text-muted-foreground hover:text-foreground transition-colors uppercase font-bold";

function extractPrefix(identifier: string): string {
  const match = identifier.match(/^(.+)-\d+$/);
  return match ? match[1] : identifier;
}

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} className="w-full h-11 font-bold" type="submit">
      {pending ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />GENERANDO...</>
      ) : (
        <><Users className="mr-2 h-4 w-4" />GENERAR CUENTAS</>
      )}
    </Button>
  );
}

interface Props {
  initialStudents: ClassroomStudent[];
  fetchError?: string;
  initialModules: AdminModule[];
}

export function AdminStudentsPanel({ initialStudents, fetchError, initialModules }: Props) {
  const { setSegments } = useBreadcrumb();
  useEffect(() => {
    setSegments([{ label: "Alumnos" }]);
    return () => setSegments([]);
  }, [setSegments]);

  const [createState, createAction] = useActionState(createBulkStudents, null);
  const [students, setStudents] = useState<ClassroomStudent[]>(initialStudents);
  const [modules, setModules] = useState<AdminModule[]>(initialModules);
  const [isPending, startTransition] = useTransition();

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

  // ── Table state ──────────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [createPrefix, setCreatePrefix] = useState("");
  const [prefixFilter, setPrefixFilter] = useState("__all__");
  const [teacherFilter, setTeacherFilter] = useState("__all__");

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

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    modules.forEach((m) => map.set(m.teacher_id, m.teacher_name));
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [modules]);

  const filteredModules = useMemo(
    () => teacherFilter === "__all__" ? modules : modules.filter((m) => m.teacher_id === teacherFilter),
    [modules, teacherFilter]
  );

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
  const [unenrollConfirm, setUnenrollConfirm] = useState<{ student: ClassroomStudent; moduleId: string; moduleName: string } | null>(null);
  const [bulkUnenrollOpen, setBulkUnenrollOpen] = useState(false);
  const [bulkUnenrollModules, setBulkUnenrollModules] = useState<string[]>([]);
  const [bulkEnrollOpen, setBulkEnrollOpen] = useState(false);
  const [bulkEnrollModules, setBulkEnrollModules] = useState<string[]>([]);
  const [bulkResetOpen, setBulkResetOpen] = useState(false);
  const [bulkResetPassword, setBulkResetPassword] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleUnenrollOne(student: ClassroomStudent, moduleId: string) {
    const moduleName = student.enrolledModules.find((m) => m.id === moduleId)?.name ?? moduleId;
    setUnenrollConfirm({ student, moduleId, moduleName });
  }

  function handleUnenrollOneConfirmed() {
    if (!unenrollConfirm) return;
    const { student, moduleId, moduleName } = unenrollConfirm;
    setUnenrollConfirm(null);
    startTransition(async () => {
      const promise = (async () => {
        const result = await unenrollStudentFromModule(student.id, moduleId);
        if (result.error) throw new Error(result.error);
        setStudents((prev) =>
          prev.map((s) =>
            s.id === student.id
              ? { ...s, enrolledModules: s.enrolledModules.filter((m) => m.id !== moduleId) }
              : s
          )
        );
        if (enrollmentsTarget?.id === student.id) {
          setEnrollmentsTarget((t) =>
            t ? { ...t, enrolledModules: t.enrolledModules.filter((m) => m.id !== moduleId) } : null
          );
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
        loading: ban ? `Desactivando ${ids.length} alumno${ids.length !== 1 ? "s" : ""}…` : `Reactivando…`,
        success: (n) => `${n} alumno${n !== 1 ? "s" : ""} ${ban ? "desactivado" : "reactivado"}${n !== 1 ? "s" : ""}`,
        error: (err) => err.message,
      });
      await promise.catch(() => {});
    });
  }

  function handleBulkEnrollSelected() {
    if (bulkEnrollModules.length === 0) { toast.error("Selecciona al menos un módulo"); return; }
    const ids = selectedStudentIds;
    const mods = bulkEnrollModules;
    startTransition(async () => {
      const promise = (async () => {
        const result = await adminBulkEnrollByStudentIds(ids, mods);
        if (result.error) throw new Error(result.error);
        // Update local state: find module names and add to each student
        const modNames = modules.filter((m) => mods.includes(m.id)).map((m) => ({ id: m.id, name: m.name }));
        setStudents((prev) =>
          prev.map((s) => {
            if (!ids.includes(s.id)) return s;
            const existing = new Set(s.enrolledModules.map((m) => m.id));
            const toAdd = modNames.filter((m) => !existing.has(m.id));
            return { ...s, enrolledModules: [...s.enrolledModules, ...toAdd] };
          })
        );
        setBulkEnrollOpen(false);
        setBulkEnrollModules([]);
        setRowSelection({});
        return result.enrolled;
      })();
      toast.promise(promise, {
        loading: `Matriculando ${ids.length} alumno${ids.length !== 1 ? "s" : ""}…`,
        success: (n) => `${n} matrículas creadas`,
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
        const result = await adminBulkUnenrollByStudentIds(ids, mods);
        if (result.error) throw new Error(result.error);
        setStudents((prev) =>
          prev.map((s) =>
            ids.includes(s.id)
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

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns = useMemo(
    () =>
      buildStudentColumns({
        canDelete: true,
        isPending,
        onResetPassword: (s) => { setResetTarget(s); setResetPassword(""); },
        onToggleStatus: handleToggle,
        onDelete: setDeleteTarget,
        onUnenrollOne: handleUnenrollOne,
        onManageEnrollments: setEnrollmentsTarget,
      }),
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

  const bulkActions = [
    { label: "Resetear contraseña", icon: RotateCcw, onClick: () => { setBulkResetPassword(""); setBulkResetOpen(true); }, disabled: isPending },
    { label: "Desactivar", icon: UserX, className: "border-amber-500/40 text-amber-500 hover:bg-amber-500/10", onClick: () => handleBulkToggle(true), disabled: isPending },
    { label: "Reactivar", icon: UserCheck, className: "border-green-500/40 text-green-500 hover:bg-green-500/10", onClick: () => handleBulkToggle(false), disabled: isPending },
    { label: "Matricular", icon: BookOpen, className: "border-primary/40 text-primary hover:bg-primary/10", onClick: () => { setBulkEnrollModules([]); setBulkEnrollOpen(true); }, disabled: isPending },
    { label: "Desmatricular", icon: X, className: "border-border/50 text-muted-foreground hover:text-foreground", onClick: () => { setBulkUnenrollModules([]); setBulkUnenrollOpen(true); }, disabled: isPending },
    { label: "Eliminar", icon: Trash2, className: "border-destructive/40 text-destructive hover:bg-destructive/10", onClick: () => setBulkDeleteOpen(true), disabled: isPending },
  ];

  return (
    <>
      <Tabs defaultValue="alumnos" className="space-y-6">
        <div className="flex items-center justify-start border-b border-border/40 font-mono text-sm tracking-tighter">
          <TabsList className="bg-transparent h-auto p-0 gap-8">
            <TabsTrigger value="crear" className={TAB_TRIGGER_CLASS}>Crear cuentas</TabsTrigger>
            <TabsTrigger value="alumnos" className={TAB_TRIGGER_CLASS}>
              Alumnos{students.length > 0 && <span className="ml-1.5 font-normal opacity-60">({students.length})</span>}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Tab: Crear cuentas ── */}
        <TabsContent value="crear" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <Card className="border-border/50 max-h-250 bg-card">
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
                      <PrefixCombobox
                        prefixes={prefixes}
                        value={createPrefix}
                        onChange={setCreatePrefix}
                        allowCreate
                        counts={prefixCounts}
                        placeholder="ALU, 1DAW…"
                      />
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
                      <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                        {createState.results.filter((r) => !r.error).length} creadas
                        {createState.results.filter((r) => r.error).length > 0 && (
                          <span className="text-destructive ml-2">· {createState.results.filter((r) => r.error).length} errores</span>
                        )}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrint} className="h-7 text-[10px] gap-1.5"><Printer className="size-3" /> Imprimir</Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="h-7 text-[10px] gap-1.5"><Download className="size-3" /> CSV</Button>
                      </div>
                    </div>
                    <div className="border border-border/50 rounded-md overflow-auto max-h-150">
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
                                {r.error ? (
                                  <span title={r.error}><XCircle className="size-3 text-destructive inline" /></span>
                                ) : (
                                  <CheckCircle2 className="size-3 text-green-500 inline" />
                                )}
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
                  <div className="w-60">
                    <PrefixCombobox
                      prefixes={prefixes}
                      value={prefixFilter}
                      onChange={(v) => { setPrefixFilter(v); setRowSelection({}); }}
                      allLabel="Todos los prefijos"
                      allValue="__all__"
                    />
                  </div>
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

            <BulkActionBar
              selectedCount={selectedRows.length}
              actions={bulkActions}
              onCancel={() => setRowSelection({})}
            />

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
                          <TableHead key={header.id} className={cn("text-[11px] font-mono uppercase tracking-wider", header.id === "select" ? "w-10 pl-6" : "", header.id === "actions" ? "w-28 pr-6" : "")}>
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
                        <TableRow key={row.id} className="odd:bg-muted/60 even:bg-transparent hover:bg-blue-500/10" data-state={row.getIsSelected() ? "selected" : undefined}>
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

      {/* ── Dialog: Matricular seleccionados ── */}
      <Dialog open={bulkEnrollOpen} onOpenChange={(open) => { setBulkEnrollOpen(open); if (!open) setBulkEnrollModules([]); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wider">Matricular seleccionados</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {selectedRows.length} alumno{selectedRows.length !== 1 ? "s" : ""} seleccionado{selectedRows.length !== 1 ? "s" : ""}.
              Elige los módulos en los que matricular.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="grid gap-1.5">
              <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Filtrar por profesor</Label>
              <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                <SelectTrigger className="h-9 text-xs font-mono bg-background/50 border-border/50">
                  <SelectValue placeholder="Todos los profesores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs font-mono">Todos los profesores</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs font-mono">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ModuleCheckboxList
              modules={filteredModules}
              selected={bulkEnrollModules}
              onToggle={(id) => setBulkEnrollModules((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEnrollOpen(false)}>Cancelar</Button>
            <Button onClick={handleBulkEnrollSelected} disabled={isPending || bulkEnrollModules.length === 0}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Matricular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Desmatricular seleccionados ── */}
      <Dialog open={bulkUnenrollOpen} onOpenChange={(open) => { setBulkUnenrollOpen(open); if (!open) setBulkUnenrollModules([]); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wider">Desmatricular seleccionados</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {selectedRows.length} alumno{selectedRows.length !== 1 ? "s" : ""} seleccionado{selectedRows.length !== 1 ? "s" : ""}. Elige los módulos de los que desmatricular.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="grid gap-1.5">
              <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Filtrar por profesor</Label>
              <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                <SelectTrigger className="h-9 text-xs font-mono bg-background/50 border-border/50">
                  <SelectValue placeholder="Todos los profesores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs font-mono">Todos los profesores</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs font-mono">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ModuleCheckboxList
              modules={filteredModules}
              selected={bulkUnenrollModules}
              onToggle={(id) => setBulkUnenrollModules((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
            />
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
            <DialogDescription className="font-mono text-xs">Alumno: <span className="text-foreground font-bold">{resetTarget?.identifier}</span></DialogDescription>
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

      {/* ── Dialog: Reset en bloque ── */}
      <Dialog open={bulkResetOpen} onOpenChange={(open) => { setBulkResetOpen(open); if (!open) setBulkResetPassword(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wider">Resetear contraseña</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Se aplicará a <span className="text-foreground font-bold">{selectedStudentIds.length} alumno{selectedStudentIds.length !== 1 ? "s" : ""}</span>.
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

      {/* ── AlertDialog: Desmatricular alumno de módulo ── */}
      <AlertDialog open={!!unenrollConfirm} onOpenChange={(open) => !open && setUnenrollConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono uppercase">¿Desmatricular alumno?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs">
              Se desmatriculará a <span className="text-foreground font-bold">{unenrollConfirm?.student.identifier}</span> del módulo <span className="text-foreground font-bold">{unenrollConfirm?.moduleName}</span>. Se conservará su progreso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnenrollOneConfirmed} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desmatricular
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
