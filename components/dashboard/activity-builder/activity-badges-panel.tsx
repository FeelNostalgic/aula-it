"use client";

import { Award } from "lucide-react";
import ClassBadgesManager from "@/components/dashboard/class-badges-manager";

interface ActivityBadgesPanelProps {
    activity: any;
    onUpdate: (updatedActivity: any) => void;
}

export function ActivityBadgesPanel({ activity, onUpdate }: ActivityBadgesPanelProps) {
    return (
        <div className="flex flex-col h-full w-full p-8 overflow-y-auto max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Award className="size-6 text-accent-amber" />
                        Insignias del Reto
                    </h2>
                    <p className="text-sm text-text-muted mt-1">
                        Configura las insignias que los alumnos ganarán al completar este reto bajo ciertas condiciones.
                    </p>
                </div>
            </div>

            <div className="pt-6 border-t border-border/50">
                <ClassBadgesManager 
                    badges={activity.class_badges || []}
                    unitId={activity.unit_id || activity.unit?.id} 
                    activityId={activity.id} 
                />
            </div>
        </div>
    );
}
