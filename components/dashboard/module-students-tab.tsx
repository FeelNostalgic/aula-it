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
import { cn } from "@/lib/utils";

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

interface Student {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    module_xp?: number;
    total_steps?: number;
    completed_steps?: number;
    last_activity?: string | null;
}

interface ModuleStudentsTabProps {
    moduleId: string;
    initialStudents: Student[];
}

export default function ModuleStudentsTab({ moduleId, initialStudents }: ModuleStudentsTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [enrolledStudents, setEnrolledStudents] = useState<Student[]>(initialStudents);
    const [isPending, startTransition] = useTransition();
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

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
                setStudentToDelete(null);
            }
        });
    };

    const filteredStudents = enrolledStudents?.filter((student) =>
        student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatLastActivity = (dateStr: string | null | undefined) => {
        if (!dateStr) return "Sin actividad";
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Ahora mismo";
        if (diffMins < 60) return `Hace ${diffMins}m`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays === 1) return "Ayer";
        return date.toLocaleDateString("es-ES", { day: '2-digit', month: 'short' });
    };

    const isOnline = (dateStr: string | null | undefined) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const now = new Date();
        const diffMins = (now.getTime() - date.getTime()) / 60000;
        return diffMins < 15; // Consider active if activity in last 15 mins
    };

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
                    <Button className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-9 px-4">
                        <Plus className="mr-2 size-4" />
                        MATRICULAR ALUMNO
                    </Button>
                </EnrollStudentDialog>
            </div>

            <div className="bg-surface-dark border border-border-strong rounded-xl overflow-hidden shadow-sm">
                <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 p-4 border-b border-border-strong bg-surface/30 text-xs font-bold text-text-muted uppercase tracking-wider">
                    <div>Alumno</div>
                    <div className="text-center">Progreso</div>
                    <div className="text-center">Última Actividad</div>
                    <div className="text-center">Estado</div>
                    <div className="w-8"></div>
                </div>

                <div className="divide-y divide-border-subtle">
                    {filteredStudents && filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => {
                            const total = student.total_steps || 0;
                            const completed = student.completed_steps || 0;
                            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                            const active = isOnline(student.last_activity);

                            return (
                                <div key={student.id} className="grid md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 p-4 items-center hover:bg-surface/20 transition-colors">
                                    {/* Alumno Info */}
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full overflow-hidden bg-accent-orange/10 shrink-0 flex items-center justify-center border border-accent-orange/20">
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
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className="flex items-center gap-3 w-full max-w-[120px]">
                                            <Progress value={progress} className="h-1.5 bg-surface [&>div]:bg-accent-blue flex-1" />
                                            <span className="text-xs font-bold text-foreground min-w-[30px] text-right">{progress}%</span>
                                        </div>
                                        <span className="text-[9px] text-text-muted font-mono uppercase tracking-tighter">
                                            {completed} / {total} Pasos
                                        </span>
                                    </div>

                                    {/* Última Actividad */}
                                    <div className="text-sm text-text-muted text-center font-medium">
                                        {formatLastActivity(student.last_activity)}
                                    </div>

                                    {/* Estado */}
                                    <div className="flex items-center justify-center gap-2">
                                        <div className={cn(
                                            "flex items-center gap-1.5 py-1 px-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest",
                                            active 
                                                ? "bg-accent-green/10 border-accent-green/30 text-accent-green" 
                                                : "bg-surface border-border-strong text-text-muted"
                                        )}>
                                            <span className={cn("size-1.5 rounded-full", active ? "bg-accent-green animate-pulse" : "bg-text-muted")} />
                                            {active ? "Activo" : "Inactivo"}
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex justify-end md:pr-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button data-testid="student-actions-button" variant="ghost" size="icon" className="size-8 text-text-muted hover:text-foreground data-[state=open]:bg-surface/50" disabled={isPending}>
                                                    <MoreVertical className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[180px] bg-surface-dark border-border-strong">
                                                <DropdownMenuItem
                                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                                                    onClick={() => setStudentToDelete(student)}
                                                    disabled={isPending}
                                                >
                                                    <Trash2 className="mr-2 size-4" />
                                                    Desvincular Alumno
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

            {/* AlertDialog de confirmación para eliminar */}
            <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
                <AlertDialogContent className="bg-surface border-border-strong">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Desvincular alumno?</AlertDialogTitle>
                        <AlertDialogDescription className="text-text-muted">
                            Esta acción eliminará a <span className="text-foreground font-bold">{studentToDelete?.full_name}</span> del módulo. 
                            Se conservarán sus entregas pero ya no podrá acceder a los contenidos de este módulo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-border-strong hover:bg-surface-dark">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => studentToDelete && handleUnenroll(studentToDelete.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Desvincular
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
