"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { ResourceItem } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateUnitResources } from "@/app/dashboard/units/[id]/actions";
import { toast } from "sonner";
import { Plus, Trash2, Link as LinkIcon, FileText, ExternalLink, GripVertical, Search, Loader2, FolderPlus, ChevronRight, ArrowLeft, AlertCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";
import { ResourceIcon } from "./resource-icon";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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

interface UnitResourcesTabProps {
    unitId: string;
    initialResources: ResourceItem[];
}

export function UnitResourcesTab({ unitId, initialResources }: UnitResourcesTabProps) {
    const [resources, setResources] = useState<ResourceItem[]>(initialResources || []);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [itemToDelete, setItemToDelete] = useState<ResourceItem | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { openPicker, isLoading: isDriveLoading } = useGoogleDrivePicker();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const saveToServer = (newResources: ResourceItem[]) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSaving(true);
        timeoutRef.current = setTimeout(async () => {
            const res = await updateUnitResources(unitId, newResources);
            if (res.error) toast.error("Error al guardar los recursos");
            setIsSaving(false);
        }, 1500);
    };

    const handleUpdate = (newResources: ResourceItem[]) => {
        setResources(newResources);
        saveToServer(newResources);
    };

    const addResource = (type: 'file' | 'link' | 'folder') => {
        const newItem: ResourceItem = {
            id: crypto.randomUUID(),
            title: type === 'folder' ? "Nueva Carpeta" : "",
            description: "",
            url: type === 'folder' ? undefined : "",
            type,
            parentId: currentFolderId
        };
        handleUpdate([...resources, newItem]);
    };

    const updateItem = (id: string, updates: Partial<ResourceItem>) => {
        const newResources = resources.map(item => item.id === id ? { ...item, ...updates } : item);
        handleUpdate(newResources);
    };

    const removeItem = (id: string) => {
        const item = resources.find(r => r.id === id);
        if (!item) return;

        // Condition for confirmation:
        // 1. Is a folder
        // 2. Has title (if not "Nueva Carpeta"), url or description
        const isDefaultFolder = item.type === 'folder' && item.title === "Nueva Carpeta";
        const hasContent = (item.title && !isDefaultFolder) || !!item.url?.trim() || !!item.description?.trim();
        const needsConfirmation = item.type === 'folder' || hasContent;

        if (needsConfirmation) {
            setItemToDelete(item);
        } else {
            confirmDelete(id);
        }
    };

    const confirmDelete = (id: string) => {
        // Recursive deletion logic to prevent orphaned resources
        const idsToDelete = new Set<string>([id]);
        
        const findDescendants = (parentId: string) => {
            resources.forEach(item => {
                if (item.parentId === parentId) {
                    idsToDelete.add(item.id);
                    if (item.type === 'folder') {
                        findDescendants(item.id);
                    }
                }
            });
        };

        const item = resources.find(r => r.id === id);
        if (item?.type === 'folder') {
            findDescendants(id);
        }

        const newResources = resources.filter(item => !idsToDelete.has(item.id));
        handleUpdate(newResources);
        setItemToDelete(null);
        
        // If we were inside a folder that just got deleted, go to root
        if (idsToDelete.has(currentFolderId || "")) {
            setCurrentFolderId(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = resources.findIndex((item) => item.id === active.id);
            const newIndex = resources.findIndex((item) => item.id === over.id);

            const newSorted = arrayMove(resources, oldIndex, newIndex);
            handleUpdate(newSorted);
        }
    };

    const openDrivePicker = async () => {
        try {
            const files = await openPicker();
            if (files.length === 0) return;

            const newItems: ResourceItem[] = files.map((file) => ({
                id: crypto.randomUUID(),
                title: file.name,
                description: "",
                url: file.url,
                type: 'file' as const,
                mimeType: file.mimeType,
                parentId: currentFolderId
            }));

            handleUpdate([...resources, ...newItems]);
            toast.success(`${files.length} archivo(s) añadido(s) desde Google Drive`);
        } catch (err) {
            console.error("Drive Picker error:", err);
            toast.error("Error al abrir Google Drive Picker");
        }
    };

    const breadcrumbs = [];
    let tempId = currentFolderId;
    while (tempId) {
        const folder = resources.find(r => r.id === tempId);
        if (folder) {
            breadcrumbs.unshift(folder);
            tempId = folder.parentId || null;
        } else {
            break;
        }
    }

    const filteredResources = resources.filter(r => (r.parentId || null) === currentFolderId);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-foreground">Biblioteca de recursos</h3>
                    <p className="text-sm text-text-muted mt-1">
                        Gestiona los materiales globales que estarán disponibles para todos los alumnos de la unidad.
                    </p>
                </div>
                {isSaving ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-accent-blue/5 border border-accent-blue/20 rounded-full">
                        <div className="size-1.5 rounded-full bg-accent-blue animate-pulse" />
                        <span className="text-[10px] uppercase tracking-widest font-bold text-accent-blue">Guardando...</span>
                    </div>
                ) : (
                    <span className="text-xs text-text-muted/50 font-medium italic">Cambios guardados</span>
                )}
            </div>

            <div className="flex flex-wrap gap-4 p-6 bg-surface border border-border-subtle rounded-2xl shadow-sm">
                <Button onClick={() => addResource('file')} variant="outline" className="h-11 px-5 border-border/50 hover:bg-accent-blue/5 hover:border-accent-blue/30 transition-all rounded-xl">
                    <FileText className="size-4 mr-2 text-accent-blue" /> Archivo
                </Button>
                <Button onClick={() => addResource('link')} variant="outline" className="h-11 px-5 border-border/50 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all rounded-xl">
                    <LinkIcon className="size-4 mr-2 text-emerald-500" /> Enlace
                </Button>
                <Button onClick={() => addResource('folder')} variant="outline" className="h-11 px-5 border-border/50 hover:bg-blue-600/5 hover:border-blue-600/30 transition-all rounded-xl">
                    <FolderPlus className="size-4 mr-2 text-blue-600" /> Carpeta
                </Button>
                <div className="w-px h-8 bg-border/50 self-center hidden sm:block mx-2" />
                <Button onClick={openDrivePicker} disabled={isDriveLoading} variant="outline" className="h-11 px-5 border-border/50 hover:bg-accent-amber/5 hover:border-accent-amber/30 transition-all rounded-xl group">
                    {isDriveLoading ? (
                        <Loader2 className="size-4 mr-3 animate-spin text-accent-amber" />
                    ) : (
                        <div className="size-5 mr-3 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded group-hover:bg-accent-amber/10 transition-colors">
                            <svg viewBox="0 0 24 24" className="size-3.5 fill-accent-amber">
                                <path d="M7.714 3L4.643 8.25L9.5 16.5L12.571 11.25L7.714 3Z" />
                                <path d="M16.286 3L11.429 11.25L14.5 16.5L19.357 8.25L16.286 3Z" />
                                <path d="M15.429 17.25H8.571L5.5 22.5H22.357L19.286 17.25H15.429Z" />
                            </svg>
                        </div>
                    )}
                    {isDriveLoading ? "Conectando..." : "Google Drive"}
                </Button>
            </div>

            {/* Breadcrumbs / Navegación */}
            <div className="flex items-center gap-2 text-sm font-medium">
                <button
                    onClick={() => setCurrentFolderId(null)}
                    className={cn(
                        "hover:text-accent-blue transition-colors",
                        currentFolderId === null ? "text-foreground" : "text-text-muted"
                    )}
                >
                    Raíz
                </button>
                {breadcrumbs.map((crumb) => (
                    <div key={crumb.id} className="flex items-center gap-2">
                        <ChevronRight className="size-4 text-text-muted/50" />
                        <button
                            onClick={() => setCurrentFolderId(crumb.id)}
                            className={cn(
                                "hover:text-accent-blue transition-colors",
                                crumb.id === currentFolderId ? "text-foreground" : "text-text-muted"
                            )}
                        >
                            {crumb.title || "Sin título"}
                        </button>
                    </div>
                ))}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={filteredResources.map(r => r.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="grid grid-cols-1 gap-4">
                        {filteredResources.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-surface/30 border border-dashed border-border-subtle rounded-3xl text-center">
                                <Search className="size-10 text-text-muted/20 mb-4" />
                                <p className="text-text-muted font-medium">Esta carpeta está vacía.</p>
                                <p className="text-xs text-text-muted/60 mt-1">Usa los botones superiores para añadir contenido aquí.</p>
                            </div>
                        ) : (
                            filteredResources.map((item) => (
                                <SortableResourceItem
                                    key={item.id}
                                    item={item}
                                    updateItem={updateItem}
                                    removeItem={removeItem}
                                    onEnterFolder={() => setCurrentFolderId(item.id)}
                                    availableFolders={resources.filter(r => r.type === 'folder' && r.id !== item.id)}
                                    allResources={resources}
                                />
                            ))
                        )}
                    </div>
                </SortableContext>
            </DndContext>

            {/* AlertDialog para confirmación de borrado */}
            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent className="bg-surface border-border-strong">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="size-5 text-red-500" />
                            ¿Eliminar recurso?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-text-muted">
                            {itemToDelete?.type === 'folder' 
                                ? `Estás a punto de eliminar la carpeta "${itemToDelete.title}". Esto eliminará permanentemente la carpeta y TODO su contenido. Esta acción no se puede deshacer.`
                                : `¿Estás seguro de que quieres eliminar "${itemToDelete?.title || 'este recurso'}"? Esta acción no se puede deshacer.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-border-strong hover:bg-surface-dark">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => itemToDelete && confirmDelete(itemToDelete.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

interface SortableResourceItemProps {
    item: ResourceItem;
    updateItem: (id: string, updates: Partial<ResourceItem>) => void;
    removeItem: (id: string) => void;
    onEnterFolder?: () => void;
    availableFolders: ResourceItem[];
    allResources: ResourceItem[];
}

function SortableResourceItem({ item, updateItem, removeItem, onEnterFolder, availableFolders, allResources }: SortableResourceItemProps) {
    const getFolderPath = (folderId: string): string => {
        const folder = allResources.find(r => r.id === folderId);
        if (!folder) return "";
        if (!folder.parentId) return folder.title || "Sin título";
        return `${getFolderPath(folder.parentId)} > ${folder.title || "Sin título"}`;
    };

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
                "group p-5 bg-surface border border-border/50 rounded-2xl flex gap-5 items-start transition-all hover:border-accent-blue/30 hover:shadow-md",
                isDragging && "shadow-2xl border-accent-blue scale-[1.01] opacity-90 rotate-1",
                item.isVisible === false && "opacity-50"
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className="mt-2 text-text-muted/20 cursor-grab active:cursor-grabbing hover:text-text-muted transition-colors p-1"
            >
                <GripVertical className="size-4" />
            </div>

            <div className="shrink-0 mt-1">
                <div className="size-10">
                    <ResourceIcon type={item.type} mimeType={item.mimeType} />
                </div>
            </div>

            <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Título</label>
                        <Input
                            value={item.title}
                            onChange={(e) => updateItem(item.id, { title: e.target.value })}
                            placeholder={item.type === 'folder' ? "Nombre de la carpeta..." : "Nombre del recurso..."}
                            className="bg-background border-border-subtle h-10 px-4 rounded-xl focus:ring-accent-blue/20"
                        />
                    </div>
                    {item.type !== 'folder' && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">
                                {item.type === 'file' ? "Endpoint/URL Archivo" : "URL Destino"}
                            </label>
                            <Input
                                value={item.url || ""}
                                onChange={(e) => updateItem(item.id, { url: e.target.value })}
                                placeholder="https://..."
                                className="bg-background border-border-subtle h-10 px-4 rounded-xl focus:ring-accent-blue/20"
                            />
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Ubicación (Mover a...)</label>
                        <Select
                            value={item.parentId || "root"}
                            onValueChange={(val) => updateItem(item.id, { parentId: val === "root" ? null : val })}
                        >
                            <SelectTrigger className="bg-background border-border-subtle h-9 px-4 rounded-xl text-xs text-text-muted focus:ring-accent-blue/20">
                                <SelectValue placeholder="Raíz" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="root">Raíz</SelectItem>
                                {availableFolders.map(folder => (
                                    <SelectItem key={folder.id} value={folder.id}>
                                        {getFolderPath(folder.id)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Descripción Breve</label>
                        <Input
                            value={item.description || ""}
                            onChange={(e) => updateItem(item.id, { description: e.target.value })}
                            placeholder="Explica qué contiene este recurso..."
                            className="bg-background border-border-subtle h-9 px-4 rounded-xl text-xs text-text-muted focus:ring-accent-blue/20"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-xl transition-colors"
                    onClick={() => updateItem(item.id, { isVisible: item.isVisible === false ? true : false })}
                    title={item.isVisible === false ? "Mostrar a alumnos" : "Ocultar a alumnos"}
                >
                    {item.isVisible === false
                        ? <EyeOff className="size-4 text-text-muted" />
                        : <Eye className="size-4 text-text-muted/20 hover:text-text-muted" />
                    }
                </Button>
                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.type === 'folder' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-xl hover:bg-blue-600/10 hover:text-blue-600 transition-colors"
                        onClick={onEnterFolder}
                        title="Entrar en carpeta"
                    >
                        <ArrowLeft className="size-4 rotate-180" />
                    </Button>
                )}
                {item.url && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-xl hover:bg-accent-blue/10 hover:text-accent-blue transition-colors"
                        onClick={() => window.open(item.url, '_blank')}
                        title="Abrir enlace"
                    >
                        <ExternalLink className="size-4" />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-xl text-accent-red/50 hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                    onClick={() => removeItem(item.id)}
                    title="Eliminar recurso"
                >
                    <Trash2 className="size-4" />
                </Button>
                </div>
            </div>
        </div>
    );
}
