# Athleet app

The Expo app behind [Athleet](../README.md). It runs on iOS, Android and the web from one codebase.

## Run it

```bash
npm install
npx expo start
```

Press **w** to open the web version, or scan the QR code with [Expo Go](https://expo.dev/go). You can
also open it in an [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/), an
[iOS simulator](https://docs.expo.dev/workflow/ios-simulator/) or a
[development build](https://docs.expo.dev/develop/development-builds/introduction/).

### Environment (optional)

Copy `.env.example` to `.env`:

| Variable | Used for |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | A hosted backend for plans and chat. Without it, everything is generated on the device. |

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the dev server |
| `npm run web` / `ios` / `android` | Start and open a specific platform |
| `npm test` | Unit tests (`tests/*.cjs`) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run build:pages` | Build the static website into `dist/` |
| `npm run preview:pages` | Build it and serve it locally like GitHub Pages |

## Project layout

```
src/
├── app/            screens (Expo Router file-based routes)
│   ├── (tabs)/     Your Plan, Workout Plan, Your Meals, Coaches
│   ├── chat/[id]   coach chat, plan preview and guided workout
│   ├── settings    appearance and feel
├── components/     UI building blocks
├── data/           coaches, workouts, foods, suggestions
├── lib/            plan and meal generation, storage, theme, settings
├── hooks/          shared React hooks
tests/              unit tests
```

Styling goes through `src/lib/theme.ts`: use the `colors` tokens and `themedStyles(() => ({ ... }))`
instead of raw hex values and `StyleSheet.create`, so screens follow the user's theme, text size and
density settings.

## Deploy the website (GitHub Pages)

The web app is published to **https://bloxxyis.github.io/devfest-2026-kickoff---harlem-globesluggers/** by the
workflow in `.github/workflows/deploy-pages.yml`. It runs on every push to `main` that touches `athleet/`
(or manually from the **Actions** tab), checks types, lint and tests, builds, and deploys.

One-time setup: on GitHub go to **Settings → Pages** and set **Source** to **GitHub Actions**.

Try the exact production build locally first:

```bash
npm run preview:pages   # builds into dist/ and serves it at http://localhost:8080/devfest-2026-kickoff---harlem-globesluggers/
```

What's different on GitHub Pages (it only hosts static files):

- The build uses `static` output with the repo name as the base URL (see `app.config.js`). Local
  development with `npx expo start` is unchanged.
- Everything (plans, meals, workouts, settings) runs in the browser and saves to the browser's storage.
- To use a hosted backend, add `EXPO_PUBLIC_API_URL` under **Settings → Secrets and variables →
  Actions → Variables**. Never put secret keys in `EXPO_PUBLIC_` variables: they end up in the
  public site.

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
