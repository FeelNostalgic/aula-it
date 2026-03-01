"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, GripVertical, MoreVertical, PenTool, Code, FileText, CheckSquare, Gamepad2, HelpCircle, Trophy } from "lucide-react";
import { reorderActivity } from "@/app/dashboard/units/[id]/actions";
import { CreateActivityDialog } from "./create-activity-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type Activity = {
    id: string;
    unit_id: string;
    title: string;
    description: string | null;
    type: string;
    xp: number;
    order_index: number;
    status?: string | null;
};

interface UnitActivitiesTabProps {
    unitId: string;
    initialActivities: Activity[];
}

// Icon mapping function based on type
const getActivityIcon = (type: string) => {
    switch (type) {
        case 'theory': return <FileText className="size-5 text-accent-blue" />;
        case 'quiz': return <CheckSquare className="size-5 text-accent-orange" />;
        case 'code': return <Code className="size-5 text-accent-green" />;
        case 'project': return <PenTool className="size-5 text-purple-400" />;
        case 'game': return <Gamepad2 className="size-5 text-pink-400" />;
        default: return <HelpCircle className="size-5 text-text-muted" />;
    }
};

export function UnitActivitiesTab({ unitId, initialActivities }: UnitActivitiesTabProps) {
    // Sort activities by order_index initially
    const [activities, setActivities] = useState<Activity[]>(
        [...initialActivities].sort((a, b) => a.order_index - b.order_index)
    );
    const [isReordering, setIsReordering] = useState(false);

    const handleMoveActivity = async (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === activities.length - 1)
        ) {
            return; // Can't move further
        }

        setIsReordering(true);
        const newActivities = [...activities];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        // Perform local swap for immediate UI feedback
        const currentActivity = newActivities[index];
        const swapActivity = newActivities[swapIndex];

        // Swap order_index logically
        const tempOrder = currentActivity.order_index;
        currentActivity.order_index = swapActivity.order_index;
        swapActivity.order_index = tempOrder;

        // Swap positions in array
        newActivities[index] = swapActivity;
        newActivities[swapIndex] = currentActivity;

        setActivities(newActivities);

        // Persist to database
        const result = await reorderActivity(unitId, currentActivity.id, direction);

        setIsReordering(false);

        if (result?.error) {
            alert(result.error);
            // Revert on error (could fetch fresh data or revert local state)
            setActivities([...initialActivities].sort((a, b) => a.order_index - b.order_index));
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Retos de la Unidad</h2>
                    <p className="text-sm text-text-muted mt-1">
                        Crea y organiza las actividades que los alumnos deberán completar.
                    </p>
                </div>

                <CreateActivityDialog unitId={unitId} />
            </div>

            {activities.length === 0 ? (
                <div className="bg-surface-dark border border-dashed border-border-strong rounded-2xl flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="bg-surface size-16 rounded-full flex items-center justify-center mb-4">
                        <Trophy className="size-8 text-text-muted opacity-50" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Aún no hay retos creados</h3>
                    <p className="text-text-muted text-sm max-w-sm mb-6">
                        Comienza a construir el recorrido de aprendizaje añadiendo el primer reto para esta unidad.
                    </p>
                    <CreateActivityDialog unitId={unitId} />
                </div>
            ) : (
                <div className="space-y-3">
                    {activities.map((activity, index) => (
                        <div
                            key={activity.id}
                            className="group flex items-center gap-4 bg-surface-dark border border-border-strong rounded-xl p-4 hover:border-accent-blue/30 transition-colors"
                        >
                            {/* Drag handle placeholder (visual only for now) */}
                            <div className="text-text-muted opacity-30 cursor-not-allowed">
                                <GripVertical className="size-5" />
                            </div>

                            {/* Icon */}
                            <div className="bg-surface p-3 rounded-xl border border-border-subtle shrink-0">
                                {getActivityIcon(activity.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-foreground truncate">{activity.title}</h4>
                                {activity.description && (
                                    <p className="text-sm text-text-muted truncate mt-0.5">
                                        {activity.description}
                                    </p>
                                )}
                            </div>

                            {/* XP Badge */}
                            <div className="hidden sm:flex items-center gap-1.5 bg-accent-orange/10 text-accent-orange px-3 py-1 rounded-full font-bold text-sm shrink-0 border border-accent-orange/20">
                                <span>{activity.xp}</span>
                                <span className="text-[10px] uppercase tracking-wider">XP</span>
                            </div>

                            {/* Order Controls */}
                            <div className="flex flex-col gap-1 border-l border-border-subtle pl-4 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-text-muted hover:text-foreground hover:bg-surface disabled:opacity-30"
                                    onClick={() => handleMoveActivity(index, 'up')}
                                    disabled={index === 0 || isReordering}
                                >
                                    <ArrowUp className="size-4" />
                                    <span className="sr-only">Subir</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-text-muted hover:text-foreground hover:bg-surface disabled:opacity-30"
                                    onClick={() => handleMoveActivity(index, 'down')}
                                    disabled={index === activities.length - 1 || isReordering}
                                >
                                    <ArrowDown className="size-4" />
                                    <span className="sr-only">Bajar</span>
                                </Button>
                            </div>

                            {/* Actions Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-foreground">
                                        <MoreVertical className="size-4" />
                                        <span className="sr-only">Opciones de actividad</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-surface-dark border-border-strong text-foreground w-48">
                                    <DropdownMenuItem className="focus:bg-surface focus:text-foreground cursor-pointer">
                                        Editar Reto
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer">
                                        Eliminar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
