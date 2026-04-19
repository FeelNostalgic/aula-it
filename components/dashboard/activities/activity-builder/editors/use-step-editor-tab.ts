"use client";

import { useEffect, useMemo, useState } from "react";

const TAB_STORAGE_PREFIX = "aula-it:activity-builder:step-tab";

export function useStepEditorTab(stepId: string, defaultTab: string, availableTabs: string[]) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const availableTabsKey = useMemo(() => availableTabs.join("|"), [availableTabs]);
    const availableTabSet = useMemo(() => new Set(availableTabs), [availableTabsKey]);

    useEffect(() => {
        try {
            const storageKey = `${TAB_STORAGE_PREFIX}:${stepId}`;
            const savedTab = localStorage.getItem(storageKey);
            if (savedTab && availableTabSet.has(savedTab)) {
                setActiveTab(savedTab);
                return;
            }
        } catch {
            // ignore storage read errors
        }
        setActiveTab(defaultTab);
    }, [availableTabSet, availableTabsKey, defaultTab, stepId]);

    useEffect(() => {
        if (!availableTabSet.has(activeTab)) {
            setActiveTab(defaultTab);
            return;
        }

        try {
            const storageKey = `${TAB_STORAGE_PREFIX}:${stepId}`;
            localStorage.setItem(storageKey, activeTab);
        } catch {
            // ignore storage write errors
        }
    }, [activeTab, availableTabSet, defaultTab, stepId]);

    return { activeTab, setActiveTab };
}
