// src/hooks/useBlogs.ts
import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Canonical shared type ────────────────────────────────────
// Single source of truth — import this everywhere instead of redefining
export interface BlogPostItem {
    id: string;
    title: string;
    excerpt: string;
    imageUrl: string;
    category: string;
    date: string;
    slug: string;
    order: number;
    status: 'draft' | 'scheduled' | 'published' | 'archived';
    isActive: boolean;
    publishAt: string | null;
    adminNotes: { message: string; type: string; createdAt: string; createdBy?: string }[];
    createdAt: string;
    updatedAt: string;
}

export interface BlogsApiResponse {
    data: BlogPostItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

export interface UseBlogsParams {
    perPage?: number;     // renamed from limit — matches API param
    page?: number;
    category?: string;
    status?: string;      // added — lets callers filter by status
    search?: string;      // added — supports search queries
    publicOnly?: boolean; // when true, adds status=published&isActive=true
}

export interface UseBlogsReturn {
    data: BlogsApiResponse | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

function buildUrl(p: UseBlogsParams): string {
    const sp = new URLSearchParams();

    // Pagination — API uses `perPage`, not `limit`
    if (p.perPage) sp.set('perPage', String(p.perPage));
    if (p.page) sp.set('page', String(p.page));

    // Filters
    if (p.category) sp.set('category', p.category);
    if (p.search) sp.set('search', p.search);

    // Public pages should never receive drafts/archived posts
    if (p.publicOnly) {
        sp.set('status', 'published');
        sp.set('isActive', 'true');
    } else if (p.status) {
        sp.set('status', p.status);
    }

    return `/api/blog?${sp.toString()}`;
}

export function useBlogs(params: UseBlogsParams = {}): UseBlogsReturn {
    const [data, setData] = useState<BlogsApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const paramsRef = useRef(params);
    paramsRef.current = params;

    const fetchData = useCallback(async (p: UseBlogsParams) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(buildUrl(p), {
                cache: 'no-store',
                headers: { Accept: 'application/json' },
            });

            const contentType = res.headers.get('content-type') ?? '';
            if (!contentType.includes('application/json')) {
                throw new Error(
                    `API returned ${res.status} ${res.statusText}. ` +
                    `Make sure the route file exists at src/app/api/blog/route.ts`
                );
            }

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error ?? `Request failed with status ${res.status}`);
            }

            setData(json as BlogsApiResponse);
        } catch (e: any) {
            setError(e.message ?? 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(params);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.perPage, params.page, params.category, params.status, params.search, params.publicOnly]);

    const refetch = useCallback(() => fetchData(paramsRef.current), [fetchData]);

    return { data, loading, error, refetch };
}