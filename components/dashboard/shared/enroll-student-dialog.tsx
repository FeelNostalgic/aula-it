"use client";

import { useState, useEffect, useCallback, useTransition, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, Users } from "lucide-react";
import { bulkEnrollStudents, getAvailableStudents } from "@/app/dashboard/modules/[id]/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PrefixCombobox } from "@/components/students/prefix-combobox";
import {
    CREATE_DIALOG_BODY_CLASS,
    CREATE_DIALOG_CONTENT_CLASS,
    CREATE_DIALOG_FOOTER_CLASS,
    CREATE_DIALOG_HEADER_CLASS,
    CREATE_DIALOG_INPUT_CLASS,
    CREATE_DIALOG_PRIMARY_ACTION_CLASS,
} from "@/components/dashboard/shared/create-dialog-styles";

interface EnrollStudentDialogProps {
    moduleId: string;
    children: React.ReactNode;
}

type StudentResult = {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
};

function extractPrefix(name: string): string {
    const match = name?.match(/^(.+)-\d+$/);
    return match ? match[1] : "";
}

export function EnrollStudentDialog({ moduleId, children }: EnrollStudentDialogProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedPrefix, setSelectedPrefix] = useState("__all__");
    const [results, setResults] = useState<StudentResult[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [enrolling, startEnrollTransition] = useTransition();
    const router = useRouter();

    const fetchStudents = useCallback(async (query?: string, prefix?: string) => {
        setLoading(true);
        const resolvedPrefix = prefix === "__all__" ? undefined : prefix;
        const result = await getAvailableStudents(moduleId, query, resolvedPrefix);
        if (result.success && result.students) {
            setResults(result.students);
        }
        setLoading(false);
    }, [moduleId]);

    // Load on open
    useEffect(() => {
        if (open) {
            setSearch("");
            setSelectedPrefix("__all__");
            setSelected(new Set());
            fetchStudents();
        }
    }, [open]);

    // Debounced search
    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            fetchStudents(search || undefined, selectedPrefix);
        }, 300);
        return () => clearTimeout(timer);
    }, [search, selectedPrefix, open]);

    const prefixes = useMemo(() => {
        const all = results
            .map((s) => extractPrefix(s.full_name ?? ""))
            .filter(Boolean);
        return [...new Set(all)].sort();
    }, [results]);

    function toggleSelect(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleAll() {
        if (selected.size === results.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(results.map((s) => s.id)));
        }
    }

    function handleBulkEnroll() {
        const ids = [...selected];
        if (ids.length === 0) return;

        startEnrollTransition(async () => {
            const result = await bulkEnrollStudents(moduleId, ids);
            if (result?.error) {
                toast.error(`Error al matricular: ${result.error}`);
            } else {
                toast.success(`${result?.enrolled ?? ids.length} alumno${ids.length !== 1 ? "s" : ""} matriculado${ids.length !== 1 ? "s" : ""}`);
                setSelected(new Set());
                fetchStudents(search || undefined, selectedPrefix);
                router.refresh();
            }
        });
    }

    const allSelected = results.length > 0 && selected.size === results.length;
    const someSelected = selected.size > 0 && selected.size < results.length;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className={`sm:max-w-[560px] ${CREATE_DIALOG_CONTENT_CLASS}`}>
                <DialogHeader className={CREATE_DIALOG_HEADER_CLASS}>
                    <DialogTitle>Añadir alumnos</DialogTitle>
                    <DialogDescription>
                        Busca y selecciona alumnos para matricularlos en este módulo.
                    </DialogDescription>
                </DialogHeader>
                <div className={`${CREATE_DIALOG_BODY_CLASS} flex flex-col gap-4`}>
                    {/* Filters */}
                    <div className="flex gap-3 items-center">
                        <div className="w-36 shrink-0">
                            <PrefixCombobox
                                prefixes={prefixes}
                                value={selectedPrefix}
                                onChange={setSelectedPrefix}
                                allLabel="Todos"
                                allValue="__all__"
                                placeholder="Prefijo…"
                            />
                        </div>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar alumnos..."
                                className={`${CREATE_DIALOG_INPUT_CLASS} pl-10 h-10 placeholder:text-text-muted transition-all`}
                            />
                            {loading && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-text-muted" />
                            )}
                        </div>
                    </div>

                    {/* Select all row */}
                    {results.length > 0 && (
                        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface-dark/60 px-3 py-2">
                            <Checkbox
                                checked={allSelected || (someSelected ? "indeterminate" : false)}
                                onCheckedChange={toggleAll}
                            />
                            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
                                {selected.size > 0 ? `${selected.size} seleccionado${selected.size !== 1 ? "s" : ""}` : "Seleccionar todos"}
                            </span>
                        </div>
                    )}

                    {/* Student list */}
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                        {results.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-surface-dark/40 py-10 space-y-2">
                                <Users className="size-10 text-border-strong" />
                                <p className="text-sm text-text-muted text-center">
                                    {search || selectedPrefix !== "__all__"
                                        ? "No se encontraron alumnos con ese filtro."
                                        : "No hay alumnos disponibles para matricular."}
                                </p>
                            </div>
                        )}
                        {results.map((student) => (
                            <div
                                key={student.id}
                                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-surface-dark/40 hover:bg-surface-dark/70 transition-colors cursor-pointer"
                                onClick={() => toggleSelect(student.id)}
                            >
                                <Checkbox
                                    checked={selected.has(student.id)}
                                    onCheckedChange={() => toggleSelect(student.id)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <div className="size-10 rounded-full bg-accent-blue/10 flex items-center justify-center shrink-0 border border-accent-blue/20 overflow-hidden">
                                    {student.avatar_url ? (
                                        <img
                                            src={student.avatar_url}
                                            alt={student.full_name || "Avatar"}
                                            className="size-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <span className="text-sm font-bold text-accent-blue">
                                            {student.full_name?.charAt(0) || "U"}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-foreground text-sm">{student.full_name || "Usuario Desconocido"}</div>
                                    <div className="text-xs text-text-muted tracking-wide truncate">{student.email}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className={CREATE_DIALOG_FOOTER_CLASS}>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button
                        onClick={handleBulkEnroll}
                        disabled={selected.size === 0 || enrolling}
                        className={CREATE_DIALOG_PRIMARY_ACTION_CLASS}
                    >
                        {enrolling ? (
                            <Loader2 className="size-4 animate-spin mr-2" />
                        ) : null}
                        Matricular{selected.size > 0 ? ` ${selected.size}` : ""}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
