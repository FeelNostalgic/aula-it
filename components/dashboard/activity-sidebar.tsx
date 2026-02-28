"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    History,
    MoreHorizontal,
    Trophy,
    PanelLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ActivitySidebarProps {
    appVersion: string;
    appStatus: string;
}

export function ActivitySidebar({ appVersion, appStatus }: ActivitySidebarProps) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="relative flex h-full shrink-0 z-30">
            <motion.aside
                initial={false}
                animate={{
                    width: isOpen ? 320 : 0,
                    opacity: isOpen ? 1 : 0
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-background border-r border-border/50 flex flex-col overflow-hidden relative h-full"
            >
                <div className="w-[320px] h-full flex flex-col p-6 overflow-y-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <History className="size-4 text-primary" />
                            <h3 className="font-bold text-sm tracking-tight text-foreground">Historial de Actividad</h3>
                        </div>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </div>

                    <div className="flex flex-col gap-8 flex-1">
                        <div className="relative pl-6 border-l border-border/30 space-y-8">
                            {/* Event 1 */}
                            <div className="relative">
                                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-primary ring-4 ring-background" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">hace 10m</span>
                                    <h4 className="text-xs font-bold text-foreground">Módulo <span className="text-primary">SOR</span> Accedido</h4>
                                    <Card className="mt-2 bg-card/30 border-border/30">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                                                [EXEC] TEST 101 COMPLETADO: <span className="text-primary font-bold">92% PUNTUACIÓN</span>
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* Event 2 */}
                            <div className="relative">
                                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-green-500 ring-4 ring-background" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">hace 2h</span>
                                    <h4 className="text-xs font-bold text-foreground">Tarea Subida</h4>
                                    <Card className="mt-2 bg-card/30 border-border/30">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                                                ESTUDIANTE SUBIÓ PROYECTO TEMA 3 TOPOLOGÍA DE RED
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* Event 3 */}
                            <div className="relative">
                                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-orange-500 ring-4 ring-background" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">hace 5h</span>
                                    <h4 className="text-xs font-bold text-foreground">Recordatorio</h4>
                                    <Card className="mt-2 bg-card/30 border-border/30">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] font-mono text-orange-500/80 leading-relaxed uppercase">
                                                [WARN] TAREA ATRASADA: CSS GRID LAYOUT
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* Event 4 */}
                            <div className="relative">
                                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-purple-500 ring-4 ring-background" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">hace 1d</span>
                                    <h4 className="text-xs font-bold text-foreground">Logro</h4>
                                    <Card className="mt-2 bg-card/30 border-border/30">
                                        <CardContent className="p-3 flex items-center gap-2">
                                            <Trophy className="size-4 text-purple-500" />
                                            <p className="text-[10px] font-mono text-foreground leading-relaxed uppercase">
                                                DESBLOQUEADO: MAESTRO DE GIT
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-border/50 flex flex-col gap-4">
                        <Button variant="outline" className="w-full h-9 text-[10px] font-mono uppercase tracking-widest bg-card border-border/50 hover:bg-muted transition-colors">
                            Ver Historial Completo
                        </Button>

                        <div className="text-center font-mono text-[9px] text-muted-foreground/60 tracking-widest uppercase mt-4">
                            build_id: v{appVersion} ({appStatus})
                        </div>
                    </div>
                </div>
            </motion.aside>

            {/* Refined Industrial Toggle Button */}
            <div className="absolute left-full top-0 z-40 ml-0">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(!isOpen)}
                    className="size-11 rounded-xl backdrop-blur-xl hover:bg-muted transition-all group"
                >
                    <PanelLeft className="size-5 text-foreground group-hover:text-muted-foreground transition-colors" />
                </Button>
            </div>
        </div>
    );
}
