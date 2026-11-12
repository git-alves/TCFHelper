import { describe, expect, it } from "vitest";
import { APP_LOCALES } from "@/lib/app-locale";
import { APP_COPY, getAppCopy } from "./app-copy";

describe("APP_COPY", () => {
  it("covers every supported application locale", () => {
    expect(Object.keys(APP_COPY).sort()).toEqual([...APP_LOCALES].sort());
  });

  it("returns complete, renderable static copy for each locale", () => {
    for (const locale of APP_LOCALES) {
      const copy = getAppCopy(locale);

      expect(copy).toBe(APP_COPY[locale]);

      const renderedCopy = [
        copy.common.cancel,
        copy.common.close,
        copy.nav.dashboard,
        copy.nav.tasks,
        copy.nav.practice,
        copy.nav.support,
        copy.nav.settings,
        copy.nav.logIn,
        copy.nav.closeSettingsFirst,
        copy.nav.closeSupportFirst,
        copy.home.title,
        copy.home.description,
        copy.home.startATask,
        copy.home.getStarted,
        ...Object.values(copy.practice.tasks).flatMap((task) => [task.title, task.description]),
        ...Object.values(copy.practice.levels).flatMap((level) => [level.title, level.description]),
        copy.login.title,
        copy.login.emailLabel,
        copy.login.passwordLabel,
        copy.login.invalidCredentials,
        copy.login.submitting,
        copy.login.submit,
        copy.login.noAccount,
        copy.login.signUp,
        copy.signup.title,
        copy.signup.nameLabel,
        copy.signup.emailLabel,
        copy.signup.passwordLabel,
        copy.signup.invalidInput,
        copy.signup.emailInUse,
        copy.signup.genericError,
        copy.signup.automaticLoginFailed,
        copy.signup.submitting,
        copy.signup.submit,
        copy.signup.alreadyHaveAccount,
        copy.signup.logIn,
        copy.dashboard.welcome("Ana"),
        copy.dashboard.startHereEyebrow,
        copy.dashboard.startHereTitle,
        copy.dashboard.startHereDescription,
        copy.dashboard.practiceStartTitle,
        copy.dashboard.practiceStartDescription,
        copy.dashboard.practiceStartAction,
        copy.dashboard.tasksStartTitle,
        copy.dashboard.tasksStartDescription,
        copy.dashboard.tasksStartAction,
        copy.dashboard.practiceActivityTitle,
        copy.dashboard.practiceExercisesCompleted({ count: 2 }),
        copy.dashboard.practiceCompletionBreakdown({ independent: 1, helped: 1 }),
        copy.dashboard.continuePractice,
        copy.dashboard.accountUnavailableTitle,
        copy.dashboard.accountUnavailableDescription,
        copy.dashboard.chartTitle,
        copy.dashboard.chartCaption({ count: 5 }),
        copy.dashboard.emptyTitle,
        copy.dashboard.emptyDescription,
        copy.dashboard.taskLegend({ number: 1 }),
        copy.dashboard.levelAxisLabel,
        copy.dashboard.attemptAxisLabel,
        copy.dashboard.recentCorrectionsTitle,
        copy.dashboard.viewAllCorrections,
        copy.dashboard.correctionHistoryTitle,
        copy.dashboard.noCorrectionHistoryTitle,
        copy.dashboard.noCorrectionHistoryDescription,
        copy.dashboard.limitedCorrectionDetails,
        copy.dashboard.backToCorrectionHistory,
        copy.dashboard.backToDashboard,
        copy.dashboard.attemptedOn({ date: "August 7, 2026" }),
        copy.walkthrough.takeATour,
        copy.walkthrough.stepProgress({ step: 1, total: 10 }),
        copy.walkthrough.next,
        copy.walkthrough.back,
        copy.walkthrough.skip,
        copy.walkthrough.finish,
        copy.walkthrough.continueToPractice,
        copy.walkthrough.continueToFullTask,
        copy.walkthrough.dashboardWelcomeTitle,
        copy.walkthrough.dashboardWelcomeBody,
        copy.walkthrough.dashboardCorrectionsTitle,
        copy.walkthrough.dashboardCorrectionsBody,
        copy.walkthrough.settingsTitle,
        copy.walkthrough.settingsBody,
        copy.walkthrough.supportTitle,
        copy.walkthrough.supportBody,
        copy.walkthrough.dashboardPracticeTitle,
        copy.walkthrough.dashboardPracticeBody,
        copy.walkthrough.dashboardStartWritingTitle,
        copy.walkthrough.dashboardStartWritingBody,
        copy.walkthrough.practiceIntroTitle,
        copy.walkthrough.practiceIntroBody,
        copy.walkthrough.practicePartsTitle,
        copy.walkthrough.practicePartsBody,
        copy.walkthrough.practiceStagesTitle,
        copy.walkthrough.practiceStagesBody,
        copy.walkthrough.taskPickerTitle,
        copy.walkthrough.taskPickerBody,
        copy.walkthrough.topicPickerTitle,
        copy.walkthrough.topicPickerBody,
        copy.walkthrough.guidedWritingTitle,
        copy.walkthrough.guidedWritingBody,
        copy.walkthrough.timedTaskTourTitle,
        copy.walkthrough.timedTaskTourBody,
        copy.walkthrough.spellCheckTourTitle,
        copy.walkthrough.spellCheckTourBody,
        copy.walkthrough.editorTitle,
        copy.walkthrough.editorBody,
        copy.walkthrough.correctButtonTitle,
        copy.walkthrough.correctButtonBody,
        copy.walkthrough.correctionModalTitle,
        copy.walkthrough.correctionModalBody,
        copy.walkthrough.exampleGenerateTitle,
        copy.walkthrough.exampleGenerateBody,
        copy.walkthrough.editorCopyTitle,
        copy.walkthrough.editorCopyBody,
        copy.walkthrough.editorClearTitle,
        copy.walkthrough.editorClearBody,
        copy.walkthrough.translationTitle,
        copy.walkthrough.translationBody,
        copy.walkthrough.navTitle,
        copy.walkthrough.navBody,
        copy.walkthrough.previewFeedback.summary,
        copy.walkthrough.previewFeedback.cefrRationale,
        copy.walkthrough.previewFeedback.wordCountNote,
        copy.walkthrough.previewFeedback.contentNote,
        copy.walkthrough.previewFeedback.linguisticsNote,
        copy.walkthrough.previewFeedback.vocabularyNote,
        copy.walkthrough.previewFeedback.agreementErrorExplanation,
        copy.walkthrough.previewFeedback.participleErrorExplanation,
        copy.walkthrough.previewFeedback.suggestionOne,
        copy.walkthrough.previewFeedback.suggestionTwo,
        copy.settings.title,
        copy.settings.appearanceHeading,
        copy.settings.appearanceDescription,
        copy.settings.themeLight,
        copy.settings.themeDark,
        copy.settings.themeSystem,
        copy.settings.languageHeading,
        copy.settings.languageDescription,
        copy.support.title,
        copy.support.intro,
        copy.support.sendAs,
        copy.support.categoryLabel,
        copy.support.categoryPlaceholder,
        copy.support.categoryRequired,
        ...Object.values(copy.support.categories),
        copy.support.detailsLabel,
        copy.support.detailsPlaceholder,
        copy.support.detailsRequired,
        copy.support.attachmentsLabel,
        copy.support.optional,
        copy.support.dropFile,
        copy.support.browse,
        copy.support.attachmentHint({ limit: "4" }),
        copy.support.removeAttachment,
        copy.support.attachmentUnsupported,
        copy.support.attachmentNotRestored({ name: "notes.txt" }),
        copy.support.submit,
        copy.support.submitting,
        copy.support.submitError,
        copy.support.successTitle,
        copy.support.successDescription,
        copy.support.sendAnother,
        copy.workspace.task.heading,
        copy.workspace.task.targetLength({ minWords: 60, maxWords: 120 }),
        copy.workspace.topic.heading,
        copy.workspace.topic.recentExamTitle,
        copy.workspace.topic.recentExamDescription,
        copy.workspace.topic.selectedTopicAriaLabel,
        copy.workspace.topic.customTitle,
        copy.workspace.topic.customDescription,
        copy.workspace.topic.loading,
        copy.workspace.topic.fetchError,
        copy.workspace.topic.unavailableError,
        copy.workspace.topic.noTopicsError,
        copy.workspace.topic.customTopicLabel,
        copy.workspace.topic.customTopicPlaceholder,
        copy.workspace.editor.heading,
        copy.workspace.editor.wordCount({ count: 80, minWords: 60, maxWords: 120 }),
        copy.workspace.editor.minimumWordCount({ remainingWords: 1, minWords: 60 }),
        copy.workspace.editor.responseLabel,
        copy.workspace.editor.frenchResponsePlaceholder,
        copy.workspace.editor.correct,
        copy.workspace.editor.correcting,
        copy.workspace.editor.correctingStatus,
        copy.workspace.editor.genericCorrectionError,
        copy.workspace.editor.alreadyCorrected,
        copy.workspace.editor.correctionInProgress,
        copy.workspace.editor.exampleLevelLabel,
        copy.workspace.editor.generateExample,
        copy.workspace.editor.generatingExample,
        copy.workspace.editor.generatingExampleStatus,
        copy.workspace.editor.exampleCopy,
        copy.workspace.editor.exampleDismiss,
        copy.workspace.editor.exampleRateLimitedError,
        copy.workspace.editor.exampleDailyLimitError,
        copy.workspace.editor.exampleUnavailableError,
        copy.workspace.editor.exampleGenericError,
        copy.workspace.editor.exampleNeedsTopicWarning,
        copy.workspace.editor.copy,
        copy.workspace.editor.copied,
        copy.workspace.editor.copyFailed,
        copy.workspace.editor.clear,
        copy.workspace.guidedWriting.show,
        copy.workspace.guidedWriting.hide,
        copy.workspace.guidedWriting.heading,
        copy.workspace.guidedWriting.guideForLevel({ level: "B2" }),
        copy.workspace.guidedWriting.contextConfirmHeading,
        copy.workspace.guidedWriting.contextConfirmPrompt,
        copy.workspace.guidedWriting.contextConfirmTextTypePrompt,
        copy.workspace.guidedWriting.contextConfirmAction,
        copy.workspace.guidedWriting.changeContext,
        copy.workspace.guidedWriting.contextLabel({ profile: "Test" }),
        copy.workspace.guidedWriting.previousStage,
        copy.workspace.guidedWriting.nextStage,
        copy.workspace.guidedWriting.optionalStep,
        copy.workspace.guidedWriting.ideasLabel,
        copy.workspace.guidedWriting.tensesLabel,
        copy.workspace.guidedWriting.tensesHint,
        copy.workspace.guidedWriting.completionCheckLabel,
        copy.workspace.guidedWriting.examplesLabel,
        copy.workspace.guidedWriting.morePhrases,
        copy.workspace.timedTask.show,
        copy.workspace.timedTask.heading,
        copy.workspace.timedTask.suggestedTotalTime({ minutes: 12 }),
        copy.workspace.timedTask.phaseDuration({ label: "Plan", minutes: 2 }),
        copy.workspace.timedTask.start,
        copy.workspace.timedTask.pause,
        copy.workspace.timedTask.paused,
        copy.workspace.timedTask.resume,
        copy.workspace.timedTask.end,
        copy.workspace.timedTask.remaining({ minutes: "12", seconds: "00" }),
        copy.workspace.timedTask.timeUp,
        copy.workspace.timedTask.continueForTwoMinutes,
        copy.workspace.timedTask.summaryHeading,
        copy.workspace.timedTask.summaryActualTime({ time: "12:00" }),
        copy.workspace.timedTask.summaryTargetTime({ time: "12:00" }),
        copy.workspace.timedTask.summaryWordCount({ count: 80 }),
        copy.workspace.timedTask.summaryPhaseReached,
        copy.workspace.timedTask.summaryPhaseNotReached,
        copy.workspace.timedTask.summaryClose,
        ...Object.values(copy.workspace.timedTask.phaseLabels),
        ...Object.values(copy.workspace.timedTask.phasePrompts),
        copy.workspace.translation.heading({ language: "English" }),
        copy.workspace.translation.show,
        copy.workspace.translation.update,
        copy.workspace.translation.hide,
        copy.workspace.translation.inProgress,
        copy.workspace.translation.unavailableError,
        copy.workspace.translation.rateLimitedError,
        copy.workspace.translation.monthlyQuotaError,
        copy.workspace.translation.tooLong({ maxCharacters: "4,000" }),
        copy.workspace.translation.unofficialFallbackNotice,
        copy.workspace.feedback.heading({ language: "English" }),
        copy.workspace.feedback.estimatedLevel({ level: "B2" }),
        copy.workspace.feedback.generatedInOtherLanguage({
          generatedLanguage: "English",
          selectedLanguage: "French",
        }),
        copy.workspace.feedback.stale,
        copy.workspace.feedback.correctedText,
        copy.workspace.feedback.errors({ count: 2 }),
        copy.workspace.feedback.suggestions,
        ...Object.values(copy.workspace.feedback.errorCategories),
        copy.workspace.correctionModal.title({ taskLabel: "Tâche 2" }),
        copy.workspace.correctionModal.submissionId({ id: "essay_123" }),
        copy.workspace.correctionModal.loading,
        copy.workspace.correctionModal.statusEvaluated,
        copy.workspace.correctionModal.wordCount({ count: 135, minWords: 120, maxWords: 150 }),
        copy.workspace.correctionModal.secureLevel({ level: "B2" }),
        copy.workspace.correctionModal.demonstratedLevel({ level: "B2" }),
        copy.workspace.correctionModal.cefrRationaleHeading,
        copy.workspace.correctionModal.cefrEstimateDisclosure,
        copy.workspace.correctionModal.downloadPdf,
        copy.workspace.correctionModal.viewCorrection,
        copy.workspace.correctionModal.tabOverview,
        copy.workspace.correctionModal.scoreDisclosure,
        copy.workspace.correctionModal.globalPerformanceHeading,
        copy.workspace.correctionModal.overallScore({ score: 80 }),
        copy.workspace.correctionModal.overallScoreDescription,
        copy.workspace.correctionModal.tabCompared,
        copy.workspace.correctionModal.tabComments,
        copy.workspace.correctionModal.contentScoreLabel,
        copy.workspace.correctionModal.linguisticsScoreLabel,
        copy.workspace.correctionModal.vocabularyScoreLabel,
        copy.workspace.correctionModal.originalHeading,
        copy.workspace.correctionModal.correctedHeading,
        copy.workspace.correctionModal.correctionsHeading({ count: 2 }),
        copy.workspace.correctionModal.noCorrectionsNote,
        copy.workspace.correctionModal.errorLabel,
        copy.workspace.correctionModal.correctionLabel,
        copy.workspace.correctionModal.noteLabel,
        copy.workspace.correctionModal.toggleNote,
        copy.workspace.correctionModal.commentsHeading,
        copy.workspace.correctionModal.modelVersionHeading,
        copy.workspace.correctionModal.tryAgain,
        copy.workspace.dialog.title,
        copy.workspace.dialog.taskSwitchDescription,
        copy.workspace.dialog.topicSwitchDescription,
        copy.workspace.dialog.dashboardSwitchDescription,
        copy.workspace.dialog.adminSwitchDescription,
        copy.workspace.dialog.clearDraftDescription,
        copy.workspace.dialog.clearDraftConfirm,
        copy.workspace.dialog.confirm,
        copy.workspace.dialog.cancel,
      ];

      for (const value of renderedCopy) {
        expect(value.trim()).not.toBe("");
      }
    }
  });

  it("distinguishes Task 1 functional communication from Task 2's multi-reader narrative in every locale", () => {
    // A revert to the old "give and justify an opinion" framing must fail
    // this test even though taskPickerBody would still be non-empty.
    const oldOpinionPhrasingByLocale = {
      en: "give and justify an opinion",
      fr: "donner et justifier une opinion",
      es: "dar y justificar una opinión",
      pt: "dar e justificar uma opinião",
    } as const;
    const correctedPhrasingByLocale = {
      en: "recount an experience for several readers",
      fr: "raconter une expérience pour plusieurs destinataires",
      es: "narrar una experiencia para varios destinatarios",
      pt: "narrar uma experiência para vários destinatários",
    } as const;
    const taskOneFunctionalPhrasingByLocale = {
      en: "communicate effectively in a short message",
      fr: "communiquer efficacement dans un message court",
      es: "comunicarse eficazmente en un mensaje breve",
      pt: "comunicar-se com eficácia em uma mensagem curta",
    } as const;

    for (const locale of APP_LOCALES) {
      const taskPickerBody = getAppCopy(locale).walkthrough.taskPickerBody;

      expect(taskPickerBody.toLowerCase()).not.toContain(oldOpinionPhrasingByLocale[locale]);
      expect(taskPickerBody).toContain(correctedPhrasingByLocale[locale]);
      expect(taskPickerBody).toContain(taskOneFunctionalPhrasingByLocale[locale]);
    }
  });

  it("has complete practice-mode interface copy for every locale", () => {
    for (const locale of APP_LOCALES) {
      const practice = getAppCopy(locale).practice;
      const values = [
        ...Object.values(practice.tasks).flatMap((task) => [task.title, task.description]),
        ...Object.values(practice.levels).flatMap((level) => [level.title, level.description]),
        ...Object.values(practice.sections).flatMap((section) => [section.label, section.guidance]),
        practice.eyebrow,
        practice.title,
        practice.description,
        practice.chooseTask,
        practice.chooseLevel,
        practice.levelHelp,
        practice.previewEyebrow,
        practice.previewTitle({ task: "Task 1", level: "B2" }),
        practice.previewSectionsLabel,
        practice.wordRange({ min: 10, max: 15 }),
        practice.startExercise,
        practice.backToChoice,
        practice.scenarioLabel,
        practice.requiredElementsLabel,
        practice.documentsLabel,
        practice.examTaskLanguageNote,
        practice.sectionHeading({ number: 1, label: "Opening" }),
        practice.draftLabel({ label: "Opening" }),
        practice.draftPlaceholder,
        practice.exampleLabel,
        practice.connectorsLabel,
        practice.wordCounter({ words: 12, min: 10, max: 15 }),
        practice.showModelAnswer,
        practice.modelAnswerLabel,
        practice.compareHint,
        practice.progress({ viewed: 1, total: 3 }),
        practice.draftSavedNotice,
        practice.completedEyebrow,
        practice.completedTitle,
        practice.completedDescription,
        practice.completedWithHelpDescription,
        practice.practiceAgain,
        practice.chooseAnother,
        practice.tryFullTask,
        practice.leaveTitle,
        practice.leaveDescription,
        practice.leaveConfirm,
        practice.leaveKeep,
      ];

      for (const value of values) {
        expect(value.trim(), `${locale}/${value}`).not.toBe("");
      }
    }
  });

  it("uses the current Train and Simulate names throughout the walkthrough", () => {
    const expectedByLocale = {
      en: {
        train: "Train",
        simulate: "Simulate",
        simulateTaskTitle: "Ready to Simulate a Task?",
      },
      fr: {
        train: "Entraînement",
        simulate: "Simulation",
        simulateTaskTitle: "Prêt·e à simuler une tâche ?",
      },
      es: {
        train: "Entrenar",
        simulate: "Simular",
        simulateTaskTitle: "¿Listo para simular una tarea?",
      },
      pt: {
        train: "Treinar",
        simulate: "Simular",
        simulateTaskTitle: "Pronto para simular uma tarefa?",
      },
    } as const;

    for (const locale of APP_LOCALES) {
      const copy = getAppCopy(locale);
      const expected = expectedByLocale[locale];

      expect(copy.nav.practice).toBe(expected.train);
      expect(copy.nav.tasks).toBe(expected.simulate);
      expect(copy.walkthrough.continueToPractice).toContain(expected.train);
      expect(copy.walkthrough.continueToFullTask).toContain(expected.simulate);
      expect(copy.walkthrough.dashboardPracticeBody).toContain(expected.train);
      expect(copy.walkthrough.dashboardStartWritingTitle).toBe(expected.simulateTaskTitle);
      expect(copy.walkthrough.dashboardStartWritingBody).toContain(expected.simulate);
      expect(copy.walkthrough.practiceStagesBody).toContain(expected.simulate);
    }
  });

  it("names the topic button \"random topic\" in every language, and the tour step names the same button", () => {
    const expected = {
      en: "Get a random topic",
      fr: "Obtenir un sujet aléatoire",
      es: "Obtener un tema aleatorio",
      pt: "Obter um tema aleatório",
    } as const;

    for (const locale of APP_LOCALES) {
      const copy = getAppCopy(locale);
      const label = expected[locale];

      expect(copy.workspace.topic.recentExamTitle).toBe(label);
      expect(copy.walkthrough.topicPickerBody).toContain(label);
    }
  });

  it("no longer promises that every tour or picker prompt is a real, authentic exam prompt", () => {
    const claims = /authentic|authentique|auténtic|autêntic|pulled directly|proviennent directement/i;

    for (const locale of APP_LOCALES) {
      const copy = getAppCopy(locale);

      expect(copy.walkthrough.topicPickerBody).not.toMatch(claims);
      expect(copy.workspace.topic.recentExamDescription).not.toMatch(claims);
    }
  });

  describe("the tour's support step (nav-support)", () => {
    const REPORTS_TO_SUPPORT = {
      en: /Report a bug/,
      fr: /Signalez un bug/,
      es: /Informa un error/,
      pt: /Relate um bug/,
    } as const;
    // How the red dot is named in each language.
    const RED_DOT = {
      en: /red dot/i,
      fr: /point rouge/i,
      es: /punto rojo/i,
      pt: /bolinha vermelha/i,
    } as const;
    // The overlay's own regression test (walkthrough-overlay.responsive.test.tsx)
    // exercises a ~335-character body: its panel scrolls independently of
    // Skip/Back/Next and is capped to the room below it, so a body inside that
    // bound fits the tooltip.
    const LONGEST_BODY_THE_TOOLTIP_IS_TESTED_WITH = 335;

    it.each(APP_LOCALES)("%s keeps its original sentences and explains the red dot on the support icon", (locale) => {
      const { supportBody } = getAppCopy(locale).walkthrough;

      expect(supportBody).toMatch(REPORTS_TO_SUPPORT[locale]);
      expect(supportBody).toMatch(RED_DOT[locale]);
    });

    it.each(APP_LOCALES)("%s stays within the body length the tooltip is tested with", (locale) => {
      expect(getAppCopy(locale).walkthrough.supportBody.length).toBeLessThan(LONGEST_BODY_THE_TOOLTIP_IS_TESTED_WITH);
    });

    it("explains it in Portuguese the way the product asked", () => {
      expect(getAppCopy("pt").walkthrough.supportBody).toContain(
        "Quando aparecer uma bolinha vermelha neste ícone, é porque o suporte respondeu ao seu chamado: clique para ver e nos dizer se funcionou.",
      );
    });
  });
});

describe("correction failure and draft-restore copy", () => {
  const stringsOf = (copy: ReturnType<typeof getAppCopy>) => {
    const editor = copy.workspace.editor;
    return {
      genericCorrectionError: editor.genericCorrectionError,
      correctionBusyError: editor.correctionBusyError,
      correctionSessionExpiredError: editor.correctionSessionExpiredError,
      correctionDailyLimitError: editor.correctionDailyLimitError({ time: "21:30" }),
      correctionDailyLimitErrorNoTime: editor.correctionDailyLimitErrorNoTime,
      correctionStillTrying: editor.correctionStillTrying,
      draftRestoreMessage: editor.draftRestoreMessage,
      draftRestoreAction: editor.draftRestoreAction,
      draftDiscardAction: editor.draftDiscardAction,
    };
  };

  it("exists, and differs from English, in every locale", () => {
    const english = stringsOf(getAppCopy("en"));
    for (const locale of APP_LOCALES) {
      const strings = stringsOf(getAppCopy(locale));
      for (const [name, value] of Object.entries(strings)) {
        expect(value.trim(), `${locale}.${name}`).not.toBe("");
        if (locale !== "en") expect(value, `${locale}.${name}`).not.toBe(english[name as keyof typeof english]);
      }
    }
  });

  it("puts the reset time in the daily-limit message in every locale", () => {
    for (const locale of APP_LOCALES) {
      expect(getAppCopy(locale).workspace.editor.correctionDailyLimitError({ time: "21:30" })).toContain("21:30");
    }
  });

  it("never calls the system an AI, in any language", () => {
    for (const locale of APP_LOCALES) {
      for (const [name, value] of Object.entries(stringsOf(getAppCopy(locale)))) {
        expect(value, `${locale}.${name}`).not.toMatch(/\b(AI|IA|KI)\b|artificial|artificielle|artificial|inteligencia|inteligência|intelligence/i);
      }
    }
  });

  it("calls it the system, in each language", () => {
    expect(getAppCopy("en").workspace.editor.correctionBusyError).toContain("system");
    expect(getAppCopy("fr").workspace.editor.correctionBusyError).toContain("système");
    expect(getAppCopy("es").workspace.editor.correctionBusyError).toContain("sistema");
    expect(getAppCopy("pt").workspace.editor.correctionBusyError).toContain("sistema");
  });

  it("marks emphasis with balanced ** pairs, and says the text is kept wherever it mentions the draft", () => {
    for (const locale of APP_LOCALES) {
      const editor = getAppCopy(locale).workspace.editor;
      for (const value of [editor.genericCorrectionError, editor.correctionBusyError, editor.correctionSessionExpiredError]) {
        expect((value.match(/\*\*/g) ?? []).length % 2).toBe(0);
        expect(value).toMatch(/\*\*[^*]+\*\*/);
      }
    }
  });

  it("uses the product's exact Portuguese wording", () => {
    const editor = getAppCopy("pt").workspace.editor;
    expect(editor.correctionDailyLimitError({ time: "21:00" })).toBe(
      "Você esgotou seu limite de correções de hoje. Ele voltará às 21:00.",
    );
    expect(editor.correctionBusyError.replaceAll("**", "")).toBe(
      "O sistema está ocupado. Seu texto está salvo, tente de novo em um minuto.",
    );
    expect(editor.correctionBusyError).toBe("O sistema está ocupado. **Seu texto está salvo**, tente de novo em um minuto.");
    expect(editor.correctionSessionExpiredError.replaceAll("**", "")).toBe(
      "Sua sessão expirou. Entre de novo para corrigir; seu texto está salvo.",
    );
    expect(editor.correctionStillTrying).toBe("O sistema está ocupado, ainda tentando…");
    expect(editor.draftRestoreMessage).toBe("Encontramos um rascunho não enviado. Recuperar?");
    expect(editor.draftRestoreAction).toBe("Recuperar");
    expect(editor.draftDiscardAction).toBe("Descartar");
  });
});
