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
    Trash2,
    Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CreateActivityDialog } from '@/components/dashboard/create-activity-dialog';

interface TeacherSidebarProps {
    unit: any;
    activities: any[];
    onAddActivity?: (activity: any) => void;
}

export function TeacherSidebar({ unit, activities, onAddActivity }: TeacherSidebarProps) {
    // Draggable item for React Flow (DND implementation)
    const onDragStart = (event: React.DragEvent, activity: any) => {
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
        <aside className="w-80 h-full bg-[#050A0D]/95 backdrop-blur-xl border-r border-border-strong flex flex-col shrink-0 z-20">
            {/* Header */}
            <div className="p-6 border-b border-white/3">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-black text-white uppercase italic tracking-widest text-shadow-glow">
                        Panel de Diseño
                    </h2>
                    <Button variant="ghost" size="icon" className="size-8 text-text-muted hover:text-white">
                        <Settings className="size-4" />
                    </Button>
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                    <Input
                        placeholder="Buscar retos..."
                        className="pl-9 h-10 bg-surface-dark border-border-subtle focus:border-accent-blue/50 text-sm"
                    />
                </div>

                <CreateActivityDialog
                    unitId={unit.id}
                    trigger={
                        <Button className="w-full bg-accent-blue hover:bg-accent-blue/90 text-surface-dark font-black uppercase tracking-wider text-[10px] h-10 gap-2 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                            <Plus className="size-4" />
                            Crear Nuevo Reto
                        </Button>
                    }
                />
            </div>

            {/* List of Available Activities */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 space-y-4">
                <div className="space-y-1 mb-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-muted px-2">
                        Retos Disponibles
                    </div>
                    <p className="text-[10px] text-text-muted/60 px-2 leading-relaxed italic">
                        Arrastra un reto al lienzo para añadirlo al mapa.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {activities.length > 0 ? (
                        activities.map((activity) => (
                            <div
                                key={activity.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, activity)}
                                className="group bg-surface-dark/50 border border-border-strong hover:border-accent-blue/40 rounded-xl p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all hover:bg-surface-dark group-hover:shadow-lg"
                            >
                                <div className="shrink-0 size-10 rounded-lg bg-surface border border-border-subtle flex items-center justify-center transition-colors group-hover:border-accent-blue/20">
                                    {getActivityIcon(activity.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-white truncate group-hover:text-accent-blue transition-colors">
                                        {activity.title}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 border-border-subtle text-text-muted uppercase">
                                            {activity.type}
                                        </Badge>
                                        <span className="text-[9px] font-bold text-accent-amber">{activity.xp} XP</span>
                                    </div>
                                </div>
                                <GripVertical className="size-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 px-4 border-2 border-dashed border-border-strong rounded-2xl">
                            <Info className="size-6 text-text-muted/20 mx-auto mb-3" />
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">No hay retos</p>
                            <p className="text-[9px] text-text-muted/60 mt-1">Crea retos en la pestaña de actividades primero.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Hint / Help */}
            <div className="p-6 border-t border-white/3 bg-surface-dark/30">
                <div className="bg-blue-500/5 border border-accent-blue/20 rounded-xl p-4 flex gap-3">
                    <Info className="size-4 text-accent-blue shrink-0" />
                    <p className="text-[10px] text-text-muted leading-relaxed italic">
                        Puedes conectar nodos haciendo clic y arrastrando desde los puntos de conexión.
                    </p>
                </div>
            </div>
        </aside>
    );
}
