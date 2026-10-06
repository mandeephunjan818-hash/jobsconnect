// src/lib/serviceScheduler.ts
import connectToDatabase from '@/lib/mongooes';
import Service from '@/modal/Service';

const timers = new Map<string, ReturnType<typeof setTimeout>>();

async function publishService(serviceId: string): Promise<void> {
    try {
        await connectToDatabase();
        const service = await Service.findById(serviceId);
        if (!service) {
            console.warn(`[ServiceScheduler] Service ${serviceId} not found — skipping`);
            return;
        }
        if (service.status !== 'scheduled') {
            console.warn(`[ServiceScheduler] Service ${serviceId} status is '${service.status}', expected 'scheduled' — skipping`);
            return;
        }

        service.status = 'published';
        service.isActive = true;
        service.publishAt = undefined;
        service.adminNotes.push({
            message: `Auto-published from scheduler at ${new Date().toISOString()}`,
            type: 'status_change',
            createdAt: new Date(),
            createdBy: 'scheduler',
        });
        await service.save();
        timers.delete(serviceId);

        console.log(`[ServiceScheduler] Service ${serviceId} published (title: ${service.title})`);
    } catch (err) {
        console.error(`[ServiceScheduler] Failed to publish service ${serviceId}:`, err);
    }
}

export function scheduleService(serviceId: string, publishAt: Date): void {
    cancelScheduledService(serviceId);

    const delay = publishAt.getTime() - Date.now();
    if (delay <= 0) {
        console.log(`[ServiceScheduler] Service ${serviceId} is past due, publishing immediately`);
        publishService(serviceId);
        return;
    }

    const MAX_DELAY_MS = 24 * 60 * 60 * 1000;
    const safeDelay = Math.min(delay, MAX_DELAY_MS);

    const handle = setTimeout(() => publishService(serviceId), safeDelay);
    timers.set(serviceId, handle);

    console.log(`[ServiceScheduler] Service ${serviceId} scheduled in ${Math.round(safeDelay / 1000)}s`);
}

export function cancelScheduledService(serviceId: string): void {
    const handle = timers.get(serviceId);
    if (handle) {
        clearTimeout(handle);
        timers.delete(serviceId);
        console.log(`[ServiceScheduler] Timer cancelled for service ${serviceId}`);
    }
}

export async function initServiceScheduler(): Promise<void> {
    try {
        await connectToDatabase();
        const scheduled = await Service.find({
            status: 'scheduled',
            publishAt: { $exists: true, $ne: null },
        }).lean();

        if (!scheduled.length) {
            console.log('[ServiceScheduler] No scheduled services on boot');
            return;
        }

        console.log(`[ServiceScheduler] Restoring ${scheduled.length} scheduled service(s)`);
        for (const service of scheduled) {
            const id = (service as any)._id.toString();
            scheduleService(id, (service as any).publishAt as Date);
        }
    } catch (err) {
        console.error('[ServiceScheduler] Init failed:', err);
    }
}