"use client";

import {
  useState,
  useTransition,
  useEffect,
  useMemo,
} from "react";
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
  resetStudentPassword,
  bulkResetPasswords,
  bulkEnrollByPrefix,
  bulkUnenrollByPrefix,
  bulkUnenrollByStudentIds,
  bulkEnrollByStudentIds,
  bulkToggleStatus,
  unenrollStudentFromModule,
  toggleStudentStatus,
} from "./actions";
import type { ClassroomStudent, TeacherModule } from "@/components/students/types";
import { useBreadcrumb } from "@/components/dashboard/layout/breadcrumb-context";
import {
  KeyRound,
  Loader2,
  RotateCcw,
  BookOpen,
  UserX,
  UserCheck,
  Search,
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

interface Props {
  initialStudents: ClassroomStudent[];
  fetchError?: string;
  modules: TeacherModule[];
}

export function AlumnosClientPanel({ initialStudents, fetchError, modules }: Props) {
  const { setSegments } = useBreadcrumb();
  useEffect(() => {
    setSegments([{ label: "Alumnos" }]);
    return () => setSegments([]);
  }, [setSegments]);

  const [students, setStudents] = useState<ClassroomStudent[]>(initialStudents);
  const [isPending, startTransition] = useTransition();

  // ── Table state ──────────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [prefixFilter, setPrefixFilter] = useState("__all__");

  const prefixes = useMemo(
    () => [...new Set(students.map((s) => extractPrefix(s.identifier)))].sort(),
    [students]
  );

  const filteredStudents = useMemo(
    () =>
      prefixFilter === "__all__"
        ? students
        : students.filter((s) => extractPrefix(s.identifier) === prefixFilter),
    [students, prefixFilter]
  );

  // ── Matriculación tab state ──────────────────────────────────────────────────
  const [enrollPrefix, setEnrollPrefix] = useState("__all__");
  const [enrollModules, setEnrollModules] = useState<string[]>([]);
  const [enrollResult, setEnrollResult] = useState<{ enrolled: number; skipped: number } | null>(null);
  const [unenrollPrefix, setUnenrollPrefix] = useState("__all__");
  const [unenrollModules, setUnenrollModules] = useState<string[]>([]);
  const [unenrollResult, setUnenrollResult] = useState<{ unenrolled: number } | null>(null);
  const [enrollOneStudentId, setEnrollOneStudentId] = useState<string>("");
  const [enrollOneModules, setEnrollOneModules] = useState<string[]>([]);
  const [enrollOneResult, setEnrollOneResult] = useState<{ enrolled: number } | null>(null);

  // ── Dialogs state ────────────────────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState<ClassroomStudent | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [enrollmentsTarget, setEnrollmentsTarget] = useState<ClassroomStudent | null>(null);
  const [unenrollConfirm, setUnenrollConfirm] = useState<{ student: ClassroomStudent; moduleId: string; moduleName: string } | null>(null);
  const [bulkUnenrollOpen, setBulkUnenrollOpen] = useState(false);
  const [bulkUnenrollModules, setBulkUnenrollModules] = useState<string[]>([]);
  const [bulkEnrollOpen, setBulkEnrollOpen] = useState(false);
  const [bulkEnrollModules, setBulkEnrollModules] = useState<string[]>([]);
  const [bulkResetOpen, setBulkResetOpen] = useState(false);
  const [bulkResetPassword, setBulkResetPassword] = useState("");

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
        const result = await bulkEnrollByStudentIds(ids, mods);
        if (result.error) throw new Error(result.error);
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
        const result = await bulkUnenrollByStudentIds(ids, mods);
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

  function handleBulkEnroll() {
    if (enrollModules.length === 0) { toast.error("Selecciona al menos un módulo"); return; }
    const prefix = enrollPrefix === "__all__" ? "" : enrollPrefix;
    startTransition(async () => {
      const promise = (async () => {
        const result = await bulkEnrollByPrefix(prefix, enrollModules);
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
    const prefix = unenrollPrefix === "__all__" ? "" : unenrollPrefix;
    startTransition(async () => {
      const promise = (async () => {
        const result = await bulkUnenrollByPrefix(prefix, unenrollModules);
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

  function handleEnrollOne() {
    if (!enrollOneStudentId) { toast.error("Selecciona un alumno"); return; }
    if (enrollOneModules.length === 0) { toast.error("Selecciona al menos un módulo"); return; }
    const ids = [enrollOneStudentId];
    const mods = enrollOneModules;
    startTransition(async () => {
      const promise = (async () => {
        const result = await bulkEnrollByStudentIds(ids, mods);
        if (result.error) throw new Error(result.error);
        const modNames = modules.filter((m) => mods.includes(m.id)).map((m) => ({ id: m.id, name: m.name }));
        setStudents((prev) =>
          prev.map((s) => {
            if (s.id !== enrollOneStudentId) return s;
            const existing = new Set(s.enrolledModules.map((m) => m.id));
            const toAdd = modNames.filter((m) => !existing.has(m.id));
            return { ...s, enrolledModules: [...s.enrolledModules, ...toAdd] };
          })
        );
        setEnrollOneResult({ enrolled: result.enrolled });
        setEnrollOneModules([]);
        return result.enrolled;
      })();
      toast.promise(promise, {
        loading: "Matriculando alumno…",
        success: (n) => `${n} matrícula${n !== 1 ? "s" : ""} creada${n !== 1 ? "s" : ""}`,
        error: (err) => err.message,
      });
      await promise.catch(() => {});
    });
  }

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns = useMemo(
    () =>
      buildStudentColumns({
        canDelete: false,
        isPending,
        onResetPassword: (s) => { setResetTarget(s); setResetPassword(""); },
        onToggleStatus: handleToggle,
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
  ];

  return (
    <>
      <Tabs defaultValue="alumnos" className="space-y-6">
        <div className="flex items-center justify-start border-b border-border/40 font-mono text-sm tracking-tighter">
          <TabsList className="bg-transparent h-auto p-0 gap-8">
            <TabsTrigger value="matriculacion" className={TAB_TRIGGER_CLASS}>Matriculación</TabsTrigger>
            <TabsTrigger value="alumnos" className={TAB_TRIGGER_CLASS}>
              Mis alumnos{students.length > 0 && <span className="ml-1.5 font-normal opacity-60">({students.length})</span>}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Tab: Matriculación ── */}
        <TabsContent value="matriculacion" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-mono tracking-wider uppercase text-foreground flex items-center gap-2">
                  <BookOpen className="size-4 text-green-500" /> Matriculación en bloque
                </CardTitle>
                <CardDescription className="text-xs font-mono">Matricula todos los alumnos de un prefijo en los módulos seleccionados.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    Prefijo <span className="normal-case font-normal">(vacío = todos)</span>
                  </Label>
                  <PrefixCombobox
                    prefixes={prefixes}
                    value={enrollPrefix}
                    onChange={setEnrollPrefix}
                    allLabel="Todos los alumnos"
                    allValue="__all__"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Módulos</Label>
                  <ModuleCheckboxList
                    modules={modules}
                    selected={enrollModules}
                    onToggle={(id) => setEnrollModules((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
                    emptyMessage="No tienes módulos creados."
                  />
                </div>
                {enrollResult && (
                  <p className="text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/20 rounded p-2">
                    ✓ {enrollResult.enrolled} matrículas creadas{enrollResult.skipped > 0 && ` · ${enrollResult.skipped} ya existían`}
                  </p>
                )}
                <Button onClick={handleBulkEnroll} disabled={isPending || enrollModules.length === 0} className="h-11 font-bold">
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
                  Matricular alumnos
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-mono tracking-wider uppercase text-foreground flex items-center gap-2">
                  <BookOpen className="size-4 text-destructive" /> Desmatriculación en bloque
                </CardTitle>
                <CardDescription className="text-xs font-mono">Desmatricula todos los alumnos de un prefijo de los módulos seleccionados.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    Prefijo <span className="normal-case font-normal">(vacío = todos)</span>
                  </Label>
                  <PrefixCombobox
                    prefixes={prefixes}
                    value={unenrollPrefix}
                    onChange={setUnenrollPrefix}
                    allLabel="Todos los alumnos"
                    allValue="__all__"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Módulos</Label>
                  <ModuleCheckboxList
                    modules={modules}
                    selected={unenrollModules}
                    onToggle={(id) => setUnenrollModules((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
                    emptyMessage="No tienes módulos creados."
                  />
                </div>
                {unenrollResult && (
                  <p className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                    ✓ {unenrollResult.unenrolled} matrículas eliminadas
                  </p>
                )}
                <Button variant="destructive" onClick={handleBulkUnenrollByPrefix} disabled={isPending || unenrollModules.length === 0} className="h-11 font-bold">
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                  Desmatricular alumnos
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ── Matricular alumno individual ── */}
          <Card className="border-border/50 bg-card mt-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-mono tracking-wider uppercase text-foreground flex items-center gap-2">
                <BookOpen className="size-4 text-primary" /> Matricular alumno individual
              </CardTitle>
              <CardDescription className="text-xs font-mono">Selecciona un alumno concreto y los módulos en los que matricularlo.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Alumno</Label>
                <PrefixCombobox
                  prefixes={students.map((s) => s.identifier)}
                  value={enrollOneStudentId ? (students.find((s) => s.id === enrollOneStudentId)?.identifier ?? "") : ""}
                  onChange={(identifier) => {
                    const found = students.find((s) => s.identifier === identifier);
                    setEnrollOneStudentId(found?.id ?? "");
                    setEnrollOneResult(null);
                  }}
                  placeholder="Selecciona un alumno…"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Módulos</Label>
                <ModuleCheckboxList
                  modules={modules}
                  selected={enrollOneModules}
                  onToggle={(id) => setEnrollOneModules((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
                  emptyMessage="No tienes módulos creados."
                />
              </div>
              {enrollOneResult && (
                <p className="text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/20 rounded p-2">
                  ✓ {enrollOneResult.enrolled} matrícula{enrollOneResult.enrolled !== 1 ? "s" : ""} creada{enrollOneResult.enrolled !== 1 ? "s" : ""}
                </p>
              )}
              <Button onClick={handleEnrollOne} disabled={isPending || !enrollOneStudentId || enrollOneModules.length === 0} className="h-11 font-bold">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
                Matricular alumno
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Alumnos ── */}
        <TabsContent value="alumnos" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-border/50 bg-card flex flex-col overflow-hidden" style={{ height: "calc(100vh - 300px)" }}>
            <CardHeader className="pb-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-mono tracking-wider uppercase text-foreground flex items-center gap-2">
                    <KeyRound className="size-4 text-primary" /> Mis alumnos matriculados
                  </CardTitle>
                  <CardDescription className="text-xs font-mono mt-1">
                    {students.length > 0
                      ? `${students.length} alumnos · ${students.filter((s) => s.is_banned).length} desactivados`
                      : "No tienes alumnos matriculados en ningún módulo"}
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
              <CardContent>
                <p className="text-xs text-muted-foreground font-mono">
                  No tienes alumnos matriculados. Usa la pestaña "Matriculación" para matricular.
                </p>
              </CardContent>
            ) : (
              <div className="flex-1 overflow-auto min-h-0">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id} className="border-b border-border/50 hover:bg-transparent">
                        {hg.headers.map((header) => (
                          <TableHead key={header.id} className={cn("text-[11px] font-mono uppercase tracking-wider", header.id === "select" ? "w-10 pl-6" : "", header.id === "actions" ? "w-20 pr-6" : "")}>
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
                        <TableRow key={row.id} className="odd:bg-muted/80 even:bg-transparent" data-state={row.getIsSelected() ? "selected" : undefined}>
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
          <div className="py-2">
            <ModuleCheckboxList
              modules={modules}
              selected={bulkEnrollModules}
              onToggle={(id) => setBulkEnrollModules((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
              emptyMessage="No tienes módulos creados."
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
          <div className="py-2">
            <ModuleCheckboxList
              modules={modules}
              selected={bulkUnenrollModules}
              onToggle={(id) => setBulkUnenrollModules((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
              emptyMessage="No tienes módulos creados."
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

      {/* ── Dialog: Reset en bloque ── */}
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
    </>
  );
}
