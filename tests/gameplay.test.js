import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { World } from "../src/world.js";
const data = JSON.parse(
  fs.readFileSync(new URL("../assets/game-data.json", import.meta.url)),
);
const cases = JSON.parse(
  fs.readFileSync(new URL("./fixtures/guest-hashes.json", import.meta.url)),
);
function state(w) {
  return {
    seed: w.randomSeed,
    actors: w.actors.map((a) =>
      Object.fromEntries(
        ["id", "mapCell", "status", "countdown", "walkTimer"].map((k) => [
          k,
          a[k],
        ]),
      ),
    ),
    visible: w.visibleActors
      .map((a) => ({
        slot: a.slot,
        x: a.x,
        y: a.y,
        facing: a.facing,
        type: a.type,
        frame: a.frame,
      }))
      .sort((a, b) => a.slot - b.slot),
    rating: w.rating,
  };
}
for (const c of cases)
  test(`guest trajectory matches original: room ${c.room}, seed ${c.seed}`, () => {
    const w = new World(data);
    w.cell = data.map.indexOf(c.room);
    w.enterRoom();
    w.randomSeed = c.seed;
    const states = [];
    for (let i = 0; i < c.states; i++) {
      states.push(state(w));
      w.updateActors();
    }
    assert.equal(
      createHash("sha256").update(JSON.stringify(states)).digest("hex"),
      c.sha256,
    );
  });
test("all 23 special callbacks are named native functions, with trap scoring and recovery", () => {
  let w = new World(data);
  w.specialRoutine(9);
  assert.equal(w.score, 1000);
  assert.equal(w.effects.drilledToilet, 6);
  assert.equal(w.effects.gluedToilet, 6);
  w = new World(data);
  w.smell = 17;
  w.specialRoutine(18);
  assert.equal(w.smell, 0);
  assert.equal(w.score, -170);
  w = new World(data);
  w.fart = 20;
  w.fartAction();
  assert.equal(w.score, 60);
  assert.equal(w.smell, 40);
  w = new World(data);
  w.cell = data.map.indexOf(7);
  w.enterRoom();
  w.fart = 1;
  w.fartAction();
  assert.equal(w.end, 4);
  assert.match(w.ending.title, /BLOWN/);
});
test("sixteen permanently affected guests win; temporary statuses recover and lower rating", () => {
  const w = new World(data);
  w.rating = 1;
  w.actors.forEach((a) => (a.status = 255));
  w.actors[0].status = 1;
  w.updateActors();
  assert.equal(w.rating, 0);
  assert.equal(w.actors[0].status, 0);
});
test("sixteen real guest actions reach the winning ending and leave the menu", () => {
  const w = new World(data),
    items = [26, 58, 63, 64, 67, 70, 102, 103, 1, 3, 7, 11, 15, 18, 22, 28];
  for (let i = 0; i < 16; i++) {
    const actor = w.actors[i],
      id = items[i],
      ext = data.rules[id].extension;
    w.cell = actor.mapCell;
    w.enterRoom();
    w.drunk = ext.condition & 2 ? 50 : 9;
    w.pockets = [id, ext.requires ?? null];
    w.guestMenu(actor);
    const option = w.menu.options.find(
      (o) => o.label === w.specialText(ext.verb, id),
    );
    assert.ok(option, `guest ${i + 1}, item ${id}`);
    option.run();
    if (i < 15) {
      assert.equal(w.rating, i + 1);
      w.menu = null;
    }
  }
  assert.equal(w.rating, 16);
  assert.equal(w.end, 5);
  assert.equal(w.menu, null);
  assert.equal(w.ending.rating, "COMPLETE BASTARD");
});
test("blackout defers the result, freezes simulation, then restores its menu", () => {
  const w = new World(data);
  w.drunk = 50;
  w.useSpecial(4);
  assert.equal(w.menu, null);
  assert.equal(w.score, 0);
  assert.equal(w.effects.blackoutTicks, 383);
  for (let n = 0; n < 382; n++) w.tick();
  assert.equal(w.menu, null);
  assert.equal(w.tickNumber, 0);
  w.tick();
  assert.equal(w.score, 1);
  assert.equal(w.menu.options[0].label, "CONTINUE");
  assert.equal(w.tickNumber, 0);
});
const effects = JSON.parse(
  fs.readFileSync(new URL("./fixtures/effect-states.json", import.meta.url)),
);
const itemOutcomes = JSON.parse(
  fs.readFileSync(new URL("./fixtures/item-outcomes.json", import.meta.url)),
);
const referenceText = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/item-reference-text.json", import.meta.url),
  ),
);
for (const expected of referenceText)
  test(`item ${expected.item}: original encoded noun expansion`, () => {
    const w = new World({ ...data, specialVerbs: [{ text: "X$Y" }] });
    assert.equal(w.specialText(0, expected.item, null), expected.text);
  });
const groundSpecials = JSON.parse(
  fs.readFileSync(new URL("./fixtures/ground-specials.json", import.meta.url)),
);
const contexts = JSON.parse(
  fs.readFileSync(new URL("./fixtures/context-actions.json", import.meta.url)),
);
const furniture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/furniture-actions.json", import.meta.url),
  ),
);
for (const e of furniture)
  test(`furniture ${e.type} ${e.action}: original score, pockets, mutation and transition`, () => {
    const w = new World(data);
    w.cell = data.map.indexOf(e.room);
    w.enterRoom();
    Object.assign(w, { fart: 13, wee: 11, drunk: 9, smell: 7 });
    if (e.action === "burn") {
      w.pockets[0] = 114;
      w.locations[114] = 255;
    }
    if (e.action === "smash") {
      w.pockets[0] = 56;
      w.locations[56] = 255;
    }
    if (e.type === 43) {
      w.pockets = [0, 1];
      w.locations[0] = w.locations[1] = 255;
    }
    const target = w.room.objects[e.index];
    w.interact(target);
    const label =
      e.action === "bespoke"
        ? data.containerVerbs[
            { 62: 6, 47: 5, 43: 9, 25: 8, 50: 7 }[e.type]
          ].text.trim()
        : { urinate: "URINATE", burn: "BURN IT", smash: "SMASH IT" }[e.action];
    const option = w.menu.options.find((o) => o.label === label);
    assert.ok(option, label);
    option.run();
    for (const k of ["score", "wee", "cell"]) assert.equal(w[k], e[k], k);
    assert.equal(w.player.y, e.y);
    assert.equal(w.player.facing, e.facing);
    assert.deepEqual(w.pockets, e.pockets);
    assert.equal(w.randomSeed, e.seed);
    if (e.action !== "bespoke") {
      assert.equal(target.type, e.objectType, "type");
      assert.equal(target.height, e.objectHeight, "height");
      assert.equal(target.flags, e.objectFlags, "flags");
    }
  });
const traps = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/trap-trajectories.json", import.meta.url),
  ),
);
for (const c of traps)
  test(`trap consumption, injuries, recovery, rating and occupancy: seed ${c.seed}`, () => {
    const w = new World(data);
    w.randomSeed = c.seed;
    Object.assign(w.effects, {
      toiletFilm: 10,
      carpet: 6,
      drilledToilet: 10,
      gluedToilet: 10,
      hole: 2,
      rake: 2,
      chairPin: 7,
      whoopee: 7,
    });
    let tick = 0;
    for (const f of c.frames) {
      while (tick < f.tick) {
        w.updateActors();
        tick++;
      }
      const actual = {
        tick,
        ...state(w),
        score: w.score,
        traps: [
          "toiletFilm",
          "carpet",
          "drilledToilet",
          "gluedToilet",
          "hole",
          "rake",
          "chairPin",
          "whoopee",
        ].map((k) => w.effects[k] || 0),
        occupied: !!w.effects.toiletOccupied,
      };
      assert.deepEqual(actual, f, `tick ${tick}`);
    }
  });
for (const e of contexts)
  test(`context item ${e.item} on ${e.kind} ${e.target}: original result`, () => {
    const w = new World(data),
      ext = data.rules[e.item].extension;
    w.cell = data.map.indexOf(e.room);
    if (e.kind === "furniture" && ext.condition & 128)
      for (const a of w.actors) a.status = 255;
    w.enterRoom();
    Object.assign(w, {
      fart: 13,
      wee: 11,
      drunk: ext.condition & 2 ? 50 : 9,
      smell: 7,
    });
    w.pockets[0] = e.item;
    if (ext.requires !== undefined) w.pockets[1] = ext.requires;
    const target =
      e.kind === "guest"
        ? w.actors[e.target - 1]
        : w.room.objects.find((o) => o.type === e.target);
    w.useSpecial(e.item, target);
    for (const k of ["score", "fart", "wee", "drunk", "smell", "end", "rating"])
      assert.equal(w[k], e[k], k);
    assert.deepEqual(w.pockets, e.pockets);
    if (e.kind === "guest") assert.equal(target.status, e.status);
    assert.deepEqual(
      [
        "toiletFilm",
        "carpet",
        "drilledToilet",
        "gluedToilet",
        "hole",
        "rake",
        "chairPin",
        "whoopee",
      ].map((k) => w.effects[k] || 0),
      e.traps,
    );
  });
for (const e of groundSpecials)
  test(`ground special ${e.item}: original outcome, prerequisite retention and ending`, () => {
    const w = new World(data);
    Object.assign(w, { fart: 13, wee: 11, drunk: e.initialDrunk, smell: 7 });
    const required = data.rules[e.item].extension.requires;
    if (required !== undefined) w.pockets[0] = required;
    w.useSpecial(e.item);
    while (w.effects.blackoutTicks) w.tick();
    for (const k of ["score", "fart", "wee", "drunk", "smell", "end"])
      assert.equal(w[k], e[k], k);
    assert.deepEqual(w.pockets, e.pockets);
    assert.equal(w.locations[e.item], e.location);
  });
for (const e of itemOutcomes)
  test(`item ${e.item} verb ${e.verb}: original score/meters/removal`, () => {
    const w = new World(data);
    Object.assign(w, { fart: 13, wee: 11, drunk: 9, smell: 7 });
    w.useBasic(e.item, e.verb);
    for (const k of ["score", "fart", "wee", "drunk", "smell"])
      assert.equal(w[k], e[k], k);
    assert.equal(w.locations[e.item], e.location);
  });
for (const expected of effects)
  test(`special callback ${expected.routine} matches original meters, traps, score and guests`, () => {
    const w = new World(data);
    Object.assign(w, { fart: 13, wee: 11, drunk: 9, smell: 7 });
    w.specialRoutine(expected.routine);
    for (const k of ["score", "fart", "wee", "drunk", "smell"])
      assert.equal(w[k], expected[k], k);
    assert.equal(w.end, expected.reason);
    assert.deepEqual(w.pockets, expected.pockets);
    assert.equal(w.randomSeed, expected.seed);
    assert.deepEqual(
      w.actors.map((a) => a.room),
      expected.rooms,
    );
    assert.deepEqual(
      [
        "toiletFilm",
        "carpet",
        "drilledToilet",
        "gluedToilet",
        "hole",
        "rake",
        "chairPin",
        "whoopee",
      ].map((k) => w.effects[k] || 0),
      expected.traps,
    );
    assert.equal(w.player.type, expected.disguise);
    assert.equal(!!w.effects.stereo, !!expected.stereo);
  });
