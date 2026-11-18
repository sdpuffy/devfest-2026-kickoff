<p align="center">
  <img src="docs/banner.svg" alt="Athleet: train like your favorite athlete" width="100%">
</p>

<p align="center">
  <a href="https://bloxxyis.github.io/devfest-2026-kickoff---harlem-globesluggers/"><b>Live demo</b></a> ·
  <a href="#features">Features</a> ·
  <a href="#getting-started">Getting started</a> ·
  <a href="#team">Team</a>
</p>

<p align="center">
  <a href="https://github.com/bloxxyis/devfest-2026-kickoff---harlem-globesluggers/actions/workflows/deploy-pages.yml"><img src="https://github.com/bloxxyis/devfest-2026-kickoff---harlem-globesluggers/actions/workflows/deploy-pages.yml/badge.svg" alt="Deploy status"></a>
  <img src="https://img.shields.io/badge/Expo-SDK%2058-000020?logo=expo&logoColor=white" alt="Expo SDK 58">
  <img src="https://img.shields.io/badge/React%20Native-0.88-61dafb?logo=react&logoColor=black" alt="React Native 0.88">
  <img src="https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/platforms-iOS%20%7C%20Android%20%7C%20Web-ffda62" alt="iOS, Android and Web">
</p>

---

**Athleet** matches you with a coach modeled on a star athlete, then builds everything around
you: a weekly training plan, guided workouts with rest timers, a meal plan that fits your diet
and budget, and a coach you can chat with. One codebase runs on iPhone, Android and the web.

Built by **Harlem Globesluggers** at the DevFest 2026 kickoff hackathon.

## Features

- **Find your coach.** A short questionnaire (age, body stats, goal, schedule) ranks seven
  coaches by how well they fit you.
- **A plan that's yours.** Training days, session length, warm-ups, cool-downs and exercise
  notes are tailored to your answers. Don't like it? Generate a new variation.
- **Guided workouts.** Log sets, reps and weight, follow the rest timer, and watch an animated
  movement demo. Your coach cheers you on, out loud.
- **Meals that fit.** A weekly meal plan built on your nutrition targets, with dietary
  restrictions, a weekly budget, prep-ahead tips and a grocery list.
- **Stay on track.** Workout calendar, weekly recap and a streak badge.
- **Make it yours.** Themes (dark, dimmed, OLED, light, high contrast), accent colors,
  text size, big workout mode, reduced motion, colorblind-friendly status colors and more.

<!-- Screenshots: drop images in docs/screenshots/ and uncomment.
<p align="center">
  <img src="docs/screenshots/coach.png" width="24%">
  <img src="docs/screenshots/plan.png" width="24%">
  <img src="docs/screenshots/workout.png" width="24%">
  <img src="docs/screenshots/meals.png" width="24%">
</p>
-->

## The coaches

| | Coach | Style | Best for |
| --- | --- | --- | --- |
| 🏀 | Coach Atlas | *Train for the long game.* | Athleticism, longevity, older athletes |
| 💪 | Coach Ironside | *Heavy weight, high volume, no excuses.* | Building mass, classic bodybuilding |
| ⚡ | Coach Blaze | *Fast is a skill. Let's practice it.* | Speed, explosiveness, vertical jump |
| ⚽ | Coach Vanguard | *Discipline every day. Mix it up.* | Soccer fitness, getting lean, conditioning |
| 🎾 | Coach Rally | *Power you can repeat for three sets.* | Lower-body power, joint health, new to strength |
| 🥋 | Coach Strike | *From cardio to strength, one kick at a time.* | Leg and glute strength, martial arts basics |
| 🏋️ | Coach Anvil | *Simple, hard, consistent.* | General gym-goers, getting lean and strong |

> All coaches are original, fan-made characters built around common training styles.
> They aren't based on, affiliated with, or endorsed by any real athlete.

## Getting started

You'll need [Node.js](https://nodejs.org) 22 or newer.

```bash
git clone https://github.com/bloxxyis/devfest-2026-kickoff---harlem-globesluggers.git
cd devfest-2026-kickoff---harlem-globesluggers/athleet
npm install
npx expo start
```

Then press **w** for the web, or scan the QR code with [Expo Go](https://expo.dev/go) on your
phone.

**Optional: custom coach voices.** Copy `athleet/.env.example` to `athleet/.env` and add an
ElevenLabs API key. Without it, coaches speak with your device's built-in voices.

| Command | What it does |
| --- | --- |
| `npm start` | Start the dev server |
| `npm test` | Run the unit tests |
| `npm run lint` | Lint the code |
| `npm run preview:pages` | Build the website and preview it locally |

## How it's built

- **[Expo](https://expo.dev) + React Native**, with **Expo Router** for file-based navigation
  and the **React Compiler**.
- **Runs offline-first.** Plans, meals and progress are generated and saved on the device; a
  hosted backend is optional.
- **Expo API routes** proxy text-to-speech for custom coach voices, keeping the API key on the
  server.
- **GitHub Actions** type-checks, lints, tests and deploys the website to GitHub Pages on
  every push to `main`.

```
athleet/
├── src/app/          screens (file-based routes) and API routes
├── src/components/   UI: coach, plan, workout, meals, settings
├── src/data/         coaches, workouts, foods
├── src/lib/          plan and meal generation, storage, theme
└── tests/            unit tests
```

More detail, including deployment, is in [`athleet/README.md`](athleet/README.md).

## Team Mascot

**Harlem Globesluggers**

<img src="swag.jpg" alt="The Harlem Globesluggers mascot, a yellow slug in a basketball jersey, spinning a ball on court" width="600">

__F*** it, we ball.__
