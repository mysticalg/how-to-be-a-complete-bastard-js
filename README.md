# How to Be a Complete Bastard — native JavaScript recovery

**Playable recovery milestone. The full port is unfinished.**

This project reconstructs the 1987 Virgin Games / Sentient Software ZX Spectrum game from the exact alternate snapshot supplied by the project owner. Gameplay is direct, editable JavaScript. There is no Z80 interpreter, CPU emulator, WebAssembly, ROM loader or translated CPU runtime.

Run locally with Node.js 20 or later:

```
npm start
```

Open http://127.0.0.1:4173. No installation or build step is needed. The files also work on a static server.

Q/A/O/P or arrows move; Space opens actions. Walk into furniture before pressing Space to search it. With no target, Space opens your pockets. Q/A select menu entries and Space/Enter chooses. Keys 1 and 2 rotate the views. F activates the fart action. Escape closes a menu. Touch controls are provided.

All current flows also work through a standard gamepad or the touch buttons. Pad: stick/D-pad move/select, A confirm, B back, X pockets, Y fart, LB/RB rotate, LT sound, Start pause, Select reset, L3 camera, R3 art. The controller status appears below the game. On-screen controls cover the same actions without a keyboard.

Select **Split / Isometric** independently of **Original / Photoreal**. Photoreal is currently a hallway pilot in Isometric view; Split retains the original artwork. Switching presentation preserves the same game state. Isometric movement follows screen-left/right/up/down and diagonals, with render interpolation; Split retains the recovered turn-before-step behavior. Both use the same collision and doorway routines and the unchanged 80 ms native simulation interval. See [controls and movement](docs/controls-and-movement.md) and [art coverage](docs/art-coverage.md).

## Established evidence

- 14 original rooms, 74 sprite definitions, masks, doors, projection, draw order and four camera orientations recovered.
- Native compositor matches 56 original room/view fixtures: 75,264 visible buffer bytes, zero differences.
- All 115 variable-length item-rule records decode exactly to the next table boundary. There are 115 item names, 117 responses, 69 special-action labels and 80 dictionary entries.
- Native movement, turning, door crossing, searches, two pockets and action menus are implemented.
- Original menu music recovered as three editable pitch/volume event tracks. Driver state repeats after a 384-tick introduction plus a 1,536-tick loop. Browser tone synthesis is approximate; noise/envelope fidelity remains open.

## Unfinished

Guest scheduling/arrivals, context-sensitive effects, furniture mutations, physiology, exact scoring, sound captions, end sequences and timing require further original-versus-native comparisons. Some effects are simplified. Renderer parity does **not** establish whole-game behavioral parity. Do not describe this milestone as the complete original game.

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
