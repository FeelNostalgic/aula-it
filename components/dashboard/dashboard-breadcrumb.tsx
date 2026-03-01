"use client";

import Link from "next/link";
import { useBreadcrumb } from "./breadcrumb-context";

export function DashboardBreadcrumb() {
    const { segments } = useBreadcrumb();

    return (
        <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2 group cursor-pointer transition-opacity hover:opacity-80">
                <div className="size-8 bg-primary rounded-md flex items-center justify-center">
                    <span className="font-bold text-white text-xs tracking-tighter">AIT</span>
                </div>
            </Link>

            <div className="flex items-center gap-1.5 font-mono text-xs font-medium">
                <span className="text-muted-foreground">root /</span>
                {segments.length === 0 ? (
                    <span className="text-foreground font-bold">Inicio</span>
                ) : (
                    <>
                        <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                            Inicio
                        </Link>
                        {segments.map((segment, i) => (
                            <span key={i} className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">/</span>
                                {segment.href && i < segments.length - 1 ? (
                                    <Link href={segment.href} className="text-muted-foreground hover:text-primary transition-colors">
                                        {segment.label}
                                    </Link>
                                ) : (
                                    <span className="text-foreground font-bold">{segment.label}</span>
                                )}
                            </span>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
