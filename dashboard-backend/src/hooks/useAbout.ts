import { useState, useEffect, useCallback, useRef } from 'react';

export interface AboutItem {
  id: string;
  pageIdentifier: string;
  imageUrl: string;
  subtitle: string;
  title: string;
  paragraphs: string[];
  listItems: string[];
  buttonText: string;
  buttonLink: string;
}

export interface AboutApiResponse {
  data: AboutItem | null;
}

export interface UseAboutParams {
  page?: string; // e.g., "home-two"
}

export interface UseAboutReturn {
  data: AboutItem | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function buildUrl(p: UseAboutParams): string {
  const sp = new URLSearchParams();
  if (p.page) sp.set('page', p.page);
  return `/api/about?${sp.toString()}`;
}

export function useAbout(params: UseAboutParams = {}): UseAboutReturn {
  const [data, setData] = useState<AboutItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchData = useCallback(async (p: UseAboutParams) => {
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
          'Make sure the route file is at src/app/api/about/route.ts'
        );
      }

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? `Request failed with status ${res.status}`);
      }

      setData(json.data as AboutItem);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.page]);

  const refetch = useCallback(() => fetchData(paramsRef.current), [fetchData]);

  return { data, loading, error, refetch };
}