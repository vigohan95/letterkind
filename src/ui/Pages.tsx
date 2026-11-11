import type { Strings } from '../i18n/en';

/** The pictures of the letter the reader gave, so the copied text can be compared with them. */
export function PagePictures({ previews, t }: { previews: readonly string[]; t: Strings }) {
  if (previews.length === 0) return null;
  return (
    <div className="pictures">
      {previews.map((url, i) => (
        <img key={url} src={url} alt={t.input.pictureOf(i + 1)} />
      ))}
    </div>
  );
}

interface TranscribingProps {
  previews: readonly string[];
  /** The page being copied now, counted from 1, out of `pages`. */
  page: number;
  pages: number;
  /** Everything copied so far. */
  text: string;
  t: Strings;
}

/** A picture being copied out: the picture on one side, the text on the other as it arrives. */
export function Transcribing({ previews, page, pages, text, t }: TranscribingProps) {
  return (
    <div className="reading">
      <PagePictures previews={previews} t={t} />
      <div className="facts">
        <p className="working" role="status">
          {t.progress.transcribing(page, pages)}
        </p>
        <p className="hint">{t.progress.transcribingNote}</p>
        {text !== '' && <pre className="transcript">{text}</pre>}
      </div>
    </div>
  );
}
