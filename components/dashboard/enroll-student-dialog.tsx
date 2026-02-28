"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { enrollStudent } from "@/app/dashboard/modules/[id]/actions";

interface EnrollStudentDialogProps {
    moduleId: string;
    children: React.ReactNode;
}

type StudentResult = {
    id: string;
    full_name: string | null;
    email: string;
};

export function EnrollStudentDialog({ moduleId, children }: EnrollStudentDialogProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<StudentResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [enrolling, setEnrolling] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!search.trim()) return;

        setLoading(true);
        const supabase = createClient();

        // Mock email generation based on full_name since we're using profiles
        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("role", "student")
            .ilike("full_name", `%${search}%`)
            .limit(5);

        if (!error && data) {
            setResults(data.map(d => ({
                id: d.id,
                full_name: d.full_name,
                email: `${d.full_name?.toLowerCase().replace(/\s+/g, '.')}@aula-it.edu`
            })));
        }
        setLoading(false);
    };

    const handleEnroll = async (studentId: string) => {
        setEnrolling(studentId);
        const result = await enrollStudent(moduleId, studentId);
        setEnrolling(null);

        if (result?.error) {
            alert(result.error);
        } else {
            setSearch("");
            setResults([]);
            setOpen(false);
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
                    <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por nombre..."
                                className="pl-9 bg-surface border-border-strong text-foreground placeholder:text-text-muted focus-visible:ring-accent-blue"
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="bg-accent-blue hover:bg-accent-blue/90 text-surface-dark font-semibold">
                            {loading ? <Loader2 className="size-4 animate-spin" /> : "Buscar"}
                        </Button>
                    </form>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {results.length === 0 && !loading && search && (
                            <p className="text-sm text-text-muted text-center py-4">No se encontraron alumnos con ese nombre.</p>
                        )}
                        {results.map((student) => (
                            <div key={student.id} className="flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-surface">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-accent-blue/10 flex items-center justify-center shrink-0">
                                        <span className="text-sm font-bold text-accent-blue">
                                            {student.full_name?.charAt(0) || "U"}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="font-medium text-foreground text-sm">{student.full_name || "Usuario Desconocido"}</div>
                                        <div className="text-xs text-text-muted">{student.email}</div>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => handleEnroll(student.id)}
                                    disabled={enrolling === student.id}
                                    variant="outline"
                                    size="sm"
                                    className="border-accent-blue/50 text-accent-blue hover:bg-accent-blue/10 h-8 font-medium"
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
