"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface UnitNavigationLinkItem {
    href: string;
    icon: LucideIcon;
    label: string;
    match?: string;
    exact?: boolean;
}

export interface UnitNavigationActionItem {
    icon: LucideIcon;
    label: string;
    active?: boolean;
    onClick: () => void;
    accentClassName?: string;
}

interface UnitNavigationRailProps {
    items: UnitNavigationLinkItem[];
    footerItems?: UnitNavigationActionItem[];
    className?: string;
}

export function UnitNavigationRail({ items, footerItems = [], className }: UnitNavigationRailProps) {
    const pathname = usePathname();

    return (
        <aside className={cn("w-[60px] shrink-0 self-stretch border-r border-border/50 bg-background", className)}>
            <div className="flex h-full flex-col items-center gap-3 py-4">
                <TooltipProvider>
                    {items.map((item) => {
                        const Icon = item.icon;
                        const matchTarget = item.match ?? item.href;
                        const isActive = item.exact
                            ? pathname === matchTarget
                            : pathname === matchTarget || pathname.startsWith(`${matchTarget}/`);

                        return (
                            <Tooltip key={item.href}>
                                <TooltipTrigger asChild>
                                    <Button
                                        asChild
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "relative size-10 rounded-xl transition-all duration-300",
                                            isActive
                                                ? "bg-accent-blue/10 text-accent-blue shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                                                : "text-text-muted hover:bg-accent/10 hover:text-foreground"
                                        )}
                                    >
                                        <Link href={item.href}>
                                            <Icon className="size-5" />
                                            {isActive && (
                                                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent-blue shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                                            )}
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    {item.label}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}

                    {footerItems.length > 0 && (
                        <div className="mt-auto flex flex-col gap-3">
                            {footerItems.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <Tooltip key={item.label}>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                onClick={item.onClick}
                                                className={cn(
                                                    "relative flex size-10 items-center justify-center rounded-xl transition-all duration-300",
                                                    item.active
                                                        ? item.accentClassName ?? "bg-accent-blue/10 text-accent-blue shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                                                        : "text-text-muted hover:bg-accent/10 hover:text-foreground"
                                                )}
                                            >
                                                <Icon className="size-5" />
                                                {item.active && (
                                                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-current shadow-[0_0_8px_currentColor]" />
                                                )}
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                            {item.label}
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    )}
                </TooltipProvider>
            </div>
        </aside>
    );
}
