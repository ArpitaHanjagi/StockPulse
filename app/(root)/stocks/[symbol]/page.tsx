import { Suspense } from "react";
import { notFound } from "next/navigation";
import StockActions from "@/components/StockActions";
import StockSummary from "@/components/stock/StockSummary";
import NewsList from "@/components/NewsList";
import NewsSkeleton from "@/components/NewsSkeleton";
import PriceChart from "@/components/charts/PriceChart";
import CompareChart from "@/components/charts/CompareChart";
import TechnicalAnalysis from "@/components/stock/TechnicalAnalysis";
import CompanyProfile from "@/components/stock/CompanyProfile";
import Financials from "@/components/stock/Financials";
import WhyMoving, { WhyMovingSkeleton } from "@/components/stock/WhyMoving";
import SipBacktest from "@/components/stock/SipBacktest";
import { getCompanyOverview, getPriceHistory, getQuote, getStockNews } from "@/lib/actions/market.actions";
import { getWatchlistSymbols } from "@/lib/actions/watchlist.actions";
import { formatINR } from "@/lib/currency";
import { computeTechnicals } from "@/lib/market/technicals";
import { displaySymbol, isIndianSymbol } from "@/lib/market/symbols";

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="min-w-0 rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-100 sm:text-xl">{title}</h2>
        {children}
    </section>
);

// Streams in after the rest of the page so headlines never delay the quote.
const StockNews = async ({ symbol }: { symbol: string }) => {
    const news = await getStockNews([symbol], 6);
    return <NewsList news={news} emptyMessage={`No recent headlines for ${displaySymbol(symbol)}.`} />;
};

const StockDetailsPage = async ({ params }: StockDetailsPageProps) => {
    const { symbol: rawSymbol } = await params;
    const symbol = decodeURIComponent(rawSymbol).toUpperCase();

    const [quote, watchlistSymbols, history, overview] = await Promise.all([
        getQuote(symbol),
        getWatchlistSymbols(),
        getPriceHistory(symbol, '1Y'),
        getCompanyOverview(symbol),
    ]);

    if (!quote) notFound();

    const technicals = history ? computeTechnicals(history.candles) : null;
    const isInWatchlist = watchlistSymbols.includes(symbol);
    return (
        <div className="flex flex-col gap-6">
            <StockSummary
                initial={quote}
                actions={<StockActions symbol={symbol} company={quote.name} isInWatchlist={isInWatchlist} />}
            />

            {quote.currency !== 'INR' && (
                <p className="-mt-3 text-xs text-gray-500">
                    {quote.inrRate
                        ? `Prices converted from ${quote.currency} at 1 ${quote.currency} = ${formatINR(quote.inrRate)}. The price chart shows ${quote.currency}.`
                        : `Live ${quote.currency}/INR rate unavailable, so INR prices are hidden. The price chart shows ${quote.currency}.`}
                </p>
            )}

            {/* Streams in separately so it never delays the rest of the page. */}
            {!quote.isIndex && (
                <Suspense fallback={<WhyMovingSkeleton />}>
                    <WhyMoving symbol={symbol} />
                </Suspense>
            )}

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
                    <Card title="Price Chart">
                        <PriceChart symbol={symbol} initial={history} />
                    </Card>
                    <Card title="Compare Performance">
                        <CompareChart symbol={symbol} />
                    </Card>
                    {!quote.isIndex && (
                        <Card title="SIP Backtest">
                            <SipBacktest symbol={symbol} name={quote.name} />
                        </Card>
                    )}
                    <Card title="Technical Analysis">
                        <TechnicalAnalysis summary={technicals} />
                    </Card>
                </div>

                <div className="flex min-w-0 flex-col gap-6">
                    <Card title="Company Profile">
                        <CompanyProfile overview={overview} />
                    </Card>
                    <Card title="Financials">
                        <Financials overview={overview} />
                    </Card>
                </div>
            </div>

            <section className="flex flex-col gap-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-2xl font-semibold text-gray-100">Latest {displaySymbol(symbol)} News</h2>
                    {/* Free feeds cover Indian companies thinly, so offer a
                        plain link out for fuller coverage. */}
                    {isIndianSymbol(symbol) && (
                        <a
                            href={`https://news.google.com/search?q=${encodeURIComponent(`${quote.name} share`)}&hl=en-IN&gl=IN&ceid=IN:en`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-yellow-500 hover:underline"
                        >
                            More {quote.name} news on Google News ↗
                        </a>
                    )}
                </div>
                <Suspense fallback={<NewsSkeleton />}>
                    <StockNews symbol={symbol} />
                </Suspense>
            </section>
        </div>
    );
};

export default StockDetailsPage;
