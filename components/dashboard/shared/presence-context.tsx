"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceContextType {
    onlineUsers: Set<string>;
}

const PresenceContext = createContext<PresenceContextType>({ onlineUsers: new Set() });

export function PresenceProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        if (!userId) return;

        // UN SOLO CANAL para toda la pestaña
        const channel = supabase.channel('global-presence', {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        const syncPresence = () => {
            const state = channel.presenceState();
            const ids = new Set(Object.keys(state));
            //console.log('Presence: Sincronizado globalmente:', Array.from(ids));
            setOnlineUsers(ids);
        };

        channel
            .on('presence', { event: 'sync' }, syncPresence)
            .on('presence', { event: 'join' }, ({ key }) => {
                //console.log('Presence: + Join:', key);
                syncPresence();
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                //console.log('Presence: - Leave:', key);
                syncPresence();
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: userId,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            channel.unsubscribe();
        };
    }, [userId, supabase]);

    return (
        <PresenceContext.Provider value={{ onlineUsers }}>
            {children}
        </PresenceContext.Provider>
    );
}

export const usePresence = () => useContext(PresenceContext);
