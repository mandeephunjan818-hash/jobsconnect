// @/utils/subscribeEmail.tsx
import nodemailer from 'nodemailer';
import { BRAND, escapeHtml, renderBrandedEmailHtml } from '@/utils/emailTemplate';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jobs-connect.vercel.app';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function sendEmail({
    to,
    subject,
    html,
    text,
    unsubscribeUrl,
}: {
    to: string;
    subject: string;
    html: string;
    text: string;
    unsubscribeUrl?: string;
}): Promise<void> {
    await transporter.sendMail({
        from: process.env.SMTP_FROM || `"${BRAND.siteName}" <${BRAND.fromEmail}>`,
        to,
        subject,
        html,
        text,
        headers: unsubscribeUrl
            ? {
                'List-Unsubscribe': `<${unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            }
            : undefined,
    });
}

export async function sendSubscriberWelcomeEmail(
    email: string,
    name: string | undefined,
    unsubscribeToken: string
): Promise<void> {
    const unsubscribeUrl = `${BASE_URL}/api/subscribe/unsubscribe?token=${unsubscribeToken}`;
    const displayName = name || 'there';

    const bodyHtml = `
        <h1 style="font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 4px;">Welcome, ${escapeHtml(displayName)}!</h1>
        <p style="font-size:15px;color:${BRAND.muted};margin:0 0 24px;">You're now subscribed to ${escapeHtml(BRAND.siteName)}.</p>

        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="padding:6px 0;font-size:14px;color:#334155;">📝&nbsp;&nbsp;Latest blog posts</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#334155;">💼&nbsp;&nbsp;New job listings</td></tr>
        </table>

        <div style="text-align:center;margin:8px 0;">
            <a href="${BASE_URL}/jobs" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:40px;font-weight:600;font-size:15px;">Browse Jobs</a>
        </div>
    `;

    const html = renderBrandedEmailHtml({
        siteUrl: BASE_URL,
        preheader: `Welcome to ${BRAND.siteName} — you're now subscribed to job and blog updates.`,
        badgeLabel: 'Welcome',
        bodyHtml,
        unsubscribeUrl,
    });

    const text = `Hi ${displayName},\n\nThanks for subscribing to ${BRAND.siteName}! You'll now receive updates about new blog posts and job listings.\n\nBrowse jobs: ${BASE_URL}/jobs\n\n---\nUnsubscribe: ${unsubscribeUrl}`;

    await sendEmail({
        to: email,
        subject: `Welcome to ${BRAND.siteName}`,
        html,
        text,
        unsubscribeUrl,
    });
}

export async function sendSubscriberAdminNotificationEmail(
    email: string,
    name: string | undefined
): Promise<void> {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

    const bodyHtml = `
        <h2 style="font-size:18px;font-weight:700;color:${BRAND.dark};margin:0 0 16px;">New Newsletter Subscriber</h2>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
            <tr>
                <td style="padding:6px 0;color:${BRAND.muted};font-size:14px;width:110px;">Email</td>
                <td style="padding:6px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(email)}</td>
            </tr>
            ${name ? `<tr>
                <td style="padding:6px 0;color:${BRAND.muted};font-size:14px;">Name</td>
                <td style="padding:6px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(name)}</td>
            </tr>` : ''}
            <tr>
                <td style="padding:6px 0;color:${BRAND.muted};font-size:14px;">Subscribed at</td>
                <td style="padding:6px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${new Date().toLocaleString()}</td>
            </tr>
        </table>
    `;

    const html = renderBrandedEmailHtml({
        siteUrl: BASE_URL,
        preheader: `New subscriber: ${email}`,
        badgeLabel: 'Admin Notice',
        bodyHtml,
    });

    const text = `New subscriber\n\nEmail: ${email}\n${name ? `Name: ${name}\n` : ''}Subscribed at: ${new Date().toLocaleString()}`;

    await sendEmail({ to: ADMIN_EMAIL, subject: `New subscriber: ${email}`, html, text });
}

export async function sendBroadcastEmail(
    subscribers: Array<{ email: string; name?: string; unsubscribeToken: string }>,
    type: 'blog' | 'job',
    title: string,
    url: string
): Promise<void> {
    const typeLabel = type === 'blog' ? 'blog post' : 'job listing';
    const badge = type === 'blog' ? 'New Blog Post' : 'New Job Listing';
    const subject = `New ${typeLabel}: ${title}`;

    const BATCH_SIZE = 50;
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
        const batch = subscribers.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
            batch.map(({ email, name, unsubscribeToken }) => {
                const unsubscribeUrl = `${BASE_URL}/api/subscribe/unsubscribe?token=${unsubscribeToken}`;
                const displayName = name || 'there';

                const bodyHtml = `
                    <p style="font-size:15px;color:#334155;margin:0 0 4px;">Hi ${escapeHtml(displayName)},</p>
                    <p style="font-size:15px;color:#334155;margin:0 0 20px;">We just published a new ${typeLabel}:</p>

                    <div style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-left:4px solid ${BRAND.primary};border-radius:0 12px 12px 0;padding:20px 24px;margin:0 0 24px;">
                        <p style="font-size:17px;font-weight:700;color:${BRAND.dark};margin:0;">${escapeHtml(title)}</p>
                    </div>

                    <div style="text-align:center;">
                        <a href="${escapeHtml(url)}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:40px;font-weight:600;font-size:15px;">Read More</a>
                    </div>
                `;

                const html = renderBrandedEmailHtml({
                    siteUrl: BASE_URL,
                    preheader: `${badge}: ${title}`,
                    badgeLabel: badge,
                    bodyHtml,
                    unsubscribeUrl,
                });

                const text = `Hi ${displayName},\n\nWe just published a new ${typeLabel}:\n\n${title}\n${url}\n\n---\nUnsubscribe: ${unsubscribeUrl}`;

                return sendEmail({ to: email, subject, html, text, unsubscribeUrl });
            })
        );
    }
}