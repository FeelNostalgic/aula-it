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
    Eye,
    EyeOff,
    Lock,
    Unlock,
    Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityPhaseWithSteps, ActivityStepWithClientState, ActivityStepType } from "@/types/activity";
import { getStepIcon, STEP_TYPE_LABELS } from "@/lib/constants/step-icons";
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
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
    DragOverlay,
    defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Mock imports for server actions
import { createPhase, createStep, deletePhase, deleteStep, reorderSteps, reorderPhases, updatePhaseTitle, updateStepVisibility, updateStepLock, updateStepActivityClosed, updatePhaseStepsVisibility, updatePhaseStepsActivityClosed, updatePhaseStepsLock } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";

interface MissionBuilderSidebarProps {
    activityId: string;
    phases: ActivityPhaseWithSteps[];
    setPhases: React.Dispatch<React.SetStateAction<ActivityPhaseWithSteps[]>>;
    selectedStepId: string | null;
    setSelectedStepId: (id: string | null) => void;
}


// Sortable Step Component
function SortableStepItem({
    step,
    isSelected,
    onSelect,
    onDelete,
    onToggleVisibility,
    onToggleLock,
    onToggleActivityClosed,
}: {
    step: ActivityStepWithClientState,
    isSelected: boolean,
    onSelect: () => void,
    onDelete: () => void,
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

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onSelect}
            data-step-title={step.title}
            className={cn(
                "group flex items-center gap-2 py-2 px-3 pl-8 text-sm cursor-pointer transition-colors border-l-2",
                isSelected
                    ? "bg-surface border-accent-blue text-foreground"
                    : "border-transparent hover:bg-surface-dark text-text-muted hover:text-foreground",
                isDragging && "opacity-50 ring-2 ring-accent-blue/20 bg-surface border-accent-blue"
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-text-muted hover:text-foreground mr-1"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className="size-3.5" />
            </div>

            {getStepIcon(step.type)}

            <span className={cn("flex-1 truncate", step.is_visible === false && "line-through opacity-50")}>{step.title}</span>

            <div className="flex items-center gap-1 min-w-[40px] justify-end">
                {/* Always show if hidden or locked, otherwise show on hover */}
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={step.is_visible !== false ? "Ocultar actividad" : "Mostrar actividad"}
                    className={cn(
                        "size-6 transition-all",
                        step.is_visible !== false ? "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto text-text-muted hover:text-foreground" : "opacity-100 text-accent-blue"
                    )}
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
                >
                    {step.is_visible !== false ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={!step.is_locked ? "Bloquear actividad" : "Desbloquear actividad"}
                    className={cn(
                        "size-6 transition-all",
                        !step.is_locked ? "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto text-text-muted hover:text-foreground" : "opacity-100 text-accent-orange"
                    )}
                    onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
                >
                    {!step.is_locked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={!step.is_activity_closed ? "Cerrar entregas" : "Abrir entregas"}
                    title={!step.is_activity_closed ? "Cerrar entregas" : "Abrir entregas"}
                    className={cn(
                        "size-6 transition-all",
                        !step.is_activity_closed ? "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto text-text-muted hover:text-foreground" : "opacity-100 text-red-400"
                    )}
                    onClick={(e) => { e.stopPropagation(); onToggleActivityClosed(); }}
                >
                    <Ban className="size-3.5" />
                </Button>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-6 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto text-text-muted" onClick={e => e.stopPropagation()}>
                        <MoreVertical className="size-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-surface-dark border-border-strong w-32 z-50">
                    <DropdownMenuItem
                        className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer text-xs"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <Trash2 className="size-3.5 mr-2" /> Eliminar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
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
                            ? <EyeOff className="size-4 text-amber-500" />
                            : <Eye className="size-4" />
                        }
                    </Button>
                    <Button
                        variant="ghost" size="icon"
                        className="size-7 text-text-muted hover:text-foreground shrink-0"
                        title={phase.steps.every((s: any) => s.is_activity_closed) ? "Abrir entregas de todos los pasos" : "Cerrar entregas de todos los pasos"}
                        onClick={(e) => { e.stopPropagation(); onTogglePhaseActivityClosed(phase.id); }}
                    >
                        <Ban className={cn("size-4", phase.steps.every((s: any) => s.is_activity_closed) && "text-red-400")} />
                    </Button>
                    <Button
                        variant="ghost" size="icon"
                        className="size-7 text-text-muted hover:text-foreground shrink-0"
                        title={phase.steps.every((s: any) => s.is_locked) ? "Desbloquear todos los pasos" : "Bloquear todos los pasos"}
                        onClick={(e) => { e.stopPropagation(); onTogglePhaseLock(phase.id); }}
                    >
                        <Lock className={cn("size-4", phase.steps.every((s: any) => s.is_locked) && "text-accent-orange")} />
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
                            <FileText className="size-3.5 mr-2 text-accent-blue" /> Añadir Teoría
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('animation'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            <PlaySquare className="size-3.5 mr-2 text-pink-400" /> Añadir Animación
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('deliverable'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            <PenTool className="size-3.5 mr-2 text-purple-400" /> Añadir Memo
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('file_upload'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            <Paperclip className="size-3.5 mr-2 text-amber-400" /> Añadir Entregable
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('quiz'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            <CheckSquare className="size-3.5 mr-2 text-accent-orange" /> Añadir Cuestionario
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('presentation'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            <MonitorPlay className="size-3.5 mr-2 text-emerald-400" /> Añadir Presentación
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActivePhaseForStep(phase.id); setActiveStepType('resource'); setIsAddingStep(true); }} className="cursor-pointer text-xs">
                            <FolderDown className="size-3.5 mr-2 text-accent-blue" /> Añadir Recursos
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

export function MissionBuilderSidebar({ activityId, phases, setPhases, selectedStepId, setSelectedStepId }: MissionBuilderSidebarProps) {
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
        const result = await deleteStep(stepToDelete.stepId);
        if (result.error) {
            toast.error("Error al eliminar la actividad");
        } else {
            const newPhases = [...phases];
            const phaseIndex = newPhases.findIndex(p => p.id === stepToDelete.phaseId);
            newPhases[phaseIndex].steps = newPhases[phaseIndex].steps.filter(s => s.id !== stepToDelete.stepId);
            setPhases(newPhases);
            if (selectedStepId === stepToDelete.stepId) setSelectedStepId(null);
            toast.success("Actividad eliminada");
        }
        setStepToDelete(null);
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
            // Optimistic update
            setPhases(phases.map(p => p.id === phaseId ? { ...p, steps: p.steps.map(s => s.id === stepId ? { ...s, is_visible: !currentVisibility } : s) } : p));
        }
    };

    const handleToggleLock = async (phaseId: string, stepId: string, currentLock: boolean) => {
        const result = await updateStepLock(stepId, !currentLock);
        if (result.error) {
            toast.error("Error al actualizar bloqueo");
        } else {
            setPhases(phases.map(p => p.id === phaseId ? { ...p, steps: p.steps.map(s => s.id === stepId ? { ...s, is_locked: !currentLock } : s) } : p));
        }
    };

    const handleToggleActivityClosed = async (phaseId: string, stepId: string, currentClosed: boolean) => {
        const result = await updateStepActivityClosed(stepId, !currentClosed);
        if (result.error) {
            toast.error("Error al actualizar cierre de entregas");
        } else {
            setPhases(phases.map(p => p.id === phaseId ? { ...p, steps: p.steps.map(s => s.id === stepId ? { ...s, is_activity_closed: !currentClosed } : s) } : p));
        }
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
        setActiveType(e.active.data.current?.type as "Phase" | "Step" | null);
    };

    const handleDragOver = (e: DragOverEvent) => {
        const { active, over } = e;
        if (!over) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        // Si arrastramos un paso sobre otro paso (incluso de otra fase) o sobre una fase
        if (activeType === "Step") {
            const activePhaseId = active.data.current?.step?.phase_id;
            // Si overType es Phase, usamos el id de la phase. Si es Step, usamos su phase_id
            const overPhaseId = overType === "Phase" ? over.data.current?.phase?.id : over.data.current?.step?.phase_id;

            if (!activePhaseId || !overPhaseId || activePhaseId === overPhaseId) {
                return; // Same container, handled by drag end or it's just sorting
            }

            // Move step between phases
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

                let newIndex = overItems.length; // Default to end
                if (overIndex >= 0) {
                    const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
                    const modifier = isBelowOverItem ? 1 : 0;
                    newIndex = overIndex + modifier;
                }

                const [item] = activeItems.splice(activeIndex, 1);
                item.phase_id = overPhaseId; // Update optimistically

                overItems.splice(newIndex, 0, item);

                const next = [...prev];
                next[activePhaseIndex] = { ...next[activePhaseIndex], steps: activeItems };
                next[overPhaseIndex] = { ...next[overPhaseIndex], steps: overItems, isExpanded: true }; // Expand destination

                return next;
            });
        }
    };

    const handleDragEnd = async (e: DragEndEvent) => {
        setActiveId(null);
        setActiveType(null);

        const { active, over } = e;
        if (!over) return;

        const activeType = active.data.current?.type;

        if (activeType === "Phase") {
            if (active.id !== over.id) {
                const oldIndex = phases.findIndex(p => `phase-${p.id}` === active.id);
                const newIndex = phases.findIndex(p => `phase-${p.id}` === over.id);

                const reordered = arrayMove(phases, oldIndex, newIndex);
                const reorderedWithIndex = reordered.map((p, idx) => ({ ...p, order_index: idx }));
                setPhases(reorderedWithIndex);

                // persist array of phase orders
                const updates = reorderedWithIndex.map(p => ({ id: p.id, order_index: p.order_index }));
                // Note: Make sure backend has `reorderPhases`
                await reorderPhases(activityId, updates);
            }
        } else if (activeType === "Step") {
            // Find current phase of the active step
            const phase = phases.find(p => p.steps.some(s => `step-${s.id}` === active.id));
            if (!phase) return;

            const oldIndex = phase.steps.findIndex(s => `step-${s.id}` === active.id);
            let newIndex = oldIndex;

            if (over.data.current?.type === "Step") {
                newIndex = phase.steps.findIndex(s => `step-${s.id}` === over.id);
            }

            // if we dropped exactly on the same list but different index
            if (active.id !== over.id && oldIndex !== -1 && newIndex !== -1) {
                const reorderedSteps = arrayMove(phase.steps, oldIndex, newIndex);
                const reorderedWithIndex = reorderedSteps.map((s, idx) => ({ ...s, order_index: idx }));

                const newPhases = [...phases];
                const pIdx = newPhases.findIndex(p => p.id === phase.id);
                newPhases[pIdx].steps = reorderedWithIndex;
                setPhases(newPhases);

                const updates = reorderedWithIndex.map(s => ({ id: s.id, phase_id: phase.id, order_index: s.order_index }));
                await reorderSteps(activityId, updates);
            } else {
                // It was moved during onDragOver, we just need to persist the new order of the phase it ended up in
                // We ensure everything within the target phase is updated.
                const reorderedWithIndex = phase.steps.map((s, idx) => ({ ...s, order_index: idx }));
                const newPhases = [...phases];
                const pIdx = newPhases.findIndex(p => p.id === phase.id);
                newPhases[pIdx].steps = reorderedWithIndex;
                setPhases(newPhases);

                const updates = reorderedWithIndex.map(s => ({ id: s.id, phase_id: phase.id, order_index: s.order_index }));
                await reorderSteps(activityId, updates);
            }
        }
    };

    return (
        <div className="w-full h-full bg-background flex flex-col">
            <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0">
                <h2 className="font-bold text-sm tracking-tight text-foreground uppercase">El Mapa (Fases)</h2>
                <Button variant="ghost" size="icon" aria-label="Añadir Fase" className="size-8 text-text-muted hover:text-foreground" onClick={() => setIsAddingPhase(true)}>
                    <Plus className="size-4" />
                </Button>
            </div>

            <Dialog open={isAddingPhase} onOpenChange={setIsAddingPhase}>
                <DialogContent className="bg-surface-dark border-border/50 text-foreground">
                    <DialogHeader>
                        <DialogTitle>Nueva Fase</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="phase-title">Nombre de la fase</Label>
                            <Input
                                id="phase-title"
                                autoFocus
                                placeholder="Ej: Fundamentos, Práctica Final..."
                                value={newPhaseTitle}
                                onChange={(e) => setNewPhaseTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddPhase();
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddingPhase(false)} disabled={isCreatingPhase}>Cancelar</Button>
                        <Button onClick={handleAddPhase} disabled={isCreatingPhase}>
                            {isCreatingPhase && <span className="mr-2 size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />}
                            Crear Fase
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddingStep} onOpenChange={setIsAddingStep}>
                <DialogContent className="bg-surface-dark border-border/50 text-foreground">
                    <DialogHeader>
                        <DialogTitle>Nueva Actividad</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="step-title">Título de la actividad</Label>
                            <Input
                                id="step-title"
                                autoFocus
                                placeholder="Ej: Teoría de Next.js, Ejercicio 1..."
                                value={newStepTitle}
                                onChange={(e) => setNewStepTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddStep();
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddingStep(false)} disabled={isCreatingStep}>Cancelar</Button>
                        <Button onClick={handleAddStep} disabled={isCreatingStep}>
                            {isCreatingStep && <span className="mr-2 size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />}
                            Crear Actividad
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={phases.map(p => `phase-${p.id}`)} strategy={verticalListSortingStrategy}>
                        {phases.map(phase => {
                            const isExpanded = phase.isExpanded !== false;

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

                                    {/* Phase Steps List */}
                                    {isExpanded && (
                                        <div className="mt-1 flex flex-col">
                                            {phase.steps.length === 0 ? (
                                                <div className="text-xs text-text-muted italic pl-8 py-2 border-l-2 border-transparent">Sin actividades. Añade una desde el botón +.</div>
                                            ) : (
                                                <SortableContext items={phase.steps.map(s => `step-${s.id}`)} strategy={verticalListSortingStrategy}>
                                                    {phase.steps.map(step => (
                                                        <SortableStepItem
                                                            key={step.id}
                                                            step={step}
                                                            isSelected={selectedStepId === step.id}
                                                            onSelect={() => setSelectedStepId(step.id)}
                                                            onDelete={() => handleDeleteStep(phase.id, step.id)}
                                                            onToggleVisibility={() => handleToggleVisibility(phase.id, step.id, step.is_visible !== false)}
                                                            onToggleLock={() => handleToggleLock(phase.id, step.id, !!step.is_locked)}
                                                            onToggleActivityClosed={() => handleToggleActivityClosed(phase.id, step.id, !!step.is_activity_closed)}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </SortableContext>

                    {/* Drag Overlay for better visual feedback */}
                    <DragOverlay>
                        {activeId && activeType === "Phase" ? (
                            <SortablePhaseHeader
                                phase={phases.find(p => `phase-${p.id}` === activeId)}
                                isExpanded={false}
                                togglePhase={() => { }}
                            />
                        ) : null}
                        {activeId && activeType === "Step" ? (
                            <SortableStepItem
                                step={phases.flatMap(p => p.steps).find(s => `step-${s.id}` === activeId) as any}
                                isSelected={selectedStepId === (phases.flatMap(p => p.steps).find(s => `step-${s.id}` === activeId)?.id)}
                                onSelect={() => { }}
                                onDelete={() => { }}
                                onToggleVisibility={() => { }}
                                onToggleLock={() => { }}
                                onToggleActivityClosed={() => { }}
                            />
                        ) : null}
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
