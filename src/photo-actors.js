// Articulated photographic guests. Independent left/right limbs are posed in
// character space; the camera never mirrors a complete person to fake a phase.
export function guestPose(orientation, phase) {
  const stride = Math.sin(phase * Math.PI),
    side = orientation & 1,
    sign = orientation === 3 ? -1 : 1;
  return [0, 1].map((limb) => {
    const lead = (limb === 0 ? 1 : -1) * stride;
    if (side)
      return {
        leg: [
          [0, 0.55],
          [sign * lead * 0.075, 0.76],
          [sign * lead * 0.19, 0.99 - Math.max(0, -lead) * 0.025],
        ],
        arm: [
          [0, 0.25],
          [-sign * lead * 0.09, 0.39],
          [-sign * lead * 0.17, 0.5 + lead * 0.09],
        ],
        lead,
      };
    const x = (limb === 0 ? 1 : -1) * 0.065 * (orientation === 2 ? -1 : 1);
    return {
      leg: [
        [x, 0.55],
        [x + lead * 0.012, 0.76],
        [x + lead * 0.018, 0.99 - Math.max(0, -lead) * 0.055],
      ],
      arm: [
        [x * 1.7, 0.25],
        [x * 1.9, 0.4],
        [x * 2.1, 0.54 + lead * 0.035],
      ],
      lead,
    };
  });
}
export function drawPhotoGuest(
  ctx,
  sheet,
  index,
  anchor,
  height,
  orientation,
  { walking = false, phase = 0, status = 0, skirt = false } = {},
) {
  const [sx, sy, sw, sh] = sheet.frames[index],
    root = sheet.anchors[index],
    scale = height / sh,
    W = sw * scale;
  const origin = { x: anchor.x, y: anchor.y - height };
  if (!walking || status) {
    ctx.save();
    if (status) ctx.globalAlpha = 0.55;
    ctx.drawImage(
      sheet,
      sx,
      sy,
      sw,
      sh,
      anchor.x - root.x * scale,
      anchor.y - height,
      W,
      height,
    );
    ctx.restore();
    return;
  }
  const pose = guestPose(orientation, phase),
    near = orientation === 1 ? 1 : 0,
    far = 1 - near;
  ctx.save();
  ctx.translate(origin.x, origin.y);
  const segment = (a, b, width, source, colour) => {
    const dx = (b[0] - a[0]) * height,
      dy = (b[1] - a[1]) * height,
      len = Math.hypot(dx, dy);
    ctx.save();
    ctx.translate(a[0] * height, a[1] * height);
    ctx.rotate(-Math.atan2(dx, dy));
    ctx.beginPath();
    ctx.moveTo(-width * 0.48, 0);
    ctx.lineTo(width * 0.48, 0);
    ctx.lineTo(width * 0.36, len);
    ctx.lineTo(-width * 0.36, len);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = colour;
    ctx.fillRect(-width / 2, 0, width, len);
    ctx.drawImage(sheet, ...source, -width / 2, 0, width, len);
    ctx.restore();
  };
  const leg = (i) => {
    ctx.save();
    if (i === far) ctx.filter = "brightness(0.64)";
    const p = pose[i].leg,
      cx = orientation & 1 ? root.x : root.x + (i === 0 ? -1 : 1) * sw * 0.14;
    const source = [
      sx + Math.max(0, cx - sw * 0.055),
      sy + sh * (skirt ? 0.83 : 0.65),
      sw * 0.11,
      sh * (skirt ? 0.065 : 0.12),
    ];
    segment(p[0], p[1], height * 0.075, source, "#333438");
    segment(p[1], p[2], height * 0.064, source, "#333438");
    const foot = p[2];
    ctx.fillStyle = "#292628";
    ctx.beginPath();
    ctx.ellipse(
      foot[0] * height +
        (orientation & 1 ? (orientation === 1 ? 1 : -1) * height * 0.025 : 0),
      foot[1] * height,
      height * 0.044,
      height * 0.021,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  };
  const arm = (i) => {
    ctx.save();
    if (i === far) ctx.filter = "brightness(0.72)";
    const p = pose[i].arm,
      cx = orientation & 1 ? root.x : root.x + (i === 0 ? -1 : 1) * sw * 0.3;
    const source = [
      sx + Math.max(0, root.x - sw * 0.055),
      sy + sh * 0.32,
      sw * 0.11,
      sh * 0.12,
    ];
    segment(p[0], p[1], height * 0.057, source, "#74716c");
    segment(p[1], p[2], height * 0.046, source, "#74716c");
    const hand = p[2];
    ctx.fillStyle = "#bb9580";
    ctx.beginPath();
    ctx.ellipse(
      hand[0] * height,
      hand[1] * height,
      height * 0.025,
      height * 0.035,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  };
  leg(far);
  arm(far);
  leg(near);
  // Preserve the photographed head and torso; animated limbs use independent
  // sampled cloth strips and joints, leaving the source PNG untouched.
  ctx.save();
  ctx.beginPath();
  ctx.rect(-root.x * scale, 0, W, height * 0.235);
  ctx.moveTo(-height * 0.14, height * 0.22);
  ctx.lineTo(height * 0.14, height * 0.22);
  ctx.lineTo(height * (skirt ? 0.13 : 0.1), height * (skirt ? 0.76 : 0.575));
  ctx.lineTo(-height * (skirt ? 0.13 : 0.1), height * (skirt ? 0.76 : 0.575));
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(sheet, sx, sy, sw, sh, -root.x * scale, 0, W, height);
  ctx.restore();
  arm(near);
  ctx.restore();
}
