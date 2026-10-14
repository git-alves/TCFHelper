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

describe("checkFrenchText", () => {
  it.each([
    ["a formal letter", FRENCH_FORMAL_LETTER],
    ["an argumentative essay", FRENCH_ARGUMENTATIVE],
    ["a draft full of grammar and spelling errors", FRENCH_WITH_MANY_ERRORS],
    ["French typed without accents", FRENCH_WITHOUT_ACCENTS],
    ["French with a typographic apostrophe", FRENCH_FORMAL_LETTER.replaceAll("'", "’")],
    ["French in capitals", FRENCH_FORMAL_LETTER.toUpperCase()],
  ])("accepts %s", (_label, text) => {
    expect(checkFrenchText(text)).toEqual({ ok: true });
  });

  it.each([
    ["English", ENGLISH],
    ["Spanish", SPANISH],
    ["Portuguese", PORTUGUESE],
    ["Italian", ITALIAN],
    ["German", GERMAN],
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
