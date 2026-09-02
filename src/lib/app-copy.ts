import type { AppLocale } from "@/lib/app-locale";
import type { EssayFeedback } from "@/lib/essay-feedback";
import type { TimedTaskPhaseId } from "@/lib/timed-task";

type FeedbackErrorCategory = EssayFeedback["errors"][number]["errorType"];
type FeedbackCefrConfidence = EssayFeedback["cefr"]["confidence"];

// A small block model, not raw markdown: the modal has no markdown renderer,
// and hand-typed JSX per locale would drift the four languages out of sync
// with each other's structure. "text" fields may contain `**bold**` spans,
// rendered inline by the modal.
export type MethodologyBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "example"; text: string };

interface TargetLengthValues {
  minWords: number;
  maxWords: number;
}

interface WordCountValues extends TargetLengthValues {
  count: number;
}

interface SourceMonthValues {
  month: string;
}

interface TranslationLimitValues {
  maxCharacters: string;
}

interface LanguageValues {
  language: string;
}

interface FeedbackLevelValues {
  level: string;
}

interface ErrorCountValues {
  count: number;
}

interface AttemptedOnValues {
  date: string;
}

export interface AppCopy {
  common: {
    cancel: string;
    close: string;
  };
  nav: {
    dashboard: string;
    tasks: string;
    practice: string;
    settings: string;
    admin: string;
    logIn: string;
    closeSettingsFirst: string;
  };
  home: {
    title: string;
    description: string;
    startATask: string;
    getStarted: string;
  };
  practice: {
    tasks: Record<"TASK_1" | "TASK_2" | "TASK_3", { title: string; description: string }>;
    levels: Record<"B2" | "C1" | "C2", { title: string; description: string }>;
    stages: Record<"recognize" | "complete" | "transform" | "organize" | "develop" | "produce", string>;
    completedEyebrow: string;
    completedTitle: (values: { part: string }) => string;
    completedDescription: (values: { outcome: string }) => string;
    nextActionDescription: string;
    replayWithVariants: string;
    startFresh: string;
    chooseAnotherPart: string;
    tryFullTask: string;
    eyebrow: string;
    title: string;
    description: string;
    chooseTask: string;
    chooseLevel: string;
    levelHelp: string;
    choosePart: string;
    partPlaceholder: string;
    partLabel: (values: { order: number }) => string;
    previewEyebrow: string;
    previewTitle: (values: { part: string }) => string;
    previewOutcomeLabel: string;
    previewStagesLabel: string;
    resumeEyebrow: string;
    resumeTitle: (values: { part: string }) => string;
    resumeDescription: (values: { step: number; total: number }) => string;
    localSessionNotice: string;
    resumeSession: string;
    discardSavedSession: string;
    durationAndSteps: (values: { minutes: number; steps: number }) => string;
    unavailableCombination: string;
    unavailableTitle: (values: { task: string; level: string }) => string;
    unavailableDescription: string;
    availableLevelsLabel: string;
    availableLevel: (values: { level: string; parts: number }) => string;
    partHelp: string;
    changePart: string;
    sequenceDescription: (values: { count: number }) => string;
    progress: (values: { step: number; total: number }) => string;
    stageMap: (values: { current: string; next: string | null }) => string;
    attentionLabel: string;
    selectAnswer: string;
    selectOrder: string;
    reorderItems: string;
    moveUp: string;
    moveDown: string;
    responseLabel: string;
    responsePlaceholder: string;
    suggestionPlaceholder: string;
    correctFeedback: string;
    selfReviewFeedback: string;
    retryFeedback: string;
    revealedFeedback: string;
    reviewedAnswerLabel: string;
    explanationLabel: string;
    completedWithHelpLabel: string;
    finishSequence: string;
    nextExercise: string;
    selfReview: string;
    showHint: string;
    hideHint: string;
    hintLabel: string;
    hintNotice: string;
    verify: string;
    revealAnswer: string;
    retryHint: string;
    difficultyPrompt: string;
    difficultyTooEasy: string;
    difficultyAppropriate: string;
    difficultyTooHard: string;
    difficultyRecorded: string;
  };
  login: {
    title: string;
    emailLabel: string;
    passwordLabel: string;
    invalidCredentials: string;
    submitting: string;
    submit: string;
    noAccount: string;
    signUp: string;
  };
  signup: {
    title: string;
    nameLabel: string;
    emailLabel: string;
    passwordLabel: string;
    invalidInput: string;
    emailInUse: string;
    genericError: string;
    automaticLoginFailed: string;
    submitting: string;
    submit: string;
    alreadyHaveAccount: string;
    logIn: string;
  };
  dashboard: {
    welcome: (name: string) => string;
    startHereEyebrow: string;
    startHereTitle: string;
    startHereDescription: string;
    practiceStartTitle: string;
    practiceStartDescription: string;
    practiceStartAction: string;
    tasksStartTitle: string;
    tasksStartDescription: string;
    tasksStartAction: string;
    practiceActivityTitle: string;
    practiceExercisesCompleted: (values: { count: number }) => string;
    practiceCompletionBreakdown: (values: { independent: number; helped: number }) => string;
    practiceTaskPartsCompleted: (values: { count: number }) => string;
    continuePractice: string;
    practiceActionsMenu: string;
    clearPracticeProgressAction: string;
    clearPracticeProgressConfirmTitle: string;
    clearPracticeProgressConfirmDescription: string;
    clearPracticeProgressConfirm: string;
    clearPracticeProgressError: string;
    clearPracticeProgressSuccess: string;
    accountUnavailableTitle: string;
    accountUnavailableDescription: string;
    chartTitle: string;
    chartCaption: (values: { count: number }) => string;
    emptyTitle: string;
    emptyDescription: string;
    taskLegend: (values: { number: number }) => string;
    levelAxisLabel: string;
    attemptAxisLabel: string;
    recentCorrectionsTitle: string;
    viewAllCorrections: string;
    correctionHistoryTitle: string;
    noCorrectionHistoryTitle: string;
    noCorrectionHistoryDescription: string;
    limitedCorrectionDetails: string;
    backToCorrectionHistory: string;
    backToDashboard: string;
    attemptedOn: (values: AttemptedOnValues) => string;
    correctionActionsMenu: string;
    deleteCorrectionAction: string;
    deleteCorrectionConfirmTitle: string;
    deleteCorrectionConfirmDescription: string;
    deleteCorrectionConfirm: string;
    deleteCorrectionError: string;
    deleteCorrectionSuccess: string;
  };
  settings: {
    title: string;
    appearanceHeading: string;
    appearanceDescription: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    languageHeading: string;
    languageDescription: string;
    helpHeading: string;
    helpDescription: string;
  };
  // Step titles/bodies are added per-step once the tour component exists;
  // this is only the chrome shared by every step.
  walkthrough: {
    takeATour: string;
    stepProgress: (values: { step: number; total: number }) => string;
    next: string;
    back: string;
    skip: string;
    finish: string;
    continueToPractice: string;
    continueToFullTask: string;
    dashboardWelcomeTitle: string;
    dashboardWelcomeBody: string;
    dashboardCorrectionsTitle: string;
    dashboardCorrectionsBody: string;
    settingsTitle: string;
    settingsBody: string;
    dashboardPracticeTitle: string;
    dashboardPracticeBody: string;
    dashboardStartWritingTitle: string;
    dashboardStartWritingBody: string;
    practiceIntroTitle: string;
    practiceIntroBody: string;
    practicePartsTitle: string;
    practicePartsBody: string;
    practiceStagesTitle: string;
    practiceStagesBody: string;
    taskPickerTitle: string;
    taskPickerBody: string;
    topicPickerTitle: string;
    topicPickerBody: string;
    guidedWritingTitle: string;
    guidedWritingBody: string;
    timedTaskTourTitle: string;
    timedTaskTourBody: string;
    editorTitle: string;
    editorBody: string;
    correctButtonTitle: string;
    correctButtonBody: string;
    correctionModalTitle: string;
    correctionModalBody: string;
    exampleGenerateTitle: string;
    exampleGenerateBody: string;
    editorCopyTitle: string;
    editorCopyBody: string;
    editorClearTitle: string;
    editorClearBody: string;
    translationTitle: string;
    translationBody: string;
    navTitle: string;
    navBody: string;
    previewFeedback: {
      summary: string;
      cefrRationale: string;
      cefrEvidence: string;
      cefrBlocker: string;
      wordCountNote: string;
      contentNote: string;
      linguisticsNote: string;
      vocabularyNote: string;
      agreementErrorExplanation: string;
      participleErrorExplanation: string;
      suggestionOne: string;
      suggestionTwo: string;
    };
  };
  workspace: {
    task: {
      heading: string;
      targetLength: (values: TargetLengthValues) => string;
    };
    topic: {
      heading: string;
      recentExamTitle: string;
      recentExamDescription: string;
      customTitle: string;
      customDescription: string;
      loading: string;
      fetchError: string;
      unavailableError: string;
      notPublishedError: string;
      selectedRecentExamAriaLabel: string;
      sourceLabel: string;
      recentExamsSource: (values: SourceMonthValues) => string;
      customTopicLabel: string;
      customTopicPlaceholder: string;
    };
    editor: {
      heading: string;
      wordCount: (values: WordCountValues) => string;
      responseLabel: string;
      frenchResponsePlaceholder: string;
      correct: string;
      correcting: string;
      correctingStatus: string;
      genericCorrectionError: string;
      alreadyCorrected: string;
      correctionInProgress: string;
      exampleLevelLabel: string;
      generateExample: string;
      generatingExample: string;
      generatingExampleStatus: string;
      exampleRateLimitedError: string;
      exampleDailyLimitError: string;
      exampleUnavailableError: string;
      exampleGenericError: string;
      exampleNeedsTopicWarning: string;
      copy: string;
      copied: string;
      copyFailed: string;
      clear: string;
    };
    // Fixed, reviewed coaching content selected by task + writing-context
    // profile + target level -- see docs/guided-writing.md and
    // src/lib/guided-writing.ts, which holds the actual tips (localized
    // separately, the same way task instructions and profile/stage labels
    // are). This block is only the guide's chrome copy. It shares
    // editor.exampleLevelLabel's "Target level" selector rather than adding
    // a second one -- one target level for the whole workspace.
    guidedWriting: {
      show: string;
      hide: string;
      heading: string;
      guideForLevel: (values: { level: string }) => string;
      contextConfirmHeading: string;
      contextConfirmPrompt: string;
      contextConfirmTextTypePrompt: string;
      contextConfirmAction: string;
      changeContext: string;
      contextLabel: (values: { profile: string }) => string;
      previousStage: string;
      nextStage: string;
      optionalStep: string;
      ideasLabel: string;
      tensesLabel: string;
      tensesHint: string;
      completionCheckLabel: string;
      examplesLabel: string;
      morePhrases: string;
    };
    timedTask: {
      show: string;
      heading: string;
      suggestedTotalTime: (values: { minutes: number }) => string;
      phaseDuration: (values: { label: string; minutes: number }) => string;
      start: string;
      pause: string;
      paused: string;
      resume: string;
      end: string;
      remaining: (values: { minutes: string; seconds: string }) => string;
      timeUp: string;
      continueForTwoMinutes: string;
      summaryHeading: string;
      summaryActualTime: (values: { time: string }) => string;
      summaryTargetTime: (values: { time: string }) => string;
      summaryWordCount: (values: { count: number }) => string;
      summaryPhaseReached: string;
      summaryPhaseNotReached: string;
      summaryClose: string;
      phaseLabels: Record<TimedTaskPhaseId, string>;
      phasePrompts: Record<TimedTaskPhaseId, string>;
    };
    translation: {
      heading: (values: LanguageValues) => string;
      show: string;
      update: string;
      hide: string;
      inProgress: string;
      unavailableError: string;
      rateLimitedError: string;
      monthlyQuotaError: string;
      tooLong: (values: TranslationLimitValues) => string;
      unofficialFallbackNotice: string;
    };
    feedback: {
      heading: (values: LanguageValues) => string;
      estimatedLevel: (values: FeedbackLevelValues) => string;
      generatedInOtherLanguage: (values: { generatedLanguage: string; selectedLanguage: string }) => string;
      stale: string;
      correctedText: string;
      errors: (values: ErrorCountValues) => string;
      suggestions: string;
      errorCategories: Record<FeedbackErrorCategory, string>;
    };
    correctionModal: {
      title: (values: { taskLabel: string }) => string;
      submissionId: (values: { id: string }) => string;
      loading: string;
      statusEvaluated: string;
      wordCount: (values: WordCountValues) => string;
      // secureLevel is the level actually assigned to the student
      // (feedback.cefr.conservativeLevel) for a *current*-provenance
      // correction (cefrAssessment === "current") -- demonstratedLevel is the
      // higher, less-consistently-shown level (feedback.cefr.estimatedLevel),
      // always displayed alongside it in the CEFR card so the two results the
      // methodology tab promises are never shown as just one ambiguous number.
      secureLevel: (values: FeedbackLevelValues) => string;
      demonstratedLevel: (values: FeedbackLevelValues) => string;
      // Used instead of secureLevel/demonstratedLevel for a *legacy*-provenance
      // correction (cefrAssessment === "legacy"): the old schema recorded one
      // CEFR level with no Demonstrated/Secure distinction, so presenting it
      // with either of those specific labels would claim a consistency check
      // that was never actually performed.
      previouslyRecordedLevel: (values: FeedbackLevelValues) => string;
      // A provenance-agnostic label for a single CEFR badge where the
      // rendering code cannot cheaply know whether the record is current or
      // legacy (the history list's compact rows, and the limited-detail
      // fallback when even legacy migration failed) -- deliberately makes no
      // Secure/Demonstrated claim either way.
      recordedLevel: (values: FeedbackLevelValues) => string;
      cefrRationaleHeading: string;
      cefrEstimateDisclosure: string;
      cefrEvidenceHeading: string;
      cefrBlockerHeading: string;
      cefrConfidenceHeading: string;
      cefrConfidenceLevels: Record<FeedbackCefrConfidence, string>;
      // Placeholder content for evidence/blocker on a correction migrated
      // from before those fields existed -- see migrateLegacyStoredFields in
      // correction-history.ts. Distinct from cefrConfidenceLevels.Unknown
      // (the confidence badge itself); this is the body text.
      legacyCefrDetailUnavailable: string;
      // Prefixed onto the rationale of a migrated legacy record: the old
      // schema recorded one CEFR level with no Demonstrated/Secure
      // distinction, so estimatedLevel and conservativeLevel are the same
      // recorded value here, not two independently assessed ones -- this
      // says so rather than letting the Secure-level badge imply a
      // consistency check that was never actually performed.
      legacyCefrLevelNote: string;
      downloadPdf: string;
      viewCorrection: string;
      tabOverview: string;
      scoreDisclosure: string;
      globalPerformanceHeading: string;
      overallScore: (values: { score: number }) => string;
      overallScoreDescription: string;
      tabCompared: string;
      tabComments: string;
      tabMethodology: string;
      methodology: MethodologyBlock[];
      contentScoreLabel: string;
      linguisticsScoreLabel: string;
      vocabularyScoreLabel: string;
      originalHeading: string;
      correctedHeading: string;
      correctionsHeading: (values: ErrorCountValues) => string;
      noCorrectionsNote: string;
      errorLabel: string;
      correctionLabel: string;
      noteLabel: string;
      toggleNote: string;
      commentsHeading: string;
      modelVersionHeading: string;
      tryAgain: string;
    };
    dialog: {
      title: string;
      taskSwitchDescription: string;
      topicSwitchDescription: string;
      dashboardSwitchDescription: string;
      adminSwitchDescription: string;
      exampleOverwriteDescription: string;
      exampleOverwriteConfirm: string;
      clearDraftDescription: string;
      clearDraftConfirm: string;
      confirm: string;
      cancel: string;
    };
  };
}

// This dictionary intentionally contains only product-chrome copy. TCF task
// instructions, exam prompts, and the French essay placeholder remain French
// regardless of the learner's interface language.
export const APP_COPY = {
  en: {
    common: {
      cancel: "Cancel",
      close: "Close",
    },
    nav: {
      dashboard: "Dashboard",
      tasks: "Full task",
      practice: "Practice",
      settings: "Settings",
      admin: "Admin",
      logIn: "Log in",
      closeSettingsFirst: "Close Settings first",
    },
    home: {
      title: "Write for the TCF exam. Get feedback that gets you to B2, C1 or C2.",
      description:
        "Practice Task 1, 2, and 3 essays, then get grammar, vocabulary, and CEFR-level feedback in seconds.",
      startATask: "Start a task",
      getStarted: "Get started",
    },
    practice: {
      tasks: {
        TASK_1: { title: "Task 1", description: "Communicate effectively in a short message, for the right reader and in the right register." },
        TASK_2: { title: "Task 2", description: "Recount and comment on an experience in an email or blog post for specific readers." },
        TASK_3: { title: "Task 3", description: "Compare viewpoints and defend a nuanced position on a social issue." },
      },
      levels: {
        B2: { title: "B2", description: "Clear, connected and sufficiently developed ideas." },
        C1: { title: "C1", description: "Flexible organisation, connected viewpoints and nuance." },
        C2: { title: "C2", description: "Very precise, autonomous control adapted to the situation." },
      },
      stages: { recognize: "Recognise", complete: "Complete", transform: "Transform", organize: "Organise", develop: "Develop", produce: "Produce" },
      completedEyebrow: "Sequence complete",
      completedTitle: ({ part }) => `You practised: ${part}`,
      completedDescription: ({ outcome }) => `You moved from recognition to independent writing. Keep this in mind for your next full response: ${outcome}`,
      nextActionDescription: "Next, apply this task part in a complete TCF task or continue with another part.",
      replayWithVariants: "Replay with new variants",
      startFresh: "Start fresh",
      chooseAnotherPart: "Choose another task part",
      tryFullTask: "Try a full task",
      eyebrow: "Focused practice",
      title: "Work on one part of the task at a time.",
      description: "This is not an exam simulation. Choose a task, your target level and a task part; you will then follow a fixed, reviewed progression from recognition to independent writing.",
      chooseTask: "1. Which task would you like to improve?",
      chooseLevel: "2. What is your target level?",
      levelHelp: "Choose a task first: difficulty is linked to its writing purpose.",
      choosePart: "3. Part to work on",
      partPlaceholder: "Part to work on",
      partLabel: ({ order }) => `Part ${order}`,
      previewEyebrow: "Your practice plan",
      previewTitle: ({ part }) => `Practise: ${part}`,
      previewOutcomeLabel: "By the end, you will be able to:",
      previewStagesLabel: "Your six stages",
      resumeEyebrow: "Saved on this device",
      resumeTitle: ({ part }) => `Resume: ${part}`,
      resumeDescription: ({ step, total }) => `Continue at step ${step} of ${total}.`,
      localSessionNotice: "Your responses are stored only in this browser until you finish or discard this session.",
      resumeSession: "Resume practice",
      discardSavedSession: "Discard saved session",
      durationAndSteps: ({ minutes, steps }) => `${minutes} min · ${steps} curated exercises`,
      unavailableCombination: "This combination does not yet have an approved sequence. Choose another level or task: we never display automatically generated exercises.",
      unavailableTitle: ({ task, level }) => `${task} at ${level} is not available yet`,
      unavailableDescription: "This set of task parts is still being reviewed. Choose an available level below to practise this task now.",
      availableLevelsLabel: "Available levels for this task:",
      availableLevel: ({ level, parts }) => `${level} · ${parts} ${parts === 1 ? "task part" : "task parts"}`,
      partHelp: "The available task parts follow the chosen task and target level.",
      changePart: "← Change task part",
      sequenceDescription: ({ count }) => `This practice set contains ${count} reviewed exercises in a guided progression.`,
      progress: ({ step, total }) => `Step ${step} of ${total}`,
      stageMap: ({ current, next }) => (next ? `Now: ${current}. Next: ${next}.` : `Now: ${current}. This is your final stage.`),
      attentionLabel: "Focus point:",
      selectAnswer: "Choose your answer",
      selectOrder: "Choose the most logical order",
      reorderItems: "Reorder the items",
      moveUp: "Move up",
      moveDown: "Move down",
      responseLabel: "Your response in French",
      responsePlaceholder: "Write your response in French…",
      suggestionPlaceholder: "Write your proposal in French…",
      correctFeedback: "Well done.",
      selfReviewFeedback: "Review your writing with this checklist.",
      retryFeedback: "Not yet — edit your response and try again.",
      revealedFeedback: "Here is the reviewed answer. Use it to understand the writing move, then continue when you are ready.",
      reviewedAnswerLabel: "Reviewed answer:",
      explanationLabel: "Why this works:",
      completedWithHelpLabel: "Completed with help",
      finishSequence: "Finish the sequence",
      nextExercise: "Next exercise",
      selfReview: "See my self-check checklist",
      showHint: "Show a hint",
      hideHint: "Hide hint",
      hintLabel: "A way to begin:",
      hintNotice: "This is a suggestion, not an answer. Keep writing in your own words.",
      verify: "Check",
      revealAnswer: "Show the answer",
      retryHint: "You can edit your response and try again as many times as you need.",
      difficultyPrompt: "Optional: how did this exercise feel?",
      difficultyTooEasy: "Too easy",
      difficultyAppropriate: "Appropriate",
      difficultyTooHard: "Too hard",
      difficultyRecorded: "Thanks — recorded for this practice session.",
    },
    login: {
      title: "Log in",
      emailLabel: "Email",
      passwordLabel: "Password",
      invalidCredentials: "Invalid email or password.",
      submitting: "Logging in…",
      submit: "Log in",
      noAccount: "No account yet?",
      signUp: "Sign up",
    },
    signup: {
      title: "Create your account",
      nameLabel: "Name",
      emailLabel: "Email",
      passwordLabel: "Password",
      invalidInput: "Enter a valid email and a password of at least 8 characters.",
      emailInUse: "An account with this email already exists.",
      genericError: "Something went wrong. Please try again.",
      automaticLoginFailed: "Account created, but automatic login failed. Please log in.",
      submitting: "Creating account…",
      submit: "Sign up",
      alreadyHaveAccount: "Already have an account?",
      logIn: "Log in",
    },
    dashboard: {
      welcome: (name) => `Welcome back, ${name}`,
      startHereEyebrow: "Your first step",
      startHereTitle: "How would you like to start?",
      startHereDescription: "Choose focused skill practice or a complete TCF writing task. Your progress will appear here after your first activity.",
      practiceStartTitle: "Train a skill first",
      practiceStartDescription: "Work on one part of a task step by step, from guided practice to independent writing.",
      practiceStartAction: "Go to Practice",
      tasksStartTitle: "Try a full task",
      tasksStartDescription: "Write a full TCF response, then receive feedback on your writing.",
      tasksStartAction: "Go to Full task",
      practiceActivityTitle: "Practice activity",
      practiceExercisesCompleted: ({ count }) => `${count} exercise${count === 1 ? "" : "s"} completed`,
      practiceCompletionBreakdown: ({ independent, helped }) => `${independent} independently · ${helped} with help`,
      practiceTaskPartsCompleted: ({ count }) => `${count} task part${count === 1 ? "" : "s"} trained`,
      continuePractice: "Continue Practice",
      practiceActionsMenu: "More options",
      clearPracticeProgressAction: "Clear progress",
      clearPracticeProgressConfirmTitle: "Clear all practice progress?",
      clearPracticeProgressConfirmDescription:
        "This removes every completed exercise and trained task part. You'll start every sequence fresh next time. This can't be undone.",
      clearPracticeProgressConfirm: "Clear progress",
      clearPracticeProgressError: "Couldn't clear your practice progress. Please try again.",
      clearPracticeProgressSuccess: "Practice progress cleared.",
      accountUnavailableTitle: "Your account needs to be set up",
      accountUnavailableDescription:
        "We can’t connect this Clerk account to your MyTCFLab data yet. Try again in a moment. If you already had an account, it needs to be imported first.",
      chartTitle: "Estimated CEFR trend",
      chartCaption: ({ count }) => `Last ${count} attempts per task`,
      emptyTitle: "No corrected essays yet",
      emptyDescription: "Complete a task and get it corrected to start tracking your CEFR level over time.",
      taskLegend: ({ number }) => `Task ${number}`,
      levelAxisLabel: "CEFR level",
      attemptAxisLabel: "Attempt",
      recentCorrectionsTitle: "Recent corrections",
      viewAllCorrections: "View all correction history",
      correctionHistoryTitle: "Correction history",
      noCorrectionHistoryTitle: "No corrections yet",
      noCorrectionHistoryDescription: "Your corrected submissions will appear here.",
      limitedCorrectionDetails: "Detailed review is unavailable for this earlier correction.",
      backToCorrectionHistory: "Back to correction history",
      backToDashboard: "Back to dashboard",
      attemptedOn: ({ date }) => `Corrected ${date}`,
      correctionActionsMenu: "More options",
      deleteCorrectionAction: "Delete",
      deleteCorrectionConfirmTitle: "Delete this correction?",
      deleteCorrectionConfirmDescription:
        "This will permanently delete this response and its feedback. This can't be undone.",
      deleteCorrectionConfirm: "Delete",
      deleteCorrectionError: "Couldn't delete this correction. Please try again.",
      deleteCorrectionSuccess: "Correction deleted.",
    },
    settings: {
      title: "Settings",
      appearanceHeading: "Appearance",
      appearanceDescription: "Choose how MyTCFLab looks on this device, including sign-in and sign-up.",
      themeLight: "Light",
      themeDark: "Dark",
      themeSystem: "Match system",
      languageHeading: "Language",
      languageDescription: "Choose the language used across the interface, feedback, and translation panel.",
      helpHeading: "Help & support",
      helpDescription: "Have a question or found a problem? Reach out and we'll help.",
    },
    walkthrough: {
      takeATour: "Take a tour",
      stepProgress: ({ step, total }) => `Step ${step} of ${total}`,
      next: "Next",
      back: "Back",
      skip: "Skip",
      finish: "Finish",
      continueToPractice: "Continue to Practice",
      continueToFullTask: "Continue to Full task",
      dashboardWelcomeTitle: "Welcome to MyTCFLab",
      dashboardWelcomeBody:
        "This is your dashboard — your CEFR level over time and your recent corrections will show up here once you've written a few.",
      dashboardCorrectionsTitle: "Your recent corrections",
      dashboardCorrectionsBody:
        "Every corrected essay's score and estimated level appear below the chart, so you can track exactly how each attempt went.",
      settingsTitle: "Make the app yours",
      settingsBody: "Open Settings to choose the interface language and appearance, or find help and support whenever you need it.",
      dashboardPracticeTitle: "Build a task part before writing the whole response",
      dashboardPracticeBody: "Practice is your writing trainer. It helps you rehearse one numbered part of a TCF task at your target level before you attempt a complete response.",
      dashboardStartWritingTitle: "Ready for a full task?",
      dashboardStartWritingBody: "Open Full task to choose an exam prompt and get your first correction.",
      practiceIntroTitle: "Practice builds a part of the task",
      practiceIntroBody: "This page is not an exam simulation. Choose one task part to practise in a progressive, curated sequence before you write a full TCF response.",
      practicePartsTitle: "The parts stay the same; the level changes the demand",
      practicePartsBody: "Each task has a fixed numbered structure. B2, C1 and C2 practise the same part, but with increasingly independent, precise and nuanced language. Only reviewed paths can be started.",
      practiceStagesTitle: "Six stages, from recognition to independent writing",
      practiceStagesBody: "Every part follows the same fixed plan: Recognise, Complete, Transform, Organise, Develop, then Produce. Each stage removes a little more support, so you finish able to write it yourself. When you are ready, open Full task to apply what you trained in a complete TCF response.",
      taskPickerTitle: "Choose a task",
      taskPickerBody:
        "TCF written expression has three task types: Tâche 1 (communicate effectively in a short message, for the right reader and in the right register), Tâche 2 (recount an experience for several readers, with commentary suited to its purpose), and Tâche 3 (analyze a topic from different points of view). We'll walk through Tâche 1 as an example.",
      topicPickerTitle: "Choose an exam prompt",
      topicPickerBody:
        "Recent exam prompts are pulled directly from real, recently published TCF exams on this site, so you always practise with an authentic prompt. You can also paste in your own prompt instead.",
      timedTaskTourTitle: "Practise under exam conditions",
      timedTaskTourBody: "Start a timed task when you want to rehearse the real time pressure of the exam. It tracks the suggested time for this task and keeps running in the background while you write.",
      guidedWritingTitle: "Plan before you write",
      guidedWritingBody:
        "Open the Writing guide when you need ideas. Choose the writing situation, then use its planning questions, French phrases, and suggested verb tenses for your target level.",
      editorTitle: "Write your response",
      editorBody:
        "Write your response in French here — we've pasted in a sample response so you can see how the rest of the tour works. The word count updates as you type.",
      correctButtonTitle: "Get feedback",
      correctButtonBody:
        "When you're ready, click Correct to get grammar, vocabulary, and CEFR-level feedback. Let's see what that looks like.",
      correctionModalTitle: "Your correction",
      correctionModalBody:
        "Your corrected text, an estimated CEFR level, and detailed comments open right here. The Overview, Compared, and Comments tabs break everything down.",
      exampleGenerateTitle: "Need inspiration?",
      exampleGenerateBody:
        "Generate Example writes a full model answer at the CEFR level you choose, so you can see what a strong response looks like. We won't generate one during the tour — try it any time.",
      editorCopyTitle: "Copy your text",
      editorCopyBody:
        "Copy sends your response to the clipboard, handy for pasting it into a document or an official practice test.",
      editorClearTitle: "Start over",
      editorClearBody: "Clear empties the response so you can start a fresh draft.",
      translationTitle: "Translate your response",
      translationBody:
        "Show translation translates your response into your interface language, so you can check your meaning without leaving the page. It only translates on demand, and only whatever you've added since the last time, to save your translation quota.",
      navTitle: "Your progress",
      navBody: "Come back here any time to see your correction history and estimated level over time.",
      previewFeedback: {
        summary:
          "Solid, natural French overall — two small agreement mistakes are the only things holding this back from a higher score.",
        cefrRationale:
          "The vocabulary and sentence structure are appropriate for B1, but the two agreement errors below are the main blocker to B2.",
        cefrEvidence: "Clear, accurate everyday vocabulary and mostly correct sentence structure throughout the response.",
        cefrBlocker: "The two agreement errors below are the main thing preventing a B2 estimate.",
        wordCountNote: "Within the target range for this task.",
        contentNote: "Clearly answers the prompt with relevant, well-organized details.",
        linguisticsNote: "Mostly accurate grammar, with two past-participle agreement errors.",
        vocabularyNote: "Good everyday vocabulary and a natural, friendly tone.",
        agreementErrorExplanation:
          "The past participle must agree in gender and number with a preceding direct object.",
        participleErrorExplanation:
          "With être, the past participle agrees with the subject — “resté” needs an “s” to match “nous”.",
        suggestionOne: "Review past-participle agreement rules for avoir and être verbs.",
        suggestionTwo: "Try reading your draft aloud — agreement mistakes are often easier to hear than to see.",
      },
    },
    workspace: {
      task: {
        heading: "1. Choose a task",
        targetLength: ({ minWords, maxWords }) => `Target length: ${minWords}–${maxWords} words.`,
      },
      topic: {
        heading: "2. Choose an exam prompt",
        recentExamTitle: "Get a prompt from recent exams",
        recentExamDescription: "Load an authentic prompt for the task you selected.",
        customTitle: "Write or paste my own prompt",
        customDescription: "Use an exam prompt you already have.",
        loading: "Getting a prompt from recent exams…",
        fetchError: "We couldn't get a prompt from recent exams. Please try again or write your own.",
        unavailableError: "The recent-exam prompt was unavailable. Please try again or write your own.",
        notPublishedError:
          "No recent-exam prompts have been published for this month or the previous month. Write or paste your own prompt.",
        selectedRecentExamAriaLabel: "Selected recent-exam prompt",
        sourceLabel: "Source:",
        recentExamsSource: ({ month }) => `Recent exams — ${month}`,
        customTopicLabel: "Your exam prompt",
        customTopicPlaceholder: "Paste or write the exam prompt you want to respond to…",
      },
      editor: {
        heading: "3. Write",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} words`,
        responseLabel: "Your response",
        frenchResponsePlaceholder: "Rédigez votre réponse ici, en français…",
        correct: "Correct",
        correcting: "Correcting…",
        correctingStatus: "Getting your feedback. This can take a moment.",
        genericCorrectionError: "Something went wrong.",
        alreadyCorrected:
          "This version has already been corrected. Edit your response or exam prompt to request a new correction.",
        correctionInProgress:
          "A correction for this exact response is already in progress. Wait for it to finish or edit the response or exam prompt before requesting another one.",
        exampleLevelLabel: "Target level",
        generateExample: "Generate example",
        generatingExample: "Generating…",
        generatingExampleStatus: "Generating an example response. This can take a moment.",
        exampleRateLimitedError: "The example generator is busy. Please try again shortly.",
        exampleDailyLimitError: "You've reached today's example limit. Please try again tomorrow.",
        exampleUnavailableError: "The example generator isn't available right now.",
        exampleGenericError: "We couldn't generate an example. Please try again.",
        exampleNeedsTopicWarning:
          "Choose an exam prompt from recent exams or paste your own before generating an example.",
        copy: "Copy text",
        copied: "Copied!",
        copyFailed: "Couldn't copy",
        clear: "Clear text",
      },
      guidedWriting: {
        show: "Writing guide",
        hide: "Hide writing guide",
        heading: "Writing guide",
        guideForLevel: ({ level }) => `Guide for ${level}`,
        contextConfirmHeading: "Writing situation",
        contextConfirmPrompt: "Who are you writing to?",
        contextConfirmTextTypePrompt: "What type of text are you writing, and for which readers?",
        contextConfirmAction: "Use this",
        changeContext: "Change",
        contextLabel: ({ profile }) => `Style: ${profile}`,
        previousStage: "Previous step",
        nextStage: "Next step",
        optionalStep: "Optional",
        ideasLabel: "What can you say?",
        tensesLabel: "Verb tenses to consider",
        tensesHint: "Use only what fits your subject — accurate French matters more than using many tenses.",
        completionCheckLabel: "Before you finish",
        // Kept in French like the phrase bank itself (see guided-writing.ts)
        // rather than translated per interface locale -- these are French
        // formulas the learner will use in their French text, regardless of
        // which language the rest of the app's chrome is shown in.
        examplesLabel: "Formules à adapter à votre sujet",
        morePhrases: "Voir plus de formules",
      },
      timedTask: {
        show: "Timed task",
        heading: "Timed task",
        suggestedTotalTime: ({ minutes }) => `Suggested time for this task: ${minutes} min`,
        phaseDuration: ({ label, minutes }) => `${label} · ${minutes} min`,
        start: "Start timed task",
        pause: "Pause",
        paused: "Paused",
        resume: "Resume",
        end: "End",
        remaining: ({ minutes, seconds }) => `${minutes}:${seconds} remaining`,
        timeUp: "Time is up — finish or keep writing.",
        continueForTwoMinutes: "Add 2 minutes",
        summaryHeading: "Timed task summary",
        summaryActualTime: ({ time }) => `Time spent: ${time}`,
        summaryTargetTime: ({ time }) => `Target time: ${time}`,
        summaryWordCount: ({ count }) => `Words: ${count}`,
        summaryPhaseReached: "Reached",
        summaryPhaseNotReached: "Not reached",
        summaryClose: "Close summary",
        phaseLabels: {
          plan: "Plan",
          write: "Write",
          analyse: "Analyse the documents",
          synthesise: "Summarise both viewpoints",
          argue: "State and support your position",
          check: "Check and finish",
        },
        phasePrompts: {
          plan: "Identify the audience, purpose, and a simple structure before writing.",
          write: "Cover every requested point and keep your ideas connected.",
          analyse: "Read both documents and identify the central idea in each.",
          synthesise: "Present both viewpoints before giving your own opinion.",
          argue: "Give a clear position with two or three developed arguments.",
          check: "Check the word range, register, agreements, accents, and verb forms.",
        },
      },
      translation: {
        heading: ({ language }) => `Translation (${language})`,
        show: "Show translation",
        update: "Update translation",
        hide: "Hide translation",
        inProgress: "Translating…",
        unavailableError: "Translation is unavailable right now.",
        rateLimitedError: "You’re translating too quickly. Please wait a moment and try again.",
        monthlyQuotaError: "You’ve reached this month’s translation limit. Please try again next month.",
        tooLong: ({ maxCharacters }) =>
          `Translation is available for drafts up to ${maxCharacters} characters. This draft is longer — submit it for correction to see full feedback.`,
        unofficialFallbackNotice:
          "This translation used an unofficial backup method, not the DeepL API. It may be less accurate and can be briefly unavailable.",
      },
      feedback: {
        heading: ({ language }) => `Feedback (${language})`,
        estimatedLevel: ({ level }) => `Estimated CEFR / CECRL level: ${level}`,
        generatedInOtherLanguage: ({ generatedLanguage, selectedLanguage }) =>
          `This feedback was generated in ${generatedLanguage}. It remains available in that language while the interface is in ${selectedLanguage}.`,
        stale: "You've edited your response since this feedback. Correct again for feedback on your latest draft.",
        correctedText: "Corrected text",
        errors: ({ count }) => `Errors (${count})`,
        suggestions: "Suggestions",
        errorCategories: {
          grammar: "Grammar",
          vocabulary: "Vocabulary",
          spelling: "Spelling",
          syntax: "Syntax",
          punctuation: "Punctuation",
          register: "Register",
        },
      },
      correctionModal: {
        title: ({ taskLabel }) => `Correction: ${taskLabel}`,
        submissionId: ({ id }) => `Submission ID: ${id}`,
        loading: "Preparing your detailed correction…",
        statusEvaluated: "Evaluated",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} words`,
        secureLevel: ({ level }) => `Secure level: ${level}`,
        demonstratedLevel: ({ level }) => `Demonstrated level: ${level}`,
        previouslyRecordedLevel: ({ level }) => `Previously recorded level: ${level}`,
        recordedLevel: ({ level }) => `Recorded level: ${level}`,
        cefrRationaleHeading: "Why this estimate",
        cefrEstimateDisclosure:
          "This automated estimate is based on this submitted response. A requested C1/C2 study-example level is a target, not a verified result.",
        cefrEvidenceHeading: "Evidence from your writing",
        cefrBlockerHeading: "What's holding back the next level",
        cefrConfidenceHeading: "Confidence in this estimate",
        cefrConfidenceLevels: { High: "High", Medium: "Medium", Low: "Low", Unknown: "Not assessed (older correction)" },
        legacyCefrDetailUnavailable: "Not recorded separately for this earlier correction — see the rationale above.",
        legacyCefrLevelNote:
          "This correction predates the Demonstrated/Secure level distinction — the level below is the single estimate recorded at the time, not a separately verified secure level.",
        downloadPdf: "Print / Save as PDF",
        viewCorrection: "View correction",
        tabOverview: "Overview & scores",
        scoreDisclosure: "mytcflab learning indicators - not official TCF.",
        globalPerformanceHeading: "Global performance",
        overallScore: ({ score }) => `Overall learning indicator: ${score}%`,
        overallScoreDescription: "Average of the three mytcflab learning indicators below.",
        tabCompared: "Compared text",
        tabComments: "Feedback & tips",
        tabMethodology: "How it was evaluated",
        methodology: [
          {
            kind: "paragraph",
            text: "The evaluation is designed to help you understand **as accurately as possible where you are today** and what you need to improve to reach your goal on the TCF Canada.",
          },
          { kind: "heading", text: "1. First, we check whether you completed the task correctly" },
          {
            kind: "paragraph",
            text: "Writing good French is not enough. You need to **do exactly what the task asks you to do**.",
          },
          { kind: "paragraph", text: "We therefore check whether you:" },
          {
            kind: "list",
            items: [
              "answered all the required points",
              "developed your ideas sufficiently",
              "respected the situation presented",
              "used the appropriate tone",
              "organized the information clearly",
              "fulfilled the purpose of the task",
            ],
          },
          {
            kind: "paragraph",
            text: "Each TCF task requires different skills. For this reason, Tâche 1, Tâche 2, and Tâche 3 are evaluated slightly differently.",
          },
          { kind: "heading", text: "2. Then, we evaluate the quality of your French" },
          { kind: "paragraph", text: "We mainly assess:" },
          {
            kind: "list",
            items: [
              "grammar",
              "verb conjugation",
              "sentence structure",
              "spelling",
              "vocabulary",
              "word choice and precision",
              "connectors",
              "organization of ideas",
              "register and naturalness",
            ],
          },
          {
            kind: "paragraph",
            text: "We do not evaluate your level simply by looking at whether you can use difficult words.",
          },
          { kind: "paragraph", text: "What matters most is whether you can **use French accurately and consistently**." },
          { kind: "heading", text: "3. Your B2, C1, or C2 level is assessed conservatively" },
          { kind: "paragraph", text: "The evaluation does not try to find the highest possible level in your text." },
          {
            kind: "paragraph",
            text: "For example, writing one very sophisticated sentence does not automatically mean that your level is C1.",
          },
          {
            kind: "paragraph",
            text: "To consider you C1, C1-level characteristics need to appear **consistently throughout your writing**. The same principle applies to C2.",
          },
          {
            kind: "paragraph",
            text: "Therefore, when your writing falls between two levels, we use the lower level until you demonstrate the higher level consistently.",
          },
          { kind: "example", text: "B2/C1 → B2" },
          {
            kind: "paragraph",
            text: "This does not mean that you are incapable of producing some C1-level sentences. It simply means that we need to see that quality more consistently before considering C1 a secure level.",
          },
          { kind: "heading", text: "4. You will receive two important results" },
          { kind: "paragraph", text: "**Demonstrated level:** the highest level that appears in your writing." },
          { kind: "paragraph", text: "**Secure level:** the level you demonstrate consistently." },
          { kind: "example", text: "Demonstrated level: C1 — Secure level: B2" },
          {
            kind: "paragraph",
            text: "This means that your writing shows some C1 characteristics, but there are still important weaknesses preventing C1 from being considered a secure level.",
          },
          {
            kind: "paragraph",
            text: "This distinction is important because the goal is not simply to say that you \"look like a C1.\" The goal is to determine **which level you can reproduce reliably on exam day**.",
          },
          { kind: "heading", text: "5. You will also receive a score from 0 to 100" },
          { kind: "paragraph", text: "This score is only a learning tool. It evaluates three areas:" },
          {
            kind: "list",
            items: [
              "**Content and Task Fulfillment** — Did you answer the task effectively?",
              "**French** — How good are your grammar, spelling, and sentence construction?",
              "**Vocabulary and Register** — Do you use varied, precise, and appropriate language for the situation?",
            ],
          },
          {
            kind: "paragraph",
            text: "These scores **are not official TCF scores** and should not be directly interpreted as a TCF score or CEFR level.",
          },
          { kind: "heading", text: "6. You will receive corrections for your mistakes" },
          {
            kind: "paragraph",
            text: "For each important error, we will show: **What you wrote → How to correct it → Why it is incorrect**",
          },
          {
            kind: "paragraph",
            text: "This helps you identify recurring mistakes and focus your practice on the areas that need the most improvement.",
          },
          { kind: "heading", text: "7. You will also receive a model version" },
          {
            kind: "paragraph",
            text: "After the correction, you will receive an improved version of the text. This version is designed to help you study:",
          },
          {
            kind: "list",
            items: [
              "new vocabulary",
              "grammatical structures",
              "connectors",
              "ways to develop arguments",
              "more natural ways of expressing ideas",
            ],
          },
          {
            kind: "paragraph",
            text: "But remember: **the model version is not used to determine your level.** Your level is determined only from the text you originally submitted.",
          },
          { kind: "heading", text: "The goal of the evaluation" },
          {
            kind: "paragraph",
            text: "The purpose is not to give you a high score just to make you feel good. It is also not to look for mistakes simply to lower your score.",
          },
          { kind: "paragraph", text: "The goal is to answer one simple question:" },
          { kind: "example", text: "\"If I took a similar test today, what level could I demonstrate with confidence?\"" },
          {
            kind: "paragraph",
            text: "This way, you will know exactly **where you are, what is preventing you from reaching the next level, and what you need to practice** before taking the TCF Canada.",
          },
        ],
        contentScoreLabel: "Content & pragmatics",
        linguisticsScoreLabel: "Linguistics",
        vocabularyScoreLabel: "Vocabulary & register",
        originalHeading: "Your original text",
        correctedHeading: "Corrected text",
        correctionsHeading: ({ count }) => `Corrections (${count})`,
        noCorrectionsNote: "No specific corrections were identified.",
        errorLabel: "Error",
        correctionLabel: "Correction",
        noteLabel: "Note",
        toggleNote: "Show or hide note",
        commentsHeading: "Automated feedback",
        modelVersionHeading: "mytcflab generated model version",
        tryAgain: "Try again",
      },
      dialog: {
        title: "Discard your current work?",
        taskSwitchDescription: "Switching tasks will discard your current exam prompt, draft, and feedback.",
        dashboardSwitchDescription: "Going to the dashboard will discard your current exam prompt, draft, and feedback.",
        adminSwitchDescription: "Going to Admin will discard your current exam prompt, draft, and feedback.",
        topicSwitchDescription: "Switching exam prompts will discard your current prompt, draft, and feedback.",
        exampleOverwriteDescription: "Generating an example will replace your current draft.",
        exampleOverwriteConfirm: "Replace draft",
        clearDraftDescription: "Clearing will discard your current draft and feedback.",
        clearDraftConfirm: "Clear text",
        confirm: "Discard and switch",
        cancel: "Keep working",
      },
    },
  },
  fr: {
    common: {
      cancel: "Annuler",
      close: "Fermer",
    },
    nav: {
      dashboard: "Tableau de bord",
      tasks: "Tâche complète",
      practice: "Pratique",
      settings: "Paramètres",
      admin: "Admin",
      logIn: "Se connecter",
      closeSettingsFirst: "Fermez d’abord les paramètres",
    },
    home: {
      title: "Préparez l’expression écrite du TCF. Recevez des commentaires qui vous aident à atteindre le niveau B2, C1 ou C2.",
      description:
        "Entraînez-vous aux tâches 1, 2 et 3, puis recevez en quelques secondes des commentaires sur la grammaire, le vocabulaire et votre niveau du CECRL.",
      startATask: "Commencer une tâche",
      getStarted: "Commencer",
    },
    practice: {
      tasks: {
        TASK_1: { title: "Tâche 1", description: "Communiquer efficacement dans un message court, avec le bon destinataire et le bon registre." },
        TASK_2: { title: "Tâche 2", description: "Raconter et commenter une expérience dans un e-mail ou un billet de blog pour des lecteurs précis." },
        TASK_3: { title: "Tâche 3", description: "Comparer des points de vue et défendre une position nuancée sur un sujet de société." },
      },
      levels: {
        B2: { title: "B2", description: "Idées claires, reliées et suffisamment développées." },
        C1: { title: "C1", description: "Organisation flexible, points de vue mis en relation et nuance." },
        C2: { title: "C2", description: "Maîtrise très précise, autonome et adaptée à la situation." },
      },
      stages: { recognize: "Reconnaître", complete: "Compléter", transform: "Transformer", organize: "Organiser", develop: "Développer", produce: "Produire" },
      completedEyebrow: "Séquence terminée",
      completedTitle: ({ part }) => `Vous avez travaillé : ${part}`,
      completedDescription: ({ outcome }) => `Vous êtes passé·e de la reconnaissance à la production autonome. Gardez ce repère pour votre prochaine rédaction complète : ${outcome}`,
      nextActionDescription: "Réutilisez maintenant cette partie dans une tâche TCF complète ou choisissez une autre partie.",
      replayWithVariants: "Rejouer avec de nouvelles variantes",
      startFresh: "Commencer une nouvelle séance",
      chooseAnotherPart: "Choisir une autre partie de la tâche",
      tryFullTask: "Essayer une tâche complète",
      eyebrow: "Entraînement ciblé",
      title: "Travaillez une partie de la tâche à la fois.",
      description: "Ce n’est pas une simulation d’examen. Choisissez une tâche, votre niveau cible et une partie de la tâche ; vous suivrez ensuite une progression fixe et validée, de la reconnaissance à la production autonome.",
      chooseTask: "1. Quelle tâche voulez-vous améliorer ?",
      chooseLevel: "2. Quel est votre niveau cible ?",
      levelHelp: "Choisissez d’abord une tâche : la difficulté est liée à son objectif d’écriture.",
      choosePart: "3. Partie à travailler",
      partPlaceholder: "Partie à travailler",
      partLabel: ({ order }) => `Partie ${order}`,
      previewEyebrow: "Votre plan d’entraînement",
      previewTitle: ({ part }) => `Entraîner : ${part}`,
      previewOutcomeLabel: "À la fin, vous saurez :",
      previewStagesLabel: "Vos six étapes",
      resumeEyebrow: "Enregistré sur cet appareil",
      resumeTitle: ({ part }) => `Reprendre : ${part}`,
      resumeDescription: ({ step, total }) => `Reprenez à l’étape ${step} sur ${total}.`,
      localSessionNotice: "Vos réponses restent uniquement dans ce navigateur jusqu’à la fin ou à la suppression de cette séance.",
      resumeSession: "Reprendre l’entraînement",
      discardSavedSession: "Supprimer la séance enregistrée",
      durationAndSteps: ({ minutes, steps }) => `${minutes} min · ${steps} exercices sélectionnés`,
      unavailableCombination: "Cette combinaison n’a pas encore de séquence validée. Choisissez un autre niveau ou une autre tâche : nous n’affichons jamais d’exercice généré automatiquement.",
      unavailableTitle: ({ task, level }) => `${task} au niveau ${level} n’est pas encore disponible`,
      unavailableDescription: "Ces parties de la tâche sont encore en cours de validation. Choisissez ci-dessous un niveau disponible pour vous entraîner dès maintenant.",
      availableLevelsLabel: "Niveaux disponibles pour cette tâche :",
      availableLevel: ({ level, parts }) => `${level} · ${parts} ${parts === 1 ? "partie" : "parties"}`,
      partHelp: "Les parties disponibles suivent la tâche et le niveau cible que vous choisissez.",
      changePart: "← Changer de partie de la tâche",
      sequenceDescription: ({ count }) => `Cette série contient ${count} exercices validés dans une progression guidée.`,
      progress: ({ step, total }) => `Étape ${step} sur ${total}`,
      stageMap: ({ current, next }) => (next ? `En cours : ${current}. Prochaine étape : ${next}.` : `En cours : ${current}. C’est votre dernière étape.`),
      attentionLabel: "Point d’attention :",
      selectAnswer: "Choisissez votre réponse",
      selectOrder: "Choisissez l’ordre le plus logique",
      reorderItems: "Réorganisez les éléments",
      moveUp: "Monter",
      moveDown: "Descendre",
      responseLabel: "Votre réponse en français",
      responsePlaceholder: "Écrivez votre réponse en français…",
      suggestionPlaceholder: "Écrivez votre proposition en français…",
      correctFeedback: "Bien vu.",
      selfReviewFeedback: "Relisez votre production avec cette grille.",
      retryFeedback: "Pas encore — modifiez votre réponse et réessayez.",
      revealedFeedback: "Voici la réponse validée. Utilisez-la pour comprendre la compétence travaillée, puis continuez lorsque vous êtes prêt·e.",
      reviewedAnswerLabel: "Réponse validée :",
      explanationLabel: "Pourquoi c’est juste :",
      completedWithHelpLabel: "Terminé avec de l’aide",
      finishSequence: "Terminer la séquence",
      nextExercise: "Exercice suivant",
      selfReview: "Voir ma grille d’auto-vérification",
      showHint: "Voir un indice",
      hideHint: "Masquer l’indice",
      hintLabel: "Une piste pour commencer :",
      hintNotice: "C’est une suggestion, pas une réponse. Continuez à rédiger avec vos propres mots.",
      verify: "Vérifier",
      revealAnswer: "Voir la réponse",
      retryHint: "Vous pouvez modifier votre réponse autant de fois que nécessaire.",
      difficultyPrompt: "Facultatif : comment avez-vous trouvé cet exercice ?",
      difficultyTooEasy: "Trop facile",
      difficultyAppropriate: "Adapté",
      difficultyTooHard: "Trop difficile",
      difficultyRecorded: "Merci — votre réponse est enregistrée pour cette séance.",
    },
    login: {
      title: "Se connecter",
      emailLabel: "E-mail",
      passwordLabel: "Mot de passe",
      invalidCredentials: "Adresse e-mail ou mot de passe invalide.",
      submitting: "Connexion en cours…",
      submit: "Se connecter",
      noAccount: "Vous n’avez pas encore de compte ?",
      signUp: "S’inscrire",
    },
    signup: {
      title: "Créer votre compte",
      nameLabel: "Nom",
      emailLabel: "E-mail",
      passwordLabel: "Mot de passe",
      invalidInput: "Saisissez une adresse e-mail valide et un mot de passe d’au moins 8 caractères.",
      emailInUse: "Un compte existe déjà avec cette adresse e-mail.",
      genericError: "Une erreur s’est produite. Réessayez.",
      automaticLoginFailed:
        "Votre compte a été créé, mais la connexion automatique a échoué. Connectez-vous.",
      submitting: "Création du compte…",
      submit: "S’inscrire",
      alreadyHaveAccount: "Vous avez déjà un compte ?",
      logIn: "Se connecter",
    },
    dashboard: {
      welcome: (name) => `Content de vous revoir, ${name}`,
      startHereEyebrow: "Votre première étape",
      startHereTitle: "Comment souhaitez-vous commencer ?",
      startHereDescription: "Choisissez un entraînement ciblé ou une tâche TCF complète. Vos progrès apparaîtront ici après votre première activité.",
      practiceStartTitle: "Travailler une compétence d’abord",
      practiceStartDescription: "Entraînez une partie de la tâche pas à pas, de l’exercice guidé à une rédaction autonome.",
      practiceStartAction: "Aller à Pratique",
      tasksStartTitle: "Essayer une tâche complète",
      tasksStartDescription: "Rédigez une réponse TCF complète, puis recevez des commentaires sur votre rédaction.",
      tasksStartAction: "Aller à la tâche complète",
      practiceActivityTitle: "Activité de pratique",
      practiceExercisesCompleted: ({ count }) => `${count} exercice${count === 1 ? "" : "s"} terminé${count === 1 ? "" : "s"}`,
      practiceCompletionBreakdown: ({ independent, helped }) => `${independent} en autonomie · ${helped} avec aide`,
      practiceTaskPartsCompleted: ({ count }) => `${count} partie${count === 1 ? "" : "s"} de tâche travaillée${count === 1 ? "" : "s"}`,
      continuePractice: "Continuer la pratique",
      practiceActionsMenu: "Plus d’options",
      clearPracticeProgressAction: "Effacer la progression",
      clearPracticeProgressConfirmTitle: "Effacer toute la progression en pratique ?",
      clearPracticeProgressConfirmDescription:
        "Cela supprime tous les exercices terminés et les parties de tâche entraînées. Vous recommencerez chaque séquence à zéro la prochaine fois. Cette action est irréversible.",
      clearPracticeProgressConfirm: "Effacer la progression",
      clearPracticeProgressError: "Impossible d’effacer votre progression en pratique. Veuillez réessayer.",
      clearPracticeProgressSuccess: "Progression en pratique effacée.",
      accountUnavailableTitle: "Votre compte doit être finalisé",
      accountUnavailableDescription:
        "Nous ne pouvons pas encore associer ce compte Clerk à vos données MyTCFLab. Réessayez dans quelques instants. Si vous aviez déjà un compte, il doit d’abord être importé.",
      chartTitle: "Évolution du niveau",
      chartCaption: ({ count }) => `${count} dernières tentatives par tâche`,
      emptyTitle: "Aucune rédaction corrigée pour le moment",
      emptyDescription:
        "Terminez une tâche et faites-la corriger pour suivre l’évolution de votre niveau du CECRL dans le temps.",
      taskLegend: ({ number }) => `Tâche ${number}`,
      levelAxisLabel: "Niveau du CECRL",
      attemptAxisLabel: "Tentative",
      recentCorrectionsTitle: "Corrections récentes",
      viewAllCorrections: "Voir tout l’historique des corrections",
      correctionHistoryTitle: "Historique des corrections",
      noCorrectionHistoryTitle: "Aucune correction pour le moment",
      noCorrectionHistoryDescription: "Vos soumissions corrigées apparaîtront ici.",
      limitedCorrectionDetails: "La revue détaillée n’est pas disponible pour cette ancienne correction.",
      backToCorrectionHistory: "Retour à l’historique des corrections",
      backToDashboard: "Retour au tableau de bord",
      attemptedOn: ({ date }) => `Corrigée le ${date}`,
      correctionActionsMenu: "Plus d’options",
      deleteCorrectionAction: "Supprimer",
      deleteCorrectionConfirmTitle: "Supprimer cette correction ?",
      deleteCorrectionConfirmDescription:
        "Cette réponse et ses commentaires seront définitivement supprimés. Cette action est irréversible.",
      deleteCorrectionConfirm: "Supprimer",
      deleteCorrectionError: "Impossible de supprimer cette correction. Veuillez réessayer.",
      deleteCorrectionSuccess: "Correction supprimée.",
    },
    settings: {
      title: "Paramètres",
      appearanceHeading: "Apparence",
      appearanceDescription:
        "Choisissez l’apparence de MyTCFLab sur cet appareil, y compris la connexion et l’inscription.",
      themeLight: "Clair",
      themeDark: "Sombre",
      themeSystem: "Système",
      languageHeading: "Langue",
      languageDescription:
        "Choisissez la langue utilisée dans l’interface, les commentaires et le panneau de traduction.",
      helpHeading: "Aide et assistance",
      helpDescription: "Une question ou un problème ? Contactez-nous, nous sommes là pour vous aider.",
    },
    walkthrough: {
      takeATour: "Faire la visite guidée",
      stepProgress: ({ step, total }) => `Étape ${step} sur ${total}`,
      next: "Suivant",
      back: "Précédent",
      skip: "Ignorer",
      finish: "Terminer",
      continueToPractice: "Continuer vers Pratique",
      continueToFullTask: "Continuer vers la tâche complète",
      dashboardWelcomeTitle: "Bienvenue sur MyTCFLab",
      dashboardWelcomeBody:
        "Voici votre tableau de bord — votre niveau CECR au fil du temps et vos corrections récentes apparaîtront ici après quelques rédactions.",
      dashboardCorrectionsTitle: "Vos corrections récentes",
      dashboardCorrectionsBody:
        "La note et le niveau estimé de chaque rédaction corrigée apparaissent sous le graphique, pour suivre précisément chaque tentative.",
      settingsTitle: "Personnalisez l’application",
      settingsBody: "Ouvrez les paramètres pour choisir la langue et l’apparence de l’interface, ou trouver de l’aide lorsque vous en avez besoin.",
      dashboardPracticeTitle: "Préparez une partie de la tâche avant la rédaction complète",
      dashboardPracticeBody: "Pratique est votre entraîneur d’écriture. Il vous aide à travailler une partie numérotée d’une tâche TCF à votre niveau cible avant de rédiger une réponse complète.",
      dashboardStartWritingTitle: "Prêt·e pour une tâche complète ?",
      dashboardStartWritingBody: "Ouvrez la tâche complète pour choisir une consigne d’examen et obtenir votre première correction.",
      practiceIntroTitle: "La pratique entraîne une partie de la tâche",
      practiceIntroBody: "Cette page n’est pas une simulation d’examen. Choisissez une partie de la tâche et travaillez-la dans une séquence progressive et validée avant de rédiger une réponse TCF complète.",
      practicePartsTitle: "Les parties restent les mêmes ; le niveau fait évoluer l’exigence",
      practicePartsBody: "Chaque tâche suit une structure numérotée fixe. B2, C1 et C2 entraînent la même partie avec une langue de plus en plus autonome, précise et nuancée. Seules les séquences validées peuvent être commencées.",
      practiceStagesTitle: "Six étapes, de la reconnaissance à la rédaction autonome",
      practiceStagesBody: "Chaque partie suit le même plan fixe : Reconnaître, Compléter, Transformer, Organiser, Développer, puis Produire. Chaque étape retire un peu plus de soutien, pour que vous terminiez capable de l'écrire seul·e. Lorsque vous êtes prêt·e, ouvrez la tâche complète pour réutiliser ce que vous avez travaillé dans une réponse TCF complète.",
      taskPickerTitle: "Choisissez une tâche",
      taskPickerBody:
        "L’expression écrite du TCF comprend trois types de tâches : la Tâche 1 (communiquer efficacement dans un message court, au bon destinataire et dans le registre adapté), la Tâche 2 (raconter une expérience pour plusieurs destinataires, avec des commentaires adaptés à son objectif) et la Tâche 3 (analyser un sujet sous différents points de vue). Nous allons parcourir la Tâche 1 à titre d’exemple.",
      topicPickerTitle: "Choisissez une consigne d’examen",
      topicPickerBody:
        "Les consignes d’examens récents proviennent directement de vrais examens du TCF récemment publiés sur ce site, pour vous entraîner avec des consignes authentiques. Vous pouvez aussi coller la vôtre.",
      timedTaskTourTitle: "Entraînez-vous dans les conditions de l'examen",
      timedTaskTourBody: "Démarrez une tâche chronométrée pour vous entraîner avec la vraie pression de temps de l'examen. Elle suit la durée suggérée pour cette tâche et continue en arrière-plan pendant que vous écrivez.",
      guidedWritingTitle: "Planifiez avant d’écrire",
      guidedWritingBody:
        "Ouvrez le guide de rédaction lorsque vous manquez d’idées. Choisissez la situation d’écriture, puis utilisez ses questions de planification, ses formules en français et ses temps verbaux suggérés pour votre niveau visé.",
      editorTitle: "Rédigez votre réponse",
      editorBody:
        "Rédigez votre réponse en français ici — nous avons collé une réponse d’exemple pour vous montrer la suite de la visite. Le nombre de mots se met à jour au fur et à mesure.",
      correctButtonTitle: "Obtenez des commentaires",
      correctButtonBody:
        "Quand vous êtes prêt, cliquez sur Corriger pour obtenir des commentaires sur la grammaire, le vocabulaire et le niveau CECR. Voyons à quoi cela ressemble.",
      correctionModalTitle: "Votre correction",
      correctionModalBody:
        "Votre texte corrigé, un niveau CECR estimé et des commentaires détaillés s’ouvrent ici même. Les onglets Aperçu, Comparaison et Commentaires détaillent tout.",
      exampleGenerateTitle: "Besoin d’inspiration ?",
      exampleGenerateBody:
        "Générer un exemple rédige une réponse modèle complète au niveau CECR de votre choix, pour voir à quoi ressemble une bonne réponse. Nous n’en générerons pas pendant la visite — essayez-le quand vous voulez.",
      editorCopyTitle: "Copiez votre texte",
      editorCopyBody:
        "Copier envoie votre réponse dans le presse-papiers, pratique pour la coller dans un document ou un test blanc officiel.",
      editorClearTitle: "Recommencer",
      editorClearBody: "Effacer vide la réponse pour repartir d’une page blanche.",
      translationTitle: "Traduisez votre réponse",
      translationBody:
        "Afficher la traduction traduit votre réponse dans la langue de l’interface, pour vérifier le sens sans quitter la page. Elle ne se lance qu’à la demande, et seulement pour ce que vous avez ajouté depuis la dernière fois, afin de préserver votre quota de traduction.",
      navTitle: "Votre progression",
      navBody: "Revenez ici à tout moment pour consulter votre historique de corrections et votre niveau estimé.",
      previewFeedback: {
        summary:
          "Un français solide et naturel dans l’ensemble — seules deux petites erreurs d’accord empêchent une meilleure note.",
        cefrRationale:
          "Le vocabulaire et la structure des phrases correspondent au niveau B1, mais les deux erreurs d’accord ci-dessous sont le principal frein au niveau B2.",
        cefrEvidence: "Un vocabulaire courant précis et une structure de phrases globalement correcte tout au long de la réponse.",
        cefrBlocker: "Les deux erreurs d’accord ci-dessous sont le principal frein à une estimation B2.",
        wordCountNote: "Dans la fourchette visée pour cette tâche.",
        contentNote: "Répond clairement au sujet avec des détails pertinents et bien organisés.",
        linguisticsNote: "Grammaire globalement correcte, avec deux erreurs d’accord du participe passé.",
        vocabularyNote: "Bon vocabulaire courant et ton naturel et chaleureux.",
        agreementErrorExplanation:
          "Le participe passé doit s’accorder en genre et en nombre avec un complément d’objet direct placé avant.",
        participleErrorExplanation:
          "Avec être, le participe passé s’accorde avec le sujet — « resté » a besoin d’un « s » pour s’accorder avec « nous ».",
        suggestionOne: "Révisez les règles d’accord du participe passé avec avoir et être.",
        suggestionTwo:
          "Essayez de relire votre texte à voix haute — les erreurs d’accord s’entendent souvent mieux qu’elles ne se voient.",
      },
    },
    workspace: {
      task: {
        heading: "1. Choisissez une tâche",
        targetLength: ({ minWords, maxWords }) => `Longueur visée : ${minWords}–${maxWords} mots.`,
      },
      topic: {
        heading: "2. Choisissez une consigne d’examen",
        recentExamTitle: "Obtenir une consigne d’examens récents",
        recentExamDescription: "Chargez une consigne authentique pour la tâche choisie.",
        customTitle: "Écrire ou coller ma propre consigne",
        customDescription: "Utilisez une consigne d’examen que vous avez déjà.",
        loading: "Récupération d’une consigne d’examens récents…",
        fetchError:
          "Nous n’avons pas pu obtenir une consigne d’examens récents. Réessayez ou rédigez la vôtre.",
        unavailableError:
          "La consigne d’examens récents n’est pas disponible. Réessayez ou rédigez la vôtre.",
        notPublishedError:
          "Aucune consigne d’examens récents n’a été publiée pour ce mois-ci ni le mois précédent. Rédigez ou collez la vôtre.",
        selectedRecentExamAriaLabel: "Consigne d’examen récent sélectionnée",
        sourceLabel: "Source :",
        recentExamsSource: ({ month }) => `Examens récents — ${month}`,
        customTopicLabel: "Votre consigne d’examen",
        customTopicPlaceholder: "Collez ou rédigez la consigne d’examen à laquelle vous souhaitez répondre…",
      },
      editor: {
        heading: "3. Rédigez",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} mots`,
        responseLabel: "Votre réponse",
        frenchResponsePlaceholder: "Rédigez votre réponse ici, en français…",
        correct: "Corriger",
        correcting: "Correction en cours…",
        correctingStatus: "Nous préparons vos commentaires. Cela peut prendre un instant.",
        genericCorrectionError: "Une erreur s’est produite.",
        alreadyCorrected:
          "Cette version a déjà été corrigée. Modifiez votre réponse ou votre consigne d’examen pour demander une nouvelle correction.",
        correctionInProgress:
          "Une correction de cette réponse exacte est déjà en cours. Attendez sa fin ou modifiez la réponse ou la consigne d’examen avant d’en demander une autre.",
        exampleLevelLabel: "Niveau visé",
        generateExample: "Générer un exemple",
        generatingExample: "Génération en cours…",
        generatingExampleStatus: "Génération d’un exemple de réponse. Cela peut prendre un instant.",
        exampleRateLimitedError: "Le générateur d’exemples est occupé. Réessayez dans un instant.",
        exampleDailyLimitError: "Vous avez atteint la limite d’exemples pour aujourd’hui. Réessayez demain.",
        exampleUnavailableError: "Le générateur d’exemples n’est pas disponible pour le moment.",
        exampleGenericError: "Nous n’avons pas pu générer d’exemple. Réessayez.",
        exampleNeedsTopicWarning:
          "Choisissez une consigne d’examens récents ou collez la vôtre avant de générer un exemple.",
        copy: "Copier le texte",
        copied: "Copié !",
        copyFailed: "Impossible de copier",
        clear: "Effacer le texte",
      },
      guidedWriting: {
        show: "Guide de rédaction",
        hide: "Masquer le guide de rédaction",
        heading: "Guide de rédaction",
        guideForLevel: ({ level }) => `Guide pour le niveau ${level}`,
        contextConfirmHeading: "Situation d'écriture",
        contextConfirmPrompt: "À qui écrivez-vous ?",
        contextConfirmTextTypePrompt: "Quel type de texte écrivez-vous, et pour quels lecteurs ?",
        contextConfirmAction: "Utiliser ce choix",
        changeContext: "Changer",
        contextLabel: ({ profile }) => `Style : ${profile}`,
        previousStage: "Étape précédente",
        nextStage: "Étape suivante",
        optionalStep: "Facultatif",
        ideasLabel: "Que pouvez-vous dire ?",
        tensesLabel: "Temps verbaux à envisager",
        tensesHint: "Utilisez seulement ce qui convient à votre sujet : un français juste vaut mieux que beaucoup de temps verbaux.",
        completionCheckLabel: "Avant de terminer",
        examplesLabel: "Formules à adapter à votre sujet",
        morePhrases: "Voir plus de formules",
      },
      timedTask: {
        show: "Tâche chronométrée",
        heading: "Tâche chronométrée",
        suggestedTotalTime: ({ minutes }) => `Durée suggérée pour cette tâche : ${minutes} min`,
        phaseDuration: ({ label, minutes }) => `${label} · ${minutes} min`,
        start: "Démarrer la tâche chronométrée",
        pause: "Pause",
        paused: "En pause",
        resume: "Reprendre",
        end: "Terminer",
        remaining: ({ minutes, seconds }) => `${minutes}:${seconds} restantes`,
        timeUp: "Le temps est écoulé : terminez ou continuez à écrire.",
        continueForTwoMinutes: "Ajouter 2 minutes",
        summaryHeading: "Bilan de la tâche chronométrée",
        summaryActualTime: ({ time }) => `Temps passé : ${time}`,
        summaryTargetTime: ({ time }) => `Temps prévu : ${time}`,
        summaryWordCount: ({ count }) => `Mots : ${count}`,
        summaryPhaseReached: "Atteinte",
        summaryPhaseNotReached: "Non atteinte",
        summaryClose: "Fermer le bilan",
        phaseLabels: {
          plan: "Planifier",
          write: "Rédiger",
          analyse: "Analyser les documents",
          synthesise: "Résumer les deux points de vue",
          argue: "Présenter et défendre votre position",
          check: "Vérifier et terminer",
        },
        phasePrompts: {
          plan: "Identifiez le destinataire, l’objectif et une structure simple avant d’écrire.",
          write: "Répondez à chaque point demandé et reliez bien vos idées.",
          analyse: "Lisez les deux documents et identifiez l’idée centrale de chacun.",
          synthesise: "Présentez les deux points de vue avant de donner votre avis.",
          argue: "Exprimez une position claire avec deux ou trois arguments développés.",
          check: "Vérifiez le nombre de mots, le registre, les accords, les accents et les verbes.",
        },
      },
      translation: {
        heading: ({ language }) => `Traduction (${language})`,
        show: "Afficher la traduction",
        update: "Mettre à jour la traduction",
        hide: "Masquer la traduction",
        inProgress: "Traduction en cours…",
        unavailableError: "La traduction est indisponible pour le moment.",
        rateLimitedError: "Vous traduisez trop rapidement. Patientez un instant puis réessayez.",
        monthlyQuotaError: "Vous avez atteint la limite mensuelle de traduction. Réessayez le mois prochain.",
        tooLong: ({ maxCharacters }) =>
          `La traduction est disponible pour les brouillons de ${maxCharacters} caractères maximum. Ce brouillon est plus long : soumettez-le pour obtenir des commentaires complets.`,
        unofficialFallbackNotice:
          "Cette traduction provient d’une méthode de secours non officielle, pas de l’API DeepL. Elle peut être moins précise et parfois indisponible.",
      },
      feedback: {
        heading: ({ language }) => `Commentaires (${language})`,
        estimatedLevel: ({ level }) => `Niveau CECR / CECRL estimé : ${level}`,
        generatedInOtherLanguage: ({ generatedLanguage, selectedLanguage }) =>
          `Ces commentaires ont été générés en ${generatedLanguage}. Ils restent disponibles dans cette langue tandis que l’interface est en ${selectedLanguage}.`,
        stale:
          "Vous avez modifié votre réponse depuis ces commentaires. Sélectionnez de nouveau Corriger pour obtenir des commentaires sur votre dernier brouillon.",
        correctedText: "Texte corrigé",
        errors: ({ count }) => `Erreurs (${count})`,
        suggestions: "Suggestions",
        errorCategories: {
          grammar: "Grammaire",
          vocabulary: "Vocabulaire",
          spelling: "Orthographe",
          syntax: "Syntaxe",
          punctuation: "Ponctuation",
          register: "Registre",
        },
      },
      correctionModal: {
        title: ({ taskLabel }) => `Correction : ${taskLabel}`,
        submissionId: ({ id }) => `Identifiant de la soumission : ${id}`,
        loading: "Préparation de votre correction détaillée…",
        statusEvaluated: "Évaluée",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} mots`,
        secureLevel: ({ level }) => `Niveau acquis : ${level}`,
        demonstratedLevel: ({ level }) => `Niveau démontré : ${level}`,
        previouslyRecordedLevel: ({ level }) => `Niveau précédemment enregistré : ${level}`,
        recordedLevel: ({ level }) => `Niveau enregistré : ${level}`,
        cefrRationaleHeading: "Pourquoi cette estimation",
        cefrEstimateDisclosure:
          "Cette estimation automatisée repose sur la réponse soumise. Un niveau C1/C2 demandé pour un exemple est un objectif, pas un résultat vérifié.",
        cefrEvidenceHeading: "Éléments observés dans votre texte",
        cefrBlockerHeading: "Ce qui empêche le niveau supérieur",
        cefrConfidenceHeading: "Confiance dans cette estimation",
        cefrConfidenceLevels: { High: "Élevée", Medium: "Moyenne", Low: "Faible", Unknown: "Non évaluée (correction antérieure)" },
        legacyCefrDetailUnavailable: "Non enregistré séparément pour cette correction antérieure — voir la justification ci-dessus.",
        legacyCefrLevelNote:
          "Cette correction est antérieure à la distinction entre niveau démontré et niveau acquis — le niveau ci-dessous est l'estimation unique enregistrée à l'époque, et non un niveau acquis vérifié séparément.",
        downloadPdf: "Imprimer / Enregistrer en PDF",
        viewCorrection: "Voir la correction",
        tabOverview: "Vue d’ensemble et scores",
        scoreDisclosure: "Indicateurs d’apprentissage mytcflab — pas une évaluation officielle du TCF.",
        globalPerformanceHeading: "Performance globale",
        overallScore: ({ score }) => `Indicateur global d’apprentissage : ${score} %`,
        overallScoreDescription: "Moyenne des trois indicateurs d’apprentissage mytcflab ci-dessous.",
        tabCompared: "Comparer les textes",
        tabComments: "Commentaires et conseils",
        tabMethodology: "Comment c’est évalué",
        methodology: [
          {
            kind: "paragraph",
            text: "L’évaluation est conçue pour vous aider à comprendre **le plus précisément possible où vous en êtes aujourd’hui** et ce que vous devez améliorer pour atteindre votre objectif au TCF Canada.",
          },
          { kind: "heading", text: "1. D’abord, nous vérifions que vous avez bien réalisé la tâche" },
          {
            kind: "paragraph",
            text: "Bien écrire en français ne suffit pas. Vous devez **faire exactement ce que la tâche demande**.",
          },
          { kind: "paragraph", text: "Nous vérifions donc si vous avez :" },
          {
            kind: "list",
            items: [
              "répondu à tous les points demandés",
              "suffisamment développé vos idées",
              "respecté la situation présentée",
              "utilisé le ton approprié",
              "organisé les informations clairement",
              "rempli l’objectif de la tâche",
            ],
          },
          {
            kind: "paragraph",
            text: "Chaque tâche du TCF exige des compétences différentes. C’est pourquoi la Tâche 1, la Tâche 2 et la Tâche 3 sont évaluées de manière légèrement différente.",
          },
          { kind: "heading", text: "2. Ensuite, nous évaluons la qualité de votre français" },
          { kind: "paragraph", text: "Nous évaluons principalement :" },
          {
            kind: "list",
            items: [
              "la grammaire",
              "la conjugaison des verbes",
              "la structure des phrases",
              "l’orthographe",
              "le vocabulaire",
              "le choix et la précision des mots",
              "les connecteurs",
              "l’organisation des idées",
              "le registre et le naturel",
            ],
          },
          {
            kind: "paragraph",
            text: "Nous n’évaluons pas votre niveau simplement en regardant si vous savez utiliser des mots difficiles.",
          },
          {
            kind: "paragraph",
            text: "Ce qui compte le plus, c’est votre capacité à **utiliser le français de façon précise et régulière**.",
          },
          { kind: "heading", text: "3. Votre niveau B2, C1 ou C2 est évalué de façon prudente" },
          {
            kind: "paragraph",
            text: "L’évaluation ne cherche pas à trouver le niveau le plus élevé possible dans votre texte.",
          },
          {
            kind: "paragraph",
            text: "Par exemple, écrire une seule phrase très sophistiquée ne signifie pas automatiquement que votre niveau est C1.",
          },
          {
            kind: "paragraph",
            text: "Pour être considéré C1, les caractéristiques du niveau C1 doivent apparaître **de façon régulière dans tout votre texte**. Le même principe s’applique au niveau C2.",
          },
          {
            kind: "paragraph",
            text: "Ainsi, lorsque votre texte se situe entre deux niveaux, nous retenons le niveau inférieur tant que le niveau supérieur n’est pas démontré de façon régulière.",
          },
          { kind: "example", text: "B2/C1 → B2" },
          {
            kind: "paragraph",
            text: "Cela ne signifie pas que vous êtes incapable de produire des phrases de niveau C1. Cela signifie simplement que nous devons observer cette qualité de façon plus régulière avant de considérer le niveau C1 comme acquis.",
          },
          { kind: "heading", text: "4. Vous recevez deux résultats importants" },
          { kind: "paragraph", text: "**Niveau démontré :** le niveau le plus élevé qui apparaît dans votre texte." },
          { kind: "paragraph", text: "**Niveau acquis :** le niveau que vous démontrez de façon régulière." },
          { kind: "example", text: "Niveau démontré : C1 — Niveau acquis : B2" },
          {
            kind: "paragraph",
            text: "Cela signifie que votre texte présente certaines caractéristiques du niveau C1, mais qu’il reste des faiblesses importantes empêchant de considérer le niveau C1 comme acquis.",
          },
          {
            kind: "paragraph",
            text: "Cette distinction est importante, car l’objectif n’est pas simplement de dire que vous « ressemblez à un C1 ». L’objectif est de déterminer **quel niveau vous pouvez reproduire de façon fiable le jour de l’examen**.",
          },
          { kind: "heading", text: "5. Vous recevez aussi une note de 0 à 100" },
          { kind: "paragraph", text: "Cette note est uniquement un outil d’apprentissage. Elle évalue trois domaines :" },
          {
            kind: "list",
            items: [
              "**Contenu et réalisation de la tâche** — Avez-vous répondu efficacement à la tâche ?",
              "**Français** — Quelle est la qualité de votre grammaire, de votre orthographe et de la construction de vos phrases ?",
              "**Vocabulaire et registre** — Utilisez-vous un langage varié, précis et adapté à la situation ?",
            ],
          },
          {
            kind: "paragraph",
            text: "Ces notes **ne sont pas des scores officiels du TCF** et ne doivent pas être interprétées directement comme un score TCF ou un niveau CECR.",
          },
          { kind: "heading", text: "6. Vous recevez les corrections de vos erreurs" },
          {
            kind: "paragraph",
            text: "Pour chaque erreur importante, nous vous montrons : **Ce que vous avez écrit → Comment le corriger → Pourquoi c’est incorrect**",
          },
          {
            kind: "paragraph",
            text: "Cela vous aide à repérer les erreurs récurrentes et à concentrer votre pratique sur les points à améliorer en priorité.",
          },
          { kind: "heading", text: "7. Vous recevez aussi une version modèle" },
          {
            kind: "paragraph",
            text: "Après la correction, vous recevez une version améliorée du texte. Cette version est conçue pour vous aider à étudier :",
          },
          {
            kind: "list",
            items: [
              "du nouveau vocabulaire",
              "des structures grammaticales",
              "des connecteurs",
              "des façons de développer des arguments",
              "des façons plus naturelles d’exprimer des idées",
            ],
          },
          {
            kind: "paragraph",
            text: "Mais attention : **la version modèle n’est pas utilisée pour déterminer votre niveau.** Votre niveau est déterminé uniquement à partir du texte que vous avez initialement soumis.",
          },
          { kind: "heading", text: "L’objectif de l’évaluation" },
          {
            kind: "paragraph",
            text: "Le but n’est pas de vous donner une bonne note simplement pour vous faire plaisir. Ce n’est pas non plus de chercher des erreurs simplement pour baisser votre note.",
          },
          { kind: "paragraph", text: "L’objectif est de répondre à une seule question simple :" },
          { kind: "example", text: "« Si je passais un test similaire aujourd’hui, quel niveau pourrais-je démontrer avec confiance ? »" },
          {
            kind: "paragraph",
            text: "Ainsi, vous saurez exactement **où vous en êtes, ce qui vous empêche d’atteindre le niveau supérieur, et ce que vous devez pratiquer** avant de passer le TCF Canada.",
          },
        ],
        contentScoreLabel: "Contenu et pragmatique",
        linguisticsScoreLabel: "Linguistique",
        vocabularyScoreLabel: "Vocabulaire et registre",
        originalHeading: "Votre texte original",
        correctedHeading: "Texte corrigé",
        correctionsHeading: ({ count }) => `Corrections (${count})`,
        noCorrectionsNote: "Aucune correction précise n’a été relevée.",
        errorLabel: "Erreur",
        correctionLabel: "Correction",
        noteLabel: "Note",
        toggleNote: "Afficher ou masquer la note",
        commentsHeading: "Commentaires automatisés",
        modelVersionHeading: "Version modèle générée par mytcflab",
        tryAgain: "Réessayer",
      },
      dialog: {
        title: "Supprimer votre travail actuel ?",
        taskSwitchDescription: "Changer de tâche supprimera votre consigne, brouillon et commentaires actuels.",
        dashboardSwitchDescription:
          "Accéder au tableau de bord supprimera votre consigne, brouillon et commentaires actuels.",
        adminSwitchDescription: "Accéder à l’administration supprimera votre consigne, brouillon et commentaires actuels.",
        topicSwitchDescription: "Changer de consigne supprimera votre consigne, brouillon et commentaires actuels.",
        exampleOverwriteDescription: "Générer un exemple remplacera votre brouillon actuel.",
        exampleOverwriteConfirm: "Remplacer le brouillon",
        clearDraftDescription: "Effacer supprimera votre brouillon et vos commentaires actuels.",
        clearDraftConfirm: "Effacer le texte",
        confirm: "Supprimer et changer",
        cancel: "Continuer à travailler",
      },
    },
  },
  es: {
    common: {
      cancel: "Cancelar",
      close: "Cerrar",
    },
    nav: {
      dashboard: "Panel",
      tasks: "Tarea completa",
      practice: "Práctica",
      settings: "Configuración",
      admin: "Admin",
      logIn: "Iniciar sesión",
      closeSettingsFirst: "Cierra primero la configuración",
    },
    home: {
      title: "Escribe para el examen TCF. Recibe comentarios que te ayudarán a alcanzar B2, C1 o C2.",
      description:
        "Practica las tareas 1, 2 y 3 y recibe en segundos comentarios sobre gramática, vocabulario y nivel MCER.",
      startATask: "Empezar una tarea",
      getStarted: "Empezar",
    },
    practice: {
      tasks: {
        TASK_1: { title: "Tarea 1", description: "Comunícate eficazmente en un mensaje breve, para el destinatario y con el registro adecuados." },
        TASK_2: { title: "Tarea 2", description: "Cuenta y comenta una experiencia en un correo electrónico o una entrada de blog para lectores concretos." },
        TASK_3: { title: "Tarea 3", description: "Compara puntos de vista y defiende una postura matizada sobre un tema social." },
      },
      levels: {
        B2: { title: "B2", description: "Ideas claras, conectadas y suficientemente desarrolladas." },
        C1: { title: "C1", description: "Organización flexible, puntos de vista relacionados y matices." },
        C2: { title: "C2", description: "Dominio muy preciso, autónomo y adaptado a la situación." },
      },
      stages: { recognize: "Reconocer", complete: "Completar", transform: "Transformar", organize: "Organizar", develop: "Desarrollar", produce: "Producir" },
      completedEyebrow: "Secuencia completada",
      completedTitle: ({ part }) => `Has trabajado: ${part}`,
      completedDescription: ({ outcome }) => `Has pasado del reconocimiento a la producción autónoma. Tenlo en cuenta para tu próxima redacción completa: ${outcome}`,
      nextActionDescription: "Ahora aplica esta parte en una tarea TCF completa o elige otra parte.",
      replayWithVariants: "Repetir con nuevas variantes",
      startFresh: "Empezar de nuevo",
      chooseAnotherPart: "Elegir otra parte de la tarea",
      tryFullTask: "Probar una tarea completa",
      eyebrow: "Práctica específica",
      title: "Trabaja una parte de la tarea cada vez.",
      description: "No es una simulación de examen. Elige una tarea, tu nivel objetivo y una parte de la tarea; después seguirás una progresión fija y revisada, del reconocimiento a la producción autónoma.",
      chooseTask: "1. ¿Qué tarea quieres mejorar?",
      chooseLevel: "2. ¿Cuál es tu nivel objetivo?",
      levelHelp: "Elige primero una tarea: la dificultad está ligada a su propósito de escritura.",
      choosePart: "3. Parte a trabajar",
      partPlaceholder: "Parte a trabajar",
      partLabel: ({ order }) => `Parte ${order}`,
      previewEyebrow: "Tu plan de práctica",
      previewTitle: ({ part }) => `Practicar: ${part}`,
      previewOutcomeLabel: "Al final podrás:",
      previewStagesLabel: "Tus seis etapas",
      resumeEyebrow: "Guardado en este dispositivo",
      resumeTitle: ({ part }) => `Reanudar: ${part}`,
      resumeDescription: ({ step, total }) => `Continúa en el paso ${step} de ${total}.`,
      localSessionNotice: "Tus respuestas solo se guardan en este navegador hasta que termines o descartes esta sesión.",
      resumeSession: "Reanudar la práctica",
      discardSavedSession: "Descartar la sesión guardada",
      durationAndSteps: ({ minutes, steps }) => `${minutes} min · ${steps} ejercicios seleccionados`,
      unavailableCombination: "Esta combinación todavía no tiene una secuencia validada. Elige otro nivel u otra tarea: nunca mostramos ejercicios generados automáticamente.",
      unavailableTitle: ({ task, level }) => `${task} en ${level} aún no está disponible`,
      unavailableDescription: "Estas partes de la tarea siguen en revisión. Elige abajo un nivel disponible para practicar esta tarea ahora.",
      availableLevelsLabel: "Niveles disponibles para esta tarea:",
      availableLevel: ({ level, parts }) => `${level} · ${parts} ${parts === 1 ? "parte" : "partes"}`,
      partHelp: "Las partes disponibles siguen la tarea y el nivel objetivo que elijas.",
      changePart: "← Cambiar de parte de la tarea",
      sequenceDescription: ({ count }) => `Esta práctica contiene ${count} ejercicios revisados en una progresión guiada.`,
      progress: ({ step, total }) => `Paso ${step} de ${total}`,
      stageMap: ({ current, next }) => (next ? `Ahora: ${current}. Siguiente: ${next}.` : `Ahora: ${current}. Esta es tu última etapa.`),
      attentionLabel: "Punto de atención:",
      selectAnswer: "Elige tu respuesta",
      selectOrder: "Elige el orden más lógico",
      reorderItems: "Reordena los elementos",
      moveUp: "Subir",
      moveDown: "Bajar",
      responseLabel: "Tu respuesta en francés",
      responsePlaceholder: "Escribe tu respuesta en francés…",
      suggestionPlaceholder: "Escribe tu propuesta en francés…",
      correctFeedback: "Correcto.",
      selfReviewFeedback: "Revisa tu producción con esta lista.",
      retryFeedback: "Aún no; modifica tu respuesta e inténtalo de nuevo.",
      revealedFeedback: "Esta es la respuesta revisada. Úsala para entender la habilidad que practicas y continúa cuando estés listo.",
      reviewedAnswerLabel: "Respuesta revisada:",
      explanationLabel: "Por qué es correcta:",
      completedWithHelpLabel: "Completado con ayuda",
      finishSequence: "Terminar la secuencia",
      nextExercise: "Siguiente ejercicio",
      selfReview: "Ver mi lista de autoevaluación",
      showHint: "Ver una pista",
      hideHint: "Ocultar la pista",
      hintLabel: "Una forma de empezar:",
      hintNotice: "Es una sugerencia, no una respuesta. Sigue escribiendo con tus propias palabras.",
      verify: "Comprobar",
      revealAnswer: "Ver la respuesta",
      retryHint: "Puedes modificar tu respuesta e intentarlo tantas veces como necesites.",
      difficultyPrompt: "Opcional: ¿cómo te resultó este ejercicio?",
      difficultyTooEasy: "Demasiado fácil",
      difficultyAppropriate: "Adecuado",
      difficultyTooHard: "Demasiado difícil",
      difficultyRecorded: "Gracias; se guardó para esta sesión de práctica.",
    },
    login: {
      title: "Iniciar sesión",
      emailLabel: "Correo electrónico",
      passwordLabel: "Contraseña",
      invalidCredentials: "Correo electrónico o contraseña no válidos.",
      submitting: "Iniciando sesión…",
      submit: "Iniciar sesión",
      noAccount: "¿Aún no tienes una cuenta?",
      signUp: "Crear cuenta",
    },
    signup: {
      title: "Crea tu cuenta",
      nameLabel: "Nombre",
      emailLabel: "Correo electrónico",
      passwordLabel: "Contraseña",
      invalidInput: "Introduce un correo electrónico válido y una contraseña de al menos 8 caracteres.",
      emailInUse: "Ya existe una cuenta con este correo electrónico.",
      genericError: "Algo salió mal. Inténtalo de nuevo.",
      automaticLoginFailed:
        "La cuenta se creó, pero el inicio de sesión automático falló. Inicia sesión.",
      submitting: "Creando cuenta…",
      submit: "Crear cuenta",
      alreadyHaveAccount: "¿Ya tienes una cuenta?",
      logIn: "Iniciar sesión",
    },
    dashboard: {
      welcome: (name) => `Bienvenido de nuevo, ${name}`,
      startHereEyebrow: "Tu primer paso",
      startHereTitle: "¿Cómo te gustaría empezar?",
      startHereDescription: "Elige práctica de una habilidad o una tarea TCF completa. Tu progreso aparecerá aquí después de tu primera actividad.",
      practiceStartTitle: "Entrena una habilidad primero",
      practiceStartDescription: "Trabaja una parte de la tarea paso a paso, desde la práctica guiada hasta la escritura independiente.",
      practiceStartAction: "Ir a Práctica",
      tasksStartTitle: "Prueba una tarea completa",
      tasksStartDescription: "Escribe una respuesta TCF completa y recibe comentarios sobre tu escritura.",
      tasksStartAction: "Ir a la tarea completa",
      practiceActivityTitle: "Actividad de práctica",
      practiceExercisesCompleted: ({ count }) => `${count} ejercicio${count === 1 ? "" : "s"} completado${count === 1 ? "" : "s"}`,
      practiceCompletionBreakdown: ({ independent, helped }) => `${independent} de forma independiente · ${helped} con ayuda`,
      practiceTaskPartsCompleted: ({ count }) => `${count} parte${count === 1 ? "" : "s"} de la tarea trabajada${count === 1 ? "" : "s"}`,
      continuePractice: "Continuar practicando",
      practiceActionsMenu: "Más opciones",
      clearPracticeProgressAction: "Borrar progreso",
      clearPracticeProgressConfirmTitle: "¿Borrar todo el progreso de práctica?",
      clearPracticeProgressConfirmDescription:
        "Esto elimina todos los ejercicios completados y las partes de la tarea entrenadas. La próxima vez empezarás cada secuencia desde cero. Esta acción no se puede deshacer.",
      clearPracticeProgressConfirm: "Borrar progreso",
      clearPracticeProgressError: "No se pudo borrar tu progreso de práctica. Inténtalo de nuevo.",
      clearPracticeProgressSuccess: "Progreso de práctica borrado.",
      accountUnavailableTitle: "Tu cuenta necesita configurarse",
      accountUnavailableDescription:
        "Todavía no podemos vincular esta cuenta de Clerk con tus datos de MyTCFLab. Vuelve a intentarlo en unos minutos. Si ya tenías una cuenta, primero debe importarse.",
      chartTitle: "Evolución del nivel",
      chartCaption: ({ count }) => `Últimos ${count} intentos por tarea`,
      emptyTitle: "Todavía no hay redacciones corregidas",
      emptyDescription: "Completa una tarea y corrígela para empezar a seguir tu nivel MCER a lo largo del tiempo.",
      taskLegend: ({ number }) => `Tarea ${number}`,
      levelAxisLabel: "Nivel MCER",
      attemptAxisLabel: "Intento",
      recentCorrectionsTitle: "Correcciones recientes",
      viewAllCorrections: "Ver todo el historial de correcciones",
      correctionHistoryTitle: "Historial de correcciones",
      noCorrectionHistoryTitle: "Aún no hay correcciones",
      noCorrectionHistoryDescription: "Tus entregas corregidas aparecerán aquí.",
      limitedCorrectionDetails: "La revisión detallada no está disponible para esta corrección anterior.",
      backToCorrectionHistory: "Volver al historial de correcciones",
      backToDashboard: "Volver al panel",
      attemptedOn: ({ date }) => `Corregida el ${date}`,
      correctionActionsMenu: "Más opciones",
      deleteCorrectionAction: "Eliminar",
      deleteCorrectionConfirmTitle: "¿Eliminar esta corrección?",
      deleteCorrectionConfirmDescription:
        "Esta respuesta y sus comentarios se eliminarán de forma permanente. Esta acción no se puede deshacer.",
      deleteCorrectionConfirm: "Eliminar",
      deleteCorrectionError: "No se pudo eliminar esta corrección. Inténtalo de nuevo.",
      deleteCorrectionSuccess: "Corrección eliminada.",
    },
    settings: {
      title: "Configuración",
      appearanceHeading: "Apariencia",
      appearanceDescription:
        "Elige el aspecto de MyTCFLab en este dispositivo, incluidos el inicio de sesión y el registro.",
      themeLight: "Claro",
      themeDark: "Oscuro",
      themeSystem: "Igual que el sistema",
      languageHeading: "Idioma",
      languageDescription: "Elige el idioma utilizado en la interfaz, los comentarios y el panel de traducción.",
      helpHeading: "Ayuda y soporte",
      helpDescription: "¿Tienes una pregunta o encontraste un problema? Contáctanos, con gusto te ayudamos.",
    },
    walkthrough: {
      takeATour: "Hacer el recorrido",
      stepProgress: ({ step, total }) => `Paso ${step} de ${total}`,
      next: "Siguiente",
      back: "Atrás",
      skip: "Omitir",
      finish: "Finalizar",
      continueToPractice: "Continuar a Práctica",
      continueToFullTask: "Continuar a la tarea completa",
      dashboardWelcomeTitle: "Bienvenido a MyTCFLab",
      dashboardWelcomeBody:
        "Este es tu panel: tu nivel MCER a lo largo del tiempo y tus correcciones recientes aparecerán aquí después de escribir algunas.",
      dashboardCorrectionsTitle: "Tus correcciones recientes",
      dashboardCorrectionsBody:
        "La nota y el nivel estimado de cada redacción corregida aparecen debajo del gráfico, para seguir exactamente cómo te fue en cada intento.",
      settingsTitle: "Personaliza la aplicación",
      settingsBody: "Abre Configuración para elegir el idioma y la apariencia de la interfaz, o encontrar ayuda y soporte cuando lo necesites.",
      dashboardPracticeTitle: "Prepara una parte de la tarea antes de escribir la respuesta completa",
      dashboardPracticeBody: "Práctica es tu entrenador de escritura. Te ayuda a ensayar una parte numerada de una tarea TCF en tu nivel objetivo antes de escribir una respuesta completa.",
      dashboardStartWritingTitle: "¿Listo para una tarea completa?",
      dashboardStartWritingBody: "Abre la tarea completa para elegir una consigna de examen y obtener tu primera corrección.",
      practiceIntroTitle: "La práctica desarrolla una parte de la tarea",
      practiceIntroBody: "Esta página no es una simulación de examen. Elige una parte de la tarea y practícala en una secuencia progresiva y revisada antes de escribir una respuesta TCF completa.",
      practicePartsTitle: "Las partes son las mismas; el nivel cambia la exigencia",
      practicePartsBody: "Cada tarea tiene una estructura numerada fija. B2, C1 y C2 practican la misma parte con un lenguaje cada vez más autónomo, preciso y matizado. Solo se pueden iniciar secuencias revisadas.",
      practiceStagesTitle: "Seis etapas, del reconocimiento a la escritura autónoma",
      practiceStagesBody: "Cada parte sigue el mismo plan fijo: Reconocer, Completar, Transformar, Organizar, Desarrollar y luego Producir. Cada etapa retira un poco más de ayuda, para que termines siendo capaz de escribirla tú mismo. Cuando estés listo, abre la tarea completa para aplicar lo que practicaste en una respuesta TCF completa.",
      taskPickerTitle: "Elige una tarea",
      taskPickerBody:
        "La expresión escrita del TCF tiene tres tipos de tareas: la Tarea 1 (comunicarse eficazmente en un mensaje breve, para el destinatario y el registro adecuados), la Tarea 2 (narrar una experiencia para varios destinatarios, con comentarios adaptados a su objetivo) y la Tarea 3 (analizar un tema desde distintos puntos de vista). Vamos a recorrer la Tarea 1 como ejemplo.",
      topicPickerTitle: "Elige una consigna de examen",
      topicPickerBody:
        "Las consignas de exámenes recientes provienen directamente de exámenes reales del TCF publicados recientemente en este sitio, para que practiques siempre con una consigna auténtica. También puedes pegar la tuya.",
      timedTaskTourTitle: "Practica en condiciones de examen",
      timedTaskTourBody: "Inicia una tarea cronometrada cuando quieras practicar con la presión de tiempo real del examen. Sigue el tiempo sugerido para esta tarea y continúa en segundo plano mientras escribes.",
      guidedWritingTitle: "Planifica antes de escribir",
      guidedWritingBody:
        "Abre la Guía de redacción cuando necesites ideas. Elige la situación de escritura y usa sus preguntas de planificación, frases en francés y tiempos verbales sugeridos para tu nivel objetivo.",
      editorTitle: "Escribe tu respuesta",
      editorBody:
        "Escribe tu respuesta en francés aquí — hemos pegado una respuesta de ejemplo para que veas el resto del recorrido. El conteo de palabras se actualiza mientras escribes.",
      correctButtonTitle: "Recibe comentarios",
      correctButtonBody:
        "Cuando estés listo, haz clic en Corregir para obtener comentarios sobre gramática, vocabulario y nivel MCER. Veamos cómo se ve eso.",
      correctionModalTitle: "Tu corrección",
      correctionModalBody:
        "Tu texto corregido, un nivel MCER estimado y comentarios detallados se abren aquí mismo. Las pestañas Resumen, Comparación y Comentarios lo desglosan todo.",
      exampleGenerateTitle: "¿Necesitas inspiración?",
      exampleGenerateBody:
        "Generar ejemplo escribe una respuesta modelo completa en el nivel MCER que elijas, para que veas cómo es una buena respuesta. No generaremos ninguna durante el recorrido — pruébalo cuando quieras.",
      editorCopyTitle: "Copia tu texto",
      editorCopyBody:
        "Copiar envía tu respuesta al portapapeles, útil para pegarla en un documento o en un examen de práctica oficial.",
      editorClearTitle: "Empezar de nuevo",
      editorClearBody: "Borrar vacía la respuesta para empezar un borrador nuevo.",
      translationTitle: "Traduce tu respuesta",
      translationBody:
        "Mostrar traducción traduce tu respuesta a tu idioma de interfaz, para que puedas revisar el significado sin salir de la página. Solo traduce cuando lo pides, y solo lo que agregaste desde la última vez, para ahorrar tu cuota de traducción.",
      navTitle: "Tu progreso",
      navBody: "Vuelve aquí cuando quieras para ver tu historial de correcciones y tu nivel estimado.",
      previewFeedback: {
        summary:
          "En general, un francés sólido y natural — solo dos pequeños errores de concordancia impiden una nota más alta.",
        cefrRationale:
          "El vocabulario y la estructura de las oraciones corresponden al nivel B1, pero los dos errores de concordancia de abajo son el principal obstáculo para el B2.",
        cefrEvidence: "Un vocabulario cotidiano preciso y una estructura de oraciones mayormente correcta a lo largo de la respuesta.",
        cefrBlocker: "Los dos errores de concordancia de abajo son el principal obstáculo para una estimación B2.",
        wordCountNote: "Dentro del rango previsto para esta tarea.",
        contentNote: "Responde claramente al enunciado con detalles relevantes y bien organizados.",
        linguisticsNote: "Gramática mayormente correcta, con dos errores de concordancia del participio pasado.",
        vocabularyNote: "Buen vocabulario cotidiano y un tono natural y cercano.",
        agreementErrorExplanation:
          "El participio pasado debe concordar en género y número con un complemento directo que lo precede.",
        participleErrorExplanation:
          "Con être, el participio pasado concuerda con el sujeto — «resté» necesita una «s» para concordar con «nous».",
        suggestionOne: "Repasa las reglas de concordancia del participio pasado con avoir y être.",
        suggestionTwo:
          "Prueba a leer tu borrador en voz alta — los errores de concordancia suelen notarse más al oído que a la vista.",
      },
    },
    workspace: {
      task: {
        heading: "1. Elige una tarea",
        targetLength: ({ minWords, maxWords }) => `Extensión objetivo: ${minWords}–${maxWords} palabras.`,
      },
      topic: {
        heading: "2. Elige una consigna de examen",
        recentExamTitle: "Obtén una consigna de exámenes recientes",
        recentExamDescription: "Carga una consigna auténtica para la tarea que seleccionaste.",
        customTitle: "Escribe o pega mi propia consigna",
        customDescription: "Usa una consigna de examen que ya tengas.",
        loading: "Obteniendo una consigna de exámenes recientes…",
        fetchError:
          "No pudimos obtener una consigna de exámenes recientes. Inténtalo de nuevo o escribe la tuya.",
        unavailableError:
          "La consigna de exámenes recientes no estaba disponible. Inténtalo de nuevo o escribe la tuya.",
        notPublishedError:
          "No se ha publicado ninguna consigna de exámenes recientes para este mes ni el anterior. Escribe o pega la tuya.",
        selectedRecentExamAriaLabel: "Consigna de examen reciente seleccionada",
        sourceLabel: "Fuente:",
        recentExamsSource: ({ month }) => `Exámenes recientes — ${month}`,
        customTopicLabel: "Tu consigna de examen",
        customTopicPlaceholder: "Pega o escribe la consigna de examen a la que quieres responder…",
      },
      editor: {
        heading: "3. Escribe",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} palabras`,
        responseLabel: "Tu respuesta",
        frenchResponsePlaceholder: "Rédigez votre réponse ici, en français…",
        correct: "Corregir",
        correcting: "Corrigiendo…",
        correctingStatus: "Estamos preparando tus comentarios. Esto puede tardar un momento.",
        genericCorrectionError: "Algo salió mal.",
        alreadyCorrected:
          "Esta versión ya se ha corregido. Modifica tu respuesta o consigna de examen para solicitar una nueva corrección.",
        correctionInProgress:
          "Ya hay una corrección de esta respuesta exacta en curso. Espera a que termine o modifica la respuesta o la consigna de examen antes de solicitar otra.",
        exampleLevelLabel: "Nivel objetivo",
        generateExample: "Generar ejemplo",
        generatingExample: "Generando…",
        generatingExampleStatus: "Generando una respuesta de ejemplo. Esto puede tardar un momento.",
        exampleRateLimitedError: "El generador de ejemplos está ocupado. Inténtalo de nuevo en un momento.",
        exampleDailyLimitError: "Has alcanzado el límite de ejemplos de hoy. Inténtalo de nuevo mañana.",
        exampleUnavailableError: "El generador de ejemplos no está disponible en este momento.",
        exampleGenericError: "No pudimos generar un ejemplo. Inténtalo de nuevo.",
        exampleNeedsTopicWarning:
          "Elige una consigna de exámenes recientes o pega la tuya antes de generar un ejemplo.",
        copy: "Copiar texto",
        copied: "¡Copiado!",
        copyFailed: "No se pudo copiar",
        clear: "Borrar texto",
      },
      guidedWriting: {
        show: "Guía de redacción",
        hide: "Ocultar guía de redacción",
        heading: "Guía de redacción",
        guideForLevel: ({ level }) => `Guía para el nivel ${level}`,
        contextConfirmHeading: "Situación de escritura",
        contextConfirmPrompt: "¿A quién le escribes?",
        contextConfirmTextTypePrompt: "¿Qué tipo de texto escribes y para qué lectores?",
        contextConfirmAction: "Usar esta opción",
        changeContext: "Cambiar",
        contextLabel: ({ profile }) => `Estilo: ${profile}`,
        previousStage: "Paso anterior",
        nextStage: "Paso siguiente",
        optionalStep: "Opcional",
        ideasLabel: "¿Qué puedes decir?",
        tensesLabel: "Tiempos verbales que considerar",
        tensesHint: "Usa solo lo que se adapte al tema: un francés correcto vale más que muchos tiempos verbales.",
        completionCheckLabel: "Antes de terminar",
        examplesLabel: "Formules à adapter à votre sujet",
        morePhrases: "Voir plus de formules",
      },
      timedTask: {
        show: "Tarea cronometrada",
        heading: "Tarea cronometrada",
        suggestedTotalTime: ({ minutes }) => `Tiempo sugerido para esta tarea: ${minutes} min`,
        phaseDuration: ({ label, minutes }) => `${label} · ${minutes} min`,
        start: "Iniciar tarea cronometrada",
        pause: "Pausar",
        paused: "En pausa",
        resume: "Reanudar",
        end: "Finalizar",
        remaining: ({ minutes, seconds }) => `${minutes}:${seconds} restantes`,
        timeUp: "Se acabó el tiempo: termina o sigue escribiendo.",
        continueForTwoMinutes: "Añadir 2 minutos",
        summaryHeading: "Resumen de la tarea cronometrada",
        summaryActualTime: ({ time }) => `Tiempo empleado: ${time}`,
        summaryTargetTime: ({ time }) => `Tiempo objetivo: ${time}`,
        summaryWordCount: ({ count }) => `Palabras: ${count}`,
        summaryPhaseReached: "Completada",
        summaryPhaseNotReached: "No completada",
        summaryClose: "Cerrar resumen",
        phaseLabels: {
          plan: "Planificar",
          write: "Redactar",
          analyse: "Analizar los documentos",
          synthesise: "Resumir los dos puntos de vista",
          argue: "Exponer y respaldar tu postura",
          check: "Revisar y terminar",
        },
        phasePrompts: {
          plan: "Identifica el destinatario, el propósito y una estructura sencilla antes de escribir.",
          write: "Responde a todos los puntos solicitados y conecta bien tus ideas.",
          analyse: "Lee los dos documentos e identifica la idea central de cada uno.",
          synthesise: "Presenta ambos puntos de vista antes de dar tu opinión.",
          argue: "Da una postura clara con dos o tres argumentos desarrollados.",
          check: "Revisa el número de palabras, el registro, las concordancias, los acentos y los verbos.",
        },
      },
      translation: {
        heading: ({ language }) => `Traducción (${language})`,
        show: "Mostrar traducción",
        update: "Actualizar traducción",
        hide: "Ocultar traducción",
        inProgress: "Traduciendo…",
        unavailableError: "La traducción no está disponible en este momento.",
        rateLimitedError: "Estás traduciendo demasiado rápido. Espera un momento e inténtalo de nuevo.",
        monthlyQuotaError: "Has alcanzado el límite mensual de traducción. Inténtalo de nuevo el próximo mes.",
        tooLong: ({ maxCharacters }) =>
          `La traducción está disponible para borradores de hasta ${maxCharacters} caracteres. Este borrador es más largo; envíalo para corregirlo y recibir comentarios completos.`,
        unofficialFallbackNotice:
          "Esta traducción se obtuvo mediante un método de respaldo no oficial, no la API de DeepL. Puede ser menos precisa y no estar disponible en ocasiones.",
      },
      feedback: {
        heading: ({ language }) => `Comentarios (${language})`,
        estimatedLevel: ({ level }) => `Nivel MCER / CECRL estimado: ${level}`,
        generatedInOtherLanguage: ({ generatedLanguage, selectedLanguage }) =>
          `Estos comentarios se generaron en ${generatedLanguage}. Siguen disponibles en ese idioma mientras la interfaz está en ${selectedLanguage}.`,
        stale:
          "Has editado tu respuesta desde estos comentarios. Selecciona Corregir de nuevo para recibir comentarios sobre tu último borrador.",
        correctedText: "Texto corregido",
        errors: ({ count }) => `Errores (${count})`,
        suggestions: "Sugerencias",
        errorCategories: {
          grammar: "Gramática",
          vocabulary: "Vocabulario",
          spelling: "Ortografía",
          syntax: "Sintaxis",
          punctuation: "Puntuación",
          register: "Registro",
        },
      },
      correctionModal: {
        title: ({ taskLabel }) => `Corrección: ${taskLabel}`,
        submissionId: ({ id }) => `ID de entrega: ${id}`,
        loading: "Preparando tu corrección detallada…",
        statusEvaluated: "Evaluada",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} palabras`,
        secureLevel: ({ level }) => `Nivel consolidado: ${level}`,
        demonstratedLevel: ({ level }) => `Nivel demostrado: ${level}`,
        previouslyRecordedLevel: ({ level }) => `Nivel registrado anteriormente: ${level}`,
        recordedLevel: ({ level }) => `Nivel registrado: ${level}`,
        cefrRationaleHeading: "Por qué esta estimación",
        cefrEstimateDisclosure:
          "Esta estimación automatizada se basa en la respuesta enviada. Un nivel C1/C2 solicitado para un ejemplo es un objetivo, no un resultado verificado.",
        cefrEvidenceHeading: "Evidencia observada en tu texto",
        cefrBlockerHeading: "Qué impide alcanzar el siguiente nivel",
        cefrConfidenceHeading: "Confianza en esta estimación",
        cefrConfidenceLevels: { High: "Alta", Medium: "Media", Low: "Baja", Unknown: "No evaluada (corrección anterior)" },
        legacyCefrDetailUnavailable: "No se registró por separado para esta corrección anterior — consulta la justificación anterior.",
        legacyCefrLevelNote:
          "Esta corrección es anterior a la distinción entre nivel demostrado y nivel consolidado — el nivel de abajo es la estimación única registrada en su momento, no un nivel consolidado verificado por separado.",
        downloadPdf: "Imprimir / Guardar como PDF",
        viewCorrection: "Ver corrección",
        tabOverview: "Resumen y puntuaciones",
        scoreDisclosure: "Indicadores de aprendizaje de mytcflab — no es una evaluación oficial del TCF.",
        globalPerformanceHeading: "Rendimiento global",
        overallScore: ({ score }) => `Indicador global de aprendizaje: ${score} %`,
        overallScoreDescription: "Promedio de los tres indicadores de aprendizaje de mytcflab que aparecen abajo.",
        tabCompared: "Comparar textos",
        tabComments: "Comentarios y consejos",
        tabMethodology: "Cómo se evaluó",
        methodology: [
          {
            kind: "paragraph",
            text: "La evaluación está diseñada para ayudarte a entender **con la mayor precisión posible dónde te encuentras hoy** y qué necesitas mejorar para alcanzar tu objetivo en el TCF Canadá.",
          },
          { kind: "heading", text: "1. Primero, comprobamos si completaste la tarea correctamente" },
          {
            kind: "paragraph",
            text: "Escribir bien en francés no es suficiente. Debes **hacer exactamente lo que la tarea pide**.",
          },
          { kind: "paragraph", text: "Por eso comprobamos si:" },
          {
            kind: "list",
            items: [
              "respondiste a todos los puntos requeridos",
              "desarrollaste tus ideas lo suficiente",
              "respetaste la situación planteada",
              "usaste el tono apropiado",
              "organizaste la información con claridad",
              "cumpliste el propósito de la tarea",
            ],
          },
          {
            kind: "paragraph",
            text: "Cada tarea del TCF exige habilidades diferentes. Por eso, la Tâche 1, la Tâche 2 y la Tâche 3 se evalúan de forma ligeramente distinta.",
          },
          { kind: "heading", text: "2. Luego, evaluamos la calidad de tu francés" },
          { kind: "paragraph", text: "Evaluamos principalmente:" },
          {
            kind: "list",
            items: [
              "la gramática",
              "la conjugación verbal",
              "la estructura de las oraciones",
              "la ortografía",
              "el vocabulario",
              "la elección y precisión de las palabras",
              "los conectores",
              "la organización de las ideas",
              "el registro y la naturalidad",
            ],
          },
          {
            kind: "paragraph",
            text: "No evaluamos tu nivel simplemente observando si sabes usar palabras difíciles.",
          },
          {
            kind: "paragraph",
            text: "Lo que más importa es si puedes **usar el francés de forma precisa y constante**.",
          },
          { kind: "heading", text: "3. Tu nivel B2, C1 o C2 se evalúa de forma prudente" },
          {
            kind: "paragraph",
            text: "La evaluación no busca encontrar el nivel más alto posible en tu texto.",
          },
          {
            kind: "paragraph",
            text: "Por ejemplo, escribir una sola oración muy sofisticada no significa automáticamente que tu nivel sea C1.",
          },
          {
            kind: "paragraph",
            text: "Para considerarte C1, las características del nivel C1 deben aparecer **de forma constante en todo tu texto**. El mismo principio se aplica al nivel C2.",
          },
          {
            kind: "paragraph",
            text: "Por lo tanto, cuando tu texto se sitúa entre dos niveles, usamos el nivel inferior hasta que demuestres el nivel superior de forma constante.",
          },
          { kind: "example", text: "B2/C1 → B2" },
          {
            kind: "paragraph",
            text: "Esto no significa que seas incapaz de producir algunas oraciones de nivel C1. Simplemente significa que necesitamos ver esa calidad de forma más constante antes de considerar el C1 un nivel consolidado.",
          },
          { kind: "heading", text: "4. Recibirás dos resultados importantes" },
          { kind: "paragraph", text: "**Nivel demostrado:** el nivel más alto que aparece en tu texto." },
          { kind: "paragraph", text: "**Nivel consolidado:** el nivel que demuestras de forma constante." },
          { kind: "example", text: "Nivel demostrado: C1 — Nivel consolidado: B2" },
          {
            kind: "paragraph",
            text: "Esto significa que tu texto muestra algunas características de nivel C1, pero aún existen debilidades importantes que impiden considerar el C1 como un nivel consolidado.",
          },
          {
            kind: "paragraph",
            text: "Esta distinción es importante porque el objetivo no es simplemente decir que \"pareces C1\". El objetivo es determinar **qué nivel puedes reproducir de forma fiable el día del examen**.",
          },
          { kind: "heading", text: "5. También recibirás una puntuación de 0 a 100" },
          { kind: "paragraph", text: "Esta puntuación es solo una herramienta de aprendizaje. Evalúa tres áreas:" },
          {
            kind: "list",
            items: [
              "**Contenido y cumplimiento de la tarea** — ¿Respondiste eficazmente a la tarea?",
              "**Francés** — ¿Qué tan buena es tu gramática, ortografía y construcción de oraciones?",
              "**Vocabulario y registro** — ¿Usas un lenguaje variado, preciso y adecuado para la situación?",
            ],
          },
          {
            kind: "paragraph",
            text: "Estas puntuaciones **no son puntuaciones oficiales del TCF** y no deben interpretarse directamente como una puntuación TCF o un nivel MCER.",
          },
          { kind: "heading", text: "6. Recibirás las correcciones de tus errores" },
          {
            kind: "paragraph",
            text: "Para cada error importante, te mostraremos: **Lo que escribiste → Cómo corregirlo → Por qué es incorrecto**",
          },
          {
            kind: "paragraph",
            text: "Esto te ayuda a identificar errores recurrentes y a enfocar tu práctica en las áreas que más necesitan mejorar.",
          },
          { kind: "heading", text: "7. También recibirás una versión modelo" },
          {
            kind: "paragraph",
            text: "Después de la corrección, recibirás una versión mejorada del texto. Esta versión está diseñada para ayudarte a estudiar:",
          },
          {
            kind: "list",
            items: [
              "vocabulario nuevo",
              "estructuras gramaticales",
              "conectores",
              "formas de desarrollar argumentos",
              "formas más naturales de expresar ideas",
            ],
          },
          {
            kind: "paragraph",
            text: "Pero recuerda: **la versión modelo no se usa para determinar tu nivel.** Tu nivel se determina únicamente a partir del texto que enviaste originalmente.",
          },
          { kind: "heading", text: "El objetivo de la evaluación" },
          {
            kind: "paragraph",
            text: "El propósito no es darte una puntuación alta solo para hacerte sentir bien. Tampoco es buscar errores simplemente para bajar tu puntuación.",
          },
          { kind: "paragraph", text: "El objetivo es responder a una pregunta simple:" },
          { kind: "example", text: "«Si hiciera un examen similar hoy, ¿qué nivel podría demostrar con confianza?»" },
          {
            kind: "paragraph",
            text: "Así sabrás exactamente **dónde estás, qué te impide alcanzar el siguiente nivel y qué necesitas practicar** antes de presentar el TCF Canadá.",
          },
        ],
        contentScoreLabel: "Contenido y pragmática",
        linguisticsScoreLabel: "Lingüística",
        vocabularyScoreLabel: "Vocabulario y registro",
        originalHeading: "Tu texto original",
        correctedHeading: "Texto corregido",
        correctionsHeading: ({ count }) => `Correcciones (${count})`,
        noCorrectionsNote: "No se identificaron correcciones específicas.",
        errorLabel: "Error",
        correctionLabel: "Corrección",
        noteLabel: "Nota",
        toggleNote: "Mostrar u ocultar la nota",
        commentsHeading: "Comentarios automatizados",
        modelVersionHeading: "Versión modelo generada por mytcflab",
        tryAgain: "Intentar de nuevo",
      },
      dialog: {
        title: "¿Descartar tu trabajo actual?",
        taskSwitchDescription: "Al cambiar de tarea se descartarán la consigna, el borrador y los comentarios actuales.",
        dashboardSwitchDescription:
          "Al ir al panel se descartarán la consigna, el borrador y los comentarios actuales.",
        adminSwitchDescription: "Al ir a Administración se descartarán la consigna, el borrador y los comentarios actuales.",
        topicSwitchDescription: "Al cambiar de consigna se descartarán la consigna, el borrador y los comentarios actuales.",
        exampleOverwriteDescription: "Generar un ejemplo reemplazará tu borrador actual.",
        exampleOverwriteConfirm: "Reemplazar borrador",
        clearDraftDescription: "Borrar descartará tu borrador y comentarios actuales.",
        clearDraftConfirm: "Borrar texto",
        confirm: "Descartar y cambiar",
        cancel: "Seguir trabajando",
      },
    },
  },
  pt: {
    common: {
      cancel: "Cancelar",
      close: "Fechar",
    },
    nav: {
      dashboard: "Painel",
      tasks: "Tarefa completa",
      practice: "Prática",
      settings: "Configurações",
      admin: "Admin",
      logIn: "Entrar",
      closeSettingsFirst: "Feche as configurações primeiro",
    },
    home: {
      title: "Escreva para o exame TCF. Receba comentários que ajudam você a alcançar B2, C1 ou C2.",
      description:
        "Pratique as tarefas 1, 2 e 3 e receba em segundos comentários sobre gramática, vocabulário e nível do QECR.",
      startATask: "Começar uma tarefa",
      getStarted: "Começar",
    },
    practice: {
      tasks: {
        TASK_1: { title: "Tarefa 1", description: "Comunique-se com eficácia em uma mensagem curta, para o destinatário e no registro adequados." },
        TASK_2: { title: "Tarefa 2", description: "Conte e comente uma experiência em um e-mail ou publicação de blog para leitores específicos." },
        TASK_3: { title: "Tarefa 3", description: "Compare pontos de vista e defenda uma posição ponderada sobre uma questão social." },
      },
      levels: {
        B2: { title: "B2", description: "Ideias claras, conectadas e suficientemente desenvolvidas." },
        C1: { title: "C1", description: "Organização flexível, pontos de vista relacionados e nuance." },
        C2: { title: "C2", description: "Domínio muito preciso, autônomo e adaptado à situação." },
      },
      stages: { recognize: "Reconhecer", complete: "Completar", transform: "Transformar", organize: "Organizar", develop: "Desenvolver", produce: "Produzir" },
      completedEyebrow: "Sequência concluída",
      completedTitle: ({ part }) => `Você trabalhou: ${part}`,
      completedDescription: ({ outcome }) => `Você passou do reconhecimento à produção autônoma. Use isto na sua próxima redação completa: ${outcome}`,
      nextActionDescription: "Agora aplique esta parte em uma tarefa TCF completa ou escolha outra parte.",
      replayWithVariants: "Repetir com novas variantes",
      startFresh: "Começar do zero",
      chooseAnotherPart: "Escolher outra parte da tarefa",
      tryFullTask: "Experimentar uma tarefa completa",
      eyebrow: "Prática direcionada",
      title: "Trabalhe uma parte da tarefa de cada vez.",
      description: "Isto não é uma simulação de exame. Escolha uma tarefa, seu nível-alvo e uma parte da tarefa; em seguida, você seguirá uma progressão fixa e revisada, do reconhecimento à produção autônoma.",
      chooseTask: "1. Qual tarefa você quer melhorar?",
      chooseLevel: "2. Qual é seu nível-alvo?",
      levelHelp: "Escolha primeiro uma tarefa: a dificuldade está ligada ao objetivo de escrita.",
      choosePart: "3. Parte a trabalhar",
      partPlaceholder: "Parte a trabalhar",
      partLabel: ({ order }) => `Parte ${order}`,
      previewEyebrow: "Seu plano de prática",
      previewTitle: ({ part }) => `Praticar: ${part}`,
      previewOutcomeLabel: "Ao final, você saberá:",
      previewStagesLabel: "Suas seis etapas",
      resumeEyebrow: "Salvo neste dispositivo",
      resumeTitle: ({ part }) => `Retomar: ${part}`,
      resumeDescription: ({ step, total }) => `Continue na etapa ${step} de ${total}.`,
      localSessionNotice: "Suas respostas ficam apenas neste navegador até você concluir ou descartar esta sessão.",
      resumeSession: "Retomar a prática",
      discardSavedSession: "Descartar sessão salva",
      durationAndSteps: ({ minutes, steps }) => `${minutes} min · ${steps} exercícios selecionados`,
      unavailableCombination: "Esta combinação ainda não tem uma sequência validada. Escolha outro nível ou tarefa: nunca exibimos exercícios gerados automaticamente.",
      unavailableTitle: ({ task, level }) => `${task} no nível ${level} ainda não está disponível`,
      unavailableDescription: "Estas partes da tarefa ainda estão em revisão. Escolha abaixo um nível disponível para praticar esta tarefa agora.",
      availableLevelsLabel: "Níveis disponíveis para esta tarefa:",
      availableLevel: ({ level, parts }) => `${level} · ${parts} ${parts === 1 ? "parte" : "partes"}`,
      partHelp: "As partes disponíveis seguem a tarefa e o nível-alvo escolhidos.",
      changePart: "← Mudar de parte da tarefa",
      sequenceDescription: ({ count }) => `Esta prática contém ${count} exercícios revisados em uma progressão guiada.`,
      progress: ({ step, total }) => `Etapa ${step} de ${total}`,
      stageMap: ({ current, next }) => (next ? `Agora: ${current}. Próxima: ${next}.` : `Agora: ${current}. Esta é sua última etapa.`),
      attentionLabel: "Ponto de atenção:",
      selectAnswer: "Escolha sua resposta",
      selectOrder: "Escolha a ordem mais lógica",
      reorderItems: "Reorganize os elementos",
      moveUp: "Subir",
      moveDown: "Descer",
      responseLabel: "Sua resposta em francês",
      responsePlaceholder: "Escreva sua resposta em francês…",
      suggestionPlaceholder: "Escreva sua proposta em francês…",
      correctFeedback: "Muito bem.",
      selfReviewFeedback: "Revise sua produção com esta lista.",
      retryFeedback: "Ainda não; modifique sua resposta e tente novamente.",
      revealedFeedback: "Esta é a resposta revisada. Use-a para entender a habilidade praticada e continue quando estiver pronto.",
      reviewedAnswerLabel: "Resposta revisada:",
      explanationLabel: "Por que está correta:",
      completedWithHelpLabel: "Concluído com ajuda",
      finishSequence: "Terminar a sequência",
      nextExercise: "Próximo exercício",
      selfReview: "Ver minha lista de autoavaliação",
      showHint: "Ver uma dica",
      hideHint: "Ocultar a dica",
      hintLabel: "Uma forma de começar:",
      hintNotice: "É uma sugestão, não uma resposta. Continue escrevendo com suas próprias palavras.",
      verify: "Verificar",
      revealAnswer: "Ver a resposta",
      retryHint: "Você pode modificar sua resposta e tentar novamente quantas vezes precisar.",
      difficultyPrompt: "Opcional: como este exercício pareceu para você?",
      difficultyTooEasy: "Fácil demais",
      difficultyAppropriate: "Adequado",
      difficultyTooHard: "Difícil demais",
      difficultyRecorded: "Obrigado — registrado para esta sessão de prática.",
    },
    login: {
      title: "Entrar",
      emailLabel: "E-mail",
      passwordLabel: "Senha",
      invalidCredentials: "E-mail ou senha inválidos.",
      submitting: "Entrando…",
      submit: "Entrar",
      noAccount: "Ainda não tem uma conta?",
      signUp: "Criar conta",
    },
    signup: {
      title: "Crie sua conta",
      nameLabel: "Nome",
      emailLabel: "E-mail",
      passwordLabel: "Senha",
      invalidInput: "Informe um e-mail válido e uma senha de pelo menos 8 caracteres.",
      emailInUse: "Já existe uma conta com este e-mail.",
      genericError: "Algo deu errado. Tente novamente.",
      automaticLoginFailed:
        "A conta foi criada, mas o login automático falhou. Entre na sua conta.",
      submitting: "Criando conta…",
      submit: "Criar conta",
      alreadyHaveAccount: "Já tem uma conta?",
      logIn: "Entrar",
    },
    dashboard: {
      welcome: (name) => `Bem-vindo de volta, ${name}`,
      startHereEyebrow: "Seu primeiro passo",
      startHereTitle: "Como você gostaria de começar?",
      startHereDescription: "Escolha a prática de uma habilidade ou uma tarefa TCF completa. Seu progresso aparecerá aqui após sua primeira atividade.",
      practiceStartTitle: "Treine uma habilidade primeiro",
      practiceStartDescription: "Trabalhe uma parte da tarefa passo a passo, da prática guiada à escrita independente.",
      practiceStartAction: "Ir para Prática",
      tasksStartTitle: "Experimente uma tarefa completa",
      tasksStartDescription: "Escreva uma resposta TCF completa e receba feedback sobre sua escrita.",
      tasksStartAction: "Ir para a tarefa completa",
      practiceActivityTitle: "Atividade de prática",
      practiceExercisesCompleted: ({ count }) => `${count} exercício${count === 1 ? "" : "s"} concluído${count === 1 ? "" : "s"}`,
      practiceCompletionBreakdown: ({ independent, helped }) => `${independent} de forma independente · ${helped} com ajuda`,
      practiceTaskPartsCompleted: ({ count }) => `${count} parte${count === 1 ? "" : "s"} da tarefa trabalhada${count === 1 ? "" : "s"}`,
      continuePractice: "Continuar praticando",
      practiceActionsMenu: "Mais opções",
      clearPracticeProgressAction: "Limpar progresso",
      clearPracticeProgressConfirmTitle: "Limpar todo o progresso de prática?",
      clearPracticeProgressConfirmDescription:
        "Isso remove todos os exercícios concluídos e as partes da tarefa treinadas. Você começará cada sequência do zero da próxima vez. Essa ação não pode ser desfeita.",
      clearPracticeProgressConfirm: "Limpar progresso",
      clearPracticeProgressError: "Não foi possível limpar seu progresso de prática. Tente novamente.",
      clearPracticeProgressSuccess: "Progresso de prática limpo.",
      accountUnavailableTitle: "É preciso concluir a configuração da sua conta",
      accountUnavailableDescription:
        "Ainda não conseguimos vincular esta conta do Clerk aos seus dados do MyTCFLab. Tente novamente em alguns instantes. Se você já tinha uma conta, ela precisa ser importada primeiro.",
      chartTitle: "Evolução do nível",
      chartCaption: ({ count }) => `Últimas ${count} tentativas por tarefa`,
      emptyTitle: "Ainda não há redações corrigidas",
      emptyDescription: "Conclua uma tarefa e a corrija para começar a acompanhar seu nível do QECR ao longo do tempo.",
      taskLegend: ({ number }) => `Tarefa ${number}`,
      levelAxisLabel: "Nível do QECR",
      attemptAxisLabel: "Tentativa",
      recentCorrectionsTitle: "Correções recentes",
      viewAllCorrections: "Ver todo o histórico de correções",
      correctionHistoryTitle: "Histórico de correções",
      noCorrectionHistoryTitle: "Ainda não há correções",
      noCorrectionHistoryDescription: "Suas respostas corrigidas aparecerão aqui.",
      limitedCorrectionDetails: "A revisão detalhada não está disponível para esta correção anterior.",
      backToCorrectionHistory: "Voltar ao histórico de correções",
      backToDashboard: "Voltar ao painel",
      attemptedOn: ({ date }) => `Corrigida em ${date}`,
      correctionActionsMenu: "Mais opções",
      deleteCorrectionAction: "Excluir",
      deleteCorrectionConfirmTitle: "Excluir esta correção?",
      deleteCorrectionConfirmDescription:
        "Esta resposta e seus comentários serão excluídos permanentemente. Essa ação não pode ser desfeita.",
      deleteCorrectionConfirm: "Excluir",
      deleteCorrectionError: "Não foi possível excluir esta correção. Tente novamente.",
      deleteCorrectionSuccess: "Correção excluída.",
    },
    settings: {
      title: "Configurações",
      appearanceHeading: "Aparência",
      appearanceDescription:
        "Escolha a aparência do MyTCFLab neste dispositivo, incluindo o login e a criação de conta.",
      themeLight: "Claro",
      themeDark: "Escuro",
      themeSystem: "Igual ao sistema",
      languageHeading: "Idioma",
      languageDescription: "Escolha o idioma usado na interface, nos comentários e no painel de tradução.",
      helpHeading: "Ajuda e suporte",
      helpDescription: "Tem uma dúvida ou encontrou um problema? Fale conosco, teremos prazer em ajudar.",
    },
    walkthrough: {
      takeATour: "Fazer o tour",
      stepProgress: ({ step, total }) => `Etapa ${step} de ${total}`,
      next: "Avançar",
      back: "Voltar",
      skip: "Pular",
      finish: "Concluir",
      continueToPractice: "Continuar para Prática",
      continueToFullTask: "Continuar para a tarefa completa",
      dashboardWelcomeTitle: "Bem-vindo ao MyTCFLab",
      dashboardWelcomeBody:
        "Este é o seu painel — seu nível QECR ao longo do tempo e suas correções recentes aparecerão aqui depois de algumas redações.",
      dashboardCorrectionsTitle: "Suas correções recentes",
      dashboardCorrectionsBody:
        "A nota e o nível estimado de cada redação corrigida aparecem abaixo do gráfico, para você acompanhar exatamente como foi cada tentativa.",
      settingsTitle: "Personalize o aplicativo",
      settingsBody: "Abra Configurações para escolher o idioma e a aparência da interface ou encontrar ajuda e suporte quando precisar.",
      dashboardPracticeTitle: "Treine uma parte da tarefa antes de redigir a resposta completa",
      dashboardPracticeBody: "Prática é seu treinador de escrita. Ela ajuda você a treinar uma parte numerada de uma tarefa TCF no seu nível-alvo antes de escrever uma resposta completa.",
      dashboardStartWritingTitle: "Pronto para uma tarefa completa?",
      dashboardStartWritingBody: "Abra a tarefa completa para escolher um enunciado de exame e receber sua primeira correção.",
      practiceIntroTitle: "A prática desenvolve uma parte da tarefa",
      practiceIntroBody: "Esta página não é uma simulação de exame. Escolha uma parte da tarefa e pratique-a em uma sequência progressiva e revisada antes de escrever uma resposta TCF completa.",
      practicePartsTitle: "As partes são as mesmas; o nível muda a exigência",
      practicePartsBody: "Cada tarefa tem uma estrutura numerada fixa. B2, C1 e C2 praticam a mesma parte com uma linguagem cada vez mais autônoma, precisa e nuançada. Apenas sequências revisadas podem ser iniciadas.",
      practiceStagesTitle: "Seis etapas, do reconhecimento à escrita autônoma",
      practiceStagesBody: "Cada parte segue o mesmo plano fixo: Reconhecer, Completar, Transformar, Organizar, Desenvolver e depois Produzir. Cada etapa retira um pouco mais de apoio, para que você termine capaz de escrevê-la sozinho. Quando estiver pronto, abra a tarefa completa para aplicar o que treinou em uma resposta TCF completa.",
      taskPickerTitle: "Escolha uma tarefa",
      taskPickerBody:
        "A expressão escrita do TCF tem três tipos de tarefa: a Tarefa 1 (comunicar-se com eficácia em uma mensagem curta, para o destinatário e o registro adequados), a Tarefa 2 (narrar uma experiência para vários destinatários, com comentários adequados ao seu objetivo) e a Tarefa 3 (analisar um tema sob diferentes pontos de vista). Vamos percorrer a Tarefa 1 como exemplo.",
      topicPickerTitle: "Escolha um enunciado de exame",
      topicPickerBody:
        "Os enunciados de provas recentes vêm diretamente de provas reais do TCF publicadas recentemente neste site, para você praticar sempre com um enunciado autêntico. Você também pode colar o seu próprio enunciado.",
      timedTaskTourTitle: "Pratique nas condições da prova",
      timedTaskTourBody: "Inicie uma tarefa cronometrada quando quiser praticar com a pressão de tempo real da prova. Ela acompanha o tempo sugerido para esta tarefa e continua em segundo plano enquanto você escreve.",
      guidedWritingTitle: "Planeje antes de escrever",
      guidedWritingBody:
        "Abra o Guia de escrita quando precisar de ideias. Escolha a situação de escrita e use suas perguntas de planejamento, frases em francês e tempos verbais sugeridos para o nível desejado.",
      editorTitle: "Escreva sua resposta",
      editorBody:
        "Escreva sua resposta em francês aqui — colamos uma resposta de exemplo para você ver o restante do tour. A contagem de palavras é atualizada conforme você digita.",
      correctButtonTitle: "Receba feedback",
      correctButtonBody:
        "Quando estiver pronto, clique em Corrigir para receber feedback sobre gramática, vocabulário e nível QECR. Vamos ver como isso fica.",
      correctionModalTitle: "Sua correção",
      correctionModalBody:
        "Seu texto corrigido, um nível QECR estimado e feedback detalhado abrem bem aqui. As abas Visão geral, Comparação e Comentários detalham tudo.",
      exampleGenerateTitle: "Precisa de inspiração?",
      exampleGenerateBody:
        "Gerar exemplo escreve uma resposta modelo completa no nível QECR escolhido, para você ver como é uma boa resposta. Não vamos gerar nenhuma durante o tour — experimente quando quiser.",
      editorCopyTitle: "Copie seu texto",
      editorCopyBody:
        "Copiar envia sua resposta para a área de transferência, útil para colar em um documento ou em uma prova oficial de treino.",
      editorClearTitle: "Recomeçar",
      editorClearBody: "Limpar esvazia a resposta para você começar um rascunho novo.",
      translationTitle: "Traduza sua resposta",
      translationBody:
        "Mostrar tradução traduz sua resposta para o idioma da interface, para você conferir o sentido sem sair da página. Ela só traduz quando você pede, e só o que você adicionou desde a última vez, para economizar sua cota de tradução.",
      navTitle: "Seu progresso",
      navBody: "Volte aqui quando quiser para ver seu histórico de correções e seu nível estimado.",
      previewFeedback: {
        summary:
          "No geral, um francês sólido e natural — apenas dois pequenos erros de concordância impedem uma nota mais alta.",
        cefrRationale:
          "O vocabulário e a estrutura das frases correspondem ao nível B1, mas os dois erros de concordância abaixo são o principal obstáculo para o B2.",
        cefrEvidence: "Vocabulário cotidiano preciso e estrutura de frases majoritariamente correta ao longo da resposta.",
        cefrBlocker: "Os dois erros de concordância abaixo são o principal obstáculo para uma estimativa B2.",
        wordCountNote: "Dentro da faixa esperada para esta tarefa.",
        contentNote: "Responde claramente ao enunciado com detalhes relevantes e bem organizados.",
        linguisticsNote: "Gramática majoritariamente correta, com dois erros de concordância do particípio passado.",
        vocabularyNote: "Bom vocabulário do dia a dia e um tom natural e caloroso.",
        agreementErrorExplanation:
          "O particípio passado deve concordar em gênero e número com um objeto direto que o precede.",
        participleErrorExplanation:
          "Com être, o particípio passado concorda com o sujeito — “resté” precisa de um “s” para concordar com “nous”.",
        suggestionOne: "Revise as regras de concordância do particípio passado com avoir e être.",
        suggestionTwo:
          "Tente ler seu rascunho em voz alta — erros de concordância costumam ser mais fáceis de ouvir do que de ver.",
      },
    },
    workspace: {
      task: {
        heading: "1. Escolha uma tarefa",
        targetLength: ({ minWords, maxWords }) => `Extensão desejada: ${minWords}–${maxWords} palavras.`,
      },
      topic: {
        heading: "2. Escolha um enunciado de exame",
        recentExamTitle: "Obtenha um enunciado de exames recentes",
        recentExamDescription: "Carregue um enunciado autêntico para a tarefa escolhida.",
        customTitle: "Escreva ou cole meu próprio enunciado",
        customDescription: "Use um enunciado de exame que você já tenha.",
        loading: "Obtendo um enunciado de exames recentes…",
        fetchError:
          "Não foi possível obter um enunciado de exames recentes. Tente novamente ou escreva o seu.",
        unavailableError:
          "O enunciado de exames recentes não está disponível. Tente novamente ou escreva o seu.",
        notPublishedError:
          "Nenhum enunciado de exames recentes foi publicado para este mês nem para o anterior. Escreva ou cole o seu.",
        selectedRecentExamAriaLabel: "Enunciado de exame recente selecionado",
        sourceLabel: "Fonte:",
        recentExamsSource: ({ month }) => `Exames recentes — ${month}`,
        customTopicLabel: "Seu enunciado de exame",
        customTopicPlaceholder: "Cole ou escreva o enunciado de exame ao qual você quer responder…",
      },
      editor: {
        heading: "3. Escreva",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} palavras`,
        responseLabel: "Sua resposta",
        frenchResponsePlaceholder: "Rédigez votre réponse ici, en français…",
        correct: "Corrigir",
        correcting: "Corrigindo…",
        correctingStatus: "Estamos preparando seus comentários. Isso pode levar um momento.",
        genericCorrectionError: "Algo deu errado.",
        alreadyCorrected:
          "Esta versão já foi corrigida. Edite sua resposta ou enunciado de exame para solicitar uma nova correção.",
        correctionInProgress:
          "Já existe uma correção desta resposta exata em andamento. Aguarde a conclusão ou edite a resposta ou o enunciado de exame antes de solicitar outra.",
        exampleLevelLabel: "Nível desejado",
        generateExample: "Gerar exemplo",
        generatingExample: "Gerando…",
        generatingExampleStatus: "Gerando uma resposta de exemplo. Isso pode levar um momento.",
        exampleRateLimitedError: "O gerador de exemplos está ocupado. Tente novamente em instantes.",
        exampleDailyLimitError: "Você atingiu o limite de exemplos de hoje. Tente novamente amanhã.",
        exampleUnavailableError: "O gerador de exemplos não está disponível no momento.",
        exampleGenericError: "Não conseguimos gerar um exemplo. Tente novamente.",
        exampleNeedsTopicWarning:
          "Escolha um enunciado de exames recentes ou cole o seu antes de gerar um exemplo.",
        copy: "Copiar texto",
        copied: "Copiado!",
        copyFailed: "Não foi possível copiar",
        clear: "Limpar texto",
      },
      guidedWriting: {
        show: "Guia de escrita",
        hide: "Ocultar guia de escrita",
        heading: "Guia de escrita",
        guideForLevel: ({ level }) => `Guia para o nível ${level}`,
        contextConfirmHeading: "Situação de escrita",
        contextConfirmPrompt: "Para quem você está escrevendo?",
        contextConfirmTextTypePrompt: "Que tipo de texto você está escrevendo e para quais leitores?",
        contextConfirmAction: "Usar esta opção",
        changeContext: "Alterar",
        contextLabel: ({ profile }) => `Estilo: ${profile}`,
        previousStage: "Etapa anterior",
        nextStage: "Próxima etapa",
        optionalStep: "Opcional",
        ideasLabel: "O que você pode dizer?",
        tensesLabel: "Tempos verbais a considerar",
        tensesHint: "Use apenas o que combinar com o tema: francês correto vale mais do que usar muitos tempos verbais.",
        completionCheckLabel: "Antes de terminar",
        examplesLabel: "Formules à adapter à votre sujet",
        morePhrases: "Voir plus de formules",
      },
      timedTask: {
        show: "Tarefa cronometrada",
        heading: "Tarefa cronometrada",
        suggestedTotalTime: ({ minutes }) => `Tempo sugerido para esta tarefa: ${minutes} min`,
        phaseDuration: ({ label, minutes }) => `${label} · ${minutes} min`,
        start: "Iniciar tarefa cronometrada",
        pause: "Pausar",
        paused: "Pausado",
        resume: "Retomar",
        end: "Encerrar",
        remaining: ({ minutes, seconds }) => `${minutes}:${seconds} restantes`,
        timeUp: "O tempo acabou — termine ou continue escrevendo.",
        continueForTwoMinutes: "Adicionar 2 minutos",
        summaryHeading: "Resumo da tarefa cronometrada",
        summaryActualTime: ({ time }) => `Tempo gasto: ${time}`,
        summaryTargetTime: ({ time }) => `Tempo previsto: ${time}`,
        summaryWordCount: ({ count }) => `Palavras: ${count}`,
        summaryPhaseReached: "Concluída",
        summaryPhaseNotReached: "Não concluída",
        summaryClose: "Fechar resumo",
        phaseLabels: {
          plan: "Planejar",
          write: "Escrever",
          analyse: "Analisar os documentos",
          synthesise: "Resumir os dois pontos de vista",
          argue: "Apresentar e defender sua posição",
          check: "Revisar e terminar",
        },
        phasePrompts: {
          plan: "Identifique o destinatário, o objetivo e uma estrutura simples antes de escrever.",
          write: "Responda a todos os pontos solicitados e conecte bem suas ideias.",
          analyse: "Leia os dois documentos e identifique a ideia central de cada um.",
          synthesise: "Apresente os dois pontos de vista antes de dar sua opinião.",
          argue: "Apresente uma posição clara com dois ou três argumentos desenvolvidos.",
          check: "Verifique a quantidade de palavras, o registro, as concordâncias, os acentos e os verbos.",
        },
      },
      translation: {
        heading: ({ language }) => `Tradução (${language})`,
        show: "Mostrar tradução",
        update: "Atualizar tradução",
        hide: "Ocultar tradução",
        inProgress: "Traduzindo…",
        unavailableError: "A tradução não está disponível no momento.",
        rateLimitedError: "Você está traduzindo rápido demais. Aguarde um momento e tente novamente.",
        monthlyQuotaError: "Você atingiu o limite mensal de tradução. Tente novamente no próximo mês.",
        tooLong: ({ maxCharacters }) =>
          `A tradução está disponível para rascunhos de até ${maxCharacters} caracteres. Este rascunho é maior; envie-o para correção e receba comentários completos.`,
        unofficialFallbackNotice:
          "Esta tradução usou um método de backup não oficial, não a API do DeepL. Ela pode ser menos precisa e ficar indisponível ocasionalmente.",
      },
      feedback: {
        heading: ({ language }) => `Comentários (${language})`,
        estimatedLevel: ({ level }) => `Nível QECR / CECRL estimado: ${level}`,
        generatedInOtherLanguage: ({ generatedLanguage, selectedLanguage }) =>
          `Estes comentários foram gerados em ${generatedLanguage}. Eles continuam disponíveis nesse idioma enquanto a interface está em ${selectedLanguage}.`,
        stale:
          "Você editou sua resposta desde estes comentários. Selecione Corrigir novamente para receber comentários sobre seu último rascunho.",
        correctedText: "Texto corrigido",
        errors: ({ count }) => `Erros (${count})`,
        suggestions: "Sugestões",
        errorCategories: {
          grammar: "Gramática",
          vocabulary: "Vocabulário",
          spelling: "Ortografia",
          syntax: "Sintaxe",
          punctuation: "Pontuação",
          register: "Registro",
        },
      },
      correctionModal: {
        title: ({ taskLabel }) => `Correção: ${taskLabel}`,
        submissionId: ({ id }) => `ID da resposta: ${id}`,
        loading: "Preparando sua correção detalhada…",
        statusEvaluated: "Avaliada",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} palavras`,
        secureLevel: ({ level }) => `Nível consolidado: ${level}`,
        demonstratedLevel: ({ level }) => `Nível demonstrado: ${level}`,
        previouslyRecordedLevel: ({ level }) => `Nível registrado anteriormente: ${level}`,
        recordedLevel: ({ level }) => `Nível registrado: ${level}`,
        cefrRationaleHeading: "Por que esta estimativa",
        cefrEstimateDisclosure:
          "Esta estimativa automatizada se baseia na resposta enviada. Um nível C1/C2 solicitado para um exemplo é uma meta, não um resultado verificado.",
        cefrEvidenceHeading: "Evidências observadas no seu texto",
        cefrBlockerHeading: "O que está impedindo o próximo nível",
        cefrConfidenceHeading: "Confiança nesta estimativa",
        cefrConfidenceLevels: { High: "Alta", Medium: "Média", Low: "Baixa", Unknown: "Não avaliada (correção anterior)" },
        legacyCefrDetailUnavailable: "Não registrado separadamente para esta correção anterior — veja a justificativa acima.",
        legacyCefrLevelNote:
          "Esta correção é anterior à distinção entre nível demonstrado e nível consolidado — o nível abaixo é a estimativa única registrada na época, não um nível consolidado verificado separadamente.",
        downloadPdf: "Imprimir / Salvar como PDF",
        viewCorrection: "Ver correção",
        tabOverview: "Visão geral e notas",
        scoreDisclosure: "Indicadores de aprendizagem do mytcflab — não é uma avaliação oficial do TCF.",
        globalPerformanceHeading: "Desempenho geral",
        overallScore: ({ score }) => `Indicador geral de aprendizagem: ${score}%`,
        overallScoreDescription: "Média dos três indicadores de aprendizagem do mytcflab abaixo.",
        tabCompared: "Comparar textos",
        tabComments: "Comentários e dicas",
        tabMethodology: "Como foi avaliado",
        methodology: [
          {
            kind: "paragraph",
            text: "A avaliação foi criada para ajudar você a entender **com a maior precisão possível onde você está hoje** e o que precisa melhorar para alcançar seu objetivo no TCF Canadá.",
          },
          { kind: "heading", text: "1. Primeiro, verificamos se você realizou a tarefa corretamente" },
          {
            kind: "paragraph",
            text: "Escrever bem em francês não é suficiente. Você precisa **fazer exatamente o que a tarefa pede**.",
          },
          { kind: "paragraph", text: "Por isso, verificamos se você:" },
          {
            kind: "list",
            items: [
              "respondeu a todos os pontos exigidos",
              "desenvolveu suas ideias o suficiente",
              "respeitou a situação apresentada",
              "usou o tom apropriado",
              "organizou as informações com clareza",
              "cumpriu o objetivo da tarefa",
            ],
          },
          {
            kind: "paragraph",
            text: "Cada tarefa do TCF exige habilidades diferentes. Por isso, a Tâche 1, a Tâche 2 e a Tâche 3 são avaliadas de forma um pouco diferente.",
          },
          { kind: "heading", text: "2. Em seguida, avaliamos a qualidade do seu francês" },
          { kind: "paragraph", text: "Avaliamos principalmente:" },
          {
            kind: "list",
            items: [
              "gramática",
              "conjugação verbal",
              "estrutura das frases",
              "ortografia",
              "vocabulário",
              "escolha e precisão das palavras",
              "conectores",
              "organização das ideias",
              "registro e naturalidade",
            ],
          },
          {
            kind: "paragraph",
            text: "Não avaliamos seu nível apenas observando se você sabe usar palavras difíceis.",
          },
          {
            kind: "paragraph",
            text: "O que mais importa é se você consegue **usar o francês de forma precisa e consistente**.",
          },
          { kind: "heading", text: "3. Seu nível B2, C1 ou C2 é avaliado de forma conservadora" },
          {
            kind: "paragraph",
            text: "A avaliação não tenta encontrar o nível mais alto possível no seu texto.",
          },
          {
            kind: "paragraph",
            text: "Por exemplo, escrever uma única frase muito sofisticada não significa automaticamente que seu nível é C1.",
          },
          {
            kind: "paragraph",
            text: "Para ser considerado C1, as características do nível C1 precisam aparecer **de forma consistente em todo o seu texto**. O mesmo princípio vale para o nível C2.",
          },
          {
            kind: "paragraph",
            text: "Por isso, quando seu texto fica entre dois níveis, usamos o nível mais baixo até que o nível mais alto seja demonstrado de forma consistente.",
          },
          { kind: "example", text: "B2/C1 → B2" },
          {
            kind: "paragraph",
            text: "Isso não significa que você seja incapaz de produzir algumas frases de nível C1. Significa apenas que precisamos ver essa qualidade de forma mais consistente antes de considerar o C1 um nível consolidado.",
          },
          { kind: "heading", text: "4. Você recebe dois resultados importantes" },
          { kind: "paragraph", text: "**Nível demonstrado:** o nível mais alto que aparece no seu texto." },
          { kind: "paragraph", text: "**Nível consolidado:** o nível que você demonstra de forma consistente." },
          { kind: "example", text: "Nível demonstrado: C1 — Nível consolidado: B2" },
          {
            kind: "paragraph",
            text: "Isso significa que seu texto mostra algumas características de nível C1, mas ainda há fraquezas importantes que impedem o C1 de ser considerado um nível consolidado.",
          },
          {
            kind: "paragraph",
            text: "Essa distinção é importante porque o objetivo não é apenas dizer que você \"parece C1\". O objetivo é determinar **qual nível você consegue reproduzir de forma confiável no dia da prova**.",
          },
          { kind: "heading", text: "5. Você também recebe uma pontuação de 0 a 100" },
          { kind: "paragraph", text: "Essa pontuação é apenas uma ferramenta de aprendizagem. Ela avalia três áreas:" },
          {
            kind: "list",
            items: [
              "**Conteúdo e cumprimento da tarefa** — Você respondeu à tarefa de forma eficaz?",
              "**Francês** — Qual é a qualidade da sua gramática, ortografia e construção de frases?",
              "**Vocabulário e registro** — Você usa uma linguagem variada, precisa e adequada à situação?",
            ],
          },
          {
            kind: "paragraph",
            text: "Essas pontuações **não são pontuações oficiais do TCF** e não devem ser interpretadas diretamente como uma pontuação do TCF ou um nível do QECR.",
          },
          { kind: "heading", text: "6. Você recebe as correções dos seus erros" },
          {
            kind: "paragraph",
            text: "Para cada erro importante, mostraremos: **O que você escreveu → Como corrigir → Por que está incorreto**",
          },
          {
            kind: "paragraph",
            text: "Isso ajuda você a identificar erros recorrentes e a concentrar sua prática nas áreas que mais precisam melhorar.",
          },
          { kind: "heading", text: "7. Você também recebe uma versão modelo" },
          {
            kind: "paragraph",
            text: "Após a correção, você recebe uma versão aprimorada do texto. Essa versão foi criada para ajudar você a estudar:",
          },
          {
            kind: "list",
            items: [
              "vocabulário novo",
              "estruturas gramaticais",
              "conectores",
              "formas de desenvolver argumentos",
              "formas mais naturais de expressar ideias",
            ],
          },
          {
            kind: "paragraph",
            text: "Mas lembre-se: **a versão modelo não é usada para determinar seu nível.** Seu nível é determinado apenas a partir do texto que você enviou originalmente.",
          },
          { kind: "heading", text: "O objetivo da avaliação" },
          {
            kind: "paragraph",
            text: "O propósito não é dar a você uma nota alta apenas para te fazer sentir bem. Também não é procurar erros simplesmente para baixar sua nota.",
          },
          { kind: "paragraph", text: "O objetivo é responder a uma pergunta simples:" },
          { kind: "example", text: "\"Se eu fizesse uma prova semelhante hoje, que nível eu conseguiria demonstrar com confiança?\"" },
          {
            kind: "paragraph",
            text: "Assim, você saberá exatamente **onde está, o que impede você de alcançar o próximo nível e o que precisa praticar** antes de fazer o TCF Canadá.",
          },
        ],
        contentScoreLabel: "Conteúdo e pragmática",
        linguisticsScoreLabel: "Linguística",
        vocabularyScoreLabel: "Vocabulário e registro",
        originalHeading: "Seu texto original",
        correctedHeading: "Texto corrigido",
        correctionsHeading: ({ count }) => `Correções (${count})`,
        noCorrectionsNote: "Nenhuma correção específica foi identificada.",
        errorLabel: "Erro",
        correctionLabel: "Correção",
        noteLabel: "Nota",
        toggleNote: "Mostrar ou ocultar a nota",
        commentsHeading: "Comentários automatizados",
        modelVersionHeading: "Versão modelo gerada pelo mytcflab",
        tryAgain: "Tentar novamente",
      },
      dialog: {
        title: "Descartar seu trabalho atual?",
        taskSwitchDescription: "Trocar de tarefa descartará o enunciado, o rascunho e os comentários atuais.",
        dashboardSwitchDescription: "Ir para o painel descartará o enunciado, o rascunho e os comentários atuais.",
        adminSwitchDescription: "Ir para a administração descartará o enunciado, o rascunho e os comentários atuais.",
        topicSwitchDescription: "Trocar de enunciado descartará o enunciado, o rascunho e os comentários atuais.",
        exampleOverwriteDescription: "Gerar um exemplo substituirá seu rascunho atual.",
        exampleOverwriteConfirm: "Substituir rascunho",
        clearDraftDescription: "Limpar descartará seu rascunho e comentários atuais.",
        clearDraftConfirm: "Limpar texto",
        confirm: "Descartar e trocar",
        cancel: "Continuar trabalhando",
      },
    },
  },
} satisfies Record<AppLocale, AppCopy>;

export function getAppCopy(locale: AppLocale): AppCopy {
  return APP_COPY[locale];
}
