import { signOut } from "@/auth";
import { LogoutSubmit } from "@/components/auth/logout-submit";

/**
 * AUTH-03 — log out (REQ AUTH-3). Lives on Settings, per the designs.
 *
 * A form posting to a server action rather than a client-side `signOut()` call:
 * clearing the JWT cookie is the server's job, and the button keeps working if
 * the page's JavaScript has not hydrated yet. Participants sign out on shared
 * lab machines, so this one has to be reliable rather than clever.
 *
 * Styled as the Settings frame draws it — white fill, warm red hairline border,
 * red label, no icon. One of the two sanctioned uses of urgency red (see
 * globals.css).
 */
export function LogoutButton({ className }: { className?: string }) {
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <form action={logout} className={className}>
      <LogoutSubmit>Log out</LogoutSubmit>
    </form>
  );
}
