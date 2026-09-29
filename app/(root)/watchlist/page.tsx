import WatchlistTable from "@/components/WatchlistTable";
import AlertsList from "@/components/AlertsList";
import { getWatchlistWithData } from "@/lib/actions/watchlist.actions";
import { getAlerts } from "@/lib/actions/alert.actions";
import { getPriceHistory } from "@/lib/actions/market.actions";

// 1-month closes per symbol for the sparkline column (cached upstream).
const getSparklines = async (symbols: string[]) => {
    const histories = await Promise.all(symbols.map((s) => getPriceHistory(s, '1M')));
    return Object.fromEntries(symbols.map((s, i) => [s, histories[i]?.candles.map((c) => c.c) ?? []]));
};

const WatchlistPage = async () => {
    const [watchlist, alerts] = await Promise.all([getWatchlistWithData(), getAlerts()]);
    const sparklines = await getSparklines(watchlist.map((w) => w.symbol));

    return (
        <div className="watchlist-container">
            <section className="watchlist">
                <h1 className="watchlist-title">Watchlist</h1>
                <WatchlistTable watchlist={watchlist} sparklines={sparklines} />
            </section>

            <AlertsList alertData={alerts} />
        </div>
    );
};

export default WatchlistPage;
