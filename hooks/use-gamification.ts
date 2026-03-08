"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { getGlobalLevelInfo, getModuleRankInfo } from "@/lib/gamification";

export function useGamification() {
    const [globalXp, setGlobalXp] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchGlobalXp() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from("profiles")
                .select("global_xp")
                .eq("id", user.id)
                .single();

            if (profile) {
                setGlobalXp(profile.global_xp || 0);
            }
            setLoading(false);
        }

        fetchGlobalXp();

        // Subscribe to profile changes for real-time XP updates
        const channel = supabase
            .channel("profile_xp_updates")
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "profiles",
                },
                (payload) => {
                    if (payload.new && "global_xp" in payload.new) {
                        setGlobalXp(payload.new.global_xp);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const globalLevel = getGlobalLevelInfo(globalXp);

    return {
        globalXp,
        globalLevel,
        loading,
    };
}

export function useModuleGamification(moduleId: string) {
    const [moduleXp, setModuleXp] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchModuleXp() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: enrollment } = await supabase
                .from("module_enrollments")
                .select("module_xp")
                .eq("module_id", moduleId)
                .eq("student_id", user.id)
                .single();

            if (enrollment) {
                setModuleXp(enrollment.module_xp || 0);
            }
            setLoading(false);
        }

        fetchModuleXp();

        // Subscribe to enrollment changes
        const channel = supabase
            .channel(`module_xp_updates_${moduleId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "module_enrollments",
                    filter: `module_id=eq.${moduleId}`,
                },
                (payload) => {
                    if (payload.new && "module_xp" in payload.new) {
                        setModuleXp(payload.new.module_xp);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [moduleId, supabase]);

    const moduleRank = getModuleRankInfo(moduleXp);

    return {
        moduleXp,
        moduleRank,
        loading,
    };
}
