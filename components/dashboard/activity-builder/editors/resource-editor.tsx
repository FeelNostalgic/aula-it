"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, ResourceContent, ResourceItem } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { Plus, Trash2, Link as LinkIcon, FileText, ExternalLink, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface ResourceEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
}

export function ResourceEditor({ step, onUpdate }: ResourceEditorProps) {
    const defaultContent = (step.content as ResourceContent) || { items: [], markdownHeader: '' };
    const [content, setContent] = useState<ResourceContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        const newContent = (step.content as ResourceContent) || { items: [], markdownHeader: '' };
        setContent(newContent);
    }, [step.id, step.content]);

    const saveToServer = (newContent: ResourceContent) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSaving(true);
        timeoutRef.current = setTimeout(async () => {
            const res = await updateStepContent(step.id, newContent);
            if (res.error) toast.error("Error al guardar los recursos");
            setIsSaving(false);
        }, 1200);
    };

    const handleUpdate = (newContent: ResourceContent) => {
        setContent(newContent);
        onUpdate({ ...step, content: newContent });
        saveToServer(newContent);
    };

    const addResource = (type: 'file' | 'link') => {
        const newItem: ResourceItem = {
            id: crypto.randomUUID(),
            title: "",
            description: "",
            url: "",
            type
        };
        handleUpdate({ ...content, items: [...content.items, newItem] });
    };

    const updateItem = (id: string, updates: Partial<ResourceItem>) => {
        const items = content.items.map(item => item.id === id ? { ...item, ...updates } : item);
        handleUpdate({ ...content, items });
    };

    const removeItem = (id: string) => {
        const items = content.items.filter(item => item.id !== id);
        handleUpdate({ ...content, items });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = content.items.findIndex((item) => item.id === active.id);
            const newIndex = content.items.findIndex((item) => item.id === over.id);

            const newItems = arrayMove(content.items, oldIndex, newIndex);
            handleUpdate({ ...content, items: newItems });
        }
    };

    return (
        <div className="flex flex-col h-full w-full p-8 overflow-y-auto max-w-4xl mx-auto space-y-8 pb-32">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-foreground">Gestor de Recursos</h3>
                    <p className="text-sm text-text-muted mt-1">
                        Añade archivos (PDF, PKA) o enlaces externos para los alumnos.
                    </p>
                </div>
                {isSaving ? (
                    <span className="text-xs text-accent-blue animate-pulse">Guardando...</span>
                ) : (
                    <span className="text-xs text-text-muted/50">Guardado automáticamente</span>
                )}
            </div>

            <div className="flex gap-4">
                <Button onClick={() => addResource('file')} variant="outline" className="border-border/50 hover:bg-surface-dark">
                    <FileText className="size-4 mr-2 text-accent-blue" /> Añadir Archivo
                </Button>
                <Button onClick={() => addResource('link')} variant="outline" className="border-border/50 hover:bg-surface-dark">
                    <LinkIcon className="size-4 mr-2 text-emerald-400" /> Añadir Enlace
                </Button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={content.items.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-4">
                        {content.items.length === 0 ? (
                            <div className="text-center p-12 border border-dashed border-border/50 rounded-xl bg-surface/20">
                                <p className="text-text-muted">No hay recursos añadidos aún.</p>
                            </div>
                        ) : (
                            content.items.map((item) => (
                                <SortableResourceItem
                                    key={item.id}
                                    item={item}
                                    updateItem={updateItem}
                                    removeItem={removeItem}
                                />
                            ))
                        )}
                    </div>
                </SortableContext>
            </DndContext>

            <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Encabezado Markdown (Opcional)</label>
                <textarea
                    value={content.markdownHeader || ""}
                    onChange={(e) => handleUpdate({ ...content, markdownHeader: e.target.value })}
                    placeholder="Puedes añadir algunas instrucciones generales aquí usando Markdown..."
                    className="w-full bg-surface-dark border border-border/50 rounded-xl p-4 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-1 focus:ring-accent-blue/30 overflow-y-auto"
                />
            </div>
        </div>
    );
}

interface SortableResourceItemProps {
    item: ResourceItem;
    updateItem: (id: string, updates: Partial<ResourceItem>) => void;
    removeItem: (id: string) => void;
}

function SortableResourceItem({ item, updateItem, removeItem }: SortableResourceItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        position: 'relative' as any,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "p-4 bg-surface-dark border border-white/5 rounded-xl flex gap-4 items-start group shadow-sm transition-shadow",
                isDragging && "shadow-2xl border-accent-blue/50 scale-[1.02] opacity-80"
            )}
            data-testid="resource-card"
        >
            <div
                {...attributes}
                {...listeners}
                className="mt-2 text-text-muted/30 cursor-grab active:cursor-grabbing hover:text-text-muted transition-colors p-1 -m-1"
            >
                <GripVertical className="size-4" />
            </div>

            <div className="shrink-0 mt-1.5">
                {item.type === 'file' ? (
                    <div className="size-9 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                        <FileText className="size-5 text-accent-blue" />
                    </div>
                ) : (
                    <div className="size-9 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                        <LinkIcon className="size-5 text-emerald-400" />
                    </div>
                )}
            </div>

            <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <Input
                        value={item.title}
                        onChange={(e) => updateItem(item.id, { title: e.target.value })}
                        placeholder="Título del recurso"
                        className="bg-surface border-border text-sm h-9 focus-visible:ring-accent-blue/30"
                    />
                    <Input
                        value={item.url}
                        onChange={(e) => updateItem(item.id, { url: e.target.value })}
                        placeholder={item.type === 'file' ? "URL del archivo (.pka, .pdf...)" : "URL del enlace externo"}
                        className="bg-surface border-border text-sm h-9 focus-visible:ring-accent-blue/30"
                    />
                </div>
                <Input
                    value={item.description || ""}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Descripción corta (opcional)"
                    className="bg-surface border-border text-xs h-8 text-text-muted focus-visible:ring-accent-blue/30"
                />
            </div>

            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                {item.url && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 hover:bg-white/5"
                        onClick={() => window.open(item.url, '_blank')}
                        aria-label="Abrir enlace"
                    >
                        <ExternalLink className="size-4" />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-red-400/70 hover:text-red-400 hover:bg-red-400/10"
                    onClick={() => removeItem(item.id)}
                    aria-label="Eliminar"
                >
                    <Trash2 className="size-4" />
                </Button>
            </div>
        </div>
    );
}

