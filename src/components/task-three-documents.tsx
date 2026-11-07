import type { TaskThreeDocuments } from "@/lib/task-three-topic";

interface TaskThreeDocumentsViewProps {
  title: string;
  documents: TaskThreeDocuments["documents"];
}

/**
 * A Tâche 3 topic laid out like the exam sheet: the subject as a centered
 * title, then "Document 1 :" and "Document 2 :" each above its own bordered box.
 */
export function TaskThreeDocumentsView({ title, documents }: TaskThreeDocumentsViewProps) {
  return (
    <div lang="fr" className="flex flex-col gap-3">
      <h3 className="text-center text-lg font-semibold text-violet-700 dark:text-violet-300">{title}</h3>
      {documents.map((text, index) => (
        <section key={index} aria-label={`Document ${index + 1}`}>
          <h4 className="text-base font-semibold text-violet-700 dark:text-violet-300">Document {index + 1} :</h4>
          <p className="mt-2 whitespace-pre-wrap rounded-lg border border-violet-500/50 bg-white/60 p-4 text-sm leading-6 dark:border-violet-300/40 dark:bg-white/[.03]">
            {text}
          </p>
        </section>
      ))}
    </div>
  );
}
