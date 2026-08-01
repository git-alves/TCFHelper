import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRecentExamSource,
  getRecentExamTopic,
} from "./recent-exam-topics";

const JULY_2026 = new Date("2026-07-31T12:00:00.000Z");

afterEach(() => {
  vi.useRealTimers();
});

describe("getRecentExamSource", () => {
  it("derives the fixed French month endpoint from an injected UTC date", () => {
    const source = getRecentExamSource(new Date("2026-08-01T00:00:00.000Z"));
    const apiUrl = new URL(source.apiUrl);

    expect(source).toMatchObject({
      pageUrl: "https://reussir-tcfcanada.com/aout-2026-expression-ecrite/",
      sourceMonth: "2026-08",
    });
    expect(apiUrl.origin).toBe("https://reussir-tcfcanada.com");
    expect(apiUrl.pathname).toBe("/wp-json/wp/v2/pages");
    expect(apiUrl.searchParams.get("slug")).toBe("aout-2026-expression-ecrite");
  });

  it("uses the next month exactly at the UTC month boundary", () => {
    expect(getRecentExamSource(new Date("2026-07-31T23:59:59.999Z")).sourceMonth).toBe(
      "2026-07"
    );
    expect(getRecentExamSource(new Date("2026-08-01T00:00:00.000Z")).sourceMonth).toBe(
      "2026-08"
    );
  });
});

describe("getRecentExamTopic", () => {
  it("uses only the fixed WordPress endpoint and returns the selected literal Tâche", async () => {
    const fetchMock = vi.fn().mockResolvedValue(wordPressResponse(currentMonthHtml()));

    const topic = await getRecentExamTopic("TASK_2", {
      now: JULY_2026,
      fetch: fetchMock as typeof fetch,
      random: () => 0,
    });

    const [requestUrl, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(requestUrl.origin).toBe("https://reussir-tcfcanada.com");
    expect(requestUrl.pathname).toBe("/wp-json/wp/v2/pages");
    expect(requestUrl.searchParams.get("slug")).toBe("juillet-2026-expression-ecrite");
    expect(init.redirect).toBe("error");
    expect(topic).toMatchObject({
      taskType: "TASK_2",
      combination: 1,
      title: "Tâche 2 — Combinaison 1",
      sourceMonth: "2026-07",
      sourceUrl: "https://reussir-tcfcanada.com/juillet-2026-expression-ecrite/",
    });
    expect(topic.prompt).toContain("T2-A: commenter son voyage");
    expect(topic.prompt).not.toContain("120 mots maximum");
    expect(topic.prompt).not.toContain("T1-A");
    expect(topic.prompt).not.toContain("T2-B");
  });

  it("keeps both complete Tâche 3 documents inside one selected combination", async () => {
    const topic = await getRecentExamTopic("TASK_3", {
      now: JULY_2026,
      fetch: vi.fn().mockResolvedValue(wordPressResponse(currentMonthHtml())) as typeof fetch,
      random: () => 0.99,
    });

    expect(topic.combination).toBe(2);
    expect(topic.title).toBe("Sujet B");
    expect(topic.prompt).toContain("Sujet B");
    expect(topic.prompt).toContain("Document 1 :");
    expect(topic.prompt).toContain("T3-B-DOC-1: les transports doivent évoluer.");
    expect(topic.prompt).toContain("Document 2 :");
    expect(topic.prompt).toContain("T3-B-DOC-2: les coûts restent importants.");
    expect(topic.prompt).not.toContain("T3-A-DOC-1");
    expect(topic.externalRef).toMatch(
      /^reussir-tcf-canada:2026-07:TASK_3:2:[a-f0-9]{24}$/
    );
  });

  it("returns a deterministic immutable reference for the same monthly source content", async () => {
    const options = {
      now: JULY_2026,
      fetch: vi.fn().mockResolvedValue(wordPressResponse(currentMonthHtml())) as typeof fetch,
      random: () => 0,
    };

    const first = await getRecentExamTopic("TASK_1", options);
    const second = await getRecentExamTopic("TASK_1", {
      ...options,
      fetch: vi.fn().mockResolvedValue(wordPressResponse(currentMonthHtml())) as typeof fetch,
    });

    expect(second.externalRef).toBe(first.externalRef);
  });

  it("creates a new immutable reference when an upstream title changes", async () => {
    const first = await getRecentExamTopic("TASK_3", {
      now: JULY_2026,
      fetch: vi.fn().mockResolvedValue(wordPressResponse(currentMonthHtml())) as typeof fetch,
      random: () => 0,
    });
    const revised = await getRecentExamTopic("TASK_3", {
      now: JULY_2026,
      fetch: vi
        .fn()
        .mockResolvedValue(wordPressResponse(currentMonthHtml().replace("Sujet A", "Sujet A révisé"))) as typeof fetch,
      random: () => 0,
    });

    expect(revised.externalRef).not.toBe(first.externalRef);
  });

  it("fails closed when the Elementor H1 is not for the current month", async () => {
    await expect(
      getRecentExamTopic("TASK_1", {
        now: JULY_2026,
        fetch: vi
          .fn()
          .mockResolvedValue(wordPressResponse(currentMonthHtml().replace("Juillet 2026", "Août 2026"))) as typeof fetch,
      })
    ).rejects.toMatchObject({ code: "INVALID_SOURCE" });
  });

  it("fails closed when a combination does not contain the selected literal task heading", async () => {
    const html = currentMonthHtml().replace(
      '<span class="elementor-heading-title">Tâche 2</span>',
      '<span class="elementor-heading-title">Sujet libre</span>'
    );

    await expect(
      getRecentExamTopic("TASK_2", {
        now: JULY_2026,
        fetch: vi.fn().mockResolvedValue(wordPressResponse(html)) as typeof fetch,
      })
    ).rejects.toMatchObject({ code: "INVALID_SOURCE" });
  });

  it("rejects a Tâche 3 block that omits one of its required documents", async () => {
    const html = currentMonthHtml().replace(
      '<h3 class="elementor-heading-title">Document 2 :</h3>',
      '<h3 class="elementor-heading-title">Annexe :</h3>'
    );

    await expect(
      getRecentExamTopic("TASK_3", {
        now: JULY_2026,
        fetch: vi.fn().mockResolvedValue(wordPressResponse(html)) as typeof fetch,
      })
    ).rejects.toMatchObject({ code: "INVALID_SOURCE" });
  });

  it("reports an unavailable source for an upstream HTTP failure", async () => {
    await expect(
      getRecentExamTopic("TASK_1", {
        now: JULY_2026,
        fetch: vi
          .fn()
          .mockResolvedValue(new Response("unavailable", { status: 503 })) as typeof fetch,
      })
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("rejects malformed source JSON instead of treating it as a topic", async () => {
    await expect(
      getRecentExamTopic("TASK_1", {
        now: JULY_2026,
        fetch: vi
          .fn()
          .mockResolvedValue(
            new Response("not-json", { headers: { "content-type": "application/json" } })
          ) as typeof fetch,
      })
    ).rejects.toMatchObject({ code: "INVALID_SOURCE" });
  });

  it("stops reading an oversized source response", async () => {
    const oversizedHtml = `${currentMonthHtml()}${"x".repeat(2_000)}`;

    await expect(
      getRecentExamTopic("TASK_1", {
        now: JULY_2026,
        maxResponseBytes: 100,
        fetch: vi.fn().mockResolvedValue(wordPressResponse(oversizedHtml)) as typeof fetch,
      })
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("falls back to last month when the current month has not been published yet", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof URL ? input : new URL(String(input));
      if (url.searchParams.get("slug") === "aout-2026-expression-ecrite") {
        return new Response("[]", { headers: { "content-type": "application/json" } });
      }
      return wordPressResponse(currentMonthHtml());
    });

    const topic = await getRecentExamTopic("TASK_1", {
      now: new Date("2026-08-01T00:00:00.000Z"),
      fetch: fetchMock as typeof fetch,
      random: () => 0,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      fetchMock.mock.calls.map(([input]) => {
        const url = input instanceof URL ? input : new URL(String(input));
        return url.searchParams.get("slug");
      }),
    ).toEqual([
      "aout-2026-expression-ecrite",
      "juillet-2026-expression-ecrite",
    ]);
    expect(topic.sourceMonth).toBe("2026-07");
    expect(topic.sourceUrl).toBe("https://reussir-tcfcanada.com/juillet-2026-expression-ecrite/");
  });

  it("falls back across the year boundary when January has not been published yet", async () => {
    const decemberHtml = currentMonthHtml().replace("Juillet 2026", "Décembre 2025");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof URL ? input : new URL(String(input));
      if (url.searchParams.get("slug") === "janvier-2026-expression-ecrite") {
        return new Response("[]", { headers: { "content-type": "application/json" } });
      }
      return wordPressResponse(decemberHtml, {
        slug: "decembre-2025-expression-ecrite",
        title: "Décembre 2025 Expression écrite",
      });
    });

    const topic = await getRecentExamTopic("TASK_1", {
      now: new Date("2026-01-01T00:00:00.000Z"),
      fetch: fetchMock as typeof fetch,
      random: () => 0,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      fetchMock.mock.calls.map(([input]) => {
        const url = input instanceof URL ? input : new URL(String(input));
        return url.searchParams.get("slug");
      }),
    ).toEqual([
      "janvier-2026-expression-ecrite",
      "decembre-2025-expression-ecrite",
    ]);
    expect(topic.sourceMonth).toBe("2025-12");
    expect(topic.sourceUrl).toBe("https://reussir-tcfcanada.com/decembre-2025-expression-ecrite/");
    expect(topic.externalRef).toMatch(/^reussir-tcf-canada:2025-12:TASK_1:1:/);
  });

  it("fails closed as NOT_PUBLISHED when both the current and prior month are unpublished", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async () => new Response("[]", { headers: { "content-type": "application/json" } })
      );

    await expect(
      getRecentExamTopic("TASK_1", {
        now: new Date("2026-08-01T00:00:00.000Z"),
        fetch: fetchMock as typeof fetch,
      })
    ).rejects.toMatchObject({ code: "NOT_PUBLISHED", sourceMonth: "2026-08" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not mask a published source missing the selected task with an older topic", async () => {
    const currentMonthWithoutTaskTwo = currentMonthHtml()
      .replace("Juillet 2026", "Août 2026")
      .replaceAll(
        '<span class="elementor-heading-title">Tâche 2</span>',
        '<span class="elementor-heading-title">Sujet libre</span>',
      );
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof URL ? input : new URL(String(input));
      if (url.searchParams.get("slug") === "aout-2026-expression-ecrite") {
        return wordPressResponse(currentMonthWithoutTaskTwo, {
          slug: "aout-2026-expression-ecrite",
          title: "Août 2026 Expression écrite",
        });
      }

      // A valid prior-month response must not conceal a malformed current
      // month source.
      return wordPressResponse(currentMonthHtml());
    });

    await expect(
      getRecentExamTopic("TASK_2", {
        now: new Date("2026-08-01T00:00:00.000Z"),
        fetch: fetchMock as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "INVALID_SOURCE" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      fetchMock.mock.calls.map(([input]) => {
        const url = input instanceof URL ? input : new URL(String(input));
        return url.searchParams.get("slug");
      }),
    ).toEqual(["aout-2026-expression-ecrite"]);
  });

  it("does not fall back to last month on a genuine upstream failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 }));

    await expect(
      getRecentExamTopic("TASK_1", {
        now: new Date("2026-08-01T00:00:00.000Z"),
        fetch: fetchMock as typeof fetch,
      })
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts a source request that outlives its timeout", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        })
    );
    const topicPromise = getRecentExamTopic("TASK_1", {
      now: JULY_2026,
      timeoutMs: 25,
      fetch: fetchMock as typeof fetch,
    });

    const expectedRejection = expect(topicPromise).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
    await vi.advanceTimersByTimeAsync(25);
    await expectedRejection;
  });
});

function wordPressResponse(
  content: string,
  {
    slug = "juillet-2026-expression-ecrite",
    title = "Juillet 2026 Expression écrite",
  }: { slug?: string; title?: string } = {},
): Response {
  return new Response(
    JSON.stringify([
      {
        slug,
        title: { rendered: title },
        content: { rendered: content },
      },
    ]),
    { headers: { "content-type": "application/json; charset=utf-8" } }
  );
}

function currentMonthHtml(): string {
  return [
    "<h1>Juillet 2026</h1>",
    combination({
      number: 1,
      taskOne: "T1-A: inviter ses amis à une célébration. (60 mots minimum/120 mots maximum)",
      taskTwo: "T2-A: commenter son voyage. (120 mots minimum/150 mots maximum)",
      taskThreeTitle: "Sujet A",
      documentOne: "T3-A-DOC-1: les villes doivent limiter les voitures.",
      documentTwo: "T3-A-DOC-2: les familles ont besoin de solutions réalistes.",
    }),
    combination({
      number: 2,
      taskOne: "T1-B: raconter son premier emploi. (60 mots minimum/120 mots maximum)",
      taskTwo: "T2-B: expliquer son expérience professionnelle. (120 mots minimum/150 mots maximum)",
      taskThreeTitle: "Sujet B",
      documentOne: "T3-B-DOC-1: les transports doivent évoluer.",
      documentTwo: "T3-B-DOC-2: les coûts restent importants.",
    }),
  ].join("");
}

function combination({
  number,
  taskOne,
  taskTwo,
  taskThreeTitle,
  documentOne,
  documentTwo,
}: {
  number: number;
  taskOne: string;
  taskTwo: string;
  taskThreeTitle: string;
  documentOne: string;
  documentTwo: string;
}): string {
  return `
    <section class="elementor-top-section">
      <div class="elementor-widget-divider">
        <span class="elementor-divider__text">Combinaison ${number}</span>
      </div>
      <div class="elementor-widget-heading">
        <span class="elementor-heading-title">Tâche 1</span>
      </div>
      <section class="elementor-inner-section">
        <div class="elementor-widget-text-editor"><p>${taskOne}</p></div>
      </section>
      <div class="elementor-widget-heading">
        <span class="elementor-heading-title">Tâche 2</span>
      </div>
      <section class="elementor-inner-section">
        <div class="elementor-widget-text-editor"><p>${taskTwo}</p></div>
      </section>
      <div class="elementor-widget-heading">
        <span class="elementor-heading-title">Tâche 3</span>
      </div>
      <section class="elementor-inner-section">
        <div class="elementor-widget-heading"><h2 class="elementor-heading-title">${taskThreeTitle}</h2></div>
        <div class="elementor-widget-heading"><h3 class="elementor-heading-title">Document 1 :</h3></div>
        <div class="elementor-widget-text-editor"><p>${documentOne}</p></div>
        <div class="elementor-widget-heading"><h3 class="elementor-heading-title">Document 2 :</h3></div>
        <div class="elementor-widget-text-editor"><p>${documentTwo}</p></div>
      </section>
    </section>
  `;
}
