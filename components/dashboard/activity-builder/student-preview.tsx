import { ActivityPhaseWithSteps, ActivityStepWithClientState } from "@/types/activity";
import { ArrowLeft, PlayCircle, FileText, CheckCircle, Lock, MonitorPlay, CheckSquare, FolderDown, PlaySquare, GraduationCap, ChevronLeft, ChevronRight, Folder, ChevronDown } from "lucide-react";
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
        <div className="flex flex-col h-full bg-background text-text relative overflow-hidden">
            {/* Top Bar - Matches global IDE header */}
            <header className="h-14 border-b border-border-strong bg-surface flex items-center justify-between px-6 shrink-0 relative z-10">
                <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Button variant="ghost" size="sm" onClick={onExitPreview} className="text-text-muted hover:text-foreground h-8 px-2 -ml-2">
                        <ArrowLeft className="size-4 mr-2" />
                        Atrás
                    </Button>
                    <ChevronRight className="size-4 opacity-50" />
                    <div className="flex items-center gap-2">
                        {activity.logo_url && (
                            <img src={activity.logo_url} className="size-5 rounded object-cover" alt="" />
                        )}
                        <span className="font-semibold text-foreground truncate max-w-[200px]">
                            {activity.title}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded border border-accent-blue/20">
                        Vista Alumno
                    </span>
                    <div className="flex items-center gap-1.5 text-text-muted text-xs">
                        <GraduationCap className="size-4" />
                        <span>Aula IT</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Sidebar (Phases & Steps) - Matches MissionBuilderSidebar */}
                <div className="w-[300px] border-r border-border-strong bg-surface flex flex-col relative z-10 transition-all duration-300">
                    <div className="h-14 border-b border-border-strong flex items-center justify-between px-4 bg-surface/50 backdrop-blur-md sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            <div className="size-6 rounded bg-accent-blue/10 flex items-center justify-center">
                                <Folder className="size-3.5 text-accent-blue" />
                            </div>
                            <span className="font-semibold text-sm text-foreground">Actividad</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto w-full p-3 space-y-4">
                        {phases.map((phase, pIdx) => (
                            <div key={phase.id} className="mb-4">
                                <div className="group flex items-center justify-between py-2 px-2 rounded-md transition-colors cursor-default">
                                    <div className="flex items-center gap-2">
                                        <ChevronDown className="size-4 text-text-muted" />
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-foreground">FASE {pIdx + 1}:</span>
                                            <span className="text-sm font-medium text-text-muted">{phase.title}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-1 space-y-0.5">
                                    {phase.steps.filter(s => s.is_visible !== false).map((step) => (
                                        <button
                                            key={step.id}
                                            onClick={() => !step.is_locked && setSelectedStepId(step.id)}
                                            className={cn(
                                                "w-full flex items-center gap-2 py-2 px-3 pl-8 text-sm cursor-pointer transition-colors border-l-2",
                                                selectedStepId === step.id
                                                    ? "bg-surface-dark border-accent-blue text-foreground"
                                                    : "border-transparent hover:bg-surface-dark text-text-muted hover:text-foreground",
                                                step.is_locked && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <div className="mr-1 shrink-0">
                                                {step.is_locked ? <Lock className="size-3.5 text-text-muted" /> : getStepIcon(step.type)}
                                            </div>
                                            <span className="flex-1 text-left truncate">
                                                {step.title}
                                            </span>
                                        </button>
                                    ))}
                                    {phase.steps.filter(s => s.is_visible !== false).length === 0 && (
                                        <div className="pl-8 py-2 text-xs text-text-muted/50 italic">
                                            Sin pasos disponibles
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Area - Matches Editor Panel */}
                <div className="flex-1 flex flex-col relative z-10 min-w-0 bg-background/50">
                    {selectedStep ? (
                        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                            {/* Tabs Bar equivalent */}
                            <div className="h-14 border-b border-border-strong bg-surface flex items-center justify-between px-4 shrink-0 relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-dark border border-border-strong text-sm font-medium text-foreground">
                                        {getStepIcon(selectedStep.type)}
                                        <span className="truncate max-w-[300px]">{selectedStep.title}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-text-muted hover:text-foreground"
                                        disabled={selectedStepIndex <= 0}
                                        onClick={handlePrev}
                                    >
                                        <ChevronLeft className="size-4" />
                                    </Button>
                                    <span className="text-[11px] font-mono text-text-muted/60 px-3 uppercase tracking-widest hidden sm:inline-block">
                                        Paso {selectedStepIndex + 1} / {allSteps.length}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-text-muted hover:text-foreground"
                                        disabled={selectedStepIndex >= allSteps.length - 1}
                                        onClick={handleNext}
                                    >
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Viewer */}
                            <div className="flex-1 overflow-y-auto p-12 bg-grid-pattern pb-32 w-full">
                                <div className="max-w-4xl mx-auto space-y-12">
                                    <div className="space-y-4">
                                        <h2 className="text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                                            {selectedStep.title}
                                        </h2>
                                        <div className="h-1 w-20 bg-accent-blue rounded-full" />
                                    </div>

                                    <StepViewer step={selectedStep} />

                                    {/* Navigation footer buttons */}
                                    <div className="flex justify-between items-center pt-12 border-t border-border-strong mt-12">
                                        <Button
                                            variant="outline"
                                            className="border-border-strong hover:bg-surface-dark h-11 px-6 font-semibold"
                                            onClick={handlePrev}
                                            disabled={selectedStepIndex <= 0}
                                        >
                                            <ChevronLeft className="size-4 mr-2" /> Anterior
                                        </Button>
                                        <Button
                                            className="bg-accent-blue hover:bg-accent-blue/90 text-white px-10 h-11 font-bold shadow-lg shadow-accent-blue/20"
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
                            <div className="size-20 rounded-3xl bg-surface border border-border-strong flex items-center justify-center mb-6 shadow-2xl skew-y-3">
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
