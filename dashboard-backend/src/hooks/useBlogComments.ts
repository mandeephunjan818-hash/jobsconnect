import { useState, useEffect, useCallback, useRef } from 'react';

export interface CommentItem {
    id: string;
    blogSlug: string;
    name: string;
    email: string;
    phone?: string;
    message: string;
    isApproved: boolean;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CommentsApiResponse {
    data: CommentItem[];
    total: number;
    totalPages: number;
    page: number;
    perPage: number;
}

export interface UseCommentsParams {
    slug: string;
    page?: number;
    perPage?: number;
}

export interface UseCommentsReturn {
    comments: CommentItem[];
    total: number;
    totalPages: number;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

function buildUrl(p: UseCommentsParams): string {
    const sp = new URLSearchParams();
    sp.set('slug', p.slug);
    if (p.page) sp.set('page', String(p.page));
    if (p.perPage) sp.set('perPage', String(p.perPage));
    return `/api/public/blog-comments?${sp.toString()}`;
}

export function useBlogComments({
    slug,
    page = 1,
    perPage = 10,
}: UseCommentsParams): UseCommentsReturn {
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const paramsRef = useRef({ slug, page, perPage });
    paramsRef.current = { slug, page, perPage };

    const fetchData = useCallback(async (p: UseCommentsParams) => {
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

            const json: CommentsApiResponse = await res.json();

            if (!res.ok) {
                throw new Error((json as any)?.error ?? `Request failed with status ${res.status}`);
            }

            setComments(json.data);
            setTotal(json.total);
            setTotalPages(json.totalPages);
        } catch (e: any) {
            setError(e.message ?? 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData({ slug, page, perPage });
    }, [slug, page, perPage, fetchData]);

    const refetch = useCallback(
        () => fetchData(paramsRef.current),
        [fetchData]
    );

    return { comments, total, totalPages, loading, error, refetch };
}