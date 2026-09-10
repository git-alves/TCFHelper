declare module "nspell" {
  interface Dictionary {
    aff: Uint8Array;
    dic: Uint8Array;
  }

  interface NSpell {
    correct(word: string): boolean;
    suggest(word: string): string[];
  }

  function nspell(dictionary: Dictionary): NSpell;
  export default nspell;
}
