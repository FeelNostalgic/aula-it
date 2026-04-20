import { ClassBadge, StudentBadge } from "@/types/database";
import { BadgeDisplay } from "./badge-display";
import { Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassBadgesWidgetProps {
    badges: ClassBadge[];
    studentBadges: StudentBadge[];
    isTeacher: boolean;
    onToggle?: () => void;
}

export function ClassBadgesWidget({ badges, studentBadges, isTeacher, onToggle }: ClassBadgesWidgetProps) {
    if (badges.length === 0) return null;

    // Filter hidden badges for students (if they haven't earned them yet)
    // AND only show GLOBAL badges (where activity_id is null)
    // Teachers see everything that is global
    const visibleBadges = badges.filter(b => {
        if (b.activity_id) return false; // Not a global badge
        if (isTeacher) return true;
        if (!b.is_hidden) return true;
        
        // If hidden, student can only see it if they earned it
        const hasEarned = studentBadges.some(sb => sb.badge_id === b.id);
        return hasEarned;
    });

    if (visibleBadges.length === 0) return null;

    return (
        <div className="relative overflow-hidden bg-linear-to-br from-amber-900/18 via-orange-800/14 to-sky-900/12 dark:from-amber-500/18 dark:via-orange-500/12 dark:to-sky-500/12 border border-amber-700/25 dark:border-amber-400/25 rounded-2xl p-6 space-y-4 shadow-[0_10px_35px_-20px_rgba(146,64,14,0.45)] dark:shadow-[0_12px_40px_-20px_rgba(245,158,11,0.25)]">
            <div className="absolute top-0 right-0 w-72 h-72 bg-amber-700/16 dark:bg-amber-500/12 rounded-full blur-3xl -mr-36 -mt-36 pointer-events-none" />
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-sky-600/8 to-transparent dark:via-sky-400/10 pointer-events-none" />
            <div 
                className={cn(
                    "flex items-center gap-3 relative z-10",
                    onToggle && "cursor-pointer group/badges"
                )}
                onClick={onToggle}
            >
                <div className="p-2 rounded-lg bg-amber-700/18 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 group-hover/badges:bg-amber-700/26 dark:group-hover/badges:bg-amber-500/25 transition-colors border border-amber-700/25 dark:border-amber-500/20">
                    <Award className="size-5" />
                </div>
                <div>
                   <h3 className="text-lg font-black text-foreground tracking-tight uppercase group-hover/badges:text-foreground/90 transition-colors flex items-center gap-2">
                       Insignias Globales
                       <span className="size-1 rounded-full bg-accent-amber animate-pulse" />
                   </h3>
                   <p className="text-sm text-text-muted leading-relaxed">
                       {isTeacher ? "Insignias de la unidad didáctica" : "Completa retos especiales para desbloquear estas insignias"}
                   </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2 relative z-10">
                {visibleBadges.map((badge) => {
                    const earnedRecord = studentBadges.find(sb => sb.badge_id === badge.id);
                    return (
                        <BadgeDisplay 
                            key={badge.id}
                            badge={badge}
                            isEarned={!!earnedRecord || isTeacher}
                            earnedAt={earnedRecord?.earned_at}
                            variant="compact"
                        />
                    );
                })}
            </div>
        </div>
    );
}
