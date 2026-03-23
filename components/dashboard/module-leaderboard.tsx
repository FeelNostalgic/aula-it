"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { RankBadge } from "@/components/dashboard/rank-badge";
import { BadgeDisplay } from "@/components/dashboard/badge-display";
import type { ClassBadge } from "@/types/database";

interface LeaderboardEntry {
    student_id: string;
    display_name: string;
    avatar_url: string | null;
    module_xp: number;
    rank_position: number;
    rank_letter: string;
}

function PodiumBlock({ entry, position, isMe, badges }: { entry: LeaderboardEntry; position: 1 | 2 | 3; isMe: boolean; badges: ClassBadge[] }) {
    const config = {
        1: {
            blockHeight: "h-20",
            avatarSize: "size-16",
            borderColor: "border-amber-400/50",
            bgColor: "bg-amber-400/5",
            textColor: "text-amber-400",
            icon: <Crown className="size-5 text-amber-400" />,
        },
        2: {
            blockHeight: "h-12",
            avatarSize: "size-12",
            borderColor: "border-slate-300/50",
            bgColor: "bg-slate-300/5",
            textColor: "text-slate-300",
            icon: <Medal className="size-4 text-slate-300" />,
        },
        3: {
            blockHeight: "h-8",
            avatarSize: "size-12",
            borderColor: "border-amber-700/50",
            bgColor: "bg-amber-700/5",
            textColor: "text-amber-700",
            icon: <Medal className="size-4 text-amber-700" />,
        },
    }[position];

    return (
        <div className="flex flex-col items-center gap-2 flex-1">
            {config.icon}
            <Avatar className={cn(
                "border-2",
                config.avatarSize,
                config.borderColor,
                isMe && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}>
                <AvatarImage src={entry.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${entry.display_name}`} />
                <AvatarFallback><User className="size-4" /></AvatarFallback>
            </Avatar>
            <div className="text-center">
                <p className={cn("text-xs font-bold truncate max-w-[90px]", isMe ? "text-primary" : "text-foreground")}>
                    {entry.display_name}
                </p>
                <p className="text-[10px] text-text-muted font-mono">{entry.module_xp.toLocaleString()} XP</p>
            </div>
            <RankBadge rank={entry.rank_letter} />
            {badges.length > 0 && (
                <div className="flex items-center justify-center flex-wrap gap-1 max-w-[100px]">
                    {badges.slice(0, 5).map(b => (
                        <BadgeDisplay key={b.id} badge={b} isEarned variant="compact" />
                    ))}
                </div>
            )}
            <div className={cn(
                "w-full rounded-t-xl border-t border-x flex items-center justify-center",
                config.blockHeight, config.bgColor, config.borderColor
            )}>
                <span className={cn("text-2xl font-black", config.textColor)}>#{position}</span>
            </div>
        </div>
    );
}

export function ModuleLeaderboard({ moduleId, userRole }: { moduleId: string; userRole: "teacher" | "student" }) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [badgeMap, setBadgeMap] = useState<Map<string, ClassBadge[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        async function fetchLeaderboard() {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) setCurrentUserId(user.id);

                const { data, error } = await supabase
                    .rpc('get_module_leaderboard', { p_module_id: moduleId });

                if (error) throw error;
                const leaderboardData: LeaderboardEntry[] = data || [];
                setEntries(leaderboardData);

                // Fetch earned badges with full details
                if (leaderboardData.length > 0) {
                    const studentIds = leaderboardData.map(e => e.student_id);
                    const { data: units } = await supabase
                        .from('units').select('id').eq('module_id', moduleId);
                    const unitIds = (units || []).map((u: { id: string }) => u.id);

                    if (unitIds.length > 0) {
                        const { data: earnedBadges } = await supabase
                            .from('student_badges')
                            .select('student_id, earned_at, class_badges!inner(id, title, description, icon_url, xp_reward, is_hidden, unit_id, activity_id, step_id, condition_payload, created_at, updated_at)')
                            .in('student_id', studentIds)
                            .in('class_badges.unit_id', unitIds)
                            .order('earned_at', { ascending: false });

                        const map = new Map<string, ClassBadge[]>();
                        (earnedBadges || []).forEach((row: any) => {
                            const badge = row.class_badges as ClassBadge;
                            if (!badge) return;
                            const list = map.get(row.student_id) || [];
                            list.push(badge);
                            map.set(row.student_id, list);
                        });
                        setBadgeMap(map);
                    }
                }
            } catch (err) {
                console.error("Error fetching leaderboard:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchLeaderboard();
    }, [moduleId, supabase]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <Card className="bg-surface-dark border-border-subtle border-dashed p-12 text-center flex flex-col items-center gap-4">
                <div className="size-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
                    <Trophy className="size-6 text-accent-blue" />
                </div>
                <div className="space-y-1">
                    <h3 className="font-bold text-foreground">Ranking Vacío</h3>
                    <p className="text-xs text-text-muted">
                        Aún no hay alumnos inscritos con experiencia en este módulo.
                    </p>
                </div>
            </Card>
        );
    }

    // Podium: top 3
    const podiumEntries = entries.slice(0, 3);
    const [first, second, third] = [podiumEntries[0], podiumEntries[1], podiumEntries[2]];

    // List: from #4 onwards (or neighborhood for students)
    let listEntries = entries.slice(3);

    if (userRole === 'student') {
        const myIndex = entries.findIndex(e => e.student_id === currentUserId);
        if (myIndex !== -1 && myIndex >= 3) {
            const start = Math.max(3, myIndex - 2);
            const end = Math.min(entries.length, myIndex + 3);
            const neighborhood = entries.slice(start, end);

            listEntries = [];
            if (neighborhood.length > 0 && neighborhood[0].rank_position > 4) {
                listEntries.push({ student_id: 'spacer', display_name: '...', avatar_url: null, module_xp: 0, rank_position: 0, rank_letter: '' });
            }
            listEntries = [...listEntries, ...neighborhood];
        } else {
            listEntries = entries.slice(3, 6); // Show a few below podium
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Trophy className="size-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-black tracking-tight uppercase">Leaderboard</h2>
                    <p className="text-xs text-text-muted">Ranking de clase basado en Experiencia (XP)</p>
                </div>
            </div>

            {/* Podium */}
            {podiumEntries.length >= 2 && (
                <div className="flex items-end gap-3 px-4 pt-6">
                    {second && <PodiumBlock entry={second} position={2} isMe={second.student_id === currentUserId} badges={badgeMap.get(second.student_id) || []} />}
                    {first && <PodiumBlock entry={first} position={1} isMe={first.student_id === currentUserId} badges={badgeMap.get(first.student_id) || []} />}
                    {third && <PodiumBlock entry={third} position={3} isMe={third.student_id === currentUserId} badges={badgeMap.get(third.student_id) || []} />}
                </div>
            )}

            {/* List from #4 */}
            {listEntries.length > 0 && (
                <Card className="bg-surface-dark/40 border-border/40 backdrop-blur-sm overflow-hidden">
                    <div className="p-1">
                        {listEntries.map((entry, idx) => {
                            if (entry.student_id === 'spacer') {
                                return (
                                    <div key="spacer" className="flex items-center justify-center py-4 opacity-50">
                                        <div className="flex gap-2">
                                            <div className="size-1.5 rounded-full bg-border-strong" />
                                            <div className="size-1.5 rounded-full bg-border-strong" />
                                            <div className="size-1.5 rounded-full bg-border-strong" />
                                        </div>
                                    </div>
                                );
                            }

                            const isMe = entry.student_id === currentUserId;
                            const studentBadges = badgeMap.get(entry.student_id) || [];

                            return (
                                <div
                                    key={entry.student_id}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl mb-1 transition-all duration-300 border",
                                        isMe
                                            ? "bg-primary/5 border-primary/20 shadow-sm"
                                            : idx % 2 === 0
                                                ? "border-transparent hover:bg-blue-500/10"
                                                : "bg-muted border-transparent hover:bg-blue-500/10"
                                    )}
                                >
                                    <div className="w-8 text-center font-black text-sm tracking-tighter text-text-muted">
                                        #{entry.rank_position}
                                    </div>

                                    <Avatar className={cn(
                                        "size-10 border-2",
                                        isMe ? "border-primary" : "border-background"
                                    )}>
                                        <AvatarImage src={entry.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${entry.display_name}`} />
                                        <AvatarFallback><User className="size-4" /></AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={cn("font-bold truncate text-sm", isMe ? "text-primary" : "text-foreground")}>
                                                {entry.display_name}
                                            </p>
                                            {isMe && <Badge className="h-4 px-1.5 text-[9px] bg-primary/20 text-primary border-none">TÚ</Badge>}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <RankBadge rank={entry.rank_letter} />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-right">
                                        {studentBadges.length > 0 && (
                                            <div className="flex items-center gap-0.5 flex-wrap justify-end max-w-[80px]">
                                                {studentBadges.slice(0, 4).map(b => (
                                                    <BadgeDisplay key={b.id} badge={b} isEarned variant="compact" />
                                                ))}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-black text-base tracking-tighter">{entry.module_xp.toLocaleString()}</p>
                                            <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest">XP</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
}
