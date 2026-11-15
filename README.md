# makefun-best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Kiowayyy2109/makefun-best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Kiowayyy2109/makefun-best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Aurora Harvest — a complete original arcade game: you are the keeper of the last lantern, catching falling star-shards and moon pearls under a living aurora sky while dodging void orbs. Combos multiply your score, power-ups (magnet, shield, slow time) turn the tide, levels deepen the night, and every fifth level brings an Eclipse Rush. Reach 1,000 points to restore the aurora before your lives run out. Pure canvas 2D, synthesized WebAudio sound, keyboard + mouse controls, no network requests, no assets — everything is drawn and sounded in code.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Move with ← → / A / D or the mouse. P pauses, M toggles sound, R restarts. The entry program (`main.ts`) copies `game/` and `screenshots/` to `/output` and writes `dossier.json`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=8b9bbsfs&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
