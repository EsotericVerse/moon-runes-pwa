# LOC iOS physical-device build: unsigned IPA

## Purpose

Build the existing LOC 0.9.2 RC static PWA as a native iOS **device-targeted** App and export an **unsigned IPA** through the connected GitHub Actions macOS runner. This does not sign or install any application and does not enroll in Apple Developer Program.

## Build

- Starting source: latest LOC `main`; PR work is `feat/ios-device-build`.
- Workflow: `.github/workflows/ios-device-build.yml`.
- Uses Node 22, Next.js static export, Capacitor 8 `cap add ios` and `cap sync ios`, Swift Package Manager.
- Xcode `iphoneos` SDK with `generic/platform=iOS` and `CODE_SIGNING_ALLOWED=NO`.
- Builds a device **arm64** `App.app` rather than an iOS Simulator binary.
- As a Windows AltServer compatibility workaround, `scripts/prepare-ios-static-assets.py` changes 66 card image filenames to ASCII numeric IDs (`01.png`–`66.png`) and updates all static and dynamically generated image references **only within the iOS native export**. Web PWA assets and rune names remain unchanged. This includes runtime references from the rune game.
- CI verifies the resulting IPA has no non-ASCII paths and exactly 66 numeric card PNGs.
- Builds a `Payload/App.app` ZIP archive with `.ipa` extension as a GitHub Actions artifact, retained for 7 days.
- Does not upload signing credentials, Apple IDs, provisioning profiles, certificates or real device files.

## After successful CI

1. Open the GitHub Actions run and download `LOC-ios-device-unsigned`, then extract the artifact archive to obtain `LOC-ios-device-unsigned.ipa`.
2. On Windows 10, install AltServer for Windows and AltStore Classic on the iPhone (requires Apple's iTunes and iCloud components as documented by AltStore). Alternative signing/sideloading tools may have different device provisioning requirements.
3. Sign and sideload the **unsigned** IPA locally using an installer that supports signing it with your Apple ID. If using AltStore Classic, import the IPA from the Files app or AltStore's My Apps screen and perform the signing/installation with the connected AltServer.
4. If free Apple ID provisioning is used, iOS app signatures expire after approximately 7 days and need refresh.

**Never try to install the unsigned artifact without signing it.** Success building a device-targeted IPA does not prove the native SQLite plugin, runtime behavior, offline isolation or true iPhone compatibility. Real device testing comes next.

## Privacy/architecture guardrails

- No SQLite database initialization, schemas or storage adapters are created in this PR.
- Do not embed or upload X/Twitter archives, MSN records, test personal files, credentials or signing keys.
- Canonical Supabase/Neon data contracts, public PWA routes, daily runes, rune games and existing import logic remain unchanged.
- Keep the `ios/` project generated only in CI for this initial trial; revisit reproducibility and persistence once signed-device deployment is confirmed.
- GitHub artifact downloads should be treated as untrusted for privacy until local signing and runtime inspection are complete.
