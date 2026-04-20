"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Settings, Zap, HardDrive, Trash2, Palette, Check, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { updateActivitySettings } from "@/app/activities/[id]/edit/actions";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";
import {
    ACTIVITY_IDENTITY_COLORS,
    ACTIVITY_IDENTITY_PRESETS,
    buildActivityPresetLogoUrl,
    getActivityIdentityColor,
    inferActivityIdentityFromLogoUrl,
} from "@/components/dashboard/activities/activity-identity";

interface ActivitySettingsPanelProps {
    activity: any;
    onUpdate: (updatedActivity: any) => void;
}

const DEFAULT_PRESET = "game";
const DEFAULT_COLOR = "violet";

export function ActivitySettingsPanel({ activity, onUpdate }: ActivitySettingsPanelProps) {
    const inferredIdentity = inferActivityIdentityFromLogoUrl(activity.logo_url);
    const [title, setTitle] = useState(activity.title || "");
    const [description, setDescription] = useState(activity.description || "");
    const [duration, setDuration] = useState(activity.duration || 30);
    const [difficulty, setDifficulty] = useState(activity.difficulty || "Bajo");
    const [logoUrl, setLogoUrl] = useState(activity.logo_url || "");
    const [selectedPreset, setSelectedPreset] = useState(inferredIdentity?.preset ?? DEFAULT_PRESET);
    const [selectedColor, setSelectedColor] = useState(inferredIdentity?.color ?? DEFAULT_COLOR);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const { openPicker, isLoading: isDriveLoading } = useGoogleDrivePicker();

    const selectedColorConfig = getActivityIdentityColor(selectedColor);
    const SelectedPresetIcon =
        ACTIVITY_IDENTITY_PRESETS.find((preset) => preset.value === selectedPreset)?.icon ??
        ACTIVITY_IDENTITY_PRESETS[0].icon;
    const isUsingCustomImage = Boolean(logoUrl) && !logoUrl.startsWith("data:image/svg+xml;utf8,");

    useEffect(() => {
        const nextIdentity = inferActivityIdentityFromLogoUrl(activity.logo_url);

        setTitle(activity.title || "");
        setDescription(activity.description || "");
        setDuration(activity.duration || 30);
        setDifficulty(activity.difficulty || "Bajo");
        setLogoUrl(activity.logo_url || "");
        setSelectedPreset(nextIdentity?.preset ?? DEFAULT_PRESET);
        setSelectedColor(nextIdentity?.color ?? DEFAULT_COLOR);
    }, [activity]);

    const currentDraft = useMemo(() => ({
        title,
        description,
        duration,
        difficulty,
        logo_url: logoUrl,
    }), [title, description, duration, difficulty, logoUrl]);

    const persistedDraft = useMemo(() => ({
        title: activity.title || "",
        description: activity.description || "",
        duration: activity.duration || 30,
        difficulty: activity.difficulty || "Bajo",
        logo_url: activity.logo_url || "",
    }), [activity.title, activity.description, activity.duration, activity.difficulty, activity.logo_url]);

    useEffect(() => {
        setIsDirty(JSON.stringify(currentDraft) !== JSON.stringify(persistedDraft));
    }, [currentDraft, persistedDraft]);

    const handleSave = async () => {
        if (!isDirty || isSaving) return;
        setIsSaving(true);
        const res = await updateActivitySettings(activity.id, currentDraft);
        if (res.error) {
            toast.error("Error al guardar la configuración");
            setIsSaving(false);
            return;
        }
        onUpdate({ ...activity, ...currentDraft });
        toast.success("Configuración del reto actualizada");
        setIsSaving(false);
        setIsDirty(false);
    };

    const handleTitleChange = (value: string) => {
        setTitle(value);
    };

    const handleDescriptionChange = (value: string) => {
        setDescription(value);
    };

    const handleDurationChange = (value: number) => {
        setDuration(value);
    };

    const handleDifficultyChange = (value: string) => {
        setDifficulty(value);
    };

    const handleLogoChange = (value: string) => {
        setLogoUrl(value);
    };

    const handleDiscard = () => {
        setTitle(persistedDraft.title);
        setDescription(persistedDraft.description);
        setDuration(persistedDraft.duration);
        setDifficulty(persistedDraft.difficulty);
        setLogoUrl(persistedDraft.logo_url);
        const nextIdentity = inferActivityIdentityFromLogoUrl(persistedDraft.logo_url);
        setSelectedPreset(nextIdentity?.preset ?? DEFAULT_PRESET);
        setSelectedColor(nextIdentity?.color ?? DEFAULT_COLOR);
        setIsDirty(false);
    };

    const handlePresetChange = (presetValue: (typeof ACTIVITY_IDENTITY_PRESETS)[number]["value"]) => {
        const nextLogoUrl = buildActivityPresetLogoUrl(presetValue, selectedColor);
        setSelectedPreset(presetValue);
        handleLogoChange(nextLogoUrl);
    };

    const handleColorChange = (colorValue: string) => {
        const nextLogoUrl = buildActivityPresetLogoUrl(selectedPreset, colorValue);
        setSelectedColor(colorValue);
        handleLogoChange(nextLogoUrl);
    };

    return (
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col space-y-8 overflow-y-auto p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                        <Settings className="size-6 text-accent-blue" />
                        Configuración de la actividad
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                        Establece los parámetros generales y la metainformación de la misión.
                    </p>
                </div>
                {isSaving ? (
                    <span className="text-xs text-accent-blue animate-pulse">Guardando...</span>
                ) : isDirty ? (
                    <span className="text-xs text-accent-amber">Cambios sin guardar</span>
                ) : (
                    <span className="text-xs text-text-muted/50">Todo guardado</span>
                )}
            </div>

            <div className="space-y-6 rounded-xl border border-border/50 bg-surface-dark/50 p-6">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="activity-title" className="text-sm font-semibold text-text-muted">
                                Nombre de la actividad
                            </label>
                            <Input
                                id="activity-title"
                                value={title}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                placeholder="Ej: Misión 1: Introducción a Next.js"
                                className="bg-surface border-border/50 focus:border-accent-blue/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="activity-difficulty" className="text-sm font-semibold text-foreground">
                                Nivel de dificultad
                            </label>
                            <Select value={difficulty} onValueChange={handleDifficultyChange}>
                                <SelectTrigger id="activity-difficulty" className="bg-surface border-border/50">
                                    <SelectValue placeholder="Selecciona..." />
                                </SelectTrigger>
                                <SelectContent className="bg-surface-dark border-border-strong">
                                    <SelectItem value="Bajo">
                                        <div className="flex items-center gap-2 text-accent-green">
                                            <Zap className="size-3" />
                                            Facil
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="Medio">
                                        <div className="flex items-center gap-2 text-accent-amber">
                                            <Zap className="size-3" />
                                            Medio
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="Difícil">
                                        <div className="flex items-center gap-2 text-accent-orange">
                                            <Zap className="size-3" />
                                            Dificil
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="Experto">
                                        <div className="flex items-center gap-2 text-red-700">
                                            <Zap className="size-3" />
                                            Experto
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="activity-description" className="text-sm font-semibold text-foreground">
                            Descripción para el alumno
                        </label>
                        <Textarea
                            id="activity-description"
                            value={description}
                            onChange={(e) => handleDescriptionChange(e.target.value)}
                            placeholder="Describe brevemente qué aprenderá y hará el alumno..."
                            className="h-32 resize-none bg-surface border-border/50"
                        />
                    </div>

                    <div className="max-w-[280px] space-y-2">
                        <label htmlFor="activity-duration" className="text-sm font-semibold text-foreground">
                            Duración estimada (min)
                        </label>
                        <Input
                            id="activity-duration"
                            type="number"
                            value={duration}
                            onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0)}
                            className="bg-surface border-border/50"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[180px_1fr] lg:items-start">
                    <div
                        className="group relative aspect-square w-full max-w-[180px] rounded-2xl border border-border/50 bg-surface-dark"
                        data-testid="activity-logo-container"
                    >
                        <div className="flex size-full items-center justify-center overflow-hidden rounded-2xl">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt="Logo"
                                    className="size-full object-contain p-4"
                                    data-testid="activity-logo-image"
                                />
                            ) : (
                                <SelectedPresetIcon
                                    className={cn("size-16", selectedColorConfig.className)}
                                    style={selectedColorConfig.style}
                                />
                            )}
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-2xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-8 text-white hover:bg-white/20"
                                data-testid="open-drive-picker"
                                onClick={async () => {
                                    try {
                                        const files = await openPicker();
                                        if (files?.[0]) {
                                            handleLogoChange(files[0].url);
                                        }
                                    } catch {
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
                                    onClick={() => {
                                        setSelectedPreset(DEFAULT_PRESET);
                                        setSelectedColor(DEFAULT_COLOR);
                                        handleLogoChange(buildActivityPresetLogoUrl(DEFAULT_PRESET, DEFAULT_COLOR));
                                    }}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-border/50 bg-surface-dark/60 p-5">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="size-4 text-accent-blue" />
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
                                    Identidad visual
                                </span>
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                                {isUsingCustomImage ? "Usando imagen personalizada desde Drive" : "Elige el icono base del reto"}
                            </span>
                        </div>

                        <div className="grid grid-cols-4 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                            {ACTIVITY_IDENTITY_PRESETS.map((preset) => {
                                const isSelected = selectedPreset === preset.value && !isUsingCustomImage;

                                return (
                                    <Button
                                        key={preset.value}
                                        type="button"
                                        variant="ghost"
                                        className={cn(
                                            "relative flex h-[70px] items-center justify-center rounded-xl border transition-all hover:bg-accent-blue/10 hover:text-accent-blue",
                                            isSelected
                                                ? "border-accent-blue/40 bg-accent-blue/15 text-accent-blue shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
                                                : "border-border/50 bg-surface text-text-muted"
                                        )}
                                        onClick={() => handlePresetChange(preset.value)}
                                        title={preset.label}
                                    >
                                        {isSelected ? (
                                            <div className="absolute right-1.5 top-1.5 rounded-full bg-accent-blue/20 p-1 text-accent-blue">
                                                <Check className="size-3" />
                                            </div>
                                        ) : null}

                                            <preset.icon
                                                className={cn(
                                                    "size-10 shrink-0",
                                                    isSelected ? selectedColorConfig.className : "text-text-muted"
                                                )}
                                                style={isSelected ? selectedColorConfig.style : undefined}
                                            />
                                    </Button>
                                );
                            })}
                        </div>

                        <div className="space-y-3 rounded-xl border border-border/50 bg-surface/70 p-4">
                            <div className="flex items-center gap-2">
                                <Palette className="size-4 text-accent-blue" />
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
                                    Color del icono
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {ACTIVITY_IDENTITY_COLORS.map((color) => {
                                    const isSelected = selectedColor === color.value;

                                    return (
                                        <button
                                            key={color.value}
                                            type="button"
                                            className={cn(
                                                "relative flex size-10 items-center justify-center rounded-full border border-white/10 transition-transform hover:scale-105",
                                                color.swatchClassName,
                                                isSelected && "ring-2 ring-offset-2 ring-offset-surface-dark",
                                                isSelected && color.ringClassName
                                            )}
                                            onClick={() => handleColorChange(color.value)}
                                            aria-label={`Seleccionar color ${color.label}`}
                                            title={color.label}
                                        >
                                            {isSelected ? <Check className="size-4 text-slate-950" /> : null}
                                        </button>
                                    );
                                })}

                                <label
                                    className={cn(
                                        "relative flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[conic-gradient(from_180deg_at_50%_50%,#38bdf8_0deg,#34d399_72deg,#fbbf24_144deg,#f472b6_216deg,#a78bfa_288deg,#38bdf8_360deg)] transition-transform hover:scale-105",
                                        selectedColorConfig.isCustom && "ring-2 ring-white/70 ring-offset-2 ring-offset-surface-dark"
                                    )}
                                    title="Color personalizado"
                                >
                                    <input
                                        type="color"
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                        value={selectedColorConfig.hex}
                                        onChange={(event) => handleColorChange(event.target.value)}
                                        aria-label="Seleccionar color personalizado"
                                    />
                                    <Palette className="size-4 text-slate-950" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleDiscard}
                    disabled={!isDirty || isSaving}
                >
                    Descartar cambios
                </Button>
                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className="bg-accent-blue hover:bg-accent-blue/90 text-white"
                >
                    {isSaving ? "Guardando..." : "Guardar cambios"}
                </Button>
            </div>
        </div>
    );
}
