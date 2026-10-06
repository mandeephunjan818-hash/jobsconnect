import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectToDatabase from '@/lib/mongooes';
import JobApplication from '@/modal/JobApplication';
import Subscriber from '@/modal/Subscriber';
import Listing from '@/modal/Listing';
import ListingDraft from '@/modal/Listingdraft';
import { KNOWN_SITES } from '@/lib/sites';
import {
    sendJobApplicationConfirmationEmail,
    sendJobApplicationNotificationEmail,
} from '@/utils/email';
import { incrementUsage } from '@/lib/subscription-usage';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const formData = await req.formData();
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const siteId = formData.get('siteId') as string;
        const jobId = (formData.get('jobId') as string) || undefined;
        const applyEmail = formData.get('applyEmail') as string;
        const resume = formData.get('resume') as File | null;
        const jobTitle = (formData.get('jobTitle') as string) || '';
        const consent = formData.get('consent') === 'true';

        // ── Validation ────────────────────────────────────────────
        if (!name || !email || !siteId) {
            return NextResponse.json(
                { error: 'Name, email, and siteId are required' },
                { status: 400 }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email address' },
                { status: 400 }
            );
        }

        if (!KNOWN_SITES.includes(siteId as any)) {
            return NextResponse.json(
                { error: 'Invalid siteId' },
                { status: 400 }
            );
        }

        const cleanEmail = email.toLowerCase().trim();

        // ── Save application only with consent ────────────────────
        if (consent) {
            const application = new JobApplication({
                name: name.trim(),
                email: cleanEmail,
                siteId,
                jobId,
            });
            await application.save();

            // ── Subscribe the applicant to the newsletter ─────────
            const existingSub = await Subscriber.findOne({
                email: cleanEmail,
                siteId,
            });

            if (existingSub) {
                if (existingSub.status !== 'active') {
                    existingSub.status = 'active';
                    existingSub.name = name.trim();
                    existingSub.preferences = {
                        blogs: true,
                        jobs: true,
                    };
                    existingSub.subscribedAt = new Date();
                    existingSub.unsubscribedAt = undefined;
                    await existingSub.save();
                }
            } else {
                const unsubscribeToken = crypto.randomBytes(32).toString('hex');
                const subscriber = new Subscriber({
                    email: cleanEmail,
                    name: name.trim(),
                    siteId,
                    preferences: {
                        blogs: true,
                        jobs: true,
                    },
                    unsubscribeToken,
                });
                await subscriber.save();
            }

            // ── Track usage for the listing owner ─────────────────
            if (jobId) {
                try {
                    // Find the listing that received this application
                    const listing =
                        (await Listing.findOne({ jobId }).lean()) ||
                        (await ListingDraft.findOne({ jobId }).lean());

                    if (listing && listing.submittedBy) {
                        // Fire-and-forget: don't delay the response
                        incrementUsage(
                            listing.submittedBy.toString(),
                            'applicant',
                            1,
                            {
                                applicationId: application._id.toString(),
                                jobId,
                                siteId,
                            }
                        ).catch((err) =>
                            console.error('[job-apply] usage tracking error:', err)
                        );
                    }
                } catch (err) {
                    // Never fail the application because of tracking
                    console.error('[job-apply] usage lookup failed:', err);
                }
            }
        }

        // ── Send job‑related emails (always, if resume present) ────
        const emailTasks = [];

        if (email && resume) {
            emailTasks.push(
                sendJobApplicationConfirmationEmail(email, name.trim(), jobTitle, resume)
            );
        }

        if (applyEmail && resume) {
            emailTasks.push(
                sendJobApplicationNotificationEmail(
                    applyEmail,
                    name.trim(),
                    cleanEmail,
                    jobTitle,
                    resume
                )
            );
        }

        if (emailTasks.length > 0) {
            const results = await Promise.allSettled(emailTasks);

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    console.log(
                        `[job-apply] Email ${index + 1} sent successfully`
                    );
                } else {
                    console.error(
                        `[job-apply] Email ${index + 1} failed:`,
                        result.reason
                    );
                }
            });
        }

        return NextResponse.json(
            { success: true, message: 'Application submitted successfully!' },
            { status: 201 }
        );
    } catch (err) {
        console.error('[POST /api/job-apply]', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}