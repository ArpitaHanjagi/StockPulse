'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, BellRing, CheckCircle2, Pencil, Repeat, Trash2 } from 'lucide-react';
import PriceChange from '@/components/PriceChange';
import { describeCondition } from '@/lib/alert-utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import AlertModal from '@/components/AlertModal';
import { deleteAlert } from '@/lib/actions/alert.actions';
import { formatINR } from '@/lib/currency';
import { CHART_COLORS } from '@/lib/market/chart-colors';
import { displaySymbol } from '@/lib/market/symbols';

// How far the price still has to move to reach the target, and how close it
// already is (for the progress bar). Progress is price/target for "above"
// alerts and target/price for "below" alerts, so it reaches 100% on trigger.
const distanceToTarget = (alert: Alert) => {
    const price = alert.currentPrice;
    if (price === undefined || price <= 0) return null;
    const remaining = alert.alertType === 'upper' ? alert.threshold - price : price - alert.threshold;
    const progress = alert.alertType === 'upper' ? price / alert.threshold : alert.threshold / price;
    return {
        remaining: Math.max(0, remaining),
        remainingPct: Math.max(0, (remaining / price) * 100),
        progress: Math.min(100, Math.max(0, progress * 100)),
    };
};

const formatWhen = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// Body for recurring smart alerts: the condition in words, today's numbers
// and when it last fired. Big-move alerts also show today's progress.
const SmartAlertBody = ({ alert }: { alert: Alert }) => {
    const chg = alert.changePercent;
    const moveProgress = alert.alertType === 'move' && chg !== undefined ? Math.min(100, (Math.abs(chg) / alert.threshold) * 100) : null;

    return (
        <>
            <div className="grid grid-cols-2 gap-2 text-sm tabular-nums">
                <div className="rounded-md bg-gray-900/50 px-3 py-2">
                    <p className="text-[11px] text-gray-500">Condition</p>
                    <p className="font-semibold leading-snug text-gray-100">{describeCondition(alert.alertType, alert.threshold)}</p>
                </div>
                <div className="rounded-md bg-gray-900/50 px-3 py-2">
                    <p className="text-[11px] text-gray-500">Now</p>
                    <p className="font-semibold text-gray-100">{formatINR(alert.currentPrice)}</p>
                    <PriceChange percent={chg} className="text-xs" />
                </div>
            </div>
            {moveProgress !== null && !alert.firedToday && !alert.startsNextSession && (
                <div>
                    <div className="mb-1 flex justify-between text-xs text-gray-400 tabular-nums">
                        <span>Today: {Math.abs(chg!).toFixed(2)}% of the {alert.threshold}% trigger</span>
                        <span className="text-gray-500">{moveProgress.toFixed(0)}%</span>
                    </div>
                    <div
                        className="h-1.5 overflow-hidden rounded-full bg-gray-700"
                        role="progressbar"
                        aria-valuenow={Math.round(moveProgress)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${alert.alertName}: today's move is ${moveProgress.toFixed(0)}% of the trigger`}
                    >
                        <div
                            className="h-full w-full origin-left rounded-full bg-yellow-500 transition-transform duration-700 motion-reduce:transition-none"
                            style={{ transform: `scaleX(${moveProgress / 100})` }}
                        />
                    </div>
                </div>
            )}
            <p className="text-xs text-gray-500">
                {alert.startsNextSession
                    ? 'Already true today, so it starts watching from the next trading session. '
                    : alert.triggeredAt
                      ? `Last fired ${formatWhen(alert.triggeredAt)} at ${formatINR(alert.triggeredPrice)}. `
                      : 'Has not fired yet. '}
                Checks every trading day.
            </p>
        </>
    );
};

const AlertRow = ({ alert, onEdit, onDelete }: { alert: Alert; onEdit: () => void; onDelete: () => void }) => {
    const upper = alert.alertType === 'upper';
    const directionColor = upper ? CHART_COLORS.up : CHART_COLORS.down;
    const distance = distanceToTarget(alert);

    return (
        <li className="group flex flex-col gap-3 p-4">
            <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-gray-700 text-sm font-bold text-yellow-500">
                    {alert.symbol.charAt(0)}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-gray-100">{alert.alertName}</p>
                        {alert.recurring ? (
                            alert.startsNextSession ? (
                                <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-700 px-2 py-0.5 text-[11px] font-medium text-gray-300">
                                    <Repeat className="size-3" /> Starts next session
                                </span>
                            ) : alert.firedToday ? (
                                <span className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[11px] font-medium text-yellow-500">
                                    <CheckCircle2 className="size-3" /> Fired today
                                </span>
                            ) : (
                                <span className="flex shrink-0 items-center gap-1 rounded-full bg-teal-400/10 px-2 py-0.5 text-[11px] font-medium text-teal-400">
                                    <Repeat className="size-3" /> Daily
                                </span>
                            )
                        ) : alert.triggered ? (
                            <span className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[11px] font-medium text-yellow-500">
                                <CheckCircle2 className="size-3" /> Triggered
                            </span>
                        ) : (
                            <span className="flex shrink-0 items-center gap-1 rounded-full bg-teal-400/10 px-2 py-0.5 text-[11px] font-medium text-teal-400">
                                <span className="size-1.5 rounded-full bg-teal-400" /> Watching
                            </span>
                        )}
                    </div>
                    <Link href={`/stocks/${alert.symbol}`} className="block truncate text-xs text-gray-500 hover:text-yellow-500">
                        {alert.company} · {displaySymbol(alert.symbol)}
                    </Link>
                </div>
            </div>

            {alert.recurring ? (
                <SmartAlertBody alert={alert} />
            ) : (
            <>
            <div className="grid grid-cols-2 gap-2 text-sm tabular-nums">
                <div className="rounded-md bg-gray-900/50 px-3 py-2">
                    <p className="text-[11px] text-gray-500">Target</p>
                    <p className="font-semibold text-gray-100">
                        <span style={{ color: directionColor }} aria-hidden>
                            {upper ? '▲' : '▼'}
                        </span>{' '}
                        <span className="sr-only">{upper ? 'Above' : 'Below'}</span>
                        {formatINR(alert.threshold)}
                    </p>
                </div>
                <div className="rounded-md bg-gray-900/50 px-3 py-2">
                    <p className="text-[11px] text-gray-500">{alert.triggered ? 'Triggered at' : 'Now'}</p>
                    <p className="font-semibold text-gray-100">
                        {formatINR(alert.triggered ? alert.triggeredPrice : alert.currentPrice)}
                    </p>
                </div>
            </div>

            {alert.triggered ? (
                <p className="text-xs text-gray-500">
                    {alert.triggeredAt ? `Fired ${formatWhen(alert.triggeredAt)}. ` : ''}Edit the alert to watch again.
                </p>
            ) : (
                distance && (
                    <div>
                        <div className="mb-1 flex justify-between text-xs text-gray-400 tabular-nums">
                            <span>
                                {formatINR(distance.remaining)} ({distance.remainingPct.toFixed(1)}%) {upper ? 'to rise' : 'to fall'}
                            </span>
                            <span className="text-gray-500">{distance.progress.toFixed(0)}% there</span>
                        </div>
                        <div
                            className="h-1.5 overflow-hidden rounded-full bg-gray-700"
                            role="progressbar"
                            aria-valuenow={Math.round(distance.progress)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${alert.alertName}: ${distance.progress.toFixed(0)}% of the way to target`}
                        >
                            <div
                                className="h-full w-full origin-left rounded-full transition-transform duration-700 motion-reduce:transition-none"
                                style={{ transform: `scaleX(${distance.progress / 100})`, background: directionColor }}
                            />
                        </div>
                    </div>
                )
            )}
            </>
            )}

            <div className="-mb-1 flex justify-end gap-1">
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-100" onClick={onEdit}>
                    <Pencil className="size-3.5" /> {alert.triggered && !alert.recurring ? 'Re-arm' : 'Edit'}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs text-gray-400 hover:bg-red-500/15 hover:text-red-400"
                    onClick={onDelete}
                    aria-label={`Delete ${alert.alertName}`}
                >
                    <Trash2 className="size-3.5" /> Delete
                </Button>
            </div>
        </li>
    );
};

const AlertsList = ({ alertData }: AlertsListProps) => {
    const router = useRouter();
    const [editing, setEditing] = useState<Alert | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Alerts deleted in this session are hidden immediately (optimistic)
    // and restored if the server rejects the delete.
    const [deleted, setDeleted] = useState<Set<string>>(new Set());
    const alerts = (alertData ?? []).filter((alert) => !deleted.has(alert.id));
    const activeCount = alerts.filter((a) => !a.triggered).length;

    const handleEdit = (alert: Alert) => {
        setEditing(alert);
        setModalOpen(true);
    };

    const handleDelete = async (alert: Alert) => {
        setDeleted((prev) => new Set(prev).add(alert.id));
        const result = await deleteAlert(alert.id);

        if (!result.success) {
            setDeleted((prev) => {
                const next = new Set(prev);
                next.delete(alert.id);
                return next;
            });
            toast.error(result.error ?? 'Failed to delete alert');
            return;
        }

        toast.success(`Deleted alert "${alert.alertName}"`);
        router.refresh();
    };

    return (
        <section className="min-w-0 space-y-4 lg:col-span-1">
            <h2 className="watchlist-title">Price Alerts</h2>
            <p className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
                <BellRing className="size-3" />
                {alerts.length === 0
                    ? 'Checked every minute while the app is open'
                    : `${activeCount} active · ${alerts.length - activeCount} triggered · checked every minute`}
            </p>

            <div className="overflow-hidden rounded-lg border border-gray-600 bg-gray-800">
                {alerts.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                        <Bell className="mx-auto mb-3 size-8 text-gray-600" />
                        <p className="text-sm font-medium text-gray-300">No price alerts yet</p>
                        <p className="mt-1 text-xs text-gray-500">
                            Use the bell on any watchlist row or stock page to get notified when a price crosses your target.
                        </p>
                    </div>
                ) : (
                    <ul className="max-h-[70vh] divide-y divide-gray-700 overflow-y-auto">
                        {alerts.map((alert) => (
                            <AlertRow key={alert.id} alert={alert} onEdit={() => handleEdit(alert)} onDelete={() => handleDelete(alert)} />
                        ))}
                    </ul>
                )}
            </div>

            {editing && (
                <AlertModal
                    alertId={editing.id}
                    action="Edit"
                    open={modalOpen}
                    setOpen={setModalOpen}
                    alertData={{
                        symbol: editing.symbol,
                        company: editing.company,
                        alertName: editing.alertName,
                        alertType: editing.alertType,
                        threshold: String(editing.threshold),
                    }}
                />
            )}
        </section>
    );
};

export default AlertsList;
