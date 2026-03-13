"use client";

import { StudentPreview } from "@/components/dashboard/activity-builder/student-preview";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ActivityPhaseWithSteps, ActivitySubmission } from "@/types/activity";
import { BreadcrumbProvider, useBreadcrumb } from "@/components/dashboard/breadcrumb-context";

interface StudentActivityClientProps {
    activity: any;
    phases: ActivityPhaseWithSteps[];
    user?: any;
    profile?: any;
    submissionsMap?: Record<string, ActivitySubmission>;
    viewsMap?: Record<string, boolean>;
}

function BreadcrumbSetter({ activity }: { activity: any }) {
    const { setSegments } = useBreadcrumb();

    useEffect(() => {
        const segments = [];

        if (activity.unit?.module) {
            segments.push({
                label: activity.unit.module.name,
                href: `/dashboard/modules/${activity.unit.module.id}`
            });
        }

        if (activity.unit) {
            segments.push({
                label: activity.unit.name,
                href: `/dashboard/units/${activity.unit.id}`
            });
        }

        segments.push({ label: activity.title || "Actividad", href: "" });

        setSegments(segments);
    }, [activity, setSegments]);

    return null;
}

export function StudentActivityClient({ activity, phases, user, profile, submissionsMap, viewsMap }: StudentActivityClientProps) {
    const router = useRouter();

    const handleExit = () => {
        if (activity.unit?.id) {
            router.push(`/dashboard/units/${activity.unit.id}/map`);
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <BreadcrumbProvider>
            <BreadcrumbSetter activity={activity} />
            <main className="h-screen w-full">
                <StudentPreview
                    activity={activity}
                    phases={phases}
                    onExitPreview={handleExit}
                    user={user}
                    profile={profile}
                    submissionsMap={submissionsMap}
                    viewsMap={viewsMap}
                    googleEmail={profile?.google_email ?? null}
                />
            </main>
        </BreadcrumbProvider>
    );
}
