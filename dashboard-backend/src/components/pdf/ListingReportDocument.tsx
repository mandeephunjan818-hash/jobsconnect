/**
 * src/components/pdf/ListingReportDocument.tsx
 *
 * Updated: Generates a set of pages per site with different color themes.
 */

import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
} from '@react-pdf/renderer';

// ── Site constants (mirrors the API route) ─────────────────
const SITE_LABELS: Record<string, string> = {
    'jobs-connect.vercel.app': 'Jobs Connect',
    'new-jobs-fawn.vercel.app': 'New in Canada Jobs',
    'jobsrefugee.ca': 'Jobs for Refugees',
    'vulnerableyouthsjobs.ca': 'Vulnerable Youths Jobs',
    'accesscareers.ca': 'Access Careers',
    'indigenouspeoplesjobs.ca': 'Indigenous Peoples Jobs',
};

const SITE_ID_PREFIXES: Record<string, string> = {
    'jobs-connect.vercel.app': 'JC',
    'new-jobs-fawn.vercel.app': 'NIC',
    'jobsrefugee.ca': 'REF',
    'vulnerableyouthsjobs.ca': 'VYJ',
    'accesscareers.ca': 'AC',
    'indigenouspeoplesjobs.ca': 'IPJ',
};

function deriveJobId(jobId: string | null | undefined, site: string): string {
    if (!jobId) return '—';
    const parts = jobId.split('-');
    if (parts.length !== 3) return jobId;
    const prefix = SITE_ID_PREFIXES[site] ?? parts[0];
    return `${prefix}-${parts[1]}-${parts[2]}`;
}

// ── Color themes per site ─────────────────────────────────
const SITE_COLORS: Record<string, { headerBg: string; accent: string; primary: string; accentBg: string }> = {
    'jobs-connect.vercel.app': { headerBg: '#0f172a', accent: '#2563eb', primary: '#1a3d8f', accentBg: '#eff6ff' },
    'new-jobs-fawn.vercel.app': { headerBg: '#1e3a8a', accent: '#f59e0b', primary: '#1e40af', accentBg: '#fef3c7' },
    'jobsrefugee.ca': { headerBg: '#065f46', accent: '#22c55e', primary: '#065f46', accentBg: '#d1fae5' },
    'vulnerableyouthsjobs.ca': { headerBg: '#7e22ce', accent: '#a855f7', primary: '#7e22ce', accentBg: '#f3e8ff' },
    'accesscareers.ca': { headerBg: '#b45309', accent: '#d97706', primary: '#b45309', accentBg: '#fef3c7' },
    'indigenouspeoplesjobs.ca': { headerBg: '#be123c', accent: '#e11d48', primary: '#be123c', accentBg: '#ffe4e6' },
};

const DEFAULT_COLORS = SITE_COLORS['jobs-connect.vercel.app'];

// ── Base color constants (not site‑dependent) ─────────────
const BASE = {
    success: '#065f46',
    successBg: '#d1fae5',
    warn: '#92400e',
    warnBg: '#fef3c7',
    muted: '#64748b',
    mutedBg: '#f1f5f9',
    mutedBdr: '#e2e8f0',
    text: '#0f172a',
    textSub: '#334155',
    border: '#e2e8f0',
    white: '#ffffff',
    pageBg: '#f8fafc',
};

// ── Dynamic style factory ─────────────────────────────────
function makeStyles(c: typeof DEFAULT_COLORS) {
    return {
        page: {
            backgroundColor: BASE.white,
            fontFamily: 'Helvetica',
            fontSize: 9,
            color: BASE.text,
            paddingTop: 0,
            paddingBottom: 48,
            paddingHorizontal: 0,
        },

        // Header
        header: {
            backgroundColor: c.headerBg,
            paddingHorizontal: 36,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        headerLeft: {
            flexDirection: 'column',
            gap: 2,
        },
        headerSiteName: {
            fontSize: 13,
            fontFamily: 'Helvetica-Bold',
            color: BASE.white,
            letterSpacing: 0.3,
        },
        headerSiteUrl: {
            fontSize: 7.5,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: 0.2,
        },
        headerRight: {
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 2,
        },
        headerLabel: {
            fontSize: 7,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        headerJobId: {
            fontSize: 9,
            fontFamily: 'Helvetica-Bold',
            color: c.accent, // now site‑accent
            letterSpacing: 0.4,
        },
        headerDate: {
            fontSize: 7.5,
            color: 'rgba(255,255,255,0.55)',
        },

        // Footer
        footer: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderTopWidth: 1,
            borderTopColor: BASE.border,
            backgroundColor: BASE.pageBg,
            paddingHorizontal: 36,
            paddingVertical: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        footerLeft: {
            fontSize: 7,
            color: BASE.muted,
        },
        footerRight: {
            fontSize: 7,
            color: BASE.muted,
        },

        // Body container
        body: {
            paddingHorizontal: 36,
            paddingTop: 24,
        },

        // Title block
        titleBlock: {
            marginBottom: 18,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: BASE.border,
        },
        listingTitle: {
            fontSize: 18,
            fontFamily: 'Helvetica-Bold',
            color: c.primary,
            marginBottom: 4,
            lineHeight: 1.25,
        },
        companyName: {
            fontSize: 11,
            color: BASE.textSub,
            marginBottom: 8,
        },
        statusRow: {
            flexDirection: 'row',
            gap: 6,
            flexWrap: 'wrap',
        },
        pill: {
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 20,
            fontSize: 7.5,
            fontFamily: 'Helvetica-Bold',
        },
        pillBlue: {
            backgroundColor: c.accentBg,
            color: c.accent,
        },
        pillGreen: {
            backgroundColor: BASE.successBg,
            color: BASE.success,
        },
        pillAmber: {
            backgroundColor: BASE.warnBg,
            color: BASE.warn,
        },
        pillGray: {
            backgroundColor: BASE.mutedBg,
            color: BASE.muted,
        },

        // Section heading
        sectionHeading: {
            fontSize: 9,
            fontFamily: 'Helvetica-Bold',
            color: BASE.muted,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            marginBottom: 6,
            marginTop: 14,
            paddingBottom: 3,
            borderBottomWidth: 0.5,
            borderBottomColor: BASE.border,
        },

        // Meta grid
        metaGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 6,
        },
        metaCell: {
            width: '31%',
            backgroundColor: BASE.pageBg,
            borderWidth: 0.5,
            borderColor: BASE.border,
            borderRadius: 5,
            padding: 7,
        },
        metaLabel: {
            fontSize: 6.5,
            color: BASE.muted,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 2,
        },
        metaValue: {
            fontSize: 8.5,
            fontFamily: 'Helvetica-Bold',
            color: BASE.text,
        },

        // Prose text
        prose: {
            fontSize: 8.5,
            color: BASE.textSub,
            lineHeight: 1.6,
            marginBottom: 4,
        },

        // Bullet list
        bulletRow: {
            flexDirection: 'row',
            gap: 5,
            marginBottom: 3,
        },
        bulletDot: {
            fontSize: 8,
            color: c.accent,
            marginTop: 0.5,
        },
        bulletText: {
            fontSize: 8.5,
            color: BASE.textSub,
            lineHeight: 1.5,
            flex: 1,
        },

        // Slot card
        slotCard: {
            borderWidth: 1,
            borderColor: BASE.border,
            borderRadius: 6,
            padding: 10,
            marginBottom: 8,
            backgroundColor: BASE.pageBg,
        },
        slotHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 6,
        },
        slotTitle: {
            fontSize: 9,
            fontFamily: 'Helvetica-Bold',
            color: BASE.text,
        },
        slotGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 5,
        },
        slotCell: {
            width: '30%',
            backgroundColor: BASE.white,
            borderWidth: 0.5,
            borderColor: BASE.mutedBdr,
            borderRadius: 4,
            padding: 5,
        },
        slotCellLabel: {
            fontSize: 6,
            color: BASE.muted,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            marginBottom: 1.5,
        },
        slotCellValue: {
            fontSize: 8,
            fontFamily: 'Helvetica-Bold',
            color: BASE.text,
        },

        // Shift row
        shiftRow: {
            flexDirection: 'row',
            gap: 6,
            alignItems: 'center',
            marginTop: 4,
            paddingTop: 4,
            borderTopWidth: 0.5,
            borderTopColor: BASE.border,
        },
        shiftLabel: {
            fontSize: 7.5,
            fontFamily: 'Helvetica-Bold',
            color: BASE.text,
            minWidth: 60,
        },
        shiftTime: {
            fontSize: 7.5,
            color: BASE.muted,
            minWidth: 60,
        },
        shiftDayPill: {
            backgroundColor: c.accentBg,
            color: c.accent,
            fontSize: 6.5,
            fontFamily: 'Helvetica-Bold',
            paddingHorizontal: 4,
            paddingVertical: 1.5,
            borderRadius: 3,
        },

        // Site window card
        windowCard: {
            borderWidth: 1,
            borderColor: c.accentBg,
            borderRadius: 6,
            backgroundColor: c.accentBg,
            padding: 10,
            marginBottom: 6,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
        },
        windowLeft: {
            flexDirection: 'column',
            gap: 3,
        },
        windowSiteName: {
            fontSize: 9.5,
            fontFamily: 'Helvetica-Bold',
            color: c.primary,
        },
        windowJobId: {
            fontSize: 7.5,
            color: BASE.muted,
            fontFamily: 'Helvetica',
        },
        windowRight: {
            alignItems: 'flex-end',
            gap: 3,
        },
        windowRange: {
            fontSize: 8.5,
            fontFamily: 'Helvetica-Bold',
            color: BASE.text,
        },
        windowDuration: {
            fontSize: 7.5,
            color: c.accent,
        },
        windowStatusDot: {
            width: 7,
            height: 7,
            borderRadius: 3.5,
        },
    };
}

// ── Types (unchanged) ─────────────────────────────────────
interface ShiftData {
    label: string;
    startTime: string | null;
    endTime: string | null;
    days: string[];
}

interface SlotData {
    location: string;
    city: string;
    province: string;
    jobPay: number;
    jobVacancy: string | null;
    jobStartingTime: string | null;
    isActive: boolean;
    shifts: ShiftData[];
}

interface WindowData {
    site: string;
    siteLabel: string;
    derivedJobId: string;
    startAt: string;
    endAt: string;
    durationDays: number;
}

interface ReportData {
    jobId: string | null;
    title: string;
    companyName: string;
    status: string;
    table: string;
    overview: string;
    description: string;
    applyEmail: string;
    jobMode: string;
    jobType: string;
    jobBankId: string;
    categories: string[];
    highlights: string[];
    benefits: string[];
    slots: SlotData[];
    siteWindows: WindowData[];
    visibleOnSites: string[];
    siteContext: { slug: string; label: string };
    createdAt: string;
    updatedAt: string;
    generatedAt: string;
}

// ── Helpers (unchanged) ──────────────────────────────────
function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('en-CA', {
            year: 'numeric', month: 'short', day: 'numeric', ...opts,
        });
    } catch { return iso; }
}

function fmtDateTime(iso: string): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('en-CA', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return iso; }
}

function fmtPay(amount: number | undefined | null): string {
    if (amount == null || isNaN(amount)) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD', maximumFractionDigits: 0,
    }).format(amount);
}

function windowStatus(startAt: string, endAt: string): 'live' | 'upcoming' | 'ended' {
    const now = Date.now();
    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();
    if (now >= start && now <= end) return 'live';
    if (now < start) return 'upcoming';
    return 'ended';
}

// ── Reusable body component (rendered once per site) ─────
function ReportBody({ data, styles, derivedId }: { data: ReportData; styles: ReturnType<typeof makeStyles>; derivedId: string; }) {
    const statusPillStyle =
        data.status === 'Active' || data.status === 'active' || data.status === 'approved'
            ? styles.pillGreen
            : data.status === 'scheduled'
                ? styles.pillBlue
                : data.status === 'rejected' || data.status === 'Inactive'
                    ? styles.pillAmber
                    : styles.pillGray;

    return (
        <View style={styles.body}>
            {/* Title block */}
            <View style={styles.titleBlock}>
                <Text style={styles.listingTitle}>{data.title}</Text>
                {data.companyName && <Text style={styles.companyName}>{data.companyName}</Text>}
                <View style={styles.statusRow as any}>
                    <Text style={[styles.pill, statusPillStyle]}>{data.status}</Text>
                    {data.jobMode && <Text style={[styles.pill, styles.pillGray]}>{data.jobMode}</Text>}
                    {data.jobType && <Text style={[styles.pill, styles.pillGray]}>{data.jobType}</Text>}
                    {data.categories.map((cat, i) => (
                        <Text key={i} style={[styles.pill, styles.pillBlue]}>{cat}</Text>
                    ))}
                </View>
            </View>

            {/* Meta grid */}
            <Text style={styles.sectionHeading as any}>Listing Details</Text>
            <View style={styles.metaGrid as any}>
                {[
                    { label: 'Job ID', value: derivedId ?? '—' },
                    { label: 'Apply Email', value: data.applyEmail },
                    { label: 'Job Mode', value: data.jobMode },
                    { label: 'Job Type', value: data.jobType || '—' },
                    { label: 'Status', value: data.status },
                    // { label: 'Slug', value: data.slug },
                    { label: 'Submitted', value: fmtDateTime(data.createdAt) },
                    { label: 'Last Updated', value: fmtDateTime(data.updatedAt) },
                ].map((cell, i) => (
                    <View key={i} style={styles.metaCell}>
                        <Text style={styles.metaLabel as any}>{cell.label}</Text>
                        <Text style={styles.metaValue}>{cell.value || '—'}</Text>
                    </View>
                ))}
            </View>

            {/* Overview */}
            {data.overview && (
                <>
                    <Text style={styles.sectionHeading as any}>Overview</Text>
                    <Text style={styles.prose}>{data.overview.replace(/<[^>]*>/g, '')}</Text>
                </>
            )}

            {/* Description */}
            {data.description && (
                <>
                    <Text style={styles.sectionHeading as any}>Short Description</Text>
                    <Text style={styles.prose}>{data.description}</Text>
                </>
            )}

            {/* Highlights */}
            {data.highlights?.length > 0 && (
                <>
                    <Text style={styles.sectionHeading as any}>Highlights</Text>
                    {data.highlights.map((item, i) => (
                        <View key={i} style={styles.bulletRow as any}>
                            <Text style={styles.bulletDot}>•</Text>
                            <Text style={styles.bulletText}>{item}</Text>
                        </View>
                    ))}
                </>
            )}

            {/* Benefits */}
            {data.benefits?.length > 0 && (
                <>
                    <Text style={styles.sectionHeading as any}>Benefits</Text>
                    {data.benefits.map((item, i) => (
                        <View key={i} style={styles.bulletRow as any}>
                            <Text style={styles.bulletDot}>•</Text>
                            <Text style={styles.bulletText}>{item}</Text>
                        </View>
                    ))}
                </>
            )}

            {/* Slots */}
            {data.slots?.length > 0 && (
                <>
                    <Text style={styles.sectionHeading as any}>Locations ({data.slots.length})</Text>
                    {data.slots.map((slot, i) => (
                        <View key={i} style={styles.slotCard}>
                            <View style={styles.slotHeader as any}>
                                <Text style={styles.slotTitle}>Location {i + 1} — {slot.city}, {slot.province}</Text>
                                <View style={[styles.pill, slot.isActive ? styles.pillGreen : styles.pillGray]}>
                                    <Text>{slot.isActive ? 'Active' : 'Inactive'}</Text>
                                </View>
                            </View>
                            <View style={styles.slotGrid as any}>
                                {[
                                    { label: 'Full Location', value: slot.location },
                                    { label: 'City', value: slot.city },
                                    { label: 'Province', value: slot.province },
                                    { label: 'Pay', value: fmtPay(slot.jobPay) },
                                    { label: 'Vacancy', value: slot.jobVacancy ?? '—' },
                                    { label: 'Start Time', value: slot.jobStartingTime ?? '—' },
                                ].map((cell, j) => (
                                    <View key={j} style={styles.slotCell}>
                                        <Text style={styles.slotCellLabel as any}>{cell.label}</Text>
                                        <Text style={styles.slotCellValue}>{cell.value}</Text>
                                    </View>
                                ))}
                            </View>
                            {slot.shifts?.length > 0 && (
                                <View style={{ marginTop: 6 }}>
                                    <Text style={[styles.metaLabel as any, { marginBottom: 3 }]}>Shifts</Text>
                                    {slot.shifts.map((sh, si) => (
                                        <View key={si} style={styles.shiftRow as any}>
                                            <Text style={styles.shiftLabel}>{sh.label}</Text>
                                            {sh.startTime && sh.endTime && (
                                                <Text style={styles.shiftTime}>{sh.startTime} – {sh.endTime}</Text>
                                            )}
                                            <View style={{ flexDirection: 'row', gap: 3, flexWrap: 'wrap' }}>
                                                {(sh.days ?? []).map((d, di) => (
                                                    <Text key={di} style={styles.shiftDayPill}>{d}</Text>
                                                ))}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))}
                </>
            )}

            {/* Site Windows */}
            {/* {data.siteWindows?.length > 0 && (
                <>
                    <Text style={styles.sectionHeading as any}>Site Publishing Windows</Text>
                    {data.siteWindows.map((w, i) => {
                        const status = windowStatus(w.startAt, w.endAt);
                        const dotColor = status === 'live' ? '#22c55e' : status === 'upcoming' ? '#3b82f6' : '#94a3b8';
                        const statusLabel = status === 'live' ? 'Live Now' : status === 'upcoming' ? 'Upcoming' : 'Ended';
                        return (
                            <View key={i} style={styles.windowCard as any}>
                                <View style={styles.windowLeft as any}>
                                    <Text style={styles.windowSiteName}>{w.siteLabel}</Text>
                                    <Text style={styles.windowJobId}>Job ID: {w.derivedJobId}</Text>
                                    <Text style={styles.windowJobId}>{w.site}</Text>
                                </View>
                                <View style={styles.windowRight as any}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <View style={[styles.windowStatusDot, { backgroundColor: dotColor }]} />
                                        <Text style={[styles.pill, { fontSize: 7, paddingHorizontal: 5, paddingVertical: 1.5, backgroundColor: BASE.mutedBg, color: BASE.muted }]}>
                                            {statusLabel}
                                        </Text>
                                    </View>
                                    <Text style={styles.windowRange}>
                                        {fmtDate(w.startAt)} → {fmtDate(w.endAt)}
                                    </Text>
                                    <Text style={styles.windowDuration}>{w.durationDays} day{w.durationDays !== 1 ? 's' : ''}</Text>
                                </View>
                            </View>
                        );
                    })}
                </>
            )} */}

            {/* Fallback visible on sites */}
            {/* {data.siteWindows?.length === 0 && data.visibleOnSites?.length > 0 && (
                <>
                    <Text style={styles.sectionHeading as any}>Visible On Sites</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                        {data.visibleOnSites.map((site, i) => (
                            <Text key={i} style={[styles.pill, styles.pillBlue]}>{site}</Text>
                        ))}
                    </View>
                </>
            )} */}
        </View>
    );
}

// ── Main document (now iterates sites) ────────────────────
export function ListingReportDocument({ data }: { data: ReportData }) {
    // Determine the list of sites to generate: one per unique site in siteWindows, fallback to siteContext.
    const siteWindows = data.siteWindows?.length
        ? data.siteWindows
        : [{ site: data.siteContext.slug, siteLabel: data.siteContext.label, derivedJobId: deriveJobId(data.jobId, data.siteContext.slug), startAt: '', endAt: '', durationDays: 0 }];

    // Create a unique array of sites (use site slug) to avoid duplicates if same site appears multiple times? (usually one window per site)
    const uniqueSites = Array.from(new Map(siteWindows.map(w => [w.site, w])).values());

    return (
        <Document
            title={`Listing Report — ${data.title}`}
            author={data.siteContext.label}
            subject="Job Listing Report"
            keywords={`job listing, ${data.companyName}, ${data.siteContext.label}`}
            creator={data.siteContext.label}
        >
            {uniqueSites.map((window, idx) => {
                const site = window.site;
                const label = SITE_LABELS[site] ?? window.siteLabel;
                const derivedId = window.derivedJobId || deriveJobId(data.jobId, site);
                const colors = SITE_COLORS[site] ?? DEFAULT_COLORS;
                const styles = makeStyles(colors);

                return (
                    <Page key={site} size="A4" style={styles.page as any}>
                        {/* Site‑specific header */}
                        <View fixed style={styles.header as any}>
                            <View style={styles.headerLeft as any}>
                                <Text style={styles.headerSiteName as any}>{label}</Text>
                                <Text style={styles.headerSiteUrl as any}>{site}</Text>
                            </View>
                            <View style={styles.headerRight as any}>
                                <Text style={styles.headerLabel as any}>Listing Report</Text>
                                <Text style={styles.headerJobId}>{derivedId}</Text>
                                <Text style={styles.headerDate}>Generated: {fmtDateTime(data.generatedAt)}</Text>
                            </View>
                        </View>

                        <ReportBody data={data} styles={styles} derivedId={derivedId} />

                        {/* Site‑specific footer */}
                        <View fixed style={styles.footer as any}>
                            <Text style={styles.footerLeft}>
                                {label} · {site} · Confidential
                            </Text>
                            <Text
                                style={styles.footerRight}
                                render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
                            />
                        </View>
                    </Page>
                );
            })}
        </Document>
    );
}