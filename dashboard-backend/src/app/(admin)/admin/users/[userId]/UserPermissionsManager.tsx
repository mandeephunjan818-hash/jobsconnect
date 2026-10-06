'use client';

import { useState, useEffect, useCallback } from 'react';
import { PERMISSIONS } from '@/config/permissions';
import { useSession } from 'next-auth/react';

// ─── Auto-detect role from selected permissions ───────────────────────────────

// const ADMIN_ONLY_PERMISSIONS = new Set(
//     ROLE_DEFAULT_PERMISSIONS['admin'].filter(
//         p => !ROLE_DEFAULT_PERMISSIONS['sub-admin'].includes(p)
//     )
// );

// const SUB_ADMIN_ONLY_PERMISSIONS = new Set(
//     ROLE_DEFAULT_PERMISSIONS['sub-admin'].filter(
//         p => !ROLE_DEFAULT_PERMISSIONS['user'].includes(p)
//     )
// );

// function detectRoleFromPermissions(selected: Set<string>): 'admin' | 'sub-admin' | 'user' {
//     for (const p of selected) {
//         if (ADMIN_ONLY_PERMISSIONS.has(p as any)) return 'admin';
//     }
//     for (const p of selected) {
//         if (SUB_ADMIN_ONLY_PERMISSIONS.has(p as any)) return 'sub-admin';
//     }
//     return 'user';
// }

// ─── Types ────────────────────────────────────────────────────────────────────

interface PermissionManagerProps {
    userId: string;
    userRole: string;
    userName: string;
}

interface PermissionsData {
    storedPermissions: string[];
    effectivePermissions: string[];
    roleDefaultPermissions: string[];
    allPermissions: string[];
    role: string;
}

// A single column cell can bundle MORE THAN ONE underlying permission key —
// e.g. "Read" for Listings bundles the public list, the user's own list, and
// the admin read/list permissions into one checkbox. Toggling the cell
// toggles every key in the bundle together.
interface PermissionCell {
    keys: string[];
    description: string;
}

// One row = one real database resource, always exactly 4 possible columns.
interface PermissionResourceRow {
    resource: string;
    read?: PermissionCell;
    write?: PermissionCell;
    update?: PermissionCell;
    delete?: PermissionCell;
}

// Small helper so the catalogue below stays readable.
function cell(description: string, ...keys: string[]): PermissionCell {
    return { description, keys };
}

// ─── Flat Permission Catalogue ──────────────────────────────────────────────
// Every resource is a top‑level object with no grouping.
const PERMISSION_CATALOGUE: PermissionResourceRow[] = [
    // Categories
    {
        resource: 'Categories',
        read: cell(
            'Browse categories publicly, and (as admin) view or list them',
            PERMISSIONS.SERVICES_LIST_1,
            PERMISSIONS.SERVICES_READ,
            PERMISSIONS.SERVICES_LIST,
        ),
        write: cell('Create a new category', PERMISSIONS.SERVICES_CREATE),
        update: cell('Modify a category', PERMISSIONS.SERVICES_UPDATE),
        delete: cell('Delete a category', PERMISSIONS.SERVICES_DELETE_1),
    },

    // User Management
    // {
    //     resource: 'Users',
    //     read: cell(
    //         'See the full user list and open any user’s detail page',
    //         PERMISSIONS.USERS_LIST,
    //         PERMISSIONS.USERS_READ,
    //     ),
    //     update: cell(
    //         'Suspend or reinstate a user account',
    //         PERMISSIONS.BLOCK_UPDATE,
    //     ),
    // },
    // {
    //     resource: 'Admins & Sub-Admins',
    //     read: cell(
    //         'See the full admin / sub-admin list and open a detail page',
    //         PERMISSIONS.ADMINS_LIST,
    //         PERMISSIONS.ADMINS_READ,
    //     ),
    // },
    // {
    //     resource: 'Permissions',
    //     read: cell(
    //         'See what a user can access',
    //         PERMISSIONS.PERMISSIONS_READ,
    //     ),
    //     update: cell(
    //         'Grant or revoke specific permissions',
    //         PERMISSIONS.PERMISSIONS_UPDATE,
    //     ),
    // },

    // Listings
    {
        resource: 'Listings',
        read: cell(
            'View the public listing directory, your own submitted listings, and (as admin) any listing’s full detail or the full listing list',
            PERMISSIONS.LISTINGS_LIST_1,
            PERMISSIONS.MY_LIST,
            PERMISSIONS.LISTINGS_READ,
            PERMISSIONS.LISTINGS_LIST,
        ),
        write: cell(
            'Submit a new listing for review, or (as admin) create one directly',
            PERMISSIONS.SUBMIT_CREATE,
            PERMISSIONS.LISTINGS_CREATE,
        ),
        update: cell(
            'Request changes to your listing, or (as admin) modify any listing',
            PERMISSIONS.UPDATE_REQUEST_UPDATE_2,
            PERMISSIONS.LISTINGS_UPDATE,
        ),
        delete: cell(
            'Permanently remove a listing',
            PERMISSIONS.LISTINGS_DELETE,
        ),
    },

    // Admin Credits Management
    {
        resource: 'Credit Management',
        read: cell(
            'View all user credit wallets, a single user’s credit details, and their transaction history',
            PERMISSIONS.ADMIN_CREDITS_GET,
            PERMISSIONS.ADMIN_CREDITS_USER,
            PERMISSIONS.ADMIN_CREDITS_TRANSACTION,
        ),
        write: cell(
            'Manually adjust a user’s credit balance (grant or deduct)',
            PERMISSIONS.ADMIN_CREDITS_ADJUST_CREAT,
        ),
    },

    // Job Bank & Applications
    {
        resource: 'Job Bank Requests',
        read: cell(
            'View your own job bank requests, or (as admin) view/list any request',
            PERMISSIONS.JOB_BANK_REQUESTS_READ_1,
            PERMISSIONS.JOB_BANK_REQUESTS_LIST_1,
            PERMISSIONS.JOB_BANK_REQUESTS_READ,
            PERMISSIONS.JOB_BANK_REQUESTS_LIST,
        ),
        write: cell(
            'Submit a job bank request, or convert a request into a listing',
            PERMISSIONS.JOB_BANK_REQUESTS_CREATE,
            PERMISSIONS.LISTING_CREATE_1,
            PERMISSIONS.LISTING_CREATE,
        ),
        update: cell(
            'Update a job bank request',
            PERMISSIONS.JOB_BANK_REQUESTS_UPDATE,
        ),
        delete: cell(
            'Remove your own request, or (as admin) delete any request, including bulk delete',
            PERMISSIONS.JOB_BANK_REQUESTS_DELETE_2,
            PERMISSIONS.JOB_BANK_REQUESTS_DELETE_1,
            PERMISSIONS.JOB_BANK_REQUESTS_DELETE,
        ),
    },
    // User Management
    {
        resource: 'Users',
        read: cell(
            'See the full user list and open any user’s detail page',
            PERMISSIONS.USERS_LIST,
            PERMISSIONS.USERS_READ,
        ),
        update: cell(
            'Suspend or reinstate a user account',
            PERMISSIONS.BLOCK_UPDATE,
        ),
    },
    {
        resource: 'Job Applications',
        read: cell(
            'View and list job applications submitted against listings',
            PERMISSIONS.JOB_APPLICATIONS_LIST,
        ),
        update: cell(
            'Update a job application’s status',
            PERMISSIONS.JOB_APPLICATIONS_UPDATE,
        ),
        delete: cell(
            'Delete a job application',
            PERMISSIONS.JOB_APPLICATIONS_DELETE,
        ),
    },

    // Contact & Support
    {
        resource: 'Inquiry',
        read: cell(
            'Read a specific contact submission and list all submissions',
            PERMISSIONS.CONTACT_READ,
            PERMISSIONS.CONTACT_LIST,
        ),
        write: cell(
            'Submit a contact form enquiry, or (as admin) reply to one',
            PERMISSIONS.CONTACT_CREATE,
            PERMISSIONS.REPLY_CREATE,
        ),
        update: cell(
            'Change the status of a contact message',
            PERMISSIONS.CONTACT_UPDATE,
        ),
    },

    // Content (now fully flattened – no nesting)
    {
        resource: 'Blog Posts',
        read: cell('Browse the blog', PERMISSIONS.BLOG_LIST),
        write: cell('Create a new blog article', PERMISSIONS.BLOG_CREATE),
        update: cell('Modify an existing blog article', PERMISSIONS.BLOG_UPDATE),
        delete: cell('Delete a blog article', PERMISSIONS.BLOG_DELETE_1),
    },
    {
        resource: 'Testimonials',
        read: cell('Browse customer testimonials', PERMISSIONS.TESTIMONIALS_LIST),
        write: cell('Create a new testimonial', PERMISSIONS.TESTIMONIALS_CREATE),
        update: cell('Modify a testimonial', PERMISSIONS.TESTIMONIALS_UPDATE),
        delete: cell('Remove a testimonial', PERMISSIONS.TESTIMONIALS_DELETE),
    },
    {
        resource: 'FAQs',
        read: cell('Browse FAQ entries', PERMISSIONS.FAQ_LIST),
        write: cell('Create a new FAQ item', PERMISSIONS.FAQ_CREATE),
        update: cell('Modify a FAQ item', PERMISSIONS.FAQ_UPDATE),
        delete: cell('Delete a FAQ entry', PERMISSIONS.FAQ_DELETE),
    },

    // Metadata
    {
        resource: 'Metadata',
        read: cell(
            'View a metadata record and browse system metadata',
            PERMISSIONS.METADATA_READ,
            PERMISSIONS.METADATA_LIST,
        ),
        write: cell('Add a metadata entry', PERMISSIONS.METADATA_CREATE),
        update: cell('Modify a metadata record', PERMISSIONS.METADATA_UPDATE),
        delete: cell('Delete a metadata entry', PERMISSIONS.METADATA_DELETE),
    },

    // Subscribers
    {
        resource: 'Subscribers',
        read: cell(
            'View a subscriber, list all subscribers, and view subscriber statistics',
            PERMISSIONS.SUBSCRIBERS_READ,
            PERMISSIONS.SUBSCRIBERS_LIST,
            PERMISSIONS.STATS_LIST,
        ),
        write: cell(
            'Subscribe to the newsletter, or (as admin) send a broadcast email',
            PERMISSIONS.SUBSCRIBE_CREATE,
            PERMISSIONS.BROADCAST_CREATE,
        ),
        update: cell(
            'Update a subscriber, or unsubscribe from the newsletter',
            PERMISSIONS.SUBSCRIBERS_UPDATE,
            PERMISSIONS.UNSUBSCRIBE_LIST,
        ),
        delete: cell('Remove a subscriber', PERMISSIONS.SUBSCRIBERS_DELETE),
    },

    // Credit Bundles (employer-purchasable credit packs)
    {
        resource: 'Credit Bundles',
        read: cell(
            'View and list credit bundles',
            PERMISSIONS.CREADITS_LIST,
        ),
        write: cell(
            'Create a new credit bundle',
            PERMISSIONS.CREADITS_CREAT,
        ),
        update: cell(
            'Modify a credit bundle',
            PERMISSIONS.CREADITS_PUT,
        ),
        delete: cell(
            'Deactivate a credit bundle',
            PERMISSIONS.CREADITS_DELETE,
        ),
    },

    // Credit Settings (system-wide listings-per-credit rate & expiry window)
    {
        resource: 'Credit Settings',
        read: cell(
            'View the system-wide listings-per-credit rate and credit expiry window',
            PERMISSIONS.CREADITS_SETTINGS_GET,
        ),
        update: cell(
            'Change the listings-per-credit rate or credit expiry window',
            PERMISSIONS.CREADITS_SETTINGS_PUT,
        ),
    },

    // Site Configuration
    {
        resource: 'Site Config',
        read: cell('View site configuration', PERMISSIONS.SITECONFIG_LIST),
        write: cell('Create a site config entry', PERMISSIONS.SITECONFIG_CREATE),
        update: cell('Modify a site config entry', PERMISSIONS.SITECONFIG_UPDATE),
        delete: cell('Delete a site config entry', PERMISSIONS.SITECONFIG_DELETE),
    },

    // Own Account
    // {
    //     resource: 'My Profile & Account',
    //     read: cell(
    //         'Access own profile, account info, and login history',
    //         PERMISSIONS.PROFILE_LIST,
    //         PERMISSIONS.USER_LIST_2,
    //         PERMISSIONS.HISTORY_LIST,
    //     ),
    //     write: cell(
    //         'Finish the onboarding profile step, or change account password',
    //         PERMISSIONS.COMPLETE_PROFILE_CREATE,
    //         PERMISSIONS.CHANGE_PASSWORD_CREATE,
    //     ),
    //     update: cell(
    //         'Update profile details, check email verification, or request an OTP',
    //         PERMISSIONS.PROFILE_UPDATE,
    //         PERMISSIONS.VERIFY_EMAIL_LIST,
    //         PERMISSIONS.SEND_OTP_CREATE_1,
    //     ),
    // },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserPermissionsManager({ userId, userRole, userName }: PermissionManagerProps) {
    const [data, setData] = useState<PermissionsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [isDirty, setIsDirty] = useState(false);
    const [search, setSearch] = useState('');

    // const [currentRole, setCurrentRole] = useState<string>(userRole);
    // const [savedRole, setSavedRole] = useState<string>(userRole);
    const ROLE = 'sub-admin' as const;
    const { update } = useSession();

    const fetchPermissions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/users/${userId}/permissions`);
            if (!res.ok) throw new Error('Failed to load permissions');
            const json: PermissionsData = await res.json();
            setData(json);
            setSelected(new Set(json.storedPermissions.length > 0
                ? json.storedPermissions
                : json.roleDefaultPermissions
            ));
            // setCurrentRole(json.role);
            // setSavedRole(json.role);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccessMsg(null);
        try {
            const permRes = await fetch(`/api/admin/users/${userId}/permissions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                // body: JSON.stringify({ permissions: Array.from(selected), role: currentRole }),
                body: JSON.stringify({ permissions: Array.from(selected), role: ROLE }),
            });
            if (!permRes.ok) {
                const json = await permRes.json();
                throw new Error(json.message ?? 'Save failed');
            }

            await update();

            setSuccessMsg('Role and permissions saved. Changes take effect on the user\'s next login.');
            setIsDirty(false);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    // const handleReset = () => {
    //     if (!data) return;
    //     const resetPerms = new Set<string>(data.roleDefaultPermissions);
    //     setSelected(resetPerms);
    //     setCurrentRole(detectRoleFromPermissions(resetPerms));
    //     setIsDirty(true);
    // };

    // Toggling a cell toggles every underlying key in that cell's bundle together.
    const toggleCell = (targetCell?: PermissionCell) => {
        if (!targetCell || targetCell.keys.length === 0) return;
        setSelected(prev => {
            const next = new Set(prev);
            const allOn = targetCell.keys.every(k => next.has(k));
            targetCell.keys.forEach(k => (allOn ? next.delete(k) : next.add(k)));
            // setCurrentRole(detectRoleFromPermissions(next));
            return next;
        });
        setIsDirty(true);
    };

    // const getRowKeys = (row: PermissionResourceRow): string[] =>
    //     [row.read, row.write, row.update, row.delete]
    //         .filter((c): c is PermissionCell => !!c)
    //         .flatMap(c => c.keys);

    // Filter rows by search term
    const filterRow = (row: PermissionResourceRow): boolean => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            row.resource.toLowerCase().includes(q) ||
            [row.read, row.write, row.update, row.delete].some(c => c?.description?.toLowerCase().includes(q))
        );
    };

    const filteredRows = PERMISSION_CATALOGUE.filter(filterRow);

    // const totalSelected = selected.size;
    // const totalAvailable = PERMISSION_CATALOGUE.reduce((sum, row) => sum + getRowKeys(row).length, 0);

    if (loading) {
        return (
            <div className="card shadow-sm mt-4">
                <div className="card-body text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    Loading permissions…
                </div>
            </div>
        );
    }

    return (
        <div className="card shadow-sm mt-4" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── Header ── */}

            <div className='d-flex justify-content-between align-items-center p-3'>
                <div>
                    <h5 className="mb-0 d-flex align-items-center gap-2">
                        <span style={{
                            background: '#eef2ff', borderRadius: 8, width: 32, height: 32,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <i className="ti ti-shield-check text-primary" style={{ fontSize: 17 }}></i>
                        </span>
                        Access Permissions
                    </h5>
                    <p className="text-muted small mb-0 mt-1">
                        Manage what <strong>{userName}</strong> can do — changes apply on next login.
                    </p>
                </div>

                {/* ── Auto-detected role indicator ── */}
                {/* <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                    <span className="text-muted small">Detected role:</span>
                    <span className="badge"
                        style={{
                            fontSize: 12,
                            background:
                                currentRole === 'admin' ? '#fee2e2' :
                                    currentRole === 'sub-admin' ? '#fef9c3' : '#e0f2fe',
                            color:
                                currentRole === 'admin' ? '#dc2626' :
                                    currentRole === 'sub-admin' ? '#ca8a04' : '#0369a1',
                            border: `1px solid ${currentRole === 'admin' ? '#fca5a5' :
                                currentRole === 'sub-admin' ? '#fde047' : '#7dd3fc'
                                }`,
                            fontWeight: 600,
                        }}>
                        <i className={`ti ${currentRole === 'admin' ? 'ti-shield-filled' :
                            currentRole === 'sub-admin' ? 'ti-shield-half' : 'ti-user'
                            } me-1`}></i>
                        {currentRole === 'admin' ? 'Admin' :
                            currentRole === 'sub-admin' ? 'Sub Admin' : 'User'}
                    </span>
                    {currentRole !== savedRole && (
                        <span className="badge bg-warning text-dark" style={{ fontSize: 11 }}>
                            <i className="ti ti-arrow-right me-1"></i>
                            Will change from <strong>{savedRole}</strong> → <strong>{currentRole}</strong>
                        </span>
                    )}
                </div> */}

                <div className="d-flex gap-2 align-items-center flex-wrap">
                    {/* <span className="badge bg-light text-dark border" style={{ fontSize: 12 }}>
                        {totalSelected} / {totalAvailable} enabled
                    </span> */}
                    {/* {isDirty && <span className="badge bg-warning text-dark">Unsaved changes</span>} */}
                    {/* <button className="btn btn-sm btn-outline-secondary" onClick={handleReset} disabled={saving}>
                        <i className="ti ti-refresh me-1"></i>Reset to role defaults
                    </button> */}
                    <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving || !isDirty}>
                        {saving
                            ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving…</>
                            : <><i className="ti ti-device-floppy me-1"></i>Save permissions</>}
                    </button>
                </div>
            </div>

            {/* ── Alerts ── */}
            {error && (
                <div className="alert alert-danger alert-dismissible mx-3 mt-3 mb-0 py-2" role="alert">
                    <i className="ti ti-alert-circle me-1"></i>{error}
                    <button type="button" className="btn-close btn-sm" onClick={() => setError(null)}></button>
                </div>
            )}
            {successMsg && (
                <div className="alert alert-success alert-dismissible mx-3 mt-3 mb-0 py-2" role="alert">
                    <i className="ti ti-circle-check me-1"></i>{successMsg}
                    <button type="button" className="btn-close btn-sm" onClick={() => setSuccessMsg(null)}></button>
                </div>
            )}

            {/* ── Search ── */}
            {/* <div className="px-3 pt-3 pb-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="input-group input-group-sm" style={{ maxWidth: 340 }}>
                    <span className="input-group-text bg-white"><i className="ti ti-search text-muted"></i></span>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search resources or permissions…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>
                            <i className="ti ti-x"></i>
                        </button>
                    )}
                </div>

                <div className="d-flex gap-3 flex-wrap" style={{ fontSize: 12, color: '#6c757d' }}>
                    <span className="d-flex align-items-center gap-1">
                        <span style={{ background: '#e8f5e9', border: '1.5px solid #43a047', borderRadius: 4, width: 14, height: 14, display: 'inline-block' }}></span>
                        Read
                    </span>
                    <span className="d-flex align-items-center gap-1">
                        <span style={{ background: '#e3f2fd', border: '1.5px solid #1e88e5', borderRadius: 4, width: 14, height: 14, display: 'inline-block' }}></span>
                        Write
                    </span>
                    <span className="d-flex align-items-center gap-1">
                        <span style={{ background: '#fff8e1', border: '1.5px solid #f59e0b', borderRadius: 4, width: 14, height: 14, display: 'inline-block' }}></span>
                        Update
                    </span>
                    <span className="d-flex align-items-center gap-1">
                        <span style={{ background: '#fef2f2', border: '1.5px solid #dc2626', borderRadius: 4, width: 14, height: 14, display: 'inline-block' }}></span>
                        Delete
                    </span>
                </div>
            </div> */}

            {/* ── Table ── */}
            <div className="card-body pt-1" style={{ paddingBottom: 0 }}>
                {filteredRows.length === 0 && (
                    <div className="text-center text-muted py-4">No permissions match your search.</div>
                )}

                {filteredRows.length > 0 && (
                    <table className="table table-bordered mb-0" style={{ fontSize: 13, tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: '26%' }} />
                            <col style={{ width: '18.5%' }} />
                            <col style={{ width: '18.5%' }} />
                            <col style={{ width: '18.5%' }} />
                            <col style={{ width: '18.5%' }} />
                        </colgroup>
                        <thead>
                            <tr style={{ background: '#fff', borderBottom: '2px solid #dee2e6' }}>
                                <th className="ps-3 py-2" style={{ fontSize: 12, fontWeight: 600, color: '#344054', letterSpacing: '1px', background: '#fff' }}>
                                    Resource
                                </th>
                                <th className="py-2 text-center" style={{ fontSize: 12, fontWeight: 600, color: '#1b7a47', background: '#f0fdf4', letterSpacing: '1px' }}>
                                    <i className="ti ti-eye me-1"></i>Read
                                </th>
                                <th className="py-2 text-center" style={{ fontSize: 12, fontWeight: 600, color: '#1565c0', background: '#eff6ff', letterSpacing: '1px' }}>
                                    <i className="ti ti-pencil-plus me-1"></i>Write
                                </th>
                                <th className="py-2 text-center" style={{ fontSize: 12, fontWeight: 600, color: '#b45309', background: '#fffbeb', letterSpacing: '1px' }}>
                                    <i className="ti ti-pencil me-1"></i>Update
                                </th>
                                <th className="py-2 text-center" style={{ fontSize: 12, fontWeight: 600, color: '#b91c1c', background: '#fef2f2', letterSpacing: '1px' }}>
                                    <i className="ti ti-trash me-1"></i>Delete
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map((row, idx) => (
                                <tr key={row.resource} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>

                                    {/* Resource label */}
                                    <td className="ps-3 py-0 align-middle" style={{ borderRight: '1px solid #dee2e6' }}>
                                        <span style={{ fontWeight: 500, color: '#1a1a2e', fontSize: 13 }}>{row.resource}</span>
                                    </td>

                                    <PermCell
                                        cell={row.read}
                                        selected={selected}
                                        color="#1b7a47"
                                        bg="#f0fdf4"
                                        checkBg="#dcfce7"
                                        onToggle={() => toggleCell(row.read)}
                                    />
                                    <PermCell
                                        cell={row.write}
                                        selected={selected}
                                        color="#1565c0"
                                        bg="#eff6ff"
                                        checkBg="#dbeafe"
                                        onToggle={() => toggleCell(row.write)}
                                    />
                                    <PermCell
                                        cell={row.update}
                                        selected={selected}
                                        color="#b45309"
                                        bg="#fffbeb"
                                        checkBg="#fef3c7"
                                        onToggle={() => toggleCell(row.update)}
                                    />
                                    <PermCell
                                        cell={row.delete}
                                        selected={selected}
                                        color="#b91c1c"
                                        bg="#fef2f2"
                                        checkBg="#fee2e2"
                                        onToggle={() => toggleCell(row.delete)}
                                    />
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Sticky footer ── */}
            {isDirty && (
                <div
                    className="card-footer bg-white border-top d-flex justify-content-between align-items-center py-2"
                    style={{ position: 'sticky', bottom: 0, zIndex: 10, boxShadow: '0 1px 8px rgba(0,0,0,.06)' }}
                >
                    {/* <span className="text-warning small">
                        <i className="ti ti-alert-triangle me-1"></i>You have unsaved changes
                    </span> */}
                    <div className="d-flex gap-2">
                        {/* <button className="btn btn-sm btn-outline-secondary" onClick={() => { fetchPermissions(); setIsDirty(false); }} disabled={saving}>
                            Discard
                        </button> */}
                        <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : 'Save permissions'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── PermCell sub-component ───────────────────────────────────────────────────
// Renders one checkbox per cell. A cell may bundle several underlying
// permission keys — the checkbox is "on" only when every key in the bundle is
// selected, and shows an indeterminate dash when only some are selected.

interface PermCellProps {
    cell?: PermissionCell;
    selected: Set<string>;
    color: string;
    bg: string;
    checkBg: string;
    onToggle: () => void;
}

function PermCell({ cell, selected, color, bg, checkBg, onToggle }: PermCellProps) {
    if (!cell || cell.keys.length === 0) {
        return (
            <td
                style={{
                    background: '#f8f9fa',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    borderRight: '1px solid #dee2e6',
                    padding: '6px 8px',
                }}
            >
                <span style={{ color: '#cbd5e1', fontSize: 16 }}>—</span>
            </td>
        );
    }

    const onCount = cell.keys.filter(k => selected.has(k)).length;
    const isOn = onCount === cell.keys.length;
    const isPartial = onCount > 0 && !isOn;

    return (
        <td
            onClick={onToggle}
            style={{
                background: isOn ? checkBg : bg,
                cursor: 'pointer',
                borderRight: '1px solid #dee2e6',
                padding: '6px 10px',
                transition: 'background 0.15s ease',
                verticalAlign: 'top',
            }}
            title={cell.keys.join(', ')}
        >
            <div className="d-flex align-items-start gap-2">
                {/* Checkbox */}
                <div style={{ paddingTop: 2, flexShrink: 0 }}>
                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={isOn}
                        ref={el => { if (el) el.indeterminate = isPartial; }}
                        onChange={() => { }}
                        style={{
                            cursor: 'pointer',
                            accentColor: color,
                            width: 15,
                            height: 15,
                        }}
                    />
                </div>

                {/* Text */}
                <div style={{ minWidth: 0 }}>
                    <div style={{
                        fontWeight: isOn ? 600 : 400,
                        color: isOn ? color : '#374151',
                        fontSize: 12,
                        lineHeight: '1.35',
                        wordBreak: 'break-word',
                    }}>
                        {cell.description}
                    </div>
                    {isOn && (
                        <span style={{ fontSize: 10, color, fontWeight: 500 }}>● Enabled</span>
                    )}
                    {isPartial && (
                        <span style={{ fontSize: 10, color: '#d97706', fontWeight: 500 }}>◐ Partially enabled</span>
                    )}
                </div>
            </div>
        </td>
    );
}