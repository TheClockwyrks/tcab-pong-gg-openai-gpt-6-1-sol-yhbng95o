import * as C from "./constants";
import type { BallState, CaromState, ObstacleState, State, Mode } from "./game";

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));
export const drawSign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
export function parkedBall(): BallState {
  return {
    x: C.FIELD_CX,
    y: C.FIELD_CY,
    vx: 0,
    vy: 0,
    spin: 0,
    held: true,
    holdTimer: C.HOLD_TIME,
    serveSign: drawSign(),
    trail: [],
  };
}
export function obstacle(index: number, t: number): ObstacleState {
  const base = C.OBSTACLE_CENTERS[index];
  if (!base || !Number.isInteger(index))
    throw new RangeError("Unknown obstacle");
  return {
    index,
    cx: base.x,
    cy:
      base.y +
      (index === 0 ? 1 : -1) *
        C.OBSTACLE_SWAY_AMP *
        Math.sin((2 * Math.PI * t) / C.OBSTACLE_SWAY_PERIOD),
    theta: C.OBSTACLE_SPIN_RATE * t,
  };
}
export function initialState(muted: boolean): CaromState {
  const paddle = () => ({ cy: C.FIELD_CY, vy: 0, driven: false, drivenVy: 0 });
  return {
    screen: "title",
    mode: "solo",
    menuIndex: 0,
    titleIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    paddles: { left: paddle(), right: paddle() },
    ai: { tracking: true, movement: true },
    receiver: "left",
    ball: parkedBall(),
    obstacles: C.OBSTACLE_CENTERS.map((_, i) => obstacle(i, 0)),
    obstacleClock: 0,
    obstacleClockRunning: true,
    simTime: 0,
    muted,
  };
}
export function startMatch(s: State, mode: Mode): CaromState {
  return {
    ...s,
    screen: "countdown",
    mode,
    menuIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    receiver: "left",
    ball: parkedBall(),
    paddles: {
      left: { ...s.paddles.left, cy: C.FIELD_CY, vy: 0 },
      right: { ...s.paddles.right, cy: C.FIELD_CY, vy: 0 },
    },
    obstacleClock: 0,
    obstacleClockRunning: true,
    obstacles: s.obstacles.map((o) => obstacle(o.index, 0)),
  };
}
export function title(s: State): CaromState {
  return {
    ...initialState(s.muted),
    titleIndex: s.titleIndex,
    menuIndex: s.titleIndex,
    simTime: s.simTime,
  };
}
