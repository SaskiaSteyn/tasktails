/**
 * Focus management for failed form submits (INF-14).
 *
 * A submit that fails validation leaves focus on the button. The errors render
 * above it, so a sighted mouse user sees them immediately and everyone else gets
 * nothing — the messages are announced (each is a `role="alert"`), but the fields
 * they belong to are still somewhere behind the current focus position. Moving
 * focus to the first offender is what makes the error actionable.
 *
 * Client-side only; callers are all `"use client"` form handlers.
 */

/**
 * Focuses the first field in `form` that has an error.
 *
 * Ordered by the form's own field order rather than the error object's key
 * order, so focus lands on the first *visible* problem — an object with
 * `{password, email}` should still send you to Email.
 */
export function focusFirstInvalid(
  form: HTMLFormElement,
  errors: Record<string, string | undefined>,
): void {
  const named = Array.from(
    form.querySelectorAll<HTMLInputElement>("input[name]"),
  );

  const target = named.find((input) => errors[input.name]);
  // `preventScroll: false` is the default and wanted — on a phone the offending
  // field may be off-screen.
  target?.focus();
}
