import type { AppCopy } from "@/lib/app-copy";
import type { EssayFeedback } from "@/lib/essay-feedback";
import { WALKTHROUGH_SAMPLE_ESSAY } from "@/lib/walkthrough-sample-essay";

export const WALKTHROUGH_SAMPLE_CORRECTED_TEXT = WALKTHROUGH_SAMPLE_ESSAY.replace(
  "que j'ai adoré",
  "que j'ai adorées",
).replace("nous sommes resté", "nous sommes restés");

const WALKTHROUGH_SAMPLE_MODEL_VERSION = `Chère Marie,

Je profite d'un moment de calme pour te raconter mon week-end à Lyon. Arrivé vendredi soir, j'ai flâné dans le vieux quartier avec des amis, avant de découvrir samedi un charmant restaurant au bord du fleuve, où j'ai savouré des spécialités locales absolument délicieuses. Dimanche, la pluie nous a contraints à rester à l'hôtel, où nous avons enchaîné les films avec plaisir.

Ce week-end, aussi fatigant qu'agréable, restera un excellent souvenir. J'ai hâte de te voir pour te montrer mes photos et te raconter tout ça en détail.

Amitiés,
Paul`;

// A fixed, illustrative correction shown during the /tasks walkthrough
// instead of a real /api/essays/correct call -- see the "no permanent
// record" decision on the tour's scripted correction step. The explanatory
// fields (summary, rationale, error explanations, suggestions) come from
// app-copy so they follow the interface language like a real correction
// would; correctedText/modelVersion stay fixed French, same as a real
// correction's submitted-language content. Offsets are derived with
// indexOf rather than hand-counted, so they can never drift out of sync
// with the sample text above.
export function getWalkthroughSampleFeedback(copy: AppCopy): EssayFeedback {
  const preview = copy.walkthrough.previewFeedback;

  const agreementOriginal = "que j'ai adoré";
  const agreementCorrection = "que j'ai adorées";
  const participleOriginal = "nous sommes resté";
  const participleCorrection = "nous sommes restés";

  return {
    correctedText: WALKTHROUGH_SAMPLE_CORRECTED_TEXT,
    modelVersion: WALKTHROUGH_SAMPLE_MODEL_VERSION,
    scores: {
      content: { score: 82, feedback: preview.contentNote },
      linguistics: { score: 74, feedback: preview.linguisticsNote },
      vocabulary: { score: 78, feedback: preview.vocabularyNote },
    },
    cefrLevel: "B1",
    cefrRationale: preview.cefrRationale,
    meetsWordCount: true,
    wordCountNote: preview.wordCountNote,
    errors: [
      {
        original: agreementOriginal,
        originalStart: WALKTHROUGH_SAMPLE_ESSAY.indexOf(agreementOriginal),
        correction: agreementCorrection,
        correctionStart: WALKTHROUGH_SAMPLE_CORRECTED_TEXT.indexOf(agreementCorrection),
        explanation: preview.agreementErrorExplanation,
        category: "grammar",
      },
      {
        original: participleOriginal,
        originalStart: WALKTHROUGH_SAMPLE_ESSAY.indexOf(participleOriginal),
        correction: participleCorrection,
        correctionStart: WALKTHROUGH_SAMPLE_CORRECTED_TEXT.indexOf(participleCorrection),
        explanation: preview.participleErrorExplanation,
        category: "grammar",
      },
    ],
    suggestions: [preview.suggestionOne, preview.suggestionTwo],
    summary: preview.summary,
  };
}
