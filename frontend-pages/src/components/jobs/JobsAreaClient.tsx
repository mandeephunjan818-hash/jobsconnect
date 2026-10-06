'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
    memo,
    type CSSProperties,
    type ComponentType,
} from 'react';
import {
    FiChevronDown, FiChevronUp, FiSearch, FiMail, FiX, FiSend, FiInbox,
    FiCode, FiBookOpen, FiBriefcase, FiVolume2, FiTruck, FiHeart, FiUsers,
    FiFilter, FiFileText, FiCheckCircle, FiAward,
} from 'react-icons/fi';
import { toast } from 'react-toastify';

import type { JobListingItem } from '@/app/actions/jobListAction';
import PaginationLeftIcon from '@/svg/PaginationLeftIcon';
import PaginationRightIcon from '@/svg/PaginationRightIcon';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const JOBS_PER_PAGE = 10;

// Values actually stored in `jobType` (work location)
const WORK_MODE_OPTIONS = ['On-site', 'Remote', 'Hybrid'];

// Values actually stored in `jobMode` (employment schedule)
const JOB_TYPE_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Casual'];

const DEFAULT_SORT = 'newest';
const LIST_LIMIT = 6; // items shown before "Show more" in searchable filter sections
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "How it works" strip shown above the listing — purely presentational.
const HOW_IT_WORKS_STEPS: { icon: ComponentType<{ size?: number }>; label: string }[] = [
    { icon: FiFilter, label: 'Use filters to find jobs' },
    { icon: FiFileText, label: 'Click to view job details' },
    { icon: FiCheckCircle, label: 'Apply directly or save for later' },
    { icon: FiAward, label: 'Get hired & grow your career' },
];

// Category → icon, matched by substring against the job's primary category.
// Kept intentionally generic so odd/unseen category strings still fall back cleanly.
const CATEGORY_ICON_MAP: { match: string; icon: ComponentType<{ size?: number }> }[] = [
    { match: 'software', icon: FiCode },
    { match: 'it', icon: FiCode },
    { match: 'education', icon: FiBookOpen },
    { match: 'admin', icon: FiBriefcase },
    { match: 'marketing', icon: FiVolume2 },
    { match: 'warehouse', icon: FiTruck },
    { match: 'logistics', icon: FiTruck },
    { match: 'health', icon: FiHeart },
    { match: 'nursing', icon: FiHeart },
    { match: 'customer', icon: FiUsers },
    { match: 'client', icon: FiUsers },
];

function getCategoryIcon(category: string): ComponentType<{ size?: number }> {
    const key = category.toLowerCase();
    const found = CATEGORY_ICON_MAP.find(c => key.includes(c.match));
    return found?.icon ?? FiBriefcase;
}

// Cycles a small, theme-derived set of tint strengths for the icon avatar —
// variety without introducing new hues; every tint is a mix of the accent color.
const ICON_TINTS = ['14%', '20%', '26%', '32%'];
function getIconTint(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % ICON_TINTS.length;
    return ICON_TINTS[hash];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

function formatPay(pay: number): string {
    if (!pay) return '';
    return `$${pay.toLocaleString('en-CA')}/hr`;
}

function clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
}

function parseMulti(val: string): string[] {
    return val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
}

// Array-based toggle — used directly against local filter state.
function toggleArr(current: string[], value: string): string[] {
    const lval = value.trim().toLowerCase();
    const idx = current.findIndex(v => v.trim().toLowerCase() === lval);
    return idx >= 0 ? current.filter((_, i) => i !== idx) : [...current, value.trim()];
}

// ─────────────────────────────────────────────────────────────
// Filter state — this is the single source of truth for what's
// displayed/filtered. The URL is synced FROM this, never the
// other way around during normal interaction, so clicking a
// filter never has to wait on router/navigation timing.
// ─────────────────────────────────────────────────────────────
interface FilterState {
    q: string;
    location: string;
    modes: string[];
    types: string[];
    categories: string[];
    provinces: string[]; // legacy / deep-link support, no dedicated UI anymore
    cities: string[];    // now holds full "City, Province" location strings
    payMin: string;      // empty string = unset
    payMax: string;      // empty string = unset
    sort: string;
    page: number;
}

function stateFromParams(sp: URLSearchParams): FilterState {
    return {
        q: sp.get('q') ?? '',
        location: sp.get('location') ?? '',
        modes: parseMulti(sp.get('mode') ?? ''),
        types: parseMulti(sp.get('type') ?? ''),
        categories: parseMulti(sp.get('category') ?? ''),
        provinces: parseMulti(sp.get('province') ?? ''),
        cities: parseMulti(sp.get('city') ?? ''),
        payMin: sp.get('payMin') ?? '',
        payMax: sp.get('payMax') ?? '',
        sort: sp.get('sort') ?? DEFAULT_SORT,
        page: parseInt(sp.get('page') ?? '1', 10) || 1,
    };
}

function paramsFromState(s: FilterState): URLSearchParams {
    const p = new URLSearchParams();
    if (s.q) p.set('q', s.q);
    if (s.location) p.set('location', s.location);
    if (s.modes.length) p.set('mode', s.modes.join(','));
    if (s.types.length) p.set('type', s.types.join(','));
    if (s.categories.length) p.set('category', s.categories.join(','));
    if (s.provinces.length) p.set('province', s.provinces.join(','));
    if (s.cities.length) p.set('city', s.cities.join(','));
    if (s.payMin) p.set('payMin', s.payMin);
    if (s.payMax) p.set('payMax', s.payMax);
    if (s.sort && s.sort !== DEFAULT_SORT) p.set('sort', s.sort);
    if (s.page > 1) p.set('page', String(s.page));
    return p;
}

const EMPTY_FILTER_STATE: FilterState = {
    q: '',
    location: '',
    modes: [],
    types: [],
    categories: [],
    provinces: [],
    cities: [],
    payMin: '',
    payMax: '',
    sort: DEFAULT_SORT,
    page: 1,
};

// ─────────────────────────────────────────────────────────────
// Pre-processed listing type
// ─────────────────────────────────────────────────────────────
type ProcessedListing = JobListingItem & {
    _lc_title: string;
    _lc_overview: string;
    _lc_desc: string;
    _lc_location: string;
    _lc_city: string;
    _lc_province: string;
    _lc_workMode: string;
    _lc_jobType: string;
};

// ─────────────────────────────────────────────────────────────
// JobCard — flat surface with a hairline divider, a themed icon
// avatar per category, and a pill badge for work mode. The first
// card on an unfiltered page-1 view is presented as "Featured".
// ─────────────────────────────────────────────────────────────
const JobCard = memo(function JobCard({ job, featured = false }: { job: JobListingItem; featured?: boolean }) {
    const payStr = formatPay(job.jobPay);
    const modeBadgeValue = job.jobMode && WORK_MODE_OPTIONS.includes(job.jobType) ? job.jobType : '';
    const primaryCategory = job.categories[0] ?? '';
    const Icon = getCategoryIcon(primaryCategory);
    const tint = getIconTint(primaryCategory || job.title);
    const modeClass = modeBadgeValue
        ? `lmx-job-card__mode-badge--${modeBadgeValue.toLowerCase().replace(/[^a-z]/g, '')}`
        : '';

    return (
        <div className={`lmx-job-card${featured ? '' : ''}`} data-mode={modeBadgeValue}>
            {/* {featured && <span className="lmx-job-card__featured-tag">Featured</span>} */}

            <div className="lmx-job-card__top">
                <div className="lmx-job-card__icon" style={{ '--tint': tint } as CSSProperties}>
                    <Icon size={18} />
                </div>

                <div className="lmx-job-card__titles">
                    <h3 className="lmx-job-card__title">
                        <Link prefetch={false} href={`/jobs/${job.slug}`} style={{ textTransform: 'capitalize' }}>
                            {job.title}
                        </Link>
                    </h3>
                    <div className="lmx-job-card__subline">
                        {job.location && <span>{job.location}</span>}
                        {job.location && (job.jobMode || payStr) && <span className="lmx-job-card__dot">•</span>}
                        {job.jobMode && <span>{job.jobMode}</span>}
                        {job.jobMode && payStr && <span className="lmx-job-card__dot">•</span>}
                        {payStr && <span className="lmx-job-card__pay">{payStr}</span>}
                    </div>
                </div>

                {modeBadgeValue && (
                    <span className={`lmx-job-card__mode-badge ${modeClass}`}>
                        {modeBadgeValue}
                    </span>
                )}
            </div>

            {job.categories.length > 0 && (
                <div className="lmx-job-card__cats">
                    {job.categories.slice(0, 3).map(cat => (
                        <span key={cat} className="lmx-job-card__cat-tag">{cat}</span>
                    ))}
                </div>
            )}

            <p className="lmx-job-card__overview">
                {(job.description?.length ?? 0) > 150
                    ? job.description.slice(0, 147) + '…'
                    : job.description}
            </p>

            <div className="lmx-job-card__footer">
                <span className="lmx-job-card__time">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {timeAgo(job.createdAt)}
                </span>
                <Link href={`/jobs/${job.slug}`} prefetch={false} className="lmx-job-card__apply-link">
                    View details
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </Link>
            </div>
        </div>
    );
});

// ─────────────────────────────────────────────────────────────
// CollapsibleCard — shared sidebar section shell (header + chevron)
// ─────────────────────────────────────────────────────────────
function CollapsibleCard({
    title,
    children,
    defaultOpen = true,
}: {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="lmx-sidebar-card">
            <button
                type="button"
                className="lmx-sidebar-card__header"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
            >
                <h5>{title}</h5>
                {open ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
            {open && <div className="lmx-sidebar-card__body">{children}</div>}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// CheckItem — reusable checkbox row with a trailing count
// ─────────────────────────────────────────────────────────────
function CheckItem({
    label,
    count,
    active,
    onToggle,
}: {
    label: string;
    count?: number;
    active: boolean;
    onToggle: () => void;
}) {
    return (
        <li>
            <label className={`lmx-check-item${active ? ' active' : ''}`}>
                <input type="checkbox" checked={active} onChange={onToggle} />
                <span className="lmx-check-box" aria-hidden="true" />
                <span className="lmx-check-label" style={{ textTransform: 'capitalize' }}>{label}</span>
                {typeof count === 'number' && <span className="lmx-check-count">{count}</span>}
            </label>
        </li>
    );
}

// ─────────────────────────────────────────────────────────────
// FilterSection — searchable, expandable checkbox list (Category, Location…)
// ─────────────────────────────────────────────────────────────
interface FilterSectionProps {
    title: string;
    placeholder: string;
    items: { name: string; count: number }[];
    selected: string[];
    onToggle: (value: string) => void;
}

const FilterSection = memo(function FilterSection({
    title, placeholder, items, selected, onToggle,
}: FilterSectionProps) {
    const [open, setOpen] = useState(true);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(false);

    const filtered = useMemo(
        () => !search
            ? items
            : items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())),
        [items, search],
    );

    const visible = expanded ? filtered : filtered.slice(0, LIST_LIMIT);
    const canExpand = filtered.length > LIST_LIMIT;

    return (
        <div className="lmx-sidebar-card">
            <button
                type="button"
                className="lmx-sidebar-card__header"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
            >
                <h5>{title}</h5>
                {open ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>

            {open && (
                <div className="lmx-sidebar-card__body">
                    <div className="lmx-filter-search">
                        <FiSearch size={13} className="lmx-filter-search__icon" />
                        <input
                            type="text"
                            placeholder={placeholder}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <ul className="lmx-check-list">
                        {visible.map(item => (
                            <CheckItem
                                key={item.name}
                                label={item.name}
                                count={item.count}
                                active={selected.some(s => s.trim().toLowerCase() === item.name.trim().toLowerCase())}
                                onToggle={() => onToggle(item.name)}
                            />
                        ))}
                        {filtered.length === 0 && (
                            <li className="lmx-check-empty">No matches</li>
                        )}
                    </ul>

                    {canExpand && (
                        <button type="button" className="lmx-show-more" onClick={() => setExpanded(e => !e)}>
                            {expanded ? 'Show less' : `Show more (${filtered.length - LIST_LIMIT})`}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
});

// ─────────────────────────────────────────────────────────────
// JobAlertCard — real subscribe form, wired to /api/subscribe
// (same endpoint + payload shape as FooterOneClient's subscribe box,
// but tagged with the current filter context so the alert can later
// be matched against saved search preferences server-side).
// ─────────────────────────────────────────────────────────────
function JobAlertCard({ filterState }: { filterState: FilterState }) {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            toast.error('Please enter your email address.');
            return;
        }
        if (!EMAIL_REGEX.test(email)) {
            toast.error('Please enter a valid email address.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    siteId: window.location.hostname,
                    source: 'job-alert',
                    // Pass along the current filter context so alerts can be
                    // matched against these preferences if the backend supports it.
                    preferences: {
                        q: filterState.q || undefined,
                        location: filterState.location || undefined,
                        modes: filterState.modes.length ? filterState.modes : undefined,
                        types: filterState.types.length ? filterState.types : undefined,
                        categories: filterState.categories.length ? filterState.categories : undefined,
                        cities: filterState.cities.length ? filterState.cities : undefined,
                    },
                }),
            });

            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Failed to subscribe');

            toast.success(json.message || "You're subscribed to job alerts!");
            setEmail('');
        } catch (err: any) {
            toast.error(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="lmx-job-alert-card">
            <div className="lmx-job-alert-card__icon"><FiMail size={18} /></div>
            <p className="lmx-job-alert-card__title">Get job alerts</p>
            <p className="lmx-job-alert-card__text">
                Subscribe and get the latest jobs matching your preferences.
            </p>
            <form onSubmit={handleSubscribe} noValidate className="lmx-job-alert-card__form">
                <input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="lmx-job-alert-card__input"
                    aria-label="Email address for job alerts"
                />
                <button type="submit" className="lmx-job-alert-card__btn" disabled={isSubmitting}>
                    {isSubmitting ? (
                        'Subscribing…'
                    ) : (
                        <>
                            Create Alert
                            <FiSend size={13} />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
interface Props {
    allListings: JobListingItem[];
}

export default function JobsAreaClient({ allListings }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // ── Filter state is local and authoritative ────────────────
    const [filterState, setFilterState] = useState<FilterState>(() => stateFromParams(searchParams));

    const lastSyncedSearch = useRef<string>(searchParams.toString());

    const [searchInput, setSearchInput] = useState(filterState.q);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => { setSearchInput(filterState.q); }, [filterState.q]);

    // ── state -> URL ──
    useEffect(() => {
        const next = paramsFromState(filterState).toString();
        if (next === lastSyncedSearch.current) return;
        lastSyncedSearch.current = next;
        const url = next ? `/jobs?${next}` : '/jobs';
        startTransition(() => router.replace(url, { scroll: false }));
    }, [filterState, router]);

    // ── URL -> state (back/forward, external links) ──
    useEffect(() => {
        const current = searchParams.toString();
        if (current === lastSyncedSearch.current) return;
        lastSyncedSearch.current = current;
        setFilterState(stateFromParams(searchParams));
    }, [searchParams]);

    // ── Toggle helpers ────────
    const toggleMulti = useCallback((key: 'modes' | 'types' | 'categories' | 'provinces' | 'cities', value: string) => {
        setFilterState(prev => ({
            ...prev,
            [key]: toggleArr(prev[key], value),
            page: 1,
        }));
    }, []);

    const setQuery = useCallback((q: string) => {
        setFilterState(prev => ({ ...prev, q, page: 1 }));
    }, []);

    const setLocationFilter = useCallback((location: string) => {
        setFilterState(prev => ({ ...prev, location, page: 1 }));
    }, []);

    const setSort = useCallback((sort: string) => {
        setFilterState(prev => ({ ...prev, sort, page: 1 }));
    }, []);

    const setPage = useCallback((page: number) => {
        setFilterState(prev => ({ ...prev, page }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const clearPayRange = useCallback(() => {
        setFilterState(prev => ({ ...prev, payMin: '', payMax: '', page: 1 }));
    }, []);

    const clearAll = useCallback(() => {
        setFilterState(EMPTY_FILTER_STATE);
        setIsOpen(false);
    }, []);

    // ── Pay bounds (from data) + slider state ────────
    const payBounds = useMemo(() => {
        const pays = allListings.map(j => j.jobPay).filter(p => p > 0);
        if (!pays.length) return { min: 0, max: 100 };
        const min = Math.floor(Math.min(...pays));
        const max = Math.ceil(Math.max(...pays) / 5) * 5;
        return { min, max: max > min ? max : min + 10 };
    }, [allListings]);

    const [minSlider, setMinSlider] = useState(payBounds.min);
    const [maxSlider, setMaxSlider] = useState(payBounds.max);

    // Sync sliders when bounds load or filterState changes externally (clear-all, back button)
    useEffect(() => {
        setMinSlider(filterState.payMin ? clamp(Number(filterState.payMin), payBounds.min, payBounds.max) : payBounds.min);
        setMaxSlider(filterState.payMax ? clamp(Number(filterState.payMax), payBounds.min, payBounds.max) : payBounds.max);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterState.payMin, filterState.payMax, payBounds.min, payBounds.max]);

    // Debounced commit of slider drag -> filterState
    useEffect(() => {
        const t = setTimeout(() => {
            setFilterState(prev => {
                const newMin = minSlider > payBounds.min ? String(minSlider) : '';
                const newMax = maxSlider < payBounds.max ? String(maxSlider) : '';
                if (newMin === prev.payMin && newMax === prev.payMax) return prev;
                return { ...prev, payMin: newMin, payMax: newMax, page: 1 };
            });
        }, 300);
        return () => clearTimeout(t);
    }, [minSlider, maxSlider, payBounds.min, payBounds.max]);

    const minPct = ((minSlider - payBounds.min) / Math.max(1, payBounds.max - payBounds.min)) * 100;
    const maxPct = ((maxSlider - payBounds.min) / Math.max(1, payBounds.max - payBounds.min)) * 100;

    const processed = useMemo<ProcessedListing[]>(() =>
        allListings
            .map(job => ({
                ...job,
                _lc_title: job.title.toLowerCase(),
                _lc_overview: (job.overview ?? '').toLowerCase(),
                _lc_desc: (job.description ?? '').toLowerCase(),
                _lc_location: job.location.toLowerCase(),
                _lc_city: (job.city ?? '').toLowerCase(),
                _lc_province: (job.province ?? '').toLowerCase(),
                _lc_workMode: (job.jobType ?? '').trim().toLowerCase(),
                _lc_jobType: (job.jobMode ?? '').trim().toLowerCase(),
            }))
            .sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ),
        [allListings],
    );

    // ── Option lists with counts ────────
    const modeCounts = useMemo(() => {
        const m: Record<string, number> = {};
        allListings.forEach(j => {
            const key = (j.jobType ?? '').trim();
            if (!key) return;
            m[key] = (m[key] ?? 0) + 1;
        });
        return m;
    }, [allListings]);

    const typeCounts = useMemo(() => {
        const m: Record<string, number> = {};
        allListings.forEach(j => {
            const key = (j.jobMode ?? '').trim();
            if (!key) return;
            m[key] = (m[key] ?? 0) + 1;
        });
        return m;
    }, [allListings]);

    const categories = useMemo(() => {
        const m: Record<string, { name: string; count: number }> = {};
        allListings.forEach(j =>
            j.categories.forEach(raw => {
                const key = raw.trim().toLowerCase();
                if (!key) return;
                if (m[key]) m[key].count++;
                else m[key] = { name: raw.trim(), count: 1 };
            })
        );
        return Object.values(m).sort((a, b) => b.count - a.count);
    }, [allListings]);

    // Combined "City, Province" location list — replaces separate Province/City filters.
    const locationOptions = useMemo(() => {
        const m: Record<string, { name: string; count: number }> = {};
        allListings.forEach(j => {
            const raw = j.location;
            if (!raw) return;
            const key = raw.trim().toLowerCase();
            if (!key) return;
            if (m[key]) m[key].count++;
            else m[key] = { name: raw.trim(), count: 1 };
        });
        return Object.values(m).sort((a, b) => b.count - a.count);
    }, [allListings]);

    const filteredListings = useMemo(() => {
        const q = filterState.q.toLowerCase().trim();
        const loc = filterState.location.toLowerCase().trim();
        const modes = filterState.modes.map(m => m.trim().toLowerCase());
        const types = filterState.types.map(t => t.trim().toLowerCase());
        const cats = filterState.categories.map(c => c.trim().toLowerCase());
        const provs = filterState.provinces.map(p => p.trim().toLowerCase());
        const locs = filterState.cities.map(c => c.trim().toLowerCase()); // full "City, Province" strings
        const payMin = filterState.payMin ? Number(filterState.payMin) : null;
        const payMax = filterState.payMax ? Number(filterState.payMax) : null;

        let result: ProcessedListing[] = processed.filter(job => {
            if (q && !job._lc_title.includes(q) && !job._lc_overview.includes(q) && !job._lc_desc.includes(q))
                return false;

            if (loc && !job._lc_location.includes(loc) && !job._lc_city.includes(loc) && !job._lc_province.includes(loc))
                return false;

            if (modes.length > 0 && !modes.includes(job._lc_workMode))
                return false;

            if (types.length > 0 && !types.includes(job._lc_jobType))
                return false;

            if (cats.length > 0 && !job.categories.some(c => cats.includes(c.trim().toLowerCase())))
                return false;

            if (provs.length > 0 && !provs.includes((job.province ?? '').trim().toLowerCase()))
                return false;

            if (locs.length > 0 && !locs.includes(job._lc_location))
                return false;

            if (payMin !== null && job.jobPay < payMin)
                return false;

            if (payMax !== null && job.jobPay > payMax)
                return false;

            return true;
        });

        if (filterState.sort === 'pay_high') result = [...result].sort((a, b) => b.jobPay - a.jobPay);
        else if (filterState.sort === 'pay_low') result = [...result].sort((a, b) => a.jobPay - b.jobPay);

        return result;
    }, [
        processed, filterState.q, filterState.location, filterState.modes, filterState.types,
        filterState.categories, filterState.provinces, filterState.cities,
        filterState.payMin, filterState.payMax, filterState.sort,
    ]);

    const totalPages = Math.max(1, Math.ceil(filteredListings.length / JOBS_PER_PAGE));
    const safePage = Math.min(Math.max(1, filterState.page), totalPages);
    const pageJobs = filteredListings.slice((safePage - 1) * JOBS_PER_PAGE, safePage * JOBS_PER_PAGE);

    const pageNums = useMemo((): (number | null)[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | null)[] = [1];
        if (safePage > 3) pages.push(null);
        const start = Math.max(2, safePage - 1);
        const end = Math.min(totalPages - 1, safePage + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (safePage < totalPages - 2) pages.push(null);
        pages.push(totalPages);
        return pages;
    }, [totalPages, safePage]);

    const hasActiveFilters = !!(
        filterState.q || filterState.location ||
        filterState.modes.length || filterState.types.length ||
        filterState.categories.length || filterState.provinces.length || filterState.cities.length ||
        filterState.payMin || filterState.payMax
    );

    const activeFilterCount =
        (filterState.q ? 1 : 0) + (filterState.location ? 1 : 0) +
        (filterState.modes.length > 0 ? 1 : 0) +
        (filterState.types.length > 0 ? 1 : 0) +
        (filterState.categories.length > 0 ? 1 : 0) +
        (filterState.provinces.length > 0 ? 1 : 0) +
        (filterState.cities.length > 0 ? 1 : 0) +
        ((filterState.payMin || filterState.payMax) ? 1 : 0);

    // Only the very first card, on an unfiltered page-1/newest view, reads as "Featured".
    const showFeatured = safePage === 1 && filterState.sort === DEFAULT_SORT && !hasActiveFilters;

    return (
        <section className="lmx-jobs-section luminix-padding-section light-bg1">
            <div className="container">

                {/* ── Page intro + How it works ── */}
                <div className="lmx-jobs-intro-row">
                    <div className="lmx-jobs-intro">
                        <span className="lmx-jobs-intro__eyebrow">Careers</span>
                        <h1 className="lmx-jobs-intro__title">Find your next role</h1>
                        <p className="lmx-jobs-intro__subtitle">
                            Browse <strong>{allListings.length}</strong> open position{allListings.length !== 1 ? 's' : ''} from
                            employers hiring right now. Use the filters to narrow by location, schedule, or pay.
                        </p>
                    </div>

                    <div className="lmx-how-it-works">
                        <span className="lmx-how-it-works__title">How it works</span>
                        <div className="lmx-how-it-works__steps">
                            {HOW_IT_WORKS_STEPS.map((step, i) => (
                                <div className="lmx-how-it-works__step" key={step.label}>
                                    <span className="lmx-how-it-works__icon" style={{ '--tint': ICON_TINTS[i % ICON_TINTS.length] } as CSSProperties}>
                                        <step.icon size={16} />
                                    </span>
                                    <p>{step.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lmx-jobs-inner">

                    <aside className={`lmx-jobs-sidebar${isOpen ? ' is-open' : ''}`} style={{ position: 'sticky', top: '10%' }}>

                        <button
                            className="lmx-sidebar-toggle"
                            onClick={() => setIsOpen(o => !o)}
                            aria-expanded={isOpen}
                        >
                            {isOpen ? (
                                '✕ Close Filters'
                            ) : (
                                <>
                                    ☰ Filter Jobs
                                    {activeFilterCount > 0 && (
                                        <span className="lmx-sidebar-badge">{activeFilterCount}</span>
                                    )}
                                </>
                            )}
                        </button>

                        <div className="lmx-sidebar-content">

                            <div className="lmx-sidebar-heading">
                                <h4>Filters</h4>
                                {hasActiveFilters && (
                                    <button type="button" className="lmx-clear-all-link" onClick={clearAll}>
                                        Clear all
                                    </button>
                                )}
                            </div>

                            <div className="lmx-sidebar-card">
                                <h5 className="lmx-search-title">Search</h5>
                                <form onSubmit={e => {
                                    e.preventDefault();
                                    setQuery(searchInput.trim());
                                }}>
                                    <div className="lmx-search-wrap">
                                        <input
                                            type="search"
                                            placeholder="Title, keyword…"
                                            value={searchInput}
                                            onChange={e => setSearchInput(e.target.value)}
                                        />
                                        <button type="submit" aria-label="Search">
                                            <FiSearch size={15} />
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <CollapsibleCard title="Work Mode">
                                <ul className="lmx-check-list">
                                    {WORK_MODE_OPTIONS.map(mode => (
                                        <CheckItem
                                            key={mode}
                                            label={mode}
                                            count={modeCounts[mode] ?? 0}
                                            active={filterState.modes.some(m => m.toLowerCase() === mode.toLowerCase())}
                                            onToggle={() => toggleMulti('modes', mode)}
                                        />
                                    ))}
                                </ul>
                            </CollapsibleCard>

                            <CollapsibleCard title="Job Type">
                                <ul className="lmx-check-list">
                                    {JOB_TYPE_OPTIONS.map(type => (
                                        <CheckItem
                                            key={type}
                                            label={type}
                                            count={typeCounts[type] ?? 0}
                                            active={filterState.types.some(t => t.toLowerCase() === type.toLowerCase())}
                                            onToggle={() => toggleMulti('types', type)}
                                        />
                                    ))}
                                </ul>
                            </CollapsibleCard>

                            {categories.length > 0 && (
                                <FilterSection
                                    title="Category"
                                    placeholder="Search category…"
                                    items={categories}
                                    selected={filterState.categories}
                                    onToggle={v => toggleMulti('categories', v)}
                                />
                            )}

                            <CollapsibleCard title="Hourly Pay Range">
                                <div className="lmx-salary-inputs">
                                    <label className="lmx-salary-field">
                                        <span>Min</span>
                                        <input
                                            type="number"
                                            min={payBounds.min}
                                            max={maxSlider}
                                            value={minSlider}
                                            onChange={e => setMinSlider(clamp(Number(e.target.value) || 0, payBounds.min, maxSlider))}
                                        />
                                    </label>
                                    <span className="lmx-salary-sep">–</span>
                                    <label className="lmx-salary-field">
                                        <span>Max</span>
                                        <input
                                            type="number"
                                            min={minSlider}
                                            max={payBounds.max}
                                            value={maxSlider}
                                            onChange={e => setMaxSlider(clamp(Number(e.target.value) || 0, minSlider, payBounds.max))}
                                        />
                                    </label>
                                </div>

                                <div className="lmx-salary-slider">
                                    <div
                                        className="lmx-salary-slider__track"
                                        style={{ '--min-pct': `${minPct}%`, '--max-pct': `${maxPct}%` } as CSSProperties}
                                    />
                                    <input
                                        type="range"
                                        min={payBounds.min}
                                        max={payBounds.max}
                                        value={minSlider}
                                        onChange={e => setMinSlider(Math.min(Number(e.target.value), maxSlider - 1))}
                                        aria-label="Minimum hourly pay"
                                    />
                                    <input
                                        type="range"
                                        min={payBounds.min}
                                        max={payBounds.max}
                                        value={maxSlider}
                                        onChange={e => setMaxSlider(Math.max(Number(e.target.value), minSlider + 1))}
                                        aria-label="Maximum hourly pay"
                                    />
                                </div>

                                <div className="lmx-salary-labels">
                                    <span>${payBounds.min}/hr</span>
                                    <span>${payBounds.max}+/hr</span>
                                </div>

                                {(filterState.payMin || filterState.payMax) && (
                                    <button type="button" className="lmx-show-more" onClick={clearPayRange}>
                                        Reset pay range
                                    </button>
                                )}
                            </CollapsibleCard>

                            {locationOptions.length > 0 && (
                                <FilterSection
                                    title="Location"
                                    placeholder="Search location…"
                                    items={locationOptions}
                                    selected={filterState.cities}
                                    onToggle={v => toggleMulti('cities', v)}
                                />
                            )}

                            {hasActiveFilters && (
                                <button
                                    className="lmx-clear-filters"
                                    onClick={clearAll}
                                >
                                    ✕ Clear all filters
                                </button>
                            )}

                            <JobAlertCard filterState={filterState} />
                        </div>
                    </aside>

                    <div className={`lmx-jobs-main${isPending ? ' lmx-is-filtering' : ''}`}>

                        <div className="lmx-jobs-toolbar">
                            <p className="lmx-jobs-count">
                                Showing <strong>{filteredListings.length}</strong>{' '}
                                job{filteredListings.length !== 1 ? 's' : ''}
                                {hasActiveFilters ? ' (filtered)' : ''}
                                {isPending && <span className="lmx-spinner" aria-hidden="true" />}
                            </p>
                            <label className="lmx-sort-label">
                                Sort by
                                <select
                                    className="lmx-sort-select"
                                    value={filterState.sort}
                                    onChange={e => setSort(e.target.value)}
                                >
                                    <option value="newest">Newest first</option>
                                    <option value="pay_high">Pay: High → Low</option>
                                    <option value="pay_low">Pay: Low → High</option>
                                </select>
                            </label>
                        </div>

                        {hasActiveFilters && (
                            <div className="lmx-active-filters">
                                {filterState.q && (
                                    <span className="lmx-filter-badge">
                                        &ldquo;{filterState.q}&rdquo;
                                        <button onClick={() => setQuery('')} aria-label="Clear search"><FiX size={12} /></button>
                                    </span>
                                )}
                                {filterState.location && (
                                    <span className="lmx-filter-badge">
                                        📍 {filterState.location}
                                        <button onClick={() => setLocationFilter('')} aria-label="Clear location"><FiX size={12} /></button>
                                    </span>
                                )}
                                {filterState.modes.map(m => (
                                    <span key={m} className="lmx-filter-badge">
                                        {m}
                                        <button onClick={() => toggleMulti('modes', m)} aria-label={`Remove ${m}`}><FiX size={12} /></button>
                                    </span>
                                ))}
                                {filterState.types.map(t => (
                                    <span key={t} className="lmx-filter-badge">
                                        {t}
                                        <button onClick={() => toggleMulti('types', t)} aria-label={`Remove ${t}`}><FiX size={12} /></button>
                                    </span>
                                ))}
                                {filterState.categories.map(c => (
                                    <span key={c} className="lmx-filter-badge">
                                        {c}
                                        <button onClick={() => toggleMulti('categories', c)} aria-label={`Remove ${c}`}><FiX size={12} /></button>
                                    </span>
                                ))}
                                {filterState.cities.map(c => (
                                    <span key={c} className="lmx-filter-badge">
                                        {c}
                                        <button onClick={() => toggleMulti('cities', c)} aria-label={`Remove ${c}`}><FiX size={12} /></button>
                                    </span>
                                ))}
                                {(filterState.payMin || filterState.payMax) && (
                                    <span className="lmx-filter-badge">
                                        ${filterState.payMin || payBounds.min}–${filterState.payMax || payBounds.max}/hr
                                        <button onClick={clearPayRange} aria-label="Clear pay range"><FiX size={12} /></button>
                                    </span>
                                )}
                            </div>
                        )}

                        {pageJobs.length === 0 ? (
                            <div className="lmx-empty">
                                <span className="lmx-empty__icon"><FiInbox size={26} /></span>
                                <h4>No jobs found</h4>
                                <p>Try adjusting your filters or search terms.</p>
                                <button
                                    className="lmx-empty-btn"
                                    onClick={clearAll}
                                >
                                    Clear filters
                                </button>
                            </div>
                        ) : (
                            <div className="lmx-job-list">
                                {pageJobs.map((job, i) => (
                                    <JobCard key={job._id} job={job} featured={showFeatured && i === 0} />
                                ))}
                            </div>
                        )}

                        {totalPages > 1 && (
                            <nav className="lmx-pagination" aria-label="Job listings pagination">
                                <button
                                    className="lmx-pagi-btn"
                                    onClick={() => safePage > 1 && setPage(safePage - 1)}
                                    disabled={safePage <= 1}
                                    aria-label="Previous page"
                                >
                                    <PaginationLeftIcon />
                                </button>

                                {pageNums.map((num, i) =>
                                    num === null ? (
                                        <span key={`ellipsis-${i}`} className="lmx-pagi-ellipsis">…</span>
                                    ) : (
                                        <button
                                            key={num}
                                            className={`lmx-pagi-btn page-num${num === safePage ? ' active' : ''}`}
                                            onClick={() => setPage(num)}
                                            aria-current={num === safePage ? 'page' : undefined}
                                        >
                                            {num}
                                        </button>
                                    )
                                )}

                                <button
                                    className="lmx-pagi-btn"
                                    onClick={() => safePage < totalPages && setPage(safePage + 1)}
                                    disabled={safePage >= totalPages}
                                    aria-label="Next page"
                                >
                                    <PaginationRightIcon />
                                </button>
                            </nav>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                /* ── Page intro + How it works ── */
                .lmx-jobs-intro-row {
                    display: grid;
                    grid-template-columns: 1fr auto;
                    align-items: center;
                    gap: 24px;
                    margin-bottom: 34px;
                }
                .lmx-jobs-intro { max-width: 520px; }
                .lmx-jobs-intro__eyebrow {
                    display: inline-block;
                    font-size: 12.5px;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    color: var(--accent-color);
                    margin-bottom: 8px;
                }
                .lmx-jobs-intro__title {
                    font-size: 30px;
                    font-weight: 800;
                    color: var(--heading-color);
                    margin: 0 0 10px;
                    letter-spacing: 1px;
                }
                .lmx-jobs-intro__subtitle {
                    font-size: 14.5px;
                    line-height: 1.6;
                    color: #64748b;
                    margin: 0;
                }
                .lmx-jobs-intro__subtitle strong { color: var(--heading-color); }

                .lmx-how-it-works {
                    background: var(--accent-color);
                    border: 1px solid color-mix(in srgb, var(--accent-color) 14%, #fff);
                    border-radius: 14px;
                    padding: 18px 26px;
                    min-width: 580px;
                }
                .lmx-how-it-works__title {
                    display: block;
                    font-size: 12.5px;
                    font-weight: 700;
                    color: #fff !important;
                    margin-bottom: 14px;
                }
                .lmx-how-it-works__steps {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    position: relative;
                }
                .lmx-how-it-works__steps::before {
                    content: '';
                    position: absolute;
                    top: 20px;
                    left: 44px;
                    right: 44px;
                    height: 1px;
                    background-image: linear-gradient(to right, color-mix(in srgb, var(--accent-color) 35%, transparent) 40%, transparent 0%);
                    background-size: 8px 1px;
                    background-repeat: repeat-x;
                }
                .lmx-how-it-works__step {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    width: 100px;
                }
                .lmx-how-it-works__icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: color-mix(in srgb, var(--accent-color) var(--tint), #fff);
                    color: var(--accent-color);
                    margin-bottom: 10px;
                }
                .lmx-how-it-works__step p {
                    margin: 0;
                    font-size: 11.5px;
                    line-height: 1.4;
                    color: #fff !important;
                }

                @media (max-width: 991px) {
                    .lmx-jobs-intro-row { grid-template-columns: 1fr; }
                    .lmx-how-it-works { min-width: 0; width: 100%; }
                }
                @media (max-width: 575px) {
                    .lmx-jobs-intro__title { font-size: 23px; }
                    .lmx-jobs-intro-row { margin-bottom: 24px; }
                    .lmx-how-it-works { padding: 16px; }
                    .lmx-how-it-works__steps { flex-wrap: wrap; row-gap: 16px; justify-content: space-evenly; }
                    .lmx-how-it-works__steps::before { display: none; }
                }

                .lmx-jobs-inner {
                    display: grid;
                    grid-template-columns: 300px 1fr;
                    gap: 28px;
                    align-items: start;
                }
                @media (max-width: 991px) {
                    .lmx-jobs-inner { grid-template-columns: 1fr; }
                }

                /* ── Sidebar shell ── */
                .lmx-jobs-sidebar { width: 100%; }
                .lmx-sidebar-toggle {
                    display: none;
                    width: 100%;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    background: #fff;
                    border: 1px solid rgba(0,26,61,0.1);
                    border-radius: 10px;
                    padding: 12px 16px;
                    font-weight: 700;
                    font-size: 14px;
                    color: var(--heading-color);
                    margin-bottom: 14px;
                }
                .lmx-sidebar-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 18px;
                    height: 18px;
                    padding: 0 5px;
                    border-radius: 100px;
                    background: var(--accent-color);
                    color: #fff;
                    font-size: 11px;
                    font-weight: 700;
                    margin-left: 4px;
                }
                @media (max-width: 767px) {
                    .lmx-sidebar-toggle { display: flex; }
                    .lmx-sidebar-content { display: none; }
                    .lmx-jobs-sidebar.is-open .lmx-sidebar-content { display: block; }
                }

                .lmx-sidebar-heading {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 14px;
                }
                .lmx-sidebar-heading h4 {
                    font-size: 19px;
                    font-weight: 800;
                    color: var(--accent-color);
                    margin: 0;
                }
                .lmx-clear-all-link {
                    background: none;
                    border: none;
                    padding: 0;
                    font-size: 13px;
                    font-weight: 400;
                    color: #64748b;
                    cursor: pointer;
                }
                .lmx-clear-all-link:hover { color: var(--accent-color); text-decoration: underline; }

                /* ── Sidebar cards ── */
                .lmx-sidebar-card {
                    background: #fff;
                    border: 1px solid rgba(0,26,61,0.08);
                    border-radius: 12px;
                    padding: 16px 16px 18px;
                    margin-bottom: 14px;
                }
                .lmx-sidebar-card__header {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: none;
                    border: none;
                    padding: 0;
                    cursor: pointer;
                    color: #94a3b8;
                }
                .lmx-sidebar-card__header h5,
                .lmx-search-title {
                    margin: 0;
                    font-size: 13px;
                    font-weight: 700;
                    letter-spacing: 0.03em;
                    text-transform: uppercase;
                    color: var(--heading-color);
                }
                .lmx-sidebar-card__body { margin-top: 14px; }

                /* ── Search field ── */
                .lmx-search-wrap {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 12px;
                }
                .lmx-search-wrap input {
                    flex: 1;
                    height: 38px;
                    font-size: 13px;
                    border: 1px solid rgba(0,26,61,0.1);
                    border-radius: 8px;
                    padding: 0 12px;
                }
                .lmx-search-wrap button {
                    width: 38px;
                    height: 38px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    border: none;
                    background: var(--accent-bg);
                    color: #fff;
                    cursor: pointer;
                }

                /* ── Checkbox list ── */
                .lmx-check-list { list-style: none; margin: 0; padding: 0; }
                .lmx-check-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 6px 0;
                    cursor: pointer;
                    font-size: 13.5px;
                    color: #475569;
                }
                .lmx-check-item input { position: absolute; opacity: 0; width: 0; height: 0; }
                .lmx-check-box {
                    width: 16px;
                    height: 16px;
                    flex-shrink: 0;
                    border-radius: 4px;
                    border: 1.5px solid #cbd5e1;
                    background: #fff;
                    position: relative;
                    transition: all .15s;
                }
                .lmx-check-item.active .lmx-check-box {
                    background: var(--accent-bg);
                    border-color: var(--accent-bg);
                }
                .lmx-check-item.active .lmx-check-box::after {
                    content: '';
                    position: absolute;
                    left: 4px;
                    top: 1px;
                    width: 4px;
                    height: 8px;
                    border: solid #fff;
                    border-width: 0 2px 2px 0;
                    transform: rotate(45deg);
                }
                .lmx-check-label { flex: 1; }
                .lmx-check-item.active .lmx-check-label { color: var(--heading-color); font-weight: 400; }
                .lmx-check-count {
                    font-size: 11.5px;
                    color: #94a3b8;
                    background: #f1f5f9;
                    border-radius: 100px;
                    padding: 1px 7px;
                }
                .lmx-check-empty { font-size: 12.5px; color: #94a3b8; padding: 6px 0; }

                /* ── Filter search (category / location) ── */
                .lmx-filter-search {
                    position: relative;
                    margin-bottom: 10px;
                }
                .lmx-filter-search__icon {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                }
                .lmx-filter-search input {
                    width: 100%;
                    height: 34px;
                    padding: 0 10px 0 30px;
                    font-size: 12.5px;
                    border: 1px solid rgba(0,26,61,0.1);
                    border-radius: 8px;
                }
                .lmx-filter-scrollable { max-height: 220px; overflow-y: auto; }

                .lmx-show-more {
                    display: block;
                    margin-top: 8px;
                    background: none;
                    border: none;
                    padding: 0;
                    font-size: 12.5px;
                    font-weight: 700;
                    color: var(--accent-color);
                    cursor: pointer;
                }
                .lmx-show-more:hover { text-decoration: underline; }

                /* ── Salary / pay range ── */
                .lmx-salary-inputs {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 16px;
                }
                .lmx-salary-field {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .lmx-salary-field span {
                    font-size: 11px;
                    color: #94a3b8;
                    font-weight: 400;
                }
                .lmx-salary-field input {
                    height: 36px;
                    border: 1px solid rgba(0,26,61,0.1);
                    border-radius: 8px;
                    padding: 0 10px;
                    font-size: 13px;
                    color: var(--heading-color);
                }
                .lmx-salary-sep { color: #cbd5e1; margin-top: 14px; }

                .lmx-salary-slider {
                    position: relative;
                    height: 30px;
                    margin-bottom: 4px;
                }
                .lmx-salary-slider__track {
                    position: absolute;
                    top: 50%;
                    left: 0;
                    right: 0;
                    height: 4px;
                    transform: translateY(-50%);
                    border-radius: 4px;
                    background: #e2e8f0;
                }
                .lmx-salary-slider__track::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    height: 100%;
                    left: var(--min-pct);
                    right: calc(100% - var(--max-pct));
                    background: var(--accent-color);
                    border-radius: 4px;
                }
                .lmx-salary-slider input[type="range"] {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 30px;
                    margin: 0;
                    background: none;
                    appearance: none;
                    pointer-events: none;
                }
                .lmx-salary-slider input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    pointer-events: auto;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #fff;
                    border: 3px solid var(--accent-color);
                    cursor: pointer;
                    margin-top: 0;
                }
                .lmx-salary-slider input[type="range"]::-moz-range-thumb {
                    pointer-events: auto;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #fff;
                    border: 3px solid var(--accent-color);
                    cursor: pointer;
                }
                .lmx-salary-slider input[type="range"]::-webkit-slider-runnable-track { background: none; }
                .lmx-salary-slider input[type="range"]::-moz-range-track { background: none; }

                .lmx-salary-labels {
                    display: flex;
                    justify-content: space-between;
                    font-size: 11.5px;
                    color: #94a3b8;
                    margin-bottom: 6px;
                }

                /* ── Clear filters button ── */
                .lmx-clear-filters {
                    display: block;
                    width: 100%;
                    text-align: center;
                    background: color-mix(in srgb, var(--accent-color) 8%, #fff);
                    color: var(--accent-color);
                    border: 1px solid color-mix(in srgb, var(--accent-color) 22%, #fff);
                    border-radius: 10px;
                    padding: 10px;
                    font-size: 13px;
                    font-weight: 400;
                    cursor: pointer;
                    margin-bottom: 14px;
                }
                .lmx-clear-filters:hover { background: color-mix(in srgb, var(--accent-color) 14%, #fff); }

                /* ── Job alert card (working subscribe form) ── */
                .lmx-job-alert-card {
                    background: color-mix(in srgb, var(--accent-color) 10%, #fff);
                    border-radius: 12px;
                    padding: 18px;
                    text-align: left;
                }
                .lmx-job-alert-card__icon {
                    width: 34px;
                    height: 34px;
                    border-radius: 8px;
                    background: #fff;
                    color: var(--accent-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 10px;
                }
                .lmx-job-alert-card__title { font-size: 14px; font-weight: 700; color: var(--heading-color); margin: 0 0 4px; }
                .lmx-job-alert-card__text { font-size: 12.5px; color: #64748b; margin: 0 0 14px; line-height: 1.5; }
                .lmx-job-alert-card__form {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .lmx-job-alert-card__input {
                    width: 100%;
                    height: 40px;
                    border: 1px solid rgba(0,26,61,0.12);
                    border-radius: 8px;
                    padding: 0 12px;
                    font-size: 13px;
                    background: #fff;
                    color: var(--heading-color);
                }
                .lmx-job-alert-card__input:disabled { opacity: .6; }
                .lmx-job-alert-card__input::placeholder { color: #94a3b8; }
                .lmx-job-alert-card__btn {
                    width: 100%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    background: var(--accent-bg);
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    padding: 10px;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: opacity .2s;
                }
                .lmx-job-alert-card__btn:hover { opacity: .92; }
                .lmx-job-alert-card__btn:disabled { opacity: .65; cursor: not-allowed; }

                /* ── Toolbar / active filters ── */
                .lmx-jobs-toolbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-bottom: 16px;
                }
                .lmx-jobs-count { margin: 0; font-size: 14px; color: #475569; display: flex; align-items: center; gap: 8px; }
                .lmx-sort-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    color: #64748b;
                }
                .lmx-sort-select {
                    border: 1px solid rgba(0,26,61,0.1);
                    border-radius: 8px;
                    padding: 8px 12px;
                    font-size: 13px;
                    color: var(--heading-color);
                }
                .lmx-spinner {
                    width: 13px;
                    height: 13px;
                    border-radius: 50%;
                    border: 2px solid #e2e8f0;
                    border-top-color: var(--accent-color);
                    animation: lmx-spin .6s linear infinite;
                }
                @keyframes lmx-spin { to { transform: rotate(360deg); } }

                .lmx-active-filters {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 18px;
                }
                .lmx-filter-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: #f1f5f9;
                    color: var(--heading-color);
                    font-size: 12.5px;
                    font-weight: 400;
                    padding: 5px 10px;
                    border-radius: 100px;
                }
                .lmx-filter-badge button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: none;
                    border: none;
                    padding: 0;
                    color: #94a3b8;
                    cursor: pointer;
                }
                .lmx-filter-badge button:hover { color: #dc2626; }

                /* ── Job list + JobCard ── */
                .lmx-job-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .lmx-job-card {
                    position: relative;
                    background: #fff;
                    border: 1px solid rgba(15, 23, 42, 0.07);
                    border-radius: 10px;
                    padding: 18px 20px 16px;
                    transition: border-color .15s ease, box-shadow .15s ease;
                }
                .lmx-job-card:hover {
                    border-color: rgba(15, 23, 42, 0.12);
                    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.06);
                }
                .lmx-job-card.is-featured {
                    background: color-mix(in srgb, var(--accent-color) 5%, #fff);
                    border-color: color-mix(in srgb, var(--accent-color) 24%, #fff);
                }
                .lmx-job-card__featured-tag {
                    position: absolute;
                    top: -9px;
                    left: 20px;
                    background: var(--accent-bg);
                    color: #fff;
                    font-size: 10.5px;
                    font-weight: 700;
                    letter-spacing: 0.03em;
                    text-transform: uppercase;
                    padding: 2px 10px;
                    border-radius: 100px;
                }

                .lmx-job-card__top {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                }
                .lmx-job-card__icon {
                    flex-shrink: 0;
                    width: 42px;
                    height: 42px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: color-mix(in srgb, var(--accent-color) var(--tint), #fff);
                    color: var(--accent-color);
                }
                .lmx-job-card__titles { flex: 1; min-width: 0; }
                .lmx-job-card__title {
                    font-size: 15.5px;
                    font-weight: 700;
                    line-height: 1.35;
                    margin: 0 0 4px;
                }
                .lmx-job-card__title a { color: var(--heading-color); }
                .lmx-job-card__title a:hover { color: var(--accent-color); }

                .lmx-job-card__subline {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 5px;
                    font-size: 12.5px;
                    color: #64748b;
                }
                .lmx-job-card__dot { color: #cbd5e1; }
                .lmx-job-card__pay { color: var(--heading-color); font-weight: 400; }

                .lmx-job-card__mode-badge {
                    flex-shrink: 0;
                    font-size: 11.5px;
                    font-weight: 700;
                    padding: 3px 10px;
                    border-radius: 100px;
                    white-space: nowrap;
                }
                /* Same accent color throughout, just varying strength — keeps the
                   badge language on-theme instead of introducing new hues. */
                .lmx-job-card__mode-badge--onsite {
                    background: #f1f5f9;
                    color: #64748b;
                }
                .lmx-job-card__mode-badge--hybrid {
                    background: color-mix(in srgb, var(--accent-color) 14%, #fff);
                    color: var(--accent-color);
                }
                .lmx-job-card__mode-badge--remote {
                    background: var(--accent-bg);
                    color: #fff;
                }

                .lmx-job-card__cats {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 10px;
                    padding-left: 56px;
                }
                .lmx-job-card__cat-tag {
                    font-size: 11px;
                    font-weight: 400;
                    color: #64748b;
                    background: #f8fafc;
                    border: 1px solid rgba(15, 23, 42, 0.06);
                    border-radius: 6px;
                    padding: 3px 8px;
                }

                .lmx-job-card__overview {
                    font-size: 13px;
                    line-height: 1.55;
                    color: #64748b;
                    margin: 10px 0 0;
                    padding-left: 56px;
                }

                .lmx-job-card__footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-top: 14px;
                    padding-top: 12px;
                    padding-left: 56px;
                    border-top: 1px solid rgba(15, 23, 42, 0.05);
                }
                .lmx-job-card__time {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 12px;
                    color: #94a3b8;
                }
                .lmx-job-card__apply-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--accent-color);
                }
                .lmx-job-card__apply-link:hover { text-decoration: underline; }

                @media (max-width: 575px) {
                    .lmx-job-card { padding: 15px 16px 14px; }
                    .lmx-job-card__top { flex-wrap: wrap; }
                    .lmx-job-card__cats,
                    .lmx-job-card__overview,
                    .lmx-job-card__footer { padding-left: 0; }
                }

                /* ── Empty state ── */
                .lmx-empty {
                    text-align: center;
                    padding: 56px 20px;
                    background: #fff;
                    border: 1px dashed rgba(15, 23, 42, 0.12);
                    border-radius: 12px;
                }
                .lmx-empty__icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 52px;
                    height: 52px;
                    border-radius: 50%;
                    background: #f1f5f9;
                    color: #94a3b8;
                    margin-bottom: 14px;
                }
                .lmx-empty h4 { font-size: 16px; font-weight: 700; color: var(--heading-color); margin: 0 0 6px; }
                .lmx-empty p { font-size: 13.5px; color: #64748b; margin: 0 0 16px; }
                .lmx-empty-btn {
                    background: var(--accent-bg);
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 18px;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                }

                /* ── Pagination ── */
                .lmx-pagination {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    margin-top: 26px;
                }
                .lmx-pagi-btn {
                    min-width: 34px;
                    height: 34px;
                    padding: 0 8px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    border: 1px solid rgba(15, 23, 42, 0.1);
                    background: #fff;
                    color: #64748b;
                    font-size: 13px;
                    font-weight: 400;
                    cursor: pointer;
                }
                .lmx-pagi-btn:hover:not(:disabled) { border-color: var(--accent-color); color: var(--accent-color); }
                .lmx-pagi-btn:disabled { opacity: .4; cursor: not-allowed; }
                .lmx-pagi-btn.active {
                    background: var(--accent-bg);
                    border-color: var(--accent-bg);
                    color: #fff;
                }
                .lmx-pagi-ellipsis { color: #94a3b8; padding: 0 2px; }
            `}</style>
        </section>
    );
}