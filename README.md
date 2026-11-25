# Flag Guessr

An ad-free web app for learning world flags, country locations, and capitals.

**Live App:** [https://flagguessr.aaronmanprojects.com](https://flagguessr.aaronmanprojects.com)

## Features

- **Today's Daily Challenge:** 5 deterministic countries per day (same countries for everyone each day) backed by a SQLite database (`data/daily.sqlite`) with live player comparison stats, 0–10 score distribution chart, Top 5 daily leaderboard, and optional custom player names (defaults to `user1`, `user2`, …, `userX`).
- **Mixed Mode (Default):** Randomly alternates between **Flag → Country Name** (4 choices) and **Country Name → Flag** (2×2 grid).
- **Type-In Mode:** Flag-only challenge with live spelling autocomplete (e.g., typing `H` filters to `Haiti`, `Honduras`, `Hungary`).
- **3D Orthographic Globe Reveal:** Smooth 1.75s zoom animation using `d3-geo`, `versor`, and `world-atlas` (50m resolution) that spins to the continent, zooms in, and highlights the target country (with microstate beacons for tiny countries/islands), then docks above the capital quiz so you can drag and explore.
- **Capital Multiple Choice:** Immediately tests the country's capital with regional distractors after the globe reveal.
- **Flexible Lengths & Regions:** Play `10`, `20`, `30`, or `All` (197) countries across the entire world or a specific continent.
- **Per-Category Stats:** Tracks best scores, flag & capital accuracy, and streaks for Today's Daily and every `(Mode × Region × Length)` Practice category.

## Local Development

```bash
npm install
npm run dev
```

Build and run production server (includes SQLite Daily Challenge API):

```bash
npm run build
npm start
```
