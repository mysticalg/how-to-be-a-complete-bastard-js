import { InputHub, bindBrowserInputs } from "./input.js";
import { IsometricMotion } from "./movement.js";

export class GameControls {
  constructor(world, { draw, audio, canvas }) {
    this.world = world;
    this.draw = draw;
    this.audio = audio;
    this.canvas = canvas;
    this.playing = false;
    this.paused = false;
    this.pauseChoice = 0;
    this.selection = 0;
    this.history = [];
    this.previousMenu = null;
    this.pendingInteract = false;
    this.presentation = "isometric";
    this.art = "photoreal";
    this.sound = false;
    this.motion = new IsometricMotion(world);
    this.input = new InputHub({
      onAction: (action) => this.action(action),
      onController: (text) => {
        document.querySelector("#controller-status").textContent = text;
      },
      onDisconnect: () => {
        if (this.playing) this.pause(true, "Controller disconnected");
      },
    });
    bindBrowserInputs(this.input, {
      onBlur: () => {
        if (this.playing) this.pause(true, "Paused while away");
      },
    });
    const poll = (now) => {
      this.input.poll(now);
      if (
        this.presentation === "isometric" &&
        this.playing &&
        !this.paused &&
        !this.world.menu &&
        !this.world.end
      )
        this.draw(now);
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  }
  start() {
    this.world.reset();
    this.playing = true;
    this.paused = false;
    this.pauseReason = "";
    this.selection = 0;
    this.history = [];
    this.previousMenu = null;
    this.pendingInteract = false;
    this.input.clear();
    this.audio.menu(false);
    this.motion.reset();
    this.canvas.focus({ preventScroll: true });
    this.draw();
  }
  pause(value = !this.paused, reason = "Paused") {
    this.paused = value;
    if (value) this.pauseChoice = 0;
    this.pauseReason = value ? reason : "";
    this.frozenVisual = value ? this.motion.sample() : null;
    this.pendingInteract = false;
    this.input.clear();
    this.draw();
  }
  choose() {
    const previous = this.world.menu;
    previous?.options[this.selection]?.run();
    if (
      this.world.menu &&
      this.world.menu !== previous &&
      this.world.menu.options[0]?.label !== "CONTINUE"
    )
      this.history.push(previous);
    else this.history = [];
    this.selection = 0;
    this.previousMenu = this.world.menu;
    this.audio.beep();
  }
  action(action) {
    if (action === "sound") {
      this.sound = !this.sound;
      this.audio.enable(this.sound);
      this.draw();
      return;
    }
    if (action === "camera") {
      this.presentation = this.presentation === "split" ? "isometric" : "split";
      this.motion.reset();
      this.draw();
      return;
    }
    if (action === "style") {
      this.art = this.art === "original" ? "photoreal" : "original";
      if (this.art === "photoreal") this.presentation = "isometric";
      this.draw();
      return;
    }
    if (action === "restart" || action === "start") {
      this.start();
      return;
    }
    if (!this.playing) {
      if (action === "interact" || action === "pause") this.start();
      return;
    }
    if (action === "pause") {
      this.pause();
      return;
    }
    if (this.paused) {
      if (action === "up") this.pauseChoice = 0;
      if (action === "down") this.pauseChoice = 1;
      if (action === "interact" && this.pauseChoice === 1) {
        this.world.menu = null;
        this.world.end = 0;
        this.world.finish(6);
        this.world.ending.stage = 1;
        this.pause(false);
      } else if (action === "interact" || action === "cancel")
        this.pause(false);
      else this.draw();
      return;
    }
    if (this.world.effects.blackoutTicks) return;
    if (this.world.end && !this.world.menu) {
      if (action === "interact") {
        this.world.ending.stage++;
        if (this.world.ending.stage > (this.world.end === 5 ? 3 : 1)) {
          this.playing = false;
          this.input.clear();
          this.draw();
        } else this.draw();
      }
      return;
    }
    if (this.world.menu) {
      if (action === "cancel") {
        this.world.menu = this.history.pop() || null;
        this.previousMenu = this.world.menu;
        this.selection = 0;
      }
      if (action === "up") this.selection = Math.max(0, this.selection - 1);
      if (action === "down")
        this.selection = Math.min(
          this.world.menu.options.length - 1,
          this.selection + 1,
        );
      if (action === "interact") this.choose();
    } else if (action === "cancel") this.pause(true);
    else if (action === "inventory") {
      this.world.inventory();
      this.history = [];
    } else if (action === "viewTop") {
      this.world.views[0] = (this.world.views[0] + 4) & 15;
      if (this.presentation === "isometric") this.motion.reset();
    } else if (action === "viewBottom") {
      if (this.presentation === "isometric") {
        this.world.views[0] = (this.world.views[0] + 12) & 15;
        this.motion.reset();
      } else this.world.views[1] = (this.world.views[1] + 4) & 15;
    } else if (action === "fart") {
      this.world.fartAction();
      this.audio.beep(true);
    } else if (action === "interact") {
      // The original resolves walking/collision before fire in a gameplay tick.
      if (this.input.direction()) this.pendingInteract = true;
      else {
        this.world.interact();
        this.history = [];
        this.audio.beep();
      }
    }
    this.draw();
  }
  tick() {
    if (this.assetsLoading) return;
    if (this.playing && !this.paused && this.world.effects.blackoutTicks) {
      this.world.tick();
      this.draw();
      return;
    }
    if (!this.playing || this.paused || this.world.menu || this.world.end)
      return;
    const direction = this.input.direction();
    if (this.presentation === "isometric")
      this.motion.step(this.input.vector());
    else if (direction)
      this.world.move({ up: 2, down: 0, right: 1, left: 3 }[direction]);
    if (this.pendingInteract) {
      this.pendingInteract = false;
      this.world.interact();
      this.history = [];
      this.audio.beep();
    }
    if (!this.world.menu) this.world.tick();
    this.motion.capture(performance.now(), this.presentation === "isometric");
    this.draw();
  }
  sync() {
    if (this.previousMenu !== this.world.menu) {
      this.selection = 0;
      this.previousMenu = this.world.menu;
    }
    document.querySelector("#pause").textContent = this.paused
      ? "Resume"
      : "Pause";
    document
      .querySelector("#pause")
      .setAttribute("aria-pressed", String(this.paused));
    document.querySelector("#sound").textContent = this.sound
      ? "Sound on"
      : "Sound off";
    document
      .querySelector("#sound")
      .setAttribute("aria-pressed", String(this.sound));
    document.querySelector("#camera").textContent =
      this.presentation === "split" ? "View: Split" : "View: Isometric";
    document.querySelector("#style").textContent =
      this.art === "original" ? "Art: Original" : "Art: Photoreal pilot";
    document.querySelector("#action").textContent = !this.playing
      ? "Start"
      : this.paused
        ? "Resume"
        : this.world.menu
          ? "Confirm"
          : "Action";
    document.querySelector('[data-action="viewTop"]').textContent =
      this.presentation === "isometric" ? "Camera ↻" : "View 1 ↻";
    document.querySelector('[data-action="viewBottom"]').textContent =
      this.presentation === "isometric" ? "Camera ↺" : "View 2 ↻";
    const menu = this.world.menu,
      reader = document.querySelector("#menu-reader");
    reader.hidden =
      !!this.world.effects.blackoutTicks ||
      !this.playing ||
      (!menu && !this.paused && !this.world.end);
    const title = this.paused
      ? this.pauseReason
      : this.world.end
        ? this.world.ending.stage === 0
          ? this.world.ending.title
          : this.world.ending.stage === 1
            ? "ADRIAN SAYS YOUR RATING IS: " + this.world.ending.rating
            : this.world.ending.stage === 2
              ? "ADRIAN FEELS YOU'RE READY TO SEE A REAL PUSSY....."
              : "HA HA HA........."
        : menu?.title || "Choose an action";
    const selected = this.paused
      ? this.pauseChoice
        ? "END THE PARTY AND SEE YOUR RATING"
        : "RESUME / down to end the party"
      : this.world.end
        ? `Bastard points: ${this.world.score}. A / Action to continue.`
        : menu?.options[this.selection]?.label || "";
    document.querySelector("#menu-title").textContent = title;
    document.querySelector("#menu-choice").textContent = selected;
    document.querySelector("#menu-position").textContent =
      menu && !this.paused
        ? `${this.selection + 1} / ${menu.options.length}`
        : "";
  }
}
