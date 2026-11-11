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

## License

Apache-2.0. See [LICENSE](LICENSE).
