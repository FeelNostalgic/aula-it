"use client";

import {
    LayoutGrid,
    Trophy,
    UsersRound,
    GraduationCap,
    UserRoundCog,
    Settings,
} from "lucide-react";
import type { ModulePermissions } from "@/lib/module-collaborator-defs";
import type { UnitNavigationLinkItem } from "@/components/dashboard/units/unit-navigation-rail";

interface ModuleNavigationOptions {
    moduleId: string;
    modulePermissions: ModulePermissions | null;
    isTeacher: boolean;
}

export function getModuleNavigationItems({
    moduleId,
    modulePermissions,
    isTeacher,
}: ModuleNavigationOptions): UnitNavigationLinkItem[] {
    return [
        {
            href: `/dashboard/modules/${moduleId}/dashboard`,
            label: "Dashboard",
            icon: LayoutGrid,
            match: `/dashboard/modules/${moduleId}/dashboard`,
        },
        {
            href: `/dashboard/modules/${moduleId}/ranking`,
            label: "Ranking",
            icon: Trophy,
            match: `/dashboard/modules/${moduleId}/ranking`,
        },
        {
            href: `/dashboard/modules/${moduleId}/grupos`,
            label: "Grupos",
            icon: UsersRound,
            match: `/dashboard/modules/${moduleId}/grupos`,
        },
        ...(isTeacher ? [{
            href: `/dashboard/modules/${moduleId}/alumnos`,
            label: "Alumnos",
            icon: GraduationCap,
            match: `/dashboard/modules/${moduleId}/alumnos`,
        }] : []),
        ...(isTeacher ? [{
            href: `/dashboard/modules/${moduleId}/profesores`,
            label: "Profesores",
            icon: UserRoundCog,
            match: `/dashboard/modules/${moduleId}/profesores`,
        }] : []),
        ...((modulePermissions?.canManageModuleSettings ?? isTeacher) ? [{
            href: `/dashboard/modules/${moduleId}/configuracion`,
            label: "Configuración",
            icon: Settings,
            match: `/dashboard/modules/${moduleId}/configuracion`,
        }] : []),
    ];
}
