"use client";

import { useState, useEffect, useTransition } from "react";
import { Search, MoreVertical, Trash2, GraduationCap, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { unenrollStudent } from "@/app/dashboard/modules/[id]/actions";
import { toast } from "sonner";
import { EnrollStudentDialog } from "./enroll-student-dialog";

interface Student {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    module_xp?: number;
}

interface ModuleStudentsTabProps {
    moduleId: string;
    initialStudents: Student[];
}

// Datos de ejemplo para la visualización del progreso (mocked por ahora)
const getMockData = (studentId: string, name: string | null) => {
    // Generar datos consistentes basados en el ID para que no cambien en cada render
    const seed = studentId.split('-')[0];
    const hash = parseInt(seed, 16) || 0;

    return {
        progress: 15 + (hash % 70),
        currentUnit: `Unidad ${(hash % 3) + 1}`,
        lastActivity: `${(hash % 5) + 1}h ago`,
        isOnline: hash % 2 === 0
    };
};

export default function ModuleStudentsTab({ moduleId, initialStudents }: ModuleStudentsTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [enrolledStudents, setEnrolledStudents] = useState<Student[]>(initialStudents);
    const [isPending, startTransition] = useTransition();

    // Sincronizar el estado local cuando cambian los props (tras router.refresh)
    useEffect(() => {
        setEnrolledStudents(initialStudents);
    }, [initialStudents]);

    const handleUnenroll = (studentId: string) => {
        startTransition(async () => {
            const result = await unenrollStudent(moduleId, studentId);
            if (result.error) {
                toast.error("Error al desvincular alumno");
                console.error("Error unenrolling student:", result.error);
            } else {
                toast.success("Alumno desvinculado correctamente");
                setEnrolledStudents(prev => prev.filter(s => s.id !== studentId));
            }
        });
    };

    const filteredStudents = enrolledStudents?.filter((student) =>
        student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                    <Input
                        placeholder="Buscar alumnos..."
                        className="pl-9 bg-surface border-border-subtle focus-visible:ring-accent-blue"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <EnrollStudentDialog moduleId={moduleId}>
                    <Button className="bg-accent-blue hover:bg-accent-blue/90 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2">
                        <Plus className="size-4" />
                        Matricular Alumno
                    </Button>
                </EnrollStudentDialog>
            </div>

            <div className="bg-surface-dark border border-border-strong rounded-xl overflow-hidden shadow-sm">
                <div className="grid md:grid-cols-[2fr_1fr_1.5fr_1fr_1fr_auto] gap-4 p-4 border-b border-border-strong bg-surface/30 text-xs font-bold text-text-muted uppercase tracking-wider">
                    <div>Alumno</div>
                    <div>Progreso</div>
                    <div>Unidad Actual</div>
                    <div>Última Actividad</div>
                    <div>Estado</div>
                    <div className="w-8"></div>
                </div>

                <div className="divide-y divide-border-subtle">
                    {filteredStudents && filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => {
                            const mockData = getMockData(student.id, student.full_name);
                            return (
                                <div key={student.id} className="grid md:grid-cols-[2fr_1fr_1.5fr_1fr_1fr_auto] gap-4 p-4 items-center hover:bg-surface/20 transition-colors">
                                    {/* Alumno Info */}
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full overflow-hidden bg-accent-orange/10 flex-shrink-0 flex items-center justify-center border border-accent-orange/20">
                                            {student.avatar_url ? (
                                                <img
                                                    src={student.avatar_url}
                                                    alt={student.full_name || "Avatar"}
                                                    className="size-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <span className="text-sm font-bold text-accent-orange">
                                                    {student.full_name?.charAt(0) || "U"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-foreground text-sm truncate" title={student.full_name || "Usuario Desconocido"}>
                                                {student.full_name || "Usuario Desconocido"}
                                            </div>
                                            <div className="text-xs text-text-muted truncate">{student.email}</div>
                                        </div>
                                    </div>

                                    {/* Progreso */}
                                    <div className="flex items-center gap-3">
                                        <Progress value={mockData.progress} className="h-1.5 bg-surface [&>div]:bg-accent-blue w-16 md:w-20" />
                                        <span className="text-sm font-bold text-foreground">{mockData.progress}%</span>
                                    </div>

                                    {/* Unidad Actual */}
                                    <div>
                                        <Badge variant="outline" className="border-border-strong bg-surface text-text-muted font-normal text-xs py-1">
                                            {mockData.currentUnit}
                                        </Badge>
                                    </div>

                                    {/* Última Actividad */}
                                    <div className="text-sm text-text-muted">
                                        {mockData.lastActivity}
                                    </div>

                                    {/* Estado */}
                                    <div className="flex items-center gap-2">
                                        <span className={`size-2 rounded-full ${mockData.isOnline ? "bg-accent-green" : "bg-text-muted"}`} />
                                        <span className="text-xs font-bold text-foreground uppercase tracking-widest">
                                            {mockData.isOnline ? "Online" : "Offline"}
                                        </span>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex justify-end md:pr-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button data-testid="student-actions-button" variant="ghost" size="icon" className="size-8 text-text-muted hover:text-foreground data-[state=open]:bg-surface/50" disabled={isPending}>
                                                    <MoreVertical className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[160px] bg-surface-dark border-border-strong">
                                                <DropdownMenuItem
                                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                                                    onClick={() => handleUnenroll(student.id)}
                                                    disabled={isPending}
                                                >
                                                    <Trash2 className="mr-2 size-4" />
                                                    Eliminar alumno
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-12 text-center">
                            <GraduationCap className="size-12 text-border-strong mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-foreground mb-1">No hay alumnos</h3>
                            <p className="text-text-muted text-sm">
                                {searchQuery ? "No se encontraron alumnos que coincidan con tu búsqueda." : "Aún no hay alumnos matriculados en este módulo."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
