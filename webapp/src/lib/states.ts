import type { StateKind } from "../types";

/** Dark-surface palette (validated categorical steps). Engaged = cool, off-task = warm. */
export const STATE_COLOR: Record<StateKind, string> = {
  listening: "#3987e5",
  writing: "#199e70",
  speaking: "#9085e9",
  looking_away: "#c98500",
  chatting: "#d95926",
  phone: "#e66767",
  asleep: "#d55181",
  other: "#8a897f",
};

export const STATE_LABEL: Record<StateKind, string> = {
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
  looking_away: "Looking away",
  chatting: "Chatting",
  phone: "On phone",
  asleep: "Asleep",
  other: "Other",
};

export const ON_TASK: StateKind[] = ["listening", "writing", "speaking"];

export function isOnTask(state: StateKind): boolean {
  return ON_TASK.includes(state);
}
