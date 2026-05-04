"use client";

import Link from "next/link";
import { useBreadcrumb } from "./breadcrumb-context";

const SEGMENT_LABEL_CLASS = "block max-w-[18ch] truncate sm:max-w-[24ch] lg:max-w-[32ch]";

export function DashboardBreadcrumb() {
    const { segments } = useBreadcrumb();

    return (
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <Link href="/dashboard" className="flex items-center gap-2 group cursor-pointer transition-opacity hover:opacity-80">
                <div className="size-8 bg-primary rounded-md flex items-center justify-center">
                    <span className="font-bold text-white text-xs tracking-tighter">AIT</span>
                </div>
            </Link>

            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap font-mono text-xs font-medium">
                <span className="shrink-0 text-muted-foreground">root /</span>
                {segments.length === 0 ? (
                    <span className="text-foreground font-bold">Inicio</span>
                ) : (
                    <>
                        <Link href="/dashboard" className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                            Inicio
                        </Link>
                        {segments.map((segment, i) => (
                            <span key={i} className="flex min-w-0 items-center gap-1.5">
                                <span className="shrink-0 text-muted-foreground">/</span>
                                {segment.href && i < segments.length - 1 ? (
                                    <Link
                                        href={segment.href}
                                        title={segment.label}
                                        className="min-w-0 text-muted-foreground transition-colors hover:text-primary"
                                    >
                                        <span className={SEGMENT_LABEL_CLASS}>
                                            {segment.label}
                                        </span>
                                    </Link>
                                ) : (
                                    <span title={segment.label} className="min-w-0 text-foreground font-bold">
                                        <span className={SEGMENT_LABEL_CLASS}>
                                            {segment.label}
                                        </span>
                                    </span>
                                )}
                            </span>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
