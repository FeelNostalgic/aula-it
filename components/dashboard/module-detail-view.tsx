"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
    LayoutGrid,
    List,
    BookOpen,
    Brain,
    Code,
    Network,
    Database,
    Terminal,
    Users,
    Settings,
    GraduationCap,
    Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateUnitDialog } from "./create-unit-dialog";
import { EnrollStudentDialog } from "./enroll-student-dialog";
import { useBreadcrumb } from "./breadcrumb-context";
import { ModuleStudentsTab } from "./module-students-tab";
import { ModuleSettingsTab } from "./module-settings-tab";

const ICON_MAP: Record<string, any> = {
    BookOpen,
    Brain,
    Code,
    Network,
    Database,
    Terminal,
};

type Module = {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    created_at: string;
    teacher_id: string;
    status?: "active" | "completed" | "pending" | null;
};

type Unit = {
    id: string;
    module_id: string;
    name: string;
    description: string | null;
    order_index: number;
    created_at: string;
};

type Student = {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
};

interface ModuleDetailViewProps {
    module: Module;
    initialUnits: Unit[];
    initialStudents: Student[];
    userRole: "teacher" | "student";
}

export function ModuleDetailView({ module, initialUnits, initialStudents, userRole }: ModuleDetailViewProps) {
    const isTeacher = userRole === "teacher";
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const ModuleIcon = ICON_MAP[module.icon] || BookOpen;
    const { setSegments } = useBreadcrumb();

    const statusConfig = {
        active: {
            color: "text-accent-green",
            bg: "bg-accent-green/10",
            border: "border-accent-green/30",
            label: "ACTIVO",
            dotBg: "bg-accent-green",
            dotAnim: "animate-pulse"
        },
        pending: {
            color: "text-accent-orange",
            bg: "bg-accent-orange/10",
            border: "border-accent-orange/30",
            label: "PENDIENTE",
            dotBg: "bg-accent-orange",
            dotAnim: ""
        },
        completed: {
            color: "text-accent-blue",
            bg: "bg-accent-blue/10",
            border: "border-accent-blue/30",
            label: "COMPLETADO",
            dotBg: "bg-accent-blue",
            dotAnim: ""
        },
        archived: {
            color: "text-text-muted",
            bg: "bg-surface-dark",
            border: "border-border-strong border-dashed",
            label: "ARCHIVADO",
            dotBg: "bg-text-muted",
            dotAnim: ""
        }
    }[module.status || "pending"];

    // Set breadcrumb segments for the top nav
    useEffect(() => {
        setSegments([{ label: module.name }]);
        return () => setSegments([]);
    }, [module.name, setSegments]);

    return (
        <div className="flex flex-col gap-8">

            {/* Module Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-start gap-5">
                    <div className="size-14 rounded-xl bg-surface border border-accent-blue/20 shadow-[0_0_15px_rgba(34,211,238,0.1)] flex items-center justify-center text-accent-blue shrink-0">
                        <ModuleIcon className="size-7" />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">{module.name}</h1>
                            {statusConfig && (
                                <Badge variant="outline" className={`${statusConfig.border} ${statusConfig.bg} ${statusConfig.color} gap-1.5 py-1 px-3 shadow-sm`}>
                                    <span className={`size-1.5 rounded-full ${statusConfig.dotBg} ${statusConfig.dotAnim}`} />
                                    {statusConfig.label}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-text-muted max-w-xl">
                            {module.description || "Sin descripción proporcionada para este módulo."}
                        </p>
                    </div>
                </div>
                {isTeacher && (
                    <div className="flex items-center gap-3">
                        <EnrollStudentDialog moduleId={module.id}>
                            <Button
                                variant="outline"
                                className="font-mono font-bold tracking-widest text-[10px] h-9 px-4 border-border-subtle text-text-muted hover:text-foreground"
                            >
                                <Users className="mr-2 size-4" />
                                AÑADIR ALUMNOS
                            </Button>
                        </EnrollStudentDialog>
                        <CreateUnitDialog moduleId={module.id} />
                    </div>
                )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="dashboard" className="w-full">
                <TabsList className="bg-surface border border-border-subtle rounded-lg p-1 h-auto">
                    <TabsTrigger
                        value="dashboard"
                        className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md"
                    >
                        <LayoutGrid className="mr-2 size-3.5" />
                        DASHBOARD
                    </TabsTrigger>
                    {isTeacher && (
                        <>
                            <TabsTrigger
                                value="alumnos"
                                className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md"
                            >
                                <GraduationCap className="mr-2 size-3.5" />
                                ALUMNOS
                            </TabsTrigger>
                            <TabsTrigger
                                value="configuracion"
                                className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md"
                            >
                                <Settings className="mr-2 size-3.5" />
                                CONFIGURACIÓN
                            </TabsTrigger>
                        </>
                    )}
                </TabsList>

                {/* Dashboard Tab (Units) */}
                <TabsContent value="dashboard" className="mt-6">
                    {/* View Mode Toggle + Count */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold tracking-tight text-foreground">Unidades Didácticas</h2>
                            <Badge variant="outline" className="border-border-subtle text-text-muted text-[10px] font-mono font-bold">
                                {initialUnits.length}
                            </Badge>
                        </div>
                        <div className="flex items-center bg-surface border border-border-subtle rounded-lg p-1">
                            <Button
                                variant={viewMode === "grid" ? "secondary" : "ghost"}
                                size="icon"
                                onClick={() => setViewMode("grid")}
                                className={`size-8 rounded-md ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-text-muted"}`}
                            >
                                <LayoutGrid className="size-4" />
                            </Button>
                            <Button
                                variant={viewMode === "list" ? "secondary" : "ghost"}
                                size="icon"
                                onClick={() => setViewMode("list")}
                                className={`size-8 rounded-md ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-text-muted"}`}
                            >
                                <List className="size-4" />
                            </Button>
                        </div>
                    </div>

                    {initialUnits.length === 0 ? (
                        <Card className="bg-surface-dark border-border-subtle border-dashed p-12 text-center flex flex-col items-center gap-4">
                            <div className="size-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
                                <BookOpen className="size-6 text-accent-blue" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-foreground">No hay unidades registradas</h3>
                                <p className="text-xs text-text-muted">Aún no has creado ninguna unidad didáctica. ¡Comienza ahora!</p>
                            </div>
                            <CreateUnitDialog moduleId={module.id} />
                        </Card>
                    ) : (
                        <div className={viewMode === "grid"
                            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                            : "flex flex-col gap-4"
                        }>
                            {initialUnits.map((unit) => {
                                const hash = unit.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                const progress = (hash % 5) * 10 + 60; // Mock progress 60-100%

                                if (viewMode === "list") {
                                    return (
                                        <Link
                                            key={unit.id}
                                            href={`/dashboard/units/${unit.id}`}
                                            className="bg-surface-dark border border-border-subtle hover:border-accent-blue/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 group transition-all cursor-pointer shadow-sm hover:shadow-md"
                                        >
                                            {/* Col 1: Order + Name */}
                                            <div className="flex items-center gap-4 w-full md:w-[20%] md:max-w-[400px] shrink-0">
                                                <div className="size-10 rounded-lg bg-surface border border-accent-blue/20 shadow-[0_0_10px_rgba(34,211,238,0.05)] flex items-center justify-center shrink-0">
                                                    <span className="text-sm font-bold text-accent-blue font-mono">{unit.order_index + 1}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-foreground truncate group-hover:text-accent-blue transition-colors tracking-tight">
                                                        {unit.name}
                                                    </h3>
                                                    <p className="text-xs text-text-muted truncate">
                                                        {unit.description || "Sin descripción"}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Col 2: Last activity (moved to middle) */}
                                            <div className="w-full md:flex-1 min-w-[200px] shrink-0 flex items-center gap-3">
                                                <div className="size-8 rounded-full bg-surface border border-border-subtle flex items-center justify-center shrink-0">
                                                    <Terminal className="size-3.5 text-text-muted" />
                                                </div>
                                                <div className="space-y-0.5 min-w-0">
                                                    <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted leading-none">Última actividad</div>
                                                    <div className="text-sm font-bold text-foreground leading-none truncate group-hover:text-accent-blue/90 transition-colors">Tema 1: Conceptos base</div>
                                                </div>
                                            </div>

                                            {/* Col 3: Progress */}
                                            <div className="w-full md:w-[250px] shrink-0">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Progreso</span>
                                                    <span className="text-xs font-bold text-foreground">{progress}%</span>
                                                </div>
                                                <Progress value={progress} className="h-1.5 bg-surface [&>div]:bg-accent-blue" />
                                            </div>

                                            {/* Col 4: Status Badge */}
                                            <div className="w-full md:w-[120px] shrink-0 flex md:justify-end mt-2 md:mt-0">
                                                <Badge variant="outline" className="border-border-strong bg-surface text-text-muted gap-1.5 py-1 px-3">
                                                    <span className="size-1.5 rounded-full bg-text-muted" />
                                                    PENDIENTE
                                                </Badge>
                                            </div>
                                        </Link>
                                    );
                                }

                                // Grid View
                                return (
                                    <Link key={unit.id} href={`/dashboard/units/${unit.id}`} className="block h-full">
                                        <Card
                                            className="bg-surface-dark border-border-subtle hover:border-accent-blue/50 hover:shadow-lg hover:shadow-accent-blue/5 transition-all group overflow-hidden flex flex-col h-full rounded-2xl"
                                        >
                                            <div className="p-6 flex flex-col h-full">
                                                {/* Header */}
                                                <div className="flex items-start gap-4 mb-5">
                                                    <div className="size-12 rounded-xl bg-surface border border-accent-blue/20 shadow-[0_0_15px_rgba(34,211,238,0.1)] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-accent-blue/10 transition-all">
                                                        <span className="text-lg font-bold text-accent-blue font-mono">{unit.order_index + 1}</span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-accent-blue transition-colors line-clamp-1">
                                                            {unit.name}
                                                        </h3>
                                                        <p className="text-sm text-text-muted mt-1.5 line-clamp-2">
                                                            {unit.description || "Sin descripción proporcionada para esta unidad."}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Footer Area */}
                                                <div className="mt-auto space-y-4 pt-4 border-t border-border-subtle/50 relative">
                                                    <div className="flex items-end justify-between mb-2">
                                                        <Badge variant="outline" className="border-border-strong bg-surface text-text-muted gap-1.5 shadow-sm">
                                                            <span className="size-1.5 rounded-full bg-text-muted" />
                                                            PENDIENTE
                                                        </Badge>
                                                        <div className="flex items-baseline gap-1 font-bold text-foreground">
                                                            <span className="text-xl leading-none">{progress}</span>
                                                            <span className="text-sm text-text-muted">%</span>
                                                        </div>
                                                    </div>

                                                    <Progress value={progress} className="h-1.5 bg-surface [&>div]:bg-accent-blue" />

                                                    {/* Last activity Inner Box */}
                                                    <div className="bg-[#050A0D] border border-border-subtle rounded-xl p-3 flex items-center gap-3 mt-4 group-hover:border-accent-blue/30 transition-colors">
                                                        <div className="size-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                                                            <Terminal className="size-4 text-text-muted group-hover:text-accent-blue transition-colors" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-0.5">Última actividad abierta</div>
                                                            <div className="text-xs font-bold text-foreground truncate group-hover:text-accent-blue/90 transition-colors">Tema 1: Conceptos base</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                );
                            })}

                            {/* Nueva Unidad Card */}
                            {viewMode === "grid" ? (
                                <CreateUnitDialog moduleId={module.id}>
                                    <button className="bg-transparent border-2 border-dashed border-border-subtle hover:border-accent-blue/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group min-h-[180px] hover:bg-accent-blue/5">
                                        <div className="size-12 rounded-full bg-surface border border-border-subtle group-hover:border-accent-blue/30 group-hover:bg-accent-blue/10 flex items-center justify-center transition-all">
                                            <Plus className="size-5 text-text-muted group-hover:text-accent-blue transition-colors" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-foreground group-hover:text-accent-blue transition-colors">Nueva Unidad</p>
                                            <p className="text-xs text-text-muted mt-0.5">Crear contenido didáctico</p>
                                        </div>
                                    </button>
                                </CreateUnitDialog>
                            ) : (
                                <CreateUnitDialog moduleId={module.id}>
                                    <button className="bg-transparent border-2 border-dashed border-border-subtle hover:border-accent-blue/50 rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all group hover:bg-accent-blue/5">
                                        <div className="size-10 rounded-lg bg-surface border border-border-subtle group-hover:border-accent-blue/30 group-hover:bg-accent-blue/10 flex items-center justify-center transition-all shrink-0">
                                            <Plus className="size-4 text-text-muted group-hover:text-accent-blue transition-colors" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-foreground group-hover:text-accent-blue transition-colors">Nueva Unidad</p>
                                            <p className="text-xs text-text-muted">Crear contenido didáctico</p>
                                        </div>
                                    </button>
                                </CreateUnitDialog>
                            )}
                        </div>
                    )}
                </TabsContent>

                {/* Alumnos Tab */}
                <TabsContent value="alumnos" className="mt-6">
                    <ModuleStudentsTab moduleId={module.id} students={initialStudents} />
                </TabsContent>

                {/* Configuración Tab */}
                <TabsContent value="configuracion" className="mt-6">
                    <ModuleSettingsTab module={module} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
