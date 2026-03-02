"use client";

import { StudentPreview } from "@/components/dashboard/activity-builder/student-preview";
import { useRouter } from "next/navigation";
import { ActivityPhaseWithSteps } from "@/types/activity";

interface StudentActivityClientProps {
    activity: any;
    phases: ActivityPhaseWithSteps[];
}

export function StudentActivityClient({ activity, phases }: StudentActivityClientProps) {
    const router = useRouter();

    const handleExit = () => {
        // Return to the unit map
        if (activity.unit?.id) {
            router.push(`/dashboard/units/${activity.unit.id}/map`);
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <main className="h-screen w-full">
            <StudentPreview
                activity={activity}
                phases={phases}
                onExitPreview={handleExit}
            />
        </main>
    );
}
