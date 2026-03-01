"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityPhaseWithSteps, ActivityStepWithClientState } from "@/types/activity";
import { toast } from "sonner";
import { MissionBuilderSidebar } from "@/components/dashboard/activity-builder/mission-builder-sidebar";
import { StepEditorPanel } from "@/components/dashboard/activity-builder/step-editor-panel";
import { UserNav } from "@/components/dashboard/user-nav";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { BreadcrumbProvider, useBreadcrumb } from "@/components/dashboard/breadcrumb-context";
import { EditorTabsBar } from "@/components/dashboard/activity-builder/editor-tabs-bar";

interface ActivityBuilderClientProps {
    activity: any;
    initialPhases: ActivityPhaseWithSteps[];
    profile: any;
    user: any;
}

function BreadcrumbSetter({ activity }: { activity: any }) {
    const { setSegments } = useBreadcrumb();

    useEffect(() => {
        const segments = [];

        if (activity.unit?.module) {
            segments.push({
                label: activity.unit.module.name,
                href: `/dashboard/modules/${activity.unit.module.id}`
            });
        }

        if (activity.unit) {
            segments.push({
                label: activity.unit.name,
                href: `/dashboard/units/${activity.unit.id}`
            });
        }

        segments.push({ label: activity.title || "Actividad", href: "" });

        setSegments(segments);
    }, [activity, setSegments]);

    return null;
}

export function ActivityBuilderClient({ activity, initialPhases, profile, user }: ActivityBuilderClientProps) {
    const router = useRouter();
    const [phases, setPhases] = useState<ActivityPhaseWithSteps[]>(initialPhases);
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [openedStepsIds, setOpenedStepsIds] = useState<string[]>([]);

    const isTeacher = profile?.role === "teacher";

    const handleBackToMap = () => {
        if (activity.unit?.id) {
            router.push(`/dashboard/units/${activity.unit.id}`);
        } else {
            router.push('/dashboard');
        }
    };

    const handleSelectStep = (id: string | null) => {
        if (id && !openedStepsIds.includes(id)) {
            setOpenedStepsIds(prev => [...prev, id]);
        }
        setSelectedStepId(id);
    };

    const selectedStep = phases
        .flatMap((p: ActivityPhaseWithSteps) => p.steps)
        .find((s: any) => s.id === selectedStepId) as ActivityStepWithClientState | undefined;

    const handleUpdateStep = (updatedStep: ActivityStepWithClientState) => {
        setPhases((current: ActivityPhaseWithSteps[]) =>
            current.map((phase: ActivityPhaseWithSteps) => ({
                ...phase,
                steps: phase.steps.map((step: any) =>
                    step.id === updatedStep.id ? updatedStep : step
                )
            }))
        );
    };

    return (
        <BreadcrumbProvider>
            <BreadcrumbSetter activity={activity} />
            <div className="h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
                {/* Standardized Dashboard Header */}
                <header className="h-[68px] border-b border-border/50 bg-background flex items-center justify-between px-6 shrink-0 z-40">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-lg border-border/50 hover:bg-accent/10 transition-colors"
                            onClick={handleBackToMap}
                        >
                            <ArrowLeft className="size-4" />
                        </Button>
                        <DashboardBreadcrumb />
                    </div>

                    <div className="flex items-center gap-6">
                        <UserNav
                            userEmail={user.email || ""}
                            userName={profile?.full_name || user.user_metadata?.full_name || "Usuario"}
                            isTeacher={isTeacher}
                            userId={user.id}
                        />
                    </div>
                </header>

                {/* Main Builder Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Sidebar - Structure Builder */}
                    <div className="w-80 shrink-0 border-r border-border/50 bg-background h-full flex flex-col">
                        <MissionBuilderSidebar
                            activityId={activity.id}
                            phases={phases}
                            setPhases={setPhases}
                            selectedStepId={selectedStepId}
                            setSelectedStepId={handleSelectStep}
                        />
                    </div>

                    {/* Central Step Editor */}
                    <div className="flex-1 h-full bg-background relative flex flex-col">
                        <EditorTabsBar
                            openedStepsIds={openedStepsIds}
                            onOpenedStepsChange={setOpenedStepsIds}
                            activeStepId={selectedStepId}
                            onSelectStep={setSelectedStepId}
                            onCloseStep={(id) => {
                                const newOpened = openedStepsIds.filter(stepId => stepId !== id);
                                setOpenedStepsIds(newOpened);
                                if (selectedStepId === id) {
                                    setSelectedStepId(newOpened.length > 0 ? newOpened[newOpened.length - 1] : null);
                                }
                            }}
                            allSteps={phases.flatMap(p => p.steps)}
                        />
                        {selectedStep ? (
                            <StepEditorPanel
                                step={selectedStep}
                                onUpdateStep={handleUpdateStep}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
                                <FileText className="size-12 mb-4 opacity-20" />
                                <p>Selecciona o crea un paso en el mapa de fases.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </BreadcrumbProvider>
    );
}
