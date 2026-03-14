"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export function PresenceHandler({ userId }: { userId: string }) {
    const supabase = createClient();

    useEffect(() => {
        if (!userId) return;

        // Broadcaster global: Solo se encarga de decir "estoy aquí"
        const channel = supabase.channel('global-presence', {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    online_at: new Date().toISOString(),
                });
            }
        });

        return () => {
            channel.unsubscribe();
        };
    }, [userId, supabase]);

    return null;
}
