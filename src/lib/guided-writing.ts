import type { GuideProfile, TaskType } from "@prisma/client";
import type { AppLocale } from "@/lib/app-locale";

// See docs/guided-writing.md. All guide content is fixed, reviewed
// application data (French phrase banks provided by the product owner) --
// no model request or generative AI selects or writes any of it.

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

export function isTargetLevel(value: unknown): value is TargetLevel {
  return value === "B2" || value === "C1" || value === "C2";
}

// Each task walks through its own sequence of moves -- Tâche 1 is a short
// personal/professional message, Tâche 2 narrates-then-argues for a public
// readership, Tâche 3 analyzes two documents before taking a position. The
// guide steps through this sequence one move at a time (see
// WritingGuidePanel) rather than exposing every move as an equally-weighted
// tab, since the moves are ordered, not interchangeable.
export type GuideStage =
  | "start"
  | "recount"
  | "develop"
  | "ask"
  | "addArgument"
  | "nuance"
  | "synthesize"
  | "position"
  | "finish";

export const TASK_GUIDE_STAGES: Record<TaskType, readonly GuideStage[]> = {
  TASK_1: ["start", "develop", "ask", "finish"],
  TASK_2: ["start", "recount", "develop", "addArgument", "nuance", "finish"],
  TASK_3: ["start", "synthesize", "position", "nuance", "finish"],
};

// These are available writing moves, not compulsory paragraphs. Keeping the
// optional state visible prevents a short response from feeling like it needs
// to satisfy every card in the guide.
export const OPTIONAL_GUIDE_STAGES: Partial<Record<TaskType, readonly GuideStage[]>> = {
  TASK_1: ["ask"],
  TASK_2: ["nuance"],
  TASK_3: ["nuance"],
};

export function isOptionalGuideStage(taskType: TaskType, stage: GuideStage): boolean {
  return OPTIONAL_GUIDE_STAGES[taskType]?.includes(stage) ?? false;
}

// Register (informal vs. formal) only changes Tâche 1's content -- Tâche 2
// is always a public article/letter and Tâche 3 is always an impersonal
// analysis, so both of their profiles share one task each.
export const PROFILE_TASK_TYPE: Record<GuideProfile, TaskType> = {
  INFORMAL_PERSONAL_MESSAGE: "TASK_1",
  FORMAL_PROFESSIONAL_MESSAGE: "TASK_1",
  PUBLIC_ARTICLE_OR_NOTE: "TASK_2",
  PUBLIC_LETTER: "TASK_2",
  ARGUMENTATIVE_ANALYSIS: "TASK_3",
};

export function getGuideStagesForProfile(profile: GuideProfile): readonly GuideStage[] {
  return TASK_GUIDE_STAGES[PROFILE_TASK_TYPE[profile]];
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

// Keyed by task, not by profile: the stage names describe the rhetorical
// move (an opening, a synthesis, a conclusion), which doesn't change with
// register the way the phrase bank itself does.
export const GUIDE_STAGE_LABELS: Record<AppLocale, Record<TaskType, Partial<Record<GuideStage, string>>>> = {
  en: {
    TASK_1: {
      start: "Open the message",
      develop: "Add the useful details",
      ask: "Add an action or request",
      finish: "Check and finish",
    },
    TASK_2: {
      start: "Set the format",
      recount: "Recount the experience",
      develop: "Comment or give your view",
      addArgument: "Add a second idea",
      nuance: "Add a limit or another view",
      finish: "Check and conclude",
    },
    TASK_3: {
      start: "Present the issue",
      synthesize: "Compare both documents",
      position: "Give your position",
      nuance: "Qualify your view",
      finish: "Check and conclude",
    },
  },
  fr: {
    TASK_1: {
      start: "Ouvrir le message",
      develop: "Ajouter les détails utiles",
      ask: "Ajouter une action ou une demande",
      finish: "Vérifier et terminer",
    },
    TASK_2: {
      start: "Choisir le format",
      recount: "Raconter l'expérience",
      develop: "Commenter ou donner son avis",
      addArgument: "Ajouter une deuxième idée",
      nuance: "Ajouter une limite ou un autre point de vue",
      finish: "Vérifier et conclure",
    },
    TASK_3: {
      start: "Présenter la problématique",
      synthesize: "Comparer les deux documents",
      position: "Donner sa propre position",
      nuance: "Nuancer sa position",
      finish: "Vérifier et conclure",
    },
  },
  es: {
    TASK_1: {
      start: "Abrir el mensaje",
      develop: "Añadir los detalles útiles",
      ask: "Añadir una acción o petición",
      finish: "Revisar y terminar",
    },
    TASK_2: {
      start: "Elegir el formato",
      recount: "Contar la experiencia",
      develop: "Comentar o dar tu opinión",
      addArgument: "Añadir una segunda idea",
      nuance: "Añadir un límite u otro punto de vista",
      finish: "Revisar y concluir",
    },
    TASK_3: {
      start: "Presentar la problemática",
      synthesize: "Comparar los dos documentos",
      position: "Dar tu posición",
      nuance: "Matizar tu posición",
      finish: "Revisar y concluir",
    },
  },
  pt: {
    TASK_1: {
      start: "Abrir a mensagem",
      develop: "Acrescentar detalhes úteis",
      ask: "Acrescentar uma ação ou pedido",
      finish: "Revisar e terminar",
    },
    TASK_2: {
      start: "Escolher o formato",
      recount: "Contar a experiência",
      develop: "Comentar ou dar sua opinião",
      addArgument: "Acrescentar uma segunda ideia",
      nuance: "Acrescentar um limite ou outro ponto de vista",
      finish: "Revisar e concluir",
    },
    TASK_3: {
      start: "Apresentar a problemática",
      synthesize: "Comparar os dois documentos",
      position: "Dar sua posição",
      nuance: "Nuancear sua posição",
      finish: "Revisar e concluir",
    },
  },
};

export function getGuideStageLabel(locale: AppLocale, taskType: TaskType, stage: GuideStage): string {
  return GUIDE_STAGE_LABELS[locale][taskType][stage] ?? stage;
}

// These prompts deliberately ask the learner to choose content before they
// reach for a connector. They are task-aware, static coaching—not an attempt
// to generate an answer for an arbitrary subject.
type IdeaPromptContent = Record<AppLocale, Record<TaskType, Partial<Record<GuideStage, readonly string[]>>>>;

export const GUIDED_WRITING_IDEA_PROMPTS: IdeaPromptContent = {
  en: {
    TASK_1: {
      start: ["Who are you writing to, and why?", "Choose an opening that fits that relationship."],
      develop: ["Pick two or three facts the reader needs to know.", "Add one reaction, feeling, or useful explanation."],
      ask: ["Use this only if the prompt calls for it: invite, thank, reassure, ask, or suggest what happens next."],
    },
    TASK_2: {
      start: ["What type of text are you writing, and for which readers?", "For an article or note, choose a short title that signals the subject."],
      recount: ["When and where did it happen, and who was involved?", "Choose two concrete moments that show your experience."],
      develop: ["What did you think or feel about this experience?", "How does that support the purpose in the prompt?"],
      addArgument: ["What second reason or example strengthens your point?", "What do you want readers to understand or do?"],
      nuance: ["Is there a limit or another point of view worth acknowledging?"],
    },
    TASK_3: {
      start: ["What issue connects both documents?", "Name it neutrally before giving your own view."],
      synthesize: ["Document 1: what is the main claim and why? Document 2: what is the main claim and why?", "What is their key difference or common concern? Rephrase it in your own words."],
      position: ["Which view do you favour, or how would you qualify both?", "Give one concrete reason or example for your view."],
      nuance: ["What limit, consequence, or opposing view makes your position more balanced?"],
    },
  },
  fr: {
    TASK_1: {
      start: ["À qui écrivez-vous, et dans quel but ?", "Choisissez une ouverture adaptée à cette relation."],
      develop: ["Choisissez deux ou trois faits que le destinataire doit connaître.", "Ajoutez une réaction, un sentiment ou une explication utile."],
      ask: ["Utilisez cette étape seulement si la consigne le demande : inviter, remercier, rassurer, demander ou proposer la suite."],
    },
    TASK_2: {
      start: ["Quel type de texte écrivez-vous, et pour quels lecteurs ?", "Pour un article ou une note, choisissez un titre court qui annonce le sujet."],
      recount: ["Quand et où l'événement a-t-il eu lieu, et avec qui ?", "Choisissez deux moments concrets qui montrent votre expérience."],
      develop: ["Qu'avez-vous pensé ou ressenti pendant cette expérience ?", "En quoi cela sert-il l'objectif donné dans la consigne ?"],
      addArgument: ["Quelle deuxième raison ou quel exemple renforce votre idée ?", "Que voulez-vous que les lecteurs comprennent ou fassent ?"],
      nuance: ["Y a-t-il une limite ou un autre point de vue qu'il est utile de reconnaître ?"],
    },
    TASK_3: {
      start: ["Quelle problématique relie les deux documents ?", "Nommez-la de façon neutre avant de donner votre avis."],
      synthesize: ["Document 1 : quelle est l'idée principale et pourquoi ? Document 2 : quelle est l'idée principale et pourquoi ?", "Quelle différence essentielle ou quelle préoccupation commune voyez-vous ? Reformulez avec vos propres mots."],
      position: ["Quelle position privilégiez-vous, ou comment nuanceriez-vous les deux ?", "Donnez une raison ou un exemple concret pour défendre votre avis."],
      nuance: ["Quelle limite, conséquence ou opinion contraire rend votre position plus équilibrée ?"],
    },
  },
  es: {
    TASK_1: {
      start: ["¿A quién escribes y para qué?", "Elige una apertura adecuada para esa relación."],
      develop: ["Elige dos o tres datos que el destinatario necesita conocer.", "Añade una reacción, sentimiento o explicación útil."],
      ask: ["Usa este paso solo si la consigna lo pide: invitar, agradecer, tranquilizar, pedir o proponer lo que sigue."],
    },
    TASK_2: {
      start: ["¿Qué tipo de texto escribes y para qué lectores?", "Para un artículo o una nota, elige un título breve que anuncie el tema."],
      recount: ["¿Cuándo y dónde ocurrió el hecho, y con quién?", "Elige dos momentos concretos que muestren tu experiencia."],
      develop: ["¿Qué pensaste o sentiste durante esta experiencia?", "¿Cómo contribuye eso al objetivo de la consigna?"],
      addArgument: ["¿Qué segunda razón o ejemplo refuerza tu idea?", "¿Qué quieres que los lectores comprendan o hagan?"],
      nuance: ["¿Hay un límite u otro punto de vista que convenga reconocer?"],
    },
    TASK_3: {
      start: ["¿Qué cuestión relaciona los dos documentos?", "Nómbrala de forma neutral antes de dar tu opinión."],
      synthesize: ["Documento 1: ¿cuál es la idea principal y por qué? Documento 2: ¿cuál es la idea principal y por qué?", "¿Cuál es la diferencia esencial o preocupación común? Reformúlala con tus propias palabras."],
      position: ["¿Qué postura prefieres o cómo matizarías las dos?", "Da una razón o ejemplo concreto para defender tu opinión."],
      nuance: ["¿Qué límite, consecuencia u opinión contraria hace tu postura más equilibrada?"],
    },
  },
  pt: {
    TASK_1: {
      start: ["Para quem você está escrevendo e com qual objetivo?", "Escolha uma abertura adequada para essa relação."],
      develop: ["Escolha dois ou três fatos que o destinatário precisa conhecer.", "Acrescente uma reação, sentimento ou explicação útil."],
      ask: ["Use esta etapa apenas se a instrução pedir: convidar, agradecer, tranquilizar, pedir ou sugerir o que acontece a seguir."],
    },
    TASK_2: {
      start: ["Que tipo de texto você está escrevendo e para quais leitores?", "Para um artigo ou uma nota, escolha um título curto que anuncie o assunto."],
      recount: ["Quando e onde o fato aconteceu, e com quem?", "Escolha dois momentos concretos que mostrem sua experiência."],
      develop: ["O que você pensou ou sentiu durante essa experiência?", "Como isso atende ao objetivo da instrução?"],
      addArgument: ["Que segunda razão ou exemplo reforça sua ideia?", "O que você quer que os leitores entendam ou façam?"],
      nuance: ["Há um limite ou outro ponto de vista que vale a pena reconhecer?"],
    },
    TASK_3: {
      start: ["Que problemática relaciona os dois documentos?", "Nomeie-a de forma neutra antes de dar sua opinião."],
      synthesize: ["Documento 1: qual é a ideia principal e por quê? Documento 2: qual é a ideia principal e por quê?", "Qual é a diferença essencial ou preocupação comum? Reformule-a com suas próprias palavras."],
      position: ["Que posição você privilegia ou como matizaria as duas?", "Dê uma razão ou exemplo concreto para defender sua opinião."],
      nuance: ["Que limite, consequência ou opinião contrária torna sua posição mais equilibrada?"],
    },
  },
};

export function getGuidedWritingIdeaPrompts(
  locale: AppLocale,
  taskType: TaskType,
  stage: GuideStage,
): readonly string[] {
  return GUIDED_WRITING_IDEA_PROMPTS[locale][taskType][stage] ?? [];
}

export const GUIDED_WRITING_COMPLETION_CHECKS: Record<AppLocale, Record<TaskType, readonly string[]>> = {
  en: {
    TASK_1: ["Did I give the two or three details requested?", "Does the tone fit the recipient?", "Does the message have an appropriate opening and ending?", "Am I within the word range?"],
    TASK_2: ["Did I recount the experience with concrete details?", "Did I add my comment or opinion and achieve the stated purpose?", "Does the text type fit its readers?", "Am I within the word range?"],
    TASK_3: ["Did I rephrase each document rather than copy it?", "Did I compare both viewpoints fairly?", "Did I defend my own view with a reason or example?", "Am I within the word range?"],
  },
  fr: {
    TASK_1: ["Ai-je donné les deux ou trois détails demandés ?", "Le ton convient-il au destinataire ?", "Mon message a-t-il une ouverture et une fin adaptées ?", "Suis-je dans la limite de mots ?"],
    TASK_2: ["Ai-je raconté l'expérience avec des détails concrets ?", "Ai-je ajouté mon commentaire ou mon avis et atteint l'objectif demandé ?", "Le type de texte convient-il à ses lecteurs ?", "Suis-je dans la limite de mots ?"],
    TASK_3: ["Ai-je reformulé chaque document sans le copier ?", "Ai-je comparé les deux points de vue de façon juste ?", "Ai-je défendu mon avis avec une raison ou un exemple ?", "Suis-je dans la limite de mots ?"],
  },
  es: {
    TASK_1: ["¿He dado los dos o tres detalles solicitados?", "¿El tono se adapta al destinatario?", "¿Mi mensaje tiene una apertura y un cierre adecuados?", "¿Estoy dentro del límite de palabras?"],
    TASK_2: ["¿He contado la experiencia con detalles concretos?", "¿He añadido mi comentario u opinión y cumplido el objetivo indicado?", "¿El tipo de texto se adapta a sus lectores?", "¿Estoy dentro del límite de palabras?"],
    TASK_3: ["¿He reformulado cada documento sin copiarlo?", "¿He comparado los dos puntos de vista con justicia?", "¿He defendido mi opinión con una razón o ejemplo?", "¿Estoy dentro del límite de palabras?"],
  },
  pt: {
    TASK_1: ["Incluí os dois ou três detalhes solicitados?", "O tom é adequado ao destinatário?", "Minha mensagem tem abertura e encerramento adequados?", "Estou dentro do limite de palavras?"],
    TASK_2: ["Contei a experiência com detalhes concretos?", "Acrescentei meu comentário ou opinião e cumpri o objetivo indicado?", "O tipo de texto é adequado aos leitores?", "Estou dentro do limite de palavras?"],
    TASK_3: ["Reformulei cada documento sem copiá-lo?", "Comparei os dois pontos de vista de forma justa?", "Defendi minha opinião com uma razão ou exemplo?", "Estou dentro do limite de palavras?"],
  },
};

export function getGuidedWritingCompletionChecks(locale: AppLocale, taskType: TaskType): readonly string[] {
  return GUIDED_WRITING_COMPLETION_CHECKS[locale][taskType];
}

// The tips themselves are French phrase banks the learner can use directly
// or adapt -- not translated advice, since the phrases must stay in French
// regardless of the learner's interface language (the same way task
// instructions and exam prompts do elsewhere in the app). Levels are
// cumulative for a couple of stages where only a base set and a combined
// "C1/C2" enrichment set were provided (see docs/guided-writing.md); every
// other stage has its own distinct B2/C1/C2 set.
type ProfileContent = Record<TargetLevel, Partial<Record<GuideStage, readonly string[]>>>;

export type GuidedWritingContent = Record<GuideProfile, ProfileContent>;

// Shared verbatim between Tâche 2 and Tâche 3 -- the same nuance connectors
// were given for both.
const NUANCE_CONNECTORS: Record<TargetLevel, readonly string[]> = {
  B2: ["Cependant,…", "Mais il faut aussi penser à…", "Même si…, …"],
  C1: ["Certes,… néanmoins,…", "Toutefois, il convient de nuancer cette idée.", "Même si cet argument est valable, …"],
  C2: [
    "S'il est indéniable que…, il serait néanmoins réducteur de…",
    "Cette analyse mérite toutefois d'être nuancée, dans la mesure où…",
  ],
};

const TASK1_DEVELOP_BASE = [
  "Tout d'abord,…",
  "Ensuite,…",
  "Ce qui m'a le plus marqué(e), c'est…",
];
const TASK1_DEVELOP_C1 = [
  "Un détail important à préciser est que…",
  "Ce qui mérite d'être souligné, c'est…",
  "Cela explique en grande partie pourquoi…",
];
const TASK1_DEVELOP_C2 = [
  "Au-delà de…, ce qui compte surtout, c'est…",
  "Ce détail prend tout son sens lorsque…",
  "Cette expérience m'a surtout fait comprendre que…",
];

const TASK3_POSITION_BASE = [
  "Pour ma part, je considère que…",
  "Cette position me paraît préférable parce que…",
  "Par exemple,…",
];
const TASK3_POSITION_C1 = [
  "À mon sens, cette position est convaincante dans la mesure où…",
  "Je rejoins davantage ce point de vue parce que…",
  "On le constate notamment lorsque…",
];
const TASK3_POSITION_C2 = [
  "Il me semble que cette position est pertinente à condition de…",
  "L'enjeu n'est donc pas de…, mais de…",
  "Cette analyse me paraît préférable, dans la mesure où…",
];

const TASK2_RECOUNT: Record<TargetLevel, readonly string[]> = {
  B2: ["Tout a commencé lorsque…", "J'ai eu l'occasion de…", "Ce jour-là, j'ai été surpris(e) par…"],
  C1: ["Cette expérience a débuté lorsque…", "Le moment le plus marquant a été…", "J'en garde surtout le souvenir de…"],
  C2: ["Cette expérience s'est révélée particulièrement marquante lorsque…", "Ce qui a donné tout son relief à cet événement, c'est…", "Au fil de cette expérience, j'ai constaté que…"],
};

export const GUIDED_WRITING_TIPS: GuidedWritingContent = {
  INFORMAL_PERSONAL_MESSAGE: {
    B2: {
      start: [
        "Salut [Prénom],",
        "J'espère que tu vas bien.",
        "Je t'écris pour te parler de…",
      ],
      develop: TASK1_DEVELOP_BASE,
      ask: ["Si tu veux, on pourrait…", "Est-ce que tu pourrais… ?", "J'espère que ces informations te seront utiles."],
      finish: ["Merci d'avance pour ta réponse.", "J'attends de tes nouvelles.", "À bientôt !"],
    },
    C1: {
      start: [
        "Salut [Prénom], j'espère que tu vas bien.",
        "Je voulais te raconter…",
        "Je tenais à te donner quelques nouvelles au sujet de…",
      ],
      develop: TASK1_DEVELOP_C1,
      ask: ["Tu pourrais peut-être me dire si…", "Ça t'ennuierait de… ?"],
      finish: [
        "Je te remercie par avance pour ton retour.",
        "Dans l'attente de ta réponse, je te souhaite une excellente journée.",
      ],
    },
    C2: {
      start: [
        "Ça fait un moment que je voulais te raconter…",
        "Je profite de ce message pour te dire deux mots de…",
        "Je me disais qu'il fallait que je te raconte…",
      ],
      develop: TASK1_DEVELOP_C2,
      ask: ["Je me demandais si, à l'occasion, tu pourrais…", "Ça me rendrait service si tu pouvais…"],
      finish: [
        "Je te remercie par avance pour le temps que tu y consacreras et j'ai hâte d'avoir de tes nouvelles.",
        "Au plaisir de te lire bientôt !",
      ],
    },
  },
  FORMAL_PROFESSIONAL_MESSAGE: {
    B2: {
      start: [
        "Je me permets de vous écrire concernant…",
        "Madame, Monsieur, je vous contacte au sujet de…",
        "Je vous écris afin de vous informer de…",
      ],
      develop: TASK1_DEVELOP_BASE,
      ask: ["Pourriez-vous me dire si… ?", "Serait-il possible de… ?", "Je vous remercie pour l'attention portée à ce message."],
      finish: [
        "Merci d'avance pour votre réponse.",
        "Dans l'attente de votre retour, je vous souhaite une excellente journée.",
        "Cordialement.",
      ],
    },
    C1: {
      start: [
        "Je me permets de revenir vers vous au sujet de…",
        "Je vous adresse ce message concernant…",
        "Je souhaite porter à votre connaissance…",
      ],
      develop: TASK1_DEVELOP_C1,
      ask: ["Je souhaiterais savoir s'il serait possible de…", "Je vous serais reconnaissant(e) de bien vouloir…"],
      finish: [
        "Je vous remercie par avance pour votre retour.",
        "Dans l'attente de votre réponse, je vous prie d'agréer mes salutations distinguées.",
      ],
    },
    C2: {
      start: [
        "Je me permets de revenir vers vous afin de vous apporter quelques précisions concernant…",
        "Je souhaiterais revenir sur la question de…",
      ],
      develop: TASK1_DEVELOP_C2,
      ask: ["Je souhaiterais, dans la mesure du possible, que vous puissiez…", "Je vous saurais gré de bien vouloir…"],
      finish: [
        "Je vous remercie par avance de l'attention portée à ma demande et reste à votre disposition pour toute information complémentaire.",
      ],
    },
  },
  PUBLIC_ARTICLE_OR_NOTE: {
    B2: {
      start: ["Titre : …", "Récemment, j'ai eu l'occasion de…", "Je souhaite partager mon expérience de…"],
      recount: TASK2_RECOUNT.B2,
      develop: ["Cette expérience m'a fait comprendre que…", "À mon avis,…", "Cela me semble important parce que…"],
      addArgument: ["De plus,…", "Ensuite,…", "Un autre avantage est que…"],
      nuance: NUANCE_CONNECTORS.B2,
      finish: ["Pour conclure,…", "J'espère que cette expérience donnera envie de…", "En résumé,…"],
    },
    C1: {
      start: [
        "Titre : …",
        "Dans cet article, je souhaite revenir sur…",
        "Cette expérience m'a amené(e) à réfléchir à…",
      ],
      recount: TASK2_RECOUNT.C1,
      develop: ["Cette expérience m'a montré que…", "Un premier élément mérite d'être souligné : …", "On peut l'illustrer par…"],
      addArgument: [
        "Par ailleurs,…",
        "Il convient également de prendre en compte…",
        "Un autre aspect particulièrement important concerne…",
      ],
      nuance: NUANCE_CONNECTORS.C1,
      finish: [
        "En définitive, cette expérience m'a permis de comprendre que…",
        "Tout compte fait, il me semble que…",
      ],
    },
    C2: {
      start: [
        "Cette expérience constitue une occasion particulièrement intéressante de s'interroger sur…",
        "Titre : …",
        "Cet événement m'a conduit(e) à remettre en perspective…",
      ],
      recount: TASK2_RECOUNT.C2,
      develop: [
        "Le premier argument qui me paraît déterminant tient à…",
        "Cette situation s'explique en grande partie par…",
        "Un exemple particulièrement révélateur permet d'illustrer ce phénomène…",
      ],
      addArgument: [
        "À cela s'ajoute un autre facteur, qui n'est pas négligeable : …",
        "Cette première constatation doit néanmoins être complétée par…",
      ],
      nuance: NUANCE_CONNECTORS.C2,
      finish: [
        "En définitive, cette expérience illustre bien la complexité de…",
        "Tout bien considéré, cette réflexion m'amène à conclure que…",
      ],
    },
  },
  PUBLIC_LETTER: {
    B2: {
      start: ["Chers lecteurs,", "Je souhaite vous faire part de mon expérience de…", "Je vous écris pour attirer votre attention sur…"],
      recount: TASK2_RECOUNT.B2,
      develop: ["Cette expérience m'a fait comprendre que…", "À mon avis,…", "Cela me semble important parce que…"],
      addArgument: ["De plus,…", "Ensuite,…", "Un autre avantage est que…"],
      nuance: NUANCE_CONNECTORS.B2,
      finish: ["J'espère que ce témoignage vous sera utile.", "Pour conclure,…", "Je vous remercie de votre attention."],
    },
    C1: {
      start: [
        "Chers lecteurs,",
        "Je souhaite partager avec vous une expérience qui m'a amené(e) à réfléchir à…",
        "Cette expérience m'a amené(e) à réfléchir à…",
      ],
      recount: TASK2_RECOUNT.C1,
      develop: ["Cette expérience m'a montré que…", "Un premier élément mérite d'être souligné : …", "On peut l'illustrer par…"],
      addArgument: [
        "Par ailleurs,…",
        "Il convient également de prendre en compte…",
        "Un autre aspect particulièrement important concerne…",
      ],
      nuance: NUANCE_CONNECTORS.C1,
      finish: [
        "En définitive, j'espère que ce témoignage encouragera chacun à…",
        "Je vous remercie de l'attention portée à ce courrier.",
      ],
    },
    C2: {
      start: [
        "Chères lectrices, chers lecteurs,",
        "Cette expérience m'a conduit(e) à remettre en perspective…",
        "Je souhaite attirer votre attention sur…",
      ],
      recount: TASK2_RECOUNT.C2,
      develop: [
        "Le premier argument qui me paraît déterminant tient à…",
        "Cette situation s'explique en grande partie par…",
        "Un exemple particulièrement révélateur permet d'illustrer ce phénomène…",
      ],
      addArgument: [
        "À cela s'ajoute un autre facteur, qui n'est pas négligeable : …",
        "Cette première constatation doit néanmoins être complétée par…",
      ],
      nuance: NUANCE_CONNECTORS.C2,
      finish: [
        "Tout bien considéré, j'espère que cette réflexion permettra de…",
        "Je vous remercie de l'attention accordée à ce témoignage.",
      ],
    },
  },
  ARGUMENTATIVE_ANALYSIS: {
    B2: {
      start: [
        "Aujourd'hui, la question de… fait débat.",
        "De nombreuses personnes se demandent si…",
        "Il existe différentes opinions concernant…",
      ],
      synthesize: [
        "Les deux documents présentent donc deux points de vue différents sur…",
        "Le premier document insiste sur…, tandis que le second met en avant…",
        "Ainsi, les deux textes abordent le même sujet, mais sous des angles différents.",
      ],
      position: TASK3_POSITION_BASE,
      nuance: NUANCE_CONNECTORS.B2,
      finish: ["En conclusion, je pense que…"],
    },
    C1: {
      start: [
        "La question de… fait aujourd'hui l'objet de nombreux débats.",
        "Cette problématique suscite des opinions divergentes.",
        "Le débat autour de… soulève plusieurs questions importantes.",
      ],
      synthesize: [
        "Les deux documents abordent donc la même problématique, mais proposent des perspectives différentes.",
        "Alors que le premier document met l'accent sur…, le second souligne davantage…",
        "Ces deux points de vue permettent ainsi de mettre en évidence les différents aspects de la question.",
      ],
      position: TASK3_POSITION_C1,
      nuance: NUANCE_CONNECTORS.C1,
      finish: [
        "En définitive, même si les deux points de vue présentent des arguments pertinents, je considère que…",
      ],
    },
    C2: {
      start: [
        "La problématique de… s'inscrit dans un débat plus large portant sur…",
        "Cette question, loin de faire l'unanimité, soulève des enjeux à la fois… et…",
        "Derrière cette apparente opposition se dessine une problématique plus fondamentale : …",
      ],
      synthesize: [
        "Bien que les deux documents s'intéressent à une même problématique, ils l'appréhendent sous des angles sensiblement différents.",
        "La mise en regard des deux textes fait ainsi apparaître une opposition entre…, d'une part, et…, d'autre part.",
        "Pris dans leur ensemble, les deux documents permettent de dégager une problématique plus large :",
      ],
      position: TASK3_POSITION_C2,
      nuance: NUANCE_CONNECTORS.C2,
      finish: [
        "En définitive, la confrontation de ces deux perspectives montre que la question ne saurait être envisagée de manière binaire. À mon sens,…",
      ],
    },
  },
};

export function getGuidedWritingTips(profile: GuideProfile, level: TargetLevel, stage: GuideStage): readonly string[] {
  return GUIDED_WRITING_TIPS[profile][level][stage] ?? [];
}

// Exercised by guided-writing.test.ts: every profile/level has non-empty
// phrases for exactly the stages its task actually uses.
export function forEachGuidedWritingCell(
  callback: (cell: { profile: GuideProfile; level: TargetLevel; stage: GuideStage; tips: readonly string[] }) => void,
): void {
  for (const profile of GUIDE_PROFILES) {
    for (const level of TARGET_LEVELS) {
      for (const stage of getGuideStagesForProfile(profile)) {
        callback({ profile, level, stage, tips: GUIDED_WRITING_TIPS[profile][level][stage] ?? [] });
      }
    }
  }
}
