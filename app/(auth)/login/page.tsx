"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "./actions";
import Link from "next/link";
import { Terminal, LogIn, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { APP_VERSION, APP_STATUS } from "@/lib/version";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

function LoginButton() {
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
        <LogIn className="mr-2 h-4 w-4" />
      )}
      {pending ? "INICIANDO..." : "INICIAR SESIÓN"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, null);
  const [showPassword, setShowPassword] = useState(false);

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

      {/* Login Container */}
      <main className="w-full max-w-[420px] flex flex-col gap-8 relative z-10">
        {/* Header / Logo Area */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3 text-primary">
            <div className="size-8 flex items-center justify-center">
              <Terminal className="size-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Aula IT
            </h1>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 bg-card shadow-2xl overflow-hidden">
          <CardHeader className="space-y-1 pb-6 text-center">
            <CardTitle className="text-xl font-mono tracking-wider uppercase text-foreground">Protocolo de Seguridad</CardTitle>
            <CardDescription className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
              Se Requiere Autorización Nivel 4
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <form action={formAction} className="flex flex-col gap-6">
              {/* Field: Username */}
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
                  Email / Identificador
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="text"
                  required
                  placeholder="ALU-001 o usuario@dominio.com"
                  className="h-12 bg-background/50 border-border/50 focus-visible:ring-primary font-sans"
                />
              </div>

              {/* Field: Password */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
                    Contraseña
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="h-12 bg-background/50 border-border/50 focus-visible:ring-primary pr-12 font-sans"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1 h-10 w-10 text-muted-foreground hover:text-primary hover:bg-transparent"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {state?.error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-[10px] font-mono text-destructive uppercase text-center tracking-tight">
                    {state.error}
                  </p>
                </div>
              )}

              <LoginButton />
            </form>

          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t border-border/50 bg-muted/30 pt-6">
            <Link
              href="/login/teacher"
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors uppercase font-mono tracking-tight"
            >
              ¿Eres profesor? → Acceso docente
            </Link>
          </CardFooter>
        </Card>

        {/* External Link */}
        <div className="text-center">
          <Button variant="outline" size="sm" className="h-9 px-4 rounded-full bg-border-subtle/20 border-border/20 text-muted-foreground hover:text-foreground hover:bg-border/30 transition-all font-medium text-xs">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Solicitar acceso al sistema
          </Button>
        </div>
      </main>
    </div>
  );
}


