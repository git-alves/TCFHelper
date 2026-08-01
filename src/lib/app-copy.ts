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

export interface AppCopy {
  common: {
    cancel: string;
  };
  nav: {
    localeLabel: string;
    localeHelp: string;
    dashboard: string;
    signOut: string;
    logIn: string;
    signUp: string;
  };
  home: {
    title: string;
    description: string;
    translationDisclosure: string;
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
    };
    translation: {
      heading: (values: LanguageValues) => string;
      inProgress: string;
      empty: string;
      unavailableError: string;
      notConfiguredError: string;
      rateLimitedError: string;
      monthlyQuotaError: string;
      tooLong: (values: TranslationLimitValues) => string;
      googleAttributionAlt: string;
      googleNotice: string;
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
    dialog: {
      title: string;
      taskSwitchDescription: string;
      topicSwitchDescription: string;
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
    },
    nav: {
      localeLabel: "Application language",
      localeHelp: "Language used in the interface, feedback, and live translation panel",
      dashboard: "Dashboard",
      signOut: "Sign out",
      logIn: "Log in",
      signUp: "Sign up",
    },
    home: {
      title: "Write for the TCF exam. Get feedback that gets you to B2 or C1.",
      description:
        "Practice Task 1, 2, and 3 essays, then get grammar, vocabulary, and CEFR-level feedback in seconds.",
      translationDisclosure: "Live French draft translations are powered by Google Translate.",
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
      welcome: (name) => `Welcome, ${name}`,
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
      },
      translation: {
        heading: ({ language }) => `Translation (${language})`,
        inProgress: "Translating…",
        empty: "Your translation will appear here as you write.",
        unavailableError: "Translation is unavailable right now.",
        notConfiguredError: "Live translation is not configured yet. Please try again later.",
        rateLimitedError: "You’re translating too quickly. Please wait a moment and try again.",
        monthlyQuotaError:
          "You’ve reached this month’s live translation limit. Please try again next month.",
        tooLong: ({ maxCharacters }) =>
          `Live translation is available for drafts up to ${maxCharacters} characters. This draft is longer — submit it for correction to see full feedback.`,
        googleAttributionAlt: "Powered by Google Translate",
        googleNotice: "About Google Translate",
      },
      feedback: {
        heading: ({ language }) => `Feedback (${language})`,
        estimatedLevel: ({ level }) => `Estimated CEFR / CECRL level: ${level}`,
        generatedInOtherLanguage: ({ generatedLanguage, selectedLanguage }) =>
          `This feedback was generated in ${generatedLanguage}. Select Correct again to receive feedback in ${selectedLanguage}.`,
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
      dialog: {
        title: "Discard your current work?",
        taskSwitchDescription: "Switching tasks will discard your current topic, draft, and feedback.",
        topicSwitchDescription: "Switching topics will discard your current topic, draft, and feedback.",
        confirm: "Discard and switch",
        cancel: "Keep working",
      },
    },
  },
  fr: {
    common: {
      cancel: "Annuler",
    },
    nav: {
      localeLabel: "Langue de l’application",
      localeHelp:
        "Langue utilisée dans l’interface, les commentaires et le panneau de traduction en direct",
      dashboard: "Tableau de bord",
      signOut: "Se déconnecter",
      logIn: "Se connecter",
      signUp: "S’inscrire",
    },
    home: {
      title: "Préparez l’expression écrite du TCF. Recevez des commentaires qui vous aident à atteindre le niveau B2 ou C1.",
      description:
        "Entraînez-vous aux tâches 1, 2 et 3, puis recevez en quelques secondes des commentaires sur la grammaire, le vocabulaire et votre niveau du CECRL.",
      translationDisclosure:
        "Les traductions en direct des brouillons en français sont fournies par Google Traduction.",
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
      welcome: (name) => `Bienvenue, ${name}`,
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
      },
      translation: {
        heading: ({ language }) => `Traduction (${language})`,
        inProgress: "Traduction en cours…",
        empty: "Votre traduction apparaîtra ici au fur et à mesure de votre rédaction.",
        unavailableError: "La traduction est indisponible pour le moment.",
        notConfiguredError: "La traduction en direct n’est pas encore configurée. Réessayez plus tard.",
        rateLimitedError: "Vous traduisez trop rapidement. Patientez un instant puis réessayez.",
        monthlyQuotaError:
          "Vous avez atteint la limite mensuelle de traduction en direct. Réessayez le mois prochain.",
        tooLong: ({ maxCharacters }) =>
          `La traduction en direct est disponible pour les brouillons de ${maxCharacters} caractères maximum. Ce brouillon est plus long : soumettez-le pour obtenir des commentaires complets.`,
        googleAttributionAlt: "Propulsé par Google Translate",
        googleNotice: "À propos de Google Translate",
      },
      feedback: {
        heading: ({ language }) => `Commentaires (${language})`,
        estimatedLevel: ({ level }) => `Niveau CECR / CECRL estimé : ${level}`,
        generatedInOtherLanguage: ({ generatedLanguage, selectedLanguage }) =>
          `Ces commentaires ont été générés en ${generatedLanguage}. Sélectionnez de nouveau Corriger pour les recevoir en ${selectedLanguage}.`,
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
      dialog: {
        title: "Supprimer votre travail actuel ?",
        taskSwitchDescription: "Changer de tâche supprimera votre sujet, brouillon et commentaires actuels.",
        topicSwitchDescription: "Changer de sujet supprimera votre sujet, brouillon et commentaires actuels.",
        confirm: "Supprimer et changer",
        cancel: "Continuer à travailler",
      },
    },
  },
  es: {
    common: {
      cancel: "Cancelar",
    },
    nav: {
      localeLabel: "Idioma de la aplicación",
      localeHelp:
        "Idioma utilizado en la interfaz, los comentarios y el panel de traducción en tiempo real",
      dashboard: "Panel",
      signOut: "Cerrar sesión",
      logIn: "Iniciar sesión",
      signUp: "Crear cuenta",
    },
    home: {
      title: "Escribe para el examen TCF. Recibe comentarios que te ayudarán a alcanzar B2 o C1.",
      description:
        "Practica las tareas 1, 2 y 3 y recibe en segundos comentarios sobre gramática, vocabulario y nivel MCER.",
      translationDisclosure:
        "Las traducciones en directo de los borradores en francés funcionan con Google Traductor.",
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
      welcome: (name) => `Te damos la bienvenida, ${name}`,
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
      },
      translation: {
        heading: ({ language }) => `Traducción (${language})`,
        inProgress: "Traduciendo…",
        empty: "Tu traducción aparecerá aquí mientras escribes.",
        unavailableError: "La traducción no está disponible en este momento.",
        notConfiguredError: "La traducción en tiempo real todavía no está configurada. Inténtalo más tarde.",
        rateLimitedError: "Estás traduciendo demasiado rápido. Espera un momento e inténtalo de nuevo.",
        monthlyQuotaError:
          "Has alcanzado el límite mensual de traducción en tiempo real. Inténtalo de nuevo el próximo mes.",
        tooLong: ({ maxCharacters }) =>
          `La traducción en tiempo real está disponible para borradores de hasta ${maxCharacters} caracteres. Este borrador es más largo; envíalo para corregirlo y recibir comentarios completos.`,
        googleAttributionAlt: "Con la tecnología de Google Translate",
        googleNotice: "Acerca de Google Translate",
      },
      feedback: {
        heading: ({ language }) => `Comentarios (${language})`,
        estimatedLevel: ({ level }) => `Nivel MCER / CECRL estimado: ${level}`,
        generatedInOtherLanguage: ({ generatedLanguage, selectedLanguage }) =>
          `Estos comentarios se generaron en ${generatedLanguage}. Selecciona Corregir de nuevo para recibirlos en ${selectedLanguage}.`,
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
      dialog: {
        title: "¿Descartar tu trabajo actual?",
        taskSwitchDescription: "Al cambiar de tarea se descartarán el tema, el borrador y los comentarios actuales.",
        topicSwitchDescription: "Al cambiar de tema se descartarán el tema, el borrador y los comentarios actuales.",
        confirm: "Descartar y cambiar",
        cancel: "Seguir trabajando",
      },
    },
  },
  pt: {
    common: {
      cancel: "Cancelar",
    },
    nav: {
      localeLabel: "Idioma do aplicativo",
      localeHelp:
        "Idioma usado na interface, nos comentários e no painel de tradução em tempo real",
      dashboard: "Painel",
      signOut: "Sair",
      logIn: "Entrar",
      signUp: "Criar conta",
    },
    home: {
      title: "Escreva para o exame TCF. Receba comentários que ajudam você a alcançar B2 ou C1.",
      description:
        "Pratique as tarefas 1, 2 e 3 e receba em segundos comentários sobre gramática, vocabulário e nível do QECR.",
      translationDisclosure:
        "As traduções ao vivo de rascunhos em francês são fornecidas pelo Google Tradutor.",
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
      welcome: (name) => `Boas-vindas, ${name}`,
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
      },
      translation: {
        heading: ({ language }) => `Tradução (${language})`,
        inProgress: "Traduzindo…",
        empty: "Sua tradução aparecerá aqui enquanto você escreve.",
        unavailableError: "A tradução não está disponível no momento.",
        notConfiguredError: "A tradução em tempo real ainda não está configurada. Tente mais tarde.",
        rateLimitedError: "Você está traduzindo rápido demais. Aguarde um momento e tente novamente.",
        monthlyQuotaError:
          "Você atingiu o limite mensal de tradução em tempo real. Tente novamente no próximo mês.",
        tooLong: ({ maxCharacters }) =>
          `A tradução em tempo real está disponível para rascunhos de até ${maxCharacters} caracteres. Este rascunho é maior; envie-o para correção e receba comentários completos.`,
        googleAttributionAlt: "Desenvolvido pelo Google Translate",
        googleNotice: "Sobre o Google Translate",
      },
      feedback: {
        heading: ({ language }) => `Comentários (${language})`,
        estimatedLevel: ({ level }) => `Nível QECR / CECRL estimado: ${level}`,
        generatedInOtherLanguage: ({ generatedLanguage, selectedLanguage }) =>
          `Estes comentários foram gerados em ${generatedLanguage}. Selecione Corrigir novamente para recebê-los em ${selectedLanguage}.`,
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
      dialog: {
        title: "Descartar seu trabalho atual?",
        taskSwitchDescription: "Trocar de tarefa descartará o tema, o rascunho e os comentários atuais.",
        topicSwitchDescription: "Trocar de tema descartará o tema, o rascunho e os comentários atuais.",
        confirm: "Descartar e trocar",
        cancel: "Continuar trabalhando",
      },
    },
  },
} satisfies Record<AppLocale, AppCopy>;

export function getAppCopy(locale: AppLocale): AppCopy {
  return APP_COPY[locale];
}
