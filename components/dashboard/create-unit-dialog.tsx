"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { createUnit } from "@/app/dashboard/modules/[id]/actions";
import { useFormStatus } from "react-dom";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground">
            {pending ? "CREANDO..." : "CREAR UNIDAD"}
        </Button>
    );
}

interface CreateUnitDialogProps {
    moduleId: string;
}

export function CreateUnitDialog({ moduleId }: CreateUnitDialogProps) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        const result = await createUnit(null, formData);
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
                    AÑADIR UNIDAD DIDÁCTICA
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-surface-dark border-border-subtle text-foreground">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">Nueva Unidad Didáctica</DialogTitle>
                    <DialogDescription className="text-text-muted text-xs font-medium">
                        Añade una nueva unidad didáctica a este módulo.
                    </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit} className="grid gap-6 py-4">
                    <input type="hidden" name="module_id" value={moduleId} />
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-[10px] font-mono uppercase font-bold tracking-widest">
                            {error}
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest">
                            Nombre de la Unidad
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="ej. U.D.1 Introducción a Redes"
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
                            placeholder="Conceptos básicos de topología de red..."
                            className="bg-background border-border-subtle focus-visible:ring-accent-blue"
                        />
                    </div>
                    <DialogFooter>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
