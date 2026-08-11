# TaskTails production image (INF-15).
#
# Multi-stage, ending in Next's standalone output: the runtime stage carries the
# traced server and nothing else — no npm, no dev dependencies, no source.
#
# Deliberately takes no build arguments. `next build` needs no database (the
# Prisma client is constructed lazily — see src/lib/prisma.ts), so nothing in
# this file needs a connection string or a secret. Everything is supplied at
# `docker run` time. Do not add ARGs for credentials: build args are visible in
# `docker history`.
#
#   docker compose up -d --build
#
# Node 22 is the active LTS and matches what `next build` is tested against;
# Alpine keeps the image small enough to build on a Free Tier EC2 instance.

# ---------------------------------------------------------------------------
# deps — install once, cached until the lockfile changes
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# The Prisma schema and config have to be present before generating the client.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma

# `--ignore-scripts` suppresses the postinstall hook so the generate step below
# can be given its own environment.
#
# prisma.config.ts resolves DATABASE_URL through `env()`, which throws the moment
# the variable is absent — for *every* command, including `generate`, which does
# not connect to anything. Rather than loosen that (it is what makes a mistyped
# `migrate` fail loudly instead of silently targeting the wrong database), the
# throwaway URL below satisfies the config loader for this one command. It is
# never dialled and never reaches the final image.
RUN npm ci --ignore-scripts \
 && DATABASE_URL="postgresql://unused:unused@127.0.0.1:5432/unused" npx prisma generate

# ---------------------------------------------------------------------------
# builder — compile the app
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
# Carries the generated Prisma client, which is gitignored and so is never
# copied in from the build context.
COPY --from=deps /app/src/generated ./src/generated
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------------------------------------------------------------------------
# migrator — Prisma CLI + schema, for `migrate deploy` before the app starts
# ---------------------------------------------------------------------------
# A separate stage because the standalone runtime has no Prisma CLI and no
# migrations directory. Compose runs this as a one-shot service that the app
# waits on; see docker-compose.yml.
#
# Also runs `prisma db seed` (prisma.config.ts's `migrations.seed`) after
# migrating — `migrate deploy` never seeds on its own, unlike `migrate dev`/
# `migrate reset`, which only run in local development. Without this the
# `StoreItem`/`Achievement` tables stay empty after every fresh deploy: an
# empty shop, a Lucky Box that can't find a Common item for the rarity it
# rolled, and `achievementsForUser()` fed a catalogue of zero. `prisma/seed.ts`
# is upsert-based and safe to re-run on every deploy. Needs `tsconfig.json`
# and `src` (not just `prisma/`) because the seed script imports the
# generated Prisma client and `src/lib/prisma.ts` through the `@/*` path
# alias that `tsx` resolves from `tsconfig.json`; the generated client itself
# comes from `deps`, same as the `builder` stage above, since `src/generated`
# is gitignored and absent from the build context.
FROM node:22-alpine AS migrator
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/src/generated ./src/generated
COPY package.json prisma.config.ts tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed"]

# ---------------------------------------------------------------------------
# runner — what actually ships
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Never run the server as root. `node` (uid 1000) ships with the base image.
USER node

# `standalone` omits these two by design — they are meant to come from a CDN.
# There is no CDN here, so the server serves them itself.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

EXPOSE 3000

# Fails the container rather than quietly serving errors, so compose and any
# future load balancer can tell a wedged app from a healthy one.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# The minimal server standalone emits. Not `next start` — that would need the
# full Next CLI and its dependencies back in the image.
CMD ["node", "server.js"]
