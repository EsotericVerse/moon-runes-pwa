# LOC iOS Capacitor Shell (0.9.2 RC)

## Goal

Prove the existing statically-exported LOC Next.js/React application can be compiled inside a native iOS container using GitHub-hosted macOS. Do not modify the existing web semantics or deploy a mobile release in this phase.

## Current contract

- Source authority: LOC 0.9.2 RC `main`; work in short-lived `feat/ios-capacitor-shell`.
- Capacitor 8 packages and `@capacitor-community/sqlite` were added in PR #477.
- `capacitor.config.json` defines `appId`, `appName` and `webDir: out`.
- `npm run build` produces the Next.js static `out/` assets for Capacitor; no `server.url` or remote-webview fallback is set.
- CI uses GitHub Actions `macos-26-intel`, Xcode 26, Node 22, and Swift Package Manager to generate an **ephemeral** `ios/` folder, sync plugins, resolve dependencies, and compile a **non-signed iOS Simulator** build.
- No local Mac is required to run the CI workflow. Signing and physical iPhone installation are **not** accomplished by simulator compilation; those are separate subsequent steps.
- CI-generated `ios/` is intentionally not committed in the shell experiment, so it must be recreated by `npx cap add ios` during CI. When stable, native project ownership and release signing can be decided separately.

## Explicit exclusions

- No creation or migration of any SQLite database or schema.
- No X/Twitter, MSN, or other historical data access or import.
- No changes to Supabase/Neon data authority, RLS, auth, rune draws, daily runes, or game rules.
- No App Store/TestFlight enrollment or publishing decisions.
- A successful unsigned simulator build does not verify iPhone hardware, native data encryption, Face ID, push/local notifications, or offline correctness.

## Verification

Read the run of `.github/workflows/ios-capacitor-shell.yml` on the feature branch. The gate is a full `npm ci` + static export + Capacitor platform generation + Swift package resolution + unsigned simulator compilation. Upon successful PR CI and review, merge back to `main` and freeze the completed branch.
