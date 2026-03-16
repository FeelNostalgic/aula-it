"use client";

import { useState, useEffect } from "react";
import { UnitActivitiesTab } from "@/components/dashboard/unit-activities-tab";

interface UnitActivitiesWrapperProps {
    unitId: string;
    activities: any[];
    submissions: any[];
}

export function UnitActivitiesWrapper({ unitId, activities, submissions }: UnitActivitiesWrapperProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [gridCols, setGridCols] = useState(3);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const savedMode = localStorage.getItem('aula-it:unit-view:view-mode') as 'grid' | 'list';
        const savedCols = localStorage.getItem('aula-it:unit-view:grid-cols');
        
        if (savedMode) setViewMode(savedMode);
        if (savedCols) setGridCols(parseInt(savedCols, 10));
        setIsReady(true);
    }, []);

    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('aula-it:unit-view:view-mode', mode);
    };

    useEffect(() => {
        if (viewMode) {
            localStorage.setItem('aula-it:unit-view:grid-cols', gridCols.toString());
        }
    }, [gridCols, viewMode]);

    if (!isReady) return null;

    return (
        <UnitActivitiesTab
            unitId={unitId}
            initialActivities={activities}
            isTeacher={true}
            submissions={submissions}
            studentBadges={[]} // Only relevant for student view
            gridCols={gridCols}
            setGridCols={setGridCols}
            viewModeExternal={viewMode}
            setViewModeExternal={handleViewModeChange}
        />
    );
}
