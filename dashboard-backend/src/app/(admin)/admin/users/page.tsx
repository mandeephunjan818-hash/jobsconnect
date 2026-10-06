'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import "../../../../../public/assets/scss/_auth.scss";

// ----- Types -----
interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: string;
  isBlocked: boolean;
  blockedAt?: string;
  blockReason?: string;
  lastLoginAt?: string;
  loginCount: number;
  createdAt: string;
}

interface ApiResponse {
  data: UserListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'loading';
}

// ----- Skeleton Row -----
function SkeletonRow() {
  return (
    <tr>
      <td><div className="skeleton skeleton--text" style={{ width: 180 }} /></td>
      <td><div className="skeleton skeleton--text" style={{ width: 150 }} /></td>
      <td><div className="skeleton skeleton--text" style={{ width: 100 }} /></td>
      <td><div className="skeleton skeleton--text" style={{ width: 80 }} /></td>
      <td><div className="skeleton skeleton--text" style={{ width: 100 }} /></td>
    </tr>
  );
}

// ----- Main Component -----
export default function AdminManagementPage() {
  const router = useRouter();
  const { signUp, isLoading: authLoading, clearError } = useAuth();

  // Table state
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & pagination
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [blockedFilter, setBlockedFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal & form
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [showPass, setShowPass] = useState(false);

  // Mobile filter toggle
  const [mobileOpen, setMobileOpen] = useState(false);

  // ----- Toast system -----
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loadingToastId, setLoadingToastId] = useState<string | null>(null);

  // Auto-remove non‑loading toasts after 4 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts
      .filter(t => t.type !== 'loading')
      .map(t => setTimeout(() => removeToast(t.id), 4000));
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  const addToast = (message: string, type: Toast['type']): string => {
    const id = Date.now().toString() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    setLoadingToastId(prev => (prev === id ? null : prev));
  };

  const updateToast = (id: string, message: string, type?: Toast['type']) => {
    setToasts(prev =>
      prev.map(t => (t.id === id ? { ...t, message, type: type ?? t.type } : t))
    );
  };

  // ----- Data Fetching -----
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (blockedFilter) params.set('isBlocked', blockedFilter);
      params.set('page', String(page));
      params.set('perPage', String(perPage));
      params.set('sortBy', sortColumn);
      params.set('sortOrder', sortDirection);

      const res = await fetch(`/api/admin/admins?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch admins');
      const json: ApiResponse = await res.json();
      setUsers(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(timer);
  }, [page, search, roleFilter, blockedFilter, sortColumn, sortDirection]);

  // ----- Handlers -----
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setBlockedFilter('');
    setSortColumn('createdAt');
    setSortDirection('desc');
    setPage(1);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <i className="ti ti-arrows-sort text-muted ms-1" />;
    return sortDirection === 'asc' ? <i className="ti ti-arrow-up ms-1" /> : <i className="ti ti-arrow-down ms-1" />;
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setFormData({ name: '', email: '', password: '' });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ name: '', email: '', password: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    clearError?.();
  };

  // ----- Sub-Admin creation with step‑by‑step toasts -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1️⃣ Start loading toast
    const toastId = addToast('Creating Sub-Admin...', 'loading');
    setLoadingToastId(toastId);

    const payload = { ...formData, role: 'sub-admin' };

    // 2️⃣ Create account
    const result = await signUp(payload);

    if (!result.success) {
      // Show error toast and stop
      removeToast(toastId);
      addToast(result.error || 'Something went wrong.', 'error');
      return;
    }

    // 3️⃣ Account created → update toast & verify email
    updateToast(toastId, 'Verifying email...', 'loading');

    try {
      const verifyRes = await fetch(`/api/auth/verify-email?token=${result.data.token}`);
      if (!verifyRes.ok) {
        // Verification failed, but account exists → warn user
        removeToast(toastId);
        addToast('Account created, but email verification failed.', 'error');
      } else {
        // 4️⃣ All good → success toast
        removeToast(toastId);
        addToast('Sub-Admin created successfully!', 'success');
      }
    } catch (err) {
      removeToast(toastId);
      addToast('Account created, but verification request failed.', 'error');
    }

    // Always close modal & refresh list
    handleCloseModal();
    fetchUsers();
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (roleFilter !== 'all' ? 1 : 0) +
    (blockedFilter !== '' ? 1 : 0);

  // ----- UI -----
  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex d-coloumn flex-wrap justify-content-between align-items-center mb-4 p-3 bg-white border-bottom shadow-sm">
        <div className="d-md-flex justify-content-between align-items-center w-100">
          <div>
            <h4 className="mb-1 fw-semibold">Admin Management</h4>
            <p className="text-muted small mb-0">View and manage Admin and Sub-Admin accounts</p>
          </div>
          <div className="d-flex overflow-auto gap-3">
            {activeFilterCount > 0 && (
              <button className="btn btn-sm btn-outline-dark" style={{ textWrap: "nowrap" }} onClick={clearFilters}>
                Clear
              </button>
            )}
            <button className="btn btn-sm btn-primary" style={{ textWrap: "nowrap" }} onClick={handleOpenModal}>
              <i className="ti ti-plus me-1"></i>Add Sub-Admin
            </button>
          </div>
        </div>
        <div
          className="ulp-filters bg-white rounded-3 p-2 mx-auto ms-md-auto me-md-0 mt-2 mt-md-0"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          {/* Mobile toggle */}
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
                <span className="badge rounded-pill" style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 10 }}>
                  {activeFilterCount}
                </span>
              )}
              <i
                className="ti ti-chevron-down"
                style={{ fontSize: 14, transition: 'transform 0.2s', transform: mobileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </span>
          </button>

          {/* Desktop row */}
          <div className="d-none d-md-flex align-items-center flex-wrap gap-2">
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
                style={{ width: 200, fontSize: 12, outline: 'none', color: 'inherit' }}
                placeholder="Search by email or name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {activeFilterCount > 0 && (
              <button
                className="btn btn-sm border d-flex align-items-center gap-1 text-secondary"
                style={{ fontSize: 12, height: 32, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6 }}
                onClick={clearFilters}
              >
                <i className="ti ti-x" style={{ fontSize: 12 }}></i>
                Clear
              </button>
            )}
          </div>

          {/* Mobile panel */}
          <div className="d-md-none w-100 overflow-hidden" style={{ maxHeight: mobileOpen ? 400 : 0, transition: 'max-height 0.28s ease' }}>
            <div className="d-flex flex-column gap-2 pt-2 mt-1" style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)' }}>
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
                  placeholder="Search by email or name…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div
                className="d-flex align-items-center rounded-2 px-2 gap-2 w-100"
                style={{ height: 38, background: '#f3f3f1', border: '0.5px solid transparent' }}
                onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
              >
                <i className="ti ti-user-circle text-secondary" style={{ fontSize: 13 }}></i>
                <select
                  className="border-0 bg-transparent p-0 shadow-none flex-fill"
                  style={{ fontSize: 13, outline: 'none', height: '100%', cursor: 'pointer' }}
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="sub-admin">Sub-Admin</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div
                className="d-flex align-items-center rounded-2 px-2 gap-2 w-100"
                style={{ height: 38, background: '#f3f3f1', border: '0.5px solid transparent' }}
                onFocusCapture={e => e.currentTarget.style.borderColor = '#534AB7'}
                onBlurCapture={e => e.currentTarget.style.borderColor = 'transparent'}
              >
                <i className="ti ti-shield text-secondary" style={{ fontSize: 13 }}></i>
                <select
                  className="border-0 bg-transparent p-0 shadow-none flex-fill"
                  style={{ fontSize: 13, outline: 'none', height: '100%', cursor: 'pointer' }}
                  value={blockedFilter}
                  onChange={e => setBlockedFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="true">Blocked</option>
                  <option value="false">Active</option>
                </select>
              </div>
              {activeFilterCount > 0 && (
                <button
                  className="btn btn-sm w-100 d-flex align-items-center justify-content-center gap-1 text-secondary border"
                  style={{ fontSize: 13, height: 38, borderColor: 'rgba(0,0,0,0.12)', background: 'transparent', borderRadius: 6 }}
                  onClick={clearFilters}
                >
                  <i className="ti ti-x" style={{ fontSize: 12 }}></i> Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inline error for list fetch (optional, keeps retry accessible) */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-3">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline-danger" onClick={fetchUsers}>Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-header-custom">
                <tr>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Name <SortIcon column="name" /></th>
                  <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>Email <SortIcon column="email" /></th>
                  <th onClick={() => handleSort('role')} style={{ cursor: 'pointer' }}>Role <SortIcon column="role" /></th>
                  <th onClick={() => handleSort('isBlocked')} style={{ cursor: 'pointer' }}>Status <SortIcon column="isBlocked" /></th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: perPage }).map((_, i) => <SkeletonRow key={i} />)
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-5"><div className="text-muted">No admins found</div></td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-bottom">
                      <td className="fw-medium" style={{ textWrap: "nowrap" }}>{user.name}</td>
                      <td>{user.email}</td>
                      <td><span className="badge bg-info">{user.role}</span></td>
                      <td>
                        {user.isBlocked ? (
                          <span className="badge bg-danger">Blocked</span>
                        ) : (
                          <span className="badge bg-success">Active</span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="btn-group">
                          <Link href={`/admin/users/${user.id}`} className="action-btn">
                            <i className="ti ti-eye"></i>
                          </Link>
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
            <div className="small text-muted">Showing {users.length} of {total} users</div>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</button>
                </li>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = page;
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

      {/* Add Sub-Admin Modal (creates role: 'sub-admin') */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered overflow-auto modal-md">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-light border-bottom py-2">
                <h5 className="modal-title">
                  <i className="ti ti-plus me-2"></i>
                  Create Sub-Admin
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <form className="auth-form p-5 col-12 mx-auto" onSubmit={handleSubmit} noValidate>
                {/* Name */}
                <div className="auth-form__field">
                  <label className="auth-form__label">Your Name</label>
                  <input
                    type="text"
                    name="name"
                    className="auth-form__input"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                  />
                </div>
                {/* Email */}
                <div className="auth-form__field">
                  <label className="auth-form__label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="auth-form__input"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                {/* Password */}
                <div className="auth-form__field">
                  <label className="auth-form__label">Password</label>
                  <div className="auth-form__input-wrap">
                    <input
                      type={showPass ? "text" : "password"}
                      name="password"
                      className="auth-form__input"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min 8 characters"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      className="auth-form__eye"
                      onClick={() => setShowPass(!showPass)}
                    >
                      {showPass ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                {/* Submit */}
                <button
                  type="submit"
                  className="auth-form__submit"
                  disabled={authLoading}
                >
                  {authLoading ? 'Creating account...' : 'Create Sub-Admin'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Toast Container ---------- */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            pointerEvents: 'none',
          }}
        >
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`toast-item toast-${toast.type}`}
              style={{
                pointerEvents: 'auto',
                minWidth: 280,
                padding: '14px 18px',
                borderRadius: 10,
                background: toast.type === 'loading' ? '#ffffff' : '#1e293b',
                color: toast.type === 'loading' ? '#1e293b' : '#ffffff',
                boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
                animation: 'slideIn 0.25s ease',
                border: toast.type === 'loading' ? '1px solid rgba(0,0,0,0.08)' : 'none',
                opacity: toast.type === 'loading' ? 0.92 : 1,
              }}
            >
              {/* Icon */}
              {toast.type === 'loading' && (
                <span className="spinner-border spinner-border-sm text-secondary" role="status" />
              )}
              {toast.type === 'success' && (
                <i className="ti ti-circle-check" style={{ fontSize: 18, color: '#4ade80' }} />
              )}
              {toast.type === 'error' && (
                <i className="ti ti-alert-circle" style={{ fontSize: 18, color: '#f87171' }} />
              )}
              <span style={{ flex: 1, fontWeight: 500 }}>{toast.message}</span>
              {toast.type !== 'loading' && (
                <button
                  onClick={() => removeToast(toast.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: toast.type === 'error' ? '#f87171' : '#ccc',
                    cursor: 'pointer',
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  <i className="ti ti-x" style={{ fontSize: 14 }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skeleton & toast keyframes */}
      <style jsx>{`
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
        .table-header-custom th:hover { background-color: #e9ecef; }
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          height: 20px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes slideIn {
          from {
            transform: translateX(50px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// ----- SVG Icons -----
function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}