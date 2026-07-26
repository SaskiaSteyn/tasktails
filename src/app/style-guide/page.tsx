import type { Metadata } from "next";
import Image from "next/image";

import { AuthBrandMark } from "@/components/auth/auth-screen";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { GoogleMark } from "@/components/ui/google-mark";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { AA_TEXT, contrast, readColorTokens } from "@/lib/contrast";

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
    <section className="flex flex-col gap-4">
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

function Ratio({ value, threshold = AA_TEXT }: { value: number; threshold?: number }) {
  const pass = value >= threshold;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-[11px] font-extrabold ${
        pass
          ? "bg-sage-tint text-sage-text"
          : "bg-urgency-tint text-urgency-text"
      }`}
    >
      {value.toFixed(2)}:1 {pass ? "PASS" : "FAIL"}
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
    <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-12 px-5 py-10 sm:px-8 sm:py-14">
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
        blurb="NFR-GEN-1 requires 4.5:1 for text. Ratios are computed from the shipped token values against every surface the token appears on. Anything passing on the board passes everywhere, since the board is the darkest surface."
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
                        <Ratio value={contrast(t[name], t[s])} />
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
                <Ratio value={contrast("#FFFFFF", t[name])} />
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

      <footer className="border-t border-border-track pt-6 text-[12px] text-ink-soft">
        Not linked from the app. Add more sections here as components land —
        task rows, store cards, progress bars, the bottom nav and the date picker
        are all still to come.
      </footer>
    </main>
  );
}
