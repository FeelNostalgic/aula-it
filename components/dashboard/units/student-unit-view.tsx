"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Map as MapIcon,
    FolderOpen,
    Settings,
    Trophy,
    Target,
    Zap,
    LayoutList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnitMapView } from './unit-map-view';
import { StudentUnitListView } from './student-unit-list-view';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUIStore } from '@/lib/store/ui-store';

interface Activity {
    id: string;
    title: string;
    description: string | null;
    type: string;
    xp: number;
    duration: number | null;
    difficulty: string | null;
    status: 'published' | 'blocked' | 'draft';
    logo_url?: string | null;
    phasesCount?: number;
    position_x?: number;
    position_y?: number;
    order_index: number;
}

interface Connection {
    source_activity_id: string;
    target_activity_id: string;
}

interface StudentUnitViewProps {
    unit: any;
    activities: Activity[];
    connections: Connection[];
    onStartActivity: (id: string) => void;
}

export function StudentUnitView({
    unit,
    activities,
    connections,
    onStartActivity
}: StudentUnitViewProps) {
    const [activeTab, setActiveTab] = useState<'view' | 'resources'>('view');
    const { setIsFullscreen } = useUIStore();
    const isMapView = unit.view_type === 'map';

    // Calculate progress based on published activities
    const statusActivities = activities.filter(a => a.status !== 'draft');
    const publishedCount = statusActivities.filter(a => a.status === 'published').length;
    const totalCount = statusActivities.length || 1;
    const progressPercent = Math.round((publishedCount / totalCount) * 100);

    // Sync fullscreen state with view type and active tab
    useEffect(() => {
        if (isMapView && activeTab === 'view') {
            setIsFullscreen(true);
        } else {
            setIsFullscreen(false);
        }

        return () => setIsFullscreen(false);
    }, [isMapView, activeTab, setIsFullscreen]);

    return (
        <div className={cn(
            "flex bg-zinc-950 text-zinc-100 overflow-hidden font-sans",
            isMapView && activeTab === 'view' ? "h-[calc(100vh-64px)]" : "min-h-[calc(100vh-64px)] w-full"
        )}>
            {/* Left Sidebar */}
            <aside className="w-16 flex flex-col items-center py-6 border-r border-zinc-900 bg-zinc-950/50 backdrop-blur-xl shrink-0 z-50">
                <div className="flex flex-col gap-4 flex-1">
                    <SidebarItem
                        icon={isMapView ? <MapIcon className="w-5 h-5" /> : <LayoutList className="w-5 h-5" />}
                        label={isMapView ? "Mapa" : "Lista"}
                        active={activeTab === 'view'}
                        onClick={() => setActiveTab('view')}
                    />
                    <SidebarItem
                        icon={<FolderOpen className="w-5 h-5" />}
                        label="Recursos"
                        active={activeTab === 'resources'}
                        onClick={() => setActiveTab('resources')}
                    />
                </div>

                <div className="pb-2">
                    <SidebarItem
                        icon={<Settings className="w-5 h-5" />}
                        label="Ajustes"
                        active={false}
                        onClick={() => { }}
                    />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
                <div className="flex-1 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {activeTab === 'view' ? (
                            <motion.div
                                key="main-view"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="h-full w-full"
                            >
                                {isMapView ? (
                                    <UnitMapView
                                        activities={activities as any}
                                        connections={connections}
                                        onStartActivity={onStartActivity}
                                        hideBottomBar={true}
                                    />
                                ) : (
                                    <div className="h-full overflow-y-auto px-12 pt-12 pb-24">
                                        <StudentUnitListView
                                            unit={unit}
                                            activities={activities as any}
                                            onStartActivity={onStartActivity}
                                        />
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="resources-view"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="p-12 flex flex-col items-center justify-center h-full text-zinc-500"
                            >
                                <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
                                <h2 className="text-xl font-bold text-zinc-400">Recursos de la Unidad</h2>
                                <p className="text-sm">Próximamente disponibles...</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Fixed Bottom Bar */}
                <footer className="h-20 border-t border-zinc-900 bg-zinc-950/80 backdrop-blur-md px-8 flex items-center justify-between shrink-0 z-40">
                    {/* Progress Info */}
                    <div className="flex items-center gap-6 flex-1 max-w-md">
                        <div className="flex flex-col gap-1 min-w-[120px]">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">
                                <span>Progreso Total</span>
                                <span className="text-blue-400">{progressPercent}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                                <motion.div
                                    className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                />
                            </div>
                        </div>

                        <div className="h-10 w-px bg-zinc-800 hidden sm:block" />

                        <div className="hidden lg:flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                <Trophy className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <div className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter">Siguiente objetivo</div>
                                <div className="text-xs font-bold text-zinc-200">Examen de Módulo</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Level Info */}
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter italic">Tu Rango</div>
                            <div className="text-sm font-bold bg-linear-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent italic">Explorador de Sistemas</div>
                        </div>
                        <div className="size-12 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]">
                            <Zap className="w-6 h-6 text-blue-500 fill-blue-500" />
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}

function SidebarItem({
    icon,
    label,
    active,
    onClick
}: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300",
                active
                    ? "bg-blue-600/10 border border-blue-500/50 text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent"
            )}
        >
            {icon}

            {/* Tooltip */}
            <div className="absolute left-full ml-4 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold uppercase tracking-widest text-zinc-300 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-100">
                {label}
            </div>

            {/* Active Indicator */}
            {active && (
                <motion.div
                    layoutId="sidebar-active"
                    className="absolute -left-3 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                />
            )}
        </button>
    );
}
