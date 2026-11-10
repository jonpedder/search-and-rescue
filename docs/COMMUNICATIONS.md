# Cellular tower and coverage planning

## Tower source

The application uses the public `Cellular_Towers_New` feature layer:

- Service: `https://services5.arcgis.com/umIjvohPcWJU5ij6/arcgis/rest/services/Cellular_Towers_New/FeatureServer/0`
- Portal item discovered during integration: `8b031786f4454aa7a414908aecc277c1`
- Stated source: Federal Communications Commission (FCC)
- Available attributes include licensee, callsign, tower registration, structure type and height, location, and license status.

The source description warns that licensing, coordinates, ground elevation, and frequency-derived information can contain errors. Tower registration data is not a complete inventory of every carrier antenna, rooftop installation, small cell, temporary site, or operational network condition.

## Estimated coverage

The source does not include true per-tower radio-frequency footprints. The application therefore creates optional circular **planning estimates** for active towers in the current map view:

1. Open **Cell towers and estimated coverage** from the native map controls.
2. Load the tower layer.
3. Choose an estimated radius from 0.5 to 50 km. The default is configured in Settings.
4. Select **Estimate current view**.

Each polygon records the source tower ID, callsign, licensee, selected radius, and circular area. A maximum of 300 towers is processed per view to protect browser performance.

These polygons are not verified carrier service coverage. They do not model:

- Terrain obstruction or viewshed
- Antenna height above local terrain
- Antenna azimuth, downtilt, or sector pattern
- Frequency, power, technology, or band
- Buildings, foliage, weather, interference, or backhaul
- Network capacity, maintenance, or outages
- Roaming agreements or device compatibility

For operational communications planning, validate against carrier information, agency radio/communications specialists, field signal checks, and current incident conditions.
