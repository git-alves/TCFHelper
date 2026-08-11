import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("joins a header and rows with CRLF row endings", () => {
    expect(toCsv(["Code", "Note"], [["TCF-AB12", "cohort"]])).toBe("Code,Note\r\nTCF-AB12,cohort\r\n");
  });

  it("quotes a field containing a comma", () => {
    expect(toCsv(["Note"], [["hello, world"]])).toBe('Note\r\n"hello, world"\r\n');
  });

  it("quotes a field and doubles interior quotes", () => {
    expect(toCsv(["Note"], [['say "hi"']])).toBe('Note\r\n"say ""hi"""\r\n');
  });

  it("quotes a field containing a newline", () => {
    expect(toCsv(["Note"], [["line one\nline two"]])).toBe('Note\r\n"line one\nline two"\r\n');
  });

  it("leaves a plain field unquoted", () => {
    expect(toCsv(["Note"], [["plain"]])).toBe("Note\r\nplain\r\n");
  });

  it("renders no rows as just the header", () => {
    expect(toCsv(["Code"], [])).toBe("Code\r\n");
  });

  it("neutralizes a leading formula-trigger character with a quote prefix", () => {
    expect(toCsv(["Name"], [["=1+1"]])).toBe("Name\r\n'=1+1\r\n");
    expect(toCsv(["Name"], [["+1+1"]])).toBe("Name\r\n'+1+1\r\n");
    expect(toCsv(["Name"], [["-1+1"]])).toBe("Name\r\n'-1+1\r\n");
    expect(toCsv(["Name"], [["@SUM(A1)"]])).toBe("Name\r\n'@SUM(A1)\r\n");
  });

  it("neutralizes a formula trigger hidden behind leading whitespace", () => {
    expect(toCsv(["Name"], [[" =cmd(1)"]])).toBe("Name\r\n' =cmd(1)\r\n");
    expect(toCsv(["Name"], [["\t=1+1"]])).toBe("Name\r\n'\t=1+1\r\n");
  });

  it("still quotes a neutralized field that also contains a comma", () => {
    expect(toCsv(["Name"], [["=A1, B1"]])).toBe('Name\r\n"\'=A1, B1"\r\n');
  });

  it("does not touch a value that merely contains a trigger character later on", () => {
    expect(toCsv(["Name"], [["Jane - Smith"]])).toBe("Name\r\nJane - Smith\r\n");
    expect(toCsv(["Name"], [["contact@example.com"]])).toBe("Name\r\ncontact@example.com\r\n");
  });
});
