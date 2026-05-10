"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Crown, Lock, Palette, UserMinus, UserPlus, Users2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    getModuleGroupRoleSettings,
    getModuleGroups,
    getModuleGroupsEnrollmentMode,
    getMyGroupForModule,
    getMyGroupMembership,
    getMyGroupWorkLogs,
    saveMyGroupRole,
    studentJoinGroup,
    studentLeaveGroup,
    studentUpdateOwnedGroup,
    upsertMyGroupWorkLog,
} from "@/app/dashboard/modules/[id]/groups-actions";
import type {
    GroupRoleMode,
    GroupsEnrollmentMode,
    ModuleGroupRole,
    ModuleGroupWithMembers,
    ModuleGroupWorkLog,
} from "@/types/groups";

interface GroupSelfEnrollmentCardProps {
    moduleId: string;
}

interface MyMembership {
    id: string;
    group_id: string;
    student_id: string;
    role_text: string | null;
    predefined_role_id: string | null;
}

const GROUP_COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
];

const ROLE_PLACEHOLDER = "__role_placeholder__";

function getInitials(name: string | null): string {
    if (!name) return "?";
    return name.split(" ").map((chunk) => chunk[0]).join("").toUpperCase().slice(0, 2);
}

function todayInMadrid(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

export function GroupSelfEnrollmentCard({ moduleId }: GroupSelfEnrollmentCardProps) {
    const [myGroup, setMyGroup] = useState<ModuleGroupWithMembers | null>(null);
    const [membership, setMembership] = useState<MyMembership | null>(null);
    const [allGroups, setAllGroups] = useState<ModuleGroupWithMembers[]>([]);
    const [mode, setMode] = useState<GroupsEnrollmentMode>("teacher_assigned");
    const [roleMode, setRoleMode] = useState<GroupRoleMode>("free_text");
    const [roles, setRoles] = useState<ModuleGroupRole[]>([]);
    const [logs, setLogs] = useState<ModuleGroupWorkLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [freeRoleValue, setFreeRoleValue] = useState("");
    const [selectedRoleId, setSelectedRoleId] = useState(ROLE_PLACEHOLDER);
    const [groupName, setGroupName] = useState("");
    const [groupColor, setGroupColor] = useState(GROUP_COLORS[0]);
    const [todayLog, setTodayLog] = useState("");

    async function load() {
        const [modeResponse, myGroupResponse, groupsResponse, roleResponse, membershipResponse, logsResponse] = await Promise.all([
            getModuleGroupsEnrollmentMode(moduleId),
            getMyGroupForModule(moduleId),
            getModuleGroups(moduleId),
            getModuleGroupRoleSettings(moduleId),
            getMyGroupMembership(moduleId),
            getMyGroupWorkLogs(moduleId),
        ]);

        setMode(modeResponse.mode ?? "teacher_assigned");
        setMyGroup(myGroupResponse.group ?? null);
        setAllGroups(groupsResponse.groups ?? []);
        setRoleMode(roleResponse.settings?.mode ?? "free_text");
        setRoles(roleResponse.settings?.roles ?? []);
        setMembership((membershipResponse.membership as MyMembership | null | undefined) ?? null);
        setLogs(logsResponse.logs ?? []);
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, [moduleId]);

    const currentMember = useMemo(() => {
        if (!myGroup || !membership) return null;
        return myGroup.members.find((member) => member.student_id === membership.student_id) ?? null;
    }, [membership, myGroup]);

    const isRepresentative = !!myGroup && !!membership && myGroup.representative_student_id === membership.student_id;
    const todayDate = todayInMadrid();

    useEffect(() => {
        setGroupName(myGroup?.name ?? "");
        setGroupColor(myGroup?.color ?? GROUP_COLORS[0]);

        if (currentMember) {
            setFreeRoleValue(currentMember.role_text ?? "");
            setSelectedRoleId(currentMember.predefined_role_id ?? ROLE_PLACEHOLDER);
        } else {
            setFreeRoleValue("");
            setSelectedRoleId(ROLE_PLACEHOLDER);
        }
    }, [currentMember, myGroup]);

    useEffect(() => {
        const todayEntry = logs.find((entry) => entry.entry_date === todayDate);
        setTodayLog(todayEntry?.content ?? "");
    }, [logs, todayDate]);

    if (loading) return null;

    function handleJoin(groupId: string) {
        startTransition(async () => {
            const response = await studentJoinGroup(groupId);
            if (response.error) {
                toast.error(response.error);
                return;
            }
            toast.success("Te has unido al grupo.");
            await load();
        });
    }

    function handleLeave(groupId: string) {
        startTransition(async () => {
            const response = await studentLeaveGroup(groupId);
            if (response.error) {
                toast.error(response.error);
                return;
            }
            toast.success("Has salido del grupo.");
            await load();
        });
    }

    function handleSaveRole() {
        startTransition(async () => {
            const response = await saveMyGroupRole(moduleId, {
                roleText: roleMode === "free_text" ? freeRoleValue : undefined,
                predefinedRoleId: roleMode === "predefined" && selectedRoleId !== ROLE_PLACEHOLDER ? selectedRoleId : undefined,
            });
            if (response.error) {
                toast.error(response.error);
                return;
            }
            toast.success("Rol guardado.");
            await load();
        });
    }

    function handleSaveGroupIdentity() {
        if (!myGroup) return;

        startTransition(async () => {
            const response = await studentUpdateOwnedGroup(myGroup.id, {
                name: groupName,
                color: groupColor,
            });
            if (response.error) {
                toast.error(response.error);
                return;
            }
            toast.success("Datos del grupo actualizados.");
            await load();
        });
    }

    function handleSaveTodayLog() {
        startTransition(async () => {
            const response = await upsertMyGroupWorkLog(moduleId, todayLog, todayDate);
            if (response.error) {
                toast.error(response.error);
                return;
            }
            toast.success("Diario guardado.");
            await load();
        });
    }

    if (mode === "locked" && !myGroup) {
        return (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
                    <Lock className="size-5 text-amber-400" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/70">Grupos cerrados</p>
                    <p className="text-sm text-text-muted">El profesor ha cerrado los grupos. Contacta con él si necesitas ser asignado.</p>
                </div>
            </div>
        );
    }

    if (mode === "teacher_assigned" && !myGroup) {
        return (
            <div className="flex items-center gap-3 rounded-2xl border border-border/30 bg-surface-dark p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface">
                    <Users2 className="size-5 text-text-muted" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Mi grupo</p>
                    <p className="text-sm text-text-muted">El profesor te asignará a un grupo próximamente.</p>
                </div>
            </div>
        );
    }

    if (myGroup) {
        const accent = myGroup.color ?? "#6b7280";

        return (
            <div className="space-y-6">
                <div className="overflow-hidden rounded-2xl border" style={{ borderColor: `${accent}40` }}>
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ background: `${accent}18` }}>
                        <div className="flex items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${accent}30` }}>
                                <Users2 className="size-4" style={{ color: accent }} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Mi grupo</p>
                                <p className="text-sm font-bold leading-tight text-foreground">{myGroup.name}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-border-subtle text-[10px] font-mono text-text-muted">
                                {myGroup.members.length}{myGroup.max_members ? `/${myGroup.max_members}` : ""} miembros
                            </Badge>
                            {isRepresentative && (
                                <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-400">
                                    <Crown className="mr-1 size-2.5" />
                                    Representante
                                </Badge>
                            )}
                            {mode === "locked" && (
                                <Badge variant="outline" className="gap-1 border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-400">
                                    <Lock className="size-2.5" />
                                    Cerrado
                                </Badge>
                            )}
                            {mode === "self_enrollment" && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isPending}
                                    onClick={() => handleLeave(myGroup.id)}
                                    className="h-7 gap-1.5 text-xs text-text-muted hover:text-red-400"
                                >
                                    <UserMinus className="size-3.5" />
                                    Salir
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="divide-y divide-border-subtle">
                        {myGroup.members.map((member) => {
                            const name = member.profile?.full_name ?? "Alumno";
                            const roleLabel = member.predefined_role?.name ?? member.role_text ?? "Sin rol";
                            const memberIsRepresentative = myGroup.representative_student_id === member.student_id;
                            return (
                                <div key={member.student_id} className="bg-surface-dark/40 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-7 shrink-0">
                                            <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                                            <AvatarFallback className="bg-surface text-[10px] font-bold">
                                                {getInitials(name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate text-sm font-medium text-foreground">{name}</span>
                                                {memberIsRepresentative && (
                                                    <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-400">
                                                        <Crown className="mr-1 size-2.5" />
                                                        Rep.
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-xs text-text-muted">{roleLabel}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded-2xl border border-border-subtle bg-surface-dark p-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Mi rol</p>
                            <p className="text-sm text-text-muted">
                                {roleMode === "free_text"
                                    ? "Describe tu responsabilidad dentro del grupo."
                                    : "Elige uno de los roles predefinidos disponibles para tu grupo."}
                            </p>
                        </div>

                        {roleMode === "free_text" ? (
                            <Input
                                value={freeRoleValue}
                                onChange={(event) => setFreeRoleValue(event.target.value)}
                                placeholder="Ej: coordinador, portavoz, redactor"
                                className="mt-4 bg-surface"
                            />
                        ) : (
                            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                                <SelectTrigger className="mt-4 bg-surface">
                                    <SelectValue placeholder="Selecciona un rol" />
                                </SelectTrigger>
                                <SelectContent className="border-border-subtle bg-surface">
                                    <SelectItem value={ROLE_PLACEHOLDER}>Selecciona un rol</SelectItem>
                                    {roles.map((role) => (
                                        <SelectItem key={role.id} value={role.id}>
                                            {role.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <Button
                            onClick={handleSaveRole}
                            disabled={isPending}
                            className="mt-4 bg-accent-blue text-primary-foreground hover:bg-accent-blue/90"
                        >
                            Guardar rol
                        </Button>
                    </div>

                    <div className="rounded-2xl border border-border-subtle bg-surface-dark p-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Identidad del grupo</p>
                            <p className="text-sm text-text-muted">
                                {isRepresentative
                                    ? "Como representante puedes cambiar el nombre y color del grupo."
                                    : "Solo el representante del grupo puede cambiar nombre y color."}
                            </p>
                        </div>

                        <div className="mt-4 space-y-4">
                            <Input
                                value={groupName}
                                onChange={(event) => setGroupName(event.target.value)}
                                disabled={!isRepresentative}
                                placeholder="Nombre del grupo"
                                className="bg-surface"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                                <Palette className="size-4 text-text-muted" />
                                {GROUP_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        disabled={!isRepresentative}
                                        onClick={() => setGroupColor(color)}
                                        className={`size-7 rounded-full border-2 transition-transform ${groupColor === color ? "border-foreground scale-110" : "border-transparent"} ${!isRepresentative ? "cursor-not-allowed opacity-50" : "hover:scale-110"}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <Button
                                onClick={handleSaveGroupIdentity}
                                disabled={!isRepresentative || isPending}
                                className="bg-accent-blue text-primary-foreground hover:bg-accent-blue/90"
                            >
                                Guardar grupo
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border-subtle bg-surface-dark p-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Diario de trabajo</p>
                        <p className="text-sm text-text-muted">
                            Una entrada por día. Cuenta qué has hecho hoy respecto a tu rol o al trabajo general del grupo.
                        </p>
                    </div>

                    <div className="mt-4 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs text-text-muted">
                        Entrada de hoy: <span className="font-semibold text-foreground">{todayDate}</span>
                    </div>

                    <Textarea
                        value={todayLog}
                        onChange={(event) => setTodayLog(event.target.value)}
                        placeholder="Hoy me he encargado de..."
                        className="mt-4 min-h-32 bg-surface"
                    />

                    <Button
                        onClick={handleSaveTodayLog}
                        disabled={isPending}
                        className="mt-4 bg-accent-blue text-primary-foreground hover:bg-accent-blue/90"
                    >
                        Guardar diario de hoy
                    </Button>

                    <div className="mt-6 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Histórico personal</p>
                        {logs.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border-subtle px-4 py-5 text-sm text-text-muted">
                                Todavía no has escrito ninguna entrada.
                            </div>
                        ) : (
                            logs.map((entry) => (
                                <div key={entry.id} className="rounded-xl border border-border-subtle bg-surface p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <Badge variant="outline" className="border-border-subtle text-[10px] font-mono text-text-muted">
                                            {entry.entry_date}
                                        </Badge>
                                        <span className="text-xs text-text-muted">
                                            {new Date(entry.updated_at).toLocaleString("es-ES")}
                                        </span>
                                    </div>
                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{entry.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-6 space-y-4 rounded-2xl border border-white/5 bg-surface-dark p-5">
            <div className="flex items-center gap-2">
                <Users2 className="size-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-foreground">Elige tu grupo</h3>
                <Badge variant="outline" className="ml-auto border-indigo-500/20 bg-indigo-500/5 text-[10px] text-indigo-400">
                    {allGroups.length} grupos disponibles
                </Badge>
            </div>

            {allGroups.length === 0 ? (
                <p className="text-xs text-text-muted">El profesor aún no ha creado grupos para este módulo.</p>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {allGroups.map((group) => {
                        const isFull = group.max_members !== null && group.members.length >= group.max_members;
                        return (
                            <div
                                key={group.id}
                                className={cn(
                                    "flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors",
                                    isFull ? "border-border/30 bg-surface/30 opacity-50" : "border-border/50 bg-surface hover:bg-surface-dark",
                                )}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                                        style={group.color ? { background: `${group.color}30`, color: group.color } : undefined}
                                    >
                                        <Users2 className="size-3.5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold leading-none text-foreground">{group.name}</p>
                                        <p className="mt-0.5 text-[10px] text-text-muted">
                                            {group.members.length}{group.max_members ? `/${group.max_members}` : ""} miembros
                                            {isFull && " · Completo"}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant={isFull ? "outline" : "default"}
                                    disabled={isFull || isPending}
                                    onClick={() => handleJoin(group.id)}
                                    className="h-7 shrink-0 gap-1.5 text-xs"
                                >
                                    {isFull ? "Completo" : <><UserPlus className="size-3" /> Unirse</>}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
