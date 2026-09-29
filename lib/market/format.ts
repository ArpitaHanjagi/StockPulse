import { formatINR, formatINRCompact, formatINRRange, formatPercent, formatVolume } from "@/lib/currency";

export const toStockWithData = (
    item: { symbol: string; company: string; addedAt?: Date },
    quote: StockQuote | null | undefined
): StockWithData => ({
    symbol: item.symbol,
    company: item.company,
    addedAt: item.addedAt?.toISOString(),
    currentPrice: quote?.price,
    changePercent: quote?.changePercent,
    priceFormatted: quote?.price !== undefined ? formatINR(quote.price) : undefined,
    changeFormatted: quote?.changePercent !== undefined ? formatPercent(quote.changePercent) : undefined,
    yearRange: formatINRRange(quote?.yearLow, quote?.yearHigh),
    volume: formatVolume(quote?.volume),
    marketCap: formatINRCompact(quote?.marketCap),
    peRatio: quote?.peRatio !== undefined ? quote.peRatio.toFixed(2) : undefined,
    marketCapValue: quote?.marketCap,
    peRatioValue: quote?.peRatio,
    volumeValue: quote?.volume,
});

// Index levels are points; everything else is an INR price.
export const formatQuoteValue = (quote: StockQuote | null) =>
    !quote || quote.price === undefined
        ? '—'
        : quote.isIndex
          ? quote.price.toLocaleString('en-US', { maximumFractionDigits: 2 })
          : formatINR(quote.price);
