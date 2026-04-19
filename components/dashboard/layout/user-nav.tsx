"use client";

import { APP_VERSION, APP_STATUS } from "@/lib/version";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
    Bell,
    Settings,
    LogOut,
    Monitor,
    Moon,
    Sun,
    Check,
    Users,
    CircleX,
    TriangleAlert,
} from "lucide-react";
import { pingActiveDay } from "@/app/dashboard/actions";
import { LevelBadge } from "@/components/dashboard/badges/level-badge";
import NextLink from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logout } from "@/app/(auth)/login/actions";
import { Separator } from "@/components/ui/separator";
import {
    DRIVE_CONNECTION_STATUS,
    getDriveConnectionStatusMeta,
    isDriveConnectionStatus,
    type DriveConnectionStatus,
} from "@/lib/drive-connection-status";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface UserNavProps {
    userEmail: string;
    userName: string;
    isTeacher: boolean;
    isAdmin?: boolean;
    userId: string;
    userAvatar?: string;
    driveStatus?: DriveConnectionStatus;
}

export function UserNav({ userEmail, userName, isTeacher, isAdmin, userId, userAvatar, driveStatus }: UserNavProps) {
    const { setTheme, theme } = useTheme();
    const isStudent = !isTeacher && !isAdmin;
    const [currentDriveStatus, setCurrentDriveStatus] = useState<DriveConnectionStatus | null>(driveStatus ?? null);

    useEffect(() => {
        if (isStudent) {
            pingActiveDay();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (isTeacher && driveStatus) {
            setCurrentDriveStatus(driveStatus);
        }
    }, [driveStatus, isTeacher]);

    useEffect(() => {
        if (!isTeacher) {
            return;
        }

        const controller = new AbortController();

        async function loadDriveStatus() {
            try {
                const response = await fetch("/api/drive/status", {
                    cache: "no-store",
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`Drive status request failed with ${response.status}`);
                }

                const data: { status?: unknown } = await response.json();
                if (!controller.signal.aborted) {
                    setCurrentDriveStatus(
                        isDriveConnectionStatus(data.status)
                            ? data.status
                            : DRIVE_CONNECTION_STATUS.DISCONNECTED
                    );
                }
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                console.error("[UserNav] drive status fetch failed", error);
                setCurrentDriveStatus((previousStatus) => previousStatus ?? DRIVE_CONNECTION_STATUS.DISCONNECTED);
            }
        }

        void loadDriveStatus();

        return () => {
            controller.abort();
        };
    }, [isTeacher]);

    return (
        <div className="flex items-center gap-4">
            {/*App version */}
            <div className="hidden md:flex bg-muted/30 px-2 py-1 rounded text-[10px] uppercase font-mono tracking-widest text-muted-foreground border border-border/50">
               BUILD_ID: {APP_VERSION} ({APP_STATUS})
            </div>
            
            {/* Vertical Separator */}
            <Separator orientation="vertical" className="h-6 bg-border/50" />

            {/* Student gamification badges */}
            {isStudent && <LevelBadge />}

            <div className="flex items-center gap-2">
                {isTeacher && (
                    <DriveStatusIndicator status={currentDriveStatus} />
                )}

                {/* Profile Section with Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div data-testid="user-nav-trigger" suppressHydrationWarning className="flex items-center gap-3 cursor-pointer group hover:bg-accent/10 p-1 pr-2 rounded-lg transition-colors">
                            <div className="flex flex-col items-end text-right">
                                <span className="text-sm font-bold text-foreground">
                                    {isTeacher ? `Prof. ${userName}` : userName}
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-tight">
                                    ID: {userId.substring(userId.length - 8).toUpperCase()}
                                </span>
                            </div>
                            <Avatar className="size-9 rounded-lg border border-border/50 group-hover:border-primary/50 transition-colors">
                                <AvatarImage src={userAvatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${userName}`} alt={userName} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs uppercase rounded-lg">
                                    {userName.substring(0, 2) || "U"}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 mt-2">
                        <DropdownMenuLabel className="font-normal py-3">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-bold leading-none">{userName}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {userEmail}
                                </p>
                                {!isTeacher && !isAdmin && (
                                    <span className="text-[10px] text-accent-amber font-mono font-bold mt-1.5 uppercase tracking-widest bg-amber-500/10 py-0.5 px-2 rounded-full w-fit">
                                        ALUMNO
                                    </span>
                                )}
                                {isTeacher && (
                                    <span className="text-[10px] text-primary font-mono font-bold mt-1.5 uppercase tracking-widest bg-primary/5 py-0.5 px-2 rounded-full w-fit">
                                        PROFESOR
                                    </span>
                                )}
                                {isAdmin && (
                                    <span className="text-[10px] text-amber-400 font-mono font-bold mt-1.5 uppercase tracking-widest bg-amber-400/10 py-0.5 px-2 rounded-full w-fit">
                                        ADMIN
                                    </span>
                                )}
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {!isAdmin && (
                            <DropdownMenuItem asChild className="cursor-pointer gap-2 py-2">
                                <NextLink href="/settings" className="flex items-center gap-2 w-full">
                                    <Settings className="size-4" />
                                    <span>Configuración</span>
                                </NextLink>
                            </DropdownMenuItem>
                        )}

                        {isTeacher && (
                            <DropdownMenuItem asChild className="cursor-pointer gap-2 py-2">
                                <NextLink href="/alumnos" className="flex items-center gap-2 w-full">
                                    <Users className="size-4" />
                                    <span>Gestión de alumnos</span>
                                </NextLink>
                            </DropdownMenuItem>
                        )}
                        {isAdmin && (
                            <DropdownMenuItem asChild className="cursor-pointer gap-2 py-2">
                                <NextLink href="/admin/students" className="flex items-center gap-2 w-full">
                                    <Users className="size-4" />
                                    <span>Gestión de alumnos</span>
                                </NextLink>
                            </DropdownMenuItem>
                        )}


                        {/* Theme Sub-menu */}
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="cursor-pointer gap-2 py-2">
                                {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                                <span>Tema</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent className="p-1">
                                    <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer gap-2">
                                        <Sun className="size-4" />
                                        <span>Claro</span>
                                        {theme === "light" && <Check className="ml-auto size-4" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer gap-2">
                                        <Moon className="size-4" />
                                        <span>Oscuro</span>
                                        {theme === "dark" && <Check className="ml-auto size-4" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer gap-2">
                                        <Monitor className="size-4" />
                                        <span>Sistema</span>
                                        {theme === "system" && <Check className="ml-auto size-4" />}
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem asChild className="text-destructive focus:text-destructive cursor-pointer py-2">
                            <form action={logout} className="w-full">
                                <button type="submit" className="w-full flex items-center gap-2">
                                    <LogOut className="size-4" />
                                    <span>Cerrar sesión</span>
                                </button>
                            </form>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

interface DriveStatusIndicatorProps {
    status: DriveConnectionStatus | null;
}

function DriveStatusIndicator({ status }: DriveStatusIndicatorProps) {
    const meta = getDriveConnectionStatusMeta(status);

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        aria-label={meta.title}
                        className={cn(
                            "relative flex size-9 cursor-help items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            status === DRIVE_CONNECTION_STATUS.CONNECTED && "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10",
                            status === DRIVE_CONNECTION_STATUS.INVALID && "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15",
                            status === DRIVE_CONNECTION_STATUS.DISCONNECTED && "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/15",
                            status === null && "border-border/50 bg-card hover:bg-accent/10"
                        )}
                    >
                        {status === DRIVE_CONNECTION_STATUS.INVALID ? (
                            <CircleX className="size-[18px]" />
                        ) : status === DRIVE_CONNECTION_STATUS.DISCONNECTED ? (
                            <TriangleAlert className="size-[18px]" />
                        ) : (
                            <>
                                <GoogleDriveGlyph className="size-[18px]" />
                                <span
                                    className={cn(
                                        "absolute bottom-1 right-1 size-2 rounded-full border border-background",
                                        status === DRIVE_CONNECTION_STATUS.CONNECTED && "bg-emerald-500",
                                        status === null && "bg-muted-foreground/50"
                                    )}
                                />
                            </>
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-72 border border-border-strong bg-surface-dark p-3 text-foreground shadow-2xl">
                    <div className="space-y-1.5">
                        <p className="text-xs font-black uppercase tracking-wide">{meta.title}</p>
                        <p className="text-xs leading-relaxed text-text-muted">{meta.description}</p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function GoogleDriveGlyph({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
            <path d="M9.2 2.5h5.6l6.4 11h-5.6l-6.4-11Z" fill="#34A853" />
            <path d="M9.2 2.5 2.8 13.5l2.8 4.8 6.4-11-2.8-4.8Z" fill="#FBBC05" />
            <path d="M21.2 13.5 18.4 18.3H5.6l2.8-4.8h12.8Z" fill="#4285F4" />
        </svg>
    );
}
