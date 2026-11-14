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

## Measured

Forty made-up letters with labels written before any model saw them (20 used
while building, 20 written afterwards and held out), five fields each. A
*wrong* value is one the reader would be shown that does not match the letter.
Anyone can rerun both columns: [on the device](https://letterkind.web.app/eval.html)
and [in the cloud](https://letterkind.web.app/eval-cloud.html).

| 200 field values | Nano on the device, after the app's checks | Same letters, whole, to the cloud model |
|---|---|---|
| Wrong values shown | **12** (the model alone: 20) | 1 |
| Right | 159 | 167 |
| Left blank (correctly or not) | 29 | 32 |
| Kind of letter, model alone | 39 of 40 | 39 of 40 |
| Kind of letter, after the keyword second opinion | 39 right, 1 wrong | 39 right, 0 wrong, 1 put to the reader |
| Median time to read one letter | 10.7 s | 1.2 s |

What this says:

- **Reading on the device costs something, and it is measured.** Eleven more
  wrong values in 200 than the cloud, and about nine times the wait, on a
  machine with no graphics card. That is the price of the letter never leaving.
  Nano does not answer the same way twice: an earlier run of the same 40 letters
  (build `9565ad7`) showed 8 wrong values, so read the device column as give or
  take a few.
- **The checks are what make the device usable.** Nano alone put 20 wrong values
  on the screen; checking each answer against the letter's own text, and the
  rules for each kind of letter, stopped 8 of them. Asking the same five
  questions of every letter, without the kind of letter deciding what is asked
  and checked, shows 19 even after the checks.
- **It holds on letters written after the prompts were fixed.** Seven wrong
  values in the 20 development letters, five in the 20 held-out ones.
- **What is still wrong.** Six of the twelve are in the three immigration letters
  (the agency's name, the receipt number, the appointment date); the others are
  three deadlines and three reference numbers. One homeowners' association
  letter was taken for a lease change: the keyword rules have nothing to say
  about that kind, so nothing questioned the model. The per-kind reading hint
  made no difference overall (12 wrong with it and without it), so the next work
  is on the immigration letters and on keyword coverage, not on longer prompts.

Both columns are from build `7993c7b`, run on 2026-11-14 in Chrome 157 on
Windows, 16 cores, no GPU (the browser reported Microsoft Basic Render Driver).
The full results, letter by letter, are in `eval/results/`.

## Testing it

- `npm test`: 822 unit tests, including the source boundary tests described
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
