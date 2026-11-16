# Letterkind

Official letters are hard to read: a tax notice, a medical bill, a shut-off
warning, a court summons. Letterkind reads the letter **on your device** with
Gemini Nano and tells you what it is, what it wants from you, how much, by when,
and who to call. Then, if you ask, it explains that kind of letter and drafts a
reply in your language.

The letter itself never leaves the browser. The cloud is only ever told three
things — the kind of letter, the US state, and your language — and sends back a
template that is filled in on the device.

**Try it:** https://letterkind.web.app in desktop Chrome with the built-in model.
Three made-up sample letters are on the first screen. The interface is in
English, Spanish and Chinese (Simplified and Traditional); explanations and
replies come in twelve languages.

## Who it is for

People who get letters from US agencies, hospitals, landlords and courts in a
register they do not read easily: people who speak another language at home,
older people, anyone holding a letter that says "this is not a bill" next to an
amount due. The letters that matter most are the ones people are least willing
to paste into a chatbot, because they are full of names, account numbers and
amounts. Letterkind is built so they do not have to.

## What runs where

| Step | Where | What the model is given |
|---|---|---|
| Open a photo or PDF | Device: Nano reads the image; a PDF's own text is taken exactly | The page |
| Kind of letter (24 kinds) | Device: Nano, with keyword rules as a second opinion; if they disagree, the reader picks | The first page |
| Sender, number to quote, amount, deadline, phone | Device: Nano, then every answer is checked against the letter's own characters and the rules for that kind | The letter |
| Explanation of this kind of letter | Cloud: `gemini-3.5-flash-lite` | Kind, state, language |
| Draft reply | Cloud, same model | Kind, state, language |
| Glossary (tap a term) | Meanings written in this repository; Spanish ships with the app; other languages are translated in the cloud | One glossary entry, language |

The cloud's answers come back as templates with gaps. The gaps are filled on the
device from what was checked against the letter, and those words are
highlighted, so the reader can see which parts the cloud model never saw. Every
request that leaves is listed on the page under "What has left this device",
written down before it goes. Explanations are kept on the device and reused for
the next letter of the same kind, state and language.

A draft reply is something the reader signs, so it is held to more than an
explanation. It is thrown away if it tells the sender what the law requires, or
if it names a program, plan, fund, waiver or law at all: recording the demo, a
reply to an IRS CP2000 for a reader in Ohio asked about "the Ohio Tax Amnesty
program", which the model had no way to know exists or applies. The reply now
asks in general words whether any payment plan or relief is available, and the
checklist points to free legal aid or tax help for what applies in the state.

## Measured

Fifty made-up letters with labels written before any model saw them, five
fields each: 20 used while building, 20 written afterwards and held out, and
10 written after every check below and never used to change anything. A
*wrong* value is one the reader would be shown that does not match the letter.
Anyone can rerun both columns: [on the device](https://letterkind.web.app/eval.html)
and [in the cloud](https://letterkind.web.app/eval-cloud.html), or open the
runs this table comes from, letter by letter, in the same pages:
[device run](https://letterkind.web.app/eval.html?saved=nano-2026-11-15-d0d1eef),
[cloud run](https://letterkind.web.app/eval-cloud.html?saved=cloud-2026-11-15-d0d1eef).

| 250 field values | Nano on the device, after the app's checks | Same letters, whole, to the cloud model |
|---|---|---|
| Wrong values shown | **2** (the model alone: 20) | 0 (the model alone: 1) |
| Right | 205 | 211 |
| Missed (left blank, though the letter has an answer) | 7 | 2 |
| Correctly left blank | 36 | 37 |
| Kind of letter, model alone | 48 of 50 | 49 of 50 |
| Kind of letter, after the keyword second opinion | 48 right, 1 wrong, 1 put to the reader | 49 right, 0 wrong, 1 put to the reader |
| Median time to read one letter | 11.1 s | 1.3 s |

By group, on the device: 0 wrong values in the 100 of the development letters,
1 in the 100 of the held-out letters, 1 in the 50 of the letters written after
every check. The two wrong values: a parents' evening notice where Nano gave a
room number as the reference (letter 33), and the date on the Spanish jury
summons (letter 42). One right answer was lost to the checks (the sender of
letter 03).

What this says:

- **Reading on the device costs something, and it is measured.** Two more wrong
  values in 250 than the cloud, five more answers left blank, and about eight
  times the wait, on a machine with no graphics card. That is the price of the
  letter never leaving.
- **The checks are what make the device usable.** Nano alone gave 20 wrong
  values; checking each answer against the letter's own text, and the rules for
  each kind of letter, stopped 18 of them, at the cost of one right answer.
  Asking the same five questions of every letter, without the kind of letter
  deciding what is asked and checked, shows 21 wrong values even after the
  checks.

### How it got there

The first full measurement was on 40 letters (build `7993c7b`, 2026-11-14):
12 wrong values shown on the device in 200, 1 from the cloud model, 10.7 s
against 1.2 s a letter. Nano alone gave 20 wrong values; the checks then
stopped 8. Seven of the twelve were in the 20 development letters, five in the
20 held-out ones; an earlier run of the same letters (build `9565ad7`) showed
8, so a single device run is give or take a few. Each step below was written
after looking at the answers of that run.
- **What is still wrong.** Six of the twelve are in the three immigration letters
  (the agency's name, the receipt number, the appointment date); the others are
  three deadlines and three reference numbers. One homeowners' association
  letter was taken for a lease change: the keyword rules have nothing to say
  about that kind, so nothing questioned the model. The per-kind reading hint
  made no difference overall (12 wrong with it and without it), so the next work
  is on the immigration letters and on keyword coverage, not on longer prompts.
- **After that run: a check for reference numbers.** Half of the twelve were
  references that were in the letter but were not numbers to quote: a heading
  ("PERMISSION"), the reply-by date, the form's name ("I-797C") instead of the
  receipt number, a block of four lines. The reference is now also held back
  when it has no digits, is a date or is a form name, and a copied block is
  narrowed to the one labelled number inside it; the numbers the letter labels
  ("Receipt number: ...") are offered instead. Replaying the stored model
  answers from this run through the new check (`tests/unit/replay.test.ts`, no
  new model calls): **12 wrong values become 6**, one of them now right, and no
  value that was right before is lost, in any of the three stored runs. Honest
  caveat: three of the six (letters 23, 33, 37) are held-out letters, so for the
  reference field they now count as development letters; the device numbers in
  the table above are kept as they were measured until the next full run.
- **Then a check on what each date is for.** Four of the remaining six were
  real dates from the letter, but the wrong ones: the notice date at the top,
  the last day of a billing period on a letter that asks for no payment, the
  last day to ask for a postponement instead of the day to appear, the last day
  to give notice and move out instead of the day the new rent starts. Where the
  letter prints a label next to a date ("Notice date:", "Billing period: ... to",
  "Requests to postpone must be received by"), code reads it and holds that date
  back; it never swaps in a different date, it offers the others to pick from
  (`src/domain/dateContext.ts`). A test runs it over all 40 letters and checks
  that no labelled deadline is ever held back. Replayed the same way: the device
  run goes from **12 wrong values to 2**, the cloud run from 1 to 0, and nothing
  that was right is lost. The two left are the agency's name copied as a block of
  two or three letterhead lines ("Department of Homeland Security / U.S.
  Citizenship and Immigration Services"). Same caveat: letter 31 is held out,
  and for the deadline field it now counts as a development letter.
- **Then one name out of a copied letterhead.** When the sender comes back as
  several lines, code keeps one: address lines go, a line naming a part of the
  organisation ("National Benefits Center", "Credit and Collections") goes
  unless nothing else is left, and of what remains the last line is kept,
  because letterheads run from the parent body down to the agency the reader
  deals with (Department of the Treasury, then Internal Revenue Service). A
  name wrapped over two lines ("Office of the / County Clerk") stays whole
  (`verifySender` in `src/domain/verify.ts`). Replayed: the device run goes
  from **12 wrong values to 0**, and the earlier device run (`6e1c76c`) from 6
  to 0; nothing that was right is lost in any of the three runs. Zero on
  replay is not zero on the next run: these checks were written after looking
  at these answers, letter 37 is held out and for the sender field now counts
  as a development letter, and Nano answers differently each run. The fair
  measure is a fresh device run on letters written after these checks.
- **Then keyword coverage, including a vote for "none of these".** The keyword
  rules could only name one of the 24 known kinds, so a letter outside the
  list (the homeowners' association notice) had no second opinion and the
  model's lease-change guess went through. The rules can now also vote "other"
  for letters that clearly come from a homeowners', condominium or community
  association; the model's guess then meets a disagreement and the reader
  picks. The same pass fixed three near misses: a clinic bill that says an
  account *may later* go to a collection agency no longer counts towards the
  collector type, the "Notice of Action" printed on every USCIS form no longer
  counts towards a benefits notice, and a locked-card fraud alert is read as a
  bank notice. On the 40 letters the keyword rules now name the right kind for
  36 and the wrong kind for none (before: 30 and none); the 4 without an
  opinion are the Spanish letters, which the rules do not read by design.
  Replaying the stored type answers: the device run goes from **1 kind settled
  wrong to 0** (letter 39 is now put to the reader with the right kind on
  offer), and no kind that was settled right is lost in any of the three runs.
  Same caveat: letters 22, 37 and 39 are held out, and for the kind of letter
  they now count as development letters.

**Ten more letters, written after every check above.** Because those checks
were written after looking at stored answers, letters 41–50 were added on
2026-11-14, after the last of them, and nothing has been changed while looking
at how they are read: a water bill with a budget-plan figure and a late
amount, a jury summons and an explanation of benefits in Spanish, a benefits
cut with old and new amounts, a hospital statement with only numeric dates, a
collection letter with a settlement offer, a lease renewal whose sign-by date
comes before the new rent, a toll notice, a biometrics appointment printed
under a three-line letterhead, and a county pet licence that none of the named
kinds covers. The part of the app that needs no model can be measured on them
now: the keyword rules name the right kind for 6, the wrong kind for none, and
hold no opinion on 4 (the two Spanish letters by design; the lease renewal,
the toll notice and the pet licence because no kind leads clearly), so for
those the model's answer stands alone. On the device run in the table above
they are their own row: one wrong value shown in 50 (the model alone: 2).

**Two limits on the per-kind rules, from the first device run on all 50.**
That run (build `0aaced7`) showed two values the rules got wrong. On letter 31
the account is in credit ("$18.40 CR") and the letter says no payment is due,
but Nano gave $18.40 as the amount, the check found it in the letter, and it
was shown as an amount to pay. A figure the letter itself marks as a credit
("CR", or in brackets) is now held back wherever the figure would mean money
to pay, and the reader is told it is a credit. On letter 50 (the pet licence)
Nano took the letter for a benefits renewal, the keyword rules had no opinion,
and the rule for benefits renewals, which ask for no payment, hid the real
$20.00 fee. A kind that rests on one reader alone may no longer hide a value
that passed its check; only a kind the person chose, or one the model and the
keyword rules agree on, does. Replaying the three stored 40-letter runs through
both changes moves nothing, in either direction. Same caveat as above: letters
31 and 50 now count as development letters for the amount field. The next
device run (build `d0d1eef`, the table above) shows both fixed: letter 31's
credit is held back and letter 50's $20.00 fee is shown.

Both columns of the table are from build `d0d1eef`, run on 2026-11-15 in
Chrome 157 on Windows, 16 cores, no GPU (the browser reported Microsoft Basic
Render Driver). Nano does not answer the same way twice: the run before it
(`0aaced7`, same letters) also showed 2 wrong values: letter 42's date both
times, and letter 31's credit, which the change above has since fixed, where
this run has letter 33's room number instead.
The full results, letter by letter, are in `eval/results/`; either evaluation
page can show any of them (pick one under *Or look at a saved run*, or open a
downloaded file), with the tables recomputed from the letters by the current
scoring code.

## Testing it

- `npm test`: 995 unit tests, including the source boundary tests described
  below, the parsers, the checks, the template filling, the reply drafts and
  the evaluation scoring with recorded model answers. `npm run lint` and
  `npm run typecheck` run in CI on every push.
- In the browser: open https://letterkind.web.app, pick a sample letter, press
  *Read this letter*, then *Get the explanation* and *Draft a reply*. Open
  *What has left this device* to see exactly what was sent.
- The two evaluation pages above rerun the numbers.

## Built during the contest

Every commit in this repository was made during the contest, starting
2026-11-11. The only earlier work was a throwaway feasibility probe of Firebase
AI Logic's on-device mode, which is not part of this repository.

## Develop

```
npm install
npm run dev
npm test
npm run lint
```

Copy `.env.example` to `.env.local` and fill in the web config of a Firebase
project with Firebase AI Logic (Gemini Developer API) turned on.

## Where the page may connect

Reading a letter makes no network request. Two things limit what can happen
when an explanation is fetched:

- **In the code.** `src/outbound/channel.ts` is the only file that can reach a
  model outside the browser, and it accepts a closed set of requests: a kind of
  letter, a US state and a language, or one entry of Letterkind's own glossary
  and the language to put it into. Lint rules and
  `tests/unit/sourceBoundaries.test.ts` fail the build if any other file names
  a cloud-capable mode or opens a connection.
- **In the browser.** `firebase.json` serves the site with a content security
  policy that names the only hosts the page may talk to: itself, the Firebase
  AI Logic endpoint, Firebase App Check, and Google reCAPTCHA.
  `tests/unit/hosting.test.ts` pins that list. `npm run preview` serves the
  built app with the same headers.

Firebase App Check is what stops anyone who copies the public web config from
using the project's cloud model. It loads Google reCAPTCHA, which is third-party
traffic, so it is not started when the page opens: the outbound channel starts
it the first time a request is about to leave, and the page says so next to the
list of what has left the device. A request that the model in the browser can
answer never starts it.

The evaluation has a third page, `eval-cloud.html`, that does what the app
never does: it gives each of the evaluation set's made-up letters, whole, to the
cloud model, so that what reading on the device costs in accuracy and time is a
measured number rather than a guess. It lives in `src/evalcloud/`, has its own
Firebase instance, and is the one other file allowed to name a cloud mode.
`tests/unit/sourceBoundaries.test.ts` fails the build if the app or the
on-device evaluation imports it, if it touches the app's own Firebase
instances, or if it imports any of the app's input or interface code.

On `localhost` reCAPTCHA has no registered domain, so cloud requests are
refused unless a debug token registered in the Firebase console is put in
`.env.development.local` as `VITE_APPCHECK_DEBUG_TOKEN`. A production build
stops with an error if that variable is set.

## License

Apache-2.0. See [LICENSE](LICENSE).
