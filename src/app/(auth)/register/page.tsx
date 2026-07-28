import type { Metadata } from "next";

import { isGoogleEnabled } from "@/auth";
import { AuthBrandMark, AuthScreen } from "@/components/auth/auth-screen";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create your account · TaskTails",
  description: "Turn your to-dos into tail wags.",
};

/**
 * `isGoogleEnabled` reads the environment, so this page has to render per
 * request rather than be prerendered (AUTH-08).
 *
 * Without this the page was static, which meant the answer was decided during
 * `next build` — and the Docker build deliberately carries no credentials, so
 * the button shipped permanently disabled no matter what the container was
 * given at runtime. Invisible locally, where `.env.local` is present at build
 * time and the two happen to agree. `/login` never had the bug: it reads
 * `searchParams`, which already made it dynamic.
 */
export const dynamic = "force-dynamic";

/** AUTH-01 — Register page. */
export default function RegisterPage() {
  return (
    <AuthScreen>
      <AuthBrandMark className="mt-[2px] mb-[14px]" />

      <h1 className="text-center font-display text-[23px] leading-[1.1] font-semibold">
        Create your account
      </h1>
      <p className="mt-[6px] mb-[22px] text-center text-[13px] text-ink-soft">
        Turn your to-dos into tail wags.
      </p>

      <RegisterForm googleEnabled={isGoogleEnabled} />
    </AuthScreen>
  );
}
