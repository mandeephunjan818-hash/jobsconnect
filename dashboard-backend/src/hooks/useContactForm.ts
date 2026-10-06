import { useState, useCallback } from 'react';

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface UseContactFormReturn {
  submitForm: (data: ContactFormData) => Promise<boolean>;
  loading: boolean;
  success: boolean | null;
  error: string | null;
  reset: () => void;
}

export function useContactForm(): UseContactFormReturn {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitForm = useCallback(async (data: ContactFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      });

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error(`API returned ${res.status} ${res.statusText}. Make sure the route file is at src/app/api/contact/route.ts`);
      }

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? `Request failed with status ${res.status}`);
      }

      setSuccess(true);
      return true;
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
      setSuccess(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setSuccess(null);
    setError(null);
  }, []);

  return { submitForm, loading, success, error, reset };
}