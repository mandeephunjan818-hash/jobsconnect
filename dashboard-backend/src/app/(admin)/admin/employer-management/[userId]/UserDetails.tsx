'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface UserDetail {
    id: string;
    email: string;
    emailVerified: string | null;
    createdAt: string;
    updatedAt: string;
}

interface Profile {
    name: string;
    role: string;
    isBlocked: boolean;
    blockedAt?: string;
    blockReason?: string;
    phone?: string;
    timezone?: string;
    language?: string;
    lastLoginAt?: string;
    loginCount: number;
}

interface LoginHistoryItem {
    _id: string;
    provider: string;
    success: boolean;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
    location?: { country?: string; city?: string };
    timestamp: string;
}

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.userId as string;

    const [user, setUser] = useState<UserDetail | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [blocking, setBlocking] = useState(false);
    const [blockReason, setBlockReason] = useState('');
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Active tab: 'overview' | 'permissions'
    const [activeTab, setActiveTab] = useState<'overview' | 'permissions'>('overview');

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}`);
            if (!res.ok) throw new Error('Failed to fetch user details');
            const data = await res.json();
            setUser(data.user);
            setProfile(data.profile);
            setLoginHistory(data.loginHistory);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) fetchData();
    }, [userId]);

    const handleBlockToggle = async () => {
        if (!profile) return;
        const newBlocked = !profile.isBlocked;
        if (newBlocked && !blockReason.trim()) {
            alert('Please provide a reason for blocking');
            return;
        }
        setBlocking(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}/block`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isBlocked: newBlocked, blockReason: newBlocked ? blockReason : undefined }),
            });
            if (!res.ok) throw new Error('Failed to update block status');
            const updated = await res.json();
            setProfile({ ...profile, isBlocked: updated.isBlocked, blockedAt: updated.blockedAt, blockReason: updated.blockReason });
            setShowBlockModal(false);
            setBlockReason('');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setBlocking(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString();
    };

    if (loading) {
        return (
            <div className="container-fluid py-4">
                <div className="text-center py-5">Loading user details...</div>
            </div>
        );
    }

    if (error || !user || !profile) {
        return (
            <div className="container-fluid py-4">
                <div className="alert alert-danger">{error || 'User not found'}</div>
                <button className="btn btn-sm btn-secondary" onClick={() => router.push('/admin/employer-management')}>Back to Users</button>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4">

            {/* ── Page header ── */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h2 className="mb-0 fs-4">User Details</h2>
                    <div className="text-muted mt-1 small">ID: {userId}</div>
                </div>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => router.push('/admin/employer-management')}>
                    <i className="ti ti-arrow-left me-1"></i> Back to Users
                </button>
            </div>

            {/* ── Tab navigation ── */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <i className="ti ti-user me-1"></i> Overview
                    </button>
                </li>
                {/* <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'permissions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('permissions')}
                    >
                        <i className="ti ti-shield-check me-1"></i> Permissions
                        {profile.isBlocked && (
                            <span className="badge bg-danger ms-2" style={{ fontSize: 10 }}>Blocked</span>
                        )}
                    </button>
                </li> */}
            </ul>

            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
                <div className="row">
                    {/* Left: Login history */}
                    <div className="col-lg-7 mb-4">
                        <div className="card shadow-sm mb-4">
                            <div className="card-header bg-white">
                                <h5 className="mb-0"><i className="ti ti-user-circle me-2"></i>Account Information</h5>
                            </div>
                            <div className="card-body">
                                {[
                                    { label: 'Name', value: profile.name },
                                    { label: 'Email', value: user.email },
                                    { label: 'Role', value: <span className="badge bg-info">{profile.role}</span> },
                                    { label: 'Phone', value: profile.phone || '—' },
                                    { label: 'Timezone / Language', value: `${profile.timezone} / ${profile.language}` },
                                    { label: 'Last Login', value: formatDate(profile.lastLoginAt) },
                                    { label: 'Login Count', value: profile.loginCount },
                                    { label: 'Account Created', value: formatDate(user.createdAt) },
                                ].map(({ label, value }) => (
                                    <div key={label} className="mb-3">
                                        <label className="text-muted small text-uppercase">{label}</label>
                                        <div className="fw-semibold">{value}</div>
                                    </div>
                                ))}
                                {profile.isBlocked && (
                                    <div className="alert alert-danger mb-0">
                                        <strong>Blocked</strong><br />
                                        {profile.blockReason && <span>Reason: {profile.blockReason}</span>}<br />
                                        <small>Blocked on: {formatDate(profile.blockedAt)}</small>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Account info + block */}
                    <div className="col-lg-5">
                        <div className="card shadow-sm mb-4">
                            <div className="card-header bg-white">
                                <h5 className="mb-0"><i className="ti ti-ban me-2"></i>Account Status</h5>
                            </div>
                            <div className="card-body d-flex flex-column align-items-start gap-3">
                                <p className="mb-0">Current status: {profile.isBlocked
                                    ? <span className="badge bg-danger">Blocked</span>
                                    : <span className="badge bg-success">Active</span>
                                }</p>
                                <button
                                    className={` border-0 p-2 text-white rounded-2 ${profile.isBlocked ? 'bg-success' : 'bg-danger'}`}
                                    onClick={() => setShowBlockModal(true)}
                                    disabled={blocking}
                                >
                                    {profile.isBlocked
                                        ? <><i className="ti ti-lock-open me-1"></i> Unblock User</>
                                        : <><i className="ti ti-lock me-1"></i> Block User</>
                                    }
                                </button>
                            </div>
                        </div>
                        <div className="card shadow-sm " style={{height:"40vh"}}>
                            <div className="card-header bg-white">
                                <h5 className="mb-0"><i className="ti ti-history me-2"></i>Login History</h5>
                            </div>
                            <div className="card-body p-0" style={{ maxHeight: '87vh', overflowY: 'auto' }}>
                                {loginHistory.length === 0 ? (
                                    <div className="text-center text-muted py-5">No login records found</div>
                                ) : (
                                    <div className="list-group list-group-flush">
                                        {loginHistory.map((record) => (
                                            <div key={record._id} className="list-group-item">
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div>
                                                        <span className={`badge ${record.success ? 'bg-success' : 'bg-danger'} me-2`}>
                                                            {record.success ? 'Success' : 'Failed'}
                                                        </span>
                                                        <span className="badge bg-info">{record.provider}</span>
                                                        {record.failureReason && <span className="text-danger small ms-2">{record.failureReason}</span>}
                                                    </div>
                                                    <small className="text-muted">{formatDate(record.timestamp)}</small>
                                                </div>
                                                <div className="mt-2 small text-muted">
                                                    <div><i className="ti ti-device-laptop me-1"></i> IP: {record.ipAddress || '—'}</div>
                                                    <div><i className="ti ti-user me-1"></i> {record.userAgent?.substring(0, 80)}...</div>
                                                    {record.location?.country && (
                                                        <div><i className="ti ti-map-pin me-1"></i> {record.location.country}{record.location.city ? `, ${record.location.city}` : ''}</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PERMISSIONS TAB ── */}
            {/* {activeTab === 'permissions' && (
                <UserPermissionsManager
                    userId={userId}
                    userRole={profile.role}
                    userName={profile.name}
                />
            )} */}

            {/* ── Block/Unblock modal ── */}
            {showBlockModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{profile.isBlocked ? 'Unblock User' : 'Block User'}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowBlockModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                {profile.isBlocked ? (
                                    <p>Are you sure you want to unblock <strong>{profile.name}</strong>? They will be able to log in again.</p>
                                ) : (
                                    <>
                                        <p>Are you sure you want to block <strong>{profile.name}</strong>? They will not be able to log in.</p>
                                        <div className="mb-3">
                                            <label className="form-label">Reason for blocking (required)</label>
                                            <textarea
                                                className="form-control"
                                                rows={3}
                                                value={blockReason}
                                                onChange={(e) => setBlockReason(e.target.value)}
                                                placeholder="Enter reason..."
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-sm btn-secondary" onClick={() => setShowBlockModal(false)}>Cancel</button>
                                <button className="btn btn-sm btn-primary" onClick={handleBlockToggle} disabled={blocking}>
                                    {blocking ? 'Processing...' : (profile.isBlocked ? 'Unblock' : 'Block')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}