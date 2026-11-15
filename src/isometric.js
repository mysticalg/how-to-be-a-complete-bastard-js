// A scene renderer over the recovered x/y plane, not a second game simulation.
// Footprints and door positions are recovered; elevations and architectural meshes
// are inferred because the original stores sprite projections rather than 3D meshes.
const colours = [
  "#161b20",
  "#242487",
  "#872828",
  "#873c87",
  "#497c4f",
  "#4c9393",
  "#96904d",
  "#949b9c",
];
const actorCache = new Map();
let lastPlayerAudit = null;
export function getPlayerRenderAudit() {
  return lastPlayerAudit;
}
export const PHOTO_FILES = {
  player: "assets/photoreal/player-walk.png",
  male: "assets/photoreal/male-walk.png",
  female: "assets/photoreal/female-walk.png",
  props: "assets/photoreal/props.png",
  stairs: "assets/photoreal/stairs.png",
  materials: "assets/photoreal/materials.png",
};
export const photos = { loaded: false, loading: false, failed: false };
export async function loadPhotoreal(redraw) {
  if (photos.loaded || photos.loading || photos.failed) return;
  photos.loading = true;
  try {
    const atlasIndex = await (
      await fetch("assets/photoreal/atlas-index.json")
    ).json();
    const contacts = await (
      await fetch("assets/photoreal/player-contacts.json")
    ).json();
    photos.contacts = contacts;
    const files = {
      ...PHOTO_FILES,
      ...Object.fromEntries(
        Object.entries(contacts.sources).map(([key, meta]) => [
          "contact_" + key,
          "assets/photoreal/" + meta.file,
        ]),
      ),
    };
    await Promise.all(
      Object.entries(files).map(
        ([key, src]) =>
          new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
              const meta =
                atlasIndex[key] ||
                contacts.sources[key.replace("contact_", "")];
              image.frames = meta?.frames;
              image.anchors = meta?.anchors;
              image.referenceHeight = meta?.referenceHeight;
              image.columns = atlasIndex[key]?.columns;
              image.rows = atlasIndex[key]?.rows;
              photos[key] = image;
              resolve();
            };
            image.onerror = reject;
            image.src = src;
          }),
      ),
    );
    photos.loaded = true;
  } catch {
    photos.failed = true;
  }
  photos.loading = false;
  redraw();
}
export function rotateWorld(x, y, turn) {
  switch (turn & 3) {
    case 1:
      return [y, 52 - x];
    case 2:
      return [52 - x, 52 - y];
    case 3:
      return [52 - y, x];
    default:
      return [x, y];
  }
}
export function projectWorld(x, y, z = 0, turn = 0) {
  const [u, v] = rotateWorld(x, y, turn);
  return {
    x: 512 + (u - v) * 7.3,
    y: 612 - (u + v) * (7.3 / Math.sqrt(3)) - z * (14.6 / Math.sqrt(3)),
  };
}
function polygon(ctx, points, colour, stroke = "#14232c") {
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
function prism(ctx, project, x, y, width, depth, height, palette, base = 0) {
  const p = (u, v, z) => project(u, v, z);
  const turn = project.turn || 0,
    sideY = turn >= 2 ? y + depth : y,
    sideX = turn === 1 || turn === 2 ? x + width : x;
  polygon(
    ctx,
    [
      p(x, sideY, base),
      p(x + width, sideY, base),
      p(x + width, sideY, height),
      p(x, sideY, height),
    ],
    palette[1],
  );
  polygon(
    ctx,
    [
      p(sideX, y, base),
      p(sideX, y + depth, base),
      p(sideX, y + depth, height),
      p(sideX, y, height),
    ],
    palette[2],
  );
  polygon(
    ctx,
    [
      p(x, y, height),
      p(x + width, y, height),
      p(x + width, y + depth, height),
      p(x, y + depth, height),
    ],
    palette[0],
  );
}
function textureQuad(ctx, image, source, quad) {
  const [p0, p1, p2, p3] = quad;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  for (const p of [p1, p2, p3]) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(
    (p1.x - p0.x) / 512,
    (p1.y - p0.y) / 512,
    (p3.x - p0.x) / 512,
    (p3.y - p0.y) / 512,
    p0.x,
    p0.y,
  );
  ctx.drawImage(image, ...source, 0, 0, 512, 512);
  ctx.restore();
}
function originalActor(data, entity, view, colour) {
  let orientation = data.orientation[view + entity.facing],
    frame = entity.isoFrame ?? entity.frame & 3;
  if (entity.isoFrame === undefined && !(orientation & 1)) frame >>= 1;
  const key = `${entity.type}:${orientation}:${frame}:${colour}`;
  if (actorCache.has(key)) return actorCache.get(key);
  const record = data.sprites[entity.type],
    variant = orientation === 3 ? 1 : orientation;
  const body = record.frames[variant][frame % record.frames[variant].length];
  const head =
    entity.type > 0 && entity.type < 17
      ? data.heads[(entity.type - 1) >> 1][
          orientation === 0 ? 0 : orientation === 2 ? 3 : frame & 1 ? 2 : 1
        ]
      : null;
  const height = record.height + (head ? 8 : 0),
    width = Math.max(body.width, head?.width || 0) * 8;
  const image = document.createElement("canvas");
  image.width = width;
  image.height = height;
  const pixels = image.getContext("2d").createImageData(width, height);
  const palette = [0, 0, 0];
  const paper = [
    colour & 2 ? 205 : 0,
    colour & 4 ? 205 : 0,
    colour & 1 ? 205 : 0,
  ];
  const add = (sprite, offset) => {
    for (let row = 0; row < sprite.rows.length / sprite.width; row++)
      for (let col = 0; col < sprite.width; col++) {
        const [mask, bits] = sprite.rows[row * sprite.width + col];
        for (let b = 0; b < 8; b++)
          if ((~mask | bits) & (128 >> b)) {
            const x = col * 8 + b,
              p = ((offset + row) * width + x) * 4,
              c = bits & (128 >> b) ? palette : paper;
            pixels.data[p] = c[0];
            pixels.data[p + 1] = c[1];
            pixels.data[p + 2] = c[2];
            pixels.data[p + 3] = 255;
          }
      }
  };
  if (head) add(head, 0);
  add(body, head ? 8 : 0);
  image.getContext("2d").putImageData(pixels, 0, 0);
  image.anchorX = width / 2;
  image.anchorY = height;
  if (entity.type < 17) {
    let count = 0,
      sum = 0;
    for (let y = 0; y < Math.min(10, height); y++)
      for (let x = 0; x < width; x++) {
        const p = (y * width + x) * 4;
        if (
          pixels.data[p + 3] &&
          pixels.data[p] === 0 &&
          pixels.data[p + 1] === 0 &&
          pixels.data[p + 2] === 0
        ) {
          sum += x + 0.5;
          count++;
        }
      }
    // The Spectrum side frames contain an intentional alternating FOUR-pixel
    // horizontal placement offset, compensating for its byte-aligned renderer.
    // The continuous isometric projection already moves the actor, so retaining
    // that offset double-counts the displacement and makes left/right stagger.
    // Pivot each isometric cutout around its stable head/root column instead.
    if (count) image.anchorX = sum / count;
  }
  image.frameInfo = {
    orientation,
    frame,
    address: body.address,
    anchorX: image.anchorX,
    anchorY: image.anchorY,
  };
  if (orientation === 3) {
    const mirrored = document.createElement("canvas");
    mirrored.width = width;
    mirrored.height = height;
    const c = mirrored.getContext("2d");
    c.translate(width, 0);
    c.scale(-1, 1);
    c.drawImage(image, 0, 0);
    mirrored.anchorX = width - image.anchorX;
    mirrored.anchorY = height;
    mirrored.frameInfo = { ...image.frameInfo, anchorX: mirrored.anchorX };
    actorCache.set(key, mirrored);
    return mirrored;
  }
  actorCache.set(key, image);
  return image;
}
function atlas(
  ctx,
  image,
  columns,
  rows,
  col,
  row,
  anchor,
  height,
  base = 0.91,
) {
  ctx.imageSmoothingEnabled = true;
  const bounds = image.frames?.[row * columns + col];
  if (bounds) {
    const scale = height / (image.referenceHeight || bounds[3]),
      width = bounds[2] * scale,
      h = bounds[3] * scale;
    const root = image.anchors?.[row * columns + col] || {
      x: bounds[2] / 2,
      y: bounds[3],
    };
    ctx.drawImage(
      image,
      ...bounds,
      anchor.x - root.x * scale,
      anchor.y - root.y * scale,
      width,
      h,
    );
    return;
  }
  const cellW = image.width / columns,
    cellH = image.height / rows;
  const h = height / 0.78,
    w = (h * cellW) / cellH;
  ctx.drawImage(
    image,
    col * cellW,
    row * cellH,
    cellW,
    cellH,
    anchor.x - w / 2,
    anchor.y - h * base,
    w,
    h,
  );
}
function drawDoor(ctx, project, side, value, photo) {
  if (value >= 55) return;
  const centre = (value + 1) * 2 + 1.5,
    start = centre - 3,
    end = centre + 3;
  const point = (t, z) =>
    side === 0
      ? project(t, 0, z)
      : side === 1
        ? project(52, t, z)
        : side === 2
          ? project(t, 52, z)
          : project(0, t, z);
  polygon(
    ctx,
    [point(start, 0), point(end, 0), point(end, 10), point(start, 10)],
    photo ? "#1a2527" : "#102f36",
    photo ? "#9c7a50" : "#a9d8d8",
  );
}
export function drawIsometric(
  ctx,
  world,
  data,
  { photoreal = false, visual = null } = {},
) {
  const turn = world.views[0] >> 2,
    project = (x, y, z = 0) => projectWorld(x, y, z, turn),
    room = world.room;
  project.turn = turn;
  const photo = photoreal && photos.loaded,
    material = photos.materials;
  ctx.fillStyle = photo ? "#171b20" : "#101c26";
  ctx.fillRect(0, 0, 1024, 768);
  const floor = [
    project(0, 0),
    project(52, 0),
    project(52, 52),
    project(0, 52),
  ];
  polygon(ctx, floor, colours[(room.colour >> 3) & 7], "#1a3740");
  if (photo)
    textureQuad(
      ctx,
      material,
      [0, 0, material.width / 2, material.height],
      floor,
    );
  else
    for (let n = 0; n <= 52; n += 4) {
      ctx.beginPath();
      let a = project(n, 0),
        b = project(n, 52),
        c = project(0, n),
        d = project(52, n);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.strokeStyle = "#ffffff16";
      ctx.stroke();
    }
  // Back cutaway wall planes are inferred, while their portals use original door records.
  for (const side of [0, 1, 2, 3]) {
    const ends =
      side === 0
        ? [
            [0, 0],
            [52, 0],
          ]
        : side === 1
          ? [
              [52, 0],
              [52, 52],
            ]
          : side === 2
            ? [
                [52, 52],
                [0, 52],
              ]
            : [
                [0, 52],
                [0, 0],
              ];
    const midpoint = rotateWorld(
      (ends[0][0] + ends[1][0]) / 2,
      (ends[0][1] + ends[1][1]) / 2,
      turn,
    );
    const back = midpoint[0] === 52 || midpoint[1] === 52;
    if (!back || room.doors[side] >= 128) continue;
    const wall = [
      project(...ends[0], 0),
      project(...ends[1], 0),
      project(...ends[1], 14),
      project(...ends[0], 14),
    ];
    polygon(ctx, wall, photo ? "#b3ac98" : "#315761", "#10262e");
    if (photo)
      textureQuad(
        ctx,
        material,
        [material.width / 2, 0, material.width / 2, material.height],
        wall,
      );
    drawDoor(ctx, project, side, room.doors[side], photo);
  }
  const entities = world.entities
    .filter((e) => e.flags & 1)
    .map((entity) => {
      const sample =
        entity === world.player
          ? visual?.player
          : visual?.actors?.get(entity.id);
      return sample ? { ...entity, ...sample } : entity;
    });
  const sorted = entities
    .map((entity, index) => {
      const [x, y] = rotateWorld(entity.x, entity.y, turn);
      return { entity, index, depth: x + y };
    })
    .sort((a, b) => b.depth - a.depth || a.index - b.index);
  let stairsDone = false;
  for (const { entity: e } of sorted) {
    const definition = data.sprites[e.type],
      size = world.dimensions(e),
      actor = e.type < 17;
    const centre = { x: e.x + size[0] / 2, y: e.y + size[1] / 2 };
    let anchor = project(centre.x, centre.y),
      height = (actor ? 32 : definition.height) / 4;
    const lift = actor ? 0 : Math.max(0, 56 - definition.height - e.height) / 4;
    if (actor) {
      ctx.fillStyle = "#00000035";
      ctx.beginPath();
      ctx.ellipse(anchor.x, anchor.y, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      const orientation = data.orientation[world.views[0] + e.facing];
      const walking =
        !world.menu && !world.end && !e.status && (e.moving ?? !!(e.frame & 3));
      const bob = walking
        ? Math.sin((e.phase ?? world.tickNumber) * 0.8) * 0.65
        : 0;
      anchor.y += bob;
      if (photo) {
        let sheet =
          e.type === 0
            ? photos.player
            : e.type >= 9
              ? photos.female
              : photos.male;
        let row = walking
            ? 1 +
              (Math.floor(((e.phase ?? performance.now() / 100) * 100) / 140) %
                4)
            : 0,
          col = orientation,
          columns = 4,
          rows = 5,
          phase = null,
          source = "candidate";
        if (e.type === 0 && walking) {
          phase =
            Math.floor(
              ((e.phase ?? performance.now() / 100) * 100) /
                photos.contacts.phaseMilliseconds,
            ) % 2;
          const pose = photos.contacts.poses[orientation][phase];
          source = pose[0];
          sheet = photos["contact_" + source];
          col = pose[1];
          row = 0;
          columns = photos.contacts.sources[source].columns;
          rows = 1;
        }
        atlas(ctx, sheet, columns, rows, col, row, anchor, height * 10);
        const frame = row * columns + col;
        if (e.type === 0)
          lastPlayerAudit = {
            style: "photoreal",
            worldX: e.x,
            worldY: e.y,
            screenX: anchor.x,
            screenY: anchor.y,
            facing: e.facing,
            truthFacing: world.player.facing,
            walkState: e.frame,
            orientation,
            row,
            phase,
            source,
            frame: phase === null ? frame : orientation * 2 + phase,
            sourceRect: sheet.frames[frame],
            anchorX: sheet.anchors[frame].x,
            anchorY: sheet.anchors[frame].y,
          };
      } else {
        const cycle =
          Math.floor(((e.phase ?? performance.now() / 100) * 100) / 140) % 4;
        // Side images are contact-A, passing-A, passing-B, contact-B. The old
        // ping-pong walk-state order is coupled to byte-alignment in Split.
        // Isometric uses the semantic cycle A -> passing -> B -> passing.
        const isoFrame = walking
          ? orientation & 1
            ? [0, 1, 3, 2][cycle]
            : Math.floor(cycle / 2)
          : orientation & 1
            ? 1
            : 0;
        const image = originalActor(
            data,
            { ...e, isoFrame },
            world.views[0],
            (room.colour >> 3) & 7,
          ),
          h = height * 10;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          image,
          anchor.x - (h * (image.anchorX ?? image.width / 2)) / image.height,
          anchor.y - h,
          (h * image.width) / image.height,
          h,
        );
        if (e.type === 0)
          lastPlayerAudit = {
            style: "original",
            worldX: e.x,
            worldY: e.y,
            screenX: anchor.x,
            screenY: anchor.y,
            facing: e.facing,
            truthFacing: world.player.facing,
            walkState: e.frame,
            cycle,
            ...image.frameInfo,
          };
      }
      continue;
    }
    if (room.id === 6 && [47, 48, 49].includes(e.type)) {
      if (!stairsDone) {
        if (photo) {
          const a = project(10, 43);
          atlas(
            ctx,
            photos.stairs,
            2,
            2,
            turn % 2,
            Math.floor(turn / 2),
            a,
            170,
            0.82,
          );
        } else {
          const palette = ["#8bb6b7", "#426d77", "#2b505c"];
          const steps = Array.from({ length: 12 }, (_, step) => ({
            step,
            p: rotateWorld(10, 36 + (step * 16) / 12, turn),
          })).sort((a, b) => b.p[0] + b.p[1] - a.p[0] - a.p[1]);
          for (const { step } of steps)
            prism(
              ctx,
              project,
              4,
              36 + (step * 16) / 12,
              12,
              16 / 12,
              ((step + 1) * 9.5) / 12,
              palette,
            );
        }
        stairsDone = true;
      }
      continue;
    }
    if (photo && [44, 45].includes(e.type)) {
      anchor = project(centre.x, centre.y, lift);
      atlas(
        ctx,
        photos.props,
        4,
        2,
        (e.facing + turn) & 3,
        e.type === 45 ? 0 : 1,
        anchor,
        height * 10,
      );
      continue;
    }
    const palette = photo
      ? ["#99734b", "#725039", "#4f392b"]
      : ["#8bb6b7", "#426d77", "#2b505c"];
    if ([47, 48, 49, 62].includes(e.type)) {
      for (let step = 0; step < 3; step++)
        prism(
          ctx,
          project,
          e.x,
          e.y + (size[1] * step) / 3,
          size[0],
          size[1] / 3,
          (height * (step + 1)) / 3,
          palette,
        );
    } else if (e.type === 45) {
      prism(
        ctx,
        project,
        e.x,
        e.y,
        Math.min(1.2, size[0]),
        size[1],
        height + lift,
        palette,
        lift,
      );
    } else if (e.type === 44) {
      prism(ctx, project, e.x, e.y, size[0], size[1], height, palette);
    } else {
      // Original furniture projections are retained above their inferred footprint meshes.
      prism(
        ctx,
        project,
        e.x,
        e.y,
        size[0],
        size[1],
        Math.max(1, height * 0.65),
        palette,
      );
      const image = originalActor(
          data,
          e,
          world.views[0],
          (room.colour >> 3) & 7,
        ),
        h = Math.max(28, height * 10);
      anchor = project(centre.x, centre.y, lift);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        image,
        anchor.x - (h * image.width) / image.height / 2,
        anchor.y - h,
        (h * image.width) / image.height,
        h,
      );
    }
  }
  // Front thresholds stay low to keep player/furniture visible and preserve every exit.
  for (const side of [0, 1, 2, 3]) {
    const a =
        side === 0
          ? [0, 0]
          : side === 1
            ? [52, 0]
            : side === 2
              ? [52, 52]
              : [0, 52],
      b =
        side === 0
          ? [52, 0]
          : side === 1
            ? [52, 52]
            : side === 2
              ? [0, 52]
              : [0, 0];
    const midpoint = rotateWorld((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, turn);
    if (midpoint[0] !== 52 && midpoint[1] !== 52) {
      ctx.beginPath();
      let pa = project(...a),
        pb = project(...b);
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = photo ? "#73583e" : "#7bb2b4";
      ctx.lineWidth = 4;
      ctx.stroke();
      const door = room.doors[side];
      if (door < 55) {
        let t = (door + 1) * 2 + 1.5,
          p =
            side === 0
              ? project(t, 0)
              : side === 1
                ? project(52, t)
                : side === 2
                  ? project(t, 52)
                  : project(0, t);
        ctx.fillStyle = "#e3c56b";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.fillStyle = "#101820ee";
  ctx.fillRect(0, 0, 1024, 54);
  ctx.font = "bold 20px system-ui";
  ctx.fillStyle = "#e8d776";
  ctx.fillText(
    `BASTARD POINTS ${String(Math.abs(world.score)).padStart(6, "0")}`,
    22,
    34,
  );
  ctx.font = "16px system-ui";
  ctx.fillStyle = "#c0d5d9";
  ctx.fillText(`ROOM ${room.id}   ·   ISOMETRIC`, 725, 33);
  ctx.fillStyle = "#101820ee";
  ctx.fillRect(0, 664, 1024, 104);
  ctx.font = "15px system-ui";
  for (const [i, [name, value, max]] of [
    ["WEE", world.wee, 70],
    ["FART", world.fart, 65],
    ["DRUNK", world.drunk, 85],
    ["SMELL", world.smell, 85],
  ].entries()) {
    const x = 22 + i * 250;
    ctx.fillStyle = "#b0c5c9";
    ctx.fillText(name, x, 690);
    ctx.fillStyle = "#293b45";
    ctx.fillRect(x, 700, 225, 8);
    ctx.fillStyle = "#00bdbd";
    ctx.fillRect(x, 700, (225 * value) / max, 8);
  }
  ctx.fillStyle = "#9fb5ba";
  ctx.font = "14px system-ui";
  ctx.fillText(
    "Screen directions + diagonals · fixed simulation tick · original collision/door rules",
    22,
    741,
  );
  if (world.target) {
    ctx.font = "16px system-ui";
    ctx.fillStyle = "#efe2a4";
    ctx.fillText(data.names[world.target.type]?.text.trim() || "", 22, 641);
  }
}

export function drawIsoMenu(ctx, menu, selection) {
  ctx.fillStyle = "#07151af2";
  ctx.fillRect(180, 440, 664, 215);
  ctx.font = "17px system-ui";
  ctx.fillStyle = "#bdd1d6";
  const title = (menu.title || "Choose an action").replace(/\n/g, " ");
  ctx.fillText(title.slice(0, 66), 202, 472);
  let first = Math.max(0, selection - 3);
  for (let row = 0; row < 4; row++) {
    const item = menu.options[first + row];
    if (!item) break;
    if (first + row === selection) {
      ctx.fillStyle = "#12676c";
      ctx.fillRect(194, 484 + row * 37, 636, 35);
    }
    ctx.font = "18px system-ui";
    ctx.fillStyle = "#edf5f5";
    ctx.fillText(item.label.slice(0, 58), 205, 508 + row * 37);
  }
}
