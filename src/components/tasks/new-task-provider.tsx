"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CreateTaskSheet } from "@/components/tasks/create-task-sheet";

/**
 * The one mounted copy of TASK-02's create-task sheet, plus the two ways of
 * opening it that aren't a button press (INF-22).
 *
 * This used to live inside `BottomNav`, which was the only thing mounted on
 * every authenticated page. The desktop rail's "New task" button needs the
 * same sheet, and the bottom nav is `display:none` at desktop widths — a
 * second sheet mounted inside a hidden subtree would open invisibly on ⌘N.
 * So the sheet moved up to the one place both presentations of the nav are
 * inside: the `(app)` route-group layout.
 *
 * ⌘N / Ctrl+N is the desktop handoff's shortcut, drawn as a hint chip on the
 * rail button. It is bound here rather than on the button so it works from
 * any screen in the group, which is what the hint promises. `preventDefault`
 * is deliberate: in a browser tab ⌘N opens a new window, and a shortcut the
 * app advertises has to win. Typing is not intercepted — a modifier chord
 * never reaches a text field as input — and pressing it again while the sheet
 * is open is a no-op, since the state it sets is the state it is already in.
 */
type NewTaskContextValue = { open: () => void };

const NewTaskContext = createContext<NewTaskContextValue | null>(null);

export function useNewTask(): NewTaskContextValue {
  const value = useContext(NewTaskContext);
  if (!value) {
    throw new Error("useNewTask() must be used inside <NewTaskProvider>");
  }
  return value;
}

export function NewTaskProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const open = useCallback(() => setCreateOpen(true), []);

  // PWA-09's "Add task" shortcut (`manifest.ts`) lands on `/tasks?new=task` —
  // this opens the sheet on arrival, since the shortcut wouldn't be much of a
  // shortcut if it only got you to the tab you'd have landed on anyway.
  // `openedFromShortcutRef` guards against React Strict Mode's dev-only
  // double-invoke re-triggering it — it persists across that double
  // mount/cleanup/mount cycle since it's the same fiber, so the second pass
  // sees it already set and does nothing. Deferred a tick
  // (`setTimeout(..., 0)`) rather than called directly in the effect body —
  // `eslint react-hooks/set-state-in-effect` flags a synchronous `setState`
  // there. `router.replace` strips the query param so a refresh or a later
  // back-navigation doesn't reopen the sheet.
  const openedFromShortcutRef = useRef(false);
  useEffect(() => {
    if (openedFromShortcutRef.current) return;
    if (pathname !== "/tasks") return;
    if (new URLSearchParams(window.location.search).get("new") !== "task") return;
    openedFromShortcutRef.current = true;
    setTimeout(() => {
      setCreateOpen(true);
      router.replace("/tasks");
    }, 0);
  }, [pathname, router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "n" && event.key !== "N") return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.shiftKey) return;
      event.preventDefault();
      setCreateOpen(true);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <NewTaskContext.Provider value={{ open }}>
      {children}
      <CreateTaskSheet open={createOpen} onOpenChange={setCreateOpen} />
    </NewTaskContext.Provider>
  );
}
