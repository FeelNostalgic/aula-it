"use client";

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
    ShieldAlert,
    UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CreateUnitDialog } from "@/components/dashboard/units/create-unit-dialog";
import { useBreadcrumb } from "@/components/dashboard/layout/breadcrumb-context";
import ModuleStudentsTab from "./module-students-tab";
import { ModuleSettingsTab } from "./module-settings-tab";
import { cn } from "@/lib/utils";
import { useModuleGamification } from "@/hooks/use-gamification";
import { RankBadge } from "@/components/dashboard/badges/rank-badge";
import { ModuleLeaderboard } from "./module-leaderboard";
import { ModuleCollaboratorsTab } from "./module-collaborators-dialog";
import { getModuleIconVisualProps } from "@/components/dashboard/modules/module-identity";
import { ModuleGroupsTab } from "./module-groups-tab";
import { GroupSelfEnrollmentCard } from "./group-self-enrollment-card";
import {
    getModuleRoleLabel,
    getModuleRoleTooltip,
    getRestrictedActionMessage,
    type ModuleCollaboratorRole,
    type ModulePermissions,
} from "@/lib/module-collaborator-defs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { SortableUnitListItem, SortableUnitGridItem } from "@/components/dashboard/units/sortable-unit-item";

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
    icon_style?: string | null;
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
    moduleRole: ModuleCollaboratorRole | null;
    modulePermissions: ModulePermissions | null;
    moduleXp?: number;
}

export function ModuleDetailView({
    module,
    initialUnits,
    initialStudents,
    userRole,
    moduleRole,
    modulePermissions,
    moduleXp = 0,
}: ModuleDetailViewProps) {
    const isTeacher = userRole === "teacher";
    const effectiveRole = moduleRole;
    const isCreator = effectiveRole === "creator";
    const canEditModuleContent = modulePermissions?.canEditModuleContent ?? isTeacher;
    const canManageStudents = modulePermissions?.canManageStudents ?? isTeacher;
    const canManageCollaborators = modulePermissions?.canManageCollaborators ?? isCreator;
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
    const moduleIconVisual = getModuleIconVisualProps(module.icon_style);
    const { setSegments } = useBreadcrumb();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !canEditModuleContent) return;

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
    const moduleTabs = [
        { value: "dashboard", label: "Dashboard", icon: LayoutGrid, visible: true },
        { value: "ranking", label: "Ranking", icon: Trophy, visible: true },
        { value: "alumnos", label: "Alumnos", icon: GraduationCap, visible: isTeacher },
        { value: "profesores", label: "Profesores", icon: Users, visible: isTeacher },
        { value: "configuracion", label: "Configuración", icon: Settings, visible: modulePermissions?.canManageModuleSettings !== false },
    ] as const;
    const visibleModuleTabs = moduleTabs.filter((tab) => tab.visible);

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

    useEffect(() => {
        if (!visibleModuleTabs.some((tab) => tab.value === activeTab)) {
            setActiveTab("dashboard");
        }
    }, [activeTab, isTeacher, modulePermissions?.canManageModuleSettings]);

    return (
        <div className="-mx-24 -my-8 flex min-h-[calc(100vh-68px)] bg-background">
            <aside className="w-[60px] shrink-0 self-stretch border-r border-border/50 bg-background">
                <div className="flex h-full flex-col items-center gap-3 py-4">
                    <TooltipProvider>
                        {visibleModuleTabs.map((tab) => {
                            const TabIcon = tab.icon;
                            const isActive = activeTab === tab.value;

                            return (
                                <Tooltip key={tab.value}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setActiveTab(tab.value)}
                                            className={cn(
                                                "relative size-10 rounded-xl transition-all duration-300",
                                                isActive
                                                    ? "bg-accent-blue/10 text-accent-blue shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                                                    : "text-text-muted hover:bg-accent/10 hover:text-foreground"
                                            )}
                                        >
                                            <TabIcon className="size-5" />
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent-blue shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        {tab.label}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </TooltipProvider>
                </div>
            </aside>

            <div className="min-w-0 flex-1 px-8 py-8 sm:px-10">
                {/* Module Header */}
                <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-5">
                        {module.custom_icon_url ? (
                            <div className="size-14 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-surface border border-accent-blue/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                                <img src={module.custom_icon_url} alt={module.name} className="size-full object-cover p-2" />
                            </div>
                        ) : (
                            <div className="size-14 rounded-xl bg-surface border border-accent-blue/20 shadow-[0_0_15px_rgba(34,211,238,0.1)] flex items-center justify-center shrink-0">
                                <ModuleIcon className={cn("size-7", moduleIconVisual.className)} style={moduleIconVisual.style} />
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
                                {isTeacher && effectiveRole && effectiveRole !== "creator" && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 gap-1.5 py-1 px-3 shadow-sm cursor-help">
                                                    <ShieldAlert className="size-3.5" />
                                                    {getModuleRoleLabel(effectiveRole)}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                {getModuleRoleTooltip(effectiveRole)}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
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
                    {/* Dashboard Tab (Units) */}
                    <TabsContent value="dashboard" className="mt-0">
                    {/* View Mode Toggle + Count */}
                    <div className="flex flex-col gap-4 mb-6 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold tracking-tight text-foreground">Unidades Didácticas</h2>
                            <Badge variant="outline" className="border-border-subtle text-text-muted text-[10px] font-mono font-bold">
                                {initialUnits.length}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {viewMode === "grid" && (
                                <div className="flex items-center gap-2 mr-2">
                                    <div className="flex items-center bg-muted/30 dark:bg-surface-dark/50 p-1 rounded-xl border border-border/50">
                                        {([2, 3, 4, 5] as const).map((count) => (
                                            <Button
                                                key={count}
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setGridCols(count)}
                                                className={cn(
                                                    "h-8 w-8 p-0 rounded-lg transition-all text-xs font-bold",
                                                    gridCols === count ? "bg-background text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
                                                )}
                                            >
                                                {count}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-2 p-1 bg-surface border border-border-subtle rounded-xl shadow-sm self-end md:self-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                        viewMode === 'grid' ? "bg-background text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
                                    )}
                                >
                                    <LayoutGrid className="size-3.5 mr-2" />
                                    Grid
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                        viewMode === 'list' ? "bg-background text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
                                    )}
                                >
                                    <List className="size-3.5 mr-2" />
                                    Lista
                                </Button>
                            </div>
                            {isTeacher && (
                                canEditModuleContent ? (
                                    <CreateUnitDialog moduleId={module.id}>
                                        <Button className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-9 px-4 uppercase">
                                            <Plus className="mr-2 size-4" />
                                            UNIDAD DIDÁCTICA
                                        </Button>
                                    </CreateUnitDialog>
                                ) : (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span>
                                                    <Button disabled className="font-mono font-bold tracking-widest text-[10px] h-9 px-4 uppercase">
                                                        <Lock className="mr-2 size-4" />
                                                        UNIDAD DIDÁCTICA
                                                    </Button>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>{getRestrictedActionMessage("canEditModuleContent", effectiveRole ?? "viewer")}</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )
                            )}
                        </div>
                    </div>

                    {units.length === 0 ? (
                        <Card className="bg-surface-dark border-border-subtle border-dashed p-12 text-center flex flex-col items-center gap-4">
                            <div className="size-12 rounded-full bg-accent-blue/10 flex items-center justify-center overflow-hidden">
                                {module.custom_icon_url ? (
                                    <img src={module.custom_icon_url} alt={module.name} className="size-full object-cover p-2" />
                                ) : (
                                    <ModuleIcon className={cn("size-6", moduleIconVisual.className)} style={moduleIconVisual.style} />
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
                             {isTeacher && canEditModuleContent && <CreateUnitDialog moduleId={module.id} />}
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
                                            <SortableUnitListItem key={unit.id} unit={unit} userRole={userRole} moduleRole={effectiveRole} canEditContent={canEditModuleContent} />
                                        ))}

                                        {isTeacher && canEditModuleContent && (
                                            <CreateUnitDialog moduleId={module.id}>
                                                <button className="bg-transparent border-2 border-dashed border-border-subtle hover:border-accent-blue/50 rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all group hover:bg-accent-blue/5">
                                                    <div className="size-10 rounded-lg bg-surface border border-border-subtle group-hover:border-accent-blue/30 group-hover:bg-accent-blue/10 flex items-center justify-center transition-all shrink-0">
                                                        <Plus className="size-4 text-text-muted group-hover:text-accent-blue transition-colors" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-bold text-foreground group-hover:text-accent-blue transition-colors">Nueva unidad didáctica</p>
                                                        <p className="text-xs text-text-muted">Crear contenido didáctico</p>
                                                    </div>
                                                </button>
                                            </CreateUnitDialog>
                                        )}
                                    </div>
                                ) : (
                                    <div className={cn("grid gap-6", gridColsClass)} data-testid="units-grid-container">
                                        {units.map((unit) => (
                                            <SortableUnitGridItem key={unit.id} unit={unit} userRole={userRole} moduleRole={effectiveRole} canEditContent={canEditModuleContent} />
                                        ))}

                                        {isTeacher && canEditModuleContent && (
                                            <CreateUnitDialog moduleId={module.id}>
                                                <button className="bg-transparent border-2 border-dashed border-border-subtle hover:border-accent-blue/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group min-h-[180px] hover:bg-accent-blue/5">
                                                    <div className="size-12 rounded-full bg-surface border border-border-subtle group-hover:border-accent-blue/30 group-hover:bg-accent-blue/10 flex items-center justify-center transition-all">
                                                        <Plus className="size-5 text-text-muted group-hover:text-accent-blue transition-colors" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-bold text-foreground group-hover:text-accent-blue transition-colors">Nueva unidad didáctica</p>
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
                    <TabsContent value="alumnos" className="mt-0">
                        <ModuleStudentsTab
                            moduleId={module.id}
                            initialStudents={initialStudents}
                            canManageStudents={canManageStudents}
                            restrictionMessage={effectiveRole ? getRestrictedActionMessage("canManageStudents", effectiveRole) : null}
                        />
                    </TabsContent>

                    <TabsContent value="profesores" className="mt-0">
                        <ModuleCollaboratorsTab
                            moduleId={module.id}
                            canManageCollaborators={canManageCollaborators}
                            moduleRole={effectiveRole}
                        />
                    </TabsContent>

                    {/* Configuración Tab */}
                    {modulePermissions?.canManageModuleSettings !== false && (
                        <TabsContent value="configuracion" className="mt-0">
                            <ModuleSettingsTab
                                module={module}
                                moduleRole={effectiveRole}
                                modulePermissions={modulePermissions}
                            />
                        </TabsContent>
                    )}

                    {/* Ranking Tab */}
                    <TabsContent value="ranking" className="mt-0">
                        <ModuleLeaderboard moduleId={module.id} userRole={userRole} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
