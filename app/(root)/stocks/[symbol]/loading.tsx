import { Skeleton } from "@/components/ui/skeleton";
import NewsSkeleton from "@/components/NewsSkeleton";

const CardSkeleton = ({ bodyClassName }: { bodyClassName: string }) => (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
        <Skeleton className="mb-4 h-6 w-40" />
        <Skeleton className={`w-full ${bodyClassName}`} />
    </div>
);

// Shown instantly when opening a stock while its quote and chart load.
const StockLoading = () => (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading stock">
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
                <Skeleton className="size-14 rounded-lg" />
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-7 w-64" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end gap-2">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-10 w-44" />
                <Skeleton className="h-10 w-28" />
            </div>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-800 p-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-28" />
                </div>
            ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
            <div className="flex flex-col gap-6 xl:col-span-2">
                <CardSkeleton bodyClassName="h-80" />
                <CardSkeleton bodyClassName="h-40" />
            </div>
            <div className="flex flex-col gap-6">
                <CardSkeleton bodyClassName="h-48" />
                <CardSkeleton bodyClassName="h-56" />
            </div>
        </div>

        <section className="flex flex-col gap-5">
            <Skeleton className="h-8 w-56" />
            <NewsSkeleton />
        </section>
    </div>
);

export default StockLoading;
