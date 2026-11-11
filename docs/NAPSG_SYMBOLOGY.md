# NAPSG symbology integration

The app and ArcGIS Online service reference selected SVG symbols from the [NAPSG Foundation Symbol Library Tool 2.0](https://symbology.napsgfoundation.org/). The implementation uses the current Tool 2.0 URLs rather than the legacy Tool 1.0 URL pattern.

## Operational mapping

| SAR feature | NAPSG symbol | Reason |
|---|---|---|
| Incident | Safety and Security: Search and Rescue — base icon, no label | Identifies the incident as a SAR operation without implying status |
| IPP | USAR Missing Person IPP | Direct semantic match for the initial planning point |
| Find | Known Clue | A confirmed find is incident intelligence |
| Clue | Known Clue | Current schema records collected clues but does not yet have a relevance field |
| Generic point annotation / Other asset | Search and Rescue base icon | Suitable default when no specific resource type is known |
| Ground Team asset | Wilderness Search and Rescue Team | Direct resource-type match |
| Canine asset | Canine Search and Rescue Team | Direct resource-type match |
| Air asset | Fixed-wing Air Search Team | Direct resource-type match |
| Command asset | USAR Incident Support Team | Closest official command/support-team match |
| Medical asset | EMS Ambulance Ground | Direct ground medical-resource match |
| Vehicle asset | Transportation community lifeline | Distinguishes a general transport asset without implying a medical or command role |

POA polygons retain the yellow-to-purple probability ramp. Track logs retain directional blue lines. These are analytic geometries, so point pictograms would obscure rather than clarify their meaning.

PLS and LKP keep distinct gold circle/square symbols until an exact NAPSG equivalent is documented. This avoids falsely representing them as IPPs.

## Asset resource points

Planning asset points and Operations `asset` records use ArcGIS `PictureMarkerSymbol` objects selected from the asset type. The files are hosted with the app so GitHub Pages and browser CORS behavior do not depend on the NAPSG server. `Other` safely falls back to `sar.svg`; older saved records with unknown asset types also normalize to that fallback.

## Attribution and hosted copies

- The app footer links to the NAPSG Foundation Symbol Library.
- Selected Tool 2.0 SVGs are retained under `app/assets/napsg/` because the NAPSG server does not allow the cross-origin SVG requests required by ArcGIS picture-marker rendering from GitHub Pages.
- Existing files are `sar.svg`, `missing-person-ipp.svg` and `known-clue.svg`. Their source records are, respectively, `Lifelines_SS_SR_BI_NL.svg`, `USR_SearchHumanInteractions_MissingPersonIPP.svg` and `incdnt-comand-white-solid-detail-clue-relevant-known.svg`.
- Asset files and exact Tool 2.0 source records are: `asset-ground-team.svg` (`incdnt-resrce-white-solid-detail-esf8-res-search-and-rescue-wilderness-search-and-rescue-team.svg`), `asset-canine.svg` (`incdnt-resrce-white-solid-detail-esf8-res-search-and-rescue-canine-search-and-rescue-team.svg`), `asset-air.svg` (`incdnt-resrce-white-solid-detail-esf8-res-search-and-rescue-air-search-team-fixed-wing.svg`), `asset-command.svg` (`incdnt-resrce-white-solid-detail-esf8-res-search-and-rescue-usar-incident-support-team.svg`), `asset-medical.svg` (`incdnt-resrce-white-solid-detail-esf3-res-ems-ambulance-ground.svg`) and `asset-vehicle.svg` (`Lifelines_T_BI_NL.svg`). They were downloaded from `https://symbology.napsgfoundation.org/symbols/` on 2026-11-11.
- The custom app uses relative asset URLs. ArcGIS Online service and Web Map renderers use the public GitHub Pages equivalents so Map Viewer can load them.
- Before redistributing the assets beyond this application, or adding more symbols, review NAPSG's current reuse and attribution terms and record the symbol-library version/date.
