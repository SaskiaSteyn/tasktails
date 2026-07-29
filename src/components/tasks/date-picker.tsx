"use client";

import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * SHR-02 — inline date-picker popover. Consumed by TASK-02 now, and later
 * TASK-03.
 *
 * **Not a modal** (the mock is explicit about this): the panel attaches
 * directly beneath the trigger field and pushes the rest of the sheet's
 * content down, rather than overlaying it. Closes on an outside click or
 * Escape; there's no focus trap because it was deliberately not built as a
 * dialog.
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
}: {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => value ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function select(date: Date) {
    onChange(startOfDay(date));
    setOpen(false);
  }

  const today = startOfDay(new Date());

  return (
    <div ref={containerRef} className="relative">
      <label
        className={cn(
          "text-[11px] font-extrabold tracking-[0.4px]",
          open ? "text-terracotta" : "text-ink-soft",
        )}
      >
        {label}
      </label>

      <button
        type="button"
        onClick={() => {
          setViewMonth(value ?? new Date());
          setOpen((isOpen) => !isOpen);
        }}
        aria-expanded={open}
        className={cn(
          "mt-[6px] flex h-[44px] w-full items-center justify-between border px-[13px] text-[14px]",
          open
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
            className={open ? "text-terracotta" : "text-ink-disabled"}
            aria-hidden
          />
          {value ? TRIGGER_FORMAT.format(value) : "Pick a date"}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2.4}
          className={cn("transition-transform duration-120", open && "rotate-180 text-terracotta")}
          aria-hidden
        />
      </button>

      {open ? (
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
    </div>
  );
}
