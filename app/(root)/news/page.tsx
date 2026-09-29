import NewsList from "@/components/NewsList";
import { getMarketNews, getStockNews } from "@/lib/actions/market.actions";
import { getWatchlistSymbols } from "@/lib/actions/watchlist.actions";
import { displaySymbol } from "@/lib/market/symbols";

const NewsPage = async () => {
    const watchlistSymbols = await getWatchlistSymbols();
    const [watchlistNews, indiaNews, globalNews] = await Promise.all([
        getStockNews(watchlistSymbols, 9),
        getMarketNews('india'),
        getMarketNews('global'),
    ]);

    // Don't repeat a story across sections.
    const shown = new Set(watchlistNews.map((a) => a.id));
    const india = indiaNews.filter((a) => !shown.has(a.id));
    india.forEach((a) => shown.add(a.id));
    const global = globalNews.filter((a) => !shown.has(a.id)).slice(0, 12);

    return (
        <div className="flex flex-col gap-10">
            {watchlistSymbols.length > 0 && (
                <section className="flex flex-col gap-6">
                    <div>
                        <h1 className="watchlist-title">From Your Watchlist</h1>
                        <p className="text-sm text-gray-500">
                            Latest headlines for {watchlistSymbols.slice(0, 5).map(displaySymbol).join(', ')}
                            {watchlistSymbols.length > 5 ? ' and more' : ''}
                        </p>
                    </div>
                    <NewsList news={watchlistNews} emptyMessage="No recent headlines for your watchlist stocks." />
                </section>
            )}

            <section className="flex flex-col gap-6">
                <div>
                    <h2 className="watchlist-title">Indian Market</h2>
                    <p className="text-sm text-gray-500">Sensex, Nifty and Indian stocks</p>
                </div>
                <NewsList news={india} emptyMessage="No Indian market headlines right now. Please check back later." />
            </section>

            <section className="flex flex-col gap-6">
                <div>
                    <h2 className="watchlist-title">Global Markets</h2>
                    <p className="text-sm text-gray-500">Wall Street and world markets</p>
                </div>
                <NewsList news={global} />
            </section>
        </div>
    );
};

export default NewsPage;
