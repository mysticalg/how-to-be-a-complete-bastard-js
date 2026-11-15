// Named reconstruction of B6A6–BA2B: records, arrivals and visible walking.
import { advanceWalk } from "./renderer.js";
const deltas = [3, 1, -3, -1];
export function countGuests(world, room) {
  return world.actors.filter((a) => a.room === room && !a.status);
}
export function hurtGuest(world, actor, permanent) {
  if (actor.status) return;
  actor.status = permanent ? 255 : 254;
  if (permanent) actor.flags = 0;
  world.points(permanent ? 1000 : 500);
  world.rating++;
  if (world.rating === 16) world.finish(5);
}
function trapArrival(w, a, stair) {
  const e = w.effects;
  let key;
  if (a.room === 7)
    key = e.chairPin ? "chairPin" : e.whoopee ? "whoopee" : null;
  else if (a.room === 10)
    key = e.toiletFilm
      ? "toiletFilm"
      : e.drilledToilet
        ? "drilledToilet"
        : e.gluedToilet
          ? "gluedToilet"
          : null;
  else
    key =
      e.carpet && stair
        ? "carpet"
        : e.hole === a.room
          ? "hole"
          : e.rake === a.room
            ? "rake"
            : null;
  if (key) {
    delete e[key];
    hurtGuest(w, a, a.room !== 10 || key === "gluedToilet");
  }
}
function moveRecord(w, a, cell) {
  a.mapCell = cell;
  a.room = w.data.map[cell];
  a.flags = 0;
}
export function updateGuests(w) {
  for (const a of w.actors) {
    if (a.status) {
      if (a.status !== 255 && !--a.status) w.rating = Math.max(0, w.rating - 1);
      continue;
    }
    if (w.random() >= 10 || a.room === w.room.id) continue;
    if (a.room === 10 && w.room.id !== 12) w.effects.toiletOccupied = false;
    const room = w.rooms[a.room - 1],
      choice = w.random() & 3,
      side = [3, 2, 1, 0][choice];
    if (room.doors[side] & 64) continue;
    let next = a.mapCell + deltas[side],
      stair = false;
    if (a.room === 12 && w.random() < 50) {
      next = 10;
      stair = true;
    } else if (a.room === 6 && w.random() < 50) next = 19;
    const id = w.data.map[next];
    if (!id || id === w.room.id || countGuests(w, id).length === 5) continue;
    if (id === 10) {
      if (w.effects.toiletOccupied) continue;
      if (!countGuests(w, 10).length) w.effects.toiletOccupied = true;
    }
    moveRecord(w, a, next);
    trapArrival(w, a, stair);
    if (w.end) return;
  }
  if (w.random() < 10) arrive(w);
  for (const a of w.visibleActors) {
    if (!a.status) walk(w, a);
  }
}
function arrive(w) {
  if (countGuests(w, w.room.id).length === 5 || w.room.id === 10) return;
  const choice = w.random() & 3,
    side = [3, 2, 1, 0][choice];
  if (choice === 1 && w.effects.toiletOccupied && w.room.id === 12) return;
  let door = w.room.doors[side];
  if (door === 64) return;
  if (door === 128) door = (w.random() & 15) + 5;
  const coordinate = (door + 1) * 2,
    cell = w.cell + deltas[side],
    room = w.data.map[cell];
  if (room === 10 || !room) return;
  const actor = countGuests(w, room).at(-1);
  if (!actor) return;
  actor.walkTimer = 25;
  moveRecord(w, actor, w.cell);
  const slots = new Set(w.visibleActors.map((a) => a.slot));
  let slot = 1;
  while (slots.has(slot)) slot++;
  if (slot > 5) return;
  actor.slot = slot;
  actor.flags = 1;
  actor.height = 24;
  actor.frame = w.guestFrames[slot - 1] || 0;
  const positions = [
    [0, coordinate, 1],
    [coordinate, 51, 0],
    [51, coordinate, 3],
    [coordinate, 0, 2],
  ];
  [actor.x, actor.y, actor.facing] = positions[choice];
  // The original checks arrival overlap and withdraws the slot if obstructed.
  if (blocked(w, actor)) actor.flags = 0;
  else {
    actor.frame = advanceWalk(actor.frame);
    w.guestFrames[slot - 1] = actor.frame;
  }
}
function blocked(w, a) {
  if (!w.boundary(a, false)) return true;
  return w.entities.some((b) => b !== a && b.flags & 1 && w.overlaps(a, b));
}
function walk(w, a) {
  if (a.countdown >= 21) {
    a.countdown--;
    return;
  }
  if (!a.walkTimer) {
    a.walkTimer = 1;
    for (let side = 0; side < 4; side++) {
      const door = w.room.doors[side];
      if (!(door & 192) && (door + 1) * 2 === (side & 1 ? a.y : a.x)) {
        if (a.facing !== side) {
          a.facing = (a.facing + 3) & 3;
          if (a.facing !== side) {
            a.facing = (a.facing + 2) & 3;
            if (a.facing !== side) a.facing = (a.facing + 3) & 3;
          }
        }
        break;
      }
    }
  }
  a.walkTimer = (a.walkTimer - 1) & 255;
  const old = { x: a.x, y: a.y };
  a.x += [0, 1, 0, -1][a.facing];
  a.y += [-1, 0, 1, 0][a.facing];
  let collision = false;
  if (a.x < 0 || a.x === 52 || a.y < 0 || a.y === 52) {
    const side = a.x < 0 ? 3 : a.x === 52 ? 1 : a.y < 0 ? 0 : 2;
    moveRecord(w, a, a.mapCell + deltas[side]);
    collision = true;
  } else collision = blocked(w, a);
  if (collision) Object.assign(a, old);
  else {
    a.frame = advanceWalk(a.frame);
    w.guestFrames[a.slot - 1] = a.frame;
  }
  const turn = () => {
    a.walkTimer = 5;
    a.facing = (a.facing + (w.random() & 1 ? 3 : 1)) & 3;
  };
  if (collision) turn();
  else if (a.countdown) a.countdown--;
  else {
    const n = w.random();
    a.countdown = n < 20 ? n + 20 : 20;
    if (n >= 20) turn();
  }
}
