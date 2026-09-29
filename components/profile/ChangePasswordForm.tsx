'use client';

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import { changePassword } from "@/lib/actions/auth.actions";

const EMPTY: ChangePasswordFormData = { currentPassword: "", newPassword: "", confirmPassword: "", revokeOtherSessions: true };

const ChangePasswordForm = () => {
    const {
        register,
        handleSubmit,
        reset,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordFormData>({ defaultValues: EMPTY, mode: "onBlur" });

    const onSubmit = async (data: ChangePasswordFormData) => {
        const result = await changePassword(data);
        if (!result.success) {
            toast.error("Could not change password", { description: result.error });
            return;
        }
        toast.success("Password changed");
        reset(EMPTY);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <InputField
                name="currentPassword"
                label="Current Password"
                placeholder="Enter your current password"
                type="password"
                register={register}
                error={errors.currentPassword}
                validation={{ required: "Current password is required" }}
            />
            <div className="grid gap-5 sm:grid-cols-2">
                <InputField
                    name="newPassword"
                    label="New Password"
                    placeholder="At least 8 characters"
                    type="password"
                    register={register}
                    error={errors.newPassword}
                    validation={{
                        required: "New password is required",
                        minLength: { value: 8, message: "Password must be at least 8 characters" },
                        validate: (v: string) => v !== getValues("currentPassword") || "New password must be different",
                    }}
                />
                <InputField
                    name="confirmPassword"
                    label="Confirm New Password"
                    placeholder="Repeat the new password"
                    type="password"
                    register={register}
                    error={errors.confirmPassword}
                    validation={{
                        required: "Please confirm your new password",
                        validate: (v: string) => v === getValues("newPassword") || "Passwords do not match",
                    }}
                />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-400">
                <input type="checkbox" className="h-4 w-4 accent-yellow-500" {...register("revokeOtherSessions")} />
                Sign out of all other devices
            </label>
            <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full sm:w-auto sm:px-8">
                {isSubmitting ? "Updating..." : "Update password"}
            </Button>
        </form>
    );
};

export default ChangePasswordForm;
