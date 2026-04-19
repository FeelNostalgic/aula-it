"use client";

import { useEffect } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useBreadcrumb } from "../layout/breadcrumb-context";
import { ModuleNav } from "./module-nav";
import type { ModuleCollaboratorRole, ModulePermissions } from "@/lib/module-collaborator-defs";

const SEGMENT_LABELS: Record<string, string> = {
    dashboard: "Dashboard",
    ranking: "Ranking",
    grupos: "Grupos",
    alumnos: "Alumnos",
    profesores: "Profesores",
    configuracion: "Configuración",
};

interface ModuleLayoutShellProps {
    module: { id: string; name: string };
    moduleRole?: ModuleCollaboratorRole | null;
    modulePermissions?: ModulePermissions | null;
    isTeacher: boolean;
    children: React.ReactNode;
}

export function ModuleLayoutShell({
    module,
    modulePermissions,
    isTeacher,
    children,
}: ModuleLayoutShellProps) {
    const segment = useSelectedLayoutSegment();
    const { setSegments } = useBreadcrumb();

    useEffect(() => {
        const segments: { label: string; href?: string }[] = [
            { label: module.name, href: `/dashboard/modules/${module.id}/dashboard` },
        ];
        if (segment && segment !== "dashboard") {
            segments.push({ label: SEGMENT_LABELS[segment] ?? segment });
        }
        setSegments(segments);
        return () => setSegments([]);
    }, [module.id, module.name, segment, setSegments]);

    return (
        <div className="-mx-24 -my-8 flex min-h-[calc(100vh-68px)] bg-background">
            <ModuleNav
                moduleId={module.id}
                modulePermissions={modulePermissions ?? null}
                isTeacher={isTeacher}
            />
            <div className="min-w-0 flex-1 overflow-y-auto px-8 py-8 sm:px-10">
                <div className="flex-1">{children}</div>
            </div>
        </div>
    );
}
