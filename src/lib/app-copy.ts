import type { AppLocale } from "@/lib/app-locale";
import type { EssayFeedback } from "@/lib/essay-feedback";

type FeedbackErrorCategory = EssayFeedback["errors"][number]["category"];

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
    settings: string;
    logIn: string;
    closeSettingsFirst: string;
  };
  home: {
    title: string;
    description: string;
    goToDashboard: string;
    getStarted: string;
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
    translation: {
      heading: (values: LanguageValues) => string;
      inProgress: string;
      empty: string;
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
      estimatedLevel: (values: FeedbackLevelValues) => string;
      cefrRationaleHeading: string;
      cefrEstimateDisclosure: string;
      downloadPdf: string;
      viewCorrection: string;
      tabOverview: string;
      scoreDisclosure: string;
      globalPerformanceHeading: string;
      overallScore: (values: { score: number }) => string;
      overallScoreDescription: string;
      tabCompared: string;
      tabComments: string;
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
      tasks: "Tasks",
      settings: "Settings",
      logIn: "Log in",
      closeSettingsFirst: "Close Settings first",
    },
    home: {
      title: "Write for the TCF exam. Get feedback that gets you to B2 or C1.",
      description:
        "Practice Task 1, 2, and 3 essays, then get grammar, vocabulary, and CEFR-level feedback in seconds.",
      goToDashboard: "Go to dashboard",
      getStarted: "Get started",
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
      languageDescription: "Choose the language used across the interface, feedback, and live translation panel.",
      helpHeading: "Help & support",
      helpDescription: "Have a question or found a problem? Reach out and we'll help.",
    },
    workspace: {
      task: {
        heading: "1. Choose a task",
        targetLength: ({ minWords, maxWords }) => `Target length: ${minWords}–${maxWords} words.`,
      },
      topic: {
        heading: "2. Choose a topic",
        recentExamTitle: "Get a topic from recent exams",
        recentExamDescription: "Load a topic for the task you selected.",
        customTitle: "Write or paste my own topic",
        customDescription: "Use a prompt you already have.",
        loading: "Getting a topic from recent exams…",
        fetchError: "We couldn't get a topic from recent exams. Please try again or write your own.",
        unavailableError: "The recent-exam topic was unavailable. Please try again or write your own.",
        notPublishedError:
          "No recent-exam topics have been published for this month or the previous month. Write or paste your own topic.",
        selectedRecentExamAriaLabel: "Selected recent-exam topic",
        sourceLabel: "Source:",
        recentExamsSource: ({ month }) => `Recent exams — ${month}`,
        customTopicLabel: "Your topic or prompt",
        customTopicPlaceholder: "Paste or write the topic/prompt you want to respond to…",
      },
      editor: {
        heading: "3. Write",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} words`,
        responseLabel: "Your response",
        frenchResponsePlaceholder: "Écrivez votre texte ici…",
        correct: "Correct",
        correcting: "Correcting…",
        correctingStatus: "Getting your feedback. This can take a moment.",
        genericCorrectionError: "Something went wrong.",
        alreadyCorrected:
          "This version has already been corrected. Edit your response or topic to request a new correction.",
        correctionInProgress:
          "A correction for this exact response is already in progress. Wait for it to finish or edit the response or topic before requesting another one.",
        exampleLevelLabel: "Target level",
        generateExample: "Generate example",
        generatingExample: "Generating…",
        generatingExampleStatus: "Generating an example response. This can take a moment.",
        exampleRateLimitedError: "The example generator is busy. Please try again shortly.",
        exampleDailyLimitError: "You've reached today's example limit. Please try again tomorrow.",
        exampleUnavailableError: "The example generator isn't available right now.",
        exampleGenericError: "We couldn't generate an example. Please try again.",
        exampleNeedsTopicWarning:
          "Choose a topic from recent exams or paste your own before generating an example.",
        copy: "Copy text",
        copied: "Copied!",
        copyFailed: "Couldn't copy",
        clear: "Clear text",
      },
      translation: {
        heading: ({ language }) => `Translation (${language})`,
        inProgress: "Translating…",
        empty: "Your translation will appear here as you write.",
        unavailableError: "Translation is unavailable right now.",
        rateLimitedError: "You’re translating too quickly. Please wait a moment and try again.",
        monthlyQuotaError:
          "You’ve reached this month’s live translation limit. Please try again next month.",
        tooLong: ({ maxCharacters }) =>
          `Live translation is available for drafts up to ${maxCharacters} characters. This draft is longer — submit it for correction to see full feedback.`,
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
        estimatedLevel: ({ level }) => `Estimated level: ${level}`,
        cefrRationaleHeading: "Why this estimate",
        cefrEstimateDisclosure:
          "This automated estimate is based on this submitted response. A requested C1/C2 study-example level is a target, not a verified result.",
        downloadPdf: "Print / Save as PDF",
        viewCorrection: "View correction",
        tabOverview: "Overview & scores",
        scoreDisclosure: "mytcflab learning indicators - not official TCF.",
        globalPerformanceHeading: "Global performance",
        overallScore: ({ score }) => `Overall learning indicator: ${score}%`,
        overallScoreDescription: "Average of the three mytcflab learning indicators below.",
        tabCompared: "Compared text",
        tabComments: "Feedback & tips",
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
        taskSwitchDescription: "Switching tasks will discard your current topic, draft, and feedback.",
        dashboardSwitchDescription: "Going to the dashboard will discard your current topic, draft, and feedback.",
        topicSwitchDescription: "Switching topics will discard your current topic, draft, and feedback.",
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
      tasks: "Tâches",
      settings: "Paramètres",
      logIn: "Se connecter",
      closeSettingsFirst: "Fermez d’abord les paramètres",
    },
    home: {
      title: "Préparez l’expression écrite du TCF. Recevez des commentaires qui vous aident à atteindre le niveau B2 ou C1.",
      description:
        "Entraînez-vous aux tâches 1, 2 et 3, puis recevez en quelques secondes des commentaires sur la grammaire, le vocabulaire et votre niveau du CECRL.",
      goToDashboard: "Accéder au tableau de bord",
      getStarted: "Commencer",
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
        "Choisissez la langue utilisée dans l’interface, les commentaires et le panneau de traduction en direct.",
      helpHeading: "Aide et assistance",
      helpDescription: "Une question ou un problème ? Contactez-nous, nous sommes là pour vous aider.",
    },
    workspace: {
      task: {
        heading: "1. Choisissez une tâche",
        targetLength: ({ minWords, maxWords }) => `Longueur visée : ${minWords}–${maxWords} mots.`,
      },
      topic: {
        heading: "2. Choisissez un sujet",
        recentExamTitle: "Obtenir un sujet d’examens récents",
        recentExamDescription: "Chargez un sujet pour la tâche que vous avez choisie.",
        customTitle: "Écrire ou coller mon propre sujet",
        customDescription: "Utilisez un sujet que vous avez déjà.",
        loading: "Récupération d’un sujet d’examens récents…",
        fetchError:
          "Nous n’avons pas pu obtenir un sujet d’examens récents. Réessayez ou rédigez votre propre sujet.",
        unavailableError:
          "Le sujet d’examens récents n’est pas disponible. Réessayez ou rédigez votre propre sujet.",
        notPublishedError:
          "Aucun sujet d’examens récents n’a été publié pour ce mois-ci ni le mois précédent. Rédigez ou collez votre propre sujet.",
        selectedRecentExamAriaLabel: "Sujet d’examen récent sélectionné",
        sourceLabel: "Source :",
        recentExamsSource: ({ month }) => `Examens récents — ${month}`,
        customTopicLabel: "Votre sujet ou consigne",
        customTopicPlaceholder: "Collez ou rédigez le sujet ou la consigne auquel vous souhaitez répondre…",
      },
      editor: {
        heading: "3. Rédigez",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} mots`,
        responseLabel: "Votre réponse",
        frenchResponsePlaceholder: "Écrivez votre texte ici…",
        correct: "Corriger",
        correcting: "Correction en cours…",
        correctingStatus: "Nous préparons vos commentaires. Cela peut prendre un instant.",
        genericCorrectionError: "Une erreur s’est produite.",
        alreadyCorrected:
          "Cette version a déjà été corrigée. Modifiez votre réponse ou votre sujet pour demander une nouvelle correction.",
        correctionInProgress:
          "Une correction de cette réponse exacte est déjà en cours. Attendez sa fin ou modifiez la réponse ou le sujet avant d’en demander une autre.",
        exampleLevelLabel: "Niveau visé",
        generateExample: "Générer un exemple",
        generatingExample: "Génération en cours…",
        generatingExampleStatus: "Génération d’un exemple de réponse. Cela peut prendre un instant.",
        exampleRateLimitedError: "Le générateur d’exemples est occupé. Réessayez dans un instant.",
        exampleDailyLimitError: "Vous avez atteint la limite d’exemples pour aujourd’hui. Réessayez demain.",
        exampleUnavailableError: "Le générateur d’exemples n’est pas disponible pour le moment.",
        exampleGenericError: "Nous n’avons pas pu générer d’exemple. Réessayez.",
        exampleNeedsTopicWarning:
          "Choisissez un sujet d’examens récents ou collez le vôtre avant de générer un exemple.",
        copy: "Copier le texte",
        copied: "Copié !",
        copyFailed: "Impossible de copier",
        clear: "Effacer le texte",
      },
      translation: {
        heading: ({ language }) => `Traduction (${language})`,
        inProgress: "Traduction en cours…",
        empty: "Votre traduction apparaîtra ici au fur et à mesure de votre rédaction.",
        unavailableError: "La traduction est indisponible pour le moment.",
        rateLimitedError: "Vous traduisez trop rapidement. Patientez un instant puis réessayez.",
        monthlyQuotaError:
          "Vous avez atteint la limite mensuelle de traduction en direct. Réessayez le mois prochain.",
        tooLong: ({ maxCharacters }) =>
          `La traduction en direct est disponible pour les brouillons de ${maxCharacters} caractères maximum. Ce brouillon est plus long : soumettez-le pour obtenir des commentaires complets.`,
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
        estimatedLevel: ({ level }) => `Niveau estimé : ${level}`,
        cefrRationaleHeading: "Pourquoi cette estimation",
        cefrEstimateDisclosure:
          "Cette estimation automatisée repose sur la réponse soumise. Un niveau C1/C2 demandé pour un exemple est un objectif, pas un résultat vérifié.",
        downloadPdf: "Imprimer / Enregistrer en PDF",
        viewCorrection: "Voir la correction",
        tabOverview: "Vue d’ensemble et scores",
        scoreDisclosure: "Indicateurs d’apprentissage mytcflab — pas une évaluation officielle du TCF.",
        globalPerformanceHeading: "Performance globale",
        overallScore: ({ score }) => `Indicateur global d’apprentissage : ${score} %`,
        overallScoreDescription: "Moyenne des trois indicateurs d’apprentissage mytcflab ci-dessous.",
        tabCompared: "Comparer les textes",
        tabComments: "Commentaires et conseils",
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
        taskSwitchDescription: "Changer de tâche supprimera votre sujet, brouillon et commentaires actuels.",
        dashboardSwitchDescription:
          "Accéder au tableau de bord supprimera votre sujet, brouillon et commentaires actuels.",
        topicSwitchDescription: "Changer de sujet supprimera votre sujet, brouillon et commentaires actuels.",
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
      tasks: "Tareas",
      settings: "Configuración",
      logIn: "Iniciar sesión",
      closeSettingsFirst: "Cierra primero la configuración",
    },
    home: {
      title: "Escribe para el examen TCF. Recibe comentarios que te ayudarán a alcanzar B2 o C1.",
      description:
        "Practica las tareas 1, 2 y 3 y recibe en segundos comentarios sobre gramática, vocabulario y nivel MCER.",
      goToDashboard: "Ir al panel",
      getStarted: "Empezar",
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
      languageDescription:
        "Elige el idioma utilizado en la interfaz, los comentarios y el panel de traducción en tiempo real.",
      helpHeading: "Ayuda y soporte",
      helpDescription: "¿Tienes una pregunta o encontraste un problema? Contáctanos, con gusto te ayudamos.",
    },
    workspace: {
      task: {
        heading: "1. Elige una tarea",
        targetLength: ({ minWords, maxWords }) => `Extensión objetivo: ${minWords}–${maxWords} palabras.`,
      },
      topic: {
        heading: "2. Elige un tema",
        recentExamTitle: "Obtén un tema de exámenes recientes",
        recentExamDescription: "Carga un tema para la tarea que seleccionaste.",
        customTitle: "Escribe o pega mi propio tema",
        customDescription: "Usa una consigna que ya tengas.",
        loading: "Obteniendo un tema de exámenes recientes…",
        fetchError:
          "No pudimos obtener un tema de exámenes recientes. Inténtalo de nuevo o escribe el tuyo.",
        unavailableError:
          "El tema de exámenes recientes no estaba disponible. Inténtalo de nuevo o escribe el tuyo.",
        notPublishedError:
          "No se ha publicado ningún tema de exámenes recientes para este mes ni el anterior. Escribe o pega tu propio tema.",
        selectedRecentExamAriaLabel: "Tema de examen reciente seleccionado",
        sourceLabel: "Fuente:",
        recentExamsSource: ({ month }) => `Exámenes recientes — ${month}`,
        customTopicLabel: "Tu tema o consigna",
        customTopicPlaceholder: "Pega o escribe el tema o la consigna a la que quieres responder…",
      },
      editor: {
        heading: "3. Escribe",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} palabras`,
        responseLabel: "Tu respuesta",
        frenchResponsePlaceholder: "Écrivez votre texte ici…",
        correct: "Corregir",
        correcting: "Corrigiendo…",
        correctingStatus: "Estamos preparando tus comentarios. Esto puede tardar un momento.",
        genericCorrectionError: "Algo salió mal.",
        alreadyCorrected:
          "Esta versión ya se ha corregido. Modifica tu respuesta o tema para solicitar una nueva corrección.",
        correctionInProgress:
          "Ya hay una corrección de esta respuesta exacta en curso. Espera a que termine o modifica la respuesta o el tema antes de solicitar otra.",
        exampleLevelLabel: "Nivel objetivo",
        generateExample: "Generar ejemplo",
        generatingExample: "Generando…",
        generatingExampleStatus: "Generando una respuesta de ejemplo. Esto puede tardar un momento.",
        exampleRateLimitedError: "El generador de ejemplos está ocupado. Inténtalo de nuevo en un momento.",
        exampleDailyLimitError: "Has alcanzado el límite de ejemplos de hoy. Inténtalo de nuevo mañana.",
        exampleUnavailableError: "El generador de ejemplos no está disponible en este momento.",
        exampleGenericError: "No pudimos generar un ejemplo. Inténtalo de nuevo.",
        exampleNeedsTopicWarning:
          "Elige un tema de exámenes recientes o pega el tuyo antes de generar un ejemplo.",
        copy: "Copiar texto",
        copied: "¡Copiado!",
        copyFailed: "No se pudo copiar",
        clear: "Borrar texto",
      },
      translation: {
        heading: ({ language }) => `Traducción (${language})`,
        inProgress: "Traduciendo…",
        empty: "Tu traducción aparecerá aquí mientras escribes.",
        unavailableError: "La traducción no está disponible en este momento.",
        rateLimitedError: "Estás traduciendo demasiado rápido. Espera un momento e inténtalo de nuevo.",
        monthlyQuotaError:
          "Has alcanzado el límite mensual de traducción en tiempo real. Inténtalo de nuevo el próximo mes.",
        tooLong: ({ maxCharacters }) =>
          `La traducción en tiempo real está disponible para borradores de hasta ${maxCharacters} caracteres. Este borrador es más largo; envíalo para corregirlo y recibir comentarios completos.`,
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
        estimatedLevel: ({ level }) => `Nivel estimado: ${level}`,
        cefrRationaleHeading: "Por qué esta estimación",
        cefrEstimateDisclosure:
          "Esta estimación automatizada se basa en la respuesta enviada. Un nivel C1/C2 solicitado para un ejemplo es un objetivo, no un resultado verificado.",
        downloadPdf: "Imprimir / Guardar como PDF",
        viewCorrection: "Ver corrección",
        tabOverview: "Resumen y puntuaciones",
        scoreDisclosure: "Indicadores de aprendizaje de mytcflab — no es una evaluación oficial del TCF.",
        globalPerformanceHeading: "Rendimiento global",
        overallScore: ({ score }) => `Indicador global de aprendizaje: ${score} %`,
        overallScoreDescription: "Promedio de los tres indicadores de aprendizaje de mytcflab que aparecen abajo.",
        tabCompared: "Comparar textos",
        tabComments: "Comentarios y consejos",
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
        taskSwitchDescription: "Al cambiar de tarea se descartarán el tema, el borrador y los comentarios actuales.",
        dashboardSwitchDescription:
          "Al ir al panel se descartarán el tema, el borrador y los comentarios actuales.",
        topicSwitchDescription: "Al cambiar de tema se descartarán el tema, el borrador y los comentarios actuales.",
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
      tasks: "Tarefas",
      settings: "Configurações",
      logIn: "Entrar",
      closeSettingsFirst: "Feche as configurações primeiro",
    },
    home: {
      title: "Escreva para o exame TCF. Receba comentários que ajudam você a alcançar B2 ou C1.",
      description:
        "Pratique as tarefas 1, 2 e 3 e receba em segundos comentários sobre gramática, vocabulário e nível do QECR.",
      goToDashboard: "Ir para o painel",
      getStarted: "Começar",
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
      languageDescription:
        "Escolha o idioma usado na interface, nos comentários e no painel de tradução em tempo real.",
      helpHeading: "Ajuda e suporte",
      helpDescription: "Tem uma dúvida ou encontrou um problema? Fale conosco, teremos prazer em ajudar.",
    },
    workspace: {
      task: {
        heading: "1. Escolha uma tarefa",
        targetLength: ({ minWords, maxWords }) => `Extensão desejada: ${minWords}–${maxWords} palavras.`,
      },
      topic: {
        heading: "2. Escolha um tema",
        recentExamTitle: "Obtenha um tema de exames recentes",
        recentExamDescription: "Carregue um tema para a tarefa escolhida.",
        customTitle: "Escreva ou cole meu próprio tema",
        customDescription: "Use uma proposta que você já tenha.",
        loading: "Obtendo um tema de exames recentes…",
        fetchError:
          "Não foi possível obter um tema de exames recentes. Tente novamente ou escreva o seu próprio tema.",
        unavailableError:
          "O tema de exames recentes não está disponível. Tente novamente ou escreva o seu próprio tema.",
        notPublishedError:
          "Nenhum tema de exames recentes foi publicado para este mês nem para o anterior. Escreva ou cole o seu próprio tema.",
        selectedRecentExamAriaLabel: "Tema de exame recente selecionado",
        sourceLabel: "Fonte:",
        recentExamsSource: ({ month }) => `Exames recentes — ${month}`,
        customTopicLabel: "Seu tema ou proposta",
        customTopicPlaceholder: "Cole ou escreva o tema ou a proposta à qual você quer responder…",
      },
      editor: {
        heading: "3. Escreva",
        wordCount: ({ count, minWords, maxWords }) => `${count} / ${minWords}–${maxWords} palavras`,
        responseLabel: "Sua resposta",
        frenchResponsePlaceholder: "Écrivez votre texte ici…",
        correct: "Corrigir",
        correcting: "Corrigindo…",
        correctingStatus: "Estamos preparando seus comentários. Isso pode levar um momento.",
        genericCorrectionError: "Algo deu errado.",
        alreadyCorrected:
          "Esta versão já foi corrigida. Edite sua resposta ou tema para solicitar uma nova correção.",
        correctionInProgress:
          "Já existe uma correção desta resposta exata em andamento. Aguarde a conclusão ou edite a resposta ou o tema antes de solicitar outra.",
        exampleLevelLabel: "Nível desejado",
        generateExample: "Gerar exemplo",
        generatingExample: "Gerando…",
        generatingExampleStatus: "Gerando uma resposta de exemplo. Isso pode levar um momento.",
        exampleRateLimitedError: "O gerador de exemplos está ocupado. Tente novamente em instantes.",
        exampleDailyLimitError: "Você atingiu o limite de exemplos de hoje. Tente novamente amanhã.",
        exampleUnavailableError: "O gerador de exemplos não está disponível no momento.",
        exampleGenericError: "Não conseguimos gerar um exemplo. Tente novamente.",
        exampleNeedsTopicWarning:
          "Escolha um tema de exames recentes ou cole o seu antes de gerar um exemplo.",
        copy: "Copiar texto",
        copied: "Copiado!",
        copyFailed: "Não foi possível copiar",
        clear: "Limpar texto",
      },
      translation: {
        heading: ({ language }) => `Tradução (${language})`,
        inProgress: "Traduzindo…",
        empty: "Sua tradução aparecerá aqui enquanto você escreve.",
        unavailableError: "A tradução não está disponível no momento.",
        rateLimitedError: "Você está traduzindo rápido demais. Aguarde um momento e tente novamente.",
        monthlyQuotaError:
          "Você atingiu o limite mensal de tradução em tempo real. Tente novamente no próximo mês.",
        tooLong: ({ maxCharacters }) =>
          `A tradução em tempo real está disponível para rascunhos de até ${maxCharacters} caracteres. Este rascunho é maior; envie-o para correção e receba comentários completos.`,
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
        estimatedLevel: ({ level }) => `Nível estimado: ${level}`,
        cefrRationaleHeading: "Por que esta estimativa",
        cefrEstimateDisclosure:
          "Esta estimativa automatizada se baseia na resposta enviada. Um nível C1/C2 solicitado para um exemplo é uma meta, não um resultado verificado.",
        downloadPdf: "Imprimir / Salvar como PDF",
        viewCorrection: "Ver correção",
        tabOverview: "Visão geral e notas",
        scoreDisclosure: "Indicadores de aprendizagem do mytcflab — não é uma avaliação oficial do TCF.",
        globalPerformanceHeading: "Desempenho geral",
        overallScore: ({ score }) => `Indicador geral de aprendizagem: ${score}%`,
        overallScoreDescription: "Média dos três indicadores de aprendizagem do mytcflab abaixo.",
        tabCompared: "Comparar textos",
        tabComments: "Comentários e dicas",
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
        taskSwitchDescription: "Trocar de tarefa descartará o tema, o rascunho e os comentários atuais.",
        dashboardSwitchDescription: "Ir para o painel descartará o tema, o rascunho e os comentários atuais.",
        topicSwitchDescription: "Trocar de tema descartará o tema, o rascunho e os comentários atuais.",
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
