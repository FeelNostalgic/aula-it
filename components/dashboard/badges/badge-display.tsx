import { ClassBadge } from "@/types/database";
import { cn } from "@/lib/utils";
import { Award, Lock, CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BadgeDisplayProps {
  badge: ClassBadge;
  isEarned: boolean;
  earnedAt?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'icon';
}

export function BadgeDisplay({ 
  badge, 
  isEarned, 
  earnedAt, 
  className,
  variant = 'default' 
}: BadgeDisplayProps) {
  const formattedDate = earnedAt 
    ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(earnedAt)) 
    : null;

  const isCompact = variant === 'compact';
  const isIcon = variant === 'icon';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {isIcon ? (
            <div className={cn("relative inline-flex items-center justify-center cursor-help shrink-0", className)}>
              {badge.icon_url ? (
                <img
                  src={badge.icon_url}
                  alt={badge.title}
                  className={cn("h-4 w-4 object-contain", !isEarned && "opacity-40 grayscale")}
                />
              ) : (
                <Award className={cn("h-4 w-4", isEarned ? "text-amber-500" : "text-text-muted/40")} />
              )}
              {!isEarned && (
                <Lock className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 text-text-muted/60" />
              )}
            </div>
          ) : (
          <div
            className={cn(
              "relative flex flex-col items-center justify-center transition-all duration-300",
              !isCompact && "p-3 rounded-xl border",
              !isCompact && (isEarned
                ? "bg-amber-500/10 border-amber-500/30 shadow-sm hover:shadow-md hover:border-amber-500/50"
                : "bg-surface border-dashed border-border-subtle opacity-70 grayscale"),
              isCompact && "cursor-help",
              className
            )}
          >
            <div className={cn(
                  "relative flex items-center justify-center rounded-full transition-all",
                  isCompact && badge.icon_url ? "" : isCompact ? "h-10 w-10 bg-surface/80 border border-border-subtle" : "h-14 w-14 bg-background shadow-inner mb-2",
                  !isEarned && isCompact && "opacity-40 grayscale"
            )}>
              {badge.icon_url ? (
                <img
                  src={badge.icon_url}
                  alt={badge.title}
                  className={cn(
                    "object-contain drop-shadow-sm",
                    isCompact ? "h-8 w-8" : "h-10 w-10"
                  )}
                />
              ) : (
                <Award className={cn(isCompact ? "h-5 w-5" : "h-8 w-8", isEarned ? "text-amber-500" : "text-text-muted")} />
              )}

              {!isEarned && (
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center bg-background/60 rounded-full backdrop-blur-[1px]",
                  isCompact && "bg-transparent backdrop-blur-0"
                )}>
                  <Lock className={cn(isCompact ? "h-3.5 w-3.5" : "h-5 w-5", "text-text-muted/60")} />
                </div>
              )}
            </div>

            {!isCompact && (
              <p className={cn(
                  "text-xs font-bold text-center leading-tight line-clamp-2 uppercase tracking-tighter",
                  isEarned ? "text-amber-600 dark:text-amber-400" : "text-text-muted"
              )}>
                {badge.title}
              </p>
            )}
          </div>
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-64 p-3 gap-2 flex flex-col bg-surface-dark border-border-strong text-foreground shadow-2xl z-100">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-black text-sm text-foreground uppercase tracking-tight leading-none">{badge.title}</p>
              {badge.description && (
                <p className="text-xs text-text-muted leading-relaxed">
                  {badge.description}
                </p>
              )}
            </div>
            {badge.xp_reward ? (
              <div className="shrink-0 bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 text-[10px] font-black">
                +{badge.xp_reward} XP
              </div>
            ) : null}
          </div>
          
          <div className="border-t border-border-strong/50 pt-2 mt-1">
             {isEarned ? (
                <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3" /> Conseguida {formattedDate ? `el ${formattedDate}` : ''}
                </p>
             ) : (
                 <p className="text-[10px] text-text-muted font-bold flex items-center gap-1.5 opacity-70">
                   <Lock className="h-3 w-3" /> Bloqueada
                 </p>
             )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
