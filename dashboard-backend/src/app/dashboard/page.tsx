// app/dashboard/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useProfile } from '@/hooks/useProfile';
import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { FaRegEyeSlash } from "react-icons/fa6";
import { FaRegEdit } from "react-icons/fa";
import { CiMail } from "react-icons/ci";
// import { IoCallOutline } from "react-icons/io5";

interface HistoryData {
    loginHistory: any[];
    logoutHistory: any[];
}

export default function Dashboard() {
    const { data: session } = useSession();
    const { profile, loading, error, updateProfile, loginHistory } = useProfile();
    const [isEditing, setIsEditing] = useState(false);
    const [historyData, setHistoryData] = useState<HistoryData | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState<{
        page: number;
        limit: number;
        totalLogin: number;
        totalLogout: number;
        totalPages: number;
    } | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        dob: '',
        phone: '',
        timezone: '',
        language: '',
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpType, setOtpType] = useState<'view' | 'change'>('change');
    const [otpToken, setOtpToken] = useState<string | null>(null);
    const [showNewPasswordModal, setShowNewPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);

    // Populate edit form when profile loads
    useEffect(() => {
        if (profile) {
            setEditForm({
                name: profile.name || '',
                dob: profile.dob?.split('T')[0] || '',
                phone: profile.phone || '',
                timezone: profile.timezone || '',
                language: profile.language || '',
            });
        }


        const fetchHistory = async () => {
            const result = await loginHistory(currentPage, 10); // Example pagination values
            if (result.success) {
                setPagination(result.data.pagination);
                setHistoryData(result.data); // store the full object
                console.log('Login history:', result.data);
            } else {
                console.error('Failed to load history:', result.error);
            }
        };
        fetchHistory();
    }, [profile, loginHistory, currentPage]);

    const handleEditChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setAvatarPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleProfileUpdate = async () => {
        setUpdateMessage(null);
        const updates: any = {
            name: editForm.name,
            dob: editForm.dob,
            phone: editForm.phone,
            timezone: editForm.timezone,
            language: editForm.language,
        };

        if (avatarPreview && avatarFile) {
            const reader = new FileReader();
            reader.readAsDataURL(avatarFile);
            reader.onload = async () => {
                updates.avatar = reader.result;
                const result = await updateProfile(updates);
                if (result.success) {
                    setUpdateMessage({ type: 'success', text: 'Profile updated successfully!' });
                    setIsEditing(false);
                    setAvatarPreview(null);
                    setAvatarFile(null);
                } else {
                    setUpdateMessage({ type: 'error', text: result.error || 'Update failed' });
                }
            };
        } else {
            const result = await updateProfile(updates);
            if (result.success) {
                setUpdateMessage({ type: 'success', text: 'Profile updated successfully!' });
                setIsEditing(false);
            } else {
                setUpdateMessage({ type: 'error', text: result.error || 'Update failed' });
            }
        }
    };

    if (loading) {
        return (
            <div className="container text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading your dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger" role="alert">
                    Unable to load profile data. Please try again later.
                </div>
                <p className="text-danger">{error}</p>
            </div>
        );
    }

    if (!profile) return null;

    const maskedPassword = '••••••••';

    const requestOtp = async (type: 'view' | 'change') => {
        setOtpType(type);
        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.noPassword) {
                    alert('No password set for this account (Google login only).');
                } else {
                    alert(data.error || 'Failed to send OTP');
                }
                return;
            }
            setShowOtpModal(true);
            alert('OTP sent to your email. It expires in 10 minutes.');
        } catch (err) {
            alert('Failed to send OTP');
        }
    };

    const verifyOtp = async () => {
        if (!otp) {
            alert('Please enter OTP');
            return;
        }
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp, type: otpType }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Invalid OTP');
                return;
            }
            setOtpToken(data.actionToken);
            setShowOtpModal(false);
            setOtp('');
            if (otpType === 'change') {
                setShowNewPasswordModal(true);
            } else if (otpType === 'view') {
                // For view, we cannot show actual password. Instead, we can show a message.
                alert('Your password is securely stored. To change it, use the change password option.');
            }
        } catch (err) {
            alert('Verification failed');
        }
    };

    const changePassword = async () => {
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
        }
        setPasswordError(null);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actionToken: otpToken, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Failed to change password');
                return;
            }
            alert('Password changed successfully!');
            setShowNewPasswordModal(false);
            setNewPassword('');
            setConfirmPassword('');
            setOtpToken(null);
        } catch (err) {
            alert('Failed to change password');
        }
    };

    return (
        <div className="px-0 py-4 py-md-5">
            {/* Header Section */}
            <div className="row justify-content-between mb-4">
                <div className="col-12 col-md-auto">
                    <h1 className="fs-4 fw-bold">My Dashboard</h1>
                    <p className="fs-6">Welcome back, {profile.name || session?.user?.name || 'User'}!</p>
                </div>
                <div className="col-12 col-md-auto mt-2 mt-md-0">
                    <span className="px-3 py-1 rounded-pill fs-6">
                        User ID: {profile.userId}
                    </span>
                </div>
            </div>

            {/* Profile Summary Card */}
            <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: '1rem' }}>
                {/* ── Card Header: Avatar + Name & Email (prominent) ── */}
                <div className="card-header bg-white border-0 d-flex flex-column flex-md-row align-items-center gap-3 p-4">
                    {/* Avatar with edit overlay */}
                    <div className="position-relative">
                        {avatarPreview || profile.avatar ? (
                            <img
                                src={avatarPreview || profile.avatar!}
                                className="rounded-circle border border-3 border-white shadow"
                                width={100}
                                height={100}
                                style={{ objectFit: 'cover' }}
                                alt="Avatar"
                            />
                        ) : (
                            <div
                                className="rounded-circle d-flex align-items-center justify-content-center shadow"
                                style={{
                                    width: 100,
                                    height: 100,
                                    fontSize: '2.2rem',
                                    fontWeight: 600,
                                    backgroundColor: '#e9ecef',
                                    color: '#5b50e1',
                                }}
                            >
                                {(profile.name?.[0] || session?.user?.name?.[0] || 'U').toUpperCase()}
                            </div>
                        )}

                        {isEditing && (
                            <div className="position-absolute bottom-0 end-0">
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleAvatarChange}
                                    className="d-none"
                                />
                                <button
                                    className="btn btn-primary btn-sm rounded-circle"
                                    style={{ width: 32, height: 32, padding: 0 }}
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Change photo"
                                >
                                    <i className="bi bi-camera" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Name & Email – the focal point */}
                    <div className="text-center text-md-start flex-grow-1">
                        {isEditing ? (
                            <input
                                type="text"
                                className="form-control form-control-lg mb-2"
                                name="name"
                                value={editForm.name}
                                onChange={handleEditChange}
                                placeholder="Full name"
                                style={{ maxWidth: '400px', fontWeight: 600 }}
                            />
                        ) : (
                            <h3 className="fw-bold mb-1" style={{ color: '#2c3e50' }}>
                                {profile.name || 'Your Name'}
                            </h3>
                        )}
                        <p className="text-muted mb-0 d-flex align-items-center gap-2">
                            <CiMail style={{ fontSize: '1.1rem' }} />
                            <span style={{ fontSize: '1rem' }}>
                                {session?.user?.email || 'No email address'}
                            </span>
                        </p>
                    </div>

                    {/* Quick action buttons */}
                    {!isEditing ? (
                        <button
                            className="btn btn-primary btn-sm px-4 align-self-start align-self-md-center"
                            onClick={() => setIsEditing(true)}
                        >
                            <i className="bi bi-pencil me-1" /> Edit Profile
                        </button>
                    ) : (
                        <div className="d-flex gap-2 align-self-start align-self-md-center">
                            <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => {
                                    setIsEditing(false);
                                    setAvatarPreview(null);
                                    setAvatarFile(null);
                                    setEditForm({
                                        name: profile.name || '',
                                        dob: profile.dob?.split('T')[0] || '',
                                        phone: profile.phone || '',
                                        timezone: profile.timezone || '',
                                        language: profile.language || '',
                                    });
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-success btn-sm"
                                onClick={handleProfileUpdate}
                            >
                                Save Changes
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Card Body: Additional details (collapsible / always visible) ── */}
                <div className="card-body bg-light p-4">
                    <div className="row g-3">
                        {/* Role & Age */}
                        <div className="col-sm-6 col-lg-3">
                            <small className="text-uppercase text-muted d-block mb-1">Role</small>
                            <span className="fw-medium" style={{ color: '#2c3e50' }}>
                                {profile.role || 'User'}
                            </span>
                        </div>
                        <div className="col-sm-6 col-lg-3">
                            <small className="text-uppercase text-muted d-block mb-1">Age</small>
                            {profile.dob ? (
                                <span className="fw-medium" style={{ color: '#2c3e50' }}>
                                    {(() => {
                                        const birthDate = new Date(profile.dob);
                                        const today = new Date();
                                        let age = today.getFullYear() - birthDate.getFullYear();
                                        const m = today.getMonth() - birthDate.getMonth();
                                        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
                                        return `${age} years`;
                                    })()}
                                </span>
                            ) : (
                                <span className="text-muted">Not set</span>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="col-sm-6 col-lg-3">
                            <small className="text-uppercase text-muted d-block mb-1">Phone</small>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    className="form-control form-control-sm"
                                    name="phone"
                                    value={editForm.phone}
                                    onChange={handleEditChange}
                                    placeholder="Phone number"
                                />
                            ) : (
                                <span className="fw-medium" style={{ color: '#2c3e50' }}>
                                    {profile.phone || 'Not set'}
                                </span>
                            )}
                        </div>

                        {/* Date of Birth */}
                        <div className="col-sm-6 col-lg-3">
                            <small className="text-uppercase text-muted d-block mb-1">Date of Birth</small>
                            {isEditing ? (
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    name="dob"
                                    value={editForm.dob}
                                    onChange={handleEditChange}
                                />
                            ) : (
                                <span className="fw-medium" style={{ color: '#2c3e50' }}>
                                    {profile.dob
                                        ? new Date(profile.dob).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })
                                        : 'Not set'}
                                </span>
                            )}
                        </div>

                        {/* Password – masked & actions */}
                        <div className="col-sm-6 col-lg-3">
                            <small className="text-uppercase text-muted d-block mb-1">Password</small>
                            {!isEditing && (
                                <div className="d-flex align-items-center gap-2">
                                    <span className="font-monospace">{maskedPassword}</span>
                                    <button
                                        className="btn btn-link btn-sm p-0"
                                        onClick={() =>
                                            alert('Password is stored securely (hashed). Use the change password option.')
                                        }
                                        title="View Password (not possible)"
                                    >
                                        <FaRegEyeSlash style={{ fontSize: '0.9rem' }} />
                                    </button>
                                    <button
                                        className="btn btn-link btn-sm p-0"
                                        onClick={() => requestOtp('change')}
                                        title="Change Password"
                                    >
                                        <FaRegEdit style={{ fontSize: '0.9rem' }} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Timezone */}
                        <div className="col-sm-6 col-lg-3">
                            <small className="text-uppercase text-muted d-block mb-1">Timezone</small>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    name="timezone"
                                    value={editForm.timezone}
                                    onChange={handleEditChange}
                                    placeholder="e.g., America/New_York"
                                />
                            ) : (
                                <span className="fw-medium" style={{ color: '#2c3e50' }}>
                                    {profile.timezone || 'Not set'}
                                </span>
                            )}
                        </div>

                        {/* Language */}
                        <div className="col-sm-6 col-lg-3">
                            <small className="text-uppercase text-muted d-block mb-1">Language</small>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    name="language"
                                    value={editForm.language}
                                    onChange={handleEditChange}
                                    placeholder="e.g., English"
                                />
                            ) : (
                                <span className="fw-medium" style={{ color: '#2c3e50' }}>
                                    {profile.language || 'Not set'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Update message ── */}
                {updateMessage && (
                    <div
                        className={`alert alert-${updateMessage.type === 'success' ? 'success' : 'danger'} m-3 py-2 small`}
                        role="alert"
                    >
                        {updateMessage.text}
                    </div>
                )}
            </div>

            {/* Account Activity Card */}
            <div className="card mb-4 shadow-sm border-0" style={{ minWidth: "auto" }}>
                {/* <div className="card-body" style={{ minWidth: "auto" }}>
                    <div className="row g-3 mb-4">
                        <div className="col-sm-4 card-header bg-white border-bottom-0 pt-3 pb-0">
                            <h5 className="mb-0">Login Activity</h5>
                            <p className="text-muted small mt-1">Your recent login and logout history</p>
                        </div>
                        <div className="col-sm-4">
                            <div className="bg-light rounded-3 p-3 text-center">
                                <i className="bi bi-clock-history fs-4 text-info"></i>
                                <label className="text-uppercase small text-muted d-block mt-2">Last Login</label>
                                <p className="mb-0 fw-medium">
                                    {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Never'}
                                </p>
                            </div>
                        </div>
                        <div className="col-sm-4">
                            <div className="bg-light rounded-3 p-3 text-center">
                                <i className="bi bi-check-circle fs-4 text-success"></i>
                                <label className="text-uppercase small text-muted d-block mt-2">Onboarding</label>
                                <p className="mb-0 fw-medium">{profile.completedOnboarding ? 'Completed' : 'Pending'}</p>
                            </div>
                        </div>
                    </div>
                    {historyData && (historyData.loginHistory?.length > 0 || historyData.logoutHistory?.length > 0) ? (
                        <div className="table-responsive mobile-table-width " style={{ overflowX: "auto" }}>
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Date & Time</th>
                                        <th>IP Address</th>
                                        <th>Provider / Session</th>
                                        <th>Event</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...(historyData.loginHistory || []), ...(historyData.logoutHistory || [])]
                                        .sort((a, b) => {
                                            const timeA = a.timestamp || a.createdAt;
                                            const timeB = b.timestamp || b.createdAt;
                                            return new Date(timeB).getTime() - new Date(timeA).getTime();
                                        })
                                        .slice(0, 20)
                                        .map((item, idx) => {
                                            const isLogout = 'sessionId' in item; // logout records have sessionId
                                            const timestamp = item.timestamp || item.createdAt;
                                            return (
                                                <tr key={idx}>
                                                    <td className="text-nowrap">
                                                        {new Date(timestamp).toLocaleString()}
                                                    </td>
                                                    <td>
                                                        <code className="small">{item.ipAddress || item.ip || '—'}</code>
                                                    </td>
                                                    <td>
                                                        {item.provider ? item.provider.toUpperCase() : (isLogout ? 'Session' : '—')}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${isLogout ? 'bg-danger' : 'bg-success'}`}>
                                                            {isLogout ? 'Logout' : 'Login'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                            {pagination && pagination.totalPages > 1 && (
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                    <small className="text-muted">
                                        Page {pagination.page} of {pagination.totalPages}
                                        (Total: {pagination.totalLogin + pagination.totalLogout} records)
                                    </small>
                                    <nav>
                                        <ul className="pagination pagination-sm mb-0">
                                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                <button
                                                    className="page-link"
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    Previous
                                                </button>
                                            </li>
                                            <li className="page-item disabled">
                                                <span className="page-link">{currentPage}</span>
                                            </li>
                                            <li className={`page-item ${currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                                                <button
                                                    className="page-link"
                                                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                                                    disabled={currentPage === pagination.totalPages}
                                                >
                                                    Next
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            )}
                        </div>
                    ) : historyData === null ? (
                        <div className="text-center py-4">
                            <div className="spinner-border spinner-border-sm text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="text-muted mt-2 mb-0">Loading history...</p>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <i className="bi bi-inbox fs-1 text-muted"></i>
                            <p className="text-muted mt-2 mb-0">No login history available.</p>
                        </div>
                    )}
                </div> */}
                {showOtpModal && (
                    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Enter OTP</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowOtpModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <p>We sent a 6-digit OTP to your email.</p>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        maxLength={6}
                                    />
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-secondary" onClick={() => setShowOtpModal(false)}>Cancel</button>
                                    <button className="btn btn-primary" onClick={verifyOtp}>Verify</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {showNewPasswordModal && (
                    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Set New Password</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowNewPasswordModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {passwordError && <div className="alert alert-danger">{passwordError}</div>}
                                    <div className="mb-3">
                                        <label className="form-label">New Password (min. 8 characters)</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Confirm Password</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-secondary" onClick={() => setShowNewPasswordModal(false)}>Cancel</button>
                                    <button className="btn btn-primary" onClick={changePassword}>Change Password</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}