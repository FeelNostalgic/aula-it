"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award } from "lucide-react";
import { ClassBadgesWidget } from "@/components/dashboard/badges/class-badges-widget";
import ClassBadgesManager from "@/components/dashboard/badges/class-badges-manager";
import { ClassBadge } from "@/types/database";

interface BadgesPageWrapperProps {
    unitId: string;
    badges: ClassBadge[];
    isTeacher: boolean;
}

export function BadgesPageWrapper({ unitId, badges, isTeacher }: BadgesPageWrapperProps) {
    const [isBadgesExpanded, setIsBadgesExpanded] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const savedBadges = localStorage.getItem('aula-it:unit-view:badges-expanded');
        if (savedBadges !== null) setIsBadgesExpanded(savedBadges === 'true');
        setIsReady(true);
    }, []);

    const handleToggleBadges = (expanded: boolean) => {
        setIsBadgesExpanded(expanded);
        localStorage.setItem('aula-it:unit-view:badges-expanded', expanded.toString());
    };

    const globalBadges = badges.filter(b => !b.activity_id);

    return (
        <div className="flex flex-col gap-6">
            {isReady && globalBadges.length > 0 && (
                <div className="relative">
                    <AnimatePresence mode="wait" initial={false}>
                        {isBadgesExpanded ? (
                            <motion.div
                                key="badges-expanded"
                                layoutId="badges-section"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                            >
                                <ClassBadgesWidget 
                                    badges={globalBadges} 
                                    studentBadges={[]} 
                                    isTeacher={isTeacher} 
                                    onToggle={() => handleToggleBadges(false)}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="badges-collapsed"
                                layoutId="badges-section"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="bg-surface border border-border-subtle rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-accent-amber/30 transition-colors shadow-sm"
                                onClick={() => handleToggleBadges(true)}
                            >
                                <motion.div 
                                    layoutId="badges-icon"
                                    className="size-10 rounded-xl bg-accent-amber/10 flex items-center justify-center text-accent-amber"
                                >
                                    <Award className="size-5" />
                                </motion.div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Insignias Globales</h3>
                                    <p className="text-xs text-text-muted">Pulsa sobre el icono para expandir</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-text-muted uppercase">Disponibles:</span>
                                    <div className="flex -space-x-2">
                                        {globalBadges.slice(0, 3).map((b) => (
                                            <div key={b.id} className="size-6 rounded-full bg-surface border-2 border-background flex items-center justify-center shadow-sm">
                                                <Award className="size-3 text-accent-amber" />
                                            </div>
                                        ))}
                                        {globalBadges.length > 3 && (
                                            <div className="size-6 rounded-full bg-surface-dark border-2 border-background flex items-center justify-center text-[8px] font-bold text-text-muted">
                                                +{globalBadges.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            <ClassBadgesManager
                unitId={unitId}
                badges={badges}
            />
        </div>
    );
}
