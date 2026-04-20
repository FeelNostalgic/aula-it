"use client";

import Link from "next/link";
import { Terminal, ShieldOff, ArrowLeft, GraduationCap } from "lucide-react";
import { APP_VERSION, APP_STATUS } from "@/lib/version";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RegisterPage() {
    return (
        <div className="bg-background text-foreground min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Version Tag */}
            <div className="fixed top-6 left-6 z-20">
                <ThemeToggle />
            </div>
            <div className="fixed top-6 right-6 font-mono text-[10px] tracking-widest uppercase opacity-40 text-muted-foreground">
                build_id: v{APP_VERSION} ({APP_STATUS})
            </div>

            {/* Background Pattern Decoration */}
            <div className="fixed inset-0 -z-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] dark:opacity-[0.05] bg-radial-grid" />
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
            </div>

            <main className="w-full max-w-[420px] flex flex-col gap-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex items-center gap-3 text-primary">
                        <Terminal className="size-8" />
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Aula IT</h1>
                    </div>
                </div>

                <Card className="border-border/50 bg-card shadow-2xl overflow-hidden">
                    <CardHeader className="space-y-1 pb-6 text-center">
                        <div className="flex justify-center mb-3">
                            <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center">
                                <ShieldOff className="size-7 text-destructive" />
                            </div>
                        </div>
                        <CardTitle className="text-xl font-mono tracking-wider uppercase text-foreground">Acceso solo por invitación</CardTitle>
                        <CardDescription className="text-xs font-mono text-muted-foreground leading-relaxed pt-1">
                            El registro público está deshabilitado. Las cuentas son gestionadas por el administrador del sistema.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 pb-6">
                        <Link href="/login/teacher">
                            <Button variant="outline" className="w-full h-11 bg-background/50 border-border/50 hover:bg-accent/10 text-foreground text-xs font-mono tracking-wider">
                                <GraduationCap className="mr-2 h-4 w-4 text-primary" />
                                Acceso docente
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button variant="ghost" className="w-full h-11 text-muted-foreground hover:text-foreground text-xs font-mono tracking-wider">
                                <ArrowLeft className="mr-2 h-3 w-3" />
                                Acceso de alumnos
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
