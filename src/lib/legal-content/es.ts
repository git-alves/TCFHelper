import { LEGAL_SUPPORT_EMAIL, type LegalDocumentContent, type LegalLocaleContent } from "@/lib/legal-constants";

const TERMS: LegalDocumentContent = {
  description: "Los términos que se aplican cuando usas MyTCFLab.",
  sections: [
    {
      heading: "Aceptación de los términos",
      paragraphs: [
        "Al acceder a MyTCFLab o usarlo, aceptas estos Términos del servicio, nuestra Política de privacidad y nuestra Política de reembolso. Si no estás de acuerdo, no uses el servicio.",
      ],
    },
    {
      heading: "Elegibilidad y responsabilidades de la cuenta",
      paragraphs: [
        "Eres responsable de mantener la confidencialidad de las credenciales de tu cuenta y de toda la actividad realizada con ella. Debes proporcionar información veraz al registrarte y mantenerla actualizada.",
        "El acceso a MyTCFLab puede requerir un código de acceso emitido por nosotros. Los códigos de acceso son para la persona a la que se entregaron y no pueden venderse ni compartirse.",
      ],
    },
    {
      heading: "Prueba y planes de pago",
      paragraphs: [
        "Los usuarios nuevos pueden recibir un uso de prueba gratuito. Los planes de pago pueden ofrecerse como suscripciones y se renuevan automáticamente salvo que los canceles antes de la siguiente fecha de renovación. Los detalles del plan, el uso incluido y los precios se muestran en el producto al momento del pago.",
      ],
    },
    {
      heading: "Tu contenido y los comentarios generados por IA",
      paragraphs: [
        "Conservas la propiedad de las redacciones y demás textos que envías. Nos concedes una licencia limitada para procesar ese contenido únicamente con el fin de operar el servicio para ti, incluida la generación de correcciones, traducciones y ejemplos de respuesta.",
        "Los comentarios, las estimaciones de nivel MCER y los ejemplos de respuesta los producen sistemas automatizados y son ayudas de estudio. Pueden contener errores y no predicen ni garantizan ningún resultado en el examen oficial del TCF.",
        "No envíes información personal sensible en tus textos, como números de identificación, datos financieros o información de salud.",
      ],
    },
    {
      heading: "Uso aceptable",
      paragraphs: [
        "Aceptas no hacer un mal uso del servicio, no intentar accesos no autorizados, no interferir con su funcionamiento normal, no eludir los límites de uso y no utilizar MyTCFLab para actividades ilegales, abusivas o fraudulentas.",
        "Podemos suspender o bloquear una cuenta que incumpla estos términos o ponga en riesgo el servicio o a otros usuarios.",
      ],
    },
    {
      heading: "Propiedad intelectual",
      paragraphs: [
        "MyTCFLab y todo el software, la marca y los contenidos relacionados son propiedad de MyTCFLab o de sus licenciantes. Te concedemos un derecho limitado, no exclusivo e intransferible para usar el servicio en tu propio estudio personal, sujeto a estos Términos.",
      ],
    },
    {
      heading: "Disponibilidad del servicio",
      paragraphs: [
        "Nos esforzamos por que MyTCFLab sea fiable, pero no garantizamos su disponibilidad, un acceso ininterrumpido ni la ausencia de errores. Las funciones, los límites de uso y los planes pueden cambiar con el tiempo a medida que mejoramos el servicio.",
      ],
    },
    {
      heading: "Limitación de responsabilidad",
      paragraphs: [
        "En la medida que lo permita la ley, MyTCFLab se ofrece «tal cual», sin garantías de ningún tipo, y no somos responsables de daños indirectos, incidentales o consecuentes derivados del uso del servicio, incluidos los resultados de exámenes o la pérdida de datos.",
      ],
    },
    {
      heading: "Cambios y contacto",
      paragraphs: [
        "Podemos actualizar estos Términos de vez en cuando. La fecha de entrada en vigor indicada arriba muestra cuándo cambiaron por última vez, y seguir usando el servicio después de una actualización implica que aceptas los nuevos Términos.",
        `Las preguntas sobre estos Términos pueden enviarse a ${LEGAL_SUPPORT_EMAIL}.`,
      ],
    },
  ],
};

const PRIVACY: LegalDocumentContent = {
  description: "Qué recopila MyTCFLab, cómo se usa y cómo eliminarlo.",
  sections: [
    {
      heading: "Resumen",
      paragraphs: [
        "Esta política explica qué información recopila MyTCFLab, cómo la usamos y cómo la protegemos. Al usar MyTCFLab, aceptas esta política.",
      ],
    },
    {
      heading: "Qué recopilamos",
      paragraphs: [
        "Recopilamos información de la cuenta (como tu nombre y tu correo electrónico, incluso cuando inicias sesión con Google), las redacciones y respuestas que escribes, las correcciones, traducciones y ejemplos de respuesta generados a partir de ellas, tu progreso en los ejercicios y los mensajes y archivos adjuntos que envías a soporte.",
        "También recopilamos datos operativos básicos necesarios para ejecutar y proteger el servicio, como la actividad de inicio de sesión, tu zona horaria y contadores de uso que aplican los límites de uso justo.",
      ],
    },
    {
      heading: "Cómo usamos tus datos",
      paragraphs: [
        "Usamos tus datos para ofrecer el producto, generar comentarios y análisis con IA, mantener las funciones de la cuenta, responder a solicitudes de soporte, prevenir abusos y mejorar la fiabilidad. No vendemos tus datos personales.",
      ],
    },
    {
      heading: "Proveedores de servicios y procesamiento con IA",
      paragraphs: [
        "Para prestar el servicio, el texto que envías es procesado por proveedores externos que actúan en nuestro nombre: Google (correcciones con IA, ejemplos de respuesta y traducción), Clerk (inicio de sesión y gestión de cuentas), nuestros proveedores de alojamiento y base de datos, HubSpot (solicitudes de soporte) y Stripe (pagos, cuando se ofrecen planes de pago).",
        "Estos proveedores reciben solo lo necesario para su función y procesan los datos conforme a sus propios términos.",
      ],
    },
    {
      heading: "Entrenamiento de modelos y uso del contenido",
      paragraphs: [
        "No usamos intencionalmente tus redacciones privadas ni otros textos para entrenar modelos de MyTCFLab. Los proveedores de IA externos solo pueden procesar los datos para prestar el servicio solicitado, conforme a sus propios términos.",
      ],
    },
    {
      heading: "Controles de acceso y seguridad",
      paragraphs: [
        "Aplicamos medidas técnicas y organizativas de protección, como controles de acceso y transmisión cifrada. El acceso interno se limita al personal autorizado cuando es necesario para soporte, seguridad, cumplimiento legal o prevención de abusos.",
      ],
    },
    {
      heading: "Conservación y eliminación de datos",
      paragraphs: [
        "Tus redacciones, correcciones y progreso se conservan mientras tu cuenta esté activa. Puedes borrar tú mismo el historial de correcciones desde la aplicación y solicitar la eliminación de tu cuenta y de los datos relacionados escribiéndonos. Los datos eliminados se retiran de los sistemas activos en un plazo razonable y pueden permanecer en copias de seguridad durante un tiempo limitado.",
        "Los registros operativos se conservan durante un periodo breve, actualmente 30 días, y luego se eliminan automáticamente.",
      ],
    },
    {
      heading: "Tus opciones",
      paragraphs: [
        "Puedes pedirnos que te demos acceso a los datos personales que tenemos sobre ti, que los corrijamos, los exportemos o los eliminemos. Es posible que debamos verificar tu identidad antes de atender una solicitud.",
      ],
    },
    {
      heading: "Cambios y contacto",
      paragraphs: [
        "Podemos actualizar esta política de vez en cuando. La fecha de entrada en vigor indicada arriba muestra cuándo cambió por última vez.",
        `Las preguntas sobre privacidad y las solicitudes relativas a tus datos pueden enviarse a ${LEGAL_SUPPORT_EMAIL}.`,
      ],
    },
  ],
};

const REFUND: LegalDocumentContent = {
  description: "Cuándo se pueden reembolsar los planes de pago de MyTCFLab.",
  sections: [
    {
      heading: "Resumen",
      paragraphs: [
        "Ofrecemos acceso de prueba gratuito para que puedas evaluar MyTCFLab antes de pagar. Si se realiza un cobro, esta política explica cuándo hay reembolsos disponibles.",
      ],
    },
    {
      heading: "Acceso de prueba",
      paragraphs: [
        "El acceso de prueba es gratuito y caduca automáticamente según las condiciones de prueba mostradas al registrarte. No se debe ningún pago durante la prueba, a menos que decidas iniciar un plan de pago.",
      ],
    },
    {
      heading: "Reembolsos del primer cobro",
      paragraphs: [
        "Para el primer cobro de un usuario, ofrecemos reembolsos solicitados dentro de los 14 días naturales posteriores a la fecha del cobro. Podemos rechazar un reembolso si hay pruebas claras de abuso, reembolsos repetidos o un consumo significativo del servicio después de la compra.",
      ],
    },
    {
      heading: "Cobros de renovación",
      paragraphs: [
        "Las renovaciones de suscripción generalmente no son reembolsables una vez procesadas. Para evitar cobros de renovación, cancela antes de la próxima fecha de facturación en la configuración de tu cuenta.",
      ],
    },
    {
      heading: "Errores de facturación y cobros duplicados",
      paragraphs: [
        "Reembolsaremos íntegramente los cobros duplicados verificados, los errores técnicos de facturación y las transacciones no autorizadas.",
      ],
    },
    {
      heading: "Cómo solicitar un reembolso",
      paragraphs: [
        `Escribe a ${LEGAL_SUPPORT_EMAIL} con el correo electrónico de la compra, el recibo del pedido y el motivo de la solicitud. Procuramos revisar las solicitudes en un plazo de 2 días hábiles.`,
      ],
    },
    {
      heading: "Plazo de procesamiento del reembolso",
      paragraphs: [
        "Una vez aprobado, el reembolso se envía de inmediato. Tu banco o el emisor de tu tarjeta puede tardar de 5 a 10 días hábiles en reflejarlo.",
      ],
    },
  ],
};

export const LEGAL_CONTENT_ES: LegalLocaleContent = {
  ui: {
    effectiveDate: "Fecha de entrada en vigor:",
    backToHome: "Volver al inicio",
    legalNavLabel: "Documentos legales",
    languageLabel: "Idioma:",
    translationNotice: {
      text: "Esta traducción se ofrece para tu comodidad. Si difiere de la versión en inglés, prevalece la versión en inglés.",
      linkLabel: "Leer la versión en inglés",
    },
  },
  documents: { terms: TERMS, privacy: PRIVACY, refund: REFUND },
};
