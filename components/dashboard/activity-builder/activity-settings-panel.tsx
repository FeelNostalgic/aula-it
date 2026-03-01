"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { updateActivitySettings } from "@/app/activities/[id]/edit/actions";

interface ActivitySettingsPanelProps {
    activity: any;
    onUpdate: (updatedActivity: any) => void;
}

export function ActivitySettingsPanel({ activity, onUpdate }: ActivitySettingsPanelProps) {
    const [title, setTitle] = useState(activity.title || "");
    const [description, setDescription] = useState(activity.description || "");
    const [duration, setDuration] = useState(activity.duration || 30);
    const [difficulty, setDifficulty] = useState(activity.difficulty || "Media");
    const [isSaving, setIsSaving] = useState(false);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const triggerSave = (updates: any) => {
        setIsSaving(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(async () => {
            const res = await updateActivitySettings(activity.id, updates);
            if (res.error) {
                toast.error("Error al guardar la configuración");
            } else {
                onUpdate({ ...activity, ...updates });
            }
            setIsSaving(false);
        }, 1000);
    };

    const handleTitleChange = (val: string) => {
        setTitle(val);
        triggerSave({ title: val, description, duration, difficulty });
        // Optimistic update for the breadcrumb/header
        onUpdate({ ...activity, title: val });
    };

    const handleDescriptionChange = (val: string) => {
        setDescription(val);
        triggerSave({ title, description: val, duration, difficulty });
    };

    const handleDurationChange = (val: number) => {
        setDuration(val);
        triggerSave({ title, description, duration: val, difficulty });
    };

    const handleDifficultyChange = (val: string) => {
        setDifficulty(val);
        triggerSave({ title, description, duration, difficulty: val });
    };

    return (
        <div className="flex flex-col h-full w-full p-8 overflow-y-auto max-w-2xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Settings className="size-6 text-accent-blue" />
                        Configuración de la Actividad
                    </h2>
                    <p className="text-sm text-text-muted mt-1">
                        Establece los parámetros generales y la metainformación de la misión.
                    </p>
                </div>
                {isSaving ? (
                    <span className="text-xs text-accent-blue animate-pulse">Guardando...</span>
                ) : (
                    <span className="text-xs text-text-muted/50">Guardado automáticamente</span>
                )}
            </div>

            <div className="space-y-6 bg-surface-dark/50 p-6 rounded-xl border border-border/50">

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Nombre de la Actividad</label>
                    <Input
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Ej: Misión 1: Introducción a Next.js"
                        className="bg-surface border-border/50"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Descripción para el Alumno</label>
                    <Textarea
                        value={description}
                        onChange={(e) => handleDescriptionChange(e.target.value)}
                        placeholder="Describe brevemente qué aprenderá y hará el alumno..."
                        className="bg-surface border-border/50 resize-none h-32"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Duración Estimada (min)</label>
                        <Input
                            type="number"
                            value={duration}
                            onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0)}
                            className="bg-surface border-border/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Nivel de Dificultad</label>
                        <Select value={difficulty} onValueChange={handleDifficultyChange}>
                            <SelectTrigger className="bg-surface border-border/50">
                                <SelectValue placeholder="Selecciona..." />
                            </SelectTrigger>
                            <SelectContent className="bg-surface-dark border-border-strong">
                                <SelectItem value="Fácil">Fácil</SelectItem>
                                <SelectItem value="Media">Media</SelectItem>
                                <SelectItem value="Difícil">Difícil</SelectItem>
                                <SelectItem value="Experto">Experto</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

            </div>
        </div>
    );
}
