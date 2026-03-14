import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
    return (
        <div className="flex flex-col gap-10">
            {/* Header Section Skeleton */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64 bg-surface-dark" />
                    <Skeleton className="h-4 w-96 bg-surface-dark" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-24 bg-surface-dark" />
                    <Skeleton className="h-10 w-40 bg-surface-dark" />
                </div>
            </div>

            {/* Stats Section Skeleton */}
            <div className="bg-surface-dark border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 flex justify-between items-center border-b border-border-subtle/50">
                    <Skeleton className="h-4 w-32 bg-surface" />
                    <Skeleton className="h-4 w-4 bg-surface" />
                </div>
                <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="size-10 rounded-lg bg-surface" />
                            <div className="space-y-1">
                                <Skeleton className="h-3 w-20 bg-surface" />
                                <Skeleton className="h-6 w-12 bg-surface" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modules Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <Card key={i} className="bg-surface-dark border-border-subtle overflow-hidden h-64">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between">
                                <Skeleton className="size-12 rounded-xl bg-surface" />
                                <Skeleton className="h-6 w-20 rounded-full bg-surface" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-3/4 bg-surface" />
                                <Skeleton className="h-4 w-full bg-surface" />
                            </div>
                            <div className="pt-4 space-y-2">
                                <Skeleton className="h-2 w-full bg-surface" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}