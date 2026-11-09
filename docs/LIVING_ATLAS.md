# ArcGIS Living Atlas context

The workbench uses authoritative ArcGIS Living Atlas content where it supports a search decision without replacing incident-owned operational data.

## Integrated sources

| Purpose | Living Atlas item | Item ID | Default |
|---|---|---|---|
| Terrain analysis | World Elevation Terrain 3D | Service used by `CONFIG.demUrl` | Used by the DEM model |
| Land cover context | USA Annual NLCD - Land Cover | `32e2ccc6416746a9a72b4d216813f84f` | Off |
| Streams and water bodies | National Hydrography Dataset Plus High Resolution | `21b3bad712c84cae82830569ce53326f` | Off |
| Weather hazards | USA Weather Watches and Warnings | `a6134ae01aad44c499d12feec782b386` | Off |
| Current fire hazards | USA and Canada Current Wildfires | `d957997ccee7408287a963600a77f61f` | Off |
| Terrain visualization | World Hillshade | `1b243539f4514b6ba35e7d995890db1d` | Off |

Open **Layers** and select **Load 5 context layers**. The application retrieves each source from its Living Atlas portal item so saved symbology, pop-ups and group structure are retained. Context layers are added below the SAR analytical graphics and remain off until an operator enables them.

The companion private ArcGIS Online Web Map also includes hydrography, weather warnings, current wildfires and World Hillshade, all turned off by default. Annual NLCD is loaded through its Living Atlas item by the application rather than duplicated in the Web Map.

## Operational design

- POA segments, IPP, clues, tracks and field annotations remain incident-owned layers.
- Context layers are not copied into the private SAR feature service.
- Live feeds are reference information and are not monitored by this application. Operators must check source currency and official agency channels.
- Layers load on demand to avoid delaying startup or placing unnecessary load on high-demand live feeds.
- Item availability can depend on ArcGIS account entitlements and the source owner's sharing settings.
- The United States-specific layers should be replaced or supplemented for incidents outside their coverage.

Review each item's current description, attribution and terms of use in ArcGIS Living Atlas before operational deployment or offline packaging.
