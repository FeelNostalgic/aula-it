"use client";

import { useTheme } from "next-themes";
import {
    Bell,
    Settings,
    LogOut,
    Monitor,
    Moon,
    Sun,
    Check,
    ChevronRight
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth)/login/actions";
import { Separator } from "@/components/ui/separator";

interface UserNavProps {
    userEmail: string;
    userName: string;
    isTeacher: boolean;
    userId: string;
    userAvatar?: string;
}

export function UserNav({ userEmail, userName, isTeacher, userId, userAvatar }: UserNavProps) {
    const { setTheme, theme } = useTheme();

    return (
        <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative cursor-pointer hover:opacity-80 transition-opacity">
                <Bell className="size-5 text-muted-foreground" />
                <div className="absolute top-0 right-0 size-2 bg-primary rounded-full border-2 border-background" />
            </div>

            {/* Vertical Separator */}
            <Separator orientation="vertical" className="h-6 bg-border/50" />

            {/* Profile Section with Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div suppressHydrationWarning className="flex items-center gap-3 cursor-pointer group hover:bg-accent/10 p-1 pr-2 rounded-lg transition-colors">
                        <div className="flex flex-col items-end text-right">
                            <span className="text-sm font-bold text-foreground">
                                {isTeacher ? `Prof. ${userName}` : userName}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-tight">
                                ID: {userId.substring(userId.length - 8).toUpperCase()}-IT
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
                            {isTeacher && (
                                <span className="text-[10px] text-primary font-mono font-bold mt-1.5 uppercase tracking-widest bg-primary/5 py-0.5 px-2 rounded-full w-fit">
                                    PROFESOR
                                </span>
                            )}
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild className="cursor-pointer gap-2 py-2">
                        <NextLink href="/settings" className="flex items-center gap-2 w-full">
                            <Settings className="size-4" />
                            <span>Configuración</span>
                        </NextLink>
                    </DropdownMenuItem>

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
    );
}
