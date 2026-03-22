"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExamSession {
    stepId: string;
    activityId: string;
    url: string;
}

export function ExamGuard() {
    const pathname = usePathname();
    const router = useRouter();
    const [activeExam, setActiveExam] = useState<ExamSession | null>(null);

    useEffect(() => {
        const check = () => {
            const raw = localStorage.getItem('aula-exam-active');
            if (raw) {
                try { setActiveExam(JSON.parse(raw)); } catch { setActiveExam(null); }
            } else {
                setActiveExam(null);
            }
        };

        check();

        // Cross-tab: storage events fire in tabs that did NOT set the value
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'aula-exam-active') check();
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    if (!activeExam) return null;

    // Derive pathname from stored URL and compare — don't block the exam page itself
    let examPathname = '';
    try { examPathname = new URL(activeExam.url).pathname; } catch { /* ignore */ }
    if (pathname === examPathname) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center gap-8 p-8">
            <p className="text-[120px] leading-none select-none" role="img" aria-label="Cara de sospecha">🤨</p>

            <div className="text-center space-y-3 max-w-md">
                <h1 className="text-3xl font-black text-foreground tracking-tight">
                    Estás en examen,<br />¿qué estás haciendo?
                </h1>
                <p className="text-text-muted text-base leading-relaxed">
                    No puedes navegar por la plataforma mientras realizas un examen. Vuelve y termínalo.
                </p>
            </div>

            <Button
                onClick={() => router.push(activeExam.url)}
                size="lg"
                className="bg-destructive hover:bg-destructive/90 text-white gap-2 px-8 h-12 text-base font-bold"
            >
                <Shield className="size-4" />
                Volver al examen
            </Button>
        </div>
    );
}
