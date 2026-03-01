import { ActivityPhaseWithSteps } from "@/types/activity";
import { ArrowLeft, PlayCircle, FileText, CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StudentPreviewProps {
    activity: any;
    phases: ActivityPhaseWithSteps[];
    onExitPreview: () => void;
}

export function StudentPreview({ activity, phases, onExitPreview }: StudentPreviewProps) {
    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Top Bar for Preview */}
            <div className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 shadow-sm z-10 w-full shrink-0">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={onExitPreview} className="text-text-muted hover:text-foreground">
                        <ArrowLeft className="size-4 mr-2" />
                        Volver al Editor
                    </Button>
                    <div className="h-4 w-px bg-border/50 hidden md:block" />
                    <span className="text-xs uppercase tracking-widest font-bold text-accent-blue/80 bg-accent-blue/10 px-2 py-1 rounded">
                        Modo Vista Alumno
                    </span>
                </div>
                <div className="text-sm font-semibold text-foreground">
                    {activity.title}
                </div>
            </div>

            {/* Simulated Player View */}
            <div className="flex-1 overflow-auto p-8 relative flex justify-center bg-surface-dark/10">
                <div className="max-w-4xl w-full">
                    {/* Header */}
                    <div className="mb-12 text-center">
                        <h1 className="text-4xl font-extrabold text-foreground mb-4">
                            {activity.title}
                        </h1>
                        <p className="text-text-muted text-lg max-w-2xl mx-auto">
                            {activity.description || "Sin descripción proporcionada."}
                        </p>
                    </div>

                    {/* Phases and Steps Mockup */}
                    <div className="space-y-8">
                        {phases.map((phase, pIndex) => (
                            <div key={phase.id} className="bg-surface/30 border border-white/5 rounded-2xl overflow-hidden">
                                <div className="p-6 border-b border-white/5 bg-surface/50">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <span className="text-text-muted/50 text-base font-medium">Fase {pIndex + 1}</span>
                                        <span className="text-foreground">{phase.title}</span>
                                    </h3>
                                </div>

                                <div className="p-4 grid gap-3">
                                    {phase.steps.filter((s: any) => s.is_visible !== false).length === 0 ? (
                                        <div className="text-center p-8 text-text-muted/50 text-sm">
                                            No hay pasos visibles en esta fase.
                                        </div>
                                    ) : (
                                        phase.steps.filter((s: any) => s.is_visible !== false).map((step: any, index: number) => (
                                            <div
                                                key={step.id}
                                                className={`flex items-center justify-between p-4 rounded-xl border ${step.is_locked ? 'border-border/30 bg-background/30 opacity-60' : 'border-white/10 bg-surface hover:bg-surface-light transition-colors'} group`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${step.is_locked ? 'bg-surface-dark text-text-muted/50' : 'bg-accent-blue/10 text-accent-blue'}`}>
                                                        {step.is_locked ? <Lock className="size-4" /> : <PlayCircle className="size-5" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-foreground">{step.title}</h4>
                                                        <div className="flex items-center gap-2 text-xs text-text-muted mt-1 uppercase tracking-wider font-mono">
                                                            <span>Paso {index + 1}</span>
                                                            <span>•</span>
                                                            <span>{step.type}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {!step.is_locked && (
                                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Comenzar
                                                    </Button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}

                        {phases.length === 0 && (
                            <div className="text-center p-12 bg-surface/20 rounded-xl border-dashed border-2 border-border/50">
                                <FileText className="size-12 text-text-muted/30 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-foreground mb-2">No hay contenido</h3>
                                <p className="text-text-muted">Añade fases y pasos en el editor para previsualizarlos aquí.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
