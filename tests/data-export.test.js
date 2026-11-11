const assert = require("assert");
const exp = require("../app/data-export.js");

assert.equal(exp.safeName(" Incident Timeline / UTC "), "incident_timeline_utc");
assert.equal(exp.csv([{ name: 'A, "quoted"', count: 2 }]), '"name","count"\r\n"A, ""quoted""","2"');

const point = exp.geometryToGeoJSON({ type: "point", x: -118.1, y: 34.2, spatialReference: { wkid: 4326 } });
assert.deepEqual(point, { type: "Point", coordinates: [-118.1, 34.2] });
const mercator = exp.geometryToGeoJSON({ type: "point", x: -13135699.91, y: 4055477.37, spatialReference: { wkid: 3857 } });
assert.ok(Math.abs(mercator.coordinates[0] + 118) < 0.01);
assert.ok(Math.abs(mercator.coordinates[1] - 34.2) < 0.1);
const polygon = exp.geometryToGeoJSON({ type: "polygon", rings: [[[-118, 34], [-117, 34], [-117, 35], [-118, 34]]], spatialReference: { wkid: 4326 } });
assert.equal(polygon.type, "Polygon");
assert.equal(polygon.coordinates[0].length, 4);

const normalized = exp.normalize({
  rows: [{ id: 1, geometry: "not-an-attribute" }],
  features: [{ geometry: { type: "point", longitude: -118, latitude: 34 }, properties: { id: 1 } }]
});
assert.deepEqual(normalized.rows, [{ id: 1 }]);
assert.equal(normalized.features.length, 1);
assert.deepEqual(normalized.features[0].geometry.coordinates, [-118, 34]);

const contextual = exp.normalize({ rows: [{ bucket: "0-6 h", count: 4 }], contextGeometry: point });
assert.equal(contextual.features.length, 1);
assert.equal(contextual.features[0].properties.bucket, "0-6 h");
console.log("data export tests passed");
