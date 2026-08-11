import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminExportCsvButton, requestCsvExport } from "./admin-export-csv-button";

describe("AdminExportCsvButton", () => {
  it("renders an idle export control with no error", () => {
    const markup = renderToStaticMarkup(createElement(AdminExportCsvButton, { href: "/api/admin/users/export" }));

    expect(markup).toContain("Export CSV");
    expect(markup).not.toContain('role="alert"');
  });

  it("supports a custom label", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminExportCsvButton, { href: "/api/admin/access-codes/export", label: "Download codes" }),
    );

    expect(markup).toContain("Download codes");
  });
});

describe("requestCsvExport", () => {
  it("resolves the CSV blob and filename from a successful response", async () => {
    const csv = "Email\r\nlearner@example.com\r\n";
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="users.csv"',
        },
      }),
    );

    const outcome = await requestCsvExport("/api/admin/users/export", fetchImpl);

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.filename).toBe("users.csv");
      await expect(outcome.blob.text()).resolves.toBe(csv);
    }
  });

  it("falls back to a generic filename when Content-Disposition is missing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("a\r\n", { status: 200 }));

    const outcome = await requestCsvExport("/api/admin/users/export", fetchImpl);

    expect(outcome).toMatchObject({ ok: true, filename: "export.csv" });
  });

  it("surfaces the server's refusal message for a truncated export instead of downloading a partial file", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      Response.json(
        { error: "This filter matches 12,345 users, more than the 10,000-row export limit. Narrow your search before exporting." },
        { status: 413 },
      ),
    );

    const outcome = await requestCsvExport("/api/admin/users/export", fetchImpl);

    expect(outcome).toEqual({
      ok: false,
      message: "This filter matches 12,345 users, more than the 10,000-row export limit. Narrow your search before exporting.",
    });
  });

  it("treats a network failure as a visible error rather than a silent no-op", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const outcome = await requestCsvExport("/api/admin/users/export", fetchImpl);

    expect(outcome).toEqual({ ok: false, message: "Could not reach the admin service. Please try again." });
  });
});
