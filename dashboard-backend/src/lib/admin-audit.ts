/**
 * lib/admin-audit.ts
 *
 * Thin helper that writes an AdminAuditLog entry.
 * Call this AFTER the Stripe + DB operations succeed so the log
 * reflects what actually happened, not what was attempted.
 * If logging itself fails we log to console but never throw —
 * the audit trail must never block the primary operation.
 */

import { NextRequest } from 'next/server';
import {
    AdminAuditLog,
    AdminAuditAction,
    AdminAuditTargetType,
    IStripeOperation,
} from '@/modal/AdminAuditLog';

export interface WriteAuditParams {
    req: NextRequest;
    adminUserId: string;
    action: AdminAuditAction;
    targetType: AdminAuditTargetType;
    targetId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    stripeOperations?: IStripeOperation[];
    partialFailure?: string;
}

/**
 * Write a single audit log entry.
 * Never throws — errors are swallowed and printed to stderr.
 */
export async function writeAuditLog(params: WriteAuditParams): Promise<void> {
    try {
        const ip =
            params.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
            params.req.headers.get('x-real-ip') ??
            'unknown';

        const userAgent = params.req.headers.get('user-agent') ?? 'unknown';

        await AdminAuditLog.create({
            adminUserId: params.adminUserId,
            ip,
            userAgent,
            action: params.action,
            targetType: params.targetType,
            targetId: params.targetId,
            before: params.before ?? null,
            after: params.after ?? null,
            stripeOperations: params.stripeOperations ?? [],
            partialFailure: params.partialFailure,
        });
    } catch (err) {
        // Audit log failure must never surface to the caller
        console.error('[admin-audit] Failed to write audit log:', err);
    }
}

/**
 * Build a lean snapshot of a bundle for before/after diffing.
 * Pass the raw Mongoose document or a plain object — both work.
 */
export function bundleSnapshot(bundle: Record<string, unknown>): Record<string, unknown> {
    return {
        key: bundle.key,
        name: bundle.name,
        credits: bundle.credits,
        price: bundle.price,
        currency: bundle.currency,
        isActive: bundle.isActive,
        stripePriceId: bundle.stripePriceId,
        stripeProductId: bundle.stripeProductId,
    };
}

/**
 * Build a lean snapshot of credit system config for diffing.
 */
export function configSnapshot(config: Record<string, unknown>): Record<string, unknown> {
    return {
        listingsPerCredit: config.listingsPerCredit,
        creditExpiryDays: config.creditExpiryDays,
        stripeConfigProductId: config.stripeConfigProductId,
    };
}

/**
 * Convenience — extract admin user ID from request.
 * Replace the body of this function with your real session lookup.
 * Returns 'unknown_admin' if no session is present (should never
 * happen once you add auth middleware, but prevents a crash during dev).
 */
export async function getAdminUserId(req: NextRequest): Promise<string> {
    // TODO: replace with your real session/auth check, e.g.:
    // const session = await getServerSession(req);
    // return session?.user?.id ?? 'unknown_admin';
    const headerAdminId = req.headers.get('x-admin-id');
    return headerAdminId ?? 'unknown_admin';
}