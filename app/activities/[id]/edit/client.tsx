"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, FileText, Settings as SettingsIcon, Eye, Award, Play, Lock, EyeOff, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActivityPhaseWithSteps, ActivityStepWithClientState } from "@/types/activity";
import { toast } from "sonner";
import { StepEditorPanel } from "@/components/dashboard/activities/activity-builder/step-editor-panel";
import { ActivitySettingsPanel } from "@/components/dashboard/activities/activity-builder/activity-settings-panel";
import { ActivityBadgesPanel } from "@/components/dashboard/activities/activity-builder/activity-badges-panel";
import { StudentPreview } from "@/components/dashboard/activities/activity-builder/student-preview";
import { UserNav } from "@/components/dashboard/layout/user-nav";
import { DashboardBreadcrumb } from "@/components/dashboard/layout/dashboard-breadcrumb";
import { BreadcrumbProvider, useBreadcrumb } from "@/components/dashboard/layout/breadcrumb-context";
import { EditorTabsBar } from "@/components/dashboard/activities/activity-builder/editor-tabs-bar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { updateActivityStatus, updateStepTitle, updateActivitySettings } from "./actions";
import { normalizeNestedActivityPhases } from "@/lib/activity-step-tree";
import {
    getModuleRoleLabel,
    getModuleRoleTooltip,
    type ModuleCollaboratorRole,
    type ModulePermissions,
} from "@/lib/module-collaborator-defs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const MissionBuilderSidebar = dynamic(
    () => import("@/components/dashboard/activities/activity-builder/mission-builder-sidebar").then((mod) => ({ default: mod.MissionBuilderSidebar })),
    { ssr: false }
);

interface ActivityBuilderClientProps {
    activity: any;
    initialPhases: ActivityPhaseWithSteps[];
    profile: any;
    user: any;
    moduleRole: ModuleCollaboratorRole;
    modulePermissions: ModulePermissions;
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

export function ActivityBuilderClient({ activity, initialPhases, profile, user, moduleRole, modulePermissions }: ActivityBuilderClientProps) {
    const router = useRouter();
    const normalizedInitialPhases = normalizeNestedActivityPhases(initialPhases);
    const [phases, setPhases] = useState<ActivityPhaseWithSteps[]>(normalizedInitialPhases);
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [openedStepsIds, setOpenedStepsIds] = useState<string[]>([]);
    const [activityData, setActivityData] = useState(activity);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    const clearQuizLocalStorage = () => {
        if (typeof window === "undefined") return;
        const keysToRemove: string[] = [];
        for (let index = 0; index < window.localStorage.length; index += 1) {
            const key = window.localStorage.key(index);
            if (!key) continue;
            if (
                key.startsWith("aula-quiz-draft:")
                || key.startsWith("aula-quiz-session:")
                || key.startsWith("exam-session:")
                || key === "aula-exam-active"
            ) {
                keysToRemove.push(key);
            }
        }
        for (const key of keysToRemove) {
            window.localStorage.removeItem(key);
        }
    };

    // Update local state when activity prop changes (e.g. after server revalidation)
    useEffect(() => {
        setActivityData(activity);
    }, [activity]);

    useEffect(() => {
        setPhases(normalizeNestedActivityPhases(initialPhases));
    }, [initialPhases]);

    useEffect(() => {
        try {
            const allStepIds = normalizeNestedActivityPhases(initialPhases)
                .flatMap((p) => p.steps.flatMap((s: any) => [s.id, ...(s.children ?? []).map((c: any) => c.id)]));
            const savedTab = localStorage.getItem(`aula-it:activity-editor:${activity.id}:selected-tab`);
            const savedTabsRaw = localStorage.getItem(`aula-it:activity-editor:${activity.id}:open-tabs`);
            const savedTabs = savedTabsRaw ? JSON.parse(savedTabsRaw) as string[] : [];
            const filteredTabs = savedTabs.filter((id) => allStepIds.includes(id) || id === "settings" || id === "badges");
            setOpenedStepsIds(filteredTabs);
            if (savedTab && (allStepIds.includes(savedTab) || savedTab === "settings" || savedTab === "badges")) {
                setSelectedStepId(savedTab);
            } else {
                setSelectedStepId(filteredTabs.length > 0 ? filteredTabs[filteredTabs.length - 1] : null);
            }
        } catch {
            setOpenedStepsIds([]);
            setSelectedStepId(null);
        }
    }, [activity.id, initialPhases]);

    // Persist open tabs and selected tab to localStorage
    useEffect(() => {
        localStorage.setItem(`aula-it:activity-editor:${activity.id}:open-tabs`, JSON.stringify(openedStepsIds));
    }, [openedStepsIds, activity.id]);

    useEffect(() => {
        if (selectedStepId) localStorage.setItem(`aula-it:activity-editor:${activity.id}:selected-tab`, selectedStepId);
    }, [selectedStepId, activity.id]);

    const isTeacher = profile?.role === "teacher";
    const canEditActivity = modulePermissions?.canEditModuleContent ?? isTeacher;

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
        .flatMap((s: any) => [s, ...(s.children ?? [])])
        .find((s: any) => s.id === selectedStepId) as ActivityStepWithClientState | undefined;

    const handleUpdateStep = (updatedStep: ActivityStepWithClientState) => {
        setPhases((current: ActivityPhaseWithSteps[]) =>
            current.map((phase: ActivityPhaseWithSteps) => ({
                ...phase,
                steps: phase.steps.map((step: any) => {
                    if (step.id === updatedStep.id) return updatedStep;
                    // Also update if it's a child step
                    if (step.children?.some((c: any) => c.id === updatedStep.id)) {
                        return { ...step, children: step.children.map((c: any) => c.id === updatedStep.id ? updatedStep : c) };
                    }
                    return step;
                })
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
                steps: p.steps.map((s: any) => {
                    if (s.id === id) return { ...s, title: newTitle };
                    if (s.children?.some((c: any) => c.id === id)) {
                        return { ...s, children: s.children.map((c: any) => c.id === id ? { ...c, title: newTitle } : c) };
                    }
                    return s;
                })
            })));
            const res = await updateStepTitle(id, newTitle);
            if (res.error) toast.error("Error al renombrar paso");
        }
    };


    return (
        <BreadcrumbProvider>
            <BreadcrumbSetter activity={activityData} />
            <div className="h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
                {/* Standardized Dashboard Header */}
                <header className="h-[68px] border-b border-border/50 bg-background flex items-center justify-between gap-4 px-6 shrink-0 z-40 overflow-hidden">
                    <div className="flex min-w-0 flex-1 items-center gap-4 overflow-hidden">
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-8 shrink-0 rounded-lg border-border/50 transition-colors hover:bg-accent/10"
                            onClick={handleBackToMap}
                        >
                            <ArrowLeft className="size-4" />
                        </Button>
                        <DashboardBreadcrumb />
                    </div>

                    <div className="flex shrink-0 items-center gap-6">
                        {/*
                        {isPreviewMode && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-accent-blue/5 border border-accent-blue/20 rounded-full">
                                
                                <div className="size-1.5 rounded-full bg-accent-blue animate-pulse" />
                                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent-blue">
                                    Modo Misión
                                </span>                             
                            </div>
                        )}
                        */}
                        {isTeacher && canEditActivity && (
                            <div className="flex items-center gap-2 mr-4">
                                {moduleRole !== "creator" && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 gap-1.5 py-1 px-3 shadow-sm cursor-help">
                                                    {getModuleRoleLabel(moduleRole)}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                {getModuleRoleTooltip(moduleRole)}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={`text-xs h-8 px-3 transition-all gap-1.5 border font-bold ${
                                                activityData.status === 'published'
                                                    ? 'text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/15'
                                                    : activityData.status === 'blocked'
                                                    ? 'text-zinc-400 border-zinc-600/50 bg-zinc-800/50 hover:bg-zinc-700/50'
                                                    : 'text-accent-orange border-accent-orange/30 bg-accent-orange/10 hover:bg-accent-orange/15'
                                            }`}
                                        >
                                            {activityData.status === 'published' ? (
                                                <Play className="size-3" />
                                            ) : activityData.status === 'blocked' ? (
                                                <Lock className="size-3" />
                                            ) : (
                                                <EyeOff className="size-3" />
                                            )}
                                            {activityData.status === 'published' ? 'Publicado' : activityData.status === 'blocked' ? 'Bloqueado' : 'Borrador'}
                                            <ChevronDown className="size-3 opacity-60" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-surface-dark border-border-strong text-foreground w-40">
                                        <DropdownMenuItem
                                            className="gap-2 cursor-pointer focus:bg-green-500/10 focus:text-green-400"
                                            onClick={async () => {
                                                const prev = activityData.status;
                                                setActivityData((d: any) => ({ ...d, status: 'published' }));
                                                const res = await updateActivityStatus(activityData.id, 'published');
                                                if (res.error) { toast.error("Error al cambiar estado"); setActivityData((d: any) => ({ ...d, status: prev })); }
                                                else toast.success('Actividad publicada');
                                            }}
                                        >
                                            <Play className="size-4 text-green-400" />
                                            <span className="text-xs font-bold uppercase tracking-tight text-green-400">Publicar</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="gap-2 cursor-pointer focus:bg-zinc-700/50 focus:text-zinc-300"
                                            onClick={async () => {
                                                const prev = activityData.status;
                                                setActivityData((d: any) => ({ ...d, status: 'blocked' }));
                                                const res = await updateActivityStatus(activityData.id, 'blocked');
                                                if (res.error) { toast.error("Error al cambiar estado"); setActivityData((d: any) => ({ ...d, status: prev })); }
                                                else toast.success('Actividad bloqueada');
                                            }}
                                        >
                                            <Lock className="size-4 text-zinc-400" />
                                            <span className="text-xs font-bold uppercase tracking-tight text-zinc-400">Bloquear</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="gap-2 cursor-pointer focus:bg-accent-orange/10 focus:text-accent-orange"
                                            onClick={async () => {
                                                const prev = activityData.status;
                                                setActivityData((d: any) => ({ ...d, status: 'draft' }));
                                                const res = await updateActivityStatus(activityData.id, 'draft');
                                                if (res.error) { toast.error("Error al cambiar estado"); setActivityData((d: any) => ({ ...d, status: prev })); }
                                                else toast.success('Cambiada a borrador');
                                            }}
                                        >
                                            <EyeOff className="size-4 text-accent-orange/60" />
                                            <span className="text-xs font-bold uppercase tracking-tight text-accent-orange/80">Borrador</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleSelectStep('badges')}
                                    className="size-8"
                                    title="Insignias"
                                >
                                    <Award className="size-4 text-text-muted hover:text-foreground transition-colors" />
                                </Button>
                                <Button
                                    variant={isPreviewMode ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => {
                                        clearQuizLocalStorage();
                                        setIsPreviewMode(!isPreviewMode);
                                    }}
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
                            userAvatar={user.user_metadata?.avatar_url}
                        />
                    </div>
                </header>

                {/* Main Builder Area or Preview */}
                {isPreviewMode ? (
                    <StudentPreview
                        activity={activityData}
                        phases={phases}
                        onExitPreview={() => {
                            clearQuizLocalStorage();
                            setIsPreviewMode(false);
                        }}
                        user={user}
                        profile={profile}
                        hideHeader={true}
                        isPreview={true}
                    />
                ) : (
                    <ResizablePanelGroup id="activity-builder-layout" direction="horizontal" className="flex-1 overflow-hidden">
                        {/* Left Sidebar - Structure Builder */}
                        <ResizablePanel id="sidebar-panel" defaultSize={20} minSize={18} maxSize={36} className="bg-background h-full flex flex-col">
                            <MissionBuilderSidebar
                                activityId={activity.id}
                                phases={phases}
                                setPhases={setPhases}
                                selectedStepId={selectedStepId}
                                setSelectedStepId={handleSelectStep}
                                moduleRole={moduleRole}
                            />
                        </ResizablePanel>

                        <ResizableHandle
                            withHandle
                            aria-label="Cambiar tamaño del panel de fases"
                            title="Arrastra para cambiar el tamaño del panel de fases"
                            className="w-2 cursor-col-resize bg-border/60 transition-colors after:w-3 hover:bg-accent-blue/50 data-resize-handle-active:bg-accent-blue"
                        />

                        {/* Central Step Editor */}
                        <ResizablePanel id="editor-panel" defaultSize={80} className="h-full bg-background relative flex flex-col">
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
                                allSteps={phases.flatMap(p => p.steps.flatMap((s: any) => [s, ...(s.children ?? [])]))}
                                onRenameTab={handleRenameTab}
                            />
                            {selectedStepId === 'settings' ? (
                                <ActivitySettingsPanel
                                    activity={activityData}
                                    onUpdate={setActivityData}
                                />
                            ) : selectedStepId === 'badges' ? (
                                <ActivityBadgesPanel
                                    activity={activityData}
                                    phases={phases}
                                    onUpdate={setActivityData}
                                />
                            ) : selectedStep ? (
                                <StepEditorPanel step={selectedStep} onUpdateStep={handleUpdateStep} activityId={activityData.id} phases={phases} moduleId={(activityData as any).unit?.module?.id} />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
                                    <FileText className="size-12 mb-4 opacity-20" />
                                    <p>Selecciona o crea un paso en el mapa de fases.</p>
                                </div>
                            )}
                        </ResizablePanel>
                    </ResizablePanelGroup>
                )}
            </div>
        </BreadcrumbProvider>
    );
}
