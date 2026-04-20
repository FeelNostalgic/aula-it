"use client";

import { useState, useTransition, useMemo } from "react";
import { BookOpen, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  adminBulkEnrollByPrefix,
  adminBulkUnenrollByPrefix,
  type AdminTeacher,
} from "./actions";
import type { ClassroomStudent, AdminModule } from "@/components/students/types";

function extractPrefix(identifier: string): string {
  const match = identifier.match(/^(.+)-\d+$/);
  return match ? match[1] : identifier;
}

interface Props {
  modules: AdminModule[];
  teachers: AdminTeacher[];
  students: ClassroomStudent[];
}

export function AdminEnrollmentPanel({ modules, teachers, students }: Props) {
  const [isPending, startTransition] = useTransition();

  const prefixes = useMemo(
    () => [...new Set(students.map((s) => extractPrefix(s.identifier)))].sort(),
    [students]
  );

  // ── Matriculación state ───────────────────────────────────────────────────────
  const [enrollPrefix, setEnrollPrefix] = useState("__all__");
  const [enrollTeacherFilter, setEnrollTeacherFilter] = useState("__all__");
  const [enrollModules, setEnrollModules] = useState<string[]>([]);
  const [enrollResult, setEnrollResult] = useState<{ enrolled: number; skipped: number } | null>(null);

  // ── Desmatriculación state ────────────────────────────────────────────────────
  const [unenrollPrefix, setUnenrollPrefix] = useState("__all__");
  const [unenrollTeacherFilter, setUnenrollTeacherFilter] = useState("__all__");
  const [unenrollModules, setUnenrollModules] = useState<string[]>([]);
  const [unenrollResult, setUnenrollResult] = useState<{ unenrolled: number } | null>(null);

  const filteredEnrollModules = useMemo(
    () => enrollTeacherFilter === "__all__" ? modules : modules.filter((m) => m.teacher_id === enrollTeacherFilter),
    [modules, enrollTeacherFilter]
  );
  const filteredUnenrollModules = useMemo(
    () => unenrollTeacherFilter === "__all__" ? modules : modules.filter((m) => m.teacher_id === unenrollTeacherFilter),
    [modules, unenrollTeacherFilter]
  );

  function handleEnroll() {
    if (enrollModules.length === 0) { toast.error("Selecciona al menos un módulo"); return; }
    const prefix = enrollPrefix === "__all__" ? "" : enrollPrefix;
    startTransition(async () => {
      const promise = (async () => {
        const result = await adminBulkEnrollByPrefix(prefix, enrollModules);
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

  function handleUnenroll() {
    if (unenrollModules.length === 0) { toast.error("Selecciona al menos un módulo"); return; }
    const prefix = unenrollPrefix === "__all__" ? "" : unenrollPrefix;
    startTransition(async () => {
      const promise = (async () => {
        const result = await adminBulkUnenrollByPrefix(prefix, unenrollModules);
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* ── Matriculación ── */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-mono tracking-wider uppercase text-foreground flex items-center gap-2">
            <BookOpen className="size-4 text-green-500" /> Matriculación en bloque
          </CardTitle>
          <CardDescription className="text-xs font-mono">
            Matricula todos los alumnos de un prefijo en los módulos seleccionados.
          </CardDescription>
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
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Filtrar módulos por profesor</Label>
            <Select value={enrollTeacherFilter} onValueChange={setEnrollTeacherFilter}>
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
          <div className="grid gap-1.5">
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Módulos</Label>
            <ModuleCheckboxList
              modules={filteredEnrollModules}
              selected={enrollModules}
              onToggle={(id) => setEnrollModules((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
              emptyMessage="No hay módulos para el profesor seleccionado."
            />
          </div>
          {enrollResult && (
            <p className="text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/20 rounded p-2">
              ✓ {enrollResult.enrolled} matrículas creadas{enrollResult.skipped > 0 && ` · ${enrollResult.skipped} ya existían`}
            </p>
          )}
          <Button onClick={handleEnroll} disabled={isPending || enrollModules.length === 0} className="h-11 font-bold">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
            Matricular alumnos
          </Button>
        </CardContent>
      </Card>

      {/* ── Desmatriculación ── */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-mono tracking-wider uppercase text-foreground flex items-center gap-2">
            <BookOpen className="size-4 text-destructive" /> Desmatriculación en bloque
          </CardTitle>
          <CardDescription className="text-xs font-mono">
            Desmatricula todos los alumnos de un prefijo de los módulos seleccionados.
          </CardDescription>
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
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Filtrar módulos por profesor</Label>
            <Select value={unenrollTeacherFilter} onValueChange={setUnenrollTeacherFilter}>
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
          <div className="grid gap-1.5">
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Módulos</Label>
            <ModuleCheckboxList
              modules={filteredUnenrollModules}
              selected={unenrollModules}
              onToggle={(id) => setUnenrollModules((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
              emptyMessage="No hay módulos para el profesor seleccionado."
            />
          </div>
          {unenrollResult && (
            <p className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2">
              ✓ {unenrollResult.unenrolled} matrículas eliminadas
            </p>
          )}
          <Button variant="destructive" onClick={handleUnenroll} disabled={isPending || unenrollModules.length === 0} className="h-11 font-bold">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
            Desmatricular alumnos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
