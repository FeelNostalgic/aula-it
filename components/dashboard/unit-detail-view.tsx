"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    Search,
    Award,
    Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp } from "lucide-react";
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
import { ClassBadgesWidget } from "./class-badges-widget";
import { ClassBadge, StudentBadge } from "@/types/database";
import ClassBadgesManager from "./class-badges-manager";

import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";

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
    grade_weight?: number;
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
    milestones: ClassMilestone[];
    classBadges: ClassBadge[];
    studentBadges: StudentBadge[];
}

export function UnitDetailView({
    unit,
    module,
    activities,
    connections,
    students,
    submissions,
    userRole,
    milestones,
    classBadges,
    studentBadges
}: UnitDetailViewProps) {
    const isTeacher = userRole === "teacher";
    const [viewMode, setViewMode] = useState<'grid' | 'list' | null>(null);
    const [gridCols, setGridCols] = useState(3);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [isMilestoneExpanded, setIsMilestoneExpanded] = useState(true);
    const [isBadgesExpanded, setIsBadgesExpanded] = useState(false);
    const sortedMilestones = [...milestones].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const activeMilestone = sortedMilestones.find(m => m.status === 'active') ||
        [...sortedMilestones].reverse().find(m => m.status === 'completed') || null;

    // Persist view mode and grid cols preference
    useEffect(() => {
        const savedMode = localStorage.getItem('aula-it:unit-view:view-mode') as 'grid' | 'list';
        const savedCols = localStorage.getItem('aula-it:unit-view:grid-cols');
        if (savedMode) setViewMode(savedMode || 'grid');
        else setViewMode('grid');
        if (savedCols) setGridCols(parseInt(savedCols, 10));
    }, []);

    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('aula-it:unit-view:view-mode', mode);
    };

    useEffect(() => {
        if (viewMode) {
            localStorage.setItem('aula-it:unit-view:grid-cols', gridCols.toString());
        }
    }, [gridCols, viewMode]);

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

    const globalBadges = classBadges.filter(b => {
        if (b.activity_id) return false;
        if (isTeacher) return true;
        // For students, show if not hidden OR if earned
        return !b.is_hidden || studentBadges.some(sb => sb.badge_id === b.id);
    });

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

            {/* Unit Header - Title First */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 px-12">
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

            <motion.div layout className="flex flex-col gap-6">
                {(activeMilestone || milestones.some(m => m.status === 'completed')) && (
                    <div className="px-12 relative">
                        <AnimatePresence mode="wait">
                            {isMilestoneExpanded ? (
                                <motion.div
                                    key="milestone-expanded"
                                    layoutId="milestone-section"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                >
                                    <ClassMilestoneWidget 
                                        milestones={milestones} 
                                        activeMilestone={activeMilestone} 
                                        label="Objetivo de la Unidad" 
                                        onToggle={() => setIsMilestoneExpanded(false)}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="milestone-collapsed"
                                    layoutId="milestone-section"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="relative overflow-hidden bg-linear-to-br from-indigo-500/20 via-purple-500/15 to-pink-500/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-accent-blue/40 transition-all shadow-xl group ring-1 ring-white/5"
                                    onClick={() => setIsMilestoneExpanded(true)}
                                >
                                    {/* Decorative background flare */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                                    
                                    <motion.div 
                                        layoutId="milestone-icon"
                                        className="relative z-10 size-10 rounded-xl bg-accent-blue/20 flex items-center justify-center text-accent-blue border border-accent-blue/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                                    >
                                        <Target className="size-5" />
                                    </motion.div>
                                    <div className="flex-1 relative z-10">
                                        <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                                            {activeMilestone ? "Objetivo Actual" : "Objetivos de Unidad"}
                                            <span className="size-1 rounded-full bg-accent-blue animate-pulse" />
                                        </h3>
                                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight opacity-70">Pulsa para ver el progreso del camino</p>
                                    </div>
                                    {activeMilestone && (
                                        <div className="relative z-10 flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-sm group-hover:bg-white/10 transition-colors">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] font-black text-accent-blue uppercase tracking-tighter leading-none mb-1">HITO ACTUAL</span>
                                                <span className="text-xs font-bold text-foreground leading-none">{activeMilestone.title}</span>
                                            </div>
                                            <div className="size-6 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                                                <ChevronRight className="size-3" />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {classBadges && classBadges.length > 0 && (
                    <div className="px-12 relative mt-2">
                        <AnimatePresence mode="wait">
                            {isBadgesExpanded ? (
                                <motion.div
                                    key="badges-expanded"
                                    layoutId="badges-section"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                >
                                    <ClassBadgesWidget 
                                        badges={globalBadges} 
                                        studentBadges={studentBadges} 
                                        isTeacher={isTeacher} 
                                        onToggle={() => setIsBadgesExpanded(false)}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="badges-collapsed"
                                    layoutId="badges-section"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="bg-surface border border-border-subtle rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-accent-amber/30 transition-colors shadow-sm"
                                    onClick={() => setIsBadgesExpanded(true)}
                                >
                                    <motion.div 
                                        layoutId="badges-icon"
                                        className="size-10 rounded-xl bg-accent-amber/10 flex items-center justify-center text-accent-amber"
                                    >
                                        <Award className="size-5" />
                                    </motion.div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Insignias Globales</h3>
                                        <p className="text-xs text-text-muted">Pulsa sobre el icono para expandir</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-text-muted uppercase">Disponibles:</span>
                                        <div className="flex -space-x-2">
                                            {globalBadges.slice(0, 3).map((b, i) => (
                                                <div key={b.id} className="size-6 rounded-full bg-surface border-2 border-background flex items-center justify-center shadow-sm">
                                                    <Award className="size-3 text-accent-amber" />
                                                </div>
                                            ))}
                                            {globalBadges.length > 3 && (
                                                <div className="size-6 rounded-full bg-surface-dark border-2 border-background flex items-center justify-center text-[8px] font-bold text-text-muted">
                                                    +{globalBadges.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

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
                                <TabsTrigger
                                    value="insignias"
                                    className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md shrink-0"
                                >
                                    <Award className="mr-2 size-3.5" />
                                    INSIGNIAS
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
                            studentBadges={studentBadges}
                            gridCols={gridCols}
                            setGridCols={setGridCols}
                            viewModeExternal={viewMode}
                            setViewModeExternal={handleViewModeChange}
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
                            <UnitMilestoneTab unitId={unit.id} initialMilestones={milestones} isTeacher={isTeacher} />
                        </TabsContent>
                    )}

                    {/* Insignias Tab (Teacher Only) */}
                    {isTeacher && (
                        <TabsContent value="insignias" className="mt-6 px-12 pb-12">
                            <ClassBadgesManager 
                                unitId={unit.id} 
                                badges={classBadges} 
                            />
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
            </motion.div>
        </div>
    );
}
