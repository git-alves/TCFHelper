"use client";

import { useState } from "react";
import { InactivityEmailKind, Locale } from "@prisma/client";
import type { InactivityEmailDisplay } from "@/lib/inactivity-emails";
import {
  inactivityEmailFooterCopy,
  inactivityEmailNoReplyNote,
  inactivityEmailUnsubscribeLabel,
} from "@/lib/inactivity-email-copy";

const locales = [
  { id: Locale.pt, label: "Português" },
  { id: Locale.en, label: "English" },
  { id: Locale.fr, label: "Français" },
  { id: Locale.es, label: "Español" },
] as const;
const kinds = [
  { id: InactivityEmailKind.SEVEN_DAY, label: "7 days without use" },
  { id: InactivityEmailKind.THIRTY_DAY, label: "30 days without use" },
] as const;
const key = (kind: InactivityEmailKind, locale: Locale) =>
  `${kind}:${locale}` as keyof InactivityEmailDisplay["templates"];

export function resetInactivityEmailTemplate<
  T extends { defaultSubject: string; defaultBody: string },
>(template: T) {
  return {
    ...template,
    subject: template.defaultSubject,
    body: template.defaultBody,
    customized: false,
  };
}

export function AdminInactivityEmailsForm({
  initialDisplay,
}: {
  initialDisplay: InactivityEmailDisplay;
}) {
  const [display, setDisplay] = useState(initialDisplay);
  const [kind, setKind] = useState<InactivityEmailKind>(
    InactivityEmailKind.SEVEN_DAY,
  );
  const [locale, setLocale] = useState<Locale>(Locale.pt);
  const [draft, setDraft] = useState(initialDisplay.templates);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEnableConfirmation, setShowEnableConfirmation] = useState(false);
  const [enableAcknowledged, setEnableAcknowledged] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const selectedKey = key(kind, locale);
  const selected = draft[selectedKey];
  const invalid =
    !selected.subject.trim() ||
    !selected.body.trim() ||
    /\r|\n/.test(selected.subject) ||
    /\{(?!name\}|appUrl\})[^}]+\}/.test(
      `${selected.subject} ${selected.body}`,
    ) ||
    selected.subject.includes("{appUrl}");
  const changed = JSON.stringify(draft) !== JSON.stringify(display.templates);
  const update = (field: "subject" | "body", value: string) =>
    setDraft((current) => ({
      ...current,
      [selectedKey]: { ...current[selectedKey], [field]: value },
    }));
  async function save(enabled = display.enabled) {
    if (invalid) return;
    setSaving(true);
    setStatus(null);
    try {
      const templates = Object.entries(draft).map(([name, value]) => {
        const [templateKind, templateLocale] = name.split(":");
        return {
          kind: templateKind as InactivityEmailKind,
          locale: templateLocale as Locale,
          subject: value.subject,
          body: value.body,
        };
      });
      const response = await fetch("/api/admin/inactivity-emails", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, templates }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDisplay(data);
      setDraft(data.templates);
      setStatus("Saved.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not save changes. Your edits are still here — try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function test() {
    if (invalid) return;
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/inactivity-emails/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          locale,
          subject: selected.subject,
          body: selected.body,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setStatus("Test sent to your email.");
    } catch {
      setStatus(
        "We couldn’t send the test. Check the email service configuration and try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <section className="rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
        <p className="font-semibold">
          Sending is {display.enabled ? "on" : "off"}
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {display.enabled
            ? "Eligible learners can receive saved emails automatically."
            : "You can edit, preview, and send yourself a test. Learners will not receive automatic emails."}
        </p>
        {!display.configured && (
          <p
            role="alert"
            className="mt-3 text-sm text-red-700 dark:text-red-300"
          >
            Email sending is unavailable because Resend is not configured.
            Missing: {display.missingConfiguration.join(", ")}.
          </p>
        )}
        {!display.legalAddressConfigured && (
          <p
            role="alert"
            className="mt-3 text-sm text-amber-700 dark:text-amber-300"
          >
            Canada&apos;s anti-spam law (CASL) requires a valid mailing address
            and a working contact in these emails. Add one before sending to
            learners.
          </p>
        )}
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={display.enabled}
            disabled={!display.configured || invalid || saving}
            onChange={(event) => {
              if (event.target.checked) setShowEnableConfirmation(true);
              else void save(false);
            }}
          />{" "}
          Send inactivity emails automatically
        </label>
      </section>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Email timing</legend>
        {kinds.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setKind(item.id)}
            className={`rounded-full border px-3 py-2 text-sm ${kind === item.id ? "bg-violet-100 dark:bg-violet-950" : ""}`}
          >
            {item.label}
            <span className="sr-only">, sent once per inactivity streak</span>
          </button>
        ))}
      </fieldset>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Language</legend>
        {locales.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setLocale(item.id)}
            className={`rounded-full border px-3 py-2 text-sm ${locale === item.id ? "bg-violet-100 dark:bg-violet-950" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </fieldset>
      <section className="rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
        <p className="text-sm">
          {selected.customized ? "Customized" : "Using built-in default"}
        </p>
        <label className="mt-3 block text-sm font-medium">
          Subject
          <input
            className="mt-1 w-full rounded border p-2"
            value={selected.subject}
            onChange={(event) => update("subject", event.target.value)}
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Email body
          <textarea
            rows={8}
            className="mt-1 w-full rounded border p-2"
            value={selected.body}
            onChange={(event) => update("body", event.target.value)}
          />
        </label>
        <p className="mt-2 text-xs text-zinc-500">
          Allowed placeholders: <code>{"{name}"}</code>{" "}
          <code>{"{appUrl}"}</code>. Use {"{appUrl}"} for the return button. The
          unsubscribe footer is added automatically and cannot be edited. Press
          Enter to create a line break.
        </p>
        {invalid && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            Enter a subject and email body, with only allowed placeholders.
          </p>
        )}
        <button
          type="button"
          className="mt-3 rounded border px-3 py-1 text-sm"
          onClick={() => setShowResetConfirmation(true)}
        >
          Reset to default
        </button>
      </section>
      <section className="rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
        <h2 className="font-semibold">Preview</h2>
        <p className="text-xs text-zinc-500">
          Preview only — sample values are shown.
        </p>
        <div className="mt-3 bg-[#f4f4f5] p-4 sm:p-10">
          <div className="mx-auto max-w-[560px] bg-white p-8 text-[#18181b]">
            <p className="font-sans text-xl font-bold leading-7 tracking-[-0.4px]">
              MyTCFLab
            </p>
            <h3 className="mt-[38px] font-sans text-[28px] font-bold leading-[34px] tracking-[-0.4px]">
              {selected.subject.replace(/\{name\}/g, "Alex")}
            </h3>
            <p className="mt-[18px] whitespace-pre-wrap font-sans text-base font-normal leading-[26px] text-[#52525b]">
              {selected.body
                .replace(/\{name\}/g, "Alex")
                .replace(/\{appUrl\}/g, "/dashboard")
                .replace(/<br\s*\/?\s*>/gi, "\n")}
            </p>
            <span className="mt-7 inline-flex rounded-lg bg-violet-700 px-[18px] py-3 font-sans text-sm font-semibold leading-5 text-white">
              {selected.button}
            </span>
            <p className="mt-7 font-sans text-[13px] leading-5 text-[#71717a]">
              {inactivityEmailNoReplyNote[locale]}
            </p>
            <p className="mt-6 border-t border-[#e4e4e7] pt-6 font-sans text-xs leading-[18px] text-[#71717a]">
              {inactivityEmailFooterCopy[locale]} MyTCFLab. {" "}
              <a
                href="#"
                onClick={(event) => event.preventDefault()}
                className="font-semibold text-[#5b21b6] underline"
              >
                {inactivityEmailUnsubscribeLabel[locale]}
              </a>
            </p>
          </div>
        </div>
      </section>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!changed || invalid || saving}
          onClick={() => void save()}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          disabled={invalid || saving || !display.configured}
          onClick={() => void test()}
          className="rounded-full border px-4 py-2 text-sm disabled:opacity-50"
        >
          Send a test to my email
        </button>
        {status && (
          <p role="status" className="self-center text-sm">
            {status}
          </p>
        )}
      </div>
      {showEnableConfirmation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="enable-inactivity-email-heading"
          className="rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]"
        >
          <h2 id="enable-inactivity-email-heading" className="font-semibold">
            Turn on inactivity emails?
          </h2>
          <p className="mt-2 text-sm">
            Eligible learners may start receiving the saved 7-day and 30-day
            emails automatically. Each email is sent once per inactivity streak.
            Learners who unsubscribe will not receive these emails.
          </p>
          <label className="mt-3 flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={enableAcknowledged}
              onChange={(event) => setEnableAcknowledged(event.target.checked)}
            />{" "}
            I confirm that MyTCFLab has a valid basis to email these learners
            and that the sender details are current.
          </label>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="rounded border px-3 py-1 text-sm"
              onClick={() => {
                setShowEnableConfirmation(false);
                setEnableAcknowledged(false);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!enableAcknowledged || saving}
              className="rounded bg-foreground px-3 py-1 text-sm text-background disabled:opacity-50"
              onClick={() => {
                setShowEnableConfirmation(false);
                setEnableAcknowledged(false);
                void save(true);
              }}
            >
              Turn on sending
            </button>
          </div>
        </div>
      )}
      {showResetConfirmation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-inactivity-email-heading"
          className="rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]"
        >
          <h2 id="reset-inactivity-email-heading" className="font-semibold">
            Reset this email to the built-in default?
          </h2>
          <p className="mt-2 text-sm">
            Your custom subject and body for{" "}
            {kind === InactivityEmailKind.SEVEN_DAY ? "7 days" : "30 days"} /{" "}
            {locales.find((item) => item.id === locale)?.label} will be
            replaced. This cannot be undone after saving.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="rounded border px-3 py-1 text-sm"
              onClick={() => setShowResetConfirmation(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-foreground px-3 py-1 text-sm text-background"
              onClick={() => {
                setDraft((current) => ({
                  ...current,
                  [selectedKey]: resetInactivityEmailTemplate(
                    current[selectedKey],
                  ),
                }));
                setShowResetConfirmation(false);
              }}
            >
              Reset to default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
