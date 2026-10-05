import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { captcha } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from '@/platform/prisma.js';
import { sendEmail, isEmailConfigured, verificationEmail, resetPasswordEmail } from '@/platform/email.js';
import { parseTrustedOrigins } from '@/core/origins.js';
import { isDisposableEmail } from '@/core/disposableEmail.js';
// If your Prisma file is located elsewhere, you can change the path

const trustedOrigins = parseTrustedOrigins();

const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

if (process.env.NODE_ENV === 'production' && !isEmailConfigured()) {
    console.warn('RESEND_API_KEY is not set: sign-ups are NOT email-verified, so free credits can be farmed with throwaway accounts.');
}

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),
    emailAndPassword: {
        enabled: true,
        // Only ENFORCE verification when a real email provider is configured —
        // otherwise users could never receive the link and would be locked out.
        // With a provider set, unverified accounts can't sign in (and an unverified
        // account can't spend free credits).
        requireEmailVerification: isEmailConfigured(),
        // Send the password-reset link. Without an email provider this logs to the
        // console (so the forgot-password UI isn't a silent no-op in dev).
        sendResetPassword: async ({ user, url }) => {
          const { subject, html, text } = resetPasswordEmail(url);
          try {
            await sendEmail({ to: user.email, subject, html, text });
          } catch (err: any) {
            console.error('Failed to send reset-password email:', err?.message);
          }
        },
      },
      emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
          const { subject, html, text } = verificationEmail(url);
          // Don't let a transient provider outage 500 the signup/login flow — log
          // and move on. The user can request a fresh verification email.
          try {
            await sendEmail({ to: user.email, subject, html, text });
          } catch (err: any) {
            console.error('Failed to send verification email:', err?.message);
          }
        },
      },
      user: {
        deleteUser : {enabled: true}
      },
      databaseHooks: {
        user: {
          create: {
            before: async (user) => {
              if (isDisposableEmail(user.email)) {
                throw new APIError("BAD_REQUEST", { message: "Please sign up with a permanent email address." });
              }
              return { data: user };
            },
          },
        },
      },
      plugins: turnstileSecret
        ? [captcha({ provider: "cloudflare-turnstile", secretKey: turnstileSecret, endpoints: ["/sign-up/email"] })]
        : [],
      trustedOrigins ,
      baseURL :process.env.BETTER_AUTH_URL!,
      secret: process.env.BETTER_AUTH_SECRET!,
      advanced: {
        cookies: {
            session_token: {
                name: 'auth_session',
                attributes: {
                    httpOnly: true,
                    secure:process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    path: '/',
                }
            }
        }
      }

});