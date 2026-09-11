import type { AppLocale } from "@/lib/app-locale";

type LandingCopy = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
  proofEyebrow: string;
  proofTitle: string;
  before: string;
  after: string;
  beforeText: string;
  afterText: string;
  problemEyebrow: string;
  problemTitle: string;
  problemDescription: string;
  skills: { title: string; description: string }[];
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
  faqEyebrow: string;
  faqTitle: string;
  faqs: { question: string; answer: string }[];
  footer: string;
};

export const LANDING_PAGE_COPY: Record<AppLocale, LandingCopy> = {
  en: {
    eyebrow: "TCF written expression practice",
    title: "Write with more clarity for the TCF.",
    description: "Practise Tasks 1, 2, and 3, then turn detailed feedback into your next, better response.",
    primaryAction: "Access the tool",
    proofEyebrow: "From draft to clearer expression",
    proofTitle: "See what a more precise response can sound like.",
    before: "Before",
    after: "After",
    beforeText: "I think social media is important because people can easily communicate with their friends and also discover information.",
    afterText: "In my opinion, social media plays an important role in our daily lives, as it allows us to stay in touch with loved ones while facilitating access to information.",
    problemEyebrow: "More than spell check",
    problemTitle: "Writing in French is difficult. Writing for the TCF is even harder.",
    problemDescription: "You may know a lot of French and still lose marks when your response is not sufficiently structured, precise, or adapted to the task.",
    skills: [
      { title: "Structure", description: "Organise ideas clearly and coherently." },
      { title: "Grammar", description: "Identify errors that hinder your expression." },
      { title: "Vocabulary", description: "Find more precise, natural ways to say what you mean." },
      { title: "Coherence", description: "Connect ideas more effectively." },
    ],
    stepsEyebrow: "How it works",
    stepsTitle: "A focused practice loop in three steps.",
    steps: [
      { title: "Choose a task", description: "Work on a TCF-style prompt or bring your own." },
      { title: "Write your response", description: "Draft at your pace with the task requirements in view." },
      { title: "Review and improve", description: "Use focused feedback to understand what to revise next." },
    ],
    methodEyebrow: "Feedback methodology",
    methodTitle: "Every correction should tell you what to work on next.",
    methodDescription: "Feedback is organised to help you understand the response—not simply highlight what is wrong.",
    methodPoints: ["Compare your original and corrected text", "Review grammar, vocabulary, and organisation", "Use comments to plan a more deliberate next draft"],
    assessedEyebrow: "What you will work on",
    assessedTitle: "The parts of written expression that make a response easier to follow.",
    assessed: ["Task response and relevance", "Organisation and coherence", "Grammar and sentence control", "Vocabulary, register, and precision"],
    faqEyebrow: "Questions",
    faqTitle: "Frequently asked questions",
    faqs: [
      { question: "What is the TCF?", answer: "The Test de connaissance du français is a French-language proficiency test. Requirements vary by the version of the test and your objective." },
      { question: "Which level is the app for?", answer: "It is designed for learners preparing written expression, from building confidence through advanced practice." },
      { question: "Which skills can I practise?", answer: "You can practise the three written-expression tasks and work on organisation, grammar, vocabulary, and coherence." },
      { question: "Is the app free?", answer: "Access and availability are shown during sign-up. We do not make a pricing promise on this page." },
      { question: "When will I get access?", answer: "After you create an account, access depends on the current invitation or waitlist process." },
      { question: "Do I need an account to join the list?", answer: "Yes. An account lets us keep your invitation and practice history connected to you." },
      { question: "Does the app replace a French course?", answer: "No. It is a practice and supplementary preparation tool, designed to help you identify difficulties and practise more deliberately." },
    ],
    footer: "MyTCFLab · Practice deliberately. Improve one response at a time.",
  },
  fr: {
    eyebrow: "Préparation à l’expression écrite du TCF",
    title: "Écrivez avec plus de clarté pour le TCF.",
    description: "Entraînez-vous aux tâches 1, 2 et 3, puis transformez chaque retour en une meilleure réponse.",
    primaryAction: "Accéder à l’outil",
    proofEyebrow: "Du brouillon à une expression plus claire",
    proofTitle: "Découvrez ce qu’une réponse plus précise peut devenir.",
    before: "Avant",
    after: "Après",
    beforeText: "Je pense que les réseaux sociaux sont importants parce que les gens peuvent facilement communiquer avec leurs amis et découvrir des informations.",
    afterText: "À mon avis, les réseaux sociaux jouent un rôle important dans notre quotidien, car ils permettent de rester en contact avec nos proches tout en facilitant l’accès à l’information.",
    problemEyebrow: "Bien plus qu’un correcteur",
    problemTitle: "Écrire en français est difficile. Écrire pour le TCF l’est encore plus.",
    problemDescription: "Vous pouvez connaître beaucoup de français et perdre des points si votre réponse manque de structure, de précision ou d’adaptation à la tâche.",
    skills: [{ title: "Structure", description: "Organisez vos idées clairement et de façon cohérente." }, { title: "Grammaire", description: "Repérez les erreurs qui gênent votre expression." }, { title: "Vocabulaire", description: "Trouvez des formulations plus précises et naturelles." }, { title: "Cohérence", description: "Reliez vos idées plus efficacement." }],
    stepsEyebrow: "Comment ça marche",
    stepsTitle: "Un cycle d’entraînement ciblé en trois étapes.",
    steps: [{ title: "Choisissez une tâche", description: "Travaillez sur un sujet de type TCF ou ajoutez le vôtre." }, { title: "Rédigez votre réponse", description: "Écrivez à votre rythme en gardant les consignes en vue." }, { title: "Relisez et améliorez", description: "Utilisez des retours ciblés pour savoir quoi réviser ensuite." }],
    methodEyebrow: "Méthode de retour",
    methodTitle: "Chaque correction doit vous indiquer quoi travailler ensuite.",
    methodDescription: "Les retours sont organisés pour vous aider à comprendre votre texte, et non simplement à signaler ce qui ne va pas.",
    methodPoints: ["Comparez votre texte initial et le texte corrigé", "Examinez la grammaire, le vocabulaire et l’organisation", "Transformez les commentaires en plan pour votre prochain brouillon"],
    assessedEyebrow: "Ce que vous travaillerez",
    assessedTitle: "Les éléments qui rendent une réponse écrite plus facile à suivre.",
    assessed: ["Réponse à la tâche et pertinence", "Organisation et cohérence", "Grammaire et maîtrise des phrases", "Vocabulaire, registre et précision"],
    faqEyebrow: "Questions",
    faqTitle: "Questions fréquentes",
    faqs: [{ question: "Qu’est-ce que le TCF ?", answer: "Le Test de connaissance du français est un test de niveau de français. Les exigences varient selon la version du test et votre objectif." }, { question: "À quel niveau l’application s’adresse-t-elle ?", answer: "Elle est conçue pour les personnes qui préparent l’expression écrite, de la consolidation des bases à la pratique avancée." }, { question: "Quelles compétences puis-je travailler ?", answer: "Vous pouvez vous entraîner aux trois tâches d’expression écrite et travailler l’organisation, la grammaire, le vocabulaire et la cohérence." }, { question: "L’application est-elle gratuite ?", answer: "Les conditions d’accès et de disponibilité sont indiquées lors de l’inscription. Cette page ne fait aucune promesse de prix." }, { question: "Quand aurai-je accès ?", answer: "Après la création d’un compte, l’accès dépend du processus d’invitation ou de liste d’attente en cours." }, { question: "Ai-je besoin d’un compte pour rejoindre la liste ?", answer: "Oui. Un compte permet de relier votre invitation et votre historique d’entraînement." }, { question: "L’application remplace-t-elle un cours de français ?", answer: "Non. C’est un outil de pratique et de préparation complémentaire, conçu pour vous aider à identifier vos difficultés et à vous entraîner de manière plus ciblée." }],
    footer: "MyTCFLab · Entraînez-vous avec intention. Améliorez une réponse à la fois.",
  },
  es: {
    eyebrow: "Práctica de expresión escrita del TCF",
    title: "Escribe con más claridad para el TCF.",
    description: "Practica las tareas 1, 2 y 3 y convierte cada comentario en una respuesta mejor.",
    primaryAction: "Acceder a la herramienta",
    proofEyebrow: "Del borrador a una expresión más clara",
    proofTitle: "Descubre cómo puede sonar una respuesta más precisa.",
    before: "Antes",
    after: "Después",
    beforeText: "Creo que las redes sociales son importantes porque las personas pueden comunicarse fácilmente con sus amigos y descubrir información.",
    afterText: "En mi opinión, las redes sociales desempeñan un papel importante en nuestra vida diaria, ya que nos permiten mantenernos en contacto con nuestros seres queridos y facilitan el acceso a la información.",
    problemEyebrow: "Mucho más que un corrector",
    problemTitle: "Escribir en francés es difícil. Escribir para el TCF lo es aún más.",
    problemDescription: "Puedes saber mucho francés y aun así perder puntos si tu respuesta no tiene suficiente estructura, precisión o adaptación a la tarea.",
    skills: [{ title: "Estructura", description: "Organiza tus ideas de forma clara y coherente." }, { title: "Gramática", description: "Identifica los errores que dificultan tu expresión." }, { title: "Vocabulario", description: "Encuentra formas más precisas y naturales de expresarte." }, { title: "Coherencia", description: "Conecta tus ideas con más eficacia." }],
    stepsEyebrow: "Cómo funciona",
    stepsTitle: "Un ciclo de práctica enfocado en tres pasos.",
    steps: [{ title: "Elige una tarea", description: "Trabaja con una consigna tipo TCF o añade la tuya." }, { title: "Escribe tu respuesta", description: "Redacta a tu ritmo con los requisitos de la tarea a la vista." }, { title: "Revisa y mejora", description: "Usa comentarios específicos para entender qué revisar después." }],
    methodEyebrow: "Metodología de comentarios",
    methodTitle: "Cada corrección debe decirte qué trabajar después.",
    methodDescription: "Los comentarios se organizan para que entiendas tu respuesta, no solo para señalar lo que está mal.",
    methodPoints: ["Compara tu texto original y el corregido", "Revisa gramática, vocabulario y organización", "Usa los comentarios para planificar el próximo borrador"],
    assessedEyebrow: "En qué trabajarás",
    assessedTitle: "Los elementos que hacen que una respuesta sea más fácil de seguir.",
    assessed: ["Respuesta a la tarea y pertinencia", "Organización y coherencia", "Gramática y control de las oraciones", "Vocabulario, registro y precisión"],
    faqEyebrow: "Preguntas",
    faqTitle: "Preguntas frecuentes",
    faqs: [{ question: "¿Qué es el TCF?", answer: "El Test de connaissance du français es una prueba de competencia en francés. Los requisitos varían según la versión y tu objetivo." }, { question: "¿Para qué nivel es la aplicación?", answer: "Está diseñada para quienes preparan la expresión escrita, desde ganar confianza hasta la práctica avanzada." }, { question: "¿Qué habilidades puedo practicar?", answer: "Puedes practicar las tres tareas de expresión escrita y trabajar organización, gramática, vocabulario y coherencia." }, { question: "¿La aplicación es gratuita?", answer: "El acceso y la disponibilidad se indican durante el registro. Esta página no promete un precio." }, { question: "¿Cuándo tendré acceso?", answer: "Después de crear una cuenta, el acceso depende del proceso actual de invitación o lista de espera." }, { question: "¿Necesito crear una cuenta para unirme a la lista?", answer: "Sí. Una cuenta permite mantener conectadas tu invitación y tu historial de práctica." }, { question: "¿La aplicación sustituye un curso de francés?", answer: "No. Es una herramienta de práctica y preparación complementaria para identificar dificultades y practicar de forma más intencional." }],
    footer: "MyTCFLab · Practica con intención. Mejora una respuesta cada vez.",
  },
  pt: {
    eyebrow: "Prática de expressão escrita para o TCF",
    title: "Escreva com mais clareza para o TCF.",
    description: "Pratique as tarefas 1, 2 e 3 e transforme cada comentário em uma resposta melhor.",
    primaryAction: "Acessar a ferramenta",
    proofEyebrow: "Do rascunho a uma expressão mais clara",
    proofTitle: "Veja como uma resposta mais precisa pode soar.",
    before: "Antes",
    after: "Depois",
    beforeText: "Acho que as redes sociais são importantes porque as pessoas podem se comunicar facilmente com seus amigos e descobrir informações.",
    afterText: "Na minha opinião, as redes sociais desempenham um papel importante em nossa vida diária, pois nos permitem manter contato com pessoas queridas e facilitam o acesso à informação.",
    problemEyebrow: "Mais do que um corretor ortográfico",
    problemTitle: "Escrever em francês é difícil. Escrever para o TCF é ainda mais.",
    problemDescription: "Você pode conhecer muito francês e ainda perder pontos se sua resposta não for suficientemente estruturada, precisa ou adequada à tarefa.",
    skills: [{ title: "Estrutura", description: "Organize suas ideias com clareza e coerência." }, { title: "Gramática", description: "Identifique erros que prejudicam sua expressão." }, { title: "Vocabulário", description: "Encontre formas mais precisas e naturais de se expressar." }, { title: "Coerência", description: "Conecte suas ideias de forma mais eficaz." }],
    stepsEyebrow: "Como funciona",
    stepsTitle: "Um ciclo de prática focado em três etapas.",
    steps: [{ title: "Escolha uma tarefa", description: "Trabalhe com um tema no formato TCF ou escreva o seu." }, { title: "Escreva sua resposta", description: "Redija no seu ritmo mantendo os requisitos da tarefa em vista." }, { title: "Revise e melhore", description: "Use comentários específicos para entender o que revisar a seguir." }],
    methodEyebrow: "Metodologia de feedback",
    methodTitle: "Cada correção deve mostrar no que trabalhar em seguida.",
    methodDescription: "O feedback é organizado para ajudar você a compreender sua resposta, não apenas apontar o que está errado.",
    methodPoints: ["Compare seu texto original e o corrigido", "Revise gramática, vocabulário e organização", "Use os comentários para planejar o próximo rascunho"],
    assessedEyebrow: "No que você vai trabalhar",
    assessedTitle: "Os elementos que tornam uma resposta escrita mais fácil de acompanhar.",
    assessed: ["Resposta à tarefa e relevância", "Organização e coerência", "Gramática e domínio das frases", "Vocabulário, registro e precisão"],
    faqEyebrow: "Dúvidas",
    faqTitle: "Perguntas frequentes",
    faqs: [{ question: "O que é o TCF?", answer: "O Test de connaissance du français é um teste de proficiência em francês. Os requisitos variam conforme a versão do exame e seu objetivo." }, { question: "Para qual nível o app é indicado?", answer: "Ele foi pensado para quem prepara a expressão escrita, da construção de confiança à prática avançada." }, { question: "Quais habilidades posso praticar?", answer: "Você pode praticar as três tarefas de expressão escrita e trabalhar organização, gramática, vocabulário e coerência." }, { question: "O app é gratuito?", answer: "O acesso e a disponibilidade são informados durante o cadastro. Esta página não promete um preço." }, { question: "Quando terei acesso?", answer: "Depois de criar uma conta, o acesso depende do processo atual de convite ou lista de espera." }, { question: "Preciso criar uma conta para entrar na lista?", answer: "Sim. Uma conta mantém seu convite e histórico de prática vinculados a você." }, { question: "O app substitui um curso de francês?", answer: "Não. É uma ferramenta de prática e preparação complementar, criada para ajudar você a identificar dificuldades e praticar de maneira mais direcionada." }],
    footer: "MyTCFLab · Pratique com intenção. Melhore uma resposta por vez.",
  },
};
