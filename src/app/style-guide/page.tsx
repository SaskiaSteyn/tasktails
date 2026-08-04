import type { Metadata } from "next";
import Image from "next/image";
import { History } from "lucide-react";

import { AuthBrandMark } from "@/components/auth/auth-screen";
import { AchievementUnlockDemo } from "@/components/economy/achievement-unlock-demo";
import { LevelUpDemo } from "@/components/economy/level-up-demo";
import { AppHeader } from "@/components/layout/app-header";
import { AnimalCard } from "@/components/pets/animal-card";
import { ZooGalleryCard } from "@/components/pets/zoo-gallery-card";
import { AchievementsGrid } from "@/components/profile/achievements-grid";
import { Button } from "@/components/ui/button";
import { CoinPill } from "@/components/ui/coin";
import { Divider } from "@/components/ui/divider";
import { GoogleMark } from "@/components/ui/google-mark";
import { LevelBadge } from "@/components/ui/level-badge";
import { PasswordField } from "@/components/ui/password-field";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StreakCard, StreakPill } from "@/components/ui/streak";
import { TextField } from "@/components/ui/text-field";
// Type-only, same reasoning as `EconomySnapshot`/`PetWithItem` below —
// `achievements.ts` is server-only (Prisma), but the *type* is erased at
// compile time and safe on this public, statically generated page.
import type { AchievementWithState } from "@/lib/achievements";
import { AA_TEXT, bpca, bpcaLc, contrast, readColorTokens } from "@/lib/contrast";
import type { EconomySnapshot } from "@/lib/economy";
// Type-only: erased at compile time, so this page (a Server Component) can
// describe the shapes `AnimalCard`/`FeedSheet` need without ever importing
// `pets.ts`'s or `inventory.ts`'s Prisma-touching value exports.
import type { InventoryItemWithStoreItem } from "@/lib/inventory";
import { levelProgress } from "@/lib/levels";
import type { PetWithItem } from "@/lib/pets";

export const metadata: Metadata = {
  title: "Style guide · TaskTails",
  description: "Living reference for the TaskTails design tokens and components.",
};

/**
 * Living style guide — renders the real tokens and the real components, so it
 * can't drift from what ships. Colour values are parsed out of `globals.css` at
 * build time and the contrast ratios are computed from them.
 *
 * Not linked from anywhere in the app. Reachable at /style-guide.
 */

const SURFACES = ["surface", "warm", "input", "board"] as const;

function Section({
  n,
  title,
  blurb,
  children,
}: {
  n: string;
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    // Deep-linkable — /style-guide#s06 jumps to App chrome.
    <section id={`s${n}`} className="flex scroll-mt-6 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-section">
          <span className="text-ink-faint">{n} · </span>
          {title}
        </h2>
        {blurb ? <p className="text-secondary max-w-[70ch]">{blurb}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Card({
  label,
  children,
  className = "",
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-card-lg border border-border-track bg-surface p-5 ${className}`}
    >
      {label ? <div className="text-overline">{label}</div> : null}
      {children}
    </div>
  );
}

/**
 * A measured pair, judged by BPCA.
 *
 * `text` and `bg` are not interchangeable — BPCA is polarity-dependent, so the
 * text colour must come first. The WCAG 2 figure underneath is shown only so the
 * two methods can be compared; it decides nothing.
 */
function Ratio({
  text,
  bg,
  threshold = AA_TEXT,
}: {
  text: string;
  bg: string;
  threshold?: number;
}) {
  const value = bpca(text, bg);
  const legacy = contrast(text, bg);
  const pass = value >= threshold;
  const disagrees = pass !== legacy >= threshold;

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-[11px] font-extrabold ${
          pass ? "bg-sage-tint text-sage-text" : "bg-urgency-tint text-urgency-text"
        }`}
      >
        {value.toFixed(2)}:1 {pass ? "PASS" : "FAIL"}
      </span>
      <span
        className={`text-[10px] ${disagrees ? "font-bold text-urgency-text" : "text-ink-faint"}`}
        title={`Lc ${bpcaLc(text, bg).toFixed(1)}`}
      >
        WCAG 2: {legacy.toFixed(2)}
        {disagrees ? " ✗" : ""}
      </span>
    </span>
  );
}

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="overflow-hidden rounded-card border border-border-track bg-surface">
      <div className="h-16 border-b border-border-track" style={{ background: hex }} />
      <div className="flex flex-col gap-0.5 p-3">
        <div className="text-[12.5px] font-extrabold">{name}</div>
        <code className="text-[11px] text-ink-soft">{hex}</code>
      </div>
    </div>
  );
}

/**
 * Header samples. `EconomySnapshot` is imported as a *type* only — pulling in
 * the real `economy.ts` would drag Prisma and `auth()` into this page, which is
 * public and statically generated.
 */
function sampleEconomy(
  xp: number,
  coins: number,
  streak: number,
): EconomySnapshot {
  return { ...levelProgress(xp), coins, streak };
}

/**
 * `AnimalCard` samples, one per PET-02 mood. Built by hand rather than read
 * from `petsForUser()` for the same reason `sampleEconomy()` doesn't call the
 * real `currentEconomy()` — no Prisma value import on this public, statically
 * generated page. The `id`/`userId`/`storeItemId`/`lastInteractedAt` fields
 * are unused by `AnimalCard` but required by the type, so they're filled with
 * placeholders rather than loosening the prop type just for this page.
 */
function samplePet(
  name: string,
  imageUrl: string,
  happiness: number,
  hunger: number,
): PetWithItem {
  return {
    id: `sample-${name}`,
    userId: "sample-user",
    storeItemId: `sample-${name}-item`,
    name: null,
    happiness,
    hunger,
    lastInteractedAt: new Date(),
    storeItem: {
      id: `sample-${name}-item`,
      name,
      category: "ANIMALS",
      levelRequired: 1,
      coinPrice: 0,
      imageUrl,
    },
  };
}

/** PET-04's feed sheet needs something to list — same hand-built approach as `samplePet()`. */
const SAMPLE_FOOD_ITEMS: InventoryItemWithStoreItem[] = [
  {
    id: "sample-sunflower-seeds",
    userId: "sample-user",
    storeItemId: "sample-sunflower-seeds-item",
    equippedToPetId: null,
    quantity: 3,
    storeItem: {
      id: "sample-sunflower-seeds-item",
      name: "Sunflower seeds",
      category: "FOOD",
      levelRequired: 1,
      coinPrice: 40,
      imageUrl: "wheat",
    },
  },
  {
    id: "sample-treat-box",
    userId: "sample-user",
    storeItemId: "sample-treat-box-item",
    equippedToPetId: null,
    quantity: 1,
    storeItem: {
      id: "sample-treat-box-item",
      name: "Treat box",
      category: "FOOD",
      levelRequired: 3,
      coinPrice: 120,
      imageUrl: "package",
    },
  },
];

/**
 * PRO-07 samples — the real catalogue's four keys (`prisma/seed.ts`), so
 * `AchievementsGrid`'s per-key icon/colour lookup renders exactly as it does
 * live rather than falling back to the neutral default for an unknown key.
 * `criteria` is unused by the grid (it only reads `unlockedAt`) but required
 * by the type.
 */
function sampleAchievement(
  key: string,
  name: string,
  description: string,
  unlocked: boolean,
): AchievementWithState {
  return {
    id: `sample-${key}`,
    key,
    name,
    description,
    criteria: { type: "TASKS_COMPLETED", threshold: 1 },
    unlockedAt: unlocked ? new Date() : null,
  };
}

const ACHIEVEMENT_CATALOGUE: Array<[string, string, string]> = [
  ["task_champion", "Task Champion", "Complete 10 tasks."],
  ["rising_star", "Rising Star", "Reach Level 5."],
  ["week_warrior", "Week Warrior", "Keep a 7-day streak."],
  ["first_purchase", "First Purchase", "Buy your first item from the store."],
];

/** A 300px slice of the phone frame, so the header is shown at its real width. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[300px] max-w-full overflow-hidden rounded-card border border-border-track bg-surface">
      {children}
    </div>
  );
}

export default function StyleGuidePage() {
  const t = readColorTokens();

  const neutrals = [
    "board",
    "warm",
    "surface",
    "input",
    "ink",
    "ink-soft",
    "ink-faint",
    "ink-disabled",
    "border-track",
    "border-input",
    "checkbox",
  ];
  const accents = [
    "terracotta",
    "terracotta-hover",
    "terracotta-press",
    "terracotta-tint",
    "sage",
    "sage-tint",
    "sage-text",
    "amber",
    "amber-ring",
    "amber-tint",
    "amber-text",
    "violet",
    "violet-tint",
    "violet-text",
    "urgency",
    "urgency-tint",
    "urgency-text",
  ];
  const tiers = [
    ["Trivial", "tier-trivial", "5 / 8"],
    ["Small", "tier-small", "15 / 20"],
    ["Medium", "tier-medium", "35 / 45"],
    ["Large", "tier-large", "75 / 100"],
    ["Epic", "tier-epic", "150 / 200"],
  ] as const;

  // Text tokens that must clear 4.5:1 on every surface they appear on.
  const textTokens = [
    ["ink", "primary text"],
    ["ink-soft", "secondary copy, field labels"],
    ["ink-faint", "placeholders, small print"],
    ["amber-text", "coin values"],
    ["sage-text", "success text"],
    ["violet-text", "XP / level text"],
    ["urgency-text", "error messages"],
  ] as const;

  const whiteOnFill = [
    ["terracotta", "primary button, active nav"],
    ["sage", "positive button"],
    ["urgency", "flash-sale banner (Group B)"],
    ["violet", "level disc, Group B badge"],
    ["amber", "Group B badge"],
  ] as const;

  return (
    // `flex-1 min-h-0 overflow-y-auto`: the root layout's `<body>` is
    // `h-full overflow-hidden` (INF-12/13) so `AppShell`'s own `main` can be
    // the thing that scrolls while its nav stays put. This page has no
    // `AppShell` — it's a plain long-form document — so without its own
    // scroll container here, `body`'s `overflow-hidden` just clips everything
    // past one screen with no way to reach it.
    <main className="mx-auto flex w-full min-h-0 max-w-[1000px] flex-1 flex-col gap-12 overflow-y-auto px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <Image
            src="/brand/icon.svg"
            alt=""
            width={52}
            height={52}
            className="size-13 flex-none"
          />
          <div className="flex flex-col">
            <h1 className="text-brand-title">TaskTails — Style guide</h1>
            <p className="text-secondary">
              Live tokens and components, read straight from the code.
            </p>
          </div>
        </div>
        <p className="text-secondary max-w-[70ch]">
          Colours are parsed from <code>globals.css</code> at build time and every
          component below is the real one the app renders — if this page looks
          right, the app does too. Source of truth for intent remains{" "}
          <code>design_handoff/TaskTails Style Guide.dc.html</code>.
        </p>
      </header>

      {/* ---------------------------------------------------------------- */}
      <Section
        n="01"
        title="Contrast audit"
        blurb="NFR-GEN-1 requires 4.5:1 for text. Ratios are measured with BPCA — a bridge for WCAG 2 contrast using APCA — from the shipped token values against every surface the token appears on. The small figure under each chip is what plain WCAG 2 said; a red one marks a pair where the two methods disagree. Anything passing on the board passes everywhere, since the board is the darkest surface."
      >
        <Card label="Text on surfaces">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border-track text-left">
                  <th className="py-2 pr-4 font-extrabold">Token</th>
                  <th className="py-2 pr-4 font-extrabold">Hex</th>
                  {SURFACES.map((s) => (
                    <th key={s} className="py-2 pr-4 font-extrabold">
                      on {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {textTokens.map(([name, use]) => (
                  <tr key={name} className="border-b border-border-track/60">
                    <td className="py-2.5 pr-4">
                      <div className="font-bold">{name}</div>
                      <div className="text-[11px] text-ink-soft">{use}</div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <code className="text-[11px]">{t[name]}</code>
                    </td>
                    {SURFACES.map((s) => (
                      <td key={s} className="py-2.5 pr-4">
                        <Ratio text={t[name]} bg={t[s]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card label="White text on accent fills">
          <p className="text-secondary">
            The terracotta and sage rows are accepted exceptions — the fills are
            kept exactly as designed. The rest are on Group B store surfaces that
            don&apos;t exist yet.
          </p>
          <div className="flex flex-col gap-2">
            {whiteOnFill.map(([name, use]) => (
              <div
                key={name}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-track bg-warm px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 items-center rounded-chip px-3 text-[13px] font-extrabold text-white"
                    style={{ background: t[name] }}
                  >
                    Sample
                  </span>
                  <div>
                    <div className="text-[13px] font-bold">{name}</div>
                    <div className="text-[11px] text-ink-soft">{use}</div>
                  </div>
                </div>
                <Ratio text="#FFFFFF" bg={t[name]} />
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section n="02" title="Typography" blurb="Fredoka for display, headings and numerals. Nunito for body, labels and all UI text.">
        <Card label="Type scale">
          <div className="flex flex-col divide-y divide-border-track">
            {[
              ["text-brand-title", "Page / brand title", "Fredoka 600 · 32px"],
              ["text-section", "Section heading", "Fredoka 600 · 22px"],
              ["text-screen-title", "Screen / card title", "Fredoka 600 · 19px"],
              ["text-stat", "140 — stat / numeral", "Fredoka 600 · 17px"],
              ["text-body-strong", "Body / task title", "Nunito 700 · 13.5px"],
              ["text-secondary", "Secondary / helper copy", "Nunito 400 · 13px"],
              ["text-overline", "Label / overline", "Nunito 800 · 11px · +0.4px"],
            ].map(([cls, sample, spec]) => (
              <div
                key={cls}
                className="flex flex-wrap items-baseline justify-between gap-3 py-3"
              >
                <span className={cls}>{sample}</span>
                <span className="text-[11px] text-ink-soft">
                  <code>{cls}</code> · {spec}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section n="03" title="Colour">
        <Card label="Neutrals & surfaces">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {neutrals.map((n) => (
              <Swatch key={n} name={n} hex={t[n]} />
            ))}
          </div>
        </Card>

        <Card label="Accents">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {accents.map((n) => (
              <Swatch key={n} name={n} hex={t[n]} />
            ))}
          </div>
        </Card>

        <Card label="Task complexity ramp">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {tiers.map(([label, token, reward]) => (
              <div
                key={token}
                className="rounded-input border border-border-track bg-surface p-3 text-center"
              >
                <div
                  className="mb-2 h-2 rounded-[4px]"
                  style={{ background: t[token] }}
                />
                <div className="text-[12.5px] font-extrabold">{label}</div>
                <div className="text-[11px] text-ink-soft">
                  {t[token]} · {reward}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section n="04" title="Radius, elevation & spacing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card label="Corner radius">
            <div className="flex flex-wrap items-end gap-4">
              {[
                ["rounded-chip", "8 chip"],
                ["rounded-input", "12 input"],
                ["rounded-btn", "13 button"],
                ["rounded-card", "15 card"],
                ["rounded-card-lg", "18 card"],
                ["rounded-pill", "20 pill"],
                ["rounded-frame", "34 frame"],
              ].map(([cls, label]) => (
                <div key={cls} className="text-center">
                  <div
                    className={`size-12 border border-[#E9CFC4] bg-terracotta-tint ${cls}`}
                  />
                  <div className="mt-1.5 text-[11px] text-ink-soft">{label}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card label="Elevation">
            <div className="flex flex-wrap items-center gap-6 pb-2">
              {[
                ["shadow-card", "card", "bg-surface"],
                ["shadow-btn", "button", "bg-terracotta"],
                ["shadow-nav-idle", "nav idle", "bg-surface"],
                ["shadow-fab", "fab", "bg-terracotta"],
              ].map(([cls, label, bg]) => (
                <div key={cls} className="text-center">
                  <div
                    className={`h-12 w-20 rounded-input border border-border-track ${bg} ${cls}`}
                  />
                  <div className="mt-3 text-[11px] text-ink-soft">{label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        n="05"
        title="Components"
        blurb="The actual components from src/components/ui — interact with them. Hover and press the buttons, focus the fields, toggle the password reveal."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Card label="Buttons">
            <div className="flex flex-col gap-3">
              <Button>Primary — hover me</Button>
              <div className="flex gap-3">
                <Button variant="positive" size="inline">
                  Positive
                </Button>
                <Button variant="secondary" size="inline">
                  Secondary
                </Button>
              </div>
              <Button variant="oauth">
                <GoogleMark />
                Continue with Google
              </Button>
              <Button disabled>Disabled</Button>
            </div>
          </Card>

          <Card label="Inputs">
            <div className="flex flex-col gap-3">
              <TextField label="Default / filled" defaultValue="Filled value" />
              <TextField label="Placeholder" placeholder="Placeholder text" />
              <TextField
                label="Error"
                defaultValue="not-an-email"
                error="Enter a valid email address."
              />
              <PasswordField
                label="Password (toggle the eye)"
                defaultValue="tasktails123"
              />
              <TextField label="Disabled" placeholder="Disabled" disabled />
            </div>
          </Card>

          <Card label="Divider">
            <Divider label="or sign up with" />
          </Card>

          <Card label="Brand mark">
            <div className="flex items-center gap-4">
              {/* The real auth-screen component — it centres itself, so it gets
                  its own fixed-width box here. */}
              <div className="w-[76px] flex-none">
                <AuthBrandMark />
              </div>
              <div className="text-[12px] text-ink-soft">
                <code>AuthBrandMark</code> — <code>/brand/icon.svg</code> at 60px
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        n="06"
        title="App chrome"
        blurb="The persistent header (INF-12) at real economy values. Coins, level and streak appear on every logged-in screen; the XP bar and streak card are the dashboard's second row. The bottom nav is SHR-01."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Card label="Header — greeting (dashboard)">
            <Frame>
              <AppHeader name="Nico" economy={sampleEconomy(42, 245, 5)} />
            </Frame>
            <p className="text-[11.5px] text-ink-soft">
              Level 4 · 42 XP. The bar reads <code>7 / 20 XP</code>{" "}
              at 35%, not the mock&rsquo;s <code>42 / 55</code>{" "}
              at 76% — the bar resets each level (INF-21), so the numerals have
              to match it.
            </p>
          </Card>

          <Card label="Header — title (store, sanctuary)">
            <Frame>
              <AppHeader
                title="Store"
                // Sample, not the page's own title — this page already has an h1.
                titleAs="h2"
                economy={sampleEconomy(42, 245, 5)}
                action={
                  <span className="flex size-[34px] items-center justify-center rounded-full border border-border-track bg-surface text-ink-soft">
                    <History size={17} strokeWidth={2} aria-hidden />
                  </span>
                }
              />
            </Frame>
            <p className="text-[11.5px] text-ink-soft">
              No level disc and no progress row, per the store frame. The history
              icon is passed in as <code>action</code>.
            </p>
          </Card>

          <Card label="Header — fresh account">
            <Frame>
              <AppHeader name="friend" economy={sampleEconomy(0, 0, 0)} />
            </Frame>
            <p className="text-[11.5px] text-ink-soft">
              Level 1, empty bar, zeroes. What every participant sees on their
              first sign-in.
            </p>
          </Card>

          <Card label="Header — level cap">
            <Frame>
              <AppHeader name="Nico" economy={sampleEconomy(2400, 1180, 14)} />
            </Frame>
            <p className="text-[11.5px] text-ink-soft">
              At level 10 the caption becomes <code>MAX LEVEL</code>, the bar
              fills, and the numerals switch to the lifetime XP total. Note the
              bar is full because level 10 is the cap, not because 2,400 XP is.
            </p>
          </Card>

          <Card label="Coins, level & streak">
            <div className="flex flex-wrap items-center gap-3">
              <CoinPill coins={245} />
              <CoinPill coins={1180} />
              <LevelBadge level={4} />
              <LevelBadge level={4} variant="pill" />
              <StreakPill days={5} />
              <StreakCard days={5} />
            </div>
            <p className="text-[11.5px] text-ink-soft">
              The coin is a token-drawn amber circle and ring, not a Lucide icon.
              Each of these is <code>role=&quot;img&quot;</code> with a spoken
              label — &ldquo;245 coins&rdquo;, &ldquo;Level 4&rdquo;,
              &ldquo;5-day streak&rdquo; — so none of them reads as a bare digit.
            </p>
          </Card>

          <Card label="Progress bars">
            <div className="flex flex-col gap-3">
              {(
                [
                  ["xp", "XP", 35],
                  ["good", "Good (≥70)", 90],
                  ["caution", "Caution (31–69)", 50],
                  ["critical", "Critical (≤30)", 15],
                ] as const
              ).map(([tone, label, value]) => (
                <div key={tone} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10.5px] font-bold text-ink-soft">
                    <span>{label.toUpperCase()}</span>
                    <span>{value}%</span>
                  </div>
                  <ProgressBar tone={tone} value={value} label={label} />
                </div>
              ))}
            </div>
            <p className="text-[11.5px] text-ink-soft">
              <code>xp</code> is fixed to violet — always XP, on every screen.
              <code>good</code>/<code>caution</code>/<code>critical</code> are
              a value-driven traffic light instead (sage/amber/terracotta,
              PET-02&rsquo;s happiness/hunger bars) — the caller picks which
              applies via <code>stateTone()</code>, since &ldquo;which
              direction is good&rdquo; depends on the stat. Each is a{" "}
              <code>role=&quot;progressbar&quot;</code>.
            </p>
          </Card>

          <Card label="Contrast — new surfaces" className="sm:col-span-2">
            <p className="text-[11.5px] text-ink-soft">
              Both level treatments are drawn here so the INF-14 pass has the
              measured numbers. The <b>disc</b> is what the dashboard frame
              specifies and it misses AA; the <b>pill</b> is the token-built
              alternative if INF-14 decides to fix it.
            </p>
            <div className="flex flex-col gap-2">
              {(
                [
                  ["white on violet — level disc (as designed)", "#FFFFFF", t.violet],
                  ["violet-text on violet-tint — level pill", t["violet-text"], t["violet-tint"]],
                  ["terracotta on terracotta-tint — streak pill (as designed)", t.terracotta, t["terracotta-tint"]],
                  ["terracotta on surface — streak card numeral (as designed)", t.terracotta, t.surface],
                  ["terracotta-press on terracotta-tint — streak pill, darkened", t["terracotta-press"], t["terracotta-tint"]],
                  ["amber-text on surface — coin pill", t["amber-text"], t.surface],
                  ["violet-text on surface — XP numerals", t["violet-text"], t.surface],
                  ["ink-soft on surface — XP caption", t["ink-soft"], t.surface],
                ] as const
              ).map(([label, fg, bg]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 rounded-chip border border-border-track px-3 py-2"
                >
                  <span className="text-[12px]">{label}</span>
                  <Ratio text={fg} bg={bg} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        n="07"
        title="Breakpoints & the app frame"
        blurb="NFR-GEN-2. App screens are drawn in a 300×640 phone frame and built mobile-first; frame: is where they stop going edge-to-edge and become a centred card. Resize the window — the chips below light up as each breakpoint is reached."
      >
        <Card label="Scale">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border-track text-left">
                  <th className="py-2 pr-4 font-extrabold">Variant</th>
                  <th className="py-2 pr-4 font-extrabold">Min width</th>
                  <th className="py-2 pr-4 font-extrabold">What changes at it</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    [
                      "(base)",
                      "0",
                      "Mobile-first default. The app frame is edge-to-edge; safe-area insets apply.",
                    ],
                    [
                      "frame:",
                      "480px",
                      "The phone frame becomes a 400px card centred on the board — past the widest phone in portrait (430px).",
                    ],
                    [
                      "sm:",
                      "640px",
                      "Genuinely wide layouts only: this page's two-column grids, and later the marketing site and admin cards.",
                    ],
                    ["md:", "768px", "Unused so far. Reserved for INF-22's desktop pass."],
                    ["lg:", "1024px", "Unused so far. Reserved for INF-22's desktop pass."],
                  ] as const
                ).map(([variant, min, what]) => (
                  <tr key={variant} className="border-b border-border-track/60">
                    <td className="py-2.5 pr-4">
                      <code className="text-[12px] font-bold">{variant}</code>
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{min}</td>
                    <td className="py-2.5 pr-4 text-[12px] text-ink-soft">
                      {what}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11.5px] text-ink-soft">
            <code>frame</code> and <code>--container-app</code> are defined in{" "}
            <code>globals.css</code>; <code>sm</code> upward are Tailwind&rsquo;s
            defaults, deliberately left alone.
          </p>
        </Card>

        <Card label="Active breakpoints">
          {/* CSS-only, so it reports the real viewport rather than a value
              measured once at render and then left to go stale. */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["base", "flex"],
                ["frame", "hidden frame:flex"],
                ["sm", "hidden sm:flex"],
                ["md", "hidden md:flex"],
                ["lg", "hidden lg:flex"],
              ] as const
            ).map(([label, cls]) => (
              <span
                key={label}
                className={`${cls} items-center rounded-chip bg-sage-tint px-2.5 py-1 text-[11px] font-extrabold text-sage-text`}
              >
                {label} active
              </span>
            ))}
          </div>
          <p className="text-[11.5px] text-ink-soft">
            Chips appear as their breakpoint is reached. At a phone width only{" "}
            <code>base</code> shows.
          </p>
        </Card>

        <Card label="The frame, either side of the breakpoint">
          <p className="text-[11.5px] text-ink-soft">
            A real screen — <code>/login</code>, which uses the same{" "}
            <code>AppShell</code> — in iframes at 360px (a phone) and 500px (just
            past the breakpoint). Iframes are used deliberately: each one is a
            real viewport, so the media queries actually fire. A plain
            fixed-width <code>div</code> would render both identically, since{" "}
            <code>frame:</code> responds to the viewport and not to its parent.
          </p>
          <div className="flex flex-wrap items-start gap-4">
            {[360, 500].map((w) => (
              <div key={w} className="flex flex-col gap-1.5">
                <iframe
                  src="/login"
                  // Its own document, so its h1 does not join this page's outline.
                  title={`Login at ${w}px`}
                  loading="lazy"
                  className="rounded-chip border border-border-track bg-board"
                  style={{ width: w, height: 360, maxWidth: "100%" }}
                />
                <code className="text-[11px] text-ink-soft">
                  {w}px · {w < 480 ? "edge-to-edge" : "framed card"}
                </code>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section
        n="08"
        title="Level-up celebration"
        blurb="ECO-07, per design_handoff/ADDENDUM-levelup.md. Full-bleed terracotta, medallion, confetti — a dialog, so it opens rather than sitting on the page. A terracotta ground is the one surface in this palette where nothing reaches 3:1, so every value here is a documented AA exception: white on terracotta 2.86, #FBE3D8 on terracotta 2.54, terracotta on white 2.69, white on the 16% tile 2.40 (BPCA). The focus ring switches to white with a dark halo, which is the two-tone treatment the --focus-ring note in globals.css asks for."
      >
        <Card label="Open the real component">
          <LevelUpDemo />
        </Card>
      </Section>

      <Section
        n="09"
        title="Petting zoo"
        blurb="PET-01's zoo gallery card and PET-02's Sanctuary stage, per design_handoff/ADDENDUM-zoo-gallery.md. Real components, sample data — see the note on samplePet() above for why this page doesn't read from the database. Pet (PET-03) and Feed (PET-04) are live on the Sanctuary card, stopping on a stub notice rather than a real fetch. Customize (PET-05) is a plain link to /zoo/[id]/customize's own full-page screen, so it isn't demoed here."
      >
        <Card label="Gallery card — one needs-attention, one not">
          <div className="grid w-[300px] max-w-full grid-cols-2 gap-3">
            <ZooGalleryCard pet={samplePet("Fox kit", "/animals/fox.svg", 82, 24)} />
            <ZooGalleryCard pet={samplePet("Penguin kit", "/animals/penguin.svg", 58, 66)} />
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="w-[300px] max-w-full">
            <AnimalCard
              pet={samplePet("Koala kit", "/animals/koala.svg", 90, 10)}
              foodItems={SAMPLE_FOOD_ITEMS}
            />
          </div>
          <div className="w-[300px] max-w-full">
            <AnimalCard
              pet={samplePet("Fox kit", "/animals/fox.svg", 50, 40)}
              foodItems={SAMPLE_FOOD_ITEMS}
            />
          </div>
          <div className="w-[300px] max-w-full">
            <AnimalCard
              pet={samplePet("Penguin kit", "/animals/penguin.svg", 60, 85)}
              foodItems={SAMPLE_FOOD_ITEMS}
            />
          </div>
          <div className="w-[300px] max-w-full">
            <AnimalCard
              pet={samplePet("Koala kit", "/animals/koala.svg", 15, 20)}
              foodItems={[]}
            />
          </div>
        </div>
      </Section>

      <Section
        n="10"
        title="Achievements"
        blurb="PRO-07's ACHIEVEMENTS grid — one square tile per catalogue entry (prisma/seed.ts's four rows), earned or locked. The real grid on /profile reads live unlock state from achievementsForUser(); these three cards are the same component fed sample data, so every state is visible without needing a real account's progress."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Card label="Fresh account — nothing earned">
            <div className="w-[300px] max-w-full">
              <AchievementsGrid
                achievements={ACHIEVEMENT_CATALOGUE.map(([key, name, description]) =>
                  sampleAchievement(key, name, description, false),
                )}
              />
            </div>
          </Card>

          <Card label="Two earned">
            <div className="w-[300px] max-w-full">
              <AchievementsGrid
                achievements={ACHIEVEMENT_CATALOGUE.map(([key, name, description], index) =>
                  sampleAchievement(key, name, description, index === 1 || index === 3),
                )}
              />
            </div>
          </Card>

          <Card label="All earned">
            <div className="w-[300px] max-w-full">
              <AchievementsGrid
                achievements={ACHIEVEMENT_CATALOGUE.map(([key, name, description]) =>
                  sampleAchievement(key, name, description, true),
                )}
              />
            </div>
          </Card>
        </div>

        <Card label="Unlock celebration — open the real component">
          <p className="text-[11.5px] text-ink-soft">
            No frame in <code>design_handoff</code> draws this — added at the
            user&rsquo;s request after noticing the grid above just silently
            flips a tile with no moment marking it. Adapted from ECO-07&rsquo;s
            level-up screen: same full-bleed dialog, confetti and medallion,
            violet instead of terracotta so it reads as a different kind of
            event from a level crossing.
          </p>
          <AchievementUnlockDemo />
        </Card>
      </Section>

      <footer className="border-t border-border-track pt-6 text-[12px] text-ink-soft">
        Not linked from the app. Add more sections here as components land —
        task rows, store cards, the bottom nav and the date picker are all still
        to come.
      </footer>
    </main>
  );
}
