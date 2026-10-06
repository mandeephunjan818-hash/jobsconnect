import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ──────────────────────────────────────────────────
export type BuyerStatus = "verified" | "unverified" | "blocked" | "pending";

export interface Buyer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  countryCode: string;
  contactNumber: string;
  companyName?: string;
  industry: string;
  investmentRange: string;
  status: BuyerStatus;
  isBlocked: boolean;
  registeredDate: string;
  lastActive: string;
  totalInquiries: number;
  notes?: string;
}

export interface BuyersApiResponse {
  data: Buyer[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ActiveFilters {
  statuses: Set<string>;
  countries: Set<string>;
  industries: Set<string>;
  investmentRanges: Set<string>;
}

export interface UseBuyersParams {
  search: string;
  filters: ActiveFilters;
  page: number;
  perPage?: number;
}

export interface UseBuyersReturn {
  data: BuyersApiResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  updateBuyerStatus: (id: string, action: string) => Promise<boolean>;
}

// ─── Build the query string ─────────────────────────────────
function buildUrl(p: UseBuyersParams): string {
  const sp = new URLSearchParams();

  if (p.search.trim()) sp.set("search", p.search.trim());
  if (p.filters.statuses.size) sp.set("statuses", [...p.filters.statuses].join(","));
  if (p.filters.countries.size) sp.set("countries", [...p.filters.countries].join(","));
  if (p.filters.industries.size) sp.set("industries", [...p.filters.industries].join(","));
  if (p.filters.investmentRanges.size) sp.set("investmentRanges", [...p.filters.investmentRanges].join(","));

  sp.set("page", String(p.page));
  sp.set("perPage", String(p.perPage ?? 10));

  return `/apis/admin/buyers?${sp.toString()}`;
}

// ─── Hook ───────────────────────────────────────────────────
export function useBuyers(params: UseBuyersParams): UseBuyersReturn {
  const [data, setData] = useState<BuyersApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchData = useCallback(async (p: UseBuyersParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl(p), {
        cache: "no-store",
        headers: { "Accept": "application/json" },
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          `API returned ${res.status} ${res.statusText}. ` +
          `Make sure the route file is at src/app/apis/admin/buyers/route.ts`
        );
      }

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? `Request failed with status ${res.status}`);
      }

      setData(json as BuyersApiResponse);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => fetchData(params), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.search,
    params.page,
    params.perPage,
    [...params.filters.statuses].sort().join(","),
    [...params.filters.countries].sort().join(","),
    [...params.filters.industries].sort().join(","),
    [...params.filters.investmentRanges].sort().join(","),
  ]);

  const refetch = useCallback(() => fetchData(paramsRef.current), [fetchData]);

  const updateBuyerStatus = useCallback(async (id: string, action: string): Promise<boolean> => {
    try {
      const res = await fetch("/apis/admin/buyers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error ?? "Failed to update status");
      }

      // Refetch data after successful update
      refetch();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [refetch]);

  return { data, loading, error, refetch, updateBuyerStatus };
}
