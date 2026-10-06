import { useState, useCallback } from 'react';

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  phone: string;
  userId?: string;
  listingId?: string;
  listingTitle?: string;
  location?: { address: string; lat: number; lng: number };
  mapsIframe?: string;
}

export interface UseContactSubmitReturn {
  submit: (data: ContactFormData) => Promise<{ success: boolean; error?: string }>;
  submitting: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}

export function useContactSubmit(): UseContactSubmitReturn {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setSubmitting(false);
    setError(null);
    setSuccess(false);
  }, []);

  const submit = useCallback(async (data: ContactFormData) => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/buyer-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to send message');
      }

      setSuccess(true);
      return { success: true };
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
      return { success: false, error: e.message };
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submit, submitting, error, success, reset };
}