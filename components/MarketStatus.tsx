'use client';

import { useMinuteClock } from '@/hooks/useLiveQuotes';
import { MARKET_SESSIONS, formatDuration, getMarketStatus } from '@/lib/market/hours';
import { cn } from '@/lib/utils';

// Header pill: is NYSE / NSE open right now, and for how long.
const MarketStatus = ({ className }: { className?: string }) => {
    const minute = useMinuteClock();
    if (minute === undefined) return <div className={cn('h-7', className)} aria-hidden />;

    const now = new Date(minute * 60_000);
    const statuses = MARKET_SESSIONS.map((s) => getMarketStatus(s, now));

    return (
        <div className={cn('flex items-center gap-1.5', className)} aria-label="Market hours">
            {statuses.map(({ session, isOpen, minutesUntilChange }) => (
                <span
                    key={session.id}
                    title={`${session.label} ${isOpen ? 'closes' : 'opens'} in ${formatDuration(minutesUntilChange)}${session.id === 'IN' ? ' (festival holidays not included)' : ''}`}
                    className="flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs"
                >
                    <span className={cn('relative flex size-2')}>
                        {isOpen && <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-400 opacity-60 motion-reduce:hidden" />}
                        <span className={cn('relative inline-flex size-2 rounded-full', isOpen ? 'bg-teal-400' : 'bg-gray-500')} />
                    </span>
                    <span className="font-medium text-gray-200">{session.label}</span>
                    <span className="hidden text-gray-500 lg:inline">
                        {isOpen ? 'Open' : 'Closed'} · {isOpen ? 'closes' : 'opens'} in {formatDuration(minutesUntilChange)}
                    </span>
                    <span className="text-gray-500 lg:hidden">{isOpen ? 'Open' : 'Closed'}</span>
                </span>
            ))}
        </div>
    );
};

export default MarketStatus;
