"use client";

import { useState, useEffect } from "react";
import {
    LayoutGrid,
    Settings,
    CheckCircle,
    Map,
    BookOpen,
    GraduationCap,
    FolderOpen,
    ExternalLink,
    FileText,
    Link as LinkIcon,
    Network,
    Zap,
    ArrowLeft,
    List,
    ChevronRight,
    Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreadcrumb } from "./breadcrumb-context";
import { UnitSettingsTab } from "./unit-settings-tab";
import { UnitActivitiesTab } from "./unit-activities-tab";
import { UnitEvaluationTab } from "./unit-evaluation-tab";
import { UnitResourcesTab } from "./unit-resources-tab";
import Link from "next/link";
import { StudentUnitView } from "./student-unit-view";
import { ResourceIcon } from "./resource-icon";
import { cn } from "@/lib/utils";
import { UnitMilestoneTab } from "./unit-milestone-tab";
import { ClassMilestone } from "@/types/database";
import { ClassMilestoneWidget } from "./class-milestone-widget";

// Remove legacy imports
// import { UnitMapView } from "./unit-map-view";
// import { UnitMapConfigTab } from "./unit-map-config-tab";

type Unit = {
    id: string;
    module_id: string;
    name: string;
    description: string | null;
    order_index: number;
    created_at: string;
    status?: string | null;
    view_type?: string | null;
};

interface Activity {
    id: string;
    unit_id: string; // Keeping unit_id as it was in the original type
    title: string;
    description: string | null;
    type: string;
    xp: number;
    duration: number | null;
    difficulty: string | null;
    status: 'published' | 'blocked' | 'draft';
    order_index: number;
    position_x: number;
    position_y: number;
    logo_url: string | null;
}

interface Connection {
    id: string;
    unit_id: string;
    source_activity_id: string;
    target_activity_id: string;
}

interface UnitDetailViewProps {
    unit: any;
    module: any;
    activities: Activity[];
    connections: Connection[];
    students: any[];
    submissions: any[];
    userRole: 'teacher' | 'student';
    milestone: ClassMilestone | null;
}

export function UnitDetailView({
    unit,
    module,
    activities,
    connections,
    students,
    submissions,
    userRole,
    milestone
}: UnitDetailViewProps) {
    const isTeacher = userRole === "teacher";
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    // Persist view mode preference
    useEffect(() => {
        const savedMode = localStorage.getItem('resourceViewMode') as 'grid' | 'list';
        if (savedMode) setViewMode(savedMode);
    }, []);

    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('resourceViewMode', mode);
    };
    const { setSegments } = useBreadcrumb();

    // Normalize status for robust lookup
    const rawStatus = unit.status?.toLowerCase() || 'draft';
    const normalizedStatus = (rawStatus === 'active' || rawStatus === 'activo') ? 'published' :
        (rawStatus === 'bloqueado' ? 'blocked' :
            (rawStatus === 'borrador' ? 'draft' : rawStatus));

    const statusConfig = {
        published: {
            color: "text-accent-green",
            bg: "bg-size-[100%_2px,3px_100%]",
            border: "border-accent-green/30",
            label: "PUBLICADO",
            dotBg: "bg-accent-green",
            dotAnim: "animate-pulse"
        },
        blocked: {
            color: "text-accent-red",
            bg: "bg-accent-red/10",
            border: "border-accent-red/30",
            label: "BLOQUEADO",
            dotBg: "bg-accent-red",
            dotAnim: ""
        },
        draft: {
            color: "text-accent-orange",
            bg: "bg-accent-orange/10",
            border: "border-accent-orange/30",
            label: "BORRADOR",
            dotBg: "bg-accent-orange",
            dotAnim: ""
        },
    }[normalizedStatus as 'published' | 'blocked' | 'draft'] || {
        color: "text-accent-orange",
        bg: "bg-accent-orange/10",
        border: "border-accent-orange/30",
        label: "BORRADOR",
        dotBg: "bg-accent-orange",
        dotAnim: ""
    };

    // Set breadcrumb segments for the top nav
    useEffect(() => {
        setSegments([
            { label: module.name, href: `/dashboard/modules/${module.id}` },
            { label: unit.name }
        ]);
        return () => setSegments([]);
    }, [module, unit.name, setSegments]);

    // Note: Special student-only entry removed to maintain consistency with teacher UI as requested.

    return (
        <div className="flex flex-col gap-8">

            {/* Unit Header */}
            <div className="flex flex-col gap-6">
                {milestone && (milestone.status === 'active' || milestone.status === 'completed') && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                        <ClassMilestoneWidget milestone={milestone} label="Objetivo de la Unidad" />
                    </div>
                )}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <div className="size-14 rounded-xl bg-surface border border-accent-blue/20 shadow-[0_0_15px_rgba(34,211,238,0.1)] flex items-center justify-center text-accent-blue shrink-0">
                            <Map className="size-7" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">{unit.name}</h1>
                                {statusConfig && (
                                    <Badge variant="outline" className={`${statusConfig.border} ${statusConfig.bg} ${statusConfig.color} gap-1.5 py-1 px-3 shadow-sm`}>
                                        <span className={`size-1.5 rounded-full ${statusConfig.dotBg} ${statusConfig.dotAnim}`} />
                                        {statusConfig.label}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-text-muted max-w-xl">
                                {unit.description || "Sin descripción proporcionada para esta unidad."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue={isTeacher ? "actividades" : (unit.view_type === 'map' ? "map" : "actividades")} className="w-full">
                    <div className="px-12 mb-6">
                        <TabsList className="bg-surface border border-border-subtle rounded-lg p-1 h-auto inline-flex max-w-full justify-start overflow-x-auto">
                            {(isTeacher || (unit.view_type || 'list') === 'list') && (
                                <TabsTrigger
                                    value="actividades"
                                    className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md shrink-0"
                                >
                                    <BookOpen className="mr-2 size-3.5" />
                                    RETOS
                                </TabsTrigger>
                            )}

                            {!isTeacher && (
                                <TabsTrigger
                                    value="recursos"
                                    className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md shrink-0"
                                >
                                    <FolderOpen className="mr-2 size-3.5" />
                                    RECURSOS
                                </TabsTrigger>
                            )}

                            {isTeacher && (
                                <TabsTrigger
                                    value="recursos-edit"
                                    className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md shrink-0"
                                >
                                    <FolderOpen className="mr-2 size-3.5" />
                                    RECURSOS
                                </TabsTrigger>
                            )}

                            {(isTeacher || unit.view_type === 'map') && (
                                <TabsTrigger
                                    value="map"
                                    className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md shrink-0"
                                >
                                    <GraduationCap className="mr-2 size-3.5" />
                                    MAPA
                                </TabsTrigger>
                            )}

                            {isTeacher && (
                                <TabsTrigger
                                    value="hito"
                                    className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md shrink-0"
                                >
                                    <CheckCircle className="mr-2 size-3.5" />
                                    HITO
                                </TabsTrigger>
                            )}

                            {isTeacher && (
                                <>
                                    <TabsTrigger
                                        value="evaluacion"
                                        className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md shrink-0"
                                    >
                                        <CheckCircle className="mr-2 size-3.5" />
                                        EVALUACIÓN
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="configuracion"
                                        className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md shrink-0"
                                    >
                                        <Settings className="mr-2 size-3.5" />
                                        CONFIGURACIÓN
                                    </TabsTrigger>
                                </>
                            )}
                        </TabsList>
                    </div>

                    {/* Actividades Tab */}
                    <TabsContent value="actividades" className="mt-6 px-12 pb-12">
                        <UnitActivitiesTab
                            unitId={unit.id}
                            initialActivities={activities}
                            isTeacher={isTeacher}
                            submissions={submissions}
                        />
                    </TabsContent>

                    {/* Recursos Tab */}
                    {!isTeacher && (
                        <TabsContent value="recursos" className="mt-6 px-12 pb-12">
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-foreground">Recursos de la Unidad</h3>
                                        <p className="text-sm text-text-muted">Material complementario proporcionado por el profesor.</p>
                                    </div>
                                    <div className="flex items-center gap-2 p-1 bg-surface border border-border-subtle rounded-xl shadow-sm self-end md:self-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleViewModeChange('grid')}
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
                                            onClick={() => handleViewModeChange('list')}
                                            className={cn(
                                                "h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                                viewMode === 'list' ? "bg-background text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
                                            )}
                                        >
                                            <List className="size-3.5 mr-2" />
                                            Lista
                                        </Button>
                                    </div>
                                </div>

                                {/* Breadcrumbs / Navegación */}
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <button
                                        onClick={() => setCurrentFolderId(null)}
                                        className={cn(
                                            "hover:text-accent-blue transition-colors",
                                            currentFolderId === null ? "text-foreground" : "text-text-muted"
                                        )}
                                    >
                                        Ficheros
                                    </button>
                                    {(() => {
                                        const crumbs = [];
                                        let tempId = currentFolderId;
                                        const resources = unit.resources || [];
                                        while (tempId) {
                                            const folder = resources.find((r: any) => r.id === tempId);
                                            if (folder) {
                                                crumbs.unshift(folder);
                                                tempId = folder.parentId || null;
                                            } else {
                                                break;
                                            }
                                        }
                                        return crumbs.map((crumb: any) => (
                                            <div key={crumb.id} className="flex items-center gap-2">
                                                <ChevronRight className="size-4 text-text-muted/50" />
                                                <button
                                                    onClick={() => setCurrentFolderId(crumb.id)}
                                                    className={cn(
                                                        "hover:text-accent-blue transition-colors",
                                                        crumb.id === currentFolderId ? "text-foreground" : "text-text-muted"
                                                    )}
                                                >
                                                    {crumb.title || "Sin título"}
                                                </button>
                                            </div>
                                        ));
                                    })()}
                                </div>

                                {(() => {
                                    const currentResources = (unit.resources || [])
                                        .filter((r: any) => (r.parentId || null) === currentFolderId);

                                    if (currentResources.length === 0) {
                                        return (
                                            <div className="py-20 bg-surface/30 border border-dashed border-border-subtle rounded-3xl flex flex-col items-center justify-center text-center">
                                                <Search className="size-10 text-text-muted/20 mb-4" />
                                                <p className="text-text-muted font-medium">Esta carpeta está vacía.</p>
                                                <p className="text-xs text-text-muted/60 mt-1">Vuelve atrás o espera a que el profesor añada contenido.</p>
                                            </div>
                                        );
                                    }

                                    if (viewMode === 'grid') {
                                        return (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {currentResources.map((resource: any) => {
                                                    const isFolder = resource.type === 'folder';
                                                    return (
                                                        <div
                                                            key={resource.id}
                                                            onClick={() => isFolder ? setCurrentFolderId(resource.id) : window.open(resource.url, '_blank')}
                                                            className="group p-6 bg-surface border border-border-subtle rounded-3xl hover:border-accent-blue/30 hover:shadow-xl transition-all duration-300 flex flex-col items-start gap-4 cursor-pointer"
                                                        >
                                                            <div className="size-12 group-hover:scale-110 transition-transform">
                                                                <ResourceIcon type={resource.type} mimeType={resource.mimeType} className="rounded-2xl" />
                                                            </div>
                                                            <div className="space-y-1 text-left w-full">
                                                                <h4 className="font-bold text-foreground group-hover:text-accent-blue transition-colors truncate w-full">{resource.title || "Sin título"}</h4>
                                                                <p className="text-xs text-text-muted line-clamp-2">{resource.description || "Sin descripción"}</p>
                                                            </div>
                                                            <div className="w-full pt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-muted/50">
                                                                <span>{isFolder ? 'Carpeta' : (resource.type === 'file' ? 'Archivo' : 'Enlace')}</span>
                                                                {!isFolder && <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-2">
                                            {currentResources.map((resource: any) => {
                                                const isFolder = resource.type === 'folder';
                                                return (
                                                    <div
                                                        key={resource.id}
                                                        onClick={() => isFolder ? setCurrentFolderId(resource.id) : window.open(resource.url, '_blank')}
                                                        className="group p-4 bg-surface border border-border-subtle rounded-xl hover:border-accent-blue/30 flex items-center gap-4 transition-all cursor-pointer"
                                                    >
                                                        <div className="size-10 shrink-0">
                                                            <ResourceIcon type={resource.type} mimeType={resource.mimeType} className="rounded-lg" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-foreground group-hover:text-accent-blue transition-colors truncate">
                                                                {resource.title || "Sin título"}
                                                            </h4>
                                                            <p className="text-[10px] text-text-muted truncate">
                                                                {resource.description || (isFolder ? "Carpeta de recursos" : "Sin descripción")}
                                                            </p>
                                                        </div>
                                                        <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-text-muted/40">
                                                            <span>{isFolder ? 'Carpeta' : (resource.type === 'file' ? 'Archivo' : 'Enlace')}</span>
                                                            {!isFolder && <ExternalLink className="size-3" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </TabsContent>
                    )}

                    {/* Mapa Tab */}
                    <TabsContent value="map" className="mt-0 border-white/3 outline-none">
                        <div className="p-8">
                            <div className="max-w-4xl mx-auto space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-surface-dark/50 border border-border-strong rounded-3xl p-8 backdrop-blur-sm">
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                                            Mapa Interactivo
                                        </h3>
                                        <p className="text-text-muted text-sm max-w-md leading-relaxed">
                                            Explora el camino de aprendizaje, visualiza las conexiones entre retos y sigue tu progreso en un entorno inmersivo.
                                        </p>
                                    </div>
                                    <Link href={`/units/${unit.id}/map`}>
                                        <Button className="bg-accent-blue hover:bg-accent-blue/90 text-white font-black uppercase tracking-widest h-14 px-8 rounded-2xl shadow-lg shadow-accent-blue/20 group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                                            {isTeacher ? 'Abrir Creador de Mapa' : 'Explorar Mapa'}
                                            <ExternalLink className="size-4 ml-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </Button>
                                    </Link>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-surface-dark border border-border-strong rounded-2xl p-6 space-y-4">
                                        <div className="size-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue">
                                            <Network className="size-5" />
                                        </div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-tight">Estructura No Lineal</h4>
                                        <p className="text-xs text-text-muted leading-relaxed">
                                            Visualiza cómo se desbloquean los retos y las rutas alternativas.
                                        </p>
                                    </div>
                                    <div className="bg-surface-dark border border-border-strong rounded-2xl p-6 space-y-4">
                                        <div className="size-10 rounded-xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center text-accent-amber">
                                            <Zap className="size-5" />
                                        </div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-tight">Entorno IDE</h4>
                                        <p className="text-xs text-text-muted leading-relaxed">
                                            Experiencia inmersiva a pantalla completa sin distracciones.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Hito Tab (Teacher Only) */}
                    {isTeacher && (
                        <TabsContent value="hito" className="mt-6 px-12 pb-12">
                            <UnitMilestoneTab unitId={unit.id} milestone={milestone} isTeacher={isTeacher} />
                        </TabsContent>
                    )}

                    {/* Evaluación Tab */}
                    {isTeacher && (
                        <TabsContent value="evaluacion" className="mt-6 px-12 pb-12">
                            <UnitEvaluationTab
                                unitId={unit.id}
                                activities={activities}
                                students={students}
                                submissions={submissions}
                            />
                        </TabsContent>
                    )}

                    {/* Configuración Tab */}
                    {isTeacher && (
                        <TabsContent value="configuracion" className="mt-6 px-12 pb-12">
                            <UnitSettingsTab unit={unit} />
                        </TabsContent>
                    )}

                    {/* Edición de Recursos (Teacher) */}
                    {isTeacher && (
                        <TabsContent value="recursos-edit" className="mt-6 px-12 pb-12">
                            <UnitResourcesTab
                                unitId={unit.id}
                                initialResources={unit.resources || []}
                            />
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
}
