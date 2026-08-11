import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminAccessCodesTable } from "./admin-access-codes-table";

describe("AdminAccessCodesTable", () => {
  it("describes a detached admission without implying that the learner was deleted", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminAccessCodesTable, {
        accessCodes: [
          {
            id: "code_1",
            code: "TCF-AB12-CD34-EF56-GH78",
            note: null,
            createdAt: "2026-08-10T00:00:00.000Z",
            redeemedAt: "2026-08-11T00:00:00.000Z",
            redeemedByUserEmail: null,
          },
        ],
      }),
    );

    expect(markup).toContain("Permanently spent on");
    expect(markup).toContain("no active admission");
    expect(markup).not.toContain("deleted account");
  });
});
