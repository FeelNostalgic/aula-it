"use client";

import { useState } from "react";
import { Search, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EnrollStudentDialog } from "./enroll-student-dialog";

type Student = {
    id: string;
    full_name: string | null;
};

interface ModuleStudentsTabProps {
    moduleId: string;
    students: Student[];
}

export function ModuleStudentsTab({ moduleId, students }: ModuleStudentsTabProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredStudents = students.filter(student =>
        student.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Mock data generation for visual prototype based on student ID to keep it stable
    const getMockData = (id: string, name: string | null) => {
        const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const progress = (hash % 9) * 10 + 15; // 15 to 95%
        const isOnline = hash % 3 === 0;
        const lastActivityOptions = ["Hace 10 minutos", "Ayer, 18:24", "Hace 3 días", "Ahora mismo", "Hace 2 horas"];
        const currentUnitOptions = ["U4: Gestión de Memoria", "U2: Procesos y Hilos", "U1: Intro S.O.", "U6: Virtualización"];

        return {
            progress,
            isOnline,
            lastActivity: lastActivityOptions[hash % lastActivityOptions.length],
            currentUnit: currentUnitOptions[hash % currentUnitOptions.length],
            email: name ? `${name.toLowerCase().replace(/\s+/g, '.')}@aula-it.edu` : `student_${hash}@aula-it.edu`
        };
    };

    return (
        <div className="space-y-6">
            {/* Header / Filters / Action */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-surface-dark border border-border-strong rounded-xl p-4">
                <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por nombre, email o ID..."
                            className="pl-9 bg-surface border-border-strong text-foreground placeholder:text-text-muted focus-visible:ring-accent-blue"
                        />
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Button variant="outline" className="flex-1 md:flex-none bg-surface border-border-strong text-text-muted hover:text-foreground">
                            Todos los Estados
                        </Button>
                        <Button variant="outline" className="flex-1 md:flex-none bg-surface border-border-strong text-text-muted hover:text-foreground">
                            Progreso: Cualquiera
                        </Button>
                    </div>
                </div>

                <EnrollStudentDialog moduleId={moduleId}>
                    <Button className="w-full lg:w-auto bg-accent-blue hover:bg-accent-blue/90 text-surface-dark font-semibold">
                        Añadir alumnos
                    </Button>
                </EnrollStudentDialog>
            </div>

            {/* Students List */}
            <div className="bg-surface-dark border border-border-strong rounded-xl overflow-hidden">
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_auto] gap-4 p-4 border-b border-border-strong bg-surface/50 text-xs font-bold text-text-muted uppercase tracking-wider">
                    <div>Alumno</div>
                    <div>Progreso %</div>
                    <div>Unidad Actual</div>
                    <div>Última Actividad</div>
                    <div>Estado</div>
                    <div className="w-10">Acciones</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-border-subtle">
                    {filteredStudents.length === 0 ? (
                        <div className="p-8 text-center text-text-muted">
                            {searchQuery ? "No hay alumnos matriculados que coincidan con la búsqueda." : "No hay alumnos matriculados en este módulo."}
                        </div>
                    ) : (
                        filteredStudents.map((student) => {
                            const mockData = getMockData(student.id, student.full_name);
                            return (
                                <div key={student.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1.5fr_1fr_1fr_auto] gap-4 p-4 items-center hover:bg-surface/30 transition-colors">
                                    {/* Alumno */}
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-accent-orange/10 flex items-center justify-center shrink-0">
                                            <span className="text-sm font-bold text-accent-orange">
                                                {student.full_name?.charAt(0) || "U"}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-foreground text-sm truncate">{student.full_name || "Usuario Desconocido"}</div>
                                            <div className="text-xs text-text-muted truncate">{mockData.email}</div>
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
                                    <div className="flex justify-start md:justify-center">
                                        <Button variant="ghost" size="icon" className="size-8 text-text-muted hover:text-foreground">
                                            <MoreVertical className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                {filteredStudents.length > 0 && (
                    <div className="p-4 border-t border-border-strong flex items-center justify-between text-sm text-text-muted">
                        <div>Mostrando {filteredStudents.length} de {students.length} alumnos</div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-8 bg-surface border-border-strong text-text-muted hover:text-foreground" disabled>Anterior</Button>
                            <Button variant="outline" size="sm" className="h-8 bg-surface border-border-strong text-text-muted hover:text-foreground">Siguiente</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
