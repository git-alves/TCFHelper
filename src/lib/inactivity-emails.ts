import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import {
  InactivityEmailKind,
  InactivityEmailSendStatus,
  Locale,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const INACTIVITY_EMAIL_DAILY_CAP = 90;
export const INACTIVITY_EMAIL_KINDS = [
  InactivityEmailKind.SEVEN_DAY,
  InactivityEmailKind.THIRTY_DAY,
] as const;
export const INACTIVITY_EMAIL_LOCALES = [
  Locale.pt,
  Locale.en,
  Locale.fr,
  Locale.es,
] as const;

export type InactivityEmailLocale = (typeof INACTIVITY_EMAIL_LOCALES)[number];

type DefaultTemplate = { subject: string; body: string; button: string };
type TemplateKey = `${InactivityEmailKind}:${InactivityEmailLocale}`;

const defaults: Record<TemplateKey, DefaultTemplate> = {
  "SEVEN_DAY:pt": {
    subject: "Quando quiser, o MyTCFLab está aqui",
    body: "Oi, `{name}`!<br><br>Faz alguns dias desde a sua última prática. Quando quiser continuar, seu espaço no MyTCFLab está pronto para você.<br><br>Retome no seu ritmo.",
    button: "Voltar ao MyTCFLab",
  },
  "SEVEN_DAY:en": {
    subject: "MyTCFLab is here when you’re ready",
    body: "Hi `{name}`,<br><br>It’s been a few days since your last practice. Whenever you’d like to continue, your space in MyTCFLab is ready for you.<br><br>Pick up at your own pace.",
    button: "Return to MyTCFLab",
  },
  "SEVEN_DAY:fr": {
    subject: "MyTCFLab est là quand vous serez prêt·e",
    body: "Bonjour `{name}`,<br><br>Quelques jours se sont écoulés depuis votre dernière pratique. Quand vous aurez envie de reprendre, votre espace MyTCFLab vous attend.<br><br>Reprenez à votre rythme.",
    button: "Retourner à MyTCFLab",
  },
  "SEVEN_DAY:es": {
    subject: "MyTCFLab está aquí cuando quieras",
    body: "Hola, `{name}`:<br><br>Han pasado algunos días desde tu última práctica. Cuando quieras continuar, tu espacio en MyTCFLab está listo para ti.<br><br>Retoma a tu ritmo.",
    button: "Volver a MyTCFLab",
  },
  "THIRTY_DAY:pt": {
    subject: "Seu espaço no MyTCFLab continua pronto",
    body: "Oi, `{name}`!<br><br>Seu espaço no MyTCFLab continua aqui quando quiser voltar. Uma pequena prática já é um bom recomeço.<br><br>Sem pressa — vá no seu ritmo.",
    button: "Voltar ao MyTCFLab",
  },
  "THIRTY_DAY:en": {
    subject: "Your MyTCFLab space is still ready",
    body: "Hi `{name}`,<br><br>Your MyTCFLab space is still here whenever you’d like to come back. A small practice is a good place to restart.<br><br>No rush — go at your own pace.",
    button: "Return to MyTCFLab",
  },
  "THIRTY_DAY:fr": {
    subject: "Votre espace MyTCFLab est toujours prêt",
    body: "Bonjour `{name}`,<br><br>Votre espace MyTCFLab est toujours là lorsque vous aurez envie de revenir. Une courte pratique est déjà une bonne façon de reprendre.<br><br>Sans pression — allez à votre rythme.",
    button: "Retourner à MyTCFLab",
  },
  "THIRTY_DAY:es": {
    subject: "Tu espacio de MyTCFLab sigue listo",
    body: "Hola, `{name}`:<br><br>Tu espacio de MyTCFLab sigue aquí cuando quieras volver. Una práctica breve es una buena forma de retomar.<br><br>Sin prisa — ve a tu ritmo.",
    button: "Volver a MyTCFLab",
  },
};

const fallbackName: Record<InactivityEmailLocale, string> = {
  pt: "aí",
  en: "there",
  fr: "là",
  es: "ahí",
};
const footer: Record<InactivityEmailLocale, string> = {
  pt: "Você está recebendo este e-mail porque tem uma conta no MyTCFLab.",
  en: "You are receiving this email because you have a MyTCFLab account.",
  fr: "Vous recevez cet e-mail parce que vous avez un compte MyTCFLab.",
  es: "Recibes este correo porque tienes una cuenta de MyTCFLab.",
};
const unsubscribeLabel: Record<InactivityEmailLocale, string> = {
  pt: "Cancelar o recebimento destes e-mails",
  en: "Unsubscribe from these emails",
  fr: "Ne plus recevoir ces e-mails",
  es: "Dejar de recibir estos correos",
};

export function defaultInactivityTemplate(
  kind: InactivityEmailKind,
  locale: InactivityEmailLocale,
): DefaultTemplate {
  return defaults[`${kind}:${locale}`];
}

export function isEligibleForInactivityEmail(user: {
  isBlocked: boolean;
  isAdmin: boolean;
  inactivityEmailsUnsubscribedAt: Date | null;
  lastActiveAt: Date | null;
}): boolean {
  // Consent / existing-business-relationship policy belongs here once the
  // owner decides how it is recorded. Do not loosen these hard exclusions.
  return (
    !user.isBlocked &&
    !user.isAdmin &&
    !user.inactivityEmailsUnsubscribedAt &&
    Boolean(user.lastActiveAt)
  );
}

function configProblems() {
  const missing: string[] = [];
  if (!process.env.RESEND_API_KEY?.trim()) missing.push("RESEND_API_KEY");
  if (!process.env.EMAIL_FROM?.trim()) missing.push("EMAIL_FROM");
  if (!process.env.INACTIVITY_EMAIL_LEGAL_ADDRESS?.trim())
    missing.push("INACTIVITY_EMAIL_LEGAL_ADDRESS");
  if (!process.env.INACTIVITY_EMAIL_SUPPORT_EMAIL?.trim())
    missing.push("INACTIVITY_EMAIL_SUPPORT_EMAIL");
  if (!process.env.INACTIVITY_EMAIL_UNSUBSCRIBE_SECRET?.trim())
    missing.push("INACTIVITY_EMAIL_UNSUBSCRIBE_SECRET");
  return missing;
}

export function inactivityEmailConfiguration() {
  const missing = configProblems();
  return { configured: missing.length === 0, missing };
}

function baseUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!value || !/^https:\/\//.test(value))
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be an absolute HTTPS URL for inactivity email.",
    );
  return value.replace(/\/$/, "");
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}

function renderText(value: string, values: { name: string; appUrl: string }) {
  return escapeHtml(value)
    .replace(/\{name\}/g, escapeHtml(values.name))
    .replace(/\{appUrl\}/g, escapeHtml(values.appUrl))
    .replace(/&lt;br&gt;/g, "<br>");
}

export function validateInactivityTemplate(
  subject: string,
  body: string,
): string | null {
  if (!subject.trim()) return "Enter a subject.";
  if (/\r|\n/.test(subject)) return "The subject cannot contain a line break.";
  if (!body.trim()) return "Enter an email body.";
  const subjectTokens = subject.match(/\{[^}]+\}/g) ?? [];
  const bodyTokens = body.match(/\{[^}]+\}/g) ?? [];
  for (const token of subjectTokens) {
    if (token === "{appUrl}") return "Use {appUrl} in the email body only.";
    if (token !== "{name}")
      return `“${token}” isn’t available. Use {name} or {appUrl}.`;
  }
  for (const token of bodyTokens)
    if (token !== "{name}" && token !== "{appUrl}")
      return `“${token}” isn’t available. Use {name} or {appUrl}.`;
  return null;
}

export function signInactivityUnsubscribeToken(
  userId: string,
  locale: InactivityEmailLocale,
) {
  const secret = process.env.INACTIVITY_EMAIL_UNSUBSCRIBE_SECRET?.trim();
  if (!secret)
    throw new Error("INACTIVITY_EMAIL_UNSUBSCRIBE_SECRET is not configured");
  const payload = Buffer.from(
    JSON.stringify({ userId, locale, v: 1 }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyInactivityUnsubscribeToken(
  token: string,
): { userId: string; locale: InactivityEmailLocale } | null {
  const secret = process.env.INACTIVITY_EMAIL_UNSUBSCRIBE_SECRET?.trim();
  const [payload, signature, extra] = token.split(".");
  if (!secret || !payload || !signature || extra) return null;
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  )
    return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { userId?: unknown; locale?: unknown; v?: unknown };
    return parsed.v === 1 &&
      typeof parsed.userId === "string" &&
      (INACTIVITY_EMAIL_LOCALES as readonly string[]).includes(
        String(parsed.locale),
      )
      ? {
          userId: parsed.userId,
          locale: parsed.locale as InactivityEmailLocale,
        }
      : null;
  } catch {
    return null;
  }
}

export async function unsubscribeFromInactivityEmails(token: string) {
  const verified = verifyInactivityUnsubscribeToken(token);
  if (!verified) return { kind: "invalid" as const, locale: Locale.en };
  const result = await prisma.user.updateMany({
    where: { id: verified.userId, inactivityEmailsUnsubscribedAt: null },
    data: { inactivityEmailsUnsubscribedAt: new Date() },
  });
  return {
    kind: result.count ? ("unsubscribed" as const) : ("already" as const),
    locale: verified.locale,
  };
}

export type InactivityEmailDisplay = {
  enabled: boolean;
  configured: boolean;
  missingConfiguration: string[];
  templates: Record<
    TemplateKey,
    { subject: string; body: string; button: string; customized: boolean }
  >;
};

export async function getInactivityEmailDisplay(): Promise<InactivityEmailDisplay> {
  const [config, rows] = await Promise.all([
    prisma.appConfig.findUnique({
      where: { id: "singleton" },
      select: { inactivityEmailsEnabled: true },
    }),
    prisma.inactivityEmailTemplate.findMany(),
  ]);
  const rowByKey = new Map(
    rows.map((row) => [`${row.kind}:${row.locale}`, row]),
  );
  const templates = {} as InactivityEmailDisplay["templates"];
  for (const kind of INACTIVITY_EMAIL_KINDS)
    for (const locale of INACTIVITY_EMAIL_LOCALES) {
      const fallback = defaultInactivityTemplate(kind, locale);
      const row = rowByKey.get(`${kind}:${locale}`);
      templates[`${kind}:${locale}`] = {
        subject: row?.subject ?? fallback.subject,
        body: row?.body ?? fallback.body,
        button: fallback.button,
        customized: Boolean(row),
      };
    }
  const provider = inactivityEmailConfiguration();
  return {
    enabled: config?.inactivityEmailsEnabled ?? false,
    configured: provider.configured,
    missingConfiguration: provider.missing,
    templates,
  };
}

export async function updateInactivityEmailSettings(input: {
  enabled?: boolean;
  templates?: Array<{
    kind: InactivityEmailKind;
    locale: InactivityEmailLocale;
    subject: string;
    body: string;
  }>;
}) {
  if (input.enabled) {
    const provider = inactivityEmailConfiguration();
    if (!provider.configured)
      throw new Error(
        `Email sending is unavailable: ${provider.missing.join(", ")} is not configured.`,
      );
  }
  if (input.templates)
    for (const template of input.templates) {
      const error = validateInactivityTemplate(template.subject, template.body);
      if (error) throw new Error(error);
    }
  await prisma.$transaction(async (tx) => {
    if (input.enabled !== undefined)
      await tx.appConfig.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", inactivityEmailsEnabled: input.enabled },
        update: { inactivityEmailsEnabled: input.enabled },
      });
    for (const template of input.templates ?? []) {
      const fallback = defaultInactivityTemplate(
        template.kind,
        template.locale,
      );
      if (
        template.subject.trim() === fallback.subject &&
        template.body.trim() === fallback.body
      )
        await tx.inactivityEmailTemplate.deleteMany({
          where: { kind: template.kind, locale: template.locale },
        });
      else
        await tx.inactivityEmailTemplate.upsert({
          where: {
            kind_locale: { kind: template.kind, locale: template.locale },
          },
          create: {
            ...template,
            subject: template.subject.trim(),
            body: template.body.trim(),
          },
          update: {
            subject: template.subject.trim(),
            body: template.body.trim(),
          },
        });
    }
  });
  return getInactivityEmailDisplay();
}

/** Sends only to the authenticated owner through the protected admin route.
 * The unsubscribe target is deliberately non-functional test data. */
export async function sendInactivityEmailTest(input: {
  to: string;
  kind: InactivityEmailKind;
  locale: InactivityEmailLocale;
  subject: string;
  body: string;
}) {
  const provider = inactivityEmailConfiguration();
  if (!provider.configured)
    throw new Error(
      `Email sending is unavailable: ${provider.missing.join(", ")} is not configured.`,
    );
  const validation = validateInactivityTemplate(input.subject, input.body);
  if (validation) throw new Error(validation);
  const appUrl = `${baseUrl()}/dashboard`;
  const template = defaultInactivityTemplate(input.kind, input.locale);
  const html = `<div>${renderText(input.body, { name: "Alex", appUrl })}</div><p><a href="${escapeHtml(appUrl)}">${escapeHtml(template.button)}</a></p><hr><p>${escapeHtml(footer[input.locale])} MyTCFLab · ${escapeHtml(process.env.INACTIVITY_EMAIL_LEGAL_ADDRESS!)} · ${escapeHtml(process.env.INACTIVITY_EMAIL_SUPPORT_EMAIL!)}. <a href="https://example.invalid/unsubscribe-test">${escapeHtml(unsubscribeLabel[input.locale])}</a></p>`;
  const result = await new Resend(process.env.RESEND_API_KEY!).emails.send({
    from: process.env.EMAIL_FROM!,
    to: input.to,
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
    subject: input.subject.replace(/\{name\}/g, "Alex"),
    html,
  });
  if (result.error || !result.data?.id)
    throw new Error(
      result.error?.message ?? "Resend did not return a message id",
    );
  return result.data.id;
}

type Candidate = {
  id: string;
  email: string;
  name: string | null;
  locale: Locale;
  lastActiveAt: Date;
  isBlocked: boolean;
  isAdmin: boolean;
  inactivityEmailsUnsubscribedAt: Date | null;
  inactivityEmailSends: Array<{
    kind: InactivityEmailKind;
    lastActiveAt: Date;
    status: InactivityEmailSendStatus;
  }>;
};

export async function selectInactivityEmailCandidates(
  now = new Date(),
  limit = INACTIVITY_EMAIL_DAILY_CAP,
) {
  const seven = new Date(now.getTime() - 7 * 86_400_000);
  const thirty = new Date(now.getTime() - 30 * 86_400_000);
  const users = await prisma.user.findMany({
    where: {
      lastActiveAt: { not: null, lte: seven },
      isBlocked: false,
      isAdmin: false,
      inactivityEmailsUnsubscribedAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      locale: true,
      lastActiveAt: true,
      isBlocked: true,
      isAdmin: true,
      inactivityEmailsUnsubscribedAt: true,
      inactivityEmailSends: {
        select: { kind: true, lastActiveAt: true, status: true },
      },
    },
    orderBy: { lastActiveAt: "asc" },
  });
  const selected: Array<Candidate & { kind: InactivityEmailKind }> = [];
  for (const raw of users) {
    if (!raw.lastActiveAt) continue;
    const user = raw as Candidate;
    if (!isEligibleForInactivityEmail(user)) continue;
    const kind =
      user.lastActiveAt <= thirty
        ? InactivityEmailKind.THIRTY_DAY
        : InactivityEmailKind.SEVEN_DAY;
    if (
      user.inactivityEmailSends.some(
        (send) =>
          send.kind === kind &&
          send.lastActiveAt.getTime() === user.lastActiveAt.getTime(),
      )
    )
      continue;
    selected.push({ ...user, kind });
    if (selected.length >= limit) break;
  }
  return selected;
}

export async function runInactivityEmailCron(now = new Date()) {
  const [config, provider] = await Promise.all([
    prisma.appConfig.findUnique({
      where: { id: "singleton" },
      select: { inactivityEmailsEnabled: true },
    }),
    Promise.resolve(inactivityEmailConfiguration()),
  ]);
  if (!config?.inactivityEmailsEnabled) {
    console.info("Inactivity email cron skipped: sending is off");
    return { sent: 0, skipped: "off" as const };
  }
  if (!provider.configured) {
    console.info(
      "Inactivity email cron skipped: Resend configuration missing",
      provider.missing,
    );
    return { sent: 0, skipped: "configuration" as const };
  }
  const candidates = await selectInactivityEmailCandidates(now);
  const display = await getInactivityEmailDisplay();
  const resend = new Resend(process.env.RESEND_API_KEY!);
  let sent = 0;
  for (const user of candidates) {
    let claim: { id: string };
    try {
      claim = await prisma.inactivityEmailSend.create({
        data: {
          userId: user.id,
          kind: user.kind,
          lastActiveAt: user.lastActiveAt,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        continue;
      throw error;
    }
    const locale = user.locale as InactivityEmailLocale;
    const template = display.templates[`${user.kind}:${locale}`];
    const appUrl = `${baseUrl()}/dashboard`;
    const unsubscribeUrl = `${baseUrl()}/unsubscribe/inactivity?token=${encodeURIComponent(signInactivityUnsubscribeToken(user.id, locale))}`;
    const name = user.name?.trim() || fallbackName[locale];
    const subject = template.subject.replace(/\{name\}/g, name);
    const html = `<div>${renderText(template.body, { name, appUrl })}</div><p><a href="${escapeHtml(appUrl)}">${escapeHtml(template.button)}</a></p><hr><p>${escapeHtml(footer[locale])} MyTCFLab · ${escapeHtml(process.env.INACTIVITY_EMAIL_LEGAL_ADDRESS!)} · ${escapeHtml(process.env.INACTIVITY_EMAIL_SUPPORT_EMAIL!)}. <a href="${escapeHtml(unsubscribeUrl)}">${escapeHtml(unsubscribeLabel[locale])}</a></p>`;
    try {
      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: user.email,
        replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
        subject,
        html,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "X-Entity-Ref-ID": claim.id,
        },
      });
      if (result.error || !result.data?.id)
        throw new Error(
          result.error?.message ?? "Resend did not return a message id",
        );
      await prisma.inactivityEmailSend.update({
        where: { id: claim.id },
        data: {
          status: InactivityEmailSendStatus.SENT,
          sentAt: new Date(),
          resendMessageId: result.data.id,
        },
      });
      sent++;
    } catch (error) {
      await prisma.inactivityEmailSend.update({
        where: { id: claim.id },
        data: {
          status: InactivityEmailSendStatus.FAILED,
          failedAt: new Date(),
          failureReason:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Unknown Resend failure",
        },
      });
      console.error("Inactivity email send failed", { emailSendId: claim.id });
    }
  }
  return { sent, skipped: null };
}
