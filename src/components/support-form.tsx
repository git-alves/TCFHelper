"use client";

import { useId, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useAppCopy, useAppLocale } from "@/components/app-locale-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useModalCloseControl, useModalCloseGuard } from "@/components/modal";
import { ThemedSelect } from "@/components/themed-select";
import {
  SUPPORT_ATTACHMENT_ACCEPT,
  SUPPORT_ATTACHMENT_MAX_BYTES,
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_TRIGGER_ID,
  formatSupportAttachmentLimit,
  isAcceptedSupportAttachment,
  isSupportCategory,
  type SupportCategory,
} from "@/lib/support-request";

type SupportCategoryChoice = SupportCategory | "";
type InvalidField = "category" | "details" | null;

interface SupportFormProps {
  email: string;
  name: string | null;
}

const SELECT_BUTTON_CLASSNAME =
  "flex w-full items-center justify-between gap-2 rounded-xl border border-black/[.15] bg-background px-4 py-2.5 text-left text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/[.2] dark:focus:border-violet-300 dark:focus:ring-violet-300/20 aria-invalid:border-red-500 dark:aria-invalid:border-red-400";
const SELECT_LIST_CLASSNAME =
  "absolute left-0 right-0 z-30 mt-1 flex max-h-60 flex-col gap-0.5 overflow-auto rounded-xl border border-black/[.15] bg-background p-1 shadow-lg dark:border-white/[.2]";

function AttachmentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-7 w-7" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m5.5 17 4.25-4.25 2.75 2.75 2-2L18.5 17" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.25 2.5h5l3 3v12h-8a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 2.5v3h3M7.25 11h5.5M7.25 14h5.5" />
    </svg>
  );
}

export function SupportForm({ email, name }: SupportFormProps) {
  const copy = useAppCopy();
  const { locale } = useAppLocale();
  const inputId = useId();
  const categoryHeadingId = useId();
  const detailsId = useId();
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);
  const [category, setCategory] = useState<SupportCategoryChoice>("");
  const [details, setDetails] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<InvalidField>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isDirty = category !== "" || details.trim() !== "" || attachment !== null;
  const { closeImmediately } = useModalCloseControl();
  useModalCloseGuard(() => {
    if (isSubmitting) return false;
    if (!isDirty) return true;
    setShowDiscardConfirm(true);
    return false;
  });

  const sender = name ? `${name} · ${email}` : email;
  const attachmentLimit = formatSupportAttachmentLimit(locale);
  const categoryOptions = [
    { value: "", label: copy.support.categoryPlaceholder },
    ...SUPPORT_CATEGORIES.map((value) => ({ value, label: copy.support.categories[value] })),
  ] as const;

  function clearAttachment() {
    setAttachment(null);
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  }

  function selectAttachment(file: File | null) {
    if (!file) return;

    if (
      file.size === 0 ||
      file.size > SUPPORT_ATTACHMENT_MAX_BYTES ||
      !isAcceptedSupportAttachment({ name: file.name, type: file.type })
    ) {
      clearAttachment();
      setError(copy.support.attachmentUnsupported);
      return;
    }

    setAttachment(file);
    setError("");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectAttachment(event.currentTarget.files?.[0] ?? null);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    selectAttachment(event.dataTransfer.files?.[0] ?? null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!isSupportCategory(category)) {
      setError(copy.support.categoryRequired);
      setInvalidField("category");
      document.getElementById(SUPPORT_CATEGORY_TRIGGER_ID)?.focus();
      return;
    }

    if (!details.trim()) {
      setError(copy.support.detailsRequired);
      setInvalidField("details");
      detailsRef.current?.focus();
      return;
    }

    setError("");
    setInvalidField(null);
    setIsSubmitting(true);
    try {
      const body = new FormData();
      body.set("category", category);
      body.set("details", details);
      if (attachment) body.set("attachment", attachment);

      const response = await fetch("/api/support", { method: "POST", body });
      if (!response.ok) throw new Error("Support request failed");

      setIsSent(true);
      setDetails("");
      clearAttachment();
      setCategory("");
    } catch {
      setError(copy.support.submitError);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <section className="flex min-h-72 flex-col items-start justify-center py-8" aria-live="polite">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4.5 4.5L19 7" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">{copy.support.successTitle}</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-600 dark:text-zinc-400">{copy.support.successDescription}</p>
        <button
          type="button"
          onClick={() => setIsSent(false)}
          className="mt-6 rounded-full border border-black/[.15] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
        >
          {copy.support.sendAnother}
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <p className="text-base leading-7 text-zinc-600 dark:text-zinc-300">{copy.support.intro}</p>

      <div>
        <label htmlFor={inputId} className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
          {copy.support.sendAs}
        </label>
        <input
          id={inputId}
          type="text"
          value={sender}
          readOnly
          aria-readonly="true"
          className="mt-2 w-full rounded-xl border border-black/[.1] bg-black/[.025] px-4 py-3 text-sm text-zinc-700 outline-none dark:border-white/[.12] dark:bg-white/[.035] dark:text-zinc-200"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span id={categoryHeadingId} className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
          {copy.support.categoryLabel} <span aria-hidden="true" className="text-red-600 dark:text-red-400">*</span>
        </span>
        <ThemedSelect<SupportCategoryChoice>
          id={SUPPORT_CATEGORY_TRIGGER_ID}
          value={category}
          onChange={(nextCategory) => {
            setCategory(nextCategory);
            setError("");
            setInvalidField(null);
          }}
          options={categoryOptions}
          ariaLabelledBy={categoryHeadingId}
          ariaRequired
          ariaInvalid={invalidField === "category"}
          buttonClassName={SELECT_BUTTON_CLASSNAME}
          listClassName={SELECT_LIST_CLASSNAME}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={detailsId} className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
          {copy.support.detailsLabel} <span aria-hidden="true" className="text-red-600 dark:text-red-400">*</span>
        </label>
        <textarea
          ref={detailsRef}
          id={detailsId}
          value={details}
          onChange={(event) => {
            setDetails(event.target.value);
            if (invalidField === "details") {
              setError("");
              setInvalidField(null);
            }
          }}
          required
          aria-required="true"
          aria-invalid={invalidField === "details"}
          maxLength={10_000}
          rows={5}
          placeholder={copy.support.detailsPlaceholder}
          className="w-full resize-y rounded-xl border border-black/[.15] bg-background px-4 py-3 text-sm leading-6 outline-none placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 aria-invalid:border-red-500 dark:border-white/[.2] dark:placeholder:text-zinc-400 dark:focus:border-violet-300 dark:focus:ring-violet-300/20 dark:aria-invalid:border-red-400"
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
          {copy.support.attachmentsLabel} <span className="normal-case tracking-normal">({copy.support.optional})</span>
        </p>
        {attachment ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[.12] px-4 py-3 dark:border-white/[.16]">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-zinc-500 dark:text-zinc-400"><FileIcon /></span>
              <span className="truncate text-sm">{attachment.name}</span>
            </div>
            <button
              type="button"
              onClick={clearAttachment}
              className="shrink-0 text-sm text-violet-700 underline underline-offset-2 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
            >
              {copy.support.removeAttachment}
            </button>
          </div>
        ) : (
          <label
            htmlFor={`${inputId}-attachment`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-black/[.15] px-4 py-7 text-center text-zinc-500 transition-colors hover:border-violet-500/60 hover:bg-violet-500/[.035] dark:border-white/[.18] dark:text-zinc-400 dark:hover:border-violet-300/70 dark:hover:bg-violet-300/[.06]"
          >
            <AttachmentIcon />
            <span className="mt-3 text-sm">
              {copy.support.dropFile} <span className="text-violet-700 underline underline-offset-2 dark:text-violet-300">{copy.support.browse}</span>
            </span>
            <span className="mt-1 text-xs">{copy.support.attachmentHint({ limit: attachmentLimit })}</span>
          </label>
        )}
        <input
          ref={attachmentInputRef}
          id={`${inputId}-attachment`}
          type="file"
          accept={SUPPORT_ATTACHMENT_ACCEPT}
          onChange={onFileChange}
          className="sr-only"
        />
      </div>

      {error && <p role="alert" className="-mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
      >
        {isSubmitting ? copy.support.submitting : copy.support.submit}
      </button>

      <ConfirmDialog
        open={showDiscardConfirm}
        title={copy.support.discardDraftTitle}
        description={copy.support.discardDraftDescription}
        confirmLabel={copy.support.discardDraftConfirm}
        cancelLabel={copy.common.cancel}
        onCancel={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          closeImmediately();
        }}
      />
    </form>
  );
}
