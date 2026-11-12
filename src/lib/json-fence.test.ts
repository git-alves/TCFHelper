import { describe, expect, it } from "vitest";
import { unwrapJsonFence } from "./json-fence";

const JSON_TEXT = '{"correctedText":"ok","errors":[]}';

describe("unwrapJsonFence", () => {
  it.each([
    ["a ```json block", "```json\n" + JSON_TEXT + "\n```"],
    ["a plain ``` block", "```\n" + JSON_TEXT + "\n```"],
    ["an uppercase JSON tag", "```JSON\n" + JSON_TEXT + "\n```"],
    ["surrounding whitespace", "  \n```json\n" + JSON_TEXT + "\n```\n  "],
    ["Windows line endings", "```json\r\n" + JSON_TEXT + "\r\n```"],
    ["a fence on one line", "```json " + JSON_TEXT + " ```"],
    ["a fence with no newline after the tag", "```json" + JSON_TEXT + "```"],
    ["a pretty-printed object", "```json\n{\n  \"a\": 1,\n  \"b\": [1, 2]\n}\n```"],
  ])("unwraps %s", (_label, input) => {
    const out = unwrapJsonFence(input);

    expect(out.startsWith("{")).toBe(true);
    expect(out.endsWith("}")).toBe(true);
    expect(() => JSON.parse(out)).not.toThrow();
  });

  it("returns bare JSON untouched", () => {
    expect(unwrapJsonFence(JSON_TEXT)).toBe(JSON_TEXT);
  });

  it.each([
    ["prose before the fence", "Here is the result:\n```json\n" + JSON_TEXT + "\n```"],
    ["prose after the fence", "```json\n" + JSON_TEXT + "\n```\nHope this helps!"],
    ["prose with no fence", "I cannot provide a JSON response."],
    ["a fence with no closing", "```json\n" + JSON_TEXT],
    ["two fenced blocks with prose between", "```json\n{}\n```\nand\n```json\n{}\n```"],
    ["an empty reply", ""],
  ])("leaves %s alone, so the caller still rejects it", (_label, input) => {
    expect(unwrapJsonFence(input)).toBe(input);
  });

  it("does not make prose inside a fence look like JSON", () => {
    const out = unwrapJsonFence("```json\nSure! Here is my assessment.\n```");

    expect(out).toBe("Sure! Here is my assessment.");
    expect(out.trimStart().startsWith("{")).toBe(false);
  });
});
