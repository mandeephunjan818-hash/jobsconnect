// lib/validation/listing-form.ts
import { z } from 'zod';

export const shiftSchema = z.object({
    label: z.string().min(1, 'Shift label is required'),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    days: z.array(z.string()).optional(),
});

export const slotSchema = z.object({
    location: z.string().min(1, 'Location is required'),
    province: z.string().min(1, 'Province is required'),
    city: z.string().min(1, 'City is required'),
    jobPay: z.string().min(1, 'Pay is required').refine(
        (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
        'Must be a positive number'
    ),
    jobVacancy: z.string().optional(),
    jobStartingTime: z.string().optional(),
    isActive: z.boolean(),
    shifts: z.array(shiftSchema).optional().default([]),
});

export const siteWindowSchema = z.object({
    site: z.string().min(1, 'Site is required'),
    startAt: z.string().min(1, 'Start date is required'),
    endAt: z.string().min(1, 'End date is required'),
});

export const listingFormSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    companyName: z.string().min(2, 'Company name is required'),
    overview: z.string().min(20, 'Overview must be at least 20 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    applyEmail: z.string().email('Invalid email address'),
    jobMode: z.string().min(1, 'Job mode is required'),
    jobType: z.string().optional(),
    highlights: z.array(z.string()).optional().default([]),
    benefits: z.array(z.string()).optional().default([]),
    categories: z.array(z.string()).optional().default([]),
    jobBankId: z.string().optional(),
    slots: z.array(slotSchema).min(1, 'At least one location is required'),
    siteWindows: z.array(siteWindowSchema).optional().default([]),
    campaignLabel: z.string().optional(),
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;

export function zodErrorsToFormErrors(
  error: z.ZodError
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    fieldErrors[path] = issue.message;
  }
  return fieldErrors;
}