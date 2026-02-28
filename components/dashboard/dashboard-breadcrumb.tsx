"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useBreadcrumb } from "./breadcrumb-context";

export function DashboardBreadcrumb() {
    const { segments } = useBreadcrumb();

    return (
        <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2 group cursor-pointer transition-opacity hover:opacity-80">
                <div className="size-8 bg-primary rounded-md flex items-center justify-center">
                    <span className="font-bold text-white text-xs tracking-tighter">AIT</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs font-medium">
                    <span className="text-muted-foreground group-hover:text-primary transition-colors">root /</span>
                    {segments.length === 0 ? (
                        <span className="text-foreground font-bold">Inicio</span>
                    ) : (
                        <span className="text-muted-foreground group-hover:text-primary transition-colors">Inicio</span>
                    )}
                </div>
            </Link>

            {segments.map((segment, i) => (
                <div key={i} className="flex items-center gap-2 font-mono text-xs font-medium">
                    <ChevronRight className="size-3 text-muted-foreground" />
                    {segment.href ? (
                        <Link href={segment.href} className="text-muted-foreground hover:text-primary transition-colors">
                            {segment.label}
                        </Link>
                    ) : (
                        <span className="text-foreground font-bold">{segment.label}</span>
                    )}
                </div>
            ))}
        </div>
    );
}
