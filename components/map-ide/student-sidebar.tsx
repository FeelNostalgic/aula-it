"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Clock,
    ChevronRight,
    CheckCircle2,
    Lock,
    Trophy,
    ArrowLeft,
    Network
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface StudentSidebarProps {
    unit: any;
    selectedActivity: any | null;
    moduleId: string;
    onStartMission?: (id: string) => void;
}

export function StudentSidebar({ unit, selectedActivity, moduleId, onStartMission }: StudentSidebarProps) {
    const isBlocked = selectedActivity?.status === 'blocked';

    const getDifficultyColor = (diff?: string | null) => {
        const d = diff?.toLowerCase();
        if (d === 'fácil' || d === 'easy') return 'text-accent-green bg-accent-green/10 border-accent-green/20';
        if (d === 'media' || d === 'medium' || d === 'normal') return 'text-accent-amber bg-accent-amber/10 border-accent-amber/20';
        if (d === 'experto' || d === 'expert' || d === 'difícil') return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20';
        return 'text-text-muted bg-surface border-border-subtle';
    };

    return (
        <aside className="w-80 h-full bg-[#050A0D]/95 backdrop-blur-xl border-r border-border-strong flex flex-col shrink-0 z-20">
            {/* Header / Back Button */}
            <div className="p-6 border-b border-white/3">
                <Link href={`/dashboard/units/${unit.id}`}>
                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-white transition-colors group">
                        <ArrowLeft className="size-3 group-hover:-translate-x-1 transition-transform" />
                        VOLVER A LA UNIDAD
                    </button>
                </Link>
                <div className="mt-6 flex items-start gap-3">
                    <div className="size-10 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue">
                        <Network className="size-5" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-accent-blue/60 mb-1">Misiones</div>
                        <h2 className="text-lg font-black text-white leading-none uppercase italic tracking-tighter">
                            {unit.name}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                <AnimatePresence mode="wait">
                    {selectedActivity ? (
                        <motion.div
                            key={selectedActivity.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="space-y-6"
                        >
                            {/* Mission Header */}
                            <div className="space-y-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-blue mb-2">Misión Actual</div>
                                    <h3 className="text-2xl font-black text-white leading-tight uppercase italic tracking-tighter">
                                        {selectedActivity.title}
                                    </h3>
                                </div>
                                <p className="text-sm text-text-muted leading-relaxed">
                                    {selectedActivity.description || "Sin descripción detallada para esta misión."}
                                </p>
                            </div>

                            {/* Mission Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-surface-dark border border-border-strong p-3 rounded-xl flex flex-col gap-1">
                                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest leading-none">Dificultad</div>
                                    <div className={cn(
                                        "text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border self-start mt-1",
                                        getDifficultyColor(selectedActivity.difficulty)
                                    )}>
                                        {selectedActivity.difficulty || 'Normal'}
                                    </div>
                                </div>
                                <div className="bg-surface-dark border border-border-strong p-3 rounded-xl flex flex-col gap-1">
                                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest leading-none">Recompensa</div>
                                    <div className="text-xs font-black text-accent-amber mt-1 flex items-center gap-1">
                                        <Zap className="size-3 fill-accent-amber" />
                                        {selectedActivity.xp} XP
                                    </div>
                                </div>
                                <div className="bg-surface-dark border border-border-strong p-3 rounded-xl flex flex-col gap-1">
                                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest leading-none">Duración</div>
                                    <div className="text-xs font-black text-white mt-1 flex items-center gap-1">
                                        <Clock className="size-3 text-text-muted" />
                                        {selectedActivity.duration || '15'} MIN
                                    </div>
                                </div>
                            </div>

                            {/* Start Button */}
                            <Button
                                onClick={() => onStartMission?.(selectedActivity.id)}
                                disabled={isBlocked}
                                className={cn(
                                    "w-full h-14 rounded-xl font-black uppercase tracking-[0.15em] text-xs transition-all duration-300",
                                    isBlocked
                                        ? "bg-surface-dark border-border-strong text-text-muted/40"
                                        : "bg-accent-blue hover:bg-accent-blue/90 text-white shadow-[0_8px_20px_-4px_rgba(34,211,238,0.4)] hover:shadow-[0_12px_24px_-4px_rgba(34,211,238,0.6)]"
                                )}
                            >
                                {isBlocked ? (
                                    <div className="flex items-center gap-2">
                                        <Lock className="size-4" />
                                        Misión Bloqueada
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        Abrir actividad
                                        <ChevronRight className="size-4" />
                                    </div>
                                )}
                            </Button>

                            {/* Objectives */}
                            <div className="pt-8 border-t border-white/3 space-y-4">
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Objetivos de la Unidad</div>
                                <div className="space-y-3">
                                    {[
                                        "Comprender la encapsulación de datos",
                                        "Configurar direccionamiento IPv4/IPv6",
                                        "Análisis de tráfico con Wireshark"
                                    ].map((obj, i) => (
                                        <div key={i} className="flex items-start gap-3 group">
                                            <div className={cn(
                                                "size-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                                                i === 0 ? "bg-accent-blue/20 border-accent-blue/40" : "bg-transparent border-border-subtle"
                                            )}>
                                                {i === 0 && <CheckCircle2 className="size-2.5 text-accent-blue" />}
                                            </div>
                                            <span className={cn(
                                                "text-[11px] leading-relaxed transition-colors",
                                                i === 0 ? "text-white font-medium" : "text-text-muted group-hover:text-text-muted/80"
                                            )}>{obj}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center py-20 px-4">
                            <div className="size-16 rounded-full bg-surface-dark border border-border-strong flex items-center justify-center mb-6">
                                <Trophy className="size-8 text-text-muted/30" />
                            </div>
                            <h4 className="text-sm font-black text-white uppercase italic tracking-tighter mb-2">Selecciona un Reto</h4>
                            <p className="text-xs text-text-muted leading-relaxed">
                                Haz clic en un nodo del mapa para ver los detalles de la misión y objetivos.
                            </p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer / Global Stats */}
            <div className="p-6 border-t border-white/3 bg-surface-dark/30">
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest leading-none">Progreso Total</div>
                            <div className="text-sm font-black text-white italic tracking-tighter">35%</div>
                        </div>
                        <div className="text-right space-y-1">
                            <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest leading-none">Siguiente Hito</div>
                            <div className="text-[10px] font-black text-accent-blue uppercase tracking-tight">Nivel I</div>
                        </div>
                    </div>
                    <Progress value={35} className="h-1.5 bg-surface [&>div]:bg-accent-blue" />

                    <div className="flex justify-between items-center pt-2">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Rango Actual</span>
                            <span className="text-[10px] font-black text-accent-blue uppercase italic">Arquitecto Junior</span>
                        </div>
                        <div className="size-8 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue">
                            <Trophy className="size-4" />
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
