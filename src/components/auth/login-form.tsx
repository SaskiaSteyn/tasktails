"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { GoogleMark } from "@/components/ui/google-mark";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { fieldErrors, loginSchema } from "@/lib/validation/auth";

type Errors = Partial<Record<"email" | "password", string>>;

/**
 * AUTH-02 — credentials sign-in against the NextAuth handler (AUTH-05).
 *
 * `callbackUrl` is validated on the server (see the page) and is where the
 * session lands once the JWT is issued.
 */
export function LoginForm({
  googleEnabled,
  callbackUrl,
}: {
  googleEnabled: boolean;
  callbackUrl: string;
}) {
  const router = useRouter();

  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const update = (field: keyof typeof values) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear the field's error as soon as the user starts fixing it.
    setErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
    setFormError(null);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setPending(true);
    setErrors({});
    setFormError(null);

    try {
      const result = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });

      if (!result || result.error) {
        // One message for both a wrong password and an unknown address — which
        // of the two it was is not something a sign-in form should disclose.
        setFormError("That email and password don't match an account.");
        return;
      }

      router.push(callbackUrl);
    } catch {
      setFormError("Can't reach TaskTails. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col">
        <div className="flex flex-col gap-[14px]">
          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="your.name@email.com"
            value={values.email}
            onChange={(event) => update("email")(event.target.value)}
            error={errors.email}
            disabled={pending}
          />
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={values.password}
            onChange={(event) => update("password")(event.target.value)}
            error={errors.password}
            disabled={pending}
          />
        </div>

        {/* The frame draws a "Forgot password?" link above this button. It is
            omitted until a reset flow exists to link to — there is no ticket
            for one — rather than shipping a control that goes nowhere. */}
        <Button type="submit" disabled={pending} className="mt-[14px]">
          {pending ? "Logging in…" : "Log in"}
        </Button>

        {formError ? (
          <p
            role="alert"
            className="mt-[10px] text-center text-[11px] font-bold text-urgency-text"
          >
            {formError}
          </p>
        ) : null}
      </form>

      <Divider label="or continue with" className="my-[18px]" />

      <Button
        variant="oauth"
        disabled={!googleEnabled || pending}
        aria-describedby={googleEnabled ? undefined : "google-unavailable"}
        onClick={() => signIn("google", { redirectTo: callbackUrl })}
      >
        <GoogleMark />
        Continue with Google
      </Button>

      {googleEnabled ? null : (
        <p
          id="google-unavailable"
          className="mt-[6px] text-center text-[10.5px] leading-[1.4] text-ink-faint"
        >
          Google sign-in needs AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in your env.
        </p>
      )}

      <div className="min-h-2 flex-1" />

      <p className="text-center text-[13px] text-ink-soft">
        New here? <Link href="/register">Create an account</Link>
      </p>
    </>
  );
}
