// src/lib/blogScheduler.ts
import connectToDatabase from './mongooes';
import BlogPost from '../modal/BlogPost';

const timers = new Map<string, ReturnType<typeof setTimeout>>();

async function publishBlogPost(postId: string): Promise<void> {
    try {
        await connectToDatabase();
        const post = await BlogPost.findById(postId);
        if (!post) {
            console.warn(`[BlogScheduler] Post ${postId} not found — skipping`);
            return;
        }
        if (post.status !== 'scheduled') {
            console.warn(`[BlogScheduler] Post ${postId} status is '${post.status}', expected 'scheduled' — skipping`);
            return;
        }

        post.status = 'published';
        post.isActive = true;
        post.adminNotes.push({
            message: `Auto-published from scheduler at ${new Date().toISOString()}`,
            type: 'status_change',
            createdAt: new Date(),
            createdBy: 'scheduler',
        });
        await post.save();
        timers.delete(postId);

        console.log(`[BlogScheduler] Post ${postId} published (slug: ${post.slug})`);
    } catch (err) {
        console.error(`[BlogScheduler] Failed to publish post ${postId}:`, err);
    }
}

export function scheduleBlogPost(postId: string, publishAt: Date): void {
    cancelScheduledBlogPost(postId);

    const delay = publishAt.getTime() - Date.now();
    if (delay <= 0) {
        publishBlogPost(postId);
        return;
    }

    const MAX_DELAY_MS = 24 * 60 * 60 * 1000;
    const safeDelay = Math.min(delay, MAX_DELAY_MS);

    const handle = setTimeout(() => publishBlogPost(postId), safeDelay);
    timers.set(postId, handle);

    console.log(`[BlogScheduler] Post ${postId} scheduled in ${Math.round(safeDelay / 1000)}s`);
}

export function cancelScheduledBlogPost(postId: string): void {
    const handle = timers.get(postId);
    if (handle) {
        clearTimeout(handle);
        timers.delete(postId);
        console.log(`[BlogScheduler] Timer cancelled for post ${postId}`);
    }
}

export async function initBlogScheduler(): Promise<void> {
    try {
        await connectToDatabase();
        const scheduled = await BlogPost.find({
            status: 'scheduled',
            publishAt: { $exists: true, $ne: null },
        }).lean();

        if (!scheduled.length) {
            console.log('[BlogScheduler] No scheduled posts on boot');
            return;
        }

        console.log(`[BlogScheduler] Restoring ${scheduled.length} scheduled post(s)`);
        for (const post of scheduled) {
            const id = (post as any)._id.toString();
            scheduleBlogPost(id, (post as any).publishAt as Date);
        }
    } catch (err) {
        console.error('[BlogScheduler] Init failed:', err);
    }
}