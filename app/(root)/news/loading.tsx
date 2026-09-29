import { Skeleton } from "@/components/ui/skeleton";
import NewsSkeleton from "@/components/NewsSkeleton";

const NewsLoading = () => (
    <div className="flex flex-col gap-10" aria-busy="true" aria-label="Loading market news">
        <section className="flex flex-col gap-6">
            <Skeleton className="h-8 w-56" />
            <NewsSkeleton count={6} />
        </section>
    </div>
);

export default NewsLoading;
