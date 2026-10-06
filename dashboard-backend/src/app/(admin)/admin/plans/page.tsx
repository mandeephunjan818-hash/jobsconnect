'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Plan {
    _id: string;
    key: string;
    name: string;
    stripePriceId: string | null;
    listingQuota: number;
    applicantLimit: number;       // replaces featuredSlots
    manualPostLimit: number;
    autoPostLimit: number;
    postVisibilityDays: number;
    price: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface PlanFormState {
    key: string;
    name: string;
    stripePriceId: string;
    listingQuota: number | '';
    applicantLimit: number | '';  // new
    manualPostLimit: number | '';
    autoPostLimit: number | '';
    postVisibilityDays: number | '';
    price: number | '';
    isActive: boolean;
}

const EMPTY_FORM: PlanFormState = {
    key: '',
    name: '',
    stripePriceId: '',
    listingQuota: '',
    applicantLimit: 0,           // default 0
    manualPostLimit: 0,
    autoPostLimit: 0,
    postVisibilityDays: 30,
    price: '',
    isActive: true,
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function penceToDisplay(pence: number): string {
    return (pence / 100).toFixed(2);
}

function displayToPence(val: number | ''): number {
    if (val === '') return 0;
    return Math.round(Number(val) * 100);
}

function planToForm(p: Plan): PlanFormState {
    return {
        key: p.key,
        name: p.name,
        stripePriceId: p.stripePriceId ?? '',
        listingQuota: p.listingQuota,
        applicantLimit: p.applicantLimit,
        manualPostLimit: p.manualPostLimit,
        autoPostLimit: p.autoPostLimit,
        postVisibilityDays: p.postVisibilityDays,
        price: parseFloat(penceToDisplay(p.price)) as number,
        isActive: p.isActive,
    };
}

// ─────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────

interface PlanModalProps {
    initial: PlanFormState;
    isEdit: boolean;
    saving: boolean;
    saveError: string | null;
    onSave: (form: PlanFormState) => void;
    onClose: () => void;
}

function PlanModal({ initial, isEdit, saving, saveError, onSave, onClose }: PlanModalProps) {
    const [form, setForm] = useState<PlanFormState>(initial);
    const [errors, setErrors] = useState<Partial<Record<keyof PlanFormState, string>>>({});

    function set<K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => ({ ...e, [key]: undefined }));
    }

    function validate(): boolean {
        const next: typeof errors = {};
        if (!form.key.trim()) next.key = 'Key is required';
        else if (!/^[a-z0-9_-]+$/.test(form.key.trim()))
            next.key = 'Lowercase letters, numbers, hyphens only';
        if (!form.name.trim()) next.name = 'Name is required';
        if (form.listingQuota === '' || Number(form.listingQuota) < 0)
            next.listingQuota = 'Enter a number ≥ 0';
        if (form.applicantLimit === '' || Number(form.applicantLimit) < 0)
            next.applicantLimit = 'Enter a number ≥ 0';
        if (form.manualPostLimit === '' || Number(form.manualPostLimit) < 0)
            next.manualPostLimit = 'Enter a number ≥ 0';
        if (form.autoPostLimit === '' || Number(form.autoPostLimit) < 0)
            next.autoPostLimit = 'Enter a number ≥ 0';
        if (form.postVisibilityDays === '' || Number(form.postVisibilityDays) < 0)
            next.postVisibilityDays = 'Enter a number ≥ 0';
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
                    <h2>{isEdit ? 'Edit plan' : 'New plan'}</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-grid">
                        <Field label="Plan key" error={errors.key} hint="e.g. free · starter · pro">
                            <input
                                type="text"
                                value={form.key}
                                onChange={(e) => set('key', e.target.value.toLowerCase())}
                                placeholder="starter"
                                disabled={isEdit}
                                className={errors.key ? 'input-error' : ''}
                            />
                        </Field>

                        <Field label="Display name" error={errors.name}>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => set('name', e.target.value)}
                                placeholder="Starter"
                                className={errors.name ? 'input-error' : ''}
                            />
                        </Field>

                        <Field label="Stripe price ID" hint="Leave blank for the free tier" wide>
                            <input
                                type="text"
                                value={form.stripePriceId}
                                onChange={(e) => set('stripePriceId', e.target.value.trim())}
                                placeholder="price_xxxxxxxxxxxxxxxx"
                            />
                        </Field>

                        <Field label="Listing quota" error={errors.listingQuota} hint="Active listings allowed">
                            <input
                                type="number"
                                min={0}
                                value={form.listingQuota}
                                onChange={(e) =>
                                    set('listingQuota', e.target.value === '' ? '' : Number(e.target.value))
                                }
                                className={errors.listingQuota ? 'input-error' : ''}
                            />
                        </Field>

                        <Field label="Applicant limit" error={errors.applicantLimit} hint="Max applicants from website">
                            <input
                                type="number"
                                min={0}
                                value={form.applicantLimit}
                                onChange={(e) =>
                                    set('applicantLimit', e.target.value === '' ? '' : Number(e.target.value))
                                }
                                className={errors.applicantLimit ? 'input-error' : ''}
                            />
                        </Field>

                        <Field label="Manual post limit" error={errors.manualPostLimit} hint="Max posts created manually">
                            <input
                                type="number"
                                min={0}
                                value={form.manualPostLimit}
                                onChange={(e) =>
                                    set('manualPostLimit', e.target.value === '' ? '' : Number(e.target.value))
                                }
                                className={errors.manualPostLimit ? 'input-error' : ''}
                            />
                        </Field>

                        <Field label="Auto post limit" error={errors.autoPostLimit} hint="Max posts from feed / API">
                            <input
                                type="number"
                                min={0}
                                value={form.autoPostLimit}
                                onChange={(e) =>
                                    set('autoPostLimit', e.target.value === '' ? '' : Number(e.target.value))
                                }
                                className={errors.autoPostLimit ? 'input-error' : ''}
                            />
                        </Field>

                        <Field label="Post visibility (days)" error={errors.postVisibilityDays} hint="Days posts stay visible">
                            <input
                                type="number"
                                min={0}
                                value={form.postVisibilityDays}
                                onChange={(e) =>
                                    set('postVisibilityDays', e.target.value === '' ? '' : Number(e.target.value))
                                }
                                className={errors.postVisibilityDays ? 'input-error' : ''}
                            />
                        </Field>

                        <Field label="Price ($)" error={errors.price} hint="Enter 0 for free">
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
                            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create plan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Field wrapper
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
                    The plan will no longer appear in checkout. Existing subscribers keep their plan until they
                    cancel.
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
// Main page component
// ─────────────────────────────────────────────────────────────

export default function AdminPlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
    const [deactivating, setDeactivating] = useState(false);

    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/plans');
            if (!res.ok) throw new Error('Failed to load plans');
            const json = await res.json();
            setPlans(json.plans ?? []);
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

    function openCreate() {
        setEditingPlan(null);
        setSaveError(null);
        setModalOpen(true);
    }

    function openEdit(plan: Plan) {
        setEditingPlan(plan);
        setSaveError(null);
        setModalOpen(true);
    }

    async function handleSave(form: PlanFormState) {
        setSaving(true);
        setSaveError(null);
        try {
            const payload = {
                key: form.key.trim(),
                name: form.name.trim(),
                stripePriceId: form.stripePriceId.trim() || null,
                listingQuota: Number(form.listingQuota),
                applicantLimit: Number(form.applicantLimit),
                manualPostLimit: Number(form.manualPostLimit),
                autoPostLimit: Number(form.autoPostLimit),
                postVisibilityDays: Number(form.postVisibilityDays),
                price: displayToPence(form.price),
                isActive: form.isActive,
            };

            let res: Response;
            if (editingPlan) {
                res = await fetch(`/api/admin/plans/${editingPlan._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch('/api/admin/plans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Save failed');

            setModalOpen(false);
            showToast(editingPlan ? 'Plan updated.' : 'Plan created.', 'ok');
            await load();
        } catch (e: any) {
            setSaveError(e.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDeactivate() {
        if (!confirmPlan) return;
        setDeactivating(true);
        try {
            const res = await fetch(`/api/admin/plans/${confirmPlan._id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Failed');
            setConfirmPlan(null);
            showToast(`"${confirmPlan.name}" deactivated.`, 'ok');
            await load();
        } catch (e: any) {
            showToast(e.message, 'err');
        } finally {
            setDeactivating(false);
        }
    }

    async function handleReactivate(plan: Plan) {
        try {
            const res = await fetch(`/api/admin/plans/${plan._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: true }),
            });
            if (!res.ok) throw new Error('Failed');
            showToast(`"${plan.name}" reactivated.`, 'ok');
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
                        <h1 className="ap-title">Subscription plans</h1>
                        <p className="ap-subtitle">
                            Configure the plans available to employers. Changes take effect immediately.
                        </p>
                    </div>
                    <button className="btn-primary" onClick={openCreate}>
                        + New plan
                    </button>
                </div>

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

                {!loading && !error && plans.length === 0 && (
                    <div className="ap-empty">
                        <p>No plans yet.</p>
                        <button className="btn-primary" onClick={openCreate}>
                            Create your first plan
                        </button>
                    </div>
                )}

                {!loading && plans.length > 0 && (
                    <div className="plan-grid">
                        {plans.map((plan) => (
                            <PlanCard
                                key={plan._id}
                                plan={plan}
                                onEdit={() => openEdit(plan)}
                                onDeactivate={() => setConfirmPlan(plan)}
                                onReactivate={() => handleReactivate(plan)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {modalOpen && (
                <PlanModal
                    initial={editingPlan ? planToForm(editingPlan) : EMPTY_FORM}
                    isEdit={!!editingPlan}
                    saving={saving}
                    saveError={saveError}
                    onSave={handleSave}
                    onClose={() => setModalOpen(false)}
                />
            )}

            {confirmPlan && (
                <ConfirmDeactivate
                    name={confirmPlan.name}
                    onConfirm={handleDeactivate}
                    onCancel={() => setConfirmPlan(null)}
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
// Plan card
// ─────────────────────────────────────────────────────────────

function PlanCard({
    plan,
    onEdit,
    onDeactivate,
    onReactivate,
}: {
    plan: Plan;
    onEdit: () => void;
    onDeactivate: () => void;
    onReactivate: () => void;
}) {
    const isFree = plan.price === 0;

    return (
        <div className={`plan-card ${!plan.isActive ? 'plan-card-inactive' : ''}`}>
            <span className={`plan-badge ${plan.isActive ? 'badge-active' : 'badge-inactive'}`}>
                {plan.isActive ? 'Active' : 'Inactive'}
            </span>

            <div className="plan-key">{plan.key}</div>
            <h3 className="plan-name">{plan.name}</h3>

            <div className="plan-price">
                {isFree ? (
                    <span className="price-free">Free</span>
                ) : (
                    <>
                        <span className="price-amount">${penceToDisplay(plan.price)}</span>
                        <span className="price-period"> / mo</span>
                    </>
                )}
            </div>

            <div className="plan-features">
                <Feature label="Listings" value={plan.listingQuota} />
                <Feature label="Applicants" value={plan.applicantLimit} />
                <Feature label="Manual posts" value={plan.manualPostLimit} />
                <Feature label="Auto posts" value={plan.autoPostLimit} />
                <Feature label="Visibility" value={`${plan.postVisibilityDays} days`} />
                <Feature
                    label="Stripe price ID"
                    value={plan.stripePriceId ?? '—'}
                    mono
                    dim={!plan.stripePriceId}
                />
            </div>

            <div className="plan-actions">
                <button className="btn-outline-sm" onClick={onEdit}>
                    Edit
                </button>
                {plan.isActive ? (
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
// Styles (unchanged)
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
  margin-bottom: 36px;
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
.price-free { font-size: 22px; font-weight: 700; color: #15803d; }
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

.btn-ghost { background: transparent; border: none; color: #475569; cursor: pointer; font-size: 14px; padding: 10px 16px; border-radius: 8px; }
.btn-ghost:hover:not(:disabled) { background: #f1f5f9; }
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-ghost-sm { background: transparent; border: none; color: #475569; cursor: pointer; font-size: 13px; padding: 6px 10px; border-radius: 6px; }
.btn-ghost-sm:hover { background: #f1f5f9; }
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