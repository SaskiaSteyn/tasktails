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
import { fieldErrors, registerSchema } from "@/lib/validation/auth";

/** Where a new account lands once its session exists (ONB-1). */
const AFTER_REGISTER = "/onboarding";

type Errors = Partial<Record<"email" | "password" | "confirmPassword", string>>;

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();

  const [values, setValues] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
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

    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setPending(true);
    setErrors({});
    setFormError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (body?.fieldErrors) {
          setErrors(body.fieldErrors as Errors);
        } else {
          setFormError(body?.error ?? "Couldn't create your account. Try again.");
        }
        return;
      }

      // Sign straight in so the new account has a session (AUTH-4, JWT).
      const result = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });

      if (result?.error) {
        setFormError("Account created, but signing in failed. Try logging in.");
        return;
      }

      router.push(AFTER_REGISTER);
    } catch {
      setFormError("Can't reach TaskTails. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col">
        <div className="flex flex-col gap-[11px]">
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
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={values.password}
            onChange={(event) => update("password")(event.target.value)}
            error={errors.password}
            disabled={pending}
          />
          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={values.confirmPassword}
            onChange={(event) => update("confirmPassword")(event.target.value)}
            error={errors.confirmPassword}
            disabled={pending}
          />
        </div>

        <Button type="submit" disabled={pending} className="mt-[14px]">
          {pending ? "Creating account…" : "Create account"}
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

      <Divider label="or sign up with" className="my-3" />

      <Button
        variant="oauth"
        disabled={!googleEnabled || pending}
        aria-describedby={googleEnabled ? undefined : "google-unavailable"}
        onClick={() => signIn("google", { redirectTo: AFTER_REGISTER })}
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

      <p className="mt-[10px] text-center text-[10.5px] leading-[1.4] text-ink-faint">
        You&apos;ll be randomly placed in a study group — this can&apos;t be changed
        during the study.
      </p>

      <div className="min-h-2 flex-1" />

      <p className="text-center text-[13px] text-ink-soft">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </>
  );
}
