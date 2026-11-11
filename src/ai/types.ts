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

/** One page of a letter as a picture: a photo, a scan, or a PDF page that has no text in it. */
export interface PageImage {
  mimeType: 'image/jpeg' | 'image/png';
  /** The image file, base64-encoded. */
  data: string;
}

/**
 * A model that is shown a picture and answers in text, piece by piece.
 *
 * Like `Generate`, this is passed in, so transcription can be tested with a
 * recorded stream.
 */
export type Look = (prompt: string, image: PageImage) => AsyncIterable<string>;
