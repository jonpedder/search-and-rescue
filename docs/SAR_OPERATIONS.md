# SAR Operations workbench

`app/operations.html` provides an operational common operating picture alongside the statistical SAR Planning workbench. Its workflow is informed by common SARTopo/CalTopo SAR practices and the Esri `Missing Persons` MapSAR-derived feature-service template (`2d675dc81d9d442aab52e30d513d9478`), without copying either product's interface.

## Editing workflow

The page prioritizes a SARTopo-like object workflow while using ArcGIS COTS components: choose a SAR object type, draw it with the ArcGIS `SketchViewModel`, select it from the map or object list, edit its attributes, reshape/move it with native sketch handles and snapping controls, then save or create a linked assignment. Segment-to-assignment handoff generates an operational-period assignment number and opens the assignment editor. Existing assignments can be selected, revised, printed, or removed from the browser workspace.

## Supported workflows

- Draw operational areas and search segments.
- Load ranked planning segments by incident ID from the private SAR service.
- Prepare assignments from the Planning page's right-side Assignment & Asset Design panel with a segment, team name, description, priority, status and operational period; hand them to Operations with their segment geometry. Separate assignment and asset sections show clear counts and support keyboard activation to zoom and flash each geometry.
- Use the concise Assignment Editing Palette in Planning to create buffered point-to-point/freehand routes and direct assignment polygons.
- Use the separate Asset editor to name, classify, describe, place, select and edit Ground Team, Vehicle, Canine, Air, Medical, Command or Other resource points. The accessible type picker shows locally hosted official NAPSG icons. An asset does not require or create an assignment; placing or saving it updates only that resource record in Operations, and deleting it leaves assignments untouched. Its optional description persists in plans, Operations, popups and exports.
- New assignments start `Unassigned`; assignment polygons use accessible grey, blue, green and orange status colors for Unassigned, Assigned, Complete and Abandoned. Changes in Planning or Operations immediately update the linked map symbol. Older records without a recognized status safely display as Unassigned.
- In Operations, confirm assignment status as Unassigned, Assigned, Complete or Abandoned; completed/abandoned work requires a team-debrief POD percentage and an Operations decision on whether the area should be searched again. Required fields use visible asterisks and inline accessible validation with focus and a flashing red border.
- Map a point last seen (PLS), clues, cell-ping uncertainty sectors, and field assets.
- Track browser-local unsaved versus ArcGIS-synced records.
- Export protected operations JSON or interoperable GeoJSON.
- Import an operations JSON backup.
- Print assignment cards.
- Organize map objects and assignments by operational period and category.
- Add hazards, landing zones, facilities, exclusion/no-search areas, intended routes, field tracks, and range rings.
- Edit or duplicate geometry and filter the common operating picture by current period, safety, assignments, or resources.
- Run segment QA for approximate 60–120 acre ground-team sizing and polygon overlaps.
- Capture deployment details including team size, transportation, estimated duration, radio channel, prepared-by, previous efforts, responsive/unresponsive/clue POD, team-debrief POD, debrief notes and the search-again decision.
- Import GeoJSON, GPX, and KML map objects; export GeoJSON, KML, GPX, assignment CSV, and full operations JSON.
- Use native measurement, coordinate-conversion, locate, compass, print, layer, legend, and basemap tools.
- Manage operational layer visibility from a persistent right-side panel, zoom to an entire layer, or zoom directly to a named feature.
- Open formatted Arcade popup content for every operational feature, including status, priority, operational period, folder, geometry measurements, notes, and ArcGIS synchronization state.
- Load optional land-cover, hydrography, weather-warning, wildfire, and hillshade overlays.

## Existing ArcGIS schema mapping

| Operations concept | Existing service destination |
|---|---|
| Operational area | `SearchSegment` with an `AREA-` segment ID |
| Search segment | `SearchSegment` |
| Assignment | `Task` table |
| Point last seen | `KeyPoints`, type `PLS` |
| Clue | `Clue` |
| Asset | `KeyPoints`, type `Other`, name prefixed `ASSET:` |
| Cell ping | `KeyPoints`, type `Other`, name prefixed `CELL PING:` |

Assets and cell pings use structured JSON in `KeyPoints.notes` because the current hosted service does not yet have dedicated Asset or CellPing layers. This avoids an unapproved schema mutation while supporting round-trip loading in the Operations page. A future additive schema migration can move these records into dedicated layers.

## Cell-ping limitations

A cell-ping sector records a source point, radius, bearing, and angular width. It is an investigative visualization, not a guaranteed device location or RF propagation model. It does not account for timing advance interpretation, carrier uncertainty, terrain, antenna patterns, network configuration, or device behavior. Record provider, timestamp, method, confidence, and legal/operational provenance in the notes.

## Report page sizes and browser limits

The three map products are created directly with jsPDF landscape page geometry: ANSI E is the custom 3168×2448-point (44×34-inch) format, legal is 1008×612 points and letter is 792×612 points. The ArcGIS map screenshot is bounded to 1800×1000 pixels for browser memory safety, then placed in the printable map frame. Operators must inspect the downloaded PDF and printer settings before operational use; automated tests verify workflow, source dimensions and download generation, not physical printer output or cartographic print fidelity.

## Capabilities that require additional infrastructure

The training guide also describes capabilities that cannot be represented honestly by a browser-only page. Continuous background GPS collection, offline mobile synchronization, live APRS/inReach/ADS-B feeds, expiring mutual-aid workspaces, multiuser uniqueness enforcement, geospatial PDF map books, automated notifications, and secure temporary access require mobile clients, backend services, portal administration, print services, or external APIs. They are not simulated in this workbench.

## Security

Operational exports and the private ArcGIS service may contain sensitive subject, responder, clue, assignment, and investigative data. Keep the service private or restricted to the appropriate SAR group. Store exported files only in agency-approved protected locations.
ministration, print services, or external APIs. They are not simulated in this workbench.

## Security

Operational exports and the private ArcGIS service may contain sensitive subject, responder, clue, assignment, and investigative data. Keep the service private or restricted to the appropriate SAR group. Store exported files only in agency-approved protected locations.
