"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
import { focusFirstInvalid } from "@/lib/focus";
import { changePasswordSchema, fieldErrors } from "@/lib/validation/auth";

/** PRO-11 — the Settings "Change password" form, no design for its own screen (the mock draws only the row that links here). Styled like `RegisterForm`'s fields, the closest thing this app has to a password form. */

type Errors = Partial<
  Record<"currentPassword" | "newPassword" | "confirmNewPassword", string>
>;

export function ChangePasswordForm() {
  const router = useRouter();

  const [values, setValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  const update = (field: keyof typeof values) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
    setFormError(null);
    setSuccess(false);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      const found = fieldErrors(parsed.error);
      setErrors(found);
      focusFirstInvalid(event.currentTarget, found);
      return;
    }

    setPending(true);
    setErrors({});
    setFormError(null);

    try {
      const response = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (body?.fieldErrors) {
          setErrors(body.fieldErrors as Errors);
          focusFirstInvalid(event.currentTarget, body.fieldErrors);
        } else {
          setFormError(body?.error ?? "Couldn't change your password. Try again.");
        }
        return;
      }

      setValues({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setSuccess(true);
      router.refresh();
    } catch {
      setFormError("Can't reach TaskTails. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col">
      <div className="flex flex-col gap-[11px]">
        <PasswordField
          label="Current password"
          name="currentPassword"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={(event) => update("currentPassword")(event.target.value)}
          error={errors.currentPassword}
          disabled={pending}
        />
        <PasswordField
          label="New password"
          name="newPassword"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={values.newPassword}
          onChange={(event) => update("newPassword")(event.target.value)}
          error={errors.newPassword}
          disabled={pending}
        />
        <PasswordField
          label="Confirm new password"
          name="confirmNewPassword"
          autoComplete="new-password"
          placeholder="Repeat your new password"
          value={values.confirmNewPassword}
          onChange={(event) => update("confirmNewPassword")(event.target.value)}
          error={errors.confirmNewPassword}
          disabled={pending}
        />
      </div>

      <Button type="submit" disabled={pending} className="mt-[14px]">
        {pending ? "Saving…" : "Save new password"}
      </Button>

      {formError ? (
        <p
          role="alert"
          className="mt-[10px] text-center text-[11px] font-bold text-urgency-text"
        >
          {formError}
        </p>
      ) : null}

      {success ? (
        <p
          role="status"
          className="mt-[10px] text-center text-[11px] font-bold text-sage-text"
        >
          Password changed.
        </p>
      ) : null}
    </form>
  );
}
