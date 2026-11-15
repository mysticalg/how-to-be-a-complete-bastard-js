import {
  drawIsometric,
  drawIsoMenu,
  loadPhotoreal,
  photos,
} from "./isometric.js";
import { GameControls } from "./controller.js";
import { RecoveredAudio } from "./audio.js";
import { World } from "./world.js";
import { composeView, viewPixels } from "./renderer.js";
const canvas = document.querySelector("#game"),
  ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;
const data = await (await fetch("assets/game-data.json")).json();
const world = new World(data);
const load = (src) =>
  new Promise((resolve, reject) => {
    let im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
const [title, hud] = await Promise.all([
  load("assets/title.png"),
  load("assets/hud.png"),
]);
const status = document.querySelector("#status");
status.textContent =
  "Recovery milestone 0.2 — full game fidelity is still in progress.";
const audio = new RecoveredAudio(
  await (await fetch("assets/menu-music.json")).json(),
);
audio.menu(true);
let controls;
function text(str, x, y, ink = "#000", paper = null) {
  for (const ch of str) {
    if (ch === "\n") {
      y += 8;
      x = 34;
      continue;
    }
    if (paper) {
      ctx.fillStyle = paper;
      ctx.fillRect(x, y, 6, 8);
    }
    let glyph = data.font[ch.charCodeAt(0) - 32];
    if (glyph) {
      ctx.fillStyle = ink;
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 6; c++)
          if (glyph[r] & (128 >> c)) ctx.fillRect(x + c, y + r, 1, 1);
    }
    x += 6;
  }
}
function meterShape(bytes, x, y) {
  for (let row = 0; row < 16; row++)
    for (let col = 0; col < 16; col++) {
      let attr = data.hudAttributes[((y + row) >> 3) * 32 + ((x + col) >> 3)],
        ink = attr & 7,
        paper = (attr >> 3) & 7,
        c = bytes[row * 2 + (col >> 3)] & (128 >> (col & 7)) ? ink : paper;
      ctx.fillStyle = [
        "#000",
        "#0000cd",
        "#cd0000",
        "#cd00cd",
        "#00cd00",
        "#00cdcd",
        "#cdcd00",
        "#cdcdcd",
      ][c];
      ctx.fillRect(x + col, y + row, 1, 1);
    }
}
function drawMeters() {
  // Volume gauges preserve the one-pixel displacement of the original shapes.
  for (const [x, level, shape] of [
    [8, world.wee, data.meters.wee],
    [232, world.fart, data.meters.fart],
  ]) {
    ctx.fillStyle = "#000";
    ctx.fillRect(x, 35, 16, 101);
    meterShape(shape, x, 120 - level);
  }
  ctx.fillStyle = "#000";
  ctx.fillRect(104, 152, 48, 8);
  const digits = String(Math.abs(world.score)).padStart(6, "0").slice(-6);
  ctx.fillStyle = world.score < 0 ? "#cd0000" : "#ffff00";
  for (let i = 0; i < 6; i++) {
    let glyph = data.digits[+digits[i]];
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++)
        if (glyph[y] & (128 >> x)) ctx.fillRect(104 + i * 8 + x, 152 + y, 1, 1);
  }
}
function draw(frameTime) {
  if (typeof frameTime !== "number") controls?.sync();
  const iso = controls?.presentation === "isometric";
  const width = iso ? 1024 : 256,
    height = iso ? 768 : 192;
  if (canvas.width !== width) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(controls?.playing ? hud : title, 0, 0, width, height);
  const presentationStatus = document.querySelector("#presentation-status");
  if (controls?.art === "photoreal" && iso) {
    loadPhotoreal(draw);
    presentationStatus.textContent = photos.failed
      ? "Photoreal assets unavailable — original geometry shown."
      : !photos.loaded
        ? "Loading photoreal hallway assets…"
        : world.room.id === 6
          ? "Photoreal hallway pilot · inferred geometry · shared original game state"
          : "Photoreal characters · original/proxy furniture in this room · coverage incomplete";
  } else
    presentationStatus.textContent = iso
      ? "Unified world view · inferred elevations · original collision footprints"
      : controls?.art === "photoreal"
        ? "Photoreal pilot is available in Isometric view; original split artwork retained."
        : "";
  if (!controls?.playing) return;
  if (iso) {
    ctx.imageSmoothingEnabled = controls.art === "photoreal";
    drawIsometric(ctx, world, data, {
      photoreal: controls.art === "photoreal",
      visual: controls.paused
        ? controls.frozenVisual
        : controls.motion.sample(
            typeof frameTime === "number" ? frameTime : performance.now(),
          ),
    });
    if (world.menu) drawIsoMenu(ctx, world.menu, controls.selection);
    if (controls.paused) {
      ctx.fillStyle = "#06161be8";
      ctx.fillRect(300, 275, 424, 150);
      ctx.fillStyle = "#e3eeee";
      ctx.font = "bold 30px system-ui";
      ctx.fillText("PAUSED", 448, 335);
      ctx.font = "18px system-ui";
      ctx.fillText("A / Start or tap Resume", 414, 378);
    }
    return;
  }
  const room = world.room;
  for (let i = 0; i < 2; i++) {
    const buffer = composeView(
      data,
      world.entities,
      room.doors,
      world.views[i],
    );
    ctx.putImageData(
      new ImageData(viewPixels(buffer, room.colour >> 3), 192, 56),
      32,
      8 + i * 64,
    );
  }
  drawMeters();
  if (world.menu) {
    const paper = [
      "#000",
      "#0000cd",
      "#cd0000",
      "#cd00cd",
      "#00cd00",
      "#00cdcd",
      "#cdcd00",
      "#cdcdcd",
    ][(room.colour >> 3) & 7];
    ctx.fillStyle = paper;
    ctx.fillRect(32, 72, 192, 56);
    text((world.menu.title || "").slice(0, 31), 34, 72);
    let first = Math.max(0, controls.selection - 4);
    for (let row = 0; row < 6; row++) {
      let option = world.menu.options[first + row];
      if (!option) break;
      let chosen = first + row === controls.selection;
      ctx.fillStyle = chosen ? "#000" : paper;
      ctx.fillRect(32, 80 + row * 8, 192, 8);
      text(
        option.label.slice(0, 31),
        34,
        80 + row * 8,
        chosen ? paper : "#000",
      );
    }
  }
  if (controls.paused) {
    ctx.fillStyle = "#000d";
    ctx.fillRect(32, 8, 192, 120);
    text("PAUSED", 108, 48, "#00cdcd");
    text("A / START / RESUME", 68, 72, "#cdcd00");
  }
  if (world.end && !world.menu) {
    ctx.fillStyle = "#000";
    ctx.fillRect(32, 8, 192, 120);
    text(
      [
        "",
        "YOU HAVE KILLED YOURSELF",
        "ARRESTED FOR MURDER",
        "YOU HAVE BLOWN YOURSELF UP",
        "YOU GO HOME DISAPPOINTED",
        "COMPLETE BASTARD",
      ][world.end] ?? "GAME OVER",
      34,
      32,
      "#cdcd00",
    );
    text("PRESS RESTART TO PLAY AGAIN", 34, 88, "#00cdcd");
  }
}
controls = new GameControls(world, { draw, audio, canvas });
setInterval(() => controls.tick(), 80);
window.recovery = {
  world,
  data,
  controls,
  input: controls.input,
  begin: () => controls.start(),
  draw,
};
draw();
