"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { cambiarContrasena } from "./actions";
import { Terminal, KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      disabled={pending}
      className="w-full h-12 text-primary-foreground font-bold shadow-lg shadow-primary/20"
      type="submit"
    >
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <KeyRound className="mr-2 h-4 w-4" />
      )}
      {pending ? "GUARDANDO..." : "ESTABLECER CONTRASEÑA"}
    </Button>
  );
}

export default function CambiarContrasenaPage() {
  const [state, formAction] = useActionState(cambiarContrasena, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="fixed top-6 left-6 z-20">
        <ThemeToggle />
      </div>
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <main className="w-full max-w-[420px] flex flex-col gap-8 relative z-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3 text-primary">
            <Terminal className="size-8" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Aula IT</h1>
          </div>
        </div>

        <Card className="border-border/50 bg-card shadow-2xl overflow-hidden">
          <CardHeader className="space-y-1 pb-6 text-center">
            <CardTitle className="text-xl font-mono tracking-wider uppercase text-foreground">
              Cambio de Contraseña
            </CardTitle>
            <CardDescription className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
              Debes establecer una contraseña personal antes de continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Nueva contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className="h-12 bg-background/50 border-border/50 focus-visible:ring-primary pr-12 font-sans"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1 h-10 w-10 text-muted-foreground hover:text-primary hover:bg-transparent"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="confirm"
                  className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Confirmar contraseña
                </Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Repite la contraseña"
                  className="h-12 bg-background/50 border-border/50 focus-visible:ring-primary font-sans"
                />
              </div>

              {state?.error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-[10px] font-mono text-destructive uppercase text-center tracking-tight">
                    {state.error}
                  </p>
                </div>
              )}

              <SubmitButton />
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
