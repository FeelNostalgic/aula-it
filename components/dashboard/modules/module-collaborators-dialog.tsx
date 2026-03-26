"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Lock, Search, UserMinus, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    addModuleCollaborator,
    listAvailableTeachersForModule,
    listModuleCollaborators,
    removeModuleCollaborator,
    updateModuleCollaboratorRole,
} from "@/app/dashboard/modules/[id]/actions";
import {
    MODULE_COLLABORATOR_ROLE,
    getModuleRoleLabel,
    getRestrictedActionMessage,
    type ModuleCollaboratorRole,
} from "@/lib/module-collaborator-defs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ModuleCollaboratorsTabProps {
    moduleId: string;
    canManageCollaborators: boolean;
    moduleRole: ModuleCollaboratorRole | null;
}

interface TeacherSummary {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
}

interface CollaboratorSummary extends TeacherSummary {
    role: ModuleCollaboratorRole;
}

const ASSIGNABLE_ROLES = [
    MODULE_COLLABORATOR_ROLE.CO_OWNER,
    MODULE_COLLABORATOR_ROLE.EDITOR,
    MODULE_COLLABORATOR_ROLE.VIEWER,
] as const;

export function ModuleCollaboratorsTab({
    moduleId,
    canManageCollaborators,
    moduleRole,
}: ModuleCollaboratorsTabProps) {
    const [isPending, startTransition] = useTransition();
    const [creator, setCreator] = useState<CollaboratorSummary | null>(null);
    const [collaborators, setCollaborators] = useState<CollaboratorSummary[]>([]);
    const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
    const [teacherQuery, setTeacherQuery] = useState("");
    const [selectedTeacherId, setSelectedTeacherId] = useState("");
    const [selectedRole, setSelectedRole] = useState<ModuleCollaboratorRole>(MODULE_COLLABORATOR_ROLE.EDITOR);

    async function loadCollaborators() {
        const result = await listModuleCollaborators(moduleId);
        if (result.error) {
            toast.error(result.error);
            return;
        }

        setCreator(result.creator ?? null);
        setCollaborators(result.collaborators ?? []);
    }

    async function loadTeachers(query = "") {
        const result = await listAvailableTeachersForModule(moduleId, query);
        if (result.error) {
            toast.error(result.error);
            return;
        }

        setTeachers(result.teachers ?? []);
    }

    useEffect(() => {
        if (!moduleId) {
            return;
        }

        startTransition(async () => {
            await loadCollaborators();
            if (canManageCollaborators) {
                await loadTeachers();
            }
        });
    }, [moduleId, canManageCollaborators]);

    const handleInvite = () => {
        if (!selectedTeacherId) {
            toast.error("Selecciona un profesor.");
            return;
        }

        startTransition(async () => {
            const result = await addModuleCollaborator(moduleId, selectedTeacherId, selectedRole);
            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success("Profesor añadido al módulo.");
            setSelectedTeacherId("");
            await Promise.all([loadCollaborators(), loadTeachers(teacherQuery)]);
        });
    };

    const handleRoleChange = (teacherId: string, role: ModuleCollaboratorRole) => {
        startTransition(async () => {
            const result = await updateModuleCollaboratorRole(moduleId, teacherId, role);
            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success("Rol actualizado.");
            await loadCollaborators();
        });
    };

    const handleRemove = (teacherId: string) => {
        startTransition(async () => {
            const result = await removeModuleCollaborator(moduleId, teacherId);
            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success("Profesor eliminado del módulo.");
            await Promise.all([loadCollaborators(), loadTeachers(teacherQuery)]);
        });
    };

    const handleTeacherSearch = () => {
        startTransition(async () => {
            await loadTeachers(teacherQuery);
        });
    };

    return (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
                <div className="rounded-2xl border border-border-strong bg-surface-dark/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <Users className="size-4 text-accent-blue" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Accesos actuales</h3>
                    </div>

                    {!canManageCollaborators && moduleRole && (
                        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
                            {getRestrictedActionMessage("canManageCollaborators", moduleRole)}
                        </div>
                    )}

                    <div className="space-y-3">
                        {creator && (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-accent-blue/20 bg-accent-blue/5 px-4 py-3">
                                <div>
                                    <p className="font-semibold text-foreground">{creator.full_name ?? "Profesor creador"}</p>
                                    <p className="text-xs text-text-muted">{creator.email}</p>
                                </div>
                                <Badge variant="outline" className="border-accent-blue/30 bg-accent-blue/10 text-accent-blue">
                                    {getModuleRoleLabel(creator.role)}
                                </Badge>
                            </div>
                        )}

                        {collaborators.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border-subtle px-4 py-6 text-sm text-text-muted">
                                Este módulo todavía no tiene profesores colaboradores.
                            </div>
                        ) : (
                            collaborators.map((collaborator) => (
                                <div key={collaborator.id} className="rounded-xl border border-border-subtle px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-foreground">{collaborator.full_name ?? "Profesor"}</p>
                                            <p className="text-xs text-text-muted">{collaborator.email}</p>
                                        </div>
                                        {canManageCollaborators ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8 text-text-muted hover:text-destructive"
                                                onClick={() => handleRemove(collaborator.id)}
                                                disabled={isPending}
                                                title="Quitar acceso"
                                                aria-label={`Quitar acceso a ${collaborator.full_name ?? collaborator.email}`}
                                            >
                                                <UserMinus className="size-4" />
                                            </Button>
                                        ) : (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 text-text-muted"
                                                                disabled
                                                                aria-label="Acción restringida al creador"
                                                            >
                                                                <Lock className="size-4" />
                                                            </Button>
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {moduleRole ? getRestrictedActionMessage("canManageCollaborators", moduleRole) : "Acción restringida."}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>

                                    <div className="mt-3">
                                        <Label className="mb-2 block text-[10px] font-mono uppercase tracking-widest text-text-muted">
                                            Rol
                                        </Label>
                                        <Select
                                            value={collaborator.role}
                                            onValueChange={(value) => handleRoleChange(collaborator.id, value as ModuleCollaboratorRole)}
                                            disabled={isPending || !canManageCollaborators}
                                        >
                                            <SelectTrigger className="bg-surface border-border-strong">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="border-border-strong bg-surface-dark">
                                                {ASSIGNABLE_ROLES.map((role) => (
                                                    <SelectItem key={role} value={role}>
                                                        {getModuleRoleLabel(role)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-border-strong bg-surface-dark/50 p-4">
                <div className="flex items-center gap-2">
                    <UserPlus className="size-4 text-accent-blue" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Añadir profesor</h3>
                </div>

                {!canManageCollaborators && moduleRole ? (
                    <div className="rounded-xl border border-dashed border-border-subtle px-4 py-6 text-sm text-text-muted">
                        {getRestrictedActionMessage("canManageCollaborators", moduleRole)}
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Buscar profesor</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={teacherQuery}
                                    onChange={(event) => setTeacherQuery(event.target.value)}
                                    placeholder="Nombre o email..."
                                    className="bg-surface border-border-strong"
                                />
                                <Button type="button" variant="outline" onClick={handleTeacherSearch} disabled={isPending} aria-label="Buscar profesor">
                                    <Search className="size-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Profesor</Label>
                            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId} disabled={isPending}>
                                <SelectTrigger className="bg-surface border-border-strong">
                                    <SelectValue placeholder="Selecciona un profesor" />
                                </SelectTrigger>
                                <SelectContent className="border-border-strong bg-surface-dark">
                                    {teachers.map((teacher) => (
                                        <SelectItem key={teacher.id} value={teacher.id}>
                                            {teacher.full_name ?? teacher.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedTeacherId && (
                                <p className="text-xs text-text-muted">
                                    {teachers.find((teacher) => teacher.id === selectedTeacherId)?.email}
                                </p>
                            )}
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Rol inicial</Label>
                            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as ModuleCollaboratorRole)} disabled={isPending}>
                                <SelectTrigger className="bg-surface border-border-strong">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-border-strong bg-surface-dark">
                                    {ASSIGNABLE_ROLES.map((role) => (
                                        <SelectItem key={role} value={role}>
                                            {getModuleRoleLabel(role)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            type="button"
                            onClick={handleInvite}
                            disabled={isPending || !selectedTeacherId}
                            className="w-full bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono text-[10px] font-bold uppercase tracking-widest"
                        >
                            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                            AÑADIR PROFESOR
                        </Button>
                    </>
                )}

                <div className="rounded-xl border border-border-subtle px-4 py-3 text-xs text-text-muted">
                    <p><span className="font-bold text-foreground">Codueño</span>: contenido, alumnos y ajustes operativos.</p>
                    <p><span className="font-bold text-foreground">Editor</span>: contenido y alumnos.</p>
                    <p><span className="font-bold text-foreground">Visitante</span>: solo lectura.</p>
                </div>
            </div>
        </div>
    );
}
