"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui-store";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

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
    const { isSidebarOpen, toggleSidebar } = useUIStore();

    return (
        <aside className={cn(
            "shrink-0 self-stretch border-r border-border/50 bg-background transition-all duration-300 ease-in-out relative z-30 flex flex-col",
            isSidebarOpen ? "w-[200px]" : "w-[64px]",
            className
        )}>
            <div className="flex h-full flex-col gap-2 py-4 px-3 overflow-hidden w-full">
                
                <div className="w-full flex mb-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className={cn(
                            "transition-all duration-300 ease-in-out text-text-muted hover:bg-accent/10 hover:text-foreground size-10 shrink-0",
                            isSidebarOpen ? "ml-auto rounded-lg" : "mx-auto rounded-xl"
                        )}
                    >
                        {isSidebarOpen ? (
                            <PanelLeftClose className="size-5" />
                        ) : (
                            <PanelLeftOpen className="size-5" />
                        )}
                    </Button>
                </div>

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
                                        className={cn(
                                            "relative flex items-center justify-start h-10 w-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out",
                                            isSidebarOpen ? "rounded-lg px-3" : "rounded-xl px-3",
                                            isActive
                                                ? "bg-accent-blue/10 text-accent-blue shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                                                : "text-text-muted hover:bg-accent/10 hover:text-foreground"
                                        )}
                                    >
                                        <Link
                                            href={item.href}
                                            aria-label={item.label}
                                            title={!isSidebarOpen ? item.label : undefined}
                                            data-state={isActive ? "active" : "inactive"}
                                            aria-current={isActive ? "page" : undefined}
                                            className="w-full flex items-center"
                                        >
                                            <Icon className="shrink-0 size-5" />
                                            <span className={cn(
                                                "font-medium whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden flex-1 text-left",
                                                isSidebarOpen ? "opacity-100 max-w-[150px] ml-3 translate-x-0" : "opacity-0 max-w-0 ml-0 -translate-x-2"
                                            )}>
                                                {item.label}
                                            </span>
                                            {isActive && (
                                                <span className={cn(
                                                    "absolute top-1/2 h-5 w-1 -translate-y-1/2 bg-accent-blue shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all duration-300 ease-in-out",
                                                    isSidebarOpen ? "left-0 rounded-r-full" : "left-0 rounded-r-full"
                                                )} />
                                            )}
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                {!isSidebarOpen && (
                                    <TooltipContent side="right">
                                        {item.label}
                                    </TooltipContent>
                                )}
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
                                                aria-label={item.label}
                                                title={!isSidebarOpen ? item.label : undefined}
                                                data-state={item.active ? "active" : "inactive"}
                                                className={cn(
                                                    "relative flex items-center justify-start h-10 w-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out",
                                                    isSidebarOpen ? "rounded-lg px-3" : "rounded-xl px-3",
                                                    item.active
                                                        ? item.accentClassName ?? "bg-accent-blue/10 text-accent-blue shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                                                        : "text-text-muted hover:bg-accent/10 hover:text-foreground"
                                                )}
                                            >
                                                <div className="w-full flex items-center">
                                                    <Icon className="shrink-0 size-5" />
                                                    <span className={cn(
                                                        "font-medium whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden flex-1 text-left",
                                                        isSidebarOpen ? "opacity-100 max-w-[150px] ml-3 translate-x-0" : "opacity-0 max-w-0 ml-0 -translate-x-2"
                                                    )}>
                                                        {item.label}
                                                    </span>
                                                </div>
                                                {item.active && (
                                                    <span className={cn(
                                                        "absolute top-1/2 h-5 w-1 -translate-y-1/2 bg-current shadow-[0_0_8px_currentColor] transition-all duration-300 ease-in-out",
                                                        isSidebarOpen ? "left-0 rounded-r-full" : "left-0 rounded-r-full"
                                                    )} />
                                                )}
                                            </button>
                                        </TooltipTrigger>
                                        {!isSidebarOpen && (
                                            <TooltipContent side="right">
                                                {item.label}
                                            </TooltipContent>
                                        )}
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
