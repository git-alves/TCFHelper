import { LEGAL_SUPPORT_EMAIL, type LegalDocumentContent, type LegalLocaleContent } from "@/lib/legal-constants";

const TERMS: LegalDocumentContent = {
  description: "Les conditions qui s’appliquent lorsque vous utilisez MyTCFLab.",
  sections: [
    {
      heading: "Acceptation des conditions",
      paragraphs: [
        "En accédant à MyTCFLab ou en l’utilisant, vous acceptez les présentes Conditions d’utilisation, notre Politique de confidentialité et notre Politique de remboursement. Si vous n’êtes pas d’accord, n’utilisez pas le service.",
      ],
    },
    {
      heading: "Éligibilité et responsabilités liées au compte",
      paragraphs: [
        "Vous êtes responsable de la confidentialité des identifiants de votre compte et de toute activité réalisée avec votre compte. Vous devez fournir des informations exactes lors de votre inscription et les tenir à jour.",
        "L’accès à MyTCFLab peut nécessiter un code d’accès délivré par nos soins. Les codes d’accès sont destinés à la personne à qui ils ont été remis et ne peuvent être ni vendus ni partagés.",
      ],
    },
    {
      heading: "Essai et formules payantes",
      paragraphs: [
        "Les nouveaux utilisateurs peuvent bénéficier d’un essai gratuit. Les formules payantes peuvent être proposées sous forme d’abonnement et se renouvellent automatiquement, sauf résiliation avant la date de renouvellement suivante. Le détail des formules, l’usage inclus et les tarifs sont indiqués dans le produit au moment du paiement.",
      ],
    },
    {
      heading: "Votre contenu et les retours générés par l’IA",
      paragraphs: [
        "Vous restez propriétaire des textes et des rédactions que vous soumettez. Vous nous accordez une licence limitée pour traiter ce contenu uniquement afin de faire fonctionner le service pour vous, y compris pour générer des corrections, des traductions et des exemples de réponses.",
        "Les commentaires, les estimations de niveau CECR et les exemples de réponses sont produits par des systèmes automatisés et constituent des aides à l’étude. Ils peuvent comporter des erreurs et ne prédisent ni ne garantissent aucun résultat à l’examen officiel du TCF.",
        "Ne soumettez pas d’informations personnelles sensibles dans vos textes, comme des numéros d’identité, des données financières ou des informations de santé.",
      ],
    },
    {
      heading: "Utilisation acceptable",
      paragraphs: [
        "Vous vous engagez à ne pas détourner le service, à ne pas tenter d’y accéder sans autorisation, à ne pas perturber son fonctionnement normal, à ne pas contourner les limites d’usage et à ne pas utiliser MyTCFLab à des fins illégales, abusives ou frauduleuses.",
        "Nous pouvons suspendre ou bloquer un compte qui enfreint ces conditions ou qui met en danger le service ou les autres utilisateurs.",
      ],
    },
    {
      heading: "Propriété intellectuelle",
      paragraphs: [
        "MyTCFLab, ainsi que l’ensemble des logiciels, de l’image de marque et des contenus qui y sont associés, appartiennent à MyTCFLab ou à ses concédants de licence. Nous vous accordons un droit limité, non exclusif et non transférable d’utiliser le service pour votre propre apprentissage personnel, dans le respect des présentes Conditions.",
      ],
    },
    {
      heading: "Disponibilité du service",
      paragraphs: [
        "Nous nous efforçons de maintenir MyTCFLab fiable, mais nous ne garantissons ni sa disponibilité, ni un accès ininterrompu, ni l’absence d’erreurs. Les fonctionnalités, les limites d’usage et les formules peuvent évoluer au fil de l’amélioration du service.",
      ],
    },
    {
      heading: "Limitation de responsabilité",
      paragraphs: [
        "Dans la mesure permise par la loi, MyTCFLab est fourni « en l’état », sans garantie d’aucune sorte, et nous ne sommes pas responsables des dommages indirects, accessoires ou consécutifs résultant de votre utilisation du service, y compris les résultats d’examen ou la perte de données.",
      ],
    },
    {
      heading: "Modifications et contact",
      paragraphs: [
        "Nous pouvons mettre à jour ces Conditions de temps à autre. La date d’entrée en vigueur indiquée ci-dessus précise leur dernière modification ; continuer à utiliser le service après une mise à jour vaut acceptation des nouvelles Conditions.",
        `Vous pouvez adresser vos questions sur ces Conditions à ${LEGAL_SUPPORT_EMAIL}.`,
      ],
    },
  ],
};

const PRIVACY: LegalDocumentContent = {
  description: "Ce que MyTCFLab collecte, comment ces données sont utilisées et comment les supprimer.",
  sections: [
    {
      heading: "Présentation",
      paragraphs: [
        "Cette politique explique quelles informations MyTCFLab collecte, comment nous les utilisons et comment nous les protégeons. En utilisant MyTCFLab, vous acceptez cette politique.",
      ],
    },
    {
      heading: "Ce que nous collectons",
      paragraphs: [
        "Nous collectons les informations de compte (comme votre nom et votre adresse e-mail, y compris lorsque vous vous connectez avec Google), les rédactions et réponses que vous écrivez, les corrections, traductions et exemples de réponses générés à partir de celles-ci, votre progression dans les exercices, ainsi que les messages et pièces jointes que vous envoyez au support.",
        "Nous collectons aussi des données opérationnelles de base nécessaires au fonctionnement et à la sécurité du service, comme l’activité de connexion, votre fuseau horaire et des compteurs d’usage qui appliquent les limites d’utilisation équitable.",
      ],
    },
    {
      heading: "Comment nous utilisons vos données",
      paragraphs: [
        "Nous utilisons vos données pour fournir le produit, générer des retours et des analyses par IA, maintenir les fonctionnalités du compte, répondre aux demandes d’assistance, prévenir les abus et améliorer la fiabilité. Nous ne vendons pas vos données personnelles.",
      ],
    },
    {
      heading: "Prestataires de services et traitement par l’IA",
      paragraphs: [
        "Pour fournir le service, le texte que vous soumettez est traité par des prestataires tiers agissant pour notre compte : Google (corrections par IA, exemples de réponses et traduction), Clerk (connexion et gestion des comptes), nos prestataires d’hébergement et de base de données, HubSpot (demandes d’assistance) et Stripe (paiements, lorsque des formules payantes sont proposées).",
        "Ces prestataires ne reçoivent que ce qui est nécessaire à leur fonction et traitent ces données selon leurs propres conditions.",
      ],
    },
    {
      heading: "Entraînement des modèles et utilisation du contenu",
      paragraphs: [
        "Nous n’utilisons pas intentionnellement vos rédactions privées ni vos autres textes pour entraîner des modèles de MyTCFLab. Les prestataires d’IA tiers ne peuvent traiter les données que pour fournir le service demandé, selon leurs propres conditions.",
      ],
    },
    {
      heading: "Contrôles d’accès et sécurité",
      paragraphs: [
        "Nous appliquons des mesures de protection techniques et organisationnelles, telles que des contrôles d’accès et le chiffrement des transmissions. L’accès interne est limité au personnel autorisé lorsque cela est nécessaire pour l’assistance, la sécurité, la conformité légale ou la prévention des abus.",
      ],
    },
    {
      heading: "Conservation et suppression des données",
      paragraphs: [
        "Vos rédactions, corrections et votre progression sont conservées tant que votre compte est actif. Vous pouvez effacer vous-même l’historique de vos corrections depuis l’application, et demander la suppression de votre compte et des données associées en nous contactant. Les données supprimées sont retirées des systèmes actifs dans un délai raisonnable et peuvent subsister dans les sauvegardes pendant une durée limitée.",
        "Les journaux opérationnels sont conservés pendant une courte durée, actuellement 30 jours, puis supprimés automatiquement.",
      ],
    },
    {
      heading: "Vos choix",
      paragraphs: [
        "Vous pouvez nous demander d’accéder aux données personnelles que nous détenons à votre sujet, de les corriger, de les exporter ou de les supprimer. Nous pouvons avoir besoin de vérifier votre identité avant de donner suite à une demande.",
      ],
    },
    {
      heading: "Modifications et contact",
      paragraphs: [
        "Nous pouvons mettre à jour cette politique de temps à autre. La date d’entrée en vigueur indiquée ci-dessus précise sa dernière modification.",
        `Vous pouvez adresser vos questions de confidentialité et vos demandes concernant vos données à ${LEGAL_SUPPORT_EMAIL}.`,
      ],
    },
  ],
};

const REFUND: LegalDocumentContent = {
  description: "Dans quels cas les formules payantes MyTCFLab peuvent être remboursées.",
  sections: [
    {
      heading: "Présentation",
      paragraphs: [
        "Nous proposons un accès d’essai gratuit afin que vous puissiez évaluer MyTCFLab avant de payer. Si un paiement est prélevé, cette politique explique dans quels cas un remboursement est possible.",
      ],
    },
    {
      heading: "Accès d’essai",
      paragraphs: [
        "L’accès d’essai est gratuit et expire automatiquement selon les conditions d’essai indiquées lors de l’inscription. Aucun paiement n’est dû pendant l’essai, sauf si vous choisissez de souscrire une formule payante.",
      ],
    },
    {
      heading: "Remboursement du premier paiement",
      paragraphs: [
        "Pour le premier paiement d’un utilisateur, nous remboursons les demandes effectuées dans les 14 jours calendaires suivant la date du prélèvement. Nous pouvons refuser un remboursement en cas de preuve manifeste d’abus, de remboursements répétés ou de consommation importante du service après l’achat.",
      ],
    },
    {
      heading: "Paiements de renouvellement",
      paragraphs: [
        "Les renouvellements d’abonnement ne sont en général pas remboursables une fois traités. Pour éviter un prélèvement de renouvellement, résiliez avant la prochaine date de facturation dans les paramètres de votre compte.",
      ],
    },
    {
      heading: "Erreurs de facturation et doubles prélèvements",
      paragraphs: [
        "Nous remboursons intégralement les doubles prélèvements avérés, les erreurs techniques de facturation et les transactions non autorisées.",
      ],
    },
    {
      heading: "Comment demander un remboursement",
      paragraphs: [
        `Écrivez à ${LEGAL_SUPPORT_EMAIL} en indiquant l’adresse e-mail utilisée pour l’achat, le reçu de commande et le motif de la demande. Nous visons un examen des demandes sous 2 jours ouvrés.`,
      ],
    },
    {
      heading: "Délai de traitement du remboursement",
      paragraphs: [
        "Une fois le remboursement approuvé, il est soumis immédiatement. Votre banque ou l’émetteur de votre carte peut mettre de 5 à 10 jours ouvrés pour l’afficher sur votre compte.",
      ],
    },
  ],
};

export const LEGAL_CONTENT_FR: LegalLocaleContent = {
  ui: {
    effectiveDate: "Date d’entrée en vigueur :",
    backToHome: "Retour à l’accueil",
    legalNavLabel: "Documents juridiques",
    languageLabel: "Langue :",
    translationNotice: {
      text: "Cette traduction est fournie pour votre commodité. En cas de différence avec la version anglaise, la version anglaise prévaut.",
      linkLabel: "Lire la version anglaise",
    },
  },
  documents: { terms: TERMS, privacy: PRIVACY, refund: REFUND },
};
