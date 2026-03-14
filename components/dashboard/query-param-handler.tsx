"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export function QueryParamHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const error = searchParams.get("error");
        if (error === "module_not_available") {
            toast.error("Este módulo no está disponible todavía.");
            
            // Clean up the URL
            const params = new URLSearchParams(searchParams.toString());
            params.delete("error");
            const newPath = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
            router.replace(newPath);
        }
    }, [searchParams, router]);

    return null;
}
