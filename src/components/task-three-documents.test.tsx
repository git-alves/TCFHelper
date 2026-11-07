import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TaskThreeDocumentsView } from "@/components/task-three-documents";

describe("TaskThreeDocumentsView", () => {
  const html = renderToStaticMarkup(
    <TaskThreeDocumentsView title="Le vote obligatoire" documents={["Premier texte.", "Second texte."]} />,
  );

  it("shows the subject as a title, then Document 1 and Document 2 each with its own text", () => {
    expect(html).toContain("Le vote obligatoire");
    expect(html.indexOf("Document 1 :")).toBeGreaterThan(html.indexOf("Le vote obligatoire"));
    expect(html.indexOf("Document 2 :")).toBeGreaterThan(html.indexOf("Document 1 :"));
    expect(html.indexOf("Premier texte.")).toBeGreaterThan(html.indexOf("Document 1 :"));
    expect(html.indexOf("Second texte.")).toBeGreaterThan(html.indexOf("Document 2 :"));
  });

  it("puts each document's text in its own bordered box, labelled for screen readers", () => {
    expect(html.match(/rounded-lg border/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Document 1"');
    expect(html).toContain('aria-label="Document 2"');
  });

  it("marks the text as French", () => {
    expect(html).toContain('lang="fr"');
  });
});
