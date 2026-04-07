"use client";

import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, Zap, Network, RotateCw, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { updateActivityTitlePosition } from './actions';
import { toast } from 'sonner';

export type MissionNodeData = {
    label: string;
    activityId?: string;
    status: 'published' | 'active' | 'blocked' | 'draft';
    type: string;
    xp: number;
    logo_url?: string | null;
    isSelected?: boolean;
    title_position?: 'down' | 'right' | 'up' | 'left';
    unitId: string;
    role?: 'student' | 'teacher';
    canEditContent?: boolean;
    onTitlePositionChange?: (newPosition: 'down' | 'right' | 'up' | 'left') => void;
    onRemoveFromMap?: () => void;
    editingMode?: boolean;
    onHandleClick?: (handleId: string) => void;
};

// Define the custom node type for React Flow
export type MissionNode = Node<MissionNodeData, 'mission'>;

const MissionNode = ({ id, data, selected }: NodeProps<MissionNode>) => {
    const { status, label, logo_url, title_position = 'down', unitId, role, editingMode, onHandleClick, canEditContent = true } = data;
    const activityId = data.activityId ?? id;

    const handleClick = (handleId: string) => (e: React.MouseEvent) => {
        if (!editingMode) return;
        e.stopPropagation();
        onHandleClick?.(handleId);
    };
    const getStatusStyles = () => {
        switch (status) {
            case 'published':
            case 'active':
                return {
                    bg: 'bg-accent-blue/10',
                    border: 'border-accent-blue/50',
                    glow: 'shadow-[0_0_25px_rgba(34,211,238,0.25)]',
                    icon: (
                        <div className="size-full flex items-center justify-center">
                            <div className="size-6 rounded-full bg-accent-blue/10 flex items-center justify-center">
                                <Network className="size-4 text-accent-blue" />
                            </div>
                        </div>
                    ),
                    textColor: 'text-accent-blue',
                };
            case 'blocked':
                return {
                    bg: 'bg-muted/40 dark:bg-surface-dark/80',
                    border: 'border-border dark:border-border-strong',
                    glow: '',
                    icon: <Lock className="size-5 text-muted-foreground/30 dark:text-text-muted/50" />,
                    textColor: 'text-muted-foreground/50 dark:text-text-muted/60',
                };
            case 'draft':
                return {
                    bg: 'bg-accent-orange/5',
                    border: 'border-accent-orange/30 border-dashed',
                    glow: '',
                    icon: <Zap className="size-5 text-accent-orange/40" />,
                    textColor: 'text-accent-orange/60',
                };
            default:
                return {
                    bg: 'bg-surface',
                    border: 'border-border',
                    glow: '',
                    icon: null,
                    textColor: 'text-muted-foreground',
                };
        }
    };

    const styles = getStatusStyles();
    const isCompleted = false; // Add real logic later if needed

    const rotateTitle = useCallback(async () => {
        const positions: ('down' | 'right' | 'up' | 'left')[] = ['down', 'right', 'up', 'left'];
        const currentIndex = positions.indexOf(title_position);
        const nextPosition = positions[(currentIndex + 1) % positions.length];

        // Actualización local inmediata para feedback en tiempo real
        if (data.onTitlePositionChange) {
            data.onTitlePositionChange(nextPosition);
        }

        const result = await updateActivityTitlePosition(activityId, nextPosition, unitId);
        if (!result.success) {
            toast.error("Error al mover el título");
            // Revertimos cambio local si falla el servidor
            if (data.onTitlePositionChange) {
                data.onTitlePositionChange(title_position);
            }
        } else {
            toast.success("Título movido");
        }
    }, [activityId, title_position, unitId, data]);

    const openActivity = () => {
        const path = canEditContent ? `/activities/${activityId}/edit` : `/activities/${activityId}`;
        window.open(path, '_blank');
    };

    const removeFromMap = useCallback(() => {
        if (data.onRemoveFromMap) {
            data.onRemoveFromMap();
        }
    }, [data]);

    const getLabelAlignmentClasses = () => {
        switch (title_position) {
            case 'right':
                return "text-left items-start ml-10";
            case 'up':
                return "text-center items-center mb-0.5";
            case 'left':
                return "text-right items-end mr-10";
            case 'down':
            default:
                return "text-center items-center mt-0.5";
        }
    };

    const content = (
        <div className="group relative flex flex-col items-center">
            <div className="relative size-16">
                <Handle
                    type="source"
                    position={Position.Top}
                    id="top"
                    onClick={handleClick("top")}
                    className={cn(
                        "border-2 transition-all z-20 top-0! left-1/2! -translate-x-1/2!",
                        editingMode
                            ? "size-4 bg-accent-blue/30 border-accent-blue cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.6)] hover:bg-accent-blue/60 hover:scale-125"
                            : "size-3 bg-surface border-accent-blue/50 hover:border-accent-blue hover:bg-accent-blue/10"
                    )}
                />
                <Handle
                    type="source"
                    position={Position.Left}
                    id="left"
                    onClick={handleClick("left")}
                    className={cn(
                        "border-2 transition-all z-20 left-0! top-1/2! -translate-y-1/2!",
                        editingMode
                            ? "size-4 bg-accent-blue/30 border-accent-blue cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.6)] hover:bg-accent-blue/60 hover:scale-125"
                            : "size-3 bg-surface border-accent-blue/50 hover:border-accent-blue hover:bg-accent-blue/10"
                    )}
                />
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="bottom"
                    onClick={handleClick("bottom")}
                    className={cn(
                        "border-2 transition-all z-20 bottom-0! left-1/2! -translate-x-1/2!",
                        editingMode
                            ? "size-4 bg-accent-blue/30 border-accent-blue cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.6)] hover:bg-accent-blue/60 hover:scale-125"
                            : "size-3 bg-surface border-accent-blue/50 hover:border-accent-blue hover:bg-accent-blue/10"
                    )}
                />
                <Handle
                    type="source"
                    position={Position.Right}
                    id="right"
                    onClick={handleClick("right")}
                    className={cn(
                        "border-2 transition-all z-20 right-0! top-1/2! -translate-y-1/2!",
                        editingMode
                            ? "size-4 bg-accent-blue/30 border-accent-blue cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.6)] hover:bg-accent-blue/60 hover:scale-125"
                            : "size-3 bg-surface border-accent-blue/50 hover:border-accent-blue hover:bg-accent-blue/10"
                    )}
                />

                <div
                    className={cn(
                        "relative size-16 rounded-full border-2 transition-all duration-300 flex items-center justify-center overflow-visible",
                        styles.bg,
                        styles.border,
                        styles.glow,
                        selected && "border-primary dark:border-white ring-8 ring-primary/5 dark:ring-white/5",
                        status === 'blocked' && "grayscale contrast-75 bg-muted dark:bg-surface-dark"
                    )}
                >
                    {/* Logo or Default Icon */}
                    <div className="size-full rounded-full overflow-hidden flex items-center justify-center p-0.5">
                        {logo_url ? (
                            <img src={logo_url} alt={label} className="size-full object-cover rounded-full" />
                        ) : (
                            styles.icon
                        )}
                    </div>

                    {/* Status Indicator (Top Right) */}
                    {status === 'published' && !isCompleted && (
                        <div className="absolute -top-1 -right-1 size-5 rounded-full bg-accent-blue border-2 border-background flex items-center justify-center shadow-sm">
                            <div className="size-1.5 rounded-full bg-white shadow-sm" />
                        </div>
                    )}

                    {isCompleted && (
                        <div className="absolute -top-1 -right-1 size-6 rounded-full bg-accent-green border-2 border-background flex items-center justify-center">
                            <CheckCircle2 className="size-3.5 text-white" />
                        </div>
                    )}

                    {status === 'blocked' && (
                        <div className="absolute inset-0 rounded-full bg-background/20 dark:bg-background/40 backdrop-blur-[1px] flex items-center justify-center">
                            <Lock className="size-5 text-muted-foreground/40 dark:text-text-muted" />
                        </div>
                    )}

                    {/* Active glow ring */}
                    {status === 'active' && (
                        <motion.div
                            className="absolute inset-0 rounded-full border-2 border-accent-blue"
                            animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    )}
                </div>

                {/* Centered container for label orbital movement */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <motion.div
                        initial={false}
                        animate={{
                            x: title_position === 'right' ? 85 : title_position === 'left' ? -85 : 0,
                            y: title_position === 'down' ? 60 : title_position === 'up' ? -60 : 0,
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 200,
                            damping: 25,
                            mass: 0.5
                        }}
                        className={cn(
                            "flex flex-col min-w-[120px] transition-colors duration-500",
                            getLabelAlignmentClasses()
                        )}
                    >
                        <div className={cn(
                            "text-[11px] font-black uppercase tracking-wider transition-colors drop-shadow-sm",
                            styles.textColor,
                            selected && "text-primary dark:text-white"
                        )}>
                            {label}
                        </div>
                        {status === 'active' && (
                            <div className="text-[8px] font-mono text-accent-blue/70 uppercase tracking-[0.2em] mt-0.5">
                                En Curso
                            </div>
                        )}
                        {status === 'blocked' && (
                            <div className="text-[8px] font-mono text-muted-foreground/40 dark:text-text-muted/40 uppercase tracking-[0.2em] mt-0.5">
                                Bloqueado
                            </div>
                        )}
                        {isCompleted && (
                            <div className="text-[8px] font-mono text-accent-green uppercase tracking-[0.2em] mt-0.5 font-bold">
                                Completado
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );

    if (role === 'student') {
        return content;
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                {content}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56 bg-popover border-border text-popover-foreground backdrop-blur-xl">
                <ContextMenuItem onClick={openActivity} className="flex gap-2 items-center hover:bg-accent/10 cursor-pointer">
                    <ExternalLink className="size-4 text-accent-green" />
                    <span>{canEditContent ? "Abrir IDE del reto" : "Abrir reto"}</span>
                </ContextMenuItem>
                {canEditContent && (
                    <>
                        <ContextMenuSeparator className="bg-border" />
                        <ContextMenuItem onClick={rotateTitle} className="flex gap-2 items-center hover:bg-accent/10 cursor-pointer">
                            <RotateCw className="size-4 text-accent-blue" />
                            <span>Rotar título</span>
                        </ContextMenuItem>
                        <ContextMenuSeparator className="bg-border" />
                        <ContextMenuItem onClick={removeFromMap} className="flex gap-2 items-center hover:bg-accent-red/10 cursor-pointer text-accent-red focus:text-accent-red focus:bg-accent-red/10">
                            <Trash2 className="size-4" />
                            <span>Eliminar del mapa</span>
                        </ContextMenuItem>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
};

export default memo(MissionNode);
