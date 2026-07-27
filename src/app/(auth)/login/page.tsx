import type { Metadata } from "next";

import { isGoogleEnabled } from "@/auth";
import { AuthBrandMark, AuthScreen } from "@/components/auth/auth-screen";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in · TaskTails",
  description: "Your pets missed you.",
};

/**
 * Where a session lands when nothing sent it here. The dashboard is TASK-01;
 * until it exists, the post-auth placeholder does the job — same as register.
 */
const AFTER_LOGIN = "/onboarding";

/**
 * NextAuth appends `?callbackUrl=` when it bounces someone here (AUTH-06), so
 * only same-origin paths are honoured — an absolute or protocol-relative value
 * would turn the login screen into an open redirect.
 */
function safeCallbackUrl(value: string | string[] | undefined): string {
  if (typeof value !== "string") return AFTER_LOGIN;
  if (!value.startsWith("/")) return AFTER_LOGIN;
  if (value.startsWith("//") || value.startsWith("/\\")) return AFTER_LOGIN;
  return value;
}

/** AUTH-02 — Login page. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <AuthScreen>
      <AuthBrandMark className="mt-[24px] mb-[16px]" />

      <h1 className="text-center font-display text-[25px] font-semibold">
        Welcome back
      </h1>
      <p className="mt-[6px] mb-[26px] text-center text-[13px] text-ink-soft">
        Your pets missed you.
      </p>

      <LoginForm
        googleEnabled={isGoogleEnabled}
        callbackUrl={safeCallbackUrl(callbackUrl)}
      />
    </AuthScreen>
  );
}
