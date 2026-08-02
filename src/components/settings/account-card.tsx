import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** PRO-10's ACCOUNT group: the email row (read-only) and the link into PRO-11's password screen. */
export function AccountCard({ email }: { email: string }) {
  return (
    <section>
      <p className="text-overline mb-[9px]">Account</p>
      <div className="mb-2 overflow-hidden rounded-[13px] border border-border-track bg-warm">
        <div className="flex items-center justify-between border-b border-border-track px-[13px] py-[10px]">
          <span className="text-[13px] font-bold">Email</span>
          <span className="truncate text-[12px] text-ink-faint">{email}</span>
        </div>

        <Link
          href="/settings/password"
          className="flex items-center justify-between px-[13px] py-[10px] hover:bg-input"
        >
          <span className="text-[13px] font-bold">Change password</span>
          <ChevronRight size={16} strokeWidth={2} className="text-ink-faint" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
