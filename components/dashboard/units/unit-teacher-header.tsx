"use client";

import { useEffect } from "react";
import { Map, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useBreadcrumb } from "@/components/dashboard/layout/breadcrumb-context";
import { UnitTeacherNav } from "./unit-teacher-nav";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    getModuleRoleLabel,
    getModuleRoleTooltip,
    type ModuleCollaboratorRole,
    type ModulePermissions,
} from "@/lib/module-collaborator-defs";

interface UnitTeacherHeaderProps {
    unit: any;
    module: any;
    moduleRole: ModuleCollaboratorRole | null;
    modulePermissions: ModulePermissions | null;
}

export function UnitTeacherHeader({
    unit,
    module,
    moduleRole,
    modulePermissions,
}: UnitTeacherHeaderProps) {
    const { setSegments } = useBreadcrumb();

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

    useEffect(() => {
        setSegments([
            { label: module.name, href: `/dashboard/modules/${module.id}` },
            { label: unit.name }
        ]);
        return () => setSegments([]);
    }, [module, unit.name, setSegments]);

    return (
        <div className="flex flex-col gap-6 pt-2">
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
                            {moduleRole && moduleRole !== "creator" && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 gap-1.5 py-1 px-3 shadow-sm cursor-help">
                                                <ShieldAlert className="size-3.5" />
                                                {getModuleRoleLabel(moduleRole)}
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            {getModuleRoleTooltip(moduleRole)}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        <p className="text-sm text-text-muted max-w-xl">
                            {unit.description || "Sin descripción proporcionada para esta unidad."}
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <UnitTeacherNav unitId={unit.id} modulePermissions={modulePermissions} />
            </div>
        </div>
    );
}
