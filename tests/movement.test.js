import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { World } from "../src/world.js";
import { IsometricMotion, screenToWorld } from "../src/movement.js";
import { projectWorld } from "../src/isometric.js";
const data = JSON.parse(
  fs.readFileSync(new URL("../assets/game-data.json", import.meta.url)),
);
for (let turn = 0; turn < 4; turn++)
  for (const [name, x, y] of [
    ["left", -1, 0],
    ["right", 1, 0],
    ["up", 0, -1],
    ["down", 0, 1],
    ["up-left", -1, -1],
    ["up-right", 1, -1],
    ["down-left", -1, 1],
    ["down-right", 1, 1],
  ])
    test(`screen-space ${name}, camera ${turn}: straight and constant speed`, () => {
      const w = new World(data);
      w.actors = [];
      w.room.objects = [];
      w.room.doors.fill(128);
      w.views[0] = turn * 4;
      const m = new IsometricMotion(w);
      m.reset(0);
      const start = projectWorld(26, 26, 0, turn),
        length = Math.hypot(x, y),
        speed = 7.3 / Math.sqrt(3);
      for (let i = 0; i < 24; i++) {
        const old = { x: w.player.x, y: w.player.y };
        m.step({ x, y });
        assert.ok(
          Math.abs(w.player.x - old.x) + Math.abs(w.player.y - old.y) <= 1,
          "at most one original step per tick",
        );
        m.capture(i * 80, true);
        const p = m.sample(i * 80 + 80).player,
          screen = projectWorld(p.x, p.y, 0, turn);
        assert.ok(
          Math.abs(screen.x - start.x - (x / length) * speed * (i + 1)) <
            0.0001,
        );
        assert.ok(
          Math.abs(screen.y - start.y - (y / length) * speed * (i + 1)) <
            0.0001,
        );
      }
    });
test("isometric steering retains original wall collision", () => {
  let w = new World(data);
  w.actors = [];
  w.room.objects = [];
  w.player.x = 3;
  w.player.y = 8;
  w.room.doors.fill(64);
  let m = new IsometricMotion(w);
  m.reset(0);
  for (let i = 0; i < 35; i++) {
    m.step({ x: -1, y: 1 });
    m.capture(i * 80, true);
    assert.ok(w.player.x >= 3);
    assert.ok(m.sample(i * 80 + 80).player.x >= 3);
  }
});
test("original aligned doorway remains traversable with screen-space steering", () => {
  let w = new World(data);
  w.actors = [];
  w.player.x = 48;
  w.player.y = 40;
  let m = new IsometricMotion(w);
  m.reset(0);
  for (let i = 0; i < 8; i++) {
    m.step({ x: Math.sqrt(3) / 2, y: -0.5 });
    m.capture(i * 80, true);
  }
  assert.equal(w.room.id, 7);
  assert.equal(w.player.y, 40);
  const p = m.sample(1000).player;
  assert.ok(Math.abs(p.x - w.player.x) <= 1);
});
test("isometric projection uses equally scaled orthographic world axes", () => {
  let p = projectWorld(0, 0),
    x = projectWorld(1, 0),
    y = projectWorld(0, 1),
    z = projectWorld(0, 0, 1);
  let length = (q) => Math.hypot(q.x - p.x, q.y - p.y);
  assert.ok(Math.abs(length(x) - length(y)) < 1e-10);
  assert.ok(Math.abs(length(x) - length(z)) < 1e-10);
});
