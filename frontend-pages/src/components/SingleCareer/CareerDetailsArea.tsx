// src/components/jobs/JobDetailsArea.tsx
'use client'
import RightArrawWhitIcon from '@/svg/RightArrawWhitIcon';
import type { JobDetailItem } from '@/app/actions/jobListAction';
import { useEffect, useState } from 'react';
import { FaLinkedinIn, FaFacebookF, FaXTwitter } from 'react-icons/fa6';
import { FiMail, FiLink2 } from 'react-icons/fi';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function formatPay(pay: number): string {
  if (!pay) return 'Salary not listed';
  return `$${pay.toLocaleString('en-CA')}/hour`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface Props {
  job: JobDetailItem;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function JobDetailsArea({ job }: Props) {

  const site = `${process.env.NEXT_PUBLIC_SITE_ID}`;

  const primarySlot = job.slots[0];

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', cv: null as File | null, consent: false });
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // ── Share this job ──
  const [pageUrl, setPageUrl] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { setPageUrl(window.location.href); }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable — silently ignore, link is still shareable manually
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus('idle');

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('jobId', job.jobId);
      data.append('jobTitle', job.title);
      data.append('siteId', site);
      data.append('applyEmail', job.applyEmail);
      if (formData.cv) data.append('resume', formData.cv);
      data.append('consent', formData.consent ? 'true' : 'false');

      const res = await fetch('/api/job-apply', {
        method: 'POST',
        body: data,
      });

      if (!res.ok) throw new Error('Failed to submit');

      setSubmitStatus('success');
      setFormData({ name: '', email: '', cv: null, consent: false });
      setTimeout(() => {
        setShowApplyModal(false);
        setSubmitStatus('idle');
      }, 1800);
    } catch (err) {
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };


  // ── Ensure every <li> inside a <ul> has a visible marker, and that
  // TinyMCE's habit of wrapping list-item text in <p>...</p> doesn't push
  // the text away from its own marker (browser default paragraph margins).
  // The marker itself is a small check-circle, matching the static
  // Responsibilities/Benefits lists elsewhere on this page — both are
  // baked into the HTML/CSS here rather than depending on external CSS.
  function addManualBulletsToLists(html: string): string {
    if (!html) return html;

    return html.replace(/<ul([^>]*)>([\s\S]*?)<\/ul>/gi, (_match, ulAttrs, inner) => {
      // 1. Zero out top/bottom margin on any <p> wrapping list-item text.
      let processed = inner.replace(/<p([^>]*)>/gi, (_m: string, pAttrs: string) => {
        const styleMatch = pAttrs.match(/style\s*=\s*"([^"]*)"/i);
        if (styleMatch) {
          const cleaned = styleMatch[1].replace(/margin[^;]*;?/gi, '').trim();
          const newStyle = `${cleaned}${cleaned ? '; ' : ''}margin:0`;
          return `<p${pAttrs.replace(/style\s*=\s*"([^"]*)"/i, `style="${newStyle}"`)}>`;
        }
        return `<p${pAttrs} style="margin:0">`;
      });

      // 2. Swap the default marker for a small accent check-circle, and lay
      //    the marker + text out on one line via inline flex.
      processed = processed.replace(
        /<li([^>]*)>(?!\s*<span class="lmx-li-check")/gi,
        (_m: string, liAttrs: string) => {
          const styleMatch = liAttrs.match(/style\s*=\s*"([^"]*)"/i);
          const spacingStyle = 'margin-bottom:10px; display:flex; align-items:flex-start; gap:10px; list-style:none';
          const newLiAttrs = styleMatch
            ? liAttrs.replace(
              /style\s*=\s*"([^"]*)"/i,
              `style="${styleMatch[1].replace(/;$/, '')}; ${spacingStyle}"`
            )
            : `${liAttrs} style="${spacingStyle}"`;
          // const checkSpan = '<span class="lmx-li-check" style="flex-shrink:0;width:18px;height:18px;border-radius:50%;background:color-mix(in srgb, var(--accent-color) 12%, #fff);color:var(--accent-color);font-size:10px;font-weight:800;line-height:18px;text-align:center;margin-top:2px">&#10003;</span>';
          const checkSpan = "";
          return `<li${newLiAttrs}>${checkSpan}<span>`;
        }
      );

      // Close the extra <span> we opened before each </li>
      processed = processed.replace(/<\/li>/gi, '</span></li>');

      return `<ul${ulAttrs} style="list-style:none;margin:0;padding:0">${processed}</ul>`;
    });
  }

  return (
    <>
      <section className="lmx-job-detail-section luminix-padding-section light-bg1">
        <div className="container">
          <div className="lmx-job-detail-inner">

            {/* ── Main content ────────────────────────────────── */}
            <main className="lmx-job-detail-main" data-aos="fade-up" data-aos-duration="600">

              {/* Hero banner */}
              <div className="lmx-job-hero">
                <p className="lmx-job-hero__id">{job.jobId}</p>

                <div className="lmx-job-hero__company">
                  <span className="lmx-job-hero__company-tag">Company</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
                  </svg>
                  <span>{job.companyName}</span>
                </div>

                <h1 className="lmx-job-hero__title" style={{ textTransform: "capitalize", letterSpacing: "1px" }}>
                  {job.title}
                </h1>
                <div className="lmx-job-hero__badges">
                  <span className="lmx-job-hero__mode-badge">
                    {job.jobMode}
                  </span>
                  <span className="lmx-job-hero__badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
                    {job.jobType}
                  </span>
                  {job.slots.length > 0 && (
                    <span className="lmx-job-hero__badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      {job.slots[0].city}, {job.slots[0].province}
                      {job.slots.length > 1 && ` +${job.slots.length - 1} more`}
                    </span>
                  )}
                  {primarySlot?.jobPay > 0 && (
                    <span className="lmx-job-hero__badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                      {formatPay(primarySlot.jobPay)}
                    </span>
                  )}
                  <span className="lmx-job-hero__badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Posted {formatDate(job.createdAt)}
                  </span>
                </div>
              </div>

              {/* ── Everything below lives inside one content card, with each
                   section using the same icon + heading pattern ── */}
              <div className="lmx-content-card">

                {/* Description */}
                <div className="lmx-job-section">
                  <h3>
                    <span className="section-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg>
                    </span>
                    About the Role
                  </h3>
                  <p>{job.description}</p>
                </div>

                {/* Overview */}
                <div className="lmx-job-section">
                  <h3>
                    <span className="section-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                    </span>
                    Overview
                  </h3>
                  <div
                    className="lmx-rich-content"
                    dangerouslySetInnerHTML={{ __html: addManualBulletsToLists(job.overview) }}
                  />
                </div>

                {/* Responsibilities / Benefits — two clearly separated panels */}
                {(job.highlights.length > 0 || job.benefits.length > 0) && (
                  <div className="lmx-info-columns lmx-job-section" data-aos="fade-up" data-aos-duration="700">
                    {job.highlights.length > 0 && (
                      <div className="lmx-info-panel">
                        <div className="lmx-job-section">
                          <h3>
                            <span className="section-icon">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                            </span>
                            Responsibilities
                          </h3>
                          <ul>
                            {job.highlights.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}

                    {job.benefits.length > 0 && (
                      <div className="lmx-info-panel">
                        <div className="lmx-job-section">
                          <h3>
                            <span className="section-icon">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                            </span>
                            Benefits
                          </h3>
                          <ul>
                            {job.benefits.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Locations / Slots */}
                {job.slots.length > 0 && (
                  <div className="lmx-job-section" data-aos="fade-up" data-aos-duration="800">
                    <h3>
                      <span className="section-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      </span>
                      Locations & Shifts
                    </h3>
                    <div className="lmx-slots-grid">
                      {job.slots.map(slot => (
                        <div key={slot._id} className="lmx-slot-card">
                          <div className="lmx-slot-card__media" aria-hidden="true">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 21h18M5 21V7l8-4v18M13 21V11l6 3v7" /></svg>
                          </div>

                          <div className="lmx-slot-card__info">
                            <p className="lmx-slot-card__city">{slot.city}</p>
                            <p className="lmx-slot-card__province">{slot.province}</p>
                            <div className="lmx-slot-card__row">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                              <span className="lmx-slot-card__pay">{formatPay(slot.jobPay)}</span>
                            </div>
                            {slot.jobVacancy && (
                              <div className="lmx-slot-card__row">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                <span>{slot.jobVacancy} opening{slot.jobVacancy !== '1' ? 's' : ''}</span>
                              </div>
                            )}
                            {slot.jobStartingTime && (
                              <div className="lmx-slot-card__row">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                <span>Starts: {slot.jobStartingTime}</span>
                              </div>
                            )}
                          </div>

                          {slot.shifts.length > 0 && (
                            <div className="lmx-slot-card__hours">
                              <div className="lmx-slot-card__hours-title">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                Business Hours
                              </div>
                              {slot.shifts.map((sh, si) => (
                                <div key={si} className="lmx-slot-card__shift">
                                  <strong>{sh.label}</strong>
                                  {(sh.startTime || sh.endTime) && (
                                    <span>{sh.startTime} – {sh.endTime}</span>
                                  )}
                                  {sh.days && sh.days.length > 0 && (
                                    <span className="lmx-slot-card__shift-days">
                                      {sh.days.join(', ')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categories */}
                {job.categories.length > 0 && (
                  <div className="lmx-job-section" data-aos="fade-up" data-aos-duration="850">
                    <h3>
                      <span className="section-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                      </span>
                      Job Categories
                    </h3>
                    <div className="lmx-detail-cats">
                      {job.categories.map(cat => (
                        <span key={cat} className="lmx-detail-cat">{cat}</span>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </main>

            {/* ── Sidebar ──────────────────────────────────────── */}
            <aside className="lmx-job-detail-sidebar" data-aos="fade-left" data-aos-duration="700">

              {/* Info card */}
              <div className="lmx-sidebar-info-card">
                <h5>
                  <span className="section-icon section-icon--sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  </span>
                  Job Overview
                </h5>

                <ul className="lmx-sidebar-info-list">
                  <li>
                    <span className="info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </span>
                    <span>
                      <span className="info-label">Job Id</span>
                      <strong className='job-id'>{job.jobId}</strong>
                    </span>
                  </li>
                  <li>
                    <span className="info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" /></svg>
                    </span>
                    <span>
                      <span className="info-label">Company Name</span>
                      <strong>
                        {job.companyName}
                      </strong>
                    </span>
                  </li>
                  <li>
                    <span className="info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    </span>
                    <span>
                      <span className="info-label">Location</span>
                      <strong>
                        {primarySlot
                          ? `${primarySlot.city}, ${primarySlot.province}`
                          : 'See details'}
                        {job.slots.length > 1 && ` +${job.slots.length - 1}`}
                      </strong>
                    </span>
                  </li>
                  <li>
                    <span className="info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    </span>
                    <span>
                      <span className="info-label">Pay Rate</span>
                      <strong>{primarySlot ? formatPay(primarySlot.jobPay) : 'Negotiable'}</strong>
                    </span>
                  </li>
                  <li>
                    <span className="info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
                    </span>
                    <span>
                      <span className="info-label">Work Mode</span>
                      <strong>{job.jobType}</strong>
                    </span>
                  </li>
                  <li>
                    <span className="info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
                    </span>
                    <span>
                      <span className="info-label">Job Type</span>
                      <strong>{job.jobMode}</strong>
                    </span>
                  </li>
                  {primarySlot?.jobVacancy && (
                    <li>
                      <span className="info-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                      </span>
                      <span>
                        <span className="info-label">Openings</span>
                        <strong>{primarySlot.jobVacancy}</strong>
                      </span>
                    </li>
                  )}
                  <li>
                    <span className="info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    </span>
                    <span>
                      <span className="info-label">Date Posted</span>
                      <strong>{formatDate(job.createdAt)}</strong>
                    </span>
                  </li>
                  <li>
                    <span className="info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z" opacity="0" /><path d="M22 6l-10 7L2 6" /><rect x="2" y="4" width="20" height="16" rx="2" /></svg>
                    </span>
                    <span className="lmx-info-value--wrap">
                      <span className="info-label">Apply At</span>
                      <strong>{job.applyEmail}</strong>
                    </span>
                  </li>
                </ul>

                <button
                  onClick={() => setShowApplyModal(true)}
                  className="lmx-apply-btn"
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  Apply Now
                  <RightArrawWhitIcon />
                </button>
              </div>

              {/* Share card */}
              <div className="lmx-share-card">
                <p className="lmx-share-card__title">
                  <span className="info-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                  </span>
                  Share this job
                </p>
                <div className="lmx-share-icons">
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share on LinkedIn"
                  >
                    <FaLinkedinIn size={13} />
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share on Facebook"
                  >
                    <FaFacebookF size={13} />
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(job.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share on X"
                  >
                    <FaXTwitter size={13} />
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(job.title)}&body=${encodeURIComponent(pageUrl)}`}
                    aria-label="Share via email"
                  >
                    <FiMail size={14} />
                  </a>
                  <button type="button" onClick={handleCopyLink} aria-label="Copy link">
                    <FiLink2 size={14} />
                  </button>
                </div>
                {copied && <span className="lmx-share-copied">Link copied!</span>}
              </div>
            </aside>
          </div>
        </div>
      </section>
      {/* ── Apply Modal ── */}
      {showApplyModal && (
        <div className="lmx-modal-overlay" onClick={() => !submitting && setShowApplyModal(false)}>
          <div className="lmx-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="lmx-modal-close"
              onClick={() => setShowApplyModal(false)}
              disabled={submitting}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>

            <h3 className="lmx-modal-title">Apply for this job</h3>
            <p className="lmx-modal-subtitle">{job.title}</p>

            {submitStatus === 'success' ? (
              <div className="lmx-modal-success">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                <p>Application submitted successfully!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="lmx-modal-form">
                <div className="lmx-form-group">
                  <label htmlFor="apply-name">Full Name</label>
                  <input
                    id="apply-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>

                <div className="lmx-form-group">
                  <label htmlFor="apply-email">Email Address</label>
                  <input
                    id="apply-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                    placeholder="john@example.com"
                  />
                </div>

                <div className="lmx-form-group">
                  <label htmlFor="apply-cv">Upload CV / Resume</label>
                  <input
                    id="apply-cv"
                    type="file"
                    required
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFormData(f => ({ ...f, cv: e.target.files?.[0] ?? null }))}
                  />
                  <span className="lmx-form-hint">PDF, DOC, or DOCX (max 5MB)</span>
                </div>

                <div className="lmx-form-consent">
                  <input
                    id="apply-consent"
                    type="checkbox"
                    required
                    checked={formData.consent}
                    onChange={(e) => setFormData(f => ({ ...f, consent: e.target.checked }))}
                  />
                  <label htmlFor="apply-consent">
                    I agree to the storage of my data and to receive notifications about new jobs and blog posts.
                  </label>
                </div>

                {submitStatus === 'error' && (
                  <p className="lmx-form-error">Something went wrong. Please try again.</p>
                )}

                <button type="submit" className="lmx-apply-btn" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                  {!submitting && <RightArrawWhitIcon />}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        /* ── Layout ── */
        .lmx-job-detail-inner {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 28px;
          align-items: start;
        }
        @media (max-width: 991px) {
          .lmx-job-detail-inner { grid-template-columns: 1fr; }
        }

        /* ── Hero ── */
        .lmx-job-hero {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, var(--accent-color), var(--accent-bg));
          border-radius: 18px;
          padding: 30px 34px 34px;
          color: #fff;
          margin-bottom: 20px;
        }
        .lmx-job-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          // background-image: repeating-linear-gradient(120deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 40px);
          pointer-events: none;
        }
        .lmx-job-hero > * { position: relative; z-index: 1; }

        .lmx-job-hero__id {
          display: inline-block;
          background: rgba(255,255,255,0.16);
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.03em;
          margin: 0 0 16px;
        }
        .lmx-job-hero__company {
          display: flex;
          width: fit-content;
          align-items: center;
          gap: 8px;
          // background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.25);
          padding: 6px 14px 6px 6px;
          border-radius: 100px;
          font-size: 12.5px;
          font-weight: 400;
          margin: 0 0 18px;
        }
        .lmx-job-hero__company-tag {
          background: rgba(255,255,255,0.9);
          color: var(--accent-color);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 3px 9px;
          border-radius: 100px;
        }
        .lmx-job-hero__title {
          font-size: 28px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 18px;
          line-height: 1.3;
        }
        .lmx-job-hero__badges {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .lmx-job-hero__mode-badge {
          background: #fff;
          color: var(--accent-color);
          font-weight: 800;
          font-size: 11.5px;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 7px 16px;
          border-radius: 100px;
        }
        .lmx-job-hero__badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.25);
          color: #fff;
          font-size: 12.5px;
          font-weight: 400;
          padding: 7px 15px;
          border-radius: 100px;
        }
        @media (max-width: 575px) {
          .lmx-job-hero { padding: 24px 20px 26px; }
          .lmx-job-hero__title { font-size: 21px; }
        }

        /* ── Content card + shared section pattern ── */
        .lmx-content-card {
          background: #fff;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 18px;
          padding: 30px 32px;
        }
        @media (max-width: 575px) {
          .lmx-content-card { padding: 22px 18px; }
        }
        .lmx-job-section { margin-bottom: 30px; }
        .lmx-job-section:last-child { margin-bottom: 0; }
        .lmx-job-section h3 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 17.5px;
          font-weight: 800;
          color: var(--heading-color);
          margin: 0 0 16px;
        }
        .section-icon {
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--accent-bg);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .section-icon--sm { width: 26px; height: 26px; }
        .lmx-job-section p {
          font-size: 13.5px;
          line-height: 1.75;
          color: #475569;
          margin: 0 0 10px;
        }
        .lmx-job-section p:last-child { margin-bottom: 0; }

        .lmx-job-section ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 11px;
        }
        .lmx-job-section ul li {
          position: relative;
          padding-left: 28px;
          font-size: 13.5px;
          line-height: 1.6;
          color: #475569;
        }
        .lmx-job-section ul li::before {
          content: '\\2713';
          position: absolute;
          left: 0;
          top: 1px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--accent-color) 12%, #fff);
          color: var(--accent-color);
          font-size: 10px;
          font-weight: 800;
          line-height: 18px;
          text-align: center;
        }
        .lmx-rich-content { font-size: 13.5px; line-height: 1.75; color: #475569; }
        .lmx-rich-content p { margin: 0 0 12px; }

        /* ── Responsibilities / Benefits panels ── */
        .lmx-info-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 767px) {
          .lmx-info-columns { grid-template-columns: 1fr; }
        }
        .lmx-info-panel {
          background: #f8fafc;
          border: 1px solid rgba(15,23,42,0.05);
          border-radius: 14px;
          padding: 22px 24px;
        }
        .lmx-info-panel .lmx-job-section { margin-bottom: 0; }

        /* ── Locations & shifts ── */
        .lmx-slots-grid { display: flex; flex-direction: column; gap: 14px;
        //  width:fit-content;
          }
        .lmx-slot-card {
          display: flex;
          gap: 18px;
          background: #f8fafc;
          border: 1px solid rgba(15,23,42,0.05);
          border-radius: 14px;
          padding: 16px;
          flex-wrap: wrap;
        }
        .lmx-slot-card__media {
          flex-shrink: 0;
          width: 96px;
          height: 88px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--accent-color), var(--accent-bg));
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lmx-slot-card__info { flex: 1; min-width: 160px; }
        .lmx-slot-card__city { font-size: 14.5px; font-weight: 700; color: var(--heading-color); margin: 0; }
        .lmx-slot-card__province { font-size: 12px; color: #94a3b8; margin: 0 0 9px; }
        .lmx-slot-card__row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          color: #64748b;
          margin-bottom: 5px;
        }
        .lmx-slot-card__pay { color: var(--accent-color); font-weight: 700; }
        .lmx-slot-card__hours {
          background: #fff;
          border: 1px solid rgba(15,23,42,0.08);
          border-radius: 10px;
          padding: 12px 16px;
          min-width: 190px;
        }
        .lmx-slot-card__hours-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: var(--heading-color);
          margin-bottom: 8px;
        }
        .lmx-slot-card__shift {
          display: flex;
          flex-direction: column;
          font-size: 12px;
          color: #475569;
          margin-bottom: 4px;
        }
        .lmx-slot-card__shift strong { font-size: 12.5px; color: var(--heading-color); }
        .lmx-slot-card__shift-days { color: #94a3b8; font-size: 11.5px; margin-top: 1px; }

        /* ── Categories ── */
        .lmx-detail-cats { display: flex; flex-wrap: wrap; gap: 8px; }
        .lmx-detail-cat {
          background: color-mix(in srgb, var(--accent-color) 10%, #fff);
          color: var(--accent-color);
          font-size: 12px;
          font-weight: 400;
          padding: 6px 14px;
          border-radius: 100px;
        }

        /* ── Sidebar ── */
        .lmx-job-detail-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: sticky;
          top: 100px;
        }
        .lmx-sidebar-info-card {
          background: #fff;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 18px;
          padding: 24px 22px 22px;
        }
        .lmx-sidebar-info-card h5 {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15.5px;
          font-weight: 800;
          color: var(--heading-color);
          margin: 0 0 18px;
        }
        .lmx-sidebar-info-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .lmx-sidebar-info-list li {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(15,23,42,0.05);
        }
        .lmx-sidebar-info-list li:first-child { padding-top: 0; }
        .lmx-sidebar-info-list li:last-child { border-bottom: none; padding-bottom: 0; }
        .info-icon {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: color-mix(in srgb, var(--accent-color) 10%, #fff);
          color: var(--accent-color);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .info-label {
          display: block;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 3px;
        }
        .lmx-sidebar-info-list strong {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--heading-color);
        }
        .lmx-info-value--wrap { min-width: 0; overflow-wrap: anywhere; }
        .job-id { color: var(--accent-color); }

        .lmx-apply-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--accent-bg);
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 13px;
          border-radius: 10px;
          margin-top: 18px;
          transition: opacity .2s;
        }
        .lmx-apply-btn:hover { opacity: .92; }
        .lmx-apply-btn:disabled { opacity: .6; cursor: not-allowed; }

        /* ── Share card ── */
        .lmx-share-card {
          background: #fff;
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 18px;
          padding: 20px 22px;
        }
        .lmx-share-card__title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 700;
          color: var(--heading-color);
          margin: 0 0 14px;
        }
        .lmx-share-icons { display: flex; gap: 10px; }
        .lmx-share-icons a,
        .lmx-share-icons button {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--accent-color) 8%, #fff);
          color: var(--accent-color);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background .15s, color .15s;
        }
        .lmx-share-icons a:hover,
        .lmx-share-icons button:hover {
          background: var(--accent-bg);
          color: #fff;
        }
        .lmx-share-copied {
          display: block;
          margin-top: 10px;
          font-size: 11.5px;
          font-weight: 400;
          color: var(--accent-color);
        }

        /* ── Apply modal ── */
        .lmx-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }
        .lmx-modal {
          position: relative;
          background: #fff;
          border-radius: 18px;
          padding: 34px;
          max-width: 440px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .lmx-modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f1f5f9;
          color: #64748b;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .lmx-modal-close:hover { background: #e2e8f0; }
        .lmx-modal-title { font-size: 19px; font-weight: 800; color: var(--heading-color); margin: 0 0 4px; }
        .lmx-modal-subtitle { font-size: 13px; color: #64748b; margin: 0 0 24px; }
        .lmx-modal-form { display: flex; flex-direction: column; gap: 16px; }
        .lmx-form-group { display: flex; flex-direction: column; gap: 6px; }
        .lmx-form-group label {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--heading-color);
        }
        .lmx-form-group input {
          height: 42px;
          border: 1px solid rgba(15,23,42,0.12);
          border-radius: 8px;
          padding: 0 12px;
          font-size: 13.5px;
        }
        .lmx-form-group input[type="file"] { height: auto; padding: 9px 12px; }
        .lmx-form-hint { display: block; font-size: 11px; color: #94a3b8; margin-top: 4px; }
        .lmx-form-consent {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .lmx-form-consent input {
          width: 18px;
          height: 18px;
          margin-top: 1px;
          flex-shrink: 0;
          accent-color: var(--accent-color);
        }
        .lmx-form-consent label { font-size: 13px; color: #475569; line-height: 1.5; }
        .lmx-form-error { font-size: 12.5px; color: #dc2626; margin: 0; }
        .lmx-modal-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 28px 0 8px;
          text-align: center;
        }
        .lmx-modal-success p { font-size: 14px; font-weight: 400; color: var(--heading-color); margin: 0; }
      `}</style>
    </>
  );
}