import { LoadingScreen } from "@/components/layout/loading-screen";
import { Spinner } from "@/components/ui/skeleton";

/**
 * The group-level fallback — the safety net, not a screen anyone should
 * normally see.
 *
 * Every section in the group has its own `loading.tsx` shaped like the screen
 * it stands in for (`tasks/`, `store/`, `zoo/`, `zoo/[id]/`, `profile/`,
 * `settings/`), and Next uses the nearest one, so this only renders for a
 * section added later that hasn't got one yet. **If you land here, that is the
 * signal to add a `loading.tsx` next to the new page**, drawn from its real
 * components the way the others are.
 *
 * Deliberately a bare spinner rather than a stack of placeholder blocks: this
 * is the one fallback that cannot know what is coming, and blocks in the wrong
 * shape are worse than no blocks — the layout visibly jumps when the real
 * content replaces them. A spinner promises only "something is loading", which
 * is all this file actually knows.
 */
export default function Loading() {
  return (
    <LoadingScreen header={null} className="items-center justify-center p-6">
      <Spinner size={26} />
    </LoadingScreen>
  );
}
