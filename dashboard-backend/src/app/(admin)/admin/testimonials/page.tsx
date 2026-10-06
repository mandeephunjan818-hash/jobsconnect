'use client';

import { useState, useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { KNOWN_SITES } from '@/lib/sites';
import getLocalImageUrl from '@/utils/ChangeImageUrl';

// TinyMCE configuration (unchanged)
const tinymceConfig = {
    height: 200,
    menubar: false,
    plugins: [
        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
    ],
    toolbar:
        'undo redo | blocks | ' +
        'bold italic forecolor | alignleft aligncenter ' +
        'alignright alignjustify | bullist numlist outdent indent | ' +
        'removeformat | help',
    content_style:
        'body { font-family: system-ui, -apple-system, sans-serif; font-size:14px; color: #212529; }',
};

// ✅ Updated interface – now uses `sites` array
interface TestimonialItem {
    id: string;
    name: string;
    role: string;
    text: string;
    rating: number;
    imageUrl?: string;
    order: number;
    sites: string[];
}

interface ApiResponse {
    data: TestimonialItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

// ImageUploader component (unchanged)
interface ImageUploaderProps {
    label: string;
    currentImageUrl?: string;
    onFileSelect: (file: File | null) => void;
    onUrlChange?: (url: string) => void;
    allowUrl?: boolean;
}

function ImageUploader({ label, currentImageUrl, onFileSelect, onUrlChange, allowUrl = true }: ImageUploaderProps) {
    const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
    const [urlInput, setUrlInput] = useState(currentImageUrl || '');
    const [useUrl, setUseUrl] = useState(!!currentImageUrl && !currentImageUrl.startsWith('blob:'));
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
                setUseUrl(false);
                onFileSelect(file);
                if (onUrlChange) onUrlChange('');
            };
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
            onFileSelect(null);
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setUrlInput(url);
        setPreview(url);
        if (onUrlChange) onUrlChange(url);
        onFileSelect(null);
    };

    const handleRemove = () => {
        setPreview(null);
        setUrlInput('');
        onFileSelect(null);
        if (onUrlChange) onUrlChange('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="image-uploader mb-2">
            {label && <label className="form-label small fw-semibold">{label}</label>}
            <div className="d-flex align-items-start gap-2">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="preview-box border rounded-3 d-flex align-items-center justify-content-center bg-light"
                    style={{
                        width: '70px',
                        height: '70px',
                        cursor: 'pointer',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundImage: preview ? `url(${preview})` : 'none',
                    }}
                >
                    {!preview && <i className="ti ti-photo text-muted" style={{ fontSize: '1.5rem' }}></i>}
                </div>
                <div className="flex-grow-1 d-none ">
                    <input type="file" ref={fileInputRef} className="d-none" accept="image/*" onChange={handleFileChange} />
                    {allowUrl && (
                        <>
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-white border-end-0">
                                    <i className="ti ti-link text-muted"></i>
                                </span>
                                <input
                                    type="url"
                                    className="form-control form-control-sm border-start-0"
                                    placeholder="Or enter image URL"
                                    value={getLocalImageUrl(urlInput)}
                                    onChange={handleUrlChange}
                                    disabled={!!preview && !useUrl}
                                />
                            </div>
                            <small className="text-muted d-block mt-1">Upload or provide URL</small>
                        </>
                    )}
                    {preview && (
                        <button type="button" className="btn btn-sm btn-outline-danger mt-1 py-0" onClick={handleRemove}>
                            <i className="ti ti-trash me-1"></i>Remove
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Skeleton row (still 8 columns)
function SkeletonRow() {
    return (
        <tr>
            <td><div className="skeleton skeleton--text" style={{ width: 120, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 100, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 200, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 80, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 40, height: 40 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 60, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 60, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 80, height: 20 }} /></td>
        </tr>
    );
}

export default function TestimonialsAdminPage() {
    const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<TestimonialItem | null>(null);

    // ✅ Form state – default sites as array
    const [formData, setFormData] = useState<Partial<TestimonialItem>>({
        name: '',
        role: '',
        text: '',
        rating: 5,
        imageUrl: '',
        order: 0,
        sites: ['*'],
    });
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [ratingFilter, setRatingFilter] = useState<number | ''>('');
    const [siteFilter, setSiteFilter] = useState('');
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [mobileOpen, setMobileOpen] = useState(false);

    const fetchTestimonials = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (ratingFilter !== '') params.set('rating', String(ratingFilter));
            if (siteFilter) params.set('siteId', siteFilter);
            params.set('page', String(page));
            params.set('perPage', String(perPage));

            const res = await fetch(`/api/testimonials?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json: ApiResponse = await res.json();
            setTestimonials(json.data);
            setTotal(json.total);
            setTotalPages(json.totalPages);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTestimonials();
    }, [page, search, ratingFilter, siteFilter]);

    // ✅ Toggle sites in the multi‑select
    const toggleSite = (site: string) => {
        setFormData(prev => {
            const current = prev.sites ?? ['*'];
            if (site === '*') {
                // Selecting 'All' clears all specific sites
                return { ...prev, sites: ['*'] };
            }
            let newSites = current.filter(s => s !== '*');
            if (newSites.includes(site)) {
                newSites = newSites.filter(s => s !== site);
            } else {
                newSites = [...newSites, site];
            }
            if (newSites.length === 0) newSites = ['*']; // revert to global if nothing selected
            return { ...prev, sites: newSites };
        });
    };

    const handleOpenModal = (item?: TestimonialItem) => {
        if (item) {
            setEditingItem(item);
            setFormData(item);    // includes sites array
            setImageFile(null);
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                role: '',
                text: '',
                rating: 5,
                imageUrl: '',
                sites: ['*'],
                order: testimonials.length + 1,
            });
            setImageFile(null);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingItem(null);
    };

    // Standard input change – skip 'sites' (handled by toggleSite)
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'sites') return; // ignore, handled separately
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data = new FormData();
        // Append all fields except 'sites'
        Object.entries(formData).forEach(([key, value]) => {
            if (key !== 'sites' && value !== undefined && value !== null) {
                data.append(key, String(value));
            }
        });
        // Send sites as JSON string (API expects JSON)
        data.append('sites', JSON.stringify(formData.sites || ['*']));

        if (imageFile) data.append('imageFile', imageFile);

        try {
            const url = editingItem
                ? `/api/testimonials/${editingItem.id}`
                : '/api/testimonials';
            const method = editingItem ? 'PUT' : 'POST';

            const res = await fetch(url, { method, body: data });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }
            await fetchTestimonials();
            handleCloseModal();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this testimonial?')) return;
        try {
            const res = await fetch(`/api/testimonials/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            await fetchTestimonials();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const applyFilters = () => {
        setPage(1);
        fetchTestimonials();
    };

    const clearFilters = () => {
        setSearch('');
        setRatingFilter('');
        setSiteFilter('');
        setPage(1);
    };

    const renderStars = (rating: number) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

    return (
        <div className="container-fluid py-4">
            {/* Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-start mb-4 p-3 bg-white border-bottom shadow-sm gap-3">
                <div>
                    <h4 className="mb-1 fw-semibold">Testimonials Management</h4>
                    <p className="text-muted small mb-0">Manage customer testimonials</p>
                </div>

                <div className="d-flex flex-wrap gap-2 align-items-center">
                    <button className="btn btn-sm btn-primary" onClick={() => handleOpenModal()}>
                        <i className="ti ti-plus me-1"></i>Add Testimonial
                    </button>
                </div>

                {/* Filter bar – site filter unchanged (API still uses siteId parameter) */}
                <div className="ulp-filters bg-white rounded-3 p-2 border w-100 mt-2" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <button className="btn btn-sm w-100 d-flex d-md-none align-items-center justify-content-between border-0 bg-transparent px-1"
                        style={{ fontSize: 13 }} onClick={() => setMobileOpen(o => !o)}>
                        <span className="d-flex align-items-center gap-2 fw-semibold text-dark">
                            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14 }}></i>Filters
                        </span>
                        <span className="d-flex align-items-center gap-2 text-secondary" style={{ fontSize: 12 }}>
                            {((search ? 1 : 0) + (ratingFilter ? 1 : 0) + (siteFilter ? 1 : 0)) > 0 && (
                                <span className="badge rounded-pill" style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 10 }}>
                                    {(search ? 1 : 0) + (ratingFilter ? 1 : 0) + (siteFilter ? 1 : 0)}
                                </span>
                            )}
                            <i className="ti ti-chevron-down" style={{ fontSize: 14, transition: 'transform 0.2s', transform: mobileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        </span>
                    </button>

                    <div className={`d-md-flex align-items-center flex-wrap gap-2 ${mobileOpen ? 'd-flex' : 'd-none'}`}>
                        {/* Search */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                            <i className="ti ti-search text-secondary" style={{ fontSize: 13 }}></i>
                            <input type="text" className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 160, fontSize: 12, outline: 'none' }} placeholder="Search testimonials…"
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>

                        {/* Rating filter */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                            <i className="ti ti-star text-secondary" style={{ fontSize: 13 }}></i>
                            <select className="border-0 bg-transparent p-0 shadow-none" style={{ fontSize: 12, outline: 'none', width: 110, height: '100%' }}
                                value={ratingFilter} onChange={e => setRatingFilter(e.target.value ? parseInt(e.target.value) : '')}>
                                <option value="">All ratings</option>
                                <option value="5">5 Stars</option>
                                <option value="4">4 Stars</option>
                                <option value="3">3 Stars</option>
                                <option value="2">2 Stars</option>
                                <option value="1">1 Star</option>
                            </select>
                        </div>

                        {/* Site filter */}
                        <div className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}>
                            <i className="ti ti-world text-secondary" style={{ fontSize: 13 }}></i>
                            <select className="border-0 bg-transparent p-0 shadow-none" style={{ fontSize: 12, outline: 'none', width: 120, height: '100%' }}
                                value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
                                <option value="">All sites</option>
                                <option value="*">Global (*)</option>
                                {KNOWN_SITES.map(site => (
                                    <option key={site} value={site}>{site}</option>
                                ))}
                            </select>
                        </div>

                        <button className="btn btn-sm d-flex align-items-center gap-1"
                            style={{ fontSize: 12, height: 32, border: '1px solid #534AB7', borderRadius: 6, background: 'transparent', color: '#534AB7' }}
                            onClick={applyFilters}>
                            <i className="ti ti-filter" style={{ fontSize: 12 }}></i> Apply
                        </button>

                        {((search ? 1 : 0) + (ratingFilter ? 1 : 0) + (siteFilter ? 1 : 0)) > 0 && (
                            <button className="btn btn-sm border d-flex align-items-center gap-1 text-secondary"
                                style={{ fontSize: 12, height: 32, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6 }}
                                onClick={clearFilters}>
                                <i className="ti ti-x" style={{ fontSize: 12 }}></i>Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center gap-3">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-outline-danger" onClick={fetchTestimonials}>Retry</button>
                </div>
            )}

            {/* Table */}
            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-header-custom">
                                <tr>
                                    <th className="py-3">Name</th>
                                    <th className="py-3">Role</th>
                                    <th className="py-3">Text</th>
                                    <th className="py-3">Rating</th>
                                    <th className="py-3">Image</th>
                                    <th className="py-3">Sites</th>   {/* ✅ plural */}
                                    <th className="py-3">Order</th>
                                    <th className="py-3 text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: perPage }).map((_, i) => <SkeletonRow key={i} />)
                                ) : testimonials.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-5">
                                            <div className="text-muted">
                                                <i className="ti ti-file-unknown fs-1 mb-3 d-block"></i>
                                                <h5>No testimonials found</h5>
                                                <p>Try adjusting your filters or click "Add Testimonial".</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    testimonials.map((item) => (
                                        <tr key={item.id} className="border-bottom">
                                            <td className="fw-medium small">{item.name}</td>
                                            <td className="small">{item.role}</td>
                                            <td className="small" dangerouslySetInnerHTML={{ __html: item.text.substring(0, 100) + '...' }} />
                                            <td><span className="text-warning">{renderStars(item.rating)}</span></td>
                                            <td>
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt={item.name} style={{ width: 40, height: 40, objectFit: 'cover' }} className="rounded-circle shadow-sm" />
                                                ) : '—'}
                                            </td>
                                            {/* ✅ Display multiple site badges */}
                                            <td>
                                                {item.sites?.includes('*') ? (
                                                    <span className="badge bg-secondary text-black">All</span>
                                                ) : (
                                                    item.sites?.map(site => (
                                                        <span key={site} className="badge bg-primary text-white me-1">{site}</span>
                                                    ))
                                                )}
                                            </td>
                                            <td>{item.order}</td>
                                            <td className="text-end">
                                                <button className="action-btn" onClick={() => handleOpenModal(item)}>
                                                    <i className="ti ti-edit"></i>
                                                </button>
                                                <button className="action-btn" onClick={() => handleDelete(item.id)}>
                                                    <i className="ti ti-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="card-footer bg-white d-flex justify-content-between align-items-center py-2">
                        <div className="small text-muted">Showing {testimonials.length} of {total} entries</div>
                        <nav aria-label="Page navigation">
                            <ul className="pagination pagination-sm mb-0">
                                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</button>
                                </li>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (page <= 3) pageNum = i + 1;
                                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = page - 2 + i;
                                    return (
                                        <li key={pageNum} className={`page-item ${page === pageNum ? 'active' : ''}`}>
                                            <button className="page-link" onClick={() => setPage(pageNum)}>{pageNum}</button>
                                        </li>
                                    );
                                })}
                                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(page + 1)} disabled={page === totalPages}>Next</button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>

            {/* ✅ Modal – Multi‑site checkboxes */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered overflow-auto modal-lg">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light border-bottom py-2">
                                <h5 className="modal-title">
                                    <i className={`ti ${editingItem ? 'ti-edit' : 'ti-plus'} me-2`}></i>
                                    {editingItem ? 'Edit Testimonial' : 'Create Testimonial'}
                                </h5>
                                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-3">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label small fw-medium">Name <span className="text-danger">*</span></label>
                                            <input type="text" className="form-control form-control-sm" name="name" value={formData.name} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-medium">Role <span className="text-danger">*</span></label>
                                            <input type="text" className="form-control form-control-sm" name="role" value={formData.role} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-medium">Rating <span className="text-danger">*</span></label>
                                            <select className="form-select form-select-sm" name="rating" value={formData.rating} onChange={handleChange} required>
                                                <option value="5">5 Stars</option>
                                                <option value="4">4 Stars</option>
                                                <option value="3">3 Stars</option>
                                                <option value="2">2 Stars</option>
                                                <option value="1">1 Star</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-medium">Order <span className="text-danger">*</span></label>
                                            <input type="number" className="form-control form-control-sm" name="order" value={formData.order} onChange={handleChange} min="1" required />
                                        </div>

                                        {/* ✅ Multi‑site checkboxes */}
                                        <div className="col-12">
                                            <label className="form-label small fw-medium">Sites <span className="text-danger">*</span></label>
                                            <div className="d-flex flex-wrap gap-2">
                                                <label className="form-check form-check-inline">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        checked={(formData.sites ?? []).includes('*')}
                                                        onChange={() => toggleSite('*')}
                                                    />
                                                    <span className="form-check-label small">All Sites (Global)</span>
                                                </label>
                                                {KNOWN_SITES.map(site => (
                                                    <label key={site} className="form-check form-check-inline">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            checked={(formData.sites ?? []).includes(site)}
                                                            onChange={() => toggleSite(site)}
                                                        />
                                                        <span className="form-check-label small">{site}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <small className="text-muted">Select where this testimonial appears. "All Sites" makes it global.</small>
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label small fw-medium">Testimonial Text <span className="text-danger">*</span></label>
                                            <Editor
                                                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                                                init={tinymceConfig}
                                                value={formData.text || ''}
                                                onEditorChange={(content) => setFormData(prev => ({ ...prev, text: content }))}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <ImageUploader
                                                label="Avatar Image (optional)"
                                                currentImageUrl={formData.imageUrl}
                                                onFileSelect={setImageFile}
                                                onUrlChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light border-0 py-2">
                                    <button type="button" className="btn btn-sm btn-secondary" onClick={handleCloseModal}>Cancel</button>
                                    <button type="submit" className="btn btn-sm btn-primary">{editingItem ? 'Update' : 'Create'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .filter-panel {
                    background: linear-gradient(to right, #f8faff, #ffffff);
                    border-left: 3px solid var(--bs-primary) !important;
                }
                .table-header-custom th {
                    background-color: #f2f5f9;
                    color: #1e293b;
                    font-weight: 400;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    border-bottom: 2px solid var(--bs-primary) !important;
                    padding: 0.75rem;
                }
                .preview-box {
                    transition: all 0.2s ease;
                    border: 2px dashed #dee2e6 !important;
                }
                .preview-box:hover {
                    border-color: var(--bs-primary) !important;
                    background-color: #f8f9fa;
                }
            `}</style>
        </div>
    );
}