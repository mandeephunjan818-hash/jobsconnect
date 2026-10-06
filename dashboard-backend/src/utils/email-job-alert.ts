// @/utils/email-job-alert.ts
import nodemailer from 'nodemailer';
import sanitizeHtml from 'sanitize-html';
import { BRAND, escapeHtml, renderBrandedEmailHtml } from '@/utils/emailTemplate';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// ── Sanitize TinyMCE-authored HTML before it ever reaches an inbox ──
// Rich text from the admin editor is trusted-ish, but still user input.
// Strip anything that isn't plain content formatting — no scripts, no
// event handlers, no forms, no styles that could be used for tracking
// pixels or link spoofing.
function sanitizeOverviewHtml(html: string): string {
    return sanitizeHtml(html, {
        allowedTags: [
            'p', 'br', 'strong', 'b', 'em', 'i', 'u',
            'ul', 'ol', 'li',
            'h3', 'h4', 'h5',
            'a', 'span', 'blockquote',
        ],
        allowedAttributes: {
            a: ['href', 'title'],
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        transformTags: {
            // Force safe external links regardless of what TinyMCE saved
            a: sanitizeHtml.simpleTransform('a', {
                target: '_blank',
                rel: 'noopener noreferrer',
            }),
        },
    }).trim();
}

// ── Plain-text fallback: strip tags entirely for the text/plain part ──
function stripHtmlToText(html: string): string {
    return html
        .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// ── Email-safe rich-content styling ──
// Scoped to .lmx-email-rich-content so it doesn't leak into the rest of
// the template. No flex/grid (unsupported in Outlook desktop's Word
// rendering engine) — everything falls back to normal block flow.
const RICH_CONTENT_STYLE = `
<style>
  .lmx-email-rich-content { font-family: inherit; }
  .lmx-email-rich-content p {
    margin: 0 0 12px;
    font-size: 14px;
    line-height: 1.7;
    color: #334155;
  }
  .lmx-email-rich-content p:last-child { margin-bottom: 0; }
  .lmx-email-rich-content h3,
  .lmx-email-rich-content h4,
  .lmx-email-rich-content h5 {
    margin: 16px 0 8px;
    color: ${BRAND.dark};
    font-weight: 700;
    line-height: 1.3;
  }
  .lmx-email-rich-content h3 { font-size: 17px; }
  .lmx-email-rich-content h4 { font-size: 15px; }
  .lmx-email-rich-content h5 { font-size: 14px; }
  .lmx-email-rich-content ul,
  .lmx-email-rich-content ol {
    margin: 0 0 12px;
    padding-left: 20px;
  }
  .lmx-email-rich-content ul { list-style-type: disc; }
  .lmx-email-rich-content ol { list-style-type: decimal; }
  .lmx-email-rich-content li {
    font-size: 14px;
    line-height: 1.6;
    color: #334155;
    margin-bottom: 6px;
  }
  .lmx-email-rich-content li:last-child { margin-bottom: 0; }
  .lmx-email-rich-content strong,
  .lmx-email-rich-content b {
    color: ${BRAND.dark};
    font-weight: 400;
  }
  .lmx-email-rich-content em,
  .lmx-email-rich-content i { font-style: italic; }
  .lmx-email-rich-content a {
    color: ${BRAND.primary};
    text-decoration: underline;
  }
  .lmx-email-rich-content blockquote {
    margin: 12px 0;
    padding: 8px 16px;
    border-left: 3px solid ${BRAND.primary};
    color: #475569;
    font-style: italic;
  }
</style>`;

export async function sendNewJobNotificationEmail(
    toEmail: string,
    subscriberName: string,
    siteName: string,
    siteUrl: string,
    unsubscribeToken: string,
    listing: {
        title: string;
        overview: string;
        jobMode: string;
        jobType?: string;
        slug: string;
        location: string;
        jobPay?: number;
    },
): Promise<boolean> {
    try {
        const jobUrl = `${siteUrl}/jobs/${listing.slug}`;
        const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${unsubscribeToken}`;
        const displayName = subscriberName?.trim() || 'there';

        const safeOverviewHtml = sanitizeOverviewHtml(listing.overview);

        const payRow = listing.jobPay && listing.jobPay > 0
            ? `<tr><td style="padding:6px 0;color:${BRAND.muted};font-size:14px;width:110px;">Pay</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">$${listing.jobPay.toLocaleString('en-CA')} / yr</td></tr>`
            : '';

        const bodyHtml = `
            ${RICH_CONTENT_STYLE}
            <p style="font-size:15px;color:#334155;margin:0 0 4px;">Hi ${escapeHtml(displayName)},</p>
            <p style="font-size:15px;color:#334155;margin:0 0 20px;">A new job listing just went live on <strong>${escapeHtml(siteName)}</strong> that matches your subscription.</p>

            <div style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-left:4px solid ${BRAND.primary};border-radius:0 12px 12px 0;padding:20px 24px;margin:0 0 20px;">
                <p style="font-size:18px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">${escapeHtml(listing.title)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                    <tr><td style="padding:6px 0;color:${BRAND.muted};font-size:14px;width:110px;">Location</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(listing.location)}</td></tr>
                    <tr><td style="padding:6px 0;color:${BRAND.muted};font-size:14px;">Job type</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(listing.jobType || 'Full-time')}</td></tr>
                    <tr><td style="padding:6px 0;color:${BRAND.muted};font-size:14px;">Work mode</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(listing.jobMode)}</td></tr>
                    ${payRow}
                </table>
            </div>

            <p style="font-size:13px;font-weight:600;color:${BRAND.muted};text-transform:uppercase;letter-spacing:0.4px;margin:0 0 8px;">About this role</p>
            <div class="lmx-email-rich-content" style="background:${BRAND.bg};border-radius:10px;padding:14px 18px;margin:0 0 20px;">${safeOverviewHtml}</div>

            <div style="text-align:center;margin:8px 0;">
                <a href="${jobUrl}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:40px;font-weight:600;font-size:15px;">View Full Job Posting</a>
            </div>
        `;

        const html = renderBrandedEmailHtml({
            siteUrl,
            siteName,
            preheader: `New job alert on ${siteName}: ${listing.title}`,
            badgeLabel: 'Job Alert',
            bodyHtml,
            unsubscribeUrl,
        });

        const text = `
Hi ${displayName},

A new job just went live on ${siteName}!

${listing.title}
Location: ${listing.location}
Type:     ${listing.jobType || 'Full-time'}
Mode:     ${listing.jobMode}
${listing.jobPay ? `Pay:      $${listing.jobPay.toLocaleString('en-CA')} / yr\n` : ''}
${stripHtmlToText(safeOverviewHtml)}

View the full posting: ${jobUrl}

---
Unsubscribe: ${unsubscribeUrl}
      `.trim();

        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || `"${siteName}" <${BRAND.fromEmail}>`,
            to: toEmail,
            subject: `New job alert: ${listing.title} – ${siteName}`,
            html,
            text,
            headers: {
                'List-Unsubscribe': `<${unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
        });
        console.log(`[job-alert] Email sent to ${toEmail} for listing "${listing.title}". ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[job-alert] Failed to send to ${toEmail}:`, error);
        return false;
    }
}