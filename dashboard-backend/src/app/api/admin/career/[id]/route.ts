import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import PipelineCrear from '@/modal/Pipelinecrear';
import { v2 as cloudinary } from 'cloudinary';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  const user = session.user as any;
  if (!user.isAdmin && user.role !== 'admin') throw new Error('Forbidden');
  return session;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const { action, ids, payload } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    let result: any = {};

    switch (action) {
      case 'updateStage':
        if (!payload?.stage) {
          return NextResponse.json({ error: 'Stage required' }, { status: 400 });
        }
        result = await PipelineCrear.updateMany(
          { _id: { $in: ids } },
          { $set: { stage: payload.stage } }
        );
        break;

      case 'updateStatus':
        if (!payload?.status) {
          return NextResponse.json({ error: 'Status required' }, { status: 400 });
        }
        result = await PipelineCrear.updateMany(
          { _id: { $in: ids } },
          { $set: { status: payload.status } }
        );
        break;

      case 'delete':
        // Delete Cloudinary assets first
        const profiles = await PipelineCrear.find({ _id: { $in: ids } });
        for (const profile of profiles) {
          try {
            if (profile.avatarUrl) {
              const publicId = profile.avatarUrl.split('/').pop()?.split('.')[0];
              if (publicId) await cloudinary.uploader.destroy(`pipeline/avatars/${publicId}`);
            }
            if (profile.resumePublicId) {
              await cloudinary.uploader.destroy(profile.resumePublicId, { resource_type: 'raw' });
            }
          } catch (e) {
            console.error('Cloudinary deletion error:', e);
          }
        }
        result = await PipelineCrear.deleteMany({ _id: { $in: ids } });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[POST /api/admin/pipeline/bulk]', error);
    const status = error.message === 'Unauthorized' ? 401 : error.message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}