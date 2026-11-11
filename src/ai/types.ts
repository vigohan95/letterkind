/** One answer from a model, and how long it took. */
export interface Generation {
  text: string;
  ms: number;
}

/**
 * A model reduced to the one thing the reading steps need from it.
 *
 * The steps take this as a parameter, so they can be tested with a recorded
 * answer and never construct a model themselves.
 */
export type Generate = (prompt: string) => Promise<Generation>;
