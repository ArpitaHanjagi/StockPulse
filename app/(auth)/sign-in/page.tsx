'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import { signInWithEmail } from '@/lib/actions/auth.actions';
import { EMAIL_PATTERN } from '@/lib/constants';

const SignIn = () => {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInFormData>({
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onBlur',
    });

    const onSubmit = async (data: SignInFormData) => {
        const result = await signInWithEmail(data);

        if (result.success) {
            router.push('/');
            router.refresh();
        } else if (result.code === 'USER_NOT_FOUND') {
            toast.error('Account not found', {
                description: result.error,
                action: { label: 'Create account', onClick: () => router.push('/sign-up') },
            });
        } else {
            toast.error('Sign in failed', {
                description: result.error ?? 'Invalid email or password',
            });
        }
    };

    return (
        <>
            <h1 className="form-title">Welcome back</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="email"
                    label="Email"
                    placeholder="you@example.com"
                    register={register}
                    error={errors.email}
                    validation={{
                        required: 'Email is required',
                        pattern: { value: EMAIL_PATTERN, message: 'Please enter a valid email address' },
                    }}
                />

                <InputField
                    name="password"
                    label="Password"
                    placeholder="Enter your password"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{
                        required: 'Password is required',
                        minLength: { value: 8, message: 'Password must be at least 8 characters' },
                    }}
                />

                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="yellow-btn w-full mt-5"
                >
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                </Button>

                <FooterLink
                    text="Don't have an account?"
                    linkText="Create an account"
                    href="/sign-up"
                />
            </form>
        </>
    );
};

export default SignIn;