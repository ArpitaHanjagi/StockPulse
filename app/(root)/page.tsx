import { Suspense } from "react";
import Link from "next/link";
import MarketOverview from "@/components/dashboard/MarketOverview";
import SectorHeatmap from "@/components/dashboard/SectorHeatmap";
import MarketQuotes from "@/components/dashboard/MarketQuotes";
import NewsList from "@/components/NewsList";
import QuoteCards from "@/components/dashboard/QuoteCards";
import LiveBoard from "@/components/dashboard/LiveBoard";
import NewsSkeleton from "@/components/NewsSkeleton";
import { getWatchlistWithData } from "@/lib/actions/watchlist.actions";
import { getMarketBoard, getMarketNews, getQuotes } from "@/lib/actions/market.actions";
import { getCurrentUser } from "@/lib/better-auth/session";
import { getIndustryPicks } from "@/lib/market/symbols";
import { toStockWithData } from "@/lib/market/format";

// New users with an empty watchlist get live cards for well-known names in
// the industry they picked at sign-up, so the dashboard is never empty.
const getSuggestions = async (industry?: string | null) => {
    const picks = getIndustryPicks(industry);
    const quotes = await getQuotes(picks);
    return picks.map((symbol) => toStockWithData({ symbol, company: quotes[symbol]?.name ?? symbol }, quotes[symbol]));
};

// Headlines take several upstream searches, so they stream in separately
// instead of holding up the rest of the dashboard.
const TopStories = async () => {
    const news = await getMarketNews();
    return <NewsList news={news.slice(0, 8)} compact />;
};

const Panel = ({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) => (
    <section className={`min-w-0 rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-5 ${className}`}>
        <h2 className="mb-4 text-lg font-semibold text-gray-100 sm:text-xl">{title}</h2>
        {children}
    </section>
);

const Home = async () => {
    const [watchlist, user, board] = await Promise.all([
        getWatchlistWithData(4),
        getCurrentUser(),
        getMarketBoard(),
    ]);
    const industry = user?.preferredIndustry;
    const cards = watchlist.length > 0 ? watchlist : await getSuggestions(industry);
    const liveSymbols = [
        ...cards.map((c) => c.symbol),
        ...Object.values(board.sectors).flat().flatMap((s) => s.items.map((i) => i.symbol)),
        ...board.groups.flatMap((g) => g.items.map((i) => i.symbol)),
    ];

    return (
        <LiveBoard symbols={liveSymbols}>
        <div className="flex min-h-screen home-wrapper">
            {cards.length > 0 && (
                <section className="flex w-full flex-col gap-3">
                    <div className="flex items-baseline justify-between">
                        <h2 className="text-lg font-semibold text-gray-100">
                            {watchlist.length > 0 ? 'Your Watchlist' : `Suggested for you${industry ? ` · ${industry}` : ''}`}
                        </h2>
                        <Link href="/watchlist" className="text-sm text-gray-500 hover:text-yellow-500">
                            {watchlist.length > 0 ? 'View all →' : 'Build your watchlist →'}
                        </Link>
                    </div>
                    <QuoteCards items={cards} />
                </section>
            )}

            <div className="grid w-full gap-6 xl:grid-cols-3">
                <Panel title="Market Overview">
                    <MarketOverview groups={board.groups} />
                </Panel>
                <Panel title="Stock Heatmap" className="xl:col-span-2">
                    <SectorHeatmap sectors={board.sectors} />
                </Panel>
            </div>

            <div className="grid w-full gap-6 xl:grid-cols-3">
                <Panel title="Top Stories">
                    <div className="[&_.watchlist-news]:grid-cols-1">
                        <Suspense fallback={<NewsSkeleton count={5} />}>
                            <TopStories />
                        </Suspense>
                    </div>
                    <Link href="/news" className="mt-4 inline-block text-sm text-yellow-500 hover:underline">
                        All market news →
                    </Link>
                </Panel>
                <Panel title="Market Quotes" className="xl:col-span-2">
                    <MarketQuotes groups={board.groups} />
                </Panel>
            </div>
        </div>
        </LiveBoard>
    );
};

export default Home;
