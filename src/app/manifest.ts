import type { MetadataRoute } from "next";

/**
 * The web app manifest — what makes TaskTails installable, and therefore what
 * makes "the app" a different thing from "the website" (MKT-01/02/03).
 *
 * The two are one deployment and one URL. The only thing that separates them is
 * `display: "standalone"`: launched from the home screen the browser reports
 * `display-mode: standalone`, which is what `/` reads to decide between the
 * welcome screen and the marketing site. There is no user-agent sniffing and no
 * second build — see `src/app/page.tsx`.
 *
 * `icon.svg` covers every density as a vector — the logo handoff is explicit
 * that "the badge already carries its own tile, so it holds down to favicon
 * size without a separate background" — but PWA-05 adds PNG rasters alongside
 * it (`scripts/generate-icons.ts`) because iOS home-screen install and some
 * Android launchers/task-switchers don't reliably rasterise an SVG manifest
 * icon on their own.
 *
 * No `purpose: "maskable"` on `icon.svg` itself — a maskable icon is cropped to
 * the platform's own shape (circle on most Android launchers), and this badge
 * is a rounded tile with the fox filling it corner to corner, so a circular
 * crop would clip the ears (see `icon-maskable.svg`'s own doc comment for the
 * geometry). `icon-maskable-512.png` is the same artwork scaled and padded
 * into that shape's safe zone instead, declared separately with its own
 * `purpose: "maskable"` rather than retrofitting the badge everywhere else
 * already assumes fills its tile edge to edge.
 *
 * `background_color` is the board, not the terracotta of the screen that follows.
 * The generated launch splash draws this icon on that colour, and the icon's own
 * badge *is* terracotta — on a terracotta splash it would disappear into the
 * ground and leave the fox floating, exactly the failure `icon-on-brand.svg`
 * exists to fix on the welcome screen. The board is the app's canvas colour and
 * already what `viewport.themeColor` declares, and the icon reads cleanly on it.
 *
 * `shortcuts` (PWA-09) is the launcher jump-list Android's long-press and
 * desktop Chrome's right-click both read from an installed app's icon — one
 * entry, "Add task", straight to `/tasks?new=task`. `BottomNav` (SHR-01) is
 * what actually opens the sheet on arrival; this only points at the URL.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TaskTails",
    short_name: "TaskTails",
    description:
      "Turn your to-do list into a cosy sanctuary. Finish tasks, earn coins, and grow a zoo of little friends.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F1E9DC",
    theme_color: "#F1E9DC",
    // Deliberately no `orientation` lock: WCAG 1.3.4 asks that content not be
    // restricted to a single display orientation unless it is essential, and
    // nothing here is.
    icons: [
      {
        src: "/brand/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Add task",
        url: "/tasks?new=task",
        icons: [{ src: "/brand/icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
    ],
  };
}
