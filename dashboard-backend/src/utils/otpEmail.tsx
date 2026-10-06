// @/utils/otpEmail.tsx
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

export async function sendOTPEmail(email: string, otp: string, name: string): Promise<boolean> {
    try {
        const bodyHtml = `
            <h2 style="font-size:20px;font-weight:700;color:${BRAND.dark};margin:0 0 4px;">Verify your identity</h2>
            <p style="font-size:15px;color:${BRAND.muted};margin:0 0 24px;">Hi ${escapeHtml(name)}, use the code below.</p>

            <div style="background:${BRAND.bg};border:1px solid ${BRAND.border};padding:24px;text-align:center;font-size:32px;letter-spacing:8px;font-weight:700;color:${BRAND.dark};border-radius:12px;margin:0 0 20px;">
                ${escapeHtml(otp)}
            </div>

            <p style="font-size:14px;color:${BRAND.muted};margin:0 0 6px;">This code expires in <strong style="color:${BRAND.dark};">10 minutes</strong>.</p>
            <p style="font-size:14px;color:${BRAND.muted};margin:0;">If you didn't request this, you can safely ignore this email.</p>
        `;

        const html = renderBrandedEmailHtml({
            siteUrl: BASE_URL,
            preheader: `Your verification code is ${otp}`,
            badgeLabel: 'Verification',
            bodyHtml,
        });

        const text = `Hi ${name},\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;

        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"${BRAND.siteName}" <${BRAND.fromEmail}>`,
            to: email,
            subject: 'Your verification code',
            html,
            text,
        });
        return true;
    } catch (error) {
        console.error('Failed to send OTP email:', error);
        return false;
    }
}