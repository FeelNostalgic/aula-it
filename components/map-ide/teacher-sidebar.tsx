"use client";

import React from 'react';
import {
    Plus,
    Search,
    GripVertical,
    FileText,
    Code,
    CheckSquare,
    Gamepad2,
    HelpCircle,
    Info,
    Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CreateActivityDialog } from '@/components/dashboard/activities/create-activity-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getModuleRoleLabel, getModuleRoleTooltip, type ModuleCollaboratorRole, type ModulePermissions } from '@/lib/module-collaborator-defs';

interface TeacherSidebarProps {
    unit: any;
    activities: any[];
    onAddActivity?: (activity: any) => void;
    moduleRole: ModuleCollaboratorRole | null;
    modulePermissions: ModulePermissions | null;
}

export function TeacherSidebar({ unit, activities, onAddActivity, moduleRole, modulePermissions }: TeacherSidebarProps) {
    const canEditMap = modulePermissions?.canEditModuleContent ?? true;

    // Draggable item for React Flow (DND implementation)
    const onDragStart = (event: React.DragEvent, activity: any) => {
        if (!canEditMap) {
            event.preventDefault();
            return;
        }
        event.dataTransfer.setData('application/reactflow', JSON.stringify(activity));
        event.dataTransfer.effectAllowed = 'move';
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'theory': return <FileText className="size-4 text-accent-blue" />;
            case 'quiz': return <CheckSquare className="size-4 text-accent-orange" />;
            case 'code': return <Code className="size-4 text-accent-green" />;
            case 'project': return <Plus className="size-4 text-purple-400" />;
            case 'game': return <Gamepad2 className="size-4 text-pink-400" />;
            default: return <HelpCircle className="size-4 text-text-muted" />;
        }
    };

    return (
        <aside className="w-80 h-full bg-popover/95 backdrop-blur-xl border-r border-border/50 flex flex-col shrink-0 z-20">
            {/* Header */}
            <div className="p-6 border-b border-border/50">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black text-foreground uppercase tracking-widest">
                            Panel de Diseño
                        </h2>
                        {moduleRole && moduleRole !== "creator" && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 gap-1.5 py-1 px-2 shadow-sm cursor-help">
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
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar retos..."
                        className="pl-9 h-10 bg-muted/50 border-border focus:border-accent-blue/50 text-sm"
                    />
                </div>

                {canEditMap ? (
                    <CreateActivityDialog
                        unitId={unit.id}
                        trigger={
                            <Button className="w-full bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-black uppercase tracking-wider text-[10px] h-10 gap-2 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                                <Plus className="size-4" />
                                Nuevo reto
                            </Button>
                        }
                    />
                ) : (
                    <div className="rounded-xl border border-border/50 bg-muted/30 px-3 py-3 text-[10px] text-muted-foreground">
                        Este panel está en solo lectura para tu rol.
                    </div>
                )}
            </div>

            {/* List of Available Activities */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 space-y-4">
                <div className="space-y-1 mb-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">
                        Retos Disponibles
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 px-2 leading-relaxed italic">
                        Arrastra un reto al lienzo para añadirlo al mapa.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {activities.length > 0 ? (
                        activities.map((activity) => (
                            <div
                                key={activity.id}
                                draggable={canEditMap}
                                onDragStart={(e) => onDragStart(e, activity)}
                                className={cn(
                                    "group bg-muted/40 border border-border/50 hover:border-accent-blue/40 rounded-xl p-3 flex items-center gap-3 transition-all hover:bg-muted/60",
                                    canEditMap ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-80"
                                )}
                            >
                                <div className="shrink-0 size-10 rounded-lg bg-background border border-border flex items-center justify-center transition-colors group-hover:border-accent-blue/20 overflow-hidden">
                                    {activity.logo_url ? (
                                        <img
                                            src={activity.logo_url}
                                            alt={activity.title}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        getActivityIcon(activity.type)
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-foreground truncate group-hover:text-accent-blue transition-colors">
                                        {activity.title}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 border-border text-muted-foreground uppercase">
                                            {activity.type}
                                        </Badge>
                                        <span className="text-[9px] font-bold text-accent-amber">{activity.xp} XP</span>
                                    </div>
                                </div>
                                <GripVertical className={cn("size-4 text-muted-foreground transition-opacity", canEditMap ? "opacity-0 group-hover:opacity-100" : "opacity-30")} />
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 px-4 border-2 border-dashed border-border/50 rounded-2xl">
                            <Info className="size-6 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No hay retos</p>
                            <p className="text-[9px] text-muted-foreground/60 mt-1">Crea retos en la pestaña de actividades primero.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Hint / Help */}
            <div className="p-6 border-t border-border/50 bg-muted/20">
                        <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-4 flex gap-3">
                            <Info className="size-4 text-accent-blue shrink-0" />
                            <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                        {canEditMap
                            ? "Puedes conectar nodos haciendo clic y arrastrando desde los puntos de conexión."
                            : "Puedes revisar el mapa y el contenido, pero las acciones de diseño están bloqueadas para tu rol."}
                            </p>
                        </div>
            </div>
        </aside>
    );
}
