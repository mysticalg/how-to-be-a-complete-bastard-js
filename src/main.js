import { GAMEPLAY } from "./gameplay-data.js";
import {
  drawIsometric,
  drawIsoMenu,
  loadPhotoreal,
  areRoomPhotosReady,
  photos,
} from "./isometric.js";
import { GameControls } from "./controller.js";
import { RecoveredAudio } from "./audio.js";
import { World } from "./world.js";
import { composeView, viewPixels } from "./renderer.js";
const canvas = document.querySelector("#game"),
  ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;
const data = await (await fetch("assets/game-data.json?v=1.0.1")).json();
const world = new World(data);
const load = (src) =>
  new Promise((resolve, reject) => {
    let im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
const [title, hud, splash] = await Promise.all([
  load("assets/title.png"),
  load("assets/hud.png"),
  load("assets/photoreal/splash.png"),
]);
const status = document.querySelector("#status");
status.textContent =
  "Choose Start. Play with keyboard, touch controls or a standard gamepad.";
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
  if (world.rebooted && controls) controls.playing = false;
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
  if (controls)
    controls.assetsLoading =
      controls.art === "photoreal" && iso && !areRoomPhotosReady(world);
  const presentationStatus = document.querySelector("#presentation-status");
  if (controls?.art === "photoreal" && iso) {
    loadPhotoreal(draw, world);
    presentationStatus.textContent = photos.failed
      ? "Artwork could not load. Try reloading the page."
      : !photos.loaded
        ? "Loading photoreal artwork..."
        : `Photoreal / Isometric / Room ${world.room.id}`;
  } else
    presentationStatus.textContent = iso
      ? "Original / Isometric"
      : controls?.art === "photoreal"
        ? "Split view uses Original artwork."
        : "Original / Split";
  if (!controls?.playing) {
    if (controls) {
      ctx.save();
      ctx.scale(width / 1024, height / 768);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(splash, 0, 0, 1024, 768);
      ctx.fillStyle = "#071015b8";
      ctx.fillRect(0, 0, 1024, 160);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f5e3aa";
      ctx.font = "900 44px system-ui";
      ctx.fillText("HOW TO BE A", 512, 65);
      ctx.font = "900 55px system-ui";
      ctx.fillText("COMPLETE BASTARD", 512, 127);
      ctx.fillStyle = "#071015dc";
      ctx.fillRect(180, 690, 664, 53);
      ctx.fillStyle = "#ebeeee";
      ctx.font = "20px system-ui";
      ctx.fillText("Press Start / A on your pad / or tap Start", 512, 724);
      ctx.textAlign = "left";
      ctx.restore();
    }
    return;
  }
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
    if (controls.assetsLoading) {
      ctx.fillStyle = "#07151aee";
      ctx.fillRect(100, 65, 824, 570);
      ctx.fillStyle = "#cfe1e3";
      ctx.font = "24px system-ui";
      ctx.fillText("Loading room artwork...", 385, 340);
    }
    if (world.effects.blackoutTicks) {
      ctx.fillStyle = "#000";
      ctx.fillRect(100, 65, 824, 570);
    }
    if (world.end && !world.menu) drawEnding(true);
    if (controls.paused) {
      ctx.fillStyle = "#06161be8";
      ctx.fillRect(300, 275, 424, 150);
      ctx.fillStyle = "#e3eeee";
      ctx.font = "bold 30px system-ui";
      ctx.fillText("PAUSED", 448, 335);
      ctx.font = "18px system-ui";
      ctx.fillText(controls.pauseChoice ? "END THE PARTY" : "RESUME", 414, 378);
      ctx.font = "14px system-ui";
      ctx.fillText("Up/down to choose / A to confirm", 385, 405);
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
      new ImageData(
        viewPixels(
          buffer,
          world.effects.stereo ? (i ? 2 : 4) : room.colour >> 3,
        ),
        192,
        56,
      ),
      32,
      8 + i * 64,
    );
  }
  drawMeters();
  if (world.captionTicks && world.caption) {
    const cols = [0, 0];
    for (const letter of world.caption.padEnd(5).slice(0, 5)) {
      const index =
        letter === " " ? 27 : letter === "!" ? 26 : letter.charCodeAt(0) - 65;
      cols.push(...(GAMEPLAY.captionFont[index] || [0, 0, 0]), 0);
    }
    cols.push(0, 0);
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 24; x++) {
        ctx.fillStyle = cols[x] & (1 << y) ? "#cd0000" : "#00cdcd";
        ctx.fillRect(32 + x * 8, 8 + y * 8, 8, 8);
      }
  }
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
    text(controls.pauseChoice ? "END THE PARTY" : "RESUME", 68, 72, "#cdcd00");
  }
  if (world.effects.blackoutTicks) {
    ctx.fillStyle = "#000";
    ctx.fillRect(32, 8, 192, 56);
    ctx.fillRect(32, 72, 192, 56);
  }
  if (world.end && !world.menu) drawEnding(false);
}
function drawEnding(iso) {
  const factor = iso ? 4 : 1,
    stage = world.ending?.stage || 0;
  ctx.save();
  ctx.scale(factor, factor);
  ctx.fillStyle = "#061017f5";
  ctx.fillRect(32, 8, 192, 120);
  if (iso) {
    ctx.scale(0.25, 0.25);
    ctx.textAlign = "center";
    ctx.fillStyle = "#efcf78";
    ctx.font = "bold 30px system-ui";
    if (stage === 0) {
      ctx.fillText(GAMEPLAY.endings[world.end], 512, 190);
      ctx.font = "20px system-ui";
      ctx.fillText(`BASTARD POINTS ${world.score}`, 512, 240);
    } else if (stage === 1) {
      ctx.fillText("ADRIAN SAYS YOUR RATING IS", 512, 185);
      ctx.font = "bold 29px system-ui";
      ctx.fillText(GAMEPLAY.ratings[world.rating], 512, 240);
    } else if (stage === 2) {
      ctx.font = "25px system-ui";
      ctx.fillText("ADRIAN FEELS YOU'RE READY TO", 512, 180);
      ctx.fillText("SEE A REAL PUSSY.....", 512, 220);
    } else {
      if (photos.victory) ctx.drawImage(photos.victory, 330, 90, 364, 273);
      ctx.font = "25px system-ui";
      ctx.fillText("HA HA HA.........", 512, 398);
    }
    ctx.font = "18px system-ui";
    ctx.fillStyle = "#a5d9dd";
    ctx.fillText("A / Action to continue", 512, 452);
  } else {
    const lines =
      stage === 0
        ? [GAMEPLAY.endings[world.end]]
        : stage === 1
          ? ["ADRIAN SAYS YOUR RATING IS", GAMEPLAY.ratings[world.rating]]
          : stage === 2
            ? ["ADRIAN FEELS YOU'RE READY TO", "SEE A REAL PUSSY....."]
            : ["HA HA HA........."];
    for (let i = 0; i < lines.length; i++)
      text(lines[i].slice(0, 31), 34, 32 + i * 16, "#cdcd00");
    if (stage === 3) {
      const cat = GAMEPLAY.victoryBitmap;
      ctx.fillStyle = "#cdcdcd";
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 40; x++)
          if (cat.bytes[y * 5 + (x >> 3)] & (128 >> (x & 7)))
            ctx.fillRect(108 + x, 52 + y, 1, 1);
    }
    text("A / ACTION TO CONTINUE", 50, 100, "#00cdcd");
  }
  ctx.restore();
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
