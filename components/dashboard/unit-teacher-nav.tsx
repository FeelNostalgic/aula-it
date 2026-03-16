"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    BookOpen,
    GraduationCap,
    FolderOpen,
    CheckCircle,
    Award,
    Settings
} from "lucide-react";

interface UnitTeacherNavProps {
    unitId: string;
}

export function UnitTeacherNav({ unitId }: UnitTeacherNavProps) {
    const pathname = usePathname();

    const links = [
        {
            href: `/dashboard/units/${unitId}/retos`,
            label: "RETOS",
            icon: BookOpen,
            match: `/dashboard/units/${unitId}/retos`
        },
        {
            href: `/units/${unitId}/map`,
            label: "MAPA",
            icon: GraduationCap,
            match: `/units/${unitId}/map`
        },
        {
            href: `/dashboard/units/${unitId}/recursos`,
            label: "RECURSOS",
            icon: FolderOpen,
            match: `/dashboard/units/${unitId}/recursos`
        },
        {
            href: `/dashboard/units/${unitId}/evaluacion`,
            label: "EVALUACIÓN",
            icon: CheckCircle,
            match: `/dashboard/units/${unitId}/evaluacion`
        },
        {
            href: `/dashboard/units/${unitId}/hitos`,
            label: "HITO",
            icon: CheckCircle, // Reusing icon based on current UI
            match: `/dashboard/units/${unitId}/hitos`
        },
        {
            href: `/dashboard/units/${unitId}/insignias`,
            label: "INSIGNIAS",
            icon: Award,
            match: `/dashboard/units/${unitId}/insignias`
        },
        {
            href: `/dashboard/units/${unitId}/configuracion`,
            label: "CONFIGURACIÓN",
            icon: Settings,
            match: `/dashboard/units/${unitId}/configuracion`
        }
    ];

    return (
        <div className="px-12 mb-6">
            <nav className="bg-surface border border-border-subtle rounded-lg p-1 h-auto inline-flex max-w-full justify-start overflow-x-auto">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.match || pathname.startsWith(link.match + '/');
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 rounded-md shrink-0 flex items-center transition-all duration-200",
                                isActive
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-text-muted hover:text-foreground hover:bg-white/5"
                            )}
                        >
                            <Icon className="mr-2 size-3.5" />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
