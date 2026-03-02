"use client";

import { useState, useEffect } from "react";
import {
    LayoutGrid,
    Settings,
    CheckCircle,
    Map,
    BookOpen,
    GraduationCap,
    FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreadcrumb } from "./breadcrumb-context";
import { UnitSettingsTab } from "./unit-settings-tab";
import { UnitActivitiesTab } from "./unit-activities-tab";
import { UnitEvaluationTab } from "./unit-evaluation-tab";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UnitMapView } from "./unit-map-view";
import { UnitMapConfigTab } from "./unit-map-config-tab";
import { StudentUnitView } from "./student-unit-view";

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
}

export function UnitDetailView({
    unit,
    module,
    activities,
    connections,
    students,
    submissions,
    userRole
}: UnitDetailViewProps) {
    const isTeacher = userRole === "teacher";
    const { setSegments } = useBreadcrumb();

    // Normalize status for robust lookup
    const rawStatus = unit.status?.toLowerCase() || 'draft';
    const normalizedStatus = (rawStatus === 'active' || rawStatus === 'activo') ? 'published' :
        (rawStatus === 'bloqueado' ? 'blocked' :
            (rawStatus === 'borrador' ? 'draft' : rawStatus));

    const statusConfig = {
        published: {
            color: "text-accent-green",
            bg: "bg-accent-green/10",
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

            {/* Top Bar with Back Button */}
            <div>
                <Link href={`/dashboard/modules/${module.id}`}>
                    <Button variant="ghost" className="pl-0 text-text-muted hover:text-foreground">
                        <ArrowLeft className="mr-2 size-4" />
                        Volver a {module.name}
                    </Button>
                </Link>
            </div>

            {/* Unit Header */}
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
            <Tabs defaultValue={unit.view_type === 'map' ? "mapa" : "actividades"} className="w-full">
                <div className="px-12 mb-6">
                    <TabsList className="bg-surface border border-border-subtle rounded-lg p-1 h-auto inline-flex max-w-full justify-start overflow-x-auto">
                        {/* Only show "RETOS" if view_type is 'list' or if teacher */}
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

                        {/* Only show "MAPA" if view_type is 'map' or if teacher */}
                        {(isTeacher || unit.view_type === 'map') && (
                            <TabsTrigger
                                value="mapa"
                                className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md shrink-0"
                            >
                                <GraduationCap className="mr-2 size-3.5" />
                                MAPA
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
                    />
                </TabsContent>

                {/* Recursos Tab (Student Only) */}
                {!isTeacher && (
                    <TabsContent value="recursos" className="mt-6 px-12 pb-12">
                        <div className="bg-surface border border-dashed border-border-strong rounded-2xl flex flex-col items-center justify-center py-32 text-center">
                            <div className="size-16 rounded-full bg-accent-blue/5 border border-accent-blue/20 flex items-center justify-center mb-6">
                                <FolderOpen className="size-8 text-accent-blue/40" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">Recursos de la Unidad</h3>
                            <p className="text-text-muted text-sm max-w-xs">
                                Próximamente tendrás acceso a todo el material complementario aquí.
                            </p>
                        </div>
                    </TabsContent>
                )}

                {/* Mapa Tab */}
                <TabsContent value="mapa" className="mt-6 flex-1 min-h-0">
                    <div className="h-full flex flex-col px-12 pb-12">
                        {isTeacher ? (
                            <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px] overflow-hidden">
                                <div className="w-full lg:w-80 shrink-0">
                                    <UnitMapConfigTab
                                        unitId={unit.id}
                                        activities={activities}
                                        connections={connections}
                                    />
                                </div>
                                <div className="flex-1 bg-surface-dark border border-border-strong rounded-2xl overflow-hidden relative">
                                    <UnitMapView
                                        activities={activities as any}
                                        connections={connections}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 bg-surface-dark border border-border-strong rounded-2xl overflow-hidden relative min-h-[600px]">
                                <UnitMapView
                                    activities={activities as any}
                                    connections={connections}
                                    onStartActivity={(id) => {
                                        window.location.href = `/dashboard/activities/${id}`;
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </TabsContent>

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
            </Tabs>
        </div>
    );
}
