/**
 * Seed script: populates the Topic table with a starter bank of writing
 * prompts for each TCF task type. Run with `npm run db:seed`.
 *
 * Safe to re-run: it skips a topic if one with the same title and task type
 * already exists.
 */
import "dotenv/config";
import { PrismaClient, TaskType, TopicSource } from "@prisma/client";

const prisma = new PrismaClient();

const TOPICS: { taskType: TaskType; title: string; prompt: string }[] = [
  // Tâche 1 — décrire, raconter (60-120 mots)
  {
    taskType: TaskType.TASK_1,
    title: "Raconter son week-end",
    prompt: "Écrivez un message à un ami pour lui raconter votre dernier week-end.",
  },
  {
    taskType: TaskType.TASK_1,
    title: "Décrire sa ville natale",
    prompt: "Décrivez votre ville natale à un correspondant qui ne la connaît pas.",
  },
  {
    taskType: TaskType.TASK_1,
    title: "Un souvenir de vacances",
    prompt: "Racontez un souvenir de vacances mémorable à un collègue.",
  },
  {
    taskType: TaskType.TASK_1,
    title: "Inviter un ami à une fête",
    prompt: "Écrivez un courriel à un ami pour l'inviter à une fête.",
  },
  {
    taskType: TaskType.TASK_1,
    title: "Décrire sa routine quotidienne",
    prompt: "Décrivez votre routine quotidienne à un nouvel ami rencontré en ligne.",
  },
  {
    taskType: TaskType.TASK_1,
    title: "Annoncer un déménagement",
    prompt: "Écrivez un message à un ami pour lui annoncer votre déménagement dans une nouvelle ville.",
  },
  {
    taskType: TaskType.TASK_1,
    title: "Remercier un collègue",
    prompt: "Écrivez un courriel à un collègue pour le remercier de son aide sur un projet récent.",
  },
  {
    taskType: TaskType.TASK_1,
    title: "Décrire un cours suivi",
    prompt: "Décrivez à un ami un cours que vous avez suivi récemment et ce que vous en avez retenu.",
  },
  {
    taskType: TaskType.TASK_1,
    title: "Proposer une activité sportive",
    prompt: "Écrivez un message à un ami pour lui proposer de pratiquer un sport ensemble.",
  },
  {
    taskType: TaskType.TASK_1,
    title: "Raconter une découverte culinaire",
    prompt: "Racontez à un proche une découverte culinaire que vous avez faite récemment.",
  },
  {
    taskType: TaskType.TASK_1,
    title: "Demander des nouvelles",
    prompt: "Écrivez un message à un ancien camarade de classe pour prendre de ses nouvelles et raconter les vôtres.",
  },

  // Tâche 2 — exprimer une opinion (120-150 mots)
  {
    taskType: TaskType.TASK_2,
    title: "Réseaux sociaux : lien ou distance",
    prompt:
      "Pensez-vous que les réseaux sociaux rapprochent ou éloignent les gens ? Justifiez votre opinion.",
  },
  {
    taskType: TaskType.TASK_2,
    title: "Le télétravail",
    prompt: "Le télétravail est-il, selon vous, bénéfique pour les employés ? Donnez votre avis.",
  },
  {
    taskType: TaskType.TASK_2,
    title: "Cours en ligne vs en classe",
    prompt: "Les cours en ligne peuvent-ils remplacer les cours en classe ? Exprimez votre point de vue.",
  },
  {
    taskType: TaskType.TASK_2,
    title: "Téléphones portables à l'école",
    prompt: "Faut-il interdire les téléphones portables à l'école ? Donnez votre opinion argumentée.",
  },
  {
    taskType: TaskType.TASK_2,
    title: "Ville ou campagne",
    prompt: "Vivre en ville ou à la campagne : quel mode de vie préférez-vous ? Justifiez votre réponse.",
  },
  {
    taskType: TaskType.TASK_2,
    title: "Argent de poche",
    prompt: "Les enfants devraient-ils recevoir de l'argent de poche ? Donnez votre opinion et justifiez-la.",
  },
  {
    taskType: TaskType.TASK_2,
    title: "Animaux domestiques en appartement",
    prompt: "Est-il raisonnable d'avoir un animal domestique quand on vit en appartement ? Exprimez votre avis.",
  },
  {
    taskType: TaskType.TASK_2,
    title: "Uniforme scolaire",
    prompt: "Faut-il imposer le port de l'uniforme à l'école ? Justifiez votre position.",
  },
  {
    taskType: TaskType.TASK_2,
    title: "Vacances entre amis ou en famille",
    prompt: "Préférez-vous partir en vacances entre amis ou en famille ? Justifiez votre choix.",
  },
  {
    taskType: TaskType.TASK_2,
    title: "Livres papier ou numériques",
    prompt: "Les livres numériques remplaceront-ils un jour les livres papier ? Donnez votre opinion.",
  },
  {
    taskType: TaskType.TASK_2,
    title: "Sport individuel ou collectif",
    prompt: "Le sport individuel est-il plus formateur que le sport collectif ? Exprimez votre point de vue.",
  },

  // Tâche 3 — analyser et argumenter (120-180 mots). The prompt follows the
  // same "title + Document 1 + Document 2" structure the app parses out of
  // the real recent-exam source (see src/lib/recent-exam-topics.ts), so a
  // seeded topic reads exactly like an authentic one.
  {
    taskType: TaskType.TASK_3,
    title: "L'intelligence artificielle et l'emploi",
    prompt:
      "L'intelligence artificielle et l'emploi\n\n" +
      "Document 1 :\nL'intelligence artificielle automatise déjà des tâches répétitives dans de nombreux secteurs, ce qui menace directement des emplois peu qualifiés et fragilise des travailleurs qui peinent à se reconvertir.\n\n" +
      "Document 2 :\nChaque vague technologique a créé de nouveaux métiers qu'on n'imaginait pas auparavant. L'intelligence artificielle ouvrira elle aussi des débouchés dans la maintenance, la formation et la supervision de ces systèmes.",
  },
  {
    taskType: TaskType.TASK_3,
    title: "Le tourisme de masse",
    prompt:
      "Le tourisme de masse\n\n" +
      "Document 1 :\nL'afflux massif de visiteurs dégrade les sites naturels, fait grimper le coût de la vie pour les habitants et transforme des quartiers entiers en zones dédiées aux touristes.\n\n" +
      "Document 2 :\nLe tourisme reste une source essentielle de revenus pour de nombreuses régions : il finance des emplois locaux, la restauration de monuments et le développement d'infrastructures dont profitent aussi les résidents.",
  },
  {
    taskType: TaskType.TASK_3,
    title: "Diplôme ou expérience",
    prompt:
      "Diplôme ou expérience\n\n" +
      "Document 1 :\nUn diplôme universitaire atteste d'une base de connaissances solide et reste souvent un critère de sélection incontournable pour accéder à un entretien d'embauche.\n\n" +
      "Document 2 :\nDe nombreux recruteurs valorisent avant tout l'expérience pratique : elle démontre des compétences concrètes que la formation théorique ne suffit pas toujours à développer.",
  },
  {
    taskType: TaskType.TASK_3,
    title: "Voitures électriques ou à essence",
    prompt:
      "Voitures électriques ou à essence\n\n" +
      "Document 1 :\nLa voiture électrique reste coûteuse à l'achat et dépend d'un réseau de bornes de recharge encore insuffisant en dehors des grandes villes.\n\n" +
      "Document 2 :\nMalgré son prix, la voiture électrique réduit la pollution de l'air et les coûts d'entretien à long terme, ce qui en fait un investissement rentable pour l'avenir.",
  },
  {
    taskType: TaskType.TASK_3,
    title: "La mondialisation",
    prompt:
      "La mondialisation\n\n" +
      "Document 1 :\nLa mondialisation profite surtout aux grandes entreprises et aux pays déjà industrialisés, en accentuant les inégalités économiques entre les régions du monde.\n\n" +
      "Document 2 :\nEn ouvrant de nouveaux marchés, la mondialisation a permis à des pays en développement de sortir des millions de personnes de la pauvreté grâce à l'exportation et à l'investissement étranger.",
  },
  {
    taskType: TaskType.TASK_3,
    title: "Le télétravail généralisé",
    prompt:
      "Le télétravail généralisé\n\n" +
      "Document 1 :\nLe télétravail améliore l'équilibre entre vie professionnelle et vie personnelle en supprimant les trajets quotidiens et en offrant plus de flexibilité.\n\n" +
      "Document 2 :\nTravailler à distance de façon permanente isole les employés, complique la collaboration spontanée et brouille la frontière entre les horaires de travail et de repos.",
  },
  {
    taskType: TaskType.TASK_3,
    title: "Les réseaux sociaux et les adolescents",
    prompt:
      "Les réseaux sociaux et les adolescents\n\n" +
      "Document 1 :\nUn usage intensif des réseaux sociaux chez les adolescents est associé à une hausse de l'anxiété, à des troubles du sommeil et à une comparaison sociale néfaste pour l'estime de soi.\n\n" +
      "Document 2 :\nLes réseaux sociaux permettent aux adolescents de rester en contact avec leurs proches, de découvrir des centres d'intérêt communs et de s'exprimer dans des communautés qui les soutiennent.",
  },
  {
    taskType: TaskType.TASK_3,
    title: "La semaine de quatre jours",
    prompt:
      "La semaine de quatre jours\n\n" +
      "Document 1 :\nRéduire la semaine de travail à quatre jours améliorerait la santé des employés et leur productivité, comme l'ont montré plusieurs expérimentations en entreprise.\n\n" +
      "Document 2 :\nComprimer le même volume de travail sur quatre jours augmente la pression quotidienne et complique l'organisation pour les secteurs qui doivent rester ouverts en continu.",
  },
  {
    taskType: TaskType.TASK_3,
    title: "L'agriculture biologique",
    prompt:
      "L'agriculture biologique\n\n" +
      "Document 1 :\nL'agriculture biologique préserve les sols, protège la biodiversité et réduit l'exposition des consommateurs aux pesticides de synthèse.\n\n" +
      "Document 2 :\nLes rendements plus faibles de l'agriculture biologique et son coût de production plus élevé rendent ses produits inaccessibles pour une partie de la population.",
  },
  {
    taskType: TaskType.TASK_3,
    title: "Les transports en commun gratuits",
    prompt:
      "Les transports en commun gratuits\n\n" +
      "Document 1 :\nRendre les transports en commun gratuits encouragerait davantage d'habitants à délaisser leur voiture, réduisant ainsi la pollution et les embouteillages en ville.\n\n" +
      "Document 2 :\nLa gratuité priverait les réseaux de transport d'une ressource essentielle à leur entretien et à leur développement, au risque de dégrader le service à long terme.",
  },
  {
    taskType: TaskType.TASK_3,
    title: "L'apprentissage à distance",
    prompt:
      "L'apprentissage à distance\n\n" +
      "Document 1 :\nLes cours à distance offrent une grande flexibilité et permettent à des étudiants isolés géographiquement d'accéder à des formations autrefois hors de portée.\n\n" +
      "Document 2 :\nL'absence d'interaction directe avec les enseignants et les autres étudiants nuit à la motivation et prive les apprenants d'un accompagnement essentiel à leur réussite.",
  },
];

async function main() {
  let created = 0;
  for (const topic of TOPICS) {
    const existing = await prisma.topic.findFirst({
      where: { title: topic.title, taskType: topic.taskType },
    });
    if (existing) continue;

    await prisma.topic.create({
      data: { ...topic, source: TopicSource.OFFICIAL_EXAM },
    });
    created += 1;
  }

  console.log(`Seed complete: ${created} topic(s) created, ${TOPICS.length - created} already present.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
