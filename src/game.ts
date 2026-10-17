import type { Game } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import { ACTIONS, BINDINGS, CUES } from "./constants";
import { createDebug } from "./debug";
import { initialState } from "./world";
import { update } from "./update";
import { render } from "./render";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";

export type Mode = "solo" | "versus";

export type Side = "left" | "right";

export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}

export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}

export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}

export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
  readonly theta: number;
}

export interface CaromState {
  readonly menuPresses?: Readonly<Record<number, number>>;
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";

  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;

  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;

  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly obstacleClock: number;
  readonly obstacleClockRunning: boolean;

  readonly simTime: number;
  readonly muted: boolean;
}

export type CaromDebugApi = ReturnType<typeof createDebug>;
export type State = DeepReadonly<CaromState>;
export const BACKGROUND = "#0b141b";

export const game: Game<CaromState, CaromDebugApi> = {
  initialize(api) {
    for (const name of ACTIONS)
      api.input.register(name, { keys: [...BINDINGS[name]] });
    api.audio.define(CUES.paddleHit, {
      wave: "triangle",
      freq: 580,
      freqTo: 280,
      durationMs: 75,
      gain: 0.18,
    });
    api.audio.define(CUES.wallBounce, {
      freq: 240,
      freqTo: 150,
      durationMs: 50,
      gain: 0.12,
    });
    api.audio.define(CUES.obstacleBounce, {
      wave: "sine",
      freq: 840,
      freqTo: 470,
      durationMs: 95,
      gain: 0.16,
    });
    api.audio.define(CUES.score, {
      wave: "triangle",
      freq: 440,
      freqTo: 880,
      durationMs: 220,
      gain: 0.2,
    });
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("mode", (s) => s.mode);
    api.diagnostics.register("p1 score", (s) => s.score.p1);
    api.diagnostics.register("p2 score", (s) => s.score.p2);
    for (const side of ["left", "right"] as const) {
      api.diagnostics.register(
        `${side} cy / vy`,
        (s) =>
          `${s.paddles[side].cy.toFixed(1)} / ${s.paddles[side].vy.toFixed(1)}`,
      );
    }
    api.diagnostics.register("ball x / y", (s) =>
      s.ball ? `${s.ball.x.toFixed(1)} / ${s.ball.y.toFixed(1)}` : "none",
    );
    api.diagnostics.register("ball vx / vy", (s) =>
      s.ball ? `${s.ball.vx.toFixed(1)} / ${s.ball.vy.toFixed(1)}` : "none",
    );
    api.diagnostics.register("ball speed", (s) =>
      s.ball ? Math.hypot(s.ball.vx, s.ball.vy) : "none",
    );
    api.diagnostics.register("ball spin", (s) => s.ball?.spin ?? "none");
    return [initialState(false), createDebug()];
  },
  update,
  render,
};
