import type { Metadata } from "next";

import { isGoogleEnabled } from "@/auth";
import { AuthBrandMark, AuthScreen } from "@/components/auth/auth-screen";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create your account · TaskTails",
  description: "Turn your to-dos into tail wags.",
};

/** AUTH-01 — Register page. */
export default function RegisterPage() {
  return (
    <AuthScreen>
      <AuthBrandMark />

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
