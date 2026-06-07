# Shader Pilot

A small app I built with my friend Mukul. You fly through a procedural 3D shader world and tweak how it looks and behaves while it runs. It started from Google AI Studio's Shader Pilot remix and uses the Gemini API to write and edit the shaders for you.

## What it does

You move around a 3D scene with WASD or the arrow keys, and there is an on screen D-pad for touch. The scene itself is a GLSL fragment shader. Gemini can generate a new shader from a prompt or change the one you already have. It can also read a shader and pick out the numbers worth controlling, then build live sliders for things like zoom, speed and twist, so you can tune the look without touching code.

There is also a cybersecurity game mode built in. It gives you a security scenario (SQL injection, XSS, command injection and more), you pick the right fix, and Gemini gives feedback like a security consultant would. It ships with a set of static questions too, so it still works if you are offline or the API is slow.

A few other bits: a HUD with FPS and HD toggles, sound, a share button that packs the current scene and slider values into a URL you can send, and saved sessions stored as JSON in `public/sessions`.

## Stack

React 19 and TypeScript on Vite. The Gemini calls go through `@google/genai` using `gemini-2.5-pro`. Tailwind and the Material Symbols font are pulled from a CDN, and the runtime dependencies are mapped through esm.sh in `index.html`.

## Run it locally

You need Node.js installed.

1. Install dependencies:
   ```
   npm install
   ```
2. Set up your Gemini API key. Copy the example file and put your real key in it:
   ```
   cp .env.local.example .env.local
   ```
   Then open `.env.local` and set:
   ```
   GEMINI_API_KEY=your_real_key_here
   ```
   You can get a key from Google AI Studio.
3. Start the dev server:
   ```
   npm run dev
   ```
   It runs on http://localhost:3000

`npm run build` makes a production build and `npm run preview` serves it.

## Project layout

`App.tsx` is the root and wires the panels together. `components` holds the UI: the shader canvas, the controls and editor panels, the D-pad, the HUD, the ship overlay and the cybersecurity game. `hooks/useAppStore.ts` is the main state store, `context/AppContext.tsx` shares it across the tree, and `services/GeminiService.ts` is where all the Gemini prompts and calls live. `types.ts` and `config.ts` cover the shared types and feature flags.

## A note on the API key

The key lives in `.env.local`, and that file is gitignored, so it does not get pushed. Keep it that way. If a real key ever ends up somewhere public, rotate it in AI Studio.

## Credits

Built by me and Mukul, on top of Google AI Studio's Shader Pilot remix. The code is marked Apache-2.0 (see LICENSE), so change that if we want something different.
