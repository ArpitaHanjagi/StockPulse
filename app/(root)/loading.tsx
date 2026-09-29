import { Skeleton } from "@/components/ui/skeleton";
import NewsSkeleton from "@/components/NewsSkeleton";

// Shown instantly when navigating to the dashboard while live quotes load.
const DashboardLoading = () => (
    <div className="flex min-h-screen home-wrapper" aria-busy="true" aria-label="Loading dashboard">
        <section className="flex w-full flex-col gap-3">
            <Skeleton className="h-6 w-40" />
            <div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-800 p-4">
                        <Skeleton className="h-4 w-14" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-6 w-28" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
            </div>
        </section>

        <div className="grid w-full gap-6 xl:grid-cols-3">
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
                <Skeleton className="mb-4 h-6 w-40" />
                <div className="flex flex-col gap-3">
                    {Array.from({ length: 6 }, (_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                    ))}
                </div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 xl:col-span-2">
                <Skeleton className="mb-4 h-6 w-36" />
                <Skeleton className="h-72 w-full" />
            </div>
        </div>

        <div className="grid w-full gap-6 xl:grid-cols-3">
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
                <Skeleton className="mb-4 h-6 w-32" />
                <NewsSkeleton count={4} />
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 xl:col-span-2">
                <Skeleton className="mb-4 h-6 w-36" />
                <div className="flex flex-col gap-3">
                    {Array.from({ length: 6 }, (_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                    ))}
                </div>
            </div>
        </div>
    </div>
);

export default DashboardLoading;
