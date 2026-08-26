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
  | "develop"
  | "ask"
  | "addArgument"
  | "nuance"
  | "synthesize"
  | "position"
  | "finish";

export const TASK_GUIDE_STAGES: Record<TaskType, readonly GuideStage[]> = {
  TASK_1: ["start", "develop", "ask", "finish"],
  TASK_2: ["start", "develop", "addArgument", "nuance", "finish"],
  TASK_3: ["start", "synthesize", "position", "nuance", "finish"],
};

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
    TASK_1: { start: "Opening", develop: "Develop", ask: "Ask for something", finish: "Finish" },
    TASK_2: {
      start: "Introduce",
      develop: "Develop an idea",
      addArgument: "Add a second idea",
      nuance: "Nuance",
      finish: "Conclude",
    },
    TASK_3: {
      start: "Present the issue",
      synthesize: "Summarize the two documents",
      position: "Give your position",
      nuance: "Nuance",
      finish: "Conclude",
    },
  },
  fr: {
    TASK_1: { start: "Ouverture", develop: "Développer", ask: "Demander quelque chose", finish: "Terminer" },
    TASK_2: {
      start: "Introduire",
      develop: "Développer une idée",
      addArgument: "Ajouter une deuxième idée",
      nuance: "Nuancer",
      finish: "Conclure",
    },
    TASK_3: {
      start: "Présenter la problématique",
      synthesize: "Faire la synthèse des deux documents",
      position: "Donner sa propre position",
      nuance: "Nuancer",
      finish: "Conclure",
    },
  },
  es: {
    TASK_1: { start: "Apertura", develop: "Desarrollar", ask: "Pedir algo", finish: "Terminar" },
    TASK_2: {
      start: "Introducir",
      develop: "Desarrollar una idea",
      addArgument: "Añadir una segunda idea",
      nuance: "Matizar",
      finish: "Concluir",
    },
    TASK_3: {
      start: "Presentar la problemática",
      synthesize: "Sintetizar los dos documentos",
      position: "Dar tu posición",
      nuance: "Matizar",
      finish: "Concluir",
    },
  },
  pt: {
    TASK_1: { start: "Abertura", develop: "Desenvolver", ask: "Pedir algo", finish: "Terminar" },
    TASK_2: {
      start: "Introduzir",
      develop: "Desenvolver uma ideia",
      addArgument: "Acrescentar uma segunda ideia",
      nuance: "Matizar",
      finish: "Concluir",
    },
    TASK_3: {
      start: "Apresentar a problemática",
      synthesize: "Sintetizar os dois documentos",
      position: "Dar sua posição",
      nuance: "Matizar",
      finish: "Concluir",
    },
  },
};

export function getGuideStageLabel(locale: AppLocale, taskType: TaskType, stage: GuideStage): string {
  return GUIDE_STAGE_LABELS[locale][taskType][stage] ?? stage;
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
  "En effet,…",
  "La raison principale est que…",
  "Il faut savoir que…",
  "Tout d'abord,…",
  "Ensuite,…",
  "De plus,…",
  "Par ailleurs,…",
];
const TASK1_DEVELOP_ADVANCED = [
  ...TASK1_DEVELOP_BASE,
  "Il convient également de préciser que…",
  "Un autre élément à prendre en considération est…",
  "Il importe également de souligner que…",
];

const TASK3_POSITION_BASE = ["Pour ma part, je considère que…", "Tout d'abord,…", "En effet,…", "Par exemple,…", "Par ailleurs,…"];
const TASK3_POSITION_ADVANCED = [
  ...TASK3_POSITION_BASE,
  "Certes,… néanmoins,…",
  "S'il est vrai que…, il convient toutefois de souligner que…",
];

export const GUIDED_WRITING_TIPS: GuidedWritingContent = {
  INFORMAL_PERSONAL_MESSAGE: {
    B2: {
      start: [
        "Bonjour, j'espère que tu vas bien.",
        "Je t'écris pour te parler de…",
        "Je voulais te donner quelques informations au sujet de…",
      ],
      develop: TASK1_DEVELOP_BASE,
      ask: ["Est-ce que tu pourrais… ?", "Pourrais-tu me dire si… ?"],
      finish: ["Merci d'avance pour ta réponse.", "J'attends de tes nouvelles.", "À bientôt !"],
    },
    C1: {
      start: [
        "J'espère que tu vas bien. Je me permets de t'écrire au sujet de…",
        "Je reviens vers toi concernant…",
        "Je souhaitais te faire part de…",
      ],
      develop: TASK1_DEVELOP_ADVANCED,
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
      develop: TASK1_DEVELOP_ADVANCED,
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
      ask: ["Pourriez-vous me dire si… ?", "Serait-il possible de… ?"],
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
      develop: TASK1_DEVELOP_ADVANCED,
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
      develop: TASK1_DEVELOP_ADVANCED,
      ask: ["Je souhaiterais, dans la mesure du possible, que vous puissiez…", "Je vous saurais gré de bien vouloir…"],
      finish: [
        "Je vous remercie par avance de l'attention portée à ma demande et reste à votre disposition pour toute information complémentaire.",
      ],
    },
  },
  PUBLIC_ARTICLE_OR_NOTE: {
    B2: {
      start: ["Récemment, j'ai eu l'occasion de…", "Je voudrais parler de…", "À mon avis,…", "Ce sujet est important parce que…"],
      develop: ["Tout d'abord, je pense que…", "En effet,…", "Par exemple,…"],
      addArgument: ["De plus,…", "Ensuite,…", "Un autre avantage est que…"],
      nuance: NUANCE_CONNECTORS.B2,
      finish: ["Pour conclure,…", "En résumé,…", "Finalement, je pense que…"],
    },
    C1: {
      start: [
        "Cette question mérite une attention particulière, notamment parce que…",
        "Il me semble intéressant de revenir sur…",
        "Cette expérience m'a amené(e) à réfléchir à…",
      ],
      develop: ["Un premier élément mérite d'être souligné : …", "Cela s'explique notamment par…", "On peut l'illustrer par…"],
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
        "Cet événement m'a conduit(e) à remettre en perspective…",
      ],
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
    // Genre (article vs. letter to readers) doesn't change these connectors,
    // so this profile intentionally mirrors PUBLIC_ARTICLE_OR_NOTE exactly.
    B2: {
      start: ["Récemment, j'ai eu l'occasion de…", "Je voudrais parler de…", "À mon avis,…", "Ce sujet est important parce que…"],
      develop: ["Tout d'abord, je pense que…", "En effet,…", "Par exemple,…"],
      addArgument: ["De plus,…", "Ensuite,…", "Un autre avantage est que…"],
      nuance: NUANCE_CONNECTORS.B2,
      finish: ["Pour conclure,…", "En résumé,…", "Finalement, je pense que…"],
    },
    C1: {
      start: [
        "Cette question mérite une attention particulière, notamment parce que…",
        "Il me semble intéressant de revenir sur…",
        "Cette expérience m'a amené(e) à réfléchir à…",
      ],
      develop: ["Un premier élément mérite d'être souligné : …", "Cela s'explique notamment par…", "On peut l'illustrer par…"],
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
        "Cet événement m'a conduit(e) à remettre en perspective…",
      ],
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
      position: TASK3_POSITION_ADVANCED,
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
      position: TASK3_POSITION_ADVANCED,
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
