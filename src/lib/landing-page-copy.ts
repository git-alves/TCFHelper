import type { AppLocale } from "@/lib/app-locale";

type LandingCopy = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
  demoTaskLabel: string;
  demoTaskPrompt: string;
  proofEyebrow: string;
  proofTitle: string;
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
  whyItems: string[];
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
    proofEyebrow: "From draft to clearer expression",
    proofTitle: "See what a more precise response can sound like.",
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
    problemDescription: "You may know a lot of French and still lose marks when your response is not sufficiently structured, precise, or adapted to the task.",
    whyEyebrow: "Built specifically for TCF Writing",
    whyTitle: "Not just French correction. TCF-focused practice.",
    whyItems: ["TCF Tasks 1, 2 & 3", "Task-specific requirements", "Timed practice", "Progressive improvement"],
    stepsEyebrow: "How it works",
    stepsTitle: "A focused practice loop in three steps.",
    steps: [
      { title: "Train or simulate a task", description: "Practise one skill in Train, or write a full response in Simulate." },
      { title: "Write your response", description: "Draft at your pace with the task requirements in view." },
      { title: "Track your progress", description: "Review corrected responses and watch your estimated CEFR level on your Dashboard." },
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
    title: "Développez les compétences rédactionnelles nécessaires pour le niveau B2 au TCF.",
    description: "Entraînez-vous aux tâches d’expression écrite 1, 2 et 3 du TCF, recevez un retour détaillé et découvrez exactement quoi améliorer dans votre prochaine réponse.",
    primaryAction: "Accéder à l’outil",
    demoTaskLabel: "Tâche 2 · Raconter et commenter",
    demoTaskPrompt: "Les réseaux sociaux renforcent-ils ou affaiblissent-ils les relations réelles ? Donnez votre avis.",
    proofEyebrow: "Du brouillon à une expression plus claire",
    proofTitle: "Découvrez ce qu’une réponse plus précise peut devenir.",
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
    problemDescription: "Vous pouvez connaître beaucoup de français et perdre des points si votre réponse manque de structure, de précision ou d’adaptation à la tâche.",
    whyEyebrow: "Conçu spécifiquement pour l’expression écrite du TCF",
    whyTitle: "Pas seulement de la correction de français. Un entraînement axé sur le TCF.",
    whyItems: ["Tâches 1, 2 et 3 du TCF", "Exigences propres à chaque tâche", "Entraînement chronométré", "Progression continue"],
    stepsEyebrow: "Comment ça marche",
    stepsTitle: "Un cycle d’entraînement ciblé en trois étapes.",
    steps: [{ title: "Entraînez-vous ou simulez une tâche", description: "Travaillez une compétence dans Entraînement, ou rédigez une réponse complète dans Simulation." }, { title: "Rédigez votre réponse", description: "Écrivez à votre rythme en gardant les consignes en vue." }, { title: "Suivez votre progression", description: "Consultez vos réponses corrigées et votre niveau CECRL estimé sur votre tableau de bord." }],
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
    title: "Desarrolla las habilidades de escritura que necesitas para el nivel B2 del TCF.",
    description: "Practica las tareas de expresión escrita 1, 2 y 3 del TCF, recibe comentarios detallados y aprende exactamente qué mejorar en tu próxima respuesta.",
    primaryAction: "Acceder a la herramienta",
    demoTaskLabel: "Tarea 2 · Narrar y comentar",
    demoTaskPrompt: "¿Las redes sociales fortalecen o debilitan las relaciones reales? Da tu opinión.",
    proofEyebrow: "Del borrador a una expresión más clara",
    proofTitle: "Descubre cómo puede sonar una respuesta más precisa.",
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
    problemDescription: "Puedes saber mucho francés y aun así perder puntos si tu respuesta no tiene suficiente estructura, precisión o adaptación a la tarea.",
    whyEyebrow: "Diseñado específicamente para la expresión escrita del TCF",
    whyTitle: "No es solo corrección de francés. Es práctica enfocada en el TCF.",
    whyItems: ["Tareas 1, 2 y 3 del TCF", "Requisitos específicos de cada tarea", "Práctica cronometrada", "Mejora progresiva"],
    stepsEyebrow: "Cómo funciona",
    stepsTitle: "Un ciclo de práctica enfocado en tres pasos.",
    steps: [{ title: "Entrena o simula una tarea", description: "Practica una habilidad en Entrenar, o escribe una respuesta completa en Simular." }, { title: "Escribe tu respuesta", description: "Redacta a tu ritmo con los requisitos de la tarea a la vista." }, { title: "Sigue tu progreso", description: "Revisa tus respuestas corregidas y tu nivel MCER estimado en tu panel." }],
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
    title: "Desenvolva as habilidades de escrita que você precisa para o nível B2 do TCF.",
    description: "Pratique as tarefas de expressão escrita 1, 2 e 3 do TCF, receba feedback detalhado e aprenda exatamente o que melhorar na sua próxima resposta.",
    primaryAction: "Acessar a ferramenta",
    demoTaskLabel: "Tarefa 2 · Narrar e comentar",
    demoTaskPrompt: "As redes sociais fortalecem ou enfraquecem os relacionamentos reais? Dê sua opinião.",
    proofEyebrow: "Do rascunho a uma expressão mais clara",
    proofTitle: "Veja como uma resposta mais precisa pode soar.",
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
    problemDescription: "Você pode conhecer muito francês e ainda perder pontos se sua resposta não for suficientemente estruturada, precisa ou adequada à tarefa.",
    whyEyebrow: "Criado especificamente para a expressão escrita do TCF",
    whyTitle: "Não é apenas correção de francês. É prática focada no TCF.",
    whyItems: ["Tarefas 1, 2 e 3 do TCF", "Requisitos específicos de cada tarefa", "Prática cronometrada", "Melhoria progressiva"],
    stepsEyebrow: "Como funciona",
    stepsTitle: "Um ciclo de prática focado em três etapas.",
    steps: [{ title: "Treine ou simule uma tarefa", description: "Pratique uma habilidade em Treinar, ou escreva uma resposta completa em Simular." }, { title: "Escreva sua resposta", description: "Redija no seu ritmo mantendo os requisitos da tarefa em vista." }, { title: "Acompanhe seu progresso", description: "Revise suas respostas corrigidas e seu nível QECR estimado no seu Dashboard." }],
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
