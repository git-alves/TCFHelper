import { redirect } from "next/navigation";
import { PracticeTrainer, type CuratedPracticeCurriculum, type CuratedPracticeExercise, type CuratedPracticeSkill } from "@/components/practice-trainer";
import { DashboardAccountUnavailable } from "@/components/dashboard-account-unavailable";
import { hasRedeemedAccessCode } from "@/lib/access-code";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { redirectForUnauthenticatedOrBlockedUser } from "@/lib/blocked-user-redirect";
import {
  PRACTICE_EXERCISES,
  PRACTICE_LEVELS,
  getPracticeTopics,
  type PracticeExercise,
  type PracticeTopic,
} from "@/lib/practice-curriculum";
import { TASK_ORDER } from "@/lib/tcf-tasks";

// The question bank stays the source of truth. This small server-side adapter
// only translates its author-facing field names to the trainer's serializable
// render contract; it never creates, varies, or calls a model for content.
function toSkill(topic: PracticeTopic, level: "B2" | "C1" | "C2"): CuratedPracticeSkill {
  return {
    id: topic.id,
    task: topic.task,
    level,
    label: topic.label,
    description: topic.description,
    learning_outcome: topic.learningGoal[level],
    estimated_minutes: 20,
  };
}

function toExercise(exercise: PracticeExercise): CuratedPracticeExercise {
  return {
    id: exercise.id,
    task: exercise.task,
    level: exercise.level,
    skill: exercise.skill,
    sub_skill: exercise.subSkill,
    exercise_type: exercise.exerciseType,
    prompt: exercise.prompt,
    instructions: exercise.instructions,
    options: exercise.options,
    correct_answer: exercise.correctAnswer ?? undefined,
    accepted_answers: exercise.acceptedAnswers,
    explanation: exercise.explanation,
    target_language_feature: exercise.targetLanguageFeature,
    difficulty: exercise.difficulty,
    sequence_order: exercise.sequenceOrder,
    prerequisite_exercise: exercise.prerequisiteExerciseId ?? undefined,
    tags: exercise.tags,
    self_check: exercise.selfCheck,
  };
}

function getTrainerCurriculum(): CuratedPracticeCurriculum {
  return {
    // `getPracticeTopics` applies the launch-quality gate: a topic appears
    // only when all six reviewed scaffold steps exist for that task + level.
    skills: TASK_ORDER.flatMap((task) =>
      PRACTICE_LEVELS.flatMap((level) => getPracticeTopics(task, level).map((topic) => toSkill(topic, level))),
    ),
    exercises: PRACTICE_EXERCISES.map(toExercise),
  };
}

export default async function PracticePage() {
  let user;
  try {
    user = await getCurrentAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return <DashboardAccountUnavailable />;
    }
    throw error;
  }

  if (!user) {
    await redirectForUnauthenticatedOrBlockedUser("/practice");
    return null;
  }

  if (!user.isAdmin && !(await hasRedeemedAccessCode(user.id))) {
    redirect("/activate");
  }

  return (
    <main className="flex w-full flex-1 flex-col px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PracticeTrainer curriculum={getTrainerCurriculum()} />
    </main>
  );
}
