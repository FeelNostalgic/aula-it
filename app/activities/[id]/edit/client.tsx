"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react"; // Changed from ChevronLeft to ArrowLeft
import { Button } from "@/components/ui/button";
import { ActivityPhaseWithSteps, ActivityStepWithClientState } from "@/types/activity";
import { toast } from "sonner"; // Added toast import
import { MissionBuilderSidebar } from "@/components/dashboard/activity-builder/mission-builder-sidebar"; // Uncommented and added
import { StepEditorPanel } from "@/components/dashboard/activity-builder/step-editor-panel"; // Uncommented and added

interface ActivityBuilderClientProps {
    activity: any;
    initialPhases: ActivityPhaseWithSteps[];
}

export function ActivityBuilderClient({ activity, initialPhases }: ActivityBuilderClientProps) {
    const router = useRouter();
    const [phases, setPhases] = useState<ActivityPhaseWithSteps[]>(initialPhases);

    // Track selected step
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

    const handleBackToMap = () => { // Renamed from handleReturnToMap
        if (activity.unit?.id) {
            router.push(`/dashboard/modules/${activity.unit.module_id}/units/${activity.unit.id}`);
        } else {
            router.push('/dashboard');
        }
    };

    // Find the currently selected step to pass to the editor
    const selectedStep = phases
        .flatMap(p => p.steps)
        .find(s => s.id === selectedStepId) as ActivityStepWithClientState | undefined;

    const handleUpdateStep = (updatedStep: ActivityStepWithClientState) => {
        // Here we will update the step content optimistically
        // and trigger the server action (debounced if text)
        setPhases(current =>
            current.map(phase => ({
                ...phase,
                steps: phase.steps.map(step =>
                    step.id === updatedStep.id ? updatedStep : step
                )
            }))
        );
    };

    return (
        <div className="flex flex-col h-screen w-full bg-background overflow-hidden relative">
            {/* Top Navigation Bar - IMMERSIVE */}
            <header className="shrink-0 h-16 border-b border-white/5 bg-surface/50 backdrop-blur-xl flex items-center justify-between px-4 z-10">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-text-muted hover:text-white hover:bg-white/5"
                        onClick={handleBackToMap}
                    >
                        <ArrowLeft className="size-5" />
                    </Button>
                    <div className="flex flex-col">
                        <span className="text-xs text-text-muted font-mono tracking-wider uppercase">Constructor de Misión</span>
                        <h1 className="text-sm font-semibold text-foreground truncate max-w-[300px]">
                            {activity.title}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Add publish/draft status here later */}
                    <div className="h-2 w-2 rounded-full bg-primary/50 animate-pulse" title="Guardado automático activo"></div>
                </div>
            </header>

            {/* Main Builder Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Structure Builder */}
                <div className="w-80 shrink-0 border-r border-white/5 bg-surface/30 h-full flex flex-col">
                    <MissionBuilderSidebar
                        activityId={activity.id}
                        phases={phases}
                        setPhases={setPhases}
                        selectedStepId={selectedStepId}
                        setSelectedStepId={setSelectedStepId}
                    />
                </div>

                {/* Central Step Editor */}
                <div className="flex-1 h-full bg-background relative flex flex-col">
                    <StepEditorPanel
                        step={selectedStep}
                        onUpdateStep={handleUpdateStep}
                    />
                </div>
            </div>
        </div>
    );
}
