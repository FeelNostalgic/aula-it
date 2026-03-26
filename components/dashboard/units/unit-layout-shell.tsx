"use client";

import { useEffect } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useUIStore } from "@/lib/store/ui-store";
import { useBreadcrumb } from "../layout/breadcrumb-context";
import { UnitTeacherHeader } from "./unit-teacher-header";
import { UnitTeacherNav } from "./unit-teacher-nav";

const FULLSCREEN_SEGMENTS = ["recursos", "evaluacion"];

const SEGMENT_LABELS: Record<string, string> = {
    recursos: "Recursos",
    evaluacion: "Evaluación",
};

interface UnitLayoutShellProps {
    unit: any;
    module: any;
    children: React.ReactNode;
}

export function UnitLayoutShell({ unit, module, children }: UnitLayoutShellProps) {
    const segment = useSelectedLayoutSegment();
    const { setIsFullscreen } = useUIStore();
    const { setSegments } = useBreadcrumb();
    const isFullscreen = FULLSCREEN_SEGMENTS.includes(segment ?? "");

    useEffect(() => {
        if (isFullscreen) {
            setIsFullscreen(true);
            return () => setIsFullscreen(false);
        }
    }, [isFullscreen, setIsFullscreen]);

    useEffect(() => {
        if (isFullscreen && segment) {
            setSegments([
                { label: module.name, href: `/dashboard/modules/${module.id}` },
                { label: unit.name, href: `/dashboard/units/${unit.id}/retos` },
                { label: SEGMENT_LABELS[segment] ?? segment },
            ]);
            return () => setSegments([]);
        }
    }, [isFullscreen, segment, module, unit, setSegments]);

    if (isFullscreen) {
        return (
            <div className="flex flex-col h-full">
                <div className="shrink-0 pt-6">
                    <UnitTeacherNav unitId={unit.id} />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <UnitTeacherHeader unit={unit} module={module} />
            <div className="flex-1">{children}</div>
        </div>
    );
}
