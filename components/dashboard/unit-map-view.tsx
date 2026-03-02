"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock,
    CheckCircle2,
    Play,
    Info,
    Clock,
    Zap,
    TrendingUp,
    X,
    ChevronRight,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Activity {
    id: string;
    title: string;
    description: string | null;
    type: string;
    xp: number;
    duration: number | null;
    difficulty: string | null;
    status: 'published' | 'blocked' | 'draft';
    position_x: number;
    position_y: number;
    order_index: number;
}

interface Connection {
    source_activity_id: string;
    target_activity_id: string;
}

interface UnitMapViewProps {
    activities: Activity[];
    connections: Connection[];
    onStartActivity: (id: string) => void;
}

export function UnitMapView({ activities, connections, onStartActivity }: UnitMapViewProps) {
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [zoom, setZoom] = useState(1);

    // Filter out draft activities for students
    const visibleActivities = useMemo(() =>
        activities.filter(a => a.status !== 'draft'),
        [activities]);

    const visibleConnections = useMemo(() =>
        connections.filter(c =>
            visibleActivities.some(a => a.id === c.source_activity_id) &&
            visibleActivities.some(a => a.id === c.target_activity_id)
        ),
        [connections, visibleActivities]);

    // Determine node color/glow based on status
    const getNodeStyles = (activity: Activity) => {
        switch (activity.status) {
            case 'published':
                return {
                    bg: 'bg-blue-500/10',
                    border: 'border-blue-500/50',
                    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
                    icon: <Play className="w-5 h-5 text-blue-400" />,
                    textColor: 'text-blue-100',
                };
            case 'blocked':
                return {
                    bg: 'bg-zinc-800/50',
                    border: 'border-zinc-700',
                    glow: '',
                    icon: <Lock className="w-5 h-5 text-zinc-500" />,
                    textColor: 'text-zinc-500',
                };
            default:
                return {
                    bg: 'bg-zinc-900',
                    border: 'border-zinc-800',
                    glow: '',
                    icon: null,
                    textColor: 'text-zinc-600',
                };
        }
    };

    return (
        <div className="relative w-full h-[600px] bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden select-none">
            {/* Background Grid */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, #3f3f46 1px, transparent 0)`,
                    backgroundSize: `${40 * zoom}px ${40 * zoom}px`
                }}
            />

            {/* SVG Connections Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {visibleConnections.map((conn, idx) => {
                    const source = visibleActivities.find(a => a.id === conn.source_activity_id);
                    const target = visibleActivities.find(a => a.id === conn.target_activity_id);
                    if (!source || !target) return null;

                    const isBlocked = target.status === 'blocked';

                    return (
                        <motion.line
                            key={`${conn.source_activity_id}-${conn.target_activity_id}`}
                            x1={source.position_x}
                            y1={source.position_y}
                            x2={target.position_x}
                            y2={target.position_y}
                            stroke={isBlocked ? "#27272a" : "#3b82f6"}
                            strokeWidth="2"
                            strokeDasharray={isBlocked ? "4 4" : "0"}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: isBlocked ? 0.3 : 0.6 }}
                            style={!isBlocked ? { filter: 'url(#glow)' } : {}}
                        />
                    );
                })}
            </svg>

            {/* Nodes Layer */}
            <div className="absolute inset-0 overflow-auto p-20">
                {visibleActivities.map((activity) => {
                    const styles = getNodeStyles(activity);
                    const isSelected = selectedActivity?.id === activity.id;

                    return (
                        <motion.div
                            key={activity.id}
                            className="absolute cursor-pointer group"
                            style={{
                                left: activity.position_x,
                                top: activity.position_y,
                                transform: 'translate(-50%, -50%)'
                            }}
                            whileHover={{ scale: 1.1 }}
                            onClick={() => setSelectedActivity(activity)}
                        >
                            <div className={cn(
                                "relative flex items-center justify-center w-16 h-16 rounded-2xl border-2 transition-all duration-300",
                                styles.bg,
                                styles.border,
                                styles.glow,
                                isSelected && "scale-110 border-white ring-4 ring-white/10"
                            )}>
                                {styles.icon}

                                {/* Pulsing ring for current/published missions */}
                                {activity.status === 'published' && (
                                    <motion.div
                                        className="absolute inset-0 rounded-2xl border-2 border-blue-400"
                                        animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                    />
                                )}
                            </div>

                            {/* Label */}
                            <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                                <span className={cn(
                                    "text-xs font-bold tracking-tight px-2 py-0.5 rounded-full uppercase",
                                    styles.textColor
                                )}>
                                    {activity.title}
                                </span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Details Panel (Slide out) */}
            <AnimatePresence>
                {selectedActivity && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute top-0 right-0 h-full w-80 bg-zinc-900/95 backdrop-blur-md border-l border-zinc-800 shadow-2xl p-6 overflow-y-auto z-10"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <Badge variant="outline" className="mb-2 text-[10px] uppercase tracking-wider text-blue-400 border-blue-400/30">
                                    Misión {selectedActivity.status === 'published' ? 'Disponible' : 'Bloqueada'}
                                </Badge>
                                <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tighter italic">
                                    {selectedActivity.title}
                                </h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedActivity(null)}
                                className="text-zinc-500 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
                            {selectedActivity.description || "Sin descripción disponible para este reto."}
                        </p>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest leading-none">Tiempo estimado</div>
                                    <div className="text-sm font-bold text-white">{selectedActivity.duration} min</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                                <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-yellow-500" />
                                </div>
                                <div>
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest leading-none">Recompensa XP</div>
                                    <div className="text-sm font-bold text-white">{selectedActivity.xp} XP</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest leading-none">Dificultad</div>
                                    <div className="text-sm font-bold text-white uppercase italic">{selectedActivity.difficulty}</div>
                                </div>
                            </div>
                        </div>

                        <Button
                            className={cn(
                                "w-full h-12 rounded-lg font-black uppercase tracking-widest transition-all duration-300",
                                selectedActivity.status === 'blocked'
                                    ? "bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700"
                                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)]"
                            )}
                            disabled={selectedActivity.status === 'blocked'}
                            onClick={() => onStartActivity(selectedActivity.id)}
                        >
                            {selectedActivity.status === 'blocked' ? (
                                <>
                                    <Lock className="w-4 h-4 mr-2" />
                                    Misión Bloqueada
                                </>
                            ) : (
                                <>
                                    Iniciar Misión
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Map Controls */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                <Button
                    variant="secondary"
                    size="icon"
                    className="bg-zinc-900/80 border border-zinc-700 text-white backdrop-blur hover:bg-zinc-800"
                    onClick={() => setZoom(Math.min(zoom + 0.1, 1.5))}
                >
                    <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                    variant="secondary"
                    size="icon"
                    className="bg-zinc-900/80 border border-zinc-700 text-white backdrop-blur hover:bg-zinc-800"
                    onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}
                >
                    <Minimize2 className="w-4 h-4" />
                </Button>
            </div>

            {/* Progress Info */}
            <div className="absolute bottom-6 left-6 right-20 pointer-events-none">
                <div className="bg-zinc-900/80 border border-zinc-700 p-4 rounded-xl backdrop-blur max-w-sm pointer-events-auto">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Progreso de la Unidad</span>
                        <span className="text-xs font-bold text-blue-400">
                            {Math.round((visibleActivities.filter(a => a.status === 'published').length / visibleActivities.length) * 100)}%
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                        <motion.div
                            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${(visibleActivities.filter(a => a.status === 'published').length / visibleActivities.length) * 100}%` }}
                            transition={{ duration: 1 }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
