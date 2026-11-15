import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { composeView } from "../src/renderer.js";
import { World } from "../src/world.js";
const data = JSON.parse(
  fs.readFileSync(new URL("../assets/game-data.json", import.meta.url)),
);
const fixtures = JSON.parse(
  fs.readFileSync(new URL("./render-fixtures.json", import.meta.url)),
);
for (const fixture of fixtures)
  for (const view of [0, 4, 8, 12])
    test(`original renderer parity: room ${fixture.room}, view ${view}`, () => {
      const buffer = composeView(data, fixture.entities, fixture.doors, view),
        visible = [];
      for (let y = 0; y < 56; y++)
        visible.push(...buffer.slice(y * 26 + 2, y * 26 + 26));
      assert.equal(
        createHash("sha256").update(Buffer.from(visible)).digest("hex"),
        fixture.expectedSHA256[view],
      );
    });
test("all 115 rule records resolve response and extension references", () => {
  assert.equal(data.rules.length, 115);
  assert.equal(data.items.length, 115);
  assert.equal(data.sprites.length, 74);
  assert.equal(data.rooms.length, 14);
  for (const rule of data.rules) {
    for (const id of Object.values(rule.responses))
      assert.ok(data.messages[id]);
    let e = rule.extension;
    if (e) {
      assert.ok(data.messages[e.message]);
      assert.ok(data.specialVerbs[e.verb]);
    }
  }
});
test("a blocked wall preserves position", () => {
  let w = new World(data);
  w.actors = [];
  w.player.x = 3;
  w.player.y = 8;
  w.player.facing = 3;
  w.move(3);
  assert.equal(w.player.x, 3);
});
test("aligned doorway crosses to adjacent map cell", () => {
  let w = new World(data);
  w.actors = [];
  w.player.x = 48;
  w.player.y = 40;
  w.player.facing = 1;
  for (let i = 0; i < 4; i++) w.move(1);
  assert.equal(w.room.id, 7);
  assert.equal(w.player.x, 0);
  assert.equal(w.player.y, 40);
});
test("turning takes a tick before movement", () => {
  let w = new World(data);
  w.player.facing = 0;
  w.move(1);
  assert.equal(w.player.facing, 1);
  assert.equal(w.player.x, 26);
});
test("item search, take and consumption update named state", () => {
  let w = new World(data);
  let item = 0;
  w.search(w.locations[item]);
  assert.ok(w.menu.options.some((o) => o.label === w.itemName(item)));
  w.itemMenu(item);
  w.menu.options.find((o) => o.label.startsWith("TAKE ")).run();
  assert.ok(w.pockets.includes(item));
  assert.equal(w.locations[item], 255);
  w.useBasic(item, 0);
  assert.ok(!w.pockets.includes(item));
  assert.equal(w.score, -30);
});
test('native PRNG matches 100 original seed states', () => {
  const w = new World(data);
  const bytes = Buffer.alloc(200);
  for (let i = 0; i < 100; i++) {
    w.random();
    bytes.writeUInt16LE(w.randomSeed, i * 2);
  }
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '793d4529e4ae58aa9effbf7f9d5d0d7a83202b3c3b1c7e69d56c334cb83a8c40');
});
