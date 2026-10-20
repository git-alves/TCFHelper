/**
 * The stages a learner actually works through in one practice session, in
 * the fixed order they are presented.
 *
 * Every authored exercise still carries one of six stage types, but a session
 * only uses these three: recognize the target move, build it from guided
 * prompts, then produce it without scaffolding. The other authored stages stay
 * in the question bank so the sequence can be widened again by editing this
 * list alone.
 *
 * Kept in its own module (no question-bank imports) because both the client
 * trainer and the server-side progress ledger need it.
 */
export type PracticeSessionStage = "recognize" | "complete" | "transform" | "organize" | "develop" | "produce";

export const PRACTICE_SESSION_STAGES: readonly PracticeSessionStage[] = ["recognize", "develop", "produce"];
