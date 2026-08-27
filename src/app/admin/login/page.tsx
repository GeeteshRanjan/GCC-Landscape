import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { hasValidSession } from "@/lib/admin/session";
import { isTotpRequired } from "@/lib/admin/totp";

/**
 * Sits outside the (authed) route group, so it is the one /admin path that does
 * not require a session.
 *
 * `noindex` here is belt and braces — next.config.ts already sends
 * X-Robots-Tag: noindex for every /admin path, and frame-ancestors 'none'.
 */
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await hasValidSession()) redirect("/admin");

  return (
    <main className="mx-auto flex w-full max-w-md flex-col justify-center gap-8 px-6 py-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-heading text-text">
          Sign in
        </h1>
        {/* Names nothing — not the product, not the client, not what is behind
            the door. This page is reached by typing the URL, and a page that
            introduces itself to whoever finds it is doing the opposite of that. */}
        <p className="text-sm text-text-muted">
          Enter your password to continue. If you reached this page by accident,
          there is nothing here for you.
        </p>
      </div>
      {/* Whether a second factor is configured is decided on the server and
          passed down, so the form never guesses at which fields to show. */}
      <LoginForm totpRequired={isTotpRequired()} />
    </main>
  );
}
