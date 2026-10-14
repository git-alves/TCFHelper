import { describe, expect, it } from "vitest";
import { checkFrenchText } from "./french-text-check";

const FRENCH_FORMAL_LETTER =
  "Madame, Monsieur, je me permets de vous écrire afin de vous signaler un problème qui concerne notre immeuble. " +
  "Depuis plusieurs semaines, l'ascenseur ne fonctionne plus et les personnes âgées ont beaucoup de difficultés pour monter chez elles. " +
  "Je vous demande donc de bien vouloir faire intervenir un technicien dans les meilleurs délais. " +
  "Dans l'attente de votre réponse, veuillez agréer, Madame, Monsieur, mes salutations distinguées.";

const FRENCH_ARGUMENTATIVE =
  "Selon moi, le télétravail présente à la fois des avantages et des inconvénients qu'il faut peser avec soin. " +
  "D'un côté, il permet aux salariés de gagner du temps et de mieux organiser leur journée. " +
  "De l'autre, il risque d'isoler les employés et de rendre la communication plus difficile au sein des équipes. " +
  "En conclusion, je pense que la meilleure solution reste un équilibre entre le travail à distance et la présence au bureau.";

// A weak, error-filled draft is still French and must reach the corrector.
const FRENCH_WITH_MANY_ERRORS =
  "Bonjour Marie, je suis tres content de te ecrire. Hier je suis alle a le cinema avec mes amis et nous avons vu un film " +
  "tres interessant. Le film etait long mais les acteurs sont bon. Je voudrais que tu vient avec nous la semaine prochain " +
  "parce que il y a un autre film qui est sortie et je pense que tu va aimer.";

const FRENCH_WITHOUT_ACCENTS =
  "Je ne suis pas d'accord avec cette idee parce que les jeunes ont besoin de temps pour apprendre et que les parents " +
  "doivent etre presents dans la vie de leurs enfants. C'est pour cela que je pense que le gouvernement doit aider les familles.";

const ENGLISH =
  "I am writing to complain about the service that I received at your restaurant last weekend. The food was cold and the " +
  "waiter was rude to us, which is not what we expected from a place with such a good reputation. I would like to have my money back.";

const SPANISH =
  "Estoy escribiendo para quejarme del servicio que recibí en su restaurante el fin de semana pasado. La comida estaba fría y " +
  "el camarero fue muy grosero con nosotros, lo que no esperábamos de un lugar con tan buena reputación. Quiero que me devuelvan el dinero.";

const PORTUGUESE =
  "Estou escrevendo para reclamar do serviço que recebi no seu restaurante no fim de semana passado. A comida estava fria e o " +
  "garçom foi muito grosseiro conosco, o que não esperávamos de um lugar com uma reputação tão boa. Quero que devolvam o meu dinheiro.";

const ITALIAN =
  "Le scrivo per lamentarmi del servizio che ho ricevuto nel vostro ristorante lo scorso fine settimana. Il cibo era freddo e il " +
  "cameriere è stato molto scortese con noi, cosa che non ci aspettavamo da un locale con una reputazione così buona. Vorrei il rimborso.";

const GERMAN =
  "Ich schreibe Ihnen, um mich über den Service zu beschweren, den ich letztes Wochenende in Ihrem Restaurant erhalten habe. " +
  "Das Essen war kalt und der Kellner war sehr unhöflich zu uns, was wir von einem Lokal mit einem so guten Ruf nicht erwartet hatten.";

const FRENCH_WITH_NAMES_AND_URLS =
  "Bonjour Madame Dupont, je m'appelle Giovanni Bartolomeo et je travaille chez Zanetti Consulting à Montréal. " +
  "Vous pouvez consulter notre projet sur https://www.zanetti-consulting.example/projets/2024 ou écrire à giovanni@zanetti.example. " +
  "Nous avons rencontré Pedro Álvarez et Chiara Rossi la semaine dernière pour discuter du contrat avec la société Nakamura.";

// A Portuguese speaker writing French: many Portuguese words slip in, but the
// text is still an attempt at French and must reach the corrector.
const FRENCH_MIXED_WITH_PORTUGUESE =
  "Bonjour, je suis muito content de vous écrire para parler de mon projet. Je vais travailler dans une empresa que est " +
  "très importante et je veux aussi trabalhar avec des personnes qui parlent français parce que je gosto de cette langue. " +
  "Nous avons déjà une reunião la semaine prochaine et je pense que tout va bien se passer.";

const DUTCH =
  "Ik schrijf u om te klagen over de service die ik afgelopen weekend in uw restaurant heb gekregen. Het eten was koud en de ober " +
  "was erg onbeleefd tegen ons, wat we niet hadden verwacht van een plek met zo'n goede reputatie. Ik wil graag mijn geld terug.";

// Builds a Latin-script text of exactly `total` tokens, with `counts` of each
// listed word and the rest filler that is in no language's list, so the
// shares are exact and the thresholds can be probed at their edges.
function textWith(total: number, counts: Record<string, number>): string {
  const words: string[] = [];
  for (const [word, count] of Object.entries(counts)) words.push(...Array(count).fill(word));
  while (words.length < total) words.push("xyzzy");
  return words.join(" ");
}

describe("checkFrenchText", () => {
  it.each([
    ["a formal letter", FRENCH_FORMAL_LETTER],
    ["an argumentative essay", FRENCH_ARGUMENTATIVE],
    ["a draft full of grammar and spelling errors", FRENCH_WITH_MANY_ERRORS],
    ["French typed without accents", FRENCH_WITHOUT_ACCENTS],
    ["French with a typographic apostrophe", FRENCH_FORMAL_LETTER.replaceAll("'", "’")],
    ["French in capitals", FRENCH_FORMAL_LETTER.toUpperCase()],
    ["French full of names, a URL and an email address", FRENCH_WITH_NAMES_AND_URLS],
    ["French with many words from the learner's native language", FRENCH_MIXED_WITH_PORTUGUESE],
  ])("accepts %s", (_label, text) => {
    expect(checkFrenchText(text)).toEqual({ ok: true });
  });

  it.each([
    ["English", ENGLISH],
    ["Spanish", SPANISH],
    ["Portuguese", PORTUGUESE],
    ["Italian", ITALIAN],
    ["German", GERMAN],
    ["Dutch", DUTCH],
  ])("rejects %s as the wrong language", (_label, text) => {
    expect(checkFrenchText(text)).toEqual({ ok: false, reason: "language" });
  });

  it.each([
    ["Cyrillic", "Я пишу вам, чтобы пожаловаться на обслуживание, которое я получил в вашем ресторане на прошлых выходных."],
    ["Chinese", "我写信是想投诉上周末在贵餐厅所受到的服务。食物是冷的，服务员对我们非常无礼。"],
    ["Arabic", "أكتب إليكم لأشتكي من الخدمة التي تلقيتها في مطعمكم في نهاية الأسبوع الماضي."],
    ["only digits and symbols", "1234 5678 !!! ??? ### 9999 ---- ==== 0000"],
  ])("rejects %s as an unrecognized script", (_label, text) => {
    expect(checkFrenchText(text)).toEqual({ ok: false, reason: "script" });
  });

  it("rejects keyboard mashing made of Latin letters", () => {
    expect(checkFrenchText("asdf qwer zxcv uiop hjkl bnm asdf qwer zxcv uiop hjkl bnm asdf qwer zxcv")).toEqual({
      ok: false,
      reason: "language",
    });
  });

  it("rejects one repeated French function word used as filler", () => {
    expect(checkFrenchText(Array(80).fill("le").join(" "))).toEqual({ ok: false, reason: "language" });
  });

  it("rejects an English text that merely sprinkles in a few French words", () => {
    const mostlyEnglish = `${ENGLISH} Merci beaucoup, bonjour et au revoir.`;
    expect(checkFrenchText(mostlyEnglish)).toEqual({ ok: false, reason: "language" });
  });

  it("rejects empty and whitespace-only text", () => {
    expect(checkFrenchText("")).toEqual({ ok: false, reason: "script" });
    expect(checkFrenchText("   \n\t ")).toEqual({ ok: false, reason: "script" });
  });

  it("accepts French that quotes a short English phrase", () => {
    const quoted = `${FRENCH_ARGUMENTATIVE} Comme on dit en anglais : "work from home".`;
    expect(checkFrenchText(quoted)).toEqual({ ok: true });
  });
});

// The thresholds are the whole policy: the gate is deliberately conservative,
// so each edge is pinned. A "cleanup" that tightens one would start rejecting
// genuine learner French and must fail here first.
describe("checkFrenchText thresholds", () => {
  // French function words used below, all in the French list and in no
  // competing list: les, des, dans, pour, avec, sans.
  const FRENCH_MARKERS = ["les", "des", "dans", "pour", "avec", "sans"];

  describe("almost no French (under 5% of tokens, or under 3 distinct markers)", () => {
    it("allows exactly 5% French words when they include 3 distinct markers", () => {
      // 5/100 = 0.05 is not below the threshold.
      expect(checkFrenchText(textWith(100, { les: 2, des: 2, dans: 1 }))).toEqual({ ok: true });
    });

    it("rejects just under 5% French words", () => {
      expect(checkFrenchText(textWith(100, { les: 2, des: 1, dans: 1 }))).toEqual({ ok: false, reason: "language" });
    });

    it("rejects 2 distinct markers even at 5%: that is too little variety to be French", () => {
      expect(checkFrenchText(textWith(100, { les: 3, des: 2 }))).toEqual({ ok: false, reason: "language" });
    });

    it("allows exactly 3 distinct markers once the share is above 5%", () => {
      expect(checkFrenchText(textWith(100, { les: 4, des: 3, dans: 2 }))).toEqual({ ok: true });
    });

    it("rejects 2 distinct markers repeated far past 5%, which is filler rather than French", () => {
      expect(checkFrenchText(textWith(100, { les: 20, des: 20 }))).toEqual({ ok: false, reason: "language" });
    });

    it("rejects low density together with fewer than 3 distinct markers", () => {
      expect(checkFrenchText(textWith(100, { les: 1 }))).toEqual({ ok: false, reason: "language" });
    });
  });

  describe("another language clearly dominating", () => {
    // 10 French words across 5 markers is a 0.10 share, enough to pass on its own.
    const french = { les: 2, des: 2, dans: 2, pour: 2, avec: 2 };

    it("rejects a competitor at exactly 20% that outweighs French by more than 1.3x", () => {
      expect(checkFrenchText(textWith(100, { ...french, the: 20 }))).toEqual({ ok: false, reason: "language" });
    });

    it("allows a competitor just under 20%, however large the ratio", () => {
      expect(checkFrenchText(textWith(100, { ...french, the: 19 }))).toEqual({ ok: true });
    });

    it("allows a competitor at exactly 1.3x the French share, and rejects just above it", () => {
      const strongFrench = { les: 4, des: 4, dans: 4, pour: 4, avec: 4 }; // 0.20
      expect(checkFrenchText(textWith(100, { ...strongFrench, the: 26 }))).toEqual({ ok: true }); // 0.26 = 0.20 x 1.3
      expect(checkFrenchText(textWith(100, { ...strongFrench, the: 27 }))).toEqual({ ok: false, reason: "language" });
    });

    it("allows French that merely shares function words with Spanish, Portuguese or Italian", () => {
      const shared = { de: 10, la: 8, que: 4, en: 4, un: 4, les: 4, des: 4, pour: 4, dans: 4 };
      expect(checkFrenchText(textWith(100, shared))).toEqual({ ok: true });
    });
  });

  it("does not hard-block on the markers list alone: every listed marker is accepted as French evidence", () => {
    const text = textWith(100, Object.fromEntries(FRENCH_MARKERS.map((word) => [word, 3])));
    expect(checkFrenchText(text)).toEqual({ ok: true });
  });
});
