import { GuideProfile, TaskType } from "@prisma/client";
import type { SeedTopic } from "@/lib/seed-topic-sync";

// Increment this integer whenever STARTER_TOPICS changes. It is a monotonic
// deployment-order fence, not a content hash: a later bank must have a higher
// version so a delayed older deployment can never retire it back to old text.
export const STARTER_TOPIC_BANK_VERSION = 1;

// The app-managed OFFICIAL_EXAM starter bank, shared between the manual seed
// entrypoint (scripts/seed-topics.ts, `npm run db:seed`) and the
// production-deploy seed wrapper (scripts/deploy-seed-topics.ts) so the two
// never drift out of sync with each other.
export const STARTER_TOPICS: SeedTopic[] = [
  // Tâche 1 — décrire, raconter (60-120 mots)
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Raconter son week-end",
    prompt: "Écrivez un message à un ami pour lui raconter votre dernier week-end.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Décrire sa ville natale",
    prompt: "Décrivez votre ville natale à un correspondant qui ne la connaît pas.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.FORMAL_PROFESSIONAL_MESSAGE,
    title: "Un souvenir de vacances",
    prompt: "Racontez un souvenir de vacances mémorable à un collègue.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Inviter un ami à une fête",
    prompt: "Écrivez un courriel à un ami pour l'inviter à une fête.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Décrire sa routine quotidienne",
    prompt: "Décrivez votre routine quotidienne à un nouvel ami rencontré en ligne.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Annoncer un déménagement",
    prompt: "Écrivez un message à un ami pour lui annoncer votre déménagement dans une nouvelle ville.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.FORMAL_PROFESSIONAL_MESSAGE,
    title: "Remercier un collègue",
    prompt: "Écrivez un courriel à un collègue pour le remercier de son aide sur un projet récent.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Décrire un cours suivi",
    prompt: "Décrivez à un ami un cours que vous avez suivi récemment et ce que vous en avez retenu.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Proposer une activité sportive",
    prompt: "Écrivez un message à un ami pour lui proposer de pratiquer un sport ensemble.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Raconter une découverte culinaire",
    prompt: "Racontez à un proche une découverte culinaire que vous avez faite récemment.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Demander des nouvelles",
    prompt: "Écrivez un message à un ancien camarade de classe pour prendre de ses nouvelles et raconter les vôtres.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Féliciter un ami pour son nouvel emploi",
    prompt:
      "Écrivez un message à un ami pour le féliciter de son nouvel emploi et lui demander comment se passent ses débuts.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "S'excuser pour un rendez-vous manqué",
    prompt:
      "Écrivez un message à un ami pour vous excuser d'avoir manqué votre rendez-vous et lui proposer un autre moment.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Décrire son logement",
    prompt:
      "Écrivez un message à un ami qui doit bientôt vous rendre visite pour lui décrire votre logement et son environnement.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Raconter une soirée au restaurant",
    prompt:
      "Écrivez un message à un ami pour lui raconter une soirée au restaurant qui s'est particulièrement bien (ou mal) passée.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.FORMAL_PROFESSIONAL_MESSAGE,
    title: "Présenter son métier",
    prompt:
      "Écrivez un courriel à un correspondant étranger pour lui présenter votre métier et décrire une journée de travail habituelle.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Décrire une fête traditionnelle",
    prompt:
      "Écrivez un message à un ami étranger pour lui décrire une fête traditionnelle de votre pays et la façon dont vous la célébrez.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Demander un conseil pour un cadeau",
    prompt:
      "Écrivez un message à un ami pour lui demander conseil sur un cadeau d'anniversaire que vous voulez offrir à un proche.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Raconter un imprévu pendant un voyage",
    prompt:
      "Écrivez un message à un ami pour lui raconter un imprévu qui vous est arrivé pendant un voyage et comment vous l'avez résolu.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.FORMAL_PROFESSIONAL_MESSAGE,
    title: "Signaler un bruit à un voisin",
    prompt:
      "Écrivez un message à votre voisin pour lui signaler poliment que le bruit le soir vous gêne et lui proposer une solution.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.FORMAL_PROFESSIONAL_MESSAGE,
    title: "Prévenir un collègue d'un retard",
    prompt:
      "Écrivez un courriel à un collègue pour le prévenir que vous arriverez en retard à la réunion et lui expliquer pourquoi.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.FORMAL_PROFESSIONAL_MESSAGE,
    title: "Demander des informations sur une formation",
    prompt:
      "Écrivez un courriel à un centre de formation pour demander des informations sur un cours de français : horaires, durée et prix.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Décrire son meilleur ami",
    prompt:
      "Écrivez un message à un correspondant pour lui décrire votre meilleur ami ou votre meilleure amie : son caractère et ce que vous faites ensemble.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Raconter sa première journée de travail",
    prompt:
      "Écrivez un message à un ami pour lui raconter votre première journée dans votre nouveau travail ou votre nouvelle école.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Proposer une sortie culturelle",
    prompt:
      "Écrivez un message à des amis pour leur proposer d'aller ensemble voir une exposition ou un spectacle ce week-end.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Parler d'un film vu récemment",
    prompt:
      "Écrivez un message à un ami pour lui parler d'un film que vous avez vu récemment et lui dire pourquoi vous le lui conseillez.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Annoncer une bonne nouvelle",
    prompt:
      "Écrivez un message à votre famille pour leur annoncer une bonne nouvelle, comme la réussite d'un examen, et leur raconter comment vous l'avez appris.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.FORMAL_PROFESSIONAL_MESSAGE,
    title: "Expliquer une absence à un professeur",
    prompt:
      "Écrivez un courriel à votre professeur pour lui expliquer votre absence au dernier cours et lui demander comment rattraper le travail.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Décrire son quartier à un futur colocataire",
    prompt:
      "Écrivez un message à un futur colocataire pour lui décrire votre quartier : les commerces, les transports et l'ambiance.",
  },
  {
    taskType: TaskType.TASK_1,
    guideContext: GuideProfile.INFORMAL_PERSONAL_MESSAGE,
    title: "Remercier un hôte après un séjour",
    prompt:
      "Écrivez un message à des amis qui vous ont accueilli quelques jours pour les remercier et leur raconter ce que vous avez préféré.",
  },

  // Tâche 2 — article, courrier ou note à plusieurs destinataires : raconter
  // une expérience ou un événement, puis le commenter selon un objectif
  // (convaincre, informer, conseiller...), et non un simple essai d'opinion.
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Réseaux sociaux : lien ou distance",
    prompt:
      "Rédigez un article pour le blog de votre association de quartier : racontez une expérience personnelle liée aux réseaux sociaux et donnez votre avis sur leur effet sur les relations humaines, afin de convaincre vos lecteurs de votre point de vue.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Le télétravail",
    prompt:
      "Rédigez un article pour le journal interne de votre entreprise : racontez votre expérience du télétravail et donnez votre avis sur ses bénéfices ou ses limites, afin d'informer vos collègues.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_LETTER,
    title: "Cours en ligne vs en classe",
    prompt:
      "Rédigez un courrier destiné aux lecteurs du journal de votre université : racontez votre expérience des cours en ligne et exprimez votre avis sur leur efficacité par rapport aux cours en classe, afin de nourrir le débat.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Téléphones portables à l'école",
    prompt:
      "Rédigez un article pour le journal de votre ancien lycée : racontez un événement lié à l'usage des téléphones portables à l'école et donnez votre avis sur leur interdiction, afin de convaincre vos lecteurs.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Ville ou campagne",
    prompt:
      "Rédigez une note pour un magazine de style de vie : racontez votre expérience d'un déménagement, en ville ou à la campagne, et donnez votre avis sur ce mode de vie, afin d'inspirer vos lecteurs.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Argent de poche",
    prompt:
      "Rédigez un article pour le magazine d'une association de parents d'élèves : racontez une expérience liée à l'argent de poche et donnez votre avis sur son utilité pour les enfants, afin d'informer les autres parents.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_LETTER,
    title: "Animaux domestiques en appartement",
    prompt:
      "Rédigez un courrier destiné aux lecteurs d'un magazine sur les animaux : racontez votre expérience d'un animal domestique en appartement et donnez votre avis sur cette pratique, afin de conseiller vos lecteurs.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Uniforme scolaire",
    prompt:
      "Rédigez un article pour le journal de votre ancien établissement : racontez une expérience liée au port de l'uniforme scolaire et donnez votre avis sur son adoption, afin de convaincre vos lecteurs.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Vacances entre amis ou en famille",
    prompt:
      "Rédigez une note pour le bulletin de votre club de loisirs : racontez un séjour de vacances, entre amis ou en famille, et donnez votre avis sur ce type de vacances, afin de partager votre expérience avec les lecteurs.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Livres papier ou numériques",
    prompt:
      "Rédigez un article pour le magazine d'un club de lecture : racontez votre expérience de lecture, papier ou numérique, et donnez votre avis sur l'avenir du livre, afin d'informer les autres lecteurs.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_LETTER,
    title: "Sport individuel ou collectif",
    prompt:
      "Rédigez un courrier destiné aux lecteurs du journal de votre club sportif : racontez une expérience sportive, individuelle ou collective, et donnez votre avis sur ses bienfaits, afin d'encourager vos lecteurs à pratiquer.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Le bénévolat",
    prompt:
      "Rédigez un article pour le bulletin de votre quartier : racontez une expérience de bénévolat et donnez votre avis sur l'engagement associatif, afin d'encourager les habitants à s'investir.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_LETTER,
    title: "Apprendre une langue étrangère",
    prompt:
      "Rédigez un courrier destiné aux lecteurs d'un magazine d'étudiants : racontez comment vous avez appris une langue étrangère et donnez votre avis sur les meilleures méthodes, afin de conseiller vos lecteurs.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Les jeux vidéo",
    prompt:
      "Rédigez un article pour le journal de votre lycée : racontez une expérience liée aux jeux vidéo et donnez votre avis sur leur place dans la vie des jeunes, afin d'informer les parents et les élèves.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Le vélo en ville",
    prompt:
      "Rédigez un article pour le site internet de votre mairie : racontez une expérience de déplacement à vélo et donnez votre avis sur son usage en ville, afin de convaincre vos lecteurs de l'adopter.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_LETTER,
    title: "Cuisiner à la maison ou manger au restaurant",
    prompt:
      "Rédigez un courrier destiné aux lecteurs d'un magazine de cuisine : racontez un repas préparé à la maison ou pris au restaurant et donnez votre avis sur ces deux façons de manger, afin de conseiller vos lecteurs.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Travailler pendant ses études",
    prompt:
      "Rédigez un article pour le journal de votre université : racontez une expérience de travail pendant vos études et donnez votre avis sur cette pratique, afin d'aider les étudiants qui hésitent.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Vivre en colocation",
    prompt:
      "Rédigez un article pour un site d'annonces pour étudiants : racontez une expérience de colocation et donnez votre avis sur ce mode de vie, afin d'informer les futurs colocataires.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_LETTER,
    title: "Un échange universitaire à l'étranger",
    prompt:
      "Rédigez un courrier destiné aux étudiants de votre établissement : racontez un séjour d'études ou de voyage à l'étranger et donnez votre avis sur l'intérêt de ces expériences, afin de les encourager à partir.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "S'informer par la presse ou les réseaux sociaux",
    prompt:
      "Rédigez un article pour le magazine de votre association : racontez comment vous vous informez au quotidien et donnez votre avis sur la fiabilité des sources, afin de conseiller vos lecteurs.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Le recyclage au quotidien",
    prompt:
      "Rédigez une note pour le bulletin de votre immeuble : racontez une expérience de tri ou de recyclage et donnez votre avis sur l'importance de ces gestes, afin de motiver vos voisins.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_LETTER,
    title: "Les fêtes de famille",
    prompt:
      "Rédigez un courrier destiné aux lecteurs d'un magazine familial : racontez une fête de famille dont vous gardez un bon souvenir et donnez votre avis sur l'importance de ces rencontres, afin de partager votre expérience.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Salle de sport ou sport en plein air",
    prompt:
      "Rédigez un article pour le journal de votre commune : racontez une expérience de sport en salle ou en plein air et donnez votre avis sur ces deux pratiques, afin d'aider vos lecteurs à choisir.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_LETTER,
    title: "Les achats en ligne",
    prompt:
      "Rédigez un courrier destiné aux lecteurs d'un magazine de consommateurs : racontez une expérience d'achat en ligne et donnez votre avis sur cette façon de consommer, afin de mettre vos lecteurs en garde ou de les rassurer.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Le bien-être au travail",
    prompt:
      "Rédigez un article pour le journal interne de votre entreprise : racontez une expérience qui a amélioré votre bien-être au travail et donnez votre avis sur ce qui compte le plus, afin d'inspirer vos collègues.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_LETTER,
    title: "Aller au cinéma ou regarder un film chez soi",
    prompt:
      "Rédigez un courrier destiné aux lecteurs du journal de votre ville : racontez une soirée cinéma, en salle ou à la maison, et donnez votre avis sur ces deux façons de voir un film, afin de partager votre préférence.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Les enfants et les écrans",
    prompt:
      "Rédigez un article pour le bulletin d'une association de parents : racontez une expérience liée à l'usage des écrans par un enfant et donnez votre avis sur les règles à adopter, afin de conseiller les autres parents.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Jardiner en ville",
    prompt:
      "Rédigez un article pour le journal de votre quartier : racontez une expérience de jardinage en ville, par exemple dans un jardin partagé, et donnez votre avis sur son intérêt, afin d'inciter les habitants à participer.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_LETTER,
    title: "Changer de métier",
    prompt:
      "Rédigez un courrier destiné aux lecteurs d'un magazine sur l'emploi : racontez une expérience de changement de métier, la vôtre ou celle d'un proche, et donnez votre avis sur cette décision, afin de conseiller vos lecteurs.",
  },
  {
    taskType: TaskType.TASK_2,
    guideContext: GuideProfile.PUBLIC_ARTICLE_OR_NOTE,
    title: "Vivre loin de sa famille",
    prompt:
      "Rédigez un article pour le site d'une association d'étrangers installés dans votre pays : racontez comment vous gardez le contact avec votre famille et donnez votre avis sur la distance, afin d'aider les nouveaux arrivants.",
  },

  // Tâche 3 — analyser et argumenter (120-180 mots). The prompt follows the
  // same "title + Document 1 + Document 2" structure the app parses out of
  // the real exam format, so a
  // seeded topic reads exactly like an authentic one.
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "L'intelligence artificielle et l'emploi",
    prompt:
      "L'intelligence artificielle et l'emploi\n\n" +
      "Document 1 :\nL'intelligence artificielle progresse à grande vitesse et automatise déjà des tâches répétitives dans l'industrie, la banque ou le service client. De nombreuses entreprises y voient un moyen de gagner du temps et de réduire leurs coûts. Mais ces gains se font souvent au détriment des emplois peu qualifiés, et les travailleurs concernés ont du mal à se reconvertir. À terme, de nombreux postes pourraient disparaître plus vite que de nouveaux métiers n'apparaissent.\n\n" +
      "Document 2 :\nChaque révolution technologique a détruit certains emplois, mais elle en a aussi créé de nouveaux. L'intelligence artificielle libère les salariés des tâches les plus ennuyeuses et leur permet de se consacrer à des activités plus créatives et plus utiles. Pour que cette évolution profite à tous, il faut toutefois investir dans la formation, afin que chacun puisse acquérir les compétences recherchées par les entreprises de demain.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Le tourisme de masse",
    prompt:
      "Le tourisme de masse\n\n" +
      "Document 1 :\nChaque été, des millions de visiteurs envahissent les villes historiques et les sites naturels les plus célèbres. Cet afflux dégrade le patrimoine, fait grimper les loyers et le prix des commerces de première nécessité, et pousse les habitants à quitter leur quartier. Certaines villes songent déjà à limiter le nombre de touristes ou à leur faire payer l'entrée afin de préserver leur qualité de vie.\n\n" +
      "Document 2 :\nLe tourisme représente une source de revenus essentielle pour de nombreuses régions : il fait vivre les hôtels, les restaurants et les guides, et crée des emplois locaux. Plutôt que d'en limiter l'accès, il serait plus juste de mieux répartir les visiteurs dans l'année et sur le territoire. Cela suppose d'investir dans les transports et d'encourager des formes de voyage plus respectueuses des habitants et de l'environnement.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Diplôme ou expérience",
    prompt:
      "Diplôme ou expérience\n\n" +
      "Document 1 :\nPour de nombreux employeurs, le diplôme reste la meilleure garantie des compétences d'un candidat. Il atteste d'une formation solide, d'une capacité à travailler sur la durée et d'un niveau de connaissances comparable d'un candidat à l'autre. Sans diplôme, il serait difficile de choisir entre des profils très différents, et le recrutement deviendrait bien plus arbitraire.\n\n" +
      "Document 2 :\nBeaucoup de professionnels ont appris leur métier sur le terrain, et leur expérience vaut parfois mieux qu'un titre universitaire. Un diplôme montre ce que l'on a appris, mais pas ce que l'on sait faire au quotidien : gérer un imprévu, travailler en équipe, répondre à un client. Les entreprises gagneraient à valoriser davantage les parcours variés et à donner leur chance à des candidats qui n'ont pas fait d'études longues.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Voitures électriques ou à essence",
    prompt:
      "Voitures électriques ou à essence\n\n" +
      "Document 1 :\nFace au réchauffement climatique, plusieurs pays prévoient d'interdire la vente des voitures à essence dans les prochaines années. Les voitures électriques n'émettent pas de gaz polluants en roulant, elles sont plus silencieuses et leur entretien coûte moins cher. Leur généralisation permettrait d'améliorer la qualité de l'air en ville et de réduire notre dépendance au pétrole.\n\n" +
      "Document 2 :\nLes voitures électriques restent chères et ne sont pas accessibles à tous les foyers. Leur autonomie limitée et le manque de bornes de recharge, surtout hors des grandes villes, compliquent aussi leur usage. De plus, la fabrication des batteries consomme beaucoup de ressources. Avant de supprimer les voitures à essence, il faudrait donc s'assurer que la transition soit réaliste et équitable pour tous.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "La mondialisation",
    prompt:
      "La mondialisation\n\n" +
      "Document 1 :\nLa mondialisation a rapproché les pays : les marchandises, les idées et les personnes circulent plus facilement que jamais. Les consommateurs profitent de produits moins chers et plus variés, tandis que de nombreux pays émergents ont pu se développer grâce aux échanges internationaux. Voyager, étudier ou travailler à l'étranger est devenu accessible à un très grand nombre de personnes.\n\n" +
      "Document 2 :\nSi la mondialisation a enrichi certains pays, elle a aussi fragilisé de nombreux secteurs locaux. Des usines ont fermé parce que la production a été déplacée là où la main-d'œuvre coûte moins cher, laissant des régions entières sans emplois. Elle favorise également l'uniformisation des cultures et augmente la pollution due au transport des marchandises. Certains plaident donc pour davantage de production locale.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Le télétravail généralisé",
    prompt:
      "Le télétravail généralisé\n\n" +
      "Document 1 :\nDepuis quelques années, de nombreuses entreprises permettent à leurs salariés de travailler à distance. Le télétravail fait gagner un temps précieux, car on évite les trajets, et il offre une meilleure organisation entre vie professionnelle et vie privée. Il réduit aussi la circulation et la pollution aux heures de pointe. Beaucoup de salariés se disent plus concentrés et plus productifs chez eux.\n\n" +
      "Document 2 :\nTravailler à la maison présente aussi des inconvénients. Les échanges entre collègues sont moins spontanés, ce qui peut freiner la cohésion d'une équipe et rendre plus difficile l'intégration des nouveaux arrivants. Certains salariés se sentent isolés ou n'arrivent plus à séparer leur travail de leur vie personnelle. Un équilibre entre jours à distance et jours au bureau pourrait être la meilleure solution.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les réseaux sociaux et les adolescents",
    prompt:
      "Les réseaux sociaux et les adolescents\n\n" +
      "Document 1 :\nLes adolescents passent de plus en plus de temps sur les réseaux sociaux. Un usage intensif est associé à des troubles du sommeil, à une baisse de la concentration en classe et à une comparaison permanente avec la vie des autres, qui peut fragiliser l'estime de soi. Face à ces risques, certains pays envisagent de fixer un âge minimum pour s'inscrire.\n\n" +
      "Document 2 :\nLes réseaux sociaux permettent aux adolescents de rester en contact avec leurs amis et leur famille, de découvrir des centres d'intérêt communs et de s'exprimer dans des communautés bienveillantes. Pour certains jeunes isolés, ils représentent un véritable soutien. Plutôt que de les interdire, il serait préférable d'apprendre aux jeunes à les utiliser de façon raisonnée, avec l'aide des parents et de l'école.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "La semaine de quatre jours",
    prompt:
      "La semaine de quatre jours\n\n" +
      "Document 1 :\nPlusieurs entreprises ont testé la semaine de quatre jours sans baisse de salaire. Les employés disent être moins fatigués, plus motivés et plus disponibles pour leur famille et leurs loisirs. Les absences pour maladie diminuent, et les entreprises constatent souvent que la productivité se maintient, voire augmente. Ce modèle pourrait devenir un moyen d'attirer et de garder les talents.\n\n" +
      "Document 2 :\nConcentrer le même nombre d'heures sur quatre jours allonge les journées de travail et peut augmenter la fatigue et la pression au quotidien. Certains secteurs, comme les hôpitaux, les commerces ou les transports, doivent rester ouverts tous les jours et auraient du mal à s'organiser. La semaine de quatre jours ne conviendrait donc pas à tous les métiers et risquerait de créer des inégalités entre les salariés.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "L'agriculture biologique",
    prompt:
      "L'agriculture biologique\n\n" +
      "Document 1 :\nL'agriculture biologique protège les sols et l'eau, car elle n'utilise pas de pesticides ni d'engrais chimiques. Elle favorise la biodiversité et réduit l'exposition des consommateurs et des agriculteurs aux produits de synthèse. De plus en plus de personnes souhaitent manger des produits cultivés dans le respect de l'environnement, et les ventes de produits biologiques ne cessent d'augmenter.\n\n" +
      "Document 2 :\nLes produits biologiques coûtent généralement plus cher, ce qui les rend inaccessibles pour une partie de la population. Les rendements de l'agriculture biologique sont aussi plus faibles : pour produire la même quantité d'aliments, il faut davantage de terres. Certains spécialistes estiment donc qu'elle ne peut pas, à elle seule, nourrir toute la planète, et qu'il faut aussi améliorer les méthodes d'agriculture traditionnelles.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les transports en commun gratuits",
    prompt:
      "Les transports en commun gratuits\n\n" +
      "Document 1 :\nPlusieurs villes ont décidé de rendre les transports en commun gratuits pour tous leurs habitants. Cette mesure encourage les gens à laisser leur voiture au garage, ce qui réduit la pollution et les embouteillages. Elle aide aussi les ménages modestes, pour qui le prix des billets pèse sur le budget. Les villes qui l'ont adoptée constatent souvent une hausse de la fréquentation des bus et des tramways.\n\n" +
      "Document 2 :\nRendre les transports gratuits prive les réseaux d'une ressource importante : la vente des billets finance l'entretien des véhicules et le développement des lignes. Sans cet argent, la collectivité doit augmenter les impôts ou réduire la qualité du service. Par ailleurs, la gratuité attire parfois des personnes qui marchaient ou roulaient à vélo, plutôt que des automobilistes. Il vaudrait mieux proposer des tarifs réduits pour ceux qui en ont besoin.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "L'apprentissage à distance",
    prompt:
      "L'apprentissage à distance\n\n" +
      "Document 1 :\nLes cours à distance permettent à chacun d'apprendre à son rythme et depuis n'importe quel endroit. Ils offrent une grande flexibilité aux personnes qui travaillent ou qui habitent loin des universités, et donnent accès à des formations autrefois hors de portée. Ils réduisent aussi les frais de transport et de logement, ce qui les rend plus accessibles à de nombreux étudiants.\n\n" +
      "Document 2 :\nÉtudier à distance demande beaucoup de motivation et d'autonomie. Sans contact direct avec les enseignants et les autres étudiants, il est plus facile de se décourager et de prendre du retard. Certaines matières, qui demandent des travaux pratiques ou des échanges en groupe, sont difficiles à enseigner à distance. Pour beaucoup d'étudiants, les cours en présentiel restent un accompagnement essentiel à leur réussite.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les jeux vidéo et les jeunes",
    prompt:
      "Les jeux vidéo et les jeunes\n\n" +
      "Document 1 :\nLes jeux vidéo ne sont pas de simples divertissements. Beaucoup développent la concentration, la stratégie et la capacité à résoudre des problèmes. Les jeux en ligne permettent aussi aux jeunes de jouer en équipe, de se faire des amis et de pratiquer des langues étrangères. Pratiqués avec modération, ils font aujourd'hui partie de la culture des jeunes et peuvent même être utilisés à l'école.\n\n" +
      "Document 2 :\nPasser de longues heures devant un écran n'est pas sans conséquences. Les jeunes qui jouent trop tard dorment moins bien, ont plus de mal à se concentrer en classe et consacrent moins de temps au sport et aux amis. Certains jeux, conçus pour que l'on ne puisse plus s'arrêter, peuvent même provoquer une véritable dépendance. Les parents ont donc un rôle important à jouer pour fixer des limites.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "L'énergie nucléaire",
    prompt:
      "L'énergie nucléaire\n\n" +
      "Document 1 :\nLes centrales nucléaires produisent de grandes quantités d'électricité sans émettre de gaz à effet de serre. Dans un contexte de réchauffement climatique, cette énergie constante, qui ne dépend ni du soleil ni du vent, paraît essentielle pour garantir l'approvisionnement des pays. Plusieurs gouvernements envisagent donc de construire de nouveaux réacteurs afin de réduire leur dépendance au pétrole et au gaz.\n\n" +
      "Document 2 :\nLe nucléaire pose de sérieuses questions. Les déchets radioactifs restent dangereux pendant des milliers d'années et personne ne sait encore comment les stocker en toute sécurité à long terme. La construction d'une centrale coûte très cher et prend de nombreuses années, tandis que le risque d'accident, même rare, aurait des conséquences très graves. Beaucoup préfèrent donc investir dans les énergies renouvelables.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les devoirs à la maison",
    prompt:
      "Les devoirs à la maison\n\n" +
      "Document 1 :\nFaire ses devoirs à la maison permet aux élèves de revoir ce qu'ils ont appris en classe et de mieux le retenir. Cela les aide aussi à devenir autonomes, à s'organiser et à prendre de bonnes habitudes de travail. Les parents peuvent ainsi suivre les progrès de leurs enfants. Pour beaucoup d'enseignants, c'est un complément indispensable à l'école, qui manque souvent de temps pour tout approfondir.\n\n" +
      "Document 2 :\nAprès une longue journée d'école, les devoirs fatiguent les enfants et réduisent leur temps de jeu, de sport et de repos. Ils creusent aussi les inégalités : un élève dont les parents peuvent l'aider progresse plus facilement qu'un élève qui travaille seul. Certains pays ont donc décidé de les limiter, voire de les supprimer, et de faire travailler les élèves en classe, avec l'aide de leurs enseignants.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Réduire sa consommation de viande",
    prompt:
      "Réduire sa consommation de viande\n\n" +
      "Document 1 :\nManger moins de viande est bon pour la santé, car une alimentation riche en légumes, en céréales et en légumineuses réduit certains risques de maladie. L'élevage est aussi responsable d'une part importante des émissions de gaz à effet de serre et consomme beaucoup d'eau et de terres. De plus en plus de restaurants et de cantines proposent donc des repas végétariens, et beaucoup de consommateurs veulent changer leurs habitudes.\n\n" +
      "Document 2 :\nLa viande apporte des protéines et des nutriments importants, et elle occupe une place centrale dans de nombreuses traditions culinaires. Inciter chacun à en manger moins pourrait fragiliser des milliers d'éleveurs, dont certains travaillent déjà avec de faibles revenus. Il faudrait donc accompagner les agriculteurs et laisser à chacun le choix de son alimentation, plutôt que de lui imposer un changement.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Interdire les voitures en centre-ville",
    prompt:
      "Interdire les voitures en centre-ville\n\n" +
      "Document 1 :\nDans plusieurs villes, les centres sont devenus bruyants, pollués et encombrés. Interdire les voitures permettrait de rendre l'espace aux piétons et aux cyclistes, de réduire la pollution et d'améliorer la sécurité des habitants. Les rues deviendraient plus agréables, et les terrasses, les marchés et les activités culturelles pourraient s'y développer plus facilement. Beaucoup de personnes se disent prêtes à changer leurs habitudes si les transports en commun sont efficaces.\n\n" +
      "Document 2 :\nFermer le centre-ville aux voitures pose des difficultés à ceux qui n'ont pas d'autre choix : les personnes âgées, les personnes handicapées ou les habitants qui vivent loin des transports en commun. Les commerçants craignent aussi de perdre des clients qui viennent en voiture faire leurs achats. Pour réussir, une telle mesure doit s'accompagner de parkings à l'extérieur, de transports fréquents et d'autorisations pour les livraisons et les services d'urgence.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Achats en ligne ou commerces de proximité",
    prompt:
      "Achats en ligne ou commerces de proximité\n\n" +
      "Document 1 :\nAcheter sur internet est devenu un geste courant. On compare facilement les prix, on gagne du temps en évitant les déplacements et on trouve des produits qu'aucun magasin proche ne propose. La livraison à domicile est particulièrement pratique pour les personnes qui travaillent beaucoup ou qui ont des difficultés à se déplacer. Le commerce en ligne offre ainsi un choix et une commodité que les magasins ont du mal à égaler.\n\n" +
      "Document 2 :\nLes commerces de proximité animent les quartiers, créent des emplois locaux et permettent aux habitants de se rencontrer. Le commerçant conseille ses clients et s'adapte à leurs besoins, ce qu'un site internet ne peut pas toujours faire. Quand les petits magasins ferment, les rues se vident et les personnes âgées perdent un service essentiel. Acheter près de chez soi est donc aussi un choix qui soutient la vie locale.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Le travail le dimanche",
    prompt:
      "Le travail le dimanche\n\n" +
      "Document 1 :\nAutoriser l'ouverture des commerces le dimanche répond aux besoins de nombreux clients, qui travaillent toute la semaine et n'ont pas d'autre moment pour faire leurs achats. Cette mesure crée aussi des emplois et offre aux étudiants ou aux salariés à temps partiel des revenus supplémentaires, souvent mieux payés. Dans les zones touristiques, l'ouverture le dimanche permet en outre d'accueillir les visiteurs dans de bonnes conditions.\n\n" +
      "Document 2 :\nLe dimanche est, pour beaucoup de familles, le seul jour de repos commun. Obliger des salariés à travailler ce jour-là perturbe leur vie de famille et leur vie sociale, même lorsqu'ils reçoivent une compensation. Les petits commerces ont de plus en plus de mal à rivaliser avec les grandes enseignes, qui peuvent ouvrir plus longtemps et recruter plus facilement. Certains souhaitent donc que le repos dominical reste la règle.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "L'âge de la retraite",
    prompt:
      "L'âge de la retraite\n\n" +
      "Document 1 :\nComme on vit de plus en plus longtemps, les retraités sont chaque année plus nombreux, alors que le nombre d'actifs qui financent les pensions n'augmente pas. Pour garantir le paiement des retraites sans alourdir les charges des plus jeunes, plusieurs pays choisissent de repousser l'âge de départ. Travailler quelques années de plus permet aussi de transmettre son expérience et de rester actif plus longtemps.\n\n" +
      "Document 2 :\nTous les métiers ne se ressemblent pas : travailler à un âge avancé sur un chantier ou dans un hôpital est bien plus éprouvant que dans un bureau. Repousser l'âge de la retraite touche donc plus durement ceux qui exercent des métiers pénibles et qui ont commencé tôt. Certains craignent aussi que les seniors gardent des emplois que les jeunes pourraient occuper, ce qui retarderait leur entrée dans la vie active.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les zoos",
    prompt:
      "Les zoos\n\n" +
      "Document 1 :\nLes zoos jouent un rôle important dans la protection des espèces menacées. Grâce à des programmes de reproduction, certains animaux, qui auraient pu disparaître, ont été sauvés puis réintroduits dans la nature. Les zoos financent aussi des recherches scientifiques et permettent au public, en particulier aux enfants, de découvrir les animaux et de comprendre pourquoi il faut protéger leur milieu de vie.\n\n" +
      "Document 2 :\nEnfermer des animaux sauvages dans des espaces réduits est contraire à leur nature. Beaucoup d'entre eux souffrent de stress et développent des comportements anormaux. De plus, seule une petite partie des animaux nés dans les zoos retourne vivre dans la nature. Pour de nombreux défenseurs des animaux, il vaudrait mieux observer les animaux dans leur milieu naturel, ou grâce à des documentaires, et consacrer l'argent à la protection de leurs habitats.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les tablettes à l'école",
    prompt:
      "Les tablettes à l'école\n\n" +
      "Document 1 :\nDe nombreuses écoles équipent leurs élèves de tablettes. Les outils numériques rendent les cours plus vivants, avec des vidéos, des exercices interactifs et des jeux éducatifs. Chaque élève peut aussi avancer à son rythme, et l'enseignant suit plus facilement ses progrès. Apprendre à se servir de ces outils dès le plus jeune âge prépare par ailleurs les enfants à la vie professionnelle de demain.\n\n" +
      "Document 2 :\nLes écrans distraient les élèves, qui sont souvent tentés d'ouvrir un jeu ou une autre application pendant les cours. Ils fatiguent les yeux et réduisent le temps passé à écrire à la main, ce qui peut affecter l'écriture et la mémoire. Beaucoup d'enseignants estiment que l'école doit d'abord transmettre la lecture, l'écriture et la concentration. Les tablettes pourraient donc être utilisées de façon limitée, comme un complément.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les langues étrangères à l'école primaire",
    prompt:
      "Les langues étrangères à l'école primaire\n\n" +
      "Document 1 :\nLes jeunes enfants apprennent les langues avec une grande facilité : ils imitent naturellement les sons et ne craignent pas de se tromper. Commencer une langue étrangère dès l'école primaire permet donc d'obtenir une meilleure prononciation et une plus grande aisance. Cela ouvre aussi l'esprit des enfants aux autres cultures et leur donne un avantage dans leurs études et leur vie professionnelle.\n\n" +
      "Document 2 :\nLes programmes de l'école primaire sont déjà très chargés. Ajouter une langue étrangère risque de se faire au détriment de la lecture, de l'écriture et du calcul, qui sont les bases de tous les apprentissages. Par ailleurs, tous les établissements n'ont pas des enseignants formés pour enseigner une langue à de jeunes enfants. Il faudrait donc d'abord garantir la qualité de l'enseignement avant de le généraliser.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Le vote obligatoire",
    prompt:
      "Le vote obligatoire\n\n" +
      "Document 1 :\nDans certains pays, voter est une obligation. Cette règle augmente fortement la participation et donne aux élus une légitimité plus forte, car ils représentent l'ensemble des citoyens et pas seulement les plus motivés. Elle encourage aussi chacun à s'informer sur la politique avant le scrutin. Pour ses partisans, voter est un devoir civique, au même titre que payer ses impôts.\n\n" +
      "Document 2 :\nObliger les citoyens à voter porte atteinte à leur liberté : ne pas voter est aussi une manière d'exprimer son désaccord. Un vote imposé risque de multiplier les bulletins blancs ou donnés au hasard, par des personnes qui ne se sentent pas concernées. Plutôt que de contraindre, certains préfèrent chercher les raisons de l'abstention, comme le manque de confiance dans la politique, et rendre le vote plus simple et plus attractif.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "La publicité destinée aux enfants",
    prompt:
      "La publicité destinée aux enfants\n\n" +
      "Document 1 :\nLa publicité destinée aux enfants fait partie de leur environnement quotidien : à la télévision, sur internet ou dans les jeux. Elle finance de nombreux programmes et permet aux enfants de découvrir des produits adaptés à leur âge. Certains estiment que, si elle est encadrée par des règles strictes, elle peut même aider les enfants à apprendre à faire des choix et à devenir des consommateurs avertis.\n\n" +
      "Document 2 :\nLes enfants ne savent pas encore faire la différence entre une information et une publicité. Les exposer à des messages commerciaux les pousse à vouloir tout ce qu'ils voient et à réclamer des produits que leurs parents n'ont pas toujours les moyens d'acheter. Plusieurs pays ont donc interdit les publicités pendant les émissions pour enfants, afin de les protéger et de limiter la surconsommation.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les caméras de surveillance",
    prompt:
      "Les caméras de surveillance\n\n" +
      "Document 1 :\nDe plus en plus de villes installent des caméras de surveillance dans les rues, les gares et les transports. Elles dissuadent les délits, aident la police à retrouver plus vite les coupables et renforcent le sentiment de sécurité des habitants, en particulier le soir. Dans de nombreuses enquêtes, les images des caméras ont permis de résoudre des affaires qui auraient sinon été classées.\n\n" +
      "Document 2 :\nÊtre filmé en permanence dans l'espace public porte atteinte à la vie privée. Les caméras ne règlent pas les causes de la délinquance : elles déplacent parfois les problèmes vers des quartiers non surveillés. Elles coûtent aussi très cher à installer et à entretenir, et les images peuvent être utilisées à d'autres fins que celles prévues. Certains estiment qu'il vaudrait mieux investir dans la prévention et dans les équipes de terrain.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Voyager en avion ou préserver la planète",
    prompt:
      "Voyager en avion ou préserver la planète\n\n" +
      "Document 1 :\nL'avion rapproche les peuples et permet de voyager loin en quelques heures, pour le travail, les études ou les vacances. Le transport aérien soutient le tourisme et l'économie de nombreux pays, et rend possibles des rencontres entre des familles séparées par des milliers de kilomètres. Les compagnies aériennes affirment aussi travailler sur des avions moins polluants et sur de nouveaux carburants.\n\n" +
      "Document 2 :\nL'avion est l'un des moyens de transport les plus polluants : un seul vol long courrier peut émettre autant de gaz à effet de serre que plusieurs mois d'utilisation d'une voiture. Alors que le réchauffement climatique s'accélère, certains plaident pour limiter les vols, notamment ceux qui pourraient être remplacés par le train. Chacun peut aussi choisir des vacances plus proches de chez lui et voyager moins souvent mais plus longtemps.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Le service civique obligatoire",
    prompt:
      "Le service civique obligatoire\n\n" +
      "Document 1 :\nUn service civique obligatoire permettrait à tous les jeunes, quelle que soit leur origine, de s'engager quelques mois au service de la société, par exemple auprès d'associations, de personnes âgées ou de l'environnement. Ils rencontreraient des personnes d'horizons différents, apprendraient à travailler en équipe et acquerraient une première expérience. Cette mesure renforcerait aussi le sentiment d'appartenir à une même communauté.\n\n" +
      "Document 2 :\nImposer un service civique retarde l'entrée des jeunes dans les études ou dans la vie active, ce qui peut poser des problèmes à ceux qui doivent travailler pour vivre. Un engagement contraint risque de ne développer ni la motivation ni le sens civique, et les associations n'ont pas toujours les moyens d'accueillir et d'encadrer un grand nombre de jeunes. Il serait peut-être préférable d'encourager le service civique volontaire en le rendant plus attractif.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Le paiement sans espèces",
    prompt:
      "Le paiement sans espèces\n\n" +
      "Document 1 :\nLe paiement par carte ou par téléphone est rapide, pratique et sécurisé : on n'a plus besoin de compter sa monnaie ni de retirer de l'argent. Il limite aussi les risques de vol et la circulation d'argent illégal, et permet aux commerçants de ne plus gérer de grosses sommes en caisse. Dans certains pays, une grande partie des achats se fait déjà sans espèces, et beaucoup de commerces n'acceptent plus que la carte.\n\n" +
      "Document 2 :\nSupprimer les espèces pénalise ceux qui ne possèdent pas de carte ou qui ne sont pas à l'aise avec les outils numériques, comme certaines personnes âgées. Avec le paiement électronique, les banques et les entreprises peuvent aussi suivre toutes nos dépenses, ce qui pose un problème de vie privée. En cas de panne informatique ou de coupure de courant, on ne peut plus rien acheter. Il faut donc garder la possibilité de payer en espèces.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les frais de scolarité à l'université",
    prompt:
      "Les frais de scolarité à l'université\n\n" +
      "Document 1 :\nRendre l'université gratuite garantit l'égalité des chances : chacun peut étudier selon son talent et sa motivation, et non selon les moyens de sa famille. Les frais de scolarité élevés obligent beaucoup d'étudiants à travailler en parallèle, ou à s'endetter pendant des années, ce qui nuit à leurs résultats. Pour de nombreux pays, former des jeunes diplômés est un investissement qui profite à toute la société.\n\n" +
      "Document 2 :\nLe fonctionnement des universités coûte cher et l'argent public n'est pas illimité. Faire payer les étudiants permettrait de financer des formations de meilleure qualité, avec de meilleurs équipements et davantage d'enseignants. Cela pourrait aussi rendre les étudiants plus responsables de leur parcours. Pour que cette solution soit juste, il faudrait cependant proposer des bourses à ceux qui n'en ont pas les moyens.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les médias sociaux et l'information",
    prompt:
      "Les médias sociaux et l'information\n\n" +
      "Document 1 :\nLes réseaux sociaux permettent à chacun de s'informer en quelques secondes sur ce qui se passe dans le monde, parfois avant même les grands médias. Ils donnent la parole à des témoins, à des associations et à des citoyens qui ne trouveraient pas de place ailleurs. Chacun peut ainsi comparer plusieurs points de vue et s'exprimer librement sur les sujets qui le concernent.\n\n" +
      "Document 2 :\nSur les réseaux sociaux, les fausses informations circulent plus vite que les vraies. Les algorithmes proposent à chacun des contenus qui lui ressemblent, ce qui l'enferme dans une bulle où il ne voit que les opinions qu'il partage déjà. Il est également difficile de vérifier qui est à l'origine d'une information. Pour bien s'informer, il vaut mieux croiser les sources et se tourner aussi vers des médias qui vérifient leurs informations.",
  },
];
