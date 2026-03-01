"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityPhaseWithSteps, ActivityStepWithClientState } from "@/types/activity";
import { toast } from "sonner";
import { MissionBuilderSidebar } from "@/components/dashboard/activity-builder/mission-builder-sidebar";
import { StepEditorPanel } from "@/components/dashboard/activity-builder/step-editor-panel";
import { UserNav } from "@/components/dashboard/user-nav";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { BreadcrumbProvider, useBreadcrumb } from "@/components/dashboard/breadcrumb-context";

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

        segments.push({ label: "Actividad", href: "" });

        setSegments(segments);
    }, [activity, setSegments]);

    return null;
}

export function ActivityBuilderClient({ activity, initialPhases, profile, user }: ActivityBuilderClientProps) {
    const router = useRouter();
    const [phases, setPhases] = useState<ActivityPhaseWithSteps[]>(initialPhases);
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

    const isTeacher = profile?.role === "teacher";

    const handleBackToMap = () => {
        if (activity.unit?.id) {
            router.push(`/dashboard/units/${activity.unit.id}`);
        } else {
            router.push('/dashboard');
        }
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
        </BreadcrumbProvider>
    );
}
