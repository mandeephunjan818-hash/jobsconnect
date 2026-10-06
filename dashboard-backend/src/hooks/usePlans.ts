/**
 * src/hooks/usePlans.ts
 *
 * Lightweight hook to fetch the available subscription plans.
 * Used by:
 *   - The user-facing billing/upgrade page (show available plans)
 *   - The admin plans page (read the list; mutations go direct via fetch)
 */

import { useState, useEffect, useCallback } from 'react';

export interface PlanItem {
    _id: string;
    key: string;
    name: string;
    stripePriceId: string | null;
    listingQuota: number;
    featuredSlots: number;
    /** stored in pence/cents */
    price: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UsePlansReturn {
    plans: PlanItem[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function usePlans(activeOnly = false): UsePlansReturn {
    const [plans, setPlans] = useState<PlanItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/plans', { cache: 'no-store' });
            if (!res.ok) throw new Error(`Failed to load plans (${res.status})`);
            const json = await res.json();
            const all: PlanItem[] = json.plans ?? [];
            setPlans(activeOnly ? all.filter(p => p.isActive) : all);
        } catch (e: any) {
            setError(e.message ?? 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, [activeOnly]);

    useEffect(() => { load(); }, [load]);

    return { plans, loading, error, refetch: load };
}