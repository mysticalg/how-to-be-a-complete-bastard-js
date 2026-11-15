import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
const root = new URL("../assets/photoreal/", import.meta.url),
  index = JSON.parse(fs.readFileSync(new URL("atlas-index.json", root))),
  audit = JSON.parse(fs.readFileSync(new URL("frame-audit.json", root)));
for (const name of ["player", "male", "female"])
  test(`${name}: all 20 standing/walk directional frames are indexed and nonempty`, () => {
    let sheet = index[name],
      png = fs.readFileSync(new URL(sheet.file, root));
    assert.equal(sheet.rows, 5);
    assert.equal(sheet.columns, 4);
    assert.equal(sheet.frames.length, 20);
    assert.equal(
      createHash("sha256").update(png).digest("hex"),
      sheet.sourceSHA256,
    );
    for (let i = 0; i < 20; i++) {
      let [x, y, w, h] = sheet.frames[i];
      assert.ok(w > 25 && h > 100);
      assert.ok(
        x >= 0 &&
          y >= 0 &&
          x + w <= sheet.imageWidth &&
          y + h <= sheet.imageHeight,
      );
      assert.ok(sheet.anchors[i].x >= 0 && sheet.anchors[i].x <= w);
      assert.equal(sheet.anchors[i].y, h);
    }
    assert.equal(
      new Set(
        audit.frames.filter((f) => f.asset === name).map((f) => f.sourceSHA256),
      ).size,
      20,
    );
  });
test("atlas index uses actual alpha source bounds instead of nominal row slicing", () => {
  const female = index.female;
  assert.ok(
    female.frames.some(
      (f, i) => f[1] > Math.round((Math.floor(i / 4) * female.imageHeight) / 5),
    ),
  );
  assert.equal(audit.totalNonemptyFrames, 68);
});
test("active player walk selects two approved contacts for every direction", () => {
  const contacts = JSON.parse(
    fs.readFileSync(new URL("player-contacts.json", root)),
  );
  assert.equal(contacts.poses.length, 4);
  for (const pair of contacts.poses) {
    assert.equal(pair.length, 2);
    assert.notDeepEqual(pair[0], pair[1]);
    for (const [key, col] of pair) {
      const meta = contacts.sources[key];
      assert.ok(meta.frames[col][3] > 500);
      assert.equal(
        createHash("sha256")
          .update(fs.readFileSync(new URL(meta.file, root)))
          .digest("hex"),
        meta.sourceSHA256,
      );
    }
  }
});
