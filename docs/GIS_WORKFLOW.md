# ArcGIS geospatial workflow

## Published ArcGIS Online content

Private content in the PedderPSO organization:

- Hosted feature service: **SAR Incident Data** — item `d63935292bb648129cb66ad8f2b45d81`
- Web map: **SAR Incident Operations Map** — item `5bd5bbf575794e9c9565abcb20feb991`
- Service URL: `https://services6.arcgis.com/SdBwj74JF24xKhpX/arcgis/rest/services/SAR_LPB_Incident_Data/FeatureServer`

The service is intentionally private because Incident records contain subject details. Share it and the web map only to a restricted SAR operations group.

## Data model

| ID | Name | Geometry / role |
|---:|---|---|
| 0 | Incident | Point: subject, status, IPP and LPB stratum |
| 1 | KeyPoints | Point: IPP, PLS, LKP, find and other landmarks |
| 2 | SearchSegment | Polygon: POA/POD/POS, rank, status and team |
| 3 | Clue | Point + attachments: footprints, sightings, items, scent and media |
| 4 | TrackLog | Polyline: team GPS tracks and task IDs |
| 5 | Task | Table: assignments, teams, task type/status and reported POD |
| 6 | ModelRun | Table: model provenance and inputs |
| 7 | LPB_Stats | Table: behavior statistics and sample sizes |
| 8 | SurvivabilityCurve | Table: category survival curves |

Every layer/table has a GlobalID and Sync. The Clue layer supports attachments. Coded-value domains constrain operational status and types. `incident_id` is the common workflow key.

## Native ArcGIS map capabilities

The app adopts useful SAR workflow patterns without copying another product's code or branding. Standard interactions are implemented with native ArcGIS Maps SDK widgets in the map UI; the external Calcite interface is limited to workflows without an equivalent widget.

- Stackable map content: native LayerList, Legend and BasemapGallery widgets hosted by Expand controls.
- Field markup: point, line and polygon annotations with Sketch.
- Terrain planning: existing DEM travel-time, hillshade, elevation bias and slope barriers.
- Measurement and coordinates: ArcGIS Measurement and CoordinateConversion.
- Navigation: native Search, Home, ScaleBar and device geolocation through Locate.
- Exchange: supplemental Calcite actions for GeoJSON and GPX import and GeoJSON export.
- Printing: ArcGIS PrintingTools through the Print widget.
- Collaboration: hosted feature service + web map as the shared system of record.
- Offline: the Sync-enabled service is ready for ArcGIS Field Maps offline areas after group sharing and Field Maps configuration.

## Reproducible provisioning

`node scripts/build_feature_collection.js --definition build/definition.json --seed build/seed.json`

The generated `definition.json` is the `addToDefinition` schema for a newly created hosted feature service. `seed.json` contains applyEdits adds for tables 7 and 8. This is the no-Python equivalent of `provision_sar_schema.py` and preserves tables, fixed IDs, GlobalIDs, attachments and Sync.

`node scripts/build_feature_collection.js --out build/sar_fc.json --demo` produces a portable feature collection with one explicit synthetic exercise incident. It is useful for tests and previews, but publishing a feature collection alone may omit tables or offline settings; use the service definition for production.

## Safety and data notes

- The synthetic incident begins `DEMO-` and is not operational data.
- The Hiker and Child 7-9 LPB records have `source=PLACEHOLDER_TEST`; they are not real statistics.
- The Dementia records are transcribed public-presentation values and still need verification.
- Do not share subject data publicly.
