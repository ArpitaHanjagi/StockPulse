import { Skeleton } from "@/components/ui/skeleton";

// Placeholder while headlines stream in, sized roughly like NewsList rows.
const NewsSkeleton = ({ count = 4 }: { count?: number }) => (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading news">
        {Array.from({ length: count }, (_, i) => (
            <div key={i} className="flex gap-3">
                <Skeleton className="size-16 shrink-0" />
                <div className="flex flex-1 flex-col gap-2 py-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                </div>
            </div>
        ))}
    </div>
);

export default NewsSkeleton;
