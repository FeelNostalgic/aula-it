"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui-store";
import { UnitNavigationRail } from "@/components/dashboard/units/unit-navigation-rail";
import { BookOpen, Users } from "lucide-react";

interface DashboardShellProps {
    children: React.ReactNode;
    appVersion: string;
    appStatus: string;
    isTeacher?: boolean;
}

export function DashboardShell({ children, appVersion, appStatus, isTeacher = false }: DashboardShellProps) {
    const pathname = usePathname();
    const { isFullscreen } = useUIStore();
    // Global sidebar should only display on standard layout pages (/dashboard or /alumnos)
    const showSidebar = pathname === "/dashboard" || pathname.startsWith("/alumnos");

    const navItems = [
        {
            label: "Módulos",
            icon: BookOpen,
            href: "/dashboard",
            visible: true
        },
        {
            label: "Gestión de alumnos",
            icon: Users,
            href: "/alumnos",
            visible: isTeacher
        }
    ].filter(item => item.visible);

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Global navigation rail */}
            {showSidebar && (
                <UnitNavigationRail items={navItems} />
            )}

            {/* Main Content Area */}
            <main className={cn(
                "flex-1 bg-background relative",
                isFullscreen ? "overflow-hidden p-0" : "overflow-y-auto px-24 py-8"
            )}>
                {children}
            </main>
        </div>
    );
}
