<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# TaskTails

Research instrument for the IMY761 false-urgency study. See [README.md](README.md)
for setup, [Requirements.md](Requirements.md) for the spec and
[Features.md](Features.md) for ticket status.

## Update the ticket status when you finish

Tickets live in **two** files that must agree:

- `Features.md` — the readable table; the `Status` column is the last cell.
- `Features.csv` — the same 135 rows, `ID,Title,Module,Type,Status`. It seeds
  GitHub issues via `scripts/sync-issues.sh`.

**Both, every time.** Updating only the `.md` is the easy mistake, and it has
already happened once. After changing either, verify they still agree:

```bash
python3 - <<'PY'
import re, csv
md = {}
for line in open('Features.md'):
    m = re.match(r'\|\s*([A-Z]+-\d+)\s*\|.*\|\s*([^|]+?)\s*\|\s*$', line)
    if m: md[m.group(1)] = m.group(2).split('—')[0].strip()
cs = {r[0]: r[4].strip() for r in csv.reader(open('Features.csv'))
      if len(r) == 5 and re.match(r'^[A-Z]+-\d+$', r[0])}
bad = [k for k in md if k in cs and md[k] != cs[k]]
print("mismatches:", bad or "none")
PY
```

Rules of thumb:

- Mark `Done` only once you have **run** the thing and seen it work — not when
  the code merely compiles. Say what you verified in the response, not in the
  table.
- In `Features.md` you may append a short note after the status
  (`Done — on Settings, not the header`) when the implementation differs from the
  ticket's wording or the reader would otherwise be surprised. Keep the first
  word one of `To Do` / `In Progress` / `Done`; the sync check above reads it.
  The `.csv` takes the bare status only — it has no notes column.
- If finishing your ticket also completes or unblocks another, say so rather
  than silently ticking it off. Flip someone else's ticket only when you have
  actually exercised it.
- A `Done` whose status note still names a blocker that no longer exists is a
  stale row — fix it when you notice.

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

## Storage

Prisma 7 + PostgreSQL, via the Docker Postgres in `docker-compose.yml`. Two
things differ from Prisma 6 and will bite you if you assume otherwise: the
connection URL lives in `prisma.config.ts` and the adapter in `src/lib/prisma.ts`
(**not** in `datasource db`), and the client is generated to
`src/generated/prisma`, which is gitignored.

Account reads and writes go through `src/lib/users.ts` — nothing else touches
`prisma.user`. Keep new storage access behind a module like it rather than
calling Prisma from routes and pages.
