'use server';

import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { getDb } from "@/DATABASE/firebase";
import { buildWelcomeMessage, createNotification } from "@/lib/notifications";
import { APP_NAME } from "@/lib/constants";

export const signUpWithEmail = async (data: SignUpFormData) => {
    try {
        const response = await auth.api.signUpEmail({
            body: {
                email: data.email,
                password: data.password,
                name: data.fullName,
                country: data.country,
                investmentGoals: data.investmentGoals,
                riskTolerance: data.riskTolerance,
                preferredIndustry: data.preferredIndustry,
            },
            headers: await headers(),
        });

        // A personalised in-app welcome replaces the old welcome email. A
        // failure here must not fail the sign-up itself.
        try {
            await createNotification(response.user.id, {
                type: 'welcome',
                title: `Welcome to ${APP_NAME}, ${data.fullName.split(' ')[0]}!`,
                message: buildWelcomeMessage({ ...data, name: data.fullName }),
                link: '/',
            });
        } catch (e) {
            console.error('Failed to create welcome notification', e);
        }

        return { success: true };
    } catch (e) {
        console.error('Sign up failed', e);
        return { success: false, error: e instanceof Error ? e.message : 'Sign up failed' };
    }
};

export const signInWithEmail = async (data: SignInFormData) => {
    try {
        // better-auth stores emails lowercased; check the account exists first
        // so an unknown email gets pointed to sign-up rather than a generic error.
        const existing = await getDb()
            .collection('user')
            .where('email', '==', data.email.trim().toLowerCase())
            .limit(1)
            .get();
        if (existing.empty) {
            return {
                success: false,
                code: 'USER_NOT_FOUND' as const,
                error: 'No account found with this email. Please create a new account.',
            };
        }

        await auth.api.signInEmail({
            body: {
                email: data.email,
                password: data.password,
            },
            headers: await headers(),
        });

        return { success: true };
    } catch (e) {
        console.error('Sign in failed', e);
        return { success: false, error: e instanceof Error ? e.message : 'Invalid email or password' };
    }
};

export const signOutUser = async () => {
    try {
        await auth.api.signOut({ headers: await headers() });
        return { success: true };
    } catch (e) {
        console.error('Sign out failed', e);
        return { success: false, error: e instanceof Error ? e.message : 'Sign out failed' };
    }
};

export const updateProfile = async (data: ProfileFormData) => {
    try {
        const name = data.fullName.trim();
        if (name.length < 2) return { success: false, error: 'Full name must be at least 2 characters' };

        await auth.api.updateUser({
            body: {
                name,
                country: data.country,
                investmentGoals: data.investmentGoals,
                riskTolerance: data.riskTolerance,
                preferredIndustry: data.preferredIndustry,
            },
            headers: await headers(),
        });

        return { success: true };
    } catch (e) {
        console.error('Profile update failed', e);
        return { success: false, error: e instanceof Error ? e.message : 'Profile update failed' };
    }
};

export const changePassword = async (data: ChangePasswordFormData) => {
    try {
        await auth.api.changePassword({
            body: {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
                revokeOtherSessions: data.revokeOtherSessions,
            },
            headers: await headers(),
        });

        return { success: true };
    } catch (e) {
        console.error('Password change failed', e);
        return { success: false, error: e instanceof Error ? e.message : 'Password change failed' };
    }
};

export const signOutOtherDevices = async () => {
    try {
        await auth.api.revokeOtherSessions({ headers: await headers() });
        return { success: true };
    } catch (e) {
        console.error('Revoking other sessions failed', e);
        return { success: false, error: e instanceof Error ? e.message : 'Could not sign out other devices' };
    }
};
