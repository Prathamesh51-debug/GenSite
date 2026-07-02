import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma.js";
import { sendEmail, isEmailConfigured, verificationEmail, resetPasswordEmail } from "./email.js";
import { parseTrustedOrigins } from "./origins.js";
// If your Prisma file is located elsewhere, you can change the path

const trustedOrigins = parseTrustedOrigins();

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