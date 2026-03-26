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
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-4 shadow-sm">
            <div 
                className={cn(
                    "flex items-center gap-3",
                    onToggle && "cursor-pointer group/badges"
                )}
                onClick={onToggle}
            >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0 group-hover/badges:bg-amber-500/20 transition-colors">
                    <Award className="size-5" />
                </div>
                <div>
                   <h3 className="text-lg font-black text-foreground tracking-tight uppercase group-hover/badges:text-foreground/90 transition-colors">
                       Insignias Globales
                   </h3>
                   <p className="text-sm text-text-muted leading-relaxed">
                       {isTeacher ? "Insignias de la unidad didáctica" : "Completa retos especiales para desbloquear estas insignias"}
                   </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
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
