# Активная зона

Formula trainer for 2nd-year students of 14.05.02 «Атомные станции: проектирование,
эксплуатация и инжиниринг» (TPU, ИШЭ).

## Rooms (аудитории)

Математика, Физика, Химия, Механика: 55 key formulas of semesters 3–4. Each card has:

- **Запомнить**: a memory hook.
- **На АЭС**: where the formula is used at a nuclear plant.
- **Ловушка**: the typical exam mistake.

Each room also shows a study tip of the day. A self-check mode blurs the formulas until
you recall them.

## Games

| Game | How it works |
|---|---|
| Реактор | Mixed questions against a timer. Each mistake adds 0,34 β of reactivity; at ρ ≥ β the scram (АЗ) trips. Five right answers in a row insert rods and remove one mistake. Score in МВт·ч. |
| Верно или ловушка | 60 seconds: is the formula right, or does it hide a typical mistake? |
| Заполни пропуск | 10 formulas with a missing part. |
| Размерности | 10 quantities: pick the SI unit. |

Mistakes come back the next day (spaced repetition). A formula counts as «навсегда»
once it has survived a 21-day gap.

## Run

Open `index.html` in a browser (needs internet once for fonts and the
[Temml](https://temml.org) formula renderer). Progress is saved in the browser.

## Tests

```
npm i temml@0.13.5        # in any folder, e.g. a scratch dir
NODE_PATH=$(npm root -g):<that folder>/node_modules node --test active-zone/test/
```

Needs Playwright with Chromium.

## Content note

The topics follow the standard 14.05.02 curriculum (semester 3: multiple integrals,
series, ODEs, electricity and magnetism, chemical thermodynamics and kinetics, statics,
kinematics and dynamics; semester 4: Fourier series, complex analysis, probability, optics,
quantum and nuclear physics, analytical mechanics, strength of materials). Check the
semester tags against the TPU plan for your intake year at up.tpu.ru, and edit the `s`
field of a card in `index.html` if a topic falls in a different semester.
