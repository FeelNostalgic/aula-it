"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
}
    from "@/components/ui/select";
import {
    Loader2,
    Plus,
    PenTool,
    Code,
    FileText,
    CheckSquare,
    HelpCircle,
    Gamepad2,
    Clock,
    Zap
} from "lucide-react";
import { createActivity } from "@/app/dashboard/units/[id]/actions";
import { toast } from "sonner";

interface CreateActivityDialogProps {
    unitId: string;
    trigger?: React.ReactNode;
}

export const activityTypes = [
    { value: "theory", label: "Teoría", icon: FileText, color: "text-accent-blue" },
    { value: "quiz", label: "Cuestionario", icon: CheckSquare, color: "text-accent-orange" },
    { value: "code", label: "Reto de Código", icon: Code, color: "text-accent-green" },
    { value: "project", label: "Proyecto", icon: PenTool, color: "text-purple-400" },
    { value: "game", label: "Juego Interactivo", icon: Gamepad2, color: "text-pink-400" },
    { value: "other", label: "Otro", icon: HelpCircle, color: "text-text-muted" },
];

export function CreateActivityDialog({ unitId, trigger }: CreateActivityDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedType, setSelectedType] = useState<string>("theory");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        // Add unit_id manually as it's not a visible input
        formData.append("unit_id", unitId);

        const result = await createActivity(formData);

        setLoading(false);

        if (result?.error) {
            toast.error(`Error al crear el reto: ${result.error}`);
        } else {
            toast.success("¡Reto creado con éxito!");
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="bg-accent-blue hover:bg-accent-blue/90 text-surface-dark font-bold gap-2">
                        <Plus className="size-4" />
                        Añadir Reto
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-surface-dark border-border-strong text-foreground sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Crear Nuevo Reto</DialogTitle>
                        <DialogDescription className="text-text-muted">
                            Añade una nueva actividad a la unidad didáctica.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-6 border-y border-border-subtle my-2">
                        <div className="grid gap-2">
                            <Label htmlFor="type" className="text-foreground">Tipo de Actividad</Label>
                            <Select
                                name="type"
                                value={selectedType}
                                onValueChange={setSelectedType}
                            >
                                <SelectTrigger className="bg-surface border-border-strong text-foreground focus:ring-accent-blue h-12">
                                    <SelectValue placeholder="Selecciona un tipo" />
                                </SelectTrigger>
                                <SelectContent className="bg-surface border-border-strong text-foreground">
                                    {activityTypes.map((type) => {
                                        const Icon = type.icon;
                                        return (
                                            <SelectItem
                                                key={type.value}
                                                value={type.value}
                                                className="focus:bg-surface-dark focus:text-accent-blue"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-md bg-surface-dark border border-border-subtle ${type.color}`}>
                                                        <Icon className="size-4" />
                                                    </div>
                                                    <span className="font-medium">{type.label}</span>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="title" className="text-foreground">Título del Reto</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="Ej: Variables y Tipos de Datos"
                                className="bg-surface border-border-strong text-foreground focus-visible:ring-accent-blue"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description" className="text-foreground">Descripción (opcional)</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Instrucciones breves para el alumno..."
                                className="bg-surface border-border-strong text-foreground focus-visible:ring-accent-blue min-h-[100px]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="difficulty" className="text-foreground">Dificultad</Label>
                                <Select name="difficulty" defaultValue="Bajo">
                                    <SelectTrigger className="bg-surface border-border-strong text-foreground focus:ring-accent-blue h-10 text-xs">
                                        <SelectValue placeholder="Dificultad" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-surface border-border-strong text-foreground">
                                        <SelectItem value="Bajo">
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

                            <div className="grid gap-2">
                                <Label htmlFor="duration" className="text-foreground">Duración (Ej: 15 min)</Label>
                                <div className="relative">
                                    <Input
                                        id="duration"
                                        name="duration"
                                        placeholder="15 min"
                                        className="bg-surface border-border-strong text-foreground focus-visible:ring-accent-blue h-10 text-xs pl-8"
                                    />
                                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
                                </div>
                            </div>
                        </div>

                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="border-border-strong text-foreground hover:bg-surface"
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-accent-blue hover:bg-accent-blue/90 text-surface-dark font-bold"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                "Crear Reto"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
