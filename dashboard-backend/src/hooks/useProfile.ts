'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Profile {
    userId: string;
    name: string;
    dob?: string;
    phone?: string;
    avatar?: string;
    timezone?: string;
    language?: string;
    completedOnboarding: boolean;
    lastLoginAt?: string;
    loginCount: number;
    role: string;
}

export function useProfile() {
    const { data: session } = useSession();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch profile
    const fetchProfile = useCallback(async () => {
        if (!session?.user?.id) return;

        try {
            const res = await fetch('/api/user/profile');
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setProfile(data.profile);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id]);

    const loginHistory = useCallback(async (page: number | undefined , itemsPerPage:number) => {
        if (!session?.user?.id) return { success: false, error: 'No user session' };

        try {
            const res = await fetch(`/api/user/history?page=${page}&limit=${itemsPerPage}`);
            const contentType = res.headers.get('content-type');

            if (!res.ok) {
                let errorMsg = `HTTP ${res.status}`;
                if (contentType?.includes('application/json')) {
                    const errorData = await res.json();
                    errorMsg = errorData.error || errorMsg;
                } else {
                    const text = await res.text();
                    errorMsg = text.slice(0, 100);
                }
                throw new Error(errorMsg);
            }

            if (!contentType?.includes('application/json')) {
                throw new Error('Server did not return JSON');
            }

            const data = await res.json();
            return { success: true, data };
        } catch (err: any) {
            console.error('History fetch error:', err);
            return { success: false, error: err.message };
        }
    }, [session?.user?.id]);

    // Update profile
    const updateProfile = useCallback(async (updates: Partial<Profile>) => {
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setProfile(data.profile);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }, []);

    // Complete onboarding (for OAuth users)
    const completeOnboarding = useCallback(async (data: { dob: string; phone?: string }) => {
        try {
            const res = await fetch('/api/user/complete-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            setProfile(prev => prev ? { ...prev, ...data, completedOnboarding: true } : null);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }, []);



    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return {
        profile,
        loading,
        error,
        refresh: fetchProfile,
        updateProfile,
        loginHistory,
        completeOnboarding,
    };
}