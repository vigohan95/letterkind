import type { AmountMeaning, DeadlineMeaning, LetterTypeId } from '../domain/letterTypes';
import type { RejectReason } from '../domain/template';
import type { Left, Ran } from '../outbound/ledger';
import type { OutboundRequest } from '../outbound/requests';

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

  guidance: {
    heading: 'What this means and what to do',
    intro:
      'Letterkind can fetch a plain explanation of this kind of letter, written by a larger model in the cloud. That model is told these three things and nothing else:',
    kind: 'Kind of letter',
    state: 'State',
    stateNotGiven: 'Not given',
    language: 'Language',
    nothingElse:
      'Your letter is not sent, and neither is any name, amount, date or number in it. The explanation comes back with gaps, and the gaps are filled in here from what was checked against your letter.',
    ask: 'Get the explanation',
    checking: 'Looking for an explanation already kept on this device…',
    asking: 'Asking for an explanation of this kind of letter…',
    what: 'What this letter is',
    steps: 'What to do',
    ifIgnored: 'If you do nothing',
    whoCanHelp: 'Who can help',
    legend: 'Highlighted words were put in on this device, from your letter. The model that wrote the rest never saw them.',
    standInLegend: 'Words in italics stand where your letter gave no detail that could be checked.',
    fromCloud: (model: string, ms: number, bytes: number) =>
      `Written by ${model} in the cloud in ${(ms / 1000).toFixed(1)} s. It was sent ${bytes.toLocaleString('en-US')} bytes, none of them from your letter. Kept on this device for next time.`,
    fromSaved: (day: string) => `Kept on this device since ${day}. Nothing was sent this time.`,
    fromDevice: 'Written by the on-device model, because the cloud could not be reached. It is not kept.',
    forget: 'Forget kept explanations',
    rejectedHeading: 'The explanation was thrown away',
    rejectedBody: 'An answer came back, but it broke one of Letterkind’s rules, so none of it is shown.',
    rejected: {
      not_json: () => 'It was not in the form that was asked for.',
      wrong_shape: () => 'It was not in the form that was asked for.',
      too_long: () => 'It was longer than allowed.',
      unknown_marker: (found: string) => `It left a gap Letterkind does not know how to fill (“${found}”).`,
      marker_not_allowed_here: (found: string) => `It left a gap (“${found}”) for a detail this kind of letter does not have.`,
      amount: (found: string) => `It contained an amount of its own (“${found}”). An amount may only come from your letter.`,
      date: (found: string) => `It contained a date of its own (“${found}”). A date may only come from your letter.`,
      phone: (found: string) => `It contained a phone number of its own (“${found}”). A phone number may only come from your letter.`,
      web_address: (found: string) => `It contained a web or e-mail address (“${found}”). Letterkind does not show addresses a model wrote.`,
      not_in_language: () =>
        'It was not written the way the language you chose is written — in other letters, or with the accents left off.',
    } satisfies Record<RejectReason, (found: string) => string>,
    askAgain: 'Ask again',
    unavailableHeading: 'No explanation could be fetched',
    unavailableBody:
      'The first explanation of each kind of letter needs a connection. What Letterkind read from your letter above was done on this device and is not affected.',
    unavailableLanguage: (language: string) => `An explanation in ${language} can only be written in the cloud.`,
  },

  ledger: {
    heading: 'What has left this device',
    nothing: 'Nothing has left this device.',
    sent: (n: number, bytes: number) =>
      `${n === 1 ? '1 request' : `${n} requests`} sent, ${bytes.toLocaleString('en-US')} bytes in all. None of it from a letter.`,
    attempted: (n: number) => (n === 1 ? '1 request was tried and brought nothing back.' : `${n} requests were tried and brought nothing back.`),
    stayed: (n: number) => (n === 1 ? '1 request was answered on this device.' : `${n} requests were answered on this device.`),
    note: 'Reading a letter is done by the model inside this browser and sends nothing. This list holds every request Letterkind made to a model outside it, word for word.',
    appCheck:
      'One more thing happens the first time a request goes out: Google reCAPTCHA is loaded on this page, so the server can tell the request comes from this app and not from a script. Letterkind passes it nothing from your letter. It is not loaded before that.',
    purpose: {
      explain: 'Explanation of a kind of letter',
      reply: 'Outline of a reply',
      term: 'Meaning of a term',
    } satisfies Record<OutboundRequest['purpose'], string>,
    left: {
      sent: 'Sent',
      attempted: 'Tried to send',
      stayed: 'Stayed on this device',
    } satisfies Record<Left, string>,
    ran: {
      cloud: 'answered in the cloud',
      device: 'answered on this device',
      nowhere: 'no answer',
    } satisfies Record<Ran, string>,
    term: 'Term',
    bytes: (n: number) => `${n.toLocaleString('en-US')} bytes`,
    words: 'The exact words that were sent',
    wordsNote:
      'These words are fixed in the app: anyone who picks the same kind of letter, state and language sends the same ones. A fixed description of the form the answer must take goes with them.',
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
