"use client";

import { useState } from "react";
import {
    Folder,
    FolderOpen,
    FileText,
    PenTool,
    PlaySquare,
    CheckSquare,
    Plus,
    MoreVertical,
    GripVertical,
    ChevronDown,
    ChevronRight,
    Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityPhaseWithSteps, ActivityStepWithClientState, ActivityStepType } from "@/types/activity";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// DnD Kit Imports for Steps (we will only allow sorting steps within a phase for simplicity in the MVP)
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
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
import { createPhase, createStep, deletePhase, deleteStep, reorderSteps, updatePhaseTitle } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";

interface MissionBuilderSidebarProps {
    activityId: string;
    phases: ActivityPhaseWithSteps[];
    setPhases: React.Dispatch<React.SetStateAction<ActivityPhaseWithSteps[]>>;
    selectedStepId: string | null;
    setSelectedStepId: (id: string | null) => void;
}

const getStepIcon = (type: ActivityStepType) => {
    switch (type) {
        case 'theory': return <FileText className="size-4 text-accent-blue" />;
        case 'deliverable': return <PenTool className="size-4 text-purple-400" />;
        case 'animation': return <PlaySquare className="size-4 text-pink-400" />;
        case 'quiz': return <CheckSquare className="size-4 text-accent-orange" />;
    }
};

const getStepTypeName = (type: ActivityStepType) => {
    switch (type) {
        case 'theory': return "Texto/Teoría";
        case 'deliverable': return "Entregable";
        case 'animation': return "Animación";
        case 'quiz': return "Cuestionario";
    }
};

// Sortable Step Component
function SortableStepItem({
    step,
    isSelected,
    onSelect,
    onDelete
}: {
    step: ActivityStepWithClientState,
    isSelected: boolean,
    onSelect: () => void,
    onDelete: () => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: step.id });

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

            <span className="flex-1 truncate">{step.title}</span>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100 text-text-muted" onClick={e => e.stopPropagation()}>
                        <MoreVertical className="size-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-surface-dark border-border-strong w-32">
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


export function MissionBuilderSidebar({ activityId, phases, setPhases, selectedStepId, setSelectedStepId }: MissionBuilderSidebarProps) {

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleAddPhase = async () => {
        const title = prompt("Nombre de la nueva fase:", "Nueva Fase");
        if (!title) return;

        const newOrderIndex = phases.length;
        const result = await createPhase(activityId, title, newOrderIndex);

        if (result.error) {
            toast.error("Error al crear la fase");
            return;
        }

        if (result.data) {
            setPhases([...phases, { ...result.data, steps: [], isExpanded: true }]);
            toast.success("Fase creada");
        }
    };

    const handleAddStep = async (phaseId: string, type: ActivityStepType) => {
        const phaseIndex = phases.findIndex(p => p.id === phaseId);
        if (phaseIndex === -1) return;

        const phase = phases[phaseIndex];
        const newOrderIndex = phase.steps.length;
        const title = "Nuevo " + getStepTypeName(type);

        const result = await createStep(phaseId, title, type, newOrderIndex);

        if (result.error) {
            toast.error("Error al crear el paso");
            return;
        }

        if (result.data) {
            const newPhases = [...phases];
            newPhases[phaseIndex].steps.push(result.data as any);
            newPhases[phaseIndex].isExpanded = true;
            setPhases(newPhases);
            setSelectedStepId(result.data.id);
            toast.success("Paso añadido");
        }
    };

    const handleDeletePhase = async (phaseId: string) => {
        if (!confirm("¿Seguro que quieres eliminar esta fase y todos sus pasos?")) return;

        const result = await deletePhase(phaseId);
        if (result.error) {
            toast.error("Error al eliminar la fase");
        } else {
            setPhases(phases.filter(p => p.id !== phaseId));
            // if selected step was in this phase, clear it
            if (selectedStepId && phases.find(p => p.id === phaseId)?.steps.some(s => s.id === selectedStepId)) {
                setSelectedStepId(null);
            }
            toast.success("Fase eliminada");
        }
    };

    const handleDeleteStep = async (phaseId: string, stepId: string) => {
        const result = await deleteStep(stepId);
        if (result.error) {
            toast.error("Error al eliminar el paso");
        } else {
            const newPhases = [...phases];
            const phaseIndex = newPhases.findIndex(p => p.id === phaseId);
            newPhases[phaseIndex].steps = newPhases[phaseIndex].steps.filter(s => s.id !== stepId);
            setPhases(newPhases);
            if (selectedStepId === stepId) setSelectedStepId(null);
            toast.success("Paso eliminado");
        }
    };

    const handleDragEnd = async (event: DragEndEvent, phaseId: string) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const phaseIndex = phases.findIndex(p => p.id === phaseId);
            const phaseSteps = phases[phaseIndex].steps;

            const oldIndex = phaseSteps.findIndex((item) => item.id === active.id);
            const newIndex = phaseSteps.findIndex((item) => item.id === over.id);

            const reorderedSteps = arrayMove(phaseSteps, oldIndex, newIndex);

            // local update
            const reorderedWithIndex = reorderedSteps.map((s, idx) => ({ ...s, order_index: idx }));
            const newPhases = [...phases];
            newPhases[phaseIndex].steps = reorderedWithIndex;
            setPhases(newPhases);

            // server update
            const updates = reorderedWithIndex.map(s => ({ id: s.id, phase_id: phaseId, order_index: s.order_index }));
            await reorderSteps(updates);
        }
    };

    const togglePhase = (phaseId: string) => {
        setPhases(phases.map(p =>
            p.id === phaseId ? { ...p, isExpanded: p.isExpanded === undefined ? false : !p.isExpanded } : p
        ));
    };

    return (
        <div className="w-[320px] h-full shrink-0 border-r border-border/50 bg-background flex flex-col">
            <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0">
                <h2 className="font-bold text-sm tracking-tight text-foreground uppercase">El Mapa (Fases)</h2>
                <Button variant="ghost" size="icon" className="size-8 text-text-muted hover:text-foreground" onClick={handleAddPhase}>
                    <Plus className="size-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {phases.map(phase => {
                    const isExpanded = phase.isExpanded !== false;

                    return (
                        <div key={phase.id} className="flex flex-col">
                            {/* Phase Header */}
                            <div className="group flex items-center justify-between p-2 rounded-md hover:bg-surface-dark transition-colors">
                                <div
                                    className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                                    onClick={() => togglePhase(phase.id)}
                                >
                                    <button className="text-text-muted hover:text-foreground transition-colors">
                                        {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                    </button>
                                    {isExpanded ? (
                                        <FolderOpen className="size-4 text-accent-orange shrink-0" />
                                    ) : (
                                        <Folder className="size-4 text-accent-orange shrink-0" />
                                    )}
                                    <h3 className="font-bold text-sm text-foreground truncate">{phase.title}</h3>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-text-muted shrink-0">
                                            <MoreVertical className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-surface-dark border-border-strong w-48 z-50">
                                        <DropdownMenuItem onClick={() => handleAddStep(phase.id, 'theory')} className="cursor-pointer text-xs">
                                            <FileText className="size-3.5 mr-2 text-accent-blue" /> Añadir Teoría
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAddStep(phase.id, 'animation')} className="cursor-pointer text-xs">
                                            <PlaySquare className="size-3.5 mr-2 text-pink-400" /> Añadir Animación
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAddStep(phase.id, 'deliverable')} className="cursor-pointer text-xs">
                                            <PenTool className="size-3.5 mr-2 text-purple-400" /> Añadir Entregable
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAddStep(phase.id, 'quiz')} className="cursor-pointer text-xs">
                                            <CheckSquare className="size-3.5 mr-2 text-accent-orange" /> Añadir Cuestionario
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-border-strong" />
                                        <DropdownMenuItem onClick={async () => {
                                            const newTitle = prompt("Nuevo nombre:", phase.title);
                                            if (newTitle) {
                                                const res = await updatePhaseTitle(phase.id, newTitle);
                                                if (res.data) {
                                                    setPhases(phases.map(p => p.id === phase.id ? { ...p, title: newTitle } : p));
                                                }
                                            }
                                        }} className="cursor-pointer text-xs">
                                            ✏️ Renombrar Fase
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDeletePhase(phase.id)} className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer text-xs">
                                            <Trash2 className="size-3.5 mr-2" /> Eliminar Fase
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Phase Steps List */}
                            {isExpanded && (
                                <div className="mt-1 flex flex-col">
                                    {phase.steps.length === 0 ? (
                                        <div className="text-xs text-text-muted italic pl-8 py-2">Sin pasos. Añade uno desde el menú de la fase.</div>
                                    ) : (
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={(e) => handleDragEnd(e, phase.id)}
                                        >
                                            <SortableContext items={phase.steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                                {phase.steps.map(step => (
                                                    <SortableStepItem
                                                        key={step.id}
                                                        step={step}
                                                        isSelected={selectedStepId === step.id}
                                                        onSelect={() => setSelectedStepId(step.id)}
                                                        onDelete={() => handleDeleteStep(phase.id, step.id)}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </DndContext>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {phases.length === 0 && (
                    <div className="text-center p-6 text-sm text-text-muted">
                        No hay fases creadas. Haz clic en el + para empezar.
                    </div>
                )}
            </div>
        </div>
    );
}
