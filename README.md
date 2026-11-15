# How to Be a Complete Bastard — native JavaScript recovery

**Native JavaScript reconstruction with the full recovered game systems, all 14 rooms, and Original and Photoreal presentations.**

This project reconstructs the 1987 Virgin Games / Sentient Software ZX Spectrum game from the exact alternate snapshot supplied by the project owner. Gameplay is direct, editable JavaScript. There is no Z80 interpreter, CPU emulator, WebAssembly, ROM loader or translated CPU runtime.

Run locally with Node.js 20 or later:

```
npm start
```

Open http://127.0.0.1:4173. No installation or build step is needed. The files also work on a static server.

Q/A/O/P or arrows move; Space opens actions. Walk into furniture before pressing Space to search it. With no target, Space opens your pockets. Q/A select menu entries and Space/Enter chooses. Keys 1 and 2 rotate the views. F activates the fart action. Escape closes a menu. Touch controls are provided. The game starts at a new photoreal splash; Photoreal Isometric is selected by default.

All current flows also work through a standard gamepad or the touch buttons. Pad: stick/D-pad move/select, A confirm, B back, X pockets, Y fart, LB/RB rotate, LT sound, Start pause, Select reset, L3 camera, R3 art. The controller status appears below the game. On-screen controls cover the same actions without a keyboard.

Select **Split / Isometric** independently of **Original / Photoreal**. Photoreal covers all fourteen rooms in Isometric view; Split retains the original artwork. Switching presentation preserves the same game state. Isometric movement follows screen-left/right/up/down and diagonals, with render interpolation; Split retains the recovered turn-before-step behavior. Both use the same collision and doorway routines and the unchanged 80 ms native simulation interval. See [controls and movement](docs/controls-and-movement.md) and [art coverage](docs/art-coverage.md).

## Established evidence

- 14 original rooms, 74 sprite definitions, masks, doors, projection, draw order and four camera orientations recovered.
- Native compositor matches 56 original room/view fixtures: 75,264 visible buffer bytes, zero differences.
- All 115 variable-length item-rule records decode exactly to the next table boundary. There are 115 item names, 117 responses, 69 special-action labels and 80 dictionary entries.
- Native movement, turning, door crossing, searches, two pockets and action menus are implemented.
- Original menu music recovered as three editable pitch/volume event tracks. Driver state repeats after a 384-tick introduction plus a 1,536-tick loop. Browser tone synthesis is approximate; noise/envelope fidelity remains open.

## Full-game systems and verification

Guest scheduling, offscreen travel, visible arrivals/walking, collision response, room capacity, toilet occupancy, temporary injuries/recovery and permanent departures are implemented. All 23 decoded effect callbacks, basic item actions, context actions, physiology, signed six-digit scoring, traps, 17 ratings and five ending reasons are implemented, including the final cat reveal and return to the splash.

The comparison suite checks 12,642 original guest states across 14 rooms and three seeds; three further 1,500-update trap scenarios; all 189 decoded basic item actions; 32 ground special actions; 74 guest/furniture contexts; and 22 returning effect callbacks. The remaining callback restarts the application instead of resetting a Spectrum ROM. A controlled sequence of sixteen real guest actions reaches the winning ending. See [full-game verification](docs/full-game-verification.md).

## Accuracy and presentation limits

The isometric architecture, materials and generated appearances are interpretations over recovered room footprints, rather than recovered 3D models. Guest photographic limbs are articulated by the native renderer. Isometric steering and the 80 ms browser tick are explicit presentation/control adaptations. Web Audio approximates the original tone generation; no claim of sample-accurate AY noise/envelopes or exact machine timing is made. Original Split's 56 room/view compositor fixtures remain exact. Tests do not exhaust every possible action ordering or establish physical device compatibility.

The original archive, snapshot, full RAM, research simulator, private traces and reconstructable full disassembly are excluded from publication. This repository contains decoded graphics/data, JavaScript, documentation and hash-based test fixtures.

## Editable systems

| File | Purpose |
| --- | --- |
| `src/world.js` | Named state, movement, collision, pockets and item rules |
| `src/renderer.js` | Projection, depth ordering and masked sprite composition |
| `src/audio.js` | Web Audio event arrangement and beeper feedback |
| `src/input.js`, `src/controller.js` | Shared gamepad/touch/keyboard actions and menus |
| `src/movement.js` | Screen-space isometric steering and render interpolation |
| `src/isometric.js` | Unified room geometry and optional photoreal rendering |
| `src/main.js` | Browser controls, canvas and menus |
| `assets/game-data.json` | Decoded rooms, graphics, items, rules and address provenance |
| `assets/menu-music.json` | Musical events in 50 Hz ticks |
| `assets/photoreal/` | Generated artwork, measured source rectangles and frame audit |
| `tests/recovery.test.js` | Frame hashes and selected state transitions |

Run `npm test`. See [recovery status](docs/recovery-status.md) for provenance and limitations.

Original artwork, text and music retain their original ownership. This project does not claim ownership of the original game.
