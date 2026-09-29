// Trading sessions for the markets the app covers. Pure time maths on the
// exchange's own time zone — no API needed. Holidays and early closes come
// from ./holidays (complete for NYSE; NSE festival holidays must be added
// there each year).

import { calendarDate, getSpecialDay } from '@/lib/market/holidays';

export type MarketSession = { id: string; label: string; timeZone: string; open: [number, number]; close: [number, number] };

export const MARKET_SESSIONS: MarketSession[] = [
    { id: 'US', label: 'NYSE', timeZone: 'America/New_York', open: [9, 30], close: [16, 0] },
    { id: 'IN', label: 'NSE', timeZone: 'Asia/Kolkata', open: [9, 15], close: [15, 30] },
];

export type MarketStatus = { session: MarketSession; isOpen: boolean; minutesUntilChange: number };

// Today's date and minutes since midnight in `timeZone`.
const localClock = (now: Date, timeZone: string) => {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
            .formatToParts(now)
            .map((p) => [p.type, p.value])
    );
    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        minutes: Number(parts.hour) * 60 + Number(parts.minute),
    };
};

const toMinutes = ([h, m]: [number, number]) => h * 60 + m;

// Session hours on a calendar date, or null when the market is shut.
const sessionOn = (session: MarketSession, date: Date) => {
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) return null;
    const special = getSpecialDay(session.id, date);
    if (special === 'closed') return null;
    return { openAt: toMinutes(session.open), closeAt: toMinutes(special?.closesAt ?? session.close) };
};

export const getMarketStatus = (session: MarketSession, now = new Date()): MarketStatus => {
    const { year, month, day, minutes } = localClock(now, session.timeZone);

    const today = sessionOn(session, calendarDate(year, month, day));
    if (today && minutes >= today.openAt && minutes < today.closeAt) {
        return { session, isOpen: true, minutesUntilChange: today.closeAt - minutes };
    }

    // Minutes until the next trading day's open (a long weekend plus a
    // holiday is at most a few days, so two weeks is plenty).
    for (let offset = 0; offset < 14; offset++) {
        const next = sessionOn(session, calendarDate(year, month, day + offset));
        if (next && (offset > 0 || minutes < next.openAt)) {
            return { session, isOpen: false, minutesUntilChange: offset * 24 * 60 - minutes + next.openAt };
        }
    }
    return { session, isOpen: false, minutesUntilChange: 0 };
};

export const formatDuration = (minutes: number) => {
    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    const m = minutes % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};
