import test from "node:test";
import assert from "node:assert/strict";
import { InputHub, mapGamepad } from "../src/input.js";
function pad(buttons = [], axes = [0, 0]) {
  return {
    index: 3,
    id: "Test controller",
    mapping: "standard",
    connected: true,
    buttons: Array.from({ length: 17 }, (_, i) => ({
      pressed: buttons.includes(i),
      value: buttons.includes(i) ? 1 : 0,
    })),
    axes,
  };
}
test("standard buttons cover gameplay, menus and presentation", () => {
  const a = mapGamepad(
    pad([0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15]),
  ).actions;
  for (const k of [
    "interact",
    "cancel",
    "inventory",
    "fart",
    "viewTop",
    "viewBottom",
    "restart",
    "pause",
    "camera",
    "style",
    "up",
    "down",
    "left",
    "right",
  ])
    assert.ok(a.has(k));
});
test("stick dead zone and hysteresis reject drift", () => {
  assert.equal(mapGamepad(pad([], [0.2, -0.2])).axis, null);
  assert.equal(mapGamepad(pad([], [0, -0.4])).axis, "up");
  assert.equal(mapGamepad(pad([], [0, -0.26]), "up").axis, "up");
  assert.equal(mapGamepad(pad([], [0, -0.21]), "up").axis, null);
});
test("confirm is edge triggered and direction repeat is bounded", () => {
  let pressed = [],
    p = pad([0, 13]),
    h = new InputHub({
      onAction: (a, o) => pressed.push([a, o.repeat]),
      getGamepads: () => [null, null, null, p],
    });
  h.poll(0);
  h.poll(100);
  h.poll(349);
  assert.equal(pressed.filter(([a]) => a === "interact").length, 1);
  h.poll(350);
  h.poll(400);
  h.poll(470);
  assert.equal(pressed.filter(([a]) => a === "down").length, 3);
});
test("two touch sources survive one pointer being released", () => {
  let h = new InputHub({ onAction: () => {} });
  h.setSource("pointer:1", new Set(["up"]), 0);
  h.setSource("pointer:2", new Set(["interact"]), 0);
  assert.equal(h.direction(), "up");
  assert.ok(h.held.has("interact"));
  h.setSource("pointer:2", new Set(), 1);
  assert.equal(h.direction(), "up");
  h.setSource("pointer:1", new Set(), 2);
  assert.equal(h.held.size, 0);
});
test("reset latches held buttons until release", () => {
  let actions = [],
    p = pad([9]),
    h = new InputHub({
      onAction: (a) => actions.push(a),
      getGamepads: () => [p],
    });
  h.poll(0);
  h.clear();
  h.poll(100);
  h.poll(200);
  assert.deepEqual(actions, ["pause"]);
  p = pad();
  h.poll(300);
  p = pad([9]);
  h.poll(400);
  assert.deepEqual(actions, ["pause", "pause"]);
});
test("disconnect clears movement and reports once", () => {
  let disconnected = 0,
    pads = [pad([12])],
    h = new InputHub({
      onAction: () => {},
      getGamepads: () => pads,
      onDisconnect: () => disconnected++,
    });
  h.poll(0);
  assert.equal(h.direction(), "up");
  pads = [];
  h.poll(100);
  h.poll(200);
  assert.equal(h.direction(), null);
  assert.equal(disconnected, 1);
});
