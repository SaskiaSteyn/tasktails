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
 * `icon.svg` rather than a set of PNGs: the badge is flat vector with no text,
 * and the logo handoff is explicit that "the badge already carries its own tile,
 * so it holds down to favicon size without a separate background". Declared
 * `sizes: "any"`, which browsers accept for SVG, so one file covers every
 * launcher density. No `purpose: "maskable"` — a maskable icon is cropped to the
 * platform's own shape (circle on most Android launchers) and this badge is
 * already a rounded tile with the fox filling it corner to corner, so a crop
 * would clip the ears. Without it the launcher composites the icon itself, which
 * is the right outcome here.
 *
 * `background_color` is the board, not the terracotta of the screen that follows.
 * The generated launch splash draws this icon on that colour, and the icon's own
 * badge *is* terracotta — on a terracotta splash it would disappear into the
 * ground and leave the fox floating, exactly the failure `icon-on-brand.svg`
 * exists to fix on the welcome screen. The board is the app's canvas colour and
 * already what `viewport.themeColor` declares, and the icon reads cleanly on it.
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
    ],
  };
}
