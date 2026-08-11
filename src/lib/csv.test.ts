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
});
