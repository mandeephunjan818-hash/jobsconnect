"use client";

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import RightArrawWhitIcon from '@/svg/RightArrawWhitIcon';
import Image from 'next/image';
import Link from 'next/link';
import type { JobPreviewItem } from '../../app/actions/jobListAction';

import location_img from '@/assets/images/career/location.svg';

const AOS_DURATIONS = ['500', '700', '900'];

interface Props {
    jobs: JobPreviewItem[];
}

type FilterKey = 'all' | 'full-time' | 'part-time' | 'remote' | 'hybrid' | 'on-site';

/* ── Small inline icons (no external deps) ── */
const iconProps = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const GridIcon = () => (<svg {...iconProps}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>);
const BriefcaseIcon = () => (<svg {...iconProps}><rect x="2" y="7" width="20" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>);
const ClockIcon = () => (<svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>);
const WifiIcon = () => (<svg {...iconProps}><path d="M2 8.5a16 16 0 0 1 20 0" /><path d="M5.5 12.5a11 11 0 0 1 13 0" /><path d="M9 16.5a6 6 0 0 1 6 0" /><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" /></svg>);
const BuildingIcon = () => (<svg {...iconProps}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" /></svg>);
const PinIcon = () => (<svg {...iconProps}><path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>);
const StarIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7L12 2z" /></svg>);
const HeartIcon = ({ filled }: { filled: boolean }) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? '#e64868' : 'none'} stroke={filled ? '#e64868' : '#9aa2b1'} strokeWidth={2}>
        <path d="M12 20.5s-7.6-4.6-10.2-9.3C.3 8.1 1.4 4.6 4.6 3.6c2.1-.6 4.2.2 5.6 2 .4.5.8 1 .8 1s.4-.5.8-1c1.4-1.8 3.5-2.6 5.6-2 3.2 1 4.3 4.5 2.8 7.6C19.6 15.9 12 20.5 12 20.5z" />
    </svg>
);

const FILTERS: { key: FilterKey; label: string; icon: () => ReactNode }[] = [
    { key: 'all', label: 'All Jobs', icon: GridIcon },
    { key: 'full-time', label: 'Full-time', icon: BriefcaseIcon },
    { key: 'part-time', label: 'Part-time', icon: ClockIcon },
    { key: 'remote', label: 'Remote', icon: WifiIcon },
    { key: 'hybrid', label: 'Hybrid', icon: BuildingIcon },
    { key: 'on-site', label: 'On-site', icon: PinIcon },
];

const AVATAR_COLORS = ['#6C3FCF', '#2F6FED', '#161B33', '#EF5A73', '#12A585', '#E08B1D'];

function stripText(html: string, limit = 100): string {
    const clean = (html || '').replace(/<\/?[^>]+(>|$)/g, '');
    return clean.length > limit ? `${clean.slice(0, limit)}...` : clean;
}

function getInitials(name?: string): string {
    if (!name) return '--';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '--';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

function timeAgo(value?: string | Date | null): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
}

function matchesFilter(job: JobPreviewItem, key: FilterKey): boolean {
    if (key === 'all') return true;
    const mode = (job.jobMode || '').toLowerCase();
    const type = ((job as any).jobType || '').toLowerCase();
    switch (key) {
        case 'full-time':
            return mode.includes('full');
        case 'part-time':
            return mode.includes('part');
        case 'remote':
            return type.includes('remote') || mode.includes('remote');
        case 'hybrid':
            return type.includes('hybrid') || mode.includes('hybrid');
        case 'on-site':
            return type.includes('on-site') || type.includes('onsite') || mode.includes('on-site') || mode.includes('onsite');
        default:
            return true;
    }
}

export default function JobListArea({ jobs }: Props) {
    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
    const [liked, setLiked] = useState<Record<string, boolean>>({});

    const filteredJobs = useMemo(
        () => jobs.filter(job => matchesFilter(job, activeFilter)),
        [jobs, activeFilter]
    );

    const toggleLike = (id: string) => {
        setLiked(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <section className="pt-5">
            <div className="container">

                {/* ── Section heading ── */}
                <div className="text-md-start text-center d-flex justify-content-between align-items-center flex-wrap max-width-700 mb-4">
                    <div className="col-12 col-md-5">
                        <h6 className='text-gradient'>Jobs</h6>
                        <h2 className="title pb-0 ml-20 capitalize">
                            Select Your Job From This Open Positions
                        </h2>
                    </div>
                    <div className="mt-3 ms-md-auto me-md-0 mx-auto">
                        <Link prefetch={false} href="/jobs" className="luminix-default-btn pill button-custom">
                            View All Jobs
                            <RightArrawWhitIcon />
                        </Link>
                    </div>
                </div>

                {/* ── Filter bar ── */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div
                        className="job-filter-scroll"
                        style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2, maxWidth: '100%' }}
                    >
                        {FILTERS.map(f => {
                            const Icon = f.icon;
                            const active = activeFilter === f.key;
                            return (
                                <button
                                    key={f.key}
                                    type="button"
                                    onClick={() => setActiveFilter(f.key)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 7,
                                        flexShrink: 0,
                                        whiteSpace: 'nowrap',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        padding: '9px 16px',
                                        borderRadius: 50,
                                        border: active ? '1px solid var(--accent-color, #6c3fcf)' : '1px solid #e6e8ef',
                                        background: active ? 'var(--accent-color, #6c3fcf)' : '#fff',
                                        color: active ? '#fff' : '#3a4256',
                                        cursor: 'pointer',
                                        transition: 'all 0.18s ease',
                                    }}
                                >
                                    <Icon />
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#8791a3', whiteSpace: 'nowrap' }}>
                        {filteredJobs.length} {filteredJobs.length === 1 ? 'Opportunity' : 'Opportunities'}
                    </div>
                </div>

                {/* ── Cards grid ── */}
                <div className="row d-flex" style={{ alignItems: 'stretch' }}>
                    {filteredJobs.map((job, idx) => {
                        const isFeatured = Boolean((job as any).isFeatured);
                        // const isLiked = Boolean(liked[job._id]);
                        const posted = timeAgo((job as any).createdAt || (job as any).postedAt);
                        const salary = (job as any).salaryRange || (job as any).salary || null;
                        const avatarColor = null;

                        return (
                            <div
                                key={job._id}
                                className="col-lg-4 col-md-6 col-12 mb-4 d-flex align-items-stretch px-2"
                                data-aos="fade-up"
                                data-aos-duration={AOS_DURATIONS[idx % AOS_DURATIONS.length]}
                            >
                                <div
                                    className="w-100 d-flex flex-column"
                                    style={{
                                        background: '#fff',
                                        borderRadius: 16,
                                        overflow: 'hidden',
                                        boxShadow: isFeatured
                                            ? '0 2px 10px rgba(108,63,207,0.10), 0 12px 32px rgba(108,63,207,0.14)'
                                            : '0 2px 8px rgba(0,0,0,0.06), 0 10px 32px rgba(108,63,207,0.07)',
                                        border: isFeatured ? '1.5px solid var(--accent-color, #6c3fcf)' : '1px solid transparent',
                                        position: 'relative',
                                        transition: 'transform 0.24s ease, box-shadow 0.24s ease',
                                    }}
                                    onMouseEnter={e => {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.transform = 'translateY(-5px)';
                                        el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.09), 0 24px 48px rgba(108,63,207,0.13)';
                                    }}
                                    onMouseLeave={e => {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.transform = 'translateY(0)';
                                        el.style.boxShadow = isFeatured
                                            ? '0 2px 10px rgba(108,63,207,0.10), 0 12px 32px rgba(108,63,207,0.14)'
                                            : '0 2px 8px rgba(0,0,0,0.06), 0 10px 32px rgba(108,63,207,0.07)';
                                    }}
                                >
                                    {isFeatured && (
                                        <span style={{
                                            position: 'absolute',
                                            top: 14,
                                            left: 20,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: '0.06em',
                                            textTransform: 'uppercase',
                                            color: '#fff',
                                            background: 'var(--accent-color, #6c3fcf)',
                                            padding: '4px 10px',
                                            borderRadius: 50,
                                            zIndex: 2,
                                        }}>
                                            <StarIcon /> Featured
                                        </span>
                                    )}

                                    {/* ── Header: avatar + title + job mode pill ── */}
                                    <div style={{ padding: isFeatured ? '38px 20px 0' : '20px 20px 0' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                            <div style={{
                                                width: 44,
                                                height: 44,
                                                flexShrink: 0,
                                                borderRadius: 12,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.85rem',
                                                fontWeight: 700,
                                                background: avatarColor ?? '#f0ebff',
                                                color: avatarColor ? '#fff' : 'var(--accent-color, #6c3fcf)',
                                                border: avatarColor ? 'none' : '1px solid #e6ddff',
                                            }}>
                                                {getInitials(job.companyName)}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                                    <Link
                                                        prefetch={false}
                                                        href={`/jobs/${job.slug}`}
                                                        style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}
                                                    >
                                                        <h5 style={{
                                                            fontSize: '1.05rem',
                                                            fontWeight: 700,
                                                            color: '#1c2233',
                                                            lineHeight: 1.3,
                                                            margin: 0,
                                                            textTransform: 'capitalize',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}>
                                                            {job.title}
                                                        </h5>
                                                    </Link>
                                                    <span style={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        letterSpacing: '0.08em',
                                                        textTransform: 'uppercase',
                                                        color: 'var(--accent-color, #6c3fcf)',
                                                        background: '#f0ebff',
                                                        padding: '4px 10px',
                                                        borderRadius: 50,
                                                        flexShrink: 0,
                                                    }}>
                                                        {job.jobMode || 'Full-time'}
                                                    </span>
                                                </div>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500,
                                                    color: '#8791a3',
                                                    marginTop: 3,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '1px',
                                                }}>
                                                    {job.companyName}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Card body ── */}
                                    <div style={{
                                        padding: '14px 20px 20px',
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}>
                                        {job.categories?.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 11 }}>
                                                {job.categories.map(cat => (
                                                    <span key={cat} style={{
                                                        fontSize: 10.5,
                                                        fontWeight: 600,
                                                        padding: '3px 9px',
                                                        borderRadius: 4,
                                                        background: '#f0ebff',
                                                        color: 'var(--accent-color, #6c3fcf)',
                                                        letterSpacing: '1px',
                                                    }}>
                                                        {cat}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {job.location && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                <Image src={location_img} alt="Location" width={14} height={14} style={{ opacity: 0.55 }} />
                                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                    {job.location}
                                                </span>
                                            </div>
                                        )}

                                        {salary && (
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e9e6b', marginBottom: 10 }}>
                                                {salary}
                                            </div>
                                        )}

                                        <p style={{
                                            fontSize: '0.855rem',
                                            color: '#5a6580',
                                            lineHeight: 1.65,
                                            flex: 1,
                                            marginBottom: 14,
                                        }}>
                                            {stripText(job.description)}
                                        </p>

                                        {/* Footer */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 10,
                                            paddingTop: 14,
                                            borderTop: '1px solid #f0f2f6',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                                {posted && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#8791a3', whiteSpace: 'nowrap' }}>
                                                        <ClockIcon /> Posted {posted}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                                <Link
                                                    prefetch={false}
                                                    href={`/jobs/${job.slug}`}
                                                    className='luminix-default-btn pill button-custom d-sm-flex d-none'
                                                    style={{
                                                        color: '#fff',
                                                    }}
                                                >
                                                    View Job
                                                    <RightArrawWhitIcon />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filteredJobs.length === 0 && (
                        <div className="col-12 text-center" style={{ padding: '40px 0', color: '#8791a3' }}>
                            No jobs match this filter right now.
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .job-filter-scroll::-webkit-scrollbar { height: 0; }
                .job-filter-scroll { scrollbar-width: none; }
            `}</style>
        </section>
    );
}