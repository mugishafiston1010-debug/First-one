# Термин

A spaced-repetition trainer for Russian technical vocabulary, made for foreign
students who study engineering in Russian.

- 156 built-in terms in five decks: university life, mathematics, physics,
  chemistry, nuclear power.
- Two answer modes (flip the card, or type the answer) in both directions.
- SM-2 style scheduling: each grade sets the day the term comes back.
- Your own terms: add one at a time or paste a list from lecture notes.
- Progress, 14-day history, 7-day forecast, text backup and restore.

No build step and no server. Open `index.html` in a browser, or host the
folder on any static host. Progress is saved in the browser (`localStorage`).

## Tests

```
NODE_PATH=$(npm root -g) node --test termin/test/termin.test.cjs
```

Needs Playwright with Chromium.
