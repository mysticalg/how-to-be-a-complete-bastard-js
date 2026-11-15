// Recovered game state and room navigation: 8237–8504, BA2C–BB68.
// All original addresses are documentation; gameplay uses ordinary objects.
import { advanceWalk } from "./renderer.js";
const clone = (x) => structuredClone(x);
const DIRECTIONS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export class World {
  constructor(data) {
    this.data = data;
    this.reset();
  }
  reset() {
    this.rooms = clone(this.data.rooms);
    this.actors = clone(this.data.actors);
    this.locations = [...this.data.objectLocations];
    this.player = {
      flags: 1,
      x: 26,
      y: 26,
      height: 24,
      facing: 0,
      type: 0,
      frame: 0,
    };
    this.cell = 10;
    this.views = [0, 4];
    this.pockets = [null, null];
    this.score = 0;
    this.rating = 0;
    this.drunk = 0;
    this.smell = 0;
    this.wee = 0;
    this.fart = 0;
    this.effects = {};
    this.end = 0;
    this.tickNumber = 0;
    this.randomSeed = 0x7471;
    this.target = null;
    this.message = "";
    this.menu = null;
    this.enterRoom();
  }
  get room() {
    return this.rooms[this.data.map[this.cell] - 1];
  }
  get entities() {
    return [this.player, ...this.visibleActors, ...this.room.objects];
  }
  get visibleActors() {
    return this.actors
      .filter((a) => a.room === this.room.id && a.status !== 255)
      .slice(0, 5);
  }
  random() {
    // BBCF–BBF2 simplifies to multiplication modulo the prime 65537.
    // This algebra matches 10,000 original seed transitions from seed 0x7471.
    this.randomSeed = ((((this.randomSeed + 1) * 254) % 65537) - 1) & 65535;
    return this.randomSeed & 255;
  }
  enterRoom() {
    let positions = this.data.actorRoomPositions[this.room.id - 1],
      n = 0;
    for (const actor of this.visibleActors) {
      if (!actor.positionSaved) {
        actor.x = positions[n * 2];
        actor.y = positions[n * 2 + 1];
      }
      actor.height = 24;
      actor.flags = 1;
      n++;
    }
    this.target = null;
  }
  dimensions(entity) {
    const s = this.data.sprites[entity.type];
    return entity.facing & 1 ? [s.radiusY, s.radiusX] : [s.radiusX, s.radiusY];
  }
  overlaps(a, b) {
    const [ax, ay] = this.dimensions(a),
      [bx, by] = this.dimensions(b);
    return (
      ((a.x - b.x + ax - 1) & 255) < ax + bx - 1 &&
      ((a.y - b.y + ay - 1) & 255) < ay + by - 1
    );
  }
  boundary(entity, transition = true) {
    let { x, y } = entity;
    const doors = this.room.doors;
    // Door order: far y, far x, near y, near x. A value >=128 is an open boundary.
    for (const [coordinate, other, index] of [
      [x, y, 3],
      [x, y, 1],
      [y, x, 0],
      [y, x, 2],
    ]) {
      const low = index === 3 || index === 0;
      if (low ? coordinate < 3 : coordinate >= 49) {
        let door = doors[index];
        if (door < 128 && (door >= 55 || other >> 1 !== door + 1)) return false;
      }
    }
    let side = x === -1 ? 3 : x === 52 ? 1 : y === -1 ? 0 : y === 52 ? 2 : null;
    if (side !== null && transition) {
      let next = this.cell + [3, 1, -3, -1][side];
      if (!this.data.map[next]) return false;
      if (entity === this.player) {
        for (const actor of this.visibleActors) actor.positionSaved = true;
        this.cell = next;
        if (side === 3) entity.x = 51;
        if (side === 1) entity.x = 0;
        if (side === 0) entity.y = 51;
        if (side === 2) entity.y = 0;
        this.enterRoom();
      } else {
        entity.mapCell += [3, 1, -3, -1][side];
        entity.room = this.data.map[entity.mapCell];
        entity.flags = 0;
        entity.positionSaved = false;
      }
    }
    return true;
  }
  move(direction) {
    // Q/A/P/O are relative to the upper viewport. Rotating it rotates the controls.
    let facing = (direction + (this.views[0] >> 2)) & 3;
    this.target = null;
    if (this.player.facing !== facing) {
      let clockwise = (this.player.facing + 1) & 3;
      this.player.facing =
        clockwise === facing ? clockwise : (this.player.facing + 3) & 3;
      return;
    }
    const old = { x: this.player.x, y: this.player.y };
    const [dx, dy] = DIRECTIONS[facing];
    this.player.x += dx;
    this.player.y += dy;
    if (!this.boundary(this.player)) {
      Object.assign(this.player, old);
      return;
    }
    for (const e of this.entities.slice(1)) {
      if (e.flags & 1 && this.overlaps(this.player, e)) {
        Object.assign(this.player, old);
        this.target = e;
      }
    }
    if (
      (old.x !== this.player.x || old.y !== this.player.y) &&
      !this.effects.disguise
    )
      this.player.frame = advanceWalk(this.player.frame);
  }
  tick() {
    this.tickNumber++;
    if (!(this.tickNumber % 10)) {
      this.smell = Math.max(0, this.smell - 1);
    }
    if (!(this.tickNumber % 2)) this.updateActors();
  }
  updateActors() {
    // Visible guests walk/turn at B80C–B8EE; offscreen guests choose rooms at B6A6–B7EC.
    for (const a of this.actors) {
      if (a.status) {
        if (a.status < 255 && !--a.status)
          this.rating = Math.max(0, this.rating - 1);
        continue;
      }
      if (a.room !== this.room.id) {
        if (this.random() < 10) {
          const room = this.rooms[a.room - 1],
            side = this.random() & 3,
            door = room.doors[[3, 0, 1, 2][side]];
          if (door & 64) continue;
          let next = a.mapCell + [-1, -3, 1, 3][side],
            id = this.data.map[next];
          if (
            id &&
            id !== this.room.id &&
            this.actors.filter((b) => b.room === id).length < 5
          ) {
            a.mapCell = next;
            a.room = id;
            a.positionSaved = false;
          }
        }
        continue;
      }
      if (a.countdown > 20) {
        a.countdown--;
        continue;
      }
      if (!a.walkTimer) {
        a.walkTimer = 1;
        for (let side = 0; side < 4; side++) {
          let door = this.room.doors[side];
          if (!(door & 192) && (door + 1) * 2 === (side & 1 ? a.y : a.x)) {
            if (a.facing !== side) a.facing = (a.facing + 3) & 3;
            break;
          }
        }
      }
      a.walkTimer--;
      let old = { x: a.x, y: a.y };
      const [dx, dy] = DIRECTIONS[a.facing];
      a.x += dx;
      a.y += dy;
      const blocked =
        !this.boundary(a) ||
        this.entities.some(
          (b) => b !== a && b.flags & 1 && this.overlaps(a, b),
        );
      if (blocked) {
        Object.assign(a, old);
        a.walkTimer = 5;
        let turns = this.random() & 1 ? 1 : 3;
        a.facing = (a.facing + turns) & 3;
      } else a.frame = advanceWalk(a.frame);
      if (a.countdown) a.countdown--;
      else {
        let n = this.random();
        a.countdown = n < 20 ? n + 20 : 20;
      }
    }
  }
  containerLocation(target) {
    return (
      this.data.containerOffsets[this.room.id] +
      this.room.objects.indexOf(target)
    );
  }
  itemName(id) {
    return this.data.items[id]?.text.trim() ?? "";
  }
  text(index, item = null) {
    return (this.data.messages[index]?.text ?? "")
      .replaceAll("$", ` THE ${this.itemName(item).split(" ").at(-1)} `)
      .replace(/ +/g, " ")
      .trim();
  }
  specialText(index, item) {
    return (this.data.specialVerbs[index]?.text ?? "")
      .replaceAll("$", ` THE ${this.itemName(item).split(" ").at(-1)} `)
      .replace(/ +/g, " ")
      .trim();
  }
  say(text) {
    this.message = text;
    this.menu = {
      title: text,
      options: [
        {
          label: "CONTINUE",
          run: () => {
            this.menu = null;
          },
        },
      ],
    };
  }
  points(amount) {
    this.score += amount;
  }
  canUse(extension) {
    if (!extension) return false;
    if (
      extension.requires !== undefined &&
      !this.pockets.includes(extension.requires)
    )
      return false;
    if (
      extension.target !== undefined &&
      extension.condition & 128 &&
      this.visibleActors.some((a) => !a.status)
    )
      return false;
    let c = extension.condition;
    if (((c + 1) & 8) === 0) {
      if (this.drunk < 43 ? c & 2 : !(c & 2)) return false;
    }
    return true;
  }
  ruleFor(item) {
    return this.data.rules[item];
  }
  interact(target = this.target) {
    if (!target || target.type === 73) {
      this.inventory();
      return;
    }
    if (target.type <= 16) {
      this.guestMenu(target);
      return;
    }
    let location = this.containerLocation(target),
      options = [];
    this.target = target;
    // Carried item actions on furniture are selected by extension target type (9047–907C).
    for (const item of this.pockets) {
      let rule = this.ruleFor(item),
        e = rule?.extension;
      if (e && e.target === target.type && this.canUse(e))
        options.push({
          label: this.specialText(e.verb, item),
          run: () => this.useSpecial(item, target),
        });
    }
    let flags = this.data.containerFlags[target.type];
    if (flags & 2 && this.wee)
      options.push({
        label: "URINATE",
        run: () => {
          this.wee = 0;
          this.points(35);
          this.say("YOU URINATE.");
        },
      });
    if (flags & 4 && this.pockets.includes(114))
      options.push({ label: "BURN IT", run: () => this.damage(target, 1) });
    if (flags & 8 && this.pockets.includes(56))
      options.push({ label: "SMASH IT", run: () => this.damage(target, 3) });
    const bespoke = {
      62: [6, () => this.stairs(false)],
      47: [5, () => this.stairs(true)],
      43: [
        9,
        () => {
          this.pockets = [null, null];
          this.say("YOU EMPTY YOUR POCKETS.");
        },
      ],
      25: [
        8,
        () => {
          this.points(20);
          this.say("YOU PLAY THE PIANO.");
        },
      ],
      50: [
        7,
        () => {
          this.points(20);
          this.say("YOU SQUEEZE YOUR ZITS.");
        },
      ],
    };
    if (bespoke[target.type]) {
      let [i, run] = bespoke[target.type];
      options.push({
        label: this.data.containerVerbs[i]?.text.trim() ?? "USE IT",
        run,
      });
    }
    options.push({ label: "SEARCH IT", run: () => this.search(location) });
    options.push({
      label: "DO NOTHING",
      run: () => {
        this.menu = null;
      },
    });
    this.menu = { title: this.data.names[target.type]?.text.trim(), options };
  }
  damage(target, verb) {
    target.flags |= 128;
    target.type = 69 + (target.flags & 2 ? 1 : 0);
    target.height = 48;
    this.points(100);
    this.say(verb === 1 ? "YOU BURN IT." : "YOU SMASH IT.");
  }
  stairs(up) {
    this.cell = up ? 19 : 10;
    this.player.facing = up ? 2 : 0;
    this.player.y = up ? 5 : 31;
    this.enterRoom();
    this.menu = null;
  }
  search(location) {
    let found = this.locations.flatMap((where, id) =>
      where === location ? [id] : [],
    );
    if (!found.length) {
      this.say("NOTHING HERE");
      return;
    }
    this.menu = {
      title: "YOU CAN SEE",
      options: [
        ...found.map((id) => ({
          label: this.itemName(id),
          run: () => this.itemMenu(id),
        })),
        {
          label: "DO NOTHING",
          run: () => {
            this.menu = null;
          },
        },
      ],
    };
  }
  itemMenu(id) {
    const rule = this.ruleFor(id),
      verbs = ["EAT", "DRINK", "WEAR", "SMASH", "SQUASH", "THROW"],
      suffix = rule.flags & 2 ? "THEM" : "IT";
    let options = Object.keys(rule.responses).map((verb) => ({
      label: `${verbs[verb]} ${suffix}`,
      run: () => this.useBasic(id, +verb),
    }));
    if (!(rule.effect & 128) && this.pockets.includes(null))
      options.push({
        label: `TAKE ${suffix}`,
        run: () => {
          this.locations[id] = 255;
          this.pockets[this.pockets.indexOf(null)] = id;
          this.say(`YOU TAKE THE ${this.itemName(id)}`);
        },
      });
    const e = rule.extension;
    if (e && e.flags & 16 && this.canUse(e))
      options.push({
        label: this.specialText(e.verb, id),
        run: () => this.useSpecial(id),
      });
    options.push({
      label: "DO NOTHING",
      run: () => {
        this.menu = null;
      },
    });
    this.menu = { title: this.itemName(id), options };
  }
  inventory() {
    const options = [
      {
        label: "LOOK IN YOUR POCKETS",
        run: () =>
          this.say(
            "YOU ARE CARRYING\n" +
              (this.pockets
                .filter((x) => x !== null)
                .map((x) => this.itemName(x))
                .join("\n") || "NOTHING"),
          ),
      },
    ];
    for (const id of this.pockets) {
      if (id === null) continue;
      const rule = this.ruleFor(id),
        e = rule.extension;
      if (e && !(e.flags & 30) && this.canUse(e))
        options.push({
          label: this.specialText(e.verb, id),
          run: () => this.useSpecial(id),
        });
    }
    options.push({
      label: "DO NOTHING",
      run: () => {
        this.menu = null;
      },
    });
    this.menu = { title: "", options };
  }
  guestMenu(guest) {
    let options = [];
    for (const id of this.pockets) {
      if (id === null) continue;
      let e = this.ruleFor(id).extension;
      if (e && e.flags & (guest.type < 9 ? 2 : 4) && this.canUse(e))
        options.push({
          label: this.specialText(e.verb, id),
          run: () => this.useSpecial(id, guest),
        });
    }
    options.push({
      label: "DO NOTHING",
      run: () => {
        this.menu = null;
      },
    });
    this.menu = { title: this.data.names[guest.type]?.text.trim(), options };
  }
  consume(id) {
    this.locations[id] = 255;
    this.pockets = this.pockets.map((x) => (x === id ? null : x));
  }
  applyEffect(effect, flags) {
    // 8FA1–8FD3: first food/drink choice invokes the B=5 meter helpers.
    if (flags & 128 && effect & 1) this.fart = Math.min(65, this.fart + 5);
    if (flags & 64) {
      this.wee = Math.min(70, this.wee + 5);
      if (effect & 8) this.drunk = Math.min(85, this.drunk + 5);
      if (effect & 4) this.drunk = Math.max(0, this.drunk - 5);
    }
    if (effect & 64) this.smell = Math.min(85, this.smell + 1);
    if (this.drunk === 85 && this.fart === 65 && this.wee === 70)
      this.finish(4);
  }
  useBasic(id, verb) {
    const rule = this.ruleFor(id);
    if (!(rule.effect & 128)) this.consume(id);
    if (
      verb === Math.min(...Object.keys(rule.responses).map(Number)) &&
      rule.flags & 192
    ) {
      this.applyEffect(rule.effect, rule.flags);
    }
    const message = rule.responses[verb];
    this.points(
      this.data.messages[message].length *
        (rule.effect & 32 && rule.flags & 224 ? -2 : 1),
    );
    this.say(this.text(message, id));
  }
  useSpecial(id, target = null) {
    const rule = this.ruleFor(id),
      e = rule.extension;
    if (!e || !this.canUse(e)) return;
    if (e.flags & 1) {
      this.consume(e.requires);
    }
    if (!(e.flags & 16) && !(rule.effect & 128)) this.consume(id);
    this.specialRoutine(e.routine, target);
    if (target?.type < 17) {
      target.status = e.flags & 64 ? 255 : e.flags & 128 ? 254 : target.status;
      if (target.status) {
        this.rating++;
        if (this.rating === 16) this.finish(5);
        this.points(target.status === 255 ? 1000 : 500);
      }
    }
    this.points(this.data.messages[e.message].length);
    this.say(this.text(e.message, id));
  }
  specialRoutine(routine, target) {
    switch (routine) {
      case 0:
        this.effects.blackout = true;
        break;
      case 1:
        this.finish(1);
        break;
      case 2:
        this.pockets[this.pockets.indexOf(null)] = 26;
        break;
      case 3:
        this.effects.toiletFilm = this.room.id;
        break;
      case 4:
        this.player.type = 34;
        this.player.frame = 201;
        this.effects.disguise = true;
        break;
      case 5:
        this.finish(3);
        break;
      case 6:
        this.effects.carpet = this.room.id;
        break;
      case 7:
        this.finish(2);
        break;
      case 8:
        this.wee = 70;
        this.drunk = 85;
        break;
      case 9:
        this.effects.drilledToilet = this.room.id;
        break;
      case 10:
        this.effects.gluedToilet = this.room.id;
        break;
      case 11:
        this.effects.chairPin = this.room.id;
        break;
      case 12:
        this.fart = 65;
        break;
      case 13:
        this.reset();
        break;
      case 14:
        this.pockets[this.pockets.indexOf(null)] = 91;
        break;
      case 15:
        for (const a of this.visibleActors) {
          a.mapCell = this.data.map.findIndex(
            (id) => id && id !== this.room.id,
          );
          a.room = this.data.map[a.mapCell];
          a.positionSaved = false;
        }
        break;
      case 16:
        this.effects.hidden = true;
        break;
      case 17:
        this.effects.stereo = true;
        break;
      case 18:
        this.smell = 0;
        break;
      case 19:
        this.effects.hole = this.room.id;
        break;
      case 20:
        this.effects.rake = this.room.id;
        break;
      case 21:
        break;
      case 22:
        this.effects.whoopee = this.room.id;
        break;
    }
  }
  finish(reason) {
    this.end = reason;
  }
  fartAction() {
    if (!this.fart) return;
    this.fart = 0;
    this.smell = Math.min(85, this.smell + 10);
    this.points(30);
  }
}
