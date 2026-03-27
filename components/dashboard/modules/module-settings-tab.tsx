"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Loader2,
    AlertTriangle,
    Trash2,
    CheckCircle2,
    Clock,
    PlayCircle,
    Archive,
    HardDrive,
    Palette
} from "lucide-react";
import { updateModuleSettings, deleteModule, archiveModule } from "@/app/dashboard/modules/[id]/actions";
import { toast } from "sonner";
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getModuleRoleLabel, getRestrictedActionMessage, type ModuleCollaboratorRole, type ModulePermissions } from "@/lib/module-collaborator-defs";
import {
    getModuleIconColorOption,
    getModuleIconOption,
    getModuleIconVisualProps,
    MODULE_ICON_COLORS,
    MODULE_ICON_OPTIONS,
} from "@/components/dashboard/modules/module-identity";

type Module = {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    icon_style?: string | null;
    custom_icon_url?: string | null;
    status?: "active" | "completed" | "draft" | "archived" | null;
};

interface ModuleSettingsTabProps {
    module: Module;
    moduleRole: ModuleCollaboratorRole | null;
    modulePermissions: ModulePermissions | null;
}

export function ModuleSettingsTab({ module, moduleRole, modulePermissions }: ModuleSettingsTabProps) {
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [selectedIcon, setSelectedIcon] = useState(module.icon);
    const [selectedColor, setSelectedColor] = useState(module.icon_style || "default");
    const [customIconUrl, setCustomIconUrl] = useState<string | null>(module.custom_icon_url || null);
    const { openPicker, isLoading: isPickerLoading } = useGoogleDrivePicker();
    const router = useRouter();
    const canManageSettings = modulePermissions?.canManageModuleSettings ?? true;
    const canManageSensitiveSettings = modulePermissions?.canManageSensitiveSettings ?? true;
    const canArchiveModulePermission = modulePermissions?.canArchiveModule ?? true;
    const canDeleteModulePermission = modulePermissions?.canDeleteModule ?? true;
    const roleLabel = moduleRole ? getModuleRoleLabel(moduleRole) : null;

    // Sync local state with prop when it changes from the server
    useEffect(() => {
        setSelectedIcon(module.icon);
        setSelectedColor(module.icon_style || "default");
        setCustomIconUrl(module.custom_icon_url || null);
    }, [module.icon, module.icon_style, module.custom_icon_url]);

    const handlePickIcon = async () => {
        if (!canManageSettings) return;
        try {
            const files = await openPicker({
                mimeTypes: ["image/*"],
                multiSelect: false,
                title: "Seleccionar Icono para el Módulo"
            });
            if (files && files.length > 0) {
                setCustomIconUrl(files[0].url);
            }
        } catch (error) {
            console.error("Picker error:", error);
            toast.error("Error al abrir el selector de Google Drive");
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!canManageSettings) return;
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        formData.append("icon", selectedIcon);
        formData.append("icon_style", selectedColor);
        if (customIconUrl) {
            formData.append("custom_icon_url", customIconUrl);
        } else {
            formData.append("custom_icon_url", "");
        }

        const result = await updateModuleSettings(module.id, formData);
        setLoading(false);

        if (result?.error) {
            toast.error(`Error al guardar: ${result.error}`);
        } else {
            toast.success("Ajustes del módulo actualizados");
        }
    };

    const handleArchive = async () => {
        if (!canArchiveModulePermission) return;
        setArchiveLoading(true);
        const result = await archiveModule(module.id);
        setArchiveLoading(false);

        if (result?.error) {
            toast.error(`Error al archivar: ${result.error}`);
            setIsArchiveDialogOpen(false);
        } else {
            toast.success("Módulo archivado correctamente");
            router.push("/dashboard");
        }
    };

    const handleDelete = async () => {
        if (!canDeleteModulePermission) return;
        setDeleteLoading(true);
        const result = await deleteModule(module.id);
        setDeleteLoading(false);

        if (result?.error) {
            toast.error(`Error al eliminar: ${result.error}`);
            setIsDeleteDialogOpen(false);
        } else {
            toast.success("Módulo eliminado permanentemente");
            router.push("/dashboard");
        }
    };

    const SelectedIconComponent = getModuleIconOption(selectedIcon).icon;
    const selectedColorVisual = getModuleIconVisualProps(selectedColor);
    const selectedColorOption = getModuleIconColorOption(selectedColor);

    return (
        <div className="space-y-8 max-w-4xl">
            {!canManageSettings && roleLabel && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-100/90">
                    Tienes acceso como <span className="font-bold text-amber-200">{roleLabel}</span>. Puedes revisar la configuración,
                    pero no modificarla desde este módulo.
                </div>
            )}
            {/* General Information */}
            <div className="bg-surface border border-border-strong rounded-2xl p-6 md:p-8">
                <div className="mb-8 border-b border-border-subtle pb-6">
                    <h2 className="text-xl font-bold text-foreground">Información general</h2>
                    <p className="text-sm text-text-muted mt-1">
                        Actualiza los detalles básicos y el estado de este módulo.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 gap-8 items-start md:grid-cols-[180px_1fr]">
                        {/* Icon Section */}
                        <div className="order-2 space-y-4 max-w-[180px]">
                            <Label className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest text-center block">
                                Identidad Visual
                            </Label>
                            <div className="aspect-square w-full rounded-2xl bg-surface-dark border border-border/50 flex items-center justify-center overflow-hidden relative group shadow-inner">
                                {customIconUrl ? (
                                    <img src={customIconUrl} alt="Icono" className="size-full object-contain p-4" />
                                ) : (
                                    <SelectedIconComponent className={cn("size-16", selectedColorVisual.className)} style={selectedColorVisual.style} />
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-sm">
                                    <Button 
                                        type="button"
                                        size="icon" 
                                        variant="ghost" 
                                        className="size-9 text-white hover:bg-white/20 rounded-full transition-transform transform scale-90 group-hover:scale-100"
                                         onClick={handlePickIcon}
                                         disabled={isPickerLoading || !canManageSettings}
                                        title="Elegir de Google Drive"
                                    >
                                        <HardDrive className="size-5" />
                                    </Button>
                                    
                                    {(customIconUrl || selectedIcon !== "BookOpen") && (
                                        <Button 
                                            type="button"
                                            size="icon" 
                                            variant="ghost" 
                                            className="size-9 text-white hover:bg-red-500/40 rounded-full transition-transform transform scale-90 group-hover:scale-100"
                                             onClick={() => {
                                                 setCustomIconUrl(null);
                                                 setSelectedIcon("BookOpen");
                                                 setSelectedColor("default");
                                             }}
                                             disabled={!canManageSettings}
                                             title="Resetear icono"
                                        >
                                            <Trash2 className="size-5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <p className="text-[9px] text-center text-text-muted leading-tight font-medium px-2">
                                Icono estándar o personalizado desde Google Drive.
                            </p>
                        </div>

                            <div className="order-3 space-y-3 rounded-xl border border-border/50 bg-surface/70 p-4">
                                <div className="flex items-center gap-2">
                                    <Palette className="size-4 text-accent-blue" />
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">Color del icono</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {MODULE_ICON_COLORS.map((color) => {
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
                                                onClick={() => setSelectedColor(color.value)}
                                                aria-label={`Seleccionar color ${color.label}`}
                                                title={color.label}
                                                disabled={!canManageSettings}
                                            >
                                                {isSelected ? <CheckCircle2 className="size-4 text-slate-950" /> : null}
                                            </button>
                                        );
                                    })}
                                    <label
                                        className={cn(
                                            "relative flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[conic-gradient(from_180deg_at_50%_50%,#38bdf8_0deg,#34d399_72deg,#fbbf24_144deg,#f472b6_216deg,#a78bfa_288deg,#38bdf8_360deg)] transition-transform hover:scale-105",
                                            selectedColorOption.isCustom && "ring-2 ring-white/70 ring-offset-2 ring-offset-surface-dark",
                                            !canManageSettings && "cursor-not-allowed opacity-50"
                                        )}
                                        title="Color personalizado"
                                    >
                                        <input
                                            type="color"
                                            className="absolute inset-0 cursor-pointer opacity-0"
                                            value={selectedColorOption.hex}
                                            onChange={(event) => setSelectedColor(event.target.value)}
                                            aria-label="Seleccionar color personalizado"
                                            disabled={!canManageSettings}
                                        />
                                        <Palette className="size-4 text-slate-950" />
                                    </label>
                                </div>

                                <div className="space-y-3 pt-3 border-t border-border/50">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block">Iconos estándar</span>
                                    <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
                                        {MODULE_ICON_OPTIONS.map((item) => {
                                            const isSelected = selectedIcon === item.value && !customIconUrl;

                                            return (
                                                <button
                                                    key={item.value}
                                                    type="button"
                                                    className={cn(
                                                        "flex h-[3.75rem] w-full items-center justify-center rounded-xl border transition-all",
                                                        isSelected
                                                            ? "border-accent-blue/40 bg-accent-blue/10 ring-1 ring-accent-blue/30"
                                                            : "border-border-subtle bg-surface-dark hover:border-accent-blue/30 hover:bg-accent-blue/5",
                                                        !canManageSettings && "cursor-not-allowed opacity-50"
                                                    )}
                                                    onClick={() => {
                                                        setSelectedIcon(item.value);
                                                        setCustomIconUrl(null);
                                                    }}
                                                    disabled={!canManageSettings}
                                                    aria-label={`Seleccionar icono ${item.label}`}
                                                    title={item.label}
                                                >
                                                    <item.icon
                                                        className={cn(
                                                            "size-6 transition-colors",
                                                            isSelected ? selectedColorVisual.className : "text-text-muted"
                                                        )}
                                                        style={isSelected ? selectedColorVisual.style : undefined}
                                                    />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                        {/* Form Fields */}
                        <div className="order-1 space-y-6 md:col-span-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-foreground text-[10px] font-mono font-bold uppercase tracking-widest">Nombre del módulo</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={module.name}
                                        required
                                        disabled={!canManageSettings}
                                        className="bg-surface-dark border-border-strong text-foreground focus-visible:ring-accent-blue h-11"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="status" className="text-foreground text-[10px] font-mono font-bold uppercase tracking-widest">Estado del Módulo</Label>
                                    <Select key={module.status} name="status" defaultValue={module.status || "draft"} disabled={!canManageSensitiveSettings}>
                                        <SelectTrigger className="bg-surface-dark border-border-strong text-foreground focus:ring-accent-blue h-11">
                                            <SelectValue placeholder="Selecciona un estado" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-surface-dark border-border-strong text-foreground">
                                            <SelectItem value="active" className="focus:bg-accent-blue/10 focus:text-accent-blue">
                                                <div className="flex items-center gap-2">
                                                    <PlayCircle className="size-4 text-accent-green" />
                                                    <span>Activo</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="draft" className="focus:bg-accent-blue/10 focus:text-accent-blue">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="size-4 text-accent-orange" />
                                                    <span>Borrador</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="pending" className="hidden">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="size-4 text-accent-orange" />
                                                    <span>Borrador</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="completed" className="focus:bg-accent-blue/10 focus:text-accent-blue">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="size-4 text-accent-blue" />
                                                    <span>Completado</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="archived" className="focus:bg-accent-blue/10 focus:text-accent-blue">
                                                <div className="flex items-center gap-2">
                                                    <Archive className="size-4 text-text-muted" />
                                                    <span>Archivado</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-foreground text-[10px] font-mono font-bold uppercase tracking-widest">Descripción (opcional)</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                        defaultValue={module.description || ""}
                                        disabled={!canManageSettings}
                                        className="bg-surface-dark border-border-strong text-foreground focus-visible:ring-accent-blue min-h-[120px] resize-none"
                                    />
                                </div>

                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={loading || !canManageSettings} className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-11 px-8 uppercase">
                            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                            GUARDAR CAMBIOS
                        </Button>
                    </div>
                </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-surface-dark/30 border border-accent-orange/20 rounded-2xl p-6 md:p-8">
                <div className="mb-6 border-b border-accent-orange/20 pb-4 flex items-center gap-3">
                    <div className="size-8 rounded-full bg-accent-orange/10 flex items-center justify-center">
                        <AlertTriangle className="size-5 text-accent-orange" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-accent-orange">Zona de peligro</h2>
                        <p className="text-sm text-text-muted mt-1 font-medium">
                            Acciones irreversibles para este módulo. Ten cuidado.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-border-subtle/50">
                    <div>
                        <h3 className="font-bold text-foreground mb-1">Archivar módulo</h3>
                        <p className="text-xs text-text-muted mr-4">El módulo dejará de ser visible para los alumnos matriculados, pero conservarás sus datos.</p>
                    </div>

                    <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
                        <AlertDialogTrigger asChild disabled={!canArchiveModulePermission}>
                            <span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span>
                                                <Button variant="outline" disabled={!canArchiveModulePermission} className="border-border-strong text-foreground hover:bg-surface shrink-0 gap-2 h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider">
                                                    <Archive className="size-4" />
                                                    Archivar módulo
                                                </Button>
                                            </span>
                                        </TooltipTrigger>
                                        {!canArchiveModulePermission && moduleRole && (
                                            <TooltipContent>{getRestrictedActionMessage("canArchiveModule", moduleRole)}</TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                            </span>
                        </AlertDialogTrigger>
                        <AlertDialogContent
                            className="bg-surface border-border-strong text-foreground max-w-md p-6 rounded-[32px]"
                        >
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl font-bold">¿Deseas archivar este módulo?</AlertDialogTitle>
                                <AlertDialogDescription className="text-text-muted pt-2 text-sm leading-relaxed">
                                    Los alumnos dejarán de ver este módulo inmediatamente en su panel principal. Puedes restaurarlo más tarde desde la configuración.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
                                <AlertDialogCancel asChild>
                                    <Button
                                        variant="ghost"
                                        className="text-text-muted hover:text-foreground"
                                    >
                                        Cancelar
                                    </Button>
                                </AlertDialogCancel>
                                <AlertDialogAction asChild>
                                    <Button
                                        onClick={handleArchive}
                                        disabled={archiveLoading}
                                        className="bg-accent-orange hover:bg-accent-orange/90 text-surface-dark font-black uppercase tracking-widest text-[10px] px-6 rounded-xl h-11"
                                    >
                                        {archiveLoading ? "Archivando..." : "Sí, archivar módulo"}
                                    </Button>
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 mt-2">
                    <div>
                        <h3 className="font-bold text-foreground mb-1">Eliminar módulo</h3>
                        <p className="text-xs text-text-muted mr-4">Esta acción eliminará permanentemente el módulo, sus unidades y todas las matriculaciones de alumnos asociados.</p>
                    </div>

                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <AlertDialogTrigger asChild disabled={!canDeleteModulePermission}>
                            <span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span>
                                                <Button variant="outline" disabled={!canDeleteModulePermission} className="border-red-500/30 text-red-500 hover:bg-red-500/10 shrink-0 gap-2 h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider">
                                                    <Trash2 className="size-4" />
                                                    Eliminar módulo
                                                </Button>
                                            </span>
                                        </TooltipTrigger>
                                        {!canDeleteModulePermission && moduleRole && (
                                            <TooltipContent>{getRestrictedActionMessage("canDeleteModule", moduleRole)}</TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                            </span>
                        </AlertDialogTrigger>
                        <AlertDialogContent
                            className="bg-surface border-border-strong text-foreground max-w-md p-6 rounded-[32px]"
                        >
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl font-bold text-red-500">¿Estás completamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription className="text-text-muted pt-2 text-sm leading-relaxed">
                                    Esta acción no se puede deshacer. Se eliminará el módulo <span className="text-foreground font-bold">"{module.name}"</span> y todos sus datos asociados permanentemente de nuestros servidores.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
                                <AlertDialogCancel asChild>
                                    <Button
                                        variant="ghost"
                                        className="text-text-muted hover:text-foreground"
                                    >
                                        Cancelar
                                    </Button>
                                </AlertDialogCancel>
                                <AlertDialogAction asChild>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDelete}
                                        disabled={deleteLoading}
                                        className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] px-6 rounded-xl h-11"
                                    >
                                        {deleteLoading ? "Eliminando..." : "Sí, eliminar módulo"}
                                    </Button>
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </div>
    );
}
