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

  // Tâche 3 — analyser et argumenter (120-180 mots)
  {
    taskType: TaskType.TASK_3,
    title: "L'intelligence artificielle et l'emploi",
    prompt:
      "Certains pensent que l'intelligence artificielle va supprimer des emplois, d'autres qu'elle en créera de nouveaux. Discutez ces deux points de vue et donnez votre avis.",
  },
  {
    taskType: TaskType.TASK_3,
    title: "Le tourisme de masse",
    prompt:
      "Un débat oppose ceux qui pensent que le tourisme de masse nuit à l'environnement à ceux qui pensent qu'il profite à l'économie locale. Présentez les deux positions et concluez.",
  },
  {
    taskType: TaskType.TASK_3,
    title: "Diplôme ou expérience",
    prompt:
      "Certains affirment que les diplômes universitaires sont indispensables pour réussir, d'autres estiment que l'expérience compte davantage. Analysez ces arguments et donnez votre opinion.",
  },
  {
    taskType: TaskType.TASK_3,
    title: "Voitures électriques ou à essence",
    prompt:
      "Faut-il privilégier les voitures électriques malgré leur coût, ou continuer avec les voitures à essence en attendant une meilleure infrastructure ? Discutez.",
  },
  {
    taskType: TaskType.TASK_3,
    title: "La mondialisation",
    prompt:
      "La mondialisation profite-t-elle davantage aux pays riches ou aux pays pauvres ? Présentez les arguments des deux côtés et concluez.",
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
