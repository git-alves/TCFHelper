import type { AppLocale } from "@/lib/app-locale";

type LandingCopy = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
  demoTaskLabel: string;
  demoTaskPrompt: string;
  before: string;
  after: string;
  beforeText: string;
  afterText: string;
  beforeAnalysisLabel: string;
  beforeAnalysis: { label: string; value: string }[];
  afterAnalysisLabel: string;
  afterAnalysis: { label: string; value: string }[];
  problemEyebrow: string;
  problemTitle: string;
  problemDescription: string;
  whyEyebrow: string;
  whyTitle: string;
  whyDescription: string;
  comparisonFeatureHeading: string;
  comparisonGenericHeading: string;
  comparisonMyTcfLabHeading: string;
  comparisonRows: { feature: string; generic: string; mytcflab: string }[];
  stepsEyebrow: string;
  stepsTitle: string;
  steps: { title: string; description: string }[];
  methodEyebrow: string;
  methodTitle: string;
  methodDescription: string;
  methodPoints: string[];
  assessedEyebrow: string;
  assessedTitle: string;
  assessed: string[];
  closingTitle: string;
  footer: string;
};

export const LANDING_PAGE_COPY: Record<AppLocale, LandingCopy> = {
  en: {
    eyebrow: "TCF written expression practice",
    title: "Build the writing skills you need for B2 on the TCF.",
    description: "Practice TCF Writing Tasks 1, 2 and 3, get detailed feedback, and learn exactly what to improve in your next response.",
    primaryAction: "Access the tool",
    demoTaskLabel: "Task 2 · Recount and comment",
    demoTaskPrompt: "Do social media strengthen or weaken real relationships? Give your opinion.",
    before: "Before",
    after: "After",
    beforeText: "Je pense que les réseaux sociaux sont importants parce que les gens peuvent facilement communiquer avec leurs amis et découvrir des informations.",
    afterText: "À mon avis, les réseaux sociaux jouent un rôle important dans notre quotidien, car ils permettent de rester en contact avec nos proches tout en facilitant l’accès à l’information.",
    beforeAnalysisLabel: "What you're missing",
    beforeAnalysis: [
      { label: "Vocabulary", value: "basic" },
      { label: "Coherence", value: "weak, repetitive" },
      { label: "Register", value: "acceptable" },
    ],
    afterAnalysisLabel: "Why it's better",
    afterAnalysis: [
      { label: "Vocabulary", value: "more precise" },
      { label: "Coherence", value: "stronger connection" },
      { label: "Register", value: "more appropriate" },
    ],
    problemEyebrow: "More than spell check",
    problemTitle: "Writing in French is difficult. Writing for the TCF is even harder.",
    problemDescription: "You may know a lot of French and still lose marks when your response is not sufficiently structured, precise, or adapted to the task. See what a more precise response can sound like.",
    whyEyebrow: "Built specifically for TCF Writing",
    whyTitle: "Why MyTCFLab?",
    whyDescription: "MyTCFLab is not a generic French corrector. It is designed specifically around TCF written expression.",
    comparisonFeatureHeading: "Feature",
    comparisonGenericHeading: "Generic AI tools",
    comparisonMyTcfLabHeading: "MyTCFLab",
    comparisonRows: [
      { feature: "Focus Area", generic: "General French correction", mytcflab: "TCF-focused practice" },
      { feature: "Feedback Style", generic: "Open-ended feedback", mytcflab: "Structured feedback" },
      { feature: "Task Context", generic: "No TCF task context", mytcflab: "Tailored for Tasks 1, 2 & 3" },
      { feature: "Improvement Goal", generic: "Corrects your text as-is", mytcflab: "Helps you improve your next response" },
      { feature: "Suggestions", generic: "Generic suggestions", mytcflab: "Focus on TCF-relevant criteria" },
    ],
    stepsEyebrow: "How it works",
    stepsTitle: "A focused practice loop in three steps.",
    steps: [
      { title: "Train a specific skill", description: "Practise the key parts of a task through short exercises until the structure feels familiar." },
      { title: "Simulate a full task", description: "Write a timed response with hints, then review your correction for personalised feedback." },
      { title: "Track your progress", description: "Review your corrected answers and check your estimated CEFR level on your Dashboard." },
    ],
    methodEyebrow: "Feedback methodology",
    methodTitle: "Every correction should tell you what to work on next.",
    methodDescription: "Feedback is organised to help you understand the response—not simply highlight what is wrong.",
    methodPoints: ["Compare your original and corrected text", "Review grammar, vocabulary, and organisation", "Use comments to plan a more deliberate next draft"],
    assessedEyebrow: "What you will work on",
    assessedTitle: "The parts of written expression that make a response easier to follow.",
    assessed: ["Task response and relevance", "Organisation and coherence", "Grammar and sentence control", "Vocabulary, register, and precision"],
    closingTitle: "Ready to write with more precision?",
    footer: "MyTCFLab · Practice deliberately. Improve one response at a time.",
  },
  fr: {
    eyebrow: "Préparation à l’expression écrite du TCF",
    title: "Développez la rédaction pour le B2 au TCF.",
    description: "Entraînez-vous aux tâches d’expression écrite 1, 2 et 3 du TCF, recevez un retour détaillé et découvrez exactement quoi améliorer dans votre prochaine réponse.",
    primaryAction: "Accéder à l’outil",
    demoTaskLabel: "Tâche 2 · Raconter et commenter",
    demoTaskPrompt: "Les réseaux sociaux renforcent-ils ou affaiblissent-ils les relations réelles ? Donnez votre avis.",
    before: "Avant",
    after: "Après",
    beforeText: "Je pense que les réseaux sociaux sont importants parce que les gens peuvent facilement communiquer avec leurs amis et découvrir des informations.",
    afterText: "À mon avis, les réseaux sociaux jouent un rôle important dans notre quotidien, car ils permettent de rester en contact avec nos proches tout en facilitant l’accès à l’information.",
    beforeAnalysisLabel: "Ce qui manque",
    beforeAnalysis: [
      { label: "Vocabulaire", value: "basique" },
      { label: "Cohérence", value: "faible, répétitive" },
      { label: "Registre", value: "acceptable" },
    ],
    afterAnalysisLabel: "Pourquoi c’est mieux",
    afterAnalysis: [
      { label: "Vocabulaire", value: "plus précis" },
      { label: "Cohérence", value: "lien plus solide" },
      { label: "Registre", value: "plus approprié" },
    ],
    problemEyebrow: "Bien plus qu’un correcteur",
    problemTitle: "Écrire en français est difficile. Écrire pour le TCF l’est encore plus.",
    problemDescription: "Vous pouvez connaître beaucoup de français et perdre des points si votre réponse manque de structure, de précision ou d’adaptation à la tâche. Découvrez ce qu’une réponse plus précise peut devenir.",
    whyEyebrow: "Conçu spécifiquement pour l’expression écrite du TCF",
    whyTitle: "Pourquoi MyTCFLab ?",
    whyDescription: "MyTCFLab n’est pas un correcteur de français générique. Il est conçu spécifiquement autour de l’expression écrite du TCF.",
    comparisonFeatureHeading: "Critère",
    comparisonGenericHeading: "Outils d’IA génériques",
    comparisonMyTcfLabHeading: "MyTCFLab",
    comparisonRows: [
      { feature: "Domaine de travail", generic: "Correction générale du français", mytcflab: "Entraînement axé sur le TCF" },
      { feature: "Style de retour", generic: "Retour ouvert et vague", mytcflab: "Retour structuré" },
      { feature: "Contexte de la tâche", generic: "Aucun contexte lié aux tâches du TCF", mytcflab: "Adapté aux tâches 1, 2 et 3" },
      { feature: "Objectif d’amélioration", generic: "Corrige votre texte tel quel", mytcflab: "Vous aide à améliorer votre prochaine réponse" },
      { feature: "Suggestions", generic: "Suggestions génériques", mytcflab: "Axé sur les critères pertinents du TCF" },
    ],
    stepsEyebrow: "Comment ça marche",
    stepsTitle: "Un cycle d’entraînement ciblé en trois étapes.",
    steps: [{ title: "Entraînez une compétence précise", description: "Travaillez les éléments clés d’une tâche à travers de courts exercices jusqu’à ce que la structure devienne naturelle." }, { title: "Simulez une tâche complète", description: "Rédigez une réponse chronométrée avec des indices, puis consultez votre correction pour un retour personnalisé." }, { title: "Suivez votre progression", description: "Consultez vos réponses corrigées et votre niveau CECRL estimé sur votre tableau de bord." }],
    methodEyebrow: "Méthode de retour",
    methodTitle: "Chaque correction doit vous indiquer quoi travailler ensuite.",
    methodDescription: "Les retours sont organisés pour vous aider à comprendre votre texte, et non simplement à signaler ce qui ne va pas.",
    methodPoints: ["Comparez votre texte initial et le texte corrigé", "Examinez la grammaire, le vocabulaire et l’organisation", "Transformez les commentaires en plan pour votre prochain brouillon"],
    assessedEyebrow: "Ce que vous travaillerez",
    assessedTitle: "Les éléments qui rendent une réponse écrite plus facile à suivre.",
    assessed: ["Réponse à la tâche et pertinence", "Organisation et cohérence", "Grammaire et maîtrise des phrases", "Vocabulaire, registre et précision"],
    closingTitle: "Prêt à écrire avec plus de précision ?",
    footer: "MyTCFLab · Entraînez-vous avec intention. Améliorez une réponse à la fois.",
  },
  es: {
    eyebrow: "Práctica de expresión escrita del TCF",
    title: "Desarrolla la redacción para el B2 del TCF.",
    description: "Practica las tareas de expresión escrita 1, 2 y 3 del TCF, recibe comentarios detallados y aprende exactamente qué mejorar en tu próxima respuesta.",
    primaryAction: "Acceder a la herramienta",
    demoTaskLabel: "Tarea 2 · Narrar y comentar",
    demoTaskPrompt: "¿Las redes sociales fortalecen o debilitan las relaciones reales? Da tu opinión.",
    before: "Antes",
    after: "Después",
    beforeText: "Je pense que les réseaux sociaux sont importants parce que les gens peuvent facilement communiquer avec leurs amis et découvrir des informations.",
    afterText: "À mon avis, les réseaux sociaux jouent un rôle important dans notre quotidien, car ils permettent de rester en contact avec nos proches tout en facilitant l’accès à l’information.",
    beforeAnalysisLabel: "Lo que falta",
    beforeAnalysis: [
      { label: "Vocabulario", value: "básico" },
      { label: "Coherencia", value: "débil, repetitiva" },
      { label: "Registro", value: "aceptable" },
    ],
    afterAnalysisLabel: "Por qué es mejor",
    afterAnalysis: [
      { label: "Vocabulario", value: "más preciso" },
      { label: "Coherencia", value: "conexión más sólida" },
      { label: "Registro", value: "más adecuado" },
    ],
    problemEyebrow: "Mucho más que un corrector",
    problemTitle: "Escribir en francés es difícil. Escribir para el TCF lo es aún más.",
    problemDescription: "Puedes saber mucho francés y aun así perder puntos si tu respuesta no tiene suficiente estructura, precisión o adaptación a la tarea. Descubre cómo puede sonar una respuesta más precisa.",
    whyEyebrow: "Diseñado específicamente para la expresión escrita del TCF",
    whyTitle: "¿Por qué MyTCFLab?",
    whyDescription: "MyTCFLab no es un corrector de francés genérico. Está diseñado específicamente en torno a la expresión escrita del TCF.",
    comparisonFeatureHeading: "Criterio",
    comparisonGenericHeading: "Herramientas de IA genéricas",
    comparisonMyTcfLabHeading: "MyTCFLab",
    comparisonRows: [
      { feature: "Área de enfoque", generic: "Corrección general de francés", mytcflab: "Práctica enfocada en el TCF" },
      { feature: "Estilo de comentarios", generic: "Comentarios abiertos", mytcflab: "Comentarios estructurados" },
      { feature: "Contexto de la tarea", generic: "Sin contexto de las tareas del TCF", mytcflab: "Adaptado a las tareas 1, 2 y 3" },
      { feature: "Objetivo de mejora", generic: "Corrige tu texto tal cual", mytcflab: "Te ayuda a mejorar tu próxima respuesta" },
      { feature: "Sugerencias", generic: "Sugerencias genéricas", mytcflab: "Enfocado en los criterios relevantes del TCF" },
    ],
    stepsEyebrow: "Cómo funciona",
    stepsTitle: "Un ciclo de práctica enfocado en tres pasos.",
    steps: [{ title: "Entrena una habilidad específica", description: "Practica las partes clave de una tarea con ejercicios breves hasta que la estructura te resulte natural." }, { title: "Simula una tarea completa", description: "Escribe una respuesta cronometrada con pistas y luego revisa tu corrección para recibir comentarios personalizados." }, { title: "Sigue tu progreso", description: "Revisa tus respuestas corregidas y tu nivel MCER estimado en tu panel." }],
    methodEyebrow: "Metodología de comentarios",
    methodTitle: "Cada corrección debe decirte qué trabajar después.",
    methodDescription: "Los comentarios se organizan para que entiendas tu respuesta, no solo para señalar lo que está mal.",
    methodPoints: ["Compara tu texto original y el corregido", "Revisa gramática, vocabulario y organización", "Usa los comentarios para planificar el próximo borrador"],
    assessedEyebrow: "En qué trabajarás",
    assessedTitle: "Los elementos que hacen que una respuesta sea más fácil de seguir.",
    assessed: ["Respuesta a la tarea y pertinencia", "Organización y coherencia", "Gramática y control de las oraciones", "Vocabulario, registro y precisión"],
    closingTitle: "¿Listo para escribir con más precisión?",
    footer: "MyTCFLab · Practica con intención. Mejora una respuesta cada vez.",
  },
  pt: {
    eyebrow: "Prática de expressão escrita para o TCF",
    title: "Desenvolva a redação para o B2 do TCF.",
    description: "Pratique as tarefas de expressão escrita 1, 2 e 3 do TCF, receba feedback detalhado e aprenda exatamente o que melhorar na sua próxima resposta.",
    primaryAction: "Acessar a ferramenta",
    demoTaskLabel: "Tarefa 2 · Narrar e comentar",
    demoTaskPrompt: "As redes sociais fortalecem ou enfraquecem os relacionamentos reais? Dê sua opinião.",
    before: "Antes",
    after: "Depois",
    beforeText: "Je pense que les réseaux sociaux sont importants parce que les gens peuvent facilement communiquer avec leurs amis et découvrir des informations.",
    afterText: "À mon avis, les réseaux sociaux jouent un rôle important dans notre quotidien, car ils permettent de rester en contact avec nos proches tout en facilitant l’accès à l’information.",
    beforeAnalysisLabel: "O que está faltando",
    beforeAnalysis: [
      { label: "Vocabulário", value: "básico" },
      { label: "Coerência", value: "fraca, repetitiva" },
      { label: "Registro", value: "aceitável" },
    ],
    afterAnalysisLabel: "Por que é melhor",
    afterAnalysis: [
      { label: "Vocabulário", value: "mais preciso" },
      { label: "Coerência", value: "conexão mais forte" },
      { label: "Registro", value: "mais adequado" },
    ],
    problemEyebrow: "Mais do que um corretor ortográfico",
    problemTitle: "Escrever em francês é difícil. Escrever para o TCF é ainda mais.",
    problemDescription: "Você pode conhecer muito francês e ainda perder pontos se sua resposta não for suficientemente estruturada, precisa ou adequada à tarefa. Veja como uma resposta mais precisa pode soar.",
    whyEyebrow: "Criado especificamente para a expressão escrita do TCF",
    whyTitle: "Por que MyTCFLab?",
    whyDescription: "MyTCFLab não é um corretor de francês genérico. Ele foi projetado especificamente para a expressão escrita do TCF.",
    comparisonFeatureHeading: "Critério",
    comparisonGenericHeading: "Ferramentas de IA genéricas",
    comparisonMyTcfLabHeading: "MyTCFLab",
    comparisonRows: [
      { feature: "Área de foco", generic: "Correção geral de francês", mytcflab: "Prática focada no TCF" },
      { feature: "Estilo de feedback", generic: "Feedback aberto e vago", mytcflab: "Feedback estruturado" },
      { feature: "Contexto da tarefa", generic: "Sem contexto das tarefas do TCF", mytcflab: "Adaptado às tarefas 1, 2 e 3" },
      { feature: "Objetivo de melhoria", generic: "Corrige seu texto como está", mytcflab: "Ajuda você a melhorar sua próxima resposta" },
      { feature: "Sugestões", generic: "Sugestões genéricas", mytcflab: "Foco nos critérios relevantes do TCF" },
    ],
    stepsEyebrow: "Como funciona",
    stepsTitle: "Um ciclo de prática focado em três etapas.",
    steps: [{ title: "Treine uma habilidade específica", description: "Pratique as partes principais de uma tarefa com exercícios curtos até que a estrutura fique natural." }, { title: "Simule uma tarefa completa", description: "Escreva uma resposta cronometrada com dicas e depois veja sua correção para receber feedback personalizado." }, { title: "Acompanhe seu progresso", description: "Revise suas respostas corrigidas e seu nível QECR estimado no seu Dashboard." }],
    methodEyebrow: "Metodologia de feedback",
    methodTitle: "Cada correção deve mostrar no que trabalhar em seguida.",
    methodDescription: "O feedback é organizado para ajudar você a compreender sua resposta, não apenas apontar o que está errado.",
    methodPoints: ["Compare seu texto original e o corrigido", "Revise gramática, vocabulário e organização", "Use os comentários para planejar o próximo rascunho"],
    assessedEyebrow: "No que você vai trabalhar",
    assessedTitle: "Os elementos que tornam uma resposta escrita mais fácil de acompanhar.",
    assessed: ["Resposta à tarefa e relevância", "Organização e coerência", "Gramática e domínio das frases", "Vocabulário, registro e precisão"],
    closingTitle: "Pronto para escrever com mais precisão?",
    footer: "MyTCFLab · Pratique com intenção. Melhore uma resposta por vez.",
  },
};
