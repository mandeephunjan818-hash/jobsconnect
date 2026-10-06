'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { JobDetailItem } from '../../app/actions/jobListAction';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function formatPay(pay: number): string {
    if (!pay) return '';
    return `$${pay.toLocaleString('en-CA')}`;
}

function formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
interface Props {
    job: JobDetailItem;
}

export default function JobDetailsView({ job }: Props) {
    const [copied, setCopied] = useState(false);

    const pays = job.slots.map(s => s.jobPay).filter((p: any) => p > 0);
    const payMin = pays.length ? Math.min(...pays) : 0;
    const payMax = pays.length ? Math.max(...pays) : 0;
    const primarySlot = job.slots[0];

    const modeBadgeClass =
        `jd-badge jd-badge--${(job.jobMode ?? '').toLowerCase().replace(/[^a-z]/g, '')}`;

    const applyHref = job.applyEmail
        ? `mailto:${job.applyEmail}?subject=${encodeURIComponent(
            `Application for ${job.title} (${job.jobId})`,
        )}`
        : undefined;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(job.jobId);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            /* clipboard not available — silently ignore */
        }
    };

    let sectionIndex = 0;
    const nextSectionNum = () => pad(++sectionIndex);

    return (
        <section className="jd-section pt-150 pb-150">
            <div className="container">

                {/* ── Head ─────────────────────────────────────── */}
                <div className="jd-head">
                    <div className="row align-items-start">
                        <div className="col-md-8 col-12">
                            <div className="jd-eyebrow">
                                <span><i className="fal fa-folder-open"></i> Job File</span>
                                <span className="jd-eyebrow-id">{job.jobId}</span>
                                <button type="button" className="jd-copy-btn" onClick={handleCopy}>
                                    <i className="fal fa-copy"></i> {copied ? 'Copied' : 'Copy ID'}
                                </button>
                            </div>

                            <h1 className="jd-title" style={{ textTransform: 'capitalize' }}>
                                {job.title}
                            </h1>

                            <div className="jd-company-row">
                                <i className="fal fa-building"></i>
                                <span className="jd-company">{job.companyName}</span>
                            </div>

                            <div className="jd-meta-row">
                                {job.jobMode && (
                                    <span className={modeBadgeClass}>
                                        <i className="fal fa-laptop-house"></i> {job.jobMode}
                                    </span>
                                )}
                                {job.jobType && (
                                    <span className="jd-badge jd-badge--neutral">
                                        <i className="fal fa-briefcase"></i> {job.jobType}
                                    </span>
                                )}
                                {primarySlot && (
                                    <span className="jd-badge jd-badge--neutral">
                                        <i className="fal fa-map-marker-alt"></i>{' '}
                                        {primarySlot.city}, {primarySlot.province}
                                        {job.slots.length > 1 && ` +${job.slots.length - 1} more`}
                                    </span>
                                )}
                                <span className="jd-badge jd-badge--neutral">
                                    <i className="fal fa-calendar-alt"></i> Posted {formatDate(job.createdAt)}
                                </span>
                            </div>

                            {job.categories.length > 0 && (
                                <div className="jd-cats" style={{ marginTop: 18 }}>
                                    {job.categories.map((cat: any) => (
                                        <span key={cat} className="jd-cat">
                                            <i className="fal fa-tag"></i> {cat}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="col-md-4 col-12">
                            {(payMin > 0 || payMax > 0) && (
                                <div className="jd-pay-wrap">
                                    <span className="jd-pay-label">
                                        <i className="fal fa-money-bill-wave"></i> Estimated Pay
                                    </span>
                                    <span className="jd-pay-figure">
                                        {payMin === payMax || !payMax
                                            ? formatPay(payMin)
                                            : `${formatPay(payMin)}–${formatPay(payMax)}`}
                                        <span className="jd-pay-unit">/hr</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Layout ───────────────────────────────────── */}
                <div className="jd-layout">

                    {/* ── Main ─────────────────────────────────── */}
                    <div className="jd-main">

                        {job.overview && (
                            <div className="jd-sec">
                                <div className="jd-sec-head">
                                    <span className="jd-sec-num">{nextSectionNum()}</span>
                                    <h2 className="jd-sec-title">Overview</h2>
                                </div>
                                <div
                                    className="jd-prose"
                                    dangerouslySetInnerHTML={{ __html: job.overview }}
                                />
                            </div>
                        )}

                        {job.description && (
                            <div className="jd-sec">
                                <div className="jd-sec-head">
                                    <span className="jd-sec-num">{nextSectionNum()}</span>
                                    <h2 className="jd-sec-title">Description</h2>
                                </div>
                                <p className="jd-prose">{job.description}</p>
                            </div>
                        )}

                        {job.highlights.length > 0 && (
                            <div className="jd-sec">
                                <div className="jd-sec-head">
                                    <span className="jd-sec-num">{nextSectionNum()}</span>
                                    <h2 className="jd-sec-title">Responsibilities</h2>
                                </div>
                                <ul className="jd-list">
                                    {job.highlights.map((item: any, i: any) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                        )}

                        {job.benefits.length > 0 && (
                            <div className="jd-sec">
                                <div className="jd-sec-head">
                                    <span className="jd-sec-num">{nextSectionNum()}</span>
                                    <h2 className="jd-sec-title">Benefits</h2>
                                </div>
                                <ul className="jd-list">
                                    {job.benefits.map((item: any, i: any) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                        )}

                        {job.slots.length > 0 && (
                            <div className="jd-sec">
                                <div className="jd-sec-head">
                                    <span className="jd-sec-num">{nextSectionNum()}</span>
                                    <h2 className="jd-sec-title">Locations &amp; Schedule</h2>
                                </div>
                                <div className="jd-slots">
                                    {job.slots.map((slot: any) => (
                                        <div key={slot._id} className="jd-slot">
                                            <div>
                                                <p className="jd-slot__loc">{slot.city}, {slot.province}</p>
                                                {slot.location && (
                                                    <p className="jd-slot__addr">{slot.location}</p>
                                                )}
                                                {slot.jobStartingTime && (
                                                    <p className="jd-slot__addr">
                                                        Starts {slot.jobStartingTime}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="jd-slot__figures">
                                                {slot.jobPay > 0 && (
                                                    <p className="jd-slot__pay">
                                                        {formatPay(slot.jobPay)}
                                                        <span className="jd-pay-unit">/hr</span>
                                                    </p>
                                                )}
                                                {slot.jobVacancy && (
                                                    <p className="jd-slot__vac">
                                                        {slot.jobVacancy} opening{slot.jobVacancy !== '1' ? 's' : ''}
                                                    </p>
                                                )}
                                            </div>

                                            {slot.shifts.length > 0 && (
                                                <div className="jd-shifts">
                                                    {slot.shifts.map((sh: any, si: any) => (
                                                        <span key={si} className="jd-shift">
                                                            <strong>{sh.label}</strong>
                                                            {(sh.startTime || sh.endTime) &&
                                                                ` · ${sh.startTime ?? ''}–${sh.endTime ?? ''}`}
                                                            {sh.days && sh.days.length > 0 &&
                                                                ` · ${sh.days.join(', ')}`}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Sidebar ──────────────────────────────── */}
                    <aside className="jd-sidebar">
                        <div className="jd-facts">
                            <div className="jd-fact">
                                <span className="jd-fact__label">Job ID</span>
                                <span className="jd-fact__value">{job.jobId}</span>
                            </div>
                            <div className="jd-fact">
                                <span className="jd-fact__label">Company</span>
                                <span className="jd-fact__value">{job.companyName}</span>
                            </div>
                            <div className="jd-fact">
                                <span className="jd-fact__label">Job Type</span>
                                <span className="jd-fact__value">{job.jobType}</span>
                            </div>
                            <div className="jd-fact">
                                <span className="jd-fact__label">Work Mode</span>
                                <span className="jd-fact__value">{job.jobMode}</span>
                            </div>
                            {(payMin > 0 || payMax > 0) && (
                                <div className="jd-fact">
                                    <span className="jd-fact__label">Pay Rate</span>
                                    <span className="jd-fact__value">
                                        {payMin === payMax || !payMax
                                            ? `${formatPay(payMin)}/hr`
                                            : `${formatPay(payMin)}–${formatPay(payMax)}/hr`}
                                    </span>
                                </div>
                            )}
                            {job.slots.length > 0 && (
                                <div className="jd-fact">
                                    <span className="jd-fact__label">Locations</span>
                                    <span className="jd-fact__value">{job.slots.length}</span>
                                </div>
                            )}
                            <div className="jd-fact">
                                <span className="jd-fact__label">Posted</span>
                                <span className="jd-fact__value">{formatDate(job.createdAt)}</span>
                            </div>
                        </div>

                        {applyHref && (
                            <a href={applyHref} className="jd-apply-btn">
                                Apply Now
                            </a>
                        )}

                        <Link href="/jobs" className="jd-back">
                            ← Back to all listings
                        </Link>
                    </aside>
                </div>
            </div>
        </section>
    );
}