// Hand-written declarations for difficulties.js (kept as plain JS so the
// seed script can use it from Node without a build step). The type guard is
// what lets TypeScript narrow `string | undefined` query params.
export declare const DIFFICULTIES: readonly ['medium', 'expert', 'hell'];
export type Difficulty = (typeof DIFFICULTIES)[number];
export declare function isDifficulty(value: unknown): value is Difficulty;
