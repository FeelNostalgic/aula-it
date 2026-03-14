"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Loader2,
    EyeOff,
    Eye,
    List,
    Map,
    Lock,
    Trash2,
    AlertTriangle
} from "lucide-react";
import { updateUnitSettings, deleteUnit } from "@/app/dashboard/units/[id]/actions";
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
import { useRouter } from "next/navigation";

type Unit = {
    id: string;
    name: string;
    description: string | null;
    status?: string | null;
    view_type?: string | null;
};

export function UnitSettingsTab({ unit }: { unit: Unit }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const rawStatus = unit.status?.toLowerCase() || 'draft';
    const normalizedStatus = (rawStatus === 'active' || rawStatus === 'activo') ? 'published' :
        (rawStatus === 'bloqueado' ? 'blocked' :
            (rawStatus === 'borrador' ? 'draft' : rawStatus));

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const result = await updateUnitSettings(unit.id, formData);
        setLoading(false);

        if (result?.error) {
            toast.error(`Error al guardar: ${result.error}`);
        } else {
            toast.success("Ajustes de la unidad actualizados");
        }
    };

    const handleDelete = async () => {
        setDeleteLoading(true);
        const result = await deleteUnit(unit.id);
        setDeleteLoading(false);

        if (result?.error) {
            toast.error(`Error al eliminar: ${result.error}`);
            setIsDeleteDialogOpen(false);
        } else {
            toast.success("Unidad eliminada correctamente");
            router.push("/dashboard");
        }
    };

    return (
        <div className="space-y-8 max-w-3xl pb-12">
            <div className="bg-surface border border-border-strong rounded-2xl p-6 md:p-8">
                <div className="mb-6 border-b border-border-subtle pb-4">
                    <h2 className="text-xl font-bold text-foreground">Configuración de la Unidad</h2>
                    <p className="text-sm text-text-muted mt-1">
                        Actualiza los detalles y define cómo verán los alumnos esta unidad.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-foreground">Título de la Unidad</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={unit.name}
                                required
                                className="bg-surface-dark border-border-strong text-foreground focus-visible:ring-accent-blue"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-foreground">Visibilidad</Label>
                            <Select name="status" defaultValue={normalizedStatus}>
                                <SelectTrigger className="bg-surface-dark border-border-strong text-foreground focus:ring-accent-blue">
                                    <SelectValue placeholder="Selecciona un estado" />
                                </SelectTrigger>
                                <SelectContent className="bg-surface-dark border-border-strong text-foreground">
                                    <SelectItem value="published" className="focus:bg-accent-blue/10 focus:text-accent-blue font-bold">
                                        <div className="flex items-center gap-2">
                                            <Eye className="size-4 text-accent-green" />
                                            <span>Publicado (Visible)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="blocked" className="focus:bg-accent-blue/10 focus:text-accent-blue font-bold">
                                        <div className="flex items-center gap-2">
                                            <Lock className="size-4 text-accent-red" />
                                            <span>Bloqueado (Próximamente)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="draft" className="focus:bg-accent-blue/10 focus:text-accent-blue font-bold">
                                        <div className="flex items-center gap-2">
                                            <EyeOff className="size-4 text-accent-orange" />
                                            <span>Borrador (Solo tú)</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-foreground">Introducción (opcional)</Label>
                        <Textarea
                            id="description"
                            name="description"
                            defaultValue={unit.description || ""}
                            className="bg-surface-dark border-border-strong text-foreground focus-visible:ring-accent-blue min-h-[120px]"
                        />
                    </div>

                    <div className="space-y-2 border-t border-border-subtle pt-6">
                        <Label htmlFor="view_type" className="text-foreground text-lg font-bold">Modo de visualización</Label>
                        <p className="text-sm text-text-muted mb-4">Elige cómo los alumnos navegarán por las actividades de esta unidad.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Label htmlFor="view-list" className="cursor-pointer">
                                <div className="border border-border-strong rounded-xl p-4 hover:border-accent-blue/50 transition-all [&:has(:checked)]:border-accent-blue [&:has(:checked)]:bg-accent-blue/5 bg-surface-dark/50">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            <input
                                                type="radio"
                                                id="view-list"
                                                name="view_type"
                                                value="list"
                                                defaultChecked={(unit.view_type || "list") === "list"}
                                                className="accent-accent-blue size-4"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 font-bold text-foreground">
                                                <List className="size-4" />
                                                Lista tradicional
                                            </div>
                                            <p className="text-xs text-text-muted mt-1">Ideal para contenido puramente teórico u orden secuencial simple.</p>
                                        </div>
                                    </div>
                                </div>
                            </Label>

                            <Label htmlFor="view-map" className="cursor-pointer">
                                <div className="border border-border-strong rounded-xl p-4 hover:border-accent-blue/50 transition-all [&:has(:checked)]:border-accent-blue [&:has(:checked)]:bg-accent-blue/5 bg-surface-dark/50">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            <input
                                                type="radio"
                                                id="view-map"
                                                name="view_type"
                                                value="map"
                                                defaultChecked={unit.view_type === "map"}
                                                className="accent-accent-blue size-4"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 font-bold text-foreground">
                                                <Map className="size-4" />
                                                Mapa Interactivo Gamificado
                                            </div>
                                            <p className="text-xs text-text-muted mt-1">Transforma la unidad en un tablero de aventura para mayor inmersión y gamificación.</p>
                                        </div>
                                    </div>
                                </div>
                            </Label>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end border-t border-border-subtle mt-8">
                        <Button type="submit" disabled={loading} className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-11 px-8 uppercase">
                            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                            GUARDAR CONFIGURACIÓN
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
                        <h2 className="text-xl font-bold text-accent-orange">Zona de Peligro</h2>
                        <p className="text-sm text-text-muted mt-1 font-medium">
                            Acciones irreversibles para esta unidad didáctica.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
                    <div>
                        <h3 className="font-bold text-foreground mb-1">Eliminar Unidad</h3>
                        <p className="text-xs text-text-muted mr-4">Esta acción eliminará permanentemente la unidad, sus retos, recursos e hitos asociados.</p>
                    </div>

                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10 shrink-0 gap-2 h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider">
                                <Trash2 className="size-4" />
                                Eliminar Unidad
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-surface border-border-strong text-foreground max-w-md p-6 rounded-[32px]">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl font-bold text-red-500">¿Estás completamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription className="text-text-muted pt-2 text-sm leading-relaxed">
                                    Esta acción no se puede deshacer. Se eliminará la unidad <span className="text-foreground font-bold">"{unit.name}"</span> y todos sus datos asociados permanentemente.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
                                <AlertDialogCancel asChild>
                                    <Button variant="ghost" className="text-text-muted hover:text-foreground">
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
                                        {deleteLoading ? "Eliminando..." : "Sí, eliminar unidad"}
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

