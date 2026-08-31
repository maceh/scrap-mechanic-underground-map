# Scrap Mechanic Underground — Depth Maps

Interactive maps of the underground layer added in Scrap Mechanic's 1.0 "Drilling Thunder"
release, built by reverse-engineering the game's own terrain-generation scripts and level
files rather than by playing/measuring in-game.

This is a **fan-made reference tool**, not an official Anthropic or Scrap Mechanic
(Axolot Games) product. It's built from Lua scripts and `.world`/`.tile`/`.zonesettings`
files that were provided for analysis, not from a public API or SDK.

## What this is

The underground consists of 8 discrete "depths" — sequential floors connected by elevators,
each its own self-contained coordinate space. Two of them (Drill 1 and Drill 2) are
procedurally generated per save seed; the other six are fixed, hand-authored locations.

This repo has one interactive HTML map per depth, plus an index page tying them together.

## Getting started

```
open index.html
```

That's it — everything here is static HTML/CSS/JS, no build step, no server required for
basic use.

**One caveat:** a few browsers restrict `<script src="...">` from loading local files when a
page is opened directly via `file://`. If the depth-navigation strip at the top of a page
doesn't appear, either:
- serve the folder locally instead (e.g. `python3 -m http.server` from this directory, then
  open `http://localhost:8000`), or
- open an issue / see `CLAUDE.md` for the inlining fallback.

## File structure

```
index.html              — hub page, card grid linking to all 8 depths
shared.css              — common design tokens + component styles
shared-nav.js           — single source of truth for which depths exist, renders the nav strip

mininghub_map.html      — Depth 1: Mining Hub      (static, real world-space data)
onboarding_map.html     — Depth 2: Onboarding      (static, native cell/chunk-unit data)
station1_map.html       — Depth 3: Station 1       (static, real world-space zones/portals)
drill1_map.html         — Depth 4: Drill 1         (PROCEDURAL — has a seed control)
scrapyard_map.html      — Depth 5: Scrapyard       (static, minimal data available)
drill2_map.html         — Depth 6: Drill 2         (PROCEDURAL — has a seed control)
station2_map.html       — Depth 7: Station 2       (static, minimal data available)
bosslobby_map.html      — Depth 8: Final Boss Lobby (static, single real zone)
```

Every depth file is fully self-contained (its own data, its own render logic) so any one of
them can be corrected or regenerated without risk to the others. See `CLAUDE.md` for why, and
for the full set of design decisions and known caveats behind each depth.

## Status

All 8 depths have a working interactive map. **No visual/screenshot QA pass has been done on
any of them yet** — this is the single most consistently outstanding item across the whole
build and the recommended next step before further feature work.

Drill 1 and Drill 2's pockets, tunnel pockets, and actual tunnel pathing are not yet modeled —
only the fixed elevator and the three cave "stack" slots are shown, with an illustrative (not
game-accurate) seed control for exploring which tile configuration lands in each slot.

## Important caveats about accuracy

This project treats honesty about data quality as a first-class concern — every map's sidebar
states plainly what's confirmed from source files, what's a reasonable inference, and what's
been deliberately left out. A few of the most important caveats, repeated here because they're
easy to miss if you only skim one depth's page:

- **The Drill 1/2 "seed" control is illustrative only.** It runs a simple JavaScript PRNG
  (mulberry32), not the game's actual Lua `math.random`. Entering a real in-game seed will
  **not** reproduce that save.
- **Not every tile is drawn where it "really" is.** Where there's no data linking a tile's
  local placement grid to the map's real coordinate space, the tile is described as a fact in
  the sidebar rather than drawn at a guessed position.
- **Two depths (Scrapyard, Station 2) have almost no spatial data at all** — no zones, no
  portals, no markers, not even a Z-axis. Their maps show the one thing that *is* known: the
  single tile's footprint in its own native grid.

Full reasoning for every decision above lives in `CLAUDE.md`.

## License / attribution

Scrap Mechanic is a trademark of Axolot Games. This project is unaffiliated fan tooling built
for analysis and reference purposes from provided game script files.
