import Link from "next/link";

import { AuthBrandMark, AuthScreen } from "@/components/auth/auth-screen";

/**
 * Placeholder so the "Log in" link and NextAuth's `pages.signIn` don't dead-end.
 * The real screen is AUTH-02 and has its own design ("Welcome back").
 */
export default function LoginPage() {
  return (
    <AuthScreen>
      <AuthBrandMark />
      <h1 className="text-center font-display text-[25px] font-semibold">
        Welcome back
      </h1>
      <p className="mt-[6px] text-center text-[13px] text-ink-soft">
        This screen is still to be built — AUTH-02.
      </p>
      <div className="min-h-2 flex-1" />
      <p className="text-center text-[13px] text-ink-soft">
        New here? <Link href="/register">Create an account</Link>
      </p>
    </AuthScreen>
  );
}
