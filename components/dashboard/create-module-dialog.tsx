"use client";

import { useState } from "react";
import { Plus, BookOpen, Brain, Code, Network, Database, Terminal } from "lucide-react";
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
import { createModule } from "@/app/dashboard/actions";
import { useFormStatus } from "react-dom";

const ICONS = [
    { value: "BookOpen", label: "Libro", icon: BookOpen },
    { value: "Brain", label: "Cerebro", icon: Brain },
    { value: "Code", label: "Código", icon: Code },
    { value: "Network", label: "Red", icon: Network },
    { value: "Database", label: "Base de Datos", icon: Database },
    { value: "Terminal", label: "Consola", icon: Terminal },
];

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground">
            {pending ? "CREANDO..." : "CREAR MÓDULO"}
        </Button>
    );
}

export function CreateModuleDialog() {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        const result = await createModule(null, formData);
        if (result?.error) {
            setError(result.error);
        } else {
            setOpen(false);
            setError(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-9 px-4">
                    <Plus className="mr-2 size-4" />
                    CREAR NUEVO MÓDULO
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-surface-dark border-border-subtle text-foreground">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">Crear Módulo</DialogTitle>
                    <DialogDescription className="text-text-muted text-xs font-medium">
                        Desplegar una nueva unidad educativa en el sistema.
                    </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit} className="grid gap-6 py-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-[10px] font-mono uppercase font-bold tracking-widest">
                            {error}
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest">
                            Nombre del Módulo
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="ej. Ciberseguridad Avanzada"
                            className="bg-background border-border-subtle focus-visible:ring-accent-blue"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description" className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest">
                            Descripción
                        </Label>
                        <Input
                            id="description"
                            name="description"
                            placeholder="Principios básicos y vectores de ataque..."
                            className="bg-background border-border-subtle focus-visible:ring-accent-blue"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="icon" className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest">
                            ID Visual (Icono)
                        </Label>
                        <Select name="icon" defaultValue="BookOpen">
                            <SelectTrigger className="bg-background border-border-subtle focus:ring-accent-blue text-xs">
                                <SelectValue placeholder="Seleccione un icono" />
                            </SelectTrigger>
                            <SelectContent className="bg-surface border-border-subtle">
                                {ICONS.map((item) => (
                                    <SelectItem key={item.value} value={item.value} className="text-xs hover:bg-accent-blue/10 focus:bg-accent-blue/10 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <item.icon className="size-4 text-accent-blue" />
                                            <span>{item.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
