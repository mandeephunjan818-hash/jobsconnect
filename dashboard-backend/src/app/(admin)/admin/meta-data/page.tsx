'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { KNOWN_SITES } from '@/lib/sites';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetadataItem {
    id?: string;
    urlPattern: string;
    siteId: string;
    title: string;
    logo: string;
    logoAlt: string;
    logoTitle: string;
    description: string;
    keywords: string;
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
}

interface DynamicPages {
    blog: PageDef[];
    listing: PageDef[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SITES: SiteDef[] = [
    { id: '*', label: 'Global (all sites)' },
    ...KNOWN_SITES.map((s: string) => ({ id: s, label: s })),
];

/**
 * Static pages per site — add/remove pages here as your routes change.
 * Keys must match KNOWN_SITES values or '*' for global.
 */
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
    // jobs-connect — update the key below to match your exact KNOWN_SITES entry
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

function metaKey(siteId: string, path: string) {
    return `${siteId}::${path}`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FieldSkeleton() {
    return (
        <div className="mb-3">
            <div className="skeleton skeleton--text mb-1" style={{ width: 80, height: 12 }} />
            <div className="skeleton skeleton--text" style={{ width: '100%', height: 34 }} />
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MetadataAdminPage() {
    // Site tree state
    const [openSiteId, setOpenSiteId] = useState<string | null>(null);
    const [selectedPage, setSelectedPage] = useState<{ siteId: string; page: PageDef } | null>(null);

    // Dynamic pages from API
    const [dynamicPages, setDynamicPages] = useState<Record<string, DynamicPages>>({});
    const [loadingDynamic, setLoadingDynamic] = useState<Record<string, boolean>>({});

    // Metadata store — keyed by metaKey(siteId, path)
    const [metaStore, setMetaStore] = useState<Record<string, MetadataItem>>({});
    const [loadingMeta, setLoadingMeta] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<MetadataItem>>({});
    const [saving, setSaving] = useState(false);
    const [saveOk, setSaveOk] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [ogImageFile, setOgImageFile] = useState<File | null>(null);
    const logoRef = useRef<HTMLInputElement>(null);
    const ogImageRef = useRef<HTMLInputElement>(null);

    // ── Load all metadata once on mount ──────────────────────────────────────
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

    // ── Fetch dynamic pages for a site ───────────────────────────────────────
    const fetchDynamic = useCallback(async (siteId: string) => {
        if (dynamicPages[siteId] || loadingDynamic[siteId]) return;
        setLoadingDynamic(prev => ({ ...prev, [siteId]: true }));

        const siteParam = siteId !== '*' ? `&siteId=${siteId}` : '';
        const siteParamL = siteId !== '*' ? `&sites=${siteId}` : '';

        // ── Blog: paginate through all pages (API hard-caps at perPage=50) ──
        let blogPages: PageDef[] = [];
        try {
            let page = 1;
            while (true) {
                const res = await fetch(
                    `/api/blog?perPage=50&page=${page}${siteParam}`
                ).then(r => r.json());
                const rows: any[] = res.data || [];
                blogPages = blogPages.concat(
                    rows.map((p: any) => ({
                        path: `/blog/${p.slug}`,
                        label: p.title,
                        icon: 'ti-article',
                        type: 'blog' as const,
                        slug: p.slug,
                    }))
                );
                if (page >= (res.totalPages ?? 1)) break;
                page++;
            }
        } catch { /* silently skip */ }

        // ── Listings: paginate through all pages ──
        let listingPages: PageDef[] = [];
        try {
            let page = 1;
            while (true) {
                const res = await fetch(
                    `/api/listings?perPage=50&page=${page}${siteParamL}`
                ).then(r => r.json());
                const rows: any[] = res.data || [];
                listingPages = listingPages.concat(
                    rows.map((p: any) => ({
                        path: `/jobs/${p.slug}`,
                        label: p.title,
                        icon: 'ti-briefcase',
                        type: 'listing' as const,
                        slug: p.slug,
                    }))
                );
                if (page >= (res.totalPages ?? 1)) break;
                page++;
            }
        } catch { /* silently skip */ }

        setDynamicPages(prev => ({ ...prev, [siteId]: { blog: blogPages, listing: listingPages } }));
        setLoadingDynamic(prev => ({ ...prev, [siteId]: false }));
    }, [dynamicPages, loadingDynamic]);

    // ── Toggle site open/close ────────────────────────────────────────────────
    const toggleSite = (siteId: string) => {
        if (openSiteId === siteId) {
            setOpenSiteId(null);
        } else {
            setOpenSiteId(siteId);
            fetchDynamic(siteId);
        }
    };

    // ── Inherited metadata resolution ─────────────────────────────────────────
    // Priority: exact match → global path match → site wildcard → global wildcard
    const getInherited = (siteId: string, path: string): Partial<MetadataItem> => {
        return (
            metaStore[metaKey('*', path)] ||
            metaStore[metaKey(siteId, '*')] ||
            metaStore[metaKey('*', '*')] ||
            {}
        );
    };

    // ── Select a page ─────────────────────────────────────────────────────────
    const selectPage = (siteId: string, page: PageDef) => {
        setSelectedPage({ siteId, page });
        const existing = metaStore[metaKey(siteId, page.path)];
        const inherited = getInherited(siteId, page.path);
        setFormData(existing ? { ...existing } : {
            title: '',
            description: '',
            keywords: '',
            logo: inherited.logo || '',
            logoAlt: inherited.logoAlt || '',
            logoTitle: inherited.logoTitle || '',
            ogTitle: '',
            ogDescription: '',
            ogImage: inherited.ogImage || '',
            ogImageAlt: '',
            ogImageTitle: '',
            canonicalUrl: '',
            robots: 'index, follow',
            isActive: true,
        });
        setLogoFile(null);
        setOgImageFile(null);
        setSaveOk(false);
    };

    // ── Form field change ─────────────────────────────────────────────────────
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    // ── Save metadata ─────────────────────────────────────────────────────────
    const handleSave = async (publish?: boolean) => {
        if (!selectedPage) return;
        setSaving(true);
        try {
            const { siteId, page } = selectedPage;
            const existing = metaStore[metaKey(siteId, page.path)];

            const data = new FormData();
            const payload = {
                ...formData,
                siteId,
                urlPattern: page.path,
                isActive: publish ? true : (formData.isActive ?? true),
            };

            Object.entries(payload).forEach(([k, v]) => {
                if (v !== undefined && v !== null) {
                    data.append(k, k === 'isActive' ? (v ? 'on' : 'off') : String(v));
                }
            });

            if (logoFile) data.append('logoFile', logoFile);
            if (ogImageFile) data.append('ogImageFile', ogImageFile);

            const url = existing?.id
                ? `/api/admin/metadata/${existing.id}`
                : '/api/admin/metadata';
            const method = existing?.id ? 'PUT' : 'POST';

            const res = await fetch(url, { method, body: data });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Save failed');
            }
            const json = await res.json();
            const saved: MetadataItem = json.data || json;

            setMetaStore(prev => ({
                ...prev,
                [metaKey(siteId, page.path)]: saved,
            }));
            setFormData({ ...saved });
            setSaveOk(true);
            setTimeout(() => setSaveOk(false), 2000);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Delete metadata ───────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!selectedPage) return;
        const { siteId, page } = selectedPage;
        const existing = metaStore[metaKey(siteId, page.path)];
        if (!existing?.id) return;
        if (!confirm('Remove metadata for this page? It will fall back to inherited values.')) return;
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

    // ─────────────────────────────────────────────────────────────────────────
    // Render helpers
    // ─────────────────────────────────────────────────────────────────────────

    const renderSiteRow = (site: SiteDef) => {
        const isOpen = openSiteId === site.id;
        const staticPages = STATIC_PAGES[site.id] || STATIC_PAGES['*'] || [];
        const dynamic = dynamicPages[site.id];
        const isLoadingDyn = loadingDynamic[site.id];

        return (
            <div key={site.id}>
                {/* Site header */}
                <div
                    className={`site-row ${isOpen ? 'site-row--open' : ''}`}
                    onClick={() => toggleSite(site.id)}
                >
                    <span className={`site-dot ${site.id === '*' ? 'site-dot--global' : ''}`} />
                    <span className="site-row__name">{site.label}</span>
                    {/* Refresh button — only when open and already loaded */}
                    {isOpen && dynamic && !isLoadingDyn && (
                        <button
                            className="site-row__refresh"
                            title="Reload dynamic pages"
                            onClick={e => {
                                e.stopPropagation();
                                setDynamicPages(prev => {
                                    const next = { ...prev };
                                    delete next[site.id];
                                    return next;
                                });
                                // triggers fetchDynamic on next render via useEffect below
                                setTimeout(() => fetchDynamic(site.id), 0);
                            }}
                        >
                            <i className="ti ti-refresh" />
                        </button>
                    )}
                    <i className={`ti ti-chevron-down site-row__chevron ${isOpen ? 'site-row__chevron--open' : ''}`} />
                </div>

                {/* Pages tree */}
                {isOpen && (
                    <div className="pages-group">
                        {/* Static pages */}
                        <div className="page-category">Static pages</div>
                        {staticPages.map(page => renderPageRow(site.id, page))}

                        {/* Dynamic: loading */}
                        {isLoadingDyn && (
                            <>
                                <div className="page-category" style={{ marginTop: 8 }}>Blog posts</div>
                                <div className="page-loading"><i className="ti ti-loader-2 spin" />Fetching blog posts…</div>
                                <div className="page-category" style={{ marginTop: 8 }}>Job listings</div>
                                <div className="page-loading"><i className="ti ti-loader-2 spin" />Fetching listings…</div>
                            </>
                        )}

                        {/* Dynamic: blog */}
                        {dynamic?.blog && dynamic.blog.length > 0 && (
                            <>
                                <div className="page-category">
                                    Blog posts
                                    <span className="category-count">{dynamic.blog.length}</span>
                                </div>
                                {dynamic.blog.map(page => renderPageRow(site.id, page))}
                            </>
                        )}
                        {dynamic && dynamic.blog.length === 0 && !isLoadingDyn && (
                            <>
                                <div className="page-category">Blog posts</div>
                                <div className="page-empty">No blog posts found</div>
                            </>
                        )}

                        {/* Dynamic: listings */}
                        {dynamic?.listing && dynamic.listing.length > 0 && (
                            <>
                                <div className="page-category">
                                    Job listings
                                    <span className="category-count">{dynamic.listing.length}</span>
                                </div>
                                {dynamic.listing.map(page => renderPageRow(site.id, page))}
                            </>
                        )}
                        {dynamic && dynamic.listing.length === 0 && !isLoadingDyn && (
                            <>
                                <div className="page-category">Job listings</div>
                                <div className="page-empty">No listings found</div>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderPageRow = (siteId: string, page: PageDef) => {
        const isActive = selectedPage?.siteId === siteId && selectedPage?.page.path === page.path;
        const hasMeta = !!metaStore[metaKey(siteId, page.path)];

        return (
            <div
                key={`${siteId}::${page.path}`}
                className={`page-row ${isActive ? 'page-row--active' : ''}`}
                onClick={e => { e.stopPropagation(); selectPage(siteId, page); }}
            >
                <i className={`ti ${page.icon} page-row__icon`} />
                <span className="page-row__label">{page.label}</span>
                <span className={`page-badge ${hasMeta ? 'page-badge--set' : ''}`}>
                    {hasMeta ? 'Set' : 'Inherit'}
                </span>
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Form panel
    // ─────────────────────────────────────────────────────────────────────────

    const renderForm = () => {
        if (!selectedPage) {
            return (
                <div className="panel-empty">
                    <i className="ti ti-map-2" />
                    <p>Select a site, then click a page to edit its metadata</p>
                </div>
            );
        }

        const { siteId, page } = selectedPage;
        const site = SITES.find(s => s.id === siteId);
        const existing = metaStore[metaKey(siteId, page.path)];
        const inherited = getInherited(siteId, page.path);
        const hasInherited = Object.values(inherited).some(v => !!v);

        const inh = (field: keyof MetadataItem) =>
            !formData[field] && inherited[field]
                ? <span className="inherit-hint"><i className="ti ti-git-merge" />Inheriting: {String(inherited[field]).slice(0, 50)}{String(inherited[field]).length > 50 ? '…' : ''}</span>
                : null;

        return (
            <>
                {/* Form header */}
                <div className="form-header">
                    <div className="">
                        <i className="ti ti-sitemap" />
                        <span className="breadcrumb__site">{site?.label}</span>
                        <span className="breadcrumb__sep">/</span>
                        <span className="breadcrumb__page">{page.label}</span>
                        <span className="breadcrumb__sep">·</span>
                        <code className="breadcrumb__path">{page.path}</code>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {existing
                            ? <span className="status-pill status-pill--set">Saved</span>
                            : <span className="status-pill">Not set</span>
                        }
                    </div>
                </div>

                {/* Inheritance notice */}
                {hasInherited && (
                    <div className="inherit-banner">
                        <i className="ti ti-git-merge" />
                        <span>
                            Blank fields will inherit from{' '}
                            <strong>{siteId === '*' ? 'global defaults' : 'global / site defaults'}</strong>.
                            Hints shown below each field.
                        </span>
                    </div>
                )}

                {/* Form body */}
                <div className="form-body">

                    {/* Section: Page basics */}
                    <div className="form-section">
                        <div className="form-section__label">
                            <i className="ti ti-file-info" />Page basics
                        </div>
                        <div className="field-grid field-grid--1">
                            <div className="field">
                                <label>Page title <span className="req">*</span></label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title || ''}
                                    placeholder={inherited.title ? `Inherits: ${inherited.title}` : 'e.g. Home | Site Name'}
                                    onChange={handleChange}
                                />
                                {inh('title')}
                            </div>
                        </div>
                        <div className="field-grid field-grid--1">
                            <div className="field">
                                <label>Meta description <span className="req">*</span></label>
                                <textarea
                                    name="description"
                                    value={formData.description || ''}
                                    placeholder={inherited.description ? `Inherits: ${inherited.description.slice(0, 80)}…` : 'Brief description for search engines'}
                                    onChange={handleChange}
                                    rows={3}
                                />
                                {inh('description')}
                            </div>
                        </div>
                        <div className="field-grid field-grid--1">
                            <div className="field">
                                <label>Keywords</label>
                                <input
                                    type="text"
                                    name="keywords"
                                    value={formData.keywords || ''}
                                    placeholder={inherited.keywords ? `Inherits: ${inherited.keywords}` : 'comma, separated, keywords'}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Logo */}
                    <div className="form-section">
                        <div className="form-section__label">
                            <i className="ti ti-photo" />Logo
                        </div>
                        <div className="field-grid field-grid--1">
                            <div className="field">
                                <label>Logo URL</label>
                                <div className="logo-row">
                                    {(formData.logo || logoFile) && (
                                        <img
                                            src={logoFile ? URL.createObjectURL(logoFile) : formData.logo}
                                            alt="logo preview"
                                            className="logo-preview"
                                        />
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="url"
                                            name="logo"
                                            value={formData.logo || ''}
                                            placeholder={inherited.logo ? `Inherits: ${inherited.logo}` : 'https://…/logo.png or upload below'}
                                            onChange={handleChange}
                                        />
                                        <input
                                            type="file"
                                            ref={logoRef}
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={e => {
                                                const f = e.target.files?.[0] || null;
                                                setLogoFile(f);
                                                if (f) setFormData(prev => ({ ...prev, logo: '' }));
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="btn-upload"
                                            onClick={() => logoRef.current?.click()}
                                        >
                                            <i className="ti ti-upload" />Upload file
                                        </button>
                                        {logoFile && (
                                            <span className="file-name">{logoFile.name}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="field-grid field-grid--2">
                            <div className="field">
                                <label>Alt text</label>
                                <input type="text" name="logoAlt" value={formData.logoAlt || ''} placeholder={inherited.logoAlt || ''} onChange={handleChange} />
                            </div>
                            <div className="field">
                                <label>Title text</label>
                                <input type="text" name="logoTitle" value={formData.logoTitle || ''} placeholder={inherited.logoTitle || ''} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    {/* Section: Open Graph */}
                    <div className="form-section">
                        <div className="form-section__label">
                            <i className="ti ti-share" />Open graph
                        </div>
                        <div className="field-grid field-grid--2">
                            <div className="field">
                                <label>OG title</label>
                                <input
                                    type="text"
                                    name="ogTitle"
                                    value={formData.ogTitle || ''}
                                    placeholder={inherited.ogTitle || formData.title || 'Same as title'}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="field">
                                <label>OG description</label>
                                <input
                                    type="text"
                                    name="ogDescription"
                                    value={formData.ogDescription || ''}
                                    placeholder={inherited.ogDescription || 'Same as meta description'}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className="field-grid field-grid--1" style={{ marginTop: 8 }}>
                            <div className="field">
                                <label>OG image</label>
                                <div className="logo-row">
                                    {(formData.ogImage || ogImageFile) && (
                                        <img
                                            src={ogImageFile ? URL.createObjectURL(ogImageFile) : formData.ogImage}
                                            alt="og preview"
                                            className="logo-preview"
                                        />
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="url"
                                            name="ogImage"
                                            value={formData.ogImage || ''}
                                            placeholder={inherited.ogImage || 'https://…/og.jpg'}
                                            onChange={handleChange}
                                        />
                                        <input
                                            type="file"
                                            ref={ogImageRef}
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={e => {
                                                const f = e.target.files?.[0] || null;
                                                setOgImageFile(f);
                                                if (f) setFormData(prev => ({ ...prev, ogImage: '' }));
                                            }}
                                        />
                                        <button type="button" className="btn-upload" onClick={() => ogImageRef.current?.click()}>
                                            <i className="ti ti-upload" />Upload file
                                        </button>
                                        {ogImageFile && <span className="file-name">{ogImageFile.name}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="field-grid field-grid--2" style={{ marginTop: 8 }}>
                            <div className="field">
                                <label>OG image alt</label>
                                <input type="text" name="ogImageAlt" value={formData.ogImageAlt || ''} onChange={handleChange} />
                            </div>
                            <div className="field">
                                <label>OG image title</label>
                                <input type="text" name="ogImageTitle" value={formData.ogImageTitle || ''} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    {/* Section: Technical */}
                    <div className="form-section">
                        <div className="form-section__label">
                            <i className="ti ti-settings" />Technical
                        </div>
                        <div className="field-grid field-grid--2">
                            <div className="field">
                                <label>Canonical URL</label>
                                <input
                                    type="url"
                                    name="canonicalUrl"
                                    value={formData.canonicalUrl || ''}
                                    placeholder={inherited.canonicalUrl || `https://…${page.path}`}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="field">
                                <label>Robots</label>
                                <input
                                    type="text"
                                    name="robots"
                                    value={formData.robots || ''}
                                    placeholder={inherited.robots || 'index, follow'}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Form footer */}
                <div className="form-footer">
                    <div className="active-toggle">
                        <input
                            type="checkbox"
                            id="chk-active"
                            name="isActive"
                            checked={!!formData.isActive}
                            onChange={handleChange}
                            className="form-check-input"
                        />
                        <label htmlFor="chk-active">Active</label>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {existing?.id && (
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting
                                    ? <span className="spinner-border spinner-border-sm" />
                                    : <i className="ti ti-trash" />}
                                Clear
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleSave(false)}
                            disabled={saving}
                        >
                            {saving && !saveOk ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                            Save draft
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${saveOk ? 'btn-success' : 'btn-primary'}`}
                            onClick={() => handleSave(true)}
                            disabled={saving}
                        >
                            {saving
                                ? <span className="spinner-border spinner-border-sm me-1" />
                                : saveOk
                                    ? <i className="ti ti-check me-1" />
                                    : <i className="ti ti-device-floppy me-1" />}
                            {saveOk ? 'Saved!' : 'Save & activate'}
                        </button>
                    </div>
                </div>
            </>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Root render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="mpa-root">
            <div className="mpa-header">
                <div>
                    <h4 className="mb-0 fw-semibold">Metadata Management</h4>
                    <p className="text-muted small mb-0">Browse sites and pages — click any page to set its SEO metadata</p>
                </div>
            </div>

            <div className="mpa-shell">
                {/* ── Sidebar ── */}
                <div className="mpa-sidebar">
                    <div className="mpa-sidebar__header">
                        <i className="ti ti-sitemap" style={{ fontSize: 15, color: '#534AB7' }} />
                        <span>Sites</span>
                    </div>
                    {loadingMeta && (
                        <div className="px-3 py-2 text-muted small d-flex align-items-center gap-2">
                            <span className="spinner-border spinner-border-sm" />Loading…
                        </div>
                    )}
                    {SITES.map(site => renderSiteRow(site))}
                </div>

                {/* ── Main panel ── */}
                <div className="mpa-main">
                    {renderForm()}
                </div>
            </div>
        </div>
    );
}