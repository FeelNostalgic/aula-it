"use client";

import { useEffect } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useUIStore } from "@/lib/store/ui-store";
import { useBreadcrumb } from "../layout/breadcrumb-context";
import { UnitTeacherHeader } from "./unit-teacher-header";
import { UnitTeacherNav } from "./unit-teacher-nav";
import type { ModuleCollaboratorRole, ModulePermissions } from "@/lib/module-collaborator-defs";

const FULLSCREEN_SEGMENTS: string[] = [];

const SEGMENT_LABELS: Record<string, string> = {
    retos: "Retos",
    recursos: "Recursos",
    objetivos: "Objetivos",
    insignias: "Insignias",
    evaluacion: "Evaluación",
    configuracion: "Configuración",
};

interface UnitLayoutShellProps {
    unit: any;
    module: any;
    moduleRole?: ModuleCollaboratorRole | null;
    modulePermissions?: ModulePermissions | null;
    children: React.ReactNode;
}

export function UnitLayoutShell({ unit, module, moduleRole, modulePermissions, children }: UnitLayoutShellProps) {
    const segment = useSelectedLayoutSegment();
    const { setIsFullscreen } = useUIStore();
    const { setSegments } = useBreadcrumb();
    const isFullscreen = FULLSCREEN_SEGMENTS.includes(segment ?? "");
    const showHeader = segment === null || segment === "retos";

    useEffect(() => {
        if (isFullscreen) {
            setIsFullscreen(true);
            return () => setIsFullscreen(false);
        }
    }, [isFullscreen, setIsFullscreen]);

    useEffect(() => {
        const segments: { label: string; href?: string }[] = [
            { label: module.name, href: `/dashboard/modules/${module.id}` },
            { label: unit.name, href: `/dashboard/units/${unit.id}/retos` },
        ];
        if (segment && segment !== "retos") {
            segments.push({ label: SEGMENT_LABELS[segment] ?? segment });
        }
        setSegments(segments);
        return () => setSegments([]);
    }, [module.id, module.name, segment, setSegments, unit.id, unit.name]);

    if (isFullscreen) {
        return (
            <div className="-mx-24 -my-8 flex min-h-[calc(100vh-68px)] bg-background">
                <UnitTeacherNav unitId={unit.id} modulePermissions={modulePermissions ?? null} />
                <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="h-full overflow-hidden px-8 py-8 sm:px-10">
                        {showHeader && (
                            <div className="mb-8">
                                <UnitTeacherHeader unit={unit} moduleRole={moduleRole ?? null} />
                            </div>
                        )}
                        <div className="min-h-0 overflow-hidden">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="-mx-24 -my-8 flex min-h-[calc(100vh-68px)] bg-background">
            <UnitTeacherNav unitId={unit.id} modulePermissions={modulePermissions ?? null} />
            <div className="min-w-0 flex-1 overflow-y-auto px-8 py-8 sm:px-10">
                {showHeader && (
                    <div className="mb-8">
                        <UnitTeacherHeader unit={unit} moduleRole={moduleRole ?? null} />
                    </div>
                )}
                <div className="flex-1">{children}</div>
            </div>
        </div>
    );
}
