"use client";

import type { ModulePermissions } from "@/lib/module-collaborator-defs";
import { getModuleNavigationItems } from "./module-navigation-items";
import { UnitNavigationRail } from "@/components/dashboard/units/unit-navigation-rail";

interface ModuleNavProps {
    moduleId: string;
    modulePermissions: ModulePermissions | null;
    isTeacher: boolean;
}

export function ModuleNav({ moduleId, modulePermissions, isTeacher }: ModuleNavProps) {
    const items = getModuleNavigationItems({ moduleId, modulePermissions, isTeacher });
    return <UnitNavigationRail items={items} />;
}
