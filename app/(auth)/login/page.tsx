"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LogIn, Chrome } from "lucide-react";
import { Button } from "@/app/_components/button";
import { Input } from "@/app/_components/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/app/_components/card";
import { login, loginWithGoogle } from "./actions";
import Link from "next/link";

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" className="w-full" disabled={pending}>
      {pending ? "SIGNING IN..." : "SIGN IN"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, null);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-10 h-10 bg-accent-blue/10 border border-accent-blue/20 rounded-md flex items-center justify-center mb-4">
            <LogIn className="w-5 h-5 text-accent-blue" />
          </div>
          <CardTitle>AULA IT</CardTitle>
          <CardDescription>
            ENTER YOUR CREDENTIALS TO ACCESS THE COMMAND CENTER
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction} className="space-y-4">
            <Input
              name="email"
              type="email"
              label="EMAIL ADDRESS"
              placeholder="name@example.com"
              required
            />
            <Input
              name="password"
              type="password"
              label="PASSWORD"
              placeholder="••••••••"
              required
            />

            {state?.error && (
              <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-md">
                <p className="text-xs font-mono text-accent-red uppercase text-center">
                  {state.error}
                </p>
              </div>
            )}

            <LoginButton />
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border-subtle" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-surface px-2 text-text-muted font-mono tracking-widest">
                OR CONTINUE WITH
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Button variant="secondary" onClick={() => loginWithGoogle()} className="flex items-center justify-center gap-2 w-full">
              <Chrome className="w-4 h-4" />
              GOOGLE
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Link
            href="/register"
            className="text-[10px] font-mono text-text-muted hover:text-accent-blue transition-colors uppercase tracking-tight"
          >
            DON'T HAVE AN ACCOUNT? SIGN UP
          </Link>
          <p className="text-[10px] font-mono text-text-muted uppercase tracking-tight">
            FORGOT PASSWORD? CONTACT THE SYSADMIN.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
