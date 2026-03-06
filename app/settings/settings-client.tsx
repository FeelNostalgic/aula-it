"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "./actions";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, HardDrive, Mail, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SettingsClientProps {
    userEmail: string;
    initialFullName: string;
    initialGoogleEmail: string;
    isTeacher: boolean;
    driveConnected: boolean;
}

export function SettingsClient({
    userEmail,
    initialFullName,
    initialGoogleEmail,
    isTeacher,
    driveConnected,
}: SettingsClientProps) {
    const [fullName, setFullName] = useState(initialFullName);
    const [googleEmail, setGoogleEmail] = useState(initialGoogleEmail);
    const [isPending, startTransition] = useTransition();

    function handleSave(e: React.FormEvent) {
        e.preventDefault();
        startTransition(async () => {
            const result = await updateProfile({ fullName, googleEmail });
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Perfil actualizado correctamente.");
            }
        });
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="h-[68px] border-b border-border/50 bg-background flex items-center px-6 gap-4">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-sm text-text-muted hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="size-4" />
                    Dashboard
                </Link>
                <span className="text-border/50">·</span>
                <span className="text-sm font-semibold text-foreground">Configuración</span>
            </header>

            <main className="max-w-2xl mx-auto px-6 py-12 space-y-10">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Tu Perfil</h1>
                    <p className="text-sm text-text-muted mt-1">{userEmail}</p>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Full Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <User className="size-4" /> Nombre completo
                        </label>
                        <Input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Tu nombre completo"
                            className="bg-surface border-border/50"
                        />
                    </div>

                    {/* Google Email */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Mail className="size-4" /> Email de Google
                        </label>
                        <p className="text-xs text-text-muted">
                            Necesario para recibir copias de trabajo cuando el profesor distribuye plantillas.
                            Debe coincidir con tu cuenta de Google Drive.
                        </p>
                        <Input
                            value={googleEmail}
                            onChange={(e) => setGoogleEmail(e.target.value)}
                            type="email"
                            placeholder="tu@gmail.com"
                            className="bg-surface border-border/50"
                        />
                    </div>

                    <Button type="submit" disabled={isPending} className="w-full">
                        {isPending ? "Guardando..." : "Guardar cambios"}
                    </Button>
                </form>

                {/* Teacher Drive section */}
                {isTeacher && (
                    <div className="border border-border-strong rounded-2xl p-6 space-y-4 bg-surface-dark">
                        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                            <HardDrive className="size-4 text-accent-blue" />
                            Google Drive del Profesor
                        </h2>
                        <p className="text-sm text-text-muted">
                            Conecta tu cuenta de Google Drive para poder distribuir plantillas a los alumnos
                            y gestionar los permisos de sus copias.
                        </p>

                        {driveConnected ? (
                            <div className="flex items-center gap-2 text-sm text-emerald-400 font-semibold">
                                <CheckCircle2 className="size-4" />
                                Drive conectado correctamente
                            </div>
                        ) : (
                            <a href="/api/drive/authorize">
                                <Button variant="outline" className="gap-2">
                                    <HardDrive className="size-4" />
                                    Conectar Google Drive
                                </Button>
                            </a>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
