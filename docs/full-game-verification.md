# Full-game reconstruction verification

The browser now implements the complete set of decoded game systems as native named JavaScript. There is no CPU interpreter, emulator, ROM loader, WASM runtime or opcode-dispatch gameplay. Original Split and Photoreal Isometric share one World state. Fresh startup uses the new photographic splash and selects Photoreal Isometric.

## Original-execution comparisons

| Coverage | Comparison |
| --- | --- |
| Visible/offscreen guests | 42 room/seed cases, 301 states each: 12,642 matching states |
| Traps and recovery | Three further 1,500-update scenarios; matching guest states, trap consumption, rating, score and occupancy |
| Basic item actions | All 189 decoded verb outcomes: score, meters and item removal |
| Ground special actions | 32 outcomes: prerequisites, pockets, meters, score and ending |
| Guest/furniture contexts | 74 outcomes: gender eligibility, consumption, injury/removal, rating, traps and score |
| Encoded item references | All 115 noun expansions captured from the original print routine |
| Furniture base actions | 46 burn/smash/urinate/bespoke outcomes: score, mutation, pockets and room transitions |
| Special callbacks | All 22 returning routines: meters, traps, pockets, relocation, PRNG and score |
| ROM-reset callback | Mapped to application reset and return to the splash |
| Original compositor | Existing 56 room/view fixtures; 75,264 visible bytes with zero differences |

Private research runs execute the supplied snapshot. Menu-comparison harnesses replace only selection and key acknowledgement with chosen inputs; the original action/effect/scoring routines execute. Publication contains semantic state fixtures or hashes, not raw memory or the research simulator.

The tests cover offscreen travel, stair transfers, doorway arrivals, capacity limits, collision/turn responses, toilet occupancy, temporary-status countdowns, permanent departures, trap consumption and random-number state. A controlled scenario uses sixteen actual eligible guest actions to reach rating 16 and the winning ending; it is a rules test rather than a claimed unassisted whole-game playthrough.

The five ending reasons use the recovered messages: self-inflicted death, arrest for murder, going home disappointed, explosion, and congratulations. All seventeen rating strings and the final cat reveal are retained. End screens advance through their stages and return to the splash. The pause menu also offers ending the party and seeing the current rating.

## Presentation and inputs

All fourteen room layouts have directional photographic furniture/material coverage and all sixteen guests have distinct directional appearances. Source rectangles are measured from alpha-separated figures, including sheets whose rows cross nominal grid boundaries. Generated pixels are not retouched by the indexing scripts. Guest motion articulates independent anatomical limbs using photographed clothing; candidate generated gait rows are not treated as proof of correct alternation.

The isometric HUD restores the original arrangement: vertical DRUNKOMETER and SMELLOMETER, lower WEEOMETER and FARTOMETER, central BASTARD POINTS and the sixteen-step rating strip. It displays actual World meter and score values. Its layout and labels were checked in rendered browser captures, alongside fresh startup, all room types and all ending screens.

Controller/touch regressions use simulated standard Gamepad API values and Chromium touch emulation. They exercise searches, taking items, pockets, using/discarding items, menu edges, pause/reset, reconnect and mode changes. Eight-direction keyboard, D-pad, stick and touch trajectories exercise the native screen-space movement adapter. No physical controller or phone hardware verification is claimed.

## Practical limits

The original stores sprite projections, not complete 3D geometry. Elevations, volumes, generated appearances and material choices are interpretations over recovered collision footprints and door records. Photoreal is an Isometric presentation; Split uses the recovered Original artwork. Isometric steering and the fixed 80 ms browser interval are explicit adaptations. Web Audio tone synthesis and some presentation durations are approximate, rather than sample-accurate AY output or exact Spectrum machine timing. The state suite does not exhaust every possible ordering of actions.

The archive, snapshot, full memory, research runtime and reconstructable disassembly remain private local deliverables.
