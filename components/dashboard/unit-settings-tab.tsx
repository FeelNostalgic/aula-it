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
    Map
} from "lucide-react";
import { updateUnitSettings } from "@/app/dashboard/units/[id]/actions";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Unit = {
    id: string;
    name: string;
    description: string | null;
    status?: string | null;
    view_type?: string | null;
};

export function UnitSettingsTab({ unit }: { unit: Unit }) {
    const [loading, setLoading] = useState(false);

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

    return (
        <div className="space-y-8 max-w-3xl">
            <div className="bg-surface-dark border border-border-strong rounded-2xl p-6 md:p-8">
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
                                className="bg-surface border-border-strong text-foreground focus-visible:ring-accent-blue"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-foreground">Visibilidad</Label>
                            <Select name="status" defaultValue={unit.status || "draft"}>
                                <SelectTrigger className="bg-surface border-border-strong text-foreground focus:ring-accent-blue">
                                    <SelectValue placeholder="Selecciona un estado" />
                                </SelectTrigger>
                                <SelectContent className="bg-surface-dark border-border-strong text-foreground">
                                    <SelectItem value="active" className="focus:bg-accent-blue/10 focus:text-accent-blue">
                                        <div className="flex items-center gap-2">
                                            <Eye className="size-4 text-accent-green" />
                                            <span>Publicado (Visible)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="draft" className="focus:bg-accent-blue/10 focus:text-accent-blue">
                                        <div className="flex items-center gap-2">
                                            <EyeOff className="size-4 text-text-muted" />
                                            <span>Borrador (Oculto)</span>
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
                            className="bg-surface border-border-strong text-foreground focus-visible:ring-accent-blue min-h-[120px]"
                        />
                    </div>

                    <div className="space-y-2 border-t border-border-subtle pt-6">
                        <Label htmlFor="view_type" className="text-foreground text-lg font-bold">Modo de visualización</Label>
                        <p className="text-sm text-text-muted mb-4">Elige cómo los alumnos navegarán por las actividades de esta unidad.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Label htmlFor="view-list" className="cursor-pointer">
                                <div className="border border-border-strong rounded-xl p-4 hover:border-accent-blue/50 transition-all [&:has(:checked)]:border-accent-blue [&:has(:checked)]:bg-accent-blue/5">
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
                                <div className="border border-border-strong rounded-xl p-4 hover:border-accent-blue/50 transition-all [&:has(:checked)]:border-accent-blue [&:has(:checked)]:bg-accent-blue/5">
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
                        <Button type="submit" disabled={loading} className="bg-accent-blue hover:bg-accent-blue/90 text-surface-dark font-semibold px-6">
                            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Guardar Configuración
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
