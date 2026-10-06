// src/hooks/useThankYouNavigation.ts
'use client';

import { useRouter } from 'next/navigation';

interface ThankYouParams {
  /** Type of submission (e.g., 'contact-seller', 'registration', 'inquiry') */
  type: string;
  /** Title/description of what was submitted */
  title: string;
  /** Optional: ID of related resource */
  referenceId?: string;
  /** Optional: Additional context message */
  message?: string;
  /** Optional: Where to redirect after thank you (e.g., '/listings') */
  returnTo?: string;
  /** Optional: Return button text */
  returnLabel?: string;
}

export function useThankYouNavigation() {
  const router = useRouter();

  const navigateToThankYou = (params: ThankYouParams) => {
    const searchParams = new URLSearchParams();
    
    searchParams.set('type', params.type);
    searchParams.set('title', params.title);
    
    if (params.referenceId) searchParams.set('ref', params.referenceId);
    if (params.message) searchParams.set('message', params.message);
    if (params.returnTo) searchParams.set('returnTo', params.returnTo);
    if (params.returnLabel) searchParams.set('returnLabel', params.returnLabel);

    router.push(`/thank-you?${searchParams.toString()}`);
  };

  return { navigateToThankYou };
}