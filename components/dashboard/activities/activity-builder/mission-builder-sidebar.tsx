"use client";

import { useState } from "react";
import {
    Folder,
    FolderOpen,
    FileText,
    PenTool,
    PlaySquare,
    CheckSquare,
    MonitorPlay,
    FolderDown,
    Paperclip,
    Plus,
    MoreVertical,
    GripVertical,
    ChevronDown,
    ChevronRight,
    Trash2,
    Copy,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityPhaseWithSteps, ActivityStep, ActivityStepWithClientState, ActivityStepType } from "@/types/activity";
import { getStepIcon, getTabStepIcon, STEP_TYPE_LABELS } from "@/lib/constants/step-icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getModuleRoleLabel, getModuleRoleTooltip, type ModuleCollaboratorRole } from "@/lib/module-collaborator-defs";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    DragMoveEvent,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { createPhase, createStep, deletePhase, deleteStep, duplicateStep, reorderSteps, reorderPhases, updatePhaseTitle, updateStepVisibility, updateStepLock, updateStepActivityClosed, updatePhaseStepsVisibility, updatePhaseStepsActivityClosed, updatePhaseStepsLock } from "@/app/activities/[id]/edit/actions";
import { flattenPhaseSteps, getProjectedPosition, projectedEqual, type ProjectedPosition } from "@/lib/activity-step-tree";
import { toast } from "sonner";
import {
    CREATE_DIALOG_BODY_CLASS,
    CREATE_DIALOG_CONTENT_CLASS,
    CREATE_DIALOG_FOOTER_CLASS,
    CREATE_DIALOG_HEADER_CLASS,
    CREATE_DIALOG_INPUT_CLASS,
    CREATE_DIALOG_LABEL_CLASS,
    CREATE_DIALOG_PRIMARY_ACTION_CLASS,
} from "@/components/dashboard/shared/create-dialog-styles";

interface MissionBuilderSidebarProps {
    activityId: string;
    phases: ActivityPhaseWithSteps[];
    setPhases: React.Dispatch<React.SetStateAction<ActivityPhaseWithSteps[]>>;
    selectedStepId: string | null;
    setSelectedStepId: (id: string | null) => void;
    moduleRole: ModuleCollaboratorRole;
}


const EVAL_STEP_TYPES = ['self_evaluation', 'peer_evaluation', 'quiz'] as const;
const PARENT_STEP_TYPES = ['deliverable', 'file_upload'] as const;

function isGoogleFormQuizStep(step: ActivityStep | ActivityStepWithClientState) {
    if (step.type !== "quiz") return false;
    const content = step.content as { quizMode?: string; googleFormUrl?: string | null } | null | undefined;
    return content?.quizMode === "google_form" || !!content?.googleFormUrl;
}

function ensureClientStep(step: ActivityStep | ActivityStepWithClientState): ActivityStepWithClientState {
    return {
        ...step,
        content: (step.content ?? {}) as ActivityStepWithClientState["content"],
        children: (step.children ?? []).map(ensureClientStep),
    };
}

async function persistStepParent(stepId: string, parentStepId: string | null, phaseId: string) {
    const response = await fetch("/api/drive/lock", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            kind: "step_parent",
            stepId,
            parentStepId,
            phaseId,
        }),
    });

    const payload = await response.json().catch(() => ({ error: "Respuesta inválida del servidor." })) as {
        error?: string;
        success?: boolean;
    };

    if (!response.ok || !payload.success) {
        return { error: payload.error ?? "No se pudo vincular el paso." };
    }

    return { success: true };
}

// Drop indicator — shown between items at the projected insertion point
function DropIndicator({ depth }: { depth: 0 | 1 }) {
    const marginLeft = depth === 0 ? 32 : 56;
    return (
        <div className="relative h-0.5 my-0.5 pointer-events-none" style={{ marginLeft }}>
            <div className="absolute inset-0 bg-accent-blue rounded-full" />
            <div
                className="absolute left-0 top-1/2 -translate-y-1/2 size-2 rounded-full bg-accent-blue border-2 border-background"
                style={{ marginLeft: -4 }}
            />
        </div>
    );
}

// Sortable Step Component — handles both root (depth=0) and child (depth=1) steps
function SortableStepItem({
    step,
    depth,
    isSelected,
    onSelect,
    onDelete,
    onDuplicate,
    onToggleVisibility,
    onToggleLock,
    onToggleActivityClosed,
}: {
    step: ActivityStepWithClientState,
    depth: 0 | 1,
    isSelected: boolean,
    onSelect: () => void,
    onDelete: () => void,
    onDuplicate: () => void,
    onToggleVisibility: () => void,
    onToggleLock: () => void,
    onToggleActivityClosed: () => void,
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: `step-${step.id}`, data: { type: "Step", step } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    const isChild = depth === 1;
    const iconSize = isChild ? "size-3.5" : "size-3.5";
    const btnSize = isChild ? "size-5" : "size-6";
    const textSize = isChild ? "text-xs" : "text-sm";
    const paddingLeft = isChild ? "pl-8" : "pl-5";
    const py = isChild ? "py-2" : "py-2.5";

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onSelect}
            data-step-id={step.id}
            data-step-title={step.title}
            className={cn(
                `group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 ${py} pr-2 ${paddingLeft} ${textSize} cursor-pointer transition-colors border-l-2`,
                isSelected
                    ? "bg-surface border-accent-blue text-foreground"
                    : "border-transparent hover:bg-surface-dark text-text-muted hover:text-foreground",
                isDragging && "opacity-30 ring-2 ring-accent-blue/20 bg-surface border-accent-blue",
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className="mt-0.5 cursor-grab text-text-muted opacity-0 transition-opacity hover:text-foreground active:cursor-grabbing group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className={iconSize} />
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <div className="flex min-w-[8rem] flex-1 items-center gap-2">
                    {isChild && (
                        <div className="w-3 shrink-0 font-mono leading-none text-border/40">└</div>
                    )}
                    <div className="shrink-0">
                        {getStepIcon(step.type)}
                    </div>
                    <span
                        title={step.title}
                        className={cn(
                            "block min-w-[8rem] flex-1 truncate font-semibold leading-snug text-foreground",
                            isChild && "min-w-[7rem]",
                            step.is_visible === false && "line-through opacity-50",
                        )}
                    >
                        {step.title || STEP_TYPE_LABELS[step.type]}
                    </span>
                </div>

                <div className="ml-auto flex shrink-0 items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={step.is_visible !== false ? "Ocultar actividad" : "Mostrar actividad"}
                        title={step.is_visible !== false ? "Ocultar actividad" : "Mostrar actividad"}
                        className={cn(
                            `${btnSize} transition-all`,
                            step.is_visible !== false ? "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto text-text-muted hover:text-foreground" : "opacity-100 text-accent-blue"
                        )}
                        onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
                    >
                        {step.is_visible !== false ? <Eye className={iconSize} /> : <EyeOff className={iconSize} />}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={!step.is_locked ? "Bloquear actividad" : "Desbloquear actividad"}
                        title={!step.is_locked ? "Bloquear actividad" : "Desbloquear actividad"}
                        className={cn(
                            `${btnSize} transition-all`,
                            !step.is_locked ? "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto text-text-muted hover:text-foreground" : "opacity-100 text-muted-foreground"
                        )}
                        onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
                    >
                        <CalendarClock className={iconSize} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={!step.is_activity_closed ? "Cerrar entregas" : "Abrir entregas"}
                        title={!step.is_activity_closed ? "Cerrar entregas" : "Abrir entregas"}
                        className={cn(
                            `${btnSize} transition-all`,
                            !step.is_activity_closed ? "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto text-text-muted hover:text-foreground" : "opacity-100 text-amber-500"
                        )}
                        onClick={(e) => { e.stopPropagation(); onToggleActivityClosed(); }}
                    >
                        {!step.is_activity_closed ? <Unlock className={iconSize} /> : <Lock className={iconSize} />}
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className={`${btnSize} opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto text-text-muted`} onClick={e => e.stopPropagation()}>
                                <MoreVertical className={iconSize} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-surface-dark border-border-strong w-32 z-50">
                            <DropdownMenuItem
                                className="cursor-pointer text-xs"
                                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                            >
                                <Copy className="size-3.5 mr-2" /> Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border-subtle" />
                            <DropdownMenuItem
                                className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer text-xs"
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            >
                                <Trash2 className="size-3.5 mr-2" /> Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}

// Sortable Phase Header Component
function SortablePhaseHeader({
    phase,
    isExpanded,
    togglePhase,
    renamingPhaseId,
    renamedTitle,
    setRenamedTitle,
    handleRenamePhase,
    setRenamingPhaseId,
    handleAddStep,
    handleDeletePhase,
    setActivePhaseForStep,
    setActiveStepType,
    setIsAddingStep,
    onTogglePhaseVisibility,
    onTogglePhaseActivityClosed,
    onTogglePhaseLock,
}: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: `phase-${phase.id}`, data: { type: "Phase", phase } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group flex items-center justify-between p-2 rounded-md transition-colors border max-w-full",
                isDragging ? "opacity-50 border-accent-blue/50 bg-accent-blue/5" : "border-transparent hover:bg-surface-dark"
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-text-muted hover:text-foreground mr-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className="size-4" />
            </div>
            <div
                className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                onClick={() => togglePhase(phase.id)}
            >
                <button className="text-text-muted hover:text-foreground transition-colors shrink-0">
                    {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                {isExpanded ? (
                    <FolderOpen className="size-4 text-accent-orange shrink-0" />
                ) : (
                    <Folder className="size-4 text-accent-orange shrink-0" />
                )}
                {renamingPhaseId === phase.id ? (
                    <input
                        autoFocus
                        className="bg-background border border-border/50 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full"
                        value={renamedTitle}
                        onChange={(e) => setRenamedTitle(e.target.value)}
                        onBlur={() => handleRenamePhase(phase.id)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenamePhase(phase.id);
                            if (e.key === 'Escape') setRenamingPhaseId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <h3 className="font-bold text-sm text-foreground truncate">{phase.title}</h3>
                )}
            </div>

            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                {phase.steps.length > 0 && (<>
                    <Button
                        variant="ghost" size="icon"
                        className="size-7 text-text-muted hover:text-foreground shrink-0"
                        title={phase.steps.every((s: any) => !s.is_visible) ? "Mostrar todos los pasos" : "Ocultar todos los pasos"}
                        onClick={(e) => { e.stopPropagation(); onTogglePhaseVisibility(phase.id); }}
                    >
                        {phase.steps.every((s: any) => !s.is_visible)
                            ? <EyeOff className="size-4 text-slate-400" />
                            : <Eye className="size-4" />
                        }
                    </Button>
                    <Button
                        variant="ghost" size="icon"
                        className="size-7 text-text-muted hover:text-foreground shrink-0"
                        title={phase.steps.every((s: any) => s.is_locked) ? "Desbloquear todos los pasos" : "Bloquear todos los pasos"}
                        onClick={(e) => { e.stopPropagation(); onTogglePhaseLock(phase.id); }}
                    >
                        <CalendarClock className={cn("size-4", phase.steps.every((s: any) => s.is_locked) && "text-muted-foreground")} />
                    </Button>
                    <Button
                        variant="ghost" size="icon"
                        className="size-7 text-text-muted hover:text-foreground shrink-0"
                        title={phase.steps.every((s: any) => s.is_activity_closed) ? "Abrir entregas de todos los pasos" : "Cerrar entregas de todos los pasos"}
                        onClick={(e) => { e.stopPropagation(); onTogglePhaseActivityClosed(phase.id); }}
                    >
                        <Lock className={cn("size-4", phase.steps.every((s: any) => s.is_activity_closed) && "text-amber-500")} />
                    </Button>
                </>)}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Añadir Actividad" className="size-7 text-text-muted hover:text-foreground shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Plus className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-surface-dark border-border-strong w-48 z-50">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('theory'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            {getTabStepIcon('theory')} Añadir Teoría
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('animation'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            {getTabStepIcon('animation')} Añadir Animación
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('deliverable'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            {getTabStepIcon('deliverable')} Añadir Memo
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('file_upload'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            {getTabStepIcon('file_upload')} Añadir Entregable
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('quiz'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            {getTabStepIcon('quiz')} Añadir Cuestionario
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('presentation'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            {getTabStepIcon('presentation')} Añadir Presentación
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('resource'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            {getTabStepIcon('resource')} Añadir Recursos
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('self_evaluation'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            {getTabStepIcon('self_evaluation')} Añadir Autoevaluación
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('peer_evaluation'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            {getTabStepIcon('peer_evaluation')} Añadir Coevaluación
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7 text-text-muted hover:text-foreground shrink-0" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-surface-dark border-border-strong w-48 z-50">
                        <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setRenamingPhaseId(phase.id);
                            setRenamedTitle(phase.title);
                        }} className="cursor-pointer text-xs">
                            ✏️ Renombrar Fase
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeletePhase(phase.id); }} className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer text-xs">
                            <Trash2 className="size-3.5 mr-2" /> Eliminar Fase
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

export function MissionBuilderSidebar({ activityId, phases, setPhases, selectedStepId, setSelectedStepId, moduleRole }: MissionBuilderSidebarProps) {
    const [isAddingPhase, setIsAddingPhase] = useState(false);
    const [newPhaseTitle, setNewPhaseTitle] = useState("");
    const [renamingPhaseId, setRenamingPhaseId] = useState<string | null>(null);
    const [renamedTitle, setRenamedTitle] = useState("");

    const [isCreatingPhase, setIsCreatingPhase] = useState(false);
    const [phaseToDelete, setPhaseToDelete] = useState<string | null>(null);
    const [stepToDelete, setStepToDelete] = useState<{ phaseId: string; stepId: string } | null>(null);

    // Step dialog state
    const [isAddingStep, setIsAddingStep] = useState(false);
    const [isCreatingStep, setIsCreatingStep] = useState(false);
    const [activePhaseForStep, setActivePhaseForStep] = useState<string | null>(null);
    const [activeStepType, setActiveStepType] = useState<ActivityStepType | null>(null);
    const [newStepTitle, setNewStepTitle] = useState("");

    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<"Phase" | "Step" | null>(null);
    const [projected, setProjected] = useState<ProjectedPosition | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleAddPhase = async () => {
        if (!newPhaseTitle.trim()) {
            setIsAddingPhase(false);
            return;
        }

        setIsCreatingPhase(true);
        try {
            const newOrderIndex = phases.length;
            const result = await createPhase(activityId, newPhaseTitle.trim(), newOrderIndex);

            if (result.error) {
                toast.error("Error al crear la fase");
                return;
            }

            if (result.data) {
                setPhases([...phases, { ...result.data, steps: [], isExpanded: true }]);
                setNewPhaseTitle("");
                setIsAddingPhase(false);
                toast.success("Fase creada");
            }
        } finally {
            setIsCreatingPhase(false);
        }
    };

    const handleRenamePhase = async (phaseId: string) => {
        if (!renamedTitle.trim()) {
            setRenamingPhaseId(null);
            return;
        }

        const res = await updatePhaseTitle(phaseId, activityId, renamedTitle.trim());
        if (res.error) {
            toast.error("Error al renombrar la fase");
        } else {
            setPhases(phases.map(p => p.id === phaseId ? { ...p, title: renamedTitle.trim() } : p));
            setRenamingPhaseId(null);
            toast.success("Fase renombrada");
        }
    };

    const handleAddStep = async () => {
        if (!activePhaseForStep || !activeStepType || !newStepTitle.trim()) {
            setIsAddingStep(false);
            return;
        }

        const phaseIndex = phases.findIndex(p => p.id === activePhaseForStep);
        if (phaseIndex === -1) return;

        setIsCreatingStep(true);
        try {
            const phase = phases[phaseIndex];
            const newOrderIndex = phase.steps.length;

            const result = await createStep(activePhaseForStep, newStepTitle.trim(), activeStepType, newOrderIndex);

            if (result.error) {
                toast.error("Error al crear la actividad");
                return;
            }

            if (result.data) {
                const newPhases = [...phases];
                newPhases[phaseIndex].steps.push(result.data as any);
                newPhases[phaseIndex].isExpanded = true;
                setPhases(newPhases);
                setSelectedStepId(result.data.id);
                setIsAddingStep(false);
                setNewStepTitle("");
                toast.success("Actividad añadida");
            }
        } finally {
            setIsCreatingStep(false);
        }
    };

    const handleDeletePhase = (phaseId: string) => {
        setPhaseToDelete(phaseId);
    };

    const confirmDeletePhase = async () => {
        if (!phaseToDelete) return;
        const result = await deletePhase(phaseToDelete, activityId);
        if (result.error) {
            toast.error("Error al eliminar la fase");
        } else {
            setPhases(phases.filter(p => p.id !== phaseToDelete));
            if (selectedStepId && phases.find(p => p.id === phaseToDelete)?.steps.some(s => s.id === selectedStepId)) {
                setSelectedStepId(null);
            }
            toast.success("Fase eliminada");
        }
        setPhaseToDelete(null);
    };

    const handleDeleteStep = (phaseId: string, stepId: string) => {
        setStepToDelete({ phaseId, stepId });
    };

    const confirmDeleteStep = async () => {
        if (!stepToDelete) return;
        try {
            await toast.promise(
                (async () => {
                    const result = await deleteStep(stepToDelete.stepId);
                    if (result.error) throw new Error(result.error);

                    const newPhases: ActivityPhaseWithSteps[] = [...phases];
                    if (stepToDelete.phaseId) {
                        // Root step
                        const phaseIndex = newPhases.findIndex((phase) => phase.id === stepToDelete.phaseId);
                        if (phaseIndex !== -1) {
                            newPhases[phaseIndex].steps = newPhases[phaseIndex].steps.filter((step) => step.id !== stepToDelete.stepId);
                        }
                    } else {
                        // Child step — find the parent and remove from its children
                        for (let phaseIndex = 0; phaseIndex < newPhases.length; phaseIndex++) {
                            newPhases[phaseIndex] = {
                                ...newPhases[phaseIndex],
                                steps: newPhases[phaseIndex].steps.map((step) =>
                                    step.children?.some((child) => child.id === stepToDelete.stepId)
                                        ? { ...step, children: step.children.filter((child) => child.id !== stepToDelete.stepId).map(ensureClientStep) }
                                        : step
                                ),
                            };
                        }
                    }
                    setPhases(newPhases);
                    if (selectedStepId === stepToDelete.stepId) setSelectedStepId(null);
                })(),
                {
                    loading: "Eliminando actividad...",
                    success: "Actividad eliminada",
                    error: (error) => error.message,
                }
            );
        } finally {
            setStepToDelete(null);
        }
    };

    const handleDuplicateStep = async (phaseId: string, stepId: string) => {
        await toast.promise(
            (async () => {
                const result = await duplicateStep(stepId);
                if (result.error || !result.data) throw new Error(result.error ?? "No se pudo duplicar la actividad.");

                setPhases((currentPhases) => currentPhases.map((phase) => {
                    if (phase.id !== phaseId) return phase;

                    const sourceIndex = phase.steps.findIndex((step) => step.id === stepId);
                    if (sourceIndex === -1) return phase;

                    const originalStep = phase.steps[sourceIndex];
                    const duplicate = {
                        ...result.data,
                        content: (result.data.content ?? {}) as any,
                        // Clone children optimistically — server already inserted them with correct parent_step_id
                        children: (originalStep.children ?? []).map(c => ensureClientStep({ ...c, parent_step_id: result.data!.id })),
                    };

                    const nextSteps = [...phase.steps];
                    nextSteps.splice(sourceIndex + 1, 0, duplicate as any);
                    return {
                        ...phase,
                        steps: nextSteps.map((step, index) => ({ ...step, order_index: index })),
                    };
                }));
            })(),
            {
                loading: "Duplicando actividad...",
                success: "Actividad duplicada",
                error: (error) => error.message,
            }
        );
    };

    const togglePhase = (phaseId: string) => {
        setPhases(phases.map(p =>
            p.id === phaseId ? { ...p, isExpanded: p.isExpanded === undefined ? false : !p.isExpanded } : p
        ));
    };

    const handleToggleVisibility = async (phaseId: string, stepId: string, currentVisibility: boolean) => {
        const result = await updateStepVisibility(stepId, !currentVisibility);
        if (result.error) {
            toast.error("Error al actualizar visibilidad");
        } else {
            setPhases(phases.map(p => p.id !== phaseId ? p : {
                ...p, steps: p.steps.map(s => {
                    if (s.id === stepId) return { ...s, is_visible: !currentVisibility };
                    if (s.children?.some(c => c.id === stepId)) return { ...s, children: s.children.map(c => c.id === stepId ? ensureClientStep({ ...c, is_visible: !currentVisibility }) : c) };
                    return s;
                })
            }) as ActivityPhaseWithSteps[]);
        }
    };

    const handleToggleLock = async (phaseId: string, stepId: string, currentLock: boolean) => {
        const result = await updateStepLock(stepId, !currentLock);
        if (result.error) {
            toast.error("Error al actualizar bloqueo");
        } else {
            setPhases(phases.map(p => p.id !== phaseId ? p : {
                ...p, steps: p.steps.map(s => {
                    if (s.id === stepId) return { ...s, is_locked: !currentLock };
                    if (s.children?.some(c => c.id === stepId)) return { ...s, children: s.children.map(c => c.id === stepId ? ensureClientStep({ ...c, is_locked: !currentLock }) : c) };
                    return s;
                })
            }) as ActivityPhaseWithSteps[]);
        }
    };

    const handleDuplicateChildStep = async (childId: string, parentStepId: string, phaseId: string) => {
        await toast.promise(
            (async () => {
                const result = await duplicateStep(childId);
                if (result.error || !result.data) throw new Error(result.error ?? "No se pudo duplicar la actividad.");

                const duplicate = ensureClientStep({ ...result.data, content: (result.data.content ?? {}) as any });
                setPhases(prev => prev.map(p => {
                    if (p.id !== phaseId) return p;
                    return {
                        ...p, steps: p.steps.map(s => {
                            if (s.id !== parentStepId) return s;
                            const children = s.children ?? [];
                            const sourceIndex = children.findIndex(c => c.id === childId);
                            const next = [...children];
                            next.splice(sourceIndex + 1, 0, duplicate as any);
                            return { ...s, children: next };
                        })
                    };
                }));
            })(),
            {
                loading: "Duplicando actividad...",
                success: "Actividad duplicada",
                error: (error) => error.message,
            }
        );
    };

    const handleDeleteChildStep = (childId: string) => {
        setStepToDelete({ phaseId: "", stepId: childId }); // phaseId not needed for child delete
    };

    const handleToggleActivityClosed = async (phaseId: string, stepId: string, currentClosed: boolean) => {
        const nextClosed = !currentClosed;
        const promise = updateStepActivityClosed(stepId, nextClosed);

        toast.promise(promise, {
            loading: nextClosed ? "Cerrando entregas..." : "Abriendo entregas...",
            success: (result) => {
                if (result.error) throw new Error(result.error);
                setPhases(phases.map(p => p.id !== phaseId ? p : {
                    ...p, steps: p.steps.map(s => {
                        if (s.id === stepId) return { ...s, is_activity_closed: nextClosed };
                        if (s.children?.some(c => c.id === stepId)) return { ...s, children: s.children.map(c => c.id === stepId ? ensureClientStep({ ...c, is_activity_closed: nextClosed }) : c) };
                        return s;
                    })
                }) as ActivityPhaseWithSteps[]);
                if ("formserror" in result) return "Entregas actualizadas, pero no se pudo sincronizar Google Forms";
                if ("formssynced" in result) return nextClosed ? "Formulario cerrado en Google Forms" : "Formulario abierto en Google Forms";
                if ("drivesynced" in result) return nextClosed ? "Documentos bloqueados en Drive" : "Documentos desbloqueados en Drive";
                return nextClosed ? "Entregas cerradas" : "Entregas abiertas";
            },
            error: "Error al actualizar cierre de entregas",
        });
    };

    const handleTogglePhaseVisibility = async (phaseId: string) => {
        const phase = phases.find(p => p.id === phaseId);
        if (!phase) return;
        const allHidden = phase.steps.every(s => !s.is_visible);
        const nextVisible = allHidden; // if all hidden → show all; else → hide all
        const result = await updatePhaseStepsVisibility(phaseId, nextVisible);
        if (result.error) {
            toast.error("Error al actualizar visibilidad de la fase");
        } else {
            setPhases(phases.map(p => p.id === phaseId ? { ...p, steps: p.steps.map(s => ({ ...s, is_visible: nextVisible })) } : p));
        }
    };

    const handleTogglePhaseLock = async (phaseId: string) => {
        const phase = phases.find(p => p.id === phaseId);
        if (!phase) return;
        const allLocked = phase.steps.every(s => s.is_locked);
        const nextLocked = !allLocked;
        const result = await updatePhaseStepsLock(phaseId, nextLocked);
        if (result.error) {
            toast.error("Error al actualizar bloqueo de la fase");
        } else {
            setPhases(phases.map(p => p.id === phaseId ? { ...p, steps: p.steps.map(s => ({ ...s, is_locked: nextLocked })) } : p));
        }
    };

    const handleTogglePhaseActivityClosed = async (phaseId: string) => {
        const phase = phases.find(p => p.id === phaseId);
        if (!phase) return;
        const allClosed = phase.steps.every(s => s.is_activity_closed);
        const nextClosed = !allClosed; // if all closed → open all; else → close all
        const result = await updatePhaseStepsActivityClosed(phaseId, nextClosed);
        if (result.error) {
            toast.error("Error al actualizar cierre de la fase");
        } else {
            setPhases(phases.map(p => p.id === phaseId ? { ...p, steps: p.steps.map(s => ({ ...s, is_activity_closed: nextClosed })) } : p));
        }
    };

    // --- Drag and Drop Logic ---

    const handleDragStart = (e: DragStartEvent) => {
        setActiveId(e.active.id as string);
        const dragType = e.active.data.current?.type as "Phase" | "Step" | null;
        setActiveType(dragType);
        setProjected(null);
    };

    const handleDragMove = (e: DragMoveEvent) => {
        const { active, over, delta } = e;
        if (!over || active.data.current?.type !== "Step") return;

        const activeStepId = active.id as string;
        // Find the phase containing the active step (search root + children)
        const activePhase = phases.find(p =>
            p.steps.some(s => `step-${s.id}` === activeStepId || (s.children ?? []).some(c => `step-${c.id}` === activeStepId))
        );
        if (!activePhase) return;

        const flatItems = flattenPhaseSteps(activePhase);
        const next = getProjectedPosition(flatItems, activeStepId, over.id as string, delta.x, activePhase.id);
        setProjected(prev => projectedEqual(prev, next) ? prev : next);
    };

    const handleDragOver = (e: DragOverEvent) => {
        const { active, over } = e;
        if (!over) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        if (activeType === "Step") {
            // Block cross-phase moves for child steps
            const activeStep = active.data.current?.step as ActivityStepWithClientState | undefined;
            if (activeStep?.parent_step_id) return;

            const activePhaseId = activeStep?.phase_id;
            const overPhaseId = overType === "Phase" ? over.data.current?.phase?.id : over.data.current?.step?.phase_id;

            if (!activePhaseId || !overPhaseId || activePhaseId === overPhaseId) {
                return;
            }

            // Move root step between phases
            setPhases((prev) => {
                const activePhaseIndex = prev.findIndex(p => p.id === activePhaseId);
                const overPhaseIndex = prev.findIndex(p => p.id === overPhaseId);

                const activeItems = [...prev[activePhaseIndex].steps];
                const overItems = [...prev[overPhaseIndex].steps];

                const activeIndex = activeItems.findIndex(s => `step-${s.id}` === active.id);
                let overIndex = -1;

                if (overType === "Step") {
                    overIndex = overItems.findIndex(s => `step-${s.id}` === over.id);
                }

                let newIndex = overItems.length;
                if (overIndex >= 0) {
                    const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
                    newIndex = overIndex + (isBelowOverItem ? 1 : 0);
                }

                const [item] = activeItems.splice(activeIndex, 1);
                item.phase_id = overPhaseId;

                overItems.splice(newIndex, 0, item);

                const next = [...prev];
                next[activePhaseIndex] = { ...next[activePhaseIndex], steps: activeItems };
                next[overPhaseIndex] = { ...next[overPhaseIndex], steps: overItems, isExpanded: true };

                return next;
            });
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
        setActiveType(null);
        setProjected(null);
    };

    const handleNestStep = async (evalStepId: string, parentStepId: string, targetPhaseId: string) => {
        const targetPhase = phases.find(p => p.id === targetPhaseId) ?? phases.find(p => p.steps.some(s => s.id === parentStepId));
        if (!targetPhase) return;

        const rootStepToNest = phases.flatMap(p => p.steps).find(step => step.id === evalStepId);
        if (rootStepToNest && isGoogleFormQuizStep(rootStepToNest)) {
            toast.error("Solo se puede anidar un cuestionario built-in. Google Form debe quedarse como paso independiente.");
            return;
        }

        setPhases(prev => {
            let evalStep: ActivityStepWithClientState | null = null;

            const withoutEvalAtRoot = prev.map(phase => ({
                ...phase,
                steps: phase.steps.filter(step => {
                    if (step.id === evalStepId) { evalStep = step; return false; }
                    return true;
                }),
            }));

            if (!evalStep) return prev;
            const safeEvalStep = ensureClientStep(evalStep);
            const stepToNest = ensureClientStep({ ...safeEvalStep, parent_step_id: parentStepId, phase_id: targetPhase.id });

            return withoutEvalAtRoot.map(phase => ({
                ...phase,
                steps: phase.steps.map(step =>
                    step.id === parentStepId
                        ? { ...step, children: [...(step.children ?? []), stepToNest] }
                        : step
                ),
            }));
        });
        const res = await persistStepParent(evalStepId, parentStepId, targetPhase.id);
        if (res.error) toast.error("Error al vincular el paso");
    };

    const handleUnlinkStep = async (childStepId: string, parentStepId: string, phaseId: string, insertAtIndex?: number) => {
        let unlinkedStep: ActivityStepWithClientState | null = null;
        setPhases(prev => prev.map(p => {
            if (p.id !== phaseId) return p;
            const updatedSteps = p.steps.map(s => {
                if (s.id !== parentStepId) return s;
                const child = (s.children ?? []).find(c => c.id === childStepId);
                if (child) unlinkedStep = ensureClientStep({ ...child, parent_step_id: null });
                return { ...s, children: (s.children ?? []).filter(c => c.id !== childStepId) };
            });
            if (unlinkedStep) {
                const newSteps = [...updatedSteps];
                const insertAt = insertAtIndex !== undefined ? insertAtIndex : newSteps.length;
                newSteps.splice(insertAt, 0, unlinkedStep);
                return { ...p, steps: newSteps.map((s, i) => ({ ...s, order_index: i })) };
            }
            return { ...p, steps: updatedSteps };
        }) as ActivityPhaseWithSteps[]);
        const res = await persistStepParent(childStepId, null, phaseId);
        if (res.error) toast.error("Error al desvincular el paso");
    };

    const handleDragEnd = async (e: DragEndEvent) => {
        const { active, over } = e;
        const currentProjected = projected;

        setActiveId(null);
        setActiveType(null);
        setProjected(null);

        if (!over) return;

        const dragType = active.data.current?.type;

        // --- Phase reorder (unchanged) ---
        if (dragType === "Phase") {
            if (active.id !== over.id) {
                const oldIndex = phases.findIndex(p => `phase-${p.id}` === active.id);
                const newIndex = phases.findIndex(p => `phase-${p.id}` === over.id);
                const reordered = arrayMove(phases, oldIndex, newIndex).map((p, idx) => ({ ...p, order_index: idx }));
                setPhases(reordered);
                await reorderPhases(activityId, reordered.map(p => ({ id: p.id, order_index: p.order_index })));
            }
            return;
        }

        if (dragType !== "Step") return;

        const activeStep = active.data.current?.step as ActivityStepWithClientState;

        // Find which phase has this step (root or as child)
        const activePhase = phases.find(p =>
            p.steps.some(s => `step-${s.id}` === active.id || (s.children ?? []).some(c => `step-${c.id}` === active.id))
        );
        if (!activePhase) return;

        const flatItems = flattenPhaseSteps(activePhase);
        const activeFlat = flatItems.find(f => `step-${f.step.id}` === active.id);
        if (!activeFlat) return;

        const wasChild = activeFlat.depth === 1;
        const oldParentId = activeFlat.parentId;

        // Use projected if available, otherwise fall back to same-position (no-op on nesting)
        const proj = currentProjected ?? { depth: activeFlat.depth, parentId: oldParentId, overFlatIndex: activeFlat.flatIndex, phaseId: activePhase.id };
        const willBeChild = proj.depth === 1;
        const newParentId = proj.parentId;

        // === Case A: Nest or re-nest (depth changes to 1 or parent changes) ===
        if (willBeChild && newParentId && newParentId !== oldParentId) {
            await handleNestStep(activeStep.id, newParentId, activePhase.id);
            return;
        }

        // === Case B: Unlink (depth changes from 1 to 0) ===
        if (!willBeChild && wasChild && oldParentId) {
            // Find the insertion index in root steps based on overFlatIndex
            const overFlatItem = flatItems[proj.overFlatIndex];
            const overRootIndex = overFlatItem
                ? activePhase.steps.findIndex(s => s.id === (overFlatItem.depth === 0 ? overFlatItem.step.id : overFlatItem.parentId))
                : undefined;
            await handleUnlinkStep(activeStep.id, oldParentId, activePhase.id, overRootIndex !== undefined && overRootIndex >= 0 ? overRootIndex + 1 : undefined);
            return;
        }

        // === Case C: Reorder at same depth ===
        if (active.id === over.id) return;

        const activeIndexInFlat = flatItems.findIndex(f => `step-${f.step.id}` === active.id);
        const overIndexInFlat = flatItems.findIndex(f => `step-${f.step.id}` === over.id);

        if (activeIndexInFlat === -1 || overIndexInFlat === -1) return;

        // Use arrayMove on the flat list — same as standard dnd-kit sortable strategy.
        // closestCenter already handles before/after semantics; no isBelowOver heuristic needed.
        const newFlatItems = arrayMove(flatItems, activeIndexInFlat, overIndexInFlat);

        // Reconstruct phase.steps from the new flat order
        const newRootSteps = newFlatItems
            .filter(f => f.depth === 0)
            .map((f, rootIdx) => ({
                ...f.step,
                order_index: rootIdx,
                children: newFlatItems
                    .filter(c => c.depth === 1 && c.parentId === f.step.id)
                    .map((c, cIdx) => ({ ...c.step, order_index: cIdx })),
            }));

        setPhases(prev => prev.map(p => p.id === activePhase.id ? { ...p, steps: newRootSteps } : p));

        // Persist: root steps order + children order
        const rootUpdates = newRootSteps.map(s => ({ id: s.id, phase_id: activePhase.id, order_index: s.order_index }));
        const childUpdates = newRootSteps.flatMap(s =>
            (s.children ?? []).map(c => ({ id: c.id, phase_id: activePhase.id, order_index: c.order_index }))
        );
        await reorderSteps(activityId, [...rootUpdates, ...childUpdates]);
    };

    return (
        <div className="w-full h-full bg-background flex flex-col">
            <div className="pb-2 pt-2 pr-4 pl-4 border-b border-border/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <h2 className="font-bold text-sm tracking-tight text-foreground uppercase">Fases</h2>
                    {moduleRole !== "creator" && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] uppercase tracking-wider cursor-help">
                                        {getModuleRoleLabel(moduleRole)}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    {getModuleRoleTooltip(moduleRole)}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                <Button variant="ghost" size="icon" aria-label="Añadir Fase" className="size-8 text-text-muted hover:text-foreground" onClick={() => setIsAddingPhase(true)}>
                    <Plus className="size-4" />
                </Button>
            </div>

            <Dialog open={isAddingPhase} onOpenChange={setIsAddingPhase}>
                <DialogContent className={`sm:max-w-[460px] ${CREATE_DIALOG_CONTENT_CLASS}`}>
                    <DialogHeader className={CREATE_DIALOG_HEADER_CLASS}>
                        <DialogTitle>Nueva Fase</DialogTitle>
                        <DialogDescription>
                            Define el siguiente bloque de trabajo para estructurar el reto.
                        </DialogDescription>
                    </DialogHeader>
                    <div className={`${CREATE_DIALOG_BODY_CLASS} space-y-4`}>
                        <div className="space-y-2">
                            <Label htmlFor="phase-title" className={CREATE_DIALOG_LABEL_CLASS}>Nombre de la fase</Label>
                            <Input
                                id="phase-title"
                                autoFocus
                                placeholder="Ej: Fundamentos, Práctica Final..."
                                value={newPhaseTitle}
                                onChange={(e) => setNewPhaseTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddPhase();
                                }}
                                className={`${CREATE_DIALOG_INPUT_CLASS} h-11`}
                            />
                        </div>
                    </div>
                    <DialogFooter className={CREATE_DIALOG_FOOTER_CLASS}>
                        <Button variant="ghost" onClick={() => setIsAddingPhase(false)} disabled={isCreatingPhase}>Cancelar</Button>
                        <Button onClick={handleAddPhase} disabled={isCreatingPhase} className={CREATE_DIALOG_PRIMARY_ACTION_CLASS}>
                            {isCreatingPhase && <span className="mr-2 size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />}
                            Crear Fase
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddingStep} onOpenChange={setIsAddingStep}>
                <DialogContent className={`sm:max-w-[460px] ${CREATE_DIALOG_CONTENT_CLASS}`}>
                    <DialogHeader className={CREATE_DIALOG_HEADER_CLASS}>
                        <DialogTitle>Nueva actividad</DialogTitle>
                        <DialogDescription>
                            Crea una nueva actividad dentro de la fase seleccionada.
                        </DialogDescription>
                    </DialogHeader>
                    <div className={`${CREATE_DIALOG_BODY_CLASS} space-y-4`}>
                        <div className="space-y-2">
                            <Label htmlFor="step-title" className={CREATE_DIALOG_LABEL_CLASS}>Título de la actividad</Label>
                            <Input
                                id="step-title"
                                autoFocus
                                placeholder="Ej: Teoría de Next.js, Ejercicio 1..."
                                value={newStepTitle}
                                onChange={(e) => setNewStepTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddStep();
                                }}
                                className={`${CREATE_DIALOG_INPUT_CLASS} h-11`}
                            />
                        </div>
                    </div>
                    <DialogFooter className={CREATE_DIALOG_FOOTER_CLASS}>
                        <Button variant="ghost" onClick={() => setIsAddingStep(false)} disabled={isCreatingStep}>Cancelar</Button>
                        <Button onClick={handleAddStep} disabled={isCreatingStep} className={CREATE_DIALOG_PRIMARY_ACTION_CLASS}>
                            {isCreatingStep && <span className="mr-2 size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />}
                            Crear actividad
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex-1 overflow-y-auto pt-2 pr-0 pl-5 pb-0 space-y-0">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    <SortableContext items={phases.map(p => `phase-${p.id}`)} strategy={verticalListSortingStrategy}>
                        {phases.map(phase => {
                            const isExpanded = phase.isExpanded !== false;
                            const flatItems = flattenPhaseSteps(phase);

                            // When dragging a parent step, hide its children so they "travel" with it.
                            // They remain in the full flatItems for handleDragEnd reconstruction,
                            // but are excluded from the visible list and SortableContext.
                            const visibleFlatItems = activeId
                                ? flatItems.filter(f => !(f.depth === 1 && activeId === `step-${f.parentId}`))
                                : flatItems;
                            const flatIds = visibleFlatItems.map(f => `step-${f.step.id}`);

                            return (
                                <div key={phase.id} className="flex flex-col mb-4" data-phase-title={phase.title}>
                                    <SortablePhaseHeader
                                        phase={phase}
                                        isExpanded={isExpanded}
                                        togglePhase={togglePhase}
                                        renamingPhaseId={renamingPhaseId}
                                        renamedTitle={renamedTitle}
                                        setRenamedTitle={setRenamedTitle}
                                        handleRenamePhase={handleRenamePhase}
                                        setRenamingPhaseId={setRenamingPhaseId}
                                        handleAddStep={handleAddStep}
                                        handleDeletePhase={handleDeletePhase}
                                        setActivePhaseForStep={setActivePhaseForStep}
                                        setActiveStepType={setActiveStepType}
                                        setIsAddingStep={setIsAddingStep}
                                        onTogglePhaseVisibility={handleTogglePhaseVisibility}
                                        onTogglePhaseActivityClosed={handleTogglePhaseActivityClosed}
                                        onTogglePhaseLock={handleTogglePhaseLock}
                                    />

                                    {/* Phase Steps List — flat list including children */}
                                    {isExpanded && (
                                        <div className="mt-1 flex flex-col">
                                            {visibleFlatItems.length === 0 ? (
                                                <div className="text-xs text-text-muted italic pl-8 py-2 border-l-2 border-transparent">Sin actividades. Añade una desde el botón +.</div>
                                            ) : (
                                                <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
                                                    {visibleFlatItems.map(({ step, depth }, idx) => {
                                                        const phaseId = phase.id;
                                                        const parentStep = depth === 1
                                                            ? phase.steps.find(s => (s.children ?? []).some(c => c.id === step.id))
                                                            : null;

                                                        // Map visible index back to flatItems index for the indicator
                                                        const flatIdx = flatItems.findIndex(f => f.step.id === step.id);
                                                        const showIndicatorAfter =
                                                            activeId !== null &&
                                                            projected !== null &&
                                                            projected.phaseId === phaseId &&
                                                            projected.overFlatIndex === flatIdx;

                                                        return (
                                                            <div key={step.id}>
                                                                <SortableStepItem
                                                                    step={step}
                                                                    depth={depth}
                                                                    isSelected={selectedStepId === step.id}
                                                                    onSelect={() => setSelectedStepId(step.id)}
                                                                    onDelete={() => depth === 0
                                                                        ? handleDeleteStep(phaseId, step.id)
                                                                        : handleDeleteChildStep(step.id)
                                                                    }
                                                                    onDuplicate={() => depth === 0
                                                                        ? handleDuplicateStep(phaseId, step.id)
                                                                        : handleDuplicateChildStep(step.id, parentStep?.id ?? "", phaseId)
                                                                    }
                                                                    onToggleVisibility={() => handleToggleVisibility(phaseId, step.id, step.is_visible !== false)}
                                                                    onToggleLock={() => handleToggleLock(phaseId, step.id, !!step.is_locked)}
                                                                    onToggleActivityClosed={() => handleToggleActivityClosed(phaseId, step.id, !!step.is_activity_closed)}
                                                                />
                                                                {showIndicatorAfter && projected && (
                                                                    <DropIndicator depth={projected.depth} />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </SortableContext>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </SortableContext>

                    {/* Drag Overlay */}
                    <DragOverlay dropAnimation={null}>
                        {activeId && activeType === "Phase" ? (
                            <SortablePhaseHeader
                                phase={phases.find(p => `phase-${p.id}` === activeId)}
                                isExpanded={false}
                                togglePhase={() => { }}
                            />
                        ) : null}
                        {activeId && activeType === "Step" ? (() => {
                            const allSteps = phases.flatMap(p => [
                                ...p.steps,
                                ...p.steps.flatMap(s => s.children ?? []),
                            ]);
                            const step = allSteps.find(s => `step-${s.id}` === activeId) as ActivityStepWithClientState | undefined;
                            if (!step) return null;
                            const childCount = (step.children ?? []).length;
                            return (
                                <div className="relative">
                                    <SortableStepItem
                                        step={step}
                                        depth={0}
                                        isSelected={false}
                                        onSelect={() => {}}
                                        onDelete={() => {}}
                                        onDuplicate={() => {}}
                                        onToggleVisibility={() => {}}
                                        onToggleLock={() => {}}
                                        onToggleActivityClosed={() => {}}
                                    />
                                    {childCount > 0 && (
                                        <div className="pl-14 pb-1">
                                            <span className="text-[10px] text-text-muted/60 italic">
                                                +{childCount} {childCount === 1 ? "evaluación" : "evaluaciones"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })() : null}
                    </DragOverlay>

                </DndContext>

                {phases.length === 0 && (
                    <div className="text-center p-6 text-sm text-text-muted">
                        No hay fases creadas. Haz clic en el + para empezar.
                    </div>
                )}
            </div>

            <AlertDialog open={!!phaseToDelete} onOpenChange={(open) => !open && setPhaseToDelete(null)}>
                <AlertDialogContent className="bg-surface-dark border-border/50">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar fase?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará la fase y todas sus actividades. No se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeletePhase} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar Fase
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!stepToDelete} onOpenChange={(open) => !open && setStepToDelete(null)}>
                <AlertDialogContent className="bg-surface-dark border-border/50">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar actividad?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará la actividad permanentemente. No se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteStep} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar Actividad
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
