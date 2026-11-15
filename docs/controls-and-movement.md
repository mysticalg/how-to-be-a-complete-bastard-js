# Controls, movement and verification

No keyboard is required for the current start, gameplay, menu, search, take/use/empty-pockets, view/style, cancel, pause and reset flows. Original item availability and the still-incomplete effect implementation are shared across input methods.

| Standard pad | Action |
| --- | --- |
| Left stick / D-pad | Move; up/down select menu entries |
| A / bottom face button | Start, interact, confirm, resume |
| B / right face button | Back through menus; pause/resume outside menus |
| X / left face button | Pockets |
| Y / top face button | Fart |
| LB / RB | Rotate the split views; clockwise/counterclockwise isometric camera |
| LT | Sound toggle |
| Start | Start / pause / resume |
| Select / View | Reset |
| L3 / R3 | Split–Isometric / Original–Photoreal |

Mappings use the [standard Gamepad API layout](https://www.w3.org/TR/gamepad/). Browsers may only reveal a controller after its first button press. The stick engages above 0.32 and releases below 0.22; menu confirms and toggles are edge-triggered. Held menu directions repeat after 350 ms, then every 120 ms. Disconnecting the active controller pauses the game and clears movement. Held buttons are latched across pause/reset until released. Nonstandard browser mappings are identified in the status; physical controller compatibility has not been verified here.

Touch controls have independent pointer sources so movement and action can be held together. Pointer-up, cancellation and lost capture release their source. Blur/hidden-page events clear input and pause. This follows the [Pointer Events cancellation/capture model](https://www.w3.org/TR/pointerevents/). Controls are outside the canvas, use safe-area padding, and remain at least 44 px in the tested phone/tablet layouts. The selected menu option and full result text are repeated in a readable HTML panel. The page can scroll normally; it has no global scroll lock.

## Isometric screen-space movement

Original Split uses the recovered four-axis control behavior, including turning before taking a step. Isometric is an explicit optional control adaptation: screen vectors are inverted through the room projection, then a DDA schedules valid underlying x/y unit commands. Direction changes steer immediately in this mode so alternating axes do not consume every tick turning in place.

The simulator still runs at its existing 80 ms interval, attempts no more than one original unit step per tick, and calls the same `World.move` collision/door/interaction path. Its rendered position is interpolated independently at requestAnimationFrame cadence. The presentation target is bounded within one world unit of the valid grid position, checked against footprints, and reset on room transitions. A constant projected speed is used for cardinal and diagonal inputs; faster game logic is not used to disguise input issues.

Keyboard arrows, actual simulated Gamepad API D-pad/stick values, and Chromium CDP multitouch were each exercised in all eight screen directions. The first 32-trajectory local run measured approximately 51.7–53.7 source-canvas pixels/second, target 52.68, with less than 0.001 px perpendicular deviation in the controlled unobstructed paths. Frame intervals were typically 16.7 ms; a few 95th-percentile samples reached 33.4 ms. These are desktop Chromium observations, not physical phone performance guarantees.

An additional isometric test moved into the original umbrella-stand collision, held movement plus Action, searched/took the umbrella, checked pockets, traversed an aligned doorway, and verified release stopped movement. Fixtures remove guests and set known starting positions to isolate these behaviors; they are not a full-game playthrough.

## Original-art horizontal animation correction

The original side-view player images alternate an embedded four-pixel horizontal placement offset. That compensates for the Spectrum renderer's byte-aligned positions. Carrying the offset into continuously positioned isometric billboards doubled the displacement, while front/back frames did not have it. Isometric now pivots the cutouts around their measured stable root/head column and a common floor baseline. Original Split's compositor and data are unchanged and continue to pass all 56 original-view fixtures.

The side poses are contact-A, passing-A, passing-B, contact-B; the isometric semantic loop is `0, 1, 3, 2`. The raw ping-pong walk-state order is retained in simulation and in Original Split, where it is coupled to the original projection/parity handling. Isometric render facing is stable even when its grid scheduler alternates axes.

Rendered left/right clips and per-frame audits showed all four side frames, one stable facing per held direction, and under one source-canvas pixel of residual horizontal head-position variation after compensation. This is separate from photoreal pose completeness.

## Limits

Tests use simulated controller state, Chromium touch/device emulation, and controlled fixtures. No physical Windows controller, Android phone, iPhone or tablet hardware test is claimed. Browser/device-specific button mappings, sustained mobile GPU performance and the unfinished original gameplay systems remain open.

Fresh startup selects Photoreal Isometric. The pause menu offers Resume or ending the party to see the current rating; use up/down and A / Action. Ending screens advance through their recovered message/rating/final-reveal stages and return to the splash.
