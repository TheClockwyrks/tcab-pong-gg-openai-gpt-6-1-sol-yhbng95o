import type { CaromState, State } from "./game";
import type { UpdateApi } from "@clockwyrks/simple-2d";
import {
  ACTIONS,
  TITLE_ITEMS,
  PAUSE_ITEMS,
  MATCHOVER_ITEMS,
} from "./constants";
import { startMatch, title } from "./world";

export function menuItems(s: State): readonly string[] {
  switch (s.screen) {
    case "title":
      return TITLE_ITEMS;
    case "paused":
      return PAUSE_ITEMS;
    case "matchover":
      return MATCHOVER_ITEMS;
    case "howto":
      return ["BACK TO MENU"];
    default:
      return [];
  }
}
export function menuItemRect(s: State, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= menuItems(s).length)
    return null;
  return {
    x: 110,
    y: (s.screen === "howto" ? 580 : 365) + index * 67,
    w: 400,
    h: 55,
  };
}
function confirm(s: State): CaromState {
  if (s.screen === "title") {
    const selected = { ...s, titleIndex: s.menuIndex };
    return s.menuIndex === 2
      ? { ...selected, screen: "howto", menuIndex: 0 }
      : startMatch(selected, s.menuIndex === 0 ? "solo" : "versus");
  }
  if (s.screen === "howto") return title(s);
  if (s.screen === "paused")
    return s.menuIndex === 0
      ? { ...s, screen: s.resumeScreen }
      : s.menuIndex === 1
        ? startMatch(s, s.mode)
        : title(s);
  if (s.screen === "matchover")
    return s.menuIndex === 0 ? startMatch(s, s.mode) : title(s);
  return s;
}
export function readMenus(state: State, api: UpdateApi): CaromState {
  const edges = Object.fromEntries(
    ACTIONS.map((a) => [a, api.input.pressed(a)]),
  );
  const samples = api.input.pointerSamples();
  api.input.pointer();
  api.input.pointerContacts();
  let s: CaromState = {
    ...state,
    muted: edges.mute ? !state.muted : state.muted,
  };
  api.audio.setMuted(s.muted);
  const live = state.screen === "countdown" || state.screen === "playing";
  if (live)
    return edges.pause
      ? {
          ...s,
          resumeScreen: state.screen as "playing" | "countdown",
          screen: "paused",
          menuIndex: 0,
        }
      : s;
  if (state.screen === "paused" && (edges.pause || edges.back))
    return { ...s, screen: s.resumeScreen };
  if ((state.screen === "howto" || state.screen === "matchover") && edges.back)
    return title(s);
  const count = menuItems(s).length;
  const up = edges["p1-up"] || edges["p2-up"];
  const down = edges["p1-down"] || edges["p2-down"];
  if (up) s = { ...s, menuIndex: (s.menuIndex + count - 1) % count };
  else if (down) s = { ...s, menuIndex: (s.menuIndex + 1) % count };
  const keyboardConfirm = !up && !down && edges.confirm;
  if (keyboardConfirm) return confirm(s);
  const presses = { ...state.menuPresses };
  let clicked = false;
  for (const sample of samples) {
    const index = menuItems(s).findIndex((_, i) => {
      const r = menuItemRect(s, i)!;
      return (
        sample.x >= r.x &&
        sample.x <= r.x + r.w &&
        sample.y >= r.y &&
        sample.y <= r.y + r.h
      );
    });
    if (index >= 0) s = { ...s, menuIndex: index };
    if (sample.type === "down") presses[sample.id] = index;
    if (sample.type === "up") {
      if (index >= 0 && presses[sample.id] === index) clicked = true;
      delete presses[sample.id];
    }
  }
  s = { ...s, menuPresses: presses };
  return clicked ? confirm(s) : s;
}
