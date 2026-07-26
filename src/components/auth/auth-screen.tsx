import Image from "next/image";

/**
 * Shell shared by the auth screens (Register, Login).
 *
 * The designs are drawn in a 300×640 phone frame. Mobile-first, that means the
 * white surface goes edge-to-edge; from `sm` up it becomes a centred card of the
 * same proportions sitting on the warm board background (NFR-GEN-2).
 */
export function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 justify-center bg-board sm:items-center sm:p-6">
      <div className="flex w-full flex-col bg-surface px-6 py-[26px] sm:min-h-[640px] sm:max-w-[400px] sm:rounded-frame sm:border sm:border-[rgb(46_42_38/0.06)] sm:shadow-card">
        {children}
      </div>
    </main>
  );
}

/** The terracotta fox-in-badge mark that heads each auth screen. */
export function AuthBrandMark() {
  return (
    <Image
      src="/brand/icon.svg"
      alt="TaskTails"
      width={60}
      height={60}
      priority
      className="mx-auto mt-[2px] mb-[14px] block size-[60px]"
    />
  );
}
