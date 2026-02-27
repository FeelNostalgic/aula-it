"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus, ArrowLeft } from "lucide-react";
import { Button } from "@/app/_components/button";
import { Input } from "@/app/_components/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/app/_components/card";
import { signup } from "../login/actions";
import Link from "next/link";

function RegisterButton() {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
            {pending ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
        </Button>
    );
}

export default function RegisterPage() {
    const [state, formAction] = useActionState(signup, null);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="mx-auto w-10 h-10 bg-accent-blue/10 border border-accent-blue/20 rounded-md flex items-center justify-center mb-4">
                        <UserPlus className="w-5 h-5 text-accent-blue" />
                    </div>
                    <CardTitle>CREATE ACCOUNT</CardTitle>
                    <CardDescription>
                        JOIN THE AULA IT COMMAND CENTER
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

                        <RegisterButton />
                    </form>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                    <Link
                        href="/login"
                        className="flex items-center gap-2 text-[10px] font-mono text-text-muted hover:text-accent-blue transition-colors uppercase tracking-tight"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        BACK TO LOGIN
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
