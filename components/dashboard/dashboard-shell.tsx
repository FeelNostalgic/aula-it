"use client";

import { usePathname } from "next/navigation";
import { ActivitySidebar } from "./activity-sidebar";

interface DashboardShellProps {
    children: React.ReactNode;
    appVersion: string;
    appStatus: string;
}

export function DashboardShell({ children, appVersion, appStatus }: DashboardShellProps) {
    const pathname = usePathname();
    const isHome = pathname === "/dashboard";

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
            <main className="flex-1 bg-background overflow-y-auto px-24 py-8 relative">
                {children}
            </main>
        </div>
    );
}
