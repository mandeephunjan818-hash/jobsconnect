'use client';

import { useState, useEffect, useCallback } from 'react';
import { KNOWN_SITES } from '@/lib/sites';

/* ═══════════════════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════════════════ */

interface MetadataItem {
    id?: string;
    urlPattern: string;
    siteId: string;
    title: string;
    logo?: string;
    logoAlt?: string;
    logoTitle?: string;
    description: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogImageAlt?: string;
    ogImageTitle?: string;
    canonicalUrl?: string;
    robots?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

interface PageDef {
    path: string;
    label: string;
    icon: string;
    type: 'static' | 'blog' | 'listing';
    slug?: string;
}

interface SiteDef {
    id: string;
    label: string;
    short: string;
}

interface DynamicPages {
    blog: PageDef[];
    listing: PageDef[];
}

type CategoryId = 'static' | 'blog' | 'listing';

/* ═══════════════════════════════════════════════════════════════════════════
   Constants
═══════════════════════════════════════════════════════════════════════════ */

const SITES: SiteDef[] = [
    // { id: '*', label: 'Global (all sites)', short: 'Global' },
    ...KNOWN_SITES.map((s: string) => ({
        id: s,
        label: s,
        short: s.split('.')[0], // e.g. 'bizroo', 'talentpayload', 'newincanadajobs'
    })),
];

const CATEGORIES: { id: CategoryId; label: string; icon: string }[] = [
    { id: 'static', label: 'Static pages', icon: 'ti-file-text' },
    { id: 'blog', label: 'Blog posts', icon: 'ti-article' },
    { id: 'listing', label: 'Job listings', icon: 'ti-briefcase' },
];

const STATIC_PAGES: Record<string, PageDef[]> = {
    '*': [
        { path: '/', label: 'Home', icon: 'ti-home', type: 'static' },
    ],
    'new-jobs-fawn.vercel.app': [
        { path: '/', label: 'Home', icon: 'ti-home', type: 'static' },
        { path: '/jobs', label: 'Jobs listing', icon: 'ti-briefcase', type: 'static' },
        { path: '/about', label: 'About us', icon: 'ti-info-circle', type: 'static' },
        { path: '/contact', label: 'Contact', icon: 'ti-mail', type: 'static' },
        { path: '/privacy-policy', label: 'Privacy policy', icon: 'ti-shield', type: 'static' },
        { path: '/terms', label: 'Terms of service', icon: 'ti-file-text', type: 'static' },
    ],
    'jobs-connect.vercel.app': [
        { path: '/', label: 'Home', icon: 'ti-home', type: 'static' },
        { path: '/about', label: 'About Us', icon: 'ti-info-circle', type: 'static' },
        { path: '/jobs', label: 'Jobs', icon: 'ti-briefcase', type: 'static' },
        { path: '/blog', label: 'Blog (index)', icon: 'ti-news', type: 'static' },
        { path: '/contact', label: 'Contact Us', icon: 'ti-mail', type: 'static' },
        { path: '/faqs', label: 'FAQs', icon: 'ti-help-circle', type: 'static' },
    ],
    'bizroo.ca': [
        { path: '/', label: 'Home', icon: 'ti-home', type: 'static' },
        { path: '/listings', label: 'Listings', icon: 'ti-list', type: 'static' },
        { path: '/about', label: 'About us', icon: 'ti-info-circle', type: 'static' },
        { path: '/contact', label: 'Contact', icon: 'ti-mail', type: 'static' },
        { path: '/pricing', label: 'Pricing', icon: 'ti-tag', type: 'static' },
        { path: '/privacy-policy', label: 'Privacy policy', icon: 'ti-shield', type: 'static' },
    ],
    'talentpayload.com': [
        { path: '/', label: 'Home', icon: 'ti-home', type: 'static' },
        { path: '/services', label: 'Services', icon: 'ti-settings', type: 'static' },
        { path: '/case-studies', label: 'Case studies', icon: 'ti-chart-bar', type: 'static' },
        { path: '/about', label: 'About us', icon: 'ti-info-circle', type: 'static' },
        { path: '/contact', label: 'Contact', icon: 'ti-mail', type: 'static' },
        { path: '/careers', label: 'Careers', icon: 'ti-users', type: 'static' },
    ],
};

const metaKey = (siteId: string, path: string) => `${siteId}::${path}`;

/* ═══════════════════════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════════════════════ */

export default function MetadataAdminPage() {

    /* ── Navigation ──────────────────────────────────────────────────────── */
    const [selSite, setSelSite] = useState<SiteDef | null>(null);
    const [selCat, setSelCat] = useState<CategoryId | null>(null);
    const [selPage, setSelPage] = useState<{ siteId: string; page: PageDef } | null>(null);

    /* ── Data ────────────────────────────────────────────────────────────── */
    const [dynamicPages, setDynamicPages] = useState<Record<string, DynamicPages>>({});
    const [loadingDynamic, setLoadingDynamic] = useState<Record<string, boolean>>({});
    const [metaStore, setMetaStore] = useState<Record<string, MetadataItem>>({});
    const [loadingMeta, setLoadingMeta] = useState(false);

    /* ── Form ────────────────────────────────────────────────────────────── */
    const [formData, setFormData] = useState<Partial<MetadataItem>>({});
    const [saving, setSaving] = useState(false);
    const [saveOk, setSaveOk] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

    /* ── Load all metadata on mount ──────────────────────────────────────── */
    useEffect(() => {
        (async () => {
            setLoadingMeta(true);
            try {
                const res = await fetch('/api/admin/metadata/[id]/?perPage=10000&page=1');
                if (!res.ok) return;
                const json = await res.json();
                const store: Record<string, MetadataItem> = {};
                (json.data as MetadataItem[]).forEach(item => {
                    store[metaKey(item.siteId, item.urlPattern)] = item;
                });
                setMetaStore(store);
            } finally {
                setLoadingMeta(false);
            }
        })();
    }, []);

    /* ── Fetch dynamic pages ─────────────────────────────────────────────── */
    const fetchDynamic = useCallback(async (siteId: string) => {
        if (dynamicPages[siteId] || loadingDynamic[siteId]) return;
        setLoadingDynamic(prev => ({ ...prev, [siteId]: true }));

        const siteParam = siteId !== '*' ? `&siteId=${siteId}` : '';
        const siteParamL = siteId !== '*' ? `&sites=${siteId}` : '';

        let blogPages: PageDef[] = [];
        try {
            let page = 1;
            while (true) {
                const res = await fetch(`/api/blog?perPage=50&page=${page}${siteParam}`).then(r => r.json());
                blogPages = blogPages.concat(
                    (res.data || []).map((p: any) => ({
                        path: `/blog/${p.slug}`, label: p.title,
                        icon: 'ti-article', type: 'blog' as const, slug: p.slug,
                    }))
                );
                if (page >= (res.totalPages ?? 1)) break;
                page++;
            }
        } catch { /* ignore */ }

        let listingPages: PageDef[] = [];
        try {
            let page = 1;
            while (true) {
                const res = await fetch(`/api/listings?perPage=50&page=${page}${siteParamL}`).then(r => r.json());
                listingPages = listingPages.concat(
                    (res.data || []).map((p: any) => ({
                        path: `/jobs/${p.slug}`, label: p.title,
                        icon: 'ti-briefcase', type: 'listing' as const, slug: p.slug,
                    }))
                );
                if (page >= (res.totalPages ?? 1)) break;
                page++;
            }
        } catch { /* ignore */ }

        setDynamicPages(prev => ({ ...prev, [siteId]: { blog: blogPages, listing: listingPages } }));
        setLoadingDynamic(prev => ({ ...prev, [siteId]: false }));
    }, [dynamicPages, loadingDynamic]);

    /* ── Inheritance (silent — used only for placeholders) ───────────────── */
    const getInherited = (siteId: string, path: string): Partial<MetadataItem> =>
        metaStore[metaKey('*', path)] ||
        metaStore[metaKey(siteId, '*')] ||
        metaStore[metaKey('*', '*')] ||
        {};

    /* ── Select a page ───────────────────────────────────────────────────── */
    const selectPage = (siteId: string, page: PageDef) => {
        setSelPage({ siteId, page });
        const existing = metaStore[metaKey(siteId, page.path)];
        setFormData(existing
            ? { title: existing.title, description: existing.description, isActive: existing.isActive }
            : { title: '', description: '', isActive: true }
        );
        setErrors({});
        setSaveOk(false);
    };

    /* ── Form field change ───────────────────────────────────────────────── */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
        if (errors[name as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    /* ── Save ────────────────────────────────────────────────────────────── */
    const handleSave = async (publish?: boolean) => {
        if (!selPage) return;

        const errs: typeof errors = {};
        if (!formData.title?.trim()) errs.title = 'Title is required';
        if (!formData.description?.trim()) errs.description = 'Description is required';
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setSaving(true);
        try {
            const { siteId, page } = selPage;
            const existing = metaStore[metaKey(siteId, page.path)];

            const fd = new FormData();
            fd.append('siteId', siteId);
            fd.append('urlPattern', page.path);
            fd.append('title', formData.title!.trim());
            fd.append('description', formData.description!.trim());
            fd.append('isActive', publish ? 'on' : (formData.isActive ? 'on' : 'off'));

            const url = existing?.id ? `/api/admin/metadata/${existing.id}` : '/api/admin/metadata';
            const method = existing?.id ? 'PUT' : 'POST';

            const res = await fetch(url, { method, body: fd });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Save failed');
            }

            const json = await res.json();
            const saved = (json.data || json) as MetadataItem;

            setMetaStore(prev => ({ ...prev, [metaKey(siteId, page.path)]: saved }));
            setFormData({ title: saved.title, description: saved.description, isActive: saved.isActive });
            setSaveOk(true);
            setTimeout(() => setSaveOk(false), 2500);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    /* ── Delete ──────────────────────────────────────────────────────────── */
    const handleDelete = async () => {
        if (!selPage) return;
        const { siteId, page } = selPage;
        const existing = metaStore[metaKey(siteId, page.path)];
        if (!existing?.id) return;
        if (!confirm('Remove metadata for this page?')) return;

        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/metadata/${existing.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            setMetaStore(prev => {
                const next = { ...prev };
                delete next[metaKey(siteId, page.path)];
                return next;
            });
            selectPage(siteId, page);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setDeleting(false);
        }
    };

    /* ── Helpers ─────────────────────────────────────────────────────────── */
    const getCatPages = (): PageDef[] => {
        if (!selSite || !selCat) return [];
        if (selCat === 'static') return STATIC_PAGES[selSite.id] || STATIC_PAGES['*'] || [];
        if (selCat === 'blog') return dynamicPages[selSite.id]?.blog || [];
        return dynamicPages[selSite.id]?.listing || [];
    };

    const getCatCount = (siteId: string, catId: CategoryId): number => {
        if (catId === 'static') return (STATIC_PAGES[siteId] || STATIC_PAGES['*'] || []).length;
        if (catId === 'blog') return dynamicPages[siteId]?.blog.length ?? 0;
        return dynamicPages[siteId]?.listing.length ?? 0;
    };

    const isDynLoading = selSite ? !!loadingDynamic[selSite.id] : false;
    const pages = getCatPages();

    /* ── Form renderer ───────────────────────────────────────────────────── */
    const renderForm = () => {
        if (!selPage) {
            return (
                <div className="mpa-empty">
                    <i className="ti ti-cursor-text" />
                    <span>Select a site → category → page to edit</span>
                </div>
            );
        }

        const { siteId, page } = selPage;
        const existing = metaStore[metaKey(siteId, page.path)];
        const inherited = getInherited(siteId, page.path);
        const descLen = (formData.description || '').length;

        return (
            <>
                {/* Header */}
                <div className="mpa-fh">
                    <div style={{ minWidth: 0 }}>
                        <div className="mpa-fh__name">{page.label}</div>
                        <code className="mpa-fh__path">{siteId} · {page.path}</code>
                    </div>
                    <span className={`mpa-pill ${existing ? 'mpa-pill--ok' : ''}`}>
                        {existing ? 'Saved' : 'Not set'}
                    </span>
                </div>

                {/* Body */}
                <div className="mpa-fb">

                    <div className="mpa-field">
                        <label className="mpa-label">
                            Page title <span className="mpa-req">*</span>
                        </label>
                        <input
                            type="text"
                            className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`}
                            name="title"
                            value={formData.title || ''}
                            placeholder={inherited.title || 'e.g. Home | My Site'}
                            onChange={handleChange}
                            autoComplete="off"
                        />
                        {errors.title && (
                            <div className="invalid-feedback">{errors.title}</div>
                        )}
                    </div>

                    <div className="mpa-field">
                        <label className="mpa-label">
                            Meta description <span className="mpa-req">*</span>
                        </label>
                        <textarea
                            className={`form-control form-control-sm ${errors.description ? 'is-invalid' : ''}`}
                            name="description"
                            value={formData.description || ''}
                            placeholder={
                                inherited.description
                                    ? inherited.description.slice(0, 100) +
                                    (inherited.description.length > 100 ? '…' : '')
                                    : 'Brief description for search engines (150–160 chars)'
                            }
                            onChange={handleChange}
                            rows={5}
                        />
                        {errors.description ? (
                            <div className="invalid-feedback">{errors.description}</div>
                        ) : (
                            <div className={`mpa-chars ${descLen > 160 ? 'mpa-chars--over' : ''}`}>
                                {descLen} / 160
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="mpa-ff">
                    <div className="form-check form-switch mb-0">
                        <input
                            type="checkbox"
                            id="chk-active"
                            name="isActive"
                            checked={!!formData.isActive}
                            onChange={handleChange}
                            className="form-check-input"
                            style={{ cursor: 'pointer' }}
                        />
                        <label
                            htmlFor="chk-active"
                            className="form-check-label small"
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                            Active
                        </label>
                    </div>

                    <div className="d-flex gap-2">
                        {existing?.id && (
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={handleDelete}
                                disabled={deleting}
                                title="Remove metadata for this page"
                            >
                                {deleting
                                    ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} />
                                    : <i className="ti ti-trash" />
                                }
                            </button>
                        )}
                        {/* <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleSave(false)}
                            disabled={saving}
                        >
                            {saving && !saveOk
                                ? <span className="spinner-border spinner-border-sm me-1" style={{ width: 12, height: 12 }} />
                                : null
                            }
                            Save draft
                        </button> */}
                        <button
                            type="button"
                            className={`btn btn-sm ${saveOk ? 'btn-success' : 'btn-primary'}`}
                            onClick={() => handleSave(true)}
                            disabled={saving}
                        >
                            {saving
                                ? <span className="spinner-border spinner-border-sm me-1" style={{ width: 12, height: 12 }} />
                                : saveOk
                                    ? <i className="ti ti-check me-1" />
                                    : <i className="ti ti-device-floppy me-1" />
                            }
                            {saveOk ? 'Saved!' : 'Save & activate'}
                        </button>
                    </div>
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

            <div className="mpa-root">

                {/* ── Page header ──────────────────────────────────────── */}
                <div className="mpa-header">
                    <h4 className="mb-0 fw-semibold" style={{ fontSize: 15 }}>
                        Metadata Management
                    </h4>
                    <p className="text-muted mb-0" style={{ fontSize: 12, marginTop: 2 }}>
                        Select a site → category → page to edit its SEO metadata
                    </p>
                </div>

                <div className="mpa-shell">

                    {/* ══ Column 1 · Sites ═════════════════════════════════ */}
                    <div className="mpa-col" style={{ width: 220 }}>
                        <div className="mpa-col__head">
                            <i className="ti ti-world-www mpa-col__ico" />
                            Sites
                        </div>
                        <div className="mpa-col__body">
                            {loadingMeta ? (
                                <div className="mpa-col__hint">
                                    <span className="spinner-border spinner-border-sm"
                                        style={{ width: 11, height: 11, borderWidth: 1.5 }} />
                                    Loading…
                                </div>
                            ) : (
                                SITES.map(site => (
                                    <div
                                        key={site.id}
                                        title={site.label}
                                        className={`mpa-row ${selSite?.id === site.id ? 'mpa-row--on' : ''}`}
                                        onClick={() => {
                                            if (selSite?.id !== site.id) {
                                                setSelSite(site);
                                                setSelCat(null);
                                                setSelPage(null);
                                                fetchDynamic(site.id);
                                            }
                                        }}
                                    >
                                        <span className={[
                                            'mpa-sdot',
                                            site.id === '*' ? 'mpa-sdot--g' : '',
                                            selSite?.id === site.id ? 'mpa-sdot--on' : '',
                                        ].join(' ')} />
                                        <span className="mpa-row__lbl">{site.short}</span>
                                        {selSite?.id === site.id && (
                                            <i className="ti ti-chevron-right mpa-row__arr" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* ══ Column 2 · Categories ════════════════════════════ */}
                    <div className={`mpa-col ${!selSite ? 'mpa-col--dim' : ''}`} style={{ width: 175 }}>
                        <div className="mpa-col__head" title={selSite?.label}>
                            <i className="ti ti-layout-grid mpa-col__ico" />
                            {selSite ? selSite.short : 'Categories'}
                        </div>
                        <div className="mpa-col__body">
                            {!selSite ? (
                                <div className="mpa-col__hint">← Select a site</div>
                            ) : (
                                CATEGORIES.map(cat => {
                                    const count = getCatCount(selSite.id, cat.id);
                                    const dynLoad = isDynLoading && cat.id !== 'static';
                                    return (
                                        <div
                                            key={cat.id}
                                            className={`mpa-row ${selCat === cat.id ? 'mpa-row--on' : ''}`}
                                            onClick={() => { setSelCat(cat.id); setSelPage(null); }}
                                        >
                                            <i className={`ti ${cat.icon} mpa-row__ico`} />
                                            <span className="mpa-row__lbl">{cat.label}</span>
                                            {dynLoad ? (
                                                <span className="spinner-border spinner-border-sm ms-auto"
                                                    style={{ width: 9, height: 9, borderWidth: 1.5, flexShrink: 0 }} />
                                            ) : (
                                                <span className="mpa-badge">{count}</span>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* ══ Column 3 · Pages ═════════════════════════════════ */}
                    <div className={`mpa-col ${!selCat ? 'mpa-col--dim' : ''}`} style={{ width: 218 }}>
                        <div className="mpa-col__head">
                            <i className="ti ti-files mpa-col__ico" />
                            {selCat
                                ? CATEGORIES.find(c => c.id === selCat)!.label
                                : 'Pages'
                            }
                        </div>
                        <div className="mpa-col__body">
                            {!selCat ? (
                                <div className="mpa-col__hint">← Select a category</div>
                            ) : isDynLoading && selCat !== 'static' ? (
                                <div className="mpa-col__hint">
                                    <span className="spinner-border spinner-border-sm"
                                        style={{ width: 11, height: 11, borderWidth: 1.5 }} />
                                    Loading pages…
                                </div>
                            ) : pages.length === 0 ? (
                                <div className="mpa-col__hint">No pages found</div>
                            ) : (
                                pages.map(page => {
                                    const isOn = selPage?.siteId === selSite!.id &&
                                        selPage?.page.path === page.path;
                                    const hasMeta = !!metaStore[metaKey(selSite!.id, page.path)];
                                    return (
                                        <div
                                            key={page.path}
                                            className={`mpa-row ${isOn ? 'mpa-row--on' : ''}`}
                                            onClick={() => selectPage(selSite!.id, page)}
                                        >
                                            <span
                                                className={`mpa-mdot ${hasMeta ? 'mpa-mdot--set' : ''}`}
                                                title={hasMeta ? 'Metadata saved' : 'No metadata set'}
                                            />
                                            <span className="mpa-row__lbl">{page.label}</span>
                                            <code className="mpa-row__path">{page.path}</code>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* ══ Form panel ═══════════════════════════════════════ */}
                    <div className="mpa-form">
                        {renderForm()}
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
/* ── Root ──────────────────────────────────────────────────────────────── */
.mpa-root {
  display: flex; flex-direction: column; flex: 1; min-height: 0;
  background: #f3f4f8;
}
.mpa-header {
  padding: 14px 20px 10px;
  border-bottom: 1px solid #e0e2ed;
  background: #fff;
  flex-shrink: 0;
}

/* ── Shell (the four-column grid) ───────────────────────────────────────── */
.mpa-shell {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Shared column styles ───────────────────────────────────────────────── */
.mpa-col {
  display: flex; flex-direction: column;
  border-right: 1px solid #e0e2ed;
  flex-shrink: 0;
  background: #fff;
  transition: opacity .12s;
}

/* Slightly different tints per column for depth */
.mpa-col:nth-child(2) { background: #fafafe; }
.mpa-col:nth-child(3) { background: #f7f8fc; }

.mpa-col--dim {
  opacity: .35;
  pointer-events: none;
}

.mpa-col__head {
  display: flex; align-items: center;
  padding: 7px 11px 6px;
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .07em;
  color: #8390b0;
  border-bottom: 1px solid #e5e7f0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  flex-shrink: 0;
  background: inherit;
}
.mpa-col__ico {
  margin-right: 5px;
  opacity: .55;
  font-size: 12px;
  flex-shrink: 0;
}

.mpa-col__body { flex: 1; overflow-y: auto; }

.mpa-col__hint {
  display: flex; align-items: center; gap: 7px;
  padding: 9px 12px;
  font-size: 11px; color: #bec5d8; font-style: italic;
}

/* ── Navigation row ─────────────────────────────────────────────────────── */
.mpa-row {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px 6px 11px;
  cursor: pointer; user-select: none;
  border-left: 2px solid transparent;
  transition: background .08s, border-color .08s;
  min-height: 33px;
}
.mpa-row:hover     { background: #f0f1f9; }
.mpa-row--on       { background: #ede9fd; border-left-color: #534AB7; }
.mpa-row--on .mpa-row__lbl { color: #534AB7; font-weight: 400; }
.mpa-row--on .mpa-row__ico { color: #534AB7; }

.mpa-row__ico  { font-size: 13px; color: #9da5c4; flex-shrink: 0; }
.mpa-row__lbl  {
  flex: 1; font-size: 12px; color: #3c4160;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mpa-row__arr  { font-size: 11px; color: #cccfe0; flex-shrink: 0; }
.mpa-row__path {
  font-size: 10px; color: #b0b8d0;
  font-family: ui-monospace, monospace;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 76px;
}

/* ── Dots ───────────────────────────────────────────────────────────────── */
.mpa-sdot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #ccd0e4; flex-shrink: 0;
  transition: background .15s;
}
.mpa-sdot--g, .mpa-sdot--on { background: #534AB7; }

.mpa-mdot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #d8dce8; flex-shrink: 0;
}
.mpa-mdot--set { background: #22c55e; }

/* ── Count badge ────────────────────────────────────────────────────────── */
.mpa-badge {
  font-size: 10px; font-weight: 400;
  color: #8390b0; background: #ecedfa;
  border-radius: 20px; padding: 1px 6px;
  flex-shrink: 0; margin-left: auto;
}
.mpa-row--on .mpa-badge { background: #dbd6fc; color: #534AB7; }

/* ── Form panel ─────────────────────────────────────────────────────────── */
.mpa-form { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff; min-width: 0; }

.mpa-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; color: #c8cdd8; font-size: 12px;
}
.mpa-empty i { font-size: 30px; }

/* Form header */
.mpa-fh {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 12px 20px 11px;
  border-bottom: 1px solid #e5e7f0;
  background: #fafafe;
  flex-shrink: 0;
}
.mpa-fh__name { font-size: 13px; font-weight: 400; color: #2b2f47; }
.mpa-fh__path { font-size: 11px; color: #a3aac0; font-family: ui-monospace, monospace; }

/* Form body */
.mpa-fb   { flex: 1; padding: 22px 24px; overflow-y: auto; }
.mpa-field { margin-bottom: 20px; }
.mpa-field:last-child { margin-bottom: 0; }

.mpa-label { display: block; font-size: 12px; font-weight: 400; color: #4b5170; margin-bottom: 5px; }
.mpa-req   { color: #ef4444; margin-left: 1px; }

.mpa-chars        { font-size: 10px; color: #a3aac0; text-align: right; margin-top: 3px; }
.mpa-chars--over  { color: #ef4444; }

/* Form footer */
.mpa-ff {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 20px;
  border-top: 1px solid #e5e7f0;
  background: #fafafe;
  flex-shrink: 0;
}

/* Status pill */
.mpa-pill {
  font-size: 10px; font-weight: 700;
  padding: 2px 8px; border-radius: 20px;
  background: #ececf5; color: #a3aac0;
  text-transform: uppercase; letter-spacing: .05em;
  white-space: nowrap; flex-shrink: 0;
}
.mpa-pill--ok { background: #dcfce7; color: #16a34a; }
`;