import type { GuideProfile } from "@prisma/client";
import { APP_LOCALES, type AppLocale } from "@/lib/app-locale";

// See docs/guided-writing.md. All guide content is fixed, reviewed
// application data -- no model request or generative AI selects or writes
// any of it.

export const GUIDE_PROFILES: readonly GuideProfile[] = [
  "INFORMAL_PERSONAL_MESSAGE",
  "FORMAL_PROFESSIONAL_MESSAGE",
  "PUBLIC_ARTICLE_OR_NOTE",
  "PUBLIC_LETTER",
  "ARGUMENTATIVE_ANALYSIS",
];

export type TargetLevel = "B2" | "C1" | "C2";
export const TARGET_LEVELS: readonly TargetLevel[] = ["B2", "C1", "C2"];
export const DEFAULT_TARGET_LEVEL: TargetLevel = "B2";

export type GuideStage = "start" | "develop" | "finish";
export const GUIDE_STAGES: readonly GuideStage[] = ["start", "develop", "finish"];

export function isTargetLevel(value: unknown): value is TargetLevel {
  return value === "B2" || value === "C1" || value === "C2";
}

// Panel heading and the "Writing situation" confirmation control both need a
// short label and a one-line description of who a profile is for.
export const GUIDE_PROFILE_LABELS: Record<AppLocale, Record<GuideProfile, string>> = {
  en: {
    INFORMAL_PERSONAL_MESSAGE: "Personal message to someone you know",
    FORMAL_PROFESSIONAL_MESSAGE: "Formal letter or email",
    PUBLIC_ARTICLE_OR_NOTE: "Article or note for readers",
    PUBLIC_LETTER: "Open letter to a publication's readers",
    ARGUMENTATIVE_ANALYSIS: "Argumentative essay (two viewpoints)",
  },
  fr: {
    INFORMAL_PERSONAL_MESSAGE: "Message personnel à un proche",
    FORMAL_PROFESSIONAL_MESSAGE: "Lettre ou e-mail formel",
    PUBLIC_ARTICLE_OR_NOTE: "Article ou note pour des lecteurs",
    PUBLIC_LETTER: "Lettre ouverte aux lecteurs d'une publication",
    ARGUMENTATIVE_ANALYSIS: "Essai argumentatif (deux points de vue)",
  },
  es: {
    INFORMAL_PERSONAL_MESSAGE: "Mensaje personal a alguien cercano",
    FORMAL_PROFESSIONAL_MESSAGE: "Carta o correo formal",
    PUBLIC_ARTICLE_OR_NOTE: "Artículo o nota para lectores",
    PUBLIC_LETTER: "Carta abierta a los lectores de una publicación",
    ARGUMENTATIVE_ANALYSIS: "Ensayo argumentativo (dos puntos de vista)",
  },
  pt: {
    INFORMAL_PERSONAL_MESSAGE: "Mensagem pessoal para alguém próximo",
    FORMAL_PROFESSIONAL_MESSAGE: "Carta ou e-mail formal",
    PUBLIC_ARTICLE_OR_NOTE: "Artigo ou nota para leitores",
    PUBLIC_LETTER: "Carta aberta aos leitores de uma publicação",
    ARGUMENTATIVE_ANALYSIS: "Redação argumentativa (dois pontos de vista)",
  },
};

export const GUIDE_STAGE_LABELS: Record<AppLocale, Record<GuideStage, string>> = {
  en: { start: "Start", develop: "Develop", finish: "Finish" },
  fr: { start: "Commencer", develop: "Développer", finish: "Conclure" },
  es: { start: "Empezar", develop: "Desarrollar", finish: "Concluir" },
  pt: { start: "Começar", develop: "Desenvolver", finish: "Concluir" },
};

type ProfileContent = Record<GuideProfile, Record<TargetLevel, Record<GuideStage, readonly string[]>>>;

export type GuidedWritingContent = Record<AppLocale, ProfileContent>;

export const GUIDED_WRITING_TIPS: GuidedWritingContent = {
  en: {
    INFORMAL_PERSONAL_MESSAGE: {
      B2: {
        start: [
          "Open with a warm, informal greeting, e.g. 'Salut [Prénom],' or 'Coucou,'.",
          "Say straight away why you're writing (news, an invitation, a story).",
        ],
        develop: [
          "Tell the story or give the news in clear time order (d'abord, ensuite, après).",
          "Add one or two concrete details so it feels personal, not generic.",
        ],
        finish: [
          "Close with a friendly sign-off, e.g. 'Bisous,' or 'À bientôt,'.",
          "Check you actually answered or asked what the topic required.",
        ],
      },
      C1: {
        start: [
          "Open naturally, e.g. 'Salut [Prénom], comment vas-tu ?', then bridge into your reason for writing.",
          "Set the scene in one sentence before the story or news starts.",
        ],
        develop: [
          "Vary your connectors beyond d'abord/ensuite/enfin (par ailleurs, du coup, en plus).",
          "Mix narration with a short reaction or opinion, as a friend would.",
        ],
        finish: [
          "End with a natural closing line that echoes your opening tone.",
          "Check your register stayed informal throughout — no stray 'Cordialement'.",
        ],
      },
      C2: {
        start: [
          "Open with an idiomatic, natural greeting rather than a textbook phrase.",
          "Draw the reader in with a lively first line, not just an announcement.",
        ],
        develop: [
          "Let register shift naturally — a joke, an aside, a rhetorical question — as in real correspondence.",
          "Use nuance and implication rather than stating every feeling directly.",
        ],
        finish: [
          "Leave the reader with a warm, personal final touch, not an abrupt stop.",
          "Reread for natural rhythm — does it sound like something you'd actually send?",
        ],
      },
    },
    FORMAL_PROFESSIONAL_MESSAGE: {
      B2: {
        start: [
          "Open with a formal greeting, e.g. 'Madame, Monsieur,' or the person's title.",
          "State clearly why you are writing in your first sentence.",
        ],
        develop: [
          "Explain the situation step by step, staying polite and factual.",
          "State clearly what you are asking for or reporting.",
        ],
        finish: [
          "Close with a formal sign-off, e.g. 'Cordialement,' or 'Veuillez agréer...'.",
          "Check your request or point is unmistakably clear.",
        ],
      },
      C1: {
        start: [
          "Open formally, then use a polite framing phrase, e.g. 'Je me permets de vous écrire afin de...'.",
          "Identify yourself and your situation briefly before the main request.",
        ],
        develop: [
          "Use professional connectors (par conséquent, néanmoins, dans ce contexte) to structure your reasoning.",
          "Justify your request with one or two concrete reasons.",
        ],
        finish: [
          "End with a courteous closing that restates what you need from the reader.",
          "Check register consistency — vous form and formal vocabulary throughout.",
        ],
      },
      C2: {
        start: [
          "Choose a precise, situation-appropriate opening rather than a generic formula.",
          "Signal the purpose and its importance in a controlled, professional tone.",
        ],
        develop: [
          "Maintain a consistently formal register — no informal words or contractions slip in.",
          "Anticipate the reader's likely concern and address it directly.",
        ],
        finish: [
          "Close with precision and courtesy, leaving no ambiguity about next steps.",
          "Reread for tone: professional and controlled, not stiff or overly ornate.",
        ],
      },
    },
    PUBLIC_ARTICLE_OR_NOTE: {
      B2: {
        start: [
          "Open with a clear title or first sentence that states the subject.",
          "Briefly say why this topic matters to your readers.",
        ],
        develop: [
          "Narrate your experience, then clearly give your opinion about it.",
          "Use simple connectors (de plus, par exemple) to link ideas.",
        ],
        finish: [
          "End by restating your opinion clearly for the reader.",
          "Check the piece matches its stated purpose (inform, convince, advise).",
        ],
      },
      C1: {
        start: [
          "Hook readers with a striking fact, question, or short anecdote.",
          "State the angle you'll take before narrating your experience.",
        ],
        develop: [
          "Balance narration and argument — don't just tell a story, comment on it.",
          "Support your opinion with a concrete example or comparison.",
        ],
        finish: [
          "Close with a takeaway or call to reflect, not just a summary.",
          "Check the tone stayed consistent with your chosen publication.",
        ],
      },
      C2: {
        start: [
          "Open with a confident, editorial voice that signals your stance early.",
          "Frame the topic so readers know exactly what's at stake.",
        ],
        develop: [
          "Weave narration and argument together fluidly, with varied sentence rhythm.",
          "Use precise vocabulary suited to your publication's tone and audience.",
        ],
        finish: [
          "End on a memorable line that reinforces your stance.",
          "Reread for a strong editorial voice from start to finish.",
        ],
      },
    },
    PUBLIC_LETTER: {
      B2: {
        start: [
          "Address the readership directly, e.g. 'Chers lecteurs,' or by naming the issue.",
          "State the issue you're writing about right away.",
        ],
        develop: [
          "Explain the issue, then give your opinion with clear reasons.",
          "Address readers directly at least once (vous).",
        ],
        finish: [
          "Close by restating your position and what you hope readers take away.",
          "Check the letter reads as addressed to readers, not one person.",
        ],
      },
      C1: {
        start: [
          "Open by framing why this issue concerns the publication's readers specifically.",
          "Establish your standpoint early, even briefly.",
        ],
        develop: [
          "Structure your reasoning with formal-public connectors (en effet, par conséquent).",
          "Anticipate a counter-view and respond to it briefly.",
        ],
        finish: [
          "End with a call to reflection or action for the readership.",
          "Check register consistency — public and formal throughout.",
        ],
      },
      C2: {
        start: [
          "Open with a public, persuasive voice suited to an open letter.",
          "Signal both the issue and your intended effect on the reader.",
        ],
        develop: [
          "Build a persuasive, structured argument with controlled rhetorical devices.",
          "Keep a consistently public-formal register, addressing readers as a group.",
        ],
        finish: [
          "Close with a strong, memorable appeal to the readership.",
          "Reread for persuasive coherence from opening to close.",
        ],
      },
    },
    ARGUMENTATIVE_ANALYSIS: {
      B2: {
        start: [
          "Introduce the topic in one or two neutral sentences.",
          "Say that you will present both viewpoints before giving your own.",
        ],
        develop: [
          "Present the first viewpoint, then the second, using clear connectors (d'une part, d'autre part).",
          "Give your own opinion with at least one clear reason.",
        ],
        finish: [
          "Conclude by clearly restating your position.",
          "Check you covered both documents and gave your own view.",
        ],
      },
      C1: {
        start: [
          "Introduce the issue and briefly frame the tension between the two documents.",
          "State your plan: both views, then your position.",
        ],
        develop: [
          "Present both viewpoints fairly before arguing for your own with nuance.",
          "Use varied argumentative connectors (cependant, néanmoins, en revanche).",
        ],
        finish: [
          "Close with a conclusion that follows logically from your argument.",
          "Check register stayed formal and impersonal throughout.",
        ],
      },
      C2: {
        start: [
          "Open with a precise framing of the debate's stakes.",
          "Signal an analytical structure without revealing your conclusion too early.",
        ],
        develop: [
          "Weigh both viewpoints critically, showing where each has merit and limits.",
          "Build your position with layered, precise reasoning, not just assertion.",
        ],
        finish: [
          "End with a conclusion that reflects the argument's nuance, not a flat restatement.",
          "Reread for a coherent, controlled analytical voice throughout.",
        ],
      },
    },
  },
  fr: {
    INFORMAL_PERSONAL_MESSAGE: {
      B2: {
        start: [
          "Commencez par une salutation informelle, par ex. « Salut [Prénom], » ou « Coucou, ».",
          "Dites tout de suite pourquoi vous écrivez (une nouvelle, une invitation, une histoire).",
        ],
        develop: [
          "Racontez dans l'ordre chronologique (d'abord, ensuite, après).",
          "Ajoutez un ou deux détails concrets pour que ce soit personnel.",
        ],
        finish: [
          "Terminez par une formule amicale, par ex. « Bisous, » ou « À bientôt, ».",
          "Vérifiez que vous avez bien répondu à ce que le sujet demandait.",
        ],
      },
      C1: {
        start: [
          "Ouvrez naturellement, par ex. « Salut [Prénom], comment vas-tu ? », puis enchaînez sur la raison de votre message.",
          "Plantez le décor en une phrase avant de raconter.",
        ],
        develop: [
          "Variez les connecteurs au-delà de d'abord/ensuite/enfin (par ailleurs, du coup, en plus).",
          "Mêlez le récit à une réaction ou une opinion, comme le ferait un ami.",
        ],
        finish: [
          "Concluez par une phrase naturelle qui fait écho à votre ouverture.",
          "Vérifiez que le registre est resté informel — pas de « Cordialement » égaré.",
        ],
      },
      C2: {
        start: [
          "Choisissez une accroche idiomatique et naturelle plutôt qu'une formule scolaire.",
          "Captez l'attention dès la première phrase, sans vous limiter à une simple annonce.",
        ],
        develop: [
          "Laissez le registre varier naturellement — une blague, une remarque, une question rhétorique.",
          "Suggérez plutôt que d'énoncer chaque sentiment directement.",
        ],
        finish: [
          "Laissez une touche finale chaleureuse et personnelle, sans coupure brusque.",
          "Relisez pour le rythme naturel — est-ce que ça sonne comme un vrai message ?",
        ],
      },
    },
    FORMAL_PROFESSIONAL_MESSAGE: {
      B2: {
        start: [
          "Commencez par une formule formelle, par ex. « Madame, Monsieur, » ou le titre du destinataire.",
          "Indiquez clairement pourquoi vous écrivez dès la première phrase.",
        ],
        develop: [
          "Expliquez la situation étape par étape, en restant poli et factuel.",
          "Formulez clairement votre demande ou votre signalement.",
        ],
        finish: [
          "Terminez par une formule formelle, par ex. « Cordialement, » ou « Veuillez agréer... ».",
          "Vérifiez que votre demande est parfaitement claire.",
        ],
      },
      C1: {
        start: [
          "Ouvrez formellement, puis utilisez une formule de politesse, par ex. « Je me permets de vous écrire afin de... ».",
          "Présentez brièvement votre situation avant la demande principale.",
        ],
        develop: [
          "Utilisez des connecteurs professionnels (par conséquent, néanmoins, dans ce contexte) pour structurer votre raisonnement.",
          "Justifiez votre demande par une ou deux raisons concrètes.",
        ],
        finish: [
          "Concluez par une formule courtoise qui rappelle ce que vous attendez du lecteur.",
          "Vérifiez la cohérence du registre — le vouvoiement et un vocabulaire formel partout.",
        ],
      },
      C2: {
        start: [
          "Choisissez une formule d'ouverture précise et adaptée à la situation plutôt qu'une formule générique.",
          "Signalez l'objet et son importance sur un ton professionnel maîtrisé.",
        ],
        develop: [
          "Maintenez un registre formel constant — aucun mot familier ni contraction.",
          "Anticipez la préoccupation probable du lecteur et répondez-y directement.",
        ],
        finish: [
          "Concluez avec précision et courtoisie, sans ambiguïté sur la suite à donner.",
          "Relisez pour le ton : professionnel et maîtrisé, ni raide ni trop ampoulé.",
        ],
      },
    },
    PUBLIC_ARTICLE_OR_NOTE: {
      B2: {
        start: [
          "Commencez par un titre ou une première phrase qui annonce clairement le sujet.",
          "Dites brièvement pourquoi ce sujet concerne vos lecteurs.",
        ],
        develop: [
          "Racontez votre expérience, puis donnez clairement votre avis.",
          "Utilisez des connecteurs simples (de plus, par exemple) pour lier les idées.",
        ],
        finish: [
          "Terminez en rappelant clairement votre avis.",
          "Vérifiez que le texte correspond à son objectif (informer, convaincre, conseiller).",
        ],
      },
      C1: {
        start: [
          "Accrochez le lecteur avec un fait marquant, une question ou une courte anecdote.",
          "Annoncez l'angle choisi avant de raconter votre expérience.",
        ],
        develop: [
          "Équilibrez récit et argumentation — ne vous contentez pas de raconter, commentez.",
          "Appuyez votre avis sur un exemple concret ou une comparaison.",
        ],
        finish: [
          "Concluez par une idée à retenir plutôt qu'un simple résumé.",
          "Vérifiez que le ton est resté cohérent avec le support choisi.",
        ],
      },
      C2: {
        start: [
          "Adoptez d'emblée une voix éditoriale affirmée qui signale votre position.",
          "Cadrez le sujet pour que le lecteur perçoive immédiatement l'enjeu.",
        ],
        develop: [
          "Entrelacez récit et argumentation avec fluidité, en variant le rythme des phrases.",
          "Employez un vocabulaire précis, adapté au ton de votre support.",
        ],
        finish: [
          "Terminez sur une phrase marquante qui renforce votre position.",
          "Relisez pour une voix éditoriale forte du début à la fin.",
        ],
      },
    },
    PUBLIC_LETTER: {
      B2: {
        start: [
          "Adressez-vous directement aux lecteurs, par ex. « Chers lecteurs, » ou en nommant le sujet.",
          "Indiquez tout de suite le sujet dont vous parlez.",
        ],
        develop: [
          "Exposez le sujet, puis donnez votre avis avec des raisons claires.",
          "Adressez-vous directement aux lecteurs au moins une fois (vous).",
        ],
        finish: [
          "Terminez en rappelant votre position et ce que vous attendez des lecteurs.",
          "Vérifiez que la lettre s'adresse bien aux lecteurs, pas à une seule personne.",
        ],
      },
      C1: {
        start: [
          "Expliquez d'emblée en quoi ce sujet concerne particulièrement les lecteurs de la publication.",
          "Annoncez votre position dès le début, même brièvement.",
        ],
        develop: [
          "Structurez votre raisonnement avec des connecteurs formels (en effet, par conséquent).",
          "Anticipez un point de vue contraire et répondez-y brièvement.",
        ],
        finish: [
          "Concluez par un appel à la réflexion ou à l'action pour les lecteurs.",
          "Vérifiez la cohérence du registre — public et formel du début à la fin.",
        ],
      },
      C2: {
        start: [
          "Adoptez une voix publique et persuasive, adaptée à une lettre ouverte.",
          "Signalez à la fois le sujet et l'effet recherché sur le lecteur.",
        ],
        develop: [
          "Construisez une argumentation persuasive et structurée, avec des procédés rhétoriques maîtrisés.",
          "Gardez un registre public et formel constant, en vous adressant aux lecteurs comme groupe.",
        ],
        finish: [
          "Terminez par un appel fort et mémorable aux lecteurs.",
          "Relisez pour la cohérence persuasive de l'ensemble.",
        ],
      },
    },
    ARGUMENTATIVE_ANALYSIS: {
      B2: {
        start: [
          "Présentez le sujet en une ou deux phrases neutres.",
          "Annoncez que vous présenterez les deux points de vue avant de donner le vôtre.",
        ],
        develop: [
          "Présentez le premier point de vue, puis le second, avec des connecteurs clairs (d'une part, d'autre part).",
          "Donnez votre propre avis avec au moins une raison claire.",
        ],
        finish: [
          "Concluez en rappelant clairement votre position.",
          "Vérifiez que vous avez traité les deux documents et donné votre avis.",
        ],
      },
      C1: {
        start: [
          "Présentez l'enjeu et esquissez brièvement la tension entre les deux documents.",
          "Annoncez votre plan : les deux points de vue, puis votre position.",
        ],
        develop: [
          "Présentez les deux points de vue avec équité avant de défendre le vôtre avec nuance.",
          "Utilisez des connecteurs argumentatifs variés (cependant, néanmoins, en revanche).",
        ],
        finish: [
          "Concluez de façon cohérente avec votre raisonnement.",
          "Vérifiez que le registre est resté formel et impersonnel.",
        ],
      },
      C2: {
        start: [
          "Cadrez avec précision les enjeux du débat.",
          "Annoncez une structure analytique sans révéler votre conclusion trop tôt.",
        ],
        develop: [
          "Évaluez les deux points de vue de façon critique, en montrant leurs mérites et leurs limites.",
          "Construisez votre position avec un raisonnement précis et nuancé, pas une simple affirmation.",
        ],
        finish: [
          "Terminez par une conclusion qui reflète la nuance de votre analyse, pas une simple répétition.",
          "Relisez pour une voix analytique cohérente et maîtrisée du début à la fin.",
        ],
      },
    },
  },
  es: {
    INFORMAL_PERSONAL_MESSAGE: {
      B2: {
        start: [
          "Empieza con un saludo informal, por ej. «Hola [Nombre],» o «¿Qué tal?».",
          "Di enseguida por qué escribes (una noticia, una invitación, una historia).",
        ],
        develop: [
          "Cuenta los hechos en orden cronológico (primero, luego, después).",
          "Añade uno o dos detalles concretos para que suene personal.",
        ],
        finish: [
          "Cierra con una despedida cercana, por ej. «Un abrazo,» o «Hasta pronto,».",
          "Comprueba que respondiste a lo que pedía el tema.",
        ],
      },
      C1: {
        start: [
          "Abre de forma natural, por ej. «Hola [Nombre], ¿cómo estás?», y enlaza con el motivo de tu mensaje.",
          "Sitúa brevemente el contexto antes de contar la historia.",
        ],
        develop: [
          "Varía los conectores más allá de primero/luego/por último (además, así que, por otro lado).",
          "Combina el relato con una reacción u opinión, como haría un amigo.",
        ],
        finish: [
          "Termina con una frase natural que retome el tono de tu apertura.",
          "Comprueba que el registro se mantuvo informal — sin un «Atentamente» perdido.",
        ],
      },
      C2: {
        start: [
          "Elige una apertura idiomática y natural, no una fórmula de manual.",
          "Atrapa al lector desde la primera frase, no te limites a anunciar el tema.",
        ],
        develop: [
          "Deja que el registro varíe con naturalidad — una broma, un comentario, una pregunta retórica.",
          "Sugiere en vez de enunciar cada sentimiento directamente.",
        ],
        finish: [
          "Deja un cierre cálido y personal, sin cortar de forma brusca.",
          "Relee buscando naturalidad — ¿suena como algo que realmente enviarías?",
        ],
      },
    },
    FORMAL_PROFESSIONAL_MESSAGE: {
      B2: {
        start: [
          "Empieza con un saludo formal, por ej. «Estimado/a Sr./Sra.,» o el cargo del destinatario.",
          "Indica con claridad por qué escribes en la primera frase.",
        ],
        develop: [
          "Explica la situación paso a paso, con cortesía y de forma objetiva.",
          "Formula con claridad tu petición o lo que informas.",
        ],
        finish: [
          "Cierra con una despedida formal, por ej. «Atentamente,» o «Reciba un cordial saludo,».",
          "Comprueba que tu petición quede totalmente clara.",
        ],
      },
      C1: {
        start: [
          "Abre formalmente y usa una fórmula de cortesía, por ej. «Me dirijo a usted para...».",
          "Preséntate brevemente antes de exponer la petición principal.",
        ],
        develop: [
          "Usa conectores profesionales (por consiguiente, no obstante, en este contexto) para estructurar tu razonamiento.",
          "Justifica tu petición con una o dos razones concretas.",
        ],
        finish: [
          "Termina con un cierre cortés que recuerde lo que necesitas del lector.",
          "Comprueba la coherencia del registro — trato formal y vocabulario formal en todo el texto.",
        ],
      },
      C2: {
        start: [
          "Elige una apertura precisa y adecuada a la situación, no una fórmula genérica.",
          "Señala el motivo y su importancia con un tono profesional controlado.",
        ],
        develop: [
          "Mantén un registro formal constante — sin palabras coloquiales ni contracciones.",
          "Anticipa la posible objeción del lector y respóndela directamente.",
        ],
        finish: [
          "Cierra con precisión y cortesía, sin ambigüedad sobre los próximos pasos.",
          "Relee el tono: profesional y controlado, ni rígido ni recargado.",
        ],
      },
    },
    PUBLIC_ARTICLE_OR_NOTE: {
      B2: {
        start: [
          "Empieza con un título o una primera frase que anuncie claramente el tema.",
          "Explica brevemente por qué este tema interesa a tus lectores.",
        ],
        develop: [
          "Narra tu experiencia y luego da tu opinión con claridad.",
          "Usa conectores simples (además, por ejemplo) para enlazar ideas.",
        ],
        finish: [
          "Termina recordando con claridad tu opinión.",
          "Comprueba que el texto cumple su objetivo (informar, convencer, aconsejar).",
        ],
      },
      C1: {
        start: [
          "Atrae al lector con un dato llamativo, una pregunta o una breve anécdota.",
          "Anuncia el enfoque antes de narrar tu experiencia.",
        ],
        develop: [
          "Equilibra narración y argumentación — no te limites a contar, comenta.",
          "Apoya tu opinión con un ejemplo concreto o una comparación.",
        ],
        finish: [
          "Cierra con una idea para recordar, no solo un resumen.",
          "Comprueba que el tono se mantuvo coherente con la publicación elegida.",
        ],
      },
      C2: {
        start: [
          "Adopta desde el inicio una voz editorial firme que muestre tu postura.",
          "Enmarca el tema para que el lector perciba de inmediato lo que está en juego.",
        ],
        develop: [
          "Entrelaza narración y argumentación con fluidez, variando el ritmo de las frases.",
          "Usa vocabulario preciso, adecuado al tono de tu publicación.",
        ],
        finish: [
          "Termina con una frase memorable que refuerce tu postura.",
          "Relee buscando una voz editorial fuerte de principio a fin.",
        ],
      },
    },
    PUBLIC_LETTER: {
      B2: {
        start: [
          "Dirígete directamente a los lectores, por ej. «Estimados lectores,» o nombrando el tema.",
          "Indica de inmediato el tema del que hablas.",
        ],
        develop: [
          "Expón el tema y luego da tu opinión con razones claras.",
          "Dirígete a los lectores directamente al menos una vez (usted/ustedes).",
        ],
        finish: [
          "Termina recordando tu postura y lo que esperas de los lectores.",
          "Comprueba que la carta se dirige a los lectores, no a una sola persona.",
        ],
      },
      C1: {
        start: [
          "Explica desde el principio por qué este tema concierne especialmente a los lectores de la publicación.",
          "Anuncia tu postura desde el inicio, aunque sea brevemente.",
        ],
        develop: [
          "Estructura tu razonamiento con conectores formales (en efecto, por consiguiente).",
          "Anticipa un punto de vista contrario y respóndelo brevemente.",
        ],
        finish: [
          "Cierra con una llamada a la reflexión o a la acción para los lectores.",
          "Comprueba la coherencia del registro — público y formal de principio a fin.",
        ],
      },
      C2: {
        start: [
          "Adopta una voz pública y persuasiva, propia de una carta abierta.",
          "Señala a la vez el tema y el efecto que buscas en el lector.",
        ],
        develop: [
          "Construye una argumentación persuasiva y estructurada, con recursos retóricos controlados.",
          "Mantén un registro público y formal constante, dirigiéndote a los lectores como grupo.",
        ],
        finish: [
          "Termina con un llamamiento fuerte y memorable a los lectores.",
          "Relee buscando coherencia persuasiva en todo el texto.",
        ],
      },
    },
    ARGUMENTATIVE_ANALYSIS: {
      B2: {
        start: [
          "Presenta el tema en una o dos frases neutrales.",
          "Anuncia que presentarás ambos puntos de vista antes de dar el tuyo.",
        ],
        develop: [
          "Presenta el primer punto de vista, luego el segundo, con conectores claros (por un lado, por otro).",
          "Da tu propia opinión con al menos una razón clara.",
        ],
        finish: [
          "Concluye recordando con claridad tu postura.",
          "Comprueba que trataste ambos documentos y diste tu opinión.",
        ],
      },
      C1: {
        start: [
          "Presenta el problema y esboza brevemente la tensión entre ambos documentos.",
          "Anuncia tu plan: ambos puntos de vista y luego tu postura.",
        ],
        develop: [
          "Presenta ambos puntos de vista con equidad antes de defender el tuyo con matices.",
          "Usa conectores argumentativos variados (sin embargo, no obstante, en cambio).",
        ],
        finish: [
          "Cierra con una conclusión coherente con tu razonamiento.",
          "Comprueba que el registro se mantuvo formal e impersonal.",
        ],
      },
      C2: {
        start: [
          "Enmarca con precisión lo que está en juego en el debate.",
          "Anuncia una estructura analítica sin revelar tu conclusión demasiado pronto.",
        ],
        develop: [
          "Evalúa ambos puntos de vista de forma crítica, mostrando sus méritos y límites.",
          "Construye tu postura con un razonamiento preciso y matizado, no una simple afirmación.",
        ],
        finish: [
          "Termina con una conclusión que refleje el matiz de tu análisis, no una simple repetición.",
          "Relee buscando una voz analítica coherente y controlada de principio a fin.",
        ],
      },
    },
  },
  pt: {
    INFORMAL_PERSONAL_MESSAGE: {
      B2: {
        start: [
          "Comece com uma saudação informal, por ex. «Oi [Nome],» ou «E aí,».",
          "Diga logo por que está escrevendo (uma notícia, um convite, uma história).",
        ],
        develop: [
          "Conte os fatos em ordem cronológica (primeiro, depois, em seguida).",
          "Acrescente um ou dois detalhes concretos para soar pessoal.",
        ],
        finish: [
          "Feche com uma despedida amigável, por ex. «Um abraço,» ou «Até logo,».",
          "Confira se você respondeu ao que o tema pedia.",
        ],
      },
      C1: {
        start: [
          "Abra de forma natural, por ex. «Oi [Nome], tudo bem?», e emende com o motivo da mensagem.",
          "Situe brevemente o contexto antes de contar a história.",
        ],
        develop: [
          "Varie os conectores além de primeiro/depois/por fim (aliás, aí, por outro lado).",
          "Combine o relato com uma reação ou opinião, como faria um amigo.",
        ],
        finish: [
          "Termine com uma frase natural que retome o tom da abertura.",
          "Confira se o registro permaneceu informal — sem um «Atenciosamente» perdido.",
        ],
      },
      C2: {
        start: [
          "Escolha uma abertura idiomática e natural, não uma fórmula de manual.",
          "Prenda o leitor já na primeira frase, sem se limitar a um simples aviso.",
        ],
        develop: [
          "Deixe o registro variar naturalmente — uma piada, um comentário, uma pergunta retórica.",
          "Sugira em vez de declarar cada sentimento diretamente.",
        ],
        finish: [
          "Deixe um toque final caloroso e pessoal, sem interromper de forma brusca.",
          "Releia buscando naturalidade — soa como algo que você realmente enviaria?",
        ],
      },
    },
    FORMAL_PROFESSIONAL_MESSAGE: {
      B2: {
        start: [
          "Comece com uma saudação formal, por ex. «Prezado(a) Senhor(a),» ou o cargo do destinatário.",
          "Indique claramente por que está escrevendo já na primeira frase.",
        ],
        develop: [
          "Explique a situação passo a passo, com cortesia e objetividade.",
          "Formule com clareza seu pedido ou o que está relatando.",
        ],
        finish: [
          "Feche com uma despedida formal, por ex. «Atenciosamente,» ou «Cordialmente,».",
          "Confira se seu pedido está totalmente claro.",
        ],
      },
      C1: {
        start: [
          "Abra formalmente e use uma fórmula de cortesia, por ex. «Venho por meio desta solicitar...».",
          "Apresente-se brevemente antes do pedido principal.",
        ],
        develop: [
          "Use conectores profissionais (portanto, contudo, nesse contexto) para estruturar seu raciocínio.",
          "Justifique seu pedido com uma ou duas razões concretas.",
        ],
        finish: [
          "Termine com um fechamento cortês que retome o que você precisa do leitor.",
          "Confira a coerência do registro — tratamento formal e vocabulário formal em todo o texto.",
        ],
      },
      C2: {
        start: [
          "Escolha uma abertura precisa e adequada à situação, não uma fórmula genérica.",
          "Sinalize o motivo e sua importância com um tom profissional controlado.",
        ],
        develop: [
          "Mantenha um registro formal constante — sem palavras informais ou contrações.",
          "Antecipe a possível objeção do leitor e responda diretamente.",
        ],
        finish: [
          "Feche com precisão e cortesia, sem ambiguidade sobre os próximos passos.",
          "Releia o tom: profissional e controlado, nem rígido nem rebuscado.",
        ],
      },
    },
    PUBLIC_ARTICLE_OR_NOTE: {
      B2: {
        start: [
          "Comece com um título ou uma primeira frase que anuncie claramente o tema.",
          "Explique brevemente por que esse tema interessa aos seus leitores.",
        ],
        develop: [
          "Narre sua experiência e depois dê sua opinião com clareza.",
          "Use conectores simples (além disso, por exemplo) para ligar as ideias.",
        ],
        finish: [
          "Termine retomando com clareza sua opinião.",
          "Confira se o texto cumpre seu objetivo (informar, convencer, aconselhar).",
        ],
      },
      C1: {
        start: [
          "Atraia o leitor com um dado marcante, uma pergunta ou uma breve anedota.",
          "Anuncie o enfoque antes de narrar sua experiência.",
        ],
        develop: [
          "Equilibre narração e argumentação — não se limite a contar, comente.",
          "Apoie sua opinião com um exemplo concreto ou uma comparação.",
        ],
        finish: [
          "Feche com uma ideia para lembrar, não apenas um resumo.",
          "Confira se o tom permaneceu coerente com a publicação escolhida.",
        ],
      },
      C2: {
        start: [
          "Adote desde o início uma voz editorial firme que mostre sua posição.",
          "Enquadre o tema para que o leitor perceba de imediato o que está em jogo.",
        ],
        develop: [
          "Entrelace narração e argumentação com fluidez, variando o ritmo das frases.",
          "Use vocabulário preciso, adequado ao tom da sua publicação.",
        ],
        finish: [
          "Termine com uma frase marcante que reforce sua posição.",
          "Releia buscando uma voz editorial forte do início ao fim.",
        ],
      },
    },
    PUBLIC_LETTER: {
      B2: {
        start: [
          "Dirija-se diretamente aos leitores, por ex. «Prezados leitores,» ou nomeando o tema.",
          "Indique de imediato o tema de que está falando.",
        ],
        develop: [
          "Exponha o tema e depois dê sua opinião com razões claras.",
          "Dirija-se aos leitores diretamente pelo menos uma vez (você/vocês).",
        ],
        finish: [
          "Termine retomando sua posição e o que espera dos leitores.",
          "Confira se a carta se dirige aos leitores, não a uma única pessoa.",
        ],
      },
      C1: {
        start: [
          "Explique desde o início por que esse tema interessa especialmente aos leitores da publicação.",
          "Anuncie sua posição já no início, mesmo que brevemente.",
        ],
        develop: [
          "Estruture seu raciocínio com conectores formais (com efeito, portanto).",
          "Antecipe um ponto de vista contrário e responda brevemente.",
        ],
        finish: [
          "Feche com um chamado à reflexão ou à ação para os leitores.",
          "Confira a coerência do registro — público e formal do início ao fim.",
        ],
      },
      C2: {
        start: [
          "Adote uma voz pública e persuasiva, própria de uma carta aberta.",
          "Sinalize ao mesmo tempo o tema e o efeito que busca no leitor.",
        ],
        develop: [
          "Construa uma argumentação persuasiva e estruturada, com recursos retóricos controlados.",
          "Mantenha um registro público e formal constante, dirigindo-se aos leitores como grupo.",
        ],
        finish: [
          "Termine com um apelo forte e memorável aos leitores.",
          "Releia buscando coerência persuasiva em todo o texto.",
        ],
      },
    },
    ARGUMENTATIVE_ANALYSIS: {
      B2: {
        start: [
          "Apresente o tema em uma ou duas frases neutras.",
          "Anuncie que vai apresentar os dois pontos de vista antes de dar o seu.",
        ],
        develop: [
          "Apresente o primeiro ponto de vista, depois o segundo, com conectores claros (por um lado, por outro).",
          "Dê sua própria opinião com pelo menos uma razão clara.",
        ],
        finish: [
          "Conclua retomando com clareza sua posição.",
          "Confira se você tratou os dois documentos e deu sua opinião.",
        ],
      },
      C1: {
        start: [
          "Apresente a questão e esboce brevemente a tensão entre os dois documentos.",
          "Anuncie seu plano: os dois pontos de vista e depois sua posição.",
        ],
        develop: [
          "Apresente os dois pontos de vista com equidade antes de defender o seu com nuance.",
          "Use conectores argumentativos variados (contudo, no entanto, já).",
        ],
        finish: [
          "Feche com uma conclusão coerente com seu raciocínio.",
          "Confira se o registro permaneceu formal e impessoal.",
        ],
      },
      C2: {
        start: [
          "Enquadre com precisão o que está em jogo no debate.",
          "Anuncie uma estrutura analítica sem revelar sua conclusão cedo demais.",
        ],
        develop: [
          "Avalie os dois pontos de vista de forma crítica, mostrando méritos e limites de cada um.",
          "Construa sua posição com um raciocínio preciso e matizado, não uma simples afirmação.",
        ],
        finish: [
          "Termine com uma conclusão que reflita a nuance da sua análise, não uma simples repetição.",
          "Releia buscando uma voz analítica coerente e controlada do início ao fim.",
        ],
      },
    },
  },
};

export function getGuidedWritingTips(
  locale: AppLocale,
  profile: GuideProfile,
  level: TargetLevel,
  stage: GuideStage,
): readonly string[] {
  return GUIDED_WRITING_TIPS[locale][profile][level][stage];
}

// Exercised by guided-writing.test.ts, mirroring app-copy.test.ts's
// completeness check: every locale must have non-empty, renderable tips for
// every profile/level/stage combination.
export function forEachGuidedWritingCell(
  callback: (cell: {
    locale: AppLocale;
    profile: GuideProfile;
    level: TargetLevel;
    stage: GuideStage;
    tips: readonly string[];
  }) => void,
): void {
  for (const locale of APP_LOCALES) {
    for (const profile of GUIDE_PROFILES) {
      for (const level of TARGET_LEVELS) {
        for (const stage of GUIDE_STAGES) {
          callback({ locale, profile, level, stage, tips: GUIDED_WRITING_TIPS[locale][profile][level][stage] });
        }
      }
    }
  }
}
