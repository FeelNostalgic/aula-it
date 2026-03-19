"use client";

import { ActivityPhaseWithSteps, ActivityStepWithClientState, ActivityStepType, ActivitySubmission } from "@/types/activity";
import { getStepIcon, getTabStepIcon } from "@/lib/constants/step-icons";
import {
    ArrowLeft, FileText, Lock,
    ChevronLeft, ChevronRight, ChevronDown, Folder, FolderOpen, X, Zap, Eye, CheckCircle2, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { StepViewer } from "./viewers/step-viewer";
import { markStepViewed } from "@/app/activities/[id]/actions";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { UserNav } from "@/components/dashboard/user-nav";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface StudentPreviewProps {
    activity: any;
    phases: ActivityPhaseWithSteps[];
    onExitPreview: () => void;
    user?: any;
    profile?: any;
    hideHeader?: boolean;
    submissionsMap?: Record<string, ActivitySubmission>;
    viewsMap?: Record<string, boolean>;
    googleEmail?: string | null;
    isPreview?: boolean;
}

function StepXpBadge({ xp }: { xp: number }) {
    if (xp <= 0) return null;

    let colorClass = "text-accent-blue bg-accent-blue/10 border-accent-blue/20";
    if (xp >= 500) {
        colorClass = "text-accent-purple bg-accent-purple/10 border-accent-purple/20 shadow-[0_0_8px_rgba(168,85,247,0.2)]";
    } else if (xp >= 100) {
        colorClass = "text-accent-amber bg-accent-amber/10 border-accent-amber/20 opacity-90";
    }

    return (
        <div className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-mono font-bold tracking-tight shrink-0",
            colorClass
        )}>
            <Zap className="size-2.5 fill-current opacity-70" />
            {xp}
        </div>
    );
}

function StepStatusBadge({ status, type }: { status?: string; type: ActivityStepType }) {
    if (!status && (type === 'deliverable' || type === 'file_upload' || type === 'quiz')) {
        return (
            <div className="px-1.5 py-0.5 rounded-md border border-border/50 text-[8px] font-bold uppercase tracking-wider text-text-muted shrink-0">
                Pendiente
            </div>
        );
    }

    if (!status) return null;

    const config = {
        pending: { label: "Pendiente", class: "text-text-muted bg-surface border-border/50" },
        submitted: { label: "Enviado", class: "text-accent-blue bg-accent-blue/10 border-accent-blue/20" },
        graded: { label: "Calificado", class: "text-accent-green bg-accent-green/10 border-accent-green/20" },
        completed: { label: "Hecho", class: "text-accent-green bg-accent-green/10 border-accent-green/20" },
    }[status] || { label: status, class: "text-text-muted bg-surface border-border/50" };

    return (
        <div className={cn(
            "px-1.5 py-0.5 rounded-md border text-[8px] font-bold uppercase tracking-wider shrink-0",
            config.class
        )}>
            {config.label}
        </div>
    );
}


export function StudentPreview({ activity, phases, onExitPreview, user, profile, hideHeader = false, submissionsMap, viewsMap, googleEmail, isPreview = false }: StudentPreviewProps) {
    const allSteps = useMemo(() => {
        return phases.flatMap(p => p.steps.filter(s => s.is_visible !== false));
    }, [phases]);

    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [openStepIds, setOpenStepIds] = useState<string[]>([]);
    const [collapsedPhases, setCollapsedPhases] = useState<string[]>([]);
    const [localViews, setLocalViews] = useState<Record<string, boolean>>(viewsMap ?? {});
    const [markingViewed, setMarkingViewed] = useState(false);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (!hasInitialized.current && allSteps.length > 0) {
            const firstStep = allSteps[0];
            if (firstStep) {
                setSelectedStepId(firstStep.id);
                setOpenStepIds([firstStep.id]);
                hasInitialized.current = true;
            }
        }
    }, [allSteps]);

    const selectedStep = useMemo(() => {
        return allSteps.find(s => s.id === selectedStepId);
    }, [allSteps, selectedStepId]);

    const selectedStepIndex = useMemo(() => {
        return allSteps.findIndex(s => s.id === selectedStepId);
    }, [allSteps, selectedStepId]);

    const handleStepSelect = (stepId: string) => {
        setSelectedStepId(stepId);
        if (!openStepIds.includes(stepId)) {
            setOpenStepIds(prev => [...prev, stepId]);
        }
    };

    const handleCloseTab = (e: React.MouseEvent, stepId: string) => {
        e.stopPropagation();
        const newOpenIds = openStepIds.filter(id => id !== stepId);
        setOpenStepIds(newOpenIds);

        if (selectedStepId === stepId) {
            setSelectedStepId(newOpenIds.length > 0 ? newOpenIds[newOpenIds.length - 1] : null);
        }
    };

    const togglePhase = (phaseId: string) => {
        setCollapsedPhases(prev =>
            prev.includes(phaseId) ? prev.filter(id => id !== phaseId) : [...prev, phaseId]
        );
    };

    const handlePrev = () => {
        if (selectedStepIndex > 0) {
            handleStepSelect(allSteps[selectedStepIndex - 1].id);
        }
    };

    const handleNext = () => {
        if (selectedStepIndex < allSteps.length - 1) {
            handleStepSelect(allSteps[selectedStepIndex + 1].id);
        }
    };

    const handleMarkViewed = async () => {
        if (!selectedStep || markingViewed) return;
        setMarkingViewed(true);
        const result = await markStepViewed(selectedStep.id, activity.id);
        if (!result?.error) {
            setLocalViews(prev => ({ ...prev, [selectedStep.id]: true }));
        }
        setMarkingViewed(false);
    };

    return (
        <div className="flex flex-col h-full bg-background text-foreground overflow-hidden font-sans">
            {!hideHeader && (
                <>
                    {/* === HEADER (identical to teacher: edit/client.tsx line 132) === */}
                    <header className="h-[68px] border-b border-border/50 bg-background flex items-center justify-between px-6 shrink-0 z-40">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="icon"
                                className="size-8 rounded-lg border-border/50 hover:bg-accent/10 transition-colors"
                                onClick={onExitPreview}
                            >
                                <ArrowLeft className="size-4" />
                            </Button>
                            <DashboardBreadcrumb />
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 px-3 py-1 bg-accent-blue/5 border border-accent-blue/20 rounded-full">
                                <div className="size-1.5 rounded-full bg-accent-blue animate-pulse" />
                                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent-blue">
                                    Modo Misión
                                </span>
                            </div>
                            {user && profile && (
                                <UserNav
                                    userEmail={user.email || ""}
                                    userName={profile?.full_name || user.user_metadata?.full_name || "Usuario"}
                                    isTeacher={false}
                                    userId={user.id}
                                    userAvatar={user.user_metadata?.avatar_url}
                                />
                            )}
                        </div>
                    </header>
                </>
            )}

            {isPreview && (
                <div className="shrink-0 flex items-center gap-3 px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
                    <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-200/80">
                        <span className="font-bold text-amber-400">Vista Previa del Profesor</span>
                        {" — "}Las entregas, marcas de visto y cuestionarios no se guardarán.
                    </p>
                </div>
            )}

            <ResizablePanelGroup id="student-preview-panel-group" direction="horizontal" className="flex-1 overflow-hidden">
                {/* === SIDEBAR (identical to teacher: mission-builder-sidebar.tsx line 604-753) === */}
                <ResizablePanel id="sidebar-panel" defaultSize={12} minSize={10} maxSize={40} className="bg-background h-full flex flex-col">
                    <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0">
                        <h2 className="font-bold text-sm tracking-tight text-foreground uppercase">Estructura de Misión</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        {phases.map(phase => {
                            const isExpanded = !collapsedPhases.includes(phase.id);
                            const visibleSteps = phase.steps.filter(s => s.is_visible !== false);

                            return (
                                <div key={phase.id} className="flex flex-col mb-4">
                                    {/* Phase Header — matches SortablePhaseHeader styling */}
                                    <div
                                        data-phase-title={phase.title}
                                        className="group flex items-center justify-between p-2 rounded-md transition-colors border border-transparent hover:bg-surface-dark cursor-pointer"
                                        onClick={() => togglePhase(phase.id)}
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <button className="text-text-muted hover:text-foreground transition-colors shrink-0">
                                                {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                            </button>
                                            {isExpanded ? (
                                                <FolderOpen className="size-4 text-accent-orange shrink-0" />
                                            ) : (
                                                <Folder className="size-4 text-accent-orange shrink-0" />
                                            )}
                                            <h3 className="font-bold text-sm text-foreground truncate">{phase.title}</h3>
                                        </div>
                                    </div>

                                    {/* Phase Steps — matches SortableStepItem styling */}
                                    {isExpanded && (
                                        <div className="mt-1 flex flex-col">
                                            {visibleSteps.length === 0 ? (
                                                <div className="text-xs text-text-muted italic pl-8 py-2 border-l-2 border-transparent">Sin pasos visibles.</div>
                                            ) : (
                                                visibleSteps.map(step => {
                                                    const isActive = selectedStepId === step.id;
                                                    return (
                                                        <div
                                                            key={step.id}
                                                            data-step-title={step.title}
                                                            onClick={() => !step.is_locked && handleStepSelect(step.id)}
                                                            className={cn(
                                                                "group flex items-center gap-2.5 py-2.5 px-3 pl-8 text-[13px] cursor-pointer transition-all border-l-2",
                                                                isActive
                                                                    ? "bg-surface/50 border-accent-blue text-foreground shadow-sm"
                                                                    : "border-transparent hover:bg-surface-dark/50 text-text-muted hover:text-foreground",
                                                                step.is_locked && "opacity-40 cursor-not-allowed"
                                                            )}
                                                        >
                                                            {step.is_locked ? (
                                                                <Lock className="size-3.5 text-text-muted shrink-0" />
                                                            ) : (
                                                                <div className={cn("shrink-0", isActive ? "text-accent-blue" : "text-text-muted group-hover:text-foreground")}>
                                                                    {getStepIcon(step.type)}
                                                                </div>
                                                            )}
                                                            <span className="flex-1 truncate font-medium">{step.title}</span>
                                                            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                                                <StepStatusBadge status={submissionsMap?.[step.id]?.status} type={step.type} />
                                                                <StepXpBadge xp={step.xp || 0} />
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {phases.length === 0 && (
                            <div className="text-center p-6 text-sm text-text-muted">
                                No hay fases en esta actividad.
                            </div>
                        )}
                    </div>
                </ResizablePanel>

                <ResizableHandle className="w-0 border-r border-border/50 hover:border-accent-blue/50 transition-colors data-resize-handle-active:border-accent-blue" />

                {/* === MAIN CONTENT AREA === */}
                <ResizablePanel id="main-content" defaultSize={80} className="h-full bg-background relative flex flex-col min-w-0">
                    {/* Tabs Bar — matches EditorTabsBar styling (editor-tabs-bar.tsx) */}
                    {openStepIds.length > 0 ? (
                        <div className="h-10 shrink-0 bg-surface-dark border-b border-border/50 flex">
                            <div className="flex items-center h-full flex-1 overflow-x-auto no-scrollbar">
                                {openStepIds.map(stepId => {
                                    const step = allSteps.find(s => s.id === stepId);
                                    if (!step) return null;
                                    const isActive = selectedStepId === stepId;
                                    return (
                                        <div
                                            key={stepId}
                                            onClick={() => setSelectedStepId(stepId)}
                                            onAuxClick={(e) => {
                                                if (e.button === 1) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleCloseTab(e, stepId);
                                                }
                                            }}
                                            className={cn(
                                                "group flex items-center h-full min-w-32 max-w-64 px-3 border-r border-border/50 text-xs cursor-pointer select-none transition-colors",
                                                isActive
                                                    ? "bg-background border-t-2 border-t-accent-blue text-foreground"
                                                    : "bg-surface-dark border-t-2 border-t-transparent text-text-muted hover:bg-surface hover:text-foreground"
                                            )}
                                        >
                                            <div className="mr-2 shrink-0">
                                                {getTabStepIcon(step.type)}
                                            </div>
                                            <span className="truncate flex-1 font-medium">{step.title}</span>
                                            <button
                                                onClick={(e) => handleCloseTab(e, stepId)}
                                                className="ml-2 size-5 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 hover:bg-border/50 text-text-muted hover:text-foreground transition-all shrink-0"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Step Counter + Navigation */}
                            <div className="flex items-center gap-1 px-4 border-l border-border/50 h-full shrink-0">
                                <span className="text-[10px] font-mono text-text-muted mr-2">
                                    {selectedStepIndex + 1} / {allSteps.length}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-text-muted hover:text-foreground"
                                    disabled={selectedStepIndex <= 0}
                                    onClick={handlePrev}
                                >
                                    <ChevronLeft className="size-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-text-muted hover:text-foreground"
                                    disabled={selectedStepIndex >= allSteps.length - 1}
                                    onClick={handleNext}
                                >
                                    <ChevronRight className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-10 shrink-0 bg-surface-dark border-b border-border/50 flex items-center px-4 text-xs text-text-muted">
                            Ningún paso abierto
                        </div>
                    )}

                    {/* Viewer */}
                    {selectedStep ? (
                        selectedStep.type === 'animation' ? (
                            <div className="flex-1 overflow-hidden bg-background flex flex-col">
                                <div className="flex-1 overflow-hidden p-4">
                                    <StepViewer
                                        step={selectedStep}
                                        activityId={activity.id}
                                        submission={submissionsMap?.[selectedStep.id]}
                                        googleEmail={googleEmail}
                                        userId={user?.id}
                                    />
                                </div>
                                <div className="flex justify-between items-center px-6 py-3 border-t border-border/50 shrink-0">
                                    <Button
                                        variant="outline"
                                        className="border-border/50 hover:bg-surface-dark h-10 px-6 text-sm font-medium"
                                        onClick={handlePrev}
                                        disabled={selectedStepIndex <= 0}
                                    >
                                        <ChevronLeft className="size-4 mr-2" /> Anterior
                                    </Button>
                                    {selectedStep.completion_mode === 'viewable' && (
                                        localViews[selectedStep.id] ? (
                                            <Button
                                                className="bg-green-600/50 text-white cursor-not-allowed h-10 px-6 text-sm font-medium"
                                                disabled
                                            >
                                                <CheckCircle2 className="size-4 mr-2" /> Visto
                                            </Button>
                                        ) : (
                                            <Button
                                                className="bg-green-600 hover:bg-green-700 text-white h-10 px-6 text-sm font-medium disabled:opacity-50"
                                                onClick={handleMarkViewed}
                                                disabled={markingViewed || isPreview}
                                            >
                                                <Eye className="size-4 mr-2" />
                                                {markingViewed ? "Guardando..." : "Marcar como visto"}
                                            </Button>
                                        )
                                    )}
                                    <Button
                                        className="bg-accent-blue hover:bg-accent-blue/90 text-white px-8 h-10 text-sm font-medium"
                                        onClick={handleNext}
                                        disabled={selectedStepIndex >= allSteps.length - 1}
                                    >
                                        {selectedStepIndex >= allSteps.length - 1 ? "Completar Misión" : "Siguiente Paso"}
                                        <ChevronRight className="size-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                        <div className="flex-1 overflow-y-auto p-12 bg-background relative">
                            <div className="max-w-4xl mx-auto space-y-12">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="px-2 py-0.5 bg-accent-blue/10 border border-accent-blue/20 rounded-md">
                                            <span className="text-[9px] font-bold text-accent-blue uppercase tracking-widest px-1">
                                                {selectedStep.type}
                                            </span>
                                        </div>
                                        <div className="h-px flex-1 bg-linear-to-r from-border/50 to-transparent" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-foreground tracking-tight leading-none">
                                        {selectedStep.title}
                                    </h2>
                                </div>

                                <StepViewer
                                    step={selectedStep}
                                    activityId={activity.id}
                                    submission={submissionsMap?.[selectedStep.id]}
                                    googleEmail={googleEmail}
                                    userId={user?.id}
                                    isPreview={isPreview}
                                />

                                {/* Navigation footer */}
                                <div className="flex justify-between items-center pt-8 border-t border-border/50 mt-8">
                                    <Button
                                        variant="outline"
                                        className="border-border/50 hover:bg-surface-dark h-10 px-6 text-sm font-medium"
                                        onClick={handlePrev}
                                        disabled={selectedStepIndex <= 0}
                                    >
                                        <ChevronLeft className="size-4 mr-2" /> Anterior
                                    </Button>
                                    {selectedStep.completion_mode === 'viewable' && (
                                        localViews[selectedStep.id] ? (
                                            <Button
                                                className="bg-green-600/50 text-white cursor-not-allowed h-10 px-6 text-sm font-medium"
                                                disabled
                                            >
                                                <CheckCircle2 className="size-4 mr-2" /> Visto
                                            </Button>
                                        ) : (
                                            <Button
                                                className="bg-green-600 hover:bg-green-700 text-white h-10 px-6 text-sm font-medium disabled:opacity-50"
                                                onClick={handleMarkViewed}
                                                disabled={markingViewed || isPreview}
                                            >
                                                <Eye className="size-4 mr-2" />
                                                {markingViewed ? "Guardando..." : "Marcar como visto"}
                                            </Button>
                                        )
                                    )}
                                    <Button
                                        className="bg-accent-blue hover:bg-accent-blue/90 text-white px-8 h-10 text-sm font-medium"
                                        onClick={handleNext}
                                        disabled={selectedStepIndex >= allSteps.length - 1}
                                    >
                                        {selectedStepIndex >= allSteps.length - 1 ? "Completar Misión" : "Siguiente Paso"}
                                        <ChevronRight className="size-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        )
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
                            <FileText className="size-12 mb-4 opacity-20" />
                            <p>Selecciona o abre un paso en la estructura de misión.</p>
                        </div>
                    )}
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
