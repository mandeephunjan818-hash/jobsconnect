import { useState, useEffect, useCallback, useRef } from 'react';

export interface MetadataItem {
    id: string;
    urlPattern: string;
    siteId?: string;
    title: string;
    logo: string;
    logoAlt?: string;
    logoTitle?: string;
    description: string;
    keywords: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogImageAlt?: string;
    ogImageTitle?: string;
    canonicalUrl?: string;
    robots?: string;
    isActive: boolean;
}

export interface MetadataApiResponse {
    data: MetadataItem | null;
}

export interface UseMetadataParams {
    url: string; // the current page URL (e.g., '/about')
    site?: string;
}

export interface UseMetadataReturn {
    metadata: MetadataItem | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

function buildUrl(p: UseMetadataParams): string {
    const sp = new URLSearchParams();
    sp.set('url', p.url);
    if (p.site) sp.set('site', p.site);
    return `/api/admin/metadata?${sp.toString()}`;
}

export function useMetadata({ url, site }: UseMetadataParams): UseMetadataReturn {
    const [metadata, setMetadata] = useState<MetadataItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const paramsRef = useRef({ url, site });
    paramsRef.current = { url, site };  // ✅ keep ref in sync

    const fetchData = useCallback(async (p: UseMetadataParams) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(buildUrl(p), {
                cache: 'no-store',
                headers: { Accept: 'application/json' },
            });

            const contentType = res.headers.get('content-type') ?? '';
            if (!contentType.includes('application/json')) {
                throw new Error(`API returned ${res.status} ${res.statusText}`);
            }

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error ?? `Request failed with status ${res.status}`);
            }
            setMetadata(json?.data);
        } catch (e: any) {
            setError(e.message ?? 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData({ url, site });  // ✅ site passed
    }, [url, site, fetchData]);    // ✅ site in deps

    const refetch = useCallback(() => fetchData(paramsRef.current), [fetchData]);

    return { metadata, loading, error, refetch };
}