"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Users } from "lucide-react";
import { enrollStudent, getAvailableStudents } from "@/app/dashboard/modules/[id]/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

export function EnrollStudentDialog({ moduleId, children }: EnrollStudentDialogProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<StudentResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [enrolling, setEnrolling] = useState<string | null>(null);
    const [isRefreshing, startTransition] = useTransition();
    const router = useRouter();

    const fetchStudents = useCallback(async (query?: string) => {
        setLoading(true);
        const result = await getAvailableStudents(moduleId, query);
        if (result.success && result.students) {
            setResults(result.students);
        }
        setLoading(false);
    }, [moduleId]);

    useEffect(() => {
        if (open) {
            fetchStudents();
        }
    }, [open, fetchStudents]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        fetchStudents(search);
    };

    const handleEnroll = async (studentId: string) => {
        setEnrolling(studentId);
        const result = await enrollStudent(moduleId, studentId);
        setEnrolling(null);

        if (result?.error) {
            toast.error(`Error al matricular: ${result.error}`);
        } else {
            toast.success("Alumno matriculado correctamente");
            // Refresh local results for the dialog
            fetchStudents(search);
            // Refresh the server component to update the parent page
            startTransition(() => {
                router.refresh();
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] border-border-strong bg-surface-dark">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">Añadir Alumnos</DialogTitle>
                    <DialogDescription className="text-text-muted">
                        Busca alumnos registrados en la plataforma para matricularlos en este módulo.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <form onSubmit={handleSearch} className="flex gap-3 mb-6 items-center">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted group-focus-within:text-accent-blue transition-colors" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar alumnos..."
                                className="pl-10 h-10 bg-surface/50 border-border-strong text-foreground placeholder:text-text-muted focus-visible:ring-1 focus-visible:ring-accent-blue focus-visible:border-accent-blue transition-all"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading || enrolling !== null}
                            className="h-10 px-6 bg-accent-blue hover:bg-accent-blue/90 text-surface-dark font-bold transition-all"
                        >
                            {loading ? <Loader2 className="size-4 animate-spin" /> : "Buscar"}
                        </Button>
                    </form>

                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {results.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center py-10 space-y-2">
                                <Users className="size-10 text-border-strong" />
                                <p className="text-sm text-text-muted text-center">
                                    {search ? "No se encontraron alumnos con ese nombre." : "Cargando lista de alumnos..."}
                                </p>
                            </div>
                        )}
                        {results.map((student) => (
                            <div key={student.id} className="flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-surface/30 hover:bg-surface/50 transition-colors group">
                                <div className="flex items-center gap-3">
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
                                    <div>
                                        <div className="font-semibold text-foreground text-sm">{student.full_name || "Usuario Desconocido"}</div>
                                        <div className="text-xs text-text-muted tracking-wide">{student.email}</div>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => handleEnroll(student.id)}
                                    disabled={enrolling === student.id}
                                    variant="outline"
                                    size="sm"
                                    className="border-accent-blue/30 text-accent-blue hover:bg-accent-blue hover:text-surface-dark h-8 px-4 font-bold transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                >
                                    {enrolling === student.id ? <Loader2 className="size-3.5 animate-spin" /> : "Añadir"}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
