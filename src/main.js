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
  "Recovery milestone 0.1 — full game fidelity is still in progress.";
const audio = new RecoveredAudio(
  await (await fetch("assets/menu-music.json")).json(),
);
audio.menu(true);
let playing = false,
  selection = 0,
  keys = new Set(),
  sound = false,
  previousMenu = null;
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
function tone(frequency = 700) {
  audio.beep(frequency === 80);
}
function begin() {
  world.reset();
  audio.menu(false);
  playing = true;
  selection = 0;
  keys.clear();
  canvas.focus();
  draw();
}
function selected() {
  if (world.menu) {
    let option = world.menu.options[selection];
    option?.run();
    selection = 0;
    tone();
  }
}
function action(key, repeat = false) {
  if (!playing) {
    if (key === "6" || key === "5" || key === " " || key === "enter") begin();
    return;
  }
  if (world.menu) {
    if (key === "escape") {
      world.menu = null;
      return;
    }
    if (key === "q" || key === "arrowup")
      selection = Math.max(0, selection - 1);
    if (key === "a" || key === "arrowdown")
      selection = Math.min(world.menu.options.length - 1, selection + 1);
    if ((key === " " || key === "enter") && !repeat) selected();
    return;
  }
  if (!repeat) {
    if (key === "1") world.views[0] = (world.views[0] + 4) & 15;
    if (key === "2") world.views[1] = (world.views[1] + 4) & 15;
    if (key === "f") {
      world.fartAction();
      tone(80, 0.12);
    }
  }
  if (key === " " || key === "enter") {
    world.interact();
    selection = 0;
    tone();
  }
}
const directionKeys = {
  q: 2,
  arrowup: 2,
  a: 0,
  arrowdown: 0,
  p: 1,
  arrowright: 1,
  o: 3,
  arrowleft: 3,
};
function press(key, repeat = false) {
  keys.add(key);
  action(key, repeat);
  draw();
}
window.addEventListener("keydown", (e) => {
  let k = e.key.toLowerCase();
  if (
    [
      " ",
      "enter",
      "escape",
      "1",
      "2",
      "f",
      "q",
      "a",
      "o",
      "p",
      "6",
      "5",
      ...Object.keys(directionKeys),
    ].includes(k)
  ) {
    e.preventDefault();
    press(k, e.repeat);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());
document.querySelector("#start").onclick = begin;
document.querySelector("#restart").onclick = begin;
document.querySelector("#sound").onclick = (e) => {
  sound = !sound;
  audio.enable(sound);
  e.target.textContent = sound ? "Sound on" : "Sound off";
  e.target.setAttribute("aria-pressed", String(sound));
  tone();
};
for (const button of document.querySelectorAll("[data-key]")) {
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    press(button.dataset.key);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    button.addEventListener(type, () => keys.delete(button.dataset.key));
}
canvas.addEventListener("click", (e) => {
  const bounds = canvas.getBoundingClientRect(),
    y = ((e.clientY - bounds.top) * 192) / bounds.height;
  if (!playing) {
    begin();
    return;
  }
  if (world.menu && y >= 80 && y < 128) {
    let first = Math.max(0, selection - 4),
      row = Math.floor((y - 80) / 8);
    selection = Math.min(first + row, world.menu.options.length - 1);
    selected();
    draw();
  }
});
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
function draw() {
  ctx.drawImage(playing ? hud : title, 0, 0);
  if (!playing) return;
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
    if (previousMenu !== world.menu) {
      selection = 0;
      previousMenu = world.menu;
    }
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
    let first = Math.max(0, selection - 4);
    for (let row = 0; row < 6; row++) {
      let option = world.menu.options[first + row];
      if (!option) break;
      let chosen = first + row === selection;
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
setInterval(() => {
  if (!playing || world.menu || world.end) return;
  for (const [key, dir] of Object.entries(directionKeys))
    if (keys.has(key)) {
      world.move(dir);
      break;
    }
  world.tick();
  draw();
}, 80);
// Expose named state for inspection and deterministic browser QA, not a CPU debugger.
window.recovery = { world, data, begin, draw };
draw();
