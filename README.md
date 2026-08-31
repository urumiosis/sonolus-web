# Sonolus Web

A browser-first experimental Sonolus runtime, initially targeting the Next SEKAI engine.

> **Status:** early prototype. This is not yet a playable Sonolus client.

## Goal

Run Sonolus/Next SEKAI content directly in a modern browser using standard web APIs, without Android, Linux, or a native Sonolus installation.

## Planned architecture

- TypeScript runtime
- Canvas/WebGL renderer
- Web Audio timing/playback
- Pointer/touch/keyboard input
- HTTP resource loading from Sonolus-compatible servers
- Next SEKAI as the first target engine

## Development

This repository is intentionally starting small. The first milestone is a browser runtime that can load Sonolus metadata/resources and render a minimal test scene before implementing full gameplay.

## Disclaimer

This project is an independent compatibility experiment and is not affiliated with Sonolus, SEGA, or Project SEKAI. Do not redistribute copyrighted game assets.
