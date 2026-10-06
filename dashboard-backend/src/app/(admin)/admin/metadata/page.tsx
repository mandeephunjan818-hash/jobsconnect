'use client';

import { useState, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';
import { KNOWN_SITES } from '@/lib/sites';
import getLocalImageUrl from '@/utils/ChangeImageUrl';

interface MetadataItem {
    id: string;
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

interface ApiResponse {
    data: MetadataItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

function SkeletonRow() {
    return (
        <tr>
            <td><div className="skeleton skeleton--text" style={{ width: 20, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 120, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 130, height: 20 }} /></td>  {/* ← ADD Site */}
            <td><div className="skeleton skeleton--text" style={{ width: 150, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 200, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 100, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 80, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 60, height: 20 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 80, height: 20 }} /></td>
        </tr>
    );
}

// Modern image uploader component
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
                {/* Preview area - click to upload */}
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
                    {!preview && (
                        <i className="ti ti-photo text-muted" style={{ fontSize: '1.5rem' }}></i>
                    )}
                </div>

                <div className="flex-grow-1">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="d-none"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
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
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger mt-1 py-0"
                            onClick={handleRemove}
                        >
                            <i className="ti ti-trash me-1"></i>Remove
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function MetadataPage() {
    const [metadata, setMetadata] = useState<MetadataItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false); // For export loading state
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MetadataItem | null>(null);
    const [siteFilter, setSiteFilter] = useState('');
    const [formData, setFormData] = useState<Partial<MetadataItem>>({
        urlPattern: '',
        siteId: '*',
        title: '',
        logo: '',
        logoAlt: '',
        logoTitle: '',
        description: '',
        keywords: '',
        ogTitle: '',
        ogDescription: '',
        ogImage: '',
        ogImageAlt: '',
        ogImageTitle: '',
        canonicalUrl: '',
        robots: 'index, follow',
        isActive: true,
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [ogImageFile, setOgImageFile] = useState<File | null>(null);

    // Filter & pagination state
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Sorting state
    const [sortColumn, setSortColumn] = useState<string>('createdAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    // Date filters
    const [createdFrom, setCreatedFrom] = useState('');
    const [createdTo, setCreatedTo] = useState('');
    const [updatedFrom, setUpdatedFrom] = useState('');
    const [updatedTo, setUpdatedTo] = useState('');
    const [imageView, setImageView] = useState({
        imageView: false,
        imageSrc: ''
    });

    // Fetch metadata with all parameters
    const fetchMetadata = async () => {
        setError(null);
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (status !== 'all') params.set('isActive', status === 'active' ? 'true' : 'false');
            params.set('page', String(page));
            params.set('perPage', String(perPage));
            if (siteFilter) params.set('siteId', siteFilter);

            // Sorting
            if (sortColumn) params.set('sortBy', sortColumn);
            params.set('sortOrder', sortDirection);

            // Date filters
            if (createdFrom) params.set('createdFrom', createdFrom);
            if (createdTo) params.set('createdTo', createdTo);
            if (updatedFrom) params.set('updatedFrom', updatedFrom);
            if (updatedTo) params.set('updatedTo', updatedTo);

            const res = await fetch(`/api/admin/metadata/[id]/?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json: ApiResponse = await res.json();
            setMetadata(json.data);
            setTotal(json.total);
            setTotalPages(json.totalPages);
            // Reset selection when data changes
            setSelectedIds([]);
            setSelectAll(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchMetadata();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [page, search, status, siteFilter, sortColumn, sortDirection, createdFrom, createdTo, updatedFrom, updatedTo]);

    // Handle column sort
    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Bulk selection handlers
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedIds([]);
        } else {
            setSelectedIds(metadata.map(item => item.id));
        }
        setSelectAll(!selectAll);
    };

    const handleSelectRow = (id: string) => {
        setSelectedIds(prev => {
            const newSet = prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id];
            // Update selectAll state based on whether all rows are selected
            setSelectAll(newSet.length === metadata.length && metadata.length > 0);
            return newSet;
        });
    };

    const handleBulkAction = async (action: 'delete' | 'activate' | 'deactivate') => {
        if (selectedIds.length === 0) {
            alert('No items selected');
            return;
        }
        if (action === 'delete' && !confirm(`Delete ${selectedIds.length} item(s)?`)) return;

        try {
            const res = await fetch('/api/admin/metadata/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ids: selectedIds }),
            });
            if (!res.ok) throw new Error('Bulk action failed');
            await fetchMetadata();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const clearFilters = () => {
        setSearch('');
        setSiteFilter('');
        setStatus('all');
        setCreatedFrom('');
        setCreatedTo('');
        setUpdatedFrom('');
        setUpdatedTo('');
        setSortColumn('createdAt');
        setSortDirection('desc');
        setPage(1);
    };

    // Modal handlers
    const handleOpenModal = (item?: MetadataItem) => {
        if (item) {
            setEditingItem(item);
            setFormData(item);
            setLogoFile(null);
            setOgImageFile(null);
        } else {
            setEditingItem(null);
            setFormData({
                urlPattern: '',
                siteId: '*',
                title: '',
                logo: '',
                logoAlt: '',
                logoTitle: '',
                description: '',
                keywords: '',
                ogTitle: '',
                ogDescription: '',
                ogImage: '',
                ogImageAlt: '',
                ogImageTitle: '',
                canonicalUrl: '',
                robots: 'index, follow',
                isActive: true,
            });
            setLogoFile(null);
            setOgImageFile(null);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingItem(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data = new FormData();

        Object.entries(formData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (key === 'isActive') {
                    data.append(key, value ? 'on' : 'off');
                } else {
                    data.append(key, String(value));
                }
            }
        });

        if (logoFile) data.append('logoFile', logoFile);
        if (ogImageFile) data.append('ogImageFile', ogImageFile);

        try {
            const url = editingItem
                ? `/api/admin/metadata/${editingItem.id}`
                : '/api/admin/metadata';
            const method = editingItem ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                body: data,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }

            await fetchMetadata();
            handleCloseModal();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this metadata?')) return;
        try {
            const res = await fetch(`/api/admin/metadata/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            await fetchMetadata();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const downloadExcel = async (data: MetadataItem[], filename: string) => {
        if (!data || data.length === 0) {
            console.warn("No data to export");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Metadata');

        // Define columns
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 30 },
            { header: 'URL Pattern', key: 'urlPattern', width: 40 },
            { header: 'Site ID', key: 'siteId', width: 25 },
            { header: 'Title', key: 'title', width: 50 },
            { header: 'Logo URL', key: 'logo', width: 40 },
            { header: 'Logo Alt', key: 'logoAlt', width: 30 },
            { header: 'Logo Title', key: 'logoTitle', width: 30 },
            { header: 'Description', key: 'description', width: 60 },
            { header: 'Keywords', key: 'keywords', width: 40 },
            { header: 'OG Title', key: 'ogTitle', width: 40 },
            { header: 'OG Description', key: 'ogDescription', width: 50 },
            { header: 'OG Image', key: 'ogImage', width: 40 },
            { header: 'OG Image Alt', key: 'ogImageAlt', width: 30 },
            { header: 'OG Image Title', key: 'ogImageTitle', width: 30 },
            { header: 'Canonical URL', key: 'canonicalUrl', width: 40 },
            { header: 'Robots', key: 'robots', width: 20 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Created At', key: 'createdAt', width: 20 },
            { header: 'Updated At', key: 'updatedAt', width: 20 },
        ];

        // Add rows
        data.forEach(item => {
            worksheet.addRow({
                id: item.id,
                urlPattern: item.urlPattern,
                siteId: item.siteId || '*',
                title: item.title,
                logo: item.logo || '',
                logoAlt: item.logoAlt || '',
                logoTitle: item.logoTitle || '',
                description: item.description,
                keywords: item.keywords,
                ogTitle: item.ogTitle || '',
                ogDescription: item.ogDescription || '',
                ogImage: item.ogImage || '',
                ogImageAlt: item.ogImageAlt || '',
                ogImageTitle: item.ogImageTitle || '',
                canonicalUrl: item.canonicalUrl || '',
                robots: item.robots || '',
                status: item.isActive ? 'Active' : 'Inactive',
                createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '',
                updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '',
            });
        });

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
        };

        // Generate buffer and trigger download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            // Build params with current filters but large perPage to get all records
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (status !== 'all') params.set('isActive', status === 'active' ? 'true' : 'false');
            if (sortColumn) params.set('sortBy', sortColumn);
            if (siteFilter) params.set('siteId', siteFilter);
            params.set('sortOrder', sortDirection);
            if (createdFrom) params.set('createdFrom', createdFrom);
            if (createdTo) params.set('createdTo', createdTo);
            if (updatedFrom) params.set('updatedFrom', updatedFrom);
            if (updatedTo) params.set('updatedTo', updatedTo);
            params.set('page', '1');
            params.set('perPage', '10000'); // Large enough to get all records

            const res = await fetch(`/api/admin/metadata/[id]/?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch export data');
            const json: ApiResponse = await res.json();
            downloadExcel(json.data, `metadata_export_${new Date().toISOString().slice(0, 19)}`);
        } catch (err: any) {
            alert(`Export failed: ${err.message}`);
        } finally {
            setExporting(false);
        }
    };

    // Render sort indicator
    const SortIcon = ({ column }: { column: string }) => {
        if (sortColumn !== column) return <i className="ti ti-arrows-sort text-muted ms-1" />;
        return sortDirection === 'asc'
            ? <i className="ti ti-arrow-up ms-1" />
            : <i className="ti ti-arrow-down ms-1" />;
    };

    // Add new state for import loading
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Function to read Excel file and parse using ExcelJS
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            // Read file as ArrayBuffer
            const buffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            const worksheet = workbook.getWorksheet(1); // first sheet
            if (!worksheet) throw new Error('No worksheet found');

            // Get headers (first row)
            const headers: string[] = [];
            worksheet.getRow(1).eachCell((cell, colNumber) => {
                headers[colNumber] = cell.text;
            });

            // Map headers to expected field names (case-insensitive)
            const fieldMap: Record<string, string> = {
                'id': 'id',
                'url pattern': 'urlPattern',
                'site id': 'siteId',
                'title': 'title',
                'logo url': 'logo',
                'logo alt': 'logoAlt',
                'logo title': 'logoTitle',
                'description': 'description',
                'keywords': 'keywords',
                'og title': 'ogTitle',
                'og description': 'ogDescription',
                'og image': 'ogImage',
                'og image alt': 'ogImageAlt',
                'og image title': 'ogImageTitle',
                'canonical url': 'canonicalUrl',
                'robots': 'robots',
                'status': 'isActive',   // will convert to boolean
            };

            // Build array of metadata items
            const items: any[] = [];
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // skip header

                const item: any = {};
                row.eachCell((cell, colNumber) => {
                    const headerRaw = headers[colNumber]?.trim().toLowerCase();
                    const field = fieldMap[headerRaw];
                    if (field) {
                        let value = cell.text;
                        if (field === 'isActive') {
                            value = String(value.toLowerCase() === 'active');
                        }
                        item[field] = value;
                    }
                });
                // Only add if at least urlPattern and title exist
                if (item.urlPattern && item.title) {
                    items.push({
                        ...item,
                        siteId: item.siteId || '*',
                    });
                }
            });

            if (items.length === 0) {
                alert('No valid metadata rows found. Please check the file format.');
                return;
            }

            // Send to backend
            const res = await fetch('/api/admin/metadata/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Import failed');
            }

            const result = await res.json();
            alert(`Import completed: ${result.inserted} inserted, ${result.updated} updated, ${result.errors} errors`);
            await fetchMetadata(); // refresh table
        } catch (err: any) {
            console.error(err);
            alert(`Import error: ${err.message}`);
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // reset
        }
    };

    // Trigger file input click
    const triggerImport = () => {
        fileInputRef.current?.click();
    };

    const [mobileOpen, setMobileOpen] = useState<boolean>(false);

    const activeFilterCount = [
        search,
        siteFilter,
        status !== 'all' ? status : '',
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo
    ].filter(Boolean).length;

    return (
        <div className="container-fluid py-4">
            {/* Header with filters and bulk actions */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 p-3 bg-white border-bottom shadow-sm">
                <div>
                    <h4 className="mb-1 fw-semibold">Metadata Management</h4>
                    <p className="text-muted small mb-0">Manage SEO metadata for your pages</p>
                </div>

                <div className='d-flex overflow-auto gap-3'>
                    <button className="btn btn-sm btn-outline-dark" style={{ textWrap: "nowrap" }} onClick={clearFilters}>
                        Clear
                    </button>

                    {/* Site — desktop */}
                    <div
                        className="d-flex align-items-center rounded-2 px-2 gap-1"
                        style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                        onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                        onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                    >
                        <i className="ti ti-world text-secondary" style={{ fontSize: 13 }}></i>
                        <select
                            className="border-0 bg-transparent p-0 shadow-none"
                            style={{ fontSize: 12, outline: 'none', width: 160, height: '100%', cursor: 'pointer' }}
                            value={siteFilter}
                            onChange={e => setSiteFilter(e.target.value)}
                        >
                            <option value="">All sites</option>
                            <option value="*">Global (*)</option>
                            {KNOWN_SITES.map(site => (
                                <option key={site} value={site}>{site}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        className="btn btn-sm btn-outline-info"
                        onClick={triggerImport}
                        disabled={importing}
                        style={{ textWrap: "nowrap" }}
                    >
                        {importing ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                Importing...
                            </>
                        ) : (
                            <>
                                <i className="ti ti-file-import me-1"></i> Import
                            </>
                        )}
                    </button>

                    {/* Hidden file input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".xlsx, .xls, .csv"
                        style={{ display: 'none' }}
                        onChange={handleImport}
                    />

                    {/* Export Sheet Button */}
                    <button
                        className="btn btn-sm btn-outline-success"
                        onClick={handleExport}
                        disabled={exporting}
                        style={{ textWrap: "nowrap" }}
                    >
                        {exporting ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <i className="ti ti-file-spreadsheet me-1"></i> Export Sheet
                            </>
                        )}
                    </button>

                    {/* Bulk actions dropdown */}
                    {selectedIds.length > 0 && (
                        <div className="dropdown">
                            <button
                                className="btn btn-sm btn-outline-primary dropdown-toggle"
                                type="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                style={{ textWrap: "nowrap" }}
                            >
                                Bulk Actions ({selectedIds.length})
                            </button>
                            <ul className="dropdown-menu">
                                <li><button className="dropdown-item" onClick={() => handleBulkAction('activate')}>Activate</button></li>
                                <li><button className="dropdown-item" onClick={() => handleBulkAction('deactivate')}>Deactivate</button></li>
                                <li><hr className="dropdown-divider" /></li>
                                <li><button className="dropdown-item text-danger" onClick={() => handleBulkAction('delete')}>Delete</button></li>
                            </ul>
                        </div>
                    )}

                    <button className="btn btn-sm btn-primary" style={{ textWrap: "nowrap" }} onClick={() => handleOpenModal()}>
                        <i className="ti ti-plus me-1"></i>Add Metadata
                    </button>
                </div>

                <div
                    className="ulp-filters bg-white rounded-3 p-2 border mx-auto ms-md-auto me-md-0 mt-2 mt-md-0 "
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                    {/* ── Mobile toggle header – visible only below md ── */}
                    <button
                        className="btn btn-sm w-100 d-flex d-md-none align-items-center justify-content-between border-0 bg-transparent px-1 mb-0"
                        style={{ fontSize: 13 }}
                        onClick={() => setMobileOpen(o => !o)}
                    >
                        <span className="d-flex align-items-center gap-2 fw-semibold text-dark">
                            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14 }}></i>
                            Filters
                        </span>
                        <span className="d-flex align-items-center gap-2 text-secondary" style={{ fontSize: 12 }}>
                            {activeFilterCount > 0 && (
                                <span
                                    className="badge rounded-pill"
                                    style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 10 }}
                                >
                                    {activeFilterCount}
                                </span>
                            )}
                            <i
                                className="ti ti-chevron-down"
                                style={{
                                    fontSize: 14,
                                    transition: 'transform 0.2s',
                                    transform: mobileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                }}
                            />
                        </span>
                    </button>

                    {/* ── Desktop row (visible md and up) ── */}
                    <div className="d-none d-md-flex align-items-center flex-wrap gap-2">
                        {/* Search */}
                        <div
                            className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            <i className="ti ti-search text-secondary" style={{ fontSize: 13 }}></i>
                            <input
                                type="text"
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ width: 150, fontSize: 12, outline: 'none', color: 'inherit' }}
                                placeholder="Search…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Status */}
                        <div
                            className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            <i className="ti ti-circle-dot text-secondary" style={{ fontSize: 13 }}></i>
                            <select
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, outline: 'none', width: 120, height: '100%', cursor: 'pointer' }}
                                value={status}
                                onChange={e => setStatus(e.target.value as any)}
                            >
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        {/* Site — mobile */}
                        <div
                            className="d-flex align-items-center rounded-2 px-2 gap-2"
                            style={{ height: 38, background: '#f3f3f1', border: '0.5px solid transparent' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            <i className="ti ti-world text-secondary" style={{ fontSize: 13 }}></i>
                            <select
                                className="border-0 bg-transparent p-0 shadow-none flex-fill"
                                style={{ fontSize: 13, outline: 'none', height: '100%', cursor: 'pointer' }}
                                value={siteFilter}
                                onChange={e => setSiteFilter(e.target.value)}
                            >
                                <option value="">All sites</option>
                                <option value="*">Global (*)</option>
                                {KNOWN_SITES.map(site => (
                                    <option key={site} value={site}>{site}</option>
                                ))}
                            </select>
                        </div>

                        {/* Created date range */}
                        <div
                            className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            <i className="ti ti-calendar text-secondary" style={{ fontSize: 13 }}></i>
                            <input
                                type="date"
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, width: 110, outline: 'none', cursor: 'pointer' }}
                                value={createdFrom}
                                onChange={e => setCreatedFrom(e.target.value)}
                            />
                            <span className="text-secondary" style={{ fontSize: 11 }}>—</span>
                            <input
                                type="date"
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, width: 110, outline: 'none', cursor: 'pointer' }}
                                value={createdTo}
                                onChange={e => setCreatedTo(e.target.value)}
                            />
                        </div>

                        {/* Updated date range */}
                        <div
                            className="d-flex align-items-center rounded-2 px-2 gap-1"
                            style={{ height: 32, background: '#f3f3f1', border: '0.5px solid transparent', transition: 'border-color 0.15s' }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                            onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            <i className="ti ti-calendar-edit text-secondary" style={{ fontSize: 13 }}></i>
                            <input
                                type="date"
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, width: 110, outline: 'none', cursor: 'pointer' }}
                                value={updatedFrom}
                                onChange={e => setUpdatedFrom(e.target.value)}
                            />
                            <span className="text-secondary" style={{ fontSize: 11 }}>—</span>
                            <input
                                type="date"
                                className="border-0 bg-transparent p-0 shadow-none"
                                style={{ fontSize: 12, width: 110, outline: 'none', cursor: 'pointer' }}
                                value={updatedTo}
                                onChange={e => setUpdatedTo(e.target.value)}
                            />
                        </div>

                        {/* Clear button (visible when any filter is active) */}
                        {activeFilterCount > 0 && (
                            <button
                                className="btn btn-sm border d-flex align-items-center gap-1 text-secondary"
                                style={{ fontSize: 12, height: 32, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6 }}
                                onClick={() => {
                                    setSearch('');
                                    setSiteFilter('');
                                    setStatus('all');
                                    setCreatedFrom('');
                                    setCreatedTo('');
                                    setUpdatedFrom('');
                                    setUpdatedTo('');
                                }}
                            >
                                <i className="ti ti-x" style={{ fontSize: 12 }}></i>
                                Clear
                            </button>
                        )}
                    </div>

                    {/* ── Mobile panel (visible only below md, expands/collapses) ── */}
                    <div
                        className="d-md-none w-100 overflow-hidden"
                        style={{ maxHeight: mobileOpen ? 500 : 0, transition: 'max-height 0.28s ease' }}
                    >
                        <div
                            className="d-flex flex-column gap-2 pt-2 mt-1"
                            style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)' }}
                        >
                            {/* Search */}
                            <div
                                className="d-flex align-items-center rounded-2 px-2 gap-2 w-100"
                                style={{ height: 38, background: '#f3f3f1', border: '0.5px solid transparent' }}
                                onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                                onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                            >
                                <i className="ti ti-search text-secondary" style={{ fontSize: 13 }}></i>
                                <input
                                    type="text"
                                    className="border-0 bg-transparent p-0 shadow-none flex-fill"
                                    style={{ fontSize: 13, outline: 'none' }}
                                    placeholder="Search…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>

                            {/* Status */}
                            <div
                                className="d-flex align-items-center rounded-2 px-2 gap-2 w-100"
                                style={{ height: 38, background: '#f3f3f1', border: '0.5px solid transparent' }}
                                onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                                onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                            >
                                <i className="ti ti-circle-dot text-secondary" style={{ fontSize: 13 }}></i>
                                <select
                                    className="border-0 bg-transparent p-0 shadow-none flex-fill"
                                    style={{ fontSize: 13, outline: 'none', height: '100%', cursor: 'pointer' }}
                                    value={status}
                                    onChange={e => setStatus(e.target.value as any)}
                                >
                                    <option value="all">All</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            {/* Created date range */}
                            <div
                                className="d-flex align-items-center rounded-2 px-2 gap-1 w-100"
                                style={{ height: 38, background: '#f3f3f1', border: '0.5px solid transparent' }}
                                onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                                onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                            >
                                <i className="ti ti-calendar text-secondary" style={{ fontSize: 13 }}></i>
                                <input
                                    type="date"
                                    className="border-0 bg-transparent p-0 shadow-none flex-fill"
                                    style={{ fontSize: 13, outline: 'none', cursor: 'pointer' }}
                                    value={createdFrom}
                                    onChange={e => setCreatedFrom(e.target.value)}
                                />
                                <span className="text-secondary" style={{ fontSize: 11 }}>—</span>
                                <input
                                    type="date"
                                    className="border-0 bg-transparent p-0 shadow-none flex-fill"
                                    style={{ fontSize: 13, outline: 'none', cursor: 'pointer' }}
                                    value={createdTo}
                                    onChange={e => setCreatedTo(e.target.value)}
                                />
                            </div>

                            {/* Updated date range */}
                            <div
                                className="d-flex align-items-center rounded-2 px-2 gap-1 w-100"
                                style={{ height: 38, background: '#f3f3f1', border: '0.5px solid transparent' }}
                                onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                                onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
                            >
                                <i className="ti ti-calendar-edit text-secondary" style={{ fontSize: 13 }}></i>
                                <input
                                    type="date"
                                    className="border-0 bg-transparent p-0 shadow-none flex-fill"
                                    style={{ fontSize: 13, outline: 'none', cursor: 'pointer' }}
                                    value={updatedFrom}
                                    onChange={e => setUpdatedFrom(e.target.value)}
                                />
                                <span className="text-secondary" style={{ fontSize: 11 }}>—</span>
                                <input
                                    type="date"
                                    className="border-0 bg-transparent p-0 shadow-none flex-fill"
                                    style={{ fontSize: 13, outline: 'none', cursor: 'pointer' }}
                                    value={updatedTo}
                                    onChange={e => setUpdatedTo(e.target.value)}
                                />
                            </div>

                            {/* Clear button (mobile) */}
                            {activeFilterCount > 0 && (
                                <button
                                    className="btn btn-sm w-100 d-flex align-items-center justify-content-center gap-1 text-secondary border"
                                    style={{ fontSize: 13, height: 38, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6 }}
                                    onClick={() => {
                                        setSearch('');
                                        setStatus('all');
                                        setSiteFilter('');
                                        setCreatedFrom('');
                                        setCreatedTo('');
                                        setUpdatedFrom('');
                                        setUpdatedTo('');
                                    }}
                                >
                                    <i className="ti ti-x" style={{ fontSize: 12 }}></i> Clear filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center gap-3">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-outline-danger" onClick={fetchMetadata}>Retry</button>
                </div>
            )}

            {/* Table Card */}
            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-header-custom">
                                <tr>
                                    {/* Checkbox column */}
                                    <th className="py-3" style={{ width: 40 }}>
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={selectAll}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    {/* Sortable columns */}
                                    <th className="py-3" onClick={() => handleSort('urlPattern')} style={{ cursor: 'pointer', textWrap: "nowrap" }}>
                                        URL Pattern <SortIcon column="urlPattern" />
                                    </th>
                                    <th className="py-3" onClick={() => handleSort('siteId')} style={{ cursor: 'pointer', textWrap: "nowrap" }}>
                                        Site <SortIcon column="siteId" />                   {/* ← ADD */}
                                    </th>
                                    <th className="py-3" onClick={() => handleSort('title')} style={{ cursor: 'pointer', textWrap: "nowrap" }}>
                                        Title <SortIcon column="title" />
                                    </th>
                                    <th className="py-3">Logo</th>
                                    <th className="py-3" onClick={() => handleSort('description')} style={{ cursor: 'pointer', textWrap: "nowrap" }}>
                                        Description <SortIcon column="description" />
                                    </th>
                                    <th className="py-3" onClick={() => handleSort('keywords')} style={{ cursor: 'pointer', textWrap: "nowrap" }}>
                                        Keywords <SortIcon column="keywords" />
                                    </th>
                                    <th className="py-3" onClick={() => handleSort('isActive')} style={{ cursor: 'pointer', textWrap: "nowrap" }}>
                                        Status <SortIcon column="isActive" />
                                    </th>
                                    <th className="py-3 text-end">Actions</th>
                                </tr>
                            </thead>
                            <div className={`d-${imageView.imageView ? 'flex' : 'none'} bg-transparent`} style={{ position: "fixed", top: 0, right: 0, left: 0, bottom: 0, transitionBehavior: "smooth", transitionDuration: "1s" }} >
                                <div className="my-auto w-50 mx-auto px-5 py-3 rounded d-flex shadow border-white" style={{ background: "#ffffff39", backdropFilter: "blur(3px)" }} >
                                    <div className="h-100 w-100 d-flex bg-transparent">
                                        <img src={imageView.imageSrc} alt="large-logo" className="h-50 w-50 mx-auto my-auto" style={{ objectFit: 'contain' }} />
                                    </div>
                                    <div className="float-end text-dark bg-transparent" onClick={() => setImageView({ imageView: imageView.imageView ? false : true, imageSrc: '' })} style={{ cursor: "pointer" }}>X</div>
                                </div>
                            </div>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: perPage }).map((_, i) => <SkeletonRow key={i} />)
                                ) : metadata.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-5">
                                            <div className="text-muted">
                                                <i className="ti ti-file-unknown fs-1 mb-3 d-block"></i>
                                                <h5>No metadata found</h5>
                                                <p>Try adjusting your filters or click "Add Metadata".</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    metadata.map((item) => (
                                        <tr key={item.id} className="border-bottom">
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => handleSelectRow(item.id)}
                                                />
                                            </td>
                                            <td><code className="bg-light p-1 rounded small">{item.urlPattern}</code></td>
                                            <td>
                                                <span className="badge bg-light text-dark border small" style={{ fontWeight: 500 }}>
                                                    {item.siteId === '*' ? '🌐 All sites' : item.siteId}
                                                </span>
                                            </td>
                                            <td className="small fw-medium">{item.title}</td>
                                            <td>
                                                {item.logo ? (
                                                    <img src={item.logo} onClick={() => setImageView({ imageView: imageView.imageView ? false : true, imageSrc: item.logo })} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain' }} className="rounded shadow-sm" />
                                                ) : '—'}
                                            </td>
                                            <td className="small">{item.description?.substring(0, 60)}...</td>
                                            <td className="small">{item.keywords?.substring(0, 30)}...</td>
                                            <td>
                                                <span className={`badge ${item.isActive ? 'bg-success' : 'bg-secondary'} px-2 py-1 small`}>
                                                    {item.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                <div className="btn-group">
                                                    <button
                                                        className="btn admin-btn-1 btn-sm btn-outline-primary p-0 m-0 border-top-0 border-bottom-0 border-start-0"
                                                        onClick={() => handleOpenModal(item)}
                                                    >
                                                        <i className="ti ti-edit"></i>
                                                    </button>
                                                    <button
                                                        className="btn admin-btn-1 btn-sm btn-outline-danger p-0 m-0 border-top-0 border-bottom-0 border-end-0"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <i className="ti ti-trash"></i>
                                                    </button>
                                                </div>
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
                            Showing {metadata.length} of {total} entries
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

            {/* Compact Modal */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered overflow-auto modal-xl">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light border-bottom py-2">
                                <h5 className="modal-title">
                                    <i className={`ti ${editingItem ? 'ti-edit' : 'ti-plus'} me-2`}></i>
                                    {editingItem ? 'Edit Metadata' : 'Create Metadata'}
                                </h5>
                                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-2 p-md-3 row m-0">
                                    {/* Page Information */}
                                    <div className='row col-12 m-0'>
                                        <div className="section-card p-2 rounded-2 mb-3 col-12 col-md-5 mx-auto shadow-lg">
                                            <h6 className="section-title small fw-semibold mb-2">
                                                <i className="ti ti-file-info me-2 text-primary"></i>Page Information
                                            </h6>
                                            <div className="row g-2">
                                                <div className="col-12 col-md-6 col-lg-12">
                                                    <label className="form-label small fw-medium">URL Pattern <span className="text-danger">*</span></label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        name="urlPattern"
                                                        value={formData.urlPattern}
                                                        onChange={handleChange}
                                                        placeholder="e.g., /about, /products/*, or *"
                                                        required
                                                    />
                                                    <small className="text-muted d-block mt-1">Use * as wildcard for all pages.</small>
                                                </div>
                                                <div className="col-12 col-md-6 col-lg-12">
                                                    <label className="form-label small fw-medium">
                                                        Site <span className="text-danger">*</span>
                                                    </label>
                                                    <select
                                                        className="form-select form-select-sm"
                                                        name="siteId"
                                                        value={formData.siteId || '*'}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, siteId: e.target.value }))}
                                                        required
                                                    >
                                                        <option value="*">🌐 All sites (global)</option>
                                                        {KNOWN_SITES.map(site => (
                                                            <option key={site} value={site}>{site}</option>
                                                        ))}
                                                    </select>
                                                    <small className="text-muted d-block mt-1">
                                                        Use "All sites" for shared metadata; pick a specific site to override.
                                                    </small>
                                                </div>
                                                <div className="col-12 col-md-6 col-lg-12">
                                                    <label className="form-label small fw-medium">Title <span className="text-danger">*</span></label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        name="title"
                                                        value={formData.title}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Logo Section */}
                                        <div className="section-card p-2 rounded-2 mb-3 col-12 col-md-6 mx-auto shadow-lg">
                                            <h6 className="section-title small fw-semibold mb-2">
                                                <i className="ti ti-brand-gravatar me-2 text-primary"></i>Logo
                                            </h6>
                                            <div className="row g-2">
                                                <div className="col-12">
                                                    <ImageUploader
                                                        label=""
                                                        currentImageUrl={formData.logo}
                                                        onFileSelect={setLogoFile}
                                                        onUrlChange={(url) => setFormData(prev => ({ ...prev, logo: url }))}
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label small fw-medium">Alt Text</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        name="logoAlt"
                                                        value={formData.logoAlt || ''}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label small fw-medium">Title Text</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        name="logoTitle"
                                                        value={formData.logoTitle || ''}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SEO Basics */}
                                    <div className="section-card p-2 rounded-2 mb-3 col-11 col-md-4 mx-auto shadow-lg">
                                        <h6 className="section-title small fw-semibold mb-2">
                                            <i className="ti ti-seo me-2 text-primary"></i>SEO Basics
                                        </h6>
                                        <div className="row g-2">
                                            <div className="col-12">
                                                <label className="form-label small fw-medium">Description <span className="text-danger">*</span></label>
                                                <textarea
                                                    className="form-control form-control-sm"
                                                    name="description"
                                                    value={formData.description}
                                                    onChange={handleChange}
                                                    required
                                                ></textarea>
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label small fw-medium">Keywords <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    name="keywords"
                                                    value={formData.keywords}
                                                    onChange={handleChange}
                                                    placeholder="comma, separated, values"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Open Graph */}
                                    <div className="section-card p-2 rounded-2 mb-3 col-11 col-md-7 mx-auto shadow-lg">
                                        <h6 className="section-title small fw-semibold mb-2">
                                            <i className="ti ti-brand-open-source me-2 text-primary"></i>Open Graph
                                        </h6>
                                        <div className="row g-2">
                                            <div className="col-md-6">
                                                <label className="form-label small fw-medium">OG Title</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    name="ogTitle"
                                                    value={formData.ogTitle || ''}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small fw-medium">OG Description</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    name="ogDescription"
                                                    value={formData.ogDescription || ''}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div className="col-12">
                                                <ImageUploader
                                                    label=""
                                                    currentImageUrl={formData.ogImage}
                                                    onFileSelect={setOgImageFile}
                                                    onUrlChange={(url) => setFormData(prev => ({ ...prev, ogImage: url }))}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small fw-medium">OG Image Alt</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    name="ogImageAlt"
                                                    value={formData.ogImageAlt || ''}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small fw-medium">OG Image Title</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    name="ogImageTitle"
                                                    value={formData.ogImageTitle || ''}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional Settings */}
                                    <div className="section-card p-2 rounded-2 mb-3 col-11 col-md-10 mx-auto shadow-lg">
                                        <h6 className="section-title small fw-semibold mb-2">
                                            <i className="ti ti-settings me-2 text-secondary"></i>Additional Settings
                                        </h6>
                                        <div className="row g-2">
                                            <div className="col-md-6">
                                                <label className="form-label small fw-medium">Canonical URL</label>
                                                <input
                                                    type="url"
                                                    className="form-control form-control-sm"
                                                    name="canonicalUrl"
                                                    value={formData.canonicalUrl || ''}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small fw-medium">Robots</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    name="robots"
                                                    value={formData.robots || ''}
                                                    onChange={handleChange}
                                                    placeholder="index, follow"
                                                />
                                            </div>
                                            <div className="col-12">
                                                <div className="form-check">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        name="isActive"
                                                        checked={formData.isActive}
                                                        onChange={handleChange}
                                                    />
                                                    <label className="form-check-label small fw-medium">Active</label>
                                                </div>
                                            </div>
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
                    cursor: pointer;
                    user-select: none;
                }
                .table-header-custom th:hover {
                    background-color: #e9ecef;
                }
                .section-card {
                    background-color: #f9fafc;
                    border-left: 3px solid #e9ecef;
                    transition: all 0.2s ease;
                }
                .section-card:hover {
                    border-left-color: var(--bs-primary);
                }
                .section-title {
                    display: flex;
                    align-items: center;
                    color: #1e293b;
                }
                .preview-box {
                    transition: all 0.2s ease;
                    border: 2px dashed #dee2e6 !important;
                }
                .preview-box:hover {
                    border-color: var(--bs-primary) !important;
                    background-color: #f8f9fa;
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
                .modal-xl {
                    max-width: 90%;
                }
                @media (min-width: 1400px) {
                    .modal-xl {
                        max-width: 1300px;
                    }
                }
            `}</style>
        </div>
    );
}