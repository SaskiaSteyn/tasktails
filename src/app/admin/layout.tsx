import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";

/**
 * #329 — the side menu around every admin page. No data and no gate here:
 * each page still calls `requireAdmin()` itself, the same "every page checks
 * itself" rule the rest of the app follows.
 *
 * `h-full` + a scrolling `<main>`: the root layout pins `body` to the
 * viewport with `overflow-hidden` for the phone-frame screens, so the admin
 * pages have to supply their own scroll container.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full bg-board">
      <AdminNav />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
