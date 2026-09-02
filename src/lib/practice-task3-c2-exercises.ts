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
];
