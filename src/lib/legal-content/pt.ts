import { LEGAL_SUPPORT_EMAIL, type LegalDocumentContent, type LegalLocaleContent } from "@/lib/legal-constants";

const TERMS: LegalDocumentContent = {
  description: "Os termos que se aplicam quando você usa o MyTCFLab.",
  sections: [
    {
      heading: "Aceitação dos Termos",
      paragraphs: [
        "Ao acessar ou usar o MyTCFLab, você concorda com estes Termos de Serviço, com a nossa Política de Privacidade e com a nossa Política de Reembolso. Se você não concordar, não use o serviço.",
      ],
    },
    {
      heading: "Elegibilidade e responsabilidades da conta",
      paragraphs: [
        "Você é responsável por manter a confidencialidade das credenciais da sua conta e por toda a atividade realizada nela. Você deve fornecer informações corretas ao se cadastrar e mantê-las atualizadas.",
        "O acesso ao MyTCFLab pode exigir um código de acesso emitido por nós. Os códigos de acesso são destinados à pessoa para quem foram emitidos e não podem ser vendidos nem compartilhados.",
      ],
    },
    {
      heading: "Teste e planos pagos",
      paragraphs: [
        "Novos usuários podem receber uso de teste gratuito. Os planos pagos podem ser oferecidos como assinaturas e são renovados automaticamente, a menos que sejam cancelados antes da próxima data de renovação. Os detalhes do plano, o uso incluído e os preços são exibidos no produto na hora do pagamento.",
      ],
    },
    {
      heading: "Seu conteúdo e os comentários gerados por IA",
      paragraphs: [
        "Você mantém a propriedade das redações e de outros textos que enviar. Você nos concede uma licença limitada para processar esse conteúdo exclusivamente para operar o serviço para você, incluindo a geração de correções, traduções e exemplos de resposta.",
        "Os comentários, as estimativas de nível do QECR e os exemplos de resposta são produzidos por sistemas automatizados e servem como apoio ao estudo. Eles podem conter erros e não preveem nem garantem qualquer resultado no exame oficial do TCF.",
        "Não envie informações pessoais sensíveis nos seus textos, como números de documentos de identidade, dados financeiros ou informações de saúde.",
      ],
    },
    {
      heading: "Uso aceitável",
      paragraphs: [
        "Você concorda em não fazer mau uso do serviço, não tentar acessos não autorizados, não interferir no funcionamento normal, não contornar os limites de uso e não usar o MyTCFLab para atividades ilegais, abusivas ou fraudulentas.",
        "Podemos suspender ou bloquear uma conta que descumpra estes termos ou coloque em risco o serviço ou outros usuários.",
      ],
    },
    {
      heading: "Propriedade intelectual",
      paragraphs: [
        "O MyTCFLab e todos os softwares, marcas e conteúdos relacionados pertencem ao MyTCFLab ou aos seus licenciadores. Concedemos a você um direito limitado, não exclusivo e intransferível de usar o serviço para o seu próprio estudo pessoal, sujeito a estes Termos.",
      ],
    },
    {
      heading: "Disponibilidade do serviço",
      paragraphs: [
        "Trabalhamos para manter o MyTCFLab confiável, mas não garantimos disponibilidade, acesso ininterrupto nem ausência de erros. Recursos, limites de uso e planos podem mudar ao longo do tempo à medida que aprimoramos o serviço.",
      ],
    },
    {
      heading: "Limitação de responsabilidade",
      paragraphs: [
        "Na medida permitida por lei, o MyTCFLab é fornecido “no estado em que se encontra”, sem garantias de qualquer tipo, e não nos responsabilizamos por danos indiretos, incidentais ou consequentes decorrentes do uso do serviço, incluindo resultados de exames ou perda de dados.",
      ],
    },
    {
      heading: "Alterações e contato",
      paragraphs: [
        "Podemos atualizar estes Termos de tempos em tempos. A data de vigência acima mostra quando eles foram alterados pela última vez, e continuar usando o serviço após uma atualização significa que você aceita os novos Termos.",
        `Dúvidas sobre estes Termos podem ser enviadas para ${LEGAL_SUPPORT_EMAIL}.`,
      ],
    },
  ],
};

const PRIVACY: LegalDocumentContent = {
  description: "O que o MyTCFLab coleta, como os dados são usados e como excluí-los.",
  sections: [
    {
      heading: "Visão geral",
      paragraphs: [
        "Esta política explica quais informações o MyTCFLab coleta, como as usamos e como as protegemos. Ao usar o MyTCFLab, você concorda com esta política.",
      ],
    },
    {
      heading: "O que coletamos",
      paragraphs: [
        "Coletamos informações da conta (como seu nome e e-mail, inclusive quando você entra com o Google), as redações e respostas que você escreve, as correções, traduções e exemplos de resposta gerados a partir delas, seu progresso nos exercícios e as mensagens e anexos que você envia ao suporte.",
        "Também coletamos dados operacionais básicos necessários para executar e proteger o serviço, como a atividade de login, o seu fuso horário e contadores de uso que aplicam os limites de uso justo.",
      ],
    },
    {
      heading: "Como usamos seus dados",
      paragraphs: [
        "Usamos seus dados para fornecer o produto, gerar comentários e análises com IA, manter as funcionalidades da conta, responder a pedidos de suporte, prevenir abusos e melhorar a confiabilidade. Não vendemos seus dados pessoais.",
      ],
    },
    {
      heading: "Prestadores de serviço e processamento por IA",
      paragraphs: [
        "Para prestar o serviço, o texto que você envia é processado por prestadores terceiros que atuam em nosso nome: Google (correções por IA, exemplos de resposta e tradução), Clerk (login e gerenciamento de contas), nossos provedores de hospedagem e banco de dados, HubSpot (pedidos de suporte) e Stripe (pagamentos, quando planos pagos são oferecidos).",
        "Esses prestadores recebem apenas o necessário para a sua função e processam os dados de acordo com os próprios termos.",
      ],
    },
    {
      heading: "Treinamento de modelos e uso do conteúdo",
      paragraphs: [
        "Não usamos intencionalmente suas redações privadas nem outros textos para treinar modelos do MyTCFLab. Provedores de IA terceiros só podem processar dados para fornecer o serviço solicitado, de acordo com os próprios termos.",
      ],
    },
    {
      heading: "Controles de acesso e segurança",
      paragraphs: [
        "Adotamos salvaguardas técnicas e organizacionais, como controles de acesso e transmissão criptografada. O acesso interno é limitado a pessoal autorizado quando necessário para suporte, segurança, conformidade legal ou prevenção de abusos.",
      ],
    },
    {
      heading: "Retenção e exclusão de dados",
      paragraphs: [
        "Suas redações, correções e seu progresso são mantidos enquanto sua conta estiver ativa. Você mesmo pode limpar o histórico de correções no aplicativo e solicitar a exclusão da sua conta e dos dados relacionados entrando em contato conosco. Os dados excluídos são removidos dos sistemas ativos em um prazo razoável e podem permanecer em backups por tempo limitado.",
        "Os registros operacionais são mantidos por um período curto, atualmente 30 dias, e depois removidos automaticamente.",
      ],
    },
    {
      heading: "Suas escolhas",
      paragraphs: [
        "Você pode pedir que acessemos, corrijamos, exportemos ou excluamos os dados pessoais que mantemos sobre você. Podemos precisar verificar sua identidade antes de atender a um pedido.",
      ],
    },
    {
      heading: "Alterações e contato",
      paragraphs: [
        "Podemos atualizar esta política de tempos em tempos. A data de vigência acima mostra quando ela foi alterada pela última vez.",
        `Dúvidas sobre privacidade e pedidos relativos aos seus dados podem ser enviados para ${LEGAL_SUPPORT_EMAIL}.`,
      ],
    },
  ],
};

const REFUND: LegalDocumentContent = {
  description: "Quando os planos pagos do MyTCFLab podem ser reembolsados.",
  sections: [
    {
      heading: "Visão geral",
      paragraphs: [
        "Oferecemos acesso de teste gratuito para que você possa avaliar o MyTCFLab antes de pagar. Se uma cobrança for realizada, esta política explica quando há reembolsos disponíveis.",
      ],
    },
    {
      heading: "Acesso de teste",
      paragraphs: [
        "O acesso de teste é gratuito e expira automaticamente conforme as condições de teste exibidas no cadastro. Nenhum pagamento é devido durante o teste, a menos que você escolha iniciar um plano pago.",
      ],
    },
    {
      heading: "Reembolso da primeira cobrança",
      paragraphs: [
        "Para a primeira cobrança de um usuário, oferecemos reembolso para pedidos feitos em até 14 dias corridos a partir da data da cobrança. Podemos recusar um reembolso se houver evidência clara de abuso, reembolsos repetidos ou consumo significativo do serviço após a compra.",
      ],
    },
    {
      heading: "Cobranças de renovação",
      paragraphs: [
        "As renovações de assinatura geralmente não são reembolsáveis depois de processadas. Para evitar cobranças de renovação, cancele antes da próxima data de cobrança nas configurações da sua conta.",
      ],
    },
    {
      heading: "Erros de cobrança e cobranças duplicadas",
      paragraphs: [
        "Faremos o reembolso integral de cobranças duplicadas verificadas, erros técnicos de cobrança e transações não autorizadas.",
      ],
    },
    {
      heading: "Como solicitar um reembolso",
      paragraphs: [
        `Envie um e-mail para ${LEGAL_SUPPORT_EMAIL} com o e-mail usado na compra, o comprovante do pedido e o motivo do pedido. Buscamos analisar os pedidos em até 2 dias úteis.`,
      ],
    },
    {
      heading: "Prazo de processamento do reembolso",
      paragraphs: [
        "Depois de aprovado, o reembolso é enviado imediatamente. Seu banco ou a operadora do cartão pode levar de 5 a 10 dias úteis para lançá-lo.",
      ],
    },
  ],
};

export const LEGAL_CONTENT_PT: LegalLocaleContent = {
  ui: {
    effectiveDate: "Data de vigência:",
    backToHome: "Voltar ao início",
    legalNavLabel: "Documentos legais",
    languageLabel: "Idioma:",
    translationNotice: {
      text: "Esta tradução é fornecida para sua conveniência. Se houver diferença em relação à versão em inglês, prevalece a versão em inglês.",
      linkLabel: "Ler a versão em inglês",
    },
  },
  documents: { terms: TERMS, privacy: PRIVACY, refund: REFUND },
};
