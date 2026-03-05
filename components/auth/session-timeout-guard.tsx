"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

// Tiempos en milisegundos
const HOURS = 2;
const THREE_HOURS = HOURS * 60 * 60 * 1000;
const WARNING_BEFORE = 10 * 60 * 1000; // 10 minutos antes
const CHECK_INTERVAL = 20 * 1000; // Cada 20 segundos
const LAST_ACTIVITY_KEY = 'aula-it-last-activity';

export function SessionTimeoutGuard({ children }: { children: React.ReactNode }) {
    const [showWarning, setShowWarning] = useState(false);
    const router = useRouter();
    const supabase = createClient();
    const lastActivityRef = useRef<number>(Date.now());

    const updateLastActivity = useCallback(() => {
        const now = Date.now();
        lastActivityRef.current = now;
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    }, []);

    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut();
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        router.push('/login');
        toast.info("Sesión cerrada por inactividad");
    }, [supabase, router]);

    const extendSession = useCallback(async () => {
        setShowWarning(false);
        updateLastActivity();
        // Hacemos un fetch suave a Supabase para refrescar la sesión si es necesario
        await supabase.auth.getSession();
        toast.success("Sesión extendida");
    }, [supabase, updateLastActivity]);

    useEffect(() => {
        // Inicializar
        updateLastActivity();

        // Eventos que cuentan como actividad
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        const handleEvent = () => updateLastActivity();

        events.forEach(event => window.addEventListener(event, handleEvent));

        // Intervalo de comprobación
        const interval = setInterval(() => {
            const now = Date.now();
            const storedLastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || now.toString());
            const timeSinceLastActivity = now - storedLastActivity;

            if (timeSinceLastActivity >= THREE_HOURS) {
                handleLogout();
            } else if (timeSinceLastActivity >= (THREE_HOURS - WARNING_BEFORE)) {
                if (!showWarning) setShowWarning(true);
            } else {
                if (showWarning) setShowWarning(false);
            }
        }, CHECK_INTERVAL);

        return () => {
            events.forEach(event => window.removeEventListener(event, handleEvent));
            clearInterval(interval);
        };
    }, [handleLogout, updateLastActivity, showWarning]);

    return (
        <>
            {children}
            <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
                <AlertDialogContent className="bg-surface-dark border-border-strong text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter text-accent-orange">
                            ¡Sesión a punto de caducar!
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-text-muted">
                            Has estado inactivo durante casi {HOURS} horas. Tu sesión se cerrará automáticamente en unos minutos para proteger tu cuenta. ¿Deseas continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={handleLogout}
                            className="bg-transparent border-border-subtle hover:bg-accent-red/10 hover:text-accent-red transition-all"
                        >
                            Cerrar Sesión
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={extendSession}
                            className="bg-accent-blue hover:bg-accent-blue/90 text-white font-bold"
                        >
                            Extender Sesión
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
