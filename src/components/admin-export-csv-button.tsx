"use client";

import { useState } from "react";

const FALLBACK_FILENAME = "export.csv";
const FILENAME_PATTERN = /filename="([^"]+)"/;

export type CsvExportOutcome =
  | { ok: true; blob: Blob; filename: string }
  | { ok: false; message: string };

/**
 * Despite the name, nothing here is CSV-specific: the file name comes from the
 * response's Content-Disposition, so the same button also downloads the
 * operational log's .txt export.
 *
 * An export can legitimately refuse (see MAX_ACCESS_CODES_EXPORT_ROWS /
 * MAX_USERS_EXPORT_ROWS) rather than silently omit rows past its cap, so
 * this cannot be a plain `<a href>` download link -- the response has to be
 * inspected before anything is handed to the browser as a file.
 */
export async function requestCsvExport(
  href: string,
  fetchImpl: typeof fetch = fetch,
  fallbackFilename: string = FALLBACK_FILENAME,
): Promise<CsvExportOutcome> {
  try {
    const response = await fetchImpl(href);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, message: body?.error ?? "Could not generate the export. Please try again." };
    }

    const filenameMatch = response.headers.get("Content-Disposition")?.match(FILENAME_PATTERN);
    return { ok: true, blob: await response.blob(), filename: filenameMatch?.[1] ?? fallbackFilename };
  } catch {
    return { ok: false, message: "Could not reach the admin service. Please try again." };
  }
}

/** Downloads a blob without navigating away from the current admin page. */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function AdminExportCsvButton({
  href,
  label = "Export CSV",
  fallbackFilename,
  hint,
}: {
  href: string;
  label?: string;
  /** Used only if the response carries no Content-Disposition file name. */
  fallbackFilename?: string;
  /** A short line under the button saying what the export covers. */
  hint?: string;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (isExporting) return;

    setIsExporting(true);
    setError(null);
    try {
      const outcome = await requestCsvExport(href, fetch, fallbackFilename);
      if (outcome.ok) {
        triggerDownload(outcome.blob, outcome.filename);
      } else {
        setError(outcome.message);
      }
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isExporting}
        className="text-sm font-medium text-violet-700 underline underline-offset-4 hover:text-violet-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-violet-300 dark:hover:text-violet-100"
      >
        {isExporting ? "Exporting…" : label}
      </button>
      {hint && <p className="max-w-xs text-right text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
