"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Globe, Lock } from "lucide-react";
import { updateModuleSettings } from "@/app/dashboard/modules/[id]/actions";

type Module = {
    id: string;
    name: string;
    description: string | null;
    icon: string;
};

export function ModuleSettingsTab({ module }: { module: Module }) {
    const [loading, setLoading] = useState(false);
    const [visibility, setVisibility] = useState<"public" | "private">("public");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const result = await updateModuleSettings(module.id, formData);
        setLoading(false);

        if (result?.error) {
            alert(result.error);
        } else {
            // Optional: Show success toast
        }
    };

    return (
        <div className="space-y-8 max-w-3xl">
            {/* General Information */}
            <div className="bg-surface-dark border border-border-strong rounded-2xl p-6 md:p-8">
                <div className="mb-6 border-b border-border-subtle pb-4">
                    <h2 className="text-xl font-bold text-foreground">Información General</h2>
                    <p className="text-sm text-text-muted mt-1">
                        Actualiza los detalles básicos de este módulo.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Visibility Settings */}
            <div className="bg-surface-dark border border-border-strong rounded-2xl p-6 md:p-8">
                <div className="mb-6 border-b border-border-subtle pb-4">
                    <h2 className="text-xl font-bold text-foreground">Visibilidad y Acceso</h2>
                    <p className="text-sm text-text-muted mt-1">
                        Controla quién puede ver y acceder a este módulo.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Public Option */}
                    <div
                        className={`p-4 rounded-xl flex items-start gap-4 border cursor-pointer transition-colors ${visibility === 'public' ? 'border-accent-blue bg-accent-blue/5' : 'border-border-subtle bg-surface hover:border-border-strong'}`}
                        onClick={() => setVisibility('public')}
                    >
                        <div className={`mt-0.5 size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${visibility === 'public' ? 'border-accent-blue' : 'border-text-muted'}`}>
                            {visibility === 'public' && <div className="size-2.5 rounded-full bg-accent-blue" />}
                        </div>
                        <div>
                            <div className="font-bold text-foreground flex items-center gap-2 mb-1">
                                <Globe className="size-4 text-text-muted" /> Público
                            </div>
                            <p className="text-xs text-text-muted">Visible para todos los alumnos del centro de estudios.</p>
                        </div>
                    </div>

                    {/* Private Option */}
                    <div
                        className={`p-4 rounded-xl flex items-start gap-4 border cursor-pointer transition-colors ${visibility === 'private' ? 'border-accent-blue bg-accent-blue/5' : 'border-border-subtle bg-surface hover:border-border-strong'}`}
                        onClick={() => setVisibility('private')}
                    >
                        <div className={`mt-0.5 size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${visibility === 'private' ? 'border-accent-blue' : 'border-text-muted'}`}>
                            {visibility === 'private' && <div className="size-2.5 rounded-full bg-accent-blue" />}
                        </div>
                        <div>
                            <div className="font-bold text-foreground flex items-center gap-2 mb-1">
                                <Lock className="size-4 text-accent-orange" /> Privado
                            </div>
                            <p className="text-xs text-text-muted">Solo visible para los alumnos matriculados manualmente.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-surface-dark border border-accent-orange/20 rounded-2xl p-6 md:p-8">
                <div className="mb-6 border-b border-accent-orange/20 pb-4">
                    <h2 className="text-xl font-bold text-accent-orange">Zona de Peligro</h2>
                    <p className="text-sm text-text-muted mt-1">
                        Acciones destructivas para este módulo.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-foreground mb-1">Archivar Módulo</h3>
                        <p className="text-sm text-text-muted">Oculta este módulo a los alumnos sin eliminar su contenido o progreso.</p>
                    </div>
                    <Button variant="outline" className="border-border-strong text-text-muted hover:text-foreground shrink-0">
                        Archivar Módulo
                    </Button>
                </div>
            </div>
        </div>
    );
}
