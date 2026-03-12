"use client";

import { useState } from "react";
import { Award, Plus, Trash2, Edit2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClassBadge, updateClassBadge, deleteClassBadge } from "@/app/dashboard/units/[id]/actions";
import { ClassBadge } from "@/types/database";
import { BadgeDisplay } from "./badge-display";
import { toast } from "sonner";

interface ClassBadgesManagerProps {
    badges: ClassBadge[];
    unitId: string;
    activityId?: string;
}

export default function ClassBadgesManager({ badges, unitId, activityId }: ClassBadgesManagerProps) {
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [iconUrl, setIconUrl] = useState("");
    const [isHidden, setIsHidden] = useState(true);
    const [conditionType, setConditionType] = useState("SCORE_GREATER_THAN_OR_EQUAL");
    const [conditionValue, setConditionValue] = useState("100");
    const [xpReward, setXpReward] = useState("0");

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setIconUrl("");
        setIsHidden(true);
        setConditionType("score");
        setConditionValue("100");
        setXpReward("0");
        setIsCreating(false);
        setIsEditing(null);
    };

    const handleCreate = async () => {
        if (!title) return toast.error("El título es obligatorio");
        setIsLoading(true);
        
        const payload = {
            allOf: [
                {
                    field: conditionType.includes('unit_completion') ? 'unit_completion' : 
                          conditionType.includes('average_score') ? 'average_score' : 'score',
                    operator: conditionType.includes('gte') ? 'gte' : 
                             conditionType.includes('gt') ? 'gt' : 'eq',
                    value: parseInt(conditionValue, 10)
                }
            ]
        };

        const { error } = await createClassBadge(unitId, {
            title,
            description,
            icon_url: iconUrl,
            is_hidden: isHidden,
            condition_payload: payload,
            activity_id: activityId,
            xp_reward: parseInt(xpReward, 10) || 0
        });

        setIsLoading(false);
        if (error) {
            toast.error(error);
        } else {
            toast.success("Insignia creada");
            resetForm();
        }
    };

    const handleUpdate = async (id: string) => {
         if (!title) return toast.error("El título es obligatorio");
        setIsLoading(true);
        
        const payload = {
            allOf: [
                {
                    field: conditionType.includes('unit_completion') ? 'unit_completion' : 
                          conditionType.includes('average_score') ? 'average_score' : 'score',
                    operator: conditionType.includes('gte') ? 'gte' : 
                             conditionType.includes('gt') ? 'gt' : 'eq',
                    value: parseInt(conditionValue, 10)
                }
            ]
        };

        const { error } = await updateClassBadge(id, unitId, {
            title,
            description,
            icon_url: iconUrl,
            is_hidden: isHidden,
            condition_payload: payload,
            activity_id: activityId,
            xp_reward: parseInt(xpReward, 10) || 0
        });

        setIsLoading(false);
        if (error) {
            toast.error(error);
        } else {
            toast.success("Insignia actualizada");
            setIsEditing(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar insignia?")) return;
        setIsLoading(true);
        
        const { error } = await deleteClassBadge(id, unitId);
        
        setIsLoading(false);
        if (error) {
            toast.error(error);
        } else {
            toast.success("Insignia eliminada");
        }
    };

    const startEdit = (badge: ClassBadge) => {
        setIsEditing(badge.id);
        setIsCreating(false);
        setTitle(badge.title);
        setDescription(badge.description || "");
        setIconUrl(badge.icon_url || "");
        setIsHidden(badge.is_hidden);
        setXpReward(badge.xp_reward?.toString() || "0");
        
        // Very basic parsing for MVP MVP
        try {
            const payload: any = badge.condition_payload;
            const condition = payload?.allOf?.[0];
            if (condition) {
                const field = condition.field || condition.fact?.replace('submission.', '');
                const op = condition.operator || "eq";
                
                let type = "score";
                if (field === 'unit_completion') type = "unit_completion";
                else if (field === 'average_score') type = "average_score";
                
                if (op === 'gt' || op === 'gte') {
                    setConditionType(`${type}_${op}`);
                } else {
                    setConditionType(type === 'score' ? 'score' : type);
                }
                
                setConditionValue(condition.value?.toString() || "100");
            }
        } catch (e) {
            // default
        }
    };

    // Filter badges based on activityId prop
    // If activityId is provided, ONLY show badges for that activity.
    // If activityId is undefined (unit level), we might want to show ONLY unit-level badges,
    // or we might want to show all unit badges. Let's show ONLY unit-level badges (activity_id is null).
    const filteredBadges = activityId 
        ? badges.filter(b => b.activity_id === activityId)
        : badges.filter(b => !b.activity_id);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold">
                        {activityId ? 'Insignias del Reto' : 'Gestión de Insignias Globales'}
                    </h3>
                    <p className="text-sm text-text-muted">
                        {activityId 
                            ? 'Crea insignias específicas para este reto.' 
                            : 'Crea insignias globales que se pueden obtener en cualquier parte de la unidad.'}
                    </p>
                </div>
                {!isCreating && !isEditing && (
                    <Button onClick={() => setIsCreating(true)}>
                        <Plus className="size-4 mr-2" />
                        Nueva Insignia
                    </Button>
                )}
            </div>

            {(isCreating || isEditing) && (
                <Card className="border-accent-blue/30 shadow-sm bg-surface">
                    <CardHeader>
                        <CardTitle>{isEditing ? "Editar Insignia" : "Nueva Insignia"}</CardTitle>
                        <CardDescription>Configura los detalles visuales y la condición para obtenerla.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <Label>Título de la Insignia</Label>
                                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Francotirador Visual" />
                                </div>
                                <div>
                                    <Label>Descripción (Opcional)</Label>
                                    <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Obtenida al sacar un 100." />
                                </div>
                                <div>
                                    <Label>URL del Icono (Opcional)</Label>
                                    <Input value={iconUrl} onChange={e => setIconUrl(e.target.value)} placeholder="/badges/custom.png" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Recompensa de XP</Label>
                                        <Input type="number" min="0" value={xpReward} onChange={e => setXpReward(e.target.value)} placeholder="Ej: 500" />
                                    </div>
                                    <div className="flex flex-col justify-end p-3 border rounded-md">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <Label className="cursor-pointer">Ocultar hasta ganar</Label>
                                                <span className="text-[10px] text-text-muted">No se verá ni la silueta</span>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                className="size-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                checked={isHidden} 
                                                onChange={e => setIsHidden(e.target.checked)} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <Label>Regla de Obtención</Label>
                                <div className="space-y-4 p-4 border rounded-md bg-background">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Propiedad a evaluar</Label>
                                        <select 
                                            value={conditionType.split('_')[0]} // Simplistic sync for property
                                            onChange={e => {
                                                const prop = e.target.value;
                                                if (prop === 'unit') setConditionType('unit_completion');
                                                else if (prop === 'avg') setConditionType('average_score');
                                                else setConditionType('score');
                                            }}
                                            className="w-full text-sm rounded bg-surface border px-3 py-2"
                                        >
                                            <option value="score">Nota del Reto (0-100)</option>
                                            <option value="avg">Nota Media de la Unidad (0-100)</option>
                                            <option value="unit">% Completado de la Unidad (0-100)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Operador</Label>
                                        <select 
                                            value={conditionType.includes('gt') ? 'gt' : conditionType.includes('gte') ? 'gte' : 'eq'} 
                                            onChange={e => {
                                                const op = e.target.value;
                                                // Keep the property part of conditionType
                                                const prop = conditionType.includes('unit_completion') ? 'unit_completion' : 
                                                           conditionType.includes('average_score') ? 'average_score' : 'score';
                                                
                                                if (op === 'eq') setConditionType(prop === 'score' ? 'score' : prop); 
                                                else setConditionType(`${prop}_${op}`);
                                            }}
                                            className="w-full text-sm rounded bg-surface border px-3 py-2"
                                        >
                                            <option value="eq">Es igual a</option>
                                            <option value="gt">Es mayor que</option>
                                            <option value="gte">Es mayor o igual que</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Valor Requerido (0-100)</Label>
                                        <Input type="number" min="0" max="100" value={conditionValue} onChange={e => setConditionValue(e.target.value)} />
                                    </div>
                                </div>

                                <div className="bg-accent-blue/10 border border-accent-blue/20 p-4 rounded-md flex items-center justify-center gap-4">
                                   <BadgeDisplay 
                                        badge={{ id: "preview", title: title || "Vista Previa", description, icon_url: iconUrl || null, is_hidden: isHidden } as any}
                                        isEarned={true}
                                   />
                                   <BadgeDisplay 
                                        badge={{ id: "preview2", title: title || "Vista Previa", description, icon_url: iconUrl || null, is_hidden: isHidden } as any}
                                        isEarned={false}
                                   />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={resetForm} disabled={isLoading}>Cancelar</Button>
                            <Button onClick={() => isEditing ? handleUpdate(isEditing) : handleCreate()} disabled={isLoading}>
                                {isLoading ? "Guardando..." : "Guardar Insignia"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!isCreating && !isEditing && (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredBadges.map(badge => (
                        <Card key={badge.id} className="group relative overflow-hidden bg-surface">
                            <CardContent className="p-5 flex items-start gap-4">
                                <BadgeDisplay badge={badge as any} isEarned={true} className="shrink-0" />
                                <div className="space-y-1 overflow-hidden">
                                    <h4 className="font-bold text-sm truncate">{badge.title}</h4>
                                    <p className="text-xs text-text-muted line-clamp-2">{badge.description}</p>
                                    <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono">
                                        {badge.is_hidden ? (
                                            <span className="bg-accent-orange/10 text-accent-orange px-2 py-0.5 rounded">Oculta hasta conseguir</span>
                                        ) : (
                                            <span className="bg-accent-blue/10 text-accent-blue px-2 py-0.5 rounded">Visible (Silueta)</span>
                                        )}
                                        {badge.xp_reward > 0 && (
                                            <span className="bg-accent-purple/10 text-accent-purple px-2 py-0.5 rounded">+{badge.xp_reward} XP</span>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute top-2 right-2 flex opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => startEdit(badge as any)}>
                                        <Edit2 className="size-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="size-8 text-status-offline hover:text-status-offline" onClick={() => handleDelete(badge.id)}>
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {filteredBadges.length === 0 && (
                        <div className="col-span-full py-12 text-center text-text-muted bg-surface rounded-lg border border-dashed">
                            <Award className="size-12 mx-auto mb-3 opacity-20" />
                            <p>No hay insignias {activityId ? 'para este reto' : 'globales'} creadas todavía.</p>
                            <p className="text-sm mt-1">Crea una para motivar a tus alumnos.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
