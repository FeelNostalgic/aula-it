"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Settings, Zap, HardDrive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateActivitySettings } from "@/app/activities/[id]/edit/actions";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";

interface ActivitySettingsPanelProps {
    activity: any;
    onUpdate: (updatedActivity: any) => void;
}

export function ActivitySettingsPanel({ activity, onUpdate }: ActivitySettingsPanelProps) {
    const [title, setTitle] = useState(activity.title || "");
    const [description, setDescription] = useState(activity.description || "");
    const [duration, setDuration] = useState(activity.duration || 30);
    const [difficulty, setDifficulty] = useState(activity.difficulty || "Medio");
    const [logoUrl, setLogoUrl] = useState(activity.logo_url || "");
    const [isSaving, setIsSaving] = useState(false);
    const { openPicker, isLoading: isDriveLoading } = useGoogleDrivePicker();

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
        triggerSave({ title: val, description, duration, difficulty, logo_url: logoUrl });
        // Optimistic update for the breadcrumb/header
        onUpdate({ ...activity, title: val });
    };

    const handleLogoChange = (val: string) => {
        setLogoUrl(val);
        triggerSave({ title, description, duration, difficulty, logo_url: val });
        onUpdate({ ...activity, logo_url: val });
    };

    const handleDifficultyChange = (val: string) => {
        setDifficulty(val);
        triggerSave({ title, description, duration, difficulty: val, logo_url: logoUrl });
    };

    const handleDescriptionChange = (val: string) => {
        setDescription(val);
        triggerSave({ title, description: val, duration, difficulty, logo_url: logoUrl });
    };

    const handleDurationChange = (val: number) => {
        setDuration(val);
        triggerSave({ title, description, duration: val, difficulty, logo_url: logoUrl });
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

                <div className="grid grid-cols-[120px_1fr] gap-8 items-start">
                    <div 
                        className="aspect-square rounded-2xl bg-surface-dark border border-border/50 flex items-center justify-center overflow-hidden relative group"
                        data-testid="activity-logo-container"
                    >
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="size-full object-contain p-4" data-testid="activity-logo-image" />
                        ) : (
                            <Settings className="size-10 text-text-muted/20" />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-8 text-white hover:bg-white/20"
                                data-testid="open-drive-picker"
                                onClick={async () => {
                                    try {
                                        const files = await openPicker();
                                        if (files && files.length > 0) {
                                            handleLogoChange(files[0].url);
                                        }
                                    } catch (error) {
                                        toast.error("Error al abrir Google Drive");
                                    }
                                }}
                                disabled={isDriveLoading}
                            >
                                <HardDrive className={cn("size-4", isDriveLoading && "animate-pulse")} />
                            </Button>
                            {logoUrl && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-8 text-white hover:bg-white/20"
                                    data-testid="remove-logo"
                                    onClick={() => handleLogoChange("")}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-4 flex-1">
                        <div className="space-y-2">
                            <label htmlFor="activity-title" className="text-sm font-semibold text-text-muted">Nombre de la Actividad</label>
                                <Input
                                    id="activity-title"
                                    value={title}
                                    onChange={(e) => handleTitleChange(e.target.value)}
                                    placeholder="Ej: Misión 1: Introducción a Next.js"
                                    className="bg-surface border-border/50 focus:border-accent-blue/50"
                                />
                            </div>
                        </div>
                    </div>
    
                    <div className="space-y-2">
                        <label htmlFor="activity-description" className="text-sm font-semibold text-foreground">Descripción para el Alumno</label>
                        <Textarea
                            id="activity-description"
                            value={description}
                            onChange={(e) => handleDescriptionChange(e.target.value)}
                            placeholder="Describe brevemente qué aprenderá y hará el alumno..."
                            className="bg-surface border-border/50 resize-none h-32"
                        />
                    </div>
    
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="activity-duration" className="text-sm font-semibold text-foreground">Duración Estimada (min)</label>
                            <Input
                                id="activity-duration"
                                type="number"
                                value={duration}
                                onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0)}
                                className="bg-surface border-border/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="activity-difficulty" className="text-sm font-semibold text-foreground">Nivel de Dificultad</label>
                            <Select value={difficulty} onValueChange={handleDifficultyChange}>
                                <SelectTrigger id="activity-difficulty" className="bg-surface border-border/50">
                                    <SelectValue placeholder="Selecciona..." />
                                </SelectTrigger>
                                <SelectContent className="bg-surface-dark border-border-strong">
                                    <SelectItem value="Fácil">
                                        <div className="flex items-center gap-2 text-accent-green">
                                            <Zap className="size-3" /> Fácil
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="Medio">
                                        <div className="flex items-center gap-2 text-accent-amber">
                                            <Zap className="size-3" /> Medio
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="Difícil">
                                        <div className="flex items-center gap-2 text-accent-orange">
                                            <Zap className="size-3" /> Difícil
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="Experto">
                                        <div className="flex items-center gap-2 text-red-700">
                                            <Zap className="size-3" /> Experto
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
    
                </div>
            </div>
        );
    }
