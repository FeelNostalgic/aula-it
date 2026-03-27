"use client";

import { MapWorkspace } from "@/components/map-ide/map-workspace";
import { ReactFlowProvider } from "@xyflow/react";
import { BreadcrumbProvider, useBreadcrumb } from "@/components/dashboard/layout/breadcrumb-context";
import { useEffect } from "react";
import type { ModuleCollaboratorRole, ModulePermissions } from "@/lib/module-collaborator-defs";

interface MapClientProps {
    unit: any;
    activities: any[];
    role: 'student' | 'teacher';
    user: any;
    profile: any;
    milestones: any[];
    classBadges: any[];
    studentBadges: any[];
    moduleRole: ModuleCollaboratorRole | null;
    modulePermissions: ModulePermissions | null;
}

function BreadcrumbSetter({ unit }: { unit: any }) {
    const { setSegments } = useBreadcrumb();

    useEffect(() => {
        const segments = [];

        if (unit.module) {
            segments.push({
                label: unit.module.name,
                href: `/dashboard/modules/${unit.module.id}`
            });
        }

        segments.push({
            label: unit.name,
            href: `/dashboard/units/${unit.id}`
        });

        segments.push({ label: "Mapa interactivo", href: "" });

        setSegments(segments);
    }, [unit, setSegments]);

    return null;
}

export default function MapClient({ unit, activities, role, user, profile, milestones, classBadges, studentBadges, moduleRole, modulePermissions }: MapClientProps) {
    return (
        <BreadcrumbProvider>
            <BreadcrumbSetter unit={unit} />
            <ReactFlowProvider>
                <MapWorkspace
                    unit={unit}
                    activities={activities}
                    role={role}
                    user={user}
                    profile={profile}
                    milestones={milestones}
                    classBadges={classBadges}
                    studentBadges={studentBadges}
                    moduleRole={moduleRole}
                    modulePermissions={modulePermissions}
                />
            </ReactFlowProvider>
        </BreadcrumbProvider>
    );
}
