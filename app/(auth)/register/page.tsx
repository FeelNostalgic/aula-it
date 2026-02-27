"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signup } from "../login/actions";
import Link from "next/link";
import { cn } from "@/utils/cn";

function RegisterButton() {
    const { pending } = useFormStatus();

    return (
        <button
            disabled={pending}
            className="w-full h-12 bg-accent-blue hover:bg-accent-blue/90 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 group shadow-lg shadow-accent-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
        >
            <span className="material-symbols-outlined text-[18px]">
                {pending ? "sync" : "person_add"}
            </span>
            <span>{pending ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}</span>
        </button>
    );
}

export default function RegisterPage() {
    const [state, formAction] = useActionState(signup, null);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="bg-background text-text-primary min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Version Tag */}
            <div className="fixed top-6 right-6 font-mono text-[10px] tracking-widest uppercase opacity-40 text-text-muted">
                build_id: v2.4.0 (stable)
            </div>

            {/* Background Pattern Decoration */}
            <div className="fixed inset-0 -z-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] dark:opacity-[0.05] bg-radial-grid" />
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-accent-blue/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent-blue/5 rounded-full blur-[120px]" />
            </div>

            {/* Register Container */}
            <main className="w-full max-w-[420px] flex flex-col gap-8 relative z-10">
                {/* Header / Logo Area */}
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex items-center gap-3 text-accent-blue">
                        <div className="size-8 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl">terminal</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">
                            Aula IT
                        </h1>
                    </div>
                </div>

                {/* Register Card */}
                <div className="bg-surface border border-border-subtle p-8 rounded-xl shadow-2xl">
                    <form action={formAction} className="flex flex-col gap-6">
                        {/* Field: Email */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
                                Email
                            </label>
                            <div className="relative group">
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full bg-background border border-border-subtle rounded-lg h-12 px-4 text-sm font-sans text-white placeholder:text-text-muted/50 focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-all outline-none"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        {/* Field: Password */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
                                Password
                            </label>
                            <div className="relative flex items-center">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full bg-background border border-border-subtle rounded-lg h-12 px-4 pr-12 text-sm font-sans text-white placeholder:text-text-muted/50 focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-all outline-none"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 text-text-muted hover:text-accent-blue transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showPassword ? "visibility_off" : "visibility"}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {state?.error && (
                            <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-md">
                                <p className="text-[10px] font-mono text-accent-red uppercase text-center tracking-tight">
                                    {state.error}
                                </p>
                            </div>
                        )}

                        <RegisterButton />
                    </form>

                    {/* Links Inside Card */}
                    <div className="mt-8 pt-6 border-t border-border-subtle flex flex-col gap-4 text-center">
                        <Link
                            href="/login"
                            className="text-xs text-text-muted hover:text-accent-blue transition-colors uppercase font-mono tracking-tight flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                            ALREADY HAVE AN ACCOUNT? LOG IN
                        </Link>
                    </div>
                </div>

                {/* External Link */}
                <div className="text-center">
                    <button className="text-xs font-medium text-text-muted hover:text-white flex items-center justify-center gap-2 mx-auto transition-all bg-border-subtle/30 px-4 py-2 rounded-full hover:bg-border-subtle/50">
                        <span className="material-symbols-outlined text-[16px]">
                            admin_panel_settings
                        </span>
                        Request system access
                    </button>
                </div>
            </main>
        </div>
    );
}

