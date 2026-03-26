"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/app/settings/actions";
import { toast } from "sonner";
import { Mail, X } from "lucide-react";

interface GoogleEmailPromptProps {
    onSaved: (email: string) => void;
}

export function GoogleEmailPrompt({ onSaved }: GoogleEmailPromptProps) {
    const [dismissed, setDismissed] = useState(false);
    const [email, setEmail] = useState("");
    const [isPending, startTransition] = useTransition();

    if (dismissed) return null;

    function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;
        startTransition(async () => {
            const result = await updateProfile({ fullName: "", googleEmail: email.trim() });
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Email de Google guardado.");
                onSaved(email.trim());
            }
        });
    }

    return (
        <div className="mb-6 p-4 bg-accent-blue/10 border border-accent-blue/20 rounded-2xl flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-accent-blue">
                    <Mail className="size-4 shrink-0" />
                    Configura tu email de Google para recibir tu copia de trabajo
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="text-text-muted hover:text-foreground transition-colors shrink-0"
                >
                    <X className="size-4" />
                </button>
            </div>
            <p className="text-xs text-text-muted">
                El profesor te enviará una copia personal de la plantilla. Necesitas configurar
                tu email de Google Drive para recibirla.
            </p>
            <form onSubmit={handleSave} className="flex gap-2">
                <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="tu@gmail.com"
                    className="flex-1 bg-background border-border/50 text-sm h-8"
                    disabled={isPending}
                />
                <Button type="submit" size="sm" disabled={isPending || !email.trim()} className="shrink-0 h-8">
                    {isPending ? "Guardando..." : "Guardar"}
                </Button>
            </form>
        </div>
    );
}
