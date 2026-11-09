# SAR planning workbench (ArcGIS Online + Maps SDK for JavaScript)

Phase 1 and Phase 2 of the plan: lost-person-behavior statistics lookup, distance rings, direction sectors, linear-feature proximity, **DEM terrain travel time and elevation bias**, scenario blending, POA/POD/POS bookkeeping, survivability, and optional save to ArcGIS Online.

## Files

| File | Purpose |
|---|---|
| `index.html` | Single-file app (ArcGIS Maps SDK 4.31 via CDN). Runs stand-alone. |
| `provision_sar_schema.py` | ArcGIS API for Python script. Creates the hosted feature service, domains, seeds lookup tables, makes a web map. |
| `lpb_stats_seed.csv` | Statistics table. Column format is the contract for your licensed data. |
| `survivability_seed.csv` | Survival curves (`P = a * exp(-b * days)`). |

## Run the app

The app must be served over http(s) or localhost, not opened from `file://` (the ArcGIS SDK and OAuth need it).

```
cd sar_lpb_workbench
python -m http.server 8080
# open http://localhost:8080
```

Workflow: Incident tab (IPP, last seen, scenarios) → Subject tab (category, environment, terrain) → Model tab (weights, search area, linear features, Run model) → Segments tab (rank, enter POD, apply, export).

## Provision ArcGIS Online (optional, for saving and field apps)

```
pip install arcgis
python scripts/provision_sar_schema.py --user YOUR_USERNAME --stats data/lpb_stats_seed.csv --surv data/survivability_seed.csv
```

It prints three URLs. Paste them into `CONFIG` at the top of the second script block in `index.html`. For sign-in, register an application in ArcGIS Online (Content > New item > Application), add your hosting URL as a redirect URI, and paste its client ID into `CONFIG.appId`.

Service layout: layers Incident 0, KeyPoints 1, SearchSegment 2, Clue 3, TrackLog 4; tables Task 5, ModelRun 6, LPB_Stats 7, SurvivabilityCurve 8. Every layer has a GlobalID and the Sync capability so Field Maps offline areas work. `incident_id` is the shared key (relationship classes can be added in the item's settings).

## Terrain (DEM) layers

On Run model the app samples elevations across the search area with the ArcGIS Maps SDK `ElevationLayer.queryElevation`, in batches of 500 points. The default service is Esri's World Elevation (Terrain3D) from the Living Atlas: `https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer`. Change it per run in the "Elevation service URL" box, or set `CONFIG.demUrl`.

- **Credentials:** I could not test whether your account needs a key for this service from here. If the elevation request fails, the app says so, skips the terrain layers and still runs. Then set `CONFIG.apiKey` (an API key with the elevation privilege) or `CONFIG.appId` (OAuth) in your local copy of `index.html`. Do not paste keys into chat or commit them to a public repo.
- **Travel time:** a least-cost surface from the IPP using 16-neighbour Dijkstra and the Tobler hiking function on the signed slope of each edge (about 5 km/h on flat ground, slower uphill and on steep descents). Slopes above the "impassable slope" setting (default 50 degrees) are blocked.
- **Terrain-adjusted distance layer:** each segment is scored by the ring density at its flat-equivalent travel distance (travel hours x flat Tobler speed). Hard-to-reach segments score lower than their straight-line distance suggests. Because the ring percentiles already describe real subjects crossing real terrain, this partly overlaps the plain ring layer, so keep both weights in mind.
- **Elevation bias layer:** compares each segment to the IPP elevation (10 m tolerance for "same") and spreads the stratum's uphill / downhill / same percentages over the segments in each class. Skipped when the stratum has no such percentages (for example the Dementia Urban row).
- **Map overlays:** Terrain relief (hillshade) and Travel time from IPP bands. Toggle them on the Model tab.
- **Resolution:** the DEM grid is `demN` cells across the diameter (default 100). Spacing is `2 x radius / demN`, about 80 m for a 4 km radius and about 165 m for an 8.3 km radius. Raise `demN` (up to 160) for finer terrain at the cost of more requests.
- Tested in Node on synthetic terrain: flat-ground times within 1.4% of straight-line, uphill slower than downhill by the Tobler value, detours around a ridge, and probability shifting toward downhill segments when elevation bias is on. The live service call is untested.

## The statistics data

- The five Dementia rows and the Dementia survival curve were transcribed from the deck (slides 20 and 28). Verify them against your licensed ISRID/LPB tables.
- The Hiker and Child 7-9 rows are **synthetic test rows** (`source = PLACEHOLDER_TEST`). The app shows a red warning whenever one is matched. Replace them.
- Load your own table with "Load stats CSV" on the Subject tab, or reseed `LPB_Stats`.
- Lookup falls back in four steps (exact stratum, same environment any terrain, same environment other terrain, same category other environment) and always shows the sample size and a warning.

## How the model works

1. Distance percentiles (25/50/75/95) become banded radial densities (25/25/25/20% of mass). Each cell is supersampled 3x3 so inner rings smaller than a cell still get correct mass.
2. If a scenario has a bearing and the stratum has dispersion angles, a directional density is built from angular deviation (25/25/25/20/5% across the percentile bands). The percentile values are treated as deviation from the bearing. Confirm this reading matches your source.
3. Linear features are densified to 50 m, and each cell is scored by distance to the nearest line using the track-offset percentiles.
4. Each layer is normalized to sum to 1, combined as a weighted sum (sliders), renormalized, then blended across scenarios by their probabilities.
5. POD update: `POS_i = POA_i x POD_i`, new `POA_i = POA_i (1 - POD_i) / (1 - sum POS)`. Cumulative success is `1 - product(1 - round POS)`.

## What was tested

- Model math in Node: POA sums to 1, ring mass matches the percentile targets within cell-boundary effects, sector and linear layers bias cells as expected, fallback matching, POD redistribution, survival values.
- All JavaScript passes a syntax check; the schema script compiles and its field names match what the app writes.
- **Not tested:** the app in a browser against the ArcGIS SDK, and the provisioning script against a live ArcGIS Online org. My environment has no network access. Expect to fix small things on first run, and run the script in a scratch folder first.

## Known limits and next phases

- Grid uses a flat-earth approximation around the IPP. Fine for radii under about 15 km.
- Not yet modeled: land-cover friction and barriers (water, dense vegetation), find-location priors by land cover, mobility-time cap, and the factor-based survivability model. The cost surface already accepts a per-node friction array, so a land-cover raster from the Living Atlas (for example NLCD in the US) can plug in next.
- Phase 3: server-side runs in an ArcGIS Notebook for large areas, plus the survivability factor model.
- Phase 4: SARCAT-style closeout export, Survey123 intake form, Field Maps project, Operations Dashboard.
- Sensitive data: the Incident layer holds subject details. Share it to a restricted group, not publicly.
