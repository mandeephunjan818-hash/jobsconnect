import { useState, useEffect, useCallback, useRef } from 'react';

export interface ContactInfoItem {
  id: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  emails: string[];
  socialLinks: Array<{
    platform: string;
    url: string;
    iconClass: string;
  }>;
}

export interface ContactInfoApiResponse {
  data: ContactInfoItem | null;
}

export interface UseContactInfoReturn {
  data: ContactInfoItem | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useContactInfo(): UseContactInfoReturn {
  const [data, setData] = useState<ContactInfoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/contact-info', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error(`API returned ${res.status} ${res.statusText}. Make sure the route file is at src/app/api/contact-info/route.ts`);
      }

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? `Request failed with status ${res.status}`);
      }

      setData(json.data as ContactInfoItem);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(), [fetchData]);

  return { data, loading, error, refetch };
}