import type { RenderApi } from "@clockwyrks/simple-2d";
import type { State } from "./game";
import * as C from "./constants";
import { menuItems, menuItemRect } from "./menus";

const INK = "#e6efe9",
  FAINT = "#70868d",
  MINT = "#b7f583",
  BLUE = "#77c8e5",
  GOLD = "#ffb76b";
function text(
  ctx: CanvasRenderingContext2D,
  copy: string,
  x: number,
  y: number,
  size = 16,
  color = INK,
  weight = 400,
  align: CanvasTextAlign = "left",
) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(copy, x, y);
}
function line(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}
function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(w / 2, 6));
  ctx.fill();
}
function furniture(s: State, ctx: CanvasRenderingContext2D) {
  // A quiet drafting grid makes the curved flight legible without visual noise.
  ctx.fillStyle = "#17242b";
  for (let x = 40; x < C.FIELD_W; x += 40)
    for (let y = 40; y < C.FIELD_H; y += 40) ctx.fillRect(x, y, 1, 1);
  line(ctx, 28, 1, C.FIELD_W - 28, 1, "#35464a");
  line(ctx, 28, C.FIELD_H - 1, C.FIELD_W - 28, C.FIELD_H - 1, "#35464a");
  ctx.setLineDash([5, 13]);
  line(ctx, C.NET_X, 110, C.NET_X, C.FIELD_H - 70, "#2b3d43");
  ctx.setLineDash([]);
  ctx.strokeStyle = "#24363b";
  ctx.beginPath();
  ctx.arc(C.FIELD_CX, C.FIELD_CY, 90, 0, Math.PI * 2);
  ctx.stroke();
  bar(
    ctx,
    C.P1_X0,
    s.paddles.left.cy - C.PADDLE_HALF,
    C.PADDLE_W,
    C.PADDLE_H,
    MINT,
  );
  bar(
    ctx,
    C.P2_X0,
    s.paddles.right.cy - C.PADDLE_HALF,
    C.PADDLE_W,
    C.PADDLE_H,
    BLUE,
  );
  for (const o of s.obstacles) {
    ctx.save();
    ctx.translate(o.cx, o.cy);
    ctx.rotate(o.theta);
    ctx.strokeStyle = "#6c4b30";
    ctx.beginPath();
    ctx.arc(0, 0, 85, 0, Math.PI * 2);
    ctx.stroke();
    bar(ctx, -C.OBSTACLE_HW, -C.OBSTACLE_HH, C.OBSTACLE_W, C.OBSTACLE_H, GOLD);
    ctx.fillStyle = "#664725";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (s.ball) {
    const b = s.ball;
    ctx.lineCap = "round";
    for (let i = 1; i < b.trail.length; i++) {
      const a = b.trail[i - 1],
        p = b.trail[i];
      ctx.globalAlpha = Math.max(0, 1 - (s.simTime - p.t) / C.TRAIL_TIME) * 0.6;
      ctx.strokeStyle = MINT;
      ctx.lineWidth = C.BALL_R * 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = MINT;
    ctx.shadowBlur = 16;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(b.x, b.y, C.BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
function header(s: State, ctx: CanvasRenderingContext2D) {
  text(ctx, "CAROM /", 40, 40, 16, INK, 700);
  text(
    ctx,
    s.mode === "solo" ? "SOLO · HUMAN / MACHINE" : "VERSUS · LOCAL DUEL",
    140,
    40,
    12,
    FAINT,
  );
  text(
    ctx,
    "FIRST TO 11  /  WIN BY 2",
    C.FIELD_CX,
    35,
    11,
    FAINT,
    400,
    "center",
  );
  text(
    ctx,
    String(s.score.p1).padStart(2, "0"),
    535,
    89,
    52,
    MINT,
    700,
    "center",
  );
  text(
    ctx,
    String(s.score.p2).padStart(2, "0"),
    745,
    89,
    52,
    BLUE,
    700,
    "center",
  );
  text(ctx, "P  PAUSE", C.FIELD_W - 40, 40, 12, FAINT, 400, "right");
  text(
    ctx,
    s.mode === "solo" ? "YOU  /  W S OR ↑ ↓" : "PLAYER 01  /  W S",
    40,
    685,
    12,
    MINT,
  );
  text(
    ctx,
    s.mode === "solo" ? "MACHINE" : "PLAYER 02  /  ↑ ↓",
    C.FIELD_W - 40,
    685,
    12,
    BLUE,
    400,
    "right",
  );
  text(
    ctx,
    s.muted ? "M  SOUND OFF" : "M  SOUND ON",
    C.FIELD_CX,
    685,
    11,
    FAINT,
    400,
    "center",
  );
}
function titleArt(ctx: CanvasRenderingContext2D) {
  // A diagram of a bank shot: the orange rotating gate redirects a mint arc.
  ctx.save();
  ctx.translate(925, 355);
  ctx.strokeStyle = "#263940";
  ctx.lineWidth = 1;
  for (const r of [115, 180, 245]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  line(ctx, -260, 0, 260, 0, "#263940");
  line(ctx, 0, -260, 0, 260, "#263940");
  ctx.strokeStyle = MINT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-235, 175);
  ctx.bezierCurveTo(-110, 160, -140, 55, -15, 0);
  ctx.bezierCurveTo(80, -30, 50, -150, 220, -175);
  ctx.stroke();
  ctx.setLineDash([3, 8]);
  ctx.strokeStyle = "#547149";
  ctx.beginPath();
  ctx.moveTo(-235, 195);
  ctx.bezierCurveTo(-80, 180, -90, 85, -15, 0);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.save();
  ctx.rotate(-0.55);
  bar(ctx, -C.OBSTACLE_HW, -C.OBSTACLE_HH, C.OBSTACLE_W, C.OBSTACLE_H, GOLD);
  ctx.restore();
  bar(ctx, -250, 120, C.PADDLE_W, C.PADDLE_H, MINT);
  bar(ctx, 230, -225, C.PADDLE_W, C.PADDLE_H, BLUE);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(145, -143, C.BALL_R, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, "01 / CURVE", -220, 245, 11, MINT);
  text(ctx, "02 / CAROM", 130, -220, 11, GOLD);
  ctx.restore();
}
export function render(s: State, { ctx }: RenderApi): void {
  ctx.save();
  const titleScreen = s.screen === "title" || s.screen === "howto";
  if (!titleScreen) {
    furniture(s, ctx);
    header(s, ctx);
  }
  if (s.screen === "playing" || s.screen === "countdown") {
    if (s.screen === "countdown") {
      text(ctx, "READY TO RICOCHET", C.FIELD_CX, 445, 12, MINT, 700, "center");
      text(
        ctx,
        String(Math.max(1, Math.ceil(s.ball?.holdTimer ?? 1))),
        C.FIELD_CX,
        489,
        32,
        INK,
        700,
        "center",
      );
    }
    ctx.restore();
    return;
  }
  if (titleScreen) {
    text(ctx, "C /", 48, 56, 20, MINT, 700);
    text(ctx, "A GAME OF ANGLES", 103, 55, 12, FAINT);
    text(
      ctx,
      "LOCAL PLAY  /  NO TWO RALLIES ALIKE",
      C.FIELD_W - 48,
      55,
      11,
      FAINT,
      400,
      "right",
    );
    line(ctx, 48, 80, C.FIELD_W - 48, 80, "#263940");
    if (s.screen === "title") {
      titleArt(ctx);
      text(ctx, "SPIN. BANK. OUTPLAY.", 110, 190, 13, MINT, 700);
      text(ctx, C.TITLE_TEXT, 102, 290, 108, INK, 900);
      text(ctx, "A paddle duel with a twist.", 110, 330, 20, FAINT);
    } else {
      text(ctx, "THE ART OF THE ANGLE", 110, 160, 13, MINT, 700);
      text(ctx, "HOW TO PLAY", 108, 221, 53, INK, 700);
      const rows = [
        [
          "01",
          "MOVE",
          "Solo: W / S or ↑ / ↓. Versus: W / S left, ↑ / ↓ right.",
        ],
        [
          "02",
          "ADD SPIN",
          "Move as you strike. Your paddle motion curves the ball’s flight.",
        ],
        [
          "03",
          "BANK THE SHOT",
          "The amber gates sway and turn. Use their faces to find a new angle.",
        ],
        [
          "04",
          "CLOSE IT OUT",
          "Score past your opponent. First to 11, with a two-point lead.",
        ],
      ];
      rows.forEach(([n, h, d], i) => {
        const y = 290 + i * 68;
        text(ctx, n, 110, y, 14, MINT);
        text(ctx, h, 155, y, 14, INK, 700);
        text(ctx, d, 155, y + 25, 16, FAINT);
      });
    }
  } else {
    ctx.fillStyle = "#0b141beF";
    ctx.fillRect(80, 140, 510, 470);
    text(
      ctx,
      s.screen === "paused" ? "TAKE A BREATHER" : "MATCH COMPLETE",
      110,
      195,
      12,
      MINT,
      700,
    );
    text(
      ctx,
      s.screen === "paused"
        ? "PAUSED"
        : s.winner === "left"
          ? "LEFT WINS"
          : "RIGHT WINS",
      106,
      265,
      54,
      INK,
      700,
    );
    text(
      ctx,
      s.screen === "paused"
        ? "Your next angle can wait."
        : `${s.score.p1} — ${s.score.p2}  /  ${s.mode.toUpperCase()}`,
      110,
      310,
      18,
      FAINT,
    );
  }
  menuItems(s).forEach((item, i) => {
    const r = menuItemRect(s, i)!;
    const selected = s.menuIndex === i;
    if (selected) {
      ctx.fillStyle = MINT;
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 5);
      ctx.fill();
    } else {
      ctx.strokeStyle = "#304047";
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }
    text(
      ctx,
      String(i + 1).padStart(2, "0"),
      r.x + 17,
      r.y + 34,
      11,
      selected ? "#43553b" : FAINT,
    );
    text(ctx, item, r.x + 55, r.y + 35, 18, selected ? "#172418" : INK, 700);
    text(
      ctx,
      selected ? "↗" : "+",
      r.x + r.w - 23,
      r.y + 35,
      20,
      selected ? "#172418" : FAINT,
      400,
      "center",
    );
  });
  line(ctx, 48, 652, C.FIELD_W - 48, 652, "#263940");
  text(ctx, "↑ ↓  SELECT     ENTER  PLAY     ESC  BACK", 110, 686, 11, FAINT);
  text(
    ctx,
    s.muted ? "M / SOUND OFF" : "M / SOUND ON",
    C.FIELD_W - 48,
    686,
    11,
    FAINT,
    400,
    "right",
  );
  ctx.restore();
}
