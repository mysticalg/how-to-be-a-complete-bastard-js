// Direct implementation of the room compositor at 8516–8779 and BF6A–C07E.
// Inputs are named decoded records. There is no CPU, ROM, instruction loop, or address space.
const reverse = (n) => {
  let r = 0;
  for (let i = 0; i < 8; i++) {
    r = r * 2 + (n & 1);
    n >>= 1;
  }
  return r;
};
export function advanceWalk(frame) {
  if (frame & 128) {
    frame--;
    if (frame === 128) frame = 0;
  } else {
    frame++;
    if (frame === 3) frame |= 128;
  }
  return frame;
}
function paint(buffer, sprite, col, row, mirror = false) {
  const width = sprite.width,
    height = sprite.rows.length / width;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const [mask, bits] = sprite.rows[y * width + x];
      const dx = col + (mirror ? width - 1 - x : x),
        dy = row + y;
      if (dx < 0 || dx >= 26 || dy < 0 || dy >= 56) continue;
      const pos = dy * 26 + dx;
      buffer[pos] =
        (buffer[pos] & (mirror ? reverse(mask) : mask)) |
        (mirror ? reverse(bits) : bits);
    }
}
function door(buffer, pos, data) {
  let p = pos,
    row = 0;
  function line(offset) {
    const m = data.slice(offset, offset + 6);
    for (let x = 0; x < 5; x++) {
      let pair = x === 0 ? 0 : x === 4 ? 2 : 1;
      const a = p + x;
      if (a >= 0 && a < buffer.length)
        buffer[a] = (buffer[a] & m[pair * 2]) | m[pair * 2 + 1];
    }
    p += 26;
    row++;
  }
  for (let y = 0; y < 6; y++) line(y * 6);
  for (let y = 0; y < 38; y++) line(36);
  line(42);
}
export function composeView(data, entities, doors, view) {
  const buffer = new Uint8Array(26 * 56);
  for (let row = 48; row < 56; row++)
    if (!(row & 1)) buffer.fill(170, row * 26, (row + 1) * 26);
  let backDoor = ((view >> 2) + 2) & 3,
    frontDoor = view >> 2;
  function drawDoor(which, base) {
    if (doors[which] < 55) {
      let x = doors[which];
      if (view & 8) x = 23 - x;
      door(buffer, base + x, data.doorMask);
    }
  }
  drawDoor(backDoor, 78);
  const axis = view & 4 ? "x" : "y";
  let sorted = entities
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e[axis] - b.e[axis] || a.i - b.i);
  // The original reverses the whole stable counting-sort result for views 0 and 12.
  if (view === 0 || view === 12) sorted.reverse();
  for (const { e } of sorted) {
    if (!(e.flags & 1)) continue;
    const definition = data.sprites[e.type];
    let depth = e[axis];
    if (view === 4 || view === 8) depth = 55 - depth;
    let row = e.height - Math.floor(depth / 7);
    let lateral = view & 4 ? e.y : e.x;
    if (view & 8) lateral = 55 - lateral;
    let col = lateral >> 1;
    let orientation = data.orientation[view + e.facing];
    let frame = e.frame;
    if (frame === 201) frame = 0;
    else {
      frame &= 127;
      if (orientation === 1 && (frame ^ lateral) & 1)
        frame = advanceWalk(e.frame) & 3;
      if (orientation === 3 && !((frame ^ lateral) & 1))
        frame = advanceWalk(e.frame) & 3;
      if (!(orientation & 1)) frame >>= 1;
    }
    const variant = orientation === 3 ? 1 : orientation;
    const sequence = definition.frames[variant];
    const sprite = sequence[sequence.length > 1 ? frame % sequence.length : 0];
    if (view & 8) col -= sprite.width - 1;
    let mirror =
      orientation === 3
        ? true
        : orientation === 1
          ? false
          : !!((lateral & 1) ^ !!(e.flags & 2));
    if (e.flags & 4 && orientation & 1) mirror = !mirror;
    if (e.type > 0 && e.type < 17) {
      paint(
        buffer,
        data.heads[(e.type - 1) >> 1][
          orientation === 2 ? 3 : orientation === 0 ? 0 : frame & 1 ? 2 : 1
        ],
        col,
        row,
        mirror,
      );
      row += 8;
    }
    paint(buffer, sprite, col, row, mirror);
  }
  drawDoor(frontDoor, 286);
  return buffer;
}
export function viewPixels(buffer, colour = 5) {
  const pixels = new Uint8ClampedArray(192 * 56 * 4);
  for (let y = 0; y < 56; y++)
    for (let x = 0; x < 192; x++) {
      const on = buffer[y * 26 + 2 + (x >> 3)] & (128 >> (x & 7)),
        p = (y * 192 + x) * 4;
      const c = on ? 0 : colour & 7;
      pixels[p] = c & 2 ? 205 : 0;
      pixels[p + 1] = c & 4 ? 205 : 0;
      pixels[p + 2] = c & 1 ? 205 : 0;
      pixels[p + 3] = 255;
    }
  return pixels;
}
