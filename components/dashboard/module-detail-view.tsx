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
    Users,
    Settings,
    GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateUnitDialog } from "./create-unit-dialog";
import { useBreadcrumb } from "./breadcrumb-context";

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
};

type Unit = {
    id: string;
    module_id: string;
    name: string;
    description: string | null;
    order_index: number;
    created_at: string;
};

interface ModuleDetailViewProps {
    module: Module;
    initialUnits: Unit[];
}

export function ModuleDetailView({ module, initialUnits }: ModuleDetailViewProps) {
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const ModuleIcon = ICON_MAP[module.icon] || BookOpen;
    const { setSegments } = useBreadcrumb();

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
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">{module.name}</h1>
                        <p className="text-sm text-text-muted max-w-xl">
                            {module.description || "Sin descripción proporcionada para este módulo."}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="font-mono font-bold tracking-widest text-[10px] h-9 px-4 border-border-subtle text-text-muted hover:text-foreground"
                    >
                        <Users className="mr-2 size-4" />
                        AÑADIR ALUMNOS
                    </Button>
                    <CreateUnitDialog moduleId={module.id} />
                </div>
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
                                if (viewMode === "list") {
                                    return (
                                        <div
                                            key={unit.id}
                                            className="bg-surface-dark border border-border-subtle hover:border-accent-blue/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 group transition-all cursor-pointer shadow-sm hover:shadow-md"
                                        >
                                            {/* Order + Name */}
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
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

                                            {/* Status Badge */}
                                            <div className="shrink-0 flex md:justify-end">
                                                <Badge variant="outline" className="border-border-strong bg-surface text-text-muted gap-1.5 py-1 px-3">
                                                    <span className="size-1.5 rounded-full bg-text-muted" />
                                                    PENDIENTE
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                }

                                // Grid View
                                return (
                                    <Card
                                        key={unit.id}
                                        className="bg-surface-dark border-border-subtle hover:border-accent-blue/50 hover:shadow-lg hover:shadow-accent-blue/5 transition-all group overflow-hidden cursor-pointer rounded-2xl"
                                    >
                                        <div className="p-6 flex flex-col">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="size-12 rounded-xl bg-surface border border-accent-blue/20 shadow-[0_0_15px_rgba(34,211,238,0.1)] flex items-center justify-center group-hover:scale-110 group-hover:bg-accent-blue/10 transition-all">
                                                    <span className="text-lg font-bold text-accent-blue font-mono">{unit.order_index + 1}</span>
                                                </div>
                                                <Badge variant="outline" className="border-border-strong bg-surface text-text-muted gap-1.5 shadow-sm">
                                                    <span className="size-1.5 rounded-full bg-text-muted" />
                                                    PENDIENTE
                                                </Badge>
                                            </div>

                                            {/* Content */}
                                            <div>
                                                <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-accent-blue transition-colors line-clamp-1">
                                                    {unit.name}
                                                </h3>
                                                <p className="text-sm text-text-muted mt-1.5 line-clamp-2">
                                                    {unit.description || "Sin descripción proporcionada para esta unidad."}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* Alumnos Tab (Placeholder) */}
                <TabsContent value="alumnos" className="mt-6">
                    <Card className="bg-surface-dark border-border-subtle border-dashed p-12 text-center flex flex-col items-center gap-4">
                        <div className="size-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
                            <GraduationCap className="size-6 text-accent-blue" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-foreground">Gestión de Alumnos</h3>
                            <p className="text-xs text-text-muted">La gestión de alumnos estará disponible próximamente.</p>
                        </div>
                    </Card>
                </TabsContent>

                {/* Configuración Tab (Placeholder) */}
                <TabsContent value="configuracion" className="mt-6">
                    <Card className="bg-surface-dark border-border-subtle border-dashed p-12 text-center flex flex-col items-center gap-4">
                        <div className="size-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
                            <Settings className="size-6 text-accent-blue" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-foreground">Configuración del Módulo</h3>
                            <p className="text-xs text-text-muted">Aquí podrás cambiar el nombre, descripción, icono y visibilidad del módulo.</p>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
