"use client";

import {
    BookOpen,
    ClipboardCheck,
    FolderOpen,
    Network,
    Settings,
    Target,
    Award,
} from "lucide-react";
import type { ModulePermissions } from "@/lib/module-collaborator-defs";
import type { UnitNavigationLinkItem } from "./unit-navigation-rail";

interface StudentUnitNavigationOptions {
    unitId: string;
    viewType: string | null | undefined;
}

interface TeacherUnitNavigationOptions {
    unitId: string;
    modulePermissions: ModulePermissions | null;
}

export function getStudentUnitNavigationItems({
    unitId,
    viewType,
}: StudentUnitNavigationOptions): UnitNavigationLinkItem[] {
    return [
        ...(viewType !== "map" ? [{
            href: `/dashboard/units/${unitId}`,
            label: "Retos",
            icon: BookOpen,
            match: `/dashboard/units/${unitId}`,
            exact: true,
        }] : []),
        ...(viewType === "map" ? [{
            href: `/units/${unitId}/map`,
            label: "Mapa",
            icon: Network,
            match: `/units/${unitId}/map`,
        }] : []),
        {
            href: `/dashboard/units/${unitId}/recursos`,
            label: "Recursos",
            icon: FolderOpen,
            match: `/dashboard/units/${unitId}/recursos`,
        },
        {
            href: `/dashboard/units/${unitId}/notas`,
            label: "Notas",
            icon: ClipboardCheck,
            match: `/dashboard/units/${unitId}/notas`,
        },
    ];
}

export function getTeacherUnitNavigationItems({
    unitId,
    modulePermissions,
}: TeacherUnitNavigationOptions): UnitNavigationLinkItem[] {
    return [
        {
            href: `/dashboard/units/${unitId}/retos`,
            label: "Retos",
            icon: BookOpen,
            match: `/dashboard/units/${unitId}/retos`,
        },
        {
            href: `/units/${unitId}/map`,
            label: "Mapa",
            icon: Network,
            match: `/units/${unitId}/map`,
        },
        {
            href: `/dashboard/units/${unitId}/recursos`,
            label: "Recursos",
            icon: FolderOpen,
            match: `/dashboard/units/${unitId}/recursos`,
        },
        {
            href: `/dashboard/units/${unitId}/evaluacion`,
            label: "Evaluación",
            icon: ClipboardCheck,
            match: `/dashboard/units/${unitId}/evaluacion`,
        },
        {
            href: `/dashboard/units/${unitId}/objetivos`,
            label: "Objetivos",
            icon: Target,
            match: `/dashboard/units/${unitId}/objetivos`,
        },
        {
            href: `/dashboard/units/${unitId}/insignias`,
            label: "Insignias",
            icon: Award,
            match: `/dashboard/units/${unitId}/insignias`,
        },
        {
            href: `/dashboard/units/${unitId}/configuracion`,
            label: "Configuración",
            icon: Settings,
            match: `/dashboard/units/${unitId}/configuracion`,
        },
    ].filter((item) => {
        if (item.label === "Mapa") return modulePermissions?.canViewModule ?? true;
        if (item.label === "Recursos") return modulePermissions?.canEditModuleContent ?? true;
        if (item.label === "Evaluación") return modulePermissions?.canManageStudents ?? true;
        if (item.label === "Objetivos" || item.label === "Insignias") {
            return modulePermissions?.canEditModuleContent ?? true;
        }
        if (item.label === "Configuración") return modulePermissions?.canManageModuleSettings ?? true;
        return true;
    });
}
