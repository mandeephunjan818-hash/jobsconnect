'use client';

import { useState, useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import getLocalImageUrl from '@/utils/ChangeImageUrl';

// Types (mirror API responses)
interface AboutItem {
    id: string;
    pageIdentifier: string;
    imageUrl: string;
    subtitle: string;
    title: string;
    paragraphs: string[];
    listItems: string[];
    buttonText: string;
    buttonLink: string;
}

interface AboutStoryItem {
    id: string;
    pageIdentifier: string;
    heading: string;
    description: string;
    listItems: string[];
    buttonText: string;
    buttonLink: string;
    mainImage: string;
    sideImages: string[];
    stats: Array<{ number: number; suffix: string; text: string }>;
}

interface ContactInfoItem {
    id: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    emails: string[];
    socialLinks: Array<{ platform: string; url: string; iconClass: string }>;
}

// TinyMCE configuration
const tinymceConfig = {
    height: 200,
    menubar: false,
    plugins: [
        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
    ],
    toolbar: 'undo redo | blocks | ' +
        'bold italic forecolor | alignleft aligncenter ' +
        'alignright alignjustify | bullist numlist outdent indent | ' +
        'removeformat | help',
    content_style: 'body { font-family: system-ui, -apple-system, sans-serif; font-size:14px; color: #212529; }'
};

// Modern Image Uploader with preview, URL input, and remove button
function ImageUploader({
    label,
    currentImageUrl,
    onFileSelect,
    onUrlChange,
    variant = 'default'
}: {
    label: string;
    currentImageUrl?: string;
    onFileSelect: (file: File | null) => void;
    onUrlChange?: (url: string) => void;
    variant?: 'default' | 'compact' | 'hero';
}) {
    const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
    const [urlInput, setUrlInput] = useState(currentImageUrl || '');
    const [useUrl, setUseUrl] = useState(!!currentImageUrl && !currentImageUrl.startsWith('blob:'));
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setPreview(result);
                setUseUrl(false);
                setUrlInput('');
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
        setUseUrl(true);
        if (onUrlChange) onUrlChange(url);
        onFileSelect(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setPreview(result);
                setUseUrl(false);
                setUrlInput('');
                onFileSelect(file);
                if (onUrlChange) onUrlChange('');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        setUrlInput('');
        setUseUrl(false);
        onFileSelect(null);
        if (onUrlChange) onUrlChange('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Hero variant: large drop zone + URL input below
    if (variant === 'hero') {
        return (
            <div className="image-uploader mb-3">
                {label && <label className="form-label text-dark mb-2 fw-medium">{label}</label>}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`position-relative overflow-hidden rounded-4 ${isDragging ? 'border-primary border-3' : 'border border-2'}`}
                    style={{
                        height: '200px',
                        background: preview ? `url('${preview}')` : '#f8f9fa',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        border: '2px dashed #dee2e6',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    <div className="position-absolute top-50 start-50 translate-middle text-center">
                        {!preview ? (
                            <>
                                <div className="mb-2">
                                    <i className="ti ti-cloud-upload fs-1 text-primary"></i>
                                </div>
                                <span className="text-secondary small">Drop image here or click to browse</span>
                            </>
                        ) : (
                            <button
                                className="border-0 text-danger  bg-transparent"
                                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                                style={{ width: '40px', height: '40px' }}
                            >
                                <i className="ti ti-trash"></i>
                            </button>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} className="d-none" accept="image/*" onChange={handleFileChange} />
                </div>
                {/* URL input below the drop zone */}
                <div className="mt-2">
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
                </div>
                {preview && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger mt-2 py-0"
                        onClick={handleRemove}
                    >
                        <i className="ti ti-trash me-1"></i>Remove
                    </button>
                )}
            </div>
        );
    }

    // Default and compact variants: preview box + URL input inline
    const previewSize = variant === 'compact' ? '48px' : '70px';
    return (
        <div className="image-uploader mb-2">
            {label && <label className="form-label small fw-medium text-dark">{label}</label>}
            <div className="d-flex align-items-start gap-2">
                {/* Preview box - click to upload */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="preview-box border rounded-3 d-flex align-items-center justify-content-center bg-light"
                    style={{
                        width: previewSize,
                        height: previewSize,
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

// Simplified Section Header (no icon box)
function SectionHeader({ title, subtitle, isOpen, onToggle }: { title: string; subtitle?: string; isOpen: boolean; onToggle: () => void }) {
    return (
        <div
            className="d-flex align-items-center justify-content-between p-4 cursor-pointer user-select-none border-bottom"
            onClick={onToggle}
            style={{ cursor: 'pointer' }}
        >
            <div>
                <h6 className="mb-0 text-dark fw-semibold">{title}</h6>
                {subtitle && <small className="text-secondary">{subtitle}</small>}
            </div>
            <div className="d-flex align-items-center gap-3">
                <span className={`badge ${isOpen ? 'bg-success' : 'bg-secondary'}`}>
                    {isOpen ? 'Expanded' : 'Collapsed'}
                </span>
                <i className={`ti ti-chevron-${isOpen ? 'up' : 'down'} text-secondary transition-transform`}></i>
            </div>
        </div>
    );
}

// Array Field Manager
function ArrayFieldManager({
    items,
    onAdd,
    onRemove,
    onChange,
    placeholder,
    addLabel,
    icon = 'list'
}: {
    items: string[];
    onAdd: () => void;
    onRemove: (idx: number) => void;
    onChange: (idx: number, val: string) => void;
    placeholder: string;
    addLabel: string;
    icon?: string;
}) {
    return (
        <div className="space-y-2">
            {items.map((item, idx) => (
                <div key={idx} className="d-flex gap-2 mb-2">
                    <div className="input-group">
                        <span className="input-group-text bg-white border-secondary text-secondary">
                            <i className={`ti ti-${icon}`}></i>
                        </span>
                        <input
                            type="text"
                            className="form-control bg-white border-secondary text-dark"
                            placeholder={placeholder}
                            value={item}
                            onChange={(e) => onChange(idx, e.target.value)}
                        />
                        <button
                            className="btn btn-outline-danger border-secondary"
                            type="button"
                            onClick={() => onRemove(idx)}
                        >
                            <i className="ti ti-x"></i>
                        </button>
                    </div>
                </div>
            ))}
            <button
                type="button"
                className="btn btn-outline-primary btn-sm w-100"
                onClick={onAdd}
            >
                <i className="ti ti-plus me-2"></i>{addLabel}
            </button>
        </div>
    );
}

export default function AboutDashboardPage() {
    const [activeTab, setActiveTab] = useState<'about' | 'story' | 'contact'>('about');
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        aboutBasic: true,
        aboutContent: true,
        aboutMedia: false,
        storyBasic: true,
        storyContent: true,
        storyStats: false,
        contactBasic: true,
        contactSocial: false
    });

    const [about, setAbout] = useState<AboutItem | null>(null);
    const [story, setStory] = useState<AboutStoryItem | null>(null);
    const [contact, setContact] = useState<ContactInfoItem | null>(null);

    const [aboutForm, setAboutForm] = useState<AboutItem | null>(null);
    const [storyForm, setStoryForm] = useState<AboutStoryItem | null>(null);
    const [contactForm, setContactForm] = useState<ContactInfoItem | null>(null);

    const [aboutImageFile, setAboutImageFile] = useState<File | null>(null);
    const [storyMainImageFile, setStoryMainImageFile] = useState<File | null>(null);
    const [storySideImageFiles, setStorySideImageFiles] = useState<(File | null)[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<Record<string, boolean>>({});

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        try {
            const [aboutRes, storyRes, contactRes] = await Promise.all([
                fetch('/api/about?page=home-two'),
                fetch('/api/about-story?page=home-one'),
                fetch('/api/contact-info'),
            ]);

            if (!aboutRes.ok) throw new Error('Failed to fetch about');
            if (!storyRes.ok) throw new Error('Failed to fetch story');
            if (!contactRes.ok) throw new Error('Failed to fetch contact');

            const aboutJson = await aboutRes.json();
            const storyJson = await storyRes.json();
            const contactJson = await contactRes.json();

            setAbout(aboutJson.data);
            setStory(storyJson.data);
            setContact(contactJson.data);

            setAboutForm(aboutJson.data);
            setStoryForm(storyJson.data);
            setContactForm(contactJson.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const handleAboutChange = (field: string, value: any) => {
        setAboutForm(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleStoryChange = (field: string, value: any) => {
        setStoryForm(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleContactChange = (field: string, value: any) => {
        setContactForm(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSave = async (type: 'about' | 'story' | 'contact') => {
        setSaving(prev => ({ ...prev, [type]: true }));
        try {
            if (type === 'about' && aboutForm) {
                const data = new FormData();
                Object.entries(aboutForm).forEach(([key, value]) => {
                    if (key === 'imageUrl') return;
                    if (Array.isArray(value)) {
                        value.forEach(item => data.append(key, item));
                    } else {
                        data.append(key, String(value));
                    }
                });
                if (aboutImageFile) data.append('imageFile', aboutImageFile);
                else data.append('imageUrl', aboutForm.imageUrl);

                await fetch(`/api/about/${aboutForm.id}`, { method: 'PUT', body: data });
                setAboutImageFile(null);
            } else if (type === 'story' && storyForm) {
                const data = new FormData();
                Object.entries(storyForm).forEach(([key, value]) => {
                    if (key === 'mainImage' || key === 'sideImages') return;
                    if (Array.isArray(value)) {
                        if (key === 'stats') {
                            // Stats need to be sent as JSON strings
                            value.forEach(item => data.append(key, JSON.stringify(item)));
                        } else {
                            // listItems are plain strings
                            value.forEach(item => data.append(key, item));
                        }
                    } else {
                        data.append(key, String(value));
                    }
                });
                if (storyMainImageFile) data.append('mainImageFile', storyMainImageFile);
                else data.append('mainImage', storyForm.mainImage);

                storyForm.sideImages.forEach((url, idx) => {
                    const file = storySideImageFiles[idx];
                    if (file) data.append(`sideImageFile_${idx}`, file);
                    else data.append(`sideImage_${idx}`, url);
                });

                await fetch(`/api/about-story/${storyForm.id}`, { method: 'PUT', body: data });
                setStoryMainImageFile(null);
                setStorySideImageFiles([]);
            } else if (type === 'contact' && contactForm) {
                await fetch(`/api/contact-info/${contactForm.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(contactForm),
                });
            }
            // Refresh data without page reload
            await fetchAll();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(prev => ({ ...prev, [type]: false }));
        }
    };

    if (loading) {
        return (
            <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-secondary mb-0">Loading content management...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
                <div className="text-center">
                    <i className="ti ti-alert-circle text-danger fs-1 mb-3"></i>
                    <h5 className="text-dark">Failed to load</h5>
                    <p className="text-secondary">{error}</p>
                    <button className="btn btn-primary" onClick={fetchAll}>Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-vh-100 bg-light">
            {/* Simplified Header */}
            <nav className="border-bottom bg-white shadow-sm py-3">
                <div className="container-fluid px-4">
                    <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center justify-content-center rounded bg-primary" style={{ width: '40px', height: '40px' }}>
                            <i className="ti ti-layout-dashboard text-white"></i>
                        </div>
                        <div>
                            <h5 className="mb-0 text-dark fw-bold">Content Studio</h5>
                            <small className="text-secondary">About Section Management</small>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Bootstrap-styled Tab Navigation */}
            <div className="bg-white border-bottom">
                <div className="container-fluid px-4">
                    <ul className="nav nav-tabs border-0">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'about' ? 'active fw-semibold' : 'text-secondary'}`}
                                onClick={() => setActiveTab('about')}
                            >
                                <i className="ti ti-file-info me-2"></i>
                                About Section
                                {aboutForm && <span className="badge bg-primary ms-2">1</span>}
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'story' ? 'active fw-semibold' : 'text-secondary'}`}
                                onClick={() => setActiveTab('story')}
                            >
                                <i className="ti ti-book me-2"></i>
                                Our Story
                                {storyForm && <span className="badge bg-primary ms-2">1</span>}
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'contact' ? 'active fw-semibold' : 'text-secondary'}`}
                                onClick={() => setActiveTab('contact')}
                            >
                                <i className="ti ti-address-book me-2"></i>
                                Contact Info
                                {contactForm && <span className="badge bg-primary ms-2">1</span>}
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="container-fluid px-4 py-4">
                {activeTab === 'about' && aboutForm && (
                    <div className="row g-4">
                        {/* Left Column - Basic Info */}
                        <div className="col-lg-4">
                            <div className="card border-0 shadow-sm">
                                <SectionHeader
                                    title="Identity"
                                    subtitle="Basic page information"
                                    isOpen={expandedSections.aboutBasic}
                                    onToggle={() => toggleSection('aboutBasic')}
                                />
                                {expandedSections.aboutBasic && (
                                    <div className="card-body">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="form-label text-dark small fw-medium">Page Identifier</label>
                                                <div className="input-group">
                                                    <span className="input-group-text bg-white border-secondary text-secondary">
                                                        <i className="ti ti-tag"></i>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        className="form-control bg-white border-secondary text-dark"
                                                        value={aboutForm.pageIdentifier}
                                                        onChange={(e) => handleAboutChange('pageIdentifier', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="form-label text-dark small fw-medium">Subtitle</label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-white border-secondary text-dark"
                                                    value={aboutForm.subtitle}
                                                    onChange={(e) => handleAboutChange('subtitle', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label text-dark small fw-medium">Title</label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-white border-secondary text-dark fw-semibold"
                                                    value={aboutForm.title}
                                                    onChange={(e) => handleAboutChange('title', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="card border-0 shadow-sm mt-4">
                                <SectionHeader
                                    title="Hero Image"
                                    subtitle="Primary visual asset"
                                    isOpen={expandedSections.aboutMedia}
                                    onToggle={() => toggleSection('aboutMedia')}
                                />
                                {expandedSections.aboutMedia && (
                                    <div className="card-body">
                                        <ImageUploader
                                            label="Upload Hero Image"
                                            currentImageUrl={aboutForm.imageUrl}
                                            onFileSelect={setAboutImageFile}
                                            onUrlChange={(url) => handleAboutChange('imageUrl', url)}
                                            variant="hero"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Content */}
                        <div className="col-lg-8">
                            <div className="card border-0 shadow-sm">
                                <SectionHeader
                                    title="Content"
                                    subtitle="Paragraphs and list items"
                                    isOpen={expandedSections.aboutContent}
                                    onToggle={() => toggleSection('aboutContent')}
                                />
                                {expandedSections.aboutContent && (
                                    <div className="card-body">
                                        <div className="mb-4">
                                            <label className="form-label text-dark small fw-medium d-flex justify-content-between">
                                                <span>Paragraphs</span>
                                                <span className="text-secondary">{aboutForm.paragraphs.length} items</span>
                                            </label>
                                            <div className="space-y-3">
                                                {aboutForm.paragraphs.map((p, idx) => (
                                                    <div key={idx} className="position-relative">
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <small className="text-secondary">Paragraph {idx + 1}</small>
                                                            <button
                                                                className="btn btn-link text-danger p-0 small"
                                                                onClick={() => {
                                                                    const newParagraphs = aboutForm.paragraphs.filter((_, i) => i !== idx);
                                                                    handleAboutChange('paragraphs', newParagraphs);
                                                                }}
                                                            >
                                                                <i className="ti ti-trash"></i>
                                                            </button>
                                                        </div>
                                                        <Editor
                                                            apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                                                            init={tinymceConfig}
                                                            value={p}
                                                            onEditorChange={(content) => {
                                                                const newParagraphs = [...aboutForm.paragraphs];
                                                                newParagraphs[idx] = content;
                                                                handleAboutChange('paragraphs', newParagraphs);
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                                <button
                                                    className="btn btn-outline-secondary w-100"
                                                    onClick={() => handleAboutChange('paragraphs', [...aboutForm.paragraphs, ''])}
                                                >
                                                    <i className="ti ti-plus me-2"></i>Add Paragraph
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label className="form-label text-dark small fw-medium">List Items</label>
                                            <ArrayFieldManager
                                                items={aboutForm.listItems}
                                                onAdd={() => handleAboutChange('listItems', [...aboutForm.listItems, ''])}
                                                onRemove={(idx) => {
                                                    const newList = aboutForm.listItems.filter((_, i) => i !== idx);
                                                    handleAboutChange('listItems', newList);
                                                }}
                                                onChange={(idx, val) => {
                                                    const newList = [...aboutForm.listItems];
                                                    newList[idx] = val;
                                                    handleAboutChange('listItems', newList);
                                                }}
                                                placeholder="Enter list item..."
                                                addLabel="Add List Item"
                                                icon="check"
                                            />
                                        </div>

                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label text-dark small fw-medium">Button Text</label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-white border-secondary text-dark"
                                                    value={aboutForm.buttonText}
                                                    onChange={(e) => handleAboutChange('buttonText', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-dark small fw-medium">Button Link</label>
                                                <div className="input-group">
                                                    <span className="input-group-text bg-white border-secondary text-secondary">
                                                        <i className="ti ti-link"></i>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        className="form-control bg-white border-secondary text-dark"
                                                        value={aboutForm.buttonLink}
                                                        onChange={(e) => handleAboutChange('buttonLink', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Save Bar (no reset button) */}
                        <div className="col-12">
                            <div className="d-flex justify-content-end">
                                <button
                                    className="btn btn-primary px-4 d-flex align-items-center gap-2"
                                    onClick={() => handleSave('about')}
                                    disabled={saving.about}
                                >
                                    {saving.about ? (
                                        <><span className="spinner-border spinner-border-sm"></span>Saving...</>
                                    ) : (
                                        <><i className="ti ti-device-floppy"></i>Save Changes</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'story' && storyForm && (
                    <div className="row g-4">
                        <div className="col-lg-8">
                            <div className="card border-0 shadow-sm">
                                <SectionHeader
                                    title="Story Content"
                                    subtitle="Narrative and description"
                                    isOpen={expandedSections.storyBasic}
                                    onToggle={() => toggleSection('storyBasic')}
                                />
                                {expandedSections.storyBasic && (
                                    <div className="card-body">
                                        <div className="row g-3 mb-4">
                                            <div className="col-md-6">
                                                <label className="form-label text-dark small fw-medium">Page Identifier</label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-white border-secondary text-dark"
                                                    value={storyForm.pageIdentifier}
                                                    onChange={(e) => handleStoryChange('pageIdentifier', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-dark small fw-medium">Heading</label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-white border-secondary text-dark fw-semibold"
                                                    value={storyForm.heading}
                                                    onChange={(e) => handleStoryChange('heading', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label className="form-label text-dark small fw-medium">Description</label>
                                            <Editor
                                                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                                                init={tinymceConfig}
                                                value={storyForm.description}
                                                onEditorChange={(content) => handleStoryChange('description', content)}
                                            />
                                        </div>

                                        <div className="mb-4">
                                            <label className="form-label text-dark small fw-medium">List Items</label>
                                            <ArrayFieldManager
                                                items={storyForm.listItems}
                                                onAdd={() => handleStoryChange('listItems', [...storyForm.listItems, ''])}
                                                onRemove={(idx) => {
                                                    const newList = storyForm.listItems.filter((_, i) => i !== idx);
                                                    handleStoryChange('listItems', newList);
                                                }}
                                                onChange={(idx, val) => {
                                                    const newList = [...storyForm.listItems];
                                                    newList[idx] = val;
                                                    handleStoryChange('listItems', newList);
                                                }}
                                                placeholder="Enter list item..."
                                                addLabel="Add Item"
                                                icon="check"
                                            />
                                        </div>

                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label text-dark small fw-medium">Button Text</label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-white border-secondary text-dark"
                                                    value={storyForm.buttonText}
                                                    onChange={(e) => handleStoryChange('buttonText', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-dark small fw-medium">Button Link</label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-white border-secondary text-dark"
                                                    value={storyForm.buttonLink}
                                                    onChange={(e) => handleStoryChange('buttonLink', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="card border-0 shadow-sm mt-4">
                                <SectionHeader
                                    title="Statistics"
                                    subtitle="Key metrics display"
                                    isOpen={expandedSections.storyStats}
                                    onToggle={() => toggleSection('storyStats')}
                                />
                                {expandedSections.storyStats && (
                                    <div className="card-body">
                                        <div className="row g-3">
                                            {storyForm.stats.map((stat, idx) => (
                                                <div key={idx} className="col-md-4">
                                                    <div className="p-3 rounded-3 bg-light">
                                                        <div className="d-flex justify-content-between mb-2">
                                                            <small className="text-secondary">Stat {idx + 1}</small>
                                                            <button
                                                                className="btn btn-link text-danger p-0"
                                                                onClick={() => {
                                                                    const newStats = storyForm.stats.filter((_, i) => i !== idx);
                                                                    handleStoryChange('stats', newStats);
                                                                }}
                                                            >
                                                                <i className="ti ti-x"></i>
                                                            </button>
                                                        </div>
                                                        <div className="input-group input-group-sm mb-2">
                                                            <input
                                                                type="number"
                                                                className="form-control bg-white border-secondary text-dark"
                                                                placeholder="Number"
                                                                value={stat.number}
                                                                onChange={(e) => {
                                                                    const newStats = [...storyForm.stats];
                                                                    newStats[idx] = { ...stat, number: parseInt(e.target.value) || 0 };
                                                                    handleStoryChange('stats', newStats);
                                                                }}
                                                            />
                                                            <input
                                                                type="text"
                                                                className="form-control bg-white border-secondary text-dark"
                                                                placeholder="Suffix"
                                                                value={stat.suffix}
                                                                onChange={(e) => {
                                                                    const newStats = [...storyForm.stats];
                                                                    newStats[idx] = { ...stat, suffix: e.target.value };
                                                                    handleStoryChange('stats', newStats);
                                                                }}
                                                                style={{ maxWidth: '60px' }}
                                                            />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm bg-white border-secondary text-dark"
                                                            placeholder="Label"
                                                            value={stat.text}
                                                            onChange={(e) => {
                                                                const newStats = [...storyForm.stats];
                                                                newStats[idx] = { ...stat, text: e.target.value };
                                                                handleStoryChange('stats', newStats);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="col-12">
                                                <button
                                                    className="btn btn-outline-secondary w-100"
                                                    onClick={() => handleStoryChange('stats', [...storyForm.stats, { number: 0, suffix: '+', text: '' }])}
                                                >
                                                    <i className="ti ti-plus me-2"></i>Add Statistic
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-lg-4">
                            <div className="card border-0 shadow-sm">
                                <SectionHeader
                                    title="Media Assets"
                                    subtitle="Images and gallery"
                                    isOpen={true}
                                    onToggle={() => { }}
                                />
                                <div className="card-body">
                                    <ImageUploader
                                        label="Main Image"
                                        currentImageUrl={storyForm.mainImage}
                                        onFileSelect={setStoryMainImageFile}
                                        onUrlChange={(url) => handleStoryChange('mainImage', url)}
                                        variant="hero"
                                    />

                                    <hr className="my-4" />

                                    <label className="form-label text-dark small fw-medium">Side Images Gallery</label>
                                    <div className="space-y-3">
                                        {storyForm.sideImages.map((url, idx) => (
                                            <div key={idx} className="p-3 rounded-3 bg-light">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <small className="text-secondary">Image {idx + 1}</small>
                                                    <button
                                                        className="btn btn-link text-danger p-0"
                                                        onClick={() => {
                                                            const newImages = storyForm.sideImages.filter((_, i) => i !== idx);
                                                            handleStoryChange('sideImages', newImages);
                                                            setStorySideImageFiles(prev => prev.filter((_, i) => i !== idx));
                                                        }}
                                                    >
                                                        <i className="ti ti-x"></i>
                                                    </button>
                                                </div>
                                                <ImageUploader
                                                    label=""
                                                    currentImageUrl={url}
                                                    onFileSelect={(file) => {
                                                        const newFiles = [...storySideImageFiles];
                                                        newFiles[idx] = file;
                                                        setStorySideImageFiles(newFiles);
                                                    }}
                                                    onUrlChange={(newUrl) => {
                                                        const newImages = [...storyForm.sideImages];
                                                        newImages[idx] = newUrl;
                                                        handleStoryChange('sideImages', newImages);
                                                    }}
                                                    variant="compact"
                                                />
                                            </div>
                                        ))}
                                        <button
                                            className="btn btn-outline-secondary w-100"
                                            onClick={() => {
                                                handleStoryChange('sideImages', [...storyForm.sideImages, '']);
                                                setStorySideImageFiles(prev => [...prev, null]);
                                            }}
                                        >
                                            <i className="ti ti-plus me-2"></i>Add Gallery Image
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="d-grid gap-2 mt-4">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleSave('story')}
                                    disabled={saving.story}
                                >
                                    {saving.story ? (
                                        <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                                    ) : (
                                        <><i className="ti ti-device-floppy me-2"></i>Save Story</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'contact' && contactForm && (
                    <div className="row g-4">
                        <div className="col-lg-6">
                            <div className="card border-0 shadow-sm">
                                <SectionHeader
                                    title="Contact Details"
                                    subtitle="Primary contact information"
                                    isOpen={expandedSections.contactBasic}
                                    onToggle={() => toggleSection('contactBasic')}
                                />
                                {expandedSections.contactBasic && (
                                    <div className="card-body">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="form-label text-dark small fw-medium">
                                                    <i className="ti ti-phone me-2 text-primary"></i>Phone Number
                                                </label>
                                                <input
                                                    type="tel"
                                                    className="form-control bg-white border-secondary text-dark"
                                                    value={contactForm.phone}
                                                    onChange={(e) => handleContactChange('phone', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label text-dark small fw-medium">
                                                    <i className="ti ti-map-pin me-2 text-primary"></i>Address Line 1
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-white border-secondary text-dark"
                                                    value={contactForm.addressLine1}
                                                    onChange={(e) => handleContactChange('addressLine1', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label text-dark small fw-medium">
                                                    <i className="ti ti-map-pin me-2 text-primary"></i>Address Line 2
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-white border-secondary text-dark"
                                                    value={contactForm.addressLine2}
                                                    onChange={(e) => handleContactChange('addressLine2', e.target.value)}
                                                />
                                            </div>

                                            <hr />

                                            <div>
                                                <label className="form-label text-dark small fw-medium">
                                                    <i className="ti ti-mail me-2 text-primary"></i>Email Addresses
                                                </label>
                                                <ArrayFieldManager
                                                    items={contactForm.emails}
                                                    onAdd={() => handleContactChange('emails', [...contactForm.emails, ''])}
                                                    onRemove={(idx) => {
                                                        const newEmails = contactForm.emails.filter((_, i) => i !== idx);
                                                        handleContactChange('emails', newEmails);
                                                    }}
                                                    onChange={(idx, val) => {
                                                        const newEmails = [...contactForm.emails];
                                                        newEmails[idx] = val;
                                                        handleContactChange('emails', newEmails);
                                                    }}
                                                    placeholder="email@example.com"
                                                    addLabel="Add Email"
                                                    icon="mail"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-lg-6">
                            <div className="card border-0 shadow-sm">
                                <SectionHeader
                                    title="Social Media"
                                    subtitle="Connected platforms"
                                    isOpen={expandedSections.contactSocial}
                                    onToggle={() => toggleSection('contactSocial')}
                                />
                                {expandedSections.contactSocial && (
                                    <div className="card-body">
                                        <div className="space-y-3">
                                            {contactForm.socialLinks.map((link, idx) => (
                                                <div key={idx} className="p-3 rounded-3 bg-light">
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <i className={`ti ti-${link.platform.toLowerCase() || 'share'} text-primary`}></i>
                                                            <span className="text-dark fw-medium">{link.platform || 'New Link'}</span>
                                                        </div>
                                                        <button
                                                            className="btn btn-link text-danger p-0"
                                                            onClick={() => {
                                                                const newLinks = contactForm.socialLinks.filter((_, i) => i !== idx);
                                                                handleContactChange('socialLinks', newLinks);
                                                            }}
                                                        >
                                                            <i className="ti ti-trash"></i>
                                                        </button>
                                                    </div>
                                                    <div className="row g-2">
                                                        <div className="col-md-4">
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm bg-white border-secondary text-dark"
                                                                placeholder="Platform"
                                                                value={link.platform}
                                                                onChange={(e) => {
                                                                    const newLinks = [...contactForm.socialLinks];
                                                                    newLinks[idx] = { ...link, platform: e.target.value };
                                                                    handleContactChange('socialLinks', newLinks);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="col-md-5">
                                                            <input
                                                                type="url"
                                                                className="form-control form-control-sm bg-white border-secondary text-dark"
                                                                placeholder="URL"
                                                                value={link.url}
                                                                onChange={(e) => {
                                                                    const newLinks = [...contactForm.socialLinks];
                                                                    newLinks[idx] = { ...link, url: e.target.value };
                                                                    handleContactChange('socialLinks', newLinks);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="col-md-3">
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm bg-white border-secondary text-dark"
                                                                placeholder="Icon"
                                                                value={link.iconClass}
                                                                onChange={(e) => {
                                                                    const newLinks = [...contactForm.socialLinks];
                                                                    newLinks[idx] = { ...link, iconClass: e.target.value };
                                                                    handleContactChange('socialLinks', newLinks);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                className="btn btn-outline-secondary w-100"
                                                onClick={() => handleContactChange('socialLinks', [...contactForm.socialLinks, { platform: '', url: '', iconClass: '' }])}
                                            >
                                                <i className="ti ti-plus me-2"></i>Add Social Link
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="d-grid gap-2 mt-4">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleSave('contact')}
                                    disabled={saving.contact}
                                >
                                    {saving.contact ? (
                                        <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                                    ) : (
                                        <><i className="ti ti-device-floppy me-2"></i>Save Contact Info</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Minimal global styles to support Bootstrap defaults */}
            <style jsx global>{`
                body {
                    background-color: #f8f9fa;
                }
                .form-control:focus {
                    border-color: #86b7fe;
                    box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
                }
                .nav-tabs .nav-link {
                    border: none;
                    color: #6c757d;
                    padding: 0.75rem 1rem;
                }
                .nav-tabs .nav-link:hover {
                    border: none;
                    color: #495057;
                }
                .nav-tabs .nav-link.active {
                    border: none;
                    color: #5b50e1;
                    background: transparent;
                    border-bottom: 2px solid #5b50e1;
                }
                .card {
                    border-radius: 0.5rem;
                }
                .cursor-pointer {
                    cursor: pointer;
                }
                .space-y-2 > * + * {
                    margin-top: 0.5rem;
                }
                .space-y-3 > * + * {
                    margin-top: 1rem;
                }
                .transition-transform {
                    transition: transform 0.2s ease;
                }
                .hover-opacity-100:hover {
                    opacity: 1;
                }
                .transition-opacity {
                    transition: opacity 0.2s ease;
                }
            `}</style>
        </div>
    );
}