// app/admin/career/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';

// Types
interface Education {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear?: number;
  current: boolean;
}

interface Experience {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface PipelineProfile {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  country?: string;
  linkedIn?: string;
  portfolio?: string;
  title: string;
  summary?: string;
  avatarUrl?: string;
  resumeUrl?: string;
  education: Education[];
  experience: Experience[];
  skills: Skill[];
  stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  isPublic: boolean;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface ApiListResponse {
  data: PipelineProfile[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// Skeleton row for loading state
function SkeletonRow() {
  return (
    <tr>
      <td><div className="skeleton skeleton--text" style={{ width: 20, height: 20 }} /></td>
      <td><div className="skeleton skeleton--text" style={{ width: 120, height: 20 }} /></td>
      <td><div className="skeleton skeleton--text" style={{ width: 150, height: 20 }} /></td>
      <td><div className="skeleton skeleton--text" style={{ width: 100, height: 20 }} /></td>
      <td><div className="skeleton skeleton--text" style={{ width: 80, height: 20 }} /></td>
      <td><div className="skeleton skeleton--text" style={{ width: 80, height: 20 }} /></td>
      <td><div className="skeleton skeleton--text" style={{ width: 60, height: 20 }} /></td>
      <td><div className="skeleton skeleton--text" style={{ width: 80, height: 20 }} /></td>
    </tr>
  );
}

export default function CareerPipelineAdminPage() {
  const [profiles, setProfiles] = useState<PipelineProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [publicFilter, setPublicFilter] = useState<string>('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Modal for details/editing
  const [showModal, setShowModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<PipelineProfile | null>(null);
  const [editingStage, setEditingStage] = useState('');
  const [editingStatus, setEditingStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch data with all filters and sorting
  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (stageFilter) params.set('stage', stageFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (publicFilter) params.set('isPublic', publicFilter);
      if (createdFrom) params.set('createdFrom', createdFrom);
      if (createdTo) params.set('createdTo', createdTo);
      params.set('page', String(page));
      params.set('perPage', String(perPage));
      if (sortColumn) params.set('sortBy', sortColumn);
      params.set('sortOrder', sortDirection);

      const res = await fetch(`/api/admin/career?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json: ApiListResponse = await res.json();
      setProfiles(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
      setSelectedIds([]);
      setSelectAll(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchProfiles, 300);
    return () => clearTimeout(timer);
  }, [page, search, stageFilter, statusFilter, publicFilter, createdFrom, createdTo, sortColumn, sortDirection]);

  // Sorting handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <i className="ti ti-arrows-sort text-muted ms-1" />;
    return sortDirection === 'asc'
      ? <i className="ti ti-arrow-up ms-1" />
      : <i className="ti ti-arrow-down ms-1" />;
  };

  // Bulk selection
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(profiles.map(p => p._id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const newSet = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      setSelectAll(newSet.length === profiles.length && profiles.length > 0);
      return newSet;
    });
  };

  const handleBulkAction = async (action: string, payload?: any) => {
    if (selectedIds.length === 0) return alert('No items selected');
    if (action === 'delete' && !confirm(`Delete ${selectedIds.length} profile(s)?`)) return;

    try {
      const res = await fetch('/api/admin/career/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: selectedIds, payload }),
      });
      if (!res.ok) throw new Error('Bulk action failed');
      await fetchProfiles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Export to Excel
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (stageFilter) params.set('stage', stageFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (publicFilter) params.set('isPublic', publicFilter);
      if (createdFrom) params.set('createdFrom', createdFrom);
      if (createdTo) params.set('createdTo', createdTo);
      if (sortColumn) params.set('sortBy', sortColumn);
      params.set('sortOrder', sortDirection);
      params.set('perPage', '10000');

      const res = await fetch(`/api/admin/career/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');
      const json = await res.json();

      // Build Excel using ExcelJS (same pattern as metadata page)
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Career Pipeline');

      sheet.columns = [
        { header: 'ID', key: '_id', width: 30 },
        { header: 'User ID', key: 'userId', width: 30 },
        { header: 'First Name', key: 'firstName', width: 15 },
        { header: 'Last Name', key: 'lastName', width: 15 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Country', key: 'country', width: 15 },
        { header: 'LinkedIn', key: 'linkedIn', width: 30 },
        { header: 'Portfolio', key: 'portfolio', width: 30 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Summary', key: 'summary', width: 50 },
        { header: 'Avatar URL', key: 'avatarUrl', width: 40 },
        { header: 'Resume URL', key: 'resumeUrl', width: 40 },
        { header: 'Stage', key: 'stage', width: 12 },
        { header: 'Public', key: 'isPublic', width: 8 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Updated At', key: 'updatedAt', width: 20 },
      ];

      json.data.forEach((p: PipelineProfile) => {
        sheet.addRow({
          ...p,
          isPublic: p.isPublic ? 'Yes' : 'No',
          createdAt: new Date(p.createdAt).toLocaleString(),
          updatedAt: new Date(p.updatedAt).toLocaleString(),
        });
      });

      sheet.getRow(1).font = { bold: true };
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `career_pipeline_${new Date().toISOString().slice(0, 19)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Import from Excel
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/career/import', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Import failed');
      const result = await res.json();
      alert(`Import completed: ${result.created} created, ${result.updated} updated, ${result.errors} errors`);
      fetchProfiles();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setStageFilter('');
    setStatusFilter('');
    setPublicFilter('');
    setCreatedFrom('');
    setCreatedTo('');
    setSortColumn('createdAt');
    setSortDirection('desc');
    setPage(1);
  };

  // Open detail modal
  const openModal = async (profile: PipelineProfile) => {
    setSelectedProfile(profile);
    setEditingStage(profile.stage);
    setEditingStatus(profile.status);
    setShowModal(true);
  };

  // Save changes from modal
  const handleSaveChanges = async () => {
    if (!selectedProfile) return;
    try {
      const res = await fetch(`/api/admin/career/${selectedProfile._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: editingStage, status: editingStatus }),
      });
      if (!res.ok) throw new Error('Update failed');
      setShowModal(false);
      fetchProfiles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 p-3 bg-white border-bottom shadow-sm">
        <div>
          <h4 className="mb-1 fw-semibold">Career Pipeline</h4>
          <p className="text-muted small mb-0">Manage candidate profiles and hiring stages</p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={clearFilters}>Clear</button>

          <button className="btn btn-sm btn-outline-info" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing...' : <><i className="ti ti-file-import me-1"></i>Import</>}
          </button>
          <input type="file" ref={fileInputRef} accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />

          <button className="btn btn-sm btn-outline-success" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : <><i className="ti ti-file-spreadsheet me-1"></i>Export</>}
          </button>

          {selectedIds.length > 0 && (
            <div className="dropdown">
              <button className="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">
                Bulk Actions ({selectedIds.length})
              </button>
              <ul className="dropdown-menu">
                <li><button className="dropdown-item" onClick={() => handleBulkAction('updateStage', { stage: 'screening' })}>Move to Screening</button></li>
                <li><button className="dropdown-item" onClick={() => handleBulkAction('updateStage', { stage: 'interview' })}>Move to Interview</button></li>
                <li><button className="dropdown-item" onClick={() => handleBulkAction('updateStatus', { status: 'active' })}>Set Active</button></li>
                <li><button className="dropdown-item" onClick={() => handleBulkAction('updateStatus', { status: 'archived' })}>Archive</button></li>
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item text-danger" onClick={() => handleBulkAction('delete')}>Delete</button></li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="row g-2 mb-3" style={{overflowX:"auto"}}>
        <div className="col-md-3">
          <input type="text" className="form-control form-control-sm" placeholder="Search name, email, title..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="col-md-2">
          <select className="form-select form-select-sm" value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
            <option value="">All Stages</option>
            <option value="applied">Applied</option>
            <option value="screening">Screening</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select form-select-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select form-select-sm" value={publicFilter} onChange={e => setPublicFilter(e.target.value)}>
            <option value="">Any Visibility</option>
            <option value="true">Public</option>
            <option value="false">Private</option>
          </select>
        </div>
        <div className="col-md-3 d-flex gap-1">
          <input type="date" className="form-control form-control-sm" value={createdFrom} onChange={e => setCreatedFrom(e.target.value)} placeholder="From" />
          <input type="date" className="form-control form-control-sm" value={createdTo} onChange={e => setCreatedTo(e.target.value)} placeholder="To" />
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Table */}
      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 40 }}><input type="checkbox" className="form-check-input" checked={selectAll} onChange={handleSelectAll} /></th>
                <th onClick={() => handleSort('firstName')} style={{ cursor: 'pointer' }}>Name <SortIcon column="firstName" /></th>
                <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>Email <SortIcon column="email" /></th>
                <th onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>Title <SortIcon column="title" /></th>
                <th onClick={() => handleSort('stage')} style={{ cursor: 'pointer' }}>Stage <SortIcon column="stage" /></th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status <SortIcon column="status" /></th>
                <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer' }}>Created <SortIcon column="createdAt" /></th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: perPage }).map((_, i) => <SkeletonRow key={i} />)
              ) : profiles.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-5">No profiles found.</td></tr>
              ) : (
                profiles.map(profile => (
                  <tr key={profile._id}>
                    <td><input type="checkbox" className="form-check-input" checked={selectedIds.includes(profile._id)} onChange={() => handleSelectRow(profile._id)} /></td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {profile.avatarUrl && <img src={profile.avatarUrl} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: '50%' }} />}
                        <span>{profile.firstName} {profile.lastName}</span>
                      </div>
                    </td>
                    <td>{profile.email}</td>
                    <td>{profile.title}</td>
                    <td><span className={`badge bg-${getStageColor(profile.stage)}`}>{profile.stage}</span></td>
                    <td><span className={`badge bg-${profile.status === 'active' ? 'success' : profile.status === 'draft' ? 'warning' : 'secondary'}`}>{profile.status}</span></td>
                    <td>{new Date(profile.createdAt).toLocaleDateString()}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openModal(profile)}><i className="ti ti-eye"></i></button>
                      <a href={profile.resumeUrl} target="_blank" className="btn btn-sm btn-outline-secondary" download><i className="ti ti-download"></i></a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer d-flex justify-content-between">
            <small>Showing {profiles.length} of {total}</small>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(p => p - 1)}>Prev</button></li>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let num = i + 1;
                if (totalPages > 5) {
                  if (page > 3) num = page - 2 + i;
                  if (page > totalPages - 2) num = totalPages - 4 + i;
                }
                return <li key={num} className={`page-item ${page === num ? 'active' : ''}`}><button className="page-link" onClick={() => setPage(num)}>{num}</button></li>;
              })}
              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(p => p + 1)}>Next</button></li>
            </ul>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showModal && selectedProfile && (
        <div className="modal show d-block" style={{ backgroundColor: '#00000080' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5>{selectedProfile.firstName} {selectedProfile.lastName}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-8">
                    <p><strong>Title:</strong> {selectedProfile.title}</p>
                    <p><strong>Email:</strong> {selectedProfile.email}</p>
                    <p><strong>Phone:</strong> {selectedProfile.phone || '—'}</p>
                    <p><strong>Location:</strong> {selectedProfile.location}, {selectedProfile.country}</p>
                    <p><strong>LinkedIn:</strong> {selectedProfile.linkedIn ? <a href={selectedProfile.linkedIn} target="_blank">Profile</a> : '—'}</p>
                    <p><strong>Portfolio:</strong> {selectedProfile.portfolio ? <a href={selectedProfile.portfolio} target="_blank">Link</a> : '—'}</p>
                    <p><strong>Summary:</strong> {selectedProfile.summary || '—'}</p>

                    <h6 className="mt-3">Experience</h6>
                    {selectedProfile.experience.length > 0 ? (
                      selectedProfile.experience.map((exp, i) => (
                        <div key={i} className="mb-2">
                          <strong>{exp.title}</strong> at {exp.company}<br />
                          <small>{new Date(exp.startDate).toLocaleDateString()} - {exp.current ? 'Present' : exp.endDate ? new Date(exp.endDate).toLocaleDateString() : ''}</small>
                          <p className="mb-0">{exp.description}</p>
                        </div>
                      ))
                    ) : <p>No experience listed.</p>}

                    <h6 className="mt-3">Education</h6>
                    {selectedProfile.education.length > 0 ? (
                      selectedProfile.education.map((edu, i) => (
                        <div key={i} className="mb-2">
                          <strong>{edu.degree} in {edu.fieldOfStudy}</strong><br />
                          {edu.institution}, {edu.startYear} - {edu.current ? 'Present' : edu.endYear}
                        </div>
                      ))
                    ) : <p>No education listed.</p>}

                    <h6 className="mt-3">Skills</h6>
                    {selectedProfile.skills.length > 0 ? (
                      selectedProfile.skills.map((skill, i) => (
                        <span key={i} className="badge bg-light text-dark me-1 mb-1">{skill.name} ({skill.level})</span>
                      ))
                    ) : <p>No skills listed.</p>}
                  </div>
                  <div className="col-md-4">
                    {selectedProfile.avatarUrl && <img src={selectedProfile.avatarUrl} alt="Avatar" className="img-fluid rounded mb-3" />}
                    {selectedProfile.resumeUrl && (
                      <a href={selectedProfile.resumeUrl} target="_blank" className="btn btn-outline-primary w-100" download>
                        <i className="ti ti-file-text me-1"></i>Download Resume
                      </a>
                    )}
                  </div>
                </div>
                <hr />
                <div className="row">
                  <div className="col">
                    <label className="form-label">Stage</label>
                    <select className="form-select" value={editingStage} onChange={e => setEditingStage(e.target.value)}>
                      <option value="applied">Applied</option>
                      <option value="screening">Screening</option>
                      <option value="interview">Interview</option>
                      <option value="offer">Offer</option>
                      <option value="hired">Hired</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="col">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={editingStatus} onChange={e => setEditingStatus(e.target.value)}>
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                <button className="btn btn-primary" onClick={handleSaveChanges}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper for stage badge color
function getStageColor(stage: string): string {
  switch (stage) {
    case 'applied': return 'secondary';
    case 'screening': return 'info';
    case 'interview': return 'primary';
    case 'offer': return 'warning';
    case 'hired': return 'success';
    case 'rejected': return 'danger';
    default: return 'light';
  }
}