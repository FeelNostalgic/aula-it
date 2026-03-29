"use client";

import { useEffect, useState } from "react";
import { Map } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useBreadcrumb } from "@/components/dashboard/layout/breadcrumb-context";
import { getStudentUnitNavigationItems } from "./unit-navigation-items";
import { UnitNavigationRail } from "./unit-navigation-rail";
import { UnitResourceBrowser } from "./unit-resource-browser";

interface StudentUnitResourcesPageProps {
    unit: any;
    module: any;
}

export function StudentUnitResourcesPage({ unit, module }: StudentUnitResourcesPageProps) {
    const { setSegments } = useBreadcrumb();
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [gridCols, setGridCols] = useState(3);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    useEffect(() => {
        setSegments([
            { label: module.name, href: `/dashboard/modules/${module.id}` },
            { label: unit.name, href: `/dashboard/units/${unit.id}` },
            { label: "Recursos" },
        ]);

        const savedMode = localStorage.getItem("aula-it:unit-view:view-mode") as "grid" | "list";
        const savedCols = localStorage.getItem("aula-it:unit-view:grid-cols");
        if (savedMode) setViewMode(savedMode);
        if (savedCols) setGridCols(parseInt(savedCols, 10));

        return () => setSegments([]);
    }, [module.id, module.name, setSegments, unit.id, unit.name]);

    useEffect(() => {
        localStorage.setItem("aula-it:unit-view:view-mode", viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem("aula-it:unit-view:grid-cols", gridCols.toString());
    }, [gridCols]);

    const items = getStudentUnitNavigationItems({ unitId: unit.id, viewType: unit.view_type });

    const rawStatus = unit.status?.toLowerCase() || "draft";
    const normalizedStatus = (rawStatus === "active" || rawStatus === "activo") ? "published" :
        (rawStatus === "bloqueado" ? "blocked" : (rawStatus === "borrador" ? "draft" : rawStatus));
    const statusConfig = {
        published: {
            color: "text-accent-green",
            bg: "bg-size-[100%_2px,3px_100%]",
            border: "border-accent-green/30",
            label: "PUBLICADO",
            dotBg: "bg-accent-green",
            dotAnim: "animate-pulse",
        },
        blocked: {
            color: "text-accent-red",
            bg: "bg-accent-red/10",
            border: "border-accent-red/30",
            label: "BLOQUEADO",
            dotBg: "bg-accent-red",
            dotAnim: "",
        },
        draft: {
            color: "text-accent-orange",
            bg: "bg-accent-orange/10",
            border: "border-accent-orange/30",
            label: "BORRADOR",
            dotBg: "bg-accent-orange",
            dotAnim: "",
        },
    }[normalizedStatus as "published" | "blocked" | "draft"] ?? {
        color: "text-accent-orange",
        bg: "bg-accent-orange/10",
        border: "border-accent-orange/30",
        label: "BORRADOR",
        dotBg: "bg-accent-orange",
        dotAnim: "",
    };

    return (
        <div className="-mx-24 -my-8 flex min-h-[calc(100vh-68px)] bg-background">
            <UnitNavigationRail items={items} />
            <div className="min-w-0 flex-1 overflow-y-auto px-8 py-8 sm:px-10">
                <div className="mb-8 flex items-start gap-5">
                    <div className="size-14 rounded-xl bg-surface border border-accent-blue/20 shadow-[0_0_15px_rgba(34,211,238,0.1)] flex items-center justify-center text-accent-blue shrink-0">
                        <Map className="size-7" />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">{unit.name}</h1>
                            <Badge variant="outline" className={`${statusConfig.border} ${statusConfig.bg} ${statusConfig.color} gap-1.5 py-1 px-3 shadow-sm`}>
                                <span className={`size-1.5 rounded-full ${statusConfig.dotBg} ${statusConfig.dotAnim}`} />
                                {statusConfig.label}
                            </Badge>
                        </div>
                        <p className="text-sm text-text-muted max-w-xl">
                            {unit.description || "Sin descripción proporcionada para esta unidad."}
                        </p>
                    </div>
                </div>

                <UnitResourceBrowser
                    resources={unit.resources || []}
                    currentFolderId={currentFolderId}
                    onFolderChange={setCurrentFolderId}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    gridCols={gridCols}
                    onGridColsChange={setGridCols}
                    title="Recursos de la Unidad"
                    description="Material complementario proporcionado por el profesor."
                />
            </div>
        </div>
    );
}
