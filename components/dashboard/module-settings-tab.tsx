"use client";

import { useState } from "react";
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
    PlayCircle
} from "lucide-react";
import { updateModuleSettings, deleteModule } from "@/app/dashboard/modules/[id]/actions";
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

type Module = {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    status?: "active" | "completed" | "pending" | null;
};

export function ModuleSettingsTab({ module }: { module: Module }) {
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const result = await updateModuleSettings(module.id, formData);
        setLoading(false);

        if (result?.error) {
            alert(result.error);
        }
    };

    const handleDelete = async () => {
        setDeleteLoading(true);
        const result = await deleteModule(module.id);
        setDeleteLoading(false);

        if (result?.error) {
            alert(result.error);
            setIsDeleteDialogOpen(false);
        } else {
            router.push("/dashboard");
        }
    };

    return (
        <div className="space-y-8 max-w-3xl">
            {/* General Information */}
            <div className="bg-surface-dark border border-border-strong rounded-2xl p-6 md:p-8">
                <div className="mb-6 border-b border-border-subtle pb-4">
                    <h2 className="text-xl font-bold text-foreground">Información General</h2>
                    <p className="text-sm text-text-muted mt-1">
                        Actualiza los detalles básicos y el estado de este módulo.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-foreground">Nombre del módulo</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={module.name}
                                required
                                className="bg-surface border-border-strong text-foreground focus-visible:ring-accent-blue"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-foreground">Estado del Módulo</Label>
                            <Select name="status" defaultValue={module.status || "pending"}>
                                <SelectTrigger className="bg-surface border-border-strong text-foreground focus:ring-accent-blue">
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
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-foreground">Descripción (opcional)</Label>
                        <Textarea
                            id="description"
                            name="description"
                            defaultValue={module.description || ""}
                            className="bg-surface border-border-strong text-foreground focus-visible:ring-accent-blue min-h-[120px]"
                        />
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={loading} className="bg-accent-blue hover:bg-accent-blue/90 text-surface-dark font-semibold px-6">
                            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </div>
                </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-surface-dark border border-accent-orange/20 rounded-2xl p-6 md:p-8">
                <div className="mb-6 border-b border-accent-orange/20 pb-4 flex items-center gap-3">
                    <AlertTriangle className="size-5 text-accent-orange" />
                    <div>
                        <h2 className="text-xl font-bold text-accent-orange">Zona de Peligro</h2>
                        <p className="text-sm text-text-muted mt-1">
                            Acciones irreversibles para este módulo. Ten cuidado.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
                    <div>
                        <h3 className="font-bold text-foreground mb-1">Eliminar Módulo</h3>
                        <p className="text-xs text-text-muted mr-4">Esta acción eliminará permanentemente el módulo, sus unidades y todas las matriculaciones de alumnos asociados.</p>
                    </div>

                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-accent-orange/50 text-accent-orange hover:bg-accent-orange/10 shrink-0 gap-2">
                                <Trash2 className="size-4" />
                                Eliminar Módulo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-surface-dark border-border-strong text-foreground">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">¿Estás completamente seguro?</DialogTitle>
                                <DialogDescription className="text-text-muted pt-2 text-sm">
                                    Esta acción no se puede deshacer. Se eliminará el módulo <span className="text-foreground font-bold">"{module.name}"</span> y todos sus datos asociados permanentemente de nuestros servidores.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="mt-6 gap-2 sm:gap-0">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsDeleteDialogOpen(false)}
                                    className="border-border-strong text-foreground hover:bg-surface"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={deleteLoading}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold"
                                >
                                    {deleteLoading ? (
                                        <>
                                            <Loader2 className="mr-2 size-4 animate-spin" />
                                            Eliminando...
                                        </>
                                    ) : (
                                        "Sí, eliminar módulo"
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}
