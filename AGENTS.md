<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# TaskTails

Research instrument for the IMY761 false-urgency study. See [README.md](README.md)
for setup, [Requirements.md](Requirements.md) for the spec and
[Features.md](Features.md) for ticket status.

## Match the designs

`design_handoff/` is authoritative. Before building a screen, read the relevant
frame in `TaskTails Screens.dc.html` and the component spec in
`TaskTails Style Guide.dc.html`, and match them — sizes, spacing, copy and states.
The `.dc.html` files are references authored in HTML, not code to copy; ignore
`support.js` / `image-slot.js` / `doc-page.js`.

Designs are drawn in a 300×640 phone frame. Build mobile-first, then adapt upward
(NFR-GEN-2).

## Tokens, not hex

Every style-guide token is a Tailwind v4 `@theme` variable in
`src/app/globals.css`. Use `bg-terracotta`, `rounded-input`, `shadow-card`,
`text-overline` and friends rather than raw values.

- **Urgency red (`--color-urgency`) is reserved** for Group B false-urgency
  elements and destructive actions. Group A and neutral UI must never use it —
  keeping the accent exclusive is what makes the study stimuli legible.
- **No emoji.** Icons come from `lucide-react`.

## No component library

Shared primitives are hand-built in `src/components/ui/`. **Don't reach for
shadcn/ui** — it appears in older planning docs but is not part of this project;
the design system is bespoke and shadcn's token layer conflicts with it. Build
against the `@theme` tokens instead. (Copying in a single shadcn component for a
genuinely hard widget is fine; installing it as the base layer is not.)

## Storage is mocked

There is no database yet. `src/lib/mock/users.ts` is an in-memory stand-in for the
planned Prisma models; it is process-local. Keep storage access inside that module
so INF-01 can replace it in one place.
