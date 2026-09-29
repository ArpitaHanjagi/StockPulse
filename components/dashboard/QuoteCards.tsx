'use client';

import { motion, useReducedMotion } from 'motion/react';
import PriceChange from '@/components/PriceChange';
import FlashOverlay from '@/components/FlashOverlay';
import { usePriceFlash } from '@/hooks/useLiveQuotes';
import { useLiveBoard } from '@/components/dashboard/LiveBoard';
import { formatINR } from '@/lib/currency';
import { HOVER_LIFT, PRESS, SPRINGS } from '@/lib/motion';
import { displaySymbol } from '@/lib/market/symbols';

const Card = ({ item }: { item: StockWithData }) => {
    const { live, open, openLayoutId } = useLiveBoard();
    const quote = live(item.symbol);
    const price = quote?.price ?? item.currentPrice;
    const change = quote?.changePercent ?? item.changePercent;
    const flash = usePriceFlash(price, change);
    const layoutId = `ticker-card-${item.symbol}`;
    const reduceMotion = useReducedMotion();

    return (
        <motion.button
            type="button"
            layoutId={layoutId}
            onClick={() => open({ symbol: item.symbol, name: item.company, layoutId, quote: quote ?? null })}
            whileHover={reduceMotion ? undefined : HOVER_LIFT}
            whileTap={reduceMotion ? undefined : PRESS}
            transition={SPRINGS.hover}
            aria-haspopup="dialog"
            aria-expanded={openLayoutId === layoutId}
            className="group relative flex flex-col gap-1 overflow-hidden border border-gray-700 bg-gray-800 p-4 text-left hover:border-yellow-500"
            style={{ borderRadius: 8 }}
        >
            <FlashOverlay flash={flash} />
            <span className="flex items-center justify-between text-sm text-gray-400">
                {displaySymbol(item.symbol)}
                <span className="text-xs text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    Inspect ↗
                </span>
            </span>
            <span className="truncate text-xs text-gray-500">{item.company}</span>
            <span className="text-lg font-semibold text-gray-100 tabular-nums">{formatINR(price)}</span>
            <PriceChange percent={change} className="text-sm" />
        </motion.button>
    );
};

// Dashboard quote cards: live-updating, spring hover, and each one morphs
// into the ticker inspector when clicked.
const QuoteCards = ({ items }: { items: StockWithData[] }) => (
    <div className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item) => (
            <Card key={item.symbol} item={item} />
        ))}
    </div>
);

export default QuoteCards;
