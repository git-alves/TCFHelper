import { GuideProfile, TaskType } from "@prisma/client";
import type { SeedTopic } from "@/lib/seed-topic-sync";

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
  // the real recent-exam source (see src/lib/recent-exam-topics.ts), so a
  // seeded topic reads exactly like an authentic one.
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "L'intelligence artificielle et l'emploi",
    prompt:
      "L'intelligence artificielle et l'emploi\n\n" +
      "Document 1 :\nL'intelligence artificielle automatise déjà des tâches répétitives dans de nombreux secteurs, ce qui menace directement des emplois peu qualifiés et fragilise des travailleurs qui peinent à se reconvertir.\n\n" +
      "Document 2 :\nChaque vague technologique a créé de nouveaux métiers qu'on n'imaginait pas auparavant. L'intelligence artificielle ouvrira elle aussi des débouchés dans la maintenance, la formation et la supervision de ces systèmes.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Le tourisme de masse",
    prompt:
      "Le tourisme de masse\n\n" +
      "Document 1 :\nL'afflux massif de visiteurs dégrade les sites naturels, fait grimper le coût de la vie pour les habitants et transforme des quartiers entiers en zones dédiées aux touristes.\n\n" +
      "Document 2 :\nLe tourisme reste une source essentielle de revenus pour de nombreuses régions : il finance des emplois locaux, la restauration de monuments et le développement d'infrastructures dont profitent aussi les résidents.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Diplôme ou expérience",
    prompt:
      "Diplôme ou expérience\n\n" +
      "Document 1 :\nUn diplôme universitaire atteste d'une base de connaissances solide et reste souvent un critère de sélection incontournable pour accéder à un entretien d'embauche.\n\n" +
      "Document 2 :\nDe nombreux recruteurs valorisent avant tout l'expérience pratique : elle démontre des compétences concrètes que la formation théorique ne suffit pas toujours à développer.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Voitures électriques ou à essence",
    prompt:
      "Voitures électriques ou à essence\n\n" +
      "Document 1 :\nLa voiture électrique reste coûteuse à l'achat et dépend d'un réseau de bornes de recharge encore insuffisant en dehors des grandes villes.\n\n" +
      "Document 2 :\nMalgré son prix, la voiture électrique réduit la pollution de l'air et les coûts d'entretien à long terme, ce qui en fait un investissement rentable pour l'avenir.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "La mondialisation",
    prompt:
      "La mondialisation\n\n" +
      "Document 1 :\nLa mondialisation profite surtout aux grandes entreprises et aux pays déjà industrialisés, en accentuant les inégalités économiques entre les régions du monde.\n\n" +
      "Document 2 :\nEn ouvrant de nouveaux marchés, la mondialisation a permis à des pays en développement de sortir des millions de personnes de la pauvreté grâce à l'exportation et à l'investissement étranger.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Le télétravail généralisé",
    prompt:
      "Le télétravail généralisé\n\n" +
      "Document 1 :\nLe télétravail améliore l'équilibre entre vie professionnelle et vie personnelle en supprimant les trajets quotidiens et en offrant plus de flexibilité.\n\n" +
      "Document 2 :\nTravailler à distance de façon permanente isole les employés, complique la collaboration spontanée et brouille la frontière entre les horaires de travail et de repos.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les réseaux sociaux et les adolescents",
    prompt:
      "Les réseaux sociaux et les adolescents\n\n" +
      "Document 1 :\nUn usage intensif des réseaux sociaux chez les adolescents est associé à une hausse de l'anxiété, à des troubles du sommeil et à une comparaison sociale néfaste pour l'estime de soi.\n\n" +
      "Document 2 :\nLes réseaux sociaux permettent aux adolescents de rester en contact avec leurs proches, de découvrir des centres d'intérêt communs et de s'exprimer dans des communautés qui les soutiennent.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "La semaine de quatre jours",
    prompt:
      "La semaine de quatre jours\n\n" +
      "Document 1 :\nRéduire la semaine de travail à quatre jours améliorerait la santé des employés et leur productivité, comme l'ont montré plusieurs expérimentations en entreprise.\n\n" +
      "Document 2 :\nComprimer le même volume de travail sur quatre jours augmente la pression quotidienne et complique l'organisation pour les secteurs qui doivent rester ouverts en continu.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "L'agriculture biologique",
    prompt:
      "L'agriculture biologique\n\n" +
      "Document 1 :\nL'agriculture biologique préserve les sols, protège la biodiversité et réduit l'exposition des consommateurs aux pesticides de synthèse.\n\n" +
      "Document 2 :\nLes rendements plus faibles de l'agriculture biologique et son coût de production plus élevé rendent ses produits inaccessibles pour une partie de la population.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les transports en commun gratuits",
    prompt:
      "Les transports en commun gratuits\n\n" +
      "Document 1 :\nRendre les transports en commun gratuits encouragerait davantage d'habitants à délaisser leur voiture, réduisant ainsi la pollution et les embouteillages en ville.\n\n" +
      "Document 2 :\nLa gratuité priverait les réseaux de transport d'une ressource essentielle à leur entretien et à leur développement, au risque de dégrader le service à long terme.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "L'apprentissage à distance",
    prompt:
      "L'apprentissage à distance\n\n" +
      "Document 1 :\nLes cours à distance offrent une grande flexibilité et permettent à des étudiants isolés géographiquement d'accéder à des formations autrefois hors de portée.\n\n" +
      "Document 2 :\nL'absence d'interaction directe avec les enseignants et les autres étudiants nuit à la motivation et prive les apprenants d'un accompagnement essentiel à leur réussite.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les jeux vidéo et les jeunes",
    prompt:
      "Les jeux vidéo et les jeunes\n\n" +
      "Document 1 :\nLes jeux vidéo développent la concentration, la stratégie et la coopération, et permettent aux jeunes de créer des liens avec d'autres joueurs partout dans le monde.\n\n" +
      "Document 2 :\nPasser de longues heures devant les jeux vidéo isole les jeunes, perturbe leur sommeil et réduit le temps consacré aux études et aux activités physiques.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "L'énergie nucléaire",
    prompt:
      "L'énergie nucléaire\n\n" +
      "Document 1 :\nL'énergie nucléaire produit de grandes quantités d'électricité sans émettre de gaz à effet de serre, ce qui en fait un allié de la lutte contre le réchauffement climatique.\n\n" +
      "Document 2 :\nLes déchets radioactifs, le coût des centrales et le risque d'accident font de l'énergie nucléaire un choix dangereux pour les générations futures.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les devoirs à la maison",
    prompt:
      "Les devoirs à la maison\n\n" +
      "Document 1 :\nLes devoirs à la maison permettent aux élèves de revoir ce qu'ils ont appris, de s'organiser seuls et de prendre de bonnes habitudes de travail.\n\n" +
      "Document 2 :\nLes devoirs à la maison fatiguent les enfants, creusent les inégalités entre les familles qui peuvent les aider et celles qui ne le peuvent pas, et empiètent sur leur temps libre.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Réduire sa consommation de viande",
    prompt:
      "Réduire sa consommation de viande\n\n" +
      "Document 1 :\nManger moins de viande protège la santé, diminue l'impact de l'élevage sur le climat et permet de mieux respecter le bien-être animal.\n\n" +
      "Document 2 :\nLa viande apporte des protéines et des nutriments essentiels, et inviter chacun à en manger moins menace des traditions culinaires et l'emploi de nombreux éleveurs.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Interdire les voitures en centre-ville",
    prompt:
      "Interdire les voitures en centre-ville\n\n" +
      "Document 1 :\nInterdire les voitures en centre-ville réduirait la pollution et le bruit, et rendrait l'espace public plus agréable pour les piétons et les cyclistes.\n\n" +
      "Document 2 :\nFermer le centre-ville aux voitures pénalise les personnes âgées, les personnes handicapées et les commerçants, qui dépendent de la clientèle venue en voiture.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Achats en ligne ou commerces de proximité",
    prompt:
      "Achats en ligne ou commerces de proximité\n\n" +
      "Document 1 :\nAcheter en ligne est pratique : on compare les prix, on gagne du temps et on trouve des produits qu'aucun magasin proche ne propose.\n\n" +
      "Document 2 :\nLes commerces de proximité animent les quartiers, créent des emplois locaux et offrent un conseil humain que les sites internet ne peuvent pas remplacer.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Le travail le dimanche",
    prompt:
      "Le travail le dimanche\n\n" +
      "Document 1 :\nOuvrir les commerces le dimanche répond aux besoins des clients qui travaillent la semaine, et offre aux étudiants et aux salariés des revenus supplémentaires.\n\n" +
      "Document 2 :\nTravailler le dimanche perturbe la vie familiale et sociale des salariés, et pousse les petits commerces à s'aligner sur les grandes enseignes.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "L'âge de la retraite",
    prompt:
      "L'âge de la retraite\n\n" +
      "Document 1 :\nRepousser l'âge de la retraite est nécessaire : on vit plus longtemps et il faut garantir le financement des pensions sans alourdir les charges des plus jeunes.\n\n" +
      "Document 2 :\nRepousser l'âge de la retraite est injuste pour les personnes qui exercent des métiers pénibles, et réduit les chances des jeunes d'entrer sur le marché du travail.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les zoos",
    prompt:
      "Les zoos\n\n" +
      "Document 1 :\nLes zoos protègent des espèces menacées, participent à la recherche scientifique et sensibilisent le public à la préservation de la nature.\n\n" +
      "Document 2 :\nEnfermer des animaux sauvages dans des espaces réduits est contraire à leur nature, et les zoos ne contribuent que très peu à la protection des espèces dans leur milieu d'origine.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les tablettes à l'école",
    prompt:
      "Les tablettes à l'école\n\n" +
      "Document 1 :\nLes tablettes et les outils numériques rendent les cours plus attractifs, permettent d'adapter le rythme à chaque élève et préparent les enfants au monde professionnel.\n\n" +
      "Document 2 :\nLes écrans distraient les élèves, fatiguent leur regard et affaiblissent l'écriture manuscrite et la concentration, autant de compétences que l'école doit d'abord transmettre.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les langues étrangères à l'école primaire",
    prompt:
      "Les langues étrangères à l'école primaire\n\n" +
      "Document 1 :\nCommencer une langue étrangère dès l'école primaire profite de la facilité des jeunes enfants à imiter les sons, et leur ouvre l'esprit à d'autres cultures.\n\n" +
      "Document 2 :\nImposer une langue étrangère à l'école primaire surcharge les programmes, au détriment de la maîtrise de la lecture, de l'écriture et du calcul.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Le vote obligatoire",
    prompt:
      "Le vote obligatoire\n\n" +
      "Document 1 :\nRendre le vote obligatoire augmenterait la participation et donnerait aux élus une légitimité plus forte, en représentant l'ensemble des citoyens.\n\n" +
      "Document 2 :\nObliger les citoyens à voter porte atteinte à leur liberté, et risque de multiplier les votes blancs ou donnés sans réflexion.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "La publicité destinée aux enfants",
    prompt:
      "La publicité destinée aux enfants\n\n" +
      "Document 1 :\nLa publicité destinée aux enfants finance de nombreux programmes et leur permet de découvrir des produits adaptés à leur âge, à condition d'être encadrée.\n\n" +
      "Document 2 :\nLes enfants ne savent pas encore distinguer l'information de la publicité : les exposer à des messages commerciaux les pousse à la surconsommation et pèse sur le budget des familles.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les caméras de surveillance",
    prompt:
      "Les caméras de surveillance\n\n" +
      "Document 1 :\nLes caméras de surveillance dissuadent les délits, aident la police à retrouver des coupables et renforcent le sentiment de sécurité dans les lieux publics.\n\n" +
      "Document 2 :\nLes caméras de surveillance portent atteinte à la vie privée, ne règlent pas les causes de la délinquance et peuvent être détournées de leur usage.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Voyager en avion ou préserver la planète",
    prompt:
      "Voyager en avion ou préserver la planète\n\n" +
      "Document 1 :\nLe transport aérien rapproche les peuples, soutient le tourisme et l'économie de nombreux pays, et rend possibles des rencontres qu'aucun autre moyen ne permet.\n\n" +
      "Document 2 :\nL'avion est l'un des modes de transport les plus polluants : limiter les vols est indispensable pour réduire les émissions de gaz à effet de serre.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Le service civique obligatoire",
    prompt:
      "Le service civique obligatoire\n\n" +
      "Document 1 :\nUn service civique obligatoire permettrait aux jeunes de s'engager pour la société, de rencontrer des personnes d'horizons différents et d'acquérir une première expérience.\n\n" +
      "Document 2 :\nImposer un service civique retarde l'entrée des jeunes dans les études ou la vie active, et un engagement contraint ne développe ni motivation ni sens civique.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Le paiement sans espèces",
    prompt:
      "Le paiement sans espèces\n\n" +
      "Document 1 :\nLe paiement par carte ou par téléphone est rapide et sécurisé, et limite les risques de vol et les circulations d'argent illégales.\n\n" +
      "Document 2 :\nSupprimer les espèces pénalise les personnes âgées ou mal équipées, laisse les banques suivre toutes nos dépenses et rend les consommateurs dépendants des pannes informatiques.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les frais de scolarité à l'université",
    prompt:
      "Les frais de scolarité à l'université\n\n" +
      "Document 1 :\nRendre l'université gratuite garantit l'égalité des chances : chacun peut étudier selon son talent et non selon les moyens de sa famille.\n\n" +
      "Document 2 :\nFaire payer l'université permet de financer des formations de meilleure qualité, rend les étudiants plus responsables de leur parcours et allège le budget de l'État.",
  },
  {
    taskType: TaskType.TASK_3,
    guideContext: GuideProfile.ARGUMENTATIVE_ANALYSIS,
    title: "Les médias sociaux et l'information",
    prompt:
      "Les médias sociaux et l'information\n\n" +
      "Document 1 :\nLes réseaux sociaux offrent à chacun la possibilité de s'informer rapidement, de s'exprimer librement et de suivre l'actualité en direct, sans dépendre des grands médias.\n\n" +
      "Document 2 :\nLes réseaux sociaux favorisent la diffusion de fausses informations et enferment chacun dans une bulle qui ne confirme que ses opinions.",
  },
];
