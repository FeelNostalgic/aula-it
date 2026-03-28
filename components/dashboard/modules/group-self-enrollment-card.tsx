"use client";

import { useState, useTransition, useEffect } from "react";
import { Users2, UserPlus, UserMinus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    getMyGroupForModule,
    getModuleGroups,
    getModuleGroupsEnrollmentMode,
    studentJoinGroup,
    studentLeaveGroup,
} from "@/app/dashboard/modules/[id]/groups-actions";
import type { ModuleGroupWithMembers, GroupsEnrollmentMode } from "@/types/groups";
import { toast } from "sonner";

interface GroupSelfEnrollmentCardProps {
    moduleId: string;
}

export function GroupSelfEnrollmentCard({ moduleId }: GroupSelfEnrollmentCardProps) {
    const [myGroup, setMyGroup] = useState<ModuleGroupWithMembers | null>(null);
    const [allGroups, setAllGroups] = useState<ModuleGroupWithMembers[]>([]);
    const [mode, setMode] = useState<GroupsEnrollmentMode>("teacher_assigned");
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const load = async () => {
        const [modeRes, myGroupRes, groupsRes] = await Promise.all([
            getModuleGroupsEnrollmentMode(moduleId),
            getMyGroupForModule(moduleId),
            getModuleGroups(moduleId),
        ]);
        setMode(modeRes.mode ?? "teacher_assigned");
        setMyGroup(myGroupRes.group ?? null);
        setAllGroups(groupsRes.groups ?? []);
        setLoading(false);
    };

    useEffect(() => { load(); }, [moduleId]);

    if (loading) return null;

    function handleJoin(groupId: string) {
        startTransition(async () => {
            const res = await studentJoinGroup(groupId);
            if (res.error) { toast.error(res.error); return; }
            toast.success("Te has unido al grupo.");
            await load();
        });
    }

    function handleLeave(groupId: string) {
        startTransition(async () => {
            const res = await studentLeaveGroup(groupId);
            if (res.error) { toast.error(res.error); return; }
            toast.success("Has salido del grupo.");
            await load();
        });
    }

    // ── Grupos cerrados (locked) ──────────────────────────────────────────────
    if (mode === "locked" && !myGroup) {
        return (
            <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Lock className="size-5 text-amber-400" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/70">Grupos cerrados</p>
                    <p className="text-sm text-text-muted">El profesor ha cerrado los grupos. Contacta con él si necesitas ser asignado.</p>
                </div>
            </div>
        );
    }

    // ── Sin grupo, modo teacher_assigned ─────────────────────────────────────
    if (mode === "teacher_assigned" && !myGroup) {
        return (
            <div className="p-4 rounded-2xl border border-border/30 bg-surface-dark flex items-center gap-3">
                <div className="size-9 rounded-xl bg-surface border border-border-subtle flex items-center justify-center shrink-0">
                    <Users2 className="size-5 text-text-muted" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Mi grupo</p>
                    <p className="text-sm text-text-muted">El profesor te asignará a un grupo próximamente.</p>
                </div>
            </div>
        );
    }

    // ── Tengo grupo ──────────────────────────────────────────────────────────
    if (myGroup) {
        const accent = myGroup.color ?? "#6b7280";
        return (
            <div
                className="rounded-2xl border overflow-hidden mb-6"
                style={{ borderColor: `${accent}40` }}
            >
                {/* Cabecera */}
                <div
                    className="flex items-center justify-between gap-3 px-4 py-3"
                    style={{ background: `${accent}18` }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="size-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${accent}30` }}
                        >
                            <Users2 className="size-4" style={{ color: accent }} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Mi grupo</p>
                            <p className="text-sm font-bold text-foreground leading-tight">{myGroup.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] font-mono border-border-subtle text-text-muted">
                            {myGroup.members.length}{myGroup.max_members ? `/${myGroup.max_members}` : ""} miembros
                        </Badge>
                        {mode === "locked" && (
                            <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-400 bg-amber-500/5 gap-1">
                                <Lock className="size-2.5" /> Cerrado
                            </Badge>
                        )}
                        {mode === "self_enrollment" && (
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={isPending}
                                onClick={() => handleLeave(myGroup.id)}
                                className="text-text-muted hover:text-red-400 gap-1.5 text-xs h-7"
                            >
                                <UserMinus className="size-3.5" />
                                Salir
                            </Button>
                        )}
                    </div>
                </div>

                {/* Lista de miembros */}
                <div className="divide-y divide-border-subtle">
                    {myGroup.members.map((m) => {
                        const profile = m.profile as any;
                        const name = profile?.full_name ?? "Alumno";
                        const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                        return (
                            <div key={m.student_id} className="flex items-center gap-3 px-4 py-2.5 bg-surface-dark/40">
                                <Avatar className="size-7 shrink-0">
                                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                                    <AvatarFallback className="text-[10px] font-bold bg-surface">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium text-foreground truncate">{name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── Sin grupo, modo self-enrollment ──────────────────────────────────────
    return (
        <div className="mb-6 p-5 bg-surface-dark border border-white/5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
                <Users2 className="size-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-foreground">Elige tu grupo</h3>
                <Badge variant="outline" className="text-[10px] border-indigo-500/20 text-indigo-400 bg-indigo-500/5 ml-auto">
                    {allGroups.length} grupos disponibles
                </Badge>
            </div>
            {allGroups.length === 0 ? (
                <p className="text-xs text-text-muted">El profesor aún no ha creado grupos para este módulo.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {allGroups.map(group => {
                        const isFull = group.max_members !== null && group.members.length >= group.max_members;
                        return (
                            <div
                                key={group.id}
                                className={cn(
                                    "p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors",
                                    isFull ? "opacity-50 border-border/30 bg-surface/30" : "border-border/50 bg-surface hover:bg-surface-dark"
                                )}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="size-7 rounded-lg flex items-center justify-center shrink-0"
                                        style={group.color ? { background: `${group.color}30`, color: group.color } : undefined}
                                    >
                                        <Users2 className="size-3.5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground leading-none">{group.name}</p>
                                        <p className="text-[10px] text-text-muted mt-0.5">
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
                                    className="gap-1.5 shrink-0 text-xs h-7"
                                >
                                    {isFull ? (
                                        "Completo"
                                    ) : (
                                        <><UserPlus className="size-3" /> Unirse</>
                                    )}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
