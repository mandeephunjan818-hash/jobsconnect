'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface CreditBundle {
    _id: string;
    key: string;
    name: string;
    stripePriceId: string;
    stripeProductId: string;
    credits: number;
    price: number;       // pence/cents — always mirrored from Stripe
    currency: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface CreditSystemConfig {
    listingsPerCredit: number;
    creditExpiryDays: number;
}

interface BundleFormState {
    key: string;
    name: string;
    credits: number | '';
    price: number | '';     // major units in the form, e.g. dollars
    isActive: boolean;
}

interface EditFormState {
    name: string;
    credits: number | '';
    isActive: boolean;
    // Reprice is opt-in and separate — editing this field is what triggers
    // the create-new-Stripe-Price flow on save, never a plain field patch.
    repriceEnabled: boolean;
    newPrice: number | '';
}

const EMPTY_CREATE_FORM: BundleFormState = {
    key: '',
    name: '',
    credits: '',
    price: '',
    isActive: true,
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function penceToDisplay(pence: number): string {
    return (pence / 100).toFixed(2);
}

function bundleToEditForm(b: CreditBundle): EditFormState {
    return {
        name: b.name,
        credits: b.credits,
        isActive: b.isActive,
        repriceEnabled: false,
        newPrice: parseFloat(penceToDisplay(b.price)) as number,
    };
}

// ─────────────────────────────────────────────────────────────
// Create modal
// ─────────────────────────────────────────────────────────────

interface CreateModalProps {
    saving: boolean;
    saveError: string | null;
    onSave: (form: BundleFormState) => void;
    onClose: () => void;
}

function CreateBundleModal({ saving, saveError, onSave, onClose }: CreateModalProps) {
    const [form, setForm] = useState<BundleFormState>(EMPTY_CREATE_FORM);
    const [errors, setErrors] = useState<Partial<Record<keyof BundleFormState, string>>>({});

    function set<K extends keyof BundleFormState>(key: K, value: BundleFormState[K]) {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => ({ ...e, [key]: undefined }));
    }

    function validate(): boolean {
        const next: typeof errors = {};
        if (!form.key.trim()) next.key = 'Key is required';
        else if (!/^[a-z0-9_-]+$/.test(form.key.trim()))
            next.key = 'Lowercase letters, numbers, hyphens only';
        if (!form.name.trim()) next.name = 'Name is required';
        if (form.credits === '' || Number(form.credits) <= 0)
            next.credits = 'Enter a number > 0';
        if (form.price === '' || Number(form.price) < 0) next.price = 'Enter a price ≥ 0';
        setErrors(next);
        return Object.keys(next).length === 0;
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (validate()) onSave(form);
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>New credit bundle</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-grid">
                        <Field label="Bundle key" error={errors.key} hint="e.g. starter-10 · pro-50">
                            <input
                                type="text"
                                value={form.key}
                                onChange={(e) => set('key', e.target.value.toLowerCase())}
                                placeholder="starter-10"
                                className={errors.key ? 'input-error' : ''}
                            />
                        </Field>

                        <Field label="Display name" error={errors.name}>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => set('name', e.target.value)}
                                placeholder="10 Credits"
                                className={errors.name ? 'input-error' : ''}
                            />
                        </Field>

                        <Field label="Credits" error={errors.credits} hint="How many credits this bundle grants">
                            <input
                                type="number"
                                min={1}
                                value={form.credits}
                                onChange={(e) => set('credits', e.target.value === '' ? '' : Number(e.target.value))}
                                className={errors.credits ? 'input-error' : ''}
                            />
                        </Field>

                        <Field label="Price ($)" error={errors.price} hint="Creates a new Stripe product + price">
                            <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={form.price}
                                onChange={(e) => set('price', e.target.value === '' ? '' : Number(e.target.value))}
                                className={errors.price ? 'input-error' : ''}
                            />
                        </Field>

                        <Field label="Status" wide>
                            <label className="toggle-row">
                                <div
                                    className={`toggle ${form.isActive ? 'toggle-on' : ''}`}
                                    role="switch"
                                    aria-checked={form.isActive}
                                    tabIndex={0}
                                    onClick={() => set('isActive', !form.isActive)}
                                    onKeyDown={(e) => e.key === ' ' && set('isActive', !form.isActive)}
                                >
                                    <span className="toggle-thumb" />
                                </div>
                                <span>
                                    {form.isActive
                                        ? 'Active — visible in checkout'
                                        : 'Inactive — hidden from checkout'}
                                </span>
                            </label>
                        </Field>

                        {saveError && (
                            <div className="field-error" style={{ gridColumn: '1 / -1' }}>
                                {saveError}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Creating…' : 'Create bundle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Edit modal — price is locked behind an explicit "reprice" toggle
// ─────────────────────────────────────────────────────────────

interface EditModalProps {
    bundle: CreditBundle;
    saving: boolean;
    saveError: string | null;
    onSave: (form: EditFormState) => void;
    onClose: () => void;
}

function EditBundleModal({ bundle, saving, saveError, onSave, onClose }: EditModalProps) {
    const [form, setForm] = useState<EditFormState>(bundleToEditForm(bundle));
    const [errors, setErrors] = useState<Partial<Record<keyof EditFormState, string>>>({});

    function set<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => ({ ...e, [key]: undefined }));
    }

    function validate(): boolean {
        const next: typeof errors = {};
        if (!form.name.trim()) next.name = 'Name is required';
        if (form.credits === '' || Number(form.credits) <= 0)
            next.credits = 'Enter a number > 0';
        if (form.repriceEnabled && (form.newPrice === '' || Number(form.newPrice) < 0))
            next.newPrice = 'Enter a price ≥ 0';
        setErrors(next);
        return Object.keys(next).length === 0;
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (validate()) onSave(form);
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit &quot;{bundle.name}&quot;</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-grid">
                        <Field label="Display name" error={errors.name}>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => set('name', e.target.value)}
                                className={errors.name ? 'input-error' : ''}
                            />
                        </Field>

                        <Field label="Credits" error={errors.credits}>
                            <input
                                type="number"
                                min={1}
                                value={form.credits}
                                onChange={(e) => set('credits', e.target.value === '' ? '' : Number(e.target.value))}
                                className={errors.credits ? 'input-error' : ''}
                            />
                        </Field>

                        <Field label="Stripe price ID" wide hint="Read-only — Stripe prices can't be edited in place">
                            <input type="text" value={bundle.stripePriceId} disabled />
                        </Field>

                        <Field label="Status" wide>
                            <label className="toggle-row">
                                <div
                                    className={`toggle ${form.isActive ? 'toggle-on' : ''}`}
                                    role="switch"
                                    aria-checked={form.isActive}
                                    tabIndex={0}
                                    onClick={() => set('isActive', !form.isActive)}
                                    onKeyDown={(e) => e.key === ' ' && set('isActive', !form.isActive)}
                                >
                                    <span className="toggle-thumb" />
                                </div>
                                <span>
                                    {form.isActive
                                        ? 'Active — visible in checkout'
                                        : 'Inactive — hidden from checkout'}
                                </span>
                            </label>
                        </Field>

                        <div className="field field-wide reprice-block">
                            <label className="toggle-row">
                                <div
                                    className={`toggle ${form.repriceEnabled ? 'toggle-on' : ''}`}
                                    role="switch"
                                    aria-checked={form.repriceEnabled}
                                    tabIndex={0}
                                    onClick={() => set('repriceEnabled', !form.repriceEnabled)}
                                    onKeyDown={(e) => e.key === ' ' && set('repriceEnabled', !form.repriceEnabled)}
                                >
                                    <span className="toggle-thumb" />
                                </div>
                                <span>Change price</span>
                            </label>
                            <p className="reprice-note">
                                Current price: <strong>${penceToDisplay(bundle.price)}</strong>. Stripe prices
                                can&apos;t be edited once created — enabling this creates a{' '}
                                <strong>new</strong> Stripe price and retires the old one. The new amount will
                                always be read back from Stripe, so this bundle&apos;s price can never drift
                                from what Stripe actually charges.
                            </p>

                            {form.repriceEnabled && (
                                <Field label="New price ($)" error={errors.newPrice}>
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={form.newPrice}
                                        onChange={(e) =>
                                            set('newPrice', e.target.value === '' ? '' : Number(e.target.value))
                                        }
                                        className={errors.newPrice ? 'input-error' : ''}
                                    />
                                </Field>
                            )}
                        </div>

                        {saveError && (
                            <div className="field-error" style={{ gridColumn: '1 / -1' }}>
                                {saveError}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Field wrapper (shared)
// ─────────────────────────────────────────────────────────────

function Field({
    label,
    hint,
    error,
    wide,
    children,
}: {
    label: string;
    hint?: string;
    error?: string;
    wide?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className={`field ${wide ? 'field-wide' : ''}`}>
            <label className="field-label">{label}</label>
            {children}
            {hint && !error && <span className="field-hint">{hint}</span>}
            {error && <span className="field-error">{error}</span>}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Confirm deactivate dialog
// ─────────────────────────────────────────────────────────────

function ConfirmDeactivate({
    name,
    onConfirm,
    onCancel,
}: {
    name: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
                <h3>Deactivate &quot;{name}&quot;?</h3>
                <p>
                    The bundle will no longer appear in checkout. Users who already purchased it keep their
                    remaining credits until they expire.
                </p>
                <div className="confirm-actions">
                    <button className="btn-ghost" onClick={onCancel}>
                        Keep it
                    </button>
                    <button className="btn-danger" onClick={onConfirm}>
                        Deactivate
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// System settings bar — global listings-per-credit + expiry
// ─────────────────────────────────────────────────────────────

function SystemSettingsBar({
    config,
    onSave,
}: {
    config: CreditSystemConfig | null;
    onSave: (next: CreditSystemConfig) => Promise<void>;
}) {
    const [editing, setEditing] = useState(false);
    const [listingsPerCredit, setListingsPerCredit] = useState<number | ''>('');
    const [creditExpiryDays, setCreditExpiryDays] = useState<number | ''>('');
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (config) {
            setListingsPerCredit(config.listingsPerCredit);
            setCreditExpiryDays(config.creditExpiryDays);
        }
    }, [config]);

    async function handleSave() {
        if (listingsPerCredit === '' || Number(listingsPerCredit) < 1) {
            setErr('Listings per credit must be at least 1');
            return;
        }
        if (creditExpiryDays === '' || Number(creditExpiryDays) < 1) {
            setErr('Expiry days must be at least 1');
            return;
        }
        setErr(null);
        setSaving(true);
        try {
            await onSave({
                listingsPerCredit: Number(listingsPerCredit),
                creditExpiryDays: Number(creditExpiryDays),
            });
            setEditing(false);
        } finally {
            setSaving(false);
        }
    }

    if (!config) return null;

    return (
        <div className="settings-bar">
            <div className="settings-bar-row">
                <div className="settings-item">
                    <span className="settings-label">1 credit unlocks</span>
                    {editing ? (
                        <input
                            type="number"
                            min={1}
                            className="settings-input"
                            value={listingsPerCredit}
                            onChange={(e) =>
                                setListingsPerCredit(e.target.value === '' ? '' : Number(e.target.value))
                            }
                        />
                    ) : (
                        <span className="settings-value">{config.listingsPerCredit}</span>
                    )}
                    <span className="settings-label">listing{config.listingsPerCredit === 1 ? '' : 's'}</span>
                </div>

                <div className="settings-divider" />

                <div className="settings-item">
                    <span className="settings-label">Credits expire after</span>
                    {editing ? (
                        <input
                            type="number"
                            min={1}
                            className="settings-input"
                            value={creditExpiryDays}
                            onChange={(e) =>
                                setCreditExpiryDays(e.target.value === '' ? '' : Number(e.target.value))
                            }
                        />
                    ) : (
                        <span className="settings-value">{config.creditExpiryDays}</span>
                    )}
                    <span className="settings-label">days</span>
                </div>

                <div className="settings-bar-actions">
                    {editing ? (
                        <>
                            <button
                                className="btn-ghost-sm"
                                onClick={() => {
                                    setEditing(false);
                                    setErr(null);
                                    setListingsPerCredit(config.listingsPerCredit);
                                    setCreditExpiryDays(config.creditExpiryDays);
                                }}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button className="btn-outline-sm" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </>
                    ) : (
                        <button className="btn-outline-sm" onClick={() => setEditing(true)}>
                            Edit
                        </button>
                    )}
                </div>
            </div>
            {err && <div className="field-error" style={{ marginTop: 8 }}>{err}</div>}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────

export default function AdminCreditBundlesPage() {
    const [bundles, setBundles] = useState<CreditBundle[]>([]);
    const [config, setConfig] = useState<CreditSystemConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [editingBundle, setEditingBundle] = useState<CreditBundle | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const [confirmBundle, setConfirmBundle] = useState<CreditBundle | null>(null);
    const [deactivating, setDeactivating] = useState(false);

    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [bundlesRes, configRes] = await Promise.all([
                fetch('/api/admin/credit-bundles'),
                fetch('/api/admin/credit-settings'),
            ]);
            if (!bundlesRes.ok) throw new Error('Failed to load credit bundles');
            if (!configRes.ok) throw new Error('Failed to load credit settings');
            const bundlesJson = await bundlesRes.json();
            const configJson = await configRes.json();
            setBundles(bundlesJson.bundles ?? []);
            setConfig(configJson.config ?? null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    function showToast(msg: string, type: 'ok' | 'err') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }

    async function handleSaveSettings(next: CreditSystemConfig) {
        try {
            const res = await fetch('/api/admin/credit-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(next),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Failed to save settings');
            setConfig(json.config);
            showToast('Credit settings updated.', 'ok');
        } catch (e: any) {
            showToast(e.message, 'err');
        }
    }

    function openCreate() {
        setSaveError(null);
        setCreateOpen(true);
    }

    function openEdit(bundle: CreditBundle) {
        setEditingBundle(bundle);
        setSaveError(null);
    }

    async function handleCreate(form: BundleFormState) {
        setSaving(true);
        setSaveError(null);
        try {
            const payload = {
                key: form.key.trim(),
                name: form.name.trim(),
                credits: Number(form.credits),
                price: Number(form.price),
                isActive: form.isActive,
            };
            const res = await fetch('/api/admin/credit-bundles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Save failed');

            setCreateOpen(false);
            showToast('Bundle created.', 'ok');
            await load();
        } catch (e: any) {
            setSaveError(e.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleEditSave(form: EditFormState) {
        if (!editingBundle) return;
        setSaving(true);
        setSaveError(null);
        try {
            const payload: any = {
                name: form.name.trim(),
                credits: Number(form.credits),
                isActive: form.isActive,
            };
            if (form.repriceEnabled) {
                payload.newPrice = Number(form.newPrice);
            }

            const res = await fetch(`/api/admin/credit-bundles/${editingBundle._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Save failed');

            setEditingBundle(null);
            showToast('Bundle updated.', 'ok');
            await load();
        } catch (e: any) {
            setSaveError(e.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDeactivate() {
        if (!confirmBundle) return;
        setDeactivating(true);
        try {
            const res = await fetch(`/api/admin/credit-bundles/${confirmBundle._id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Failed');
            setConfirmBundle(null);
            showToast(`"${confirmBundle.name}" deactivated.`, 'ok');
            await load();
        } catch (e: any) {
            showToast(e.message, 'err');
        } finally {
            setDeactivating(false);
        }
    }

    async function handleReactivate(bundle: CreditBundle) {
        try {
            const res = await fetch(`/api/admin/credit-bundles/${bundle._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: true }),
            });
            if (!res.ok) throw new Error('Failed');
            showToast(`"${bundle.name}" reactivated.`, 'ok');
            await load();
        } catch {
            showToast('Reactivation failed.', 'err');
        }
    }

    return (
        <>
            <style>{STYLES}</style>

            <div className="ap-page">
                <div className="ap-header">
                    <div>
                        <h1 className="ap-title">Credit bundles</h1>
                        <p className="ap-subtitle">
                            Configure the credit bundles employers can buy. Each credit unlocks listings at the
                            rate set below.
                        </p>
                    </div>
                    <button className="btn-primary" onClick={openCreate}>
                        + New bundle
                    </button>
                </div>

                {!loading && !error && <SystemSettingsBar config={config} onSave={handleSaveSettings} />}

                {error && (
                    <div className="ap-error">
                        {error} —{' '}
                        <button className="link-btn" onClick={load}>
                            Retry
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="plan-grid">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="plan-card skeleton" />
                        ))}
                    </div>
                )}

                {!loading && !error && bundles.length === 0 && (
                    <div className="ap-empty">
                        <p>No credit bundles yet.</p>
                        <button className="btn-primary" onClick={openCreate}>
                            Create your first bundle
                        </button>
                    </div>
                )}

                {!loading && bundles.length > 0 && (
                    <div className="plan-grid">
                        {bundles.map((bundle) => (
                            <BundleCard
                                key={bundle._id}
                                bundle={bundle}
                                listingsPerCredit={config?.listingsPerCredit ?? 1}
                                creditExpiryDays={config?.creditExpiryDays ?? 365}
                                onEdit={() => openEdit(bundle)}
                                onDeactivate={() => setConfirmBundle(bundle)}
                                onReactivate={() => handleReactivate(bundle)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {createOpen && (
                <CreateBundleModal
                    saving={saving}
                    saveError={saveError}
                    onSave={handleCreate}
                    onClose={() => setCreateOpen(false)}
                />
            )}

            {editingBundle && (
                <EditBundleModal
                    bundle={editingBundle}
                    saving={saving}
                    saveError={saveError}
                    onSave={handleEditSave}
                    onClose={() => setEditingBundle(null)}
                />
            )}

            {confirmBundle && (
                <ConfirmDeactivate
                    name={confirmBundle.name}
                    onConfirm={handleDeactivate}
                    onCancel={() => setConfirmBundle(null)}
                />
            )}

            {toast && (
                <div className={`ap-toast ap-toast-${toast.type}`}>
                    {toast.type === 'ok' ? '✓' : '✕'} {toast.msg}
                </div>
            )}
        </>
    );
}

// ─────────────────────────────────────────────────────────────
// Bundle card
// ─────────────────────────────────────────────────────────────

function BundleCard({
    bundle,
    listingsPerCredit,
    creditExpiryDays,
    onEdit,
    onDeactivate,
    onReactivate,
}: {
    bundle: CreditBundle;
    listingsPerCredit: number;
    creditExpiryDays: number;
    onEdit: () => void;
    onDeactivate: () => void;
    onReactivate: () => void;
}) {
    const totalListings = bundle.credits * listingsPerCredit;

    return (
        <div className={`plan-card ${!bundle.isActive ? 'plan-card-inactive' : ''}`}>
            <span className={`plan-badge ${bundle.isActive ? 'badge-active' : 'badge-inactive'}`}>
                {bundle.isActive ? 'Active' : 'Inactive'}
            </span>

            <div className="plan-key">{bundle.key}</div>
            <h3 className="plan-name">{bundle.name}</h3>

            <div className="plan-price">
                <span className="price-amount">${penceToDisplay(bundle.price)}</span>
                <span className="price-period"> one-time</span>
            </div>

            <div className="plan-features">
                <Feature label="Credits" value={bundle.credits} />
                <Feature label="Unlocks" value={`${totalListings} listings`} />
                <Feature label="Expires" value={`${creditExpiryDays} days after purchase`} />
                <Feature label="Stripe price ID" value={bundle.stripePriceId} mono />
            </div>

            <div className="plan-actions">
                <button className="btn-outline-sm" onClick={onEdit}>
                    Edit
                </button>
                {bundle.isActive ? (
                    <button className="btn-ghost-sm btn-danger-ghost" onClick={onDeactivate}>
                        Deactivate
                    </button>
                ) : (
                    <button className="btn-ghost-sm" onClick={onReactivate}>
                        Reactivate
                    </button>
                )}
            </div>
        </div>
    );
}

function Feature({
    label,
    value,
    mono,
    dim,
}: {
    label: string;
    value: string | number;
    mono?: boolean;
    dim?: boolean;
}) {
    return (
        <div className="feature-row">
            <span className="feature-label">{label}</span>
            <span
                className={`feature-value ${mono ? 'feature-mono' : ''} ${dim ? 'feature-dim' : ''}`}
            >
                {value}
            </span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Styles — same design system as the plans admin page, plus a
// settings-bar block for the global listings-per-credit rate.
// ─────────────────────────────────────────────────────────────

const STYLES = `
/* ── Layout ─────────────────────────────────────────────────── */
.ap-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px 64px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #0f172a;
}
.ap-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.ap-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
}
.ap-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}
.ap-error {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #991b1b;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 24px;
}
.ap-empty {
  text-align: center;
  padding: 64px 24px;
  color: #64748b;
  font-size: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* ── Settings bar ────────────────────────────────────────────── */
.settings-bar {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 28px;
}
.settings-bar-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.settings-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.settings-label { color: #64748b; }
.settings-value { font-weight: 700; color: #0f172a; font-size: 15px; }
.settings-input {
  width: 64px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}
.settings-divider {
  width: 1px;
  height: 24px;
  background: #e2e8f0;
}
.settings-bar-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

/* ── Plan grid ───────────────────────────────────────────────── */
.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

/* ── Plan card ───────────────────────────────────────────────── */
.plan-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  transition: box-shadow 0.15s;
}
.plan-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
.plan-card-inactive { opacity: 0.6; }
.plan-card.skeleton {
  height: 260px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { to { background-position: -200% 0; } }

.plan-badge {
  display: inline-flex;
  align-self: flex-start;
  font-size: 11px;
  font-weight: 400;
  padding: 2px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.badge-active { background: #dcfce7; color: #15803d; }
.badge-inactive { background: #f1f5f9; color: #64748b; }

.plan-key {
  font-size: 12px;
  font-family: 'Menlo', 'Monaco', monospace;
  color: #6366f1;
  background: #eef2ff;
  border-radius: 6px;
  padding: 2px 8px;
  align-self: flex-start;
}
.plan-name {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}
.plan-price { margin: 4px 0 8px; }
.price-amount { font-size: 28px; font-weight: 800; color: #0f172a; }
.price-period { font-size: 14px; color: #64748b; }

.plan-features {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
  margin-top: 4px;
}
.feature-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
.feature-label { color: #64748b; }
.feature-value { font-weight: 400; color: #0f172a; }
.feature-mono {
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 11px;
  font-weight: 400;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}
.feature-dim { color: #94a3b8 !important; font-weight: 400 !important; }

.plan-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

/* ── Buttons ─────────────────────────────────────────────────── */
.btn-primary {
  background: #1a56db;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover:not(:disabled) { background: #1e40af; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-outline-sm {
  background: transparent;
  color: #1a56db;
  border: 1px solid #1a56db;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.btn-outline-sm:hover { background: #eff6ff; }
.btn-outline-sm:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-ghost { background: transparent; border: none; color: #475569; cursor: pointer; font-size: 14px; padding: 10px 16px; border-radius: 8px; }
.btn-ghost:hover:not(:disabled) { background: #f1f5f9; }
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-ghost-sm { background: transparent; border: none; color: #475569; cursor: pointer; font-size: 13px; padding: 6px 10px; border-radius: 6px; }
.btn-ghost-sm:hover { background: #f1f5f9; }
.btn-ghost-sm:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-danger-ghost { color: #dc2626; }
.btn-danger-ghost:hover { background: #fef2f2 !important; }

.btn-danger {
  background: #dc2626; color: #fff; border: none;
  border-radius: 8px; padding: 10px 16px; font-size: 14px;
  font-weight: 400; cursor: pointer;
}
.btn-danger:hover { background: #b91c1c; }

.link-btn { background: none; border: none; color: #1a56db; cursor: pointer; text-decoration: underline; padding: 0; font-size: inherit; }

/* ── Modal overlay ───────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.modal-box {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,.2);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 0;
}
.modal-header h2 { font-size: 18px; font-weight: 700; margin: 0; }
.modal-close {
  background: none; border: none; font-size: 22px; cursor: pointer;
  color: #64748b; line-height: 1; padding: 4px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px 24px 24px;
  border-top: 1px solid #f1f5f9;
  margin-top: 8px;
}

/* ── Form grid ───────────────────────────────────────────────── */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 20px;
  padding: 20px 24px 0;
}
.field { display: flex; flex-direction: column; gap: 4px; }
.field-wide { grid-column: 1 / -1; }
.field-label { font-size: 13px; font-weight: 400; color: #374151; }
.field-hint { font-size: 12px; color: #94a3b8; }
.field-error { font-size: 12px; color: #dc2626; }

.form-grid input[type="text"],
.form-grid input[type="number"] {
  border: 1px solid #d1d5db;
  border-radius: 7px;
  padding: 8px 11px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.12s;
  background: #fff;
  width: 100%;
  box-sizing: border-box;
}
.form-grid input:focus { border-color: #1a56db; box-shadow: 0 0 0 2px rgba(26,86,219,0.12); }
.form-grid input:disabled { background: #f8fafc; color: #94a3b8; }
.input-error { border-color: #dc2626 !important; }

/* ── Reprice block ───────────────────────────────────────────── */
.reprice-block {
  border-top: 1px solid #f1f5f9;
  padding-top: 16px;
  margin-top: 4px;
  gap: 10px;
}
.reprice-note {
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

/* ── Toggle ──────────────────────────────────────────────────── */
.toggle-row { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 14px; color: #374151; }
.toggle {
  width: 44px; height: 24px;
  background: #d1d5db;
  border-radius: 12px;
  position: relative;
  transition: background 0.2s;
  cursor: pointer;
  flex-shrink: 0;
}
.toggle-on { background: #1a56db; }
.toggle-thumb {
  position: absolute;
  top: 3px; left: 3px;
  width: 18px; height: 18px;
  background: #fff;
  border-radius: 9px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
}
.toggle-on .toggle-thumb { transform: translateX(20px); }

/* ── Confirm dialog ──────────────────────────────────────────── */
.confirm-box {
  background: #fff;
  border-radius: 14px;
  padding: 28px;
  max-width: 380px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,.2);
}
.confirm-box h3 { font-size: 17px; font-weight: 700; margin: 0 0 10px; }
.confirm-box p { font-size: 14px; color: #475569; margin: 0 0 24px; line-height: 1.6; }
.confirm-actions { display: flex; gap: 10px; justify-content: flex-end; }

/* ── Toast ───────────────────────────────────────────────────── */
.ap-toast {
  position: fixed;
  bottom: 28px; right: 28px;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0,0,0,.15);
  z-index: 2000;
  animation: slide-up 0.2s ease;
}
@keyframes slide-up { from { transform: translateY(16px); opacity: 0; } }
.ap-toast-ok { background: #065f46; color: #fff; }
.ap-toast-err { background: #991b1b; color: #fff; }
`;