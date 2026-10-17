import { afterEach, describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { game, BACKGROUND } from "./game";
import * as C from "./constants";

const disposals: (() => void)[] = [];
afterEach(() => disposals.splice(0).forEach((d) => d()));
async function setup(ms = 8) {
  const events = new EventTarget();
  const engine = createEngine({
    canvas: createCanvas(C.FIELD_W, C.FIELD_H) as unknown as HTMLCanvasElement,
    width: C.FIELD_W,
    height: C.FIELD_H,
    background: BACKGROUND,
    layout: C.LAYOUT,
    game,
    clock: new ConstantClock(ms),
    surface: {
      cssWidth: () => C.FIELD_W,
      cssHeight: () => C.FIELD_H,
      dpr: () => 1,
      events: () => events,
    },
  });
  await engine.initialize();
  disposals.push(() => engine.destroy());
  const key = (code: string, type = "keydown") =>
    events.dispatchEvent(
      Object.assign(new Event(type), { code, repeat: false }),
    );
  const click = (x: number, y: number, type: string) =>
    events.dispatchEvent(
      Object.assign(new Event(type), {
        clientX: x,
        clientY: y,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
      }),
    );
  const d = engine.debug;
  const empty = () => {
    engine.apply((s) => d.clearWorld(s));
    engine.apply((s) => d.spawnBall(s));
    engine.apply((s) => d.setBallHeld(s, false));
    engine.apply((s) => d.setScreen(s, "playing"));
  };
  return { engine, d, key, click, empty };
}
describe("Carom through the engine", () => {
  it("deduplicates cues and transfers actual paddle motion to spin", async () => {
    const { engine, d, empty } = await setup();
    empty();
    const cues: string[] = [];
    engine.events.on("cue:played", (e) => cues.push(e.cue));
    engine.apply((s) =>
      d.setPaddleDriven(d.setPaddleVy(s, "left", C.PADDLE_SPEED), "left", true),
    );
    engine.apply((s) =>
      d.setBallVelocity(
        d.setBallPosition(s, C.P1_X1 + C.BALL_R + 2, C.FIELD_CY),
        -C.SERVE_SPEED,
        0,
      ),
    );
    await engine.advance(1);
    expect(engine.state.ball!.spin).toBeGreaterThan(500);
    expect(cues).toEqual([C.CUES.paddleHit]);
    engine.apply((s) => d.setMuted(s, true));
    await engine.advance(1);
    expect(engine.state.muted).toBe(true);
  });
  it("pause restart, quit, rematch and simultaneous menu priorities", async () => {
    const { engine, d, key } = await setup();
    key("ArrowUp");
    key("ArrowDown");
    key("Enter");
    await engine.advance(1);
    expect(engine.state.screen).toBe("title");
    expect(engine.state.menuIndex).toBe(2);
    for (const code of ["ArrowUp", "ArrowDown", "Enter"]) key(code, "keyup");
    engine.apply((s) => d.setScreen(d.setMenuIndex(s, 1), "paused"));
    key("Enter");
    await engine.advance(1);
    key("Enter", "keyup");
    expect(engine.state.screen).toBe("countdown");
    engine.apply((s) => d.setScreen(d.setMenuIndex(s, 2), "paused"));
    key("Enter");
    await engine.advance(1);
    key("Enter", "keyup");
    expect(engine.state.screen).toBe("title");
    engine.apply((s) => d.setScreen(d.setMenuIndex(s, 0), "matchover"));
    key("Enter");
    await engine.advance(1);
    key("Enter", "keyup");
    expect(engine.state.screen).toBe("countdown");
    engine.apply((s) => d.setScreen(d.setMenuIndex(s, 1), "matchover"));
    key("Enter");
    await engine.advance(1);
    expect(engine.state.screen).toBe("title");
    expect(d.menuItemRect(engine.state, -1)).toBeNull();
  });
  it("initializes all fields and pure diagnostics", async () => {
    const { engine, d } = await setup();
    const before = d.snapshot(engine.state);
    expect(before.screen).toBe("title");
    expect(before.ball?.held).toBe(true);
    expect(before.obstacles).toHaveLength(2);
    expect(engine.diagnostics().every((r) => r.error === undefined)).toBe(true);
    expect(d.snapshot(engine.state)).toEqual(before);
    expect(d.version).toBe(C.CAROM_DEBUG_VERSION);
    await engine.advance(2);
    expect(engine.state.simTime).toBeCloseTo(0.016);
    expect(engine.state.obstacleClock).toBe(0);
  });
  it("navigates title, howto, starts, pauses and resumes exactly once", async () => {
    const { engine, key } = await setup();
    key("ArrowUp");
    await engine.advance(1);
    key("ArrowUp", "keyup");
    expect(engine.state.menuIndex).toBe(2);
    key("Enter");
    await engine.advance(1);
    key("Enter", "keyup");
    expect(engine.state.screen).toBe("howto");
    key("Escape");
    await engine.advance(1);
    key("Escape", "keyup");
    expect(engine.state.menuIndex).toBe(2);
    key("ArrowDown");
    await engine.advance(1);
    key("ArrowDown", "keyup");
    key("Enter");
    await engine.advance(1);
    key("Enter", "keyup");
    expect(engine.state.screen).toBe("countdown");
    key("Escape");
    await engine.advance(1);
    key("Escape", "keyup");
    expect(engine.state.screen).toBe("paused");
    const hold = engine.state.ball?.holdTimer;
    await engine.advance(10);
    expect(engine.state.ball?.holdTimer).toBe(hold);
    key("Escape");
    await engine.advance(1);
    key("Escape", "keyup");
    expect(engine.state.screen).toBe("countdown");
    await engine.advance(130);
    expect(engine.state.screen).toBe("playing");
  });
  it("confirms pointer edges only in one region", async () => {
    const { engine, d, click } = await setup();
    const r = d.menuItemRect(engine.state, 1)!;
    click(r.x + 10, r.y + 10, "pointerdown");
    await engine.advance(1);
    click(0, 0, "pointerup");
    await engine.advance(1);
    expect(engine.state.screen).toBe("title");
    click(r.x + 10, r.y + 10, "pointerdown");
    click(r.x + 10, r.y + 10, "pointerup");
    await engine.advance(1);
    expect(engine.state.mode).toBe("versus");
    expect(engine.state.titleIndex).toBe(1);
  });
  it("serves the posed sign and never moves on the serve frame", async () => {
    const { engine, d } = await setup();
    engine.apply((s) =>
      d.setScreen(
        d.setBallHoldTimer(d.setBallServeSign(s, -1), 0),
        "countdown",
      ),
    );
    await engine.advance(1);
    expect(engine.state.ball?.x).toBe(C.FIELD_CX);
    expect(engine.state.ball?.vy).toBeLessThan(0);
    expect(engine.state.ball?.vx).toBeLessThan(0);
    await engine.advance(1);
    expect(engine.state.ball?.x).toBeLessThan(C.FIELD_CX);
  });
  it("integrates driven velocity and clamps actual velocity", async () => {
    const { engine, d } = await setup();
    engine.apply((s) =>
      d.setScreen(
        d.setPaddleDriven(
          d.setPaddleVy(
            d.setPaddleCy(s, "left", C.PADDLE_MIN_CY),
            "left",
            -500,
          ),
          "left",
          true,
        ),
        "countdown",
      ),
    );
    await engine.advance(1);
    expect(engine.state.paddles.left.vy).toBe(0);
    expect(engine.state.paddles.left.drivenVy).toBe(-500);
    engine.apply((s) => d.setPaddleVy(s, "left", 100));
    await engine.advance(10);
    expect(engine.state.paddles.left.cy).toBeCloseTo(C.PADDLE_MIN_CY + 8);
  });
  it("solo accepts arrows on the left and AI faculties gate independently", async () => {
    const { engine, d, key } = await setup();
    engine.apply((s) =>
      d.setScreen(
        d.setBallPosition(
          d.setBallVelocity(d.setBallHeld(s, false), 500, 0),
          900,
          600,
        ),
        "playing",
      ),
    );
    key("ArrowDown");
    await engine.advance(1);
    expect(engine.state.paddles.left.cy).toBeGreaterThan(C.FIELD_CY);
    expect(engine.state.paddles.right.cy).toBeGreaterThan(C.FIELD_CY);
    engine.apply((s) => d.setAiMovement(s, false));
    const cy = engine.state.paddles.right.cy;
    await engine.advance(2);
    expect(engine.state.paddles.right.cy).toBe(cy);
    engine.apply((s) =>
      d.setAiTracking(
        d.setAiMovement(d.setPaddleCy(s, "right", 600), true),
        false,
      ),
    );
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(-C.AI_SPEED);
  });
  it("reflects walls, paddle faces, endcaps and preserves spin appropriately", async () => {
    const { engine, d, empty } = await setup();
    empty();
    engine.apply((s) =>
      d.setBallVelocity(d.setBallPosition(s, 400, 12), 0, -520),
    );
    await engine.advance(1);
    expect(engine.state.ball?.vy).toBeGreaterThan(0);
    engine.apply((s) =>
      d.setBallVelocity(d.setBallPosition(s, 78, C.FIELD_CY), -520, 0),
    );
    await engine.advance(1);
    expect(engine.state.ball?.vx).toBeGreaterThan(0);
    expect(d.snapshot(engine.state).ball?.speed).toBeCloseTo(
      520 * C.SPEED_MULT,
    );
    engine.apply((s) =>
      d.setBallVelocity(
        d.setBallPosition(s, 55, C.FIELD_CY - C.PADDLE_HALF - 12),
        0,
        520,
      ),
    );
    await engine.advance(1);
    expect(engine.state.ball?.vy).toBeLessThan(0);
    engine.apply((s) =>
      d.setBallSpin(
        d.setBallVelocity(d.setBallPosition(s, 400, 300), 520, 0),
        600,
      ),
    );
    await engine.advance(10);
    expect(engine.state.ball?.vy).toBeGreaterThan(0);
    expect(engine.state.ball?.spin).toBeCloseTo(
      600 * Math.pow(0.5, 0.08 / C.SPIN_HALFLIFE),
    );
  });
  it("rotated obstacles reflect in local coordinates and clock poses stay symmetric", async () => {
    const { engine, d, empty } = await setup();
    empty();
    engine.apply((s) => d.spawnObstacle(s, 0));
    engine.apply((s) => d.setObstacleClockRunning(s, false));
    engine.apply((s) =>
      d.setBallVelocity(d.setBallPosition(s, 465, 220), 520, 0),
    );
    await engine.advance(3);
    expect(engine.state.ball?.vx).toBeLessThan(0);
    engine.apply((s) => d.spawnObstacle(s, 1));
    engine.apply((s) => d.setObstacleClock(s, 0.75));
    const a = engine.state.obstacles[0],
      b = engine.state.obstacles[1];
    expect(a.cy + b.cy).toBeCloseTo(C.FIELD_H);
    expect(a.theta).toBeCloseTo(C.OBSTACLE_SPIN_RATE * 0.75);
    const before = engine.state;
    expect(d.reconcile(before)).toEqual(before);
    expect(d.reconcile(d.reconcile(before))).toEqual(before);
  });
  it("scores deuce, parks, then wins with a two point lead", async () => {
    const { engine, d, empty } = await setup();
    empty();
    engine.apply((s) => d.setScore(s, 10, 10));
    const point = async () => {
      engine.apply((s) =>
        d.setScreen(
          d.setBallHeld(
            d.setBallVelocity(
              d.setBallPosition(s, C.FIELD_W + C.BALL_R + 1, 300),
              500,
              0,
            ),
            false,
          ),
          "playing",
        ),
      );
      await engine.advance(1);
    };
    await point();
    expect(engine.state.screen).toBe("countdown");
    expect(engine.state.receiver).toBe("right");
    expect(engine.state.ball?.trail).toHaveLength(0);
    await point();
    expect(engine.state.screen).toBe("matchover");
    expect(engine.state.winner).toBe("left");
    expect(engine.state.score.p1).toBe(12);
  });
  it("exposes isolated poses, absent failures, reset, mute and trail expiry", async () => {
    const { engine, d, empty, key } = await setup();
    empty();
    engine.apply((s) => d.setBallVelocity(s, 500, 0));
    await engine.advance(30);
    expect(
      engine.state.ball!.trail.every(
        (p) => engine.state.simTime - p.t <= C.TRAIL_TIME,
      ),
    ).toBe(true);
    const s = engine.state;
    expect(d.setWinner(s, "right").winner).toBe("right");
    expect(d.setMode(s, "versus").mode).toBe("versus");
    expect(d.setReceiver(s, "right").receiver).toBe("right");
    expect(d.setTitleIndex(s, 2).titleIndex).toBe(2);
    expect(d.setMenuIndex(s, 2).menuIndex).toBe(2);
    expect(d.setResumeScreen(s, "countdown").resumeScreen).toBe("countdown");
    expect(d.drawBallServeSign(s).ball?.serveSign).toBeOneOf([-1, 1]);
    expect(() => d.spawnObstacle(s, 2)).toThrow();
    engine.apply((s) => d.clearWorld(s));
    expect(() => d.setBallSpin(engine.state, 2)).toThrow();
    await engine.advance(1);
    expect(engine.state.ball).toBeNull();
    key("KeyM");
    await engine.advance(1);
    expect(engine.state.muted).toBe(true);
    engine.apply((s) => d.reset(s));
    expect(engine.state.muted).toBe(true);
    expect(engine.state.simTime).toBe(0);
  });
  it("agrees across 2 and 16 ms steps for free spin flight", async () => {
    const results = [];
    for (const ms of [2, 16]) {
      const { engine, d, empty } = await setup(ms);
      empty();
      engine.apply((s) =>
        d.setBallSpin(
          d.setBallVelocity(d.setBallPosition(s, 600, 300), 300, 40),
          400,
        ),
      );
      await engine.advance(800 / ms);
      results.push(d.snapshot(engine.state).ball!);
    }
    expect(Math.abs(results[0].speed - results[1].speed)).toBeLessThan(10);
    expect(Math.sign(results[0].vx)).toBe(Math.sign(results[1].vx));
    expect(Math.sign(results[0].vy)).toBe(Math.sign(results[1].vy));
  });
});
