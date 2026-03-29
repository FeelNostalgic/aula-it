"use client";

import type { ModulePermissions } from "@/lib/module-collaborator-defs";
import { getTeacherUnitNavigationItems } from "./unit-navigation-items";
import { UnitNavigationRail } from "./unit-navigation-rail";

interface UnitTeacherNavProps {
    unitId: string;
    modulePermissions: ModulePermissions | null;
}

export function UnitTeacherNav({ unitId, modulePermissions }: UnitTeacherNavProps) {
    const items = getTeacherUnitNavigationItems({ unitId, modulePermissions });

    return <UnitNavigationRail items={items} />;
}
