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
        copy.nav.localeLabel,
        copy.nav.localeHelp,
        copy.nav.dashboard,
        copy.nav.signOut,
        copy.nav.logIn,
        copy.nav.signUp,
        copy.home.title,
        copy.home.description,
        copy.home.translationDisclosure,
        copy.home.goToDashboard,
        copy.home.getStarted,
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
        copy.dashboard.accountUnavailableTitle,
        copy.dashboard.accountUnavailableDescription,
        copy.workspace.task.heading,
        copy.workspace.task.targetLength({ minWords: 60, maxWords: 120 }),
        copy.workspace.topic.heading,
        copy.workspace.topic.recentExamTitle,
        copy.workspace.topic.recentExamDescription,
        copy.workspace.topic.customTitle,
        copy.workspace.topic.customDescription,
        copy.workspace.topic.loading,
        copy.workspace.topic.fetchError,
        copy.workspace.topic.unavailableError,
        copy.workspace.topic.notPublishedError,
        copy.workspace.topic.selectedRecentExamAriaLabel,
        copy.workspace.topic.sourceLabel,
        copy.workspace.topic.recentExamsSource({ month: "July 2026" }),
        copy.workspace.topic.customTopicLabel,
        copy.workspace.topic.customTopicPlaceholder,
        copy.workspace.editor.heading,
        copy.workspace.editor.wordCount({ count: 80, minWords: 60, maxWords: 120 }),
        copy.workspace.editor.responseLabel,
        copy.workspace.editor.frenchResponsePlaceholder,
        copy.workspace.editor.correct,
        copy.workspace.editor.correcting,
        copy.workspace.editor.correctingStatus,
        copy.workspace.editor.genericCorrectionError,
        copy.workspace.translation.heading({ language: "English" }),
        copy.workspace.translation.inProgress,
        copy.workspace.translation.empty,
        copy.workspace.translation.unavailableError,
        copy.workspace.translation.rateLimitedError,
        copy.workspace.translation.monthlyQuotaError,
        copy.workspace.translation.tooLong({ maxCharacters: "4,000" }),
        copy.workspace.translation.deeplNotice,
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
        copy.workspace.dialog.title,
        copy.workspace.dialog.taskSwitchDescription,
        copy.workspace.dialog.topicSwitchDescription,
        copy.workspace.dialog.confirm,
        copy.workspace.dialog.cancel,
      ];

      for (const value of renderedCopy) {
        expect(value.trim()).not.toBe("");
      }
    }
  });
});
