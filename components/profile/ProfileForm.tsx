'use client';

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import SelectField from "@/components/forms/SelectField";
import { CountrySelectField } from "@/components/forms/CountrySelectField";
import { INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import { updateProfile } from "@/lib/actions/auth.actions";

const ProfileForm = ({ defaultValues }: { defaultValues: ProfileFormData }) => {
    const router = useRouter();
    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<ProfileFormData>({ defaultValues, mode: "onBlur" });

    const onSubmit = async (data: ProfileFormData) => {
        const result = await updateProfile(data);
        if (!result.success) {
            toast.error("Could not save profile", { description: result.error });
            return;
        }
        toast.success("Profile updated");
        reset(data);
        router.refresh();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2">
            <InputField
                name="fullName"
                label="Full Name"
                placeholder="John Doe"
                register={register}
                error={errors.fullName}
                validation={{ required: "Full name is required", minLength: { value: 2, message: "Full name must be at least 2 characters" } }}
            />
            <CountrySelectField name="country" label="Country" control={control} error={errors.country} required />
            <SelectField
                name="investmentGoals"
                label="Investment Goals"
                placeholder="Select your investment goal"
                options={INVESTMENT_GOALS}
                control={control}
                error={errors.investmentGoals}
                required
            />
            <SelectField
                name="riskTolerance"
                label="Risk Tolerance"
                placeholder="Select your risk level"
                options={RISK_TOLERANCE_OPTIONS}
                control={control}
                error={errors.riskTolerance}
                required
            />
            <SelectField
                name="preferredIndustry"
                label="Preferred Industry"
                placeholder="Select your preferred industry"
                options={PREFERRED_INDUSTRIES}
                control={control}
                error={errors.preferredIndustry}
                required
            />
            <div className="flex items-end">
                <Button type="submit" disabled={isSubmitting || !isDirty} className="yellow-btn w-full">
                    {isSubmitting ? "Saving..." : "Save changes"}
                </Button>
            </div>
        </form>
    );
};

export default ProfileForm;
