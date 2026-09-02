import type { PracticeExercise } from "./practice-curriculum";

/**
 * Editor-reviewed C2 material for Task 3. This file contains authored
 * questions only; the small helper supplies repeated structural metadata.
 */
type AuthoredVariant = Omit<
  PracticeExercise,
  | "id"
  | "task"
  | "level"
  | "skill"
  | "exerciseType"
  | "difficulty"
  | "sequenceOrder"
  | "prerequisiteExerciseId"
>;

const STAGES: readonly PracticeExercise["exerciseType"][] = [
  "recognize",
  "complete",
  "transform",
  "organize",
  "develop",
  "produce",
];

const taskThreeC2Path = (
  prefix: string,
  skill: string,
  stages: readonly (readonly [AuthoredVariant, AuthoredVariant])[],
): readonly PracticeExercise[] =>
  stages.flatMap(([primary, alternative], index) => {
    const sequenceOrder = (index + 1) as 1 | 2 | 3 | 4 | 5 | 6;
    const prerequisiteExerciseId = index === 0 ? null : `${prefix}-${index}`;
    const shared = {
      task: "TASK_3" as const,
      level: "C2" as const,
      skill,
      exerciseType: STAGES[index]!,
      difficulty: sequenceOrder,
      sequenceOrder,
      prerequisiteExerciseId,
    };

    return [
      { id: `${prefix}-${sequenceOrder}`, ...shared, ...primary },
      { id: `${prefix}-a${sequenceOrder}`, ...shared, ...alternative },
    ];
  });

export const TASK_3_C2_EXERCISES: readonly PracticeExercise[] = [
  ...taskThreeC2Path("t3-c2-introducing-topic", "introducing-topic", [
    [
      {
        subSkill: "frame-competing-public-values",
        prompt: "Deux documents débattent de l'usage de caméras intelligentes dans les transports : l'un met en avant la prévention des incidents, l'autre les risques d'une surveillance banalisée.",
        instructions: "Choisissez l'introduction qui cadre le débat sans réduire l'une des positions à une caricature.",
        options: [
          "Les caméras intelligentes sont une mauvaise idée, car elles nous surveillent tous.",
          "L'usage de caméras intelligentes dans les transports soulève moins une opposition entre sécurité et liberté qu'une question de proportion : dans quelles situations leur efficacité peut-elle justifier la collecte et l'exploitation de données sur les voyageurs ?",
          "Les transports ont besoin de plus de caméras, c'est évident.",
          "Les documents parlent de caméras et il faut donner son avis.",
        ],
        correctAnswer:
          "L'usage de caméras intelligentes dans les transports soulève moins une opposition entre sécurité et liberté qu'une question de proportion : dans quelles situations leur efficacité peut-elle justifier la collecte et l'exploitation de données sur les voyageurs ?",
        acceptedAnswers: [],
        explanation:
          "Le cadrage C2 identifie des valeurs en tension, refuse un faux choix binaire et délimite la question qui devra être examinée.",
        targetLanguageFeature: "problématisation précise d'un conflit de valeurs",
        tags: ["introduction", "framing", "proportion", "recognize"],
      },
      {
        subSkill: "frame-competing-public-values-alternative",
        prompt: "Deux sources discutent de l'obligation d'installer des toitures végétalisées sur les immeubles neufs : l'une invoque l'adaptation aux fortes chaleurs, l'autre le coût et les contraintes techniques.",
        instructions: "Choisissez l'ouverture qui pose le problème avec justesse.",
        options: [
          "Les toits végétalisés sont très utiles et devraient être obligatoires partout.",
          "La question n'est pas seulement de savoir si la végétalisation améliore le confort urbain, mais de déterminer à quelles conditions une obligation générale reste techniquement réalisable et socialement justifiable.",
          "Les promoteurs refusent toujours les bonnes idées écologiques.",
          "Il existe des arguments pour et contre les toits végétalisés.",
        ],
        correctAnswer:
          "La question n'est pas seulement de savoir si la végétalisation améliore le confort urbain, mais de déterminer à quelles conditions une obligation générale reste techniquement réalisable et socialement justifiable.",
        acceptedAnswers: [],
        explanation:
          "Une entrée C2 transforme deux thèses en critère de décision : conditions de faisabilité et de justice, plutôt qu'un simple pour ou contre.",
        targetLanguageFeature: "cadrage par conditions de validité",
        tags: ["introduction", "framing", "conditions", "recognize", "variant"],
      },
    ],
    [
      {
        subSkill: "delimit-a-question-without-presupposition",
        prompt: "Vous introduisez un débat sur la limitation des locations de courte durée dans les centres historiques.",
        instructions: "Complétez : « Il s'agit donc moins de contester toute location de courte durée que de déterminer ______ elle peut être encadrée sans priver injustement certains habitants d'un revenu ponctuel. »",
        options: [],
        correctAnswer: "dans quelles conditions",
        acceptedAnswers: ["à quelles conditions", "comment"],
        explanation:
          "La formule évite de présupposer la solution et déplace le débat vers les conditions concrètes d'un encadrement proportionné.",
        targetLanguageFeature: "délimitation non présupposée d'une problématique",
        tags: ["introduction", "conditions", "complete"],
      },
      {
        subSkill: "delimit-a-question-without-presupposition-alternative",
        prompt: "Vous introduisez un débat sur l'interdiction des téléphones à l'école. Les sources divergent sur son efficacité et ses effets sur l'autonomie des élèves.",
        instructions: "Complétez : « Le débat porte moins sur la nécessité de réduire les distractions que sur la manière ______ une règle commune peut répondre à des usages et à des âges différents. »",
        options: [],
        correctAnswer: "dont",
        acceptedAnswers: ["par laquelle"],
        explanation:
          "La relative permet de distinguer l'objectif partagé de la question plus complexe du dispositif adapté.",
        targetLanguageFeature: "distinction entre objectif et dispositif",
        tags: ["introduction", "framing", "complete", "variant"],
      },
    ],
    [
      {
        subSkill: "replace-binary-opening-with-criteria",
        prompt: "Reformulez : « Il faut choisir entre protéger les données des citoyens et utiliser l'intelligence artificielle pour améliorer les services publics. »",
        instructions: "Transformez cette phrase en problématique C2 : évitez l'opposition binaire, précisez l'enjeu de décision et introduisez au moins un critère pertinent.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [
          "L'enjeu n'est pas d'opposer la protection des données à l'amélioration des services publics, mais d'identifier les usages de l'intelligence artificielle dont le bénéfice démontré justifie des garanties de transparence et de contrôle effectives.",
          "Il convient de déterminer dans quels cas l'intelligence artificielle peut améliorer un service public sans que la collecte de données excède ce qui est nécessaire, vérifiable et compréhensible pour les usagers.",
        ],
        explanation:
          "La reformulation C2 rend les deux objectifs compatibles sous conditions et fournit des critères permettant d'évaluer une mesure réelle.",
        targetLanguageFeature: "problématisation par critères et garanties",
        tags: ["introduction", "transform", "criteria", "nuance"],
      },
      {
        subSkill: "replace-binary-opening-with-criteria-alternative",
        prompt: "Reformulez : « Soit on construit de nouveaux logements, soit on protège les espaces verts. »",
        instructions: "Formulez une problématique qui montre pourquoi l'alternative est trop simple et indique ce qui devrait être comparé.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [
          "La question n'est pas de choisir abstraitement entre construire et préserver, mais d'établir quels projets répondent à un besoin de logement avéré sans compromettre des espaces verts dont la fonction écologique ne peut être compensée ailleurs.",
          "Il faut examiner comment hiérarchiser le besoin de logements, la qualité des terrains disponibles et la valeur irremplaçable de certains espaces verts, plutôt que d'opposer deux impératifs également légitimes.",
        ],
        explanation:
          "La version C2 remplace un dilemme simplificateur par les dimensions concrètes qui rendent une décision justifiable.",
        targetLanguageFeature: "décomposition d'un faux dilemme",
        tags: ["introduction", "transform", "criteria", "variant"],
      },
    ],
    [
      {
        subSkill: "context-tension-question-order",
        prompt: "Les documents traitent de la gratuité des transports pour les jeunes : l'un insiste sur l'égalité d'accès, l'autre redoute que la mesure absorbe des moyens nécessaires à l'amélioration du réseau.",
        instructions: "Mettez les phrases dans l'ordre d'une introduction analytique : contexte, tension, problématique.",
        options: [
          "Cette convergence d'objectifs rend nécessaire une question plus précise : une gratuité ciblée améliore-t-elle réellement l'accès à la mobilité sans retarder les investissements dont tous les usagers dépendent ?",
          "Dans de nombreuses villes, l'accès des jeunes aux études, à l'emploi et aux activités sociales dépend étroitement de la qualité et du coût des transports publics.",
          "Si les deux sources reconnaissent cet enjeu, elles divergent sur l'usage le plus juste de ressources budgétaires nécessairement limitées.",
        ],
        correctAnswer: [
          "Dans de nombreuses villes, l'accès des jeunes aux études, à l'emploi et aux activités sociales dépend étroitement de la qualité et du coût des transports publics.",
          "Si les deux sources reconnaissent cet enjeu, elles divergent sur l'usage le plus juste de ressources budgétaires nécessairement limitées.",
          "Cette convergence d'objectifs rend nécessaire une question plus précise : une gratuité ciblée améliore-t-elle réellement l'accès à la mobilité sans retarder les investissements dont tous les usagers dépendent ?",
        ],
        acceptedAnswers: [],
        explanation:
          "L'ordre part d'un contexte partagé, construit la tension de répartition, puis formule une question qui permettra de comparer les conséquences des options.",
        targetLanguageFeature: "contexte → tension → problématique évaluative",
        tags: ["introduction", "organization", "reasoning"],
      },
      {
        subSkill: "context-tension-question-order-alternative",
        prompt: "Les sources discutent de l'installation d'éoliennes près de zones rurales : l'une met en avant la transition énergétique, l'autre les effets paysagers et la participation des habitants.",
        instructions: "Organisez l'ouverture pour faire apparaître l'enjeu sans annoncer encore votre position.",
        options: [
          "Le débat invite donc à déterminer selon quelles procédures et quels critères un objectif collectif de production d'énergie peut être concilié avec des effets localement concentrés.",
          "La réduction des émissions suppose de développer des sources d'énergie moins dépendantes des combustibles fossiles.",
          "Les documents ne contestent pas cet objectif, mais opposent deux manières d'évaluer les coûts territoriaux et la légitimité des décisions prises.",
        ],
        correctAnswer: [
          "La réduction des émissions suppose de développer des sources d'énergie moins dépendantes des combustibles fossiles.",
          "Les documents ne contestent pas cet objectif, mais opposent deux manières d'évaluer les coûts territoriaux et la légitimité des décisions prises.",
          "Le débat invite donc à déterminer selon quelles procédures et quels critères un objectif collectif de production d'énergie peut être concilié avec des effets localement concentrés.",
        ],
        acceptedAnswers: [],
        explanation:
          "L'introduction C2 relie l'objectif général aux effets situés et fait de la procédure de décision un élément du problème.",
        targetLanguageFeature: "objectif collectif → effets situés → critères de décision",
        tags: ["introduction", "organization", "procedure", "variant"],
      },
    ],
    [
      {
        subSkill: "guided-balanced-problem-framing",
        prompt: "Deux documents débattent de la tarification de l'eau : l'un propose un tarif progressif pour encourager la sobriété, l'autre craint un effet injuste pour les familles nombreuses ou les logements mal isolés.",
        instructions: "Rédigez 4 ou 5 phrases d'introduction : situez l'enjeu, montrez ce que les sources ont en commun, identifiez la tension réelle et formulez une problématique qui n'anticipe pas votre réponse.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [],
        explanation:
          "Une entrée C2 n'accumule pas les arguments : elle construit un problème en montrant le but partagé, les effets différenciés et la question qui orientera l'analyse.",
        targetLanguageFeature: "problématisation équilibrée à partir de sources",
        tags: ["introduction", "development", "sources", "equity"],
        selfCheck: [
          "Je distingue l'objectif partagé de la difficulté qui oppose les sources.",
          "Je précise quels publics ou quels effets rendent le débat complexe.",
          "Ma problématique ouvre une analyse plutôt qu'elle n'annonce une réponse déjà décidée.",
        ],
      },
      {
        subSkill: "guided-balanced-problem-framing-alternative",
        prompt: "Deux sources discutent de l'usage des algorithmes pour sélectionner des candidats à une formation : l'une valorise un tri plus rapide, l'autre souligne le risque de reproduire des inégalités existantes.",
        instructions: "Rédigez 4 ou 5 phrases : présentez l'objectif du dispositif, expliquez la réserve sans la dramatiser et formulez la question qui doit guider l'examen des conditions d'usage.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [],
        explanation:
          "Le C2 fait apparaître que l'efficacité du tri et l'équité de la sélection doivent être évaluées ensemble, dans un cadre vérifiable.",
        targetLanguageFeature: "problématique d'efficacité et d'équité",
        tags: ["introduction", "development", "sources", "fairness", "variant"],
        selfCheck: [
          "J'explique le but pratique du dispositif avec précision.",
          "Je formule le risque comme une question à examiner, non comme une certitude vague.",
          "Ma problématique mentionne les conditions ou garanties à évaluer.",
        ],
      },
    ],
    [
      {
        subSkill: "independent-problem-framing-with-scope",
        prompt: "Deux documents discutent de la limitation des livraisons motorisées dans les centres-villes. Le premier souligne les gains possibles pour la qualité de l'air et la sécurité ; le second craint que les petites entreprises supportent un coût disproportionné.",
        instructions: "Rédigez une introduction de 90 à 110 mots. Cadrez l'enjeu, reformulez loyalement la tension entre les sources et posez une problématique fondée sur des critères de proportion, de faisabilité ou d'équité. Ne défendez pas encore votre position.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [],
        explanation:
          "La production C2 doit rendre le débat analysable : elle situe l'objectif, les effets répartis de manière inégale et la question qui permettra d'évaluer une réponse.",
        targetLanguageFeature: "introduction autonome, délimitée et analytique",
        tags: ["introduction", "production", "scope", "equity"],
        selfCheck: [
          "Je situe l'enjeu sans commencer par une opinion personnelle.",
          "Je restitue les deux préoccupations sans réduire l'une à un obstacle secondaire.",
          "Je formule une problématique avec au moins un critère qui rendra la décision évaluable.",
        ],
      },
      {
        subSkill: "independent-problem-framing-with-scope-alternative",
        prompt: "Deux sources débattent du recours à des plateformes numériques pour orienter les demandeurs d'emploi. L'une insiste sur un accompagnement plus accessible ; l'autre s'inquiète de décisions opaques et d'un éloignement des conseillers humains.",
        instructions: "Rédigez une introduction de 90 à 110 mots : présentez l'enjeu, mettez les logiques des sources en regard et posez une question qui distingue l'objectif d'accessibilité des conditions nécessaires pour le poursuivre légitimement. Gardez votre position pour la suite.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [],
        explanation:
          "Une introduction C2 ne confond pas innovation et amélioration : elle prépare l'évaluation des garanties, des limites et des conséquences pour les personnes concernées.",
        targetLanguageFeature: "cadrage autonome d'une innovation sous conditions",
        tags: ["introduction", "production", "technology", "variant"],
        selfCheck: [
          "Je distingue l'objectif d'accessibilité de l'outil qui est proposé.",
          "Je restitue le risque d'opacité et la valeur de l'accompagnement humain avec exactitude.",
          "La question posée porte sur des conditions d'usage vérifiables.",
        ],
      },
    ],
  ]),
  ...taskThreeC2Path("t3-c2-reformulating-sources", "reformulating-sources", [
    [
      {
        subSkill: "retain-claim-evidence-and-scope",
        prompt: "Source : « Dans notre ville, la fréquentation des bibliothèques a augmenté après l'extension des horaires du soir. Cette évolution ne prouve pas à elle seule que l'élargissement horaire explique tout, mais elle justifie que la mesure soit évaluée sur plusieurs années. »",
        instructions: "Choisissez la reformulation fidèle qui conserve à la fois le constat et sa réserve.",
        options: [
          "L'extension des horaires prouve que les bibliothèques seront toujours plus fréquentées.",
          "La source observe une hausse de fréquentation après l'extension des horaires, tout en soulignant que ce lien ne suffit pas à établir une causalité et doit être examiné dans la durée.",
          "Les bibliothèques ne servent plus à rien le soir.",
          "La source pense que tous les horaires doivent être prolongés immédiatement.",
        ],
        correctAnswer:
          "La source observe une hausse de fréquentation après l'extension des horaires, tout en soulignant que ce lien ne suffit pas à établir une causalité et doit être examiné dans la durée.",
        acceptedAnswers: [],
        explanation:
          "La reformulation C2 attribue correctement le point de vue, distingue observation et preuve, et conserve la limite formulée par la source.",
        targetLanguageFeature: "reformulation fidèle avec réserve méthodologique",
        tags: ["sources", "reformulation", "evidence", "recognize"],
      },
      {
        subSkill: "retain-claim-evidence-and-scope-alternative",
        prompt: "Source : « Les zones à faibles émissions ont réduit certains polluants dans plusieurs métropoles. Toutefois, leurs effets ne sont acceptables que si les ménages qui dépendent d'un véhicule disposent d'alternatives réellement accessibles. »",
        instructions: "Choisissez la reformulation qui respecte le raisonnement de la source.",
        options: [
          "Les zones à faibles émissions sont toujours injustes.",
          "La source reconnaît l'effet de ces zones sur certains polluants, mais conditionne leur acceptabilité à l'existence de solutions de déplacement accessibles pour les ménages concernés.",
          "Les voitures doivent être interdites dans toutes les villes.",
          "La source affirme que les alternatives de transport existent déjà partout.",
        ],
        correctAnswer:
          "La source reconnaît l'effet de ces zones sur certains polluants, mais conditionne leur acceptabilité à l'existence de solutions de déplacement accessibles pour les ménages concernés.",
        acceptedAnswers: [],
        explanation:
          "La formulation préserve la relation entre effet observé, condition de justice et public précisément visé.",
        targetLanguageFeature: "attribution d'une condition d'acceptabilité",
        tags: ["sources", "reformulation", "conditions", "recognize", "variant"],
      },
    ],
    [
      {
        subSkill: "attribute-a-qualified-claim",
        prompt: "La source estime que l'enseignement à distance peut élargir l'accès à certaines formations, mais qu'il ne remplace pas automatiquement les échanges et le suivi dont certains étudiants ont besoin.",
        instructions: "Complétez : « Tout en reconnaissant que la formation à distance peut élargir l'accès aux études, la source ______ que cet avantage ne dispense pas d'un accompagnement adapté. »",
        options: [],
        correctAnswer: "souligne",
        acceptedAnswers: ["rappelle", "précise", "fait valoir"],
        explanation:
          "Le verbe d'attribution permet de restituer une réserve de la source sans la présenter comme votre propre affirmation.",
        targetLanguageFeature: "attribution précise d'une réserve",
        tags: ["sources", "attribution", "complete"],
      },
      {
        subSkill: "attribute-a-qualified-claim-alternative",
        prompt: "La source observe que la restauration des rivières améliore la biodiversité locale, mais elle indique que les bénéfices varient selon la continuité écologique et l'entretien du site.",
        instructions: "Complétez : « La source ne présente donc pas la restauration comme une solution automatique : elle ______ ses effets à des conditions écologiques et de suivi précises. »",
        options: [],
        correctAnswer: "subordonne",
        acceptedAnswers: ["conditionne", "relie"],
        explanation:
          "Le verbe conserve l'idée que l'effet dépend de conditions ; il évite de transformer une analyse nuancée en slogan.",
        targetLanguageFeature: "restitution d'une relation conditionnelle",
        tags: ["sources", "conditions", "complete", "variant"],
      },
    ],
    [
      {
        subSkill: "separate-source-voice-from-evaluation",
        prompt: "Reformulez cette phrase trop engagée : « La première source prouve que les repas végétariens obligatoires à la cantine sont une excellente idée. » La source indique en réalité qu'ils peuvent réduire l'empreinte carbone, à condition que les menus restent accessibles et acceptés.",
        instructions: "Restituez l'idée sans présenter l'effet comme démontré ni effacer la condition mentionnée.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [
          "La première source avance que des repas végétariens plus fréquents pourraient réduire l'empreinte carbone des cantines, à condition que leur conception reste accessible et recueille l'adhésion des élèves.",
          "Selon la première source, cette mesure peut contribuer à réduire l'empreinte carbone ; elle n'envisage toutefois cet effet qu'avec des menus acceptables et adaptés aux élèves.",
        ],
        explanation:
          "La transformation C2 distingue l'énoncé de la source d'une preuve définitive et conserve le mécanisme conditionnel qui limite sa portée.",
        targetLanguageFeature: "modalisation et fidélité à la source",
        tags: ["sources", "transform", "modalization", "fidelity"],
      },
      {
        subSkill: "separate-source-voice-from-evaluation-alternative",
        prompt: "Reformulez : « Le deuxième document dit que le télétravail est mauvais parce que les équipes ne se voient plus. » La source explique plutôt que le télétravail peut isoler certains salariés si l'organisation ne prévoit ni temps collectif ni soutien managérial.",
        instructions: "Reformulez avec précision : attribuez le point de vue, évitez la généralisation et restituez les conditions signalées.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [
          "Le deuxième document souligne que le télétravail peut accroître l'isolement de certains salariés lorsque l'organisation ne maintient ni échanges collectifs ni accompagnement managérial.",
          "Selon la seconde source, l'isolement n'est pas un effet inévitable du télétravail, mais un risque qui s'accentue en l'absence de temps partagé et de soutien adapté.",
        ],
        explanation:
          "La reformulation C2 ne prête pas à la source une condamnation générale : elle restitue le public, le risque et les conditions qui l'expliquent.",
        targetLanguageFeature: "reformulation conditionnelle et non généralisante",
        tags: ["sources", "transform", "scope", "variant"],
      },
    ],
    [
      {
        subSkill: "source-a-source-b-qualified-convergence-order",
        prompt: "Source A : la rénovation énergétique réduit les dépenses à long terme, mais le coût initial freine de nombreux ménages. Source B : les aides publiques sont nécessaires, mais elles doivent cibler en priorité les logements les plus énergivores.",
        instructions: "Organisez la synthèse de façon à distinguer les apports des sources et leur convergence.",
        options: [
          "La seconde en déduit que les aides publiques ont un rôle décisif, à condition d'être orientées vers les logements où le gain énergétique est le plus important.",
          "Les deux documents s'accordent ainsi sur la nécessité d'éviter que le coût initial ne transforme une mesure écologique en avantage réservé aux ménages les plus aisés.",
          "La première source met en avant les économies que peut apporter la rénovation, tout en rappelant l'obstacle que représente l'investissement de départ.",
        ],
        correctAnswer: [
          "La première source met en avant les économies que peut apporter la rénovation, tout en rappelant l'obstacle que représente l'investissement de départ.",
          "La seconde en déduit que les aides publiques ont un rôle décisif, à condition d'être orientées vers les logements où le gain énergétique est le plus important.",
          "Les deux documents s'accordent ainsi sur la nécessité d'éviter que le coût initial ne transforme une mesure écologique en avantage réservé aux ménages les plus aisés.",
        ],
        acceptedAnswers: [],
        explanation:
          "L'ordre attribue chaque raisonnement, puis construit leur convergence sans faire croire qu'ils ont formulé exactement la même proposition.",
        targetLanguageFeature: "attribution → complémentarité → convergence raisonnée",
        tags: ["sources", "organization", "synthesis"],
      },
      {
        subSkill: "source-a-source-b-qualified-convergence-order-alternative",
        prompt: "Source A : une semaine de quatre jours peut améliorer l'équilibre de vie si la charge de travail est réellement réorganisée. Source B : elle risque sinon d'intensifier le travail et d'accentuer les écarts entre métiers.",
        instructions: "Mettez les phrases dans l'ordre d'une reformulation synthétique et fidèle.",
        options: [
          "La seconde rappelle toutefois que, sans réorganisation concrète, la réduction du temps peut se traduire par une intensification du travail inégalement supportée.",
          "Ces analyses convergent donc sur un point : l'effet de la mesure dépend moins de son intitulé que des conditions dans lesquelles le travail est redistribué.",
          "La première source envisage la semaine de quatre jours comme un levier d'équilibre de vie, sous réserve que la charge soit repensée plutôt que simplement comprimée.",
        ],
        correctAnswer: [
          "La première source envisage la semaine de quatre jours comme un levier d'équilibre de vie, sous réserve que la charge soit repensée plutôt que simplement comprimée.",
          "La seconde rappelle toutefois que, sans réorganisation concrète, la réduction du temps peut se traduire par une intensification du travail inégalement supportée.",
          "Ces analyses convergent donc sur un point : l'effet de la mesure dépend moins de son intitulé que des conditions dans lesquelles le travail est redistribué.",
        ],
        acceptedAnswers: [],
        explanation:
          "La synthèse fait apparaître une convergence sur les conditions d'effet, même si les deux sources insistent sur des conséquences différentes.",
        targetLanguageFeature: "convergence conditionnelle entre sources",
        tags: ["sources", "organization", "conditions", "variant"],
      },
    ],
    [
      {
        subSkill: "guided-faithful-selective-synthesis",
        prompt: "Source A défend l'installation de fontaines d'eau dans les lieux publics pour réduire les bouteilles jetables. Source B approuve l'objectif, mais rappelle que leur usage dépend de l'entretien, de l'accessibilité et de la confiance dans la qualité de l'eau.",
        instructions: "Rédigez 4 ou 5 phrases : attribuez chaque idée à sa source, formulez leur accord sans les confondre et expliquez quelle condition concrète rend la mesure crédible.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [],
        explanation:
          "Le développement C2 sélectionne l'information utile, maintient les voix distinctes et fait apparaître le critère pratique qui relie les documents.",
        targetLanguageFeature: "synthèse fidèle et sélective de deux sources",
        tags: ["sources", "development", "synthesis", "attribution"],
        selfCheck: [
          "J'attribue clairement les idées sans répéter les formulations sources.",
          "Je distingue l'accord sur l'objectif de la réserve sur les conditions de réussite.",
          "Je formule une condition concrète plutôt qu'un accord vague.",
        ],
      },
      {
        subSkill: "guided-faithful-selective-synthesis-alternative",
        prompt: "Source A propose de rendre les musées gratuits un dimanche par mois afin d'élargir l'accès à la culture. Source B craint que cette mesure surcharge les lieux les plus fréquentés et détourne des moyens des actions vers les publics éloignés.",
        instructions: "Rédigez 4 ou 5 phrases : restituez les deux logiques, identifiez leur objectif commun et montrez en quoi elles divergent sur le meilleur moyen d'atteindre cet objectif.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [],
        explanation:
          "Une synthèse C2 compare les mécanismes proposés au lieu d'aligner des opinions ; elle garde la complexité du désaccord intacte.",
        targetLanguageFeature: "synthèse de moyens divergents vers un objectif commun",
        tags: ["sources", "development", "synthesis", "variant"],
        selfCheck: [
          "Je restitue l'objectif d'accessibilité commun aux deux sources.",
          "Je différencie les effets ou mécanismes sur lesquels elles ne s'accordent pas.",
          "Je n'attribue pas à une source une conclusion qui appartient à l'autre.",
        ],
      },
    ],
    [
      {
        subSkill: "independent-source-reformulation-with-limit",
        prompt: "Deux sources s'interrogent sur l'installation de capteurs pour suivre la qualité de l'air dans les écoles. La première y voit un moyen de rendre visibles des inégalités environnementales. La seconde juge la mesure utile seulement si les données déclenchent des décisions sur la ventilation, les travaux ou l'organisation des activités.",
        instructions: "Rédigez une synthèse de 100 à 120 mots, sans donner votre avis. Reformulez les deux sources avec vos propres mots, préservez la limite formulée par la seconde et faites apparaître leur éventuelle convergence.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [],
        explanation:
          "La production C2 doit séparer les constats, les conditions et les conséquences : elle informe loyalement le lecteur avant toute prise de position.",
        targetLanguageFeature: "reformulation autonome avec attribution, limite et convergence",
        tags: ["sources", "production", "synthesis", "evidence"],
        selfCheck: [
          "Je reformule chaque source sans copier ni commenter sa valeur.",
          "Je conserve la condition qui distingue la mesure utile d'une simple collecte de données.",
          "Je montre clairement ce que les sources partagent ou ce qui les sépare.",
        ],
      },
      {
        subSkill: "independent-source-reformulation-with-limit-alternative",
        prompt: "Deux documents discutent de la possibilité de confier une partie de l'aide aux devoirs à des bénévoles en ligne. Le premier valorise l'accès à un soutien plus large. Le second alerte sur la qualité inégale de l'accompagnement et sur la confidentialité des situations familiales évoquées.",
        instructions: "Rédigez une synthèse de 100 à 120 mots, sans prendre position. Attribuez les idées avec précision, préservez la réserve de la seconde source et identifiez la question pratique qui relie les deux documents.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [],
        explanation:
          "Le niveau C2 exige une restitution précise des bénéfices et des limites, sans remplacer le raisonnement des sources par une opinion personnelle.",
        targetLanguageFeature: "synthèse autonome de bénéfice, risque et condition",
        tags: ["sources", "production", "synthesis", "privacy", "variant"],
        selfCheck: [
          "J'attribue chaque idée à la source concernée avec des verbes nuancés.",
          "Je rends le risque de qualité et de confidentialité suffisamment concret.",
          "Je formule la question pratique sans introduire mon propre jugement.",
        ],
      },
    ],
  ]),
  ...taskThreeC2Path("t3-c2-identifying-arguments", "identifying-arguments", [
    [
      {
        subSkill: "distinguish-claim-evidence-and-inference",
        prompt: "Source : « Après la création de voies cyclables séparées, les accidents impliquant des cyclistes ont diminué sur trois axes très fréquentés. La ville devrait donc prolonger le réseau dans les quartiers voisins. »",
        instructions: "Choisissez l'analyse qui identifie correctement l'argument et ce qu'il reste à vérifier.",
        options: [
          "La source prouve que toutes les voies cyclables sont sans danger.",
          "La source s'appuie sur une baisse observée sur trois axes pour recommander une extension ; son raisonnement suppose que les quartiers voisins présentent des conditions suffisamment comparables et que d'autres facteurs n'expliquent pas seuls la baisse.",
          "La source parle uniquement d'accidents et ne propose aucune idée.",
          "La source affirme que les cyclistes sont responsables de tous les accidents.",
        ],
        correctAnswer:
          "La source s'appuie sur une baisse observée sur trois axes pour recommander une extension ; son raisonnement suppose que les quartiers voisins présentent des conditions suffisamment comparables et que d'autres facteurs n'expliquent pas seuls la baisse.",
        acceptedAnswers: [],
        explanation:
          "Au C2, identifier un argument consiste à distinguer le fait observé de la recommandation et à rendre visible la condition qui relie l'un à l'autre.",
        targetLanguageFeature: "thèse, indice empirique et présupposé de généralisation",
        tags: ["arguments", "evidence", "assumption", "recognize"],
      },
      {
        subSkill: "distinguish-claim-evidence-and-inference-alternative",
        prompt: "Source : « Les élèves qui participent régulièrement à des ateliers de débat déclarent davantage se sentir capables de défendre une idée devant un groupe. Les établissements devraient donc intégrer ces ateliers à l'emploi du temps. »",
        instructions: "Choisissez l'analyse la plus rigoureuse de ce raisonnement.",
        options: [
          "La source démontre que tous les élèves aiment débattre.",
          "La source associe une participation régulière à un sentiment accru d'aisance et en déduit une recommandation ; il faudrait encore savoir si cet effet est durable, accessible à des élèves différents et lié aux ateliers eux-mêmes.",
          "La source dit que les emplois du temps sont inutiles.",
          "La source refuse toute autre activité scolaire.",
        ],
        correctAnswer:
          "La source associe une participation régulière à un sentiment accru d'aisance et en déduit une recommandation ; il faudrait encore savoir si cet effet est durable, accessible à des élèves différents et lié aux ateliers eux-mêmes.",
        acceptedAnswers: [],
        explanation:
          "L'analyse C2 ne rejette pas le résultat : elle examine les conditions qui permettraient de passer d'une observation à une règle générale.",
        targetLanguageFeature: "évaluation de la portée d'un indice",
        tags: ["arguments", "evidence", "scope", "recognize", "variant"],
      },
    ],
    [
      {
        subSkill: "make-the-warrant-explicit",
        prompt: "Argument : « Le taux de participation a augmenté après l'ouverture du centre le samedi ; il serait donc pertinent de maintenir cette ouverture. »",
        instructions: "Complétez : « Ce raisonnement est convaincant à condition de vérifier que cette hausse ne s'explique pas seulement par un événement ponctuel et ______ les personnes qui viennent le samedi correspondent bien au public que le centre cherche à atteindre. »",
        options: [],
        correctAnswer: "que",
        acceptedAnswers: ["que l'on établisse que"],
        explanation:
          "La complétive rend explicite une condition qui soutient réellement la conclusion, au lieu de traiter une corrélation comme une preuve suffisante.",
        targetLanguageFeature: "explicitation d'une condition de validité",
        tags: ["arguments", "warrant", "complete"],
      },
      {
        subSkill: "make-the-warrant-explicit-alternative",
        prompt: "Argument : « Les usagers répondent plus souvent quand les démarches sont simplifiées en ligne ; l'administration devrait donc dématérialiser tous ses formulaires. »",
        instructions: "Complétez : « Cette conclusion suppose notamment que la simplification en ligne n'exclut pas les personnes ______ l'accès ou la maîtrise du numérique restent limités. »",
        options: [],
        correctAnswer: "dont",
        acceptedAnswers: ["pour lesquelles"],
        explanation:
          "La relative identifie le public pour lequel la généralisation peut échouer ; elle transforme un avantage observé en question d'accessibilité.",
        targetLanguageFeature: "identification du public exclu par une généralisation",
        tags: ["arguments", "assumption", "complete", "variant"],
      },
    ],
    [
      {
        subSkill: "turn-assertion-into-qualified-argument",
        prompt: "Transformez : « Il faut interdire les voitures près des écoles parce que c'est dangereux. »",
        instructions: "Construisez un argument C2 : précisez le mécanisme de risque, indiquez l'effet attendu et formulez une limite ou une condition qui évite une conclusion absolue.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [
          "Limiter la circulation motorisée aux abords des écoles peut réduire l'exposition des enfants aux conflits de circulation et à la pollution aux heures d'entrée et de sortie ; cette mesure serait toutefois plus justifiable si des itinéraires alternatifs et des solutions pour les personnes à mobilité réduite étaient prévus.",
          "Une restriction ciblée près des écoles se justifie par la concentration prévisible des risques aux heures d'affluence, à condition qu'elle soit accompagnée d'aménagements permettant aux familles sans alternative réaliste de rejoindre l'établissement.",
        ],
        explanation:
          "La transformation C2 remplace une affirmation par une chaîne explicite : mesure, mécanisme, effet attendu et condition de proportionnalité.",
        targetLanguageFeature: "argument causal avec limite de mise en œuvre",
        tags: ["arguments", "transform", "causality", "conditions"],
      },
      {
        subSkill: "turn-assertion-into-qualified-argument-alternative",
        prompt: "Transformez : « Les entreprises devraient obliger leurs salariés à travailler de chez eux pour protéger la planète. »",
        instructions: "Reformulez en argument rigoureux. Distinguez un effet possible d'une certitude et tenez compte des conditions de travail différentes selon les salariés.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [
          "Lorsque les déplacements domicile-travail représentent une part importante des trajets, le télétravail peut contribuer à réduire certaines émissions ; une politique généralisée devrait néanmoins tenir compte des métiers incompatibles avec cette organisation et des conditions matérielles nécessaires à un travail soutenable.",
          "Encourager le télétravail peut avoir un intérêt environnemental dans les secteurs où il évite réellement des déplacements, sans pour autant justifier une obligation qui ignorerait les contraintes des postes, des logements et de l'organisation collective.",
        ],
        explanation:
          "Une argumentation C2 module le lien causal et situe les limites de l'application d'une mesure au lieu d'invoquer un objectif général comme une preuve.",
        targetLanguageFeature: "modalisation d'un effet et délimitation d'une politique",
        tags: ["arguments", "transform", "scope", "variant"],
      },
    ],
    [
      {
        subSkill: "claim-evidence-warrant-limit-order",
        prompt: "Vous analysez l'argument selon lequel les villes devraient planter davantage d'arbres dans les quartiers denses.",
        instructions: "Organisez les éléments pour rendre le raisonnement vérifiable plutôt que simplement persuasif.",
        options: [
          "Dans les zones où l'ombre est rare, cet effet peut réduire l'exposition des habitants les plus vulnérables aux fortes chaleurs.",
          "Toutefois, la priorité donnée à ces quartiers suppose que l'entretien, l'accès à l'eau et l'usage de l'espace public soient prévus à long terme.",
          "Les relevés de température montrent que les rues très minéralisées restent sensiblement plus chaudes pendant les épisodes caniculaires.",
          "Il serait donc justifié de concentrer les plantations là où le déficit d'ombre affecte le plus directement la santé et le confort des habitants.",
        ],
        correctAnswer: [
          "Les relevés de température montrent que les rues très minéralisées restent sensiblement plus chaudes pendant les épisodes caniculaires.",
          "Dans les zones où l'ombre est rare, cet effet peut réduire l'exposition des habitants les plus vulnérables aux fortes chaleurs.",
          "Il serait donc justifié de concentrer les plantations là où le déficit d'ombre affecte le plus directement la santé et le confort des habitants.",
          "Toutefois, la priorité donnée à ces quartiers suppose que l'entretien, l'accès à l'eau et l'usage de l'espace public soient prévus à long terme.",
        ],
        acceptedAnswers: [],
        explanation:
          "L'ordre fait apparaître l'indice, le mécanisme, la conclusion puis la condition qui encadre la proposition.",
        targetLanguageFeature: "indice → mécanisme → thèse → limite",
        tags: ["arguments", "organization", "reasoning"],
      },
      {
        subSkill: "claim-evidence-warrant-limit-order-alternative",
        prompt: "Vous analysez l'argument en faveur d'un accès gratuit aux activités sportives pour les adolescents.",
        instructions: "Mettez les phrases dans l'ordre d'un raisonnement complet.",
        options: [
          "Il serait donc pertinent de réduire le coût d'inscription dans les quartiers où cette barrière pèse le plus fortement.",
          "Des enquêtes locales montrent que le prix de l'inscription est cité par de nombreuses familles comme un frein à la participation régulière.",
          "Cette mesure ne produira toutefois l'effet recherché que si les horaires, les transports et l'accueil ne créent pas d'autres obstacles pour les jeunes concernés.",
          "Réduire ce coût peut permettre à des adolescents qui en sont écartés de participer plus durablement à une activité encadrée.",
        ],
        correctAnswer: [
          "Des enquêtes locales montrent que le prix de l'inscription est cité par de nombreuses familles comme un frein à la participation régulière.",
          "Réduire ce coût peut permettre à des adolescents qui en sont écartés de participer plus durablement à une activité encadrée.",
          "Il serait donc pertinent de réduire le coût d'inscription dans les quartiers où cette barrière pèse le plus fortement.",
          "Cette mesure ne produira toutefois l'effet recherché que si les horaires, les transports et l'accueil ne créent pas d'autres obstacles pour les jeunes concernés.",
        ],
        acceptedAnswers: [],
        explanation:
          "La structure évite de confondre un obstacle documenté avec une solution suffisante : elle rend la conclusion et ses conditions lisibles.",
        targetLanguageFeature: "obstacle documenté → effet attendu → proposition → condition",
        tags: ["arguments", "organization", "equity", "variant"],
      },
    ],
    [
      {
        subSkill: "guided-evaluation-of-argument-strength",
        prompt: "Une source affirme que les médiathèques devraient prêter des ordinateurs portables, car de nombreux demandeurs d'emploi n'ont pas d'équipement fiable à domicile. Elle reconnaît toutefois que le prêt peut provoquer des pertes ou des usages inégaux selon les quartiers.",
        instructions: "Rédigez 4 ou 5 phrases : identifiez la conclusion, le fait qui l'appuie et la réserve ; dites quelles informations permettraient d'évaluer si l'argument justifie réellement la mesure.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [],
        explanation:
          "Au C2, évaluer un argument ne signifie pas choisir son camp immédiatement : il faut déterminer quelles données et quelles garanties rendraient sa conclusion proportionnée.",
        targetLanguageFeature: "évaluation guidée de la force d'un argument",
        tags: ["arguments", "development", "evaluation", "evidence"],
        selfCheck: [
          "Je distingue clairement la thèse, son appui et sa réserve.",
          "Je propose une information ou un critère qui permettrait d'évaluer l'ampleur réelle du besoin.",
          "Je mentionne une garantie ou une limite liée aux risques indiqués.",
        ],
      },
      {
        subSkill: "guided-evaluation-of-argument-strength-alternative",
        prompt: "Une source propose d'étendre l'éclairage nocturne dans les parcs, en s'appuyant sur le sentiment d'insécurité exprimé par certains usagers. Une autre donnée montre que l'éclairage peut perturber la faune et ne répond pas à tous les problèmes de sécurité.",
        instructions: "Rédigez 4 ou 5 phrases : reconstituez le raisonnement initial, identifiez ce qu'il ne suffit pas à établir et indiquez un moyen de juger si une extension ciblée serait justifiée.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [],
        explanation:
          "La réponse C2 relie la perception d'un risque, son traitement possible et les effets secondaires qui doivent être comparés avant une généralisation.",
        targetLanguageFeature: "mise à l'épreuve d'un argument par ses effets secondaires",
        tags: ["arguments", "development", "evaluation", "variant"],
        selfCheck: [
          "Je ne transforme pas le sentiment d'insécurité en preuve automatique d'une solution.",
          "J'identifie un effet secondaire qui limite la portée de l'argument.",
          "Je formule un critère ou une donnée qui rendrait une décision ciblée justifiable.",
        ],
      },
    ],
    [
      {
        subSkill: "independent-argument-mapping",
        prompt: "Un document soutient que les municipalités devraient réserver une part de leurs marchés publics aux entreprises locales. Il invoque le maintien de l'emploi et des circuits économiques courts. Un autre document avertit que cette préférence peut réduire la concurrence, augmenter les coûts et exclure des entreprises innovantes situées hors du territoire.",
        instructions: "Rédigez 110 à 130 mots sans donner encore votre position. Présentez l'argument central de chaque document, distinguez les éléments qui l'appuient de la conclusion, puis identifiez une hypothèse ou une donnée qui serait nécessaire pour comparer leur portée.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [],
        explanation:
          "Une cartographie C2 d'arguments rend visibles les mécanismes et les conditions de chaque position avant que le lecteur tranche entre elles.",
        targetLanguageFeature: "analyse autonome de thèses, appuis et hypothèses",
        tags: ["arguments", "production", "analysis", "sources"],
        selfCheck: [
          "Je sépare les objectifs invoqués, les effets attendus et les conclusions proposées.",
          "Je restitue le coût ou le risque indiqué sans en faire une objection vague.",
          "Je précise une hypothèse ou une donnée qui permettrait de comparer les deux raisonnements.",
        ],
      },
      {
        subSkill: "independent-argument-mapping-alternative",
        prompt: "Deux documents discutent de l'obligation de proposer une alimentation végétarienne par défaut dans les cantines. Le premier avance que ce choix peut réduire l'empreinte environnementale sans supprimer les autres options. Le second craint que l'acceptation des menus et les besoins nutritionnels de certains publics soient négligés.",
        instructions: "Rédigez 110 à 130 mots, sans prendre position. Identifiez les conclusions des documents, les raisons qui les soutiennent et les conditions dont dépendrait la validité de chacun des arguments.",
        options: [],
        correctAnswer: null,
        acceptedAnswers: [],
        explanation:
          "La production C2 exige de distinguer une mesure, le mécanisme attendu et les publics pour lesquels ses conditions de réussite peuvent varier.",
        targetLanguageFeature: "analyse autonome d'arguments conditionnels",
        tags: ["arguments", "production", "analysis", "conditions", "variant"],
        selfCheck: [
          "Je formule les deux conclusions sans les confondre avec leurs raisons.",
          "Je relie chaque argument à un effet ou à un public précis.",
          "Je rends explicite au moins une condition qui limiterait ou confirmerait la portée du raisonnement.",
        ],
      },
    ],
  ]),
  ...taskThreeC2Path("t3-c2-comparing-viewpoints", "comparing-viewpoints", [
    [
      { subSkill: "compare-logics-not-labels", prompt: "Source A propose de limiter la publicité pour les aliments très sucrés afin de protéger les enfants. Source B préfère financer l'éducation nutritionnelle, jugeant qu'une interdiction ignore le rôle des familles et des producteurs.", instructions: "Choisissez la comparaison qui restitue les deux logiques sans les réduire à un simple pour ou contre.", options: ["La première source est pour la santé, la seconde est contre.", "Les deux sources cherchent à réduire une consommation jugée problématique, mais la première privilégie la limitation d'une influence commerciale, tandis que la seconde mise sur la capacité de choix et l'information des consommateurs.", "La seconde source ne se préoccupe pas des enfants.", "Les documents disent exactement la même chose."], correctAnswer: "Les deux sources cherchent à réduire une consommation jugée problématique, mais la première privilégie la limitation d'une influence commerciale, tandis que la seconde mise sur la capacité de choix et l'information des consommateurs.", acceptedAnswers: [], explanation: "La comparaison C2 identifie un objectif commun et le mécanisme distinct par lequel chaque source pense pouvoir l'atteindre.", targetLanguageFeature: "objectif partagé et logiques d'action divergentes", tags: ["comparison", "sources", "reasoning", "recognize"] },
      { subSkill: "compare-logics-not-labels-alternative", prompt: "Source A soutient que les villes doivent fixer un plafond de loyers dans les zones tendues. Source B redoute que ce plafond réduise l'offre si les propriétaires ne peuvent plus financer l'entretien des logements.", instructions: "Choisissez la comparaison la plus juste.", options: ["Une source aide les locataires ; l'autre aide les propriétaires.", "Les deux sources se préoccupent de l'accès à un logement durable, mais elles divergent sur le risque prioritaire : l'une cherche à contenir la hausse immédiate des loyers, l'autre craint des effets sur l'offre et la qualité à plus long terme.", "La première source veut supprimer tous les loyers.", "La seconde source nie que les loyers puissent augmenter."], correctAnswer: "Les deux sources se préoccupent de l'accès à un logement durable, mais elles divergent sur le risque prioritaire : l'une cherche à contenir la hausse immédiate des loyers, l'autre craint des effets sur l'offre et la qualité à plus long terme.", acceptedAnswers: [], explanation: "Le C2 met en regard des horizons et des mécanismes différents, sans attribuer à l'une des sources un objectif qu'elle ne formule pas.", targetLanguageFeature: "comparaison de risques et d'horizons temporels", tags: ["comparison", "sources", "time", "recognize", "variant"] },
    ],
    [
      { subSkill: "name-the-axis-of-divergence", prompt: "Deux sources soutiennent l'amélioration de l'accès aux soins. La première privilégie des consultations vidéo pour réduire les distances ; la seconde insiste sur le maintien de lieux d'accueil physiques pour les personnes peu équipées ou isolées.", instructions: "Complétez : « Leur divergence porte moins sur l'objectif d'accès que sur le degré auquel la numérisation peut ______ un accueil de proximité. »", options: [], correctAnswer: "se substituer à", acceptedAnswers: ["remplacer"], explanation: "La formule nomme l'axe précis de comparaison : l'équivalence, ou non, entre deux formes d'accès.", targetLanguageFeature: "formulation d'un axe de divergence", tags: ["comparison", "axis", "complete"] },
      { subSkill: "name-the-axis-of-divergence-alternative", prompt: "Deux documents veulent réduire les déchets textiles. L'un défend une taxe sur les vêtements neufs, l'autre des obligations de reprise par les marques.", instructions: "Complétez : « Les deux approches diffèrent surtout par le levier qu'elles privilégient : l'une agit sur le prix payé au moment de l'achat, l'autre sur la responsabilité ______ après la vente. »", options: [], correctAnswer: "des producteurs", acceptedAnswers: ["des marques", "des entreprises"], explanation: "Une comparaison rigoureuse situe chaque proposition dans la chaîne d'action plutôt que de les appeler simplement opposées.", targetLanguageFeature: "comparaison des leviers de responsabilité", tags: ["comparison", "mechanism", "complete", "variant"] },
    ],
    [
      { subSkill: "replace-flat-contrast-with-analysis", prompt: "Reformulez : « Le premier document est positif sur le revenu universel, mais le deuxième est négatif. » Le premier y voit un filet de sécurité face à la précarité ; le second s'interroge sur son financement et sur ses effets possibles sur les autres protections sociales.", instructions: "Comparez les sources avec précision : faites apparaître l'objectif, le mécanisme ou le risque mis en avant, sans attribuer une position absolue à la seconde.", options: [], correctAnswer: null, acceptedAnswers: ["Alors que le premier document présente le revenu universel comme un moyen de sécuriser les parcours fragiles, le second n'en conteste pas nécessairement l'objectif mais interroge les conditions de son financement et son articulation avec les protections existantes.", "Les sources divergent moins sur la nécessité de répondre à la précarité que sur la capacité d'un revenu universel à le faire sans fragiliser, par son coût ou sa conception, d'autres formes de solidarité."], explanation: "La reformulation C2 compare des raisonnements et des conditions d'acceptabilité, au lieu d'opposer une approbation et un refus sans contenu.", targetLanguageFeature: "comparaison nuancée de finalité et de condition", tags: ["comparison", "transform", "nuance"] },
      { subSkill: "replace-flat-contrast-with-analysis-alternative", prompt: "Reformulez : « Une source aime les examens en ligne et l'autre non. » La première souligne la souplesse pour les étudiants éloignés ; la seconde alerte sur l'égalité des conditions matérielles et la fiabilité de l'évaluation.", instructions: "Produisez une comparaison analytique qui respecte les deux points de vue.", options: [], correctAnswer: null, acceptedAnswers: ["La première source valorise l'accessibilité que peuvent offrir les examens en ligne aux étudiants éloignés, tandis que la seconde déplace le débat vers les garanties nécessaires pour que cette souplesse ne se traduise pas par des conditions d'évaluation inégales ou contestables.", "Les documents reconnaissent des enjeux différents : l'un privilégie la réduction des contraintes géographiques, l'autre rappelle que cet avantage n'est légitime que si l'équipement et l'intégrité de l'évaluation sont assurés."], explanation: "Le niveau C2 met les effets recherchés et les garanties nécessaires dans une relation précise.", targetLanguageFeature: "mise en regard d'un bénéfice et de ses garanties", tags: ["comparison", "transform", "conditions", "variant"] },
    ],
    [
      { subSkill: "convergence-divergence-implication-order", prompt: "Source A recommande de réserver certaines rues aux piétons le week-end afin de réduire le bruit. Source B propose plutôt des horaires de livraison encadrés, afin de préserver l'activité des commerces.", instructions: "Organisez les phrases pour comparer les sources puis dégager l'implication de leur désaccord.", options: ["Leur désaccord porte donc sur la répartition acceptable de la contrainte entre riverains, commerçants et professionnels de la livraison.", "La première mise sur une réduction temporaire de la circulation pour améliorer directement le cadre de vie.", "La seconde poursuit également cet objectif, mais préfère une régulation ciblée qui limite les effets sur les activités économiques."], correctAnswer: ["La première mise sur une réduction temporaire de la circulation pour améliorer directement le cadre de vie.", "La seconde poursuit également cet objectif, mais préfère une régulation ciblée qui limite les effets sur les activités économiques.", "Leur désaccord porte donc sur la répartition acceptable de la contrainte entre riverains, commerçants et professionnels de la livraison."], acceptedAnswers: [], explanation: "L'ordre attribue les stratégies, souligne leur but commun, puis formule le critère social qui explique réellement la divergence.", targetLanguageFeature: "stratégie A → stratégie B → implication distributive", tags: ["comparison", "organization", "equity"] },
      { subSkill: "convergence-divergence-implication-order-alternative", prompt: "Source A défend des repas locaux dans la restauration collective. Source B rappelle que certains produits locaux sont saisonniers et que l'approvisionnement doit rester abordable.", instructions: "Mettez le passage dans l'ordre qui compare les logiques sans les caricaturer.", options: ["La seconde ne rejette pas ce principe, mais insiste sur les contraintes de disponibilité et de prix qui déterminent sa mise en œuvre réelle.", "La première source présente l'approvisionnement local comme un moyen de rapprocher la consommation des conditions de production.", "Les documents divergent ainsi sur la priorité à donner à la proximité lorsque celle-ci entre en tension avec la régularité et l'accessibilité des repas."], correctAnswer: ["La première source présente l'approvisionnement local comme un moyen de rapprocher la consommation des conditions de production.", "La seconde ne rejette pas ce principe, mais insiste sur les contraintes de disponibilité et de prix qui déterminent sa mise en œuvre réelle.", "Les documents divergent ainsi sur la priorité à donner à la proximité lorsque celle-ci entre en tension avec la régularité et l'accessibilité des repas."], acceptedAnswers: [], explanation: "La comparaison C2 conserve l'accord de principe et rend visible le critère qui hiérarchise différemment les objectifs.", targetLanguageFeature: "accord de principe → contrainte → hiérarchisation", tags: ["comparison", "organization", "priorities", "variant"] },
    ],
    [
      { subSkill: "guided-comparison-of-criteria", prompt: "Deux sources débattent de l'extension des horaires d'ouverture des magasins : la première y voit un service utile aux salariés aux horaires atypiques ; la seconde craint que les employés du commerce supportent seuls le coût de cette souplesse.", instructions: "Rédigez 4 ou 5 phrases : comparez leurs objectifs, identifiez le critère qui les sépare et indiquez quelles conditions permettraient d'évaluer une solution sans effacer l'un des deux publics.", options: [], correctAnswer: null, acceptedAnswers: [], explanation: "Comparer à C2, c'est mettre en relation des bénéfices et des coûts distribués entre des groupes différents, puis faire émerger un critère de décision.", targetLanguageFeature: "comparaison guidée d'intérêts et de critères", tags: ["comparison", "development", "equity"], selfCheck: ["Je distingue le bénéfice pour les usagers de l'effet possible sur les salariés.", "Je nomme un critère de décision plus précis qu'un simple pour ou contre.", "Je propose une condition qui permettrait d'examiner les deux préoccupations ensemble."] },
      { subSkill: "guided-comparison-of-criteria-alternative", prompt: "Deux documents discutent de la limitation des navires de croisière dans un port : l'un valorise la réduction de la pollution et de la congestion ; l'autre met en avant les revenus liés au tourisme et les emplois locaux.", instructions: "Rédigez 4 ou 5 phrases : mettez les points de vue en regard, distinguez effets immédiats et effets durables, puis formulez l'enjeu qui devrait guider une décision proportionnée.", options: [], correctAnswer: null, acceptedAnswers: [], explanation: "Le C2 articule des échelles de temps et des publics distincts au lieu de mettre en concurrence abstraite l'environnement et l'économie.", targetLanguageFeature: "comparaison d'effets temporels et territoriaux", tags: ["comparison", "development", "time", "variant"], selfCheck: ["Je restitue les effets recherchés par chaque source avec précision.", "Je distingue au moins un effet immédiat d'une conséquence durable.", "Je formule l'enjeu de décision sans annoncer ma conclusion comme évidente."] },
    ],
    [
      { subSkill: "independent-comparison-with-decision-axis", prompt: "Deux sources débattent de la création de zones sans écrans dans les lieux publics. La première y voit une manière de préserver des espaces de repos et de sociabilité. La seconde estime qu'une telle mesure risque de stigmatiser des usages légitimes, notamment pour les personnes qui dépendent de leur téléphone pour travailler ou s'orienter.", instructions: "Rédigez 110 à 130 mots sans encore prendre position. Comparez les logiques des sources, identifiez l'axe de décision qui les sépare et proposez un ou deux critères permettant d'évaluer une règle proportionnée.", options: [], correctAnswer: null, acceptedAnswers: [], explanation: "La production C2 compare des finalités et des effets sur des publics précis, puis construit un cadre de décision sans dissimuler le coût d'une option.", targetLanguageFeature: "comparaison autonome avec critères de proportionnalité", tags: ["comparison", "production", "criteria", "public-space"], selfCheck: ["Je reformule le bénéfice et le risque sans les réduire à des slogans.", "Je précise quel public ou quel usage rend le conflit concret.", "Je propose des critères qui pourraient limiter une règle au lieu de la généraliser sans condition."] },
      { subSkill: "independent-comparison-with-decision-axis-alternative", prompt: "Deux documents discutent de la construction de résidences étudiantes sur un terrain proche d'un parc. Le premier insiste sur la pénurie de logements abordables ; le second souligne la fonction du parc pour la fraîcheur, la biodiversité et les habitants du quartier.", instructions: "Rédigez 110 à 130 mots, sans donner votre avis. Mettez les raisonnements en regard et indiquez les critères qui permettraient de comparer des besoins dont les effets ne se situent pas à la même échelle de temps.", options: [], correctAnswer: null, acceptedAnswers: [], explanation: "Une comparaison C2 donne une place égale à des intérêts non directement comparables et explicite ce qui rendrait leur arbitrage justifiable.", targetLanguageFeature: "comparaison autonome de biens collectifs concurrents", tags: ["comparison", "production", "time", "environment", "variant"], selfCheck: ["Je présente les deux besoins sans qualifier l'un d'évidemment secondaire.", "Je distingue les effets immédiats du logement et les fonctions durables du parc.", "Je formule des critères qui rendent l'arbitrage discutable et non simplement intuitif."] },
    ],
  ]),
];
