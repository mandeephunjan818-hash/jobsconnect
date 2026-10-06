// src/hooks/useServices.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { ServicesApiResponse } from '@/modal/Service';

export interface UseServicesParams {
  ids?: string[];
  limit?: number;
  perPage?: number;
  page?: number;
  search?: string;
  status?: string;
  categories?: string[];
  publicOnly?: boolean; // adds status=published&isActive=true
}

export interface UseServicesReturn {
  data: ServicesApiResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function buildUrl(p: UseServicesParams): string {
  const sp = new URLSearchParams();
  if (p.ids?.length) sp.set('ids', p.ids.join(','));
  if (p.perPage) sp.set('perPage', String(p.perPage));
  if (p.limit) sp.set('perPage', String(p.limit));
  if (p.page) sp.set('page', String(p.page));
  if (p.search) sp.set('search', p.search);
  if (p.categories?.length) sp.set('categories', p.categories.join(','));
  if (p.publicOnly) {
    sp.set('status', 'published');
    sp.set('isActive', 'true');
  } else if (p.status) {
    sp.set('status', p.status);
  }
  return `/api/services?${sp.toString()}`;
}

export function useServices(params: UseServicesParams = {}): UseServicesReturn {
  const [data, setData] = useState<ServicesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchData = useCallback(async (p: UseServicesParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl(p), {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json'))
        throw new Error(`API returned ${res.status} ${res.statusText}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `Request failed: ${res.status}`);
      setData(json as ServicesApiResponse);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.ids?.join(','), params.limit, params.perPage,
    params.page, params.search, params.status, params.publicOnly,
    params.categories?.join(','),
  ]);

  const refetch = useCallback(() => fetchData(paramsRef.current), [fetchData]);
  return { data, loading, error, refetch };
}