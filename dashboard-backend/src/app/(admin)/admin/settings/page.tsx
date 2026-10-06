'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { KNOWN_SITES } from '@/lib/sites';
import { SiteConfigItem } from '@/app/api/siteConfig/route';
import getLocalImageUrl from '@/utils/ChangeImageUrl';

/* ═══════════════════════════════════════════════════════════════════════════
   Constants
═══════════════════════════════════════════════════════════════════════════ */

interface SiteDef {
    id: string;
    label: string;
    short: string;
}

const SITES: SiteDef[] = [
    ...KNOWN_SITES.map((s: string) => ({
        id: s,
        label: s,
        short: s.split('.')[0],
    })),
];

interface Section {
    id: 'branding' | 'contact' | 'og';
    label: string;
    icon: string;
}

const SECTIONS: Section[] = [
    { id: 'branding', label: 'Branding', icon: 'ti-palette' },
    { id: 'contact', label: 'Contact Info', icon: 'ti-address-book' },
    { id: 'og', label: 'Open Graph', icon: 'ti-share' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   ConfigImageUploader
   ─────────────────────────────────────────────────────────────────────────
   KEY DESIGN: NO useEffect inside this component.
   The parent controls reset by changing the `key` prop (siteId + saveKey).
   This means:
     • On site switch  → key changes → remounts with fresh currentUrl
     • After save      → saveKey increments → remounts with new Cloudinary URL
   Internally this component is fully self-contained for the life of a mount.
   ─────────────────────────────────────────────────────────────────────────
   When a FILE is selected:
     • Preview = blob data URL (shown immediately)
     • urlInput is visually hidden (file takes over)
     • onFileSelect(file) notifies parent — that's all
     • We do NOT call onUrlChange('') — that would mutate currentUrl and
       trigger a re-render that previously wiped out the blob preview.
   The parent's save handler checks logoFile first, so the stale URL in
   formData is never used when a file is pending.
═══════════════════════════════════════════════════════════════════════════ */

interface ConfigImageUploaderProps {
    label: string;
    hint?: string;
    previewSize?: number;
    previewRadius?: string;
    currentUrl?: string;
    accept?: string;
    onFileSelect: (file: File | null) => void;
    onUrlChange: (url: string) => void;
}

function ConfigImageUploader({
    label,
    hint,
    previewSize = 60,
    previewRadius = '8px',
    currentUrl,
    accept = 'image/*',
    onFileSelect,
    onUrlChange,
}: ConfigImageUploaderProps) {
    // Initialise from currentUrl ONCE on mount.
    // Resets happen via key changes in the parent — never via useEffect.
    const [preview, setPreview] = useState<string | null>(currentUrl || null);
    const [urlInput, setUrlInput] = useState(currentUrl || '');
    const [pendingFileName, setPendingFileName] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    /* ── file selected ──────────────────────────────────────────────────── */
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
            setPendingFileName(file.name);
            setUrlInput('');         // clear URL input display
            onFileSelect(file);
            // ⚠ Do NOT call onUrlChange('') here — that mutates the parent's
            // formData.logoUrl which changes our currentUrl prop and would
            // have triggered a useEffect wipe of the blob preview (old bug).
        };
        reader.readAsDataURL(file);
    };

    /* ── URL typed ──────────────────────────────────────────────────────── */
    const handleUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setUrlInput(url);
        setPreview(url || null);
        setPendingFileName(null);   // switching to URL mode clears any pending file
        onUrlChange(url);
        onFileSelect(null);
    };

    /* ── remove ─────────────────────────────────────────────────────────── */
    const handleRemove = () => {
        setPreview(null);
        setUrlInput('');
        setPendingFileName(null);
        onFileSelect(null);
        onUrlChange('');
        if (fileRef.current) fileRef.current.value = '';
    };

    const hasFile = !!pendingFileName;

    return (
        <div className="sca-img-wrap">
            <label className="sca-label">{label}</label>
            <div className="d-flex align-items-start gap-3">

                {/* ── Preview box ─────────────────────────────────────── */}
                <div
                    className={`sca-img-box ${preview ? 'sca-img-box--filled' : ''}`}
                    style={{ width: previewSize, height: previewSize, borderRadius: previewRadius, flexShrink: 0 }}
                    onClick={() => fileRef.current?.click()}
                    title="Click to upload a file"
                >
                    {preview ? (
                        <img
                            src={preview}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: previewRadius, display: 'block' }}
                        />
                    ) : (
                        <i className="ti ti-photo-plus" style={{ fontSize: 22, color: '#bcc0d4' }} />
                    )}
                </div>

                {/* ── Controls ────────────────────────────────────────── */}
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <input
                        type="file"
                        ref={fileRef}
                        className="d-none"
                        accept={accept}
                        onChange={handleFile}
                    />

                    {/* File pending badge */}
                    {hasFile ? (
                        <div className="sca-file-badge mb-2">
                            <i className="ti ti-file-check" style={{ fontSize: 12, flexShrink: 0 }} />
                            <span className="sca-file-badge__name">{pendingFileName}</span>
                            <span className="sca-file-badge__new">NEW</span>
                        </div>
                    ) : (
                        /* URL input — only shown when no file is pending */
                        <div className="input-group input-group-sm mb-1">
                            <span className="input-group-text bg-white border-end-0 px-2">
                                <i className="ti ti-link text-muted" style={{ fontSize: 12 }} />
                            </span>
                            <input
                                type="url"
                                className="form-control form-control-sm border-start-0"
                                placeholder="Paste image URL…"
                                value={getLocalImageUrl(urlInput)}
                                onChange={handleUrl}
                                style={{ fontSize: 12 }}
                            />
                        </div>
                    )}

                    <div className="d-flex gap-2 align-items-center flex-wrap">
                        <button
                            type="button"
                            className="sca-upload-btn"
                            onClick={() => fileRef.current?.click()}
                        >
                            <i className={`ti ${hasFile ? 'ti-refresh' : 'ti-upload'} me-1`} style={{ fontSize: 11 }} />
                            {hasFile ? 'Change file' : 'Upload file'}
                        </button>
                        {preview && (
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger py-0 px-2"
                                style={{ fontSize: 11, height: 26 }}
                                onClick={handleRemove}
                            >
                                <i className="ti ti-trash me-1" style={{ fontSize: 11 }} />
                                Remove
                            </button>
                        )}
                    </div>

                    {hint && <div className="sca-hint-text mt-1">{hint}</div>}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Skeleton
═══════════════════════════════════════════════════════════════════════════ */
function SiteSkeleton() {
    return (
        <>
            {[130, 90, 145, 110, 160].map((w, i) => (
                <div key={i} className="sca-row" style={{ pointerEvents: 'none' }}>
                    <span className="sca-dot" style={{ background: '#e5e7f0' }} />
                    <div className="skeleton skeleton--text" style={{ width: w, height: 13, borderRadius: 4 }} />
                </div>
            ))}
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════════════════════════ */
export default function SiteConfigAdminPage() {

    /* ── navigation ─────────────────────────────────────────────────────── */
    const [selSite, setSelSite] = useState<SiteDef | null>(null);
    const [selSection, setSelSection] = useState<Section | null>(null);

    /* ── data ───────────────────────────────────────────────────────────── */
    const [configStore, setConfigStore] = useState<Record<string, SiteConfigItem>>({});
    const [loadingMeta, setLoadingMeta] = useState(true);

    /* ── form ───────────────────────────────────────────────────────────── */
    const [formData, setFormData] = useState<Partial<SiteConfigItem>>({ isActive: true });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [faviconFile, setFaviconFile] = useState<File | null>(null);
    const [ogImageFile, setOgImageFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveOk, setSaveOk] = useState(false);
    const [deleting, setDeleting] = useState(false);

    /**
     * saveKey — increments after every successful save.
     * Passed into `key` props of ConfigImageUploader instances so they
     * remount (fresh state) once the server returns the new asset URLs.
     */
    const [saveKey, setSaveKey] = useState(0);

    /* ── load all configs on mount ──────────────────────────────────────── */
    const loadConfigs = useCallback(async () => {
        setLoadingMeta(true);
        try {
            const res = await fetch('/api/siteConfig');
            if (!res.ok) return;
            const json = await res.json();
            const store: Record<string, SiteConfigItem> = {};
            (json.data as SiteConfigItem[]).forEach(item => { store[item.siteId] = item; });
            setConfigStore(store);
        } finally {
            setLoadingMeta(false);
        }
    }, []);

    // load on mount — useEffect is only here for the initial fetch, NOT in ConfigImageUploader
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { loadConfigs(); }, []);

    /* ── select a site ──────────────────────────────────────────────────── */
    const selectSite = useCallback((site: SiteDef) => {
        setSelSite(site);
        setSelSection(null);
        const existing = configStore[site.id];
        setFormData(existing ? { ...existing } : { isActive: true });
        setLogoFile(null);
        setFaviconFile(null);
        setOgImageFile(null);
        setSaveOk(false);
    }, [configStore]);

    /* ── form field change ──────────────────────────────────────────────── */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    /* ── save ───────────────────────────────────────────────────────────── */
    const handleSave = async () => {
        if (!selSite) return;
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('siteId', selSite.id);
            fd.append('isActive', String(formData.isActive !== false));

            // Text fields
            (['logoAlt', 'contactEmail', 'phone', 'address', 'ogTitle', 'ogDescription'] as const)
                .forEach(key => fd.append(key, (formData as any)[key] ?? ''));

            // Images — file wins if selected; otherwise send current URL (even empty = clear)
            if (logoFile) fd.append('logoFile', logoFile);
            else fd.append('logoUrl', formData.logoUrl ?? '');

            if (faviconFile) fd.append('faviconFile', faviconFile);
            else fd.append('faviconUrl', formData.faviconUrl ?? '');

            if (ogImageFile) fd.append('ogImageFile', ogImageFile);
            else fd.append('ogImageUrl', formData.ogImageUrl ?? '');

            const existing = configStore[selSite.id];
            const url = existing?.id ? `/api/siteConfig/${existing.id}` : '/api/siteConfig';
            const method = existing?.id ? 'PUT' : 'POST';

            const res = await fetch(url, { method, body: fd });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Save failed');
            }

            const json = await res.json();
            const saved = json.data as SiteConfigItem;

            // 1. Update store + form data with server-returned URLs
            setConfigStore(prev => ({ ...prev, [selSite.id]: saved }));
            setFormData({ ...saved });

            // 2. Reset pending files
            setLogoFile(null);
            setFaviconFile(null);
            setOgImageFile(null);

            // 3. Bump saveKey → uploaders remount with the fresh Cloudinary URLs
            setSaveKey(k => k + 1);

            setSaveOk(true);
            setTimeout(() => setSaveOk(false), 2500);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    /* ── delete ─────────────────────────────────────────────────────────── */
    const handleDelete = async () => {
        if (!selSite) return;
        const existing = configStore[selSite.id];
        if (!existing?.id) return;
        if (!confirm(`Remove all configuration for "${selSite.label}"?`)) return;

        setDeleting(true);
        try {
            const res = await fetch(`/api/siteConfig/${existing.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            setConfigStore(prev => { const n = { ...prev }; delete n[selSite.id]; return n; });
            setFormData({ isActive: true });
            setLogoFile(null); setFaviconFile(null); setOgImageFile(null);
            setSaveKey(k => k + 1);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setDeleting(false);
        }
    };

    /* ── helpers ────────────────────────────────────────────────────────── */
    const getSiteStatus = (siteId: string) => {
        const c = configStore[siteId];
        if (!c) return 'none' as const;
        return c.isActive ? 'active' as const : 'inactive' as const;
    };

    const hasUnsavedSection = (sectionId: Section['id']): boolean => {
        if (!selSite) return false;
        const ex = configStore[selSite.id];
        if (!ex) return false;
        if (sectionId === 'branding')
            return formData.logoUrl !== ex.logoUrl || formData.logoAlt !== ex.logoAlt ||
                formData.faviconUrl !== ex.faviconUrl || !!logoFile || !!faviconFile;
        if (sectionId === 'contact')
            return formData.contactEmail !== ex.contactEmail ||
                formData.phone !== ex.phone || formData.address !== ex.address;
        if (sectionId === 'og')
            return formData.ogTitle !== ex.ogTitle ||
                formData.ogDescription !== ex.ogDescription ||
                formData.ogImageUrl !== ex.ogImageUrl || !!ogImageFile;
        return false;
    };

    const existing = selSite ? configStore[selSite.id] : null;
    const ogDescLen = (formData.ogDescription || '').length;

    /* ═══════════════════════════════════════════════════════════════════════
       Section field renderers
    ═══════════════════════════════════════════════════════════════════════ */
    const renderBranding = () => (
        <div className="sca-fields">
            {/* key = siteId + saveKey → remounts on site switch AND after save */}
            <ConfigImageUploader
                key={`logo-${selSite?.id}-${saveKey}`}
                label="Main Logo"
                hint="SVG or PNG recommended · appears in header / footer"
                previewSize={72}
                previewRadius="8px"
                currentUrl={formData.logoUrl}
                onFileSelect={setLogoFile}
                onUrlChange={url => setFormData(prev => ({ ...prev, logoUrl: url }))}
            />

            <div className="sca-field mt-4">
                <label className="sca-label">Logo alt text</label>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    name="logoAlt"
                    value={formData.logoAlt || ''}
                    onChange={handleChange}
                    placeholder="e.g. JobsConnect — find local businesses"
                />
                <div className="sca-hint-text mt-1">
                    Used by screen readers and displayed if the image fails to load
                </div>
            </div>

            <div className="sca-divider" />

            <ConfigImageUploader
                key={`fav-${selSite?.id}-${saveKey}`}
                label="Favicon"
                hint=".ico or 32×32 PNG · shown in browser tabs and bookmarks"
                previewSize={42}
                previewRadius="6px"
                currentUrl={formData.faviconUrl}
                accept="image/x-icon,image/png,image/svg+xml,image/*"
                onFileSelect={setFaviconFile}
                onUrlChange={url => setFormData(prev => ({ ...prev, faviconUrl: url }))}
            />
        </div>
    );

    const renderContact = () => (
        <div className="sca-fields">
            <div className="row g-3">
                <div className="col-md-6 sca-field">
                    <label className="sca-label">Contact email</label>
                    <div className="input-group input-group-sm">
                        <span className="input-group-text bg-white border-end-0 px-2">
                            <i className="ti ti-mail text-muted" style={{ fontSize: 13 }} />
                        </span>
                        <input type="email" className="form-control form-control-sm border-start-0"
                            name="contactEmail" value={formData.contactEmail || ''}
                            onChange={handleChange} placeholder="hello@example.com" />
                    </div>
                </div>
                <div className="col-md-6 sca-field">
                    <label className="sca-label">Phone number</label>
                    <div className="input-group input-group-sm">
                        <span className="input-group-text bg-white border-end-0 px-2">
                            <i className="ti ti-phone text-muted" style={{ fontSize: 13 }} />
                        </span>
                        <input type="tel" className="form-control form-control-sm border-start-0"
                            name="phone" value={formData.phone || ''}
                            onChange={handleChange} placeholder="+1 (555) 000-0000" />
                    </div>
                </div>
                <div className="col-12 sca-field">
                    <label className="sca-label">Address</label>
                    <textarea className="form-control form-control-sm" name="address" rows={3}
                        value={formData.address || ''} onChange={handleChange}
                        placeholder="123 Main St, City, Province, Country"
                        style={{ resize: 'vertical' }} />
                    <div className="sca-hint-text mt-1">
                        Used in footer, contact page, and schema.org structured data
                    </div>
                </div>
            </div>
        </div>
    );

    const renderOG = () => (
        <div className="sca-fields">
            <div className="sca-field">
                <label className="sca-label">Default OG title</label>
                <input type="text" className="form-control form-control-sm"
                    name="ogTitle" value={formData.ogTitle || ''}
                    onChange={handleChange}
                    placeholder="Site name or tagline shown when a link is shared" />
                <div className="sca-hint-text mt-1">
                    Per-page titles set in the Metadata manager override this default
                </div>
            </div>

            <div className="sca-field mt-3">
                <label className="sca-label">Default OG description</label>
                <textarea className="form-control form-control-sm" name="ogDescription" rows={3}
                    value={formData.ogDescription || ''} onChange={handleChange}
                    placeholder="Brief description shown when a page is shared on social media (150–160 chars)"
                    style={{ resize: 'vertical' }} />
                <div className={`sca-chars ${ogDescLen > 160 ? 'sca-chars--over' : ''}`}>
                    {ogDescLen} / 160
                </div>
            </div>

            <div className="sca-divider" />

            <ConfigImageUploader
                key={`og-${selSite?.id}-${saveKey}`}
                label="Default OG share image"
                hint="1200×630 px recommended · fallback when no page-specific OG image is set"
                previewSize={88}
                previewRadius="6px"
                currentUrl={formData.ogImageUrl}
                onFileSelect={setOgImageFile}
                onUrlChange={url => setFormData(prev => ({ ...prev, ogImageUrl: url }))}
            />
        </div>
    );

    /* ═══════════════════════════════════════════════════════════════════════
       Form panel
    ═══════════════════════════════════════════════════════════════════════ */
    const renderFormPanel = () => {
        if (!selSite) return (
            <div className="sca-empty">
                <i className="ti ti-settings-2" style={{ fontSize: 40, opacity: .35, marginBottom: 10 }} />
                <span>Select a site to configure</span>
            </div>
        );

        if (!selSection) return (
            <div className="sca-empty">
                <i className="ti ti-arrow-left" style={{ fontSize: 20, opacity: .35, marginBottom: 6 }} />
                <span>Select a section to edit</span>
            </div>
        );

        return (
            <>
                {/* Header */}
                <div className="sca-ph">
                    <div style={{ minWidth: 0 }}>
                        <div className="sca-ph__name">{selSection.label}</div>
                        <code className="sca-ph__path">{selSite.label}</code>
                    </div>
                    <span className={`sca-pill ${existing
                        ? (existing.isActive ? 'sca-pill--ok' : 'sca-pill--warn')
                        : ''}`}>
                        {existing ? (existing.isActive ? 'Active' : 'Inactive') : 'Not saved yet'}
                    </span>
                </div>

                {/* Body */}
                <div className="sca-pb">
                    {selSection.id === 'branding' && renderBranding()}
                    {selSection.id === 'contact' && renderContact()}
                    {selSection.id === 'og' && renderOG()}
                </div>

                {/* Footer */}
                <div className="sca-pf">
                    <div className="d-flex align-items-center gap-2">
                        {existing?.id && (
                            <button type="button" className="btn btn-sm btn-outline-danger"
                                onClick={handleDelete} disabled={deleting || saving}
                                title="Delete all configuration for this site">
                                {deleting
                                    ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} />
                                    : <i className="ti ti-trash" />}
                            </button>
                        )}
                        <div className="form-check form-switch mb-0 ms-1">
                            <input type="checkbox" id="chk-active" name="isActive"
                                checked={!!formData.isActive} onChange={handleChange}
                                className="form-check-input" style={{ cursor: 'pointer' }} />
                            <label htmlFor="chk-active" className="form-check-label"
                                style={{ cursor: 'pointer', fontSize: 12, userSelect: 'none' }}>
                                Active
                            </label>
                        </div>
                    </div>

                    <button type="button"
                        className={`btn btn-sm ${saveOk ? 'btn-success' : 'btn-primary'}`}
                        onClick={handleSave} disabled={saving || deleting}>
                        {saving
                            ? <span className="spinner-border spinner-border-sm me-1" style={{ width: 12, height: 12 }} />
                            : saveOk
                                ? <i className="ti ti-check me-1" />
                                : <i className="ti ti-device-floppy me-1" />}
                        {saveOk ? 'Saved!' : existing ? 'Save changes' : 'Save configuration'}
                    </button>
                </div>
            </>
        );
    };

    /* ═══════════════════════════════════════════════════════════════════════
       Render
    ═══════════════════════════════════════════════════════════════════════ */
    return (
        <>
            <style>{STYLES}</style>
            <div className="sca-root">

                {/* Page header */}
                <div className="sca-header">
                    <h4 className="mb-0 fw-semibold" style={{ fontSize: 15 }}>Site Configuration</h4>
                    <p className="text-muted mb-0" style={{ fontSize: 12, marginTop: 2 }}>
                        Manage branding, contact details, and Open Graph defaults per site
                    </p>
                </div>

                <div className="sca-shell">

                    {/* ══ Column 1 · Sites ══════════════════════════════ */}
                    <div className="sca-col" style={{ width: 220 }}>
                        <div className="sca-col__head">
                            <i className="ti ti-world-www sca-col__ico" />Sites
                        </div>
                        <div className="sca-col__body">
                            {loadingMeta ? <SiteSkeleton /> : SITES.map(site => {
                                const status = getSiteStatus(site.id);
                                const isOn = selSite?.id === site.id;
                                return (
                                    <div key={site.id} title={site.label}
                                        className={`sca-row ${isOn ? 'sca-row--on' : ''}`}
                                        onClick={() => selectSite(site)}>
                                        <span className={[
                                            'sca-dot',
                                            status === 'active' ? 'sca-dot--ok' : '',
                                            status === 'inactive' ? 'sca-dot--warn' : '',
                                            isOn ? 'sca-dot--sel' : '',
                                        ].filter(Boolean).join(' ')} />
                                        <span className="sca-row__lbl">{site.short}</span>
                                        {!isOn && status !== 'none' && (
                                            <i className="ti ti-check sca-row__check" title="Configured" />
                                        )}
                                        {isOn && <i className="ti ti-chevron-right sca-row__arr" />}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="sca-legend">
                            <span className="sca-legend__item"><span className="sca-dot sca-dot--ok" />active</span>
                            <span className="sca-legend__item"><span className="sca-dot sca-dot--warn" />inactive</span>
                            <span className="sca-legend__item"><span className="sca-dot" />not set</span>
                        </div>
                    </div>

                    {/* ══ Column 2 · Sections ═══════════════════════════ */}
                    <div className={`sca-col ${!selSite ? 'sca-col--dim' : ''}`} style={{ width: 175 }}>
                        <div className="sca-col__head" title={selSite?.label}>
                            <i className="ti ti-layout-grid sca-col__ico" />
                            {selSite ? selSite.short : 'Sections'}
                        </div>
                        <div className="sca-col__body">
                            {!selSite
                                ? <div className="sca-col__hint">← Select a site</div>
                                : SECTIONS.map(sec => {
                                    const dirty = hasUnsavedSection(sec.id);
                                    const isOn = selSection?.id === sec.id;
                                    return (
                                        <div key={sec.id}
                                            className={`sca-row ${isOn ? 'sca-row--on' : ''}`}
                                            onClick={() => { setSelSection(sec); setSaveOk(false); }}>
                                            <i className={`ti ${sec.icon} sca-row__ico`} />
                                            <span className="sca-row__lbl">{sec.label}</span>
                                            {dirty && !isOn && (
                                                <span className="sca-dirty-dot" title="Unsaved changes" />
                                            )}
                                            {isOn && <i className="ti ti-chevron-right sca-row__arr" />}
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>

                    {/* ══ Form panel ════════════════════════════════════ */}
                    <div className={`sca-form ${!selSection ? 'sca-form--empty' : ''}`}>
                        {renderFormPanel()}
                    </div>
                </div>
            </div>
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Scoped styles
═══════════════════════════════════════════════════════════════════════════ */
const STYLES = `
.sca-root {
  display:flex; flex-direction:column; flex:1; min-height:0;
  background:#f3f4f8;
}
.sca-header {
  padding:14px 20px 10px;
  border-bottom:1px solid #e0e2ed;
  background:#fff; flex-shrink:0;
}
.sca-shell { display:flex; flex:1; overflow:hidden; }

/* ── Columns ──────────────────────────────────────────────────────────── */
.sca-col {
  display:flex; flex-direction:column;
  border-right:1px solid #e0e2ed;
  flex-shrink:0; background:#fff;
  transition:opacity .12s;
}
.sca-col:nth-child(2) { background:#fafafe; }
.sca-col--dim { opacity:.32; pointer-events:none; }

.sca-col__head {
  display:flex; align-items:center;
  padding:7px 11px 6px;
  font-size:10px; font-weight:700;
  text-transform:uppercase; letter-spacing:.07em; color:#8390b0;
  border-bottom:1px solid #e5e7f0;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  flex-shrink:0; background:inherit;
}
.sca-col__ico { margin-right:5px; opacity:.55; font-size:12px; flex-shrink:0; }
.sca-col__body { flex:1; overflow-y:auto; }
.sca-col__hint { padding:10px 12px; font-size:11px; color:#bec5d8; font-style:italic; }

/* ── Rows ─────────────────────────────────────────────────────────────── */
.sca-row {
  display:flex; align-items:center; gap:7px;
  padding:7px 10px 7px 12px;
  cursor:pointer; user-select:none;
  border-left:2px solid transparent;
  transition:background .08s, border-color .08s;
  min-height:35px;
}
.sca-row:hover { background:#f0f1f9; }
.sca-row--on   { background:#ede9fd; border-left-color:#534AB7; }
.sca-row--on .sca-row__lbl { color:#534AB7; font-weight:600; }
.sca-row--on .sca-row__ico { color:#534AB7; }

.sca-row__ico   { font-size:13px; color:#9da5c4; flex-shrink:0; }
.sca-row__lbl   { flex:1; font-size:12.5px; color:#3c4160; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sca-row__arr   { font-size:11px; color:#cccfe0; flex-shrink:0; }
.sca-row__check { font-size:11px; color:#22c55e; flex-shrink:0; }

/* ── Status dots ──────────────────────────────────────────────────────── */
.sca-dot {
  width:8px; height:8px; border-radius:50%;
  background:#d0d4e8; flex-shrink:0;
  transition:background .15s;
}
.sca-dot--ok   { background:#22c55e; }
.sca-dot--warn { background:#f59e0b; }
.sca-dot--sel  { background:#534AB7; }

.sca-dirty-dot {
  width:6px; height:6px; border-radius:50%;
  background:#f59e0b; flex-shrink:0; margin-left:auto;
}

/* ── Legend ───────────────────────────────────────────────────────────── */
.sca-legend {
  display:flex; flex-wrap:wrap; gap:8px;
  padding:8px 12px;
  border-top:1px solid #e5e7f0;
  background:#fafafe;
}
.sca-legend__item { display:flex; align-items:center; gap:4px; font-size:10px; color:#a3aac0; }

/* ── Form panel ───────────────────────────────────────────────────────── */
.sca-form { flex:1; display:flex; flex-direction:column; overflow:hidden; background:#fff; min-width:0; }
.sca-form--empty { background:#f7f8fc; }

.sca-empty {
  flex:1; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  gap:4px; color:#c2c7d8; font-size:12px;
}

.sca-ph {
  display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
  padding:12px 22px 11px;
  border-bottom:1px solid #e5e7f0;
  background:#fafafe; flex-shrink:0;
}
.sca-ph__name { font-size:13px; font-weight:600; color:#2b2f47; }
.sca-ph__path { font-size:11px; color:#a3aac0; font-family:ui-monospace,monospace; }

.sca-pb { flex:1; overflow-y:auto; padding:24px; }
.sca-fields {}
.sca-field { margin-bottom:0; }
.sca-divider { border:none; border-top:1px dashed #e5e7f0; margin:22px 0; }

.sca-pf {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 22px;
  border-top:1px solid #e5e7f0;
  background:#fafafe; flex-shrink:0;
}

.sca-label { display:block; font-size:12px; font-weight:600; color:#4b5170; margin-bottom:5px; }
.sca-hint-text { font-size:11px; color:#a3aac0; }
.sca-chars       { font-size:10px; color:#a3aac0; text-align:right; margin-top:3px; }
.sca-chars--over { color:#ef4444; }

.sca-pill {
  font-size:10px; font-weight:700;
  padding:2px 9px; border-radius:20px;
  background:#ececf5; color:#a3aac0;
  text-transform:uppercase; letter-spacing:.05em;
  white-space:nowrap; flex-shrink:0;
}
.sca-pill--ok   { background:#dcfce7; color:#16a34a; }
.sca-pill--warn { background:#fef9c3; color:#ca8a04; }

/* ── Image uploader ───────────────────────────────────────────────────── */
.sca-img-wrap { margin-bottom:4px; }

.sca-img-box {
  border:2px dashed #dee2e6;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; overflow:hidden;
  background:#f8f9fa;
  transition:border-color .15s, background .15s;
}
.sca-img-box:hover       { border-color:#534AB7; background:#f0eeff; }
.sca-img-box--filled     { border-style:solid; border-color:#c3bef7; background:#faf9ff; }
.sca-img-box--filled:hover { border-color:#534AB7; }

/* File-pending badge */
.sca-file-badge {
  display:inline-flex; align-items:center; gap:5px;
  font-size:11px; color:#065f46;
  background:#d1fae5; border:1px solid #a7f3d0;
  border-radius:5px; padding:3px 10px;
  max-width:100%;
}
.sca-file-badge__name {
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  flex:1; min-width:0;
}
.sca-file-badge__new {
  font-size:9px; font-weight:800;
  background:#059669; color:#fff;
  border-radius:3px; padding:1px 5px;
  flex-shrink:0; text-transform:uppercase; letter-spacing:.06em;
}

.sca-upload-btn {
  display:inline-flex; align-items:center;
  height:26px; padding:0 10px;
  font-size:11px;
  border:1px solid #534AB7; border-radius:5px;
  color:#534AB7; background:transparent;
  cursor:pointer; transition:background .1s;
}
.sca-upload-btn:hover { background:#ede9fd; }
`;