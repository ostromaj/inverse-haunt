# Inverse Haunt 👻

A first-person haunted-house maze for IB Math Applications & Interpretation SL. Students creep through dark corridors with a flashlight, grab keys, and reach the door while ghosts hunt them. When one catches them, they have to solve its inverse-function problem to destroy it.

Controls: W/S walk, A/D sidestep, mouse (click to lock) or arrow keys to turn, M toggles the map. On touch screens, drag the left half to walk and the right half to turn.

**Play:** https://ostromaj.github.io/inverse-haunt/
**Teacher answer key (samples of every question type):** https://ostromaj.github.io/inverse-haunt/bank.html

## Topics covered
- Function notation: evaluating f(a) from formulas and mapping diagrams
- Points on inverses: (a, b) on f means (b, a) on f⁻¹; tables, mapping diagrams, clicking points on a grid
- One-to-one functions and "is there an inverse?": horizontal line test, restricted domains
- Domain and range of inverses: they swap, including the flip for negative slopes
- Finding inverses: linear, quadratic on a restricted domain, rational, exponential/log, self-inverse functions
- Graphs of inverses: reflection in y = x, intercepts trading axes

## How it plays (about 20–30 minutes)
| Floor | Question levels | Monsters |
|---|---|---|
| 1. The Cellar | Level 1 (diagrams, notation) | 2 |
| 2. The Kitchen | Levels 1–2 | 3 |
| 3. The Library | Levels 2–3 | 4 |
| 4. The Nursery | Levels 3–4 | 5 |
| 5. The Attic | Mostly level 4, door has 3 seals | 6 |

- Right answer: the monster is destroyed. Wrong answer: a candle (life) goes out and the correct answer and explanation are shown.
- Lose all 5 candles and the floor restarts.
- Ghosts hunt you: idle ones wake up over time and when you grab keys. Your flashlight slows them down; they move faster when you aren't looking. A hunting ghost lets out a sustained high-pitched wail that gets louder, higher and more frantic as it closes in (panned left/right so you can tell which way it's coming from), plus static, a red haze and a heartbeat. Getting caught triggers a loud shriek.
- Batteries recharge the flashlight.
- **Every catch is a jumpscare** (the monster's own face, full screen, with a shriek). A few extra random scares happen while exploring. **Scaredy-cat mode** turns them all off and makes the monsters cute.
- Monsters: **the Grinner** moves like a broken puppet: it freezes, then lurches forward in bursts with its head snapping to new angles and its joints cracking. Shine your light on it and it locks up and twitches. **The Shade** is a hunched shadow that is mostly mouth.
- **Room codes:** everyone who types the same code gets the same house and the same questions, so a class can race (highest score wins, time breaks ties).
- Teachers can add `?teacher=1` to the URL to start on any floor.

## Math correctness
Every question is generated from plain-text formulas that are parsed by the same engine students' answers are checked with, so what students see is exactly what gets graded.

`test/verify.js` builds thousands of versions of every question type and re-solves each one numerically (root-finding, sampling, horizontal-line checks), never trusting the generator's own formulas. It also checks that the answer checker accepts equivalent forms (e.g. `(x-3)/2`, `x/2 - 1.5`, `0.5x-1.5`) and rejects wrong ones.

```
node test/verify.js        # 3000 versions per question type
```

Last run: 709,771 checks, 0 failures.

## Files
- `index.html`, `css/style.css`, `js/game.js` — the game
- `js/questions.js` — question generators
- `js/mathcore.js` — expression parser, answer checker, seeded random numbers
- `js/render.js` — mapping diagrams, tables and graphs
- `js/audio.js` — synthesized sound effects (no audio files)
- `bank.html` — teacher answer key
