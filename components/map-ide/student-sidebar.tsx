"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    ChevronRight,
    Lock,
    Trophy,
    Network,
    FileText as FileTextIcon,
    FolderDown,
    Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StudentSidebarProps {
    unit: any;
    selectedActivity: any | null;
    moduleId: string;
    onStartMission?: (id: string) => void;
    activeView: 'map' | 'resources';
    onViewChange: (view: 'map' | 'resources') => void;
}

const getDifficultyConfig = (difficulty?: string | null) => {
    const val = difficulty?.toLowerCase();
    switch (val) {
        case 'fácil': case 'bajo': case 'easy':
            return { color: 'text-accent-green', bg: 'bg-accent-green/10', border: 'border-accent-green/20', label: 'Fácil' };
        case 'media': case 'medium': case 'normal':
            return { color: 'text-accent-amber', bg: 'bg-accent-amber/10', border: 'border-accent-amber/20', label: 'Medio' };
        case 'difícil': case 'hard':
            return { color: 'text-accent-orange', bg: 'bg-accent-orange/10', border: 'border-accent-orange/20', label: 'Difícil' };
        case 'experto': case 'expert': case 'alto':
            return { color: 'text-red-400', bg: 'bg-red-950/30', border: 'border-red-900/40', label: 'Experto' };
        default:
            return { color: 'text-text-muted', bg: 'bg-surface', border: 'border-border-subtle', label: difficulty || 'N/A' };
    }
};

export function StudentSidebar({ unit, selectedActivity, moduleId, onStartMission, activeView, onViewChange }: StudentSidebarProps) {
    const isBlocked = selectedActivity?.status === 'blocked';
    const isDraft = selectedActivity?.status === 'draft';
    const isDisabled = isBlocked || isDraft;

    return (
        <aside className="h-full flex shrink-0 z-20 overflow-hidden">
            {/* Narrow Vertical Icon Bar */}
            <div className="w-[60px] h-full bg-background border-r border-border/50 flex flex-col items-center py-6 gap-6 relative z-30 shrink-0">
                <div className="flex flex-col gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewChange('map')}
                        className={cn(
                            "size-10 rounded-xl transition-all duration-300 relative group",
                            activeView === 'map'
                                ? "bg-accent-blue/10 text-accent-blue shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                        )}
                        title="Mapa de Misiones"
                    >
                        <Network className="size-5" />
                        {activeView === 'map' && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent-blue rounded-r-full shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewChange('resources')}
                        className={cn(
                            "size-10 rounded-xl transition-all duration-300 relative group",
                            activeView === 'resources'
                                ? "bg-accent-blue/10 text-accent-blue shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                        )}
                        title="Recursos de la unidad"
                    >
                        <FileTextIcon className="size-5" />
                        {activeView === 'resources' && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent-blue rounded-r-full shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        )}
                    </Button>
                </div>

                <div className="mt-auto flex flex-col gap-4 items-center">
                    <div className="size-8 rounded-lg bg-popover/50 border border-border flex items-center justify-center text-muted-foreground/30">
                        <Trophy className="size-4" />
                    </div>
                </div>
            </div>

            {/* Node Detail Panel — only visible when map view active and a node is selected */}
            <AnimatePresence>
                {activeView === 'map' && selectedActivity && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 288, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="h-full bg-popover/95 backdrop-blur-xl border-r border-border/50 flex flex-col shrink-0 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-border/50 shrink-0">
                            <div className="flex items-start gap-3">
                                <div className="size-10 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue min-w-10">
                                    <Network className="size-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-blue/60 mb-1 truncate">
                                        Misión detectada
                                    </div>
                                    <h2 className="text-base font-black text-foreground leading-tight uppercase tracking-tighter truncate">
                                        {selectedActivity.title}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden p-6 space-y-5">
                            {/* Description */}
                            <p className="text-xs text-text-muted leading-relaxed line-clamp-4">
                                {selectedActivity.description || "Sin descripción para este reto."}
                            </p>

                            <div className="border-t border-border/50" />

                            {/* Stats — each row full width */}
                            {(() => {
                                const diff = getDifficultyConfig(selectedActivity.difficulty);
                                return (
                                    <div className="space-y-2">
                                        {/* Difficulty */}
                                        <div className="flex items-center justify-between bg-muted/40 border border-border/50 rounded-xl px-3 py-2.5">
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Nivel</span>
                                            <div className={cn(
                                                "flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border",
                                                diff.bg, diff.color, diff.border
                                            )}>
                                                <Zap className="size-2.5" />
                                                {diff.label}
                                            </div>
                                        </div>
                                        {/* XP */}
                                        <div className="flex items-center justify-between bg-muted/40 border border-border/50 rounded-xl px-3 py-2.5">
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">XP</span>
                                            <div className="text-xs font-black text-accent-amber flex items-center gap-1">
                                                <Zap className="size-3 fill-accent-amber" />
                                                {selectedActivity.xp || 0} XP
                                            </div>
                                        </div>
                                        {/* Steps */}
                                        {selectedActivity.stepsCount > 0 && (
                                            <div className="flex items-center justify-between bg-muted/40 border border-border/50 rounded-xl px-3 py-2.5">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Pasos</span>
                                                <div className="text-xs font-black text-foreground flex items-center gap-1">
                                                    <FolderDown className="size-3 text-text-muted" />
                                                    {selectedActivity.stepsCount} pasos
                                                </div>
                                            </div>
                                        )}
                                        {/* Duration */}
                                        {selectedActivity.duration && (
                                            <div className="flex items-center justify-between bg-muted/40 border border-border/50 rounded-xl px-3 py-2.5">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Tiempo</span>
                                                <div className="text-xs font-black text-text-muted flex items-center gap-1">
                                                    <Clock className="size-3" />
                                                    {selectedActivity.duration}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Action Button */}
                            <Button
                                onClick={() => onStartMission?.(selectedActivity.id)}
                                disabled={isDisabled}
                                className={cn(
                                    "w-full h-12 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] transition-all duration-300",
                                    isDisabled
                                        ? "bg-surface-dark border-border-strong text-text-muted/40"
                                        : "bg-accent-blue hover:bg-accent-blue/90 text-white shadow-[0_8px_20px_-4px_rgba(34,211,238,0.4)]"
                                )}
                            >
                                {isBlocked ? (
                                    <div className="flex items-center gap-2">
                                        <Lock className="size-3.5" />
                                        Bloqueada
                                    </div>
                                ) : isDraft ? (
                                    <div className="flex items-center gap-2">
                                        <Lock className="size-3.5" />
                                        Borrador
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        Abrir actividad
                                        <ChevronRight className="size-3.5" />
                                    </div>
                                )}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </aside>
    );
}
