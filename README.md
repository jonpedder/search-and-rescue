# Search & Rescue

A search and rescue planning tool that turns lost person behavior (LPB) statistics into a ranked, map-based probability of area (POA) surface. It runs on the ArcGIS Maps SDK for JavaScript and stores incident data in ArcGIS Online.

Lost person behavior science credit: **Dr. Robert J. Koester**, author of *Lost Person Behavior*, and the associated ISRID research. This repository contains no licensed ISRID data. See [Data](#data).

## What it does

- Provides paired **SAR Planning** and [**SAR Operations**](docs/SAR_OPERATIONS.md) pages; the right-side **Assignment & Asset Design** panel separately lists every assignment and planning asset with counts, type/name/status details and keyboard-accessible zoom/flash controls, while Operations confirms Unassigned/Assigned/Complete/Abandoned status, records the team debrief POD, and decides whether the area should be searched again
- Captures a structured lost-person interview covering immediate planning, health, clothing/equipment, experience, trip plans, behavior and prior actions; converts supported answers into reviewable planning cues
- Accepts up to eight compressed subject photographs, supports individual removal, and includes every image in named plans and the Missing Person Profile PDF
- Automatically restores the current Planning workspace after navigating to Operations and back, and saves/retrieves named browser-local incident plans with the profile, interview, scenarios, model settings, operational period, map lines, current map extent, search segments and subject photographs
- Initializes operational period 1 from the current time to the next local noon or midnight boundary
- Looks up LPB statistics by subject category, environment and terrain, with fallback and sample-size warnings
- Builds distance rings, direction sectors, linear-feature proximity, DEM travel time (Tobler hiking function) and elevation bias
- Provides a concise Assignment Editing Palette for buffered point-to-point/freehand lines and status-colored assignment polygons; assignment status changes immediately recolor linked polygons and required fields receive accessible inline validation
- Provides a separate, assignment-independent Asset editor with required name, keyboard-accessible NAPSG icon/type picker, optional description, explicit place-and-save action, and in-place detail editing; assets persist in current/named plans and hand off only their resource record to Operations
- Renders Ground Team, Canine, Air, Command, Medical and Vehicle asset points with locally hosted official NAPSG SVGs (with the existing SAR symbol as the Other fallback) in the collapsed picker, open option list, Design list, Planning map and Operations
- Blends layers by adjustable weights and scenarios into ranked search segments
- Tracks POA, POD and POS as search results come in
- Shows survivability over time since last seen for every selectable subject category; bundled fallback curves are explicitly marked as placeholders until agency-approved data is loaded
- Exports CSV or GeoJSON, and saves incidents, model runs and segments to ArcGIS Online
- Uses native ArcGIS map widgets for layers, legend, basemaps, drawing, measurement, location, coordinates, home, search and print; adds a small supplemental interface only for GeoJSON/GPX import and GeoJSON export
- Saves a coordinate display format (Decimal Degrees, Degrees Decimal Minutes, Degrees Minutes Seconds, UTM, USNG or MGRS) for Planning and Operations readouts and report-grid labels; ArcGIS `CoordinateFormatter` supplies projected/grid notation, with an explicit unavailable message instead of a mislabeled decimal-degree fallback
- Provides a dedicated Operations Reports tab with true-size ANSI E 44×34, legal 14×8.5 and letter 11×8.5 landscape PDF maps, plus clue and selected-assignment reports. Every report map composes a geographic reference grid labelled in the selected notation, scale and legend into the PDF and includes browser-local unsynced records
- Uses a private, Sync-enabled hosted feature service and ArcGIS Online web map as the operational system of record (see [GIS workflow](docs/GIS_WORKFLOW.md))
- Applies selected [NAPSG Foundation Symbol Library 2.0](https://symbology.napsgfoundation.org/) incident symbols where their meaning matches the SAR schema (see [symbology mapping](docs/NAPSG_SYMBOLOGY.md))
- Uses a shared Calcite dark/amber theme (`app/theme.css`) across Planning, Operations and Settings for interface components, semantic color tokens, button hierarchy, ArcGIS widgets, focus behavior and operational alerts; protected by [desktop/mobile visual regression tests](docs/VISUAL_TESTING.md)
- Provides an exemplar-aligned Settings page with Configuration and Help & How-to tabs, template import/export, draft review, browser-local defaults and an operator guide
- Loads authoritative [ArcGIS Living Atlas](docs/LIVING_ATLAS.md) terrain, land cover, hydrography, weather, wildfire and hillshade context on demand
- Includes public FCC-sourced [cell tower locations and clearly labeled circular coverage estimates](docs/COMMUNICATIONS.md) for communications planning

## Quick start

```
npm run serve              # serves app/ at http://localhost:8080
npm test                   # model, schema and settings tests
npm run test:visual        # desktop/mobile Playwright theme regression suite
npm run test:visual:update # intentionally refresh committed screenshot baselines
```

Open `http://localhost:8080`. The app must be served over http(s); it will not work from `file://`.

To save to ArcGIS Online:

```
pip install arcgis
python scripts/provision_sar_schema.py --user YOUR_USERNAME
```

Paste the three printed URLs into `CONFIG` in `app/index.html`, and add an OAuth `appId` (see [docs](docs/DESIGN_AND_MODEL_NOTES.md)).

## Publish with GitHub Pages

The `Deploy to GitHub Pages` workflow publishes `app/` on every push to `main` after the tests pass.

1. Repo Settings > Pages > Build and deployment > Source: **GitHub Actions**.
2. Push to `main` (or run the workflow manually). The site is at `https://jonpedder.github.io/search-and-rescue/`.
3. For ArcGIS Online sign-in, register these redirect URIs on your OAuth application, then set `CONFIG.appId` and the service URLs in `app/index.html`:
   - `https://jonpedder.github.io/search-and-rescue/`
   - `https://jonpedder.github.io/search-and-rescue/oauth-callback.html`
   - `http://localhost:8080` (local testing)

Pages sites are public on the internet even when the repo is private on some plans. Do not commit API keys, and note that the app ships with seed statistics from `data/`.

## Layout

| Path | Contents |
|---|---|
| `app/index.html` | Single-file application |
| `scripts/provision_sar_schema.py` | Creates the hosted feature service, domains and lookup tables |
| `scripts/embed_seed.py` | Refreshes the seed statistics embedded in the app from `data/` |
| `data/` | Seed statistics and survival curves (column format is the contract for your own data) |
| `tests/` | Model tests (Node, no dependencies) |
| `docs/` | Design and model notes, limits, roadmap |

## Data

`data/lpb_stats_seed.csv` holds Dementia rows transcribed from a public presentation (marked `DECK_SLIDE_20`) and two **synthetic** test rows (`PLACEHOLDER_TEST`). Verify and replace them with your licensed ISRID/LPB tables before operational use. After editing the CSVs, run `npm run embed-seed`, or load a CSV in the app at runtime.

## Status

Early operational prototype. Model and schema contracts are unit tested, and the application, hosted feature service and Web Map have been exercised in the PedderPSO ArcGIS Online organization. Decision support for trained SAR personnel only: review every output against field information.

## Roadmap

Land-cover friction and barriers, find-location priors, mobility cap, survivability factor model, Survey123 intake, Field Maps project, Operations Dashboard, SARCAT-style closeout export.
