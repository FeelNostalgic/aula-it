"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function usePresence() {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const supabase = createClient();

    useEffect(() => {
        const channel = supabase.channel('global-presence');

        const syncPresence = () => {
            const state = channel.presenceState();
            const ids = new Set(Object.keys(state));
            setOnlineUsers(ids);
        };

        channel
            .on('presence', { event: 'sync' }, syncPresence)
            .on('presence', { event: 'join' }, syncPresence)
            .on('presence', { event: 'leave' }, syncPresence)
            .subscribe();

        // Inicializar por si ya hay estado
        syncPresence();

        return () => {
            channel.unsubscribe();
        };
    }, [supabase]);

    return { onlineUsers };
}
