'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import SelectField from '@/components/forms/SelectField';
import { ALERT_TYPE_HELP, ALERT_TYPE_OPTIONS } from '@/lib/constants';
import { THRESHOLD_RULES } from '@/lib/alert-utils';
import { displaySymbol } from '@/lib/market/symbols';
import { createAlert, updateAlert } from '@/lib/actions/alert.actions';

const EMPTY_ALERT: AlertData = {
    symbol: '',
    company: '',
    alertName: '',
    alertType: 'upper',
    threshold: '',
};

// Sensible starting values when switching to a smart alert type.
const DEFAULT_THRESHOLD: Partial<Record<AlertType, string>> = { move: '3', volume: '2' };

const AlertModal = ({ alertId, alertData, action = 'Create', open, setOpen }: AlertModalProps) => {
    const router = useRouter();
    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<AlertData>({ defaultValues: alertData ?? EMPTY_ALERT, shouldUnregister: true });

    const alertType = useWatch({ control, name: 'alertType' });
    const rule = THRESHOLD_RULES[alertType];

    useEffect(() => {
        if (open) reset(alertData ?? EMPTY_ALERT);
    }, [open, alertData, reset]);

    // Prefill a typical value when switching to "% move" or "volume".
    useEffect(() => {
        const preset = DEFAULT_THRESHOLD[alertType];
        if (preset && alertData?.alertType !== alertType) setValue('threshold', preset);
        if (!preset && (alertType === 'upper' || alertType === 'lower') && alertData?.alertType !== alertType) setValue('threshold', '');
    }, [alertType, alertData?.alertType, setValue]);

    const onSubmit = async (data: AlertData) => {
        const payload = { ...data, threshold: data.threshold ?? '0' };
        const result = alertId ? await updateAlert(alertId, payload) : await createAlert(payload);

        if (!result.success) {
            toast.error(result.error ?? 'Something went wrong');
            return;
        }

        toast.success(alertId ? 'Alert updated' : 'Alert created', { description: 'note' in result ? result.note : undefined });
        setOpen(false);
        router.refresh();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="alert-dialog">
                <DialogHeader>
                    <DialogTitle className="alert-title">{action} Alert</DialogTitle>
                    <DialogDescription>
                        {alertData?.company ? `${alertData.company} (${displaySymbol(alertData.symbol)})` : 'Set an alert for this stock'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <input type="hidden" {...register('symbol')} />
                    <input type="hidden" {...register('company')} />

                    <InputField
                        name="alertName"
                        label="Alert Name"
                        placeholder="e.g. Buy the dip"
                        register={register}
                        error={errors.alertName}
                        validation={{ required: 'Alert name is required' }}
                    />
                    <div className="space-y-1.5">
                        <SelectField
                            name="alertType"
                            label="Condition"
                            placeholder="Select condition"
                            options={ALERT_TYPE_OPTIONS}
                            control={control}
                            error={errors.alertType}
                            required
                        />
                        <p className="text-xs text-gray-500">{ALERT_TYPE_HELP[alertType]}</p>
                    </div>

                    {/* Keyed by type so each gets its own validation rules;
                        52-week alerts need no value at all. */}
                    {rule && (
                        <InputField
                            key={alertType}
                            name="threshold"
                            label={rule.label}
                            placeholder={rule.placeholder}
                            type="number"
                            register={register}
                            error={errors.threshold}
                            validation={{
                                required: 'A value is required',
                                min: { value: rule.min, message: `Must be at least ${rule.min}` },
                                ...(rule.unit !== '₹' ? { max: { value: rule.max, message: `Must be at most ${rule.max}` } } : {}),
                            }}
                        />
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full">
                            {isSubmitting ? 'Saving...' : action === 'Edit' ? 'Save & Re-arm' : 'Create Alert'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AlertModal;
