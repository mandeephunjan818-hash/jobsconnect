// @/utils/emailTemplate.tsx
import getLocalImageUrl from '@/utils/ChangeImageUrl';

export const BRAND = {
    siteName: 'Jobs Connect',
    tagline: 'Connecting Talent with Opportunity',
    primary: '#1a56db',
    dark: '#0f172a',
    bg: '#f8fafc',
    cardBg: '#ffffff',
    muted: '#64748b',
    border: '#e2e8f0',
    address: 'Surrey, BC, Canada V3W 1R1',
    supportEmail: 'support@jobs.com',
    phone: '604-332-3517',
    // Single source of truth — every sender in this codebase should use this.
    fromEmail: 'noreply@JobsConnect.com',
    logoCloudinaryUrl:
        'https://res.cloudinary.com/dqtcrb7g5/image/upload/v1782730527/site-config/logos/logo.png',
};

export function escapeHtml(text: string): string {
    return (text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

interface BrandedEmailOptions {
    siteUrl: string;
    siteName?: string;
    preheader: string;
    badgeLabel?: string;
    bodyHtml: string;
    unsubscribeUrl?: string;
}

export function renderBrandedEmailHtml({
    siteUrl,
    siteName = BRAND.siteName,
    preheader,
    badgeLabel,
    bodyHtml,
    unsubscribeUrl,
}: BrandedEmailOptions): string {
    // Canonical image util — no longer takes siteUrl as an argument,
    // it reads NEXT_PUBLIC_SITE_URL from env itself.
    const logoUrl = BRAND.logoCloudinaryUrl;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>${escapeHtml(siteName)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <tr>
            <td style="padding-bottom:24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <img src="${logoUrl}" alt="${escapeHtml(siteName)}" width="140" style="display:block;border:0;height:auto;" />
                  </td>
                  ${badgeLabel ? `
                  <td style="padding-left:10px;">
                    <span style="display:inline-block;background:#eff6ff;color:${BRAND.primary};font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;">${escapeHtml(badgeLabel)}</span>
                  </td>` : ''}
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:${BRAND.cardBg};border-radius:16px;padding:40px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
              ${bodyHtml}
            </td>
          </tr>

          <tr>
            <td style="padding:28px 12px 0;text-align:center;">
              <p style="font-size:12px;color:#94a3b8;line-height:1.8;margin:0 0 4px;">
                ${escapeHtml(siteName)} · ${escapeHtml(BRAND.address)}
              </p>
              <p style="font-size:12px;color:#94a3b8;line-height:1.8;margin:0 0 4px;">
                <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.primary};text-decoration:none;">${BRAND.supportEmail}</a>
                &nbsp;·&nbsp;
                <a href="tel:${BRAND.phone}" style="color:${BRAND.primary};text-decoration:none;">${BRAND.phone}</a>
              </p>
              ${unsubscribeUrl ? `
              <p style="font-size:12px;color:#94a3b8;margin:8px 0 0;">
                <a href="${unsubscribeUrl}" style="color:${BRAND.primary};text-decoration:none;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="${siteUrl}" style="color:${BRAND.primary};text-decoration:none;">${siteUrl.replace(/^https?:\/\//, '')}</a>
              </p>` : ''}
              <p style="font-size:11px;color:#cbd5e1;margin:14px 0 0;">
                &copy; ${new Date().getFullYear()} ${escapeHtml(siteName)}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}