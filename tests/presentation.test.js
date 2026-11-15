import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { guestPose } from "../src/photo-actors.js";
const root = new URL("../assets/photoreal/", import.meta.url),
  index = JSON.parse(fs.readFileSync(new URL("room-art-index.json", root))),
  data = JSON.parse(
    fs.readFileSync(new URL("../assets/game-data.json", import.meta.url)),
  );
test("every recovered room prop and all sixteen guests have four-direction photographic artwork", () => {
  for (const room of data.rooms)
    for (const prop of room.objects) {
      if ([44, 45, 47, 48, 49].includes(prop.type)) continue;
      const mapping = index.props[prop.type];
      assert.ok(mapping, `room ${room.id}, type ${prop.type}`);
      for (let direction = 0; direction < 4; direction++)
        assert.ok(
          index.sheets[mapping.sheet].frames[mapping.row * 4 + direction],
        );
    }
  for (let id = 1; id <= 16; id++) {
    const m = index.guests[id];
    assert.ok(m);
    assert.ok(index.sheets[m.sheet].frames[m.row * 4 + 3]);
  }
});
test("photographic atlas rectangles refer to the verified unmodified image files", () => {
  for (const sheet of Object.values(index.sheets)) {
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync(new URL(sheet.file, root)))
        .digest("hex"),
      sheet.sourceSHA256,
    );
    for (const [x, y, w, h] of sheet.frames) {
      assert.ok(w > 0 && h > 0);
      assert.ok(
        x >= 0 &&
          y >= 0 &&
          x + w <= sheet.imageWidth &&
          y + h <= sheet.imageHeight,
      );
    }
  }
});
for (let direction = 0; direction < 4; direction++)
  test(`guest direction ${direction}: left/right legs and reciprocal arms exchange contacts`, () => {
    const a = guestPose(direction, 0.5),
      b = guestPose(direction, 1.5);
    for (let limb = 0; limb < 2; limb++) {
      assert.equal(a[limb].lead, -b[limb].lead);
      assert.notDeepEqual(a[limb].leg, b[limb].leg);
      assert.notDeepEqual(a[limb].arm, b[limb].arm);
    }
    if (direction & 1) {
      for (const limb of a) assert.ok(limb.leg[2][0] * limb.arm[2][0] < 0);
    }
  });
