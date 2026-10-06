/**
 * src/app/api/admin/users/[userId]/permissions/route.ts
 *
 * GET  — return the user's current effective permissions + raw stored list
 * PUT  — overwrite the user's custom permissions (empty [] → revert to role defaults)
 *
 * Protected by the middleware permission key:
 *   GET  → "GET:src/app/api/admin/users/:userId"   (USERS_READ)
 *   PUT  → the new PERMISSIONS_UPDATE key added to PERMISSIONS in permissions.ts
 *
 * Only admin / sub-admin roles can reach these routes (middleware already
 * enforces that for /api/admin/*).
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import { UserProfile, resolvePermissions } from '@/modal/User';
import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from '@/config/permissions';
import type { Permission } from '@/config/permissions';
import mongoose from 'mongoose';

// ─── GET /api/admin/users/[userId]/permissions ────────────────────────────────

export async function GET(
    _req: Request,
    context: { params: Promise<{ userId: string }> }
) {
    try {

        const { userId } = await context.params;

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (session.user.role !== 'admin' && session.user.role !== 'sub-admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await connectToDatabase();

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
        }

        const profile = await UserProfile.findOne({
            userId: new mongoose.Types.ObjectId(userId),
        }).lean();

        if (!profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        const effectivePermissions = resolvePermissions({
            role: profile.role,
            permissions: profile.permissions,
        });

        return NextResponse.json({
            userId: userId,
            role: profile.role,
            /** Permissions explicitly stored for this user (empty = use role defaults) */
            storedPermissions: profile.permissions ?? [],
            /** What is actually enforced at runtime */
            effectivePermissions,
            /** The role's default set for reference */
            roleDefaultPermissions: ROLE_DEFAULT_PERMISSIONS[profile.role] ?? [],
            /** Every possible permission key, for building admin UI checkboxes */
            allPermissions: Object.values(PERMISSIONS) as Permission[],
        });
    } catch (err) {
        console.error('[permissions GET]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── PUT /api/admin/users/[userId]/permissions ────────────────────────────────

export async function PUT(
    req: Request,
    context: { params: Promise<{ userId: string }> }
) {
    try {

        const { userId } = await context.params;
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Only full admins may change permissions
        if (session.user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Only admins can modify user permissions.' },
                { status: 403 }
            );
        }

        await connectToDatabase();

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
        }

        const body = await req.json();
        const NewRole = body.role || session.user.role;
        const incoming: unknown = body.permissions;

        // Validate input
        if (!Array.isArray(incoming)) {
            return NextResponse.json(
                { error: 'Bad Request', message: '`permissions` must be an array of permission strings.' },
                { status: 400 }
            );
        }

        const allValid = Object.values(PERMISSIONS) as Permission[];

        const invalid = (incoming as string[]).filter(
            (p) => !allValid.includes(p as Permission)
        );
        if (invalid.length > 0) {
            return NextResponse.json(
                { error: 'Bad Request', message: `Unknown permissions: ${invalid.join(', ')}` },
                { status: 400 }
            );
        }

        const updated = await UserProfile.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId) },
            { $set: { permissions: incoming, role: NewRole } },
            { new: true }
        ).lean();

        if (!updated) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        const effectivePermissions = resolvePermissions({
            role: updated.role,
            permissions: updated.permissions,
        });

        console.log(
            `[permissions PUT] admin=${session.user.id} updated userId=${userId} ` +
            `permissions=${(incoming as string[]).length}`
        );

        return NextResponse.json({
            success: true,
            userId: userId,
            storedPermissions: updated.permissions ?? [],
            effectivePermissions,
        });
    } catch (err) {
        console.error('[permissions PUT]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}