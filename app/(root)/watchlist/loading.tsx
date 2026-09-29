import { Skeleton } from "@/components/ui/skeleton";

const WatchlistLoading = () => (
    <div className="watchlist-container" aria-busy="true" aria-label="Loading your watchlist">
        <section className="watchlist">
            <h1 className="watchlist-title">Watchlist</h1>
            <div className="flex flex-col gap-3 rounded-lg border border-gray-700 bg-gray-800 p-4">
                <Skeleton className="h-8 w-full" />
                {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        </section>

        <section className="min-w-0 space-y-4 lg:col-span-1">
            <h2 className="watchlist-title">Price Alerts</h2>
            <div className="flex flex-col gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
                {Array.from({ length: 2 }, (_, i) => (
                    <Skeleton key={i} className="h-36 w-full rounded-md" />
                ))}
            </div>
        </section>
    </div>
);

export default WatchlistLoading;
