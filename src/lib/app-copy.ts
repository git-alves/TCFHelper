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
    support: string;
    settings: string;
    admin: string;
    logIn: string;
    closeSettingsFirst: string;
    closeSupportFirst: string;
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
    sections: Record<
      "t1_opening" | "t1_development" | "t1_closing" | "t2_situation" | "t2_events" | "t2_comment" | "t3_synthesis" | "t3_position" | "t3_arguments",
      { label: string; guidance: string }
    >;
    eyebrow: string;
    title: string;
    description: string;
    chooseTask: string;
    chooseLevel: string;
    levelHelp: string;
    previewEyebrow: string;
    previewTitle: (values: { task: string; level: string }) => string;
    previewSectionsLabel: string;
    wordRange: (values: { min: number; max: number }) => string;
    startExercise: string;
    backToChoice: string;
    scenarioLabel: string;
    requiredElementsLabel: string;
    documentsLabel: string;
    examTaskLanguageNote: string;
    sectionHeading: (values: { number: number; label: string }) => string;
    draftLabel: (values: { label: string }) => string;
    draftPlaceholder: string;
    exampleLabel: string;
    connectorsLabel: string;
    wordCounter: (values: { words: number; min: number; max: number }) => string;
    showModelAnswer: string;
    modelAnswerLabel: string;
    compareHint: string;
    progress: (values: { viewed: number; total: number }) => string;
    draftSavedNotice: string;
    completedEyebrow: string;
    completedTitle: string;
    completedDescription: string;
    completedWithHelpDescription: string;
    practiceAgain: string;
    chooseAnother: string;
    tryFullTask: string;
    leaveTitle: string;
    leaveDescription: string;
    leaveConfirm: string;
    leaveKeep: string;
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
    clearCorrectionHistoryAction: string;
    clearCorrectionHistoryConfirmTitle: string;
    clearCorrectionHistoryConfirmDescription: string;
    clearCorrectionHistoryConfirm: string;
    clearCorrectionHistoryError: string;
    clearCorrectionHistorySuccess: string;
    paginationPrevious: string;
    paginationNext: string;
    paginationPageOf: (values: { page: number; pageCount: number }) => string;
    paginationShowingRange: (values: { start: number; end: number; total: number }) => string;
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
  };
  support: {
    title: string;
    intro: string;
    sendAs: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    categoryRequired: string;
    categories: Record<"BUG" | "QUESTION" | "FEATURE_REQUEST_FEEDBACK" | "ACCOUNT_ACCESS" | "OTHER", string>;
    detailsLabel: string;
    detailsPlaceholder: string;
    detailsRequired: string;
    attachmentsLabel: string;
    optional: string;
    dropFile: string;
    browse: string;
    attachmentHint: (values: { limit: string }) => string;
    removeAttachment: string;
    attachmentUnsupported: string;
    attachmentNotRestored: (values: { name: string }) => string;
    submit: string;
    submitting: string;
    submitError: string;
    successTitle: string;
    successDescription: string;
    sendAnother: string;
    discardDraftTitle: string;
    discardDraftDescription: string;
    discardDraftConfirm: string;
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
    supportTitle: string;
    supportBody: string;
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
    spellCheckTourTitle: string;
    spellCheckTourBody: string;
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
    stepLabel: (values: { number: number }) => string;
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
      minimumWordCount: (values: { remainingWords: number; minWords: number }) => string;
      responseLabel: string;
      frenchResponsePlaceholder: string;
      correct: string;
      correcting: string;
      correctingStatus: string;
      genericCorrectionError: string;
      notFrenchText: string;
      alreadyCorrected: string;
      alreadyCorrectedFormattingNote: string;
      correctionInProgress: string;
      exampleLevelLabel: string;
      generateExample: string;
      generatingExample: string;
      generatingExampleStatus: string;
      exampleHeading: (values: { level: string }) => string;
      exampleCopy: string;
      exampleDismiss: string;
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
    // Copy for the bundled French Hunspell spelling checker in the essay
    // editor. It deliberately does not make grammar or missing-word claims.
    spellCheck: {
      toggleLabel: string;
      toggleAriaLabel: (values: { enabled: boolean }) => string;
      statusOn: string;
      statusOff: string;
      checking: string;
      unavailable: string;
      applyButton: string;
      closeButtonAriaLabel: string;
      noReplacementHint: string;
      issuesHeading: (values: { count: number }) => string;
    };
    // Fixed, reviewed coaching content selected by task + writing-context
    // profile + target level -- see docs/guided-writing.md and
    // src/lib/guided-writing.ts, which holds the actual tips (localized
    // separately, the same way task instructions and profile/stage labels
    // are). This block is only the guide's chrome copy. Its own level menu
    // reuses editor.exampleLevelLabel ("Target level") as its aria-label,
    // but the level itself is independent from the example generator's.
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
      clearDraftDescription: string;
      clearDraftConfirm: string;
      correctTitle: string;
      correctDescription: string;
      correctNearIdenticalDescription: string;
      correctConfirm: string;
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
      tasks: "Simulate",
      practice: "Train",
      support: "Support",
      settings: "Settings",
      admin: "Admin",
      logIn: "Log in",
      closeSettingsFirst: "Close Settings first",
      closeSupportFirst: "Close Support first",
    },
    home: {
      title: "Write for the TCF exam. Get feedback that gets you to C2.",
      description:
        "Practice Task 1, 2, and 3 essays, then get grammar, vocabulary, and CEFR-level feedback in seconds.",
      startATask: "Simulate a Task",
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
      sections: {
        t1_opening: { label: "Opening", guidance: "Indicate who you are writing to and why." },
        t1_development: { label: "Development", guidance: "Address each required element." },
        t1_closing: { label: "Closing", guidance: "Conclude the message appropriately for the given situation." },
        t2_situation: { label: "Present the situation", guidance: "Where and when did it take place? What was the situation?" },
        t2_events: { label: "Recount the events", guidance: "What happened first, next, and finally? What were the most important details?" },
        t2_comment: { label: "Comment and conclude", guidance: "What did you think of it, and why? What did you learn, or what would you recommend to others?" },
        t3_synthesis: { label: "Synthesis of the two documents", guidance: "Present the main idea of each document and how they relate: an opposition, a difference, or a common point." },
        t3_position: { label: "Your position", guidance: "State your opinion explicitly." },
        t3_arguments: { label: "Arguments and example", guidance: "Present two reasons, illustrate at least one with a concrete example, and finish with a sentence that reinforces your position." },
      },
      eyebrow: "Train",
      title: "Practise one task, section by section.",
      description: "This is not an exam simulation. Choose a task and your target level, then write the response in short sections, each with its own word range. Afterwards, compare each section with a model answer.",
      chooseTask: "Choose a task",
      chooseLevel: "Choose your target level",
      levelHelp: "Choose a task first to unlock the levels.",
      previewEyebrow: "Your exercise",
      previewSectionsLabel: "You will write",
      startExercise: "Start the exercise",
      backToChoice: "← Choose another exercise",
      scenarioLabel: "The situation",
      requiredElementsLabel: "Cover each of these points",
      documentsLabel: "Documents",
      examTaskLanguageNote: "Exam task, shown in French — as in the real exam.",
      draftPlaceholder: "Write this section in French…",
      exampleLabel: "Example",
      connectorsLabel: "Useful connectors",
      showModelAnswer: "Show model answer",
      modelAnswerLabel: "Model answer",
      compareHint: "Compare it with your draft: what did the model do that you didn't?",
      draftSavedNotice: "Your drafts are saved in this browser only.",
      completedEyebrow: "Exercise complete",
      completedTitle: "You have compared every section.",
      completedDescription: "Keep the model's moves in mind for your next full response. Practise again to rewrite the sections from scratch.",
      completedWithHelpDescription: "You viewed at least one model answer before writing that section. Practise again to write every section yourself first.",
      practiceAgain: "Practise again",
      chooseAnother: "Choose another exercise",
      tryFullTask: "Try a full task",
      leaveTitle: "Leave this exercise?",
      leaveDescription: "Your drafts for this exercise will be discarded. This can't be undone.",
      leaveConfirm: "Discard and leave",
      leaveKeep: "Keep writing",
      previewTitle: ({ task, level }) => `${task} · ${level}`,
      wordRange: ({ min, max }) => `${min}–${max} words`,
      sectionHeading: ({ number, label }) => `${number}. ${label}`,
      draftLabel: ({ label }) => `Your ${label.toLowerCase()}`,
      wordCounter: ({ words, min, max }) => `${words} ${words === 1 ? "word" : "words"} · target ${min}–${max}`,
      progress: ({ viewed, total }) => `${viewed} of ${total} model answers viewed`,
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
      practiceStartDescription: "Write a task section by section, then compare each section with a model answer.",
      practiceStartAction: "Go to Train",
      tasksStartTitle: "Simulate a Task",
      tasksStartDescription: "Write a full TCF response, then receive feedback on your writing.",
      tasksStartAction: "Go to Simulate",
      practiceActivityTitle: "Practice activity",
      practiceExercisesCompleted: ({ count }) => `${count} exercise${count === 1 ? "" : "s"} completed`,
      practiceCompletionBreakdown: ({ independent, helped }) => `${independent} independently · ${helped} with help`,
      continuePractice: "Continue Train",
      practiceActionsMenu: "More options",
      clearPracticeProgressAction: "Clear progress",
      clearPracticeProgressConfirmTitle: "Clear all practice progress?",
      clearPracticeProgressConfirmDescription: "This removes every completed exercise from your practice activity. This can't be undone.",
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
      clearCorrectionHistoryAction: "Clear all",
      clearCorrectionHistoryConfirmTitle: "Clear all correction history?",
      clearCorrectionHistoryConfirmDescription:
        "This will permanently delete all your corrections and their feedback, and reset your progress chart. This can't be undone.",
      clearCorrectionHistoryConfirm: "Clear all",
      clearCorrectionHistoryError: "Couldn't clear your correction history. Please try again.",
      clearCorrectionHistorySuccess: "Correction history cleared.",
      paginationPrevious: "Previous",
      paginationNext: "Next",
      paginationPageOf: ({ page, pageCount }) => `Page ${page} of ${pageCount}`,
      paginationShowingRange: ({ start, end, total }) => `Showing ${start}–${end} of ${total}`,
    },
    settings: {
      title: "Settings",
      appearanceHeading: "Appearance",
      appearanceDescription: "Choose how MyTCFLab looks on this device, including sign-in and sign-up.",
      themeLight: "Light",
      themeDark: "Dark",
      themeSystem: "System",
      languageHeading: "Language",
      languageDescription: "Choose the language used across the interface, feedback, and translation panel.",
    },
    support: {
      title: "Support",
      intro: "Tell us what’s up — a bug, a question, or an idea. We read every message.",
      sendAs: "Send as",
      categoryLabel: "What’s this about?",
      categoryPlaceholder: "Choose one…",
      categoryRequired: "Choose a category before sending your message.",
      categories: {
        BUG: "Bug",
        QUESTION: "Question",
        FEATURE_REQUEST_FEEDBACK: "Feature request / feedback",
        ACCOUNT_ACCESS: "Account & access",
        OTHER: "Other",
      },
      detailsLabel: "Details",
      detailsPlaceholder: "What happened, or what do you need? Links, reproduction steps, and screenshots help us move faster.",
      detailsRequired: "Tell us a little more before sending your message.",
      attachmentsLabel: "Attachment",
      optional: "optional",
      dropFile: "Drag a file here, or",
      browse: "browse",
      attachmentHint: ({ limit }) => `Images, text, PDF, JSON, or ZIP · up to ${limit} MB`,
      removeAttachment: "Remove attachment",
      attachmentUnsupported: "Choose an image, text, PDF, JSON, or ZIP file no larger than 4 MB.",
      attachmentNotRestored: ({ name }) =>
        `Your text was restored, but "${name}" couldn't be saved automatically — please attach it again if you still want to include it.`,
      submit: "Send",
      submitting: "Sending…",
      submitError: "We couldn’t send your message. Please try again.",
      successTitle: "Thanks for reaching out",
      successDescription: "Your message has been sent to the MyTCFLab team.",
      sendAnother: "Send another message",
      discardDraftTitle: "Discard this message?",
      discardDraftDescription: "Closing now will discard what you've written. This can't be undone.",
      discardDraftConfirm: "Discard message",
    },
    walkthrough: {
      takeATour: "Take a tour",
      stepProgress: ({ step, total }) => `Step ${step} of ${total}`,
      next: "Next",
      back: "Back",
      skip: "Skip",
      finish: "Finish",
      continueToPractice: "Continue to Train",
      continueToFullTask: "Continue to Simulate",
      dashboardWelcomeTitle: "Welcome to MyTCFLab",
      dashboardWelcomeBody:
        "This is your dashboard — your CEFR level over time and your recent corrections will show up here once you've written a few.",
      dashboardCorrectionsTitle: "Your recent corrections",
      dashboardCorrectionsBody:
        "Every corrected essay's score and estimated level appear below the chart, so you can track exactly how each attempt went.",
      settingsTitle: "Make the app yours",
      settingsBody: "Open the account menu and choose Settings to change the interface language and appearance.",
      supportTitle: "Need help?",
      supportBody: "Report a bug, ask a question, or share an idea. We use the email on your signed-in account so the team can reply.",
      dashboardPracticeTitle: "Build each section before writing the whole response",
      dashboardPracticeBody: "Train breaks a TCF task into short sections, each with its own word range, so you can rehearse them before you attempt a complete response.",
      dashboardStartWritingTitle: "Ready to Simulate a Task?",
      dashboardStartWritingBody: "Open Simulate to choose an exam prompt and get your first correction.",
      practiceIntroTitle: "Train builds a task one section at a time",
      practiceIntroBody: "This page is not an exam simulation. Choose a task and level, then write the response in short sections before you try a full TCF response.",
      practicePartsTitle: "Pick a task and a level",
      practicePartsBody: "Each task has its own sections and word ranges. B2, C1 and C2 use the same sections, with a scenario and model answer pitched at that level.",
      practiceStagesTitle: "Write each section, then compare",
      practiceStagesBody: "Write each section in its own box, watching the word count. Then show the model answer and compare it with yours. There is no scoring. When you are ready, open Simulate to write a complete TCF response.",
      taskPickerTitle: "Choose a task",
      taskPickerBody:
        "TCF written expression has three task types: Tâche 1 (communicate effectively in a short message, for the right reader and in the right register), Tâche 2 (recount an experience for several readers, with commentary suited to its purpose), and Tâche 3 (analyze a topic from different points of view). We'll walk through Tâche 1 as an example.",
      topicPickerTitle: "Choose an exam prompt",
      topicPickerBody:
        "Recent exam prompts are pulled directly from real, recently published TCF exams on this site, so you always practise with an authentic prompt. You can also paste in your own prompt instead.",
      timedTaskTourTitle: "Practise under exam conditions",
      timedTaskTourBody: "Start a timed task when you want to rehearse the real time pressure of the exam. It tracks the suggested time for this task and keeps running in the background while you write.",
      spellCheckTourTitle: "Catch spelling mistakes as you type",
      spellCheckTourBody: "Turn on spell check to underline misspelled French words in your response, with a suggested correction on click. It runs locally and never sends your writing to a third-party AI service.",
      guidedWritingTitle: "Plan before you write",
      guidedWritingBody:
        "Open the Writing guide when you need ideas. Click the small arrow next to it to pick a target level — B2, C1, or C2 — then use its planning questions, French phrases, and suggested verb tenses for that level.",
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
        "Click Generate example, then pick a CEFR level — B2, C1, or C2 — for a full model answer. Your draft stays unchanged: the example opens in its own card below, with copy and close icons, and generating again replaces it. Nothing is generated during the tour.",
      editorCopyTitle: "Copy your text",
      editorCopyBody:
        "Copy sends your response to the clipboard, handy for pasting it into a document or an official practice test.",
      editorClearTitle: "Start over",
      editorClearBody: "Clear empties the response so you can start a fresh draft.",
      translationTitle: "Translate your response",
      translationBody:
        "Show translation translates your response into your interface language, side by side with your text on wide screens (below it on narrow ones). The button then reads Hide translation, or Update translation after you edit. It only translates on demand, and only whatever you've added since the last time, to save your translation quota.",
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
      stepLabel: ({ number }) => `Step ${number}: `,
      task: {
        heading: "Choose a task",
        targetLength: ({ minWords, maxWords }) => `Target length: ${minWords}–${maxWords} words.`,
      },
      topic: {
        heading: "Choose an exam prompt",
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
        heading: "Write",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} words`,
        minimumWordCount: ({ remainingWords, minWords }) =>
          `Write ${remainingWords} more word${remainingWords === 1 ? "" : "s"} to reach the ${minWords}-word minimum for correction.`,
        responseLabel: "Your response",
        frenchResponsePlaceholder: "Rédigez votre réponse ici, en français…",
        correct: "Correct",
        correcting: "Correcting…",
        correctingStatus: "Getting your feedback. This can take a moment.",
        genericCorrectionError: "Something went wrong.",
        notFrenchText:
          "We couldn’t confidently recognize this text as French, so it wasn’t corrected. Write your response in French and check for unusual characters, then try again.",
        alreadyCorrected:
          "This version has already been corrected. Edit your response or exam prompt to request a new correction.",
        alreadyCorrectedFormattingNote:
          "Differences in spacing alone don't count as a new version, so the correction you see is for the text exactly as you first submitted it.",
        correctionInProgress:
          "A correction for this exact response is already in progress. Wait for it to finish or edit the response or exam prompt before requesting another one.",
        exampleLevelLabel: "Target level",
        generateExample: "Generate example",
        generatingExample: "Generating…",
        generatingExampleStatus: "Generating an example response. This can take a moment.",
        exampleHeading: ({ level }) => `Example response (${level})`,
        exampleCopy: "Copy example",
        exampleDismiss: "Close example",
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
      spellCheck: {
        toggleLabel: "Spell check",
        toggleAriaLabel: ({ enabled }) =>
          enabled ? "Spell check is on. Turn it off." : "Spell check is off. Turn it on.",
        statusOn: "On",
        statusOff: "Off",
        checking: "Checking…",
        unavailable: "Spell check is temporarily unavailable.",
        applyButton: "Apply",
        closeButtonAriaLabel: "Close suggestion",
        noReplacementHint: "No automatic suggestion for this issue.",
        issuesHeading: ({ count }) => (count === 1 ? "1 issue found" : `${count} issues found`),
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
        clearDraftDescription: "Clearing will discard your current draft and feedback.",
        clearDraftConfirm: "Clear text",
        correctTitle: "Correct this response?",
        correctDescription:
          "This sends your response for correction and uses one of your daily corrections.",
        correctNearIdenticalDescription:
          "This draft is almost identical to one you already corrected. Sending it again will use another daily correction, and the result may differ slightly.",
        correctConfirm: "Send for correction",
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
      tasks: "Simulation",
      practice: "Entraînement",
      support: "Assistance",
      settings: "Paramètres",
      admin: "Admin",
      logIn: "Se connecter",
      closeSettingsFirst: "Fermez d’abord les paramètres",
      closeSupportFirst: "Fermez d’abord l’assistance",
    },
    home: {
      title: "Préparez l’expression écrite du TCF. Recevez des commentaires qui vous aident à atteindre le niveau C2.",
      description:
        "Entraînez-vous aux tâches 1, 2 et 3, puis recevez en quelques secondes des commentaires sur la grammaire, le vocabulaire et votre niveau du CECRL.",
      startATask: "Simuler une tâche",
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
      sections: {
        t1_opening: { label: "Ouverture", guidance: "Indiquer à qui vous écrivez et pourquoi." },
        t1_development: { label: "Développement", guidance: "Traiter chacun des éléments demandés." },
        t1_closing: { label: "Clôture", guidance: "Conclure le message de façon adaptée à la situation." },
        t2_situation: { label: "Présenter la situation", guidance: "Où et quand cela s’est-il passé ? Quelle était la situation ?" },
        t2_events: { label: "Raconter les faits", guidance: "Que s’est-il passé d’abord, ensuite, puis à la fin ? Quels étaient les détails les plus importants ?" },
        t2_comment: { label: "Commenter et conclure", guidance: "Qu’en avez-vous pensé, et pourquoi ? Qu’avez-vous appris, ou que recommanderiez-vous aux autres ?" },
        t3_synthesis: { label: "Synthèse des deux documents", guidance: "Présenter l’idée principale de chaque document et leur relation : une opposition, une différence ou un point commun." },
        t3_position: { label: "Votre position", guidance: "Exprimer clairement votre opinion." },
        t3_arguments: { label: "Arguments et exemple", guidance: "Présenter deux raisons, illustrer au moins l’une d’elles par un exemple concret et terminer par une phrase qui renforce votre position." },
      },
      eyebrow: "Entraînement",
      title: "Travaillez une tâche, section par section.",
      description: "Ceci n’est pas une simulation d’examen. Choisissez une tâche et votre niveau cible, puis rédigez la réponse en courtes sections, chacune avec sa propre fourchette de mots. Ensuite, comparez chaque section avec une réponse modèle.",
      chooseTask: "Choisissez une tâche",
      chooseLevel: "Choisissez votre niveau cible",
      levelHelp: "Choisissez d’abord une tâche pour débloquer les niveaux.",
      previewEyebrow: "Votre exercice",
      previewSectionsLabel: "Vous allez rédiger",
      startExercise: "Commencer l’exercice",
      backToChoice: "← Choisir un autre exercice",
      scenarioLabel: "La situation",
      requiredElementsLabel: "Traitez chacun de ces points",
      documentsLabel: "Documents",
      examTaskLanguageNote: "Sujet d’examen, affiché en français — comme à l’examen.",
      draftPlaceholder: "Rédigez cette section en français…",
      exampleLabel: "Exemple",
      connectorsLabel: "Connecteurs utiles",
      showModelAnswer: "Afficher la réponse modèle",
      modelAnswerLabel: "Réponse modèle",
      compareHint: "Comparez-la avec votre texte : que fait le modèle que vous n’avez pas fait ?",
      draftSavedNotice: "Vos brouillons sont enregistrés dans ce navigateur uniquement.",
      completedEyebrow: "Exercice terminé",
      completedTitle: "Vous avez comparé chaque section.",
      completedDescription: "Gardez en tête les choix du modèle pour votre prochaine réponse complète. Recommencez pour réécrire les sections à partir de zéro.",
      completedWithHelpDescription: "Vous avez consulté au moins une réponse modèle avant d’écrire la section correspondante. Recommencez pour rédiger d’abord chaque section vous-même.",
      practiceAgain: "Recommencer",
      chooseAnother: "Choisir un autre exercice",
      tryFullTask: "Essayer une tâche complète",
      leaveTitle: "Quitter cet exercice ?",
      leaveDescription: "Vos brouillons de cet exercice seront supprimés. Cette action est irréversible.",
      leaveConfirm: "Supprimer et quitter",
      leaveKeep: "Continuer à écrire",
      previewTitle: ({ task, level }) => `${task} · ${level}`,
      wordRange: ({ min, max }) => `${min} à ${max} mots`,
      sectionHeading: ({ number, label }) => `${number}. ${label}`,
      draftLabel: ({ label }) => `Votre texte : ${label.toLowerCase()}`,
      wordCounter: ({ words, min, max }) => `${words} ${words === 1 ? "mot" : "mots"} · objectif ${min} à ${max}`,
      progress: ({ viewed, total }) => `${viewed} réponse${viewed === 1 ? "" : "s"} modèle${viewed === 1 ? "" : "s"} sur ${total} consultée${viewed === 1 ? "" : "s"}`,
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
      practiceStartDescription: "Rédigez une tâche section par section, puis comparez chaque section avec une réponse modèle.",
      practiceStartAction: "Aller à Entraînement",
      tasksStartTitle: "Simuler une tâche",
      tasksStartDescription: "Rédigez une réponse TCF complète, puis recevez des commentaires sur votre rédaction.",
      tasksStartAction: "Aller à Simulation",
      practiceActivityTitle: "Activité de pratique",
      practiceExercisesCompleted: ({ count }) => `${count} exercice${count === 1 ? "" : "s"} terminé${count === 1 ? "" : "s"}`,
      practiceCompletionBreakdown: ({ independent, helped }) => `${independent} en autonomie · ${helped} avec aide`,
      continuePractice: "Continuer l’entraînement",
      practiceActionsMenu: "Plus d’options",
      clearPracticeProgressAction: "Effacer la progression",
      clearPracticeProgressConfirmTitle: "Effacer toute la progression en pratique ?",
      clearPracticeProgressConfirmDescription: "Cela supprime tous les exercices terminés de votre activité de pratique. Cette action est irréversible.",
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
      clearCorrectionHistoryAction: "Tout effacer",
      clearCorrectionHistoryConfirmTitle: "Effacer tout l’historique des corrections ?",
      clearCorrectionHistoryConfirmDescription:
        "Cela supprimera définitivement toutes vos corrections et leurs commentaires, et réinitialisera votre graphique de progression. Cette action est irréversible.",
      clearCorrectionHistoryConfirm: "Tout effacer",
      clearCorrectionHistoryError: "Impossible d’effacer votre historique des corrections. Veuillez réessayer.",
      clearCorrectionHistorySuccess: "Historique des corrections effacé.",
      paginationPrevious: "Précédent",
      paginationNext: "Suivant",
      paginationPageOf: ({ page, pageCount }) => `Page ${page} sur ${pageCount}`,
      paginationShowingRange: ({ start, end, total }) => `Éléments ${start} à ${end} sur ${total}`,
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
    },
    support: {
      title: "Assistance",
      intro: "Dites-nous ce qui se passe : un bug, une question ou une idée. Nous lisons chaque message.",
      sendAs: "Envoyer en tant que",
      categoryLabel: "Quel est le sujet ?",
      categoryPlaceholder: "Choisissez une option…",
      categoryRequired: "Choisissez une catégorie avant d’envoyer votre message.",
      categories: {
        BUG: "Bug",
        QUESTION: "Question",
        FEATURE_REQUEST_FEEDBACK: "Demande de fonctionnalité / avis",
        ACCOUNT_ACCESS: "Compte et accès",
        OTHER: "Autre",
      },
      detailsLabel: "Détails",
      detailsPlaceholder: "Que s’est-il passé ou de quoi avez-vous besoin ? Des liens, étapes de reproduction et captures d’écran nous aident à aller plus vite.",
      detailsRequired: "Ajoutez quelques détails avant d’envoyer votre message.",
      attachmentsLabel: "Pièce jointe",
      optional: "facultatif",
      dropFile: "Déposez un fichier ici ou",
      browse: "parcourez",
      attachmentHint: ({ limit }) => `Images, texte, PDF, JSON ou ZIP · jusqu’à ${limit} Mo`,
      removeAttachment: "Supprimer la pièce jointe",
      attachmentUnsupported: "Choisissez une image, un fichier texte, PDF, JSON ou ZIP de 4 Mo maximum.",
      attachmentNotRestored: ({ name }) =>
        `Votre texte a été restauré, mais « ${name} » n'a pas pu être enregistré automatiquement — joignez-le à nouveau si vous souhaitez toujours l'inclure.`,
      submit: "Envoyer",
      submitting: "Envoi…",
      submitError: "Nous n’avons pas pu envoyer votre message. Réessayez.",
      successTitle: "Merci de nous avoir contactés",
      successDescription: "Votre message a été envoyé à l’équipe MyTCFLab.",
      sendAnother: "Envoyer un autre message",
      discardDraftTitle: "Abandonner ce message ?",
      discardDraftDescription: "Fermer maintenant supprimera ce que vous avez écrit. Cette action est irréversible.",
      discardDraftConfirm: "Abandonner le message",
    },
    walkthrough: {
      takeATour: "Faire la visite guidée",
      stepProgress: ({ step, total }) => `Étape ${step} sur ${total}`,
      next: "Suivant",
      back: "Précédent",
      skip: "Ignorer",
      finish: "Terminer",
      continueToPractice: "Continuer vers Entraînement",
      continueToFullTask: "Continuer vers Simulation",
      dashboardWelcomeTitle: "Bienvenue sur MyTCFLab",
      dashboardWelcomeBody:
        "Voici votre tableau de bord — votre niveau CECR au fil du temps et vos corrections récentes apparaîtront ici après quelques rédactions.",
      dashboardCorrectionsTitle: "Vos corrections récentes",
      dashboardCorrectionsBody:
        "La note et le niveau estimé de chaque rédaction corrigée apparaissent sous le graphique, pour suivre précisément chaque tentative.",
      settingsTitle: "Personnalisez l’application",
      settingsBody: "Ouvrez le menu du compte et choisissez Paramètres pour changer la langue et l’apparence de l’interface.",
      supportTitle: "Besoin d’aide ?",
      supportBody: "Signalez un bug, posez une question ou partagez une idée. Nous utilisons l’adresse e-mail de votre compte connecté pour que l’équipe puisse vous répondre.",
      dashboardPracticeTitle: "Travaillez chaque section avant de rédiger la réponse complète",
      dashboardPracticeBody: "Entraînement découpe une tâche TCF en courtes sections, chacune avec sa fourchette de mots, pour les travailler avant de rédiger une réponse complète.",
      dashboardStartWritingTitle: "Prêt·e à simuler une tâche ?",
      dashboardStartWritingBody: "Ouvrez Simulation pour choisir une consigne d’examen et obtenir votre première correction.",
      practiceIntroTitle: "Entraînement construit une tâche section par section",
      practiceIntroBody: "Cette page n’est pas une simulation d’examen. Choisissez une tâche et un niveau, puis rédigez la réponse en courtes sections avant de tenter une réponse TCF complète.",
      practicePartsTitle: "Choisissez une tâche et un niveau",
      practicePartsBody: "Chaque tâche a ses propres sections et fourchettes de mots. B2, C1 et C2 utilisent les mêmes sections, avec une situation et une réponse modèle adaptées au niveau.",
      practiceStagesTitle: "Rédigez chaque section, puis comparez",
      practiceStagesBody: "Rédigez chaque section dans sa propre zone, en surveillant le nombre de mots. Affichez ensuite la réponse modèle et comparez-la avec la vôtre. Il n’y a aucune note. Lorsque vous êtes prêt·e, ouvrez Simulation pour rédiger une réponse TCF complète.",
      taskPickerTitle: "Choisissez une tâche",
      taskPickerBody:
        "L’expression écrite du TCF comprend trois types de tâches : la Tâche 1 (communiquer efficacement dans un message court, au bon destinataire et dans le registre adapté), la Tâche 2 (raconter une expérience pour plusieurs destinataires, avec des commentaires adaptés à son objectif) et la Tâche 3 (analyser un sujet sous différents points de vue). Nous allons parcourir la Tâche 1 à titre d’exemple.",
      topicPickerTitle: "Choisissez une consigne d’examen",
      topicPickerBody:
        "Les consignes d’examens récents proviennent directement de vrais examens du TCF récemment publiés sur ce site, pour vous entraîner avec des consignes authentiques. Vous pouvez aussi coller la vôtre.",
      timedTaskTourTitle: "Entraînez-vous dans les conditions de l'examen",
      timedTaskTourBody: "Démarrez une tâche chronométrée pour vous entraîner avec la vraie pression de temps de l'examen. Elle suit la durée suggérée pour cette tâche et continue en arrière-plan pendant que vous écrivez.",
      spellCheckTourTitle: "Repérez les fautes d’orthographe en écrivant",
      spellCheckTourBody: "Activez la vérification orthographique pour souligner les mots mal orthographiés dans votre réponse, avec une correction suggérée au clic. Elle s’exécute localement et n’envoie jamais votre texte à un service d’IA tiers.",
      guidedWritingTitle: "Planifiez avant d’écrire",
      guidedWritingBody:
        "Ouvrez le Guide de rédaction lorsque vous manquez d’idées. Cliquez sur la petite flèche à côté pour choisir un niveau visé — B2, C1 ou C2 — puis utilisez ses questions de planification, ses formules en français et ses temps verbaux suggérés pour ce niveau.",
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
        "Cliquez sur Générer un exemple, puis choisissez un niveau CECR — B2, C1 ou C2 — pour une réponse modèle complète. Votre brouillon reste intact : l’exemple s’ouvre dans sa propre carte en dessous, avec des icônes pour le copier ou le fermer, et un nouvel exemple le remplace. Rien n’est généré pendant la visite.",
      editorCopyTitle: "Copiez votre texte",
      editorCopyBody:
        "Copier envoie votre réponse dans le presse-papiers, pratique pour la coller dans un document ou un test blanc officiel.",
      editorClearTitle: "Recommencer",
      editorClearBody: "Effacer vide la réponse pour repartir d’une page blanche.",
      translationTitle: "Traduisez votre réponse",
      translationBody:
        "Afficher la traduction traduit votre réponse dans la langue de l’interface, à côté de votre texte sur grand écran (en dessous sur petit écran). Le bouton devient ensuite Masquer la traduction, ou Mettre à jour la traduction après une modification. Elle ne se lance qu’à la demande, et seulement pour ce que vous avez ajouté depuis la dernière fois, afin de préserver votre quota de traduction.",
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
      stepLabel: ({ number }) => `Étape ${number} : `,
      task: {
        heading: "Choisissez une tâche",
        targetLength: ({ minWords, maxWords }) => `Longueur visée : ${minWords}–${maxWords} mots.`,
      },
      topic: {
        heading: "Choisissez une consigne d’examen",
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
        heading: "Rédigez",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} mots`,
        minimumWordCount: ({ remainingWords, minWords }) =>
          `Ajoutez encore ${remainingWords} mot${remainingWords === 1 ? "" : "s"} pour atteindre le minimum de ${minWords} mots avant la correction.`,
        responseLabel: "Votre réponse",
        frenchResponsePlaceholder: "Rédigez votre réponse ici, en français…",
        correct: "Corriger",
        correcting: "Correction en cours…",
        correctingStatus: "Nous préparons vos commentaires. Cela peut prendre un instant.",
        genericCorrectionError: "Une erreur s’est produite.",
        notFrenchText:
          "Nous n’avons pas pu reconnaître avec certitude ce texte comme du français, il n’a donc pas été corrigé. Rédigez votre réponse en français et vérifiez qu’il n’y a pas de caractères inhabituels, puis réessayez.",
        alreadyCorrected:
          "Cette version a déjà été corrigée. Modifiez votre réponse ou votre consigne d’examen pour demander une nouvelle correction.",
        alreadyCorrectedFormattingNote:
          "Les simples différences d’espacement ne comptent pas comme une nouvelle version : la correction affichée concerne le texte tel que vous l’avez soumis la première fois.",
        correctionInProgress:
          "Une correction de cette réponse exacte est déjà en cours. Attendez sa fin ou modifiez la réponse ou la consigne d’examen avant d’en demander une autre.",
        exampleLevelLabel: "Niveau visé",
        generateExample: "Générer un exemple",
        generatingExample: "Génération en cours…",
        generatingExampleStatus: "Génération d’un exemple de réponse. Cela peut prendre un instant.",
        exampleHeading: ({ level }) => `Exemple de réponse (${level})`,
        exampleCopy: "Copier l’exemple",
        exampleDismiss: "Fermer l’exemple",
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
      spellCheck: {
        toggleLabel: "Vérification orthographique",
        toggleAriaLabel: ({ enabled }) =>
          enabled
            ? "La vérification orthographique est activée. La désactiver."
            : "La vérification orthographique est désactivée. L’activer.",
        statusOn: "Activée",
        statusOff: "Désactivée",
        checking: "Vérification…",
        unavailable: "La vérification orthographique est temporairement indisponible.",
        applyButton: "Appliquer",
        closeButtonAriaLabel: "Fermer la suggestion",
        noReplacementHint: "Aucune suggestion automatique pour ce problème.",
        issuesHeading: ({ count }) => (count === 1 ? "1 problème trouvé" : `${count} problèmes trouvés`),
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
        clearDraftDescription: "Effacer supprimera votre brouillon et vos commentaires actuels.",
        clearDraftConfirm: "Effacer le texte",
        correctTitle: "Corriger cette réponse ?",
        correctDescription:
          "Votre réponse sera envoyée pour correction et comptera dans vos corrections quotidiennes.",
        correctNearIdenticalDescription:
          "Ce brouillon est presque identique à un texte que vous avez déjà fait corriger. Le renvoyer utilisera une autre correction quotidienne, et le résultat peut légèrement différer.",
        correctConfirm: "Envoyer pour correction",
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
      tasks: "Simular",
      practice: "Entrenar",
      support: "Soporte",
      settings: "Configuración",
      admin: "Admin",
      logIn: "Iniciar sesión",
      closeSettingsFirst: "Cierra primero la configuración",
      closeSupportFirst: "Cierra primero el soporte",
    },
    home: {
      title: "Escribe para el examen TCF. Recibe comentarios que te ayudarán a alcanzar C2.",
      description:
        "Practica las tareas 1, 2 y 3 y recibe en segundos comentarios sobre gramática, vocabulario y nivel MCER.",
      startATask: "Simular una tarea",
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
      sections: {
        t1_opening: { label: "Apertura", guidance: "Indica a quién escribes y por qué." },
        t1_development: { label: "Desarrollo", guidance: "Responde a cada uno de los elementos exigidos." },
        t1_closing: { label: "Cierre", guidance: "Concluye el mensaje de forma adecuada a la situación." },
        t2_situation: { label: "Presentar la situación", guidance: "¿Dónde y cuándo ocurrió? ¿Cuál era la situación?" },
        t2_events: { label: "Contar los hechos", guidance: "¿Qué pasó primero, después y al final? ¿Cuáles fueron los detalles más importantes?" },
        t2_comment: { label: "Comentar y concluir", guidance: "¿Qué te pareció y por qué? ¿Qué aprendiste o qué recomendarías a los demás?" },
        t3_synthesis: { label: "Síntesis de los dos documentos", guidance: "Presenta la idea principal de cada documento y su relación: una oposición, una diferencia o un punto en común." },
        t3_position: { label: "Tu postura", guidance: "Expresa tu opinión de forma explícita." },
        t3_arguments: { label: "Argumentos y ejemplo", guidance: "Presenta dos razones, ilustra al menos una con un ejemplo concreto y termina con una frase que refuerce tu postura." },
      },
      eyebrow: "Entrenar",
      title: "Practica una tarea, sección por sección.",
      description: "Esto no es una simulación de examen. Elige una tarea y tu nivel objetivo, y escribe la respuesta en secciones breves, cada una con su propio rango de palabras. Después, compara cada sección con una respuesta modelo.",
      chooseTask: "Elige una tarea",
      chooseLevel: "Elige tu nivel objetivo",
      levelHelp: "Elige primero una tarea para desbloquear los niveles.",
      previewEyebrow: "Tu ejercicio",
      previewSectionsLabel: "Vas a escribir",
      startExercise: "Empezar el ejercicio",
      backToChoice: "← Elegir otro ejercicio",
      scenarioLabel: "La situación",
      requiredElementsLabel: "Responde a cada uno de estos puntos",
      documentsLabel: "Documentos",
      examTaskLanguageNote: "Tarea de examen, mostrada en francés, como en el examen real.",
      draftPlaceholder: "Escribe esta sección en francés…",
      exampleLabel: "Ejemplo",
      connectorsLabel: "Conectores útiles",
      showModelAnswer: "Mostrar la respuesta modelo",
      modelAnswerLabel: "Respuesta modelo",
      compareHint: "Compárala con tu texto: ¿qué hace el modelo que tú no hiciste?",
      draftSavedNotice: "Tus borradores se guardan solo en este navegador.",
      completedEyebrow: "Ejercicio completado",
      completedTitle: "Has comparado todas las secciones.",
      completedDescription: "Ten presentes los recursos del modelo para tu próxima respuesta completa. Practica de nuevo para reescribir las secciones desde cero.",
      completedWithHelpDescription: "Viste al menos una respuesta modelo antes de escribir esa sección. Practica de nuevo para escribir primero cada sección tú mismo.",
      practiceAgain: "Practicar de nuevo",
      chooseAnother: "Elegir otro ejercicio",
      tryFullTask: "Probar una tarea completa",
      leaveTitle: "¿Salir de este ejercicio?",
      leaveDescription: "Se descartarán tus borradores de este ejercicio. Esta acción no se puede deshacer.",
      leaveConfirm: "Descartar y salir",
      leaveKeep: "Seguir escribiendo",
      previewTitle: ({ task, level }) => `${task} · ${level}`,
      wordRange: ({ min, max }) => `${min}–${max} palabras`,
      sectionHeading: ({ number, label }) => `${number}. ${label}`,
      draftLabel: ({ label }) => `Tu texto: ${label.toLowerCase()}`,
      wordCounter: ({ words, min, max }) => `${words} ${words === 1 ? "palabra" : "palabras"} · objetivo ${min}–${max}`,
      progress: ({ viewed, total }) => `${viewed} de ${total} respuestas modelo vistas`,
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
      practiceStartDescription: "Escribe una tarea sección por sección y compara cada una con una respuesta modelo.",
      practiceStartAction: "Ir a Entrenar",
      tasksStartTitle: "Simular una tarea",
      tasksStartDescription: "Escribe una respuesta TCF completa y recibe comentarios sobre tu escritura.",
      tasksStartAction: "Ir a Simular",
      practiceActivityTitle: "Actividad de práctica",
      practiceExercisesCompleted: ({ count }) => `${count} ejercicio${count === 1 ? "" : "s"} completado${count === 1 ? "" : "s"}`,
      practiceCompletionBreakdown: ({ independent, helped }) => `${independent} de forma independiente · ${helped} con ayuda`,
      continuePractice: "Continuar entrenando",
      practiceActionsMenu: "Más opciones",
      clearPracticeProgressAction: "Borrar progreso",
      clearPracticeProgressConfirmTitle: "¿Borrar todo el progreso de práctica?",
      clearPracticeProgressConfirmDescription: "Esto elimina todos los ejercicios completados de tu actividad de práctica. Esta acción no se puede deshacer.",
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
      clearCorrectionHistoryAction: "Borrar todo",
      clearCorrectionHistoryConfirmTitle: "¿Borrar todo el historial de correcciones?",
      clearCorrectionHistoryConfirmDescription:
        "Se eliminarán de forma permanente todas tus correcciones y sus comentarios, y se reiniciará tu gráfico de progreso. No se puede deshacer.",
      clearCorrectionHistoryConfirm: "Borrar todo",
      clearCorrectionHistoryError: "No se pudo borrar tu historial de correcciones. Inténtalo de nuevo.",
      clearCorrectionHistorySuccess: "Historial de correcciones borrado.",
      paginationPrevious: "Anterior",
      paginationNext: "Siguiente",
      paginationPageOf: ({ page, pageCount }) => `Página ${page} de ${pageCount}`,
      paginationShowingRange: ({ start, end, total }) => `Mostrando ${start}–${end} de ${total}`,
    },
    settings: {
      title: "Configuración",
      appearanceHeading: "Apariencia",
      appearanceDescription:
        "Elige el aspecto de MyTCFLab en este dispositivo, incluidos el inicio de sesión y el registro.",
      themeLight: "Claro",
      themeDark: "Oscuro",
      themeSystem: "Sistema",
      languageHeading: "Idioma",
      languageDescription: "Elige el idioma utilizado en la interfaz, los comentarios y el panel de traducción.",
    },
    support: {
      title: "Soporte",
      intro: "Cuéntanos qué sucede: un error, una pregunta o una idea. Leemos cada mensaje.",
      sendAs: "Enviar como",
      categoryLabel: "¿De qué se trata?",
      categoryPlaceholder: "Elige una opción…",
      categoryRequired: "Elige una categoría antes de enviar tu mensaje.",
      categories: {
        BUG: "Error",
        QUESTION: "Pregunta",
        FEATURE_REQUEST_FEEDBACK: "Solicitud de función / comentarios",
        ACCOUNT_ACCESS: "Cuenta y acceso",
        OTHER: "Otro",
      },
      detailsLabel: "Detalles",
      detailsPlaceholder: "¿Qué ocurrió o qué necesitas? Los enlaces, pasos para reproducirlo y capturas de pantalla nos ayudan a avanzar más rápido.",
      detailsRequired: "Cuéntanos un poco más antes de enviar tu mensaje.",
      attachmentsLabel: "Archivo adjunto",
      optional: "opcional",
      dropFile: "Arrastra un archivo aquí o",
      browse: "explora",
      attachmentHint: ({ limit }) => `Imágenes, texto, PDF, JSON o ZIP · hasta ${limit} MB`,
      removeAttachment: "Quitar archivo adjunto",
      attachmentUnsupported: "Elige una imagen, archivo de texto, PDF, JSON o ZIP de hasta 4 MB.",
      attachmentNotRestored: ({ name }) =>
        `Se restauró tu texto, pero "${name}" no se pudo guardar automáticamente — adjúntalo de nuevo si aún quieres incluirlo.`,
      submit: "Enviar",
      submitting: "Enviando…",
      submitError: "No pudimos enviar tu mensaje. Inténtalo de nuevo.",
      successTitle: "Gracias por escribirnos",
      successDescription: "Tu mensaje se envió al equipo de MyTCFLab.",
      sendAnother: "Enviar otro mensaje",
      discardDraftTitle: "¿Descartar este mensaje?",
      discardDraftDescription: "Si cierras ahora se descartará lo que escribiste. Esta acción no se puede deshacer.",
      discardDraftConfirm: "Descartar mensaje",
    },
    walkthrough: {
      takeATour: "Hacer el recorrido",
      stepProgress: ({ step, total }) => `Paso ${step} de ${total}`,
      next: "Siguiente",
      back: "Atrás",
      skip: "Omitir",
      finish: "Finalizar",
      continueToPractice: "Continuar a Entrenar",
      continueToFullTask: "Continuar a Simular",
      dashboardWelcomeTitle: "Bienvenido a MyTCFLab",
      dashboardWelcomeBody:
        "Este es tu panel: tu nivel MCER a lo largo del tiempo y tus correcciones recientes aparecerán aquí después de escribir algunas.",
      dashboardCorrectionsTitle: "Tus correcciones recientes",
      dashboardCorrectionsBody:
        "La nota y el nivel estimado de cada redacción corregida aparecen debajo del gráfico, para seguir exactamente cómo te fue en cada intento.",
      settingsTitle: "Personaliza la aplicación",
      settingsBody: "Abre el menú de la cuenta y elige Configuración para cambiar el idioma y la apariencia de la interfaz.",
      supportTitle: "¿Necesitas ayuda?",
      supportBody: "Informa un error, haz una pregunta o comparte una idea. Usamos el correo de tu cuenta conectada para que el equipo pueda responderte.",
      dashboardPracticeTitle: "Practica cada sección antes de escribir la respuesta completa",
      dashboardPracticeBody: "Entrenar divide una tarea TCF en secciones breves, cada una con su rango de palabras, para ensayarlas antes de escribir una respuesta completa.",
      dashboardStartWritingTitle: "¿Listo para simular una tarea?",
      dashboardStartWritingBody: "Abre Simular para elegir una consigna de examen y obtener tu primera corrección.",
      practiceIntroTitle: "Entrenar construye una tarea sección por sección",
      practiceIntroBody: "Esta página no es una simulación de examen. Elige una tarea y un nivel, y escribe la respuesta en secciones breves antes de intentar una respuesta TCF completa.",
      practicePartsTitle: "Elige una tarea y un nivel",
      practicePartsBody: "Cada tarea tiene sus propias secciones y rangos de palabras. B2, C1 y C2 usan las mismas secciones, con una situación y una respuesta modelo de ese nivel.",
      practiceStagesTitle: "Escribe cada sección y luego compara",
      practiceStagesBody: "Escribe cada sección en su propio cuadro, atento al número de palabras. Después muestra la respuesta modelo y compárala con la tuya. No hay puntuación. Cuando estés listo, abre Simular para escribir una respuesta TCF completa.",
      taskPickerTitle: "Elige una tarea",
      taskPickerBody:
        "La expresión escrita del TCF tiene tres tipos de tareas: la Tarea 1 (comunicarse eficazmente en un mensaje breve, para el destinatario y el registro adecuados), la Tarea 2 (narrar una experiencia para varios destinatarios, con comentarios adaptados a su objetivo) y la Tarea 3 (analizar un tema desde distintos puntos de vista). Vamos a recorrer la Tarea 1 como ejemplo.",
      topicPickerTitle: "Elige una consigna de examen",
      topicPickerBody:
        "Las consignas de exámenes recientes provienen directamente de exámenes reales del TCF publicados recientemente en este sitio, para que practiques siempre con una consigna auténtica. También puedes pegar la tuya.",
      timedTaskTourTitle: "Practica en condiciones de examen",
      timedTaskTourBody: "Inicia una tarea cronometrada cuando quieras practicar con la presión de tiempo real del examen. Sigue el tiempo sugerido para esta tarea y continúa en segundo plano mientras escribes.",
      spellCheckTourTitle: "Detecta errores de ortografía mientras escribes",
      spellCheckTourBody: "Activa la revisión ortográfica para subrayar las palabras mal escritas en tu respuesta, con una corrección sugerida al hacer clic. Se ejecuta localmente y nunca envía tu texto a un servicio de IA externo.",
      guidedWritingTitle: "Planifica antes de escribir",
      guidedWritingBody:
        "Abre la Guía de redacción cuando necesites ideas. Haz clic en la pequeña flecha junto a ella para elegir un nivel objetivo — B2, C1 o C2 — y luego usa sus preguntas de planificación, frases en francés y tiempos verbales sugeridos para ese nivel.",
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
        "Haz clic en Generar ejemplo y elige un nivel MCER — B2, C1 o C2 — para ver una respuesta modelo completa. Tu borrador no cambia: el ejemplo se abre en su propia tarjeta debajo, con iconos para copiarlo o cerrarlo, y generar otro lo reemplaza. Durante el recorrido no se genera nada.",
      editorCopyTitle: "Copia tu texto",
      editorCopyBody:
        "Copiar envía tu respuesta al portapapeles, útil para pegarla en un documento o en un examen de práctica oficial.",
      editorClearTitle: "Empezar de nuevo",
      editorClearBody: "Borrar vacía la respuesta para empezar un borrador nuevo.",
      translationTitle: "Traduce tu respuesta",
      translationBody:
        "Mostrar traducción traduce tu respuesta a tu idioma de interfaz, junto a tu texto en pantallas anchas (debajo en pantallas estrechas). Después el botón pasa a ser Ocultar traducción, o Actualizar traducción tras editar. Solo traduce cuando lo pides, y solo lo que agregaste desde la última vez, para ahorrar tu cuota de traducción.",
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
      stepLabel: ({ number }) => `Paso ${number}: `,
      task: {
        heading: "Elige una tarea",
        targetLength: ({ minWords, maxWords }) => `Extensión objetivo: ${minWords}–${maxWords} palabras.`,
      },
      topic: {
        heading: "Elige una consigna de examen",
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
        heading: "Escribe",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} palabras`,
        minimumWordCount: ({ remainingWords, minWords }) =>
          `Escribe ${remainingWords} palabra${remainingWords === 1 ? "" : "s"} más para alcanzar el mínimo de ${minWords} palabras antes de solicitar una corrección.`,
        responseLabel: "Tu respuesta",
        frenchResponsePlaceholder: "Rédigez votre réponse ici, en français…",
        correct: "Corregir",
        correcting: "Corrigiendo…",
        correctingStatus: "Estamos preparando tus comentarios. Esto puede tardar un momento.",
        genericCorrectionError: "Algo salió mal.",
        notFrenchText:
          "No hemos podido reconocer con seguridad este texto como francés, así que no se ha corregido. Escribe tu respuesta en francés y revisa que no haya caracteres inusuales; luego inténtalo de nuevo.",
        alreadyCorrected:
          "Esta versión ya se ha corregido. Modifica tu respuesta o consigna de examen para solicitar una nueva corrección.",
        alreadyCorrectedFormattingNote:
          "Las diferencias de espaciado por sí solas no cuentan como una versión nueva, así que la corrección que ves corresponde al texto tal como lo enviaste la primera vez.",
        correctionInProgress:
          "Ya hay una corrección de esta respuesta exacta en curso. Espera a que termine o modifica la respuesta o la consigna de examen antes de solicitar otra.",
        exampleLevelLabel: "Nivel objetivo",
        generateExample: "Generar ejemplo",
        generatingExample: "Generando…",
        generatingExampleStatus: "Generando una respuesta de ejemplo. Esto puede tardar un momento.",
        exampleHeading: ({ level }) => `Respuesta de ejemplo (${level})`,
        exampleCopy: "Copiar ejemplo",
        exampleDismiss: "Cerrar ejemplo",
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
      spellCheck: {
        toggleLabel: "Revisión ortográfica",
        toggleAriaLabel: ({ enabled }) =>
          enabled
            ? "La revisión ortográfica está activada. Desactivarla."
            : "La revisión ortográfica está desactivada. Activarla.",
        statusOn: "Activada",
        statusOff: "Desactivada",
        checking: "Comprobando…",
        unavailable: "La revisión ortográfica no está disponible en este momento.",
        applyButton: "Aplicar",
        closeButtonAriaLabel: "Cerrar la sugerencia",
        noReplacementHint: "No hay una sugerencia automática para este problema.",
        issuesHeading: ({ count }) => (count === 1 ? "1 problema encontrado" : `${count} problemas encontrados`),
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
        clearDraftDescription: "Borrar descartará tu borrador y comentarios actuales.",
        clearDraftConfirm: "Borrar texto",
        correctTitle: "¿Corregir esta respuesta?",
        correctDescription:
          "Tu respuesta se enviará para su corrección y usará una de tus correcciones diarias.",
        correctNearIdenticalDescription:
          "Este borrador es casi idéntico a uno que ya has corregido. Volver a enviarlo usará otra corrección diaria y el resultado puede variar ligeramente.",
        correctConfirm: "Enviar a corregir",
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
      dashboard: "Dashboard",
      tasks: "Simular",
      practice: "Treinar",
      support: "Suporte",
      settings: "Configurações",
      admin: "Admin",
      logIn: "Entrar",
      closeSettingsFirst: "Feche as configurações primeiro",
      closeSupportFirst: "Feche o suporte primeiro",
    },
    home: {
      title: "Escreva para o exame TCF. Receba comentários que ajudam você a alcançar C2.",
      description:
        "Pratique as tarefas 1, 2 e 3 e receba em segundos comentários sobre gramática, vocabulário e nível do QECR.",
      startATask: "Simular uma tarefa",
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
      sections: {
        t1_opening: { label: "Abertura", guidance: "Indique a quem você escreve e por quê." },
        t1_development: { label: "Desenvolvimento", guidance: "Responda a cada um dos elementos pedidos." },
        t1_closing: { label: "Encerramento", guidance: "Conclua a mensagem de forma adequada à situação." },
        t2_situation: { label: "Apresentar a situação", guidance: "Onde e quando aconteceu? Qual era a situação?" },
        t2_events: { label: "Contar os fatos", guidance: "O que aconteceu primeiro, depois e por fim? Quais foram os detalhes mais importantes?" },
        t2_comment: { label: "Comentar e concluir", guidance: "O que você achou e por quê? O que aprendeu ou o que recomendaria aos outros?" },
        t3_synthesis: { label: "Síntese dos dois documentos", guidance: "Apresente a ideia principal de cada documento e a relação entre eles: uma oposição, uma diferença ou um ponto em comum." },
        t3_position: { label: "Sua posição", guidance: "Expresse sua opinião de forma explícita." },
        t3_arguments: { label: "Argumentos e exemplo", guidance: "Apresente duas razões, ilustre pelo menos uma com um exemplo concreto e termine com uma frase que reforce sua posição." },
      },
      eyebrow: "Treinar",
      title: "Pratique uma tarefa, seção por seção.",
      description: "Isto não é uma simulação de exame. Escolha uma tarefa e seu nível-alvo e escreva a resposta em seções curtas, cada uma com sua própria faixa de palavras. Depois, compare cada seção com uma resposta-modelo.",
      chooseTask: "Escolha uma tarefa",
      chooseLevel: "Escolha seu nível-alvo",
      levelHelp: "Escolha primeiro uma tarefa para liberar os níveis.",
      previewEyebrow: "Seu exercício",
      previewSectionsLabel: "Você vai escrever",
      startExercise: "Começar o exercício",
      backToChoice: "← Escolher outro exercício",
      scenarioLabel: "A situação",
      requiredElementsLabel: "Responda a cada um destes pontos",
      documentsLabel: "Documentos",
      examTaskLanguageNote: "Tarefa de exame, exibida em francês, como no exame real.",
      draftPlaceholder: "Escreva esta seção em francês…",
      exampleLabel: "Exemplo",
      connectorsLabel: "Conectores úteis",
      showModelAnswer: "Mostrar a resposta-modelo",
      modelAnswerLabel: "Resposta-modelo",
      compareHint: "Compare com o seu texto: o que o modelo fez que você não fez?",
      draftSavedNotice: "Seus rascunhos ficam salvos apenas neste navegador.",
      completedEyebrow: "Exercício concluído",
      completedTitle: "Você comparou todas as seções.",
      completedDescription: "Tenha em mente as estratégias do modelo na sua próxima resposta completa. Pratique de novo para reescrever as seções do zero.",
      completedWithHelpDescription: "Você viu pelo menos uma resposta-modelo antes de escrever essa seção. Pratique de novo para escrever cada seção você mesmo primeiro.",
      practiceAgain: "Praticar de novo",
      chooseAnother: "Escolher outro exercício",
      tryFullTask: "Experimentar uma tarefa completa",
      leaveTitle: "Sair deste exercício?",
      leaveDescription: "Seus rascunhos deste exercício serão descartados. Essa ação não pode ser desfeita.",
      leaveConfirm: "Descartar e sair",
      leaveKeep: "Continuar escrevendo",
      previewTitle: ({ task, level }) => `${task} · ${level}`,
      wordRange: ({ min, max }) => `${min} a ${max} palavras`,
      sectionHeading: ({ number, label }) => `${number}. ${label}`,
      draftLabel: ({ label }) => `Seu texto: ${label.toLowerCase()}`,
      wordCounter: ({ words, min, max }) => `${words} ${words === 1 ? "palavra" : "palavras"} · meta ${min} a ${max}`,
      progress: ({ viewed, total }) => `${viewed} de ${total} respostas-modelo vistas`,
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
      practiceStartDescription: "Escreva uma tarefa seção por seção e compare cada uma com uma resposta-modelo.",
      practiceStartAction: "Ir para Treinar",
      tasksStartTitle: "Simular uma tarefa",
      tasksStartDescription: "Escreva uma resposta TCF completa e receba feedback sobre sua escrita.",
      tasksStartAction: "Ir para Simular",
      practiceActivityTitle: "Atividade de prática",
      practiceExercisesCompleted: ({ count }) => `${count} exercício${count === 1 ? "" : "s"} concluído${count === 1 ? "" : "s"}`,
      practiceCompletionBreakdown: ({ independent, helped }) => `${independent} de forma independente · ${helped} com ajuda`,
      continuePractice: "Continuar treinando",
      practiceActionsMenu: "Mais opções",
      clearPracticeProgressAction: "Limpar progresso",
      clearPracticeProgressConfirmTitle: "Limpar todo o progresso de prática?",
      clearPracticeProgressConfirmDescription: "Isso remove todos os exercícios concluídos da sua atividade de prática. Essa ação não pode ser desfeita.",
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
      backToDashboard: "Voltar ao Dashboard",
      attemptedOn: ({ date }) => `Corrigida em ${date}`,
      correctionActionsMenu: "Mais opções",
      deleteCorrectionAction: "Excluir",
      deleteCorrectionConfirmTitle: "Excluir esta correção?",
      deleteCorrectionConfirmDescription:
        "Esta resposta e seus comentários serão excluídos permanentemente. Essa ação não pode ser desfeita.",
      deleteCorrectionConfirm: "Excluir",
      deleteCorrectionError: "Não foi possível excluir esta correção. Tente novamente.",
      deleteCorrectionSuccess: "Correção excluída.",
      clearCorrectionHistoryAction: "Limpar tudo",
      clearCorrectionHistoryConfirmTitle: "Limpar todo o histórico de correções?",
      clearCorrectionHistoryConfirmDescription:
        "Isso excluirá permanentemente todas as suas correções e seus comentários e redefinirá seu gráfico de progresso. Esta ação não pode ser desfeita.",
      clearCorrectionHistoryConfirm: "Limpar tudo",
      clearCorrectionHistoryError: "Não foi possível limpar seu histórico de correções. Tente novamente.",
      clearCorrectionHistorySuccess: "Histórico de correções limpo.",
      paginationPrevious: "Anterior",
      paginationNext: "Próximo",
      paginationPageOf: ({ page, pageCount }) => `Página ${page} de ${pageCount}`,
      paginationShowingRange: ({ start, end, total }) => `Mostrando ${start}–${end} de ${total}`,
    },
    settings: {
      title: "Configurações",
      appearanceHeading: "Aparência",
      appearanceDescription:
        "Escolha a aparência do MyTCFLab neste dispositivo, incluindo o login e a criação de conta.",
      themeLight: "Claro",
      themeDark: "Escuro",
      themeSystem: "Sistema",
      languageHeading: "Idioma",
      languageDescription: "Escolha o idioma usado na interface, nos comentários e no painel de tradução.",
    },
    support: {
      title: "Suporte",
      intro: "Conte o que está acontecendo: um erro, uma dúvida ou uma ideia. Lemos todas as mensagens.",
      sendAs: "Enviar como",
      categoryLabel: "Sobre o que é isso?",
      categoryPlaceholder: "Escolha uma opção…",
      categoryRequired: "Escolha uma categoria antes de enviar sua mensagem.",
      categories: {
        BUG: "Erro",
        QUESTION: "Dúvida",
        FEATURE_REQUEST_FEEDBACK: "Pedido de recurso / feedback",
        ACCOUNT_ACCESS: "Conta e acesso",
        OTHER: "Outro",
      },
      detailsLabel: "Detalhes",
      detailsPlaceholder: "O que aconteceu ou do que você precisa? Links, etapas para reproduzir e capturas de tela nos ajudam a agir mais rápido.",
      detailsRequired: "Conte um pouco mais antes de enviar sua mensagem.",
      attachmentsLabel: "Anexo",
      optional: "opcional",
      dropFile: "Arraste um arquivo aqui ou",
      browse: "procure",
      attachmentHint: ({ limit }) => `Imagens, texto, PDF, JSON ou ZIP · até ${limit} MB`,
      removeAttachment: "Remover anexo",
      attachmentUnsupported: "Escolha uma imagem, arquivo de texto, PDF, JSON ou ZIP de até 4 MB.",
      attachmentNotRestored: ({ name }) =>
        `Seu texto foi restaurado, mas "${name}" não pôde ser salvo automaticamente — anexe-o novamente se ainda quiser incluí-lo.`,
      submit: "Enviar",
      submitting: "Enviando…",
      submitError: "Não foi possível enviar sua mensagem. Tente novamente.",
      successTitle: "Obrigado por entrar em contato",
      successDescription: "Sua mensagem foi enviada para a equipe MyTCFLab.",
      sendAnother: "Enviar outra mensagem",
      discardDraftTitle: "Descartar esta mensagem?",
      discardDraftDescription: "Fechar agora vai descartar o que você escreveu. Essa ação não pode ser desfeita.",
      discardDraftConfirm: "Descartar mensagem",
    },
    walkthrough: {
      takeATour: "Fazer o tour",
      stepProgress: ({ step, total }) => `Etapa ${step} de ${total}`,
      next: "Avançar",
      back: "Voltar",
      skip: "Pular",
      finish: "Concluir",
      continueToPractice: "Continuar para Treinar",
      continueToFullTask: "Continuar para Simular",
      dashboardWelcomeTitle: "Bem-vindo ao MyTCFLab",
      dashboardWelcomeBody:
        "Este é o seu Dashboard — seu nível QECR ao longo do tempo e suas correções recentes aparecerão aqui depois de algumas redações.",
      dashboardCorrectionsTitle: "Suas correções recentes",
      dashboardCorrectionsBody:
        "A nota e o nível estimado de cada redação corrigida aparecem abaixo do gráfico, para você acompanhar exatamente como foi cada tentativa.",
      settingsTitle: "Personalize o aplicativo",
      settingsBody: "Abra o menu da conta e escolha Configurações para mudar o idioma e a aparência da interface.",
      supportTitle: "Precisa de ajuda?",
      supportBody: "Relate um bug, faça uma pergunta ou compartilhe uma ideia. Usamos o e-mail da sua conta conectada para que a equipe possa responder.",
      dashboardPracticeTitle: "Treine cada seção antes de redigir a resposta completa",
      dashboardPracticeBody: "Treinar divide uma tarefa TCF em seções curtas, cada uma com sua faixa de palavras, para você ensaiá-las antes de escrever uma resposta completa.",
      dashboardStartWritingTitle: "Pronto para simular uma tarefa?",
      dashboardStartWritingBody: "Abra Simular para escolher um enunciado de exame e receber sua primeira correção.",
      practiceIntroTitle: "Treinar constrói uma tarefa seção por seção",
      practiceIntroBody: "Esta página não é uma simulação de exame. Escolha uma tarefa e um nível e escreva a resposta em seções curtas antes de tentar uma resposta TCF completa.",
      practicePartsTitle: "Escolha uma tarefa e um nível",
      practicePartsBody: "Cada tarefa tem suas próprias seções e faixas de palavras. B2, C1 e C2 usam as mesmas seções, com uma situação e uma resposta-modelo desse nível.",
      practiceStagesTitle: "Escreva cada seção e depois compare",
      practiceStagesBody: "Escreva cada seção em sua própria caixa, de olho na contagem de palavras. Depois mostre a resposta-modelo e compare com a sua. Não há pontuação. Quando estiver pronto, abra Simular para escrever uma resposta TCF completa.",
      taskPickerTitle: "Escolha uma tarefa",
      taskPickerBody:
        "A expressão escrita do TCF tem três tipos de tarefa: a Tarefa 1 (comunicar-se com eficácia em uma mensagem curta, para o destinatário e o registro adequados), a Tarefa 2 (narrar uma experiência para vários destinatários, com comentários adequados ao seu objetivo) e a Tarefa 3 (analisar um tema sob diferentes pontos de vista). Vamos percorrer a Tarefa 1 como exemplo.",
      topicPickerTitle: "Escolha um enunciado de exame",
      topicPickerBody:
        "Os enunciados de provas recentes vêm diretamente de provas reais do TCF publicadas recentemente neste site, para você praticar sempre com um enunciado autêntico. Você também pode colar o seu próprio enunciado.",
      timedTaskTourTitle: "Pratique nas condições da prova",
      timedTaskTourBody: "Inicie uma tarefa cronometrada quando quiser praticar com a pressão de tempo real da prova. Ela acompanha o tempo sugerido para esta tarefa e continua em segundo plano enquanto você escreve.",
      spellCheckTourTitle: "Identifique erros de ortografia enquanto escreve",
      spellCheckTourBody: "Ative a verificação ortográfica para sublinhar palavras escritas incorretamente na sua resposta, com uma correção sugerida ao clicar. Ela roda localmente e nunca envia seu texto para um serviço de IA de terceiros.",
      guidedWritingTitle: "Planeje antes de escrever",
      guidedWritingBody:
        "Abra o Guia de escrita quando precisar de ideias. Clique na pequena seta ao lado dele para escolher um nível desejado — B2, C1 ou C2 — e depois use suas perguntas de planejamento, frases em francês e tempos verbais sugeridos para esse nível.",
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
        "Clique em Gerar exemplo e escolha um nível QECR — B2, C1 ou C2 — para ver uma resposta modelo completa. Seu rascunho não muda: o exemplo abre em um cartão próprio abaixo, com ícones para copiar ou fechar, e gerar outro o substitui. Nada é gerado durante o tour.",
      editorCopyTitle: "Copie seu texto",
      editorCopyBody:
        "Copiar envia sua resposta para a área de transferência, útil para colar em um documento ou em uma prova oficial de treino.",
      editorClearTitle: "Recomeçar",
      editorClearBody: "Limpar esvazia a resposta para você começar um rascunho novo.",
      translationTitle: "Traduza sua resposta",
      translationBody:
        "Mostrar tradução traduz sua resposta para o idioma da interface, ao lado do seu texto em telas largas (abaixo em telas estreitas). Depois o botão passa a ser Ocultar tradução, ou Atualizar tradução após editar. Ela só traduz quando você pede, e só o que você adicionou desde a última vez, para economizar sua cota de tradução.",
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
      stepLabel: ({ number }) => `Passo ${number}: `,
      task: {
        heading: "Escolha uma tarefa",
        targetLength: ({ minWords, maxWords }) => `Extensão desejada: ${minWords}–${maxWords} palavras.`,
      },
      topic: {
        heading: "Escolha um enunciado de exame",
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
        heading: "Escreva",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} palavras`,
        minimumWordCount: ({ remainingWords, minWords }) =>
          `Escreva mais ${remainingWords} palavra${remainingWords === 1 ? "" : "s"} para atingir o mínimo de ${minWords} palavras antes de solicitar uma correção.`,
        responseLabel: "Sua resposta",
        frenchResponsePlaceholder: "Rédigez votre réponse ici, en français…",
        correct: "Corrigir",
        correcting: "Corrigindo…",
        correctingStatus: "Estamos preparando seus comentários. Isso pode levar um momento.",
        genericCorrectionError: "Algo deu errado.",
        notFrenchText:
          "Não conseguimos reconhecer com segurança este texto como francês, então ele não foi corrigido. Escreva sua resposta em francês e verifique se não há caracteres incomuns; depois tente novamente.",
        alreadyCorrected:
          "Esta versão já foi corrigida. Edite sua resposta ou enunciado de exame para solicitar uma nova correção.",
        alreadyCorrectedFormattingNote:
          "Diferenças apenas de espaçamento não contam como uma nova versão, então a correção exibida é a do texto exatamente como você o enviou da primeira vez.",
        correctionInProgress:
          "Já existe uma correção desta resposta exata em andamento. Aguarde a conclusão ou edite a resposta ou o enunciado de exame antes de solicitar outra.",
        exampleLevelLabel: "Nível desejado",
        generateExample: "Gerar exemplo",
        generatingExample: "Gerando…",
        generatingExampleStatus: "Gerando uma resposta de exemplo. Isso pode levar um momento.",
        exampleHeading: ({ level }) => `Resposta de exemplo (${level})`,
        exampleCopy: "Copiar exemplo",
        exampleDismiss: "Fechar exemplo",
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
      spellCheck: {
        toggleLabel: "Verificação ortográfica",
        toggleAriaLabel: ({ enabled }) =>
          enabled
            ? "A verificação ortográfica está ativada. Desativá-la."
            : "A verificação ortográfica está desativada. Ativá-la.",
        statusOn: "Ativada",
        statusOff: "Desativada",
        checking: "Verificando…",
        unavailable: "A verificação ortográfica está temporariamente indisponível.",
        applyButton: "Aplicar",
        closeButtonAriaLabel: "Fechar a sugestão",
        noReplacementHint: "Não há sugestão automática para este problema.",
        issuesHeading: ({ count }) => (count === 1 ? "1 problema encontrado" : `${count} problemas encontrados`),
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
        dashboardSwitchDescription: "Ir para o Dashboard descartará o enunciado, o rascunho e os comentários atuais.",
        adminSwitchDescription: "Ir para a administração descartará o enunciado, o rascunho e os comentários atuais.",
        topicSwitchDescription: "Trocar de enunciado descartará o enunciado, o rascunho e os comentários atuais.",
        clearDraftDescription: "Limpar descartará seu rascunho e comentários atuais.",
        clearDraftConfirm: "Limpar texto",
        correctTitle: "Corrigir esta resposta?",
        correctDescription:
          "Sua resposta será enviada para correção e usará uma das suas correções diárias.",
        correctNearIdenticalDescription:
          "Este rascunho é quase idêntico a um que você já corrigiu. Enviá-lo de novo usará outra correção diária, e o resultado pode variar um pouco.",
        correctConfirm: "Enviar para correção",
        confirm: "Descartar e trocar",
        cancel: "Continuar trabalhando",
      },
    },
  },
} satisfies Record<AppLocale, AppCopy>;

export function getAppCopy(locale: AppLocale): AppCopy {
  return APP_COPY[locale];
}
