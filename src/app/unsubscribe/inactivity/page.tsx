import Link from "next/link";
import { Locale } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  unsubscribeFromInactivityEmails,
  verifyInactivityUnsubscribeToken,
} from "@/lib/inactivity-emails";

const copy = {
  pt: {
    success: "Você não receberá mais estes e-mails",
    already: "Você já não recebe estes e-mails",
    invalid: "Este link não é válido",
    successBody:
      "Seu pedido foi confirmado. Você não receberá mais e-mails de retomada do MyTCFLab.",
    alreadyBody: "Nenhuma outra ação é necessária.",
    invalidBody:
      "Ele pode ter expirado. Entre em contato com o suporte se precisar de ajuda.",
    app: "Ir para o MyTCFLab",
    confirm: "Confirmar",
  },
  en: {
    success: "You won’t receive these emails anymore",
    already: "You’re already unsubscribed from these emails",
    invalid: "This link isn’t valid",
    successBody:
      "Your request is confirmed. You will no longer receive MyTCFLab re-engagement emails.",
    alreadyBody: "No further action is needed.",
    invalidBody: "It may have expired. Contact support if you need help.",
    app: "Go to MyTCFLab",
    confirm: "Confirm",
  },
  fr: {
    success: "Vous ne recevrez plus ces e-mails",
    already: "Vous ne recevez déjà plus ces e-mails",
    invalid: "Ce lien n’est pas valide",
    successBody:
      "Votre demande est confirmée. Vous ne recevrez plus d’e-mails de reprise de MyTCFLab.",
    alreadyBody: "Aucune autre action n’est nécessaire.",
    invalidBody:
      "Il a peut-être expiré. Contactez l’assistance si vous avez besoin d’aide.",
    app: "Aller sur MyTCFLab",
    confirm: "Confirmer",
  },
  es: {
    success: "Ya no recibirás estos correos",
    already: "Ya no recibes estos correos",
    invalid: "Este enlace no es válido",
    successBody:
      "Tu solicitud está confirmada. Ya no recibirás correos de reanudación de MyTCFLab.",
    alreadyBody: "No necesitas hacer nada más.",
    invalidBody:
      "Puede haber caducado. Ponte en contacto con soporte si necesitas ayuda.",
    app: "Ir a MyTCFLab",
    confirm: "Confirmar",
  },
} as const;

export default async function InactivityUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; state?: string; locale?: Locale }>;
}) {
  const { token, state, locale } = await searchParams;
  const verified = token ? verifyInactivityUnsubscribeToken(token) : null;
  const result =
    state === "unsubscribed" || state === "already"
      ? { kind: state, locale: locale ?? Locale.en }
      : null;
  const strings = copy[result?.locale ?? verified?.locale ?? Locale.en];
  async function confirm() {
    "use server";
    const next = await unsubscribeFromInactivityEmails(token ?? "");
    redirect(
      `/unsubscribe/inactivity?state=${next.kind}&locale=${next.locale}`,
    );
  }
  const heading =
    result?.kind === "unsubscribed"
      ? strings.success
      : result?.kind === "already"
        ? strings.already
        : strings.invalid;
  const body =
    result?.kind === "unsubscribed"
      ? strings.successBody
      : result?.kind === "already"
        ? strings.alreadyBody
        : strings.invalidBody;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-5 px-6 py-12">
      <p className="text-lg font-semibold">MyTCFLab</p>
      <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{body}</p>
      {!result && verified && (
        <form action={confirm}>
          <button className="self-start rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
            {strings.confirm}
          </button>
        </form>
      )}
      <Link
        className="self-start rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        href="/"
      >
        {strings.app}
      </Link>
    </main>
  );
}
