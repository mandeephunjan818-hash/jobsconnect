import { useState, useEffect, useCallback, useRef } from 'react';

export interface FaqItem {
    id: string;
    question: string;
    answer: string;
    order: number;
}

export interface FaqApiResponse {
    data: FaqItem[];
    total: number;
}

export interface UseFaqParams {
    limit?: number;
}

export interface UseFaqReturn {
    data: FaqApiResponse | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

function buildUrl(p: UseFaqParams): string {
    const sp = new URLSearchParams();
    if (p.limit) sp.set('limit', String(p.limit));
    return `/api/faq?${sp.toString()}`;
}

export function useFaq(params: UseFaqParams = {}): UseFaqReturn {
    const [data, setData] = useState<FaqApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const paramsRef = useRef(params);
    paramsRef.current = params;

    const fetchData = useCallback(async (p: UseFaqParams) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(buildUrl(p), {
                cache: 'no-store',
                headers: { Accept: 'application/json' },
            });

            const contentType = res.headers.get('content-type') ?? '';
            if (!contentType.includes('application/json')) {
                throw new Error(`API returned ${res.status} ${res.statusText}. Make sure the route file is at src/app/api/faq/route.ts`);
            }

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error ?? `Request failed with status ${res.status}`);
            }

            setData(json as FaqApiResponse);
        } catch (e: any) {
            setError(e.message ?? 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(params);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.limit]);

    const refetch = useCallback(() => fetchData(paramsRef.current), [fetchData]);

    return { data, loading, error, refetch };
}