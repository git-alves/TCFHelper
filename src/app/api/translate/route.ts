import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { anthropic } from "@/lib/anthropic";
import { APP_LOCALES, APP_LOCALE_LANGUAGE_NAMES, TRANSLATABLE_MAX_CHARS } from "@/lib/app-locale";

const requestSchema = z.object({
  text: z.string().trim().min(1).max(TRANSLATABLE_MAX_CHARS),
  targetLocale: z.enum(APP_LOCALES),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { text, targetLocale } = parsed.data;
  const languageName = APP_LOCALE_LANGUAGE_NAMES[targetLocale];

  try {
    // Haiku, no thinking, low max_tokens: this fires repeatedly while the
    // learner types, so latency matters far more than depth here.
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system:
        `Translate the given French text into ${languageName}. Respond with ONLY the ` +
        "translation — no preamble, no quotes, no notes. The source text is a language " +
        "learner's in-progress draft and may contain grammar mistakes; translate the intended " +
        "meaning rather than refusing or correcting it.",
      messages: [{ role: "user", content: text }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "The translation was declined." }, { status: 502 });
    }

    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "The translation was too long to complete. Please shorten the draft and try again." },
        { status: 502 }
      );
    }

    const translation = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!translation) {
      return NextResponse.json({ error: "No translation was returned." }, { status: 502 });
    }

    return NextResponse.json({ translation });
  } catch (error) {
    console.error("Translation failed", error);
    return NextResponse.json({ error: "Something went wrong while translating." }, { status: 502 });
  }
}
