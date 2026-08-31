# CLAUDE.md — context for future work on this repo

This file exists so a future Claude session (or human contributor) doesn't have to
re-derive decisions that were already made deliberately, or re-litigate ones that were
already corrected once. Read this before touching any file here.

## What this project actually is

Interactive HTML maps of the 8 "depths" (underground floors) in Scrap Mechanic's 1.0
Drilling Thunder release, built by reading the game's own Lua terrain-generation scripts
and `.world`/`.tile`/`.zonesettings` files — not by playing the game or measuring anything
in-engine. Every claim on every map is traceable to a specific line of source data. Where
it isn't, the map says so explicitly rather than filling the gap with a plausible guess.

**This "state uncertainty explicitly" norm is the most important convention in this repo.**
Several early mistakes happened specifically because a guess was presented as fact (see
"Corrections already made" below) — don't repeat that pattern. When adding or fixing a
depth, prefer "we don't know, here's why" over silently picking the most likely answer.

## Source material this project is derived from

Four core generation scripts:
- `chunk_raster.lua` — per-cell/chunk occupancy grid used during generation (transient,
  not what's rendered on these maps)
- `caves_and_pockets.lua` — `AddCave`/`AddPocket`, places prefab tiles, calls into tunnel
  node processing
- `tunnel_generation.lua` — builds the tunnel connector graph, calls the native (not
  available to us) `sm.tunnelGenerator.generate` pathfinder
- `carve_tunnels.lua` — sweeps a spline into a 3D hull per tunnel segment, carves voxels
- `terrain_underground.lua` — the actual orchestrator. `UndergroundLevels[1..8]` defines
  what exists per depth. `DEPTH_NODE_LOCATIONS`/`DEPTH_QUEST_MARKERS` hold real named
  world-space coordinates (only populated for Depth 1). Contains the actual `AddCave()`
  call sites with real placement coordinates for Depths 2, 4, and 6.
  **Only partially read** — roughly lines 945-1900 (pockets, tunnel pockets, real tunnel
  pathing consumption) have not been read. Don't build pocket/tunnel features for Drill 1/2
  without reading that section first.
- `terrain_util.lua`, `terrain_util2.lua`, `tile_database.lua` — supporting utilities
  (rotation math, tile UID lookup via `sm.terrainTile.getTileUuid`, cell bounds helpers)

Level/placement data (ground truth for the 6 static depths):
- `undergroundworld_{mininghub,onboarding,drill_01,drill_02,scrapyard,station_01,
  station_02,final_boss_lobby}.world` — each is a level-editor scene: a `cellData` grid
  referencing `.tile` assets, plus `zoneData`/`portalData` in real world-space units
- `undergroundworld_{mininghub,scrapyard,final_boss_lobby}.zonesettings` — ambient
  effect + render-settings-variant labels per zone id, linked FROM a `.world` file's
  `zoneSettings` field (see Scrapyard's case below — that link isn't always present
  even when both files exist)

## Depth index and what's actually known about each

Resolved a real ambiguity before Depth 3 was built: `DEPTH_NODE_LOCATIONS`/
`DEPTH_QUEST_MARKERS`'s own comments label index 3 as "Drill 1" and index 4 as "Station 1",
while `UndergroundLevels`' comments say the opposite. Trusted `UndergroundLevels` because its
entries reference tile file paths containing `/Drill1/...` literally — unambiguous evidence,
not just a comment. **Depth 3 = Station 1, Depth 4 = Drill 1, Depth 6 = Drill 2.**

| # | Name | Generation | Quest markers | Zones/portals | Notes |
|---|---|---|---|---|---|
| 1 | Mining Hub | Static | 8 + 1 location, real world coords | 4 zones, 3 portals, real world coords | Only depth with quest marker data. Zones sit adjacent to (not overlapping) the marker cluster — confirmed same coordinate space, see corrections below |
| 2 | Onboarding | Static | none (confirmed empty) | none (`.world` file is an empty 4-cell stub) | Data instead comes from literal `AddCave()` call coordinates in the script — x/y in CELL units, z in CHUNK units, a different unit convention than Depth 1 |
| 3 | Station 1 | Static | none | 3 zones, 2 portals, real world coords, no ambient labels (`zoneSettings` field empty) | No marker data to anchor the tile's position relative to the zones — tile stated as fact, not drawn |
| 4 | Drill 1 | **Procedural** | none | N/A | First depth with real seed-driven variation. See "Procedural depths" below |
| 5 | Scrapyard | Static | none | **Genuinely empty** — zoneData/portalData both `[]`, not just unlinked | A `.zonesettings` file was uploaded for this depth but the `.world` file's `zoneSettings` field is `""` — they appear unlinked/orphaned. No z-data exists anywhere in this file. Least data of any depth |
| 6 | Drill 2 | **Procedural** | none | N/A | Mirrors Depth 4's mechanism exactly (same slot geometry). Tile set differs: Bot5+Top3 (tall-then-short) vs Depth 4's Bot3+Top5 (short-then-tall) — a real design difference |
| 7 | Station 2 | Static | none | Genuinely empty, same as Scrapyard | No `.zonesettings` file was even uploaded for this depth (Scrapyard at least had an orphaned one) |
| 8 | Final Boss Lobby | Static | none | 1 zone (by far the largest of any depth: ~2631×2894×967 units), 0 portals | `zoneSettings` field correctly links to its `.zonesettings` file this time — "Lava - Ambience". No anchor data for the tile, same reasoning as Station 1 |

## Procedural depths (4, 6) — what's fixed vs. approximated vs. not modeled

**Fixed, no variation, ever:** elevator position `(-1,-1,2)`; the three cave "stack" slot
positions/rotations (S `(-1,-7)` rot 2, W `(-5,-6)` rot 1, E `(4,-6)` rot 3) — these are
literal numbers in the source, never touched by `shuffle()`. All three possible slot
configs sum to the same total height (8 chunks) — a real design constraint.

**Approximated, explicitly labeled as such:** which tile config lands in which slot.
`shuffle(configs, 2)` has no documented semantics in the source we have. The working
inference — by analogy with `shuffle(pocketTiles, uniqueCount+1)` elsewhere, where the
2nd argument reads as "start index, leave everything before it untouched" — is that
`configs[1]` (the single "8" tile) is always fixed to slot S, and only the two 2-piece
pairs shuffle between W/E. **This is an inference, not confirmed.** The per-tile micro
x/y offset (`oxvals`/`oyvals`) is approximated the same way.

The seed control on these two maps runs a simple JS `mulberry32` PRNG. **It is not Lua's
`math.random` and will not reproduce any real save**, even with a matching seed number —
confirmed useful fact: the real game DOES call `math.randomseed(seed)` with the actual save
seed before any shuffling (line ~600 of `terrain_underground.lua`), so the real pipeline
*is* seed-deterministic — we just can't reproduce Lua's specific RNG algorithm in JS.

**Not modeled at all, not faked:** pockets, tunnel pockets, bedrock bevel exact geometry
(formula is known — `bevelSizeX=16, bevelSizeY=4, dx=4` — but depends on this depth's real
`xMin/xMax/yMin/yMax` generation bounds, which we don't have), and real tunnel pathing.
Building any of these requires reading the unread section of `terrain_underground.lua` first.

One dead-code observation worth keeping: the bevel constants are written as
`g_depth==6 and 16 or 16` — a depth-conditional ternary that evaluates to the same value
regardless of depth. It looks intentional in the source but isn't actually depth-specific.

## Architecture decisions

**Every depth is its own file. This is deliberate, not incidental.** Each depth turned out
to need genuinely different treatment (different z-units, different available data types,
different filtering mechanics) — a shared schema across all 8 would have meant either
forcing bad data into a common shape or constantly special-casing. Independent files also
mean a correction to one depth carries zero risk to the others (this mattered in practice —
the Z-filtering standardization pass touched 3 files independently with no cross-breakage).

**Shared layer is intentionally thin:** `shared.css` (design tokens + common component
styles) and `shared-nav.js` (single source of truth for which depths exist + renders the
nav strip) are the ONLY things centralized. Map data and page-specific rendering logic
stay local to each depth file. `shared-nav.js`'s `NAV_DEPTHS` array is the one place that
needs editing when a depth's build status changes — flip `built: false → true` there and
the nav strip + `index.html`'s card grid update everywhere automatically.

**Scoping decision, stated not hidden:** Depths 1-4 still carry their own local copies of
common CSS (built before `shared.css` existed) — not retroactively de-duplicated, to avoid
regression risk on already-verified files. `shared.css` is additive on top of them. Depths
5-8 correctly consume `shared.css`/`shared-nav.js` only, with no local duplication. If you
retroactively clean up Depths 1-4, verify visually afterward — don't assume identical
selector names mean identical rendered output.

**`index.html` links via plain `<a href>`, not an iframe or client-side router.** Each
depth is a full page navigation. State (z-slider position, selected marker, seed) resets
between depths — this is correct behavior, not a missing feature: depths are unrelated
coordinate spaces, so persisting e.g. Depth 1's z-slider value into Depth 4 would be
meaningless.

**Known fragility:** `<script src="shared-nav.js">` from a `file://`-opened page can be
blocked by strict browser configurations. Fallback if this becomes a real problem: inline
the nav markup/logic directly into each depth file instead of referencing it externally.

## Rendering conventions used across depth files

- **Uniform 1:1 aspect scale.** Always compute ONE scale factor
  (`Math.min(VB_W/spanX, VB_H/spanY)`) and apply it to both axes, centering the leftover
  margin on the looser axis. Do NOT normalize X and Y independently into the viewBox — this
  was a real bug (Depth 1 v3 fix) that silently stretched the map by 1.65x on one axis.
- **Z-filtering: target + band, distance-based, consistently.** Every depth uses two
  sliders — a Z target and a Z Band (±) — with `Math.abs(value - target) <= band`
  determining full-opacity vs. dimmed (0.3). For volumes (zones/portals) rather than
  points, use the volume's Z-center as its filtering position. Depth 3 originally used
  containment filtering instead; this was intentionally changed for cross-depth
  consistency, with the volume-as-point approximation stated in its sidebar.
- **Step size matches each depth's native data granularity, not a fixed rule.**
  Continuous (0.1) for real-world float coordinates (Depths 1, 3, 8), integer (1) for
  chunk-based data (Depths 2, 4, 6). This is intentional per-depth, not inconsistency —
  say so in the sidebar if it might read as a miss.
- **Background grid, scaled to the depth's native unit.** World-unit depths get a grid in
  real units (100 spacing for Depth 1's large span, 50 for smaller spans like Depth 3/8).
  Cell/chunk-unit depths (2, 4, 6) get a 1-cell grid instead, since that's literally what
  their position data is measured in.
- **Named POIs render ON the SVG canvas directly**, not only in the sidebar list or a
  click-triggered callout. Check this for any new depth.
- **Never place a tile/structure spatially without an anchor.** Depth 1's zones were
  placeable relative to its markers because of real evidence (a ~35-100 unit gap, and a
  Z-range that picks up almost exactly where the markers' leaves off). Depths 3 and 8 have
  no such evidence for their single tile relative to their zones — state the tile as a fact
  in the sidebar, don't draw it. Don't extend Depth 1's precedent to a depth without
  checking whether the same kind of evidence actually exists there.

## Corrections already made (don't re-introduce these)

1. **Depth 1 zones/portals were wrongly excluded in v1**, on the theory that their
   coordinate range not overlapping the marker cluster meant a different coordinate space.
   This was wrong — they're adjacent real geography (gap of ~35-100 units, and Zone 2's
   Z-range starts almost exactly where the markers' ends). Corrected in v2. Lesson: "ranges
   don't overlap" is not by itself evidence of "different coordinate space" — check the gap
   size and adjacent boundaries before concluding that.
2. **Depth 1's `worldToSvg` stretched the map 1.65x on one axis** by normalizing X and Y
   independently into the viewBox instead of using one shared scale. Fixed — see rendering
   conventions above.
3. **Depth 2's Z-slider allowed fractional values (step 0.1)** for data that's only ever
   whole chunk integers. Fixed to integer steps, and a previously-hardcoded Z-band constant
   was exposed as its own slider — this pattern (target slider + separate band slider) was
   then adopted as the standard across all depths.
4. **A parked, unconfirmed hypothesis exists on Depth 1's sidebar**: quest markers might use
   a coordinate system internal to Zone 1, possibly rotated 180° relative to the zone/portal
   frame. This is flagged but NOT applied to any geometry. Don't act on it without actual
   verifying evidence (e.g. tile node data, or a comparable marker-vs-zone relationship on
   another depth).

## Outstanding work, in rough priority order

1. **No visual/screenshot QA pass has been done on any of the 8 maps.** This has been
   deferred at every single checkpoint throughout the build. Do this before adding features.
2. Read the unread ~1800-line section of `terrain_underground.lua` (roughly lines 945-1900)
   to actually model pockets, tunnel pockets, and tunnel pathing for Drill 1/2 — currently
   entirely absent, not approximated.
3. Confirm or refute the Depth 1 "180°-rotated Zone 1-local coordinates" hypothesis (see
   corrections above) — would need additional data (tile node exports, or comparing another
   depth's marker-to-zone relationship) not currently available.
4. Consider retroactive CSS de-duplication of Depths 1-4 into `shared.css` (deferred, stated
   scoping decision — do this only with visual verification afterward, not blind refactoring).
5. Verify the `shuffle(configs, 2)` inference for Drill 1/2 — currently unconfirmed, stated
   as such in both maps' sidebars.
