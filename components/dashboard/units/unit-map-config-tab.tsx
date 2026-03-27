"use client";

import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Lock,
    Play,
    EyeOff,
    Save,
    Plus,
    Trash2,
    MousePointer2,
    Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    updateActivityPosition,
    updateActivityStatus,
    addActivityConnection,
    removeActivityConnection,
    updateMultipleActivityPositions
} from '@/app/dashboard/units/[id]/actions';

interface Activity {
    id: string;
    title: string;
    status: 'published' | 'blocked' | 'draft';
    position_x: number;
    position_y: number;
    order_index: number;
    xp?: number;
    type?: string;
    description?: string | null;
    logo_url?: string | null;
}

interface Connection {
    id: string;
    source_activity_id: string;
    target_activity_id: string;
}

interface UnitMapConfigTabProps {
    unitId: string;
    activities: Activity[];
    connections: Connection[];
}

export function UnitMapConfigTab({ unitId, activities, connections }: UnitMapConfigTabProps) {
    const [isConnecting, setIsConnecting] = useState<string | null>(null);
    const [localActivities, setLocalActivities] = useState(activities);
    const [isSaving, setIsSaving] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Dragging logic
    const handleDragEnd = async (id: string, x: number, y: number) => {
        // Update local state first for snappiness
        setLocalActivities(prev => prev.map(a =>
            a.id === id ? { ...a, position_x: x, position_y: y } : a
        ));

        const result = await updateActivityPosition(id, x, y);
        if (result.error) {
            toast.error(result.error);
        }
    };

    const handleStatusChange = async (id: string, status: 'published' | 'blocked' | 'draft') => {
        const result = await updateActivityStatus(id, status);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Estado actualizado");
        }
    };

    const handleCreateConnection = async (targetId: string) => {
        if (!isConnecting || isConnecting === targetId) {
            setIsConnecting(null);
            return;
        }

        const result = await addActivityConnection(unitId, isConnecting, targetId);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Conexión creada");
        }
        setIsConnecting(null);
    };

    const handleDeleteConnection = async (connId: string) => {
        const result = await removeActivityConnection(connId);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Conexión eliminada");
        }
    };

    const handleAutoLayout = async () => {
        setIsSaving(true);
        const updates = localActivities.map((a, i) => ({
            id: a.id,
            x: 100 + (i % 3) * 200,
            y: 100 + Math.floor(i / 3) * 150
        }));

        setLocalActivities(prev => prev.map(a => {
            const update = updates.find(u => u.id === a.id);
            return update ? { ...a, position_x: update.x, position_y: update.y } : a;
        }));

        const result = await updateMultipleActivityPositions(updates);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Diseño automático aplicado");
        }
        setIsSaving(false);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-1">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/50 flex items-center justify-center">
                            <MousePointer2 className="w-4 h-4 text-blue-400" />
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-tighter italic">Configurador de Mapa</h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Arrastra retos y crea conexiones</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAutoLayout}
                        disabled={isSaving}
                        className="h-9 px-4 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:text-white hover:bg-zinc-700 text-[10px] font-black uppercase tracking-widest"
                    >
                        Auto-Diseño
                    </Button>
                    <Button
                        variant={isConnecting ? "secondary" : "default"}
                        size="sm"
                        className={cn(
                            "h-9 px-4 text-[10px] font-black uppercase tracking-widest",
                            isConnecting && "bg-blue-600 text-white animate-pulse"
                        )}
                        onClick={() => {
                            if (isConnecting) setIsConnecting(null);
                            else toast.info("Haz clic en el reto de ORIGEN");
                        }}
                    >
                        {isConnecting ? "Cancelando..." : "Nueva Conexión"}
                    </Button>
                </div>
            </div>

            <div
                ref={canvasRef}
                className="relative w-full h-[600px] bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden"
            >
                {/* Grid */}
                <div className="absolute inset-0 opacity-10 bg-radial-grid" />

                {/* SVG Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {connections.map((conn) => {
                        const source = localActivities.find(a => a.id === conn.source_activity_id);
                        const target = localActivities.find(a => a.id === conn.target_activity_id);
                        if (!source || !target) return null;

                        return (
                            <g key={conn.id} className="group pointer-events-auto cursor-pointer">
                                <line
                                    x1={source.position_x}
                                    y1={source.position_y}
                                    x2={target.position_x}
                                    y2={target.position_y}
                                    stroke="#3f3f46"
                                    strokeWidth="8"
                                    className="opacity-0 group-hover:opacity-20 transition-opacity"
                                    onClick={() => handleDeleteConnection(conn.id)}
                                />
                                <line
                                    x1={source.position_x}
                                    y1={source.position_y}
                                    x2={target.position_x}
                                    y2={target.position_y}
                                    stroke="#3b82f6"
                                    strokeWidth="2"
                                    strokeOpacity="0.4"
                                />
                                {/* Arrow head */}
                                <circle
                                    cx={target.position_x}
                                    cy={target.position_y}
                                    r="4"
                                    fill="#3b82f6"
                                    className="opacity-40"
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* Draggable Nodes */}
                {localActivities.map((activity) => (
                    <motion.div
                        key={activity.id}
                        drag
                        dragMomentum={false}
                        onDragEnd={(_, info) => {
                            if (canvasRef.current) {
                                const rect = canvasRef.current.getBoundingClientRect();
                                // Basic coordinate calculation relative to canvas
                                const x = Math.round(activity.position_x + info.offset.x);
                                const y = Math.round(activity.position_y + info.offset.y);
                                handleDragEnd(activity.id, x, y);
                            }
                        }}
                        className="absolute z-10"
                        style={{
                            left: activity.position_x,
                            top: activity.position_y,
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        <div className="relative group">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className={cn(
                                        "relative flex items-center justify-center w-12 h-12 rounded-xl border-2 transition-all duration-300 overflow-hidden",
                                        activity.status === 'published' ? "bg-blue-500/10 border-blue-500/50 text-blue-400" :
                                            activity.status === 'blocked' ? "bg-zinc-800 border-zinc-700 text-zinc-500" :
                                                "bg-zinc-900 border-dashed border-zinc-700 text-zinc-600",
                                        isConnecting === activity.id && "ring-4 ring-blue-500/50 scale-110"
                                    )}>
                                        {activity.logo_url ? (
                                            <img
                                                src={activity.logo_url}
                                                alt={activity.title}
                                                className="size-full object-cover p-2"
                                            />
                                        ) : (
                                            <>
                                                {activity.status === 'published' && <Play className="w-5 h-5" />}
                                                {activity.status === 'blocked' && <Lock className="w-5 h-5" />}
                                                {activity.status === 'draft' && <EyeOff className="w-5 h-5" />}
                                            </>
                                        )}
                                        <div className="absolute bottom-1 right-1 rounded-full border border-zinc-900/80 bg-zinc-950/90 p-0.5 shadow-sm">
                                            {activity.status === 'published' && <Play className="size-2.5 text-blue-400" />}
                                            {activity.status === 'blocked' && <Lock className="size-2.5 text-zinc-400" />}
                                            {activity.status === 'draft' && <EyeOff className="size-2.5 text-zinc-500" />}
                                        </div>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="w-48 bg-zinc-900 border-zinc-800 text-zinc-300">
                                    <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">
                                        {activity.title}
                                    </div>
                                    <DropdownMenuSeparator className="bg-zinc-800" />

                                    <DropdownMenuItem onClick={() => setIsConnecting(activity.id)} className="gap-2 focus:bg-zinc-800 focus:text-white">
                                        <Link2 className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-tight">Conectar desde aquí</span>
                                    </DropdownMenuItem>

                                    {isConnecting && isConnecting !== activity.id && (
                                        <DropdownMenuItem onClick={() => handleCreateConnection(activity.id)} className="gap-2 bg-blue-600 focus:bg-blue-500 text-white">
                                            <Plus className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-tight">Cerrar conexión</span>
                                        </DropdownMenuItem>
                                    )}

                                    <DropdownMenuSeparator className="bg-zinc-800" />

                                    <DropdownMenuItem onClick={() => handleStatusChange(activity.id, 'published')} className="gap-2 focus:bg-zinc-800 focus:text-white">
                                        <Play className="w-4 h-4 text-emerald-500" />
                                        <span className="text-xs font-bold uppercase tracking-tight text-emerald-500">Publicar</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={() => handleStatusChange(activity.id, 'blocked')} className="gap-2 focus:bg-zinc-800 focus:text-white">
                                        <Lock className="w-4 h-4 text-zinc-400" />
                                        <span className="text-xs font-bold uppercase tracking-tight text-zinc-400">Bloquear</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={() => handleStatusChange(activity.id, 'draft')} className="gap-2 focus:bg-zinc-800 focus:text-white text-zinc-500">
                                        <EyeOff className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-tight">Borrador</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Tooltip-like label */}
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <div className="bg-zinc-900 border border-zinc-700 text-[9px] font-black text-white px-2 py-1 rounded truncate max-w-[100px] uppercase italic tracking-tighter shadow-xl">
                                    {activity.title}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}

                {/* Instructions Overlay */}
                <div className="absolute top-4 left-4 pointer-events-none">
                    <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 p-3 rounded-lg max-w-[180px]">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase leading-relaxed tracking-wider">
                            • ARRASTRA los retos<br />
                            • CLICK para el menú<br />
                            • CLICK en línea para borrar
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
