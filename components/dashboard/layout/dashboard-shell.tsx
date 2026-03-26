"use client";

import { usePathname } from "next/navigation";
import { ActivitySidebar } from "@/components/dashboard/activities/activity-sidebar";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui-store";

interface DashboardShellProps {
    children: React.ReactNode;
    appVersion: string;
    appStatus: string;
    isTeacher?: boolean;
}

export function DashboardShell({ children, appVersion, appStatus }: DashboardShellProps) {
    const pathname = usePathname();
    const isHome = pathname === "/dashboard";
    const { isFullscreen } = useUIStore();

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Activity Sidebar — only on dashboard home */}
            {isHome && (
                <ActivitySidebar
                    appVersion={appVersion}
                    appStatus={appStatus}
                />
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
