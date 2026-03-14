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
    Globe,
    Cpu,
    Shield,
    Smartphone,
    Monitor,
    Cloud,
    Users,
    Settings,
    GraduationCap,
    Plus,
    Lock,
    Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateUnitDialog } from "./create-unit-dialog";
import { EnrollStudentDialog } from "./enroll-student-dialog";
import { useBreadcrumb } from "./breadcrumb-context";
import ModuleStudentsTab from "./module-students-tab";
import { ModuleSettingsTab } from "./module-settings-tab";
import { cn } from "@/lib/utils";
import { getModuleRankInfo } from "@/lib/gamification";
import { useModuleGamification } from "@/hooks/use-gamification";
import { RankBadge } from "./rank-badge";
import { ModuleLeaderboard } from "./module-leaderboard";
import { 
    DndContext, 
    DragEndEvent, 
    PointerSensor, 
    useSensor, 
    useSensors, 
    closestCenter 
} from "@dnd-kit/core";
import { 
    arrayMove, 
    SortableContext, 
    verticalListSortingStrategy, 
    rectSortingStrategy 
} from "@dnd-kit/sortable";
import { reorderUnits } from "@/app/dashboard/actions";
import { toast } from "sonner";
import { useTransition } from "react";
import { SortableUnitListItem, SortableUnitGridItem } from "./sortable-unit-item";


import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";

const ICON_MAP: Record<string, any> = {
    BookOpen,
    Brain,
    Code,
    Network,
    Database,
    Terminal,
    Globe,
    Cpu,
    Shield,
    Smartphone,
    Monitor,
    Cloud,
};

type Module = {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    custom_icon_url?: string | null;
    created_at: string;
    teacher_id: string;
    status?: "active" | "completed" | "draft" | null;
};

type Unit = {
    id: string;
    module_id: string;
    name: string;
    description: string | null;
    order_index: number;
    created_at: string;
    status?: string | null;
    next_due_step?: {
        title: string;
        due_date: string;
    } | null;
    latest_activity?: {
        id: string;
        title: string;
        status: string;
    } | null;
    activities?: {
        id: string;
        activity_submissions: {
            id: string;
            status: string;
        }[];
    }[];
};

type Student = {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    total_steps?: number;
    completed_steps?: number;
    last_activity?: string | null;
};

interface ModuleDetailViewProps {
    module: Module;
    initialUnits: Unit[];
    initialStudents: Student[];
    userRole: "teacher" | "student";
    moduleXp?: number;
}

export function ModuleDetailView({ module, initialUnits, initialStudents, userRole, moduleXp = 0 }: ModuleDetailViewProps) {
    const isTeacher = userRole === "teacher";
    const { moduleXp: liveModuleXp, moduleRank: liveModuleRank, rankPosition } = useModuleGamification(module.id, userRole);

    // Use live data for students, prop data for teachers
    const displayXp = !isTeacher ? liveModuleXp : moduleXp;
    
    // For teachers we can default to F or not show it.
    const rankLetter = !isTeacher ? liveModuleRank : "F";

    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [gridCols, setGridCols] = useState(3);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [units, setUnits] = useState<Unit[]>([]);
    const [, startTransition] = useTransition();

    // Persistence: load from localStorage
    useEffect(() => {
        const savedView = (localStorage.getItem("aula-it:module-view:view-mode") as "grid" | "list");
        const savedCols = localStorage.getItem("aula-it:module-view:grid-cols");
        if (savedView) setViewMode(savedView);
        if (savedCols) setGridCols(parseInt(savedCols, 10));
    }, []);

    // Persistence: save to localStorage
    useEffect(() => {
        if (viewMode) {
            localStorage.setItem("aula-it:module-view:view-mode", viewMode);
        }
    }, [viewMode]);

    useEffect(() => {
        if (isTeacher) {
            localStorage.setItem("aula-it:module-view:grid-cols", gridCols.toString());
        }
    }, [gridCols, isTeacher]);

    // Sync units state with initialUnits prop when it changes (e.g. after revalidation)
    useEffect(() => {
        setUnits([...initialUnits].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
    }, [initialUnits]);

    const ModuleIcon = ICON_MAP[module.icon] || BookOpen;
    const { setSegments } = useBreadcrumb();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !isTeacher) return;

        const oldIndex = units.findIndex(u => u.id === active.id);
        const newIndex = units.findIndex(u => u.id === over.id);
        const reordered = arrayMove(units, oldIndex, newIndex);

        // Optimistic update
        const snapshot = units;
        setUnits(reordered);

        startTransition(async () => {
            const result = await reorderUnits(
                module.id,
                reordered.map((u, index) => ({ id: u.id, order_index: index }))
            );
            if (result?.error) {
                toast.error("Error al reordenar las unidades");
                setUnits(snapshot);
            }
        });
    };

    const statusConfigMap = {
        active: {
            color: "text-accent-green",
            bg: "bg-accent-green/10",
            border: "border-accent-green/30",
            label: "ACTIVO",
            dotBg: "bg-accent-green",
            dotAnim: "animate-pulse"
        },
        draft: {
            color: "text-accent-orange",
            bg: "bg-accent-orange/10",
            border: "border-accent-orange/30",
            label: "BORRADOR",
            dotBg: "bg-accent-orange",
            dotAnim: ""
        },
        pending: { // Fallback for legacy data
            color: "text-accent-orange",
            bg: "bg-accent-orange/10",
            border: "border-accent-orange/30",
            label: "BORRADOR",
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
    };

    const statusConfig = statusConfigMap[module.status as keyof typeof statusConfigMap || "draft"];

    const gridColsClass = {
        2: "md:grid-cols-2 lg:grid-cols-2",
        3: "md:grid-cols-2 lg:grid-cols-3",
        4: "md:grid-cols-3 lg:grid-cols-4",
        5: "md:grid-cols-4 lg:grid-cols-5",
    }[gridCols as 2 | 3 | 4 | 5] || "md:grid-cols-2 lg:grid-cols-3";

    // Set breadcrumb segments for the top nav
    useEffect(() => {
        setSegments([{ label: module.name, href: `/dashboard/modules/${module.id}` }]);
        return () => setSegments([]);
    }, [module.name, module.id, setSegments]);

    return (
        <div className="flex flex-col gap-8">

            {/* Module Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-start gap-5">
                    {module.custom_icon_url ? (
                        <div className="size-14 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-surface border border-accent-blue/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                            <img src={module.custom_icon_url} alt={module.name} className="size-full object-cover p-2" />
                        </div>
                    ) : (
                        <div className="size-14 rounded-xl bg-surface border border-accent-blue/20 shadow-[0_0_15px_rgba(34,211,238,0.1)] flex items-center justify-center text-accent-blue shrink-0">
                            <ModuleIcon className="size-7" />
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">{module.name}</h1>
                            {statusConfig && (
                                <Badge variant="outline" className={`${statusConfig.border} ${statusConfig.bg} ${statusConfig.color} gap-1.5 py-1 px-3 shadow-sm`}>
                                    <span className={`size-1.5 rounded-full ${statusConfig.dotBg} ${statusConfig.dotAnim}`} />
                                    {statusConfig.label}
                                </Badge>
                            )}
                            {!isTeacher && (
                                <div className="flex items-center gap-3">
                                    <RankBadge
                                        rank={rankLetter}
                                        showLabel
                                        className="py-1.5 shadow-md"
                                    />
                                    {rankPosition && (
                                        <Badge variant="outline" className="bg-surface border-border/50 text-text-muted px-2.5 py-1.5 h-auto">
                                            <span className="text-[10px] uppercase font-mono font-bold tracking-widest mr-1 opacity-70">Top</span>
                                            <span className="font-bold text-foreground">#{rankPosition}</span>
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-text-muted max-w-xl">
                            {module.description || "Sin descripción proporcionada para este módulo."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-surface border border-border-subtle rounded-lg p-1 h-auto">
                    <TabsTrigger
                        value="dashboard"
                        className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md"
                    >
                        <LayoutGrid className="mr-2 size-3.5" />
                        DASHBOARD
                    </TabsTrigger>
                    <TabsTrigger
                        value="ranking"
                        className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md"
                    >
                        <Trophy className="mr-2 size-3.5" />
                        RANKING
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
                        <div className="flex items-center gap-3">
                            {viewMode === "grid" && (
                                <div className="flex items-center gap-2 mr-2">
                                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest hidden lg:inline">Columnas:</span>
                                    <Select value={gridCols.toString()} onValueChange={(val) => setGridCols(parseInt(val))}>
                                        <SelectTrigger className="w-[60px] h-8 bg-surface border-border-subtle focus:ring-accent-blue text-xs">
                                            <SelectValue placeholder="3" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-surface border-border-subtle">
                                            <SelectItem value="2">2</SelectItem>
                                            <SelectItem value="3">3</SelectItem>
                                            <SelectItem value="4">4</SelectItem>
                                            <SelectItem value="5">5</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="flex items-center bg-surface border border-border-subtle rounded-lg p-1">
                                <Button
                                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                                    size="icon"
                                    onClick={() => setViewMode("grid")}
                                    aria-label="Vista de cuadrícula"
                                    className={`size-8 rounded-md ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-text-muted"}`}
                                >
                                    <LayoutGrid className="size-4" />
                                </Button>
                                <Button
                                    variant={viewMode === "list" ? "secondary" : "ghost"}
                                    size="icon"
                                    onClick={() => setViewMode("list")}
                                    aria-label="Vista de lista"
                                    className={`size-8 rounded-md ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-text-muted"}`}
                                >
                                    <List className="size-4" />
                                </Button>
                            </div>
                            {isTeacher && (
                                <CreateUnitDialog moduleId={module.id}>
                                    <Button className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-9 px-4 uppercase">
                                        <Plus className="mr-2 size-4" />
                                        AÑADIR UNIDAD DIDÁCTICA
                                    </Button>
                                </CreateUnitDialog>
                            )}
                        </div>
                    </div>

                    {units.length === 0 ? (
                        <Card className="bg-surface-dark border-border-subtle border-dashed p-12 text-center flex flex-col items-center gap-4">
                            <div className="size-12 rounded-full bg-accent-blue/10 flex items-center justify-center overflow-hidden">
                                {module.custom_icon_url ? (
                                    <img src={module.custom_icon_url} alt={module.name} className="size-full object-cover p-2" />
                                ) : (
                                    <ModuleIcon className="size-6 text-accent-blue" />
                                )}
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-foreground">No hay unidades registradas</h3>
                                <p className="text-xs text-text-muted">
                                    {isTeacher
                                        ? "Aún no has creado ninguna unidad didáctica. ¡Comienza ahora!"
                                        : "No hay unidades publicadas todavía para este módulo."
                                    }
                                </p>
                            </div>
                            {isTeacher && <CreateUnitDialog moduleId={module.id} />}
                        </Card>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={units.map(u => u.id)}
                                strategy={viewMode === "list" ? verticalListSortingStrategy : rectSortingStrategy}
                            >
                                {viewMode === "list" ? (
                                    <div className="flex flex-col gap-4" data-testid="units-list-container">
                                        {units.map((unit) => (
                                            <SortableUnitListItem key={unit.id} unit={unit} userRole={userRole} />
                                        ))}

                                        {isTeacher && (
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
                                ) : (
                                    <div className={cn("grid gap-6", gridColsClass)} data-testid="units-grid-container">
                                        {units.map((unit) => (
                                            <SortableUnitGridItem key={unit.id} unit={unit} userRole={userRole} />
                                        ))}

                                        {isTeacher && (
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
                                        )}
                                    </div>
                                )}
                            </SortableContext>
                        </DndContext>
                    )}
                </TabsContent>

                {/* Alumnos Tab */}
                <TabsContent value="alumnos" className="mt-6">
                    <ModuleStudentsTab moduleId={module.id} initialStudents={initialStudents} />
                </TabsContent>

                {/* Configuración Tab */}
                <TabsContent value="configuracion" className="mt-6">
                    <ModuleSettingsTab module={module} />
                </TabsContent>

                {/* Ranking Tab */}
                <TabsContent value="ranking" className="mt-6">
                    <ModuleLeaderboard moduleId={module.id} userRole={userRole} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
