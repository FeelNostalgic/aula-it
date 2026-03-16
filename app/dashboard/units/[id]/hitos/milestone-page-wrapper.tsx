"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, ChevronRight } from "lucide-react";
import { ClassMilestoneWidget } from "@/components/dashboard/class-milestone-widget";
import { UnitMilestoneTab } from "@/components/dashboard/unit-milestone-tab";
import { ClassMilestone } from "@/types/database";

interface MilestonePageWrapperProps {
    unitId: string;
    milestones: ClassMilestone[];
    isTeacher: boolean;
}

export function MilestonePageWrapper({ unitId, milestones, isTeacher }: MilestonePageWrapperProps) {
    const [isMilestoneExpanded, setIsMilestoneExpanded] = useState(true);
    const [isReady, setIsReady] = useState(false);

    const sortedMilestones = [...milestones].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const activeMilestone = sortedMilestones.find(m => m.status === 'active') ||
        [...sortedMilestones].reverse().find(m => m.status === 'completed') || null;

    useEffect(() => {
        const savedMilestone = localStorage.getItem('aula-it:unit-view:milestone-expanded');
        if (savedMilestone !== null) setIsMilestoneExpanded(savedMilestone === 'true');
        setIsReady(true);
    }, []);

    const handleToggleMilestone = (expanded: boolean) => {
        setIsMilestoneExpanded(expanded);
        localStorage.setItem('aula-it:unit-view:milestone-expanded', expanded.toString());
    };

    return (
        <div className="flex flex-col gap-6">
            {isReady && (activeMilestone || milestones.some(m => m.status === 'completed')) && (
                <div className="relative">
                    <AnimatePresence mode="wait" initial={false}>
                        {isMilestoneExpanded ? (
                            <motion.div
                                key="milestone-expanded"
                                layoutId="milestone-section"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                            >
                                <ClassMilestoneWidget 
                                    milestones={milestones} 
                                    activeMilestone={activeMilestone} 
                                    label="Objetivo de la Unidad" 
                                    onToggle={() => handleToggleMilestone(false)}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="milestone-collapsed"
                                layoutId="milestone-section"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="relative overflow-hidden bg-linear-to-br from-indigo-500/20 via-purple-500/15 to-pink-500/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-accent-blue/40 transition-all shadow-xl group ring-1 ring-white/5"
                                onClick={() => handleToggleMilestone(true)}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                                
                                <motion.div 
                                    layoutId="milestone-icon"
                                    className="relative z-10 size-10 rounded-xl bg-accent-blue/20 flex items-center justify-center text-accent-blue border border-accent-blue/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                                >
                                    <Target className="size-5" />
                                </motion.div>
                                <div className="flex-1 relative z-10">
                                    <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                                        {activeMilestone ? "Objetivo Actual" : "Objetivos de Unidad"}
                                        <span className="size-1 rounded-full bg-accent-blue animate-pulse" />
                                    </h3>
                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight opacity-70">Pulsa para ver el progreso del camino</p>
                                </div>
                                {activeMilestone && (
                                    <div className="relative z-10 flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-sm group-hover:bg-white/10 transition-colors">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-black text-accent-blue uppercase tracking-tighter leading-none mb-1">HITO ACTUAL</span>
                                            <span className="text-xs font-bold text-foreground leading-none">{activeMilestone.title}</span>
                                        </div>
                                        <div className="size-6 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                                            <ChevronRight className="size-3" />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            <UnitMilestoneTab 
                unitId={unitId} 
                initialMilestones={milestones} 
                isTeacher={isTeacher} 
            />
        </div>
    );
}
