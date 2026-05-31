"use client";

import { useCallback } from "react";
import { AppSegmentGroup, AppSegmentOption } from "@/components/ui/app-segment-group";

const AVAILABILITY = {
  manualOnly: "manual_only",
  scheduleOnly: "schedule_only",
  scheduleAndManual: "schedule_and_manual",
} as const;

type AvailabilityMode = (typeof AVAILABILITY)[keyof typeof AVAILABILITY];

const WEEKDAYS: { label: string; value: number }[] = [
  { label: "Mon", value: 0 },
  { label: "Tue", value: 1 },
  { label: "Wed", value: 2 },
  { label: "Thu", value: 3 },
  { label: "Fri", value: 4 },
  { label: "Sat", value: 5 },
  { label: "Sun", value: 6 },
];

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export type HumanEscalationConfig = {
  availability_mode: AvailabilityMode;
  manual_online: boolean;
  estimated_response_minutes: number;
  timezone: string;
  business_day_start: string;
  business_day_end: string;
  business_days: number[];
};

function parseMode(raw: unknown): AvailabilityMode {
  if (raw === AVAILABILITY.scheduleOnly || raw === AVAILABILITY.scheduleAndManual) {
    return raw;
  }
  return AVAILABILITY.manualOnly;
}

function toTimeInputValue(raw: unknown, fallback: string): string {
  if (typeof raw !== "string" || !raw.trim()) {
    return fallback;
  }
  const s = raw.trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) {
    return fallback;
  }
  const hh = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseBusinessDays(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [0, 1, 2, 3, 4];
  }
  const out: number[] = [];
  for (const x of raw) {
    const n = typeof x === "number" ? x : Number(x);
    if (Number.isInteger(n) && n >= 0 && n <= 6) {
      out.push(n);
    }
  }
  return out.length ? [...new Set(out)].sort((a, b) => a - b) : [0, 1, 2, 3, 4];
}

export function parseHumanEscalationConfig(raw: Record<string, unknown>): HumanEscalationConfig {
  return {
    availability_mode: parseMode(raw.availability_mode),
    manual_online: Boolean(raw.manual_online),
    estimated_response_minutes:
      typeof raw.estimated_response_minutes === "number" ? raw.estimated_response_minutes : 15,
    timezone: typeof raw.timezone === "string" && raw.timezone.trim() ? raw.timezone.trim() : "UTC",
    business_day_start: toTimeInputValue(raw.business_day_start, "09:00"),
    business_day_end: toTimeInputValue(raw.business_day_end, "17:00"),
    business_days: parseBusinessDays(raw.business_days),
  };
}

export function humanEscalationConfigToPayload(config: HumanEscalationConfig): Record<string, unknown> {
  return {
    availability_mode: config.availability_mode,
    manual_online: config.manual_online,
    estimated_response_minutes: config.estimated_response_minutes,
    timezone: config.timezone,
    business_day_start: config.business_day_start,
    business_day_end: config.business_day_end,
    business_days: config.business_days,
  };
}

export function HumanEscalationSettings({
  value,
  onChange,
}: {
  value: HumanEscalationConfig;
  onChange: (next: HumanEscalationConfig) => void;
}) {
  const patch = useCallback(
    (partial: Partial<HumanEscalationConfig>) => {
      onChange({ ...value, ...partial });
    },
    [onChange, value]
  );

  const toggleWeekday = useCallback(
    (day: number) => {
      const prev = value.business_days;
      if (prev.includes(day)) {
        const next = prev.filter((d) => d !== day);
        patch({ business_days: next.length ? next : prev });
        return;
      }
      patch({ business_days: [...prev, day].sort((a, b) => a - b) });
    },
    [patch, value.business_days]
  );

  const showManualToggle =
    value.availability_mode === AVAILABILITY.manualOnly ||
    value.availability_mode === AVAILABILITY.scheduleAndManual;
  const showScheduleFields =
    value.availability_mode === AVAILABILITY.scheduleOnly ||
    value.availability_mode === AVAILABILITY.scheduleAndManual;

  return (
    <div className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
      <h2 className="ds-app-section-title mb-2 text-base">Escalation behavior</h2>
      <p className="text-ds-on-surface-variant mb-6 text-sm leading-relaxed">
        When the AI escalates, customers either see a live response estimate (when you count as available) or are guided
        toward email follow-up. Availability below controls which path applies, not whether escalation is allowed.
      </p>

      <fieldset className="space-y-3">
        <legend className="ds-app-kicker text-ds-on-surface-variant mb-2 block">When are you “online” for a live ETA?</legend>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name="availability_mode"
            className="border-ds-outline mt-1 size-4"
            checked={value.availability_mode === AVAILABILITY.manualOnly}
            onChange={() => patch({ availability_mode: AVAILABILITY.manualOnly })}
          />
          <span>
            <span className="text-ds-on-surface block text-sm font-semibold">Only when I mark myself available now</span>
            <span className="ds-app-body-muted">
              Live ETA uses your “Available now” toggle and the typical reply time below. Outside that, customers see the
              email path.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name="availability_mode"
            className="border-ds-outline mt-1 size-4"
            checked={value.availability_mode === AVAILABILITY.scheduleOnly}
            onChange={() => patch({ availability_mode: AVAILABILITY.scheduleOnly })}
          />
          <span>
            <span className="text-ds-on-surface block text-sm font-semibold">During my business hours only</span>
            <span className="ds-app-body-muted">
              Live ETA applies automatically in the hours and days you set (in your time zone). Otherwise, customers see
              the email path.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name="availability_mode"
            className="border-ds-outline mt-1 size-4"
            checked={value.availability_mode === AVAILABILITY.scheduleAndManual}
            onChange={() => patch({ availability_mode: AVAILABILITY.scheduleAndManual })}
          />
          <span>
            <span className="text-ds-on-surface block text-sm font-semibold">
              Business hours, or when I mark myself available now
            </span>
            <span className="ds-app-body-muted">
              Combines scheduled hours with an optional “Available now” override (for early/late coverage).
            </span>
          </span>
        </label>
      </fieldset>

      {showManualToggle ? (
        <label className="mt-6 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="border-ds-outline mt-1 size-4 rounded"
            checked={value.manual_online}
            onChange={(e) => patch({ manual_online: e.target.checked })}
          />
          <span>
            <span className="text-ds-on-surface block text-sm font-semibold">Available now</span>
            <span className="ds-app-body-muted">
              Turn on when someone on your team is actively monitoring chat{value.availability_mode === AVAILABILITY.scheduleAndManual ? " outside the schedule above" : ""}.
            </span>
          </span>
        </label>
      ) : null}

      {showScheduleFields ? (
        <div className="border-ds-outline mt-6 space-y-4 rounded-ds-lg border bg-ds-sidebar/40 p-4">
          <p className="ds-app-card-title">Business hours</p>
          <p className="ds-app-body-muted">
            Used to decide live ETA vs email when schedule-based availability is on. Times use a 24-hour clock in the
            time zone below (Monday = first day).
          </p>
          <div>
            <label className="ds-app-kicker text-ds-on-surface-variant mb-1 block">Time zone</label>
            <input
              type="text"
              list="human-escalation-tz"
              className="ds-app-field max-w-md rounded-ds-md"
              value={value.timezone}
              onChange={(e) => patch({ timezone: e.target.value.trim() || "UTC" })}
              placeholder="e.g. America/Los_Angeles"
              spellCheck={false}
            />
            <datalist id="human-escalation-tz">
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="ds-app-kicker text-ds-on-surface-variant mb-1 block">Opens</label>
              <input
                type="time"
                className="ds-app-field rounded-ds-md"
                value={value.business_day_start}
                onChange={(e) => patch({ business_day_start: e.target.value || "09:00" })}
              />
            </div>
            <div>
              <label className="ds-app-kicker text-ds-on-surface-variant mb-1 block">Closes</label>
              <input
                type="time"
                className="ds-app-field rounded-ds-md"
                value={value.business_day_end}
                onChange={(e) => patch({ business_day_end: e.target.value || "17:00" })}
              />
            </div>
          </div>
          <div>
            <span className="ds-app-kicker text-ds-on-surface-variant mb-2 block">Days</span>
            <AppSegmentGroup aria-label="Business days" mode="multiple">
              {WEEKDAYS.map(({ label, value: dayValue }) => (
                <AppSegmentOption
                  key={dayValue}
                  selected={value.business_days.includes(dayValue)}
                  onSelect={() => toggleWeekday(dayValue)}
                  toggle
                >
                  {label}
                </AppSegmentOption>
              ))}
            </AppSegmentGroup>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <label className="ds-app-kicker text-ds-on-surface-variant mb-2 block">
          Typical first reply when you’re available (minutes)
        </label>
        <input
          type="number"
          min={1}
          max={240}
          className="ds-app-field max-w-[10rem] rounded-ds-md"
          value={value.estimated_response_minutes}
          onChange={(e) => patch({ estimated_response_minutes: Number(e.target.value) || 15 })}
        />
        <p className="ds-app-body-muted mt-1">
          Shown as the live ETA when you count as available (manual toggle and/or business hours, depending on your
          choice above).
        </p>
      </div>
    </div>
  );
}
