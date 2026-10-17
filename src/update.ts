import type { UpdateApi } from "@clockwyrks/simple-2d";
import type { CaromState, PaddleState, Side, State } from "./game";
import * as C from "./constants";
import { clamp, obstacle, parkedBall } from "./world";
import { readMenus } from "./menus";
import { flight } from "./physics";

function move(s: State, side: Side, api: UpdateApi, dt: number): PaddleState {
  const p = s.paddles[side];
  let vy = p.drivenVy;
  if (!p.driven) {
    if (side === "right" && s.mode === "solo") {
      let target = C.AI_HOME_Y,
        deadzone = C.AI_HOME_DEADZONE;
      if (s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0) {
        target = s.ball.y - s.ball.vy * C.AI_REACT;
        deadzone = C.AI_DEADZONE;
      }
      const diff = target - p.cy;
      vy =
        !s.ai.movement || Math.abs(diff) <= deadzone || dt <= 0
          ? 0
          : Math.sign(diff) * Math.min(C.AI_SPEED, Math.abs(diff) / dt);
    } else {
      const solo = s.mode === "solo";
      const prefix = side === "left" ? "p1" : "p2";
      const up =
        api.input.value(`${prefix}-up`) > 0 ||
        (solo && api.input.value("p2-up") > 0);
      const down =
        api.input.value(`${prefix}-down`) > 0 ||
        (solo && api.input.value("p2-down") > 0);
      vy = (Number(down) - Number(up)) * C.PADDLE_SPEED;
    }
  }
  const raw = p.cy + vy * dt,
    cy = clamp(raw, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  return { ...p, cy, vy: raw !== cy && dt > 0 ? (cy - p.cy) / dt : vy };
}
export function update(state: State, api: UpdateApi, dt: number): CaromState {
  let s = readMenus(state, api);
  s = { ...s, simTime: state.simTime + dt, muted: api.audio.muted() };
  if (s.screen !== "countdown" && s.screen !== "playing") return s;
  s = {
    ...s,
    paddles: {
      left: move(s, "left", api, dt),
      right: move(s, "right", api, dt),
    },
  };
  const events = new Set<string>();
  let served = false;
  if (s.screen === "countdown" && s.ball) {
    const holdTimer = Math.max(0, s.ball.holdTimer - dt);
    if (holdTimer <= 0) {
      served = true;
      s = {
        ...s,
        screen: "playing",
        ball: {
          ...s.ball,
          held: false,
          holdTimer: 0,
          trail: [],
          vx:
            (s.receiver === "left" ? -1 : 1) *
            C.SERVE_SPEED *
            Math.cos(C.SERVE_ANGLE),
          vy: s.ball.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
        },
      };
    } else s = { ...s, ball: { ...s.ball, holdTimer } };
  } else if (s.screen === "playing") s = { ...s, ball: flight(s, dt, events) };
  if (s.ball && !served) {
    const t = s.simTime;
    s = {
      ...s,
      ball: {
        ...s.ball,
        trail: [
          ...s.ball.trail.filter((p) => t - p.t <= C.TRAIL_TIME),
          { x: s.ball.x, y: s.ball.y, t },
        ],
      },
    };
  }
  if (
    s.screen === "playing" &&
    s.ball &&
    !s.ball.held &&
    (s.ball.x - C.BALL_R > C.FIELD_W || s.ball.x + C.BALL_R < 0)
  ) {
    const left = s.ball.x > C.FIELD_W;
    const score = {
      p1: s.score.p1 + Number(left),
      p2: s.score.p2 + Number(!left),
    };
    const won = left
      ? score.p1 >= C.WIN_SCORE && score.p1 - score.p2 >= C.WIN_LEAD
      : score.p2 >= C.WIN_SCORE && score.p2 - score.p1 >= C.WIN_LEAD;
    s = {
      ...s,
      score,
      ...(won
        ? {
            screen: "matchover" as const,
            winner: left ? ("left" as const) : ("right" as const),
            menuIndex: 0,
          }
        : {
            screen: "countdown" as const,
            receiver: left ? ("right" as const) : ("left" as const),
            ball: parkedBall(),
          }),
    };
    events.add(C.CUES.score);
  }
  const obstacleClock = s.obstacleClock + (s.obstacleClockRunning ? dt : 0);
  s = {
    ...s,
    obstacleClock,
    obstacles: s.obstacles.map((o) => obstacle(o.index, obstacleClock)),
  };
  for (const cue of events) api.audio.play(cue);
  return s;
}
