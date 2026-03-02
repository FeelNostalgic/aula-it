"use client";

import React, { memo } from 'react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle2, Play, Zap, Network } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MissionNodeData = {
    label: string;
    status: 'published' | 'active' | 'blocked' | 'draft';
    type: string;
    xp: number;
    logo_url?: string | null;
    isSelected?: boolean;
};

// Define the custom node type for React Flow
export type MissionNode = Node<MissionNodeData, 'mission'>;

const MissionNode = ({ data, selected }: NodeProps<MissionNode>) => {
    const { status, label, logo_url } = data;

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
                    bg: 'bg-surface-dark/80',
                    border: 'border-border-strong',
                    glow: '',
                    icon: <Lock className="size-5 text-text-muted/50" />,
                    textColor: 'text-text-muted/60',
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
                    border: 'border-border-subtle',
                    glow: '',
                    icon: null,
                    textColor: 'text-text-muted',
                };
        }
    };

    const styles = getStatusStyles();
    const isCompleted = false; // Add real logic later if needed

    return (
        <div className="group relative flex flex-col items-center gap-2">
            <div className="relative size-16">
                <Handle
                    type="source"
                    position={Position.Top}
                    id="top"
                    className="size-3 bg-surface border-2 border-accent-blue/50 hover:border-accent-blue hover:bg-accent-blue/10 transition-all z-20 top-0! left-1/2! -translate-x-1/2!"
                />
                <Handle
                    type="source"
                    position={Position.Left}
                    id="left"
                    className="size-3 bg-surface border-2 border-accent-blue/50 hover:border-accent-blue hover:bg-accent-blue/10 transition-all z-20 left-0! top-1/2! -translate-y-1/2!"
                />
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="bottom"
                    className="size-3 bg-surface border-2 border-accent-blue/50 hover:border-accent-blue hover:bg-accent-blue/10 transition-all z-20 bottom-0! left-1/2! -translate-x-1/2!"
                />
                <Handle
                    type="source"
                    position={Position.Right}
                    id="right"
                    className="size-3 bg-surface border-2 border-accent-blue/50 hover:border-accent-blue hover:bg-accent-blue/10 transition-all z-20 right-0! top-1/2! -translate-y-1/2!"
                />

                <motion.div
                    initial={false}
                    animate={{
                        scale: selected ? 1.15 : 1,
                        y: selected ? -5 : 0
                    }}
                    className={cn(
                        "relative size-16 rounded-full border-2 transition-all duration-300 flex items-center justify-center overflow-visible",
                        styles.bg,
                        styles.border,
                        styles.glow,
                        selected && "border-white ring-8 ring-white/5",
                        status === 'blocked' && "grayscale contrast-75 bg-surface-dark"
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
                        <div className="absolute -top-1 -right-1 size-5 rounded-full bg-accent-blue border-2 border-background flex items-center justify-center animate-pulse">
                            <div className="size-1.5 rounded-full bg-white" />
                        </div>
                    )}

                    {isCompleted && (
                        <div className="absolute -top-1 -right-1 size-6 rounded-full bg-accent-green border-2 border-background flex items-center justify-center">
                            <CheckCircle2 className="size-3.5 text-white" />
                        </div>
                    )}

                    {status === 'blocked' && (
                        <div className="absolute inset-0 rounded-full bg-background/40 backdrop-blur-[1px] flex items-center justify-center">
                            <Lock className="size-5 text-text-muted" />
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
                </motion.div>
            </div>

            {/* Label */}
            <div className="mt-4 text-center min-w-[120px]">
                <div className={cn(
                    "text-[11px] font-black uppercase tracking-wider transition-colors drop-shadow-sm",
                    styles.textColor,
                    selected && "text-white"
                )}>
                    {label}
                </div>
                {status === 'active' && (
                    <div className="text-[8px] font-mono text-accent-blue/70 uppercase tracking-[0.2em] mt-0.5">
                        En Curso
                    </div>
                )}
                {status === 'blocked' && (
                    <div className="text-[8px] font-mono text-text-muted/40 uppercase tracking-[0.2em] mt-0.5">
                        Bloqueado
                    </div>
                )}
                {isCompleted && (
                    <div className="text-[8px] font-mono text-accent-green uppercase tracking-[0.2em] mt-0.5 font-bold">
                        Completado
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(MissionNode);
