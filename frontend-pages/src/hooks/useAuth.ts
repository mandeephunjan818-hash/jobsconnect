'use client';

import { useState, useCallback } from 'react';
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface SignUpData {
    name: string;
    email: string;
    password: string;
    role?: string;
}

interface SignInData {
    email: string;
    password: string;
    mfaCode?: string;
}

export function useAuth() {
    const router = useRouter();

    // ── Guard: useSession() returns undefined when this hook runs in a tree
    // that has no <SessionProvider> ancestor (e.g. a route prerendered without
    // it). Without this guard, the destructure below throws and takes the
    // whole build down. Falling back to "unauthenticated" is the correct
    // behavior for that edge case — a header with no session context has no
    // way to know a real session exists anyway.
    const sessionResult = useSession();
    const session = sessionResult?.data;
    const status = sessionResult?.status ?? 'unauthenticated';
    const update = sessionResult?.update ?? (async () => null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const registerWithOtp = useCallback(async (data: { name: string; email: string }) => {
        setLoading(true); setError(null);
        try {
            const res = await fetch('/api/auth/otp/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to send code');
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally { setLoading(false); }
    }, []);

    const verifyRegistrationOtp = useCallback(async (email: string, otp: string) => {
        setLoading(true); setError(null);
        try {
            const res = await fetch('/api/auth/otp/verify-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Verification failed');
            return { success: true, registrationToken: result.registrationToken };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally { setLoading(false); }
    }, []);

    const completeRegistrationLogin = useCallback(async (email: string, registrationToken: string) => {
        setLoading(true); setError(null);
        try {
            const result = await nextAuthSignIn('registration-credentials', {
                email, token: registrationToken, redirect: false, callbackUrl: '/dashboard/listings',
            });
            if (result?.error) throw new Error(result.error);
            if (result?.ok) {
                window.location.href = '/dashboard/listings';
                return { success: true };
            }
            throw new Error('Sign-in failed');
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally { setLoading(false); }
    }, [router]);

    const requestLoginOtp = useCallback(async (email: string) => {
        setLoading(true); setError(null);
        try {
            const res = await fetch('/api/auth/otp/login/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const result = await res.json();
            if (!res.ok) {
                // Don't set `error` for these two — the component handles them
                // with its own toast + redirect, not the generic error toast.
                if (result.notRegistered || result.needsVerification) {
                    return {
                        success: false,
                        notRegistered: result.notRegistered,
                        needsVerification: result.needsVerification,
                    };
                }
                throw new Error(result.error || 'Failed to send code');
            }
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally { setLoading(false); }
    }, []);

    const signInWithOtp = useCallback(async (email: string, otp: string) => {
        setLoading(true); setError(null);
        try {
            const result = await nextAuthSignIn('otp-credentials', {
                email, otp, redirect: false, callbackUrl: '/dashboard/listings',
            });
            if (result?.error) throw new Error(result.error);
            if (result?.ok) {
                // router.push('/dashboard/listings');
                // router.refresh();
                window.location.href = '/dashboard/listings';
                return { success: true };
            }
            throw new Error('Login failed');
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally { setLoading(false); }
    }, [router]);

    // SIGN UP
    const signUp = useCallback(async (data: SignUpData) => {
        setLoading(true);
        setError(null);

        console.log('Attempting sign in with:', data);

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Signup failed');
            }

            return { success: true, data: result };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    // SIGN IN
    const signIn = useCallback(async (data: SignInData) => {
        setLoading(true);
        setError(null);

        try {
            const result = await nextAuthSignIn('user-credentials', {   // ✅ use the user‑specific provider
                email: data.email,
                password: data.password,
                mfaCode: data.mfaCode,
                redirect: false,
                callbackUrl: '/dashboard/listings',   // regular users go here
            });

            if (result?.error) {
                if (result.error === 'MFA_REQUIRED') {
                    return { success: false, requiresMFA: true };
                }
                throw new Error(result.error);
            }

            if (result?.ok) {
                window.location.href = '/dashboard/listings';
                router.refresh();
                return { success: true };
            }

            throw new Error('Login failed');
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [router]);

    // ADMIN SIGN IN (only 'admin' / 'sub-admin')
    const signInAsAdmin = useCallback(async (data: SignInData) => {
        setLoading(true);
        setError(null);

        try {
            const result = await nextAuthSignIn('admin-credentials', {
                email: data.email,
                password: data.password,
                mfaCode: data.mfaCode,
                redirect: false,
                callbackUrl: '/admin/job-bank',   // or any admin dashboard you prefer
            });

            if (result?.error) {
                if (result.error === 'MFA_REQUIRED') {
                    return { success: false, requiresMFA: true };
                }
                throw new Error(result.error);
            }

            if (result?.ok) {
                window.location.href = '/admin/job-bank';
                router.refresh();
                return { success: true };
            }

            throw new Error('Admin login failed');
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [router]);

    // SIGN OUT
    const signOut = useCallback(async () => {
        await nextAuthSignOut({ redirect: true, callbackUrl: '/' });
    }, []);

    // GOOGLE SIGN IN
    const signInWithGoogle = useCallback(() => {
        nextAuthSignIn('google', { callbackUrl: '/dashboard/listings' });
    }, []);

    // GITHUB SIGN IN
    const signInWithGithub = useCallback(() => {
        nextAuthSignIn('github', { callbackUrl: '/dashboard/listings' });
    }, []);

    const logout = useCallback(async (redirectTo: any = '/') => {
        setLoading(true);

        try {
            // Call NextAuth signOut - this clears the JWT cookie
            await nextAuthSignOut({
                redirect: true,
                callbackUrl: redirectTo
            });

            // If you want to do anything after logout (analytics, etc.)
            console.log('User logged out successfully');

        } catch (err: any) {
            console.error('Logout error:', err);
            setError(err.message);

            // Force redirect even if NextAuth fails
            // router.push(redirectTo);
            // router.refresh();
            window.location.href = redirectTo;
        } finally {
            setLoading(false);
        }
    }, [router]);

    return {
        user: session?.user,
        isAuthenticated: status === 'authenticated',
        isLoading: status === 'loading' || loading,
        error,
        signUp,
        signIn,
        signInAsAdmin,
        signOut,
        logout,
        signInWithGoogle,
        signInWithGithub,
        registerWithOtp,
        verifyRegistrationOtp,
        completeRegistrationLogin,
        requestLoginOtp,
        signInWithOtp,
        updateSession: update,
        sessionStatus: status,
        sessionData: session,
        clearError: () => setError(null),
    };
}