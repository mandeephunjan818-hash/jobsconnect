import { useState, useEffect, useCallback, useRef } from 'react';

export interface AboutStoryItem {
  id: string;
  pageIdentifier: string;
  heading: string;
  description: string;
  listItems: string[];
  buttonText: string;
  buttonLink: string;
  mainImage: string;
  sideImages: string[];
  stats: Array<{
    number: number;
    suffix: string;
    text: string;
  }>;
}

export interface UseAboutStoryParams {
  page?: string; // page identifier
}

export interface UseAboutStoryReturn {
  data: AboutStoryItem | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function buildUrl(p: UseAboutStoryParams): string {
  const sp = new URLSearchParams();
  if (p.page) sp.set('page', p.page);
  return `/api/about-story?${sp.toString()}`;
}

export function useAboutStory(params: UseAboutStoryParams = {}): UseAboutStoryReturn {
  const [data, setData] = useState<AboutStoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchData = useCallback(async (p: UseAboutStoryParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl(p), {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error(`API returned ${res.status} ${res.statusText}. Make sure the route file is at src/app/api/about-story/route.ts`);
      }

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? `Request failed with status ${res.status}`);
      }

      setData(json.data as AboutStoryItem);
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