# SAR Operations workbench

`app/operations.html` provides an operational common operating picture alongside the statistical SAR Planning workbench. Its workflow is informed by common SARTopo/CalTopo SAR practices and the Esri `Missing Persons` MapSAR-derived feature-service template (`2d675dc81d9d442aab52e30d513d9478`), without copying either product's interface.

## Supported workflows

- Draw operational areas and search segments.
- Load ranked planning segments by incident ID from the private SAR service.
- Create assignments linked to segments, including team, task type, priority, status, briefing, and safety notes.
- Map a point last seen (PLS), clues, cell-ping uncertainty sectors, and field assets.
- Track browser-local unsaved versus ArcGIS-synced records.
- Export protected operations JSON or interoperable GeoJSON.
- Import an operations JSON backup.
- Print assignment cards.

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

## Security

Operational exports and the private ArcGIS service may contain sensitive subject, responder, clue, assignment, and investigative data. Keep the service private or restricted to the appropriate SAR group. Store exported files only in agency-approved protected locations.
