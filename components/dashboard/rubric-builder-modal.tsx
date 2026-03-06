"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { RubricCriteria, RubricLevel } from "@/types/activity";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RubricBuilderModalProps {
    rubric: RubricCriteria[];
    open: boolean;
    onClose: () => void;
    onChange: (rubric: RubricCriteria[]) => void;
}

const DEFAULT_LEVELS: Omit<RubricLevel, "id">[] = [
    { label: "Excelente",    points: 4, description: "" },
    { label: "Notable",      points: 3, description: "" },
    { label: "Aprobado",     points: 2, description: "" },
    { label: "Insuficiente", points: 1, description: "" },
];

export function RubricBuilderModal({ rubric, open, onClose, onChange }: RubricBuilderModalProps) {
    const [selectedId, setSelectedId] = useState<string | null>(() => rubric[0]?.id ?? null);

    const selected = rubric.find(c => c.id === selectedId) ?? null;

    function addCriterion() {
        const newCriterion: RubricCriteria = {
            id: crypto.randomUUID(),
            name: "",
            description: "",
            levels: DEFAULT_LEVELS.map(l => ({ ...l, id: crypto.randomUUID() })),
        };
        const updated = [...rubric, newCriterion];
        onChange(updated);
        setSelectedId(newCriterion.id);
    }

    function removeCriterion(id: string) {
        const updated = rubric.filter(c => c.id !== id);
        onChange(updated);
        if (selectedId === id) {
            setSelectedId(updated[0]?.id ?? null);
        }
    }

    function updateCriterion(id: string, patch: Partial<RubricCriteria>) {
        onChange(rubric.map(c => c.id === id ? { ...c, ...patch } : c));
    }

    function addLevel(criterionId: string) {
        const criterion = rubric.find(c => c.id === criterionId);
        if (!criterion) return;
        const newLevel: RubricLevel = { id: crypto.randomUUID(), label: "", points: 0, description: "" };
        updateCriterion(criterionId, { levels: [...(criterion.levels ?? []), newLevel] });
    }

    function removeLevel(criterionId: string, levelId: string) {
        const criterion = rubric.find(c => c.id === criterionId);
        if (!criterion) return;
        updateCriterion(criterionId, { levels: (criterion.levels ?? []).filter(l => l.id !== levelId) });
    }

    function updateLevel(criterionId: string, levelId: string, patch: Partial<RubricLevel>) {
        const criterion = rubric.find(c => c.id === criterionId);
        if (!criterion) return;
        updateCriterion(criterionId, {
            levels: (criterion.levels ?? []).map(l => l.id === levelId ? { ...l, ...patch } : l),
        });
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-[95vw] w-[95vw] h-[80vh] p-0 flex flex-col gap-0 overflow-hidden">
                <DialogHeader className="shrink-0 px-6 py-4 border-b border-border-strong">
                    <DialogTitle className="text-base font-bold">Configurar rúbrica</DialogTitle>
                </DialogHeader>

                <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
                    {/* Left: criteria list */}
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
                                {rubric.map((criterion) => (
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
                                    </button>
                                ))}
                            </div>
                            <div className="shrink-0 p-3 border-t border-border-strong">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addCriterion}
                                    className="w-full h-8 text-xs gap-1.5 border-border-strong text-text-muted hover:text-foreground"
                                >
                                    <Plus className="size-3" /> Criterio
                                </Button>
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="bg-border-subtle hover:bg-accent-blue transition-colors duration-200 w-1.5" />

                    {/* Right: criterion editor */}
                    <ResizablePanel defaultSize={65} minSize={50}>
                        <div className="h-full flex flex-col bg-surface overflow-y-auto">
                            {selected === null ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-12">
                                    <p className="text-sm text-text-muted">Selecciona o añade un criterio para editarlo.</p>
                                </div>
                            ) : (
                                <div className="p-6 space-y-5 flex-1">
                                    {/* Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Nombre del criterio</label>
                                        <Input
                                            value={selected.name}
                                            onChange={(e) => updateCriterion(selected.id, { name: e.target.value })}
                                            placeholder="Ej: Claridad de la explicación"
                                            className="bg-surface-dark border-border-strong"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Descripción (opcional)</label>
                                        <Textarea
                                            value={selected.description ?? ""}
                                            onChange={(e) => updateCriterion(selected.id, { description: e.target.value })}
                                            placeholder="Contexto general del criterio"
                                            rows={2}
                                            className="bg-surface-dark border-border-strong resize-none text-sm"
                                        />
                                    </div>

                                    {/* Levels */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Niveles</label>
                                            <span className="text-xs text-text-muted">
                                                {selected.levels?.length ?? 0} nivel{(selected.levels?.length ?? 0) !== 1 ? "es" : ""}
                                            </span>
                                        </div>

                                        {(selected.levels?.length ?? 0) > 0 && (
                                            <div className="grid grid-cols-[1fr_1.5fr_72px_32px] gap-x-2 gap-y-0 mb-1">
                                                <span className="text-[10px] font-bold text-text-muted uppercase px-1">Etiqueta</span>
                                                <span className="text-[10px] font-bold text-text-muted uppercase px-1">Descripción</span>
                                                <span className="text-[10px] font-bold text-text-muted uppercase px-1 text-center">Pts</span>
                                                <span />
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            {(selected.levels ?? []).map((level) => (
                                                <div key={level.id} className="grid grid-cols-[1fr_1.5fr_72px_32px] gap-2 items-center">
                                                    <Input
                                                        value={level.label}
                                                        onChange={(e) => updateLevel(selected.id, level.id, { label: e.target.value })}
                                                        placeholder="Ej: Excelente"
                                                        className="bg-surface-dark border-border-strong h-8 text-sm"
                                                    />
                                                    <Input
                                                        value={level.description ?? ""}
                                                        onChange={(e) => updateLevel(selected.id, level.id, { description: e.target.value })}
                                                        placeholder="Descripción del nivel"
                                                        className="bg-surface-dark border-border-strong h-8 text-sm"
                                                    />
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        step={0.5}
                                                        value={level.points === 0 ? "" : level.points}
                                                        placeholder="0"
                                                        onChange={(e) => {
                                                            const raw = e.target.value;
                                                            const parsed = parseFloat(raw);
                                                            updateLevel(selected.id, level.id, { points: isNaN(parsed) ? 0 : parsed });
                                                        }}
                                                        className="bg-surface-dark border-border-strong h-8 text-sm text-center font-mono"
                                                    />
                                                    <button
                                                        onClick={() => removeLevel(selected.id, level.id)}
                                                        className="flex items-center justify-center size-8 rounded-md text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
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

                                    {/* Delete criterion */}
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
    );
}
