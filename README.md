# Carom

**Spin. Bank. Outplay.** Carom is a browser-only, top-down paddle duel. Move as you strike to curve the ball, then bank it off two swaying, rotating amber gates. Play the machine in Solo or share a keyboard in Versus. First to 11 wins, with a two-point lead.

## Run locally

Requires a current Node.js release supported by Vite (Node 22.12+).

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. No server-side services, credentials, downloaded fonts, or media assets are required.

## Production

```sh
npm run build
```

Serve `dist/` with any static web server. `npm run preview` serves a local preview on port 4173.

## Controls

| Action | Keyboard |
| --- | --- |
| Solo movement | W / S or ↑ / ↓ |
| Versus left paddle | W / S |
| Versus right paddle | ↑ / ↓ |
| Select menu item | W / S or ↑ / ↓ |
| Confirm | Enter or Space |
| Pause / resume | P or Escape |
| Back | Escape |
| Mute / unmute | M |
| Debug overlay | Backtick |

Menus also support mouse and touch. On touchscreens the engine supplies a vertical slider for each side and menu buttons. A moving paddle adds spin; a stationary center hit sends the ball straight. Contact near a paddle's ends gives a steeper shot. Every paddle hit increases ball speed, while wall and obstacle bounces preserve it.

## Architecture and checks

The Simple 2D engine owns input, the clock, canvas fit, cue synthesis, diagnostics, and draw recording. The game's immutable state transitions live in `src/update.ts`; ball collisions in `src/physics.ts`; presentation in `src/render.ts`. `src/game.ts` exports the state contract and game, including the stateless debug surface returned to `engine.debug`. No game handle is installed on the page.

```sh
npm run typecheck
npm run lint
npm run format
npm test
```

Tests run the real engine over a Node canvas and counted clocks. Coverage and test reports are written to `coverage/`. The player-facing showcase, screenshots, and a five-second engine-recorded rally are in `showcase/`.