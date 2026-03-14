"use client";

import { useState, useMemo, useEffect } from "react";
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
    LayoutGrid,
    BookOpen,
    Brain,
    Code,
    Network,
    Database,
    Terminal,
    Globe,
    Cpu,
    Shield,
    Smartphone,
    Monitor,
    Cloud,
    Plus
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";
import { cn } from "@/lib/utils";

const ICONS = [
    { value: "BookOpen", label: "Libro", icon: BookOpen },
    { value: "Brain", label: "Cerebro", icon: Brain },
    { value: "Code", label: "Código", icon: Code },
    { value: "Network", label: "Red", icon: Network },
    { value: "Database", label: "Base de Datos", icon: Database },
    { value: "Terminal", label: "Consola", icon: Terminal },
    { value: "Globe", label: "Globo", icon: Globe },
    { value: "Cpu", label: "Procesador", icon: Cpu },
    { value: "Shield", label: "Escudo", icon: Shield },
    { value: "Smartphone", label: "Móvil", icon: Smartphone },
    { value: "Monitor", label: "Monitor", icon: Monitor },
    { value: "Cloud", label: "Nube", icon: Cloud },
];

type Module = {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    custom_icon_url?: string | null;
    status?: "active" | "completed" | "pending" | "archived" | null;
};

export function ModuleSettingsTab({ module }: { module: Module }) {
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [selectedIcon, setSelectedIcon] = useState(module.icon);
    const [customIconUrl, setCustomIconUrl] = useState<string | null>(module.custom_icon_url || null);
    const { openPicker, isLoading: isPickerLoading } = useGoogleDrivePicker();
    const router = useRouter();

    // Sync local state with prop when it changes from the server
    useEffect(() => {
        setSelectedIcon(module.icon);
        setCustomIconUrl(module.custom_icon_url || null);
    }, [module.icon, module.custom_icon_url]);

    const handlePickIcon = async () => {
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
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        formData.append("icon", selectedIcon);
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

    const SelectedIconComponent = useMemo(() => {
        const found = ICONS.find(i => i.value === selectedIcon);
        return found ? found.icon : BookOpen;
    }, [selectedIcon]);

    return (
        <div className="space-y-8 max-w-4xl">
            {/* General Information */}
            <div className="bg-surface border border-border-strong rounded-2xl p-6 md:p-8">
                <div className="mb-8 border-b border-border-subtle pb-6">
                    <h2 className="text-xl font-bold text-foreground">Información General</h2>
                    <p className="text-sm text-text-muted mt-1">
                        Actualiza los detalles básicos y el estado de este módulo.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid md:grid-cols-[160px_1fr] gap-10">
                        {/* Icon Section */}
                        <div className="space-y-4">
                            <Label className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest text-center block">
                                Identidad Visual
                            </Label>
                            <div className="aspect-square rounded-2xl bg-surface-dark border border-border/50 flex items-center justify-center overflow-hidden relative group shadow-inner">
                                {customIconUrl ? (
                                    <img src={customIconUrl} alt="Icono" className="size-full object-contain p-4" />
                                ) : (
                                    <SelectedIconComponent className="size-16 text-accent-blue/40" />
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-sm">
                                    <Button 
                                        type="button"
                                        size="icon" 
                                        variant="ghost" 
                                        className="size-9 text-white hover:bg-white/20 rounded-full transition-transform transform scale-90 group-hover:scale-100"
                                        onClick={handlePickIcon}
                                        disabled={isPickerLoading}
                                        title="Elegir de Google Drive"
                                    >
                                        <HardDrive className="size-5" />
                                    </Button>
                                    
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button 
                                                type="button"
                                                size="icon" 
                                                variant="ghost" 
                                                className="size-9 text-white hover:bg-white/20 rounded-full transition-transform transform scale-90 group-hover:scale-100"
                                                title="Elegir icono estándar"
                                            >
                                                <LayoutGrid className="size-5" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 bg-surface-dark border-border-strong p-3" side="right" align="start">
                                            <div className="grid grid-cols-4 gap-2">
                                                {ICONS.map((item) => (
                                                    <Button
                                                        key={item.value}
                                                        type="button"
                                                        variant="ghost"
                                                        className={cn(
                                                            "size-12 p-0 transition-all hover:bg-accent-blue/10 hover:text-accent-blue",
                                                            selectedIcon === item.value && !customIconUrl ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30" : "text-text-muted"
                                                        )}
                                                        onClick={() => {
                                                            setSelectedIcon(item.value);
                                                            setCustomIconUrl(null);
                                                        }}
                                                        title={item.label}
                                                    >
                                                        <item.icon className="size-6" />
                                                    </Button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    {(customIconUrl || selectedIcon !== "BookOpen") && (
                                        <Button 
                                            type="button"
                                            size="icon" 
                                            variant="ghost" 
                                            className="size-9 text-white hover:bg-red-500/40 rounded-full transition-transform transform scale-90 group-hover:scale-100"
                                            onClick={() => {
                                                setCustomIconUrl(null);
                                                setSelectedIcon("BookOpen");
                                            }}
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

                        {/* Form Fields */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-foreground text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">Nombre del módulo</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={module.name}
                                        required
                                        className="bg-surface-dark border-border-strong text-foreground focus-visible:ring-accent-blue h-11"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="status" className="text-foreground text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">Estado del Módulo</Label>
                                    <Select name="status" defaultValue={module.status || "pending"}>
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
                                            <SelectItem value="pending" className="focus:bg-accent-blue/10 focus:text-accent-blue">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="size-4 text-accent-orange" />
                                                    <span>Pendiente</span>
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
                                <Label htmlFor="description" className="text-foreground text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">Descripción (opcional)</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    defaultValue={module.description || ""}
                                    className="bg-surface-dark border-border-strong text-foreground focus-visible:ring-accent-blue min-h-[120px] resize-none"
                                />
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button type="submit" disabled={loading} className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-bold">
                                    {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                                    GUARDAR CAMBIOS
                                </Button>
                            </div>
                        </div>
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
                        <h2 className="text-xl font-bold text-accent-orange">Zona de Peligro</h2>
                        <p className="text-sm text-text-muted mt-1 font-medium">
                            Acciones irreversibles para este módulo. Ten cuidado.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-border-subtle/50">
                    <div>
                        <h3 className="font-bold text-foreground mb-1">Archivar Módulo</h3>
                        <p className="text-xs text-text-muted mr-4">El módulo dejará de ser visible para los alumnos matriculados, pero conservarás sus datos.</p>
                    </div>

                    <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen} modal={false}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-border-strong text-foreground hover:bg-surface shrink-0 gap-2 h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider">
                                <Archive className="size-4" />
                                Archivar Módulo
                            </Button>
                        </DialogTrigger>
                        <DialogContent 
                            className="bg-surface border-border-strong text-foreground max-w-md p-6 rounded-[32px]"
                            onPointerDownOutside={(e) => {
                                if (isPickerLoading) e.preventDefault();
                            }}
                        >
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">¿Deseas archivar este módulo?</DialogTitle>
                                <DialogDescription className="text-text-muted pt-2 text-sm leading-relaxed">
                                    Los alumnos dejarán de ver este módulo inmediatamente en su panel principal. Puedes restaurarlo más tarde desde la configuración.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="mt-8 gap-3 sm:gap-0">
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsArchiveDialogOpen(false)}
                                    className="text-text-muted hover:text-foreground"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleArchive}
                                    disabled={archiveLoading}
                                    className="bg-accent-orange hover:bg-accent-orange/90 text-surface-dark font-black uppercase tracking-widest text-[10px] px-6 rounded-xl h-11"
                                >
                                    {archiveLoading ? "Archivando..." : "Sí, archivar módulo"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 mt-2">
                    <div>
                        <h3 className="font-bold text-foreground mb-1">Eliminar Módulo</h3>
                        <p className="text-xs text-text-muted mr-4">Esta acción eliminará permanentemente el módulo, sus unidades y todas las matriculaciones de alumnos asociados.</p>
                    </div>

                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} modal={false}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10 shrink-0 gap-2 h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider">
                                <Trash2 className="size-4" />
                                Eliminar Módulo
                            </Button>
                        </DialogTrigger>
                        <DialogContent 
                            className="bg-surface border-border-strong text-foreground max-w-md p-6 rounded-[32px]"
                            onPointerDownOutside={(e) => {
                                if (isPickerLoading) e.preventDefault();
                            }}
                        >
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-red-500">¿Estás completamente seguro?</DialogTitle>
                                <DialogDescription className="text-text-muted pt-2 text-sm leading-relaxed">
                                    Esta acción no se puede deshacer. Se eliminará el módulo <span className="text-foreground font-bold">"{module.name}"</span> y todos sus datos asociados permanentemente de nuestros servidores.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="mt-8 gap-3 sm:gap-0">
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsDeleteDialogOpen(false)}
                                    className="text-text-muted hover:text-foreground"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={deleteLoading}
                                    className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] px-6 rounded-xl h-11"
                                >
                                    {deleteLoading ? "Eliminando..." : "Sí, eliminar módulo"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}
