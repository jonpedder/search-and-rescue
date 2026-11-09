# Search & Rescue

A search and rescue planning tool that turns lost person behavior (LPB) statistics into a ranked, map-based probability of area (POA) surface. It runs on the ArcGIS Maps SDK for JavaScript and stores incident data in ArcGIS Online.

Built from the science in Robert Koester's *Lost Person Behavior* / ISRID work. This repository contains no licensed ISRID data. See [Data](#data).

## What it does

- Captures a structured lost-person interview covering immediate planning, health, clothing/equipment, experience, trip plans, behavior and prior actions; converts supported answers into reviewable planning cues
- Looks up LPB statistics by subject category, environment and terrain, with fallback and sample-size warnings
- Builds distance rings, direction sectors, linear-feature proximity, DEM travel time (Tobler hiking function) and elevation bias
- Blends layers by adjustable weights and scenarios into ranked search segments
- Tracks POA, POD and POS as search results come in
- Shows survivability over time since last seen
- Exports CSV or GeoJSON, and saves incidents, model runs and segments to ArcGIS Online
- Uses native ArcGIS map widgets for layers, legend, basemaps, drawing, measurement, location, coordinates, home, search and print; adds a small supplemental interface only for GeoJSON/GPX import and GeoJSON export
- Uses a private, Sync-enabled hosted feature service and ArcGIS Online web map as the operational system of record (see [GIS workflow](docs/GIS_WORKFLOW.md))
- Applies selected [NAPSG Foundation Symbol Library 2.0](https://symbology.napsgfoundation.org/) incident symbols where their meaning matches the SAR schema (see [symbology mapping](docs/NAPSG_SYMBOLOGY.md))
- Uses the [Calcite Design System](https://developers.arcgis.com/calcite-design-system/) for interface components, semantic color tokens, dark mode, focus behavior and operational alerts
- Provides an exemplar-aligned Settings page with Configuration and Help & How-to tabs, template import/export, draft review, browser-local defaults and an operator guide
- Loads authoritative [ArcGIS Living Atlas](docs/LIVING_ATLAS.md) terrain, land cover, hydrography, weather, wildfire and hillshade context on demand

## Quick start

```
npm run serve        # serves app/ at http://localhost:8080
npm test             # model tests, no dependencies
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
