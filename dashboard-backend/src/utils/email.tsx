// @/utils/email.tsx

import nodemailer from 'nodemailer';
import crypto from 'crypto';
import Agreement from '@/modal/Agreement';
import { revalidatePath } from 'next/cache';
import { BRAND, escapeHtml, renderBrandedEmailHtml } from '@/utils/emailTemplate';

function generateAcceptanceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || `"${BRAND.siteName}" <${BRAND.fromEmail}>`;
const SITE_URL = process.env.NEXTAUTH_URL || 'https://jobs-connect.vercel.app';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || BRAND.supportEmail;

transporter.verify((error) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server ready to send emails');
  }
});

// Shared "primary button" markup used across all templates below
function button(url: string, label: string): string {
  return `
    <div style="text-align:center;margin:20px 0;">
      <a href="${url}" style="display:inline-block;background:${BRAND.primary};color:#ffffff !important;text-decoration:none;padding:13px 30px;border-radius:40px;font-weight:600;font-size:15px;">${escapeHtml(label)}</a>
    </div>`;
}

// ── 1. EMAIL VERIFICATION ──────────────────────────────────────────────
export async function sendVerificationEmail(
  email: string,
  token: string,
  name: string
): Promise<boolean> {
  try {
    const verificationUrl = `${SITE_URL}/api/auth/verify-email?token=${token}`;
    const expiryHours = 24;

    const bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Welcome, ${escapeHtml(name)}</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">Thanks for signing up. Please verify your email address to activate your account.</p>
      ${button(verificationUrl, 'Verify email address')}
      <p style="font-size:13px;color:${BRAND.muted};margin:16px 0 6px;">Or copy and paste this link into your browser:</p>
      <div style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:8px;padding:12px 16px;word-break:break-all;font-size:13px;color:${BRAND.muted};font-family:ui-monospace,monospace;">${verificationUrl}</div>
      <p style="font-size:13px;color:${BRAND.muted};margin:16px 0 0;">This link will expire in ${expiryHours} hours. If you did not create an account, you can safely ignore this email.</p>
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `Hi ${name}, please verify your email to activate your Jobs Connect account.`,
      badgeLabel: 'Verify Email',
      bodyHtml,
    });

    const text = `Welcome to Jobs Connect, ${name}!\n\nPlease verify your email address by clicking this link:\n${verificationUrl}\n\nThis link expires in ${expiryHours} hours.\n\nIf you did not create an account, you can safely ignore this email.\n\nJobs Connect\n${SITE_URL}`;

    const info = await transporter.sendMail({
      from: FROM,
      to: email,
      subject: 'Please verify your email address',
      text,
      html,
      headers: { 'X-Priority': '3', 'X-Mailer': 'JobsConnect-Email-Service' },
    });
    console.log(`Verification email sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

// ── 2. PASSWORD RESET ──────────────────────────────────────────────────
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  name: string
): Promise<boolean> {
  try {
    const resetUrl = `${SITE_URL}/auth/reset-password?token=${token}`;
    const expiryMinutes = 30;

    const bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Password reset request</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 4px;">Hi ${escapeHtml(name)},</p>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">We received a request to reset your password. Click the button below to create a new password.</p>
      ${button(resetUrl, 'Reset password')}
      <p style="font-size:13px;color:${BRAND.muted};margin:16px 0 6px;">Or copy and paste this link:</p>
      <div style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:8px;padding:12px 16px;word-break:break-all;font-size:13px;color:${BRAND.muted};font-family:ui-monospace,monospace;">${resetUrl}</div>
      <p style="font-size:13px;color:${BRAND.muted};margin:16px 0 0;">This link will expire in ${expiryMinutes} minutes. If you did not request this, you can safely ignore this email.</p>
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `Hi ${name}, we received a request to reset your Jobs Connect password.`,
      badgeLabel: 'Password Reset',
      bodyHtml,
    });

    const text = `Hi ${name},\n\nWe received a request to reset your password.\n\nReset your password:\n${resetUrl}\n\nThis link expires in ${expiryMinutes} minutes.\n\nIf you did not request this, you can safely ignore this email.\n\nJobs Connect\n${SITE_URL}`;

    const info = await transporter.sendMail({
      from: FROM,
      to: email,
      subject: 'Password reset request',
      text,
      html,
      headers: { 'X-Priority': '3', 'X-Mailer': 'JobsConnect-Email-Service' },
    });
    console.log(`Password reset email sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

// ── 3. MFA BACKUP CODES ────────────────────────────────────────────────
export async function sendMFABackupCodesEmail(
  email: string,
  name: string
): Promise<boolean> {
  try {
    const bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Two-factor authentication enabled</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 4px;">Hi ${escapeHtml(name)},</p>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">You have enabled two-factor authentication on your account. This adds an extra layer of security to your sign-in process.</p>
      <div style="background:${BRAND.bg};border-left:4px solid ${BRAND.primary};border-radius:0 10px 10px 0;padding:14px 18px;margin:0 0 16px;">
        <p style="font-size:14px;color:#334155;margin:0;"><strong>Important:</strong> Save your backup codes in a safe place. If you lose access to your authenticator app, you will need these backup codes to sign in.</p>
      </div>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">You can view your backup codes in your account settings at any time.</p>
      <p style="font-size:13px;color:${BRAND.muted};margin:0;">If you did not enable two-factor authentication, please contact support immediately.</p>
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `Hi ${name}, two-factor authentication has been enabled on your Jobs Connect account.`,
      badgeLabel: 'Security',
      bodyHtml,
    });

    const text = `Hi ${name},\n\nTwo-factor authentication has been enabled on your account.\n\nImportant: Save your backup codes in a safe place. If you lose access to your authenticator app, you will need these to sign in.\n\nView your backup codes in your account settings.\n\nIf you did not enable this, please contact support immediately.\n\nJobs Connect\n${SITE_URL}`;

    const info = await transporter.sendMail({
      from: FROM,
      to: email,
      subject: 'Two-factor authentication has been enabled',
      text,
      html,
      headers: { 'X-Priority': '3', 'X-Mailer': 'JobsConnect-Email-Service' },
    });
    console.log(`MFA notification sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send MFA notification:', error);
    return false;
  }
}

// ── 4. SELLER: BUSINESS REGISTRATION CONFIRMATION ───────────────────────
export async function sendSellerConfirmationEmail(
  email: string,
  businessName: string,
  sellerName: string
): Promise<boolean> {
  try {
    const dashboardUrl = `${SITE_URL}/dashboard/seller`;

    const bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Thank you, ${escapeHtml(sellerName)}!</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">We have successfully received your business registration for <strong>${escapeHtml(businessName)}</strong>. Our team is now reviewing the information you provided.</p>
      <div style="background:${BRAND.bg};border-left:4px solid ${BRAND.primary};border-radius:0 10px 10px 0;padding:16px 20px;margin:0 0 20px;">
        <p style="font-size:14px;font-weight:600;color:${BRAND.dark};margin:0 0 8px;">📄 Next Steps:</p>
        <p style="font-size:14px;color:#334155;margin:0;">• We will verify your details within 1–2 business days.<br>• You will receive a Non-Disclosure Agreement (NDA) via email for you to sign.<br>• Once the NDA is signed, we will begin matching your business with qualified buyers.</p>
      </div>
      <p style="font-size:14px;color:#334155;margin:0 0 8px;">If you have any questions or need to update your submission, contact our support team at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.primary};">${SUPPORT_EMAIL}</a>.</p>
      ${button(dashboardUrl, 'Go to your dashboard')}
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `Thanks, ${sellerName} — we've received your registration for ${businessName}.`,
      badgeLabel: 'Registration Received',
      bodyHtml,
    });

    const text = `Thank you, ${sellerName}!\n\nWe have received your registration for ${businessName}. Our team is reviewing your information.\n\nNext steps:\n- Verification within 1-2 business days.\n- You will receive an NDA to sign.\n- After signing, we will match you with buyers.\n\nIf you have questions, contact ${SUPPORT_EMAIL}\n\nJobs Connect`;

    const info = await transporter.sendMail({ from: FROM, to: email, subject: `Thank you for registering ${businessName} with Jobs Connect`, html, text });
    console.log(`Seller confirmation email sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send seller confirmation email:', error);
    return false;
  }
}

// ── 5. SELLER AGREEMENT (NDA) ────────────────────────────────────────────
export async function sendAgreementToClient(
  toEmail: string,
  agreementTitle: string,
  agreementContent: string,
  clientName: string,
  businessName: string,
  agreementId: string
): Promise<boolean> {
  try {
    const token = generateAcceptanceToken();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);

    await Agreement.findByIdAndUpdate(agreementId, { acceptanceToken: token, tokenExpiry });
    revalidatePath(`/dashboard/nda-seller-info/agree/${token}`);

    const acceptanceUrl = `${SITE_URL}/dashboard/nda-seller-info/agree/${token}`;

    const bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Review and sign your agreement</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 4px;">Dear ${escapeHtml(clientName)},</p>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">You have received a new agreement from Jobs Connect regarding your business <strong>${escapeHtml(businessName)}</strong>.</p>
      <p style="font-size:14px;color:${BRAND.muted};margin:0 0 8px;"><strong style="color:${BRAND.dark};">Agreement:</strong> ${escapeHtml(agreementTitle)}</p>
      <div style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:12px;padding:20px;margin:0 0 20px;max-height:400px;overflow-y:auto;font-size:14px;color:#334155;">
        ${agreementContent}
      </div>
      <p style="font-size:14px;color:#334155;margin:0 0 8px;">Please read the full agreement above. If you agree to the terms, click below to sign electronically.</p>
      ${button(acceptanceUrl, 'I Agree & Sign')}
      <p style="font-size:13px;color:${BRAND.muted};text-align:center;margin:0 0 16px;">⚠️ This link expires in <strong>24 hours</strong>.</p>
      <p style="font-size:14px;color:#334155;margin:0;">Questions? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.primary};">${SUPPORT_EMAIL}</a>.</p>
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `Action required — please sign ${agreementTitle}.`,
      badgeLabel: 'Action Required',
      bodyHtml,
    });

    const text = `Dear ${clientName},\n\nYou have received a new agreement from Jobs Connect regarding your business "${businessName}".\n\nAgreement: ${agreementTitle}\n\n---- BEGIN AGREEMENT ----\n${agreementContent.replace(/<[^>]*>/g, '')}\n---- END AGREEMENT ----\n\nTo sign this agreement, open the following link (valid for 24 hours):\n${acceptanceUrl}\n\nIf you have questions, contact ${SUPPORT_EMAIL}.\n\nJobs Connect`;

    const info = await transporter.sendMail({ from: FROM, to: toEmail, subject: `Action required: Please sign ${agreementTitle}`, html, text });
    console.log(`Agreement sent to ${toEmail}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send agreement email:', error);
    return false;
  }
}

// ── 6. BUYER AGREEMENT (NDA) ──────────────────────────────────────────────
export async function sendBuyerAgreementToClient(
  toEmail: string,
  agreementTitle: string,
  agreementContent: string,
  clientName: string,
  agreementId: string
): Promise<boolean> {
  try {
    const token = generateAcceptanceToken();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);

    await Agreement.findByIdAndUpdate(agreementId, { acceptanceToken: token, tokenExpiry });
    revalidatePath(`/dashboard/nda-buyer-info/agree/${token}`);

    const acceptanceUrl = `${SITE_URL}/dashboard/nda-buyer-info/agree/${token}`;

    const bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Review and sign your agreement</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 4px;">Dear ${escapeHtml(clientName)},</p>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">You have received a new agreement from Jobs Connect. To access and use all features of the platform, you must review and sign this agreement.</p>
      <p style="font-size:14px;color:${BRAND.muted};margin:0 0 8px;"><strong style="color:${BRAND.dark};">Agreement:</strong> ${escapeHtml(agreementTitle)}</p>
      <div style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:12px;padding:20px;margin:0 0 20px;max-height:400px;overflow-y:auto;font-size:14px;color:#334155;">
        ${agreementContent}
      </div>
      <p style="font-size:14px;color:#334155;margin:0 0 8px;">Please read the full agreement above. If you agree to the terms, click below to sign electronically.</p>
      ${button(acceptanceUrl, 'I Agree & Sign')}
      <p style="font-size:13px;color:${BRAND.muted};text-align:center;margin:0 0 16px;">⚠️ This link expires in <strong>24 hours</strong>.</p>
      <p style="font-size:14px;color:#334155;margin:0;">Questions? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.primary};">${SUPPORT_EMAIL}</a>.</p>
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `Action required — please sign ${agreementTitle}.`,
      badgeLabel: 'Action Required',
      bodyHtml,
    });

    const text = `Dear ${clientName},\n\nYou have received a new agreement from Jobs Connect. To access and use all features of the platform, you must review and sign this agreement.\n\nAgreement: ${agreementTitle}\n\n---- BEGIN AGREEMENT ----\n${agreementContent.replace(/<[^>]*>/g, '')}\n---- END AGREEMENT ----\n\nTo sign this agreement, open the following link (valid for 24 hours):\n${acceptanceUrl}\n\nIf you have questions, contact ${SUPPORT_EMAIL}.\n\nJobs Connect`;

    const info = await transporter.sendMail({ from: FROM, to: toEmail, subject: `Action required: Please sign ${agreementTitle}`, html, text });
    console.log(`Buyer agreement sent to ${toEmail}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send buyer agreement email:', error);
    return false;
  }
}

// ── 7. SELLER UPDATE REQUEST CONFIRMATION ─────────────────────────────────
export async function sendUpdateRequestEmail(
  email: string,
  businessName: string,
  userName: string
): Promise<boolean> {
  try {
    const dashboardUrl = `${SITE_URL}/dashboard/seller`;

    const bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Update request submitted</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 4px;">Dear ${escapeHtml(userName)},</p>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">We have received your request to update the registration for <strong>${escapeHtml(businessName)}</strong>.</p>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">Our team will review the changes and notify you once the update is approved or if we need further information. You can track the status of your request from your dashboard.</p>
      ${button(dashboardUrl, 'Go to Dashboard')}
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `We've received your update request for ${businessName}.`,
      badgeLabel: 'Update Received',
      bodyHtml,
    });

    const text = `Dear ${userName},\n\nWe have received your request to update the registration for "${businessName}".\n\nOur team will review the changes and notify you once the update is approved or if we need further information.\n\nTrack status: ${dashboardUrl}\n\nJobs Connect`;

    const info = await transporter.sendMail({ from: FROM, to: email, subject: `Update request received for ${businessName}`, html, text });
    console.log(`Update request email sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send update request email:', error);
    return false;
  }
}

// ── 8. BUYER UPDATE REQUEST CONFIRMATION ──────────────────────────────────
export async function sendBuyerUpdateRequestEmail(
  email: string,
  userName: string
): Promise<boolean> {
  try {
    const dashboardUrl = `${SITE_URL}/dashboard/buyer`;

    const bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Update request submitted</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 4px;">Dear ${escapeHtml(userName)},</p>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">We have received your request to update your buyer account information.</p>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">Our team will review the changes and notify you once the update is approved or if we need further information.</p>
      ${button(dashboardUrl, 'Go to Dashboard')}
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `We've received your buyer account update request.`,
      badgeLabel: 'Update Received',
      bodyHtml,
    });

    const text = `Dear ${userName},\n\nWe have received your request to update your buyer account information.\n\nOur team will review the changes and notify you once the update is approved or if we need further information.\n\nTrack status: ${dashboardUrl}\n\nJobs Connect`;

    const info = await transporter.sendMail({ from: FROM, to: email, subject: 'Update request received', html, text });
    console.log(`Buyer update request email sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send buyer update request email:', error);
    return false;
  }
}

// ── 9. BUYER: ENQUIRY CONFIRMATION ────────────────────────────────────────
export async function sendBuyerConfirmationEmail(
  email: string,
  buyerName: string,
  listingTitle: string
): Promise<boolean> {
  try {
    const bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Thank you, ${escapeHtml(buyerName)}!</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">We have received your enquiry about <strong>${escapeHtml(listingTitle)}</strong>.</p>
      <div style="background:${BRAND.bg};border-left:4px solid ${BRAND.primary};border-radius:0 10px 10px 0;padding:16px 20px;margin:0 0 20px;">
        <p style="font-size:14px;font-weight:600;color:${BRAND.dark};margin:0 0 8px;">📋 What happens next:</p>
        <p style="font-size:14px;color:#334155;margin:0;">• Our team will review your enquiry within 1–2 business days.<br>• If approved, you will receive a Non-Disclosure Agreement (NDA) via email to sign.<br>• Once the NDA is signed, you will be connected with the seller.</p>
      </div>
      <p style="font-size:14px;color:#334155;margin:0;">Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.primary};">${SUPPORT_EMAIL}</a>.</p>
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `We've received your enquiry about "${listingTitle}".`,
      badgeLabel: 'Enquiry Received',
      bodyHtml,
    });

    const text = `Thank you, ${buyerName}!\n\nWe received your enquiry about "${listingTitle}".\n\nWhat happens next:\n- Our team will review within 1–2 business days.\n- You will receive an NDA to sign if approved.\n- Once signed, you will be connected with the seller.\n\nQuestions? Contact ${SUPPORT_EMAIL}\n\nJobs Connect`;

    const info = await transporter.sendMail({ from: FROM, to: email, subject: `We received your enquiry about "${listingTitle}"`, html, text });
    console.log(`Buyer confirmation email sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send buyer confirmation email:', error);
    return false;
  }
}

// ── 10. ADMIN: NEW BUYER ENQUIRY ──────────────────────────────────────────
export async function sendAdminNotificationEmail(
  buyerName: string,
  buyerEmail: string,
  listingId: string,
  listingTitle: string,
  inquiryId: string
): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) {
    console.warn('ADMIN_EMAIL not set – skipping admin notification');
    return false;
  }

  try {
    const adminUrl = `${SITE_URL}/admin/contact-inquiries/${inquiryId}`;

    const bodyHtml = `
      <h2 style="font-size:18px;font-weight:700;color:${BRAND.dark};margin:0 0 16px;">New buyer enquiry</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;">
        <tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;width:120px;">Buyer</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(buyerName)}</td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Email</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(buyerEmail)}</td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Listing</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(listingTitle)}</td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Listing ID</td><td style="padding:8px 0;font-size:13px;font-family:monospace;color:${BRAND.dark};">${escapeHtml(listingId)}</td></tr>
      </table>
      ${button(adminUrl, 'Review Enquiry')}
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `New buyer enquiry: ${listingTitle}`,
      badgeLabel: 'Admin Alert',
      bodyHtml,
    });

    const text = `New buyer enquiry received.\n\nBuyer: ${buyerName}\nEmail: ${buyerEmail}\nListing: ${listingTitle}\nListing ID: ${listingId}\n\nReview: ${adminUrl}\n\nJobs Connect Admin`;

    const info = await transporter.sendMail({ from: FROM, to: adminEmail, subject: `New buyer enquiry: ${listingTitle}`, html, text });
    console.log(`Admin notification sent to ${adminEmail}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send admin notification email:', error);
    return false;
  }
}

// ── 11. PIPELINE PROFILE: USER CONFIRMATION ───────────────────────────────
export async function sendPipelineCreationUserEmail(
  email: string,
  firstName: string,
  lastName: string,
  title: string
): Promise<boolean> {
  try {
    const fullName = `${firstName} ${lastName}`;
    const dashboardUrl = `${SITE_URL}/dashboard`;

    const bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Pipeline profile created</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 4px;">Dear ${escapeHtml(fullName)},</p>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">Your pipeline profile for the role of <strong>${escapeHtml(title)}</strong> has been successfully created. You can now view and manage your profile from your dashboard.</p>
      ${button(dashboardUrl, 'Go to Dashboard')}
      <p style="font-size:14px;color:#334155;margin:16px 0 0;">Questions? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.primary};">${SUPPORT_EMAIL}</a>.</p>
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `Your pipeline profile for "${title}" has been created.`,
      badgeLabel: 'Profile Created',
      bodyHtml,
    });

    const text = `Dear ${fullName},\n\nYour pipeline profile for the role of "${title}" has been successfully created.\n\nManage your profile: ${dashboardUrl}\n\nQuestions? Contact ${SUPPORT_EMAIL}\n\nJobs Connect`;

    const info = await transporter.sendMail({ from: FROM, to: email, subject: 'Your Pipeline Profile Has Been Created', html, text });
    console.log(`Pipeline creation user email sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send pipeline creation user email:', error);
    return false;
  }
}

// ── 12. PIPELINE PROFILE: ADMIN NOTIFICATION ──────────────────────────────
export async function sendPipelineCreationAdminEmail(
  userName: string,
  userEmail: string,
  title: string,
  profileId: string
): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) {
    console.warn('ADMIN_EMAIL not set – skipping admin pipeline notification');
    return false;
  }

  try {
    const adminUrl = `${SITE_URL}/admin/pipeline/${profileId}`;

    const bodyHtml = `
      <h2 style="font-size:18px;font-weight:700;color:${BRAND.dark};margin:0 0 16px;">New pipeline profile created</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;">
        <tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;width:120px;">User</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(userName)}</td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Email</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(userEmail)}</td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Title</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(title)}</td></tr>
      </table>
      ${button(adminUrl, 'View Profile')}
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `New pipeline profile: ${userName} – ${title}`,
      badgeLabel: 'Admin Alert',
      bodyHtml,
    });

    const text = `New pipeline profile created.\n\nUser: ${userName}\nEmail: ${userEmail}\nTitle: ${title}\nProfile ID: ${profileId}\n\nView: ${adminUrl}\n\nJobs Connect Admin`;

    const info = await transporter.sendMail({ from: FROM, to: adminEmail, subject: `New Pipeline Profile: ${userName} - ${title}`, html, text });
    console.log(`Pipeline creation admin email sent to ${adminEmail}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send pipeline creation admin email:', error);
    return false;
  }
}

// ── 13. CONTACT: ADMIN REPLY TO USER ──────────────────────────────────────
export async function sendContactReplyEmail(
  email: string,
  userName: string,
  replyMessage: string
): Promise<boolean> {
  try {
    const bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Response to your inquiry</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">Dear ${escapeHtml(userName)}, thank you for contacting Jobs Connect. We have reviewed your message and here is our response:</p>
      <div style="background:${BRAND.bg};border-left:4px solid ${BRAND.primary};border-radius:0 10px 10px 0;padding:16px 20px;margin:0 0 20px;font-size:14px;color:#334155;">
        ${replyMessage}
      </div>
      <p style="font-size:14px;color:#334155;margin:0;">Further questions? Reply to this email or contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.primary};">${SUPPORT_EMAIL}</a>.</p>
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `We've replied to your inquiry.`,
      badgeLabel: 'Support Reply',
      bodyHtml,
    });

    const text = `Dear ${userName},\n\nThank you for contacting Jobs Connect. Here is our response:\n\n${replyMessage.replace(/<[^>]*>/g, '')}\n\nFurther questions? Contact ${SUPPORT_EMAIL}\n\nJobs Connect`;

    const info = await transporter.sendMail({ from: FROM, to: email, subject: 'Reply to your inquiry from Jobs Connect', html, text });
    console.log(`Contact reply email sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send contact reply email:', error);
    return false;
  }
}

// ── 14. CONTACT FORM: VISITOR CONFIRMATION ────────────────────────────────
export async function sendContactUserConfirmationEmail(
  email: string,
  name: string,
  subject: string,
): Promise<boolean> {
  try {
    const bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Thanks for reaching out, ${escapeHtml(name)}!</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">We have received your message and our team will get back to you as soon as possible — typically within <strong>1 business day</strong>.</p>
      <div style="background:${BRAND.bg};border-left:4px solid ${BRAND.primary};border-radius:0 10px 10px 0;padding:14px 18px;margin:0 0 20px;">
        <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.muted};margin:0 0 4px;">Your topic</p>
        <p style="font-size:14px;font-weight:600;color:${BRAND.dark};margin:0;">${escapeHtml(subject)}</p>
      </div>
      <div style="background:${BRAND.cardBg};border:1px solid ${BRAND.border};border-radius:12px;padding:18px 20px;margin:0 0 20px;">
        <p style="font-size:14px;font-weight:600;color:${BRAND.dark};margin:0 0 6px;">📋 What happens next:</p>
        <p style="font-size:14px;color:#334155;margin:0;">• A member of our team will review your message.<br>• We will reply to <strong>${escapeHtml(email)}</strong> within 1 business day.<br>• For urgent matters, reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.primary};">${SUPPORT_EMAIL}</a>.</p>
      </div>
      <p style="font-size:14px;color:#334155;margin:0 0 8px;">While you wait, feel free to browse the latest job listings on our platform.</p>
      ${button(`${SITE_URL}/jobs`, 'Browse Jobs')}
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `We received your message about "${subject}".`,
      badgeLabel: 'Message Received',
      bodyHtml,
    });

    const text = `Hi ${name},\n\nThanks for contacting Jobs Connect!\n\nWe received your message about "${subject}" and will reply to ${email} within 1 business day.\n\nBrowse the latest job listings: ${SITE_URL}/jobs\n\nQuestions? ${SUPPORT_EMAIL}\n\nJobs Connect`;

    const info = await transporter.sendMail({ from: FROM, to: email, subject: `We received your message – ${BRAND.siteName}`, html, text });
    console.log(`[contact] User confirmation sent to ${email}. ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[contact] Failed to send user confirmation email:', error);
    return false;
  }
}

// ── 15. CONTACT FORM: ADMIN NOTIFICATION ──────────────────────────────────
export async function sendContactAdminNotificationEmail(
  senderName: string,
  senderEmail: string,
  senderPhone: string,
  subject: string,
  message: string,
  messageId: string,
): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) {
    console.warn('[contact] ADMIN_EMAIL not set – skipping admin notification');
    return false;
  }

  try {
    const adminUrl = `${SITE_URL}/admin/siteComponents/contact`;

    const bodyHtml = `
      <h2 style="font-size:18px;font-weight:700;color:${BRAND.dark};margin:0 0 16px;">New contact message received</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;">
        <tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;width:120px;">Name</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(senderName)}</td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Email</td><td style="padding:8px 0;font-size:14px;"><a href="mailto:${escapeHtml(senderEmail)}" style="color:${BRAND.primary};">${escapeHtml(senderEmail)}</a></td></tr>
        ${senderPhone ? `<tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Phone</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(senderPhone)}</td></tr>` : ''}
        <tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Subject</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(subject)}</td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Received</td><td style="padding:8px 0;font-size:14px;color:${BRAND.dark};">${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' })} ET</td></tr>
      </table>
      <p style="font-size:12px;font-weight:600;color:${BRAND.muted};text-transform:uppercase;letter-spacing:0.4px;margin:0 0 8px;">Message</p>
      <div style="background:${BRAND.bg};border-left:4px solid ${BRAND.primary};border-radius:0 10px 10px 0;padding:16px 20px;font-size:14px;color:#334155;white-space:pre-wrap;word-break:break-word;margin:0 0 24px;">${escapeHtml(message)}</div>
      ${button(adminUrl, 'Open in Admin Panel')}
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `New contact message: ${subject}`,
      badgeLabel: 'Admin Alert',
      bodyHtml,
    });

    const text = `New contact message received on Jobs Connect.\n\nName: ${senderName}\nEmail: ${senderEmail}\n${senderPhone ? `Phone: ${senderPhone}\n` : ''}Subject: ${subject}\nID: ${messageId}\nTime: ${new Date().toISOString()}\n\n---- MESSAGE ----\n${message}\n-----------------\n\nReview: ${adminUrl}\n\nJobs Connect`;

    const info = await transporter.sendMail({ from: FROM, to: adminEmail, subject: `New contact message: ${subject}`, html, text });
    console.log(`[contact] Admin notification sent to ${adminEmail}. ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[contact] Failed to send admin notification email:', error);
    return false;
  }
}

// ── 16. BLOG: NEW POST NOTIFICATION ───────────────────────────────────────
export async function sendNewBlogNotificationEmail(
  toEmail: string,
  subscriberName: string,
  siteName: string,
  siteUrl: string,
  unsubscribeToken: string,
  post: { title: string; excerpt: string; slug: string; category: string; imageUrl?: string },
): Promise<boolean> {
  try {
    const postUrl = `${siteUrl}/blog/${post.slug}`;
    const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${unsubscribeToken}`;
    const displayName = subscriberName?.trim() || 'there';

    const imageBlock = post.imageUrl
      ? `<img src="${escapeHtml(post.imageUrl)}" alt="${escapeHtml(post.title)}" style="width:100%;max-width:520px;border-radius:10px;display:block;margin:0 0 20px;" />`
      : '';

    const bodyHtml = `
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">Hi ${escapeHtml(displayName)}, a new article is live on <strong>${escapeHtml(siteName)}</strong>!</p>
      ${imageBlock}
      <div style="display:inline-block;background:${BRAND.bg};color:#475569;font-size:12px;font-weight:600;padding:3px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.4px;margin:0 0 12px;">${escapeHtml(post.category)}</div>
      <p style="font-size:20px;font-weight:700;color:${BRAND.dark};margin:0 0 14px;line-height:1.3;">${escapeHtml(post.title)}</p>
      <div style="background:${BRAND.bg};border-left:4px solid ${BRAND.primary};border-radius:0 10px 10px 0;padding:14px 18px;font-size:15px;color:#334155;line-height:1.7;margin:0 0 20px;">${escapeHtml(post.excerpt)}</div>
      ${button(postUrl, 'Read Full Article')}
    `;

    const html = renderBrandedEmailHtml({
      siteUrl,
      siteName,
      preheader: `New article on ${siteName}: ${post.title}`,
      badgeLabel: 'Blog Alert',
      bodyHtml,
      unsubscribeUrl,
    });

    const text = `Hi ${displayName},\n\nA new article is live on ${siteName}!\n\n[${post.category}] ${post.title}\n\n${post.excerpt}\n\nRead the full article: ${postUrl}\n\n---\nUnsubscribe: ${unsubscribeUrl}`;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${siteName}" <${BRAND.fromEmail}>`,
      to: toEmail,
      subject: `New article: ${post.title} – ${siteName}`,
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    console.log(`[blog-alert] Email sent to ${toEmail} for post "${post.title}". ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[blog-alert] Failed to send to ${toEmail}:`, error);
    return false;
  }
}

// ── 17. JOB APPLICATION: CANDIDATE CONFIRMATION (CV attached) ────────────
export async function sendJobApplicationConfirmationEmail(
  toEmail: string,
  candidateName: string,
  jobTitle: string,
  resumeFile: File
): Promise<boolean> {
  try {
    const arrayBuffer = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Thank you for applying${jobTitle ? ` for <em>${escapeHtml(jobTitle)}</em>` : ''}</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 4px;">Dear ${escapeHtml(candidateName)},</p>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">We have received your application. Your CV is attached to this email for your records.</p>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">If your profile matches the position, a representative will contact you using the email you provided.</p>
      <p style="font-size:14px;color:#334155;margin:0;">Questions? Reach out to <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.primary};">${SUPPORT_EMAIL}</a>.</p>
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `We've received your application${jobTitle ? ` for ${jobTitle}` : ''}.`,
      badgeLabel: 'Application Received',
      bodyHtml,
    });

    const info = await transporter.sendMail({
      from: FROM,
      to: toEmail,
      subject: 'Your job application has been received',
      html,
      text: `Dear ${candidateName},\n\nThank you for applying${jobTitle ? ` for "${jobTitle}"` : ''}. We have received your application. Your CV is attached.\n\nIf your profile matches, a representative will contact you.\n\nJobs Connect`,
      attachments: [{ filename: resumeFile.name || 'resume.pdf', content: buffer, contentType: resumeFile.type || 'application/octet-stream' }],
    });
    console.log(`Job application confirmation sent to ${toEmail}. ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send job application confirmation email:', error);
    return false;
  }
}

// ── 18. JOB APPLICATION: NOTIFY EMPLOYER (CV attached) ────────────────────
export async function sendJobApplicationNotificationEmail(
  applyEmail: string,
  candidateName: string,
  candidateEmail: string,
  jobTitle: string,
  resumeFile: File
): Promise<boolean> {
  try {
    const arrayBuffer = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bodyHtml = `
      <h2 style="font-size:20px;font-weight:700;color:${BRAND.dark};margin:0 0 16px;">📩 New application for "${escapeHtml(jobTitle)}"</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;">
        <tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;width:100px;">Name</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.dark};">${escapeHtml(candidateName)}</td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Email</td><td style="padding:8px 0;font-size:14px;"><a href="mailto:${escapeHtml(candidateEmail)}" style="color:${BRAND.primary};">${escapeHtml(candidateEmail)}</a></td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};font-size:14px;">Submitted</td><td style="padding:8px 0;font-size:14px;color:${BRAND.dark};">${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })} ET</td></tr>
      </table>
      <p style="font-size:14px;color:#334155;margin:0;">The applicant's CV is attached to this email.</p>
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `New application from ${candidateName} for "${jobTitle}"`,
      badgeLabel: 'New Application',
      bodyHtml,
    });

    const info = await transporter.sendMail({
      from: FROM,
      to: applyEmail,
      subject: `New job application: ${candidateName} for "${jobTitle}"`,
      html,
      text: `New application for "${jobTitle}"\n\nName: ${candidateName}\nEmail: ${candidateEmail}\n\nCV attached.\n\nJobs Connect`,
      attachments: [{ filename: resumeFile.name || 'resume.pdf', content: buffer, contentType: resumeFile.type || 'application/octet-stream' }],
    });
    console.log(`Job application notification sent to ${applyEmail}. ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send job application notification email:', error);
    return false;
  }
}

// ── 19. JOB BANK REQUEST: CONFIRMATION ────────────────────────────────────
export async function sendJobBankRequestConfirmationEmail(
  email: string,
  userName: string,
  jobBankId: string
): Promise<boolean> {
  try {
    const dashboardUrl = `${SITE_URL}/dashboard/job-bank`;

    const bodyHtml = `
      <h1 style="font-size:20px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Thank you, ${escapeHtml(userName)}!</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">We've received your request to add the following Job Bank ID to your account:</p>
      <div style="background:${BRAND.bg};border-left:4px solid ${BRAND.primary};border-radius:0 10px 10px 0;padding:16px 20px;margin:0 0 20px;font-size:14px;color:#334155;">
        <strong style="color:${BRAND.dark};">Job Bank ID:</strong> ${escapeHtml(jobBankId)}<br/>
        <strong style="color:${BRAND.dark};">Status:</strong> Pending review
      </div>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">Our team will review your request and get back to you shortly. You can track its status from your dashboard.</p>
      ${button(dashboardUrl, 'Go to Dashboard')}
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `Job Bank ID request received – ${jobBankId}`,
      badgeLabel: 'Request Received',
      bodyHtml,
    });

    const text = `Hi ${userName},\n\nWe received your request to add Job Bank ID "${jobBankId}".\n\nStatus: Pending review\n\nTrack progress: ${dashboardUrl}\n\nJobs Connect`;

    const info = await transporter.sendMail({ from: FROM, to: email, subject: `Job Bank ID request received – ${jobBankId}`, html, text });
    console.log(`Job Bank request confirmation sent to ${email}. ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send Job Bank request confirmation:', error);
    return false;
  }
}

// ── 20. JOB BANK REQUEST: STATUS CHANGE ───────────────────────────────────
export async function sendJobBankRequestStatusChangeEmail(
  email: string,
  userName: string,
  jobBankId: string,
  newStatus: string
): Promise<boolean> {
  try {
    const dashboardUrl = `${SITE_URL}/dashboard/job-bank`;
    const statusText = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

    const statusColors: Record<string, string> = {
      approved: 'background:#d1fae5;color:#065f46;',
      fulfilled: 'background:#d1fae5;color:#065f46;',
      rejected: 'background:#fee2e2;color:#991b1b;',
      pending: 'background:#fef3c7;color:#92400e;',
    };
    const statusStyle = statusColors[newStatus] || statusColors.pending;

    const bodyHtml = `
      <h1 style="font-size:20px;font-weight:700;color:${BRAND.dark};margin:0 0 12px;">Status updated</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 4px;">Hi ${escapeHtml(userName)},</p>
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">The status of your Job Bank ID request (<strong>${escapeHtml(jobBankId)}</strong>) has been changed to:</p>
      <span style="display:inline-block;padding:4px 16px;border-radius:20px;font-weight:700;font-size:14px;text-transform:uppercase;${statusStyle}">${escapeHtml(statusText)}</span>
      <p style="font-size:15px;color:#334155;margin:16px 0;">You can view the details and any associated listing from your dashboard.</p>
      ${button(dashboardUrl, 'Go to Dashboard')}
    `;

    const html = renderBrandedEmailHtml({
      siteUrl: SITE_URL,
      preheader: `Job Bank request ${jobBankId} is now ${statusText}`,
      badgeLabel: 'Status Update',
      bodyHtml,
    });

    const text = `Hi ${userName},\n\nYour Job Bank ID request "${jobBankId}" has been updated to: ${statusText}\n\nView details: ${dashboardUrl}\n\nJobs Connect`;

    const info = await transporter.sendMail({ from: FROM, to: email, subject: `Job Bank request status update – ${jobBankId} is now ${statusText}`, html, text });
    console.log(`Job Bank status change email sent to ${email}. ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send Job Bank status change email:', error);
    return false;
  }
}