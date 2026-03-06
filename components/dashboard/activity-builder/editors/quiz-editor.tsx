"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, QuizContent, QuizMode, QuizQuestion } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Circle, HardDrive, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";
import { toFormEmbedUrl, GOOGLE_MIME } from "@/lib/google-drive-urls";

interface QuizEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
}

export function QuizEditor({ step, onUpdate }: QuizEditorProps) {
    const defaultContent = (step.content as QuizContent) || { questions: [], passingScore: 80 };
    const [content, setContent] = useState<QuizContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { openPicker, isLoading: isDriveLoading } = useGoogleDrivePicker();

    useEffect(() => {
        const newContent = (step.content as QuizContent) || { questions: [], passingScore: 80 };
        setContent(newContent);
    }, [step.id, step.content]);

    const saveToServer = (newContent: QuizContent) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSaving(true);
        timeoutRef.current = setTimeout(async () => {
            const res = await updateStepContent(step.id, newContent);
            if (res.error) toast.error("Error al guardar el cuestionario");
            setIsSaving(false);
        }, 1200);
    };

    const handleUpdate = (newContent: QuizContent) => {
        setContent(newContent);
        onUpdate({ ...step, content: newContent });
        saveToServer(newContent);
    };

    const addQuestion = () => {
        const newQuestion: QuizQuestion = {
            id: crypto.randomUUID(),
            text: "",
            options: [
                { id: crypto.randomUUID(), text: "", isCorrect: true },
                { id: crypto.randomUUID(), text: "", isCorrect: false }
            ]
        };
        handleUpdate({ questions: [...content.questions, newQuestion] });
    };

    const updateQuestionText = (qId: string, text: string) => {
        const questions = content.questions.map(q => q.id === qId ? { ...q, text } : q);
        handleUpdate({ questions });
    };

    const removeQuestion = (qId: string) => {
        const questions = content.questions.filter(q => q.id !== qId);
        handleUpdate({ questions });
    };

    const addOption = (qId: string) => {
        const questions = content.questions.map(q => {
            if (q.id === qId) {
                return {
                    ...q,
                    options: [...q.options, { id: crypto.randomUUID(), text: "", isCorrect: false }]
                };
            }
            return q;
        });
        handleUpdate({ questions });
    };

    const updateOption = (qId: string, optId: string, updates: Partial<{ text: string, isCorrect: boolean }>) => {
        const questions = content.questions.map(q => {
            if (q.id === qId) {
                // Si cambiamos isCorrect a true y queremos un sistema single-choice (opcional)
                // podemos setear el resto a false. Aquí mantendremos multi-choice soportado.
                const newOptions = q.options.map(opt => opt.id === optId ? { ...opt, ...updates } : opt);
                return { ...q, options: newOptions };
            }
            return q;
        });
        handleUpdate({ questions });
    };

    const removeOption = (qId: string, optId: string) => {
        const questions = content.questions.map(q => {
            if (q.id === qId) {
                return { ...q, options: q.options.filter(opt => opt.id !== optId) };
            }
            return q;
        });
        handleUpdate({ questions });
    };

    const handlePickFormFromDrive = async () => {
        try {
            const files = await openPicker({
                mimeTypes: [GOOGLE_MIME.FORM],
                multiSelect: false,
                title: "Seleccionar Google Form",
            });
            if (files.length > 0) {
                handleUpdate({ ...content, googleFormUrl: toFormEmbedUrl(files[0]) });
            }
        } catch {
            toast.error("Error al abrir Google Drive");
        }
    };

    return (
        <div className="flex flex-col h-full w-full p-8 overflow-y-auto max-w-4xl mx-auto space-y-8 pb-32">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-foreground">Constructor de Cuestionario</h3>
                    <p className="text-sm text-text-muted mt-1">
                        Añade preguntas y opciones para evaluar al alumno.
                    </p>
                </div>
                {isSaving ? (
                    <span className="text-xs text-accent-blue animate-pulse">Guardando...</span>
                ) : (
                    <span className="text-xs text-text-muted/50">Guardado automáticamente</span>
                )}
            </div>

            {(() => {
                const effectiveMode: QuizMode = content.quizMode ?? (content.googleFormUrl ? 'google_form' : 'builtin');
                return (
                    <div className="flex gap-4 p-1 bg-surface-dark rounded-lg w-fit border border-border/50">
                        <Button
                            variant={effectiveMode === 'builtin' ? "secondary" : "ghost"}
                            size="sm"
                            className="text-xs h-7 px-4"
                            onClick={() => handleUpdate({ ...content, quizMode: 'builtin' })}
                        >
                            Built-in
                        </Button>
                        <Button
                            variant={effectiveMode === 'google_form' ? "secondary" : "ghost"}
                            size="sm"
                            className="text-xs h-7 px-4"
                            onClick={() => handleUpdate({ ...content, quizMode: 'google_form' })}
                        >
                            Google Form
                        </Button>
                    </div>
                );
            })()}

            {(() => {
                const effectiveMode: QuizMode = content.quizMode ?? (content.googleFormUrl ? 'google_form' : 'builtin');
                return (
            <div className="space-y-6">
                {effectiveMode === 'google_form' ? (
                    <div className="p-8 bg-surface-dark border border-white/5 rounded-xl space-y-4">
                        <label className="text-sm font-semibold text-foreground">Google Form Link</label>
                        <div className="flex gap-2">
                            <Input
                                value={content.googleFormUrl ?? ""}
                                onChange={(e) => handleUpdate({ ...content, googleFormUrl: e.target.value })}
                                placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true"
                                className="bg-surface border-border flex-1"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePickFormFromDrive}
                                disabled={isDriveLoading}
                                className="h-9 border-border/50 hover:bg-surface-dark shrink-0"
                            >
                                <HardDrive className="size-4 mr-2 text-accent-blue" />
                                {isDriveLoading ? "..." : "Drive"}
                            </Button>
                            {content.googleFormUrl?.startsWith("http") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="h-9 px-2 text-text-muted hover:text-foreground shrink-0"
                                    title="Abrir formulario en nueva pestaña"
                                >
                                    <a href={content.googleFormUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="size-4" />
                                    </a>
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-text-muted italic">
                            Asegúrate de que el enlace termine en /viewform o tenga embedded=true para que se vea correctamente en el visor del alumno.
                        </p>
                        {content.googleFormUrl?.includes("http") && (
                            <div className="aspect-video w-full border border-border/50 rounded-lg overflow-hidden bg-background mt-4">
                                <iframe src={content.googleFormUrl} className="size-full" />
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {content.questions.length === 0 ? (
                            <div className="text-center p-12 border border-dashed border-border/50 rounded-xl bg-surface/20">
                                <p className="text-text-muted mb-4">No hay preguntas creadas.</p>
                                <Button onClick={addQuestion} variant="outline" className="text-accent-blue border-accent-blue/30 hover:bg-accent-blue/10">
                                    <Plus className="size-4 mr-2" /> Añadir la primera pregunta
                                </Button>
                            </div>
                        ) : (
                            content.questions.map((q, idx) => (
                                <div key={q.id} className="p-6 bg-surface-dark border border-white/5 rounded-xl space-y-4 shadow-sm relative group">
                                    <div className="flex items-start gap-4">
                                        <span className="bg-surface text-text-muted font-bold px-3 py-1 rounded-md text-sm mt-1 shrink-0">
                                            Q{idx + 1}
                                        </span>
                                        <Input
                                            value={q.text}
                                            onChange={(e) => updateQuestionText(q.id, e.target.value)}
                                            placeholder="Escribe la pregunta aquí..."
                                            className="flex-1 bg-surface border-border flex text-sm font-medium"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeQuestion(q.id)}
                                            className="text-text-muted hover:text-red-400 hover:bg-red-400/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>

                                    <div className="pl-14 space-y-2">
                                        {q.options.map((opt, oIdx) => (
                                            <div key={opt.id} className="flex items-center gap-3">
                                                <button
                                                    onClick={() => updateOption(q.id, opt.id, { isCorrect: !opt.isCorrect })}
                                                    className="focus:outline-none transition-colors shrink-0"
                                                    title={opt.isCorrect ? "Marcar como incorrecta" : "Marcar como correcta"}
                                                >
                                                    {opt.isCorrect ? (
                                                        <CheckCircle2 className="size-5 text-green-500" />
                                                    ) : (
                                                        <Circle className="size-5 text-text-muted/40 hover:text-text-muted" />
                                                    )}
                                                </button>
                                                <Input
                                                    value={opt.text}
                                                    onChange={(e) => updateOption(q.id, opt.id, { text: e.target.value })}
                                                    placeholder={`Opción ${oIdx + 1} `}
                                                    className={cn(
                                                        "h-9 bg-background/50 border-border/50 text-sm",
                                                        opt.isCorrect ? "border-green-500/30" : ""
                                                    )}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeOption(q.id, opt.id)}
                                                    className="size-8 text-text-muted hover:text-red-400 shrink-0"
                                                    disabled={q.options.length <= 2}
                                                    title="Eliminar opción"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        ))}

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => addOption(q.id)}
                                            className="text-text-muted hover:text-accent-blue ml-7 mt-2"
                                        >
                                            <Plus className="size-3 mr-1" /> Añadir Opción
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                        {content.questions.length > 0 && (
                            <div className="flex justify-center pt-4">
                                <Button onClick={addQuestion} className="bg-surface hover:bg-surface-dark text-foreground border border-border/50">
                                    <Plus className="size-4 mr-2" /> Nueva Pregunta
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
                );
            })()}
        </div>
    );
}
