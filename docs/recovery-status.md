# Recovery status — milestone 0.1

Evidence comes from the supplied binary, not a substitute release. This is an incomplete playable reconstruction.

## Input identity

Archive: `How to be a Complete Bastard Game (1987)(Virgin Games)(48K-128K)[a2].zip`, 24,298 bytes.

- Archive SHA-256: `1c82d2dc3b1f6cb133f27847cf7f257054d26e5a021c8fce7b8d256c95d7a31b`.
- Member: same basename with `.z80`, 49,182 bytes.
- Member SHA-256: `2976f85b6382d516d2a522e6d70f7caaf0284c71d1a6279b04d05c299e4c648a`.
- RAM SHA-256: `1204817df03c2cea6e5da6df04398f50c61ab5a41a6e89725fa13bceb4a61892`.
- Version-1 Z80 snapshot, uncompressed 49,152-byte RAM. Header: 48K Spectrum, PC `0094`, SP `612A`, interrupt mode 1, interrupts enabled.
- Address provenance: member-file offset = RAM address minus `4000` plus 30. No tape loader is contained in this snapshot.
- The captured screen is the control-selection menu. PC `0094` is inside ROM, not the game's entry point.

Format interpretation follows the [Z80 snapshot specification](https://worldofspectrum.org/faq/reference/z80format.htm). [SkoolKit](https://skoolkit.ca/skoolkit/) is used privately for disassembly and reference execution. Delivered JavaScript has no SkoolKit dependency.

## Memory map

All addresses below are hexadecimal. Broad regions can contain mixed code and data.

| Range | Recovered purpose |
| --- | --- |
| `4000–5AFF` | Captured bitmap and attributes |
| `5B00–6143` | System variables, BASIC loader remnants and stack |
| `6144–6C4F` | AY driver, track data and related tables |
| `6C50–7CFF` | Character bodies and head graphics |
| `7D00–9569` | Menu, gameplay and display code, with inline data |
| `956A–A8A1` | Names, actions, responses, item names and dictionary |
| `A8A2–ABD9` | 115 variable-length item rules |
| `ABDA–AC4C` | Mutable item location array |
| `AC4D–ACBF` | Initial item locations |
| `ACC0–ACD7` | 24-cell room map |
| `ACD8–ACF9` | Current map pointer, room pointers and sentinels |
| `ACFA–AFA7` | 14 room descriptions |
| `AFA8–B3C1` | Meters, score, keyboard and captions, with inline data |
| `B3C2–B6A5` | 74 ten-byte sprite definitions |
| `B6A6–C1A8` | Guest AI, collision, loading and graphics routines/state |
| `C350–C8FF` | First 26×56-byte compositor buffer |
| `C900–CEAF` | Second compositor buffer |
| `CEB2–F931` | Primarily furniture sprite graphics |
| `F932–FCFF` | UI/colour data and remaining tables |
| `FD00–FDFF` | Generated bit-reversal lookup |
| `FE00–FE93` | Twenty entities in seven arrays, then four door records |
| `FF00–FFFF` | Depth-sort scratch and remaining state |

The private listing represents all 49,152 RAM bytes, identifies 5,243 instructions / 9,410 code bytes, and has zero per-instruction assembler mismatches. Unconfirmed regions remain byte directives. Byte preservation is not a complete semantic disassembly.

## Routine provenance

| Address | Recovered interpretation |
| --- | --- |
| `7D00` | Display initialisation |
| `7D60`, `7DB0` | Control menu/polling; start uses key 6 |
| `81D0`, `81DE` | Start and game loop |
| `8237` | Reset world; copy item locations |
| `82CC–8504` | Input, turning, movement, collisions and room transitions |
| `8516–8779` | View composition, entity projection and stable depth sort |
| `8806` | Masked doorway composition |
| `888B–929D` | Pockets, guest/furniture/item menus and results |
| `9095` | Walk item-rule records |
| `935A` | Length-prefixed text, dictionary tokens and item references |
| `9435` | Compress ROM glyphs into six-pixel characters |
| `AFA8–B1E5` | Meters, BCD score and rating |
| `B356`, `B398` | Controls and keyboard table O/P/A/Q/Space |
| `B6A6–BA2B` | Visible and offscreen guest AI |
| `BA2C–BB68` | Room objects, guests and doors |
| `BBCF` | Arithmetic random-number generator |
| `BBF5–BD56` | Guest collisions, exits and rollback |
| `BF6A`, `BFCC` | Forward and mirrored sprite blits |
| `C07F` | Clear buffers and fill alternating floor rows |
| `6153`, `6144`, `679A` | Music start, tick and AY register write |
| `87CE`, `87D5` | Beeper feedback and fart timing loops |

These are descriptive recovery labels, not original source names.

## Verification limits

All 14 room types were loaded through the original room loader and composed through the original renderer at views 0/4/8/12. The native version matches their visible 192×56 areas: 56 fixtures, 75,264 bytes, zero differences. Two hidden columns are excluded because the original treats them as scratch and crops them on display copy. Fixtures exercise sprite masks, mirrors, NPC heads, draw ordering, doors and floors. Original entity records and expected hashes are published, not raw memory.

This does not establish all-frame rendering parity, exact timing, matching random streams during gameplay, all guest transitions, all effects, all endings or sound fidelity. Further state-trajectory comparisons remain necessary.

Browser additions: surrounding controls, touch buttons, arrow-key aliases, Escape to close menus and scrolling long option lists. Artwork stays at 256×192 with nearest-neighbour display scaling. No generated replacement art is used.
