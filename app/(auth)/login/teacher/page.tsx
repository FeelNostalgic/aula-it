"use client";

import { useActionState, useState, Suspense } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { loginTeacher, loginWithGoogle } from "../actions";
import Link from "next/link";
import { Chrome, Terminal, LogIn, Loader2, Eye, EyeOff, GraduationCap } from "lucide-react";
import { APP_VERSION, APP_STATUS } from "@/lib/version";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

function OAuthErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") === "unauthorized"
    ? "Acceso denegado. Solo los profesores y administradores pueden acceder desde esta pantalla."
    : null;

  if (!error) return null;
  return (
    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
      <p className="text-[10px] font-mono text-destructive uppercase text-center tracking-tight">
        {error}
      </p>
    </div>
  );
}

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

export default function TeacherLoginPage() {
  const [state, formAction] = useActionState(loginTeacher, null);
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
            <Terminal className="size-8" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Aula IT</h1>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 bg-card shadow-2xl overflow-hidden">
          <CardHeader className="space-y-1 pb-6 text-center">
            <div className="flex justify-center mb-2">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="size-5 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl font-mono tracking-wider uppercase text-foreground">Acceso Docente</CardTitle>
            <CardDescription className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
              Profesores y Administradores
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <form action={formAction} className="flex flex-col gap-6">
              {/* Field: Email */}
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="profesor@centro.edu"
                  className="h-12 bg-background/50 border-border/50 focus-visible:ring-primary font-sans"
                />
              </div>

              {/* Field: Password */}
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
                  Contraseña
                </Label>
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
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Suspense fallback={null}>
                <OAuthErrorBanner />
              </Suspense>

              {state?.error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-[10px] font-mono text-destructive uppercase text-center tracking-tight">
                    {state.error}
                  </p>
                </div>
              )}

              <LoginButton />
            </form>

            {/* OAuth Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full border-border/50" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-2 text-muted-foreground font-mono tracking-widest">o</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => loginWithGoogle()}
              className="w-full h-12 bg-background/50 border-border/50 hover:bg-accent/10 text-foreground text-xs font-mono tracking-wider"
            >
              <Chrome className="mr-2 h-4 w-4 text-primary" />
              CONTINUAR CON GOOGLE
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t border-border/50 bg-muted/30 pt-6">
            <Link
              href="/login"
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors uppercase font-mono tracking-tight"
            >
              ¿Eres alumno? → Acceso de alumnos
            </Link>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
