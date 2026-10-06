'use client';

import { useState, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { KNOWN_SITES } from '@/lib/sites'; // safe to import on client

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
        'body { font-family: system-ui, -apple-system, sans-serif; font-size:14px; color: #212529; }'
};

interface FaqItem {
    id: string;
    question: string;
    answer: string;
    order: number;
    sites: string[]; // ✅ now an array
}

interface ApiResponse {
    data: FaqItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

function SkeletonRow() {
    return (
        <tr>
            <td><div className="skeleton skeleton--text" style={{ width: 200, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 300, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 100, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 50, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 80, height: 20 }} /></td>
        </tr>
    );
}

export default function FaqAdminPage() {
    const [faqs, setFaqs] = useState<FaqItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<FaqItem | null>(null);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Form state – default sites to global
    const [formData, setFormData] = useState<Partial<FaqItem>>({
        question: '',
        answer: '',
        order: 0,
        sites: ['*']
    });

    // Filters
    const [search, setSearch] = useState('');
    const [siteFilter, setSiteFilter] = useState(''); // new filter
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const fetchFaqs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (siteFilter) params.set('siteId', siteFilter);
            params.set('page', String(page));
            params.set('perPage', String(perPage));

            const res = await fetch(`/api/faq?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json: ApiResponse = await res.json();
            setFaqs(json.data);
            setTotal(json.total);
            setTotalPages(json.totalPages);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFaqs();
    }, [page, search, siteFilter]);

    // Toggle sites in the multi‑select
    const toggleSite = (site: string) => {
        setFormData(prev => {
            const current = prev.sites ?? ['*'];
            if (site === '*') {
                return { ...prev, sites: ['*'] };
            }
            let newSites = current.filter(s => s !== '*');
            if (newSites.includes(site)) {
                newSites = newSites.filter(s => s !== site);
            } else {
                newSites = [...newSites, site];
            }
            if (newSites.length === 0) newSites = ['*'];
            return { ...prev, sites: newSites };
        });
    };

    const handleOpenModal = (item?: FaqItem) => {
        if (item) {
            setEditingItem(item);
            setFormData(item);
        } else {
            setEditingItem(null);
            setFormData({
                question: '',
                answer: '',
                order: faqs.length + 1,
                sites: ['*']
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingItem(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'sites') return; // handled separately
        setFormData(prev => ({ ...prev, [name]: name === 'order' ? parseInt(value) || 0 : value }));
        
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (key !== 'sites' && value !== undefined && value !== null) {
                data.append(key, String(value));
            }
        });
        data.append('sites', JSON.stringify(formData.sites || ['*']));

        try {
            const url = editingItem ? `/api/faq/${editingItem.id}` : '/api/faq';
            const method = editingItem ? 'PUT' : 'POST';

            const res = await fetch(url, { method, body: data });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }

            await fetchFaqs();
            handleCloseModal();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this FAQ?')) return;
        try {
            const res = await fetch(`/api/faq/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            await fetchFaqs();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const applyFilters = () => {
        setPage(1);
        fetchFaqs();
    };

    const clearFilters = () => {
        setSearch('');
        setSiteFilter('');
        setPage(1);
    };

    return (
        <div className="container-fluid py-4">
            {/* Header & Filters */}
            <div className="d-flex flex-wrap justify-content-between align-items-start mb-4 p-3 bg-white border-bottom shadow-sm gap-3">
                <div>
                    <h4 className="mb-1 fw-semibold">FAQ Management</h4>
                    <p className="text-muted small mb-0">Manage frequently asked questions</p>
                </div>

                <div className="d-flex flex-wrap gap-2 align-items-center">
                    <button className="btn btn-sm btn-primary" onClick={() => handleOpenModal()}>
                        <i className="ti ti-plus me-1"></i>Add FAQ
                    </button>
                </div>

                {/* Filter bar – includes site filter */}
                <div className="ulp-filters bg-white rounded-3 p-2 border w-100 mt-2" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <button className="btn btn-sm w-100 d-flex d-md-none align-items-center justify-content-between border-0 bg-transparent px-1"
                        style={{ fontSize: 13 }} onClick={() => setMobileOpen(o => !o)}>
                        <span className="d-flex align-items-center gap-2 fw-semibold text-dark">
                            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14 }}></i>Filters
                        </span>
                        <span className="d-flex align-items-center gap-2 text-secondary" style={{ fontSize: 12 }}>
                            {((search ? 1 : 0) + (siteFilter ? 1 : 0)) > 0 && (
                                <span className="badge rounded-pill" style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 10 }}>
                                    {(search ? 1 : 0) + (siteFilter ? 1 : 0)}
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
                            <input
                                type="text"
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 200, fontSize: 12, outline: 'none' }}
                                placeholder="Search by question or answer…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                            />
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

                        {((search ? 1 : 0) + (siteFilter ? 1 : 0)) > 0 && (
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
                    <button className="btn btn-sm btn-outline-danger" onClick={fetchFaqs}>Retry</button>
                </div>
            )}

            {/* Table */}
            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-header-custom">
                                <tr>
                                    <th className="py-3">Question</th>
                                    <th className="py-3">Answer</th>
                                    <th className="py-3">Sites</th>        {/* new column */}
                                    <th className="py-3">Order</th>
                                    <th className="py-3 text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: perPage }).map((_, i) => <SkeletonRow key={i} />)
                                ) : faqs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-5">
                                            <div className="text-muted">
                                                <i className="ti ti-file-unknown fs-1 mb-3 d-block"></i>
                                                <h5>No FAQs found</h5>
                                                <p>Try adjusting your filters or click "Add FAQ".</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    faqs.map((item) => (
                                        <tr key={item.id} className="border-bottom">
                                            <td className="fw-medium small" dangerouslySetInnerHTML={{ __html: item.question.substring(0, 100) + (item.question.length > 100 ? '...' : '') }} />
                                            <td className="small" dangerouslySetInnerHTML={{ __html: item.answer.substring(0, 150) + (item.answer.length > 150 ? '...' : '') }} />
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
                        <div className="small text-muted">
                            Showing {faqs.length} of {total} entries
                        </div>
                        <nav aria-label="Page navigation">
                            <ul className="pagination pagination-sm mb-0">
                                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(page - 1)} disabled={page === 1}>
                                        Previous
                                    </button>
                                </li>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (page <= 3) {
                                        pageNum = i + 1;
                                    } else if (page >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = page - 2 + i;
                                    }
                                    return (
                                        <li key={pageNum} className={`page-item ${page === pageNum ? 'active' : ''}`}>
                                            <button className="page-link" onClick={() => setPage(pageNum)}>
                                                {pageNum}
                                            </button>
                                        </li>
                                    );
                                })}
                                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                                        Next
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>

            {/* Modal with multi‑site checkboxes */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered overflow-auto modal-lg">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light border-bottom py-2">
                                <h5 className="modal-title">
                                    <i className={`ti ${editingItem ? 'ti-edit' : 'ti-plus'} me-2`}></i>
                                    {editingItem ? 'Edit FAQ' : 'Create FAQ'}
                                </h5>
                                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-3">
                                    <div className="row g-3">
                                        {/* Question */}
                                        <div className="col-12">
                                            <label className="form-label small fw-medium">Question <span className="text-danger">*</span></label>
                                            <Editor
                                                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                                                init={tinymceConfig}
                                                value={formData.question || ''}
                                                onEditorChange={(content) => setFormData(prev => ({ ...prev, question: content }))}
                                            />
                                        </div>

                                        {/* Answer */}
                                        <div className="col-12">
                                            <label className="form-label small fw-medium">Answer <span className="text-danger">*</span></label>
                                            <Editor
                                                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                                                init={tinymceConfig}
                                                value={formData.answer || ''}
                                                onEditorChange={(content) => setFormData(prev => ({ ...prev, answer: content }))}
                                            />
                                        </div>

                                        {/* Order */}
                                        <div className="col-md-6">
                                            <label className="form-label small fw-medium">Order <span className="text-danger">*</span></label>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                name="order"
                                                value={formData.order}
                                                onChange={handleChange}
                                                min="1"
                                                required
                                            />
                                        </div>

                                        {/* Multi‑site selection */}
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
                                            <small className="text-muted">Select where this FAQ appears. “All Sites” makes it global.</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light border-0 py-2">
                                    <button type="button" className="btn btn-sm btn-secondary" onClick={handleCloseModal}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-sm btn-primary">
                                        {editingItem ? 'Update' : 'Create'}
                                    </button>
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
        .btn-group .btn {
          border-radius: 0;
        }
        .btn-group .btn:first-child {
          border-top-left-radius: 0.25rem;
          border-bottom-left-radius: 0.25rem;
        }
        .btn-group .btn:last-child {
          border-top-right-radius: 0.25rem;
          border-bottom-right-radius: 0.25rem;
        }
      `}</style>
        </div>
    );
}