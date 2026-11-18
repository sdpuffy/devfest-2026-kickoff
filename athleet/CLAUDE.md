# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Repo layout

The git root is `devfest-2026-kickoff/`; the Expo app lives in `athleet/` and all commands below run from there. The root holds only the README, `docs/` and the GitHub Pages workflow (`.github/workflows/deploy-pages.yml`), which runs `tsc --noEmit`, lint, tests and `npm run build:pages` on every push to `main` touching `athleet/`. Expo SDK 58 / React Native 0.88 / React 19.3 / TypeScript 6, React Compiler and typed routes enabled.

## Commands

```bash
npm start                    # dev server (w = web)
npx tsc --noEmit             # typecheck
npm run lint                 # expo lint (ESLint)
npm test                     # node --test tests/*.cjs
node --test tests/coach-motion.test.cjs   # single test file
node --test --test-name-pattern="squat" tests/coach-motion.test.cjs  # single test
npm run preview:pages        # exact GitHub Pages build, served at localhost:8080/<repo-name>/
```

Tests are plain Node `node:test` files (`.cjs`) with no Jest/bundler. Each test file has a small `load()` helper that transpiles a `src/lib/*.ts` file with the `typescript` package and runs it in a `vm` context. Consequence: only pure modules are testable this way. The loader resolves relative `require`s to `.ts` files but does not understand the `@/` alias or React Native imports, so keep testable logic (e.g. `coach-motion.ts`, `speech-animation.ts`) free of those.

## Architecture

- **Routes** in `src/app/` (Expo Router). Flow: `index` → `questionnaire` → coach match → `chat/[id]` / `plan` → `(tabs)` (my-plan, my-meals, coaches, recap) and `workout`. `src/app/_layout.tsx` renders a root `Stack` plus a persistent `PlanTabBar` and `SettingsButton` overlaid on every screen. `athleet/app/index.tsx` is leftover template boilerplate, not the real app.
- **Offline-first generation.** `src/lib/api.ts` is the app's single entry point for plans and chat: if `EXPO_PUBLIC_API_URL` is set it calls `/api/generate-plan` and `/api/chat` on a hosted backend, otherwise (the normal case) it builds everything on device — `lib/plan.ts` (`generatePlan(coach, profile, seed)`; seed gives "new variation"), `lib/meal-plan.ts` + `lib/nutrition.ts`, coach ranking in `lib/match.ts`, and canned chat replies. Static content (coaches, workout programs, recipes, foods) lives in `src/data/`.
- **State stores** (`lib/*-store.ts`, `selected-plan.ts`, `workout-log.ts`, `appearance.ts`) are module-level singletons exposed via `useSyncExternalStore` hooks, persisted with AsyncStorage (synchronous `localStorage` read on web at startup, async load on native). Follow this pattern rather than adding a context/state library.
- **Theming.** Everything goes through `src/lib/theme.ts`: use `colors` tokens and `themedStyles(() => ({ ... }))` / `useThemedStyles` instead of raw hex and `StyleSheet.create`, so screens respond to theme, accent, text size, density and colorblind settings. The palette is rebuilt in place; components that stay mounted read the live palette via `useTheme()` (the root layout re-keys the tab bar by theme `version`).
- **Static web build.** `app.config.js` switches to `static` output, disables API routes and sets `experiments.baseUrl` when `EXPO_BASE_URL` is set; `scripts/build-pages.js` sets that. There are no API routes; the coaches don't speak. Never put secrets in `EXPO_PUBLIC_*` vars — they ship in the public bundle.
- **Coach art and animation.** Each coach is layered SVG built in `components/coach-art.ts` from a `COACH_LOOKS` entry on one shared 320px rig, so every coach animates with the same joints. `animated-coach.tsx` moves the layers with pure pose functions (`coach-motion.ts`, `speech-animation.ts`); `exercise-demo.tsx` draws movement demos from `exercise-rig.ts`. Avatars are the same art (`coachPortraits`). Pose functions must honor reduced motion.
- `lib/personas.ts`, `lib/security.ts`, `lib/schema.ts` and `lib/offline-storage.ts` are written for a separate hosted backend and aren't imported by the app.
