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
    Plus,
    Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateUnitDialog } from "@/components/dashboard/units/create-unit-dialog";
import { cn } from "@/lib/utils";
import {
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
    closestCenter,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { reorderUnits } from "@/app/dashboard/actions";
import { toast } from "sonner";
import { useTransition } from "react";
import { SortableUnitListItem, SortableUnitGridItem } from "@/components/dashboard/units/sortable-unit-item";
import { getModuleIconVisualProps } from "@/components/dashboard/modules/module-identity";

const ICON_MAP: Record<string, any> = {
    BookOpen, Brain, Code, Network, Database, Terminal,
    Globe, Cpu, Shield, Smartphone, Monitor, Cloud,
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
    next_due_step?: { title: string; due_date: string } | null;
    latest_activity?: { id: string; title: string; status: string } | null;
    activities?: { id: string; activity_submissions: { id: string; status: string }[] }[];
};

interface ModuleDashboardViewProps {
    module: Module;
    initialUnits: Unit[];
    userRole: "teacher" | "student";
    moduleRole: ModuleCollaboratorRole | null;
    modulePermissions: ModulePermissions | null;
}

export function ModuleDashboardView({
    module,
    initialUnits,
    userRole,
    moduleRole,
    modulePermissions,
}: ModuleDashboardViewProps) {
    const isTeacher = userRole === "teacher";
    const effectiveRole = moduleRole;
    const canEditModuleContent = modulePermissions?.canEditModuleContent ?? isTeacher;

    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [gridCols, setGridCols] = useState(3);
    const [units, setUnits] = useState<Unit[]>([]);
    const [, startTransition] = useTransition();

    const ModuleIcon = ICON_MAP[module.icon] || BookOpen;
    const moduleIconVisual = getModuleIconVisualProps(module.icon_style);

    // Persistence: load from localStorage
    useEffect(() => {
        const savedView = localStorage.getItem("aula-it:module-view:view-mode") as "grid" | "list";
        const savedCols = localStorage.getItem("aula-it:module-view:grid-cols");
        if (savedView) setViewMode(savedView);
        if (savedCols) setGridCols(parseInt(savedCols, 10));
    }, []);

    useEffect(() => {
        if (viewMode) localStorage.setItem("aula-it:module-view:view-mode", viewMode);
    }, [viewMode]);

    useEffect(() => {
        if (isTeacher) localStorage.setItem("aula-it:module-view:grid-cols", gridCols.toString());
    }, [gridCols, isTeacher]);

    useEffect(() => {
        setUnits([...initialUnits].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
    }, [initialUnits]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !canEditModuleContent) return;

        const oldIndex = units.findIndex((u) => u.id === active.id);
        const newIndex = units.findIndex((u) => u.id === over.id);
        const reordered = arrayMove(units, oldIndex, newIndex);
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

    const gridColsClass =
        { 2: "md:grid-cols-2 lg:grid-cols-2", 3: "md:grid-cols-2 lg:grid-cols-3", 4: "md:grid-cols-3 lg:grid-cols-4", 5: "md:grid-cols-4 lg:grid-cols-5" }[
            gridCols as 2 | 3 | 4 | 5
        ] || "md:grid-cols-2 lg:grid-cols-3";

    return (
        <>
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
                            onClick={() => setViewMode("grid")}
                            className={cn(
                                "h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
                            )}
                        >
                            <LayoutGrid className="size-3.5 mr-2" />
                            Grid
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
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
                                : "No hay unidades publicadas todavía para este módulo."}
                        </p>
                    </div>
                    {isTeacher && canEditModuleContent && <CreateUnitDialog moduleId={module.id} />}
                </Card>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext
                        items={units.map((u) => u.id)}
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
        </>
    );
}
