"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Settings as SettingsIcon, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityPhaseWithSteps, ActivityStepWithClientState } from "@/types/activity";
import { toast } from "sonner";
import { MissionBuilderSidebar } from "@/components/dashboard/activity-builder/mission-builder-sidebar";
import { StepEditorPanel } from "@/components/dashboard/activity-builder/step-editor-panel";
import { ActivitySettingsPanel } from "@/components/dashboard/activity-builder/activity-settings-panel";
import { StudentPreview } from "@/components/dashboard/activity-builder/student-preview";
import { UserNav } from "@/components/dashboard/user-nav";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { BreadcrumbProvider, useBreadcrumb } from "@/components/dashboard/breadcrumb-context";
import { EditorTabsBar } from "@/components/dashboard/activity-builder/editor-tabs-bar";
import { updateActivityStatus, updateStepTitle, updateActivitySettings } from "./actions";
import { QuizEditor } from "@/components/dashboard/activity-builder/editors/quiz-editor";
import { PresentationEditor } from "@/components/dashboard/activity-builder/editors/presentation-editor";
import { ResourceEditor } from "@/components/dashboard/activity-builder/editors/resource-editor";

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
    const [activityData, setActivityData] = useState(activity);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

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

    const handleRenameTab = async (id: string, newTitle: string) => {
        if (id === 'settings') {
            // Rename activity
            setActivityData((prev: any) => ({ ...prev, title: newTitle }));
            const res = await updateActivitySettings(activityData.id, { title: newTitle });
            if (res.error) toast.error("Error al renombrar actividad");
        } else {
            // Rename step
            setPhases(current => current.map(p => ({
                ...p,
                steps: p.steps.map(s => s.id === id ? { ...s, title: newTitle } : s)
            })));
            const res = await updateStepTitle(id, newTitle);
            if (res.error) toast.error("Error al renombrar paso");
        }
    };

    const renderEditor = (step: ActivityStepWithClientState, onUpdate: (updatedStep: ActivityStepWithClientState) => void) => {
        switch (step.type) {
            case 'quiz':
                return <QuizEditor step={step} onUpdate={onUpdate} />;
            case 'presentation':
                return <PresentationEditor step={step} onUpdate={onUpdate} />;
            case 'resource':
                return <ResourceEditor step={step} onUpdate={onUpdate} />;
            default:
                return <StepEditorPanel step={step} onUpdateStep={onUpdate} />; // Fallback to generic panel
        }
    };

    return (
        <BreadcrumbProvider>
            <BreadcrumbSetter activity={activityData} />
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
                        {isPreviewMode && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-accent-blue/5 border border-accent-blue/20 rounded-full">
                                <div className="size-1.5 rounded-full bg-accent-blue animate-pulse" />
                                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent-blue">
                                    Modo Misión
                                </span>
                            </div>
                        )}
                        {isTeacher && (
                            <div className="flex items-center gap-2 mr-4">
                                <Button
                                    variant={activityData.status === 'published' ? "default" : "outline"}
                                    size="sm"
                                    onClick={async () => {
                                        const newStatus = activityData.status === 'published' ? 'draft' : 'published';
                                        setActivityData((prev: any) => ({ ...prev, status: newStatus }));
                                        const res = await updateActivityStatus(activityData.id, newStatus);
                                        if (res.error) {
                                            toast.error("Error al cambiar estado");
                                            setActivityData((prev: any) => ({ ...prev, status: activityData.status })); // revert
                                        } else {
                                            toast.success(newStatus === 'published' ? 'Actividad publicada' : 'Cambiada a borrador');
                                        }
                                    }}
                                    className="text-xs h-8 px-3 transition-all"
                                >
                                    {activityData.status === 'published' ? 'Publicado' : 'Borrador'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleSelectStep('settings')}
                                    className="size-8"
                                    title="Configuración"
                                >
                                    <SettingsIcon className="size-4 text-text-muted hover:text-foreground transition-colors" />
                                </Button>
                                <Button
                                    variant={isPreviewMode ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                                    className="h-8 gap-2 px-3 text-xs"
                                    title={isPreviewMode ? "Volver al Editor" : "Vista Alumno"}
                                >
                                    <Eye className="size-4" />
                                    {isPreviewMode ? "Editor" : "Vista Alumno"}
                                </Button>
                            </div>
                        )}
                        <UserNav
                            userEmail={user.email || ""}
                            userName={profile?.full_name || user.user_metadata?.full_name || "Usuario"}
                            isTeacher={isTeacher}
                            userId={user.id}
                        />
                    </div>
                </header>

                {/* Main Builder Area or Preview */}
                {isPreviewMode ? (
                    <StudentPreview
                        activity={activityData}
                        phases={phases}
                        onExitPreview={() => setIsPreviewMode(false)}
                        user={user}
                        profile={profile}
                        hideHeader={true}
                    />
                ) : (
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
                                onRenameTab={handleRenameTab}
                            />
                            {selectedStepId === 'settings' ? (
                                <ActivitySettingsPanel
                                    activity={activityData}
                                    onUpdate={setActivityData}
                                />
                            ) : selectedStep ? (
                                renderEditor(selectedStep, handleUpdateStep)
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
                                    <FileText className="size-12 mb-4 opacity-20" />
                                    <p>Selecciona o crea un paso en el mapa de fases.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </BreadcrumbProvider>
    );
}
