"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { RubricCriteria, RubricLevel } from "@/types/activity";
import { Plus, Trash2, Library, CloudUpload, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    createRubricCriterionLibraryEntry,
    getRubricCriteriaLibrary,
    updateRubricCriterionLibraryEntry,
} from "@/app/activities/[id]/edit/actions";

interface RubricBuilderModalProps {
    rubric: RubricCriteria[];
    open: boolean;
    onClose: () => void;
    onChange: (rubric: RubricCriteria[]) => void;
}

type RubricCriterionLibraryItem = {
    id: string;
    name: string;
    description: string | null;
    levels: RubricLevel[];
    visibility: "private" | "public";
    version: number;
    created_by: string;
    updated_at: string;
    is_owner: boolean;
};

const DEFAULT_LEVELS: Omit<RubricLevel, "id">[] = [
    { label: "Excelente", points: 4, description: "" },
    { label: "Notable", points: 3, description: "" },
    { label: "Aprobado", points: 2, description: "" },
    { label: "Insuficiente", points: 1, description: "" },
];

function buildBlankCriterion(): RubricCriteria {
    return {
        id: crypto.randomUUID(),
        name: "",
        description: "",
        levels: DEFAULT_LEVELS.map((level) => ({ ...level, id: crypto.randomUUID() })),
    };
}

function buildSnapshotCriterion(criterion: RubricCriterionLibraryItem): RubricCriteria {
    return {
        id: crypto.randomUUID(),
        name: criterion.name,
        description: criterion.description ?? "",
        levels: criterion.levels.map((level) => ({
            id: crypto.randomUUID(),
            label: level.label,
            points: level.points,
            description: level.description ?? "",
        })),
        source_criterion_id: criterion.id,
        source_version: criterion.version,
        source_visibility: criterion.visibility,
    };
}

export function RubricBuilderModal({ rubric, open, onClose, onChange }: RubricBuilderModalProps) {
    const [selectedId, setSelectedId] = useState<string | null>(() => rubric[0]?.id ?? null);
    const [libraryCriteria, setLibraryCriteria] = useState<RubricCriterionLibraryItem[]>([]);
    const [isLibraryDialogOpen, setIsLibraryDialogOpen] = useState(false);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [saveVisibility, setSaveVisibility] = useState<"private" | "public">("private");
    const [isLibraryLoading, setIsLibraryLoading] = useState(false);
    const [isPending, startTransition] = useTransition();

    const selected = rubric.find((criterion) => criterion.id === selectedId) ?? null;
    const linkedLibraryCriterion = useMemo(() => {
        if (!selected?.source_criterion_id) return null;
        return libraryCriteria.find((criterion) => criterion.id === selected.source_criterion_id) ?? null;
    }, [libraryCriteria, selected]);

    const hasUpdateAvailable = !!(
        selected &&
        linkedLibraryCriterion &&
        (selected.source_version ?? 0) < linkedLibraryCriterion.version
    );

    useEffect(() => {
        if (!open) return;
        setSelectedId((current) => {
            if (current && rubric.some((criterion) => criterion.id === current)) return current;
            return rubric[0]?.id ?? null;
        });
    }, [open, rubric]);

    useEffect(() => {
        if (!open) return;
        setIsLibraryLoading(true);
        startTransition(async () => {
            const result = await getRubricCriteriaLibrary();
            if (result.error) {
                toast.error("Error al cargar criterios guardados");
                setLibraryCriteria([]);
            } else {
                setLibraryCriteria(result.criteria);
            }
            setIsLibraryLoading(false);
        });
    }, [open]);

    useEffect(() => {
        if (!selected) return;
        setSaveVisibility(selected.source_visibility ?? linkedLibraryCriterion?.visibility ?? "private");
    }, [selected, linkedLibraryCriterion]);

    function addNewCriterion() {
        const newCriterion = buildBlankCriterion();
        const updated = [...rubric, newCriterion];
        onChange(updated);
        setSelectedId(newCriterion.id);
    }

    function insertSavedCriterion(criterion: RubricCriterionLibraryItem) {
        const snapshot = buildSnapshotCriterion(criterion);
        const updated = [...rubric, snapshot];
        onChange(updated);
        setSelectedId(snapshot.id);
        setIsLibraryDialogOpen(false);
        toast.success(`Criterio "${criterion.name}" insertado`);
    }

    function removeCriterion(id: string) {
        const updated = rubric.filter((criterion) => criterion.id !== id);
        onChange(updated);
        if (selectedId === id) {
            setSelectedId(updated[0]?.id ?? null);
        }
    }

    function updateCriterion(id: string, patch: Partial<RubricCriteria>) {
        onChange(rubric.map((criterion) => criterion.id === id ? { ...criterion, ...patch } : criterion));
    }

    function addLevel(criterionId: string) {
        const criterion = rubric.find((item) => item.id === criterionId);
        if (!criterion) return;
        const newLevel: RubricLevel = { id: crypto.randomUUID(), label: "", points: 0, description: "" };
        updateCriterion(criterionId, { levels: [...(criterion.levels ?? []), newLevel] });
    }

    function removeLevel(criterionId: string, levelId: string) {
        const criterion = rubric.find((item) => item.id === criterionId);
        if (!criterion) return;
        updateCriterion(criterionId, { levels: (criterion.levels ?? []).filter((level) => level.id !== levelId) });
    }

    function updateLevel(criterionId: string, levelId: string, patch: Partial<RubricLevel>) {
        const criterion = rubric.find((item) => item.id === criterionId);
        if (!criterion) return;
        updateCriterion(criterionId, {
            levels: (criterion.levels ?? []).map((level) => level.id === levelId ? { ...level, ...patch } : level),
        });
    }

    function openSaveDialog() {
        if (!selected) return;
        if (!selected.name.trim()) {
            toast.error("Ponle nombre al criterio antes de guardarlo.");
            return;
        }
        if (!selected.levels?.length) {
            toast.error("El criterio debe tener al menos un nivel.");
            return;
        }
        setSaveVisibility(selected.source_visibility ?? linkedLibraryCriterion?.visibility ?? "private");
        setIsSaveDialogOpen(true);
    }

    function handleSaveCriterion() {
        if (!selected) return;

        startTransition(async () => {
            const promise = (async () => {
                const payload = {
                    name: selected.name,
                    description: selected.description ?? "",
                    levels: selected.levels ?? [],
                };

                if (linkedLibraryCriterion?.is_owner && selected.source_criterion_id === linkedLibraryCriterion.id) {
                    const result = await updateRubricCriterionLibraryEntry(linkedLibraryCriterion.id, payload, saveVisibility);
                    if (result.error || !result.criterion) throw new Error(result.error ?? "No se pudo actualizar el criterio guardado.");

                    setLibraryCriteria((current) => [
                        result.criterion,
                        ...current.filter((criterion) => criterion.id !== result.criterion.id),
                    ]);

                    updateCriterion(selected.id, {
                        source_criterion_id: result.criterion.id,
                        source_version: result.criterion.version,
                        source_visibility: result.criterion.visibility,
                    });
                    return "actualizado";
                }

                const result = await createRubricCriterionLibraryEntry(payload, saveVisibility);
                if (result.error || !result.criterion) throw new Error(result.error ?? "No se pudo guardar el criterio.");

                setLibraryCriteria((current) => [result.criterion, ...current]);
                updateCriterion(selected.id, {
                    source_criterion_id: result.criterion.id,
                    source_version: result.criterion.version,
                    source_visibility: result.criterion.visibility,
                });
                return "guardado";
            })();

            await toast.promise(promise, {
                loading: linkedLibraryCriterion?.is_owner && selected.source_criterion_id === linkedLibraryCriterion.id
                    ? "Actualizando criterio guardado..."
                    : "Guardando criterio...",
                success: (status) => status === "actualizado"
                    ? "Criterio guardado actualizado"
                    : "Criterio guardado correctamente",
                error: (error) => error.message,
            });

            setIsSaveDialogOpen(false);
        });
    }

    function applyLibraryUpdate() {
        if (!selected || !linkedLibraryCriterion) return;
        updateCriterion(selected.id, {
            name: linkedLibraryCriterion.name,
            description: linkedLibraryCriterion.description ?? "",
            levels: linkedLibraryCriterion.levels.map((level) => ({
                id: crypto.randomUUID(),
                label: level.label,
                points: level.points,
                description: level.description ?? "",
            })),
            source_criterion_id: linkedLibraryCriterion.id,
            source_version: linkedLibraryCriterion.version,
            source_visibility: linkedLibraryCriterion.visibility,
        });
        toast.success("Criterio actualizado desde la biblioteca");
    }

    const ownCriteria = libraryCriteria.filter((criterion) => criterion.is_owner);
    const publicCriteria = libraryCriteria.filter((criterion) => !criterion.is_owner && criterion.visibility === "public");

    return (
        <>
            <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
                <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
                    <DialogHeader className="shrink-0 px-6 py-4 border-b border-border-strong">
                        <DialogTitle className="text-base font-bold">Configurar rúbrica</DialogTitle>
                    </DialogHeader>

                    <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
                        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
                            <div className="h-full flex flex-col bg-surface-dark">
                                <div className="shrink-0 h-9 flex items-center px-4 border-b border-border-strong">
                                    <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Criterios</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                    {rubric.length === 0 && (
                                        <p className="text-xs text-text-muted italic px-2 py-4 text-center">
                                            Sin criterios. Pulsa "＋ Criterio" para añadir.
                                        </p>
                                    )}
                                    {rubric.map((criterion) => {
                                        const criterionSource = criterion.source_criterion_id
                                            ? libraryCriteria.find((item) => item.id === criterion.source_criterion_id)
                                            : null;
                                        const criterionHasUpdate = !!(criterionSource && (criterion.source_version ?? 0) < criterionSource.version);
                                        return (
                                            <button
                                                key={criterion.id}
                                                onClick={() => setSelectedId(criterion.id)}
                                                className={cn(
                                                    "w-full text-left px-3 py-2.5 rounded-lg border transition-colors",
                                                    selectedId === criterion.id
                                                        ? "bg-accent-blue/10 border-accent-blue/40 text-foreground"
                                                        : "bg-surface border-border-strong text-text-muted hover:text-foreground hover:bg-surface"
                                                )}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-sm font-semibold truncate">
                                                        {criterion.name || <span className="italic text-text-muted/60">Sin nombre</span>}
                                                    </span>
                                                    <span className="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded-full bg-surface-dark border border-border-strong text-text-muted">
                                                        {criterion.levels?.length ?? 0} niv.
                                                    </span>
                                                </div>
                                                {criterion.source_criterion_id && (
                                                    <div className="mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold">
                                                        <span className="rounded-full border border-border-strong px-1.5 py-0.5 text-text-muted">
                                                            Guardado
                                                        </span>
                                                        {criterionHasUpdate && (
                                                            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-400">
                                                                Actualización disponible
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="shrink-0 p-3 border-t border-border-strong">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full h-8 text-xs gap-1.5 border-border-strong text-text-muted hover:text-foreground"
                                            >
                                                <Plus className="size-3" /> Criterio
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={addNewCriterion} className="cursor-pointer text-xs gap-2">
                                                <Plus className="size-3.5" /> Nuevo criterio
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setIsLibraryDialogOpen(true)} className="cursor-pointer text-xs gap-2">
                                                <Library className="size-3.5" /> Usar criterio guardado
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle className="bg-border-subtle hover:bg-accent-blue transition-colors duration-200 w-1.5" />

                        <ResizablePanel defaultSize={65} minSize={50}>
                            <div className="h-full flex flex-col bg-surface overflow-y-auto">
                                {selected === null ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-12">
                                        <p className="text-sm text-text-muted">Selecciona o añade un criterio para editarlo.</p>
                                    </div>
                                ) : (
                                    <div className="p-6 space-y-5 flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-strong bg-surface-dark/60 p-3">
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Biblioteca</p>
                                                {selected.source_criterion_id ? (
                                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                                        <span className="rounded-full border border-border-strong px-2 py-1 text-text-muted">
                                                            v{selected.source_version ?? 1}
                                                        </span>
                                                        <span className="rounded-full border border-border-strong px-2 py-1 text-text-muted">
                                                            {selected.source_visibility === "public" ? "Público" : "Privado"}
                                                        </span>
                                                        {hasUpdateAvailable && (
                                                            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-400">
                                                                Actualización disponible
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-text-muted">Este criterio todavía no está guardado.</p>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {hasUpdateAvailable && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={applyLibraryUpdate}
                                                        className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                                    >
                                                        <RefreshCw className="size-3.5" /> Actualizar
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={openSaveDialog}
                                                    className="h-8 text-xs gap-1.5 border-border-strong text-text-muted hover:text-foreground"
                                                >
                                                    <CloudUpload className="size-3.5" />
                                                    {linkedLibraryCriterion?.is_owner && selected.source_criterion_id === linkedLibraryCriterion.id
                                                        ? "Actualizar criterio guardado"
                                                        : "Guardar criterio"}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Nombre del criterio</label>
                                            <Input
                                                value={selected.name}
                                                onChange={(event) => updateCriterion(selected.id, { name: event.target.value })}
                                                placeholder="Ej: Claridad de la explicación"
                                                className="bg-surface-dark border-border-strong"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Descripción (opcional)</label>
                                            <Textarea
                                                value={selected.description ?? ""}
                                                onChange={(event) => updateCriterion(selected.id, { description: event.target.value })}
                                                placeholder="Contexto general del criterio"
                                                rows={2}
                                                className="bg-surface-dark border-border-strong resize-none text-sm"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between mb-4">
                                                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Niveles</label>
                                                <span className="text-xs text-text-muted">
                                                    {selected.levels?.length ?? 0} nivel{(selected.levels?.length ?? 0) !== 1 ? "es" : ""}
                                                </span>
                                            </div>

                                            <div className="space-y-3">
                                                {(selected.levels ?? []).map((level) => (
                                                    <div key={level.id} className="bg-surface/30 border border-border-strong rounded-xl p-4 relative group transition-colors hover:border-border-subtle">
                                                        <button
                                                            onClick={() => removeLevel(selected.id, level.id)}
                                                            className="absolute top-3 right-3 flex items-center justify-center size-7 rounded-md text-text-muted opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                            title="Eliminar nivel"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>

                                                        <div className="flex gap-4 mb-3 pr-8">
                                                            <div className="flex-1 space-y-1.5">
                                                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Etiqueta</label>
                                                                <Input
                                                                    value={level.label}
                                                                    onChange={(event) => updateLevel(selected.id, level.id, { label: event.target.value })}
                                                                    placeholder="Ej: Excelente"
                                                                    className="bg-surface-dark border-border-strong h-8 text-sm"
                                                                />
                                                            </div>
                                                            <div className="w-20 space-y-1.5">
                                                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest text-center block">Puntos</label>
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    max={100}
                                                                    step={0.5}
                                                                    value={level.points === 0 ? "" : level.points}
                                                                    placeholder="0"
                                                                    onChange={(event) => {
                                                                        const raw = event.target.value;
                                                                        const parsed = parseFloat(raw);
                                                                        updateLevel(selected.id, level.id, { points: Number.isNaN(parsed) ? 0 : parsed });
                                                                    }}
                                                                    className="bg-surface-dark border-border-strong h-8 text-sm text-center font-mono"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Descripción</label>
                                                            <Textarea
                                                                value={level.description ?? ""}
                                                                onChange={(event) => updateLevel(selected.id, level.id, { description: event.target.value })}
                                                                placeholder="Describe qué se requiere para alcanzar este nivel"
                                                                rows={2}
                                                                className="bg-surface-dark border-border-strong resize-none text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addLevel(selected.id)}
                                                className="h-7 text-xs gap-1.5 border-border-strong text-text-muted hover:text-foreground"
                                            >
                                                <Plus className="size-3" /> Añadir nivel
                                            </Button>
                                        </div>

                                        <div className="pt-4 border-t border-border-strong flex justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeCriterion(selected.id)}
                                                className="h-7 text-xs gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="size-3" /> Eliminar criterio
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </DialogContent>
            </Dialog>
            <Dialog open={isLibraryDialogOpen} onOpenChange={setIsLibraryDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Usar criterio guardado</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5">
                        {isLibraryLoading ? (
                            <p className="text-sm text-text-muted">Cargando criterios guardados...</p>
                        ) : ownCriteria.length === 0 && publicCriteria.length === 0 ? (
                            <p className="text-sm text-text-muted">No hay criterios guardados disponibles.</p>
                        ) : (
                            <>
                                <div className="space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Mis criterios</p>
                                    {ownCriteria.length === 0 ? (
                                        <p className="text-sm text-text-muted">Todavía no has guardado criterios.</p>
                                    ) : (
                                        ownCriteria.map((criterion) => (
                                            <button
                                                key={criterion.id}
                                                type="button"
                                                onClick={() => insertSavedCriterion(criterion)}
                                                className="w-full rounded-xl border border-border-strong bg-surface text-left p-4 hover:border-accent-blue/40 hover:bg-surface-dark transition-colors"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="font-semibold text-foreground">{criterion.name}</p>
                                                        {criterion.description && <p className="text-sm text-text-muted mt-1">{criterion.description}</p>}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider">
                                                        <span className="rounded-full border border-border-strong px-2 py-1 text-text-muted">v{criterion.version}</span>
                                                        <span className="rounded-full border border-border-strong px-2 py-1 text-text-muted">
                                                            {criterion.visibility === "public" ? "Público" : "Privado"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Públicos</p>
                                    {publicCriteria.length === 0 ? (
                                        <p className="text-sm text-text-muted">No hay criterios públicos disponibles.</p>
                                    ) : (
                                        publicCriteria.map((criterion) => (
                                            <button
                                                key={criterion.id}
                                                type="button"
                                                onClick={() => insertSavedCriterion(criterion)}
                                                className="w-full rounded-xl border border-border-strong bg-surface text-left p-4 hover:border-accent-blue/40 hover:bg-surface-dark transition-colors"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="font-semibold text-foreground">{criterion.name}</p>
                                                        {criterion.description && <p className="text-sm text-text-muted mt-1">{criterion.description}</p>}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider">
                                                        <span className="rounded-full border border-border-strong px-2 py-1 text-text-muted">v{criterion.version}</span>
                                                        <span className="rounded-full border border-border-strong px-2 py-1 text-text-muted">Público</span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {linkedLibraryCriterion?.is_owner && selected?.source_criterion_id === linkedLibraryCriterion.id
                                ? "Actualizar criterio guardado"
                                : "Guardar criterio"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input value={selected?.name ?? ""} readOnly className="bg-surface-dark border-border-strong" />
                        </div>
                        <div className="space-y-2">
                            <Label>Visibilidad</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSaveVisibility("private")}
                                    className={cn(
                                        "justify-start",
                                        saveVisibility === "private" && "border-accent-blue/40 text-accent-blue bg-accent-blue/10"
                                    )}
                                >
                                    Privado
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSaveVisibility("public")}
                                    className={cn(
                                        "justify-start",
                                        saveVisibility === "public" && "border-accent-blue/40 text-accent-blue bg-accent-blue/10"
                                    )}
                                >
                                    Público
                                </Button>
                            </div>
                            <p className="text-xs text-text-muted">
                                Privado: solo tú. Público: cualquier profesor puede reutilizarlo.
                            </p>
                        </div>
                        <Button onClick={handleSaveCriterion} disabled={isPending} className="w-full gap-2">
                            <CloudUpload className="size-4" />
                            {linkedLibraryCriterion?.is_owner && selected?.source_criterion_id === linkedLibraryCriterion.id
                                ? "Actualizar criterio guardado"
                                : "Guardar criterio"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
