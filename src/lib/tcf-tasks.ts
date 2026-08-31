import type { TaskType } from "@prisma/client";

export const TASK_ORDER: TaskType[] = ["TASK_1", "TASK_2", "TASK_3"];

export interface TaskDefinition {
  label: string;
  title: string;
  description: string;
  minWords: number;
  maxWords: number;
}

// Static task instructions modeled on the TCF (Test de Connaissance du
// Français) written expression section. Word ranges are the same ones the
// real exam scores against, so feedback stays useful for exam prep.
export const TASK_INSTRUCTIONS: Record<TaskType, TaskDefinition> = {
  TASK_1: {
    label: "Tâche 1",
    title: "Décrire, raconter",
    description:
      "Rédigez un message court (lettre, e-mail ou message) pour raconter un événement, décrire une expérience ou transmettre une information à un destinataire précis.",
    minWords: 60,
    maxWords: 120,
  },
  TASK_2: {
    label: "Tâche 2",
    title: "Raconter et commenter",
    description:
      "Rédigez un article de blog ou un e-mail pour raconter une expérience ou un événement à des lecteurs précis. Faites vivre l'expérience avec des détails utiles, puis ajoutez votre réaction, votre commentaire ou la suite que vous en tirez, selon le but du message.",
    minWords: 120,
    maxWords: 150,
  },
  TASK_3: {
    label: "Tâche 3",
    title: "Analyser et argumenter",
    description:
      "Analysez un sujet de société en présentant différents points de vue, puis défendez votre propre position à l'aide d'arguments structurés.",
    minWords: 120,
    maxWords: 180,
  },
};
