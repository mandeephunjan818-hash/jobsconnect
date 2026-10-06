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
} from 'react';

import type { JobListingItem } from '../../app/actions/jobListAction';

// ─────────────────────────────────────────────────────────────
// Constants (unchanged logic)
// ─────────────────────────────────────────────────────────────
const JOBS_PER_PAGE = 10;

/**
 * In the MongoDB documents the two fields are swapped relative to
 * what their names imply:
 *
 *   • `jobMode`  stores the employment schedule  → "Full-time", "Part-time", etc.
 *   • `jobType`  stores the work location style  → "On-site", "Remote", "Hybrid"
 *
 * All filter logic below follows the actual stored values, not the
 * field names, so the chips correctly match what is in the database.
 */
const WORK_MODE_OPTIONS = ['On-site', 'Remote', 'Hybrid'];
const JOB_TYPE_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Casual'];

// ─────────────────────────────────────────────────────────────
// Helpers (unchanged logic)
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
    return `$${pay.toLocaleString('en-CA')}`;
}

function pad(n: number): string {
    return String(n).padStart(3, '0');
}

function stripText(html: string, limit = 120): string {
    const clean = (html || '').replace(/<\/?[^>]+(>|$)/g, '');
    return clean.length > limit ? `${clean.slice(0, limit)}...` : clean;
}

function formatLocations(locations: string[]): string {
    if (!locations.length) return 'Location not specified';
    if (locations.length === 1) return locations[0];
    return `${locations[0]} +${locations.length - 1} more`;
}

function parseMulti(val: string): string[] {
    return val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
}

function toggleVal(current: string[], value: string): string {
    const lval = value.trim().toLowerCase();
    const idx = current.findIndex(v => v.trim().toLowerCase() === lval);
    const next = idx >= 0 ? current.filter((_, i) => i !== idx) : [...current, value.trim()];
    return next.join(',');
}

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
// JobRow — a ledger line, not a card. Index number, title, tags,
// figures, arrow. Reads like a listings index / stock sheet.
// ─────────────────────────────────────────────────────────────
// const JobRow = memo(function JobRow({ job, index }: { job: JobListingItem; index: number }) {
//     const payStr = formatPay(job.jobPay);
//     const modeBadgeValue = job.jobMode && WORK_MODE_OPTIONS.includes(job.jobType) ? job.jobType : '';

//     return (
//         <Link prefetch={false} href={`/jobs/${job.slug}`} className="jl-row">
//             <span className="jl-row__index">{pad(index)}</span>

//             <span className="jl-row__main">
//                 <span className="jl-row__title-line">
//                     <span className="jl-row__title">{job.title}</span>
//                     {modeBadgeValue && (
//                         <span className={`jl-tag jl-tag--${modeBadgeValue.toLowerCase().replace(/[^a-z]/g, '')}`}>
//                             {modeBadgeValue}
//                         </span>
//                     )}
//                 </span>
//                 <span className="jl-row__sub">
//                     {job.location && <span className="jl-row__sub-item">{job.location}</span>}
//                     {job.jobMode && <span className="jl-row__sub-item">{job.jobMode}</span>}
//                     {job.categories?.[0] && <span className="jl-row__sub-item">{job.categories[0]}</span>}
//                 </span>
//             </span>

//             <span className="jl-row__figures">
//                 {payStr && (
//                     <span className="jl-row__pay">
//                         {payStr}<span className="jl-row__pay-unit">/hr</span>
//                     </span>
//                 )}
//                 <span className="jl-row__time">{timeAgo(job.createdAt)}</span>
//             </span>

//             <span className="jl-row__go" aria-hidden="true">
//                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                     <path d="M5 12h14M13 6l6 6-6 6" />
//                 </svg>
//             </span>
//         </Link>
//     );
// });

// ─────────────────────────────────────────────────────────────
// FilterDock section — dark control-panel styling, distinct from
// the light bordered "tm-card" panels used across the rest of the site.
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
    const [search, setSearch] = useState('');

    const filtered = useMemo(
        () => !search
            ? items
            : items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())),
        [items, search],
    );

    return (
        <div className="jl-dock__section">
            <span className="jl-dock__label">{title}</span>
            <input
                className="jl-dock__search"
                placeholder={placeholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
            <div className="jl-pillrow">
                {filtered.map(item => {
                    const isActive = selected.some(s => s.trim().toLowerCase() === item.name.trim().toLowerCase());
                    return (
                        <button
                            type="button"
                            key={item.name}
                            className={`m-1 jl-pill${isActive ? ' is-active' : ''}`}
                            onClick={() => onToggle(item.name)}
                        >
                            <span className="jl-dock__row-name">{item.name}</span>
                            {/* <span className="jl-dock__row-count">{item.count}</span> */}
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

// ─────────────────────────────────────────────────────────────
// Main component (all state/URL/filter/pagination logic unchanged)
// ─────────────────────────────────────────────────────────────
interface Props {
    allListings: JobListingItem[];
}

export default function JobsAreaClient({ allListings }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const spRef = useRef(searchParams);
    spRef.current = searchParams;

    const urlQuery = searchParams?.get('q') ?? '';
    const urlLoc = searchParams?.get('location') ?? '';
    const urlModeRaw = searchParams?.get('mode') ?? '';
    const urlTypeRaw = searchParams?.get('type') ?? '';
    const urlCatRaw = searchParams?.get('category') ?? '';
    const urlProvRaw = searchParams?.get('province') ?? '';
    const urlCityRaw = searchParams?.get('city') ?? '';
    const urlPage = parseInt(searchParams?.get('page') ?? '1', 10);
    const urlSort = searchParams?.get('sort') ?? 'newest';

    const selModes = useMemo(() => [...new Set(parseMulti(urlModeRaw))], [urlModeRaw]);
    const selTypes = useMemo(() => [...new Set(parseMulti(urlTypeRaw))], [urlTypeRaw]);
    const selCats = useMemo(() => [...new Set(parseMulti(urlCatRaw))], [urlCatRaw]);
    const selProvs = useMemo(() => [...new Set(parseMulti(urlProvRaw))], [urlProvRaw]);
    const selCities = useMemo(() => [...new Set(parseMulti(urlCityRaw))], [urlCityRaw]);

    const [searchInput, setSearchInput] = useState(urlQuery);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => { setSearchInput(urlQuery); }, [urlQuery]);

    const updateURL = useCallback((updates: Record<string, string>) => {
        const params = new URLSearchParams(spRef.current?.toString());
        for (const [key, val] of Object.entries(updates)) {
            if (val) params.set(key, val);
            else params.delete(key);
        }
        if (!('page' in updates)) params.delete('page');
        startTransition(() => router.push(`/jobs?${params.toString()}`));
    }, [router]);

    const toggleMulti = useCallback((key: string, current: string[], value: string) => {
        updateURL({ [key]: toggleVal(current, value) });
    }, [updateURL]);

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
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [allListings],
    );

    const categories = useMemo(() => {
        const m: Record<string, { name: string; count: number }> = {};
        allListings.forEach(j =>
            j.categories.forEach((raw: any) => {
                const key = raw.trim().toLowerCase();
                if (!key) return;
                if (m[key]) m[key].count++;
                else m[key] = { name: raw.trim(), count: 1 };
            })
        );
        return Object.values(m).sort((a, b) => b.count - a.count);
    }, [allListings]);

    const provinces = useMemo(() => {
        const m: Record<string, { name: string; count: number }> = {};
        allListings.forEach(j => {
            const raw = j.province;
            if (!raw) return;
            const key = raw.trim().toLowerCase();
            if (!key) return;
            if (m[key]) m[key].count++;
            else m[key] = { name: raw.trim(), count: 1 };
        });
        return Object.values(m).sort((a, b) => b.count - a.count);
    }, [allListings]);

    const cities = useMemo(() => {
        const m: Record<string, { name: string; count: number }> = {};
        allListings.forEach(j => {
            const raw = j.city;
            if (!raw) return;
            const key = raw.trim().toLowerCase();
            if (!key) return;
            if (m[key]) m[key].count++;
            else m[key] = { name: raw.trim(), count: 1 };
        });
        return Object.values(m).sort((a, b) => b.count - a.count);
    }, [allListings]);

    const filteredListings = useMemo(() => {
        const q = urlQuery.toLowerCase().trim();
        const loc = urlLoc.toLowerCase().trim();
        const modes = selModes.map(m => m.trim().toLowerCase());
        const types = selTypes.map(t => t.trim().toLowerCase());
        const cats = selCats.map(c => c.trim().toLowerCase());
        const provs = selProvs.map(p => p.trim().toLowerCase());
        const ctys = selCities.map(c => c.trim().toLowerCase());

        let result: JobListingItem[] = processed.filter(job => {
            if (q && !job._lc_title.includes(q) && !job._lc_overview.includes(q) && !job._lc_desc.includes(q))
                return false;
            if (loc && !job._lc_location.includes(loc) && !job._lc_city.includes(loc) && !job._lc_province.includes(loc))
                return false;
            if (modes.length > 0 && !modes.includes(job._lc_workMode))
                return false;
            if (types.length > 0 && !types.includes(job._lc_jobType))
                return false;
            if (cats.length > 0 && !job.categories.some((c: any) => cats.includes(c.trim().toLowerCase())))
                return false;
            if (provs.length > 0 && !provs.includes((job.province ?? '').trim().toLowerCase()))
                return false;
            if (ctys.length > 0 && !ctys.includes((job.city ?? '').trim().toLowerCase()))
                return false;
            return true;
        });

        if (urlSort === 'pay_high') result = [...result].sort((a, b) => b.jobPay - a.jobPay);
        else if (urlSort === 'pay_low') result = [...result].sort((a, b) => a.jobPay - b.jobPay);

        return result;
    }, [processed, urlQuery, urlLoc, selModes, selTypes, selCats, selProvs, selCities, urlSort]);

    const totalPages = Math.max(1, Math.ceil(filteredListings.length / JOBS_PER_PAGE));
    const safePage = Math.min(Math.max(1, urlPage), totalPages);
    const pageJobs = filteredListings.slice((safePage - 1) * JOBS_PER_PAGE, safePage * JOBS_PER_PAGE);

    const handlePage = useCallback((page: number) => {
        const params = new URLSearchParams(spRef.current?.toString());
        if (page === 1) params.delete('page');
        else params.set('page', String(page));
        router.push(`/jobs?${params.toString()}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [router]);

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
        urlQuery || urlLoc || urlModeRaw || urlTypeRaw || urlCatRaw || urlProvRaw || urlCityRaw
    );

    const activeFilterCount =
        (urlQuery ? 1 : 0) + (urlLoc ? 1 : 0) +
        (selModes.length > 0 ? 1 : 0) +
        (selTypes.length > 0 ? 1 : 0) +
        (selCats.length > 0 ? 1 : 0) +
        (selProvs.length > 0 ? 1 : 0) +
        (selCities.length > 0 ? 1 : 0);

    const startNum = filteredListings.length === 0 ? 0 : (safePage - 1) * JOBS_PER_PAGE + 1;
    const endNum = Math.min(safePage * JOBS_PER_PAGE, filteredListings.length);

    // ─────────────────────────────────────────────────────────────
    return (
        <section className="jl-section pt-150 pb-150">
            <div className="container">

                {/* ── Index header — ledger framing for the whole list ── */}
                <div className="jl-layout">

                    {/* ── Filter dock ─────────────────────────────── */}
                    <aside className={`jl-dock${isOpen ? ' is-open' : ''}`} style={{ position: "sticky", top: "10%" }}>
                        <button
                            type="button"
                            className="jl-dock__toggle"
                            onClick={() => setIsOpen(o => !o)}
                            aria-expanded={isOpen}
                        >
                            {isOpen ? (
                                <>
                                    <i className="fal fa-times"></i> Close filters
                                </>
                            ) : (
                                <>
                                    <i className="fal fa-sliders-h"></i> Refine list
                                    {activeFilterCount > 0 && (
                                        <span className="jl-dock__badge">{activeFilterCount}</span>
                                    )}
                                </>
                            )}
                        </button>

                        <div className="jl-dock__body">

                            <div className="jl-dock__section">
                                <span className="jl-dock__label">
                                    <i className="fal fa-search"></i> Keyword
                                </span>
                                <form
                                    className="jl-dock__search-form"
                                    onSubmit={e => {
                                        e.preventDefault();
                                        updateURL({ q: searchInput.trim() });
                                    }}
                                >
                                    <input
                                        type="search"
                                        className="jl-dock__search"
                                        placeholder="Title, keyword…"
                                        value={searchInput}
                                        onChange={e => setSearchInput(e.target.value)}
                                    />
                                    <button type="submit" aria-label="Search">
                                        <i className="fal fa-arrow-right"></i>
                                    </button>
                                </form>
                            </div>

                            <div className="jl-dock__section">
                                <span className="jl-dock__label">
                                    <i className="fal fa-laptop-house"></i> Work mode
                                </span>
                                <div className="jl-pillrow">
                                    {WORK_MODE_OPTIONS.map(mode => {
                                        const isActive = selModes.some(m => m.toLowerCase() === mode.toLowerCase());
                                        return (
                                            <button
                                                type="button"
                                                key={mode}
                                                className={`jl-pill${isActive ? ' is-active' : ''}`}
                                                onClick={() => toggleMulti('mode', selModes, mode)}
                                            >
                                                {mode}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="jl-dock__section">
                                <span className="jl-dock__label">
                                    <i className="fal fa-briefcase"></i> Job type
                                </span>
                                <div className="jl-pillrow">
                                    {JOB_TYPE_OPTIONS.map(type => {
                                        const isActive = selTypes.some(t => t.toLowerCase() === type.toLowerCase());
                                        return (
                                            <button
                                                type="button"
                                                key={type}
                                                className={`jl-pill${isActive ? ' is-active' : ''}`}
                                                onClick={() => toggleMulti('type', selTypes, type)}
                                            >
                                                {type}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {categories.length > 0 && (
                                <FilterSection
                                    title="Category"
                                    placeholder="Filter categories…"
                                    items={categories}
                                    selected={selCats}
                                    onToggle={v => toggleMulti('category', selCats, v)}
                                />
                            )}

                            {provinces.length > 0 && (
                                <FilterSection
                                    title="Province"
                                    placeholder="Filter provinces…"
                                    items={provinces}
                                    selected={selProvs}
                                    onToggle={v => toggleMulti('province', selProvs, v)}
                                />
                            )}

                            {cities.length > 0 && (
                                <FilterSection
                                    title="City"
                                    placeholder="Filter cities…"
                                    items={cities}
                                    selected={selCities}
                                    onToggle={v => toggleMulti('city', selCities, v)}
                                />
                            )}

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    className="jl-dock__clear"
                                    onClick={() => { router.push('/jobs'); setIsOpen(false); }}
                                >
                                    <i className="fal fa-times-circle"></i> Clear all filters
                                </button>
                            )}
                        </div>
                    </aside>

                    {/* ── Ledger column ─────────────────────────────── */}
                    <div className={`jl-main${isPending ? ' is-loading' : ''}`} style={{ position: "sticky", top: "10%" }}>
                        <div className="jl-index-head">
                            <div>
                                {/* <span className="jl-index-eyebrow">Open roles — index</span> */}
                                <h2 className="jl-index-title">
                                    {/* {filteredListings.length ? `${pad(1)}–${pad(filteredListings.length)}` : '000'} */}
                                    {/* <span className="jl-index-title-sep">/</span> */}
                                    {/* Job Listings */}
                                    <span className="jl-index-title-label">
                                        {filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''}
                                        {hasActiveFilters ? ' filtered' : ''}
                                    </span>
                                </h2>
                            </div>
                            <select
                                className="jl-sort"
                                value={urlSort}
                                onChange={e => updateURL({ sort: e.target.value })}
                            >
                                <option value="newest">Sort — Newest</option>
                                <option value="pay_high">Sort — Pay, high to low</option>
                                <option value="pay_low">Sort — Pay, low to high</option>
                            </select>
                        </div>

                        {hasActiveFilters && (
                            <div className="jl-active-filters">
                                {urlQuery && (
                                    <span className="jl-filter-tag">
                                        “{urlQuery}”
                                        <button type="button" onClick={() => updateURL({ q: '' })} aria-label="Clear search">×</button>
                                    </span>
                                )}
                                {urlLoc && (
                                    <span className="jl-filter-tag">
                                        {urlLoc}
                                        <button type="button" onClick={() => updateURL({ location: '' })} aria-label="Clear location">×</button>
                                    </span>
                                )}
                                {selModes.map(m => (
                                    <span key={m} className="jl-filter-tag">
                                        {m}
                                        <button type="button" onClick={() => toggleMulti('mode', selModes, m)} aria-label={`Remove ${m}`}>×</button>
                                    </span>
                                ))}
                                {selTypes.map(t => (
                                    <span key={t} className="jl-filter-tag">
                                        {t}
                                        <button type="button" onClick={() => toggleMulti('type', selTypes, t)} aria-label={`Remove ${t}`}>×</button>
                                    </span>
                                ))}
                                {selCats.map(c => (
                                    <span key={c} className="jl-filter-tag">
                                        {c}
                                        <button type="button" onClick={() => toggleMulti('category', selCats, c)} aria-label={`Remove ${c}`}>×</button>
                                    </span>
                                ))}
                                {selProvs.map(p => (
                                    <span key={p} className="jl-filter-tag">
                                        {p}
                                        <button type="button" onClick={() => toggleMulti('province', selProvs, p)} aria-label={`Remove ${p}`}>×</button>
                                    </span>
                                ))}
                                {selCities.map(c => (
                                    <span key={c} className="jl-filter-tag">
                                        {c}
                                        <button type="button" onClick={() => toggleMulti('city', selCities, c)} aria-label={`Remove ${c}`}>×</button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {pageJobs.length === 0 ? (
                            <div className="jl-empty">
                                <span className="jl-empty__index">000</span>
                                <h4>No listings match this filter</h4>
                                <p>Loosen a filter or clear the search to see more roles.</p>
                                <button type="button" className="jl-dock__clear" onClick={() => router.push('/jobs')}>
                                    Clear filters
                                </button>
                            </div>
                        ) : (
                            <div className="jl-ledger row">
                                {pageJobs.map((job, i) => (
                                    <div className="col-md-6 col-12 mt-40 d-flex" key={job._id}>
                                        <div className="da-blog-item h-100 w-100 d-flex flex-column">
                                            <div className="xb-item--holder d-flex flex-column flex-grow-1">

                                                <div className="jc-top">
                                                    <span className="xb-item--date">
                                                        <i className="fal fa-map-marker-alt"></i> {formatLocations(job.locations)} · <i className="fal fa-clock"></i> {timeAgo(job.createdAt)}
                                                    </span>
                                                    {job.jobType && (
                                                        <span className={`jc-badge jc-badge--${job.jobType.toLowerCase().replace(/[^a-z]/g, '')}`}>
                                                            {job.jobType}
                                                        </span>
                                                    )}
                                                </div>

                                                <h2 className="xb-item--title border-effect">
                                                    <Link
                                                        href={`/jobs/${job.slug}`}
                                                        className="blog-title-link"
                                                        style={{ textTransform: 'capitalize' }}
                                                    >
                                                        {job.title}
                                                    </Link>
                                                </h2>

                                                {job.companyName && (
                                                    <span className="jc-company">
                                                        <i className="fal fa-building"></i> {job.companyName}
                                                    </span>
                                                )}

                                                {job.categories?.length > 0 && (
                                                    <div className="jc-categories">
                                                        {job.categories.slice(0, 3).map(cat => (
                                                            <span key={cat} className="jc-cat-pill">
                                                                <i className="fal fa-tag"></i> {cat}
                                                            </span>
                                                        ))}
                                                        {job.categories.length > 3 && (
                                                            <span className="jc-cat-pill jc-cat-pill--more">
                                                                +{job.categories.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                <p className="jc-desc">
                                                    {stripText(job.description)}
                                                </p>

                                                <div className="jc-meta-row">
                                                    {job.jobMode && (
                                                        <span className="jc-meta-item">
                                                            <i className="fal fa-laptop-house"></i> {job.jobMode}
                                                        </span>
                                                    )}
                                                    {job.slotsCount > 1 && (
                                                        <span className="jc-meta-item">
                                                            <i className="fal fa-map-marker-alt"></i> {job.slotsCount} locations
                                                        </span>
                                                    )}
                                                    {(job.payMin > 0 || job.payMax > 0) && (
                                                        <span className="jc-pay">
                                                            <i className="fal fa-money-bill-wave"></i>{' '}
                                                            {job.payMin === job.payMax || !job.payMax
                                                                ? formatPay(job.payMin)
                                                                : `${formatPay(job.payMin)}–${formatPay(job.payMax)}`}
                                                            <span className="jc-pay-unit">/hr</span>
                                                        </span>
                                                    )}
                                                </div>

                                                <Link
                                                    href={`/jobs/${job.slug}`}
                                                    className="xb-item--arrow mt-auto"
                                                >
                                                    <span>
                                                        <i className="fal fa-arrow-right"></i>
                                                    </span>{' '}
                                                    View Job
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {totalPages > 1 && (
                            <nav className="jl-pagination" aria-label="Job listings pagination">
                                <button
                                    type="button"
                                    className="jl-pagi-btn"
                                    onClick={() => safePage > 1 && handlePage(safePage - 1)}
                                    disabled={safePage <= 1}
                                    aria-label="Previous page"
                                >
                                    ←
                                </button>

                                <span className="jl-pagi-range">
                                    {pad(startNum)}–{pad(endNum)} <em>of {pad(filteredListings.length)}</em>
                                </span>

                                {pageNums.map((num, i) =>
                                    num === null ? (
                                        <span key={`ellipsis-${i}`} className="jl-pagi-ellipsis">···</span>
                                    ) : (
                                        <button
                                            type="button"
                                            key={num}
                                            className={`jl-pagi-btn jl-pagi-btn--num${num === safePage ? ' is-active' : ''}`}
                                            onClick={() => handlePage(num)}
                                            aria-current={num === safePage ? 'page' : undefined}
                                        >
                                            {num}
                                        </button>
                                    )
                                )}

                                <button
                                    type="button"
                                    className="jl-pagi-btn"
                                    onClick={() => safePage < totalPages && handlePage(safePage + 1)}
                                    disabled={safePage >= totalPages}
                                    aria-label="Next page"
                                >
                                    →
                                </button>
                            </nav>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}