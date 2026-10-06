'use client';

import { useState, useCallback } from 'react';

interface MFASetupData {
    qrCode: string;
    backupCodes: string[];
    secret: string;
}

export function useMFA() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [setupData, setSetupData] = useState<MFASetupData | null>(null);

    // Start MFA setup
    const startSetup = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/mfa/setup', {
                method: 'POST',
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSetupData(data);
            return { success: true, data };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    // Verify and enable MFA
    const verifyAndEnable = useCallback(async (code: string) => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/mfa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSetupData(null);
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        setupData,
        startSetup,
        verifyAndEnable,
        clearError: () => setError(null),
        clearSetup: () => setSetupData(null),
    };
}