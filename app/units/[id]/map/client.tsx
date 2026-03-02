"use client";

import { MapWorkspace } from "@/components/map-ide/map-workspace";
import { ReactFlowProvider } from "@xyflow/react";

interface MapClientProps {
    unit: any;
    activities: any[];
    role: 'student' | 'teacher';
}

export default function MapClient({ unit, activities, role }: MapClientProps) {
    return (
        <ReactFlowProvider>
            <MapWorkspace unit={unit} activities={activities} role={role} />
        </ReactFlowProvider>
    );
}
