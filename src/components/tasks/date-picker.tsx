"use client";

import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { hasDueTime } from "@/lib/day";

/**
 * SHR-02 — inline date-picker popover. Consumed by TASK-02 now, and later
 * TASK-03.
 *
 * **Not a modal** (the mock is explicit about this): the panel attaches
 * directly beneath the trigger field and pushes the rest of the sheet's
 * content down, rather than overlaying it. Closes on an outside click or
 * Escape; there's no focus trap because it was deliberately not built as a
 * dialog.
 *
 * #272 — because the panel pushes rather than overlays, opening it inside a
 * short scroller (the create-task sheet) can leave the calendar below the
 * fold. `scrollIntoViewOnOpen` brings the whole control back into view on
 * open; opt-in, since the edit screen scrolls the page rather than a sheet
 * and doesn't want it.
 */

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** The coming Saturday — today itself if today already is one. */
function nextSaturday(from: Date): Date {
  const daysUntilSaturday = (6 - from.getDay() + 7) % 7;
  return addDays(from, daysUntilSaturday);
}

/** Monday-first weekday index (0 = Monday .. 6 = Sunday), matching the mock's M T W T F S S header. */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Full 7-wide grid for the month `viewMonth` falls in, padded with adjacent-month days. */
function monthGrid(viewMonth: Date): Date[] {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0,
  ).getDate();
  const leading = mondayIndex(first);
  const trailing = (7 - ((leading + daysInMonth) % 7)) % 7;
  const gridStart = addDays(first, -leading);

  return Array.from({ length: leading + daysInMonth + trailing }, (_, i) =>
    addDays(gridStart, i),
  );
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = [0, 10, 20, 30, 40, 50];
const pad = (n: number) => String(n).padStart(2, "0");

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const MONTH_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  month: "long",
  year: "numeric",
});
const TRIGGER_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function DatePicker({
  value,
  onChange,
  label,
  scrollIntoViewOnOpen = false,
}: {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label: string;
  scrollIntoViewOnOpen?: boolean;
}) {
  // #336 — one dropdown at a time: the calendar or the time lists.
  const [panel, setPanel] = useState<"date" | "time" | null>(null);
  const open = panel !== null;
  const dateOpen = panel === "date";
  const timeOpen = panel === "time";
  // The hour picked in the time dropdown, waiting for its minute.
  const [pendingHour, setPendingHour] = useState<number | null>(null);
  const [viewMonth, setViewMonth] = useState(() => value ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // `block: "nearest"` scrolls the minimum needed and does nothing when the
    // control is already fully visible. No `behavior` — that defers to CSS
    // `scroll-behavior`, which globals.css already forces to `auto` under
    // both reduce-motion switches, so this is honoured for free.
    if (scrollIntoViewOnOpen) containerRef.current?.scrollIntoView({ block: "nearest" });

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setPanel(null);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, scrollIntoViewOnOpen]);

  // #336 — changing the day keeps whatever time is already set.
  function select(date: Date) {
    const day = startOfDay(date);
    if (value) day.setHours(value.getHours(), value.getMinutes());
    onChange(day);
    setPanel(null);
  }

  const time = value && hasDueTime(value) ? value : null;

  // null clears back to a date-only deadline (local midnight, see
  // `hasDueTime`). A time picked before any date means today.
  function selectTime(hours: number | null, minutes = 0) {
    const next = startOfDay(value ?? new Date());
    if (hours !== null) next.setHours(hours, minutes);
    onChange(next);
    setPanel(null);
  }

  const today = startOfDay(new Date());

  return (
    <div ref={containerRef} className="relative">
      <label
        className={cn(
          "text-[11px] font-extrabold tracking-[0.4px]",
          dateOpen ? "text-terracotta" : "text-ink-soft",
        )}
      >
        {label}
      </label>

      <button
        type="button"
        onClick={() => {
          setViewMonth(value ?? new Date());
          setPanel((current) => (current === "date" ? null : "date"));
        }}
        aria-expanded={dateOpen}
        className={cn(
          "mt-[6px] flex h-[44px] w-full items-center justify-between border px-[13px] text-[14px]",
          dateOpen
            ? "rounded-t-[12px] rounded-b-none border-2 border-b-0 border-terracotta bg-surface"
            : "rounded-input border-border-input bg-input",
        )}
      >
        <span
          className={cn(
            "flex items-center gap-2 font-bold",
            value ? "text-ink" : "font-normal text-ink-disabled",
          )}
        >
          <Calendar
            size={15}
            strokeWidth={2.2}
            className={dateOpen ? "text-terracotta" : "text-ink-disabled"}
            aria-hidden
          />
          {value ? TRIGGER_FORMAT.format(value) : "Pick a date"}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2.4}
          className={cn("transition-transform duration-120", dateOpen && "rotate-180 text-terracotta")}
          aria-hidden
        />
      </button>

      {dateOpen ? (
        <div className="rounded-b-[18px] border-x-2 border-b-2 border-t border-terracotta border-t-[#F3D9CE] bg-surface p-3 shadow-popover">
          <div className="mb-3 flex gap-[6px]">
            {[
              { label: "Today", date: today },
              { label: "Tomorrow", date: addDays(today, 1) },
              { label: "Weekend", date: nextSaturday(today) },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => select(chip.date)}
                className="flex-1 rounded-[9px] border border-border-input bg-input py-[7px] text-center text-[10.5px] font-extrabold text-ink-soft transition-colors duration-120 hover:bg-warm"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="mb-[10px] flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setViewMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
              className="flex size-7 items-center justify-center rounded-[8px] border border-border-input bg-input text-ink-soft"
            >
              <ChevronLeft size={14} strokeWidth={2.4} aria-hidden />
            </button>
            <span className="font-display text-[14px] font-semibold">
              {MONTH_FORMAT.format(viewMonth)}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setViewMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
              className="flex size-7 items-center justify-center rounded-[8px] border border-border-input bg-input text-ink-soft"
            >
              <ChevronRight size={14} strokeWidth={2.4} aria-hidden />
            </button>
          </div>

          <div aria-hidden className="mb-[3px] grid grid-cols-7 gap-px">
            {WEEKDAY_LABELS.map((day, i) => (
              <div
                key={i}
                className="py-[3px] text-center text-[9.5px] font-extrabold text-ink-disabled"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px">
            {monthGrid(viewMonth).map((date) => {
              const inMonth = date.getMonth() === viewMonth.getMonth();
              const isToday = isSameDay(date, today);
              const isSelected = value ? isSameDay(date, value) : false;

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  aria-label={DAY_LABEL_FORMAT.format(date)}
                  aria-pressed={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => select(date)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-full text-[11px] font-bold",
                    !inMonth && "text-checkbox",
                    inMonth && !isSelected && !isToday && "text-ink",
                    isToday && !isSelected && "border-[1.5px] border-terracotta font-extrabold text-terracotta",
                    isSelected && "bg-terracotta font-extrabold text-white shadow-btn",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* #336 — built rather than `<input type="time">`, whose popup the
          browser draws and no stylesheet reaches. Same trigger and attached
          panel as the calendar: hours beside minutes, hour first. */}
      <div
        className={cn(
          "mt-3 text-[11px] font-extrabold tracking-[0.4px]",
          timeOpen ? "text-terracotta" : "text-ink-soft",
        )}
      >
        TIME (OPTIONAL)
      </div>
      <button
        type="button"
        onClick={() => {
          setPendingHour(time ? time.getHours() : null);
          setPanel((current) => (current === "time" ? null : "time"));
        }}
        aria-expanded={timeOpen}
        className={cn(
          "mt-[6px] flex h-[44px] w-full items-center justify-between border px-[13px] text-[14px]",
          timeOpen
            ? "rounded-t-[12px] rounded-b-none border-2 border-b-0 border-terracotta bg-surface"
            : "rounded-input border-border-input bg-input",
        )}
      >
        <span
          className={cn(
            "flex items-center gap-2 font-bold",
            time ? "text-ink" : "font-normal text-ink-disabled",
          )}
        >
          <Clock
            size={15}
            strokeWidth={2.2}
            className={timeOpen ? "text-terracotta" : "text-ink-disabled"}
            aria-hidden
          />
          {time ? `${pad(time.getHours())}:${pad(time.getMinutes())}` : "Any time"}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2.4}
          className={cn("transition-transform duration-120", timeOpen && "rotate-180 text-terracotta")}
          aria-hidden
        />
      </button>

      {timeOpen ? (
        <div className="rounded-b-[18px] border-x-2 border-b-2 border-t border-terracotta border-t-[#F3D9CE] bg-surface p-3 shadow-popover">
          <div className="grid grid-cols-2 gap-3">
            <TimeList
              heading="HOUR"
              options={HOURS}
              selected={pendingHour}
              onSelect={setPendingHour}
            />
            <TimeList
              heading="MINUTE"
              options={MINUTES}
              selected={time && time.getHours() === pendingHour ? time.getMinutes() : null}
              // 00:00 is how a date-only deadline is stored (`hasDueTime`),
              // so midnight on the dot can't be a time of its own.
              isDisabled={(minute) => pendingHour === null || (pendingHour === 0 && minute === 0)}
              onSelect={(minute) => selectTime(pendingHour, minute)}
            />
          </div>
          {time ? (
            <button
              type="button"
              onClick={() => selectTime(null)}
              className="mt-3 w-full rounded-[9px] border border-border-input bg-input py-[7px] text-center text-[10.5px] font-extrabold text-ink-soft transition-colors duration-120 hover:bg-warm"
            >
              Any time
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * One column of the time dropdown — the hours, or the minutes. On open it scrolls itself — not
 * the page, which `scrollIntoView` would also move — to centre the selection.
 */
function TimeList({
  heading,
  options,
  selected,
  isDisabled = () => false,
  onSelect,
}: {
  heading: string;
  options: number[];
  selected: number | null;
  isDisabled?: (option: number) => boolean;
  onSelect: (option: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>("[aria-pressed=true]");
    if (list && current) {
      list.scrollTop = current.offsetTop - (list.clientHeight - current.clientHeight) / 2;
    }
  }, []);

  return (
    <div className="min-w-0">
      <div className="mb-[6px] text-center text-[9.5px] font-extrabold text-ink-disabled">
        {heading}
      </div>
      <div ref={listRef} className="relative flex max-h-[176px] flex-col gap-px overflow-y-auto overscroll-contain">
        {options.map((option) => {
          const isSelected = option === selected;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              disabled={isDisabled(option)}
              onClick={() => onSelect(option)}
              className={cn(
                "flex-none rounded-[9px] py-[7px] text-center text-[13px] font-bold tabular-nums",
                isSelected
                  ? "bg-terracotta font-extrabold text-white"
                  : "text-ink hover:bg-warm disabled:text-checkbox disabled:hover:bg-transparent",
              )}
            >
              {pad(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
