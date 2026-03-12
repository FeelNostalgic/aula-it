"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown, Star, Target, Shield, Skull, Sword, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
    student_id: string;
    display_name: string;
    avatar_url: string | null;
    module_xp: number;
    rank_position: number;
    rank_letter: string;
}

export function ModuleLeaderboard({ moduleId, userRole }: { moduleId: string, userRole: "teacher" | "student" }) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
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
                setEntries(data || []);
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

    const rankColors: Record<string, string> = {
        'S': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
        'A': 'text-purple-400 bg-purple-400/10 border-purple-400/30',
        'B': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
        'C': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
        'D': 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30',
        'E': 'text-orange-400 bg-orange-400/10 border-orange-400/30',
        'F': 'text-red-400 bg-red-400/10 border-red-400/30',
    };

    // Calculate what to show
    let visibleEntries = entries;
    
    // For students, we show Top 3 + Neighborhood (me, me-1, me+1)
    if (userRole === 'student') {
        const myIndex = entries.findIndex(e => e.student_id === currentUserId);
        
        const top3 = entries.slice(0, 3);
        let neighborhood: LeaderboardEntry[] = [];
        
        if (myIndex !== -1 && myIndex >= 3) {
            // Include me-1, me, me+1 (but don't go out of bounds)
            const start = Math.max(3, myIndex - 1);
            const end = Math.min(entries.length, myIndex + 2);
            neighborhood = entries.slice(start, end);
        }
        
        // Merge without duplicates (just in case) and add a spacer marker if needed
        visibleEntries = [...top3];
        if (neighborhood.length > 0 && neighborhood[0].rank_position > 4) {
            // Add a spacer item
            visibleEntries.push({ student_id: 'spacer', display_name: '...', avatar_url: null, module_xp: 0, rank_position: 0, rank_letter: '' });
        }
        visibleEntries = [...visibleEntries, ...neighborhood];
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

            <Card className="bg-surface-dark/40 border-border/40 backdrop-blur-sm overflow-hidden">
                <div className="p-1">
                    {visibleEntries.map((entry, idx) => {
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
                        const isTop3 = entry.rank_position <= 3;
                        
                        return (
                            <div 
                                key={entry.student_id}
                                className={cn(
                                    "flex items-center gap-4 p-4 rounded-xl mb-1 transition-all duration-300",
                                    isMe ? "bg-primary/5 border border-primary/20 shadow-sm" : "hover:bg-surface border border-transparent",
                                    isTop3 && !isMe ? "bg-surface/50" : ""
                                )}
                            >
                                <div className="w-8 text-center font-black text-xl tracking-tighter opacity-50">
                                    {entry.rank_position === 1 ? <Crown className="size-6 text-yellow-400 mx-auto" /> : 
                                     entry.rank_position === 2 ? <Medal className="size-6 text-slate-300 mx-auto" /> : 
                                     entry.rank_position === 3 ? <Medal className="size-6 text-amber-600 mx-auto" /> : 
                                     `#${entry.rank_position}`}
                                </div>
                                
                                <Avatar className={cn(
                                    "size-12 border-2",
                                    isMe ? "border-primary" : "border-background",
                                    entry.rank_position === 1 && "ring-2 ring-yellow-400 ring-offset-2 ring-offset-background"
                                )}>
                                    <AvatarImage src={entry.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${entry.display_name}`} />
                                    <AvatarFallback><User className="size-4"/></AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className={cn(
                                            "font-bold truncate",
                                            isMe ? "text-primary" : "text-foreground"
                                        )}>
                                            {entry.display_name}
                                        </p>
                                        {isMe && <Badge className="h-4 px-1.5 text-[9px] bg-primary/20 text-primary border-none">TÚ</Badge>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="outline" className={cn(
                                            "h-5 px-2 text-[10px] font-black uppercase tracking-widest border",
                                            rankColors[entry.rank_letter] || rankColors['F']
                                        )}>
                                            RANGO {entry.rank_letter}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="font-black text-lg tracking-tighter">{entry.module_xp.toLocaleString()}</p>
                                    <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest">XP</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
