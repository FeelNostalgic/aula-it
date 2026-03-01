"use client";

import { useState, useEffect } from "react";
import {
    LayoutGrid,
    Settings,
    CheckCircle,
    Map
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

type Activity = {
    id: string;
    unit_id: string;
    title: string;
    description: string | null;
    type: string;
    xp: number;
    order_index: number;
    status?: string | null;
};

interface UnitDetailViewProps {
    unit: Unit;
    module: { id: string, name: string };
    initialActivities: Activity[];
    students: any[];
    submissions: any[];
    userRole: "teacher" | "student";
}

export function UnitDetailView({ unit, module, initialActivities, students, submissions, userRole }: UnitDetailViewProps) {
    const isTeacher = userRole === "teacher";
    const { setSegments } = useBreadcrumb();

    const statusConfig = {
        active: {
            color: "text-accent-green",
            bg: "bg-accent-green/10",
            border: "border-accent-green/30",
            label: "PUBLICADO",
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
    }[unit.status || "draft"];

    // Set breadcrumb segments for the top nav
    useEffect(() => {
        setSegments([
            { label: module.name, href: `/dashboard/modules/${module.id}` },
            { label: unit.name }
        ]);
        return () => setSegments([]);
    }, [module, unit.name, setSegments]);

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
            <Tabs defaultValue="actividades" className="w-full">
                <TabsList className="bg-surface border border-border-subtle rounded-lg p-1 h-auto w-full justify-start overflow-x-auto">
                    <TabsTrigger
                        value="actividades"
                        className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md shrink-0"
                    >
                        <LayoutGrid className="mr-2 size-3.5" />
                        ACTIVIDADES
                    </TabsTrigger>
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

                {/* Actividades Tab */}
                <TabsContent value="actividades" className="mt-6">
                    <UnitActivitiesTab unitId={unit.id} initialActivities={initialActivities} />
                </TabsContent>

                {/* Evaluación Tab */}
                {isTeacher && (
                    <TabsContent value="evaluacion" className="mt-6">
                        <UnitEvaluationTab
                            unitId={unit.id}
                            activities={initialActivities}
                            students={students}
                            submissions={submissions}
                        />
                    </TabsContent>
                )}

                {/* Configuración Tab */}
                {isTeacher && (
                    <TabsContent value="configuracion" className="mt-6">
                        <UnitSettingsTab unit={unit} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
