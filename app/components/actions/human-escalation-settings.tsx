"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiActionCatalogEntry } from "@/components/actions/action-catalog-types";
import { BackendApiError, backendFetch } from "@/lib/backend-api";

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

type Props = {
  agentId: string;
  catalogEntry: ApiActionCatalogEntry;
  onSaved?: () => void;
};

function parseMode(raw: unknown): AvailabilityMode {
  if (raw === AVAILABILITY.scheduleOnly || raw === AVAILABILITY.scheduleAndManual) {
    return raw;
  }
  return AVAILABILITY.manualOnly;
}

/** `<input type="time">` expects HH:MM; API may store HH:MM:SS. */
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

export function HumanEscalationSettings({ agentId, catalogEntry, onSaved }: Props) {
  const cfg = (catalogEntry.config ?? {}) as Record<string, unknown>;

  const [availabilityMode, setAvailabilityMode] = useState<AvailabilityMode>(() => parseMode(cfg.availability_mode));
  const [manualOnline, setManualOnline] = useState(Boolean(cfg.manual_online));
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    typeof cfg.estimated_response_minutes === "number" ? cfg.estimated_response_minutes : 15
  );
  const [timezone, setTimezone] = useState(
    typeof cfg.timezone === "string" && cfg.timezone.trim() ? cfg.timezone.trim() : "UTC"
  );
  const [businessDayStart, setBusinessDayStart] = useState(() =>
    toTimeInputValue(cfg.business_day_start, "09:00")
  );
  const [businessDayEnd, setBusinessDayEnd] = useState(() => toTimeInputValue(cfg.business_day_end, "17:00"));
  const [businessDays, setBusinessDays] = useState<number[]>(() => parseBusinessDays(cfg.business_days));
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    setAvailabilityMode(parseMode(cfg.availability_mode));
    setManualOnline(Boolean(cfg.manual_online));
    setEstimatedMinutes(
      typeof cfg.estimated_response_minutes === "number" ? cfg.estimated_response_minutes : 15
    );
    setTimezone(typeof cfg.timezone === "string" && cfg.timezone.trim() ? cfg.timezone.trim() : "UTC");
    setBusinessDayStart(toTimeInputValue(cfg.business_day_start, "09:00"));
    setBusinessDayEnd(toTimeInputValue(cfg.business_day_end, "17:00"));
    setBusinessDays(parseBusinessDays(cfg.business_days));
  }, [catalogEntry.config]);

  const toggleWeekday = useCallback((value: number) => {
    setBusinessDays((prev) => {
      if (prev.includes(value)) {
        const next = prev.filter((d) => d !== value);
        return next.length ? next : prev;
      }
      return [...prev, value].sort((a, b) => a - b);
    });
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setBanner(null);
    try {
      await backendFetch(`/api/v1/agents/${agentId}/actions/${encodeURIComponent("human.escalate")}`, {
        method: "PATCH",
        body: JSON.stringify({
          config: {
            availability_mode: availabilityMode,
            manual_online: manualOnline,
            estimated_response_minutes: estimatedMinutes,
            timezone,
            business_day_start: businessDayStart,
            business_day_end: businessDayEnd,
            business_days: businessDays,
          },
        }),
      });
      onSaved?.();
    } catch (e) {
      setBanner(
        e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not save settings"
      );
    } finally {
      setSaving(false);
    }
  }, [
    agentId,
    availabilityMode,
    businessDayEnd,
    businessDayStart,
    businessDays,
    estimatedMinutes,
    manualOnline,
    onSaved,
    timezone,
  ]);

  const showManualToggle =
    availabilityMode === AVAILABILITY.manualOnly || availabilityMode === AVAILABILITY.scheduleAndManual;
  const showScheduleFields =
    availabilityMode === AVAILABILITY.scheduleOnly || availabilityMode === AVAILABILITY.scheduleAndManual;

  return (
    <div className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
      <h2 className="ds-app-section-title mb-2 text-base">Escalation behavior</h2>
      <p className="text-ds-on-surface-variant mb-6 text-sm leading-relaxed">
        When the AI escalates, customers either see a live response estimate (when you count as available) or are guided
        toward email follow-up. Availability below controls which path applies—not whether escalation itself is allowed.
      </p>

      {banner ? (
        <div className="border-ds-outline mb-4 rounded-ds-lg border bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {banner}
        </div>
      ) : null}

      <fieldset className="space-y-3">
        <legend className="ds-app-kicker text-ds-on-surface-variant mb-2 block">When are you “online” for a live ETA?</legend>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name="availability_mode"
            className="border-ds-outline mt-1 size-4"
            checked={availabilityMode === AVAILABILITY.manualOnly}
            onChange={() => setAvailabilityMode(AVAILABILITY.manualOnly)}
          />
          <span>
            <span className="text-ds-on-surface block text-sm font-semibold">Only when I mark myself available now</span>
            <span className="text-ds-on-surface-variant text-xs">
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
            checked={availabilityMode === AVAILABILITY.scheduleOnly}
            onChange={() => setAvailabilityMode(AVAILABILITY.scheduleOnly)}
          />
          <span>
            <span className="text-ds-on-surface block text-sm font-semibold">During my business hours only</span>
            <span className="text-ds-on-surface-variant text-xs">
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
            checked={availabilityMode === AVAILABILITY.scheduleAndManual}
            onChange={() => setAvailabilityMode(AVAILABILITY.scheduleAndManual)}
          />
          <span>
            <span className="text-ds-on-surface block text-sm font-semibold">
              Business hours, or when I mark myself available now
            </span>
            <span className="text-ds-on-surface-variant text-xs">
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
            checked={manualOnline}
            onChange={(e) => setManualOnline(e.target.checked)}
          />
          <span>
            <span className="text-ds-on-surface block text-sm font-semibold">Available now</span>
            <span className="text-ds-on-surface-variant text-xs">
              Turn on when someone on your team is actively monitoring chat{availabilityMode === AVAILABILITY.scheduleAndManual ? " outside the schedule above" : ""}.
            </span>
          </span>
        </label>
      ) : null}

      {showScheduleFields ? (
        <div className="border-ds-outline mt-6 space-y-4 rounded-ds-lg border bg-ds-sidebar/40 p-4">
          <p className="text-ds-on-surface text-sm font-semibold">Business hours</p>
          <p className="text-ds-on-surface-variant text-xs leading-relaxed">
            Used to decide live ETA vs email when schedule-based availability is on. Times use a 24-hour clock in the
            time zone below (Monday = first day).
          </p>
          <div>
            <label className="ds-app-kicker text-ds-on-surface-variant mb-1 block">Time zone</label>
            <input
              type="text"
              list="human-escalation-tz"
              className="ds-app-field max-w-md rounded-ds-md"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value.trim() || "UTC")}
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
                value={businessDayStart}
                onChange={(e) => setBusinessDayStart(e.target.value || "09:00")}
              />
            </div>
            <div>
              <label className="ds-app-kicker text-ds-on-surface-variant mb-1 block">Closes</label>
              <input
                type="time"
                className="ds-app-field rounded-ds-md"
                value={businessDayEnd}
                onChange={(e) => setBusinessDayEnd(e.target.value || "17:00")}
              />
            </div>
          </div>
          <div>
            <span className="ds-app-kicker text-ds-on-surface-variant mb-2 block">Days</span>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(({ label, value }) => (
                <label
                  key={value}
                  className="border-ds-outline flex cursor-pointer items-center gap-2 rounded-ds-md border px-2 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    className="border-ds-outline size-4 rounded"
                    checked={businessDays.includes(value)}
                    onChange={() => toggleWeekday(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
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
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(Number(e.target.value) || 15)}
        />
        <p className="text-ds-on-surface-variant mt-1 text-xs">
          Shown as the live ETA when you count as available (manual toggle and/or business hours, depending on your
          choice above).
        </p>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover mt-6 rounded-ds-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-45"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
