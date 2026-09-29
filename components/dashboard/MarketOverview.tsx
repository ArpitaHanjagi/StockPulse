'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import PriceChart from '@/components/charts/PriceChart';
import FlashOverlay from '@/components/FlashOverlay';
import { usePriceFlash } from '@/hooks/useLiveQuotes';
import { useLiveBoard } from '@/components/dashboard/LiveBoard';
import { SPRINGS } from '@/lib/motion';
import { formatPercent } from '@/lib/currency';
import { formatQuoteValue } from '@/lib/market/format';
import { cn } from '@/lib/utils';
import { displaySymbol } from '@/lib/market/symbols';

const ChangeText = ({ value }: { value?: number }) => (
    <span className="text-gray-100 tabular-nums">
        {value === undefined ? '—' : `${value >= 0 ? '▲' : '▼'} ${formatPercent(value)}`}
    </span>
);

type Item = MarketBoard['groups'][number]['items'][number];

// A list row: live value with a green/red flash on change. The "selected"
// background is a shared-layout element that springs between rows.
const OverviewRow = ({ item, active, onSelect }: { item: Item; active: boolean; onSelect: () => void }) => {
    const flash = usePriceFlash(item.quote?.price, item.quote?.changePercent);
    return (
        <li>
            <button
                onClick={onSelect}
                aria-pressed={active}
                className="relative flex w-full items-center justify-between gap-3 rounded px-2 py-2 text-left text-sm hover:bg-gray-700/30"
            >
                {active && <motion.span layoutId="overview-active-row" transition={SPRINGS.expand} className="absolute inset-0 rounded bg-gray-700/60" />}
                <FlashOverlay flash={flash} />
                <span className="relative min-w-0">
                    <span className="block truncate text-gray-100">{item.name}</span>
                    <span className="text-xs text-gray-500">{displaySymbol(item.symbol)}</span>
                </span>
                <span className="relative text-right">
                    <span className="block tabular-nums text-gray-100">{formatQuoteValue(item.quote)}</span>
                    <span className="text-xs">
                        <ChangeText value={item.quote?.changePercent} />
                    </span>
                </span>
            </button>
        </li>
    );
};

const MarketOverview = ({ groups }: { groups: MarketBoard['groups'] }) => {
    const [tab, setTab] = useState(0);
    const [selected, setSelected] = useState(groups[0]?.items[0]?.symbol);
    const { live } = useLiveBoard();

    const group = { ...groups[tab], items: groups[tab].items.map((i) => ({ ...i, quote: live(i.symbol) ?? i.quote })) };
    const current = group.items.find((i) => i.symbol === selected) ?? group.items[0];

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1 rounded-md bg-gray-900/60 p-1" role="tablist">
                {groups.map((g, i) => (
                    <button
                        key={g.title}
                        role="tab"
                        aria-selected={tab === i}
                        onClick={() => {
                            setTab(i);
                            setSelected(g.items[0]?.symbol);
                        }}
                        className={cn(
                            'relative flex-1 rounded px-3 py-1.5 text-xs font-medium',
                            tab === i ? 'text-gray-100' : 'text-gray-400 hover:text-gray-100'
                        )}
                    >
                        {tab === i && <motion.span layoutId="overview-active-tab" transition={SPRINGS.expand} className="absolute inset-0 rounded bg-gray-600" />}
                        <span className="relative">{g.title}</span>
                    </button>
                ))}
            </div>

            {current && (
                <div>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold text-gray-100">{current.name}</span>
                        <span className="text-sm tabular-nums text-gray-300">
                            {formatQuoteValue(current.quote)} <ChangeText value={current.quote?.changePercent} />
                        </span>
                    </div>
                    <PriceChart
                        key={current.symbol}
                        symbol={current.symbol}
                        variant="compact"
                        defaultRange="1Y"
                        valueFormat={current.quote?.isIndex ? 'number' : 'currency'}
                        height={220}
                    />
                </div>
            )}

            <ul className="flex flex-col">
                {group.items.map((item) => (
                    <OverviewRow key={item.symbol} item={item} active={item.symbol === current?.symbol} onSelect={() => setSelected(item.symbol)} />
                ))}
            </ul>
        </div>
    );
};

export default MarketOverview;
