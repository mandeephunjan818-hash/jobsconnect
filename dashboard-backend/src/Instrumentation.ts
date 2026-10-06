/**
 * src/instrumentation.ts
 *
 * Next.js instrumentation hook — runs once on server startup.
 * This is the correct place to initialise the listing scheduler
 * so all scheduled drafts are restored after a server restart.
 *
 * Next.js docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Make sure `experimental.instrumentationHook = true` is set in next.config.js
 * (required for Next.js < 15; it's on by default in Next.js 15+).
 */

// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Listing scheduler
    const { initScheduler } = await import('@/lib/Listingscheduler ');
    await initScheduler();

    const { initBlogScheduler } = await import('@/lib/blogScheduler');
    await initBlogScheduler();

    const { initServiceScheduler } = await import('@/lib/serviceScheduler');
    await initServiceScheduler();

    // Change-stream listener — MUST be inside NEXT_RUNTIME === 'nodejs'
    // The Edge runtime has no mongoose, no net, no long-lived processes.
    if (process.env.ENABLE_CHANGE_STREAM === 'true') {
      const { startChangeStreamListener } = await import('./lib/change-stream');
      startChangeStreamListener();
    }
  }
}

