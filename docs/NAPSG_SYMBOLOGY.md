# NAPSG symbology integration

The app and ArcGIS Online service reference selected SVG symbols from the [NAPSG Foundation Symbol Library Tool 2.0](https://symbology.napsgfoundation.org/). The implementation uses the current Tool 2.0 URLs rather than the legacy Tool 1.0 URL pattern.

## Operational mapping

| SAR feature | NAPSG symbol | Reason |
|---|---|---|
| Incident | Safety and Security: Search and Rescue — base icon, no label | Identifies the incident as a SAR operation without implying status |
| IPP | USAR Missing Person IPP | Direct semantic match for the initial planning point |
| Find | Known Clue | A confirmed find is incident intelligence |
| Clue | Known Clue | Current schema records collected clues but does not yet have a relevance field |
| Generic point annotation | Search and Rescue base icon | Suitable default for an operational SAR markup point |

POA polygons retain the yellow-to-purple probability ramp. Track logs retain directional blue lines. These are analytic geometries, so point pictograms would obscure rather than clarify their meaning.

PLS and LKP keep distinct gold circle/square symbols until an exact NAPSG equivalent is documented. This avoids falsely representing them as IPPs.

## Future resource layer

The NAPSG library includes specific symbols for wilderness, canine, cave, mountain, air, radio-direction-finding, swiftwater and USAR teams. These should be applied to a future point-based `Resource` or `TeamLocation` layer driven by a coded `resource_type` field. The current `Task` table and `TrackLog` lines do not provide a team point geometry, so applying those symbols now would be misleading.

## Attribution and hosted copies

- The app footer links to the NAPSG Foundation Symbol Library.
- The three selected Tool 2.0 SVGs are retained under `app/assets/napsg/` because the NAPSG server does not allow the cross-origin SVG requests required by ArcGIS picture-marker rendering from GitHub Pages.
- The filenames in this repo are `sar.svg`, `missing-person-ipp.svg` and `known-clue.svg`. Their source records are, respectively, `Lifelines_SS_SR_BI_NL.svg`, `USR_SearchHumanInteractions_MissingPersonIPP.svg` and `incdnt-comand-white-solid-detail-clue-relevant-known.svg` in NAPSG Symbol Library Tool 2.0.
- The custom app uses relative asset URLs. ArcGIS Online service and Web Map renderers use the public GitHub Pages equivalents so Map Viewer can load them.
- Before redistributing the assets beyond this application, or adding more symbols, review NAPSG's current reuse and attribution terms and record the symbol-library version/date.
