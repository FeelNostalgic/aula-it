"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface BreadcrumbSegment {
    label: string;
    href?: string;
}

interface BreadcrumbContextValue {
    segments: BreadcrumbSegment[];
    setSegments: (segments: BreadcrumbSegment[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
    segments: [],
    setSegments: () => { },
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
    const [segments, setSegmentsState] = useState<BreadcrumbSegment[]>([]);

    const setSegments = useCallback((newSegments: BreadcrumbSegment[]) => {
        setSegmentsState(newSegments);
    }, []);

    return (
        <BreadcrumbContext value={{ segments, setSegments }}>
            {children}
        </BreadcrumbContext>
    );
}

export function useBreadcrumb() {
    return useContext(BreadcrumbContext);
}
