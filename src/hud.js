// Modern framing of the recovered original HUD: side gauges, lower gauges,
// central BASTARD POINTS and the sixteen-step rating strip.
export function drawIsometricHud(ctx, w, data) {
  const panel = (x, y, width, height) => {
    ctx.fillStyle = "#081218ed";
    ctx.strokeStyle = "#43636b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();
  };
  const label = (s, x, y, colour = "#c7d8da", size = 15) => {
    ctx.fillStyle = colour;
    ctx.font = `bold ${size}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(s, x, y);
  };
  panel(12, 91, 84, 490);
  panel(928, 91, 84, 490);
  for (const [name, value, x, colour] of [
    ["DRUNKOMETER", w.drunk, 54, "#d7b66a"],
    ["SMELLOMETER", w.smell, 970, "#9db96b"],
  ]) {
    ctx.save();
    ctx.translate(x, 129);
    ctx.rotate(-Math.PI / 2);
    label(name, 0, 0, colour, 13);
    ctx.restore();
    ctx.fillStyle = "#27363d";
    ctx.fillRect(x - 13, 169, 26, 340);
    ctx.fillStyle = colour;
    ctx.fillRect(x - 13, 509 - value * 4, 26, value * 4);
    for (let n = 0; n <= 85; n += 5) {
      const y = 509 - n * 4;
      ctx.strokeStyle = "#a9bec766";
      ctx.beginPath();
      ctx.moveTo(x - 20, y);
      ctx.lineTo(x - 14, y);
      ctx.moveTo(x + 14, y);
      ctx.lineTo(x + 20, y);
      ctx.stroke();
    }
    label(String(value).padStart(2, "0"), x, 550, colour, 22);
  }
  panel(12, 642, 1000, 114);
  const meter = (name, value, max, x, colour) => {
    label(name, x + 159, 671, colour, 18);
    ctx.fillStyle = "#26383f";
    ctx.fillRect(x, 686, 318, 18);
    ctx.fillStyle = colour;
    ctx.fillRect(x, 686, (318 * value) / max, 18);
    for (let n = 0; n <= max; n += 5) {
      ctx.fillStyle = "#d4e0df66";
      ctx.fillRect(x + (318 * n) / max, 706, 1, n % 10 ? 4 : 7);
    }
    label(`${value} / ${max}`, x + 159, 738, "#a7bec3", 13);
  };
  meter("WEEOMETER", w.wee, 70, 33, "#64cfda");
  meter("FARTOMETER", w.fart, 65, 673, "#c59ae7");
  label("BASTARD", 512, 672, "#f2cf68", 26);
  label("POINTS", 512, 691, "#f2cf68", 13);
  label(
    (w.score < 0 ? "−" : "") + String(Math.abs(w.score)).padStart(6, "0"),
    512,
    720,
    w.score < 0 ? "#f58d82" : "#f5df7c",
    24,
  );
  for (let n = 0; n < 16; n++) {
    ctx.fillStyle = n < w.rating ? "#edd15d" : "#293b5c";
    ctx.fillRect(391 + n * 15, 737, 12, 7);
  }
  panel(12, 10, 1000, 49);
  label("HOW TO BE A COMPLETE BASTARD", 512, 43, "#c4e9eb", 22);
  label(`ROOM ${w.room.id}`, 78, 43, "#8ca9ad", 12);
  label(`RATING ${w.rating}/16`, 943, 43, "#8ca9ad", 12);
  ctx.textAlign = "left";
  if (w.captionTicks && w.caption) {
    ctx.font = "900 44px system-ui";
    ctx.fillStyle = "#f5d178";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 5;
    ctx.strokeText(w.caption, 420, 125);
    ctx.fillText(w.caption, 420, 125);
  }
}
