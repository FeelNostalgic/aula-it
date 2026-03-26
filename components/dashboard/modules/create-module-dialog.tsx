"use client";

import { useState, useMemo } from "react";
import { Plus, BookOpen, Brain, Code, Network, Database, Terminal, Globe, Cpu, Shield, Smartphone, Monitor, Cloud, HardDrive, Trash2, LayoutGrid, Image as ImageIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { createModule } from "@/app/dashboard/actions";
import { toast } from "sonner";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

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

interface CreateModuleDialogProps {
    children?: React.ReactNode;
}

export function CreateModuleDialog({ children }: CreateModuleDialogProps = {}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIcon, setSelectedIcon] = useState("BookOpen");
    const [customIconUrl, setCustomIconUrl] = useState<string | null>(null);
    const { openPicker, isLoading: isPickerLoading } = useGoogleDrivePicker();

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

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

    const resetForm = () => {
        setName("");
        setDescription("");
        setSelectedIcon("BookOpen");
        setCustomIconUrl(null);
        setOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return toast.error("El nombre del módulo es obligatorio");
        
        setIsLoading(true);
        const formData = new FormData();
        formData.append("name", name);
        formData.append("description", description);
        formData.append("icon", selectedIcon);
        if (customIconUrl) {
            formData.append("custom_icon_url", customIconUrl);
        }

        const result = await createModule(null, formData);
        setIsLoading(false);

        if (result?.error) {
            toast.error(`Error al crear el módulo: ${result.error}`);
        } else {
            toast.success(`Módulo "${name}" creado correctamente`);
            resetForm();
            router.refresh();
        }
    }

    const SelectedIconComponent = useMemo(() => {
        const found = ICONS.find(i => i.value === selectedIcon);
        return found ? found.icon : BookOpen;
    }, [selectedIcon]);

    return (
        <Dialog 
            open={open} 
            onOpenChange={(val) => {
                if (!val) resetForm();
                else setOpen(true);
            }}
            modal={false}
        >
            <DialogTrigger asChild>
                {children ?? (
                    <Button className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-9 px-4 uppercase">
                        <Plus className="mr-2 size-4" />
                        CREAR NUEVO MÓDULO
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent 
                className="max-w-3xl bg-surface border-border-strong p-0 overflow-hidden"
                onPointerDownOutside={(e) => {
                    if (isPickerLoading) e.preventDefault();
                }}
                onEscapeKeyDown={(e) => {
                    if (isPickerLoading) e.preventDefault();
                }}
            >
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle>Nuevo Módulo</DialogTitle>
                    <DialogDescription>Configura los detalles del nuevo módulo de aprendizaje.</DialogDescription>
                </DialogHeader>

                <div className="p-6">
                    <form id="create-module-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-[140px_1fr] gap-8">
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
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest">
                                        Nombre del Módulo
                                    </Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="ej. Ciberseguridad Avanzada"
                                        className="bg-surface-dark border-border/50 focus-visible:ring-accent-blue h-11"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest">
                                        Descripción
                                    </Label>
                                    <Textarea
                                        id="description"
                                        name="description"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Describe los objetivos y contenidos del módulo..."
                                        className="bg-surface-dark border-border/50 focus-visible:ring-accent-blue min-h-[120px] resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <DialogFooter className="p-6 bg-surface-dark/50 border-t border-border/50">
                    <Button variant="ghost" onClick={resetForm} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button 
                        type="submit"
                        form="create-module-form"
                        disabled={isLoading || !name}
                        className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-11 px-8 uppercase"
                    >
                        {isLoading ? "CREANDO..." : "CREAR MÓDULO"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
