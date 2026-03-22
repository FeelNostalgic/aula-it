"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Layers, CheckCircle2, Circle, GripVertical, AlignLeft, X } from "lucide-react";
import { QuestionBank, QuizQuestion, QuizQuestionType } from "@/types/activity";
import { getQuestionBanks, createQuestionBank, updateQuestionBank, deleteQuestionBank } from "@/app/activities/[id]/edit/actions";
import { cn } from "@/lib/utils";
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QuestionBankManagerProps {
    open: boolean;
    onClose: () => void;
    onBanksLoaded: (banks: QuestionBank[]) => void;
    onSelectBank: (bank: QuestionBank) => void;
    onRemoveBank: (bankId: string) => void;
    selectedBankIds: string[];
}

const QUESTION_TYPES: { value: QuizQuestionType; label: string }[] = [
    { value: 'multiple_choice', label: 'Opción múltiple' },
    { value: 'true_false', label: 'Verdadero/Falso' },
    { value: 'short_answer', label: 'Respuesta corta' },
];

// ---------------------------------------------------------------------------
// Sortable Option — identical style to quiz-editor's SortableOption
// ---------------------------------------------------------------------------

function SortableOption({
    opt, oIdx, qType, canRemove,
    onToggleCorrect, onChangeText, onRemove,
}: {
    opt: { id: string; text: string; isCorrect: boolean };
    oIdx: number;
    qType: QuizQuestionType;
    canRemove: boolean;
    onToggleCorrect: () => void;
    onChangeText: (text: string) => void;
    onRemove: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opt.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3">
            <button
                {...attributes} {...listeners}
                className="text-text-muted/30 hover:text-text-muted cursor-grab active:cursor-grabbing shrink-0 touch-none"
            >
                <GripVertical className="size-3.5" />
            </button>
            <button
                onClick={onToggleCorrect}
                className="focus:outline-none transition-colors shrink-0"
                title={opt.isCorrect ? "Marcar como incorrecta" : "Marcar como correcta"}
            >
                {opt.isCorrect
                    ? <CheckCircle2 className="size-5 text-green-500" />
                    : <Circle className="size-5 text-text-muted/40 hover:text-text-muted" />
                }
            </button>
            <Input
                value={opt.text}
                onChange={(e) => onChangeText(e.target.value)}
                placeholder={`Opción ${oIdx + 1}`}
                readOnly={qType === 'true_false'}
                className={cn(
                    "h-9 bg-background/50 border-border/50 text-sm",
                    opt.isCorrect ? "border-green-500/30" : "",
                    qType === 'true_false' ? "opacity-70 cursor-default" : ""
                )}
            />
            {qType === 'multiple_choice' && (
                <Button variant="ghost" size="icon" onClick={onRemove}
                    className="size-8 text-text-muted hover:text-red-400 shrink-0"
                    disabled={!canRemove} title="Eliminar opción">
                    <Trash2 className="size-3.5" />
                </Button>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function QuestionBankManagerDialog({
    open, onClose, onBanksLoaded, onSelectBank, onRemoveBank, selectedBankIds,
}: QuestionBankManagerProps) {
    const [banks, setBanks] = useState<QuestionBank[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);
    const [newBankName, setNewBankName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [bankToDelete, setBankToDelete] = useState<QuestionBank | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        getQuestionBanks().then(({ banks: b }) => {
            const loaded = (b ?? []) as QuestionBank[];
            setBanks(loaded);
            onBanksLoaded(loaded);
            setLoading(false);
        });
    }, [open]);

    function scheduleSave(bank: QuestionBank, questions: QuizQuestion[]) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            const result = await updateQuestionBank(bank.id, { questions });
            if (result.error) { toast.error("Error al guardar el banco."); return; }
            const updatedBank = { ...bank, questions };
            setBanks(prev => {
                const updated = prev.map(b => b.id === bank.id ? updatedBank : b);
                onBanksLoaded(updated);
                return updated;
            });
        }, 1000);
    }

    function applyQuestionUpdate(bank: QuestionBank, questions: QuizQuestion[]) {
        const updated = { ...bank, questions };
        setSelectedBank(updated);
        scheduleSave(bank, questions);
    }

    async function handleCreateBank() {
        if (!newBankName.trim()) return;
        setIsCreating(true);
        const result = await createQuestionBank(newBankName.trim());
        if (result.error) { toast.error(result.error); setIsCreating(false); return; }
        const bank = result.bank as QuestionBank;
        const updated = [bank, ...banks];
        setBanks(updated);
        onBanksLoaded(updated);
        setNewBankName("");
        setSelectedBank(bank);
        setIsCreating(false);
    }

    async function handleDeleteBank(bankId: string) {
        const result = await deleteQuestionBank(bankId);
        if (result.error) { toast.error(result.error); return; }
        const updated = banks.filter(b => b.id !== bankId);
        setBanks(updated);
        onBanksLoaded(updated);
        if (selectedBank?.id === bankId) setSelectedBank(null);
    }

    // Question CRUD
    function addQuestion(bank: QuestionBank) {
        const newQ: QuizQuestion = {
            id: crypto.randomUUID(),
            type: 'multiple_choice',
            text: "",
            options: [
                { id: crypto.randomUUID(), text: "", isCorrect: true },
                { id: crypto.randomUUID(), text: "", isCorrect: false },
            ],
            points: 1,
        };
        applyQuestionUpdate(bank, [...bank.questions, newQ]);
    }

    function updateQuestion(bank: QuestionBank, qId: string, updates: Partial<QuizQuestion>) {
        applyQuestionUpdate(bank, bank.questions.map(q => q.id === qId ? { ...q, ...updates } : q));
    }

    function removeQuestion(bank: QuestionBank, qId: string) {
        applyQuestionUpdate(bank, bank.questions.filter(q => q.id !== qId));
    }

    function changeQuestionType(bank: QuestionBank, qId: string, type: QuizQuestionType) {
        const questions = bank.questions.map(q => {
            if (q.id !== qId) return q;
            if (type === 'true_false') return { ...q, type, options: [
                { id: crypto.randomUUID(), text: "Verdadero", isCorrect: true },
                { id: crypto.randomUUID(), text: "Falso", isCorrect: false },
            ]};
            if (type === 'short_answer') return { ...q, type, options: [] };
            return { ...q, type, options: q.options.length >= 2 ? q.options : [
                { id: crypto.randomUUID(), text: "", isCorrect: true },
                { id: crypto.randomUUID(), text: "", isCorrect: false },
            ]};
        });
        applyQuestionUpdate(bank, questions);
    }

    // Option CRUD
    function addOption(bank: QuestionBank, qId: string) {
        applyQuestionUpdate(bank, bank.questions.map(q =>
            q.id !== qId ? q : { ...q, options: [...q.options, { id: crypto.randomUUID(), text: "", isCorrect: false }] }
        ));
    }

    function updateOption(bank: QuestionBank, qId: string, optId: string, updates: Partial<{ text: string; isCorrect: boolean }>) {
        applyQuestionUpdate(bank, bank.questions.map(q =>
            q.id !== qId ? q : { ...q, options: q.options.map(o => o.id === optId ? { ...o, ...updates } : o) }
        ));
    }

    function removeOption(bank: QuestionBank, qId: string, optId: string) {
        applyQuestionUpdate(bank, bank.questions.map(q =>
            q.id !== qId ? q : { ...q, options: q.options.filter(o => o.id !== optId) }
        ));
    }

    function handleOptionDragEnd(bank: QuestionBank, qId: string, event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const q = bank.questions.find(q => q.id === qId);
        if (!q) return;
        const oldIdx = q.options.findIndex(o => o.id === active.id);
        const newIdx = q.options.findIndex(o => o.id === over.id);
        applyQuestionUpdate(bank, bank.questions.map(qq =>
            qq.id !== qId ? qq : { ...qq, options: arrayMove(qq.options, oldIdx, newIdx) }
        ));
    }

    return (
        <>
        <AlertDialog open={!!bankToDelete} onOpenChange={(o) => { if (!o) setBankToDelete(null); }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar banco?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Se eliminará <strong>"{bankToDelete?.name}"</strong> y todas sus preguntas permanentemente. Los cuestionarios que lo referencien dejarán de recibir preguntas de este banco.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-red-500 hover:bg-red-600 text-white"
                        onClick={() => { if (bankToDelete) { handleDeleteBank(bankToDelete.id); setBankToDelete(null); } }}
                    >
                        Eliminar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Layers className="size-4 text-accent-blue" />
                        Bancos de preguntas globales
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-1 min-h-0">
                    {/* Left sidebar — bank list */}
                    <div className="w-80 shrink-0 border-r border-border/50 flex flex-col">
                        <div className="p-4 border-b border-border/30">
                            <div className="flex gap-2">
                                <Input
                                    value={newBankName}
                                    onChange={(e) => setNewBankName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBank()}
                                    placeholder="Nuevo banco..."
                                    className="flex-1 h-9 text-sm bg-surface border-border"
                                />
                                <Button onClick={handleCreateBank} disabled={isCreating || !newBankName.trim()} size="sm" className="h-9 px-3 bg-accent-blue hover:bg-accent-blue/90 text-white shrink-0">
                                    {isCreating ? <RefreshCw className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loading && (
                                <div className="flex items-center justify-center py-10 text-text-muted gap-2 text-sm">
                                    <RefreshCw className="size-4 animate-spin" /> Cargando...
                                </div>
                            )}
                            {!loading && banks.length === 0 && (
                                <p className="text-sm text-text-muted text-center py-10 px-4">Sin bancos. Crea el primero.</p>
                            )}
                            {banks.map(bank => (
                                <div
                                    key={bank.id}
                                    onClick={() => setSelectedBank(bank)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-3 cursor-pointer border-b border-border/20 hover:bg-surface-dark transition-colors",
                                        selectedBank?.id === bank.id && "bg-accent-blue/10 border-l-2 border-l-accent-blue"
                                    )}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{bank.name}</p>
                                        <p className="text-xs text-text-muted">{bank.questions.length} pregunta{bank.questions.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {selectedBankIds.includes(bank.id) && (
                                            <CheckCircle2 className="size-3.5 text-emerald-400" />
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setBankToDelete(bank); }}
                                            className="text-text-muted/40 hover:text-red-400 transition-colors p-0.5 rounded"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right panel — questions editor */}
                    <div className="flex-1 overflow-y-auto">
                        {!selectedBank ? (
                            <div className="flex items-center justify-center h-full text-text-muted text-sm">
                                Selecciona un banco para editarlo
                            </div>
                        ) : (
                            <div className="p-6 space-y-4">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">{selectedBank.name}</h3>
                                        <p className="text-xs text-text-muted">{selectedBank.questions.length} preguntas</p>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        {selectedBankIds.includes(selectedBank.id) ? (
                                            <Button
                                                onClick={() => { onRemoveBank(selectedBank.id); toast.success(`Banco "${selectedBank.name}" quitado del cuestionario.`); }}
                                                size="sm" variant="outline"
                                                className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                                            >
                                                <X className="size-3" /> Quitar del quiz
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => { onSelectBank(selectedBank); toast.success(`Banco "${selectedBank.name}" añadido al cuestionario.`); }}
                                                size="sm" variant="outline"
                                                className="gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs"
                                            >
                                                <Plus className="size-3" /> Añadir al quiz
                                            </Button>
                                        )}
                                        <Button onClick={() => addQuestion(selectedBank)} size="sm" className="gap-1.5 bg-accent-blue hover:bg-accent-blue/90 text-white text-xs">
                                            <Plus className="size-3" /> Pregunta
                                        </Button>
                                    </div>
                                </div>

                                {selectedBank.questions.length === 0 && (
                                    <div className="text-center py-12 border border-dashed border-border/50 rounded-xl">
                                        <p className="text-sm text-text-muted">Sin preguntas. Añade la primera.</p>
                                    </div>
                                )}

                                {selectedBank.questions.map((q, idx) => {
                                    const qType = q.type ?? 'multiple_choice';
                                    return (
                                        <div key={q.id} className="p-6 bg-surface-dark border border-white/5 rounded-xl space-y-4 shadow-sm relative group">
                                            {/* Question text row */}
                                            <div className="flex items-start gap-2">
                                                <span className="bg-surface text-text-muted font-bold px-3 py-1 rounded-md text-sm mt-1 shrink-0">
                                                    Q{idx + 1}
                                                </span>
                                                <Input
                                                    value={q.text}
                                                    onChange={(e) => updateQuestion(selectedBank, q.id, { text: e.target.value })}
                                                    placeholder="Escribe la pregunta aquí..."
                                                    className="flex-1 bg-surface border-border text-sm font-medium"
                                                />
                                                <Button variant="ghost" size="icon"
                                                    onClick={() => removeQuestion(selectedBank, q.id)}
                                                    className="text-text-muted hover:text-red-400 hover:bg-red-400/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>

                                            {/* Type selector + points */}
                                            <div className="pl-14 flex items-center gap-4 flex-wrap">
                                                <div className="flex gap-1 p-0.5 bg-surface rounded-lg border border-border/30">
                                                    {QUESTION_TYPES.map(qt => (
                                                        <button key={qt.value}
                                                            onClick={() => changeQuestionType(selectedBank, q.id, qt.value)}
                                                            className={cn(
                                                                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                                                                qType === qt.value ? "bg-accent-blue/15 text-accent-blue" : "text-text-muted hover:text-foreground"
                                                            )}>
                                                            {qt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs text-text-muted">Puntos:</span>
                                                    <Input type="number" min={0} step={0.5}
                                                        value={q.points ?? 1}
                                                        onChange={(e) => updateQuestion(selectedBank, q.id, { points: Number(e.target.value) })}
                                                        className="w-16 h-7 text-xs font-mono bg-surface border-border text-center px-1" />
                                                </div>
                                            </div>

                                            {/* Options with DnD */}
                                            {qType !== 'short_answer' && (
                                                <div className="pl-14 space-y-2">
                                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleOptionDragEnd(selectedBank, q.id, e)}>
                                                        <SortableContext items={q.options.map(o => o.id)} strategy={verticalListSortingStrategy}>
                                                            {q.options.map((opt, oIdx) => (
                                                                <SortableOption
                                                                    key={opt.id}
                                                                    opt={opt}
                                                                    oIdx={oIdx}
                                                                    qType={qType}
                                                                    canRemove={q.options.length > 2}
                                                                    onToggleCorrect={() => {
                                                                        if (qType === 'true_false') {
                                                                            updateQuestion(selectedBank, q.id, { options: q.options.map(o => ({ ...o, isCorrect: o.id === opt.id })) });
                                                                        } else {
                                                                            updateOption(selectedBank, q.id, opt.id, { isCorrect: !opt.isCorrect });
                                                                        }
                                                                    }}
                                                                    onChangeText={(text) => updateOption(selectedBank, q.id, opt.id, { text })}
                                                                    onRemove={() => removeOption(selectedBank, q.id, opt.id)}
                                                                />
                                                            ))}
                                                        </SortableContext>
                                                    </DndContext>
                                                    {qType === 'multiple_choice' && (
                                                        <Button variant="ghost" size="sm" onClick={() => addOption(selectedBank, q.id)}
                                                            className="text-text-muted hover:text-accent-blue ml-7 mt-2">
                                                            <Plus className="size-3 mr-1" /> Añadir Opción
                                                        </Button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Short answer placeholder */}
                                            {qType === 'short_answer' && (
                                                <div className="pl-14">
                                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-surface border border-border/30 text-text-muted text-sm">
                                                        <AlignLeft className="size-4 shrink-0" />
                                                        <span>El alumno escribirá su respuesta en texto libre. Requiere corrección manual.</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Explanation */}
                                            <div className="pl-14">
                                                <Input
                                                    value={q.explanation ?? ""}
                                                    onChange={(e) => updateQuestion(selectedBank, q.id, { explanation: e.target.value || undefined })}
                                                    placeholder="Explicación (opcional) — se muestra al alumno tras enviar"
                                                    className="h-8 bg-surface/50 border-border/30 text-xs text-text-muted placeholder:text-text-muted/50"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}
