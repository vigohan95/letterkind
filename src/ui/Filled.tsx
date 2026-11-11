import { Fragment } from 'react';
import type { FieldName } from '../ai/extract';
import { fill, type Placeholder, type StandIn, type Values } from '../domain/template';

/** The colour a filled-in detail wears: the same as where it is marked in the letter. */
const FIELD: Record<Placeholder, FieldName> = {
  SENDER: 'sender',
  REFERENCE: 'reference',
  AMOUNT: 'amount',
  DEADLINE: 'deadline',
  DAYS_LEFT: 'deadline',
  PHONE: 'phone',
};

/** A detail that was checked against the letter, shown where a template left a gap for it. */
export function Detail({ placeholder, text }: { placeholder: Placeholder; text: string }) {
  return (
    <mark data-field={FIELD[placeholder]}>
      <bdi>{text}</bdi>
    </mark>
  );
}

export interface Filling {
  values: Values;
  standIns: Readonly<Record<StandIn, string>>;
}

/**
 * One piece of a template with its gaps filled. Everything is put on the
 * page as plain characters; nothing a model wrote is ever treated as markup.
 */
export function Filled({ text, values, standIns }: Filling & { text: string }) {
  return (
    <>
      {fill(text, values, standIns).map((piece, i) =>
        piece.kind === 'text' ? (
          <Fragment key={i}>{piece.text}</Fragment>
        ) : piece.kind === 'value' ? (
          <Detail key={i} placeholder={piece.placeholder} text={piece.text} />
        ) : (
          <span key={i} className="stand-in">
            {piece.text}
          </span>
        ),
      )}
    </>
  );
}
