# Letterkind

Official letters are hard to read: a tax notice, a medical bill, a shut-off
warning, a court summons. Letterkind reads the letter **on your device** with
Gemini Nano and tells you what it is, what it wants from you, how much, by when,
and who to call.

The letter itself never leaves the browser. The cloud is only ever told three
things — the kind of letter, the US state, and your language — and sends back a
template that is filled in locally.

Work in progress for the #BuildHybridAI hackathon. Built from scratch during the
contest period; the only earlier work was a throwaway feasibility probe that is
not part of this repository.

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
