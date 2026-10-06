import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Known site slugs (mirrors sharedListing.ts) ──────────────
export const KNOWN_SITES = [
  'jobs-connect.vercel.app',
  'new-jobs-fawn.vercel.app',
  'jobsrefugee.ca',
  'vulnerableyouthsjobs.ca',
  'accesscareers.ca',
  'indigenouspeoplesjobs.ca',
] as const;

export type SiteSlug = (typeof KNOWN_SITES)[number];

// ─── Slot: one location + shift combo ─────────────────────────
export interface SlotItem {
  _id?: string;
  location: string;
  province: string;
  city: string;
  shifts: ShiftItem[];
  jobPay: number;
  jobVacancy?: string;
  jobStartingTime?: string;
  isActive: boolean;
}

export interface ShiftItem {
  label: string;
  startTime?: string;
  endTime?: string;
  days?: string[];
}

// ─── Per-site schedule window ──────────────────────────────────
export interface SiteWindow {
  site: SiteSlug | string;
  startAt: string;      // ISO string
  endAt: string;        // ISO string
  durationDays: number; // pre-computed days
}

export interface CampaignWindow {
  label: string;
  startAt: string;  // ISO string
  endAt: string;    // ISO string
}

// ─── Public listing item ───────────────────────────────────────
export interface ListingItem {
  id: string;
  title: string;
  companyName: string;
  overview: string;
  description: string;
  applyEmail: string;
  highlights: string[];
  benefits: string[];
  categories: string[];
  slug: string;

  jobBankId: string;

  // ── Job meta (shared across slots) ──────────────────────
  jobMode: string;
  jobType?: string;
  /** Format: JOB-<YEAR>-<8 chars>  e.g. JOB-2025-K3X9PQ7R */
  jobId: string;

  // ── Slots (location / pay / shifts) ─────────────────────
  slots: SlotItem[];

  // ── Visibility ───────────────────────────────────────────
  /** Flat list — derived from siteWindows[].site */
  visibleOnSites: string[];
  /** Per-site schedule with durationDays */
  siteWindows: SiteWindow[];

  // ── Workflow ─────────────────────────────────────────────
  status: 'pending' | 'scheduled' | 'approved' | 'rejected';
  isActive: boolean;
}

// ─── Active filters ────────────────────────────────────────────
export interface ActiveFilters {
  types: Set<string>;
  provinces: Set<string>;
  cities: Set<string>;
  budgets: Set<string>;
  jobModes: Set<string>;
  categories?: Set<string>;
  sites: Set<string>;
}

export interface ListingsApiResponse {
  data: ListingItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface UseListingsParams {
  id?: string;
  search: string;
  filters: ActiveFilters;
  page: number;
  perPage?: number;
}

export interface UseListingsReturn {
  data: ListingsApiResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function buildUrl(p: UseListingsParams): string {
  const sp = new URLSearchParams();

  if (p?.id) {
    sp.set('id', p.id);
  } else {
    if (p.search.trim()) sp.set('search', p.search.trim());
    if (p.filters.types.size) sp.set('types', [...p.filters.types].join(','));
    if (p.filters.provinces.size) sp.set('provinces', [...p.filters.provinces].join(','));
    if (p.filters.cities.size) sp.set('cities', [...p.filters.cities].join(','));
    if (p.filters.budgets.size) sp.set('budgets', [...p.filters.budgets].join(','));
    if (p.filters.categories && (p.filters as any).categories?.size) sp.set('categories', [...(p.filters as any).categories].join(','));
    if (p.filters.jobModes.size) sp.set('jobModes', [...p.filters.jobModes].join(','));
    if (p.filters.sites.size) sp.set('sites', [...p.filters.sites].join(','));
    if ((p.filters as any).statuses?.size)
      sp.set('statuses', [...(p.filters as any).statuses].join(','));
    sp.set('page', String(p.page));
    sp.set('perPage', String(p.perPage ?? 5));
  }

  return `/api/listings?${sp.toString()}`;
}

export function useListings(params: UseListingsParams): UseListingsReturn {
  const [data, setData] = useState<ListingsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchData = useCallback(async (p: UseListingsParams) => {
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
      setData(json as ListingsApiResponse);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchData(params), 300);
    return () => clearTimeout(t);
  }, [
    params.id,
    params.search,
    params.page,
    params.perPage,
    [...params.filters.types].sort().join(','),
    [...params.filters.provinces].sort().join(','),
    [...params.filters.cities].sort().join(','),
    [...params.filters.budgets].sort().join(','),
    [...params.filters.jobModes].sort().join(','),
    [...(params.filters as any).categories ?? []].sort().join(','),
    [...params.filters.sites].sort().join(','),
    [...((params.filters as any).statuses ?? new Set())].sort().join(','),
  ]);

  const refetch = useCallback(() => fetchData(paramsRef.current), [fetchData]);
  return { data, loading, error, refetch };
}

// ─── My listing shapes ─────────────────────────────────────────
export interface MyDraftItem {
  id: string;
  _source: 'draft';
  title: string;
  companyName: string;
  overview: string;
  description: string;
  applyEmail: string;
  highlights: string[];
  benefits: string[];
  categories: string[];
  jobBankId: string;
  slug: string;
  visibleOnSites: string[];
  siteWindows: SiteWindow[];

  jobMode: string;
  jobType?: string;
  jobId: string;

  slots: SlotItem[];

  submittedBy: string;

  status: 'pending' | 'scheduled' | 'approved' | 'rejected';
  campaignWindow?: CampaignWindow;

  updateRequested: boolean;
  updateRequestData?: any;

  createdAt: string;
  updatedAt: string;
}

export interface MyLiveItem {
  id: string;
  _source: 'draft';
  title: string;
  companyName: string;
  overview: string;
  description: string;
  applyEmail: string;
  highlights: string[];
  benefits: string[];
  categories: string[];
  jobBankId: string;
  slug: string;
  visibleOnSites: string[];
  siteWindows: SiteWindow[];
  status: 'pending' | 'scheduled' | 'approved' | 'rejected';

  jobMode: string;
  jobType?: string;
  jobId: string;

  slots: SlotItem[];

  submittedBy: string;
  isActive: boolean;

  updateRequested: boolean;
  updateRequestData?: any;

  createdAt: string;
  updatedAt: string;
}

// ─── Filter params for user's own listings ─────────────────────
export interface MyListingsParams {
  table: 'drafts' | 'live' | 'all';
  search: string;
  status: string;
  createdFrom: string;
  createdTo: string;
  page: number;
  perPage: number;
}

export interface MyListingsReturn {
  data: (MyDraftItem | MyLiveItem)[];
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function buildMyUrl(p: MyListingsParams): string {
  const sp = new URLSearchParams();
  if (p.table !== 'all') {
    sp.set('table', p.table);
  }
  sp.set('page', String(p.page));
  sp.set('perPage', String(p.perPage));
  if (p.search) sp.set('search', p.search);
  if (p.status) sp.set('status', p.status);
  if (p.createdFrom) sp.set('createdFrom', p.createdFrom);
  if (p.createdTo) sp.set('createdTo', p.createdTo);
  return `/api/listings/my?${sp.toString()}`;
}

export function useMyListings(params: MyListingsParams): MyListingsReturn {
  const [data, setData] = useState<(MyDraftItem | MyLiveItem)[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchData = useCallback(async (p: MyListingsParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildMyUrl(p), {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `Request failed: ${res.status}`);
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 1);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchData(params), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.table, params.search, params.status,
    params.createdFrom, params.createdTo,
    params.page, params.perPage,
  ]);

  const refetch = useCallback(() => fetchData(paramsRef.current), [fetchData]);
  return { data, total, totalPages, loading, error, refetch };
}

// ─── Hook: listing filters ─────────────────────────────────────
export interface FilterOption {
  value: string;
  label: string;
  min?: number;
  max?: number;
}

export interface ListingFiltersData {
  provinces: FilterOption[];
  cities: FilterOption[];
  budgets: FilterOption[];
  jobModes: FilterOption[];
  jobTypes: FilterOption[];
  sites: FilterOption[];
  categories: FilterOption[];
}

export function useListingFilters(): {
  filters: ListingFiltersData | null;
  loading: boolean;
  error: string | null;
} {
  const [filters, setFilters] = useState<ListingFiltersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/listings/filters', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;

        const toOptions = (arr: string[]): FilterOption[] =>
          arr.filter(Boolean).map(v => ({ value: v.toLowerCase(), label: v }));

        // Site options use human-friendly labels
        const SITE_LABELS: Record<string, string> = {
          'new-jobs-fawn.vercel.app': 'New in Canada Jobs',
          'jobsrefugee.ca': 'Jobs for Refugees',
          'vulnerableyouthsjobs.ca': 'Vulnerable Youths Jobs',
          'accesscareers.ca': 'Access Careers',
          'indigenouspeoplesjobs.ca': 'Indigenous Peoples Jobs',
        };

        const siteOptions: FilterOption[] = (data.sites ?? [])
          .filter(Boolean)
          .map((s: string) => ({
            value: s,
            label: SITE_LABELS[s] ?? s,
          }));

        setFilters({
          provinces: toOptions(data.provinces ?? []),
          cities: toOptions(data.cities ?? []),
          budgets: data.budgets ?? [],
          categories: toOptions(data.categories ?? []),
          jobModes: toOptions(data.jobModes ?? []),
          jobTypes: toOptions(data.jobTypes ?? []),
          sites: siteOptions,
        });
      })
      .catch(e => {
        if (!cancelled) setError(e.message ?? 'Failed to load filters');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { filters, loading, error };
}

// ─── Hook: fetch users for picker ─────────────────────────────
export interface UserOption {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export function useUsers(search = ''): { users: UserOption[]; loading: boolean } {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const sp = new URLSearchParams({ perPage: '100' });
        if (search) sp.set('search', search);
        const res = await fetch(`/api/user${search !== '' ? `?${sp}` : ''}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!cancelled) setUsers(json.data ?? []);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search]);

  return { users, loading };
}