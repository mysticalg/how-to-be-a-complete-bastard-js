// Isometric control adaptation only. Every simulation tick still attempts at most
// ONE original unit step through World.move and its original collision/door checks.
// The screen-space inverse projection schedules valid x/y steps with a DDA.
export function screenToWorld(x, y, turn = 0) {
  if (!x && !y) return { x: 0, y: 0 };
  const length = Math.hypot(x, y),
    speed = 7.3 / Math.sqrt(3);
  // Constant screen distance, even diagonally. Vertical movement uses the maximum
  // one-step budget; horizontal/diagonal movement schedules fewer original steps.
  let u = ((x / length / 7.3 - y / length / speed) * speed) / 2;
  let v = ((-x / length / 7.3 - y / length / speed) * speed) / 2;
  switch (turn & 3) {
    case 1:
      return { x: -v, y: u };
    case 2:
      return { x: -u, y: -v };
    case 3:
      return { x: v, y: -u };
    default:
      return { x: u, y: v };
  }
}
const mix = (a, b, t) => a + (b - a) * t;
export class IsometricMotion {
  constructor(world) {
    this.world = world;
    this.reset();
  }
  reset(now = performance.now()) {
    const p = this.world.player;
    this.from = this.to = { x: p.x, y: p.y };
    this.lastTruth = { x: p.x, y: p.y };
    this.time = now;
    this.lastMoved = -Infinity;
    this.cell = this.world.cell;
    this.facing = p.facing;
    this.errorX = this.errorY = 0;
    this.lastVector = "";
    this.actors = new Map();
    this.ideal = { x: p.x, y: p.y };
    this.desired = { x: 0, y: 0 };
    this.blocked = { x: false, y: false };
  }
  step(vector) {
    const world = this.world,
      delta = screenToWorld(vector.x, vector.y, world.views[0] >> 2);
    const key = `${Math.sign(vector.x)},${Math.sign(vector.y)}`;
    if (this.lastVector !== key) {
      this.errorX = this.errorY = 0;
      this.lastVector = key;
      this.blocked = { x: false, y: false };
    }
    this.desired = delta;
    if (!delta.x && !delta.y) return;
    this.errorX += Math.abs(delta.x);
    this.errorY += Math.abs(delta.y);
    if (this.errorX + this.errorY < 0.5 - 1e-9) return;
    let facing;
    if (this.errorX >= this.errorY && delta.x) {
      facing = delta.x > 0 ? 1 : 3;
      this.errorX--;
    } else {
      facing = delta.y > 0 ? 2 : 0;
      this.errorY--;
    }
    if (Math.abs(delta.x) > Math.abs(delta.y) || !vector.y)
      this.facing = delta.x >= 0 ? 1 : 3;
    else this.facing = delta.y >= 0 ? 2 : 0;
    // Steering is immediate in this optional mode. It prevents alternating world
    // axes from spending every tick turning in place; Split keeps the original turn delay.
    world.player.facing = facing;
    const old = { x: world.player.x, y: world.player.y },
      axis = facing & 1 ? "x" : "y";
    world.move((facing - (world.views[0] >> 2) + 4) & 3);
    this.blocked[axis] = world.player.x === old.x && world.player.y === old.y;
  }
  canPresentAt(point) {
    const w = this.world,
      p = { ...w.player, ...point },
      doors = w.room.doors;
    if (p.x < 0 || p.x > 51 || p.y < 0 || p.y > 51) return false;
    for (const [c, other, index, low] of [
      [p.x, p.y, 3, true],
      [p.x, p.y, 1, false],
      [p.y, p.x, 0, true],
      [p.y, p.x, 2, false],
    ]) {
      if (low ? c < 3 : c >= 49) {
        const d = doors[index];
        if (d < 128 && (d >= 55 || Math.floor(other / 2) !== d + 1))
          return false;
      }
    }
    const [ax, ay] = w.dimensions(p);
    return !w.entities.slice(1).some((b) => {
      if (!(b.flags & 1)) return false;
      const [bx, by] = w.dimensions(b),
        x = p.x - b.x + ax - 1,
        y = p.y - b.y + ay - 1;
      return x >= 0 && x < ax + bx - 1 && y >= 0 && y < ay + by - 1;
    });
  }
  capture(now = performance.now(), adapt = true) {
    const world = this.world,
      p = world.player;
    if (
      this.cell !== world.cell ||
      Math.abs(p.x - this.lastTruth.x) > 2 ||
      Math.abs(p.y - this.lastTruth.y) > 2
    ) {
      this.reset(now);
      return;
    }
    const moved = p.x !== this.lastTruth.x || p.y !== this.lastTruth.y;
    this.from = { ...this.to };
    // Render a continuous screen-space trajectory around the valid grid steps.
    // It cannot drift more than one unit from truth or enter a blocked footprint.
    if (adapt && (this.desired.x || this.desired.y)) {
      const next = {
        x: this.ideal.x + (this.blocked.x ? 0 : this.desired.x),
        y: this.ideal.y + (this.blocked.y ? 0 : this.desired.y),
      };
      next.x = Math.max(p.x - 1, Math.min(p.x + 1, next.x));
      next.y = Math.max(p.y - 1, Math.min(p.y + 1, next.y));
      this.ideal = this.canPresentAt(next) ? next : { x: p.x, y: p.y };
    } else this.ideal = { x: p.x, y: p.y };
    this.to = { ...this.ideal };
    if (moved) this.lastMoved = now;
    this.lastTruth = { x: p.x, y: p.y };
    this.time = now;
    if (!adapt) this.facing = p.facing;
    for (const actor of world.visibleActors) {
      const old = this.actors.get(actor.id);
      const changed = old && (old.to.x !== actor.x || old.to.y !== actor.y);
      this.actors.set(actor.id, {
        from: old?.to || { x: actor.x, y: actor.y },
        to: { x: actor.x, y: actor.y },
        time: now,
        lastMoved: changed ? now : (old?.lastMoved ?? -Infinity),
      });
    }
  }
  sample(now = performance.now()) {
    const t = Math.max(0, Math.min(1, (now - this.time) / 80));
    const player = {
      x: mix(this.from.x, this.to.x, t),
      y: mix(this.from.y, this.to.y, t),
      facing: this.facing,
      moving: now - this.lastMoved < 170,
      phase: now / 100,
    };
    const actors = new Map();
    for (const [id, sample] of this.actors) {
      const a = Math.max(0, Math.min(1, (now - sample.time) / 80));
      actors.set(id, {
        x: mix(sample.from.x, sample.to.x, a),
        y: mix(sample.from.y, sample.to.y, a),
        moving: now - sample.lastMoved < 250,
        phase: now / 100,
      });
    }
    return { player, actors };
  }
}
