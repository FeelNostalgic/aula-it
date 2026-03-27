"use client";

import { useState, useTransition, useEffect } from "react";
import { Users2, UserPlus, CheckCircle2, UserMinus } from "lucide-react";
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
import type { ModuleGroupWithMembers } from "@/types/groups";
import { toast } from "sonner";

interface GroupSelfEnrollmentCardProps {
    moduleId: string;
}

export function GroupSelfEnrollmentCard({ moduleId }: GroupSelfEnrollmentCardProps) {
    const [myGroup, setMyGroup] = useState<ModuleGroupWithMembers | null>(null);
    const [allGroups, setAllGroups] = useState<ModuleGroupWithMembers[]>([]);
    const [isSelfEnrollment, setIsSelfEnrollment] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const load = async () => {
        const [modeRes, myGroupRes, groupsRes] = await Promise.all([
            getModuleGroupsEnrollmentMode(moduleId),
            getMyGroupForModule(moduleId),
            getModuleGroups(moduleId),
        ]);
        const mode = modeRes.mode ?? "teacher_assigned";
        setIsSelfEnrollment(mode === "self_enrollment");
        setMyGroup(myGroupRes.group ?? null);
        setAllGroups(groupsRes.groups ?? []);
        setLoading(false);
    };

    useEffect(() => { load(); }, [moduleId]);

    // Don't render anything if teacher_assigned mode and no group yet
    if (loading) return null;
    if (!isSelfEnrollment && !myGroup) return null;

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

    // ── Tengo grupo ──────────────────────────────────────────────────────────
    if (myGroup) {
        const colorStyle = myGroup.color ? { background: `${myGroup.color}20`, borderColor: `${myGroup.color}40` } : undefined;
        return (
            <div
                className="p-4 rounded-2xl border flex items-center justify-between gap-4 mb-6"
                style={colorStyle ?? undefined}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="size-9 rounded-xl flex items-center justify-center shrink-0"
                        style={myGroup.color ? { background: `${myGroup.color}30` } : undefined}
                    >
                        <Users2 className="size-5" style={myGroup.color ? { color: myGroup.color } : undefined} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Mi grupo</p>
                        <p className="text-sm font-bold text-foreground">{myGroup.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                        {myGroup.members.slice(0, 5).map(m => (
                            <Avatar key={m.id} className="size-7 border-2 border-background">
                                <AvatarImage src={(m.profile as any)?.avatar_url ?? undefined} />
                                <AvatarFallback className="text-[10px] font-bold">
                                    {((m.profile as any)?.full_name ?? "?")[0]}
                                </AvatarFallback>
                            </Avatar>
                        ))}
                        {myGroup.members.length > 5 && (
                            <div className="size-7 rounded-full border-2 border-background bg-surface flex items-center justify-center text-[10px] font-bold text-text-muted">
                                +{myGroup.members.length - 5}
                            </div>
                        )}
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                        {myGroup.members.length}{myGroup.max_members ? `/${myGroup.max_members}` : ""} miembros
                    </Badge>
                    {isSelfEnrollment && (
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleLeave(myGroup.id)}
                            className="text-text-muted hover:text-red-400 gap-1.5 text-xs"
                        >
                            <UserMinus className="size-3.5" />
                            Salir
                        </Button>
                    )}
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
