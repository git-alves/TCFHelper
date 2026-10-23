import type { TaskType } from "@prisma/client";

/**
 * Fixed, reviewed content for the sectioned writing trainer.
 *
 * Each exercise is one TCF task answered in a few short sections, each with its
 * own word range. The learner writes every section, then compares it with the
 * model answer. There is no scoring and no model call: all content here is
 * authored data, and the interface language of the section labels and
 * guidance lives in app-copy.
 */
export type PracticeLevel = "B2" | "C1" | "C2";
export const PRACTICE_LEVELS: readonly PracticeLevel[] = ["B2", "C1", "C2"];

export type PracticeSectionId =
  | "t1_opening"
  | "t1_development"
  | "t1_closing"
  | "t2_situation"
  | "t2_events"
  | "t2_comment"
  | "t3_synthesis"
  | "t3_position"
  | "t3_arguments";

export interface PracticeSectionBlueprint {
  id: PracticeSectionId;
  minWords: number;
  maxWords: number;
  /** A French sentence shown as a model of the move, never a full answer. */
  example?: string;
  /** French connectors that help this section, shown as chips. */
  connectors?: readonly string[];
}

export const PRACTICE_SECTION_BLUEPRINT: Readonly<Record<TaskType, readonly PracticeSectionBlueprint[]>> = {
  TASK_1: [
    { id: "t1_opening", minWords: 10, maxWords: 15 },
    { id: "t1_development", minWords: 50, maxWords: 70 },
    { id: "t1_closing", minWords: 10, maxWords: 20 },
  ],
  TASK_2: [
    {
      id: "t2_situation",
      minWords: 20,
      maxWords: 30,
      example: "Le mois dernier, j'ai participé à une activité bénévole organisée dans mon quartier.",
    },
    { id: "t2_events", minWords: 45, maxWords: 60, connectors: ["d'abord", "ensuite", "puis", "enfin"] },
    { id: "t2_comment", minWords: 40, maxWords: 55 },
  ],
  TASK_3: [
    {
      id: "t3_synthesis",
      minWords: 40,
      maxWords: 60,
      connectors: ["d'une part… d'autre part…", "alors que", "en revanche", "cependant"],
    },
    {
      id: "t3_position",
      minWords: 15,
      maxWords: 25,
      example:
        "À mon avis, le télétravail présente de vrais avantages, à condition de préserver un bon équilibre entre vie professionnelle et vie personnelle.",
    },
    { id: "t3_arguments", minWords: 55, maxWords: 75, connectors: ["d'abord", "ensuite", "par exemple", "c'est pourquoi"] },
  ],
};

export interface PracticeSourceDocument {
  label: string;
  text: string;
}

export interface SectionedPracticeExercise {
  id: string;
  task: TaskType;
  level: PracticeLevel;
  /** Short French title, e.g. the topic. */
  title: string;
  /** The exam-style instruction, in French. */
  prompt: string;
  /** What the response must cover, in French (Tâche 1 only). */
  requiredElements?: readonly string[];
  /** The two documents to synthesise (Tâche 3 only). */
  documents?: readonly PracticeSourceDocument[];
  /** One model answer per section, in blueprint order. */
  modelAnswers: readonly string[];
}

/** Whitespace-separated words, the same rule the writing workspace uses. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

export const SECTIONED_PRACTICE_EXERCISES: readonly SectionedPracticeExercise[] = [
  {
    id: "t1-b2-new-flat",
    task: "TASK_1",
    level: "B2",
    title: "Un nouvel appartement",
    prompt:
      "Vous venez d'emménager dans un nouvel appartement. Vous écrivez à une amie, Camille, pour lui annoncer votre déménagement, lui décrire votre logement et l'inviter à une pendaison de crémaillère.",
    requiredElements: [
      "Annoncer votre déménagement",
      "Décrire le logement et le quartier",
      "Inviter Camille (date et heure)",
    ],
    modelAnswers: [
      "Salut Camille, j'ai une grande nouvelle à t'annoncer : j'ai enfin déménagé !",
      "Mon nouvel appartement se trouve près du parc, dans un quartier calme et très bien desservi par le métro. Il est lumineux et comprend deux chambres, un grand salon et une petite cuisine ouverte. Ce qui me plaît le plus, c'est le balcon, où je peux déjeuner dès qu'il fait beau. J'organise une pendaison de crémaillère samedi 14 juin à 19 heures et j'aimerais vraiment que tu viennes.",
      "Dis-moi vite si tu es libre ! Je t'embrasse très fort et à bientôt.",
    ],
  },
  {
    id: "t1-c1-water-leak",
    task: "TASK_1",
    level: "C1",
    title: "Une fuite d'eau",
    prompt:
      "Vous louez un appartement depuis deux ans. Une fuite d'eau dans la salle de bains n'est toujours pas réparée malgré un premier appel. Vous écrivez à l'agence immobilière pour signaler le problème, en préciser les conséquences et demander une intervention rapide.",
    requiredElements: [
      "Signaler le problème et rappeler votre première démarche",
      "Décrire les conséquences",
      "Demander une intervention précise, avec un délai",
    ],
    modelAnswers: [
      "Madame, Monsieur, je vous écris au sujet d'une fuite d'eau dans mon appartement.",
      "Le 3 mars, je vous ai déjà signalé par téléphone une fuite sous le lavabo de la salle de bains, mais personne n'est intervenu. Depuis, l'humidité a abîmé le meuble et de la moisissure apparaît sur le mur, ce qui m'inquiète. Je vous demande donc d'envoyer un plombier avant la fin de la semaine et de me confirmer sa date de passage.",
      "Dans l'attente de votre réponse, je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.",
    ],
  },
  {
    id: "t1-c2-absence",
    task: "TASK_1",
    level: "C2",
    title: "Une absence imprévue",
    prompt:
      "Un déplacement imprévu vous empêchera d'assister à une réunion de présentation importante devant un partenaire, la semaine prochaine. Vous écrivez à votre responsable, Mme Lefèvre, pour l'en informer, proposer une solution et préciser comment vous contribuerez malgré tout.",
    requiredElements: [
      "Expliquer votre indisponibilité avec tact",
      "Proposer une solution concrète",
      "Indiquer votre contribution",
    ],
    modelAnswers: [
      "Madame Lefèvre, un contretemps m'empêchera hélas d'assister à la réunion de jeudi.",
      "Un déplacement imprévu chez un fournisseur, que je ne peux malheureusement pas reporter, coïncide avec cette présentation. Afin de ne pas fragiliser notre image auprès du partenaire, je suggère que Julien, qui connaît parfaitement le dossier, me remplace. Je lui transmettrai dès demain mes diapositives commentées ainsi qu'une synthèse des points sensibles, et je resterai joignable pendant la réunion pour répondre à d'éventuelles questions.",
      "Je vous remercie de votre compréhension et reste à votre disposition pour en discuter. Bien cordialement.",
    ],
  },
  {
    id: "t2-b2-park-cleanup",
    task: "TASK_2",
    level: "B2",
    title: "Une journée de bénévolat",
    prompt:
      "Vous avez participé à une activité bénévole dans votre quartier. Vous racontez cette expérience dans un article pour le blog de l'association et vous donnez votre avis.",
    modelAnswers: [
      "Le mois dernier, j'ai participé à une journée de nettoyage organisée dans le parc de mon quartier par l'association des habitants, dès neuf heures du matin.",
      "D'abord, on nous a distribué des gants et des sacs, puis nous avons formé des petites équipes pour ramasser les déchets près du lac. Ensuite, nous avons trouvé énormément de bouteilles et même un vieux vélo cassé. Enfin, à midi, tout le monde a partagé un pique-nique, et le parc était propre.",
      "Cette expérience m'a beaucoup plu, car j'ai rencontré mes voisins et j'ai compris qu'un petit geste collectif peut changer un lieu. J'ai surtout appris que les déchets s'accumulent vite quand personne n'agit. Je recommande à tous de participer à ce genre d'action, avec des amis ou en famille.",
    ],
  },
  {
    id: "t2-c1-solo-trip",
    task: "TASK_2",
    level: "C1",
    title: "Un voyage seul à l'étranger",
    prompt:
      "Vous avez passé une semaine dans un pays dont vous ne parliez pas la langue. Vous racontez ce voyage dans un article de blog et vous le commentez pour vos lecteurs.",
    modelAnswers: [
      "L'été dernier, j'ai passé une semaine seul à Lisbonne, ma première expérience de voyage à l'étranger sans aucun proche, et je ne connaissais pas un mot de portugais.",
      "Dès mon arrivée, je me suis perdu dans les ruelles de l'Alfama, puis un commerçant m'a accompagné jusqu'à mon hôtel. Les jours suivants, à force de gestes et de quelques mots d'anglais, j'ai réussi à commander mes repas et à visiter la ville. Le dernier soir, j'ai discuté longuement avec une famille qui m'avait invité à sa table.",
      "Rétrospectivement, ce voyage m'a appris à lâcher prise et à dépendre de la bienveillance des autres, ce qui m'a profondément marqué. Si l'on peut regretter de ne pas tout comprendre, cette difficulté rend chaque rencontre plus intense. Je conseille donc à ceux qui hésitent de partir sans craindre la barrière de la langue.",
    ],
  },
  {
    id: "t2-c2-cinema-debate",
    task: "TASK_2",
    level: "C2",
    title: "Un débat sur l'avenir d'un cinéma",
    prompt:
      "Vous avez assisté à un débat public sur l'avenir d'un cinéma de quartier menacé de fermeture. Vous racontez la soirée et vous la commentez à l'attention des lecteurs du journal municipal.",
    modelAnswers: [
      "Mardi dernier, j'ai assisté à un débat public sur l'avenir du cinéma Le Rex, menacé de fermeture, devant près de deux cents habitants très attachés à ce lieu.",
      "La soirée a débuté par l'intervention du maire, qui a justifié le coût de la rénovation. Puis la parole a été donnée à la salle : une lycéenne, un retraité et une commerçante ont tour à tour défendu l'importance du lieu. Finalement, une pétition a été lancée et le maire s'est engagé à réexaminer le dossier.",
      "Ce qui m'a frappé, c'est que la discussion, d'abord tendue, est devenue constructive dès que chacun a avancé des propositions concrètes plutôt que des reproches. Cela montre, selon moi, que la mobilisation citoyenne n'est efficace que lorsqu'elle sait dialoguer. J'invite donc chacun à signer la pétition et à suivre les prochaines réunions.",
    ],
  },
  {
    id: "t3-b2-remote-work",
    task: "TASK_3",
    level: "B2",
    title: "Le télétravail",
    prompt:
      "Lisez les deux documents. Présentez-les en les comparant, puis donnez votre opinion et défendez-la avec des arguments.",
    documents: [
      {
        label: "Document 1 — Un salarié",
        text: "Depuis que je travaille à la maison trois jours par semaine, je gagne deux heures de transport par jour et je suis plus concentré. Je peux mieux organiser ma vie de famille et je suis moins fatigué le soir. Pour moi, le télétravail est un vrai progrès.",
      },
      {
        label: "Document 2 — Une responsable d'équipe",
        text: "Le télétravail affaiblit la cohésion d'une équipe. Les échanges spontanés disparaissent, les nouveaux collègues s'intègrent difficilement et certains salariés se sentent isolés. Je pense qu'il faut garder la majorité du temps de travail au bureau.",
      },
    ],
    modelAnswers: [
      "Le premier document défend le télétravail, qui permet de gagner du temps, de mieux se concentrer et de concilier travail et famille. Le second, au contraire, souligne ses risques : moins de cohésion, des nouveaux collègues mal intégrés et un sentiment d'isolement. Les deux textes s'opposent donc sur la qualité de vie et sur l'esprit d'équipe.",
      "À mon avis, le télétravail est avantageux, à condition de garder quelques jours de présence au bureau chaque semaine.",
      "D'abord, il améliore la qualité de vie : en supprimant les longs trajets, il laisse plus de temps pour se reposer et pour sa famille. Ensuite, il peut augmenter l'efficacité, car on est moins dérangé. Par exemple, ma sœur, qui travaille deux jours chez elle, termine ses dossiers plus vite. Il faut toutefois des jours au bureau pour préserver les liens, ce qui confirme mon opinion.",
    ],
  },
  {
    id: "t3-c1-phones-at-school",
    task: "TASK_3",
    level: "C1",
    title: "Les téléphones au lycée",
    prompt:
      "Lisez les deux documents. Présentez-les en les comparant, puis donnez votre opinion et défendez-la avec des arguments.",
    documents: [
      {
        label: "Document 1 — Un proviseur",
        text: "Depuis l'interdiction des téléphones dans notre lycée, les élèves discutent davantage pendant les pauses et se concentrent mieux en classe. Les cas de harcèlement en ligne dans l'établissement ont reculé. Les écrans n'ont pas leur place pendant la journée scolaire.",
      },
      {
        label: "Document 2 — Une lycéenne",
        text: "Le téléphone n'est pas qu'un divertissement : je m'en sers pour consulter un dictionnaire, organiser mon planning ou joindre mes parents en urgence. Plutôt que d'interdire, l'école devrait nous apprendre à bien utiliser ces outils, car nous les utiliserons toute notre vie.",
      },
    ],
    modelAnswers: [
      "Le proviseur considère l'interdiction comme bénéfique, puisqu'elle favorise la concentration, le dialogue entre élèves et la lutte contre le harcèlement. La lycéenne, elle, rappelle l'utilité pédagogique et pratique du téléphone et préfère l'éducation à l'interdiction. Les deux auteurs s'accordent sur les risques d'un usage excessif, mais divergent sur la solution : contrainte ou responsabilisation.",
      "Je pense qu'une interdiction partielle, limitée aux heures de cours, serait plus équilibrée qu'une interdiction totale.",
      "D'une part, l'attention des élèves est réellement menacée en classe, comme le prouve le témoignage du proviseur. D'autre part, l'école doit préparer à un monde connecté : dans ma propre classe, un atelier sur les réseaux sociaux nous a plus sensibilisés que n'importe quelle interdiction. Une règle claire, associée à une éducation au numérique, protège donc la concentration sans priver les élèves d'un outil utile.",
    ],
  },
  {
    id: "t3-c2-ai-in-university",
    task: "TASK_3",
    level: "C2",
    title: "L'IA générative à l'université",
    prompt:
      "Lisez les deux documents. Présentez-les en les comparant, puis donnez votre opinion et défendez-la avec des arguments.",
    documents: [
      {
        label: "Document 1 — Un professeur d'université",
        text: "Les outils d'IA générative permettent à des étudiants de produire des devoirs sans effort, ce qui dévalue le travail personnel. Si nous les tolérons, nous renonçons à former l'esprit critique et la capacité d'argumenter. L'évaluation doit revenir à l'écrit surveillé et à l'oral.",
      },
      {
        label: "Document 2 — Un étudiant en master",
        text: "Interdire l'IA est une illusion : elle est déjà partout dans le monde professionnel. Utilisée comme un tuteur, elle m'aide à reformuler mes idées et à repérer mes erreurs. L'enjeu n'est pas de la bannir, mais de redéfinir ce que l'on évalue vraiment chez un étudiant.",
      },
    ],
    modelAnswers: [
      "Le professeur voit dans l'IA générative une menace pour l'effort personnel et l'esprit critique, et plaide pour un retour à l'évaluation surveillée. L'étudiant juge cette interdiction illusoire, puisque l'outil est déjà répandu, et le présente comme un tuteur utile à condition de repenser les critères d'évaluation. Ils partagent ainsi le souci de préserver l'apprentissage réel, mais concluent à l'opposé.",
      "À mes yeux, il faut intégrer l'IA aux études tout en évaluant davantage le raisonnement que le produit fini.",
      "Premièrement, une interdiction serait inapplicable : un étudiant motivé la contournera toujours, alors qu'un cadre explicite encourage la transparence. Deuxièmement, les compétences visées évoluent : savoir interroger, vérifier et critiquer une réponse automatisée devient aussi essentiel qu'écrire. À l'université de ma ville, les examens oraux de justification ont ainsi révélé qui comprenait réellement son travail. C'est pourquoi un usage encadré me paraît préférable.",
    ],
  },
];

export function getSectionedPracticeExercise(id: string): SectionedPracticeExercise | null {
  return SECTIONED_PRACTICE_EXERCISES.find((exercise) => exercise.id === id) ?? null;
}

export function getSectionedPracticeExercises(task: TaskType, level: PracticeLevel): SectionedPracticeExercise[] {
  return SECTIONED_PRACTICE_EXERCISES.filter((exercise) => exercise.task === task && exercise.level === level);
}
