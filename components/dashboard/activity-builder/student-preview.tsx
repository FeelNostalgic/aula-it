import { ActivityPhaseWithSteps, ActivityStepWithClientState } from "@/types/activity";
import { ArrowLeft, PlayCircle, FileText, CheckCircle, Lock, MonitorPlay, CheckSquare, FolderDown, PlaySquare, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { StepViewer } from "./viewers/step-viewer";

interface StudentPreviewProps {
    activity: any;
    phases: ActivityPhaseWithSteps[];
    onExitPreview: () => void;
}

export function StudentPreview({ activity, phases, onExitPreview }: StudentPreviewProps) {
    const allSteps = useMemo(() => {
        return phases.flatMap(p => p.steps);
    }, [phases]);

    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedStepId && allSteps.length > 0) {
            const firstVisible = allSteps.find(s => s.is_visible !== false);
            if (firstVisible) {
                setSelectedStepId(firstVisible.id);
            }
        }
    }, [allSteps, selectedStepId]);

    const selectedStep = useMemo(() => {
        return allSteps.find(s => s.id === selectedStepId);
    }, [allSteps, selectedStepId]);

    const selectedStepIndex = useMemo(() => {
        return allSteps.findIndex(s => s.id === selectedStepId);
    }, [allSteps, selectedStepId]);

    const handlePrev = () => {
        if (selectedStepIndex > 0) {
            setSelectedStepId(allSteps[selectedStepIndex - 1].id);
        }
    };

    const handleNext = () => {
        if (selectedStepIndex < allSteps.length - 1) {
            setSelectedStepId(allSteps[selectedStepIndex + 1].id);
        }
    };

    const getStepIcon = (type: string) => {
        switch (type) {
            case 'theory': return <FileText className="size-4 text-accent-blue" />;
            case 'deliverable': return <CheckCircle className="size-4 text-emerald-400" />;
            case 'animation': return <PlaySquare className="size-4 text-pink-400" />;
            case 'quiz': return <CheckSquare className="size-4 text-accent-orange" />;
            case 'presentation': return <MonitorPlay className="size-4 text-emerald-400" />;
            case 'resource': return <FolderDown className="size-4 text-accent-blue" />;
            default: return <PlayCircle className="size-4" />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Top Bar */}
            <div className="h-14 bg-surface-dark border-b border-border flex items-center justify-between px-6 shadow-sm z-50 w-full shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={onExitPreview} className="text-text-muted hover:text-foreground h-8 px-2">
                        <ArrowLeft className="size-4 mr-2" />
                        Editor
                    </Button>
                    <div className="h-4 w-px bg-border/50" />
                    <div className="flex items-center gap-3">
                        {activity.logo_url && (
                            <img src={activity.logo_url} className="size-6 rounded object-cover" alt="" />
                        )}
                        <span className="text-sm font-bold text-foreground truncate max-w-[200px]">
                            {activity.title}
                        </span>
                    </div>
                    <div className="h-4 w-px bg-border/50" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded border border-accent-blue/20">
                        Vista Alumno
                    </span>
                </div>

                <div className="flex items-center gap-4 text-text-muted text-xs">
                    <div className="flex items-center gap-1.5">
                        <GraduationCap className="size-4" />
                        <span>Aula IT Laboratory</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar (Phases & Steps) */}
                <div className="w-72 bg-surface border-r border-border/50 flex flex-col shrink-0">
                    <div className="p-4 border-b border-border/50 bg-surface-dark/30">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Misión Activa</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-3 space-y-6 pb-20">
                            {phases.map((phase, pIdx) => (
                                <div key={phase.id} className="space-y-1">
                                    <div className="px-2 py-1.5 flex items-center gap-2 mb-1">
                                        <span className="size-5 rounded bg-surface-dark border border-border/50 flex items-center justify-center text-[10px] font-bold text-text-muted">
                                            {pIdx + 1}
                                        </span>
                                        <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider truncate">
                                            {phase.title}
                                        </span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {phase.steps.filter(s => s.is_visible !== false).map((step) => (
                                            <button
                                                key={step.id}
                                                onClick={() => !step.is_locked && setSelectedStepId(step.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group relative",
                                                    selectedStepId === step.id
                                                        ? "bg-accent-blue/10 text-accent-blue ring-1 ring-accent-blue/20"
                                                        : "text-text-muted hover:bg-surface-light border border-transparent",
                                                    step.is_locked && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                <div className="shrink-0 transition-transform group-hover:scale-110">
                                                    {step.is_locked ? <Lock className="size-4 text-text-muted" /> : getStepIcon(step.type)}
                                                </div>
                                                <span className="flex-1 text-left truncate font-medium">
                                                    {step.title}
                                                </span>
                                                {selectedStepId === step.id && (
                                                    <div className="size-1.5 rounded-full bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                )}
                                            </button>
                                        ))}
                                        {phase.steps.filter(s => s.is_visible !== false).length === 0 && (
                                            <div className="px-3 py-2 text-[10px] text-text-muted/40 italic">
                                                Sin pasos disponibles
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-background flex flex-col relative overflow-hidden">
                    {selectedStep ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Step Header */}
                            <div className="h-10 bg-surface-dark border-b border-border/30 flex items-center px-6 gap-4 shrink-0">
                                <div className="flex items-center gap-2">
                                    {getStepIcon(selectedStep.type)}
                                    <span className="text-xs font-semibold text-foreground truncate max-w-[400px]">{selectedStep.title}</span>
                                </div>
                                <div className="h-4 w-px bg-border/50" />
                                <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest">
                                    {selectedStep.type}
                                </span>
                                <div className="flex-1" />
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 text-text-muted hover:text-foreground"
                                        disabled={selectedStepIndex <= 0}
                                        onClick={handlePrev}
                                    >
                                        <ChevronLeft className="size-4" />
                                    </Button>
                                    <span className="text-[10px] font-mono text-text-muted/50 px-2 uppercase tracking-tighter">
                                        Paso {selectedStepIndex + 1} / {allSteps.length}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 text-text-muted hover:text-foreground"
                                        disabled={selectedStepIndex >= allSteps.length - 1}
                                        onClick={handleNext}
                                    >
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Viewer */}
                            <div className="flex-1 overflow-y-auto p-12 bg-grid-pattern pb-32">
                                <div className="max-w-4xl mx-auto space-y-12">
                                    <div className="space-y-4">
                                        <h2 className="text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                                            {selectedStep.title}
                                        </h2>
                                        <div className="h-1 w-20 bg-accent-blue rounded-full" />
                                    </div>

                                    <StepViewer step={selectedStep} />

                                    {/* Navigation footer buttons */}
                                    <div className="flex justify-between items-center pt-12 border-t border-border/30 mt-12">
                                        <Button
                                            variant="outline"
                                            className="border-border/50 hover:bg-surface h-10 px-6 font-semibold"
                                            onClick={handlePrev}
                                            disabled={selectedStepIndex <= 0}
                                        >
                                            <ChevronLeft className="size-4 mr-2" /> Anterior
                                        </Button>
                                        <Button
                                            className="bg-accent-blue hover:bg-accent-blue/90 text-white px-10 h-10 font-bold shadow-lg shadow-accent-blue/20"
                                            onClick={handleNext}
                                            disabled={selectedStepIndex >= allSteps.length - 1}
                                        >
                                            {selectedStepIndex >= allSteps.length - 1 ? "Completar Actividad" : "Siguiente Paso"}
                                            <ChevronRight className="size-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-grid-pattern">
                            <div className="size-20 rounded-3xl bg-surface border border-border/50 flex items-center justify-center mb-6 shadow-2xl skew-y-3">
                                <PlayCircle className="size-8 text-accent-blue" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">Comienza la Actividad</h2>
                            <p className="text-text-muted max-w-md">
                                Selecciona el primer paso en la barra lateral izquierda para comenzar tu aventura de aprendizaje.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
