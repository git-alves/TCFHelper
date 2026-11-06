// Content for the public legal pages (/terms, /privacy, /refund). Kept as
// data so the three pages share one layout and a wording change never touches
// markup. The documents are English-only: they are legal text, so translating
// them is a deliberate decision for the owner (and counsel), not a UI string.

export const LEGAL_BRAND = "MyTCFLab";
export const LEGAL_SUPPORT_EMAIL = "support@mytcflab.com";

// Bump this whenever any document's wording changes in a way that affects
// users, so each page's "Effective date" stays truthful.
export const LEGAL_EFFECTIVE_DATE = "November 6, 2026";

export type LegalDocumentSlug = "terms" | "privacy" | "refund";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  slug: LegalDocumentSlug;
  path: `/${LegalDocumentSlug}`;
  title: string;
  description: string;
  sections: LegalSection[];
}

const TERMS: LegalDocument = {
  slug: "terms",
  path: "/terms",
  title: "Terms of Service",
  description: "The terms that apply when you use MyTCFLab.",
  sections: [
    {
      heading: "Acceptance of Terms",
      paragraphs: [
        "By accessing or using MyTCFLab, you agree to these Terms of Service, our Privacy Policy, and our Refund Policy. If you do not agree, do not use the service.",
      ],
    },
    {
      heading: "Eligibility and Account Responsibilities",
      paragraphs: [
        "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate information when registering and keep it up to date.",
        "Access to MyTCFLab may require an access code issued by us. Access codes are for the person they were issued to and may not be sold or shared.",
      ],
    },
    {
      heading: "Trial and Paid Plans",
      paragraphs: [
        "New users may receive free trial usage. Paid plans may be offered as subscriptions and renew automatically unless canceled before the next renewal date. Plan details, included usage, and pricing are shown in the product at checkout.",
      ],
    },
    {
      heading: "Your Content and AI-Generated Feedback",
      paragraphs: [
        "You keep ownership of the essays and other text you submit. You grant us a limited license to process that content solely to operate the service for you, including generating corrections, translations, and example answers.",
        "Feedback, CEFR level estimates, and example answers are produced by automated systems and are study aids. They can contain mistakes, and they do not predict or guarantee any result on the official TCF exam.",
        "Do not submit sensitive personal information in your writing, such as identity numbers, financial details, or health information.",
      ],
    },
    {
      heading: "Acceptable Use",
      paragraphs: [
        "You agree not to misuse the service, attempt unauthorized access, interfere with normal operation, circumvent usage limits, or use MyTCFLab for unlawful, abusive, or fraudulent activity.",
        "We may suspend or block an account that breaks these terms or puts the service or other users at risk.",
      ],
    },
    {
      heading: "Intellectual Property",
      paragraphs: [
        "MyTCFLab and all related software, branding, and content are owned by MyTCFLab or its licensors. We grant you a limited, non-exclusive, non-transferable right to use the service for your own personal study, subject to these Terms.",
      ],
    },
    {
      heading: "Service Availability",
      paragraphs: [
        "We work to keep MyTCFLab reliable, but uptime, uninterrupted access, and error-free operation are not guaranteed. Features, usage limits, and plans may change over time as we improve the service.",
      ],
    },
    {
      heading: "Limitation of Liability",
      paragraphs: [
        "To the extent permitted by law, MyTCFLab is provided “as is” without warranties of any kind, and we are not liable for indirect, incidental, or consequential damages arising from your use of the service, including exam results or lost data.",
      ],
    },
    {
      heading: "Changes and Contact",
      paragraphs: [
        "We may update these Terms from time to time. The effective date above shows when they last changed, and continued use of the service after an update means you accept the new Terms.",
        `Questions about these Terms can be sent to ${LEGAL_SUPPORT_EMAIL}.`,
      ],
    },
  ],
};

const PRIVACY: LegalDocument = {
  slug: "privacy",
  path: "/privacy",
  title: "Privacy Policy",
  description: "What MyTCFLab collects, how it is used, and how to delete it.",
  sections: [
    {
      heading: "Overview",
      paragraphs: [
        "This policy explains what information MyTCFLab collects, how we use it, and how we protect it. By using MyTCFLab, you agree to this policy.",
      ],
    },
    {
      heading: "What We Collect",
      paragraphs: [
        "We collect account information (such as your name and email address, including when you sign in with Google), the essays and answers you write, the corrections, translations, and example answers generated for them, your practice progress, and the messages and attachments you send to support.",
        "We also collect basic operational data needed to run and secure the service, such as sign-in activity, your time zone, and usage counts that enforce fair-use limits.",
      ],
    },
    {
      heading: "How We Use Your Data",
      paragraphs: [
        "We use your data to provide the product, generate AI feedback and analysis, maintain account functionality, answer support requests, prevent abuse, and improve reliability. We do not sell your personal data.",
      ],
    },
    {
      heading: "Service Providers and AI Processing",
      paragraphs: [
        "To deliver the service, the text you submit is processed by third-party providers acting on our behalf: Google (AI corrections, example answers, and translation), Clerk (sign-in and account management), our hosting and database providers, HubSpot (support requests), and Stripe (payments, where paid plans are offered).",
        "These providers receive only what is needed for their function and process it under their own terms.",
      ],
    },
    {
      heading: "Model Training and Content Use",
      paragraphs: [
        "We do not intentionally use your private essays or other writing to train MyTCFLab models. Third-party AI providers may process data only to provide the requested service under their own terms.",
      ],
    },
    {
      heading: "Access Controls and Security",
      paragraphs: [
        "We use technical and organizational safeguards such as access controls and encrypted transport. Internal access is limited to authorized personnel when needed for support, security, legal compliance, or abuse prevention.",
      ],
    },
    {
      heading: "Data Retention and Deletion",
      paragraphs: [
        "Your essays, corrections, and progress are kept for as long as your account is active. You can clear your correction history yourself from the app, and you can request deletion of your account and related data by contacting us. Deleted data is removed from active systems within a reasonable period and may persist in backups for a limited time.",
        "Operational logs are kept for a short period, currently 30 days, and then removed automatically.",
      ],
    },
    {
      heading: "Your Choices",
      paragraphs: [
        "You can ask us to access, correct, export, or delete the personal data we hold about you. We may need to verify your identity before acting on a request.",
      ],
    },
    {
      heading: "Changes and Contact",
      paragraphs: [
        "We may update this policy from time to time. The effective date above shows when it last changed.",
        `Privacy questions and data requests can be sent to ${LEGAL_SUPPORT_EMAIL}.`,
      ],
    },
  ],
};

const REFUND: LegalDocument = {
  slug: "refund",
  path: "/refund",
  title: "Refund Policy",
  description: "When refunds are available for MyTCFLab paid plans.",
  sections: [
    {
      heading: "Overview",
      paragraphs: [
        "We offer free trial access so you can evaluate MyTCFLab before paying. If a paid charge occurs, this policy explains when refunds are available.",
      ],
    },
    {
      heading: "Trial Access",
      paragraphs: [
        "Trial access is free and expires automatically based on the trial terms shown at signup. No payment is due during the trial unless you choose to start a paid plan.",
      ],
    },
    {
      heading: "First Paid Charge Refunds",
      paragraphs: [
        "For a user’s first paid charge, we offer refunds requested within 14 calendar days from the charge date. We may decline a refund if there is clear evidence of abuse, repeated refunds, or significant service consumption after purchase.",
      ],
    },
    {
      heading: "Renewal Charges",
      paragraphs: [
        "Subscription renewals are generally non-refundable once processed. To avoid renewal charges, cancel before the next billing date in your account settings.",
      ],
    },
    {
      heading: "Billing Errors and Duplicate Charges",
      paragraphs: [
        "We will issue full refunds for verified duplicate charges, technical billing errors, or unauthorized transactions.",
      ],
    },
    {
      heading: "How to Request a Refund",
      paragraphs: [
        `Email ${LEGAL_SUPPORT_EMAIL} with the purchase email address, order receipt, and reason for the request. We aim to review requests within 2 business days.`,
      ],
    },
    {
      heading: "Refund Processing Time",
      paragraphs: [
        "Once approved, refunds are submitted immediately. Your bank or card provider may take 5 to 10 business days to post the refund.",
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalDocumentSlug, LegalDocument> = {
  terms: TERMS,
  privacy: PRIVACY,
  refund: REFUND,
};

// Order matches the consent line ("Terms of Service, Privacy Policy, and
// Refund Policy") and every footer that lists the documents.
export const LEGAL_DOCUMENT_LIST: LegalDocument[] = [TERMS, PRIVACY, REFUND];
