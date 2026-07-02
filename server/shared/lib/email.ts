// Minimal transactional-email sender.
//
// Uses Resend's HTTP API when RESEND_API_KEY is set; otherwise logs the message to
// the console so local dev and unconfigured environments keep working (signup/login
// never break just because email isn't wired up yet). No SDK dependency — it's a
// single HTTP call, so we use fetch directly.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'GenSite <onboarding@resend.dev>';

/** True when a real email provider is configured (so callers can decide to enforce). */
export const isEmailConfigured = (): boolean => !!RESEND_API_KEY;

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async ({ to, subject, html, text }: SendEmailParams): Promise<void> => {
  if (!RESEND_API_KEY) {
    console.log(`\n[email:dev] (no RESEND_API_KEY — logging instead of sending)\n  to: ${to}\n  subject: ${subject}\n  ${text || html}\n`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html, text }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }
};

/** Branded password-reset email used by better-auth's sendResetPassword hook. */
export const resetPasswordEmail = (url: string): { subject: string; html: string; text: string } => ({
  subject: 'Reset your GenSite password',
  text: `We received a request to reset your GenSite password. Use the link below (it expires shortly):\n\n${url}\n\nIf you didn't request this, you can safely ignore this email.`,
  html: `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
    <h1 style="font-size:20px;margin:0 0 12px">Reset your password</h1>
    <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 24px">
      We received a request to reset your <strong>GenSite</strong> password. Click below to choose a new one. This link expires shortly.
    </p>
    <a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px">
      Reset password
    </a>
    <p style="font-size:12px;line-height:1.6;color:#888;margin:24px 0 0">
      If the button doesn't work, paste this link into your browser:<br>
      <span style="word-break:break-all">${url}</span>
    </p>
    <p style="font-size:12px;color:#aaa;margin:24px 0 0">If you didn't request a reset, you can safely ignore this email.</p>
  </div>`,
});

/** Branded verification email used by better-auth's sendVerificationEmail hook. */
export const verificationEmail = (url: string): { subject: string; html: string; text: string } => ({
  subject: 'Verify your GenSite email',
  text: `Welcome to GenSite! Confirm your email address to start building:\n\n${url}\n\nIf you didn't create an account, you can ignore this message.`,
  html: `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
    <h1 style="font-size:20px;margin:0 0 12px">Verify your email</h1>
    <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 24px">
      Welcome to <strong>GenSite</strong>! Confirm your email address to start turning prompts into websites.
    </p>
    <a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px">
      Verify email
    </a>
    <p style="font-size:12px;line-height:1.6;color:#888;margin:24px 0 0">
      If the button doesn't work, paste this link into your browser:<br>
      <span style="word-break:break-all">${url}</span>
    </p>
    <p style="font-size:12px;color:#aaa;margin:24px 0 0">If you didn't create an account, you can safely ignore this email.</p>
  </div>`,
});
