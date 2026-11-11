import type { AmountMeaning, DeadlineMeaning, LetterTypeId } from '../domain/letterTypes';

/**
 * Every word the interface shows, in English. Other languages provide the
 * same shape. Nothing in here is ever written by a model.
 */
export const en = {
  appName: 'Letterkind',
  tagline: 'Paste, photograph or open an official letter. It is read on this device and never leaves it.',
  notAdvice: 'Letterkind helps you read a letter. It is not legal, tax or medical advice.',

  device: {
    checking: 'Checking whether this browser can read letters on the device…',
    ready: 'On-device model ready. Your letter is read here, in this browser.',
    downloadable: 'This browser can read letters on the device, but has to download its model first (once).',
    downloading: 'Downloading the on-device model…',
    unavailable: 'This device cannot run the browser’s built-in model, so Letterkind cannot read a letter here.',
    unsupported: 'This browser has no built-in model. Letterkind needs a recent desktop Chrome to read a letter on the device.',
    download: 'Download the on-device model',
    downloadFailed: 'The model could not be prepared',
  },

  input: {
    label: 'The letter',
    placeholder: 'Paste the text of the letter here.',
    read: 'Read this letter',
    again: 'Read another letter',
    samples: 'Or try a made-up sample:',
    sampleNote: 'Sample letter. The sender, names and numbers are invented.',
    add: 'Open a photo or PDF',
    addNote: 'Photos and PDFs are opened in this browser. They are not uploaded.',
    noPictures:
      'The on-device model in this browser cannot look at pictures, so a photo or a scanned PDF cannot be read here. A PDF that contains its text still can.',
    unsupportedFile: (name: string) => `${name} is not something Letterkind can open. It opens photos (JPEG, PNG, WebP), PDFs and plain text files.`,
    leftOut: (n: number, read: number) =>
      n === 1
        ? `The last page was left out: Letterkind reads the first ${read} pages.`
        : `The last ${n} pages were left out: Letterkind reads the first ${read} pages.`,
    fromFile: 'This text was taken from your file, on this device, without a model. Check it, then read the letter.',
    fromPicture: (ms: number) =>
      `The on-device model copied this text from your picture in ${Math.round(ms / 1000)} seconds. Compare the amounts, dates and numbers with the letter itself and correct any mistake before going on: what Letterkind tells you next is checked against this text, not against the picture.`,
    unreadable: (n: number) =>
      n === 1
        ? 'The model marked one place as [unreadable]. Fill it in from the letter if it matters.'
        : `The model marked ${n} places as [unreadable]. Fill them in from the letter if they matter.`,
    pictureOf: (page: number) => `Page ${page} of your letter`,
  },

  progress: {
    classifying: 'Working out what kind of letter this is…',
    extracting: 'Finding what it asks of you…',
    opening: 'Opening the file…',
    transcribing: (page: number, pages: number) =>
      pages === 1 ? 'Copying out the text of the picture, on this device…' : `Copying out page ${page} of ${pages}, on this device…`,
    transcribingNote:
      'On a computer without a graphics chip this can take a minute or more for each page. The text appears as it is read, and you can correct it afterwards.',
    stop: 'Stop',
  },

  where: {
    onDevice: 'On device',
    seconds: (ms: number) => `${(ms / 1000).toFixed(1)} s`,
    line: (n: number) => `line ${n}`,
    lines: (ns: readonly number[]) => (ns.length === 1 ? `line ${ns[0]}` : `lines ${ns.join(', ')}`),
  },

  kind: {
    heading: 'What kind of letter this is',
    agreed: 'The on-device model and a keyword check both say so.',
    modelOnly: 'The on-device model says so. The keyword check had no opinion.',
    keywordsOnly: 'A keyword check says so. The on-device model gave no usable answer.',
    neither: 'Neither the on-device model nor the keyword check recognised this letter.',
    chosen: 'You chose this.',
    evidence: 'Phrases the keyword check went by:',
    choose: 'Two readings of this letter disagree',
    chooseBody:
      'What Letterkind shows next depends on the kind of letter, so it will not guess. Which one is it?',
    saidByModel: 'the on-device model',
    saidByKeywords: 'the keyword check',
    somethingElse: 'Something else',
  },

  field: {
    sender: 'Who it is from',
    reference: 'Number to quote',
    phone: 'Phone number to call',
    notStated: 'The letter does not seem to state one.',
    notInLetter: (claimed: string) =>
      `The on-device model answered “${claimed}”. That is not in the letter, so it is not shown as a fact.`,
    inTheLetter: 'What the letter does contain:',
    noAmount: 'This kind of letter does not ask you to pay anything.',
    noAmountWithheld:
      'The letter mentions amounts, but for this kind of letter none of them is a bill. No amount is shown.',
    noDeadline: 'This kind of letter sets no deadline for you.',
    noDeadlineWithheld:
      'The letter mentions dates, but for this kind of letter none of them is a deadline. No date is shown.',
  },

  amount: {
    amount_due: 'Amount to pay',
    proposed: 'Amount proposed (not yet owed)',
    claimed: 'Amount they say you owe',
    new_rent: 'New rent',
    fine: 'Fine',
    fee: 'Fee',
    none: 'Amount',
  } satisfies Record<AmountMeaning, string>,

  deadline: {
    pay: 'Pay by',
    respond: 'Reply by',
    appear: 'Be there on',
    dispute: 'Dispute by',
    appeal: 'Appeal by',
    enroll: 'Enrol by',
    renew: 'Renew by',
    takes_effect: 'Takes effect on',
    none: 'Deadline',
  } satisfies Record<DeadlineMeaning, string>,

  days: (n: number) =>
    n === 0
      ? 'That is today.'
      : n === 1
        ? 'That is tomorrow.'
        : n > 1
          ? `${n} days from today.`
          : n === -1
            ? 'That was yesterday.'
            : `That was ${-n} days ago.`,

  error: {
    heading: 'The letter could not be read',
    retry: 'Try again',
  },

  kinds: {
    tax_balance_due: 'Tax bill',
    tax_proposed_change: 'Proposed change to a tax return',
    tax_identity_verification: 'Tax identity check',
    tax_refund_or_information: 'Tax refund or information notice',
    medical_bill: 'Medical bill',
    insurance_eob: 'Explanation of Benefits (not a bill)',
    insurance_denial: 'Insurance denial',
    utility_bill: 'Utility bill',
    utility_shutoff: 'Utility shut-off warning',
    debt_collection: 'Debt collection letter',
    eviction_notice: 'Eviction notice',
    rent_increase_or_lease_change: 'Rent increase or lease change',
    court_summons_or_lawsuit: 'Court summons (you are being sued)',
    jury_summons: 'Jury duty summons',
    traffic_or_parking_ticket: 'Traffic or parking ticket',
    benefits_renewal: 'Benefits renewal',
    benefits_denial_or_reduction: 'Benefits denied, reduced or ended',
    immigration_appointment: 'Immigration appointment',
    immigration_request_for_evidence: 'Immigration request for evidence',
    school_notice: 'School notice',
    bank_or_credit_notice: 'Bank or credit notice',
    data_breach_notice: 'Data breach notice',
    vehicle_registration_or_recall: 'Vehicle registration or recall',
    other: 'Another kind of letter',
  } satisfies Record<LetterTypeId, string>,
};

export type Strings = typeof en;
